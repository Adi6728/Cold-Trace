from __future__ import annotations

import os

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.security import hash_password
from app.database.session import SessionLocal
from app.models.user import User


def seed_admin_user(db: Session) -> None:
    """Create a development admin user when explicitly configured for local use."""
    email = os.getenv("DEV_ADMIN_EMAIL") or settings.DEV_ADMIN_EMAIL
    password = os.getenv("DEV_ADMIN_PASSWORD") or settings.DEV_ADMIN_PASSWORD

    if not email or not password:
        return

    existing = db.scalar(select(User).where(User.email == email.lower()))
    if existing is not None:
        return

    user = User(
        email=email.lower(),
        password_hash=hash_password(password),
        role="ADMIN",
        is_active=True,
    )
    db.add(user)
    db.commit()


if __name__ == "__main__":
    db = SessionLocal()
    try:
        seed_admin_user(db)
    finally:
        db.close()
