from collections.abc import Iterator

from sqlalchemy import create_engine, inspect, select, text
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
    _backfill_public_ids()


def _migrate_users(engine) -> None:
    """create_all does not add columns to a table that already exists."""
    inspector = inspect(engine)
    if "users" not in inspector.get_table_names():
        return
    have = {column["name"] for column in inspector.get_columns("users")}
    dialect = engine.dialect.name
    trial = "BOOLEAN NOT NULL DEFAULT FALSE" if dialect == "postgresql" else "INTEGER NOT NULL DEFAULT 0"
    kids = trial
    columns = {
        "email": "VARCHAR(255)",
        "password_hash": "VARCHAR(255) DEFAULT ''",
        "public_id": "VARCHAR(16)",
        "languages": "VARCHAR(64) DEFAULT ''",
        "english_level": "VARCHAR(32) DEFAULT ''",
        "study_goal": "VARCHAR(32) DEFAULT ''",
        "placement_level": "VARCHAR(32) DEFAULT ''",
        "trial_used": trial,
        "coins": "INTEGER NOT NULL DEFAULT 0",
        "equipped": "VARCHAR(32) DEFAULT ''",
        "last_chest_date": "DATE",
        "kids_mode": kids,
    }
    with engine.begin() as conn:
        for name, ddl in columns.items():
            if name not in have:
                conn.execute(text(f"ALTER TABLE users ADD COLUMN {name} {ddl}"))
        conn.execute(text("CREATE UNIQUE INDEX IF NOT EXISTS uq_users_email ON users (email)"))
        conn.execute(text("CREATE UNIQUE INDEX IF NOT EXISTS uq_users_public_id ON users (public_id)"))


def _backfill_public_ids() -> None:
    from app.ids import new_public_id
    from app.models import User

    if SessionLocal is None:
        return
    session = SessionLocal()
    try:
        missing = session.scalars(select(User).where(User.public_id.is_(None))).all()
        for user in missing:
            for _ in range(8):
                code = new_public_id()
                taken = session.scalar(select(User.id).where(User.public_id == code))
                if taken is None:
                    user.public_id = code
                    break
        session.commit()
    finally:
        session.close()


def get_session() -> Iterator[Session]:
    if SessionLocal is None:
        reset_engine()
    assert SessionLocal is not None
    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()
