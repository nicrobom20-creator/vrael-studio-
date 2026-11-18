"""FastAPI app: Mini App API, Telegram webhook, RollyPay webhook."""

import asyncio
import json
import logging
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import Depends, FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.config import get_settings
from app.db import SessionLocal, get_session, init_db
from app.models import User
from app.payments import apply_payment_event
from app.security import read_session, signature_is_fresh, sign_session, verify_rollypay_signature, verify_telegram_init_data
from app.services import (
    ServiceError,
    complete_lesson,
    complete_story,
    demo_telegram_id,
    get_or_create_user,
    leaderboard,
    lesson_payload,
    path_payload,
    public_payload,
    quests_payload,
    referrals_payload,
    scenes_for,
    send_chat,
    serialize_user,
    start_checkout,
    story_payload,
    _apply_profile,
)

logger = logging.getLogger("yappo")


class TelegramAuthIn(BaseModel):
    init_data: str


class DemoAuthIn(BaseModel):
    device_id: str
    start_param: str = ""


class ProfileIn(BaseModel):
    language: str | None = None
    mascot: str | None = None
    daily_goal: int | None = None
    reminder_time: str | None = None
    timezone: str | None = None


class CompleteIn(BaseModel):
    mistakes: int = 0


class ChatIn(BaseModel):
    scene: str
    text: str = ""
    history: list[dict] = Field(default_factory=list)
    hint_only: bool = False


class CheckoutIn(BaseModel):
    plan: str


def _raise(error: ServiceError) -> None:
    raise HTTPException(status_code=error.status, detail=error.detail)


def current_user(
    request: Request,
    session: Session = Depends(get_session),
) -> User:
    header = request.headers.get("authorization", "")
    token = header[7:].strip() if header.lower().startswith("bearer ") else ""
    user_id = read_session(token, get_settings().app_secret)
    if user_id is None:
        raise HTTPException(status_code=401, detail="Нужно войти")
    user = session.get(User, user_id)
    if user is None:
        raise HTTPException(status_code=401, detail="Нужно войти")
    return user


def _token(user: User) -> str:
    return sign_session(user.id, get_settings().app_secret)


async def _configure_bot() -> None:
    """Menu button opens the Mini App. Webhook mode registers /webhooks/telegram."""
    settings = get_settings()
    if not settings.bot_token:
        return
    try:
        from app.bot import get_bot

        bot = get_bot()
        url = settings.webapp_url.strip().rstrip("/")
        if url.startswith("https://"):
            from aiogram.types import MenuButtonWebApp, WebAppInfo

            await bot.set_chat_menu_button(menu_button=MenuButtonWebApp(text="Yappo", web_app=WebAppInfo(url=url)))
        public = settings.public_base_url.strip().rstrip("/")
        if settings.bot_mode == "webhook" and public.startswith("https://"):
            await bot.set_webhook(f"{public}/webhooks/telegram")
            logger.info("telegram webhook set")
    except Exception:
        logger.exception("bot setup")


async def _reminder_loop(stop: asyncio.Event) -> None:
    from app.bot import dispatch_reminders, get_bot

    settings = get_settings()
    while not stop.is_set():
        if SessionLocal is not None and settings.bot_token:
            session = SessionLocal()
            try:
                await dispatch_reminders(get_bot(), session)
            except Exception:
                logger.exception("reminder loop")
            finally:
                session.close()
        try:
            await asyncio.wait_for(stop.wait(), timeout=settings.reminder_poll_seconds)
        except asyncio.TimeoutError:
            continue


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    stop = asyncio.Event()
    task = None
    settings = get_settings()
    if settings.bot_token and not __import__("os").environ.get("YAPPO_TESTING"):
        task = asyncio.create_task(_reminder_loop(stop))
        asyncio.create_task(_configure_bot())
    yield
    stop.set()
    if task:
        task.cancel()


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(title="Yappo", lifespan=lifespan)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @app.get("/health")
    def health():
        return {"ok": True, "service": "yappo"}

    @app.get("/api/public")
    def public():
        return public_payload()

    @app.post("/api/auth/telegram")
    def auth_telegram(body: TelegramAuthIn, session: Session = Depends(get_session)):
        parsed = verify_telegram_init_data(body.init_data, settings.bot_token)
        if not parsed or not parsed["user"].get("id"):
            raise HTTPException(status_code=401, detail="Не удалось проверить Telegram")
        tg = parsed["user"]
        try:
            user, joined = get_or_create_user(
                session,
                int(tg["id"]),
                tg.get("username") or "",
                tg.get("first_name") or "",
                parsed.get("start_param") or "",
            )
            session.commit()
        except ServiceError as error:
            _raise(error)
        return {"token": _token(user), "referral_joined": joined, "user": serialize_user(session, user)}

    @app.post("/api/auth/demo")
    def auth_demo(body: DemoAuthIn, session: Session = Depends(get_session)):
        if not settings.demo_mode:
            raise HTTPException(status_code=404, detail="Демо-вход выключен")
        try:
            telegram_id = demo_telegram_id(body.device_id)
            user, joined = get_or_create_user(session, telegram_id, "", "Ученик", body.start_param)
            session.commit()
        except ServiceError as error:
            _raise(error)
        return {"token": _token(user), "referral_joined": joined, "user": serialize_user(session, user)}

    @app.get("/api/me")
    def me(user: User = Depends(current_user), session: Session = Depends(get_session)):
        return serialize_user(session, user)

    @app.post("/api/onboarding")
    def onboarding(body: ProfileIn, user: User = Depends(current_user), session: Session = Depends(get_session)):
        try:
            _apply_profile(user, body.model_dump(), require=True)
            session.commit()
        except ServiceError as error:
            _raise(error)
        return serialize_user(session, user)

    @app.patch("/api/settings")
    def settings_patch(body: ProfileIn, user: User = Depends(current_user), session: Session = Depends(get_session)):
        try:
            _apply_profile(user, body.model_dump(exclude_unset=True), require=False)
            session.commit()
        except ServiceError as error:
            _raise(error)
        return serialize_user(session, user)

    @app.get("/api/path")
    def path(user: User = Depends(current_user), session: Session = Depends(get_session)):
        try:
            return path_payload(session, user)
        except ServiceError as error:
            _raise(error)

    @app.get("/api/lessons/{lesson_id}")
    def lesson(lesson_id: str, user: User = Depends(current_user), session: Session = Depends(get_session)):
        try:
            return lesson_payload(session, user, lesson_id)
        except ServiceError as error:
            _raise(error)

    @app.post("/api/lessons/{lesson_id}/complete")
    def lesson_complete(
        lesson_id: str,
        body: CompleteIn,
        user: User = Depends(current_user),
        session: Session = Depends(get_session),
    ):
        try:
            return complete_lesson(session, user, lesson_id, body.mistakes)
        except ServiceError as error:
            _raise(error)

    @app.get("/api/stories/{story_id}")
    def story(story_id: str, user: User = Depends(current_user), session: Session = Depends(get_session)):
        try:
            return story_payload(session, user, story_id)
        except ServiceError as error:
            _raise(error)

    @app.post("/api/stories/{story_id}/complete")
    def story_complete(story_id: str, user: User = Depends(current_user), session: Session = Depends(get_session)):
        try:
            return complete_story(session, user, story_id)
        except ServiceError as error:
            _raise(error)

    @app.get("/api/quests")
    def quests(user: User = Depends(current_user), session: Session = Depends(get_session)):
        try:
            return quests_payload(session, user)
        except ServiceError as error:
            _raise(error)

    @app.get("/api/scenes")
    def scenes(user: User = Depends(current_user)):
        if not user.language:
            raise HTTPException(status_code=400, detail="Сначала выбери язык")
        return {"scenes": scenes_for(user.language)}

    @app.post("/api/chat")
    async def chat(body: ChatIn, user: User = Depends(current_user), session: Session = Depends(get_session)):
        try:
            return await send_chat(
                session,
                user,
                scene=body.scene,
                text=body.text,
                history=body.history,
                hint_only=body.hint_only,
            )
        except ServiceError as error:
            _raise(error)

    @app.get("/api/leaderboard")
    def board(scope: str = "friends", user: User = Depends(current_user), session: Session = Depends(get_session)):
        return leaderboard(session, user, scope)

    @app.get("/api/referrals")
    def referrals(user: User = Depends(current_user), session: Session = Depends(get_session)):
        return referrals_payload(session, user)

    @app.post("/api/billing/checkout")
    async def checkout(body: CheckoutIn, user: User = Depends(current_user), session: Session = Depends(get_session)):
        try:
            return await start_checkout(session, user, body.plan)
        except ServiceError as error:
            _raise(error)

    @app.post("/webhooks/rollypay")
    async def rollypay_webhook(request: Request, session: Session = Depends(get_session)):
        raw = await request.body()
        timestamp = request.headers.get("x-timestamp", "")
        signature = request.headers.get("x-signature", "")
        secret = settings.rollypay_signing_secret
        if not secret or not verify_rollypay_signature(raw, timestamp, signature, secret):
            raise HTTPException(status_code=403, detail="Invalid signature")
        if not signature_is_fresh(timestamp, max_age=settings.webhook_max_age_seconds):
            raise HTTPException(status_code=403, detail="Stale timestamp")
        try:
            event = json.loads(raw)
        except json.JSONDecodeError as exc:
            raise HTTPException(status_code=400, detail="Bad JSON") from exc
        if not isinstance(event, dict):
            raise HTTPException(status_code=400, detail="Bad JSON")
        status = apply_payment_event(session, event)
        if status in {"ok", "duplicate", "ignored"}:
            session.commit()
            return {"ok": True, "status": status}
        session.rollback()
        if status == "unknown_order":
            raise HTTPException(status_code=404, detail=status)
        raise HTTPException(status_code=400, detail=status)

    @app.post("/webhooks/telegram")
    async def telegram_webhook(request: Request):
        if not settings.bot_token:
            raise HTTPException(status_code=503, detail="BOT_TOKEN не задан")
        from aiogram.types import Update

        from app.bot import get_bot, get_dispatcher

        data = await request.json()
        bot = get_bot()
        update = Update.model_validate(data, context={"bot": bot})
        await get_dispatcher().feed_update(bot, update)
        return {"ok": True}

    static_dir = settings.static_dir
    if static_dir and Path(static_dir).is_dir():
        root = Path(static_dir).resolve()

        asset_suffixes = {".riv", ".webp", ".png", ".jpg", ".jpeg", ".js", ".css", ".svg", ".map", ".json", ".woff", ".woff2"}

        @app.api_route("/{full_path:path}", methods=["GET", "HEAD"])
        def spa(full_path: str):
            candidate = (root / full_path).resolve()
            if candidate.is_file() and (candidate == root or root in candidate.parents):
                return FileResponse(candidate)
            if Path(full_path).suffix.lower() in asset_suffixes:
                raise HTTPException(status_code=404, detail="Not found")
            index = root / "index.html"
            if index.is_file():
                return FileResponse(index)
            raise HTTPException(status_code=404, detail="Not found")

    return app


app = create_app()
