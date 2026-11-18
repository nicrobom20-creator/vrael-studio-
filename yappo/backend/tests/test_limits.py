from app.models import Progress
from app.services import ServiceError, complete_lesson, get_or_create_user, send_chat


def _ready(session):
    user, _ = get_or_create_user(session, 300, "anya", "Аня", "")
    user.language = "en"
    user.mascot = "parrot"
    user.onboarded = True
    user.timezone = "Europe/Moscow"
    session.add(Progress(user_id=user.id, node_id="en-1-story", xp=10, mistakes=0))
    session.commit()
    return user


def test_free_tier_stops_at_three_lessons_and_five_chats(session):
    user = _ready(session)
    ids = ["en-1-vocab", "en-1-choice", "en-1-match", "en-1-build"]
    for lesson_id in ids[:3]:
        result = complete_lesson(session, user, lesson_id, mistakes=1)
        assert result["user"]["usage"]["lessons_limit"] == 3
    try:
        complete_lesson(session, user, ids[3], mistakes=0)
        raise AssertionError("fourth lesson should be blocked")
    except ServiceError as error:
        assert error.status == 429
        assert error.detail["kind"] == "lesson"

    async def _chat(text):
        return await send_chat(session, user, scene="cafe", text=text, history=[], hint_only=False)

    import asyncio

    for index in range(5):
        payload = asyncio.run(_chat(f"Hello {index}"))
        assert payload["usage"]["chat_limit"] == 5
    try:
        asyncio.run(_chat("one more"))
        raise AssertionError("sixth message should be blocked")
    except ServiceError as error:
        assert error.status == 429
        assert error.detail["kind"] == "chat"


def test_premium_is_unlimited(session):
    from datetime import datetime, timedelta

    user = _ready(session)
    user.premium_until = datetime.utcnow() + timedelta(days=3)
    session.commit()
    for lesson_id in ["en-1-vocab", "en-1-choice", "en-1-match", "en-1-build"]:
        result = complete_lesson(session, user, lesson_id, mistakes=0)
        assert result["user"]["usage"]["lessons_limit"] is None
        assert result["user"]["premium"] is True
