from __future__ import annotations

from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.api.v1.endpoints.auth import router as auth_router
from app.api.v1.endpoints.batches import router as batches_router
from app.api.v1.endpoints.custody import router as custody_router
from app.api.v1.endpoints.products import router as products_router
from app.api.v1.endpoints.shipments import router as shipments_router
from app.database.session import get_db

app = FastAPI(title="ColdChain Trace Backend")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000", "http://localhost:3001", "http://127.0.0.1:3001"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(auth_router)
app.include_router(products_router)
app.include_router(batches_router)
app.include_router(shipments_router)
app.include_router(custody_router)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/db-check")
def db_check(db: Session = Depends(get_db)) -> dict[str, str]:
    db.execute(text("SELECT 1"))
    return {"status": "database_connected"}
