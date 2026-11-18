from fastapi.testclient import TestClient

from app.config import get_settings


def test_missing_riv_head_is_404_and_spa_still_serves_html(tmp_path, monkeypatch):
    static = tmp_path / "static"
    static.mkdir()
    (static / "index.html").write_text("<!doctype html><title>Yappo</title>", encoding="utf-8")
    monkeypatch.setenv("STATIC_DIR", str(static))
    monkeypatch.setenv("DATABASE_URL", f"sqlite:///{tmp_path}/yappo.db")
    get_settings.cache_clear()
    from app import db as database
    from app.main import create_app

    database.reset_engine()
    app = create_app()
    with TestClient(app) as client:
        missing = client.head("/rive/parrot.riv")
        assert missing.status_code == 404
        missing_get = client.get("/rive/parrot.riv")
        assert missing_get.status_code == 404
        assert "text/html" not in missing_get.headers.get("content-type", "")
        page = client.get("/")
        assert page.status_code == 200
        assert "Yappo" in page.text
        head = client.head("/")
        assert head.status_code == 200
