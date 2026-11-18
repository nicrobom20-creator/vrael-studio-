import hashlib
import hmac
import json
import time
from datetime import datetime, timedelta

from app.models import Payment, User
from app.payments import apply_payment_event
from app.security import secure_compare, signature_is_fresh, verify_rollypay_signature

NOW = datetime(2026, 3, 1, 12, 0, 0)
SECRET = "sign-secret"


def test_signature_is_hmac_of_timestamp_dot_raw_body():
    raw = b'{"event_type":"payment.paid","amount":"199.00"}'
    timestamp = "1710000000"
    good = hmac.new(SECRET.encode(), timestamp.encode() + b"." + raw, hashlib.sha256).hexdigest()
    assert verify_rollypay_signature(raw, timestamp, good, SECRET)
    assert verify_rollypay_signature(raw, timestamp, good.upper(), SECRET)
    assert not verify_rollypay_signature(raw + b" ", timestamp, good, SECRET)
    assert not verify_rollypay_signature(raw, "1710000001", good, SECRET)
    assert not verify_rollypay_signature(raw, timestamp, "ab", SECRET)
    assert not verify_rollypay_signature(raw, timestamp, good, "other-secret")
    assert not verify_rollypay_signature(raw, "", good, SECRET)
    assert not verify_rollypay_signature(raw, timestamp, "", SECRET)
    assert secure_compare("abc", "abcd") is False


def test_timestamp_window():
    assert signature_is_fresh(str(int(time.time())), max_age=300)
    assert not signature_is_fresh(str(int(time.time()) - 1000), max_age=300)
    assert not signature_is_fresh("nope", max_age=300)


def _user(session, telegram_id=10, **extra):
    user = User(
        telegram_id=telegram_id,
        referral_code=f"code{telegram_id}",
        first_name="Аня",
        language="en",
        mascot="parrot",
        onboarded=True,
        timezone="Europe/Moscow",
        daily_goal=15,
        **extra,
    )
    session.add(user)
    session.commit()
    session.refresh(user)
    return user


def _payment(session, user, order_id="order-1", amount="199.00", days=30, is_test=True):
    payment = Payment(
        user_id=user.id,
        order_id=order_id,
        plan="month",
        amount=amount,
        currency="RUB",
        status="pending",
        is_test=is_test,
        days=days,
    )
    session.add(payment)
    session.commit()
    return payment


def _event(order_id="order-1", amount="199.00", test=True, payment_id="pay_1", event_type="payment.paid"):
    return {
        "event_type": event_type,
        "payment_id": payment_id,
        "order_id": order_id,
        "status": event_type.split(".")[-1],
        "amount": amount,
        "currency": "RUB",
        "test": test,
    }


def test_paid_event_activates_and_extends_premium(session):
    user = _user(session)
    _payment(session, user)
    assert apply_payment_event(session, _event(), now=NOW) == "ok"
    session.commit()
    session.refresh(user)
    assert user.premium_until == NOW + timedelta(days=30)

    user.premium_until = NOW + timedelta(days=10)
    session.commit()
    _payment(session, user, order_id="order-2")
    assert apply_payment_event(session, _event(order_id="order-2", payment_id="pay_2"), now=NOW) == "ok"
    session.commit()
    session.refresh(user)
    assert user.premium_until == NOW + timedelta(days=40)


def test_duplicate_paid_event_does_not_extend_again(session):
    user = _user(session)
    _payment(session, user)
    assert apply_payment_event(session, _event(), now=NOW) == "ok"
    session.commit()
    assert apply_payment_event(session, _event(), now=NOW) == "duplicate"
    session.commit()
    session.refresh(user)
    assert user.premium_until == NOW + timedelta(days=30)


def test_amount_currency_and_test_mismatches_do_not_activate(session):
    user = _user(session)
    _payment(session, user)
    assert apply_payment_event(session, _event(amount="199.01"), now=NOW) == "amount_mismatch"
    assert apply_payment_event(session, {**_event(), "currency": "USD"}, now=NOW) == "currency_mismatch"
    assert apply_payment_event(session, _event(test=False), now=NOW) == "test_mismatch"
    session.commit()
    session.refresh(user)
    assert user.premium_until is None


def test_canceled_does_not_grant_premium(session):
    user = _user(session)
    payment = _payment(session, user)
    status = apply_payment_event(session, _event(event_type="payment.canceled"), now=NOW)
    session.commit()
    session.refresh(user)
    session.refresh(payment)
    assert status == "ok"
    assert user.premium_until is None
    assert payment.status == "canceled"


def _signed(payload: dict, secret=SECRET, timestamp=None):
    raw = json.dumps(payload, separators=(",", ":"), ensure_ascii=False).encode()
    timestamp = timestamp or str(int(time.time()))
    signature = hmac.new(secret.encode(), timestamp.encode() + b"." + raw, hashlib.sha256).hexdigest()
    return raw, timestamp, signature


def test_webhook_rejects_bad_signature_and_activates_on_valid_one(client):
    from app.db import SessionLocal

    db = SessionLocal()
    user = _user(db, telegram_id=77)
    _payment(db, user, order_id="order-http")
    payload = _event(order_id="order-http", payment_id="pay_http")
    raw, timestamp, signature = _signed(payload)

    bad = client.post(
        "/webhooks/rollypay",
        content=raw,
        headers={"X-Timestamp": timestamp, "X-Signature": "deadbeef", "Content-Type": "application/json"},
    )
    assert bad.status_code == 403
    db.refresh(user)
    assert user.premium_until is None

    tampered = raw.replace(b"199.00", b"199.01")
    forged = hmac.new(SECRET.encode(), timestamp.encode() + b"." + raw, hashlib.sha256).hexdigest()
    forged_response = client.post(
        "/webhooks/rollypay",
        content=tampered,
        headers={"X-Timestamp": timestamp, "X-Signature": forged, "Content-Type": "application/json"},
    )
    assert forged_response.status_code == 403

    ok = client.post(
        "/webhooks/rollypay",
        content=raw,
        headers={"X-Timestamp": timestamp, "X-Signature": signature, "Content-Type": "application/json"},
    )
    assert ok.status_code == 200
    db.refresh(user)
    assert user.premium_until is not None
    again = client.post(
        "/webhooks/rollypay",
        content=raw,
        headers={"X-Timestamp": timestamp, "X-Signature": signature, "Content-Type": "application/json"},
    )
    assert again.status_code == 200
    assert again.json()["status"] == "duplicate"
    db.close()
