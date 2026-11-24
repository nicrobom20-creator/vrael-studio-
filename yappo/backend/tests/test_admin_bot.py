import asyncio
from unittest.mock import AsyncMock

from app import db
from app.admin_bot import REFUSAL, PrivateMiddleware, cmd_help
from app.config import get_settings
from app.models import User
from app.security import sign_session


def _bearer(telegram_id: int, code: str) -> dict:
    database = db.SessionLocal()
    try:
        user = User(
            telegram_id=telegram_id,
            username=code.lower(),
            first_name=code,
            referral_code=code,
            public_id=f"YP-{code[:6]}",
        )
        database.add(user)
        database.commit()
        user_id = user.id
    finally:
        database.close()
    return {"Authorization": f"Bearer {sign_session(user_id, get_settings().app_secret)}"}


def test_owner_start_replies_and_stranger_is_refused(client, monkeypatch):
    monkeypatch.setenv("OWNER_TELEGRAM_ID", "8343237505")
    get_settings.cache_clear()
    owner_headers = _bearer(8343237505, "OWN834")

    async def run():
        middleware = PrivateMiddleware()
        stranger = AsyncMock()
        stranger.from_user.id = 111
        stranger.answer = AsyncMock()

        async def should_not_run(event, data):
            raise AssertionError("stranger reached a handler")

        await middleware(should_not_run, stranger, {})
        stranger.answer.assert_awaited_once_with(REFUSAL)

        owner = AsyncMock()
        owner.from_user.id = 8343237505
        owner.answer = AsyncMock()

        async def help_handler(event, data):
            await cmd_help(event, data["access"])

        await middleware(help_handler, owner, {})
        text = owner.answer.await_args.args[0]
        assert "Yappo admin" in text
        assert "/find" in text
        assert "/deleteuser" in text

    asyncio.run(run())

    stats = client.get("/api/admin/stats", headers=owner_headers)
    assert stats.status_code == 200, stats.text
    assert "users" in stats.json()

    stranger = client.post(
        "/api/auth/demo",
        json={"device_id": "device-admin-test-1", "start_param": ""},
    )
    assert stranger.status_code == 200
    hidden = client.get("/api/admin/stats", headers={"Authorization": f"Bearer {stranger.json()['token']}"})
    assert hidden.status_code == 403
    assert "users" not in hidden.text

    found = client.get("/api/admin/users", headers=owner_headers, params={"q": "8343237505"})
    assert found.status_code == 200
    card = found.json()["users"][0]
    assert card["telegram_id"] == 8343237505

    pupil_headers = _bearer(515151, "PUPIL1")
    pupil = client.get("/api/admin/users", headers=owner_headers, params={"q": "515151"})
    pupil_id = pupil.json()["users"][0]["id"]
    granted = client.post(f"/api/admin/users/{pupil_id}/premium", headers=owner_headers, json={"days": 3})
    assert granted.status_code == 200
    assert granted.json()["premium"] is True

    added = client.post("/api/admin/admins", headers=owner_headers, json={"telegram_id": 777001, "can_invite": False})
    assert added.status_code == 200
    invited = client.post("/api/admin/admins/777001/invite", headers=owner_headers)
    assert invited.status_code == 200
    helper_headers = _bearer(777001, "HELP77")
    assert client.get("/api/admin/stats", headers=helper_headers).status_code == 200
    assert client.delete(f"/api/admin/users/{pupil_id}", headers=helper_headers).status_code == 403
    assert client.delete(f"/api/admin/users/{card['id']}", headers=owner_headers).status_code == 400
    assert client.delete(f"/api/admin/users/{pupil_id}", headers=owner_headers).status_code == 200
    assert client.get("/api/me", headers=pupil_headers).status_code == 401

    assert client.get("/health").status_code == 200
    assert client.post("/admin-bot/webhook", json={"update_id": 1}).status_code == 503
    get_settings.cache_clear()
