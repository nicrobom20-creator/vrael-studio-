from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    bot_token: str = ""
    bot_username: str = "YappoLang_Bot"
    bot_mode: str = "webhook"
    webapp_url: str = "http://localhost:5173"
    public_base_url: str = "http://localhost:8000"
    admin_telegram_id: int = 0
    app_secret: str = "dev-only-change-me"
    database_url: str = "sqlite:///./yappo.db"
    demo_mode: bool = True

    free_lessons_per_day: int = 3
    free_chat_messages_per_day: int = 5

    llm_provider: str = "openai"
    llm_api_key: str = ""
    llm_base_url: str = "https://api.openai.com/v1"
    llm_model: str = "gpt-4o-mini"
    gemini_api_key: str = ""
    gemini_model: str = "gemini-2.0-flash"

    rollypay_api_key: str = ""
    rollypay_signing_secret: str = ""
    rollypay_test: bool = True
    rollypay_api_url: str = "https://rollypay.io"
    premium_month_rub: str = "199.00"
    premium_year_rub: str = "1999.00"
    premium_month_days: int = 30
    premium_year_days: int = 365

    referral_join_xp: int = 50
    referral_premium_days: int = 7

    reminder_poll_seconds: int = 30
    webhook_max_age_seconds: int = 300
    static_dir: str = ""


@lru_cache
def get_settings() -> Settings:
    return Settings()
