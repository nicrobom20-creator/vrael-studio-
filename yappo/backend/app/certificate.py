"""A certificate once the first chapter is finished. All chapters widen the title."""

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.content import LANGUAGES, chapters_for
from app.models import Progress, User


def certificate_payload(session: Session, user: User) -> dict:
    if not user.language or user.language not in LANGUAGES:
        return {"eligible": False}
    done = set(session.scalars(select(Progress.node_id).where(Progress.user_id == user.id)).all())
    chapters = chapters_for(user.language)
    cleared = [all(node["id"] in done for node in chapter["nodes"]) for chapter in chapters]
    eligible = bool(cleared and cleared[0])
    full = bool(cleared) and all(cleared)
    when = user.last_study_date or (user.created_at.date() if user.created_at else None)
    return {
        "eligible": eligible,
        "full": full,
        "name": user.first_name or "Ученик",
        "public_id": user.public_id or "",
        "language": LANGUAGES[user.language]["name"],
        "title": "Три города" if full else "Первая глава",
        "date": when.isoformat() if when else "",
    }
