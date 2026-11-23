"""FastAPI app: Mini App API, Telegram webhook, RollyPay webhook."""

import asyncio
import json
import logging
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import Depends, FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, RedirectResponse
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.admin_service import (
    Access,
    add_admin,
    delete_user,
    grant_premium,
    list_admins,
    list_payments,
    list_subscriptions,
    remove_admin,
    resolve_admin,
    search_users,
    set_can_invite,
    stats as admin_stats,
    user_card,
)
from app.config import get_settings
from app.db import SessionLocal, get_session, init_db
from app.models import User
from app.payments import apply_payment_event
from app.practice import grade_placement, placement_questions
from app.security import read_session, signature_is_fresh, sign_session, verify_rollypay_signature, verify_telegram_init_data
from app.wardrobe import buy_boost, buy_item, equip_item, shop_payload
from app.certificate import certificate_payload
from app.chest import chest_status, open_chest
from app.duels import create_duel, join_duel, questions as duel_questions, shadow_duel, submit_duel
from app.league import league_payload
from app.words import due_words, grade_word, save_word
from app.services import (
    ServiceError,
    complete_lesson,
    complete_story,
    demo_telegram_id,
    get_or_create_user,
    leaderboard,
    lesson_payload,
    link_account,
    login_account,
    path_payload,
    public_payload,
    quests_payload,
    referrals_payload,
    register_account,
    scenes_for,
    send_chat,
    serialize_user,
    start_checkout,
    start_trial,
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
    english_level: str | None = None
    study_goal: str | None = None
    languages: list[str] | None = None
    placement_level: str | None = None
    kids_mode: bool | None = None


class AccountIn(BaseModel):
    email: str
    password: str
    name: str = ""


class LoginIn(BaseModel):
    email: str
    password: str


class PlacementIn(BaseModel):
    answers: dict[str, str] = Field(default_factory=dict)


class ShopIn(BaseModel):
    item_id: str = ""


class WordIn(BaseModel):
    front: str
    back: str


class WordGradeIn(BaseModel):
    ok: bool = True


class DuelAnswers(BaseModel):
    answers: dict[str, str] = Field(default_factory=dict)


class DuelJoin(BaseModel):
    code: str


class CompleteIn(BaseModel):
    mistakes: int = 0


class ChatIn(BaseModel):
    scene: str
    text: str = ""
    history: list[dict] = Field(default_factory=list)
    hint_only: bool = False


class CheckoutIn(BaseModel):
    plan: str


class PremiumGrantIn(BaseModel):
    days: int


class AdminIn(BaseModel):
    telegram_id: int
    username: str = ""
    can_invite: bool = False


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


def staff_user(
    user: User = Depends(current_user),
    session: Session = Depends(get_session),
) -> Access:
    access = resolve_admin(session, user.telegram_id or 0)
    if access is None:
        raise HTTPException(status_code=403, detail="Нет доступа")
    return access


async def _configure_bot() -> None:
    """Menu button opens the Mini App. Webhook mode registers /webhooks/telegram."""
    settings = get_settings()
    if not settings.bot_token:
        return
    try:
        from app.bot import get_bot

        bot = get_bot()
        from app.bot import menu_button

        url = settings.webapp_url.strip().rstrip("/")
        button = menu_button(url)
        if button is not None:
            await bot.set_chat_menu_button(menu_button=button)
        from app.bot import BOT_DESCRIPTION, PUBLIC_COMMANDS

        await bot.set_my_commands(PUBLIC_COMMANDS)
        await bot.set_my_description(description=BOT_DESCRIPTION)
        await bot.set_my_short_description(short_description="Язык в Telegram. Поддержка: @vraelstudio")
        public = settings.public_base_url.strip().rstrip("/")
        if settings.bot_mode == "webhook" and public.startswith("https://"):
            await bot.set_webhook(f"{public}/webhooks/telegram")
            logger.info("telegram webhook set")
    except Exception:
        logger.exception("bot setup")


_admin_poll: asyncio.Task | None = None


async def _configure_admin_bot() -> None:
    """Private admin bot. Webhook when the public URL is https, otherwise polling."""
    global _admin_poll
    settings = get_settings()
    if not settings.admin_bot_token or __import__("os").environ.get("YAPPO_TESTING"):
        return
    try:
        from app.admin_bot import ADMIN_COMMANDS, get_admin_bot, get_admin_dispatcher

        bot = get_admin_bot()
        await bot.set_my_commands(ADMIN_COMMANDS)
        public = settings.public_base_url.strip().rstrip("/")
        if settings.bot_mode == "webhook" and public.startswith("https://"):
            await bot.set_webhook(f"{public}/admin-bot/webhook")
            logger.info("admin webhook set")
            return
        await bot.delete_webhook(drop_pending_updates=False)

        async def _poll() -> None:
            try:
                await get_admin_dispatcher().start_polling(bot, handle_signals=False)
            except Exception:
                logger.exception("admin polling")

        _admin_poll = asyncio.create_task(_poll())
    except Exception:
        logger.exception("admin bot setup")


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
    testing = __import__("os").environ.get("YAPPO_TESTING")
    if settings.bot_token and not testing:
        task = asyncio.create_task(_reminder_loop(stop))
        asyncio.create_task(_configure_bot())
    if not testing:
        asyncio.create_task(_configure_admin_bot())
    yield
    stop.set()
    if task:
        task.cancel()
    if _admin_poll:
        _admin_poll.cancel()


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

    @app.api_route("/support", methods=["GET", "HEAD"], include_in_schema=False)
    def support_redirect():
        return RedirectResponse("https://t.me/vraelstudio", status_code=307)

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

    @app.post("/api/auth/register")
    def auth_register(body: AccountIn, session: Session = Depends(get_session)):
        try:
            user = register_account(session, body.email, body.password, body.name)
            session.commit()
        except ServiceError as error:
            _raise(error)
        return {"token": _token(user), "user": serialize_user(session, user)}

    @app.post("/api/auth/login")
    def auth_login(body: LoginIn, session: Session = Depends(get_session)):
        try:
            user = login_account(session, body.email, body.password)
            session.commit()
        except ServiceError as error:
            _raise(error)
        return {"token": _token(user), "user": serialize_user(session, user)}

    @app.post("/api/auth/link")
    def auth_link(body: AccountIn, user: User = Depends(current_user), session: Session = Depends(get_session)):
        try:
            link_account(session, user, body.email, body.password)
            session.commit()
        except ServiceError as error:
            _raise(error)
        return serialize_user(session, user)

    @app.get("/api/placement")
    def placement_get():
        return {"questions": placement_questions()}

    @app.post("/api/placement")
    def placement_post(body: PlacementIn, user: User = Depends(current_user), session: Session = Depends(get_session)):
        result = grade_placement(body.answers)
        user.placement_level = result["level"]
        session.commit()
        return result

    @app.post("/api/trial")
    def trial(user: User = Depends(current_user), session: Session = Depends(get_session)):
        try:
            start_trial(session, user)
            session.commit()
        except ServiceError as error:
            _raise(error)
        return serialize_user(session, user)

    @app.get("/api/certificate")
    def certificate(user: User = Depends(current_user), session: Session = Depends(get_session)):
        return certificate_payload(session, user)

    @app.get("/api/chest")
    def chest_get(user: User = Depends(current_user)):
        return chest_status(user)

    @app.post("/api/chest")
    def chest_open(user: User = Depends(current_user), session: Session = Depends(get_session)):
        try:
            result = open_chest(session, user)
            session.commit()
        except ServiceError as error:
            _raise(error)
        result["user"] = serialize_user(session, user)
        return result

    @app.get("/api/duels/questions")
    def duel_rounds(user: User = Depends(current_user)):
        return {"questions": duel_questions()}

    @app.post("/api/duels")
    def duel_open(user: User = Depends(current_user), session: Session = Depends(get_session)):
        row = create_duel(session, user)
        session.commit()
        return {"code": row.code, "questions": duel_questions()}

    @app.post("/api/duels/join")
    def duel_join(body: DuelJoin, user: User = Depends(current_user), session: Session = Depends(get_session)):
        try:
            row = join_duel(session, user, body.code)
            session.commit()
        except ServiceError as error:
            _raise(error)
        return {"code": row.code, "questions": duel_questions()}

    @app.post("/api/duels/{code}/answers")
    def duel_answers(code: str, body: DuelAnswers, user: User = Depends(current_user), session: Session = Depends(get_session)):
        try:
            result = submit_duel(session, user, code, body.answers)
            session.commit()
        except ServiceError as error:
            _raise(error)
        result["user"] = serialize_user(session, user)
        return result

    @app.post("/api/duels/shadow")
    def duel_shadow(body: DuelAnswers, user: User = Depends(current_user), session: Session = Depends(get_session)):
        result = shadow_duel(session, user, body.answers)
        session.commit()
        result["user"] = serialize_user(session, user)
        return result

    @app.get("/api/league")
    def league(user: User = Depends(current_user), session: Session = Depends(get_session)):
        return league_payload(session, user)

    @app.get("/api/words")
    def words(user: User = Depends(current_user), session: Session = Depends(get_session)):
        return {"words": due_words(session, user)}

    @app.post("/api/words")
    def words_save(body: WordIn, user: User = Depends(current_user), session: Session = Depends(get_session)):
        try:
            card = save_word(session, user, body.front, body.back)
            session.commit()
        except ServiceError as error:
            _raise(error)
        return card

    @app.post("/api/words/{card_id}/grade")
    def words_grade(
        card_id: int,
        body: WordGradeIn,
        user: User = Depends(current_user),
        session: Session = Depends(get_session),
    ):
        try:
            card = grade_word(session, user, card_id, body.ok)
            session.commit()
        except ServiceError as error:
            _raise(error)
        return card

    @app.get("/api/shop")
    def shop(user: User = Depends(current_user), session: Session = Depends(get_session)):
        return shop_payload(session, user)

    @app.post("/api/shop/buy")
    def shop_buy(body: ShopIn, user: User = Depends(current_user), session: Session = Depends(get_session)):
        try:
            payload = buy_item(session, user, body.item_id)
            session.commit()
        except ServiceError as error:
            _raise(error)
        payload["user"] = serialize_user(session, user)
        return payload

    @app.post("/api/shop/boost")
    def shop_boost(body: ShopIn, user: User = Depends(current_user), session: Session = Depends(get_session)):
        try:
            payload = buy_boost(session, user, body.item_id)
            session.commit()
        except ServiceError as error:
            _raise(error)
        payload["user"] = serialize_user(session, user)
        return payload

    @app.post("/api/shop/equip")
    def shop_equip(body: ShopIn, user: User = Depends(current_user), session: Session = Depends(get_session)):
        try:
            payload = equip_item(session, user, body.item_id)
            session.commit()
        except ServiceError as error:
            _raise(error)
        payload["user"] = serialize_user(session, user)
        return payload

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

    @app.get("/api/admin/stats")
    def admin_stats_route(access: Access = Depends(staff_user), session: Session = Depends(get_session)):
        return admin_stats(session)

    @app.get("/api/admin/users")
    def admin_users(q: str = "", access: Access = Depends(staff_user), session: Session = Depends(get_session)):
        return {"users": [user_card(session, user) for user in search_users(session, q)]}

    @app.get("/api/admin/users/{user_id}")
    def admin_user(user_id: int, access: Access = Depends(staff_user), session: Session = Depends(get_session)):
        user = session.get(User, user_id)
        if user is None:
            raise HTTPException(status_code=404, detail="Пользователь не найден")
        return user_card(session, user)

    @app.post("/api/admin/users/{user_id}/premium")
    def admin_premium(
        user_id: int,
        body: PremiumGrantIn,
        access: Access = Depends(staff_user),
        session: Session = Depends(get_session),
    ):
        user = session.get(User, user_id)
        if user is None:
            raise HTTPException(status_code=404, detail="Пользователь не найден")
        try:
            grant_premium(session, user, body.days)
            session.commit()
        except ServiceError as error:
            _raise(error)
        return user_card(session, user)

    @app.delete("/api/admin/users/{user_id}")
    def admin_delete_user(user_id: int, access: Access = Depends(staff_user), session: Session = Depends(get_session)):
        try:
            delete_user(session, access, user_id)
            session.commit()
        except ServiceError as error:
            _raise(error)
        return {"ok": True}

    @app.get("/api/admin/subscriptions")
    def admin_subs(access: Access = Depends(staff_user), session: Session = Depends(get_session)):
        return {"subscriptions": list_subscriptions(session)}

    @app.get("/api/admin/payments")
    def admin_payments(access: Access = Depends(staff_user), session: Session = Depends(get_session)):
        return {"payments": list_payments(session)}

    @app.get("/api/admin/admins")
    def admin_list(access: Access = Depends(staff_user), session: Session = Depends(get_session)):
        return {"admins": list_admins(session)}

    @app.post("/api/admin/admins")
    def admin_add(body: AdminIn, access: Access = Depends(staff_user), session: Session = Depends(get_session)):
        try:
            row = add_admin(session, access, body.telegram_id, body.username, body.can_invite)
            session.commit()
        except ServiceError as error:
            _raise(error)
        return {"telegram_id": row.telegram_id, "can_invite": bool(row.can_invite)}

    @app.delete("/api/admin/admins/{telegram_id}")
    def admin_remove(telegram_id: int, access: Access = Depends(staff_user), session: Session = Depends(get_session)):
        try:
            remove_admin(session, access, telegram_id)
            session.commit()
        except ServiceError as error:
            _raise(error)
        return {"ok": True}

    @app.post("/api/admin/admins/{telegram_id}/invite")
    def admin_invite(telegram_id: int, access: Access = Depends(staff_user), session: Session = Depends(get_session)):
        try:
            row = set_can_invite(session, access, telegram_id, True)
            session.commit()
        except ServiceError as error:
            _raise(error)
        return {"telegram_id": row.telegram_id, "can_invite": bool(row.can_invite)}

    @app.post("/admin-bot/webhook")
    async def admin_webhook(request: Request):
        live = get_settings()
        if not live.admin_bot_token:
            raise HTTPException(status_code=503, detail="ADMIN_BOT_TOKEN не задан")
        try:
            payload = await request.json()
        except json.JSONDecodeError as exc:
            raise HTTPException(status_code=400, detail="Bad JSON") from exc
        from aiogram.types import Update

        from app.admin_bot import get_admin_bot, get_admin_dispatcher

        bot = get_admin_bot()
        update = Update.model_validate(payload, context={"bot": bot})
        await get_admin_dispatcher().feed_update(bot, update)
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
            if full_path.startswith("api/") or full_path.startswith("webhooks/") or full_path.startswith("admin-bot/"):
                raise HTTPException(status_code=404, detail="Not found")
            if Path(full_path).suffix.lower() in asset_suffixes:
                raise HTTPException(status_code=404, detail="Not found")
            index = root / "index.html"
            if index.is_file():
                return FileResponse(index)
            raise HTTPException(status_code=404, detail="Not found")

    return app


app = create_app()
