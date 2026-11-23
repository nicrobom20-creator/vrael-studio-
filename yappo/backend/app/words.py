"""A small box of words to review. Misses come back sooner than hits."""

from datetime import timedelta

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.clock import naive_utc
from app.models import WordCard, User
from app.services import ServiceError


def save_word(session: Session, user: User, front: str, back: str) -> dict:
    front_n = (front or "").strip()[:180]
    back_n = (back or "").strip()[:180]
    if not front_n or not back_n:
        raise ServiceError(400, "Нужны слово и перевод")
    today = naive_utc().date()
    row = session.scalar(select(WordCard).where(WordCard.user_id == user.id, WordCard.front == front_n))
    if row is None:
        row = WordCard(user_id=user.id, front=front_n, back=back_n, box=1, due=today)
        session.add(row)
        try:
            session.flush()
        except IntegrityError:
            session.rollback()
            raise ServiceError(409, "Уже в списке") from None
    else:
        row.back = back_n
        row.box = 1
        row.due = today
    return _card(row)


def due_words(session: Session, user: User, limit: int = 20) -> list[dict]:
    today = naive_utc().date()
    rows = session.scalars(
        select(WordCard)
        .where(WordCard.user_id == user.id, WordCard.due <= today)
        .order_by(WordCard.due, WordCard.id)
        .limit(limit)
    ).all()
    return [_card(row) for row in rows]


def grade_word(session: Session, user: User, card_id: int, ok: bool) -> dict:
    row = session.get(WordCard, card_id)
    if row is None or row.user_id != user.id:
        raise ServiceError(404, "Слова нет")
    today = naive_utc().date()
    if ok:
        row.box = min(5, (row.box or 1) + 1)
        row.due = today + timedelta(days=2 ** (row.box - 1))
    else:
        row.box = 1
        row.due = today
    return _card(row)


def _card(row: WordCard) -> dict:
    return {
        "id": row.id,
        "front": row.front,
        "back": row.back,
        "box": row.box,
        "due": row.due.isoformat() if row.due else "",
    }
