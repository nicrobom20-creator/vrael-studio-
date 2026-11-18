import uuid
from datetime import datetime, timedelta
from decimal import Decimal, InvalidOperation

import httpx
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.clock import naive_utc
from app.config import Settings
from app.gamification import extend_premium
from app.models import Payment, PaymentEvent, User
from app.referrals import grant_paid_referral


def money(value: str | int | float | Decimal) -> Decimal:
    try:
        return Decimal(str(value)).quantize(Decimal("0.01"))
    except (InvalidOperation, ValueError):
        raise ValueError("bad amount") from None


def new_order_id(user_id: int, plan: str) -> str:
    return f"yp_{user_id}_{plan}_{uuid.uuid4().hex[:12]}"


def plan_terms(settings: Settings, plan: str) -> tuple[str, int]:
    if plan == "year":
        return settings.premium_year_rub, settings.premium_year_days
    if plan == "month":
        return settings.premium_month_rub, settings.premium_month_days
    raise ValueError("unknown plan")


def create_local_payment(session: Session, user: User, plan: str, settings: Settings) -> Payment:
    amount, days = plan_terms(settings, plan)
    amount_s = str(money(amount))
    payment = Payment(
        user_id=user.id,
        order_id=new_order_id(user.id, plan),
        plan=plan,
        amount=amount_s,
        currency="RUB",
        status="pending",
        is_test=bool(settings.rollypay_test),
        days=days,
    )
    session.add(payment)
    session.flush()
    return payment


async def create_rollypay_payment(payment: Payment, user: User, settings: Settings) -> dict:
    description = "Yappo Premium · год" if payment.plan == "year" else "Yappo Premium · месяц"
    payload = {
        "amount": payment.amount,
        "payment_currency": "RUB",
        "order_id": payment.order_id,
        "description": description,
        "customer_id": str(user.telegram_id or user.id),
        "callback_url": settings.public_base_url.rstrip("/") + "/webhooks/rollypay",
        "success_redirect_url": settings.webapp_url.rstrip("/") + "/premium?paid=1",
        "fail_redirect_url": settings.webapp_url.rstrip("/") + "/premium?paid=0",
        "metadata": {"user_id": user.id, "plan": payment.plan},
    }
    if settings.rollypay_test:
        payload["test"] = True
    headers = {
        "Content-Type": "application/json",
        "X-API-Key": settings.rollypay_api_key,
        "X-Nonce": str(uuid.uuid4()),
    }
    url = settings.rollypay_api_url.rstrip("/") + "/api/v1/payments"
    async with httpx.AsyncClient(timeout=15) as client:
        response = await client.post(url, json=payload, headers=headers)
    data = response.json() if response.content else {}
    if response.status_code >= 400:
        detail = data.get("error") or data.get("message") or response.text or "payment failed"
        raise RuntimeError(str(detail))
    return data


def _event_type(event: dict) -> str:
    return str(event.get("event_type") or event.get("event") or "")


def apply_payment_event(session: Session, event: dict, *, now: datetime | None = None) -> str:
    """Apply a verified RollyPay webhook. Premium changes only on payment.paid.

    Returns a short status: ok, duplicate, unknown_order, amount_mismatch,
    currency_mismatch, test_mismatch, ignored.
    """
    now = naive_utc(now)
    event_type = _event_type(event)
    order_id = str(event.get("order_id") or "")
    payment = session.scalar(select(Payment).where(Payment.order_id == order_id))
    if payment is None:
        return "unknown_order"

    try:
        incoming = money(event.get("amount"))
        expected = money(payment.amount)
    except ValueError:
        return "amount_mismatch"
    if incoming != expected:
        return "amount_mismatch"

    currency = str(event.get("currency") or event.get("payment_currency") or "RUB").upper()
    if currency != payment.currency.upper():
        return "currency_mismatch"

    incoming_test = bool(event.get("test"))
    if incoming_test != bool(payment.is_test):
        return "test_mismatch"

    provider_id = str(event.get("payment_id") or "")
    dedupe = f"{provider_id or order_id}:{event_type}"
    existing = session.scalar(select(PaymentEvent).where(PaymentEvent.dedupe_key == dedupe))
    if existing is not None:
        return "duplicate"

    if event_type == "payment.paid" and session.get(User, payment.user_id) is None:
        return "unknown_order"

    session.add(PaymentEvent(dedupe_key=dedupe, order_id=order_id, event_type=event_type))
    if provider_id:
        payment.payment_id = provider_id

    if event_type == "payment.paid":
        if payment.status != "paid":
            user = session.get(User, payment.user_id)
            if user is None:
                return "unknown_order"
            user.premium_until = extend_premium(user.premium_until, payment.days, now)
            payment.status = "paid"
            payment.premium_applied = True
            payment.paid_at = now
            grant_paid_referral(session, user, now)
        return "ok"

    if event_type in {"payment.canceled", "payment.expired"} and payment.status == "pending":
        payment.status = "canceled" if event_type.endswith("canceled") else "expired"
        return "ok"

    if event_type in {"payment.refunded", "payment.chargeback"} and payment.status == "paid":
        user = session.get(User, payment.user_id)
        if user and user.premium_until and payment.premium_applied:
            revised = user.premium_until - timedelta(days=payment.days)
            user.premium_until = revised if revised > now else now
        payment.status = "refunded" if event_type.endswith("refunded") else "chargeback"
        payment.premium_applied = False
        return "ok"

    return "ignored"
