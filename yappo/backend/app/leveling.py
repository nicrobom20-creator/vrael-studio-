"""Pick lesson lines from the learner's level and from how far they are in the city."""

from app.content import chapter_by_id, get_node
from app.level_content import EXTRA

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


def steps_for(node_id: str, user) -> list[dict]:
    node = get_node(node_id)
    if node is None:
        return []
    chapter = chapter_by_id(node.get("chapter_id", ""))
    index = chapter["index"] if chapter else 1
    band = effective_band(user, index)
    catalog = list(node.get("steps") or [])
    replacement = EXTRA.get(node_id, {}).get(band)
    if replacement:
        chosen = list(replacement)
    else:
        tagged = [step for step in catalog if step.get("band", "beginner") == band]
        chosen = tagged or catalog
    return [_tighten(dict(step), band) for step in chosen]


def is_city_boss(node: dict) -> bool:
    chapter = chapter_by_id(node.get("chapter_id", ""))
    if not chapter:
        return False
    lessons = [item for item in chapter["nodes"] if item.get("kind") == "lesson"]
    return bool(lessons) and lessons[-1]["id"] == node.get("id")


def boss_steps(band: str) -> list[dict]:
    """A short finale that is not another copy of the lesson's first card."""
    if band == "advanced":
        return [
            {
                "type": "dictate",
                "prompt": "Финал города. Напиши, что слышишь",
                "phrase": "I wouldn't miss it for the world.",
                "translation": "Ни за что не пропустил бы.",
                "tts": "I wouldn't miss it for the world.",
            },
            {
                "type": "talk",
                "prompt": "Хозяин города спрашивает, останешься ли ещё.",
                "beats": [
                    {"text": "I could get used to this.", "note": "Он открывает последнюю калитку.", "best": True},
                    {"text": "No more city.", "note": "Калитка остаётся прикрытой: фраза слишком резкая.", "best": False},
                ],
            },
        ]
    if band == "mid":
        return [
            {
                "type": "dictate",
                "prompt": "Финал города. Напиши, что слышишь",
                "phrase": "Could I have the bill, please?",
                "translation": "Можно счёт, пожалуйста?",
                "tts": "Could I have the bill, please?",
            },
            {
                "type": "speed",
                "prompt": "Финал. Успей выбрать.",
                "options": ["I'll have the same.", "I am the same.", "Keep the seat."],
                "answer": 0,
                "explain": "I'll have the same — мне то же самое.",
                "seconds": 6,
            },
        ]
    return [
        {
            "type": "speed",
            "prompt": "Финал города. Успей.",
            "options": ["Thank you", "Sorry", "Ticket"],
            "answer": 0,
            "explain": "Thank you — спасибо.",
            "seconds": 6,
        },
        {
            "type": "dictate",
            "prompt": "Напиши, что слышишь",
            "phrase": "A tea, please.",
            "translation": "Чай, пожалуйста.",
            "tts": "A tea, please.",
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


def story_lines(node_id: str, user) -> list[dict] | None:
    node = get_node(node_id)
    if node is None:
        return None
    chapter = chapter_by_id(node.get("chapter_id", ""))
    band = effective_band(user, chapter["index"] if chapter else 1)
    return STORIES.get(node_id, {}).get(band)


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
