from __future__ import annotations

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.batch import Batch
from app.models.product import Product
from app.models.user import User
from app.schemas.batches import BatchCreate, BatchUpdate


def get_batch_or_404(db: Session, batch_id: int) -> Batch:
    batch = db.get(Batch, batch_id)
    if batch is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Batch not found.")
    return batch


def get_batch_for_user(db: Session, user: User, batch_id: int) -> Batch:
    batch = get_batch_or_404(db, batch_id)
    if user.organization_id is not None and batch.product.manufacturer_id != user.organization_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permissions for this organization.")
    return batch


def list_batches(db: Session, product_id: int | None = None) -> list[Batch]:
    if product_id is None:
        return db.scalars(select(Batch)).all()
    return db.scalars(select(Batch).where(Batch.product_id == product_id)).all()


def create_batch(db: Session, payload: BatchCreate) -> Batch:
    product = db.get(Product, payload.product_id)
    if product is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found.")
    if payload.expiry_date <= payload.manufactured_at:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="expiry_date must be after manufactured_at.")
    batch = Batch(**payload.model_dump())
    db.add(batch)
    db.commit()
    db.refresh(batch)
    return batch


def update_batch(db: Session, batch: Batch, payload: BatchUpdate) -> Batch:
    data = payload.model_dump(exclude_unset=True)
    if "manufactured_at" in data or "expiry_date" in data:
        manufactured_at = data.get("manufactured_at", batch.manufactured_at)
        expiry_date = data.get("expiry_date", batch.expiry_date)
        if expiry_date <= manufactured_at:
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="expiry_date must be after manufactured_at.")
    for field, value in data.items():
        setattr(batch, field, value)
    db.commit()
    db.refresh(batch)
    return batch
