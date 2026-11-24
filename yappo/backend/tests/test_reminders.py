import asyncio
from datetime import datetime, timezone
from zoneinfo import ZoneInfo

from app.content import MASCOTS
from app.models import User
from app.reminders import is_reminder_due, reminder_text

MSK = ZoneInfo("Europe/Moscow")


def _aware(year, month, day, hour, minute, zone="UTC"):
    return datetime(year, month, day, hour, minute, tzinfo=ZoneInfo(zone))


def test_reminder_is_due_only_after_local_time_without_study_or_duplicate():
    due_now = _aware(2026, 6, 1, 6, 0)  # 09:00 in Moscow
    assert is_reminder_due(
        reminder_time="09:00",
        timezone="Europe/Moscow",
        last_study_date=None,
        last_reminder_date=None,
        now=due_now,
    )
    early = _aware(2026, 6, 1, 5, 58)  # 08:58 in Moscow
    assert not is_reminder_due(
        reminder_time="09:00",
        timezone="Europe/Moscow",
        last_study_date=None,
        last_reminder_date=None,
        now=early,
    )
    local_day = due_now.astimezone(MSK).date()
    assert not is_reminder_due(
        reminder_time="09:00",
        timezone="Europe/Moscow",
        last_study_date=local_day,
        last_reminder_date=None,
        now=due_now,
    )
    assert not is_reminder_due(
        reminder_time="09:00",
        timezone="Europe/Moscow",
        last_study_date=None,
        last_reminder_date=local_day,
        now=due_now,
    )
    assert not is_reminder_due(
        reminder_time="",
        timezone="Europe/Moscow",
        last_study_date=None,
        last_reminder_date=None,
        now=due_now,
    )
    # Same UTC instant is morning in Vladivostok and night in Moscow.
    instant = _aware(2026, 6, 1, 0, 30)
    assert is_reminder_due(
        reminder_time="09:00",
        timezone="Asia/Vladivostok",
        last_study_date=None,
        last_reminder_date=None,
        now=instant,
    )
    assert not is_reminder_due(
        reminder_time="09:00",
        timezone="Europe/Moscow",
        last_study_date=None,
        last_reminder_date=None,
        now=instant,
    )


def test_reminder_uses_mascot_voice_and_goal():
    expected = {
        "parrot": "Яппо",
        "bunny": "Мими",
        "bear": "Бруно",
        "fox": "Рыжик",
        "cat": "Нора",
    }
    for mascot, name in expected.items():
        text = reminder_text(mascot, 20)
        assert name in text
        assert "20" in text
        assert mascot in MASCOTS


class _Bot:
    def __init__(self):
        self.sent = []

    async def send_message(self, chat_id, text, reply_markup=None):
        self.sent.append((chat_id, text))


def _user(session, telegram_id, **extra):
    user = User(
        telegram_id=telegram_id,
        referral_code=f"r{telegram_id}",
        first_name="Аня",
        language="fr",
        mascot=extra.pop("mascot", "fox"),
        onboarded=True,
        timezone=extra.pop("timezone", "Europe/Moscow"),
        reminder_time=extra.pop("reminder_time", "09:00"),
        daily_goal=15,
        **extra,
    )
    session.add(user)
    session.commit()
    return user


def test_scheduler_sends_once_and_skips_studied_users(session):
    from app.bot import dispatch_reminders

    moment = datetime(2026, 6, 1, 6, 5, tzinfo=timezone.utc)  # 09:05 Moscow
    due = _user(session, 501, mascot="parrot")
    studied = _user(session, 502, mascot="bunny")
    studied.last_study_date = moment.astimezone(MSK).date()
    session.commit()
    bot = _Bot()
    first = asyncio.run(dispatch_reminders(bot, session, moment))
    assert first == [due.telegram_id]
    assert "Яппо" in bot.sent[0][1]
    second = asyncio.run(dispatch_reminders(bot, session, moment))
    assert second == []
    assert len(bot.sent) == 1
