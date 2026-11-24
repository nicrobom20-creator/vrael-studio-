"""Server speech-to-text. Never invents a transcript when no key is configured.

Whisper is used when STT_API_KEY is set. Otherwise a Gemini key transcribes
inline audio through generateContent, which is what iPhone Telegram can send.
"""

import base64

import httpx

from app.config import get_settings
from app.services import ServiceError

_GEMINI_MIMES = {
    "audio/aac",
    "audio/flac",
    "audio/mp3",
    "audio/m4a",
    "audio/mpeg",
    "audio/mpga",
    "audio/mp4",
    "audio/opus",
    "audio/wav",
    "audio/webm",
}


def audio_mime(content_type: str, filename: str = "") -> str:
    raw = (content_type or "").split(";", 1)[0].strip().lower()
    if raw in _GEMINI_MIMES:
        return raw
    name = (filename or "").lower()
    if name.endswith(".mp4") or name.endswith(".m4a"):
        return "audio/mp4"
    if name.endswith(".aac"):
        return "audio/aac"
    if name.endswith(".wav"):
        return "audio/wav"
    if name.endswith(".mp3"):
        return "audio/mp3"
    return "audio/webm"


def gemini_audio_payload(data: bytes, content_type: str, filename: str = "") -> dict:
    """Request body for models.generateContent with inline audio.

    Matches the Gemini REST shape: contents[].parts[].inlineData { mimeType, data }
    where data is standard base64. audio/mp4 and audio/webm are accepted MIME types.
    """
    mime = audio_mime(content_type, filename)
    return {
        "contents": [
            {
                "role": "user",
                "parts": [
                    {
                        "text": (
                            "Transcribe the speech in this audio exactly. "
                            "Return only the transcript, with no quotes and no explanation."
                        )
                    },
                    {
                        "inlineData": {
                            "mimeType": mime,
                            "data": base64.b64encode(data).decode("ascii"),
                        }
                    },
                ],
            }
        ],
        "generationConfig": {"temperature": 0},
    }


def _gemini_text(payload: dict) -> str:
    candidates = payload.get("candidates") or []
    if not candidates:
        return ""
    parts = ((candidates[0].get("content") or {}).get("parts")) or []
    return "".join(str(part.get("text") or "") for part in parts).strip()


async def _whisper(data: bytes, filename: str, content_type: str, key: str) -> str:
    settings = get_settings()
    url = (settings.stt_base_url or "https://api.openai.com/v1").rstrip("/") + "/audio/transcriptions"
    try:
        async with httpx.AsyncClient(timeout=30) as client:
            response = await client.post(
                url,
                headers={"Authorization": f"Bearer {key}"},
                data={"model": settings.stt_model or "whisper-1"},
                files={"file": (filename or "phrase.webm", data, content_type or "application/octet-stream")},
            )
    except httpx.HTTPError as error:
        raise ServiceError(502, "Сервис распознавания не ответил. Попробуй ещё раз.") from error
    if response.status_code >= 400:
        raise ServiceError(502, "Сервис распознавания отклонил запись. Попробуй ещё раз.")
    try:
        return str((response.json() or {}).get("text") or "").strip()
    except ValueError:
        return ""


async def _gemini(data: bytes, filename: str, content_type: str, key: str) -> str:
    settings = get_settings()
    model = settings.gemini_model or "gemini-3.1-flash-lite"
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"
    body = gemini_audio_payload(data, content_type, filename)
    try:
        async with httpx.AsyncClient(timeout=30) as client:
            response = await client.post(
                url,
                json=body,
                headers={"Content-Type": "application/json", "x-goog-api-key": key},
            )
    except httpx.HTTPError as error:
        raise ServiceError(502, "Сервис распознавания не ответил. Попробуй ещё раз.") from error
    if response.status_code >= 400:
        raise ServiceError(502, "Сервис распознавания отклонил запись. Попробуй ещё раз.")
    try:
        return _gemini_text(response.json())
    except ValueError:
        return ""


async def transcribe(data: bytes, filename: str, content_type: str) -> str:
    settings = get_settings()
    stt_key = (settings.stt_api_key or "").strip()
    if stt_key:
        return await _whisper(data, filename, content_type, stt_key)
    gemini_key = (settings.gemini_api_key or "").strip()
    if gemini_key:
        return await _gemini(data, filename, content_type, gemini_key)
    openai_key = (settings.llm_api_key or "").strip() if settings.llm_provider == "openai" else ""
    if openai_key:
        return await _whisper(data, filename, content_type, openai_key)
    raise ServiceError(
        503,
        "Распознавание речи выключено: задай STT_API_KEY или GEMINI_API_KEY.",
    )
