import secrets

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.config import get_settings
from app.gamification import extend_premium
from app.models import ReferralReward, User, XpEvent


def new_referral_code() -> str:
    return secrets.token_hex(4)


def parse_ref(start: str | None) -> str:
    if not start:
        return ""
    value = start.strip()
    if value.startswith("ref_"):
        return value[4:].strip()
    return ""


def find_referrer(session: Session, code: str) -> User | None:
    if not code:
        return None
    user = session.scalar(select(User).where(User.referral_code == code))
    if user:
        return user
    if code.isdigit():
        return session.get(User, int(code))
    return None


def _add_xp(session: Session, user: User, amount: int, reason: str) -> None:
    if amount <= 0:
        return
    user.xp += amount
    session.add(XpEvent(user_id=user.id, amount=amount, reason=reason))


def grant_join_referral(session: Session, referrer: User, referee: User, now=None) -> bool:
    """Both sides receive join XP once. Returns True if this call granted it."""
    if referrer.id == referee.id:
        return False
    settings = get_settings()
    xp = settings.referral_join_xp
    reward = ReferralReward(
        referrer_id=referrer.id,
        referee_id=referee.id,
        kind="join_xp",
        amount=xp,
    )
    try:
        with session.begin_nested():
            session.add(reward)
            session.flush()
    except IntegrityError:
        return False
    _add_xp(session, referrer, xp, "referral_join")
    _add_xp(session, referee, xp, "referral_welcome")
    return True


def grant_paid_referral(session: Session, referee: User, now) -> bool:
    """When a referred friend pays, the referrer receives premium days once."""
    if not referee.referred_by_id:
        return False
    referrer = session.get(User, referee.referred_by_id)
    if referrer is None or referrer.id == referee.id:
        return False
    days = get_settings().referral_premium_days
    reward = ReferralReward(
        referrer_id=referrer.id,
        referee_id=referee.id,
        kind="premium_days",
        amount=days,
    )
    try:
        with session.begin_nested():
            session.add(reward)
            session.flush()
    except IntegrityError:
        return False
    referrer.premium_until = extend_premium(referrer.premium_until, days, now)
    return True
