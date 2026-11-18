import os

os.environ["YAPPO_TESTING"] = "1"
os.environ["APP_SECRET"] = "test-secret"
os.environ["DEMO_MODE"] = "true"
os.environ["ROLLYPAY_SIGNING_SECRET"] = "sign-secret"
os.environ["ROLLYPAY_API_KEY"] = ""
os.environ["ROLLYPAY_TEST"] = "true"
os.environ["BOT_TOKEN"] = ""
os.environ["DATABASE_URL"] = "sqlite:///:memory:"
os.environ["FREE_LESSONS_PER_DAY"] = "3"
os.environ["FREE_CHAT_MESSAGES_PER_DAY"] = "5"
os.environ["REFERRAL_JOIN_XP"] = "50"
os.environ["REFERRAL_PREMIUM_DAYS"] = "7"
os.environ["PREMIUM_MONTH_RUB"] = "199.00"
os.environ["PREMIUM_YEAR_RUB"] = "1999.00"
os.environ["ADMIN_TELEGRAM_ID"] = "42"
os.environ["LLM_API_KEY"] = ""
os.environ["BOT_USERNAME"] = "YappoLang_Bot"

import pytest
from fastapi.testclient import TestClient

from app.config import get_settings


@pytest.fixture()
def session(tmp_path, monkeypatch):
    monkeypatch.setenv("DATABASE_URL", f"sqlite:///{tmp_path}/yappo.db")
    get_settings.cache_clear()
    from app import db as database

    database.reset_engine()
    database.init_db()
    db = database.SessionLocal()
    try:
        yield db
    finally:
        db.close()


@pytest.fixture()
def client(tmp_path, monkeypatch):
    monkeypatch.setenv("DATABASE_URL", f"sqlite:///{tmp_path}/yappo.db")
    get_settings.cache_clear()
    from app import db as database
    from app.main import create_app

    database.reset_engine()
    app = create_app()
    with TestClient(app) as test_client:
        yield test_client
