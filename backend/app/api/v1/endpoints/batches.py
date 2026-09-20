from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.permissions import UserRole
from app.core.security import get_current_user
from app.database.session import get_db
from app.models.batch import Batch
from app.models.product import Product
from app.models.user import User
from app.schemas.batches import BatchCreate, BatchRead, BatchUpdate
from app.services.batch_service import create_batch, get_batch_for_user, list_batches, update_batch

router = APIRouter(prefix="/api/v1", tags=["batches"])


@router.get("/batches", response_model=list[BatchRead])
def list_batches_endpoint(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    product_id: int | None = Query(default=None),
) -> list[Batch]:
    if current_user.role in {UserRole.LOGISTICS, UserRole.WAREHOUSE}:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permissions to list batches.")
    if current_user.organization_id is None and current_user.role not in {UserRole.ADMIN, UserRole.USER}:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="An organization assignment is required.")
    if current_user.organization_id is not None and product_id is not None:
        product = db.get(Product, product_id)
        if product is not None and product.manufacturer_id != current_user.organization_id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permissions for this organization.")
    return list_batches(db, product_id=product_id)


@router.get("/batches/{batch_id}", response_model=BatchRead)
def get_batch_endpoint(batch_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)) -> Batch:
    if current_user.role in {UserRole.LOGISTICS, UserRole.WAREHOUSE}:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permissions to view batches.")
    if current_user.role not in {UserRole.ADMIN, UserRole.MANUFACTURER, UserRole.HOSPITAL, UserRole.AUDITOR, UserRole.USER}:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permissions.")
    return get_batch_for_user(db, current_user, batch_id)


@router.post("/batches", response_model=BatchRead, status_code=status.HTTP_201_CREATED)
def create_batch_endpoint(payload: BatchCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)) -> Batch:
    if current_user.role not in {UserRole.ADMIN, UserRole.MANUFACTURER}:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permissions.")
    if current_user.organization_id is not None:
        product = db.get(Product, payload.product_id)
        if product is not None and product.manufacturer_id != current_user.organization_id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Batches must belong to your organization.")
    return create_batch(db, payload)


@router.put("/batches/{batch_id}", response_model=BatchRead)
def update_batch_endpoint(batch_id: int, payload: BatchUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)) -> Batch:
    if current_user.role not in {UserRole.ADMIN, UserRole.MANUFACTURER}:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permissions.")
    batch = get_batch_for_user(db, current_user, batch_id)
    return update_batch(db, batch, payload)
