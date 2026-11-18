import asyncio

import httpx

from app.config import Settings
from app.llm import chat_reply


class _Response:
    def __init__(self, payload, status=200):
        self.status_code = status
        self._payload = payload

    def raise_for_status(self):
        if self.status_code >= 400:
            raise httpx.HTTPStatusError("bad", request=None, response=None)

    def json(self):
        return self._payload


class _Client:
    url = ""
    payload = None

    def __init__(self, *args, **kwargs):
        pass

    async def __aenter__(self):
        return self

    async def __aexit__(self, *args):
        return None

    async def post(self, url, json=None, headers=None):
        _Client.url = url
        _Client.payload = json
        _Client.headers = headers
        return _Response({
            "candidates": [{
                "content": {"parts": [{"text": '{"reply":"Hello!","correction":null,"hint_ru":"Скажи hello."}'}]},
            }],
        })


def test_gemini_uses_flash_and_companion_persona(monkeypatch):
    monkeypatch.setattr(httpx, "AsyncClient", _Client)
    settings = Settings(
        llm_provider="gemini",
        gemini_api_key="test-key",
        gemini_model="gemini-3.1-flash-lite",
        llm_api_key="",
    )
    result = asyncio.run(chat_reply(
        settings,
        language="en",
        scene_id="cafe",
        history=[],
        user_text="Hello",
        mascot_name="Рыжик",
        mascot_id="fox",
    ))
    assert result["source"] == "llm"
    assert result["reply"] == "Hello!"
    assert result["hint_ru"] == "Скажи hello."
    assert "gemini-3.1-flash-lite:generateContent" in _Client.url
    assert "Рыжик" in _Client.payload["systemInstruction"]["parts"][0]["text"]
    assert _Client.headers["x-goog-api-key"] == "test-key"
