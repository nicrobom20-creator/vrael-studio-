"""One chest a day. The coin roll stays in a small range so it cannot be farmed."""

from app.clock import naive_utc
from app.models import User
from app.services import ServiceError
from sqlalchemy.orm import Session


def open_chest(session: Session, user: User) -> dict:
    today = naive_utc().date()
    if user.last_chest_date == today:
        raise ServiceError(409, "Сундук уже открыт сегодня")
    amount = 12 + (user.id % 13)
    user.coins = (user.coins or 0) + amount
    user.last_chest_date = today
    return {"coins": amount, "total": user.coins, "opened": True}


def chest_status(user: User) -> dict:
    today = naive_utc().date()
    return {"opened": user.last_chest_date == today, "total": user.coins or 0}
