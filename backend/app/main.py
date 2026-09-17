from __future__ import annotations

from fastapi import FastAPI, Depends
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.database.session import get_db

app = FastAPI(title="ColdChain Trace Backend")


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/db-check")
def db_check(db: Session = Depends(get_db)) -> dict[str, str]:
    db.execute(text("SELECT 1"))
    return {"status": "database_connected"}
