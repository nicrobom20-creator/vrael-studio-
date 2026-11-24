from datetime import datetime, timezone


def naive_utc(now: datetime | None = None) -> datetime:
    """UTC timestamp without tzinfo, matching how SQLite stores datetimes."""
    if now is None:
        now = datetime.now(timezone.utc)
    if now.tzinfo is not None:
        now = now.astimezone(timezone.utc).replace(tzinfo=None)
    return now
