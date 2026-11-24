import asyncio

from app.leveling import steps_for
from app.models import Progress
from app.services import ServiceError, get_or_create_user, lesson_payload, spend_hint
from app.speech import transcribe


class Band:
    def __init__(self, level):
        self.english_level = level
        self.placement_level = ""


def test_beginner_and_advanced_lessons_differ():
    easy = steps_for("en-1-vocab", Band("start"))
    hard = steps_for("en-1-vocab", Band("confident"))
    easy_words = " ".join(step.get("word") or step.get("phrase") or "" for step in easy)
    hard_words = " ".join(step.get("word") or step.get("phrase") or "" for step in hard)
    assert "Hello" in easy_words
    assert "either way" in hard_words.lower()
    assert "Hello" not in hard_words


def test_later_city_is_harder_for_a_beginner():
    first = steps_for("en-1-choice", Band("start"))
    later = steps_for("en-3-choice", Band("start"))
    first_blob = " ".join(str(step.get("prompt") or "") for step in first).lower()
    later_blob = " ".join(str(step) for step in later).lower()
    assert "кофе" in first_blob or "coffee" in first_blob
    assert "lifesaver" in later_blob or "quite with you" in later_blob


def test_lesson_payload_uses_the_saved_level(session):
    user, _ = get_or_create_user(session, 910, "level", "Лея", "")
    user.language = "en"
    user.mascot = "parrot"
    user.onboarded = True
    user.english_level = "talk"
    user.placement_level = "confident"
    session.add(Progress(user_id=user.id, node_id="en-1-story", xp=10, mistakes=0))
    session.commit()
    payload = lesson_payload(session, user, "en-1-vocab")
    blob = " ".join(step.get("word") or step.get("phrase") or "" for step in payload["steps"])
    assert payload["band"] == "advanced"
    assert "either way" in blob.lower()


def test_hints_stop_at_five_for_a_free_learner(session):
    user, _ = get_or_create_user(session, 911, "hint", "Ника", "")
    user.language = "en"
    user.mascot = "parrot"
    user.onboarded = True
    user.english_level = "start"
    session.commit()
    for _ in range(5):
        result = spend_hint(session, user, "en-1-vocab", 0, 1)
        assert result["text"]
        assert "Hello" not in result["text"]
    try:
        spend_hint(session, user, "en-1-vocab", 0, 1)
        raise AssertionError("sixth hint should stop")
    except ServiceError as error:
        assert error.status == 429
        assert error.detail["remaining"] == 0


def test_every_language_and_city_gets_harder(session):
    from app.content import chapters_for

    for code in ("en", "fr", "es", "de", "zh"):
        previous = ""
        for chapter in chapters_for(code):
            for node in chapter["nodes"]:
                if node["kind"] != "lesson":
                    story = __import__("app.leveling", fromlist=["story_lines"]).story_lines(node["id"], Band("start"))
                    if chapter["index"] > 1 or node["id"].endswith("boss"):
                        assert story and story[1]["text"]
                    continue
                steps = steps_for(node["id"], Band("start"))
                blob = " ".join(
                    str(step.get("word") or step.get("phrase") or step.get("tts") or step.get("prompt") or "")
                    for step in steps
                )
                assert blob.strip()
                assert blob != previous
                previous = blob
        easy = steps_for(f"{code}-1-vocab", Band("start"))
        hard = steps_for(f"{code}-1-vocab", Band("confident"))
        assert (easy[0].get("word") or "") != (hard[0].get("word") or "")


def test_gemini_audio_body_matches_the_docs():
    from app.speech import gemini_audio_payload

    body = gemini_audio_payload(b"abcdef", "audio/mp4;codecs=mp4a", "phrase.mp4")
    inline = body["contents"][0]["parts"][1]["inlineData"]
    assert body["contents"][0]["role"] == "user"
    assert inline["mimeType"] == "audio/mp4"
    assert inline["data"]
    webm = gemini_audio_payload(b"abcdef", "audio/webm;codecs=opus", "phrase.webm")
    assert webm["contents"][0]["parts"][1]["inlineData"]["mimeType"] == "audio/webm"


def test_transcribe_uses_gemini_when_openai_key_is_absent(monkeypatch):
    import httpx

    from app.config import get_settings

    monkeypatch.setenv("STT_API_KEY", "")
    monkeypatch.setenv("LLM_API_KEY", "")
    monkeypatch.setenv("GEMINI_API_KEY", "gem-key")
    monkeypatch.setenv("GEMINI_MODEL", "gemini-3.1-flash-lite")
    get_settings.cache_clear()
    seen = {}

    class Response:
        status_code = 200

        def json(self):
            return {"candidates": [{"content": {"parts": [{"text": "A coffee, please"}]}}]}

    class Client:
        def __init__(self, timeout=30):
            seen["timeout"] = timeout

        async def __aenter__(self):
            return self

        async def __aexit__(self, *args):
            return False

        async def post(self, url, json=None, headers=None, **kwargs):
            seen["url"] = url
            seen["json"] = json
            seen["headers"] = headers
            return Response()

    monkeypatch.setattr(httpx, "AsyncClient", Client)
    text = asyncio.run(transcribe(b"123456", "phrase.m4a", "audio/mp4"))
    assert text == "A coffee, please"
    assert seen["url"].endswith("/models/gemini-3.1-flash-lite:generateContent")
    assert seen["headers"]["x-goog-api-key"] == "gem-key"
    assert seen["json"]["contents"][0]["parts"][1]["inlineData"]["mimeType"] == "audio/mp4"
    get_settings.cache_clear()


def test_speech_refuses_without_a_key():
    try:
        asyncio.run(transcribe(b"not-audio" * 40, "phrase.webm", "audio/webm"))
        raise AssertionError("missing key should fail")
    except ServiceError as error:
        assert error.status == 503
        assert "STT_API_KEY" in str(error.detail)
