from datetime import datetime, timedelta

from app.models import Payment
from app.payments import apply_payment_event
from app.services import get_or_create_user

NOW = datetime(2026, 4, 2, 9, 0, 0)


def test_join_gives_both_xp_once_and_ignores_self(session):
    referrer, joined = get_or_create_user(session, 100, "anya", "Аня", "")
    session.commit()
    assert not joined
    assert referrer.xp == 0

    friend, joined = get_or_create_user(session, 101, "borya", "Боря", f"ref_{referrer.referral_code}")
    session.commit()
    assert joined
    session.refresh(referrer)
    session.refresh(friend)
    assert referrer.xp == 50
    assert friend.xp == 50
    assert friend.referred_by_id == referrer.id

    again, joined_again = get_or_create_user(session, 101, "borya", "Боря", f"ref_{referrer.referral_code}")
    session.commit()
    assert not joined_again
    session.refresh(referrer)
    assert referrer.xp == 50
    assert again.id == friend.id

    selfish, selfish_joined = get_or_create_user(session, 100, "anya", "Аня", f"ref_{referrer.referral_code}")
    session.commit()
    assert not selfish_joined
    session.refresh(selfish)
    assert selfish.xp == 50


def test_paid_friend_gives_referrer_premium_days_once(session):
    referrer, _ = get_or_create_user(session, 200, "anya", "Аня", "")
    session.commit()
    friend, _ = get_or_create_user(session, 201, "borya", "Боря", f"ref_{referrer.referral_code}")
    session.commit()

    first = Payment(
        user_id=friend.id, order_id="ref-pay-1", plan="month", amount="199.00",
        currency="RUB", status="pending", is_test=True, days=30,
    )
    session.add(first)
    session.commit()
    event = {
        "event_type": "payment.paid",
        "payment_id": "pay_ref_1",
        "order_id": "ref-pay-1",
        "status": "paid",
        "amount": "199.00",
        "currency": "RUB",
        "test": True,
    }
    assert apply_payment_event(session, event, now=NOW) == "ok"
    session.commit()
    session.refresh(referrer)
    session.refresh(friend)
    assert friend.premium_until == NOW + timedelta(days=30)
    assert referrer.premium_until == NOW + timedelta(days=7)

    second = Payment(
        user_id=friend.id, order_id="ref-pay-2", plan="month", amount="199.00",
        currency="RUB", status="pending", is_test=True, days=30,
    )
    session.add(second)
    session.commit()
    event["payment_id"] = "pay_ref_2"
    event["order_id"] = "ref-pay-2"
    assert apply_payment_event(session, event, now=NOW) == "ok"
    session.commit()
    session.refresh(referrer)
    session.refresh(friend)
    assert referrer.premium_until == NOW + timedelta(days=7)
    assert friend.premium_until == NOW + timedelta(days=60)
