"""Private admin access: owner, invited admins, and the actions they may take."""

from dataclasses import dataclass
from datetime import datetime, timedelta, timezone

from sqlalchemy import delete, func, or_, select, update
from sqlalchemy.orm import Session

from app.clock import naive_utc
from app.config import get_settings
from app.gamification import level_progress
from app.models import Achievement, Admin, Payment, PaymentEvent, Progress, ReferralReward, UsageDay, User, XpEvent
from app.services import ServiceError, is_premium


@dataclass
class Access:
    telegram_id: int
    role: str
    can_invite: bool

    @property
    def is_owner(self) -> bool:
        return self.role == "owner"


def resolve_admin(session: Session, telegram_id: int) -> Access | None:
    if not telegram_id or telegram_id < 0:
        return None
    owner = get_settings().owner_telegram_id
    if owner and telegram_id == owner:
        return Access(telegram_id=telegram_id, role="owner", can_invite=True)
    row = session.scalar(select(Admin).where(Admin.telegram_id == telegram_id))
    if row is None:
        return None
    return Access(telegram_id=telegram_id, role="admin", can_invite=bool(row.can_invite))


def require_owner(access: Access) -> None:
    if not access.is_owner:
        raise ServiceError(403, "Это может только владелец")


def require_invite(access: Access) -> None:
    if not (access.is_owner or access.can_invite):
        raise ServiceError(403, "Нет права приглашать")


def search_users(session: Session, query: str, limit: int = 20) -> list[User]:
    raw = (query or "").strip()
    if not raw:
        return []
    token = raw[1:] if raw.startswith("@") else raw
    if token.upper().startswith("YP-"):
        stmt = select(User).where(User.public_id == token.upper())
    elif "@" in token:
        stmt = select(User).where(func.lower(User.email) == token.lower())
    elif token.isdigit():
        number = int(token)
        stmt = select(User).where(or_(User.id == number, User.telegram_id == number))
    else:
        stmt = select(User).where(func.lower(User.username) == token.lower())
    return list(session.scalars(stmt.limit(limit)))


def user_card(session: Session, user: User) -> dict:
    now = naive_utc()
    level, _, _ = level_progress(user.xp)
    payments = session.scalars(
        select(Payment).where(Payment.user_id == user.id).order_by(Payment.id.desc()).limit(12)
    ).all()
    return {
        "id": user.id,
        "public_id": user.public_id or "",
        "name": user.first_name or "",
        "email": user.email or "",
        "username": user.username or "",
        "telegram_id": user.telegram_id if user.telegram_id and user.telegram_id > 0 else None,
        "level": level,
        "xp": user.xp,
        "streak": user.streak,
        "premium": is_premium(user, now),
        "premium_until": user.premium_until.isoformat() if user.premium_until else None,
        "created_at": user.created_at.isoformat() if user.created_at else "",
        "payments": [
            {
                "order_id": row.order_id,
                "plan": row.plan,
                "amount": row.amount,
                "status": row.status,
                "test": bool(row.is_test),
                "created_at": row.created_at.isoformat() if row.created_at else "",
            }
            for row in payments
        ],
    }


def stats(session: Session) -> dict:
    now = datetime.now(timezone.utc).replace(tzinfo=None)
    day_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    week_start = now - timedelta(days=7)
    day_ago = now - timedelta(days=1)
    total = session.scalar(select(func.count(User.id))) or 0
    new_today = session.scalar(select(func.count(User.id)).where(User.created_at >= day_start)) or 0
    new_week = session.scalar(select(func.count(User.id)).where(User.created_at >= week_start)) or 0
    dau = session.scalar(select(func.count(User.id)).where(User.last_study_at.is_not(None), User.last_study_at >= day_ago)) or 0
    premium = session.scalar(select(func.count(User.id)).where(User.premium_until.is_not(None), User.premium_until > now)) or 0
    amounts = session.scalars(
        select(Payment.amount).where(Payment.status == "paid", Payment.is_test.is_(False))
    ).all()
    revenue = 0.0
    for amount in amounts:
        try:
            revenue += float(amount)
        except (TypeError, ValueError):
            continue
    return {
        "users": int(total),
        "new_today": int(new_today),
        "new_7d": int(new_week),
        "dau": int(dau),
        "premium": int(premium),
        "revenue_rub": round(revenue, 2),
    }


def list_subscriptions(session: Session, limit: int = 40) -> list[dict]:
    now = naive_utc()
    rows = session.scalars(
        select(User).where(User.premium_until.is_not(None)).order_by(User.premium_until.desc()).limit(limit)
    ).all()
    return [
        {
            "id": user.id,
            "public_id": user.public_id or "",
            "name": user.first_name or "",
            "email": user.email or "",
            "username": user.username or "",
            "premium": bool(user.premium_until and user.premium_until > now),
            "premium_until": user.premium_until.isoformat() if user.premium_until else None,
        }
        for user in rows
    ]


def list_payments(session: Session, limit: int = 40) -> list[dict]:
    rows = session.execute(
        select(Payment, User).join(User, User.id == Payment.user_id).order_by(Payment.id.desc()).limit(limit)
    ).all()
    cards = []
    for payment, user in rows:
        cards.append({
            "order_id": payment.order_id,
            "user_id": user.id,
            "public_id": user.public_id or "",
            "email": user.email or "",
            "username": user.username or "",
            "plan": payment.plan,
            "amount": payment.amount,
            "status": payment.status,
            "test": bool(payment.is_test),
            "created_at": payment.created_at.isoformat() if payment.created_at else "",
        })
    return cards


def grant_premium(session: Session, user: User, days: int) -> User:
    if days < 1 or days > 3650:
        raise ServiceError(400, "Срок от 1 до 3650 дней")
    now = naive_utc()
    base = user.premium_until if user.premium_until and user.premium_until > now else now
    user.premium_until = base + timedelta(days=days)
    return user


def list_admins(session: Session) -> list[dict]:
    owner = get_settings().owner_telegram_id
    rows = session.scalars(select(Admin).order_by(Admin.id)).all()
    people = []
    if owner:
        people.append({"telegram_id": owner, "username": "", "role": "owner", "can_invite": True})
    for row in rows:
        if owner and row.telegram_id == owner:
            continue
        people.append({
            "telegram_id": row.telegram_id,
            "username": row.username or "",
            "role": "admin",
            "can_invite": bool(row.can_invite),
        })
    return people


def add_admin(session: Session, access: Access, telegram_id: int, username: str = "", can_invite: bool = False) -> Admin:
    require_invite(access)
    if telegram_id <= 0:
        raise ServiceError(400, "Нужен числовой Telegram id")
    owner = get_settings().owner_telegram_id
    if owner and telegram_id == owner:
        raise ServiceError(400, "Владелец уже имеет полный доступ")
    if can_invite and not access.is_owner:
        raise ServiceError(403, "Право приглашать выдаёт только владелец")
    row = session.scalar(select(Admin).where(Admin.telegram_id == telegram_id))
    if row is None:
        row = Admin(telegram_id=telegram_id, username=(username or "")[:64], can_invite=bool(can_invite))
        session.add(row)
    else:
        if username:
            row.username = username[:64]
        if access.is_owner:
            row.can_invite = bool(can_invite)
    session.flush()
    return row


def remove_admin(session: Session, access: Access, telegram_id: int) -> None:
    require_owner(access)
    row = session.scalar(select(Admin).where(Admin.telegram_id == telegram_id))
    if row is None:
        raise ServiceError(404, "Такого администратора нет")
    session.delete(row)


def set_can_invite(session: Session, access: Access, telegram_id: int, allowed: bool) -> Admin:
    require_owner(access)
    row = session.scalar(select(Admin).where(Admin.telegram_id == telegram_id))
    if row is None:
        raise ServiceError(404, "Сначала добавь администратора")
    row.can_invite = bool(allowed)
    session.flush()
    return row


def delete_user(session: Session, access: Access, user_id: int) -> None:
    require_owner(access)
    user = session.get(User, user_id)
    if user is None:
        raise ServiceError(404, "Пользователь не найден")
    owner = get_settings().owner_telegram_id
    if owner and user.telegram_id == owner:
        raise ServiceError(400, "Аккаунт владельца не удаляется")
    order_ids = list(session.scalars(select(Payment.order_id).where(Payment.user_id == user.id)))
    if order_ids:
        session.execute(delete(PaymentEvent).where(PaymentEvent.order_id.in_(order_ids)))
    session.execute(delete(Payment).where(Payment.user_id == user.id))
    session.execute(delete(Progress).where(Progress.user_id == user.id))
    session.execute(delete(UsageDay).where(UsageDay.user_id == user.id))
    session.execute(delete(XpEvent).where(XpEvent.user_id == user.id))
    session.execute(delete(Achievement).where(Achievement.user_id == user.id))
    session.execute(
        delete(ReferralReward).where(
            or_(ReferralReward.referrer_id == user.id, ReferralReward.referee_id == user.id)
        )
    )
    session.execute(update(User).where(User.referred_by_id == user.id).values(referred_by_id=None))
    session.delete(user)
