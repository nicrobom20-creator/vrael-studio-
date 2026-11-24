"""Five shared questions. A friend can join with a code, or you face a shadow that scores 2."""

import secrets

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Duel, User
from app.services import ServiceError

ROUNDS = (
    {"id": "thanks", "prompt": "Как сказать «спасибо»?", "options": ["Thank you", "Please", "Sorry", "Hello"], "answer": "Thank you"},
    {"id": "tea", "prompt": "«Чай, пожалуйста»", "options": ["A tea, please.", "A ticket, please.", "Good night.", "Where is it?"], "answer": "A tea, please."},
    {"id": "from", "prompt": "«Я из России»", "options": ["I'm from Russia.", "I'm learning.", "I don't understand.", "Nice to meet you."], "answer": "I'm from Russia."},
    {"id": "where", "prompt": "Где вокзал?", "options": ["Where is the station?", "How much is it?", "My name is Anna.", "See you later."], "answer": "Where is the station?"},
    {"id": "much", "prompt": "Как спросить цену?", "options": ["How much is this?", "Where are you from?", "Good morning.", "Two tickets."], "answer": "How much is this?"},
)
SHADOW = 2


def questions() -> list[dict]:
    return [{"id": item["id"], "prompt": item["prompt"], "options": list(item["options"])} for item in ROUNDS]


def score_answers(answers: dict) -> int:
    total = 0
    for item in ROUNDS:
        if (answers or {}).get(item["id"]) == item["answer"]:
            total += 1
    return total


def create_duel(session: Session, user: User) -> Duel:
    for _ in range(6):
        code = secrets.token_hex(3)
        if session.scalar(select(Duel.id).where(Duel.code == code)) is None:
            row = Duel(code=code, host_id=user.id)
            session.add(row)
            session.flush()
            return row
    raise ServiceError(500, "Не удалось открыть дуэль")


def join_duel(session: Session, user: User, code: str) -> Duel:
    row = session.scalar(select(Duel).where(Duel.code == (code or "").strip().lower()))
    if row is None:
        raise ServiceError(404, "Такой дуэли нет")
    if row.host_id == user.id:
        return row
    if row.guest_id and row.guest_id != user.id:
        raise ServiceError(409, "Дуэль уже занята")
    row.guest_id = user.id
    return row


def submit_duel(session: Session, user: User, code: str, answers: dict) -> dict:
    row = join_duel(session, user, code)
    points = score_answers(answers)
    if user.id == row.host_id:
        if row.host_score is None:
            row.host_score = points
    elif user.id == row.guest_id:
        if row.guest_score is None:
            row.guest_score = points
    else:
        raise ServiceError(403, "Ты не в этой дуэли")
    prize = _settle(session, row)
    return {**_view(row, user), "your_score": points, "prize": prize}


def shadow_duel(session: Session, user: User, answers: dict) -> dict:
    points = score_answers(answers)
    won = points > SHADOW
    prize = 15 if won else 5 if points == SHADOW else 0
    user.coins = (user.coins or 0) + prize
    return {"your_score": points, "shadow": SHADOW, "prize": prize, "won": won}


def _settle(session: Session, row: Duel) -> int:
    if row.settled or row.host_score is None or row.guest_score is None or row.guest_id is None:
        return 0
    host = session.get(User, row.host_id)
    guest = session.get(User, row.guest_id)
    prize = 0
    if row.host_score > row.guest_score and host:
        host.coins = (host.coins or 0) + 15
        prize = 15
    elif row.guest_score > row.host_score and guest:
        guest.coins = (guest.coins or 0) + 15
        prize = 15
    else:
        if host:
            host.coins = (host.coins or 0) + 5
        if guest:
            guest.coins = (guest.coins or 0) + 5
        prize = 5
    row.settled = True
    return prize


def _view(row: Duel, user: User) -> dict:
    return {
        "code": row.code,
        "host": row.host_id == user.id,
        "host_score": row.host_score,
        "guest_score": row.guest_score,
        "ready": row.guest_id is not None,
        "settled": bool(row.settled),
    }
