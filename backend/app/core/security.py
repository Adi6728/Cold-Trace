from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any

import jwt
from argon2 import PasswordHasher, exceptions
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jwt import InvalidTokenError
from sqlalchemy.orm import Session

from app.core.config import settings
from app.database.session import get_db
from app.models.user import User

bearer_scheme = HTTPBearer(auto_error=False)


def get_jwt_secret() -> str:
    secret = (settings.JWT_SECRET or "").strip()
    if not secret:
        raise ValueError(
            "JWT_SECRET is not configured. Set JWT_SECRET in the environment or .env before starting the API."
        )
    return secret


def hash_password(password: str) -> str:
    ph = PasswordHasher(time_cost=3, memory_cost=65536, parallelism=2, hash_len=32, salt_len=16)
    return ph.hash(password)


def verify_password(password: str, password_hash: str) -> bool:
    ph = PasswordHasher(time_cost=3, memory_cost=65536, parallelism=2, hash_len=32, salt_len=16)
    try:
        ph.verify(password_hash, password)
        return True
    except (exceptions.VerifyMismatchError, exceptions.InvalidHashError):
        return False


def create_access_token(subject: str | int, expires_delta: timedelta | None = None) -> str:
    secret = get_jwt_secret()
    expire = datetime.now(timezone.utc) + (expires_delta or timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES))
    payload: dict[str, Any] = {
        "sub": str(subject),
        "exp": expire,
        "iat": datetime.now(timezone.utc),
    }
    return jwt.encode(payload, secret, algorithm=settings.JWT_ALGORITHM)


def decode_token(token: str) -> dict[str, Any]:
    secret = get_jwt_secret()
    return jwt.decode(token, secret, algorithms=[settings.JWT_ALGORITHM])


def extract_user_id_from_token(token: str) -> int:
    payload = decode_token(token)
    user_id = payload.get("sub")
    if user_id is None:
        raise ValueError("Token payload missing subject.")
    try:
        return int(user_id)
    except (TypeError, ValueError) as exc:
        raise ValueError("Token subject is invalid.") from exc


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> User:
    if credentials is None or not credentials.credentials:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentication required.")

    token = credentials.credentials
    try:
        user_id = extract_user_id_from_token(token)
    except (InvalidTokenError, ValueError, jwt.PyJWTError):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid authentication credentials.") from None

    user = db.get(User, user_id)
    if user is None or not user.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Inactive or unknown user.")

    return user
