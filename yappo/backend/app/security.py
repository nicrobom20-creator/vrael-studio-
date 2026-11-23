import hashlib
import hmac
import json
import time
from urllib.parse import parse_qsl

import bcrypt


def secure_compare(left: str, right: str) -> bool:
    """Constant-time compare. Different lengths never match."""
    left_b = left.encode()
    right_b = right.encode()
    if len(left_b) != len(right_b):
        hmac.compare_digest(left_b, left_b)
        return False
    return hmac.compare_digest(left_b, right_b)


def verify_rollypay_signature(raw_body: bytes, timestamp: str, signature: str, secret: str) -> bool:
    """HMAC-SHA256 over `timestamp.rawBody`, hex digest, constant-time compare.

    Matches RollyPay: X-Signature is HMAC-SHA256(signing_secret, X-Timestamp + '.' + raw body).
    """
    if not secret or timestamp is None or signature is None or raw_body is None:
        return False
    timestamp = str(timestamp).strip()
    signature = str(signature).strip().lower()
    if not timestamp or not signature:
        return False
    mac = hmac.new(secret.encode(), timestamp.encode() + b"." + raw_body, hashlib.sha256)
    expected = mac.hexdigest()
    return secure_compare(expected, signature)


def signature_is_fresh(timestamp: str, *, now: float | None = None, max_age: int = 300) -> bool:
    try:
        ts = int(str(timestamp).strip())
    except (TypeError, ValueError):
        return False
    current = time.time() if now is None else now
    return abs(current - ts) <= max_age


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt(rounds=12)).decode()


def verify_password(password: str, stored: str) -> bool:
    if not password or not stored:
        return False
    try:
        return bcrypt.checkpw(password.encode(), stored.encode())
    except ValueError:
        return False


def sign_session(user_id: int, secret: str, ttl_seconds: int = 30 * 24 * 3600) -> str:
    exp = int(time.time()) + ttl_seconds
    payload = f"{user_id}.{exp}"
    sig = hmac.new(secret.encode(), payload.encode(), hashlib.sha256).hexdigest()
    return f"{payload}.{sig}"


def read_session(token: str, secret: str) -> int | None:
    if not token or token.count(".") != 2:
        return None
    user_s, exp_s, sig = token.split(".")
    payload = f"{user_s}.{exp_s}"
    expected = hmac.new(secret.encode(), payload.encode(), hashlib.sha256).hexdigest()
    if not secure_compare(expected, sig.lower()):
        return None
    try:
        exp = int(exp_s)
        user_id = int(user_s)
    except ValueError:
        return None
    if exp < int(time.time()):
        return None
    return user_id


def verify_telegram_init_data(init_data: str, bot_token: str, *, max_age: int = 86400) -> dict | None:
    """Validate Telegram WebApp initData. Returns parsed fields or None."""
    if not init_data or not bot_token:
        return None
    pairs = parse_qsl(init_data, keep_blank_values=True, strict_parsing=False)
    data = {k: v for k, v in pairs}
    received = data.pop("hash", "")
    if not received:
        return None
    check_string = "\n".join(f"{k}={data[k]}" for k in sorted(data))
    secret = hmac.new(b"WebAppData", bot_token.encode(), hashlib.sha256).digest()
    expected = hmac.new(secret, check_string.encode(), hashlib.sha256).hexdigest()
    if not secure_compare(expected, received.lower()):
        return None
    try:
        auth_date = int(data.get("auth_date", "0"))
    except ValueError:
        return None
    if max_age and abs(int(time.time()) - auth_date) > max_age:
        return None
    user = {}
    if data.get("user"):
        try:
            user = json.loads(data["user"])
        except json.JSONDecodeError:
            return None
    return {
        "user": user,
        "start_param": data.get("start_param") or "",
        "auth_date": auth_date,
    }
