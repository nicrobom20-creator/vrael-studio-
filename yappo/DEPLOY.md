# Как выложить Yappo

Токен бота и ключи оплаты в репозиторий не клади.

Самый короткий путь — один сервис Render. Образ сам собирает фронтенд и отдаёт его с того же адреса, что и API. `VITE_API_URL` при этой сборке не задавай: приложение ходит на `/api` того же сайта. После деплоя поставь `WEBAPP_URL` и `PUBLIC_BASE_URL` равными адресу сервиса, с `https://` и без слэша в конце.

## 1. Бот

1. Открой [@BotFather](https://t.me/BotFather).
2. Если бота ещё нет: `/newbot`, имя Yappo, юзернейм `YappoLang_Bot`.
3. Скопируй токен. Это `BOT_TOKEN`.
4. Узнай свой числовой id (например через @userinfobot). Это `ADMIN_TELEGRAM_ID` для команды `/stats`.

## 2. Сервер (Render)

1. Залей репозиторий на GitHub.
2. На [render.com](https://render.com) нажми New → Blueprint и укажи репозиторий. Файл `yappo/render.yaml` описывает сервис. Если Render смотрит в корень портфолио, в настройках сервиса поставь Root Directory: `yappo`.
3. В Environment впиши:
   - `BOT_TOKEN` — токен из BotFather
   - `WEBAPP_URL` и `PUBLIC_BASE_URL` — один и тот же адрес Render, с `https://`, без слэша в конце
   - `LLM_PROVIDER` — `openai` или `gemini`. Для Gemini нужен `GEMINI_API_KEY` (модель по умолчанию `gemini-2.0-flash`, другая flash-модель — в `GEMINI_MODEL`)
   - `APP_SECRET` — длинная случайная строка
   - `DEMO_MODE` — `false` на бою
   - `BOT_MODE` — `webhook`
4. База. Для старта оставь `DATABASE_URL=sqlite:////data/yappo.db`: файл лежит на диске сервиса и не пропадёт при перезапуске. Для Postgres создай базу в Render и подставь её `DATABASE_URL` (адрес вида `postgres://...` тоже подойдёт).
5. Deploy. Открой `https://твой-сервер.onrender.com/health`. Должно быть `{"ok": true}`.
6. При старте сервер сам ставит вебхук на `/webhooks/telegram` и кнопку меню «Yappo». Кнопка открывает Mini App. Ссылка друга имеет вид `https://t.me/YappoLang_Bot?start=ref_КОД`.

Напоминание проверяется само: если в выбранное время за день не было занятия, бот пишет в голосе спутника.

## 3. Сайт (Netlify)

1. New site → Import from Git.
2. Base directory: `yappo/frontend`.
3. Build command: `npm run build`. Publish directory: `dist`. Файл `netlify.toml` уже отдаёт все адреса на `index.html`.
4. Environment: `VITE_API_URL` = адрес API, без слэша в конце. Vite вшивает его в сборку. Пустое значение оставь только если сайт и API на одном адресе.
5. Опубликуй сайт и вставь его адрес в `WEBAPP_URL` на Render. `PUBLIC_BASE_URL` остаётся адресом API. Перезапусти сервер, чтобы кнопка меню взяла новый адрес.

## 4. Проверка

1. Напиши боту `/start`. Должно прийти приветствие и кнопка «Открыть Yappo». Кнопка меню слева от поля ввода открывает то же приложение.
2. Пройди главу: сцена, слова, аудирование, речь, пары, финальный диалог.
3. В разделе «Друзья» открой ссылку с другого аккаунта. Оба получают XP.
4. `/stats` отвечает только админу.

Локально без Telegram: в `.env` поставь `DEMO_MODE=true` и `BOT_MODE=polling`, подними API (`uvicorn app.main:app --reload` из папки `backend`) и фронт (`npm run dev` из `frontend`).
