from __future__ import annotations

from collections.abc import Iterable
from datetime import datetime

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.organization import Organization
from app.models.product import Product
from app.models.user import User
from app.schemas.products import ProductCreate, ProductUpdate


def get_products_for_org(db: Session, organization_id: int) -> list[Product]:
    return db.scalars(select(Product).where(Product.manufacturer_id == organization_id)).all()


def get_product_or_404(db: Session, product_id: int) -> Product:
    product = db.get(Product, product_id)
    if product is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found.")
    return product


def get_product_for_user(db: Session, user: User, product_id: int) -> Product:
    product = get_product_or_404(db, product_id)
    if user.organization_id is not None and product.manufacturer_id != user.organization_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permissions for this organization.")
    return product


def list_products(db: Session, organization_id: int | None = None) -> list[Product]:
    if organization_id is None:
        return db.scalars(select(Product)).all()
    return get_products_for_org(db, organization_id)


def create_product(db: Session, payload: ProductCreate) -> Product:
    organization = db.get(Organization, payload.manufacturer_id)
    if organization is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Manufacturer organization not found.")
    if payload.storage_max_temp < payload.storage_min_temp:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="storage_max_temp must be greater than or equal to storage_min_temp.")
    product = Product(**payload.model_dump())
    db.add(product)
    db.commit()
    db.refresh(product)
    return product


def update_product(db: Session, product: Product, payload: ProductUpdate) -> Product:
    data = payload.model_dump(exclude_unset=True)
    if "storage_min_temp" in data or "storage_max_temp" in data:
        min_temp = data.get("storage_min_temp", product.storage_min_temp)
        max_temp = data.get("storage_max_temp", product.storage_max_temp)
        if max_temp < min_temp:
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="storage_max_temp must be greater than or equal to storage_min_temp.")
    for field, value in data.items():
        setattr(product, field, value)
    product.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(product)
    return product
