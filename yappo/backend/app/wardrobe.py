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
    {"id": "crown", "name": "Корона", "price": 200, "premium": True, "blurb": "Золотой ободок. Только с Premium."},
    {"id": "lantern", "name": "Фонарь", "price": 180, "premium": True, "blurb": "Тёплый свет у плеча. Только с Premium."},
]

BOOSTS = [
    {"id": "freeze", "name": "Заморозка серии", "price": 40, "blurb": "Один пропущенный день не сбрасывает серию."},
    {"id": "double", "name": "Двойной опыт", "price": 30, "blurb": "Следующий новый урок даёт вдвое больше XP."},
]

CHAPTER_GIFTS = {
    1: ("ribbon", 20, "Лондон"),
    2: ("scarf", 30, "Нью-Йорк"),
    3: ("star", 40, "Сидней"),
}


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
        "boosts": [
            {**item, "owned": (user.boost_freeze or 0) if item["id"] == "freeze" else (user.boost_double or 0)}
            for item in BOOSTS
        ],
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


def buy_boost(session: Session, user: User, item_id: str) -> dict:
    item = next((row for row in BOOSTS if row["id"] == item_id), None)
    if item is None:
        raise ServiceError(404, "Такого усиления нет")
    if (user.coins or 0) < item["price"]:
        raise ServiceError(400, "Не хватает монет")
    user.coins = (user.coins or 0) - item["price"]
    if item_id == "freeze":
        user.boost_freeze = (user.boost_freeze or 0) + 1
    else:
        user.boost_double = (user.boost_double or 0) + 1
    return shop_payload(session, user)


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


def grant_chapter_gift(session: Session, user: User, index: int) -> str | None:
    """First clear of a chapter gives that city's keepsake and a few coins."""
    gift = CHAPTER_GIFTS.get(index)
    if gift is None:
        return None
    item_id, bonus, _city = gift
    owned = _owned(session, user)
    if item_id not in owned:
        session.add(OwnedItem(user_id=user.id, item_id=item_id))
    user.coins = (user.coins or 0) + bonus
    session.flush()
    return item_id


def equip_item(session: Session, user: User, item_id: str) -> dict:
    if item_id:
        owned = _owned(session, user)
        if item_id not in owned:
            raise ServiceError(400, "Сначала купи эту вещь")
    user.equipped = item_id or ""
    return shop_payload(session, user)
