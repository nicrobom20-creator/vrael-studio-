from app.content import LANGUAGES, chapters_for


REQUIRED = {"vocabulary", "listen", "speak", "match"}


def test_every_language_has_a_playable_first_chapter_and_a_second():
    for code in LANGUAGES:
        chapters = chapters_for(code)
        assert len(chapters) >= 2
        first = chapters[0]
        kinds = [node["kind"] for node in first["nodes"]]
        skills = {node["skill"] for node in first["nodes"] if node["kind"] == "lesson"}
        assert kinds[0] == "story"
        assert kinds.count("story") >= 2
        assert REQUIRED <= skills
        assert len([node for node in first["nodes"] if node["kind"] == "lesson"]) >= 6
        second = chapters[1]
        assert second["nodes"][0]["kind"] == "story"
        assert second["title"]
        assert second["subtitle"]
        assert len(second["nodes"]) >= 2


def test_chinese_vocab_has_pinyin_and_hanzi():
    chapter = chapters_for("zh")[0]
    vocab = next(node for node in chapter["nodes"] if node.get("skill") == "vocabulary")
    for step in vocab["steps"]:
        if step["type"] != "vocab":
            continue
        assert step["word"]
        assert step["reading"]
        assert any("\u4e00" <= char <= "\u9fff" for char in step["word"])
