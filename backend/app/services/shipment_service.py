from __future__ import annotations

from datetime import datetime

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.batch import Batch
from app.models.organization import Organization
from app.models.shipment import Shipment
from app.models.shipment_event import ShipmentEvent
from app.models.user import User
from app.schemas.shipments import ShipmentCreate, ShipmentUpdate
from app.schemas.shipment_events import ShipmentEventCreate
from app.schemas.custody import CustodyTransferCreate
from app.models.custody_transfer import CustodyTransfer


def get_shipment_or_404(db: Session, shipment_id: int) -> Shipment:
    shipment = db.get(Shipment, shipment_id)
    if shipment is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Shipment not found.")
    return shipment


def get_shipment_for_user(db: Session, user: User, shipment_id: int) -> Shipment:
    shipment = get_shipment_or_404(db, shipment_id)
    if user.organization_id is not None and shipment.origin_organization_id != user.organization_id and shipment.destination_organization_id != user.organization_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permissions for this organization.")
    return shipment


def list_shipments(db: Session, organization_id: int | None = None) -> list[Shipment]:
    if organization_id is None:
        return db.scalars(select(Shipment)).all()
    return db.scalars(
        select(Shipment).where(
            (Shipment.origin_organization_id == organization_id) | (Shipment.destination_organization_id == organization_id)
        )
    ).all()


def create_shipment(db: Session, payload: ShipmentCreate) -> Shipment:
    batch = db.get(Batch, payload.batch_id)
    if batch is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Batch not found.")
    if payload.origin_organization_id == payload.destination_organization_id:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="origin_organization_id and destination_organization_id must differ.")
    if payload.expected_delivery_at is not None and payload.started_at is not None and payload.expected_delivery_at < payload.started_at:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="expected_delivery_at must be after started_at.")
    if payload.delivered_at is not None and payload.started_at is not None and payload.delivered_at < payload.started_at:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="delivered_at must be after started_at.")
    for field in ("origin_organization_id", "destination_organization_id"):
        org = db.get(Organization, getattr(payload, field))
        if org is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"{field} organization not found.")
    shipment = Shipment(**payload.model_dump())
    db.add(shipment)
    db.commit(); db.refresh(shipment)
    return shipment


def update_shipment(db: Session, shipment: Shipment, payload: ShipmentUpdate) -> Shipment:
    data = payload.model_dump(exclude_unset=True)
    for field, value in data.items():
        setattr(shipment, field, value)
    if shipment.expected_delivery_at is not None and shipment.started_at is not None and shipment.expected_delivery_at < shipment.started_at:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="expected_delivery_at must be after started_at.")
    db.commit(); db.refresh(shipment)
    return shipment


def add_shipment_event(db: Session, shipment: Shipment, payload: ShipmentEventCreate) -> ShipmentEvent:
    event = ShipmentEvent(shipment_id=shipment.id, **payload.model_dump())
    db.add(event)
    db.commit(); db.refresh(event)
    return event


def add_custody_transfer(db: Session, shipment: Shipment, payload: CustodyTransferCreate) -> CustodyTransfer:
    if payload.from_organization_id == payload.to_organization_id:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="from_organization_id and to_organization_id must differ.")
    if db.get(Organization, payload.from_organization_id) is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="from_organization_id not found.")
    if db.get(Organization, payload.to_organization_id) is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="to_organization_id not found.")
    transfer = CustodyTransfer(shipment_id=shipment.id, **payload.model_dump())
    db.add(transfer)
    db.commit(); db.refresh(transfer)
    return transfer
