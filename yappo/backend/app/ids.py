"""Human-readable account numbers and ids for email-only accounts."""

import secrets

_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"


def new_public_id() -> str:
    return "YP-" + "".join(secrets.choice(_ALPHABET) for _ in range(6))


def new_email_telegram_id() -> int:
    """Email accounts have no Telegram id. A negative id keeps the column unique."""
    return -secrets.randbelow(2_000_000_000) - 1
