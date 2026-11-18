import json
import re

import httpx

from app.config import Settings
from app.content import LANGUAGES, scene_script

_PUNCT = re.compile(r"[^\w\s\u4e00-\u9fff]", re.UNICODE)


def _norm(text: str) -> str:
    return _PUNCT.sub(" ", (text or "").lower()).strip()


def demo_reply(language: str, scene_id: str, history: list[dict], user_text: str) -> dict:
    script = scene_script(language, scene_id)
    if script is None:
        raise KeyError(scene_id)
    prior = [item for item in history if item.get("role") == "user" and (item.get("text") or "").strip()]
    beats = script["beats"]
    index = min(len(prior), len(beats) - 1)
    beat = beats[index]
    hint = beat["hint"]
    if not (user_text or "").strip():
        return {
            "reply": "",
            "correction": None,
            "hint_ru": hint,
            "npc": script["npc"],
            "opening": script["opening"] if not history else "",
            "source": "demo",
        }
    folded = _norm(user_text)
    hit = any(_norm(token) and _norm(token) in folded for token in beat["expect"])
    cyr = sum(1 for ch in user_text if "а" <= ch.lower() <= "я" or ch.lower() == "ё")
    if cyr > max(3, len(user_text) // 3):
        hit = False
    if hit:
        last = index >= len(beats) - 1
        reply = beat.get("done") if last else beat["ok"]
        if last and not beat.get("done"):
            reply = beat["ok"]
        nxt = beats[min(index + 1, len(beats) - 1)]
        return {
            "reply": reply,
            "correction": None,
            "hint_ru": beat["hint"] if last else nxt["hint"],
            "npc": script["npc"],
            "opening": "",
            "source": "demo",
        }
    return {
        "reply": beat["nudge"],
        "correction": {
            "was": user_text.strip(),
            "fixed": beat["model"],
            "note_ru": beat["note"],
        },
        "hint_ru": hint,
        "npc": script["npc"],
        "opening": "",
        "source": "demo",
    }


PERSONA = {
    "parrot": "Яппо тёплый и неторопливый: хвалит попытку и говорит просто.",
    "bunny": "Мими любопытная: мягко переспрашивает и радуется точному слову.",
    "bear": "Бруно спокойный: поддерживает и спокойно ведёт к следующей фразе.",
    "fox": "Рыжик игривый: поправляет легко, без насмешки.",
    "cat": "Нора вдумчивая: просит услышать форму и повторить тише.",
}


def _system_prompt(language: str, scene: dict, mascot_name: str, mascot_id: str = "parrot") -> str:
    lang = LANGUAGES[language]
    beats = "\n".join(
        f"{i + 1}. Ждут смысл: {', '.join(b['expect'])}. Образец: {b['model']}. Подсказка: {b['hint']}"
        for i, b in enumerate(scene["beats"])
    )
    persona = PERSONA.get(mascot_id, PERSONA["parrot"])
    return (
        f"Ты собеседник в Yappo, ролевая сцена «{scene['title']}». "
        f"reply только на языке ученика: {lang['name']} ({lang['native']}), уровень A1, 1–2 короткие естественные фразы. "
        f"Ты {scene['npc']}. Рядом спутник {mascot_name}. Тон поправок и подсказок — его: {persona} "
        "Спутника не изображай и от его имени не говори. "
        "Если фраза с ошибкой или не на нужном языке, мягко дай правильный вариант в reply и заполни correction. "
        "correction.note_ru и hint_ru всегда по-русски, коротко и без стыда. Если ошибки нет, correction = null. "
        "Не упоминай, что ты модель. Не выходи из сцены.\n"
        f"Опора сцены:\n{beats}\n"
        'Ответ строго JSON: {"reply":"","correction":null,"hint_ru":""} '
        'или {"reply":"","correction":{"was":"","fixed":"","note_ru":""},"hint_ru":""}.'
    )


def _parse_model_json(text: str) -> dict | None:
    raw = (text or "").strip()
    if raw.startswith("```"):
        raw = raw.strip("`")
        if raw.lower().startswith("json"):
            raw = raw[4:]
    start = raw.find("{")
    end = raw.rfind("}")
    if start < 0 or end <= start:
        return None
    try:
        data = json.loads(raw[start : end + 1])
    except json.JSONDecodeError:
        return None
    if not isinstance(data, dict) or "reply" not in data:
        return None
    correction = data.get("correction")
    if correction is not None and not isinstance(correction, dict):
        correction = None
    return {
        "reply": str(data.get("reply") or "").strip(),
        "correction": correction,
        "hint_ru": str(data.get("hint_ru") or "").strip(),
    }


async def chat_reply(
    settings: Settings,
    *,
    language: str,
    scene_id: str,
    history: list[dict],
    user_text: str,
    mascot_name: str,
    mascot_id: str = "parrot",
) -> dict:
    script = scene_script(language, scene_id)
    if script is None:
        raise KeyError(scene_id)
    fallback = demo_reply(language, scene_id, history, user_text)
    if not user_text.strip():
        return fallback
    provider = (settings.llm_provider or "openai").strip().lower()
    prompt = _system_prompt(language, script, mascot_name, mascot_id)
    if provider == "gemini" and settings.gemini_api_key:
        parsed = await _gemini(settings, prompt, history, user_text)
    elif settings.llm_api_key:
        parsed = await _openai(settings, prompt, history, user_text)
    else:
        return fallback
    if not parsed or not parsed.get("reply"):
        fallback["source"] = "fallback"
        return fallback
    parsed["npc"] = script["npc"]
    parsed["opening"] = ""
    parsed["source"] = "llm"
    if not parsed["hint_ru"]:
        parsed["hint_ru"] = fallback["hint_ru"]
    return parsed


def _history_messages(history: list[dict], user_text: str) -> list[dict]:
    messages = []
    for item in history[-8:]:
        role = "assistant" if item.get("role") == "assistant" else "user"
        text = (item.get("text") or "").strip()
        if text:
            messages.append({"role": role, "content": text})
    messages.append({"role": "user", "content": user_text.strip()})
    return messages


async def _openai(settings: Settings, prompt: str, history: list[dict], user_text: str) -> dict | None:
    messages = [{"role": "system", "content": prompt}, *_history_messages(history, user_text)]
    url = settings.llm_base_url.rstrip("/") + "/chat/completions"
    payload = {
        "model": settings.llm_model,
        "temperature": 0.4,
        "messages": messages,
        "response_format": {"type": "json_object"},
    }
    headers = {"Authorization": f"Bearer {settings.llm_api_key}", "Content-Type": "application/json"}
    try:
        async with httpx.AsyncClient(timeout=20) as client:
            response = await client.post(url, json=payload, headers=headers)
            if response.status_code == 400 and "response_format" in payload:
                payload = {k: v for k, v in payload.items() if k != "response_format"}
                response = await client.post(url, json=payload, headers=headers)
        response.raise_for_status()
        body = response.json()
        content = body["choices"][0]["message"]["content"]
        return _parse_model_json(content)
    except (httpx.HTTPError, KeyError, IndexError, TypeError, json.JSONDecodeError):
        return None


async def _gemini(settings: Settings, prompt: str, history: list[dict], user_text: str) -> dict | None:
    contents = []
    for item in _history_messages(history, user_text):
        role = "model" if item["role"] == "assistant" else "user"
        contents.append({"role": role, "parts": [{"text": item["content"]}]})
    url = (
        "https://generativelanguage.googleapis.com/v1beta/models/"
        f"{settings.gemini_model}:generateContent"
    )
    payload = {
        "systemInstruction": {"parts": [{"text": prompt}]},
        "contents": contents,
        "generationConfig": {"temperature": 0.4, "responseMimeType": "application/json"},
    }
    headers = {"Content-Type": "application/json", "x-goog-api-key": settings.gemini_api_key}
    try:
        async with httpx.AsyncClient(timeout=20) as client:
            response = await client.post(url, json=payload, headers=headers)
            if response.status_code == 400 and "responseMimeType" in payload["generationConfig"]:
                payload["generationConfig"] = {"temperature": 0.4}
                response = await client.post(url, json=payload, headers=headers)
        response.raise_for_status()
        parts = response.json()["candidates"][0]["content"]["parts"]
        text = "".join(part.get("text", "") for part in parts)
        return _parse_model_json(text)
    except (httpx.HTTPError, KeyError, IndexError, TypeError, json.JSONDecodeError):
        return None
