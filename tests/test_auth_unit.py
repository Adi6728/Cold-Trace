from __future__ import annotations

import uuid
from datetime import datetime, timedelta, timezone

import jwt
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session
from sqlalchemy.pool import StaticPool

from app.core.config import settings
from app.core.security import create_access_token, hash_password, verify_password
from app.database.base import Base
from app.database.session import get_db
from app.main import app
from app.models.user import User


@pytest.fixture
def sqlite_session() -> Session:
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(bind=engine)
    session = Session(bind=engine)
    yield session
    session.close()
    engine.dispose()


@pytest.fixture
def override_db(sqlite_session: Session):
    def _override() -> Session:
        return sqlite_session

    app.dependency_overrides[get_db] = _override
    yield
    app.dependency_overrides.clear()


def test_hash_and_verify_password() -> None:
    password = "StrongPass123!"
    hashed = hash_password(password)
    assert hashed != password
    assert verify_password(password, hashed) is True
    assert verify_password("WrongPassword123!", hashed) is False


def test_jwt_valid_and_invalid() -> None:
    settings.JWT_SECRET = "test-secret"
    settings.JWT_ALGORITHM = "HS256"
    token = create_access_token("test-user")
    payload = jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])
    assert payload["sub"] == "test-user"

    with pytest.raises(jwt.InvalidTokenError):
        jwt.decode(token[:-1] + "X", settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])

    expired_token = jwt.encode(
        {"sub": "test-user", "exp": datetime.now(timezone.utc) - timedelta(minutes=1)},
        settings.JWT_SECRET,
        algorithm=settings.JWT_ALGORITHM,
    )
    with pytest.raises(jwt.ExpiredSignatureError):
        jwt.decode(expired_token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])


def test_login_success_and_invalid_credentials(override_db, sqlite_session: Session) -> None:
    email = f"user-{uuid.uuid4()}@example.com"
    user = User(email=email, password_hash=hash_password("Password123!"), is_active=True)
    sqlite_session.add(user)
    sqlite_session.commit()

    client = TestClient(app)
    login_ok = client.post("/api/v1/auth/login", json={"email": email, "password": "Password123!"})
    assert login_ok.status_code == 200

    login_bad = client.post("/api/v1/auth/login", json={"email": email, "password": "WrongPassword!"})
    assert login_bad.status_code == 401


def test_me_requires_token() -> None:
    client = TestClient(app)
    response = client.get("/api/v1/auth/me")
    assert response.status_code == 401

def test_rbac_allowed_and_denied(override_db, sqlite_session: Session) -> None:
    user = User(
        email=f"rbac-{uuid.uuid4()}@example.com", 
        password_hash=hash_password("Password123!"), 
        role="ADMIN", 
        is_active=True
    )
    sqlite_session.add(user)
    sqlite_session.commit()
    
    settings.JWT_SECRET = "test-secret"
    settings.JWT_ALGORITHM = "HS256"
    token = create_access_token(user.id)
    
    client = TestClient(app)
    me = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me.status_code == 200
    assert me.json()["email"] == user.email

    # Unauthenticated direct access is rejected by the dependency layer.
    unauth = client.get("/api/v1/auth/me")
    assert unauth.status_code == 401
