from app.config import get_settings
from app.db import get_engine, normalize_database_url, reset_engine


def test_render_postgres_urls_use_psycopg():
    assert normalize_database_url("postgresql://user:pass@host/db").startswith("postgresql+psycopg://")
    assert normalize_database_url("postgres://user:pass@host/db").startswith("postgresql+psycopg://")
    assert normalize_database_url("sqlite:///./yappo.db") == "sqlite:///./yappo.db"


def test_engine_dialect_matches_the_url(monkeypatch, tmp_path):
    monkeypatch.setenv("DATABASE_URL", f"sqlite:///{tmp_path}/yappo.db")
    get_settings.cache_clear()
    reset_engine()
    assert get_engine().dialect.name == "sqlite"

    monkeypatch.setenv("DATABASE_URL", "postgresql://user:pass@localhost:5432/yappo")
    get_settings.cache_clear()
    reset_engine()
    engine = get_engine()
    assert engine.dialect.driver == "psycopg"
    assert engine.dialect.name == "postgresql"
    get_settings.cache_clear()
    reset_engine()
