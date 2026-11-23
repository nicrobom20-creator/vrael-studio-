from app import db
from app.config import get_settings
from app.models import Admin, User
from app.practice import grade_placement, shuffle_steps
from app.security import sign_session


def test_choices_are_not_stuck_on_the_first_option():
    step = {
        "type": "choice",
        "options": ["Thank you", "Please", "Sorry", "Hello"],
        "answer": 0,
    }
    seen = set()
    for _ in range(40):
        shuffled = shuffle_steps([step])[0]
        assert shuffled["options"][shuffled["answer"]] == "Thank you"
        seen.add(shuffled["answer"])
    assert seen != {0}
    assert len(seen) >= 2


def test_register_login_trial_and_placement(client):
    created = client.post(
        "/api/auth/register",
        json={"email": "anya@example.com", "password": "secretpass", "name": "Аня"},
    )
    assert created.status_code == 200, created.text
    body = created.json()
    assert body["user"]["public_id"].startswith("YP-")
    assert body["user"]["email"] == "anya@example.com"
    assert "password" not in body["user"]
    assert body["user"]["access"] is None
    token = body["token"]
    headers = {"Authorization": f"Bearer {token}"}

    wrong = client.post("/api/auth/login", json={"email": "anya@example.com", "password": "nope-nope"})
    assert wrong.status_code == 401
    again = client.post("/api/auth/login", json={"email": "Anya@example.com", "password": "secretpass"})
    assert again.status_code == 200

    duplicate = client.post(
        "/api/auth/register",
        json={"email": "anya@example.com", "password": "secretpass", "name": "Аня"},
    )
    assert duplicate.status_code == 409

    onboard = client.post(
        "/api/onboarding",
        headers=headers,
        json={
            "language": "en",
            "mascot": "parrot",
            "daily_goal": 10,
            "timezone": "Europe/Moscow",
            "english_level": "words",
            "study_goal": "travel",
            "languages": ["en", "fr"],
        },
    )
    assert onboard.status_code == 200, onboard.text
    assert onboard.json()["daily_goal"] == 10
    assert onboard.json()["onboarded"] is True

    questions = client.get("/api/placement")
    assert questions.status_code == 200
    assert len(questions.json()["questions"]) == 5
    perfect = {item["id"]: item["options"][0] for item in []}
    graded = grade_placement({
        "thanks": "Thank you",
        "tea": "A tea, please.",
        "where": "Where is the station?",
        "from": "I'm from Russia.",
        "much": "How much is this?",
    })
    assert graded["level"] == "confident"
    saved = client.post("/api/placement", headers=headers, json={"answers": {
        "thanks": "Thank you",
        "tea": "A tea, please.",
        "where": "Where is the station?",
        "from": "I'm from Russia.",
        "much": "How much is this?",
    }})
    assert saved.status_code == 200
    assert saved.json()["level"] == "confident"

    trial = client.post("/api/trial", headers=headers)
    assert trial.status_code == 200
    assert trial.json()["premium"] is True
    assert trial.json()["trial_used"] is True
    repeat = client.post("/api/trial", headers=headers)
    assert repeat.status_code == 409
    assert perfect == {}


def _owner_headers(telegram_id: int = 424242) -> dict:
    db_session = db.SessionLocal()
    try:
        user = User(
            telegram_id=telegram_id,
            username="owner",
            first_name="Owner",
            referral_code=f"OWN{telegram_id}",
            public_id=f"YP-OWN{str(telegram_id)[-4:]}",
        )
        db_session.add(user)
        db_session.commit()
        user_id = user.id
    finally:
        db_session.close()
    return {"Authorization": f"Bearer {sign_session(user_id, get_settings().app_secret)}"}


def test_admin_panel_is_private(client, monkeypatch):
    monkeypatch.setenv("OWNER_TELEGRAM_ID", "424242")
    get_settings.cache_clear()
    stranger = client.post(
        "/api/auth/register",
        json={"email": "guest@example.com", "password": "secretpass", "name": "Гость"},
    )
    guest_headers = {"Authorization": f"Bearer {stranger.json()['token']}"}
    hidden = client.get("/api/admin/stats", headers=guest_headers)
    assert hidden.status_code == 403
    assert "users" not in hidden.text

    owner_headers = _owner_headers()
    stats = client.get("/api/admin/stats", headers=owner_headers)
    assert stats.status_code == 200, stats.text
    assert stats.json()["users"] >= 2

    found = client.get("/api/admin/users", headers=owner_headers, params={"q": "guest@example.com"})
    assert found.status_code == 200
    card = found.json()["users"][0]
    assert card["email"] == "guest@example.com"
    assert "password" not in card

    granted = client.post(
        f"/api/admin/users/{card['id']}/premium",
        headers=owner_headers,
        json={"days": 14},
    )
    assert granted.status_code == 200
    assert granted.json()["premium"] is True

    added = client.post(
        "/api/admin/admins",
        headers=owner_headers,
        json={"telegram_id": 777, "can_invite": False},
    )
    assert added.status_code == 200
    invited = client.post("/api/admin/admins/777/invite", headers=owner_headers)
    assert invited.status_code == 200
    assert invited.json()["can_invite"] is True

    db_session = db.SessionLocal()
    try:
        helper = User(
            telegram_id=777,
            username="helper",
            first_name="Helper",
            referral_code="HELP777",
            public_id="YP-HELP77",
        )
        db_session.add(helper)
        db_session.commit()
        helper_id = helper.id
    finally:
        db_session.close()
    helper_headers = {"Authorization": f"Bearer {sign_session(helper_id, get_settings().app_secret)}"}
    helper_stats = client.get("/api/admin/stats", headers=helper_headers)
    assert helper_stats.status_code == 200
    forbidden = client.delete(f"/api/admin/users/{card['id']}", headers=helper_headers)
    assert forbidden.status_code == 403

    removed = client.delete(f"/api/admin/users/{card['id']}", headers=owner_headers)
    assert removed.status_code == 200
    gone = client.get("/api/me", headers=guest_headers)
    assert gone.status_code == 401

    health = client.get("/health")
    assert health.status_code == 200
    assert health.json()["ok"] is True
    closed = client.post("/admin-bot/webhook", json={"update_id": 1})
    assert closed.status_code == 503
    get_settings.cache_clear()


def test_admin_row_cannot_outlive_owner_rules(client, monkeypatch):
    monkeypatch.setenv("OWNER_TELEGRAM_ID", "515151")
    get_settings.cache_clear()
    headers = _owner_headers(515151)
    denied = client.delete("/api/admin/admins/999", headers=headers)
    assert denied.status_code == 404
    db_session = db.SessionLocal()
    try:
        assert db_session.query(Admin).count() == 0
    finally:
        db_session.close()
    get_settings.cache_clear()
