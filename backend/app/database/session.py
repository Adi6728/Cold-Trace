from __future__ import annotations

from collections.abc import Generator

from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from app.core.config import settings

engine = create_engine(settings.DATABASE_URL, pool_pre_ping=True)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine, expire_on_commit=False, class_=Session)


def get_db() -> Generator[Session, None, None]:
    """Provide a per-request database session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
