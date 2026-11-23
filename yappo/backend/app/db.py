from collections.abc import Iterator

from sqlalchemy import create_engine
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

    Base.metadata.create_all(get_engine())


def get_session() -> Iterator[Session]:
    if SessionLocal is None:
        reset_engine()
    assert SessionLocal is not None
    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()
