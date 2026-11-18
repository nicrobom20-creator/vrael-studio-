from datetime import datetime
from zoneinfo import ZoneInfo

from app.content import MASCOTS

REMINDER_LINES = {
    "parrot": (
        "Эй, это Яппо! Крылья уже размял, а тебя сегодня ещё не было. "
        "Цель — {goal} минут. Открой испытание: город станет ближе с одной фразы."
    ),
    "bunny": (
        "Мими на связи. Мне любопытно, какое слово ты скажешь сегодня первым. "
        "Мы ещё не занимались, а цель — {goal} минут. Заглянешь?"
    ),
    "bear": (
        "Бруно уже на тропе. Новый город сам не откроется, а сегодняшние {goal} минут "
        "ещё впереди. Надень рюкзак — и пойдём."
    ),
    "fox": (
        "Рыжик шепчет: карта без тебя скучает. Сегодня ещё ни шага, а цель — {goal} минут. "
        "Поймаем одну фразу?"
    ),
    "cat": (
        "Нора отложила книгу. Тихий факт: серия пропадёт, если пропустить день. "
        "Нам хватит {goal} минут. Я подожду на первой странице."
    ),
}


def is_reminder_due(
    *,
    reminder_time: str | None,
    timezone: str | None,
    last_study_date,
    last_reminder_date,
    now: datetime,
) -> bool:
    """True when the local clock has passed the chosen time, the user has not
    studied today, and we have not already reminded them today.
    """
    if not reminder_time or ":" not in reminder_time:
        return False
    try:
        hour_s, minute_s = reminder_time.split(":", 1)
        hour, minute = int(hour_s), int(minute_s)
    except ValueError:
        return False
    if not (0 <= hour <= 23 and 0 <= minute <= 59):
        return False
    tz_name = timezone or "Europe/Moscow"
    try:
        tz = ZoneInfo(tz_name)
    except Exception:
        tz = ZoneInfo("Europe/Moscow")
    if now.tzinfo is None:
        now = now.replace(tzinfo=ZoneInfo("UTC"))
    local = now.astimezone(tz)
    if (local.hour, local.minute) < (hour, minute):
        return False
    if last_study_date == local.date():
        return False
    if last_reminder_date == local.date():
        return False
    return True


def local_today(timezone: str | None, now: datetime):
    tz_name = timezone or "Europe/Moscow"
    try:
        tz = ZoneInfo(tz_name)
    except Exception:
        tz = ZoneInfo("Europe/Moscow")
    if now.tzinfo is None:
        now = now.replace(tzinfo=ZoneInfo("UTC"))
    return now.astimezone(tz).date()


def reminder_text(mascot: str, goal: int) -> str:
    template = REMINDER_LINES.get(mascot) or REMINDER_LINES["parrot"]
    name = MASCOTS.get(mascot, MASCOTS["parrot"])["name"]
    return template.format(goal=goal, name=name)
