"""Pick lesson lines from the learner's level and from how far they are in the city."""

from app.content import chapter_by_id, get_node
from app.phrase_bank import NPC, window

ORDER = ("beginner", "mid", "advanced")
SELF = {
    "start": "beginner",
    "words": "beginner",
    "base": "mid",
    "talk": "advanced",
    "confident": "advanced",
}


def resolve_band(user) -> str:
    raw = (getattr(user, "placement_level", "") or getattr(user, "english_level", "") or "start").strip()
    return SELF.get(raw, "beginner")


def effective_band(user, chapter_index: int) -> str:
    """Later cities are harder than the level the learner picked."""
    base = ORDER.index(resolve_band(user))
    shift = max(0, int(chapter_index) - 1)
    return ORDER[min(len(ORDER) - 1, base + min(shift, 2))]


def _answer_text(step: dict) -> str:
    kind = step.get("type")
    if kind in {"choice", "listen", "speed", "gap"} and isinstance(step.get("answer"), int):
        options = step.get("options") or []
        index = step["answer"]
        if 0 <= index < len(options):
            return str(options[index])
    if kind == "build":
        return " ".join(step.get("answer") or [])
    if kind in {"speak", "dictate"}:
        return str(step.get("phrase") or step.get("tts") or "")
    if kind == "vocab":
        return str(step.get("word") or "")
    if kind == "talk":
        for option in step.get("beats") or step.get("options") or []:
            if isinstance(option, dict) and option.get("best"):
                return str(option.get("text") or "")
    return ""


def _tighten(step: dict, band: str) -> dict:
    """Higher bands keep the right answer and fewer, closer choices."""
    if band == "beginner" or step.get("type") not in {"choice", "listen", "speed", "gap"}:
        return step
    options = list(step.get("options") or [])
    answer = step.get("answer")
    if not isinstance(answer, int) or not 0 <= answer < len(options) or len(options) <= 3:
        return step
    correct = options[answer]
    rest = [item for item in options if item != correct][:2]
    step = dict(step)
    step["options"] = [correct, *rest]
    step["answer"] = 0
    return step


def _chapter(node: dict) -> dict | None:
    return chapter_by_id(node.get("chapter_id", ""))


def difficulty_rank(node: dict, user) -> int:
    """Level, city, and the node's place in the city each add difficulty."""
    chapter = _chapter(node)
    index = chapter["index"] if chapter else 1
    nodes = chapter["nodes"] if chapter else [node]
    if node.get("kind") == "lesson":
        ordered = [item for item in nodes if item.get("kind") == "lesson"]
    else:
        ordered = nodes
    position = next((i for i, item in enumerate(ordered) if item["id"] == node.get("id")), 0)
    level = {"beginner": 0, "mid": 4, "advanced": 8}[resolve_band(user)]
    return level + (index - 1) * 2 + position


def _choice_count(rank: int) -> int:
    return 3 if rank >= 8 else 4


def _say_options(correct: str, phrases: list[dict], count: int) -> list[str]:
    rest = [item["say"] for item in phrases if item["say"] != correct]
    fillers = ["…", "?", "—"]
    while len(rest) < count - 1:
        rest.append(fillers[len(rest) % len(fillers)])
    return [correct, *rest[: count - 1]]


def _ru_options(correct: str, phrases: list[dict], count: int) -> list[str]:
    rest = [item["ru"] for item in phrases if item["ru"] != correct]
    while len(rest) < count - 1:
        rest.append("не то")
    return [correct, *rest[: count - 1]]


def _steps_from(node: dict, phrases: list[dict], rank: int) -> list[dict]:
    skill = node.get("skill") or "vocabulary"
    count = _choice_count(rank)
    seconds = 8 if rank < 4 else 6 if rank < 8 else 5
    steps: list[dict] = []
    if skill == "vocabulary":
        for item in phrases:
            steps.append({
                "type": "vocab",
                "word": item["say"],
                "reading": item["reading"],
                "translation": item["ru"],
                "example": item["say"],
                "example_ru": item["ru"],
                "tts": item["say"],
                "hint": item["hint"],
            })
        lead = phrases[0]
        steps.append({
            "type": "choice",
            "prompt": f"Как сказать «{lead['ru']}»?",
            "sub": "Выбери живой вариант",
            "options": _say_options(lead["say"], phrases, count),
            "answer": 0,
            "explain": f"{lead['say']} — {lead['ru']}.",
        })
    elif skill == "match":
        steps.append({
            "type": "match",
            "prompt": "Соедини фразу и смысл",
            "pairs": [{"left": item["say"], "right": item["ru"]} for item in phrases],
        })
    elif skill == "build":
        for item in phrases:
            extra = [other["parts"][-1] for other in phrases if other is not item][:2]
            steps.append({
                "type": "build",
                "prompt": "Собери фразу",
                "ru": item["ru"],
                "answer": list(item["parts"]),
                "extra": extra or ["…"],
                "tts": item["say"],
            })
    elif skill == "listen":
        for item in phrases:
            steps.append({
                "type": "listen",
                "prompt": "Что ты слышишь?",
                "tts": item["say"],
                "options": _ru_options(item["ru"], phrases, count),
                "answer": 0,
                "explain": f"{item['say']} — {item['ru']}.",
            })
    elif skill == "speak":
        for item in phrases:
            steps.append({
                "type": "speak",
                "prompt": "Скажи вслух",
                "phrase": item["say"],
                "translation": item["ru"],
                "tts": item["say"],
                "hint": item["hint"],
            })
    else:
        for item in phrases:
            steps.append({
                "type": "choice",
                "prompt": f"Как сказать «{item['ru']}»?",
                "sub": "Меньше опор, чем в начале пути" if rank >= 4 else "Выбери живой вариант",
                "options": _say_options(item["say"], phrases, count),
                "answer": 0,
                "explain": f"{item['say']} — {item['ru']}.",
            })
        if rank >= 4:
            gap = phrases[-1]
            missing = gap["parts"][-1]
            prompt = gap["say"].replace(missing, "____", 1)
            if "____" not in prompt:
                prompt = "____ " + gap["say"]
            steps.append({
                "type": "gap",
                "prompt": prompt,
                "sub": "Вставь пропущенное",
                "options": _say_options(missing, [{"say": part, "ru": ""} for part in (item["parts"][-1] for item in phrases)], count),
                "answer": 0,
                "explain": f"{gap['say']} — {gap['ru']}.",
            })
        steps.append({
            "type": "speed",
            "prompt": f"Успей: «{phrases[0]['ru']}»",
            "options": _say_options(phrases[0]["say"], phrases, count),
            "answer": 0,
            "explain": f"{phrases[0]['say']} — {phrases[0]['ru']}.",
            "seconds": seconds,
        })
    if skill in {"listen", "speak"} and rank >= 6:
        heard = phrases[-1]
        steps.append({
            "type": "dictate",
            "prompt": "Напиши, что слышишь",
            "phrase": heard["say"],
            "translation": heard["ru"],
            "tts": heard["say"],
        })
    if skill == "speak" and rank >= 8:
        best = phrases[0]
        rude = phrases[-1]
        steps.append({
            "type": "talk",
            "prompt": "Собеседник ждёт живой ответ. Выбери реплику.",
            "beats": [
                {"text": best["say"], "note": f"Разговор продолжается: {best['ru']}.", "best": True},
                {"text": rude["say"], "note": "Смысл не тот, и разговор сбивается.", "best": False},
            ],
        })
    return steps


def steps_for(node_id: str, user) -> list[dict]:
    node = get_node(node_id)
    if node is None or node.get("kind") != "lesson":
        return []
    rank = difficulty_rank(node, user)
    language = node.get("language") or "en"
    return _steps_from(node, window(language, rank), rank)


def is_city_boss(node: dict) -> bool:
    chapter = chapter_by_id(node.get("chapter_id", ""))
    if not chapter:
        return False
    lessons = [item for item in chapter["nodes"] if item.get("kind") == "lesson"]
    return bool(lessons) and lessons[-1]["id"] == node.get("id")


def boss_steps(node: dict, user) -> list[dict]:
    """Finale uses a harder slice than the lesson that leads into it."""
    language = node.get("language") or "en"
    rank = difficulty_rank(node, user) + 3
    phrases = window(language, rank)
    heard = phrases[-1]
    best = phrases[0]
    return [
        {
            "type": "dictate",
            "prompt": "Финал города. Напиши, что слышишь",
            "phrase": heard["say"],
            "translation": heard["ru"],
            "tts": heard["say"],
        },
        {
            "type": "talk",
            "prompt": "Хозяин города ждёт последнюю реплику.",
            "beats": [
                {"text": best["say"], "note": f"Калитка открывается. Смысл: {best['ru']}.", "best": True},
                {"text": heard["say"], "note": "Фраза мимо, и разговор обрывается.", "best": False},
            ],
        },
    ]


STORIES = {
    "en-1-story": {
        "mid": [
            {"speaker": "mascot", "text": "В этом кафе одного hello уже мало. Послушай, как просят счёт.", "emotion": "wave", "name": ""},
            {"speaker": "npc", "text": "Could I get you anything else, or shall I bring the bill?", "emotion": "happy", "name": "Оливер"},
            {"speaker": "mascot", "text": "Anything else — что-нибудь ещё. The bill — счёт. Сейчас скажешь это сам.", "emotion": "think", "name": ""},
        ],
        "advanced": [
            {"speaker": "mascot", "text": "Оливер говорит быстро и идиомами. Не переводи слово в слово — лови смысл.", "emotion": "wave", "name": ""},
            {"speaker": "npc", "text": "I'm easy either way, but that last pot really hit the spot.", "emotion": "happy", "name": "Оливер"},
            {"speaker": "mascot", "text": "I'm easy either way — мне всё равно. Hit the spot — вот это то, что нужно.", "emotion": "think", "name": ""},
        ],
    },
    "en-2-story": {
        "mid": [
            {"speaker": "mascot", "text": "На рынке тебя спросят про оплату, не про «хлеб» из учебника.", "emotion": "wave", "name": ""},
            {"speaker": "npc", "text": "Are you just looking, or do you take cards as well?", "emotion": "happy", "name": "Майя"},
            {"speaker": "mascot", "text": "Just looking — просто смотрю. Do you take cards — вы принимаете карты?", "emotion": "think", "name": ""},
        ],
        "advanced": [
            {"speaker": "mascot", "text": "Цена кусается. Здесь торгуются, а не читают карточки.", "emotion": "wave", "name": ""},
            {"speaker": "npc", "text": "It's a bit steep, but I can do better if you take it now.", "emotion": "happy", "name": "Майя"},
            {"speaker": "mascot", "text": "A bit steep — дороговато. Do better — уступить в цене.", "emotion": "think", "name": ""},
        ],
    },
}


def _story_from(language: str, phrases: list[dict]) -> list[dict]:
    lead = phrases[0]
    return [
        {"speaker": "mascot", "text": f"Слушай целиком. Смысл: {lead['ru']}.", "emotion": "wave", "name": ""},
        {"speaker": "npc", "text": lead["say"], "emotion": "happy", "name": NPC.get(language, "")},
        {"speaker": "mascot", "text": f"{lead['say']} — {lead['ru']}.", "emotion": "think", "name": ""},
    ]


def story_lines(node_id: str, user) -> list[dict] | None:
    node = get_node(node_id)
    if node is None or node.get("kind") != "story":
        return None
    chapter = _chapter(node)
    index = chapter["index"] if chapter else 1
    band = effective_band(user, index)
    custom = STORIES.get(node_id, {}).get(band)
    if custom:
        return custom
    rank = difficulty_rank(node, user)
    if rank == 0:
        return None
    return _story_from(node.get("language") or "en", window(node.get("language") or "en", rank))


def hint_for(step: dict, stage: int) -> dict:
    """Progressive hint. Stage 1 is a letter, 2 a meaning, 3 a slow replay. Never the whole answer."""
    answer = _answer_text(step)
    meaning = step.get("translation") or step.get("ru") or step.get("explain") or step.get("hint") or ""
    stage = max(1, min(3, int(stage or 1)))
    if stage == 1:
        letter = next((char for char in answer if char.isalpha()), "")
        text = f"Первая буква: {letter.upper()}" if letter else "Послушай ещё раз и поймай первое слово."
    elif stage == 2:
        text = str(meaning)[:180] or "Смысл рядом с подсказкой внизу карточки."
    else:
        text = "Сейчас фраза прозвучит медленнее. Повтори её по частям."
    return {"stage": stage, "text": text, "slow": stage == 3, "phrase": answer if stage == 3 else ""}
