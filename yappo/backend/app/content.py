"""Mascots, languages and the playable course."""

from app.course_de import chapters as de_chapters
from app.course_de import scenes as de_scenes
from app.course_en import chapters as en_chapters
from app.course_en import scenes as en_scenes
from app.course_es import chapters as es_chapters
from app.course_es import scenes as es_scenes
from app.course_fr import chapters as fr_chapters
from app.course_fr import scenes as fr_scenes
from app.course_zh import chapters as zh_chapters
from app.course_zh import scenes as zh_scenes

MASCOTS = {
    "bunny": {
        "id": "bunny",
        "name": "Мими",
        "trait": "Любопытная",
        "blurb": "Ловит новые фразы и переспрашивает, пока слово не станет своим.",
        "map_line": "Ой, а как это будет? Давай узнаем.",
        "order": 0,
    },
    "bear": {
        "id": "bear",
        "name": "Бруно",
        "trait": "Любознательный",
        "blurb": "Тянет в новый город и не даёт бросить тропу на середине.",
        "map_line": "Дальше по тропе. Город сам не откроется.",
        "order": 1,
    },
    "parrot": {
        "id": "parrot",
        "name": "Яппо",
        "trait": "Дружелюбный",
        "blurb": "Главный гид Yappo. Рядом в каждом разговоре, даже если страшно открыть рот.",
        "map_line": "Готов учиться? Вперёд!",
        "order": 2,
    },
    "fox": {
        "id": "fox",
        "name": "Рыжик",
        "trait": "Игривый",
        "blurb": "Превращает повтор в игру и не даёт практике стать скучной.",
        "map_line": "Поймаем фразу, как карту на ветру.",
        "order": 3,
    },
    "cat": {
        "id": "cat",
        "name": "Нора",
        "trait": "Вдумчивая",
        "blurb": "Просит послушать ещё раз и запомнить форму, а не только перевод.",
        "map_line": "Тише. Сначала услышь слово, потом скажи.",
        "order": 4,
    },
}

LANGUAGES = {
    "en": {
        "code": "en",
        "name": "Английский",
        "native": "English",
        "city": "Лондон",
        "country": "Англия",
        "tts": "en-GB",
        "place": "лондонском кафе",
    },
    "zh": {
        "code": "zh",
        "name": "Китайский",
        "native": "中文",
        "city": "Пекин",
        "country": "Китай",
        "tts": "zh-CN",
        "place": "пекинской чайной",
    },
    "es": {
        "code": "es",
        "name": "Испанский",
        "native": "Español",
        "city": "Мадрид",
        "country": "Испания",
        "tts": "es-ES",
        "place": "мадридском кафе",
    },
    "de": {
        "code": "de",
        "name": "Немецкий",
        "native": "Deutsch",
        "city": "Берлин",
        "country": "Германия",
        "tts": "de-DE",
        "place": "берлинском кафе",
    },
    "fr": {
        "code": "fr",
        "name": "Французский",
        "native": "Français",
        "city": "Париж",
        "country": "Франция",
        "tts": "fr-FR",
        "place": "парижском кафе",
    },
}

SCENE_META = {
    "cafe": "Кафе",
    "airport": "Аэропорт",
    "interview": "Собеседование",
}

_CHAPTERS = {
    "en": en_chapters,
    "zh": zh_chapters,
    "es": es_chapters,
    "de": de_chapters,
    "fr": fr_chapters,
}
_SCENES = {
    "en": en_scenes,
    "zh": zh_scenes,
    "es": es_scenes,
    "de": de_scenes,
    "fr": fr_scenes,
}

STEP_TYPES = {"vocab", "choice", "match", "build", "listen", "speak", "gap"}
CHAPTER_ONE_SKILLS = {"vocabulary", "choice", "match", "build", "listen", "speak"}


def build_catalog() -> dict:
    catalog = {}
    nodes = {}
    for code, factory in _CHAPTERS.items():
        chapters = factory()
        scenes = _SCENES[code]()
        catalog[code] = {
            "language": LANGUAGES[code],
            "chapters": chapters,
            "scenes": scenes,
        }
        for chapter in chapters:
            for node in chapter["nodes"]:
                if node["id"] in nodes:
                    raise ValueError(f"duplicate node {node['id']}")
                nodes[node["id"]] = {**node, "language": code}
    catalog["_nodes"] = nodes
    return catalog


CATALOG = build_catalog()
NODES: dict = CATALOG["_nodes"]


def language_meta(code: str) -> dict:
    return LANGUAGES[code]


def chapters_for(code: str) -> list[dict]:
    return CATALOG[code]["chapters"]


def ordered_nodes(code: str) -> list[dict]:
    nodes = []
    for chapter in chapters_for(code):
        nodes.extend(chapter["nodes"])
    return nodes


def get_node(node_id: str) -> dict | None:
    return NODES.get(node_id)


def chapter_by_id(chapter_id: str) -> dict | None:
    code = chapter_id.split("-", 1)[0]
    for chapter in chapters_for(code):
        if chapter["id"] == chapter_id:
            return chapter
    return None


def scenes_for(code: str) -> list[dict]:
    raw = CATALOG[code]["scenes"]
    items = []
    for key, scene in raw.items():
        items.append({
            "id": key,
            "title": scene["title"],
            "blurb": scene["blurb"],
            "npc": scene["npc"],
            "opening": scene["opening"],
            "group": SCENE_META.get(key, key),
        })
    return items


def scene_script(code: str, scene_id: str) -> dict | None:
    return CATALOG[code]["scenes"].get(scene_id)


def node_status(nodes: list[dict], index: int, done: set[str]) -> str:
    node = nodes[index]
    if node["id"] in done:
        return "done"
    if all(nodes[i]["id"] in done for i in range(index)):
        return "current"
    return "locked"


def is_playable(node_id: str, done: set[str]) -> bool:
    node = get_node(node_id)
    if node is None:
        return False
    nodes = ordered_nodes(node["language"])
    for index, item in enumerate(nodes):
        if item["id"] == node_id:
            return node_status(nodes, index, done) in {"done", "current"}
    return False


def validate_catalog() -> None:
    if set(CATALOG) - {"_nodes"} != set(LANGUAGES):
        raise ValueError("language set mismatch")
    for code in LANGUAGES:
        chapters = chapters_for(code)
        if len(chapters) < 3:
            raise ValueError(f"{code}: need 3 chapters")
        skills = set()
        for chapter in chapters:
            if not chapter["nodes"] or chapter["nodes"][0]["kind"] != "story":
                raise ValueError(f"{chapter['id']}: story must open the chapter")
            lessons = [n for n in chapter["nodes"] if n["kind"] == "lesson"]
            if chapter["index"] == 1 and len(lessons) < 6:
                raise ValueError(f"{chapter['id']}: chapter 1 needs 6 lessons")
            if chapter["index"] > 1 and len(lessons) < 4:
                raise ValueError(f"{chapter['id']}: later chapter is too thin")
            for node in chapter["nodes"]:
                if node["kind"] == "lesson":
                    skills.add(node["skill"]) if chapter["index"] == 1 else None
                    if not node["steps"]:
                        raise ValueError(f"{node['id']}: empty")
                    for step in node["steps"]:
                        _validate_step(node["id"], step, code)
                elif node["kind"] == "story" and len(node["lines"]) < 3:
                    raise ValueError(f"{node['id']}: short story")
        if not CHAPTER_ONE_SKILLS <= skills:
            raise ValueError(f"{code}: chapter 1 skills {skills}")
        for scene_id in ("cafe", "airport", "interview"):
            scene = scene_script(code, scene_id)
            if not scene or len(scene["beats"]) < 3:
                raise ValueError(f"{code} scene {scene_id}")
            if not scene["opening"]:
                raise ValueError(f"{code} {scene_id} opening")


def _validate_step(node_id: str, step: dict, language: str) -> None:
    kind = step.get("type")
    if kind not in STEP_TYPES:
        raise ValueError(f"{node_id}: bad step {kind}")
    if kind == "vocab":
        if not step["word"] or not step["translation"]:
            raise ValueError(f"{node_id}: vocab")
        if language == "zh" and not step.get("reading"):
            raise ValueError(f"{node_id}: pinyin missing for {step['word']}")
    elif kind == "gap":
        options = step["options"]
        if "____" not in step.get("prompt", "") or not (0 <= step["answer"] < len(options)):
            raise ValueError(f"{node_id}: gap")
    elif kind == "choice":
        options = step["options"]
        if not (0 <= step["answer"] < len(options)) or len(options) < 2:
            raise ValueError(f"{node_id}: choice")
        if not step.get("explain"):
            raise ValueError(f"{node_id}: explain")
    elif kind == "match":
        if len(step["pairs"]) < 3:
            raise ValueError(f"{node_id}: match")
    elif kind == "build":
        if len(step["answer"]) < 2 or not step.get("ru"):
            raise ValueError(f"{node_id}: build")
    elif kind == "listen":
        if not step["tts"] or not (0 <= step["answer"] < len(step["options"])):
            raise ValueError(f"{node_id}: listen")
    elif kind == "speak":
        if not step["phrase"] or not step["translation"]:
            raise ValueError(f"{node_id}: speak")


validate_catalog()
