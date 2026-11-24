from datetime import datetime, timedelta

ACHIEVEMENTS = {
    "first_lesson": ("Первый шаг", "Заверши первое испытание"),
    "perfect": ("Без ошибок", "Пройди испытание, не ошибившись"),
    "streak_3": ("Три дня", "Занимайся три дня подряд"),
    "streak_7": ("Неделя", "Семь дней подряд"),
    "xp_100": ("Сотня", "Набери 100 XP"),
    "xp_500": ("Пять сотен", "Набери 500 XP"),
    "chapter_1": ("Глава позади", "Заверши первую главу"),
    "chat": ("Живой разговор", "Напиши сообщение собеседнику"),
    "referral": ("Позвал друга", "Друг зашёл по твоей ссылке"),
    "premium": ("Yappo Premium", "Активная подписка"),
}


def level_progress(xp: int) -> tuple[int, int, int]:
    """Return (level, xp_into_level, xp_needed_for_level)."""
    level = 1
    need = 80
    rest = max(0, xp)
    while rest >= need:
        rest -= need
        level += 1
        need = 80 + (level - 1) * 20
    return level, rest, need


def extend_premium(current: datetime | None, days: int, now: datetime) -> datetime:
    base = current if current and current > now else now
    return base + timedelta(days=days)


def apply_streak(streak: int, last_study_date, today) -> int:
    if last_study_date == today:
        return streak
    if last_study_date is not None and (today - last_study_date).days == 1:
        return streak + 1
    return 1
