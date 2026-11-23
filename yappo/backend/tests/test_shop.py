from app import db
from app.config import get_settings
from app.models import User


def test_wardrobe_spends_coins_and_locks_premium(client, monkeypatch):
    monkeypatch.setenv("OWNER_TELEGRAM_ID", "0")
    get_settings.cache_clear()
    created = client.post(
        "/api/auth/register",
        json={"email": "tailor@example.com", "password": "secretpass", "name": "Швея"},
    )
    assert created.status_code == 200, created.text
    token = created.json()["token"]
    headers = {"Authorization": f"Bearer {token}"}
    database = db.SessionLocal()
    try:
        user = database.get(User, created.json()["user"]["id"])
        user.coins = 80
        database.commit()
    finally:
        database.close()

    shop = client.get("/api/shop", headers=headers)
    assert shop.status_code == 200
    assert shop.json()["coins"] == 80
    cape = next(item for item in shop.json()["items"] if item["id"] == "cape")
    assert cape["locked"] is True

    denied = client.post("/api/shop/buy", headers=headers, json={"item_id": "cape"})
    assert denied.status_code == 403

    bought = client.post("/api/shop/buy", headers=headers, json={"item_id": "scarf"})
    assert bought.status_code == 200, bought.text
    assert bought.json()["coins"] == 30
    worn = client.post("/api/shop/equip", headers=headers, json={"item_id": "scarf"})
    assert worn.status_code == 200
    assert worn.json()["equipped"] == "scarf"
    assert worn.json()["user"]["outfit"] == "scarf"

    poor = client.post("/api/shop/buy", headers=headers, json={"item_id": "cape"})
    assert poor.status_code == 403
    from app.wardrobe import grant_chapter_gift

    database = db.SessionLocal()
    try:
        user = database.get(User, created.json()["user"]["id"])
        gift = grant_chapter_gift(database, user, 1)
        database.commit()
        assert gift == "ribbon"
        assert user.coins == 30 + 20
    finally:
        database.close()
    bought_boost = client.post("/api/shop/boost", headers=headers, json={"item_id": "double"})
    assert bought_boost.status_code == 200, bought_boost.text
    assert bought_boost.json()["user"]["boosts"]["double"] == 1
    get_settings.cache_clear()
