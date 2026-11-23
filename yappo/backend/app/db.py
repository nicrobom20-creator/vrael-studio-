from collections.abc import Iterator

from sqlalchemy import create_engine, inspect, text
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.config import get_settings

_engine = None
SessionLocal: sessionmaker[Session] | None = None


class Base(DeclarativeBase):
    pass


def normalize_database_url(url: str) -> str:
    """Render gives postgresql:// or postgres://. psycopg v3 needs the +psycopg driver."""
    if url.startswith("postgres://"):
        url = "postgresql://" + url[len("postgres://"):]
    if url.startswith("postgresql://"):
        url = "postgresql+psycopg://" + url[len("postgresql://"):]
    return url


def _make_engine():
    url = normalize_database_url(get_settings().database_url)
    kwargs: dict = {"future": True}
    if url.startswith("sqlite"):
        kwargs["connect_args"] = {"check_same_thread": False}
        if url.endswith(":memory:") or url == "sqlite://":
            kwargs["poolclass"] = StaticPool
    else:
        kwargs["pool_pre_ping"] = True
    return create_engine(url, **kwargs)


def reset_engine() -> None:
    global _engine, SessionLocal
    if _engine is not None:
        _engine.dispose()
    _engine = _make_engine()
    SessionLocal = sessionmaker(bind=_engine, autoflush=True, expire_on_commit=False)


def get_engine():
    if _engine is None:
        reset_engine()
    return _engine


def init_db() -> None:
    from app import models  # noqa: F401

    engine = get_engine()
    Base.metadata.create_all(engine)
    _migrate_users(engine)


def _migrate_users(engine) -> None:
    """create_all does not add columns to a table that already exists."""
    inspector = inspect(engine)
    if "users" not in inspector.get_table_names():
        return
    have = {column["name"] for column in inspector.get_columns("users")}
    with engine.begin() as conn:
        if "email" not in have:
            conn.execute(text("ALTER TABLE users ADD COLUMN email VARCHAR(255)"))
        if "public_id" not in have:
            conn.execute(text("ALTER TABLE users ADD COLUMN public_id VARCHAR(16)"))
        conn.execute(text("CREATE UNIQUE INDEX IF NOT EXISTS uq_users_email ON users (email)"))
        conn.execute(text("CREATE UNIQUE INDEX IF NOT EXISTS uq_users_public_id ON users (public_id)"))


def get_session() -> Iterator[Session]:
    if SessionLocal is None:
        reset_engine()
    assert SessionLocal is not None
    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()
