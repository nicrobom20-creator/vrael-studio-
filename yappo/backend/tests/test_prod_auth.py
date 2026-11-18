import hashlib
import hmac
import json
import time
from urllib.parse import urlencode

from fastapi.testclient import TestClient

from app.config import get_settings
from app.security import sign_session

BOT = "123456:TEST_TOKEN"


def signed_init(*, user_id=4242, name="Аня", auth_date=None, start_param="", token=BOT):
    if auth_date is None:
        auth_date = int(time.time())
    user = json.dumps({"id": user_id, "first_name": name, "username": "anya"}, separators=(",", ":"), ensure_ascii=False)
    fields = {"auth_date": str(auth_date), "query_id": "AAE", "user": user}
    if start_param:
        fields["start_param"] = start_param
    check = "\n".join(f"{key}={fields[key]}" for key in sorted(fields))
    secret = hmac.new(b"WebAppData", token.encode(), hashlib.sha256).digest()
    fields["hash"] = hmac.new(secret, check.encode(), hashlib.sha256).hexdigest()
    return urlencode(fields)


def prod_client(tmp_path, monkeypatch, **env):
    monkeypatch.setenv("DEMO_MODE", "false")
    monkeypatch.setenv("BOT_TOKEN", BOT)
    monkeypatch.setenv("APP_SECRET", "test-secret")
    monkeypatch.setenv("DATABASE_URL", f"sqlite:///{tmp_path}/yappo.db")
    monkeypatch.setenv("ROLLYPAY_API_KEY", "")
    monkeypatch.setenv("ROLLYPAY_TEST", "false")
    monkeypatch.setenv("WEBAPP_URL", "https://yappo-8jvt.onrender.com")
    for key, value in env.items():
        monkeypatch.setenv(key, value)
    get_settings.cache_clear()
    from app import db as database
    from app.main import create_app

    database.reset_engine()
    app = create_app()
    return TestClient(app)


def test_production_rejects_demo_stale_and_bad_initdata_and_expired_session(tmp_path, monkeypatch):
    with prod_client(tmp_path, monkeypatch) as client:
        demo = client.post("/api/auth/demo", json={"device_id": "device"})
        assert demo.status_code == 404

        bad = client.post("/api/auth/telegram", json={"init_data": "auth_date=1&user=%7B%7D&hash=ab"})
        assert bad.status_code == 401

        stale = signed_init(auth_date=int(time.time()) - 90000)
        assert client.post("/api/auth/telegram", json={"init_data": stale}).status_code == 401

        future = signed_init(auth_date=int(time.time()) + 30)
        assert client.post("/api/auth/telegram", json={"init_data": future}).status_code == 200

        ok = client.post("/api/auth/telegram", json={"init_data": signed_init()})
        assert ok.status_code == 200
        token = ok.json()["token"]
        me = client.get("/api/me", headers={"Authorization": f"Bearer {token}"})
        assert me.status_code == 200
        assert me.json()["name"] == "Аня"

        expired = sign_session(me.json()["id"], "test-secret", ttl_seconds=-10)
        assert client.get("/api/me", headers={"Authorization": f"Bearer {expired}"}).status_code == 401

        calls = [
            ("get", "/api/me", None),
            ("post", "/api/onboarding", {"language": "fr", "mascot": "parrot", "daily_goal": 15, "timezone": "Europe/Moscow"}),
            ("patch", "/api/settings", {"reminder_time": "19:30"}),
            ("get", "/api/path", None),
            ("get", "/api/lessons/fr-1-vocab", None),
            ("post", "/api/lessons/fr-1-vocab/complete", {"mistakes": 0}),
            ("get", "/api/stories/fr-1-story", None),
            ("post", "/api/stories/fr-1-story/complete", {}),
            ("get", "/api/quests", None),
            ("get", "/api/scenes", None),
            ("post", "/api/chat", {"scene": "cafe", "text": "Hello"}),
            ("get", "/api/leaderboard", None),
            ("get", "/api/referrals", None),
            ("post", "/api/billing/checkout", {"plan": "month"}),
        ]
        for method, path, body in calls:
            kwargs = {"json": body} if body is not None else {}
            response = getattr(client, method)(path, **kwargs)
            assert response.status_code == 401, (path, response.status_code, response.text)
            assert response.status_code != 500

        missing = client.get("/api/lessons/no-such", headers={"Authorization": f"Bearer {token}"})
        assert missing.status_code == 404

        checkout = client.post(
            "/api/billing/checkout",
            json={"plan": "year"},
            headers={"Authorization": f"Bearer {token}"},
        )
        assert checkout.status_code == 200
        assert checkout.json()["available"] is False
        assert checkout.json()["message"] == "Оплата скоро заработает"

        cors = client.options(
            "/api/public",
            headers={"Origin": "https://yappo-8jvt.onrender.com", "Access-Control-Request-Method": "GET"},
        )
        assert cors.headers.get("access-control-allow-origin") == "*"


def test_menu_button_and_start_keyboard_require_https(monkeypatch):
    monkeypatch.setenv("WEBAPP_URL", "https://yappo-8jvt.onrender.com")
    get_settings.cache_clear()
    from app.bot import menu_button, open_keyboard

    button = menu_button("https://yappo-8jvt.onrender.com")
    assert button is not None
    assert button.web_app.url == "https://yappo-8jvt.onrender.com"
    assert menu_button("http://localhost:5173") is None
    keyboard = open_keyboard()
    labels = [button.text for row in keyboard.inline_keyboard for button in row]
    assert labels[0] == "Открыть Yappo"
    assert "Тарифы" in labels
    assert "Политика конфиденциальности" in labels
    assert "Пользовательское соглашение" in labels
    assert "Поддержка" in labels
    assert keyboard.inline_keyboard[0][0].web_app is not None
    from app.bot import pricing_text

    text = pricing_text()
    assert "199 ₽ за 30 дней" in text
    assert "1999 ₽ за 365 дней" in text
    assert "3 урока в день" in text
    assert "5 сообщений" in text
    assert "/pricing" in text
    assert "~16%" in text
    get_settings.cache_clear()
