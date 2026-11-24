"""Server speech-to-text. Never invents a transcript when no key is configured."""

import httpx

from app.config import get_settings
from app.services import ServiceError


async def transcribe(data: bytes, filename: str, content_type: str) -> str:
    settings = get_settings()
    key = (settings.stt_api_key or "").strip()
    if not key and settings.llm_provider == "openai":
        key = (settings.llm_api_key or "").strip()
    if not key:
        raise ServiceError(
            503,
            "Распознавание речи выключено: задай STT_API_KEY (ключ OpenAI Whisper или совместимого API).",
        )
    url = (settings.stt_base_url or "https://api.openai.com/v1").rstrip("/") + "/audio/transcriptions"
    try:
        async with httpx.AsyncClient(timeout=30) as client:
            response = await client.post(
                url,
                headers={"Authorization": f"Bearer {key}"},
                data={"model": settings.stt_model or "whisper-1", "language": "en"},
                files={"file": (filename or "phrase.webm", data, content_type or "application/octet-stream")},
            )
    except httpx.HTTPError as error:
        raise ServiceError(502, "Сервис распознавания не ответил. Попробуй ещё раз.") from error
    if response.status_code >= 400:
        raise ServiceError(502, "Сервис распознавания отклонил запись. Попробуй ещё раз.")
    text = ""
    try:
        text = str((response.json() or {}).get("text") or "")
    except ValueError:
        text = ""
    return text.strip()
