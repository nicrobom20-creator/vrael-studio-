"""Private admin bot. Strangers get one refusal and no data."""

import logging

from aiogram import Bot, Dispatcher, Router
from aiogram.filters import Command, CommandObject, CommandStart
from aiogram.types import BotCommand, Message
from aiogram.dispatcher.middlewares.base import BaseMiddleware

from app.admin_service import (
    Access,
    add_admin,
    delete_user,
    grant_premium,
    list_admins,
    list_payments,
    list_subscriptions,
    remove_admin,
    resolve_admin,
    search_users,
    set_can_invite,
    stats,
    user_card,
)
from app import db as database
from app.config import get_settings
from app.services import ServiceError

logger = logging.getLogger("yappo.admin_bot")
router = Router()
REFUSAL = "Это служебный бот. Доступа нет."

_bot: Bot | None = None
_dp: Dispatcher | None = None

ADMIN_COMMANDS = [
    BotCommand(command="start", description="Что умеет бот"),
    BotCommand(command="stats", description="Сводка"),
    BotCommand(command="find", description="Найти пользователя"),
    BotCommand(command="premium", description="Выдать Premium"),
    BotCommand(command="subs", description="Подписки"),
    BotCommand(command="payments", description="Платежи"),
    BotCommand(command="admins", description="Кто имеет доступ"),
]


def get_admin_bot() -> Bot:
    global _bot
    if _bot is None:
        token = get_settings().admin_bot_token
        if not token:
            raise RuntimeError("ADMIN_BOT_TOKEN не задан")
        _bot = Bot(token=token)
    return _bot


def get_admin_dispatcher() -> Dispatcher:
    global _dp
    if _dp is None:
        dispatcher = Dispatcher()
        dispatcher.include_router(router)
        _dp = dispatcher
    return _dp


class PrivateMiddleware(BaseMiddleware):
    async def __call__(self, handler, event, data):
        user = getattr(event, "from_user", None)
        if user is None or database.SessionLocal is None:
            return None
        session = database.SessionLocal()
        try:
            access = resolve_admin(session, user.id)
            if access is None:
                answer = getattr(event, "answer", None)
                if answer is not None:
                    await answer(REFUSAL)
                return None
            data["access"] = access
            data["session"] = session
            return await handler(event, data)
        finally:
            session.close()


router.message.middleware(PrivateMiddleware())


def _help(access: Access) -> str:
    lines = [
        "Yappo admin",
        "/stats — сводка",
        "/find <id, почта, @username или YP-номер>",
        "/premium <id> <дни> — выдать или продлить Premium",
        "/subs — подписки",
        "/payments — платежи",
        "/admins — кто имеет доступ",
    ]
    if access.is_owner or access.can_invite:
        lines.append("/addadmin <telegram id> — добавить администратора")
    if access.is_owner:
        lines.append("/invite <telegram id> — дать право приглашать")
        lines.append("/deladmin <telegram id> — убрать администратора")
        lines.append("/deleteuser <id> — удалить аккаунт")
    return "\n".join(lines)


def _find_or_tell(session, message_text: str):
    found = search_users(session, message_text)
    return found


@router.message(CommandStart())
@router.message(Command("help"))
async def cmd_help(message: Message, access: Access) -> None:
    await message.answer(_help(access))


@router.message(Command("stats"))
async def cmd_stats(message: Message, session) -> None:
    data = stats(session)
    await message.answer(
        "Сводка\n"
        f"Пользователи: {data['users']}\n"
        f"Новые сегодня: {data['new_today']}\n"
        f"Новые за 7 дней: {data['new_7d']}\n"
        f"Активны за сутки: {data['dau']}\n"
        f"Premium: {data['premium']}\n"
        f"Выручка: {data['revenue_rub']} ₽"
    )


@router.message(Command("find"))
async def cmd_find(message: Message, command: CommandObject, session) -> None:
    query = (command.args or "").strip()
    if not query:
        await message.answer("Формат: /find <id, почта, @username или YP-номер>")
        return
    found = _find_or_tell(session, query)
    if not found:
        await message.answer("Никого не нашёл.")
        return
    if len(found) == 1:
        await message.answer(_card_text(user_card(session, found[0])))
        return
    lines = ["Нашёл несколько:"]
    for user in found:
        lines.append(f"{user.id} · {user.public_id or '—'} · {user.email or user.username or user.first_name}")
    await message.answer("\n".join(lines))


@router.message(Command("premium"))
async def cmd_premium(message: Message, command: CommandObject, session) -> None:
    parts = (command.args or "").split()
    if len(parts) != 2 or not parts[1].isdigit():
        await message.answer("Формат: /premium <id> <дни>")
        return
    found = search_users(session, parts[0])
    if len(found) != 1:
        await message.answer("Нужен один пользователь: id, почта или YP-номер.")
        return
    try:
        grant_premium(session, found[0], int(parts[1]))
        session.commit()
    except ServiceError as error:
        await message.answer(str(error.detail))
        return
    card = user_card(session, found[0])
    await message.answer(f"Premium до {card['premium_until']}.\n" + _card_text(card))


@router.message(Command("subs"))
async def cmd_subs(message: Message, session) -> None:
    rows = list_subscriptions(session)
    if not rows:
        await message.answer("Подписок пока нет.")
        return
    lines = ["Подписки"]
    for row in rows[:25]:
        state = "активна" if row["premium"] else "истекла"
        who = row["email"] or row["username"] or row["public_id"] or row["name"]
        lines.append(f"{row['id']} · {who} · {state} · {row['premium_until']}")
    await message.answer("\n".join(lines))


@router.message(Command("payments"))
async def cmd_payments(message: Message, session) -> None:
    rows = list_payments(session)
    if not rows:
        await message.answer("Платежей пока нет.")
        return
    lines = ["Платежи"]
    for row in rows[:25]:
        who = row["email"] or row["username"] or row["public_id"]
        lines.append(f"{row['amount']} ₽ · {row['plan']} · {row['status']} · {who}")
    await message.answer("\n".join(lines))


@router.message(Command("admins"))
async def cmd_admins(message: Message, session) -> None:
    rows = list_admins(session)
    if not rows:
        await message.answer("Список пуст. Задай OWNER_TELEGRAM_ID.")
        return
    lines = ["Доступ"]
    for row in rows:
        extra = ", может приглашать" if row["can_invite"] and row["role"] != "owner" else ""
        name = f" @{row['username']}" if row["username"] else ""
        lines.append(f"{row['role']} · {row['telegram_id']}{name}{extra}")
    await message.answer("\n".join(lines))


@router.message(Command("addadmin"))
async def cmd_add(message: Message, command: CommandObject, access: Access, session) -> None:
    token = (command.args or "").strip().lstrip("@")
    if not token.isdigit():
        await message.answer("Формат: /addadmin <telegram id>")
        return
    try:
        add_admin(session, access, int(token))
        session.commit()
    except ServiceError as error:
        await message.answer(str(error.detail))
        return
    await message.answer(f"Администратор {token} добавлен.")


@router.message(Command("invite"))
async def cmd_invite(message: Message, command: CommandObject, access: Access, session) -> None:
    token = (command.args or "").strip()
    if not token.isdigit():
        await message.answer("Формат: /invite <telegram id>")
        return
    try:
        row = set_can_invite(session, access, int(token), True)
        session.commit()
    except ServiceError as error:
        await message.answer(str(error.detail))
        return
    await message.answer(f"{row.telegram_id} теперь может приглашать.")


@router.message(Command("deladmin"))
async def cmd_deladmin(message: Message, command: CommandObject, access: Access, session) -> None:
    token = (command.args or "").strip()
    if not token.isdigit():
        await message.answer("Формат: /deladmin <telegram id>")
        return
    try:
        remove_admin(session, access, int(token))
        session.commit()
    except ServiceError as error:
        await message.answer(str(error.detail))
        return
    await message.answer(f"Администратор {token} убран.")


@router.message(Command("deleteuser"))
async def cmd_delete(message: Message, command: CommandObject, access: Access, session) -> None:
    token = (command.args or "").strip()
    if not token.isdigit():
        await message.answer("Формат: /deleteuser <id>")
        return
    try:
        delete_user(session, access, int(token))
        session.commit()
    except ServiceError as error:
        await message.answer(str(error.detail))
        return
    await message.answer(f"Аккаунт {token} удалён.")


@router.message()
async def fallback(message: Message, access: Access) -> None:
    await message.answer(_help(access))


def _card_text(card: dict) -> str:
    telegram = f"@{card['username']}" if card["username"] else "—"
    if card["telegram_id"]:
        telegram = f"{telegram} · {card['telegram_id']}"
    premium = card["premium_until"] if card["premium"] else "нет"
    lines = [
        f"{card['name'] or 'Без имени'}",
        f"ID {card['id']} · {card['public_id'] or '—'}",
        f"Почта: {card['email'] or '—'}",
        f"Telegram: {telegram}",
        f"Уровень {card['level']} · серия {card['streak']}",
        f"Premium: {premium}",
    ]
    if card["payments"]:
        last = card["payments"][0]
        lines.append(f"Последний платёж: {last['amount']} ₽ · {last['status']}")
    return "\n".join(lines)
