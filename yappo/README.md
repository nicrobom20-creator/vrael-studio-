# Yappo

Языковое приложение VRAEL STUDIO: Telegram-бот и Mini App. Русский интерфейс, обучение с нуля английскому, китайскому (с пиньинь), испанскому, немецкому и французскому. Сюжет идёт испытаниями — сценами, словами, фразами и живым разговором.

Бот: [@YappoLang_Bot](https://t.me/YappoLang_Bot)

Свободный день: 3 испытания и 5 сообщений собеседнику. Premium — без этих пределов, 199 ₽ в месяц или 1999 ₽ в год.

## Что внутри

- Онбординг: язык, спутник (Яппо, Мими, Бруно, Рыжик, Нора), цель 15 / 20 / 30 минут, время напоминания, часовой пояс (по умолчанию Europe/Moscow).
- Карта города и главы. Первая глава каждого языка играется целиком: слова с озвучкой, выбор перевода, пары, сборка фразы, аудирование, речь. Следующие главы открываются, когда пройдена предыдущая.
- Разговор в кафе, аэропорту и на собеседовании. Поправки и подсказки по-русски. Если `LLM_API_KEY` пуст, отвечает учебный собеседник.
- Напоминание в Telegram голосом выбранного спутника, если в этот день ещё не было испытания.
- Оплата через RollyPay. Premium включается только после проверенного вебхука `payment.paid`.
- Реферальная ссылка `https://t.me/YappoLang_Bot?start=ref_<код>` и Mini App `startapp=ref_<код>`. Обоим начисляется XP при входе друга. Пригласившему — дни Premium, когда друг платит.
- `/stats` для `ADMIN_TELEGRAM_ID`: пользователи, кто занимался сегодня, Premium, выручка боевых платежей.

## Локально

Нужны Python 3.12 и Node 22.

```bash
cd yappo
cp .env.example .env
```

В `.env` для локальной проверки оставьте `DEMO_MODE=true` и `BOT_TOKEN` пустым. Mini App откроется без Telegram.

```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

В другом окне:

```bash
cd frontend
npm install
npm run dev
```

Приложение: http://localhost:5173 . Запросы к API проксируются на порт 8000.

Проверки:

```bash
cd backend
pytest
cd ../frontend
npm run build
```

## Бот и Mini App

1. Токен уже выпущен в @BotFather для [@YappoLang_Bot](https://t.me/YappoLang_Bot). Положите его в `BOT_TOKEN`. В репозиторий токен не коммитится.
2. `BOT_USERNAME=YappoLang_Bot`.
3. Соберите фронтенд (`npm run build`) и отдайте `frontend/dist` как статику, либо поднимите всё одним контейнером — см. ниже. `WEBAPP_URL` должен быть HTTPS-адресом Mini App.
4. В BotFather: Bot Settings → Menu Button → укажите `WEBAPP_URL`. Либо создайте Web App и повесьте кнопку «Открыть Yappo». Прямая ссылка на бота: https://t.me/YappoLang_Bot
5. `PUBLIC_BASE_URL` — публичный адрес API, тоже HTTPS.
6. Поставьте вебхук:

```bash
curl "https://api.telegram.org/bot${BOT_TOKEN}/setWebhook" \
  -d "url=${PUBLIC_BASE_URL}/webhooks/telegram"
```

7. На бою `DEMO_MODE=false`.

## RollyPay

Документация: https://docs.rollypay.io/

1. Возьмите `api_key` и `signing_secret` кассы.
2. `ROLLYPAY_API_KEY`, `ROLLYPAY_SIGNING_SECRET`.
3. Пока проверяете интеграцию, оставьте `ROLLYPAY_TEST=true`: в создание платежа уйдёт `"test": true`.
4. Колбэк кассы: `https://<ваш-api>/webhooks/rollypay`.
5. Сервер проверяет `X-Signature` как HMAC-SHA256 от строки `X-Timestamp.сырое тело` и сравнивает подпись за постоянное время. Платёж с другой суммой, валютой или флагом test не включает Premium. Повтор того же `payment.paid` не продлевает срок второй раз.

Боевой режим: `ROLLYPAY_TEST=false`. Тестовый колбэк не активирует боевой заказ.

## Модель для разговора

```
LLM_PROVIDER=openai
LLM_API_KEY=
LLM_BASE_URL=https://api.openai.com/v1
LLM_MODEL=gpt-4o-mini
GEMINI_API_KEY=
GEMINI_MODEL=gemini-2.0-flash
```

`LLM_PROVIDER=openai` — любой OpenAI-совместимый `POST /chat/completions`. `LLM_PROVIDER=gemini` и `GEMINI_API_KEY` — Gemini (`gemini-2.0-flash`, другую flash-модель укажите в `GEMINI_MODEL`). Тон ответа берётся у спутника ученика. Реплика на изучаемом языке, подсказка и поправка по-русски. Без ключа сцены всё равно играются: учебные реплики на месте.

## Напоминания

Пользователь задаёт время и цель. Раз в `REMINDER_POLL_SECONDS` бот смотрит локальное время человека. Если время прошло, сегодня ещё не занимались и напоминание сегодня не уходило — приходит сообщение голосом спутника. Нужен рабочий `BOT_TOKEN`.

## Рефералы

- Бот: `https://t.me/YappoLang_Bot?start=ref_<код>`
- Mini App: `https://t.me/YappoLang_Bot?startapp=ref_<код>`

`REFERRAL_JOIN_XP` (по умолчанию 50) получают оба при первом входе друга. `REFERRAL_PREMIUM_DAYS` (по умолчанию 7) получает пригласивший, когда друг платит, один раз.

## Один контейнер

Из папки `yappo`:

```bash
cp .env.example .env
# заполните токен, секрет, URL и ключи
docker compose up --build
```

API, бот, колбэки и собранный Mini App слушают порт 8000. `WEBAPP_URL` и `PUBLIC_BASE_URL` укажите на публичный HTTPS этого сервиса. База SQLite лежит в томе `yappo-data`.

Фронтенд можно вынести отдельно на Netlify или GitHub Pages: `npm run build`, каталог `frontend/dist`. Адрес API задаётся при сборке в `VITE_API_URL` (см. `frontend/.env.example`), без слэша в конце. Если переменная пустая, запросы идут на тот же адрес, что и сайт.

## Анимация спутников

Пока спутники — свои SVG с позами idle, wave, point, run, jump, celebrate, think. Когда появятся файлы аниматора, положите их сюда:

```
frontend/public/rive/parrot.riv
frontend/public/rive/bunny.riv
frontend/public/rive/bear.riv
frontend/public/rive/fox.riv
frontend/public/rive/cat.riv
```

Контракт Rive: state machine `Mascot`, числовой вход `pose` — 0 idle, 1 wave, 2 point, 3 run, 4 jump, 5 celebrate, 6 think. Если файла нет или он не открылся, остаётся запасная анимация.

Города — живописные фоны без текста в `frontend/public/art/` (webp 360/540/720). Спутники — вырезанные позы в `frontend/public/mascots/`.

## Админ

`ADMIN_TELEGRAM_ID` — числовой id. Команда в боте: `/stats`. Выручка считает только боевые оплаченные платежи. Тестовые показываются отдельно и в сумму не входят.
