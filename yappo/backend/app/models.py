from datetime import date, datetime

from sqlalchemy import (
    BigInteger,
    Boolean,
    Date,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base


def utcnow() -> datetime:
    return datetime.utcnow()


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    telegram_id: Mapped[int] = mapped_column(BigInteger, unique=True, index=True)
    username: Mapped[str] = mapped_column(String(64), default="")
    first_name: Mapped[str] = mapped_column(String(128), default="")
    language: Mapped[str] = mapped_column(String(8), default="")
    mascot: Mapped[str] = mapped_column(String(16), default="")
    timezone: Mapped[str] = mapped_column(String(64), default="Europe/Moscow")
    reminder_time: Mapped[str] = mapped_column(String(5), default="")
    daily_goal: Mapped[int] = mapped_column(Integer, default=15)
    xp: Mapped[int] = mapped_column(Integer, default=0)
    streak: Mapped[int] = mapped_column(Integer, default=0)
    last_study_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    last_study_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    last_reminder_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    premium_until: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    referral_code: Mapped[str] = mapped_column(String(16), unique=True, index=True)
    referred_by_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    onboarded: Mapped[bool] = mapped_column(Boolean, default=False)
    email: Mapped[str | None] = mapped_column(String(255), unique=True, nullable=True)
    password_hash: Mapped[str] = mapped_column(String(255), default="")
    public_id: Mapped[str | None] = mapped_column(String(16), unique=True, nullable=True)
    languages: Mapped[str] = mapped_column(String(64), default="")
    english_level: Mapped[str] = mapped_column(String(32), default="")
    study_goal: Mapped[str] = mapped_column(String(32), default="")
    placement_level: Mapped[str] = mapped_column(String(32), default="")
    trial_used: Mapped[bool] = mapped_column(Boolean, default=False)
    coins: Mapped[int] = mapped_column(Integer, default=0)
    equipped: Mapped[str] = mapped_column(String(32), default="")
    last_chest_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    kids_mode: Mapped[bool] = mapped_column(Boolean, default=False)
    boost_freeze: Mapped[int] = mapped_column(Integer, default=0)
    boost_double: Mapped[int] = mapped_column(Integer, default=0)
    look_name: Mapped[str] = mapped_column(String(32), default="")
    look_tint: Mapped[str] = mapped_column(String(16), default="")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)


class Duel(Base):
    __tablename__ = "duels"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    code: Mapped[str] = mapped_column(String(8), unique=True, index=True)
    host_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    guest_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    host_score: Mapped[int | None] = mapped_column(Integer, nullable=True)
    guest_score: Mapped[int | None] = mapped_column(Integer, nullable=True)
    settled: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)


class WordCard(Base):
    __tablename__ = "word_cards"
    __table_args__ = (UniqueConstraint("user_id", "front"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    front: Mapped[str] = mapped_column(String(180))
    back: Mapped[str] = mapped_column(String(180))
    box: Mapped[int] = mapped_column(Integer, default=1)
    due: Mapped[date] = mapped_column(Date, default=lambda: datetime.utcnow().date())
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)


class OwnedItem(Base):
    __tablename__ = "owned_items"
    __table_args__ = (UniqueConstraint("user_id", "item_id"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    item_id: Mapped[str] = mapped_column(String(32))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)


class Progress(Base):
    __tablename__ = "progress"
    __table_args__ = (UniqueConstraint("user_id", "node_id"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    node_id: Mapped[str] = mapped_column(String(64))
    mistakes: Mapped[int] = mapped_column(Integer, default=0)
    xp: Mapped[int] = mapped_column(Integer, default=0)
    completed_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)


class UsageDay(Base):
    __tablename__ = "usage_days"
    __table_args__ = (UniqueConstraint("user_id", "day"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    day: Mapped[date] = mapped_column(Date, index=True)
    lessons: Mapped[int] = mapped_column(Integer, default=0)
    chats: Mapped[int] = mapped_column(Integer, default=0)
    hints: Mapped[int] = mapped_column(Integer, default=0)


class XpEvent(Base):
    __tablename__ = "xp_events"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    amount: Mapped[int] = mapped_column(Integer)
    reason: Mapped[str] = mapped_column(String(64))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow, index=True)


class Achievement(Base):
    __tablename__ = "achievements"
    __table_args__ = (UniqueConstraint("user_id", "code"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    code: Mapped[str] = mapped_column(String(32))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)


class Payment(Base):
    __tablename__ = "payments"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    order_id: Mapped[str] = mapped_column(String(80), unique=True, index=True)
    plan: Mapped[str] = mapped_column(String(16))
    amount: Mapped[str] = mapped_column(String(16))
    currency: Mapped[str] = mapped_column(String(8), default="RUB")
    status: Mapped[str] = mapped_column(String(16), default="pending")
    payment_id: Mapped[str] = mapped_column(String(80), default="")
    pay_url: Mapped[str] = mapped_column(Text, default="")
    is_test: Mapped[bool] = mapped_column(Boolean, default=False)
    days: Mapped[int] = mapped_column(Integer, default=30)
    premium_applied: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)
    paid_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)


class PaymentEvent(Base):
    __tablename__ = "payment_events"
    __table_args__ = (UniqueConstraint("dedupe_key"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    dedupe_key: Mapped[str] = mapped_column(String(160))
    order_id: Mapped[str] = mapped_column(String(80), index=True)
    event_type: Mapped[str] = mapped_column(String(40))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)


class Admin(Base):
    """People allowed into the private admin bot. The owner is not stored here."""

    __tablename__ = "admins"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    telegram_id: Mapped[int] = mapped_column(BigInteger, unique=True, index=True)
    username: Mapped[str] = mapped_column(String(64), default="")
    can_invite: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)


class ReferralReward(Base):
    __tablename__ = "referral_rewards"
    __table_args__ = (UniqueConstraint("referrer_id", "referee_id", "kind"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    referrer_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    referee_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    kind: Mapped[str] = mapped_column(String(32))
    amount: Mapped[int] = mapped_column(Integer)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)
