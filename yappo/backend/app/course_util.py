"""Small constructors for lesson steps. Content lives in course_*.py."""


def vocab(word, translation, example, example_ru, reading=""):
    return {
        "type": "vocab",
        "word": word,
        "reading": reading,
        "translation": translation,
        "example": example,
        "example_ru": example_ru,
        "tts": word,
    }


def speed(prompt, options, answer, explain, seconds=8):
    return {
        "type": "speed",
        "prompt": prompt,
        "sub": "Успей выбрать",
        "options": list(options),
        "answer": answer,
        "explain": explain,
        "seconds": seconds,
    }


def gap(prompt, options, answer, explain):
    return {
        "type": "gap",
        "prompt": prompt,
        "sub": "Вставь пропущенное слово",
        "options": list(options),
        "answer": answer,
        "explain": explain,
    }


def choice(prompt, options, answer, explain, sub="Выбери правильный вариант"):
    return {
        "type": "choice",
        "prompt": prompt,
        "sub": sub,
        "options": list(options),
        "answer": answer,
        "explain": explain,
    }


def match(prompt, pairs):
    return {
        "type": "match",
        "prompt": prompt,
        "pairs": [{"left": left, "right": right} for left, right in pairs],
    }


def build(ru, answer, extra, prompt="Собери фразу"):
    return {
        "type": "build",
        "prompt": prompt,
        "ru": ru,
        "answer": list(answer),
        "extra": list(extra),
    }


def listen(tts, options, answer, explain, prompt="Что ты слышишь?"):
    return {
        "type": "listen",
        "prompt": prompt,
        "tts": tts,
        "options": list(options),
        "answer": answer,
        "explain": explain,
    }


def speak(phrase, translation, hint):
    return {
        "type": "speak",
        "prompt": "Скажи вслух",
        "phrase": phrase,
        "translation": translation,
        "tts": phrase,
        "hint": hint,
    }


def lesson(node_id, chapter_id, title, skill, steps, xp=20):
    return {
        "id": node_id,
        "kind": "lesson",
        "chapter_id": chapter_id,
        "title": title,
        "skill": skill,
        "xp": xp,
        "steps": steps,
    }


def story(node_id, chapter_id, title, lines):
    return {
        "id": node_id,
        "kind": "story",
        "chapter_id": chapter_id,
        "title": title,
        "xp": 10,
        "lines": lines,
    }


def chapter(node_id, index, title, subtitle, quest_title, quest_text, nodes, reward_xp=40, premium=False):
    return {
        "id": node_id,
        "index": index,
        "title": title,
        "subtitle": subtitle,
        "quest_title": quest_title,
        "quest_text": quest_text,
        "reward_xp": reward_xp,
        "premium": premium,
        "nodes": nodes,
    }


def line(speaker, text, emotion="happy", name=""):
    return {"speaker": speaker, "text": text, "emotion": emotion, "name": name}
