from __future__ import annotations

from fastapi.testclient import TestClient

from app.core.config import settings
from app.database.session import SessionLocal
from app.main import app


def test_settings_database_url_is_populated() -> None:
    assert settings.DATABASE_URL
    assert "postgresql+psycopg" in settings.DATABASE_URL


def test_session_factory_creates_session() -> None:
    db = SessionLocal()
    try:
        assert db is not None
    finally:
        db.close()


def test_health_endpoint() -> None:
    client = TestClient(app)
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}
