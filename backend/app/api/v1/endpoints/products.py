from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.permissions import UserRole
from app.core.security import get_current_user
from app.database.session import get_db
from app.models.product import Product
from app.models.user import User
from app.schemas.products import ProductCreate, ProductRead, ProductUpdate
from app.services.product_service import create_product, get_product_for_user, get_product_or_404, list_products, update_product

router = APIRouter(prefix="/api/v1", tags=["products"])


@router.get("/products", response_model=list[ProductRead])
def list_products_endpoint(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    organization_id: int | None = Query(default=None),
) -> list[Product]:
    if current_user.organization_id is None and current_user.role is not UserRole.ADMIN:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="An organization assignment is required.")
    if current_user.organization_id is not None and organization_id is not None and current_user.organization_id != organization_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permissions for this organization.")
    org_id = organization_id or current_user.organization_id
    if org_id is not None and current_user.organization_id is not None and org_id != current_user.organization_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permissions for this organization.")
    return list_products(db, organization_id=org_id)


@router.get("/products/{product_id}", response_model=ProductRead)
def get_product_endpoint(product_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)) -> Product:
    if current_user.organization_id is None and current_user.role is not UserRole.ADMIN:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permissions.")
    return get_product_for_user(db, current_user, product_id)


@router.post("/products", response_model=ProductRead, status_code=status.HTTP_201_CREATED)
def create_product_endpoint(
    payload: ProductCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Product:
    if current_user.role not in {UserRole.ADMIN, UserRole.MANUFACTURER}:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permissions.")
    if current_user.organization_id is not None and payload.manufacturer_id != current_user.organization_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Products must be created for your own organization.")
    return create_product(db, payload)


@router.put("/products/{product_id}", response_model=ProductRead)
def update_product_endpoint(
    product_id: int,
    payload: ProductUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Product:
    product = get_product_for_user(db, current_user, product_id)
    if current_user.role not in {UserRole.ADMIN, UserRole.MANUFACTURER}:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permissions.")
    return update_product(db, product, payload)
