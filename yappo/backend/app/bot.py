"""Telegram bot: /start, admin stats, and mascot reminders."""

import logging

from aiogram import Bot, Dispatcher, Router
from aiogram.filters import Command, CommandObject, CommandStart
from aiogram.types import InlineKeyboardButton, InlineKeyboardMarkup, Message, WebAppInfo
from sqlalchemy.orm import Session

from app.config import get_settings
from app.db import SessionLocal
from app.reminders import is_reminder_due, local_today, reminder_text
from app.services import DEMO_ID_BASE, admin_stats, get_or_create_user, render_stats

logger = logging.getLogger("yappo.bot")
router = Router()
_bot: Bot | None = None
_dp: Dispatcher | None = None


def get_bot() -> Bot:
    global _bot
    if _bot is None:
        _bot = Bot(token=get_settings().bot_token)
    return _bot


def get_dispatcher() -> Dispatcher:
    global _dp
    if _dp is None:
        dispatcher = Dispatcher()
        dispatcher.include_router(router)
        _dp = dispatcher
    return _dp


def open_keyboard() -> InlineKeyboardMarkup | None:
    url = get_settings().webapp_url.strip()
    if not url:
        return None
    if url.startswith("https://"):
        button = InlineKeyboardButton(text="Открыть Yappo", web_app=WebAppInfo(url=url))
    elif url.startswith("http://"):
        button = InlineKeyboardButton(text="Открыть Yappo", url=url)
    else:
        return None
    return InlineKeyboardMarkup(inline_keyboard=[[button]])


def _session() -> Session:
    if SessionLocal is None:
        raise RuntimeError("database is not ready")
    return SessionLocal()


@router.message(CommandStart())
async def cmd_start(message: Message, command: CommandObject) -> None:
    if message.from_user is None:
        return
    session = _session()
    try:
        user, joined = get_or_create_user(
            session,
            message.from_user.id,
            message.from_user.username or "",
            message.from_user.first_name or "",
            command.args or "",
        )
        session.commit()
        name = user.first_name or "друг"
        text = (
            f"Привет, {name}! Я Yappo.\n\n"
            "Короткие испытания, сюжет в городе и живой разговор — как с человеком, который не торопит.\n"
            "Открой приложение, выбери язык и спутника."
        )
        if joined:
            text += "\n\nТебя пригласил друг: тебе и другу уже начислили бонусный XP."
        await message.answer(text, reply_markup=open_keyboard())
    finally:
        session.close()


@router.message(Command("help"))
async def cmd_help(message: Message) -> None:
    await message.answer(
        "Yappo учит язык маленькими шагами.\n"
        "/start — открыть приложение\n"
        "Напоминание придёт в выбранное время, если за день не было занятия.\n"
        "Ссылку для друга найдёшь в приложении, в разделе «Друзья»."
    )


@router.message(Command("stats"))
async def cmd_stats(message: Message) -> None:
    settings = get_settings()
    if message.from_user is None or message.from_user.id != settings.admin_telegram_id or not settings.admin_telegram_id:
        await message.answer("Недостаточно прав.")
        return
    session = _session()
    try:
        await message.answer(render_stats(admin_stats(session)))
    finally:
        session.close()


async def dispatch_reminders(bot: Bot, session: Session, now=None) -> list[int]:
    """Send one mascot reminder per user who is due. Returns telegram ids notified."""
    from datetime import datetime, timezone

    from sqlalchemy import select

    from app.models import User

    moment = now or datetime.now(timezone.utc)
    users = session.scalars(select(User).where(User.onboarded.is_(True), User.reminder_time != "")).all()
    sent: list[int] = []
    for user in users:
        if user.telegram_id >= DEMO_ID_BASE:
            continue
        if not is_reminder_due(
            reminder_time=user.reminder_time,
            timezone=user.timezone,
            last_study_date=user.last_study_date,
            last_reminder_date=user.last_reminder_date,
            now=moment,
        ):
            continue
        text = reminder_text(user.mascot or "parrot", user.daily_goal or 15)
        try:
            await bot.send_message(user.telegram_id, text, reply_markup=open_keyboard())
        except Exception:
            logger.exception("reminder failed for %s", user.id)
            continue
        user.last_reminder_date = local_today(user.timezone, moment)
        sent.append(user.telegram_id)
    session.commit()
    return sent
