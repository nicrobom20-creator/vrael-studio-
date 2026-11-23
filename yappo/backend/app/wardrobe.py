"""Coin shop and wardrobe. Art is drawn in the app, so nothing is fetched."""

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import OwnedItem, User
from app.services import ServiceError, is_premium

CATALOG = [
    {"id": "ribbon", "name": "Лента", "price": 30, "premium": False, "blurb": "Тонкая лента на шее."},
    {"id": "scarf", "name": "Шарф", "price": 50, "premium": False, "blurb": "Тёплый шарф для прогулки."},
    {"id": "star", "name": "Звезда", "price": 40, "premium": False, "blurb": "Маленькая звезда у уха."},
    {"id": "cape", "name": "Плащ", "price": 150, "premium": True, "blurb": "Только с Premium."},
]


def _owned(session: Session, user: User) -> set[str]:
    rows = session.scalars(select(OwnedItem.item_id).where(OwnedItem.user_id == user.id)).all()
    return set(rows)


def shop_payload(session: Session, user: User) -> dict:
    owned = _owned(session, user)
    premium = is_premium(user)
    return {
        "coins": user.coins or 0,
        "equipped": user.equipped or "",
        "premium": premium,
        "items": [
            {
                **item,
                "owned": item["id"] in owned,
                "equipped": user.equipped == item["id"],
                "locked": item["premium"] and not premium,
            }
            for item in CATALOG
        ],
    }


def buy_item(session: Session, user: User, item_id: str) -> dict:
    item = next((row for row in CATALOG if row["id"] == item_id), None)
    if item is None:
        raise ServiceError(404, "Такой вещи нет")
    if item["premium"] and not is_premium(user):
        raise ServiceError(403, "Этот наряд только с Premium")
    owned = _owned(session, user)
    if item_id in owned:
        raise ServiceError(409, "Уже в гардеробе")
    if (user.coins or 0) < item["price"]:
        raise ServiceError(400, "Не хватает монет")
    user.coins = (user.coins or 0) - item["price"]
    session.add(OwnedItem(user_id=user.id, item_id=item_id))
    session.flush()
    return shop_payload(session, user)


def equip_item(session: Session, user: User, item_id: str) -> dict:
    if item_id:
        owned = _owned(session, user)
        if item_id not in owned:
            raise ServiceError(400, "Сначала купи эту вещь")
    user.equipped = item_id or ""
    return shop_payload(session, user)
