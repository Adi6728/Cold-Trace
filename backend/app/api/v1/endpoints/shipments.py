from __future__ import annotations

from typing import Any
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.permissions import UserRole
from app.core.security import get_current_user
from app.database.session import get_db
from app.models.shipment import Shipment
from app.models.shipment_event import ShipmentEvent
from app.models.user import User
from app.schemas.shipment_events import ShipmentEventCreate, ShipmentEventRead
from app.schemas.shipments import ShipmentCreate, ShipmentRead, ShipmentUpdate
from app.services.shipment_service import add_custody_transfer, add_shipment_event, create_shipment, get_shipment_for_user, get_shipment_or_404, list_shipments, update_shipment

router = APIRouter(prefix="/api/v1", tags=["shipments"])


@router.get("/shipments", response_model=list[ShipmentRead])
def list_shipments_endpoint(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    organization_id: int | None = Query(default=None),
) -> list[Shipment]:
    if current_user.role not in {UserRole.ADMIN, UserRole.MANUFACTURER, UserRole.LOGISTICS, UserRole.WAREHOUSE, UserRole.HOSPITAL, UserRole.AUDITOR}:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permissions.")
    if current_user.organization_id is None and current_user.role not in {UserRole.ADMIN, UserRole.AUDITOR}:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="An organization assignment is required.")
    org_id = organization_id or current_user.organization_id
    if current_user.organization_id is not None and org_id != current_user.organization_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permissions for this organization.")
    return list_shipments(db, organization_id=org_id)


@router.get("/shipments/{shipment_id}", response_model=ShipmentRead)
def get_shipment_endpoint(shipment_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)) -> Shipment:
    if current_user.organization_id is None and current_user.role not in {UserRole.ADMIN, UserRole.AUDITOR}:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="An organization assignment is required.")
    return get_shipment_for_user(db, current_user, shipment_id)


@router.post("/shipments", response_model=ShipmentRead, status_code=status.HTTP_201_CREATED)
def create_shipment_endpoint(payload: ShipmentCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)) -> Shipment:
    if current_user.role not in {UserRole.ADMIN, UserRole.MANUFACTURER, UserRole.LOGISTICS}:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permissions.")
    if current_user.organization_id is not None and payload.origin_organization_id != current_user.organization_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Origin organization must match your organization.")
    return create_shipment(db, payload)


@router.put("/shipments/{shipment_id}", response_model=ShipmentRead)
def update_shipment_endpoint(shipment_id: int, payload: ShipmentUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)) -> Shipment:
    shipment = get_shipment_for_user(db, current_user, shipment_id)
    return update_shipment(db, shipment, payload)


@router.post("/shipments/{shipment_id}/events", response_model=ShipmentEventRead, status_code=status.HTTP_201_CREATED)
def create_shipment_event_endpoint(shipment_id: int, payload: ShipmentEventCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)) -> ShipmentEvent:
    if current_user.role not in {UserRole.ADMIN, UserRole.MANUFACTURER, UserRole.LOGISTICS, UserRole.WAREHOUSE, UserRole.HOSPITAL}:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permissions.")
    shipment = get_shipment_for_user(db, current_user, shipment_id)
    return add_shipment_event(db, shipment, payload, current_user)


@router.get("/shipments/{shipment_id}/events", response_model=list[ShipmentEventRead])
def list_shipment_events_endpoint(shipment_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)) -> list[ShipmentEvent]:
    shipment = get_shipment_for_user(db, current_user, shipment_id)
    return shipment.events


@router.get("/shipments/{shipment_id}/blockchain-history", response_model=list[dict[str, Any]])
def get_shipment_blockchain_history(shipment_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)) -> list[dict[str, Any]]:
    shipment = get_shipment_for_user(db, current_user, shipment_id)
    try:
        from app.services.fabric_service import fabric_service, FabricClientError
        return fabric_service.get_shipment_history(f"SHIP-{shipment.id}")
    except FabricClientError as e:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=f"Blockchain history unavailable: {str(e)}")

@router.get("/shipments/{shipment_id}/verify", response_model=dict[str, Any])
def verify_shipment_public(shipment_id: int, db: Session = Depends(get_db)) -> dict[str, Any]:
    # Public lookup of shipment - no auth required
    shipment = db.query(Shipment).filter(Shipment.id == shipment_id).first()
    if not shipment:
        raise HTTPException(status_code=404, detail="Shipment not found")
        
    is_blockchain_verified = False
    try:
        from app.services.fabric_service import fabric_service
        history = fabric_service.get_shipment_history(f"SHIP-{shipment.id}")
        if history and len(history) > 0:
            is_blockchain_verified = True
    except Exception:
        pass

    return {
        "shipment_id": shipment.id,
        "status": shipment.status.value if hasattr(shipment.status, 'value') else shipment.status,
        "batch_id": shipment.batch_id,
        "origin_organization_id": shipment.origin_organization_id,
        "destination_organization_id": shipment.destination_organization_id,
        "created_at": shipment.created_at.isoformat() if shipment.created_at else None,
        "delivered_at": shipment.delivered_at.isoformat() if shipment.delivered_at else None,
        "is_blockchain_verified": is_blockchain_verified,
        "events_count": len(shipment.events)
    }
