"""Weekly leagues from XP earned in the last seven days."""

from datetime import timedelta

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.clock import naive_utc
from app.content import MASCOTS
from app.models import User, XpEvent

BANDS = (
    (0, "bronze", "Бронза", 50),
    (50, "silver", "Серебро", 150),
    (150, "gold", "Золото", 400),
    (400, "diamond", "Алмаз", None),
)


def band_for(weekly: int) -> tuple[int, str, str, int | None]:
    current = BANDS[0]
    for row in BANDS:
        if weekly >= row[0]:
            current = row
    return current


def league_payload(session: Session, user: User) -> dict:
    since = naive_utc() - timedelta(days=7)
    rows = session.execute(
        select(XpEvent.user_id, func.sum(XpEvent.amount))
        .where(XpEvent.created_at >= since)
        .group_by(XpEvent.user_id)
    ).all()
    weekly = {uid: int(total or 0) for uid, total in rows}
    mine = weekly.get(user.id, 0)
    floor, code, title, nxt = band_for(mine)
    peers = []
    for person in session.scalars(select(User).order_by(User.xp.desc()).limit(80)).all():
        score = weekly.get(person.id, 0)
        if band_for(score)[1] != code and person.id != user.id:
            continue
        mascot = MASCOTS.get(person.mascot, {})
        peers.append({
            "id": person.id,
            "name": person.first_name or "Ученик",
            "mascot_name": mascot.get("name", "Яппо"),
            "weekly_xp": score,
            "you": person.id == user.id,
        })
    if not any(item["you"] for item in peers):
        peers.append({
            "id": user.id,
            "name": user.first_name or "Ученик",
            "mascot_name": MASCOTS.get(user.mascot, {}).get("name", "Яппо"),
            "weekly_xp": mine,
            "you": True,
        })
    peers.sort(key=lambda item: item["weekly_xp"], reverse=True)
    return {
        "code": code,
        "title": title,
        "weekly_xp": mine,
        "floor": floor,
        "next": nxt,
        "board": peers[:20],
    }
