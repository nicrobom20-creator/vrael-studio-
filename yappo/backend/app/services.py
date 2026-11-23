"""User-facing operations shared by the API and the bot."""

import re
import zlib
from datetime import datetime, time, timedelta, timezone
from zoneinfo import ZoneInfo

from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.clock import naive_utc
from app.config import get_settings
from app.content import (
    LANGUAGES,
    MASCOTS,
    chapter_by_id,
    chapters_for,
    get_node,
    is_playable,
    language_meta,
    node_status,
    ordered_nodes,
    scenes_for,
)
from app.gamification import ACHIEVEMENTS, apply_streak, level_progress
from app.llm import chat_reply, demo_reply
from app.models import Achievement, Payment, Progress, ReferralReward, UsageDay, User, XpEvent
from app.ids import new_email_telegram_id, new_public_id
from app.payments import create_local_payment, create_rollypay_payment
from app.practice import shuffle_steps
from app.security import hash_password, verify_password
from app.referrals import find_referrer, grant_join_referral, new_referral_code, parse_ref
from app.reminders import local_today

_DEVICE = re.compile(r"^[A-Za-z0-9_-]{8,64}$")
_CLOCK = re.compile(r"^([01]\d|2[0-3]):[0-5]\d$")
_EMAIL = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
_LEVELS = {"start", "words", "base", "talk", "confident"}
_STUDY_GOALS = {"people", "fun", "growth", "travel", "family", "career", "other"}
_MINUTES = {5, 10, 15, 20, 30, 45, 60}
DEMO_ID_BASE = 9_000_000_000_000


class ServiceError(Exception):
    def __init__(self, status: int, detail):
        self.status = status
        self.detail = detail
        super().__init__(str(detail))


def _code(session: Session) -> str:
    for _ in range(6):
        value = new_referral_code()
        if session.scalar(select(User.id).where(User.referral_code == value)) is None:
            return value
    return new_referral_code() + new_referral_code()[:2]


def is_premium(user: User, now: datetime | None = None) -> bool:
    current = naive_utc(now)
    return bool(user.premium_until and user.premium_until > current)


def _usage(session: Session, user: User, today) -> UsageDay:
    row = session.scalar(select(UsageDay).where(UsageDay.user_id == user.id, UsageDay.day == today))
    if row is None:
        row = UsageDay(user_id=user.id, day=today, lessons=0, chats=0)
        session.add(row)
        session.flush()
    return row


def _today(user: User, now: datetime | None = None):
    return local_today(user.timezone, now or datetime.now(timezone.utc))


def _day_start_utc(user: User, today) -> datetime:
    try:
        tz = ZoneInfo(user.timezone or "Europe/Moscow")
    except Exception:
        tz = ZoneInfo("Europe/Moscow")
    midnight = datetime.combine(today, time.min, tzinfo=tz)
    return midnight.astimezone(timezone.utc).replace(tzinfo=None)


def _add_xp(session: Session, user: User, amount: int, reason: str, now: datetime) -> None:
    if amount <= 0:
        return
    user.xp += amount
    session.add(XpEvent(user_id=user.id, amount=amount, reason=reason, created_at=now))


def _unlock(session: Session, user: User, code: str, now: datetime) -> dict | None:
    if code not in ACHIEVEMENTS:
        return None
    exists = session.scalar(
        select(Achievement.id).where(Achievement.user_id == user.id, Achievement.code == code)
    )
    if exists:
        return None
    session.add(Achievement(user_id=user.id, code=code, created_at=now))
    title, text = ACHIEVEMENTS[code]
    return {"code": code, "title": title, "text": text}


def _sync_achievements(session: Session, user: User, now: datetime, extra: list[str] | None = None) -> list[dict]:
    codes = list(extra or [])
    if user.xp >= 100:
        codes.append("xp_100")
    if user.xp >= 500:
        codes.append("xp_500")
    if user.streak >= 3:
        codes.append("streak_3")
    if user.streak >= 7:
        codes.append("streak_7")
    if is_premium(user, now):
        codes.append("premium")
    found = []
    for code in codes:
        item = _unlock(session, user, code, now)
        if item:
            found.append(item)
    return found


def _done(session: Session, user_id: int) -> set[str]:
    return set(session.scalars(select(Progress.node_id).where(Progress.user_id == user_id)))


def limits_for(user: User, now: datetime | None = None) -> dict:
    settings = get_settings()
    premium = is_premium(user, now)
    return {
        "premium": premium,
        "lessons": None if premium else settings.free_lessons_per_day,
        "chat": None if premium else settings.free_chat_messages_per_day,
    }


def usage_view(session: Session, user: User, now: datetime | None = None) -> dict:
    today = _today(user, now)
    row = _usage(session, user, today)
    caps = limits_for(user, now)
    return {
        "day": today.isoformat(),
        "lessons": row.lessons,
        "lessons_limit": caps["lessons"],
        "chat": row.chats,
        "chat_limit": caps["chat"],
        "studied_minutes": row.lessons * 5,
    }


def serialize_user(session: Session, user: User, now: datetime | None = None) -> dict:
    now_n = naive_utc(now)
    level, into, need = level_progress(user.xp)
    unlocked = {
        row.code: row.created_at.isoformat() if row.created_at else ""
        for row in session.scalars(select(Achievement).where(Achievement.user_id == user.id))
    }
    achievements = []
    for code, (title, text) in ACHIEVEMENTS.items():
        achievements.append({
            "code": code,
            "title": title,
            "text": text,
            "unlocked": code in unlocked,
            "unlocked_at": unlocked.get(code, ""),
        })
    mascot = MASCOTS.get(user.mascot, {})
    language = LANGUAGES.get(user.language, {})
    return {
        "id": user.id,
        "name": user.first_name or "Ученик",
        "username": user.username or "",
        "language": user.language,
        "language_name": language.get("name", ""),
        "city": language.get("city", ""),
        "mascot": user.mascot,
        "mascot_name": mascot.get("name", ""),
        "xp": user.xp,
        "level": level,
        "level_xp": into,
        "level_goal": need,
        "streak": user.streak,
        "premium": is_premium(user, now_n),
        "premium_until": user.premium_until.isoformat() if user.premium_until else None,
        "timezone": user.timezone or "Europe/Moscow",
        "reminder_time": user.reminder_time or "",
        "daily_goal": user.daily_goal or 15,
        "onboarded": bool(user.onboarded and user.language and user.mascot),
        "referral_code": user.referral_code,
        "public_id": user.public_id or "",
        "email": user.email or "",
        "has_telegram": bool(user.telegram_id and user.telegram_id > 0),
        "english_level": user.english_level or "",
        "study_goal": user.study_goal or "",
        "languages": [code for code in (user.languages or "").split(",") if code],
        "placement_level": user.placement_level or "",
        "trial_used": bool(user.trial_used),
        "coins": user.coins or 0,
        "outfit": user.equipped or "",
        "boosts": {"freeze": user.boost_freeze or 0, "double": user.boost_double or 0},
        "pet": pet_view(user.xp),
        "kids_mode": bool(user.kids_mode),
        "access": _access_view(session, user),
        "usage": usage_view(session, user, now_n),
        "achievements": achievements,
    }


def pet_view(xp: int) -> dict:
    if xp >= 500:
        return {"code": "elder", "title": "Взрослый"}
    if xp >= 200:
        return {"code": "grown", "title": "Подросток"}
    if xp >= 50:
        return {"code": "cub", "title": "Малыш"}
    return {"code": "sprout", "title": "Кроха"}


def _access_view(session: Session, user: User) -> dict | None:
    from app.admin_service import resolve_admin

    access = resolve_admin(session, user.telegram_id or 0)
    if access is None:
        return None
    return {"role": access.role, "can_invite": access.can_invite}


def get_or_create_user(
    session: Session,
    telegram_id: int,
    username: str = "",
    first_name: str = "",
    start_param: str = "",
) -> tuple[User, bool]:
    user = session.scalar(select(User).where(User.telegram_id == telegram_id))
    granted = False
    created = False
    if user is None:
        candidate = User(
            telegram_id=telegram_id,
            username=(username or "")[:64],
            first_name=(first_name or "")[:128],
            referral_code=_code(session),
            public_id=mint_public_id(session),
            timezone="Europe/Moscow",
            daily_goal=15,
        )
        session.add(candidate)
        try:
            session.flush()
        except IntegrityError:
            session.rollback()
            user = session.scalar(select(User).where(User.telegram_id == telegram_id))
            if user is None:
                raise
        else:
            user = candidate
            created = True
    if created and user is not None:
        referrer = find_referrer(session, parse_ref(start_param))
        if referrer and referrer.id != user.id:
            user.referred_by_id = referrer.id
            granted = grant_join_referral(session, referrer, user)
            if granted:
                _unlock(session, referrer, "referral", naive_utc())
            else:
                user.referred_by_id = None
    elif user is not None:
        if username:
            user.username = username[:64]
        if first_name:
            user.first_name = first_name[:128]
    if user is not None and not user.public_id:
        user.public_id = mint_public_id(session)
    if user is None:
        raise ServiceError(500, "Не удалось создать профиль")
    return user, granted


def mint_public_id(session: Session) -> str:
    for _ in range(8):
        code = new_public_id()
        if session.scalar(select(User.id).where(User.public_id == code)) is None:
            return code
    raise ServiceError(500, "Не удалось выдать номер")


def _clean_email(email: str) -> str:
    value = (email or "").strip().lower()
    if not _EMAIL.match(value) or len(value) > 255:
        raise ServiceError(400, "Проверь почту")
    return value


def _clean_password(password: str) -> str:
    if not password or len(password) < 8 or len(password) > 128:
        raise ServiceError(400, "Пароль от 8 символов")
    return password


def register_account(session: Session, email: str, password: str, name: str = "") -> User:
    email_n = _clean_email(email)
    password_n = _clean_password(password)
    taken = session.scalar(select(User.id).where(func.lower(User.email) == email_n))
    if taken:
        raise ServiceError(409, "Эта почта уже занята")
    label = (name or email_n.split("@")[0])[:128]
    user = None
    for _ in range(5):
        candidate = User(
            telegram_id=new_email_telegram_id(),
            username="",
            first_name=label,
            email=email_n,
            password_hash=hash_password(password_n),
            referral_code=_code(session),
            public_id=mint_public_id(session),
            timezone="Europe/Moscow",
            daily_goal=15,
        )
        session.add(candidate)
        try:
            session.flush()
        except IntegrityError:
            session.rollback()
            continue
        user = candidate
        break
    if user is None:
        raise ServiceError(500, "Не удалось создать аккаунт")
    return user


def login_account(session: Session, email: str, password: str) -> User:
    email_n = (email or "").strip().lower()
    user = session.scalar(select(User).where(func.lower(User.email) == email_n))
    if user is None or not verify_password(password or "", user.password_hash or ""):
        raise ServiceError(401, "Почта или пароль не подошли")
    return user


def link_account(session: Session, user: User, email: str, password: str) -> User:
    if user.email:
        raise ServiceError(409, "Почта уже привязана")
    email_n = _clean_email(email)
    password_n = _clean_password(password)
    taken = session.scalar(select(User.id).where(func.lower(User.email) == email_n))
    if taken:
        raise ServiceError(409, "Эта почта уже занята")
    user.email = email_n
    user.password_hash = hash_password(password_n)
    session.flush()
    return user


def start_trial(session: Session, user: User) -> User:
    if user.trial_used:
        raise ServiceError(409, "Пробные 3 дня уже были")
    now = naive_utc()
    base = user.premium_until if user.premium_until and user.premium_until > now else now
    user.premium_until = base + timedelta(days=3)
    user.trial_used = True
    return user


def demo_telegram_id(device_id: str) -> int:
    if not _DEVICE.match(device_id or ""):
        raise ServiceError(400, "Некорректный идентификатор устройства")
    return DEMO_ID_BASE + (zlib.crc32(device_id.encode()) % 1_000_000_000)


def _check_zone(name: str) -> str:
    try:
        ZoneInfo(name)
    except Exception as exc:
        raise ServiceError(400, "Неизвестный часовой пояс") from exc
    return name


def _apply_profile(user: User, data: dict, *, require: bool) -> None:
    language = data.get("language", None)
    mascot = data.get("mascot", None)
    goal = data.get("daily_goal", None)
    reminder = data.get("reminder_time", None)
    zone = data.get("timezone", None)
    if require and not all([language, mascot, goal, zone]):
        raise ServiceError(400, "Нужны язык, спутник, цель и часовой пояс")
    if language is not None:
        if language not in LANGUAGES:
            raise ServiceError(400, "Такого языка нет")
        user.language = language
    if mascot is not None:
        if mascot not in MASCOTS:
            raise ServiceError(400, "Такого спутника нет")
        user.mascot = mascot
    if goal is not None:
        if goal not in _MINUTES:
            raise ServiceError(400, "Цель — 5, 10, 15, 20, 30, 45 или 60 минут")
        user.daily_goal = goal
    level = data.get("english_level", None)
    if level:
        if level not in _LEVELS:
            raise ServiceError(400, "Неизвестный уровень")
        user.english_level = level
    study = data.get("study_goal", None)
    if study:
        if study not in _STUDY_GOALS:
            raise ServiceError(400, "Неизвестная цель")
        user.study_goal = study
    languages = data.get("languages", None)
    if isinstance(languages, list):
        clean = []
        for code in languages:
            if code in LANGUAGES and code not in clean:
                clean.append(code)
        if len(clean) > 3:
            raise ServiceError(400, "Можно выбрать до трёх языков")
        user.languages = ",".join(clean)
    placement = data.get("placement_level", None)
    if placement:
        if placement not in _LEVELS:
            raise ServiceError(400, "Неизвестный уровень")
        user.placement_level = placement
    if "kids_mode" in data and data.get("kids_mode") is not None:
        user.kids_mode = bool(data["kids_mode"])
    if reminder is not None:
        if reminder and not _CLOCK.match(reminder):
            raise ServiceError(400, "Время в формате ЧЧ:ММ")
        user.reminder_time = reminder
    if zone is not None:
        user.timezone = _check_zone(zone)
    if user.language and user.mascot:
        user.onboarded = True


def public_payload() -> dict:
    settings = get_settings()
    mascots = sorted(MASCOTS.values(), key=lambda item: item["order"])
    return {
        "bot_username": settings.bot_username.lstrip("@"),
        "prices": {"month": settings.premium_month_rub, "year": settings.premium_year_rub},
        "limits": {
            "lessons": settings.free_lessons_per_day,
            "chat": settings.free_chat_messages_per_day,
        },
        "demo": settings.demo_mode,
        "mascots": [
            {"id": m["id"], "name": m["name"], "trait": m["trait"], "blurb": m["blurb"], "map_line": m["map_line"]}
            for m in mascots
        ],
        "languages": [
            {
                "code": lang["code"],
                "name": lang["name"],
                "native": lang["native"],
                "city": lang["city"],
                "country": lang["country"],
                "tts": lang["tts"],
                "available": lang["code"] == "en",
            }
            for lang in LANGUAGES.values()
        ],
    }


def path_payload(session: Session, user: User) -> dict:
    if not user.language:
        raise ServiceError(400, "Сначала выбери язык")
    done = _done(session, user.id)
    meta = language_meta(user.language)
    chapters = []
    for chapter in chapters_for(user.language):
        nodes = []
        flat = ordered_nodes(user.language)
        index_of = {item["id"]: i for i, item in enumerate(flat)}
        lesson_total = 0
        lesson_done = 0
        for node in chapter["nodes"]:
            status = node_status(flat, index_of[node["id"]], done)
            if chapter.get("premium") and not is_premium(user) and status != "done":
                status = "locked"
            if node["kind"] == "lesson":
                lesson_total += 1
                if status == "done":
                    lesson_done += 1
            nodes.append({
                "id": node["id"],
                "kind": node["kind"],
                "title": node["title"],
                "skill": node.get("skill", "story"),
                "xp": node.get("xp", 0),
                "status": status,
            })
        unlocked = nodes[0]["status"] != "locked"
        chapters.append({
            "id": chapter["id"],
            "index": chapter["index"],
            "title": chapter["title"],
            "subtitle": chapter["subtitle"],
            "quest_title": chapter["quest_title"],
            "quest_text": chapter["quest_text"],
            "reward_xp": chapter["reward_xp"],
            "premium": bool(chapter.get("premium")),
            "unlocked": unlocked and not (chapter.get("premium") and not is_premium(user)),
            "complete": all(node["status"] == "done" for node in nodes),
            "lessons_done": lesson_done,
            "lessons_total": lesson_total,
            "nodes": nodes,
        })
    mascot = MASCOTS.get(user.mascot, MASCOTS["parrot"])
    return {"language": meta, "mascot_line": mascot["map_line"], "chapters": chapters}


def _city_locked(user: User, node: dict) -> bool:
    chapter = chapter_by_id(node["chapter_id"])
    return bool(chapter and chapter.get("premium") and not is_premium(user))


def lesson_payload(session: Session, user: User, lesson_id: str) -> dict:
    node = get_node(lesson_id)
    if node is None or node["kind"] != "lesson" or node["language"] != user.language:
        raise ServiceError(404, "Урок не найден")
    if not is_playable(lesson_id, _done(session, user.id)):
        raise ServiceError(403, "Этот урок ещё закрыт")
    if _city_locked(user, node):
        raise ServiceError(403, "Этот город открыт с Premium")
    meta = language_meta(user.language)
    return {
        "id": node["id"],
        "title": node["title"],
        "skill": node["skill"],
        "xp": node["xp"],
        "tts": meta["tts"],
        "language": user.language,
        "steps": shuffle_steps(node["steps"]),
    }


def story_payload(session: Session, user: User, story_id: str) -> dict:
    node = get_node(story_id)
    if node is None or node["kind"] != "story" or node["language"] != user.language:
        raise ServiceError(404, "Сцена не найдена")
    if not is_playable(story_id, _done(session, user.id)):
        raise ServiceError(403, "Эта сцена ещё закрыта")
    if _city_locked(user, node):
        raise ServiceError(403, "Этот город открыт с Premium")
    return {"id": node["id"], "title": node["title"], "lines": node["lines"], "xp": node["xp"]}


def _next_node(user: User, node_id: str, done: set[str]) -> dict | None:
    nodes = ordered_nodes(user.language)
    for index, node in enumerate(nodes):
        if node["id"] != node_id or index + 1 >= len(nodes):
            continue
        nxt = nodes[index + 1]
        if node_status(nodes, index + 1, done) == "current":
            return {"id": nxt["id"], "kind": nxt["kind"], "title": nxt["title"]}
    return None


def _finish_chapter_rewards(session: Session, user: User, node: dict, done: set[str], now: datetime) -> tuple[int, str | None, list[dict]]:
    chapter = chapter_by_id(node["chapter_id"])
    if chapter is None:
        return 0, None, []
    ids = [item["id"] for item in chapter["nodes"]]
    if not all(item in done for item in ids):
        return 0, None, []
    reason = f"chapter:{chapter['id']}"
    already = session.scalar(select(XpEvent.id).where(XpEvent.user_id == user.id, XpEvent.reason == reason))
    gained = 0
    unlocked = []
    if already is None:
        gained = chapter["reward_xp"]
        _add_xp(session, user, gained, reason, now)
        from app.wardrobe import grant_chapter_gift

        grant_chapter_gift(session, user, chapter["index"])
    if chapter["index"] == 1:
        item = _unlock(session, user, "chapter_1", now)
        if item:
            unlocked.append(item)
    chapters = chapters_for(user.language)
    opened = None
    for item in chapters:
        if item["index"] == chapter["index"] + 1:
            opened = item["id"]
    return gained, opened, unlocked


def _claim_daily(session: Session, user: User, today, now: datetime) -> list[dict]:
    """Grant one-time daily quest XP when the condition is already true."""
    row = _usage(session, user, today)
    start = _day_start_utc(user, today)
    xp_today = session.scalar(
        select(func.coalesce(func.sum(XpEvent.amount), 0)).where(
            XpEvent.user_id == user.id, XpEvent.created_at >= start
        )
    ) or 0
    speak_ids = [
        node["id"]
        for node in ordered_nodes(user.language)
        if node["kind"] == "lesson" and any(step["type"] == "speak" for step in node["steps"])
    ]
    spoke = False
    if speak_ids:
        spoke = session.scalar(
            select(Progress.id).where(
                Progress.user_id == user.id,
                Progress.node_id.in_(speak_ids),
                Progress.completed_at >= start,
            )
        ) is not None
    checks = {
        "lesson": (row.lessons >= 1, 10),
        "xp": (xp_today >= 20, 10),
        "talk": (row.chats >= 1 or spoke, 10),
    }
    notes = []
    for code, (ok, amount) in checks.items():
        if not ok:
            continue
        reason = f"quest:{code}:{today.isoformat()}"
        exists = session.scalar(select(XpEvent.id).where(XpEvent.user_id == user.id, XpEvent.reason == reason))
        if exists:
            continue
        _add_xp(session, user, amount, reason, now)
        notes.append({"id": code, "xp": amount})
    return notes


def _mark_studied(user: User, now: datetime, today) -> None:
    missed = user.last_study_date is not None and (today - user.last_study_date).days == 2
    if missed and (user.boost_freeze or 0) > 0:
        user.boost_freeze -= 1
        user.streak = (user.streak or 0) + 1
    else:
        user.streak = apply_streak(user.streak, user.last_study_date, today)
    user.last_study_date = today
    user.last_study_at = now


def complete_lesson(session: Session, user: User, lesson_id: str, mistakes: int, now: datetime | None = None) -> dict:
    if not user.onboarded:
        raise ServiceError(400, "Сначала пройди знакомство")
    node = get_node(lesson_id)
    if node is None or node["kind"] != "lesson" or node["language"] != user.language:
        raise ServiceError(404, "Урок не найден")
    done = _done(session, user.id)
    if not is_playable(lesson_id, done):
        raise ServiceError(403, "Этот урок ещё закрыт")
    now_n = naive_utc(now)
    today = _today(user, now or datetime.now(timezone.utc))
    row = _usage(session, user, today)
    cap = limits_for(user, now_n)["lessons"]
    if cap is not None and row.lessons >= cap:
        raise ServiceError(429, {
            "code": "limit",
            "kind": "lesson",
            "message": f"На сегодня бесплатные испытания закончились ({cap} из {cap}). Premium снимает лимит.",
        })
    mistakes = max(0, min(int(mistakes), 30))
    existing = session.scalar(
        select(Progress).where(Progress.user_id == user.id, Progress.node_id == lesson_id)
    )
    perfect = mistakes == 0
    if existing is None:
        gained = node["xp"] + (5 if perfect else 0)
        session.add(Progress(
            user_id=user.id, node_id=lesson_id, mistakes=mistakes, xp=gained, completed_at=now_n,
        ))
        already = False
        user.coins = (user.coins or 0) + 8
        if user.boost_double:
            gained *= 2
            user.boost_double -= 1
    else:
        gained = 5
        already = True
    row.lessons += 1
    _add_xp(session, user, gained, f"lesson:{lesson_id}", now_n)
    done.add(lesson_id)
    chapter_xp, opened, chapter_badges = _finish_chapter_rewards(session, user, node, done, now_n)
    _mark_studied(user, now_n, today)
    badges = _sync_achievements(session, user, now_n, ["first_lesson"])
    if perfect and not already:
        item = _unlock(session, user, "perfect", now_n)
        if item:
            badges.append(item)
    badges.extend(chapter_badges)
    quests = _claim_daily(session, user, today, now_n)
    badges.extend(_sync_achievements(session, user, now_n))
    session.commit()
    fresh = _done(session, user.id)
    return {
        "xp_gained": gained + chapter_xp,
        "chapter_xp": chapter_xp,
        "perfect": perfect and not already,
        "replay": already,
        "user": serialize_user(session, user, now_n),
        "unlocked_achievements": badges,
        "quests": quests,
        "chapter_unlocked": opened,
        "next": _next_node(user, lesson_id, fresh),
    }


def complete_story(session: Session, user: User, story_id: str, now: datetime | None = None) -> dict:
    if not user.onboarded:
        raise ServiceError(400, "Сначала пройди знакомство")
    node = get_node(story_id)
    if node is None or node["kind"] != "story" or node["language"] != user.language:
        raise ServiceError(404, "Сцена не найдена")
    done = _done(session, user.id)
    if not is_playable(story_id, done):
        raise ServiceError(403, "Эта сцена ещё закрыта")
    now_n = naive_utc(now)
    today = _today(user, now or datetime.now(timezone.utc))
    existing = session.scalar(select(Progress).where(Progress.user_id == user.id, Progress.node_id == story_id))
    gained = 0 if existing else node["xp"]
    if existing is None:
        session.add(Progress(user_id=user.id, node_id=story_id, mistakes=0, xp=gained, completed_at=now_n))
        _add_xp(session, user, gained, f"story:{story_id}", now_n)
    done.add(story_id)
    _mark_studied(user, now_n, today)
    badges = _sync_achievements(session, user, now_n)
    session.commit()
    return {
        "xp_gained": gained,
        "user": serialize_user(session, user, now_n),
        "unlocked_achievements": badges,
        "next": _next_node(user, story_id, _done(session, user.id)),
    }


def quests_payload(session: Session, user: User, now: datetime | None = None) -> dict:
    if not user.language:
        raise ServiceError(400, "Сначала выбери язык")
    now_n = naive_utc(now)
    today = _today(user, now or datetime.now(timezone.utc))
    row = _usage(session, user, today)
    start = _day_start_utc(user, today)
    xp_today = session.scalar(
        select(func.coalesce(func.sum(XpEvent.amount), 0)).where(
            XpEvent.user_id == user.id, XpEvent.created_at >= start
        )
    ) or 0
    daily = [
        {"id": "lesson", "title": "Одно испытание", "text": "Заверши любое испытание сегодня", "reward": 10,
         "progress": min(row.lessons, 1), "target": 1, "done": row.lessons >= 1},
        {"id": "xp", "title": "20 XP", "text": "Набери 20 XP за сегодня", "reward": 10,
         "progress": min(int(xp_today), 20), "target": 20, "done": xp_today >= 20},
        {"id": "talk", "title": "Живое слово", "text": "Напиши собеседнику или пройди испытание с речью", "reward": 10,
         "progress": 1 if row.chats else 0, "target": 1, "done": row.chats >= 1},
    ]
    # Talk quest also completes via a speaking lesson; reflect that.
    speak_ids = [
        node["id"]
        for node in ordered_nodes(user.language)
        if node["kind"] == "lesson" and any(step["type"] == "speak" for step in node["steps"])
    ]
    if speak_ids and not daily[2]["done"]:
        spoke = session.scalar(
            select(Progress.id).where(
                Progress.user_id == user.id,
                Progress.node_id.in_(speak_ids),
                Progress.completed_at >= start,
            )
        ) is not None
        if spoke:
            daily[2]["done"] = True
            daily[2]["progress"] = 1
    done = _done(session, user.id)
    story = []
    for chapter in chapters_for(user.language):
        ids = [node["id"] for node in chapter["nodes"]]
        finished = sum(1 for item in ids if item in done)
        if chapter["index"] == 1:
            quest_open = True
        else:
            previous = chapters_for(user.language)[chapter["index"] - 2]
            quest_open = all(node["id"] in done for node in previous["nodes"])
        story.append({
            "id": chapter["id"],
            "title": chapter["quest_title"],
            "text": chapter["quest_text"],
            "chapter": chapter["title"],
            "reward": chapter["reward_xp"],
            "progress": finished,
            "target": len(ids),
            "done": finished == len(ids),
            "unlocked": quest_open,
        })
    return {"daily": daily, "story": story, "usage": usage_view(session, user, now_n)}


async def send_chat(
    session: Session,
    user: User,
    *,
    scene: str,
    text: str,
    history: list[dict],
    hint_only: bool,
    now: datetime | None = None,
) -> dict:
    if not user.onboarded or not user.language:
        raise ServiceError(400, "Сначала выбери язык")
    known = {item["id"] for item in scenes_for(user.language)}
    if scene not in known:
        raise ServiceError(404, "Нет такой сцены")
    clean_history = []
    for item in (history or [])[-8:]:
        if not isinstance(item, dict):
            continue
        role = "assistant" if item.get("role") == "assistant" else "user"
        body = str(item.get("text") or "")[:400]
        if body.strip():
            clean_history.append({"role": role, "text": body})
    now_n = naive_utc(now)
    today = _today(user, now or datetime.now(timezone.utc))
    mascot_name = MASCOTS.get(user.mascot, MASCOTS["parrot"])["name"]
    if hint_only or not text.strip():
        result = demo_reply(user.language, scene, clean_history, "")
        result["usage"] = usage_view(session, user, now_n)
        return result
    if len(text) > 400:
        raise ServiceError(400, "Слишком длинное сообщение")
    row = _usage(session, user, today)
    cap = limits_for(user, now_n)["chat"]
    if cap is not None and row.chats >= cap:
        raise ServiceError(429, {
            "code": "limit",
            "kind": "chat",
            "message": f"Бесплатные сообщения на сегодня закончились ({cap} из {cap}). Premium снимает лимит.",
        })
    row.chats += 1
    result = await chat_reply(
        get_settings(),
        language=user.language,
        scene_id=scene,
        history=clean_history,
        user_text=text.strip(),
        mascot_name=mascot_name,
        mascot_id=user.mascot or "parrot",
    )
    badges = []
    item = _unlock(session, user, "chat", now_n)
    if item:
        badges.append(item)
    quests = _claim_daily(session, user, today, now_n)
    badges.extend(_sync_achievements(session, user, now_n))
    session.commit()
    result["usage"] = usage_view(session, user, now_n)
    result["unlocked_achievements"] = badges
    result["quests"] = quests
    result["user"] = serialize_user(session, user, now_n)
    return result


def leaderboard(session: Session, user: User, scope: str, now: datetime | None = None) -> dict:
    now_n = naive_utc(now)
    since = now_n - timedelta(days=7)
    rows = session.execute(
        select(XpEvent.user_id, func.sum(XpEvent.amount))
        .where(XpEvent.created_at >= since)
        .group_by(XpEvent.user_id)
    ).all()
    weekly = {uid: int(total or 0) for uid, total in rows}
    if scope == "friends":
        ids = {user.id}
        if user.referred_by_id:
            ids.add(user.referred_by_id)
        ids.update(session.scalars(select(User.id).where(User.referred_by_id == user.id)))
        people = session.scalars(select(User).where(User.id.in_(ids))).all()
    else:
        people = session.scalars(select(User).order_by(User.xp.desc()).limit(40)).all()
    board = []
    for person in people:
        mascot = MASCOTS.get(person.mascot, {})
        board.append({
            "id": person.id,
            "name": person.first_name or "Ученик",
            "mascot": person.mascot or "parrot",
            "mascot_name": mascot.get("name", "Яппо"),
            "xp": person.xp,
            "weekly_xp": weekly.get(person.id, 0),
            "streak": person.streak,
            "you": person.id == user.id,
        })
    board.sort(key=lambda item: (item["weekly_xp"], item["xp"]), reverse=True)
    if scope != "friends":
        board = board[:20]
        if not any(item["you"] for item in board):
            mascot = MASCOTS.get(user.mascot, {})
            board.append({
                "id": user.id,
                "name": user.first_name or "Ученик",
                "mascot": user.mascot or "parrot",
                "mascot_name": mascot.get("name", "Яппо"),
                "xp": user.xp,
                "weekly_xp": weekly.get(user.id, 0),
                "streak": user.streak,
                "you": True,
            })
    for index, item in enumerate(board, start=1):
        item["rank"] = index
    return {"scope": "friends" if scope == "friends" else "all", "entries": board}


def referrals_payload(session: Session, user: User) -> dict:
    settings = get_settings()
    username = settings.bot_username.lstrip("@")
    code = user.referral_code
    invited = session.scalars(select(User).where(User.referred_by_id == user.id)).all()
    rewards = session.scalars(select(ReferralReward).where(ReferralReward.referrer_id == user.id)).all()
    join_xp = sum(item.amount for item in rewards if item.kind == "join_xp")
    # Referee also got the same XP; the screen shows what the referrer earned.
    days = sum(item.amount for item in rewards if item.kind == "premium_days")
    paid_ids = {item.referee_id for item in rewards if item.kind == "premium_days"}
    return {
        "code": code,
        "link": f"https://t.me/{username}?start=ref_{code}",
        "app_link": f"https://t.me/{username}?startapp=ref_{code}",
        "join_xp": settings.referral_join_xp,
        "premium_days": settings.referral_premium_days,
        "invited": len(invited),
        "paid": len(paid_ids),
        "xp_earned": join_xp,
        "days_earned": days,
        "friends": [
            {
                "name": person.first_name or "Ученик",
                "onboarded": bool(person.onboarded),
                "paid": person.id in paid_ids,
            }
            for person in invited
        ],
    }


def admin_stats(session: Session, now: datetime | None = None) -> dict:
    now_n = naive_utc(now)
    msk = ZoneInfo("Europe/Moscow")
    local_now = datetime.now(timezone.utc).astimezone(msk) if now is None else (
        now.astimezone(msk) if now.tzinfo else now.replace(tzinfo=timezone.utc).astimezone(msk)
    )
    start = datetime.combine(local_now.date(), time.min, tzinfo=msk).astimezone(timezone.utc).replace(tzinfo=None)
    users = session.scalar(select(func.count()).select_from(User)) or 0
    active = session.scalar(
        select(func.count()).select_from(User).where(User.last_study_at.is_not(None), User.last_study_at >= start)
    ) or 0
    premium = session.scalar(
        select(func.count()).select_from(User).where(User.premium_until.is_not(None), User.premium_until > now_n)
    ) or 0
    paid = session.scalars(select(Payment).where(Payment.status == "paid")).all()
    revenue = 0
    test_paid = 0
    for item in paid:
        if item.is_test:
            test_paid += 1
            continue
        try:
            revenue += int(round(float(item.amount) * 100))
        except ValueError:
            continue
    return {
        "users": int(users),
        "active_today": int(active),
        "premium": int(premium),
        "revenue_rub": f"{revenue / 100:.2f}",
        "test_paid": test_paid,
    }


def render_stats(stats: dict) -> str:
    return (
        "Yappo · статистика\n"
        f"Пользователи: {stats['users']}\n"
        f"Занимались сегодня: {stats['active_today']}\n"
        f"Premium: {stats['premium']}\n"
        f"Выручка: {stats['revenue_rub']} ₽\n"
        f"Тестовые оплаты: {stats['test_paid']}"
    )


async def start_checkout(session: Session, user: User, plan: str) -> dict:
    settings = get_settings()
    if plan not in {"month", "year"}:
        raise ServiceError(400, "Неизвестный тариф")
    if not settings.rollypay_api_key and not (settings.demo_mode and settings.rollypay_test):
        return {
            "pay_url": "",
            "order_id": "",
            "test": False,
            "amount": settings.premium_month_rub if plan == "month" else settings.premium_year_rub,
            "plan": plan,
            "available": False,
            "message": "Оплата скоро заработает",
        }
    payment = create_local_payment(session, user, plan, settings)
    if not settings.rollypay_api_key:
        payment.pay_url = "/premium?demo=1"
        payment.payment_id = "demo_" + payment.order_id
        session.commit()
        return {
            "pay_url": payment.pay_url,
            "order_id": payment.order_id,
            "test": True,
            "amount": payment.amount,
            "plan": payment.plan,
        }
    session.commit()
    try:
        data = await create_rollypay_payment(payment, user, settings)
    except Exception:
        payment.status = "error"
        session.commit()
        raise ServiceError(502, "Не удалось создать платёж. Попробуй ещё раз.") from None
    payment.pay_url = str(data.get("pay_url") or "")
    payment.payment_id = str(data.get("payment_id") or "")
    if not payment.pay_url:
        payment.status = "error"
        session.commit()
        raise ServiceError(502, "Платёжка не вернула ссылку на оплату.")
    session.commit()
    return {
        "pay_url": payment.pay_url,
        "order_id": payment.order_id,
        "test": payment.is_test,
        "amount": payment.amount,
        "plan": payment.plan,
    }
