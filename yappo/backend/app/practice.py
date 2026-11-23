"""Shuffle exercise options and score the short placement test."""

import copy
import random

LEVEL_COPY = {
    "start": {
        "title": "Только начинаю",
        "can": "Через пару недель ты спокойно поздороваешься, закажешь чай и спросишь дорогу.",
        "when": "около 3 недель в твоём темпе",
    },
    "words": {
        "title": "Знаю пару слов",
        "can": "Соберёшь короткие фразы в кафе и поймёшь простой ответ.",
        "when": "около 2 недель",
    },
    "base": {
        "title": "Знаю базу",
        "can": "Удержишь бытовой разговор и не растеряешься в городе.",
        "when": "около 10 дней, чтобы закрыть первую главу уверенно",
    },
    "talk": {
        "title": "Могу поддержать разговор",
        "can": "Сможешь поддержать беседу и поправить себя на ходу.",
        "when": "глава за главой, без спешки",
    },
    "confident": {
        "title": "Уверенный уровень",
        "can": "Живые сцены и собеседник будут звучать как практика, а не как учебник.",
        "when": "сразу в разговоре",
    },
}

PLACEMENT = [
    {
        "id": "thanks",
        "prompt": "Как сказать «спасибо»?",
        "options": ["Thank you", "Please", "Sorry", "Hello"],
        "answer": "Thank you",
    },
    {
        "id": "tea",
        "prompt": "«Чай, пожалуйста»",
        "options": ["A tea, please.", "A ticket, please.", "Good night.", "Where is it?"],
        "answer": "A tea, please.",
    },
    {
        "id": "where",
        "prompt": "Как спросить, где вокзал?",
        "options": ["Where is the station?", "How much is it?", "My name is Anna.", "See you later."],
        "answer": "Where is the station?",
    },
    {
        "id": "from",
        "prompt": "«Я из России»",
        "options": ["I'm from Russia.", "I'm learning.", "I don't understand.", "Nice to meet you."],
        "answer": "I'm from Russia.",
    },
    {
        "id": "much",
        "prompt": "Как спросить цену?",
        "options": ["How much is this?", "Where are you from?", "Good morning.", "Two tickets."],
        "answer": "How much is this?",
    },
]


def shuffle_steps(steps: list) -> list:
    """Move the correct choice off a fixed first slot. The right text stays the right text."""
    out = copy.deepcopy(steps)
    for step in out:
        kind = step.get("type")
        if kind in {"choice", "listen", "gap"} and step.get("options"):
            options = list(step["options"])
            index = int(step.get("answer") or 0)
            if not 0 <= index < len(options):
                continue
            correct = options[index]
            random.shuffle(options)
            step["options"] = options
            step["answer"] = options.index(correct)
        elif kind == "match" and step.get("pairs"):
            random.shuffle(step["pairs"])
        elif kind == "build" and step.get("extra"):
            extra = list(step["extra"])
            random.shuffle(extra)
            step["extra"] = extra
    return out


def placement_questions() -> list[dict]:
    questions = []
    for item in PLACEMENT:
        options = list(item["options"])
        random.shuffle(options)
        questions.append({"id": item["id"], "prompt": item["prompt"], "options": options})
    return questions


def grade_placement(answers: dict) -> dict:
    correct = 0
    for item in PLACEMENT:
        if (answers or {}).get(item["id"]) == item["answer"]:
            correct += 1
    if correct <= 0:
        level = "start"
    elif correct == 1:
        level = "words"
    elif correct <= 3:
        level = "base"
    elif correct == 4:
        level = "talk"
    else:
        level = "confident"
    plan = LEVEL_COPY[level]
    return {
        "level": level,
        "title": plan["title"],
        "can": plan["can"],
        "when": plan["when"],
        "correct": correct,
        "total": len(PLACEMENT),
    }
