from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import select

from app.database.session import get_db
from app.core.security import get_current_user
from app.core.permissions import UserRole
from app.models.user import User
from app.models.shipment import Shipment
from app.models.shipment_event import ShipmentEvent
from app.models.sensor import Sensor
from app.models.alert import Alert
from app.schemas.public import PublicShipmentRead, PublicShipmentEventRead, PublicSensorRead, PublicAlertRead

router = APIRouter()

def require_general_read_access(current_user: User):
    # Any authenticated user has general read access to public endpoints
    # Even USER role is allowed here. No specific organization checks are performed
    # because these endpoints only return sanitized, public-safe data.
    if current_user.role not in {UserRole.ADMIN, UserRole.MANUFACTURER, UserRole.LOGISTICS, UserRole.WAREHOUSE, UserRole.HOSPITAL, UserRole.AUDITOR, UserRole.USER}:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permissions.")

@router.get("/shipments", response_model=list[PublicShipmentRead])
def list_public_shipments(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    require_general_read_access(current_user)
    shipments = db.execute(select(Shipment).offset(skip).limit(limit)).scalars().all()
    return shipments

@router.get("/shipments/{shipment_id}", response_model=PublicShipmentRead)
def get_public_shipment(
    shipment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    require_general_read_access(current_user)
    shipment = db.execute(select(Shipment).filter(Shipment.id == shipment_id)).scalar_one_or_none()
    if not shipment:
        raise HTTPException(status_code=404, detail="Shipment not found")
    return shipment

@router.get("/shipments/{shipment_id}/events", response_model=list[PublicShipmentEventRead])
def list_public_shipment_events(
    shipment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    require_general_read_access(current_user)
    # verify shipment exists
    shipment = db.execute(select(Shipment).filter(Shipment.id == shipment_id)).scalar_one_or_none()
    if not shipment:
        raise HTTPException(status_code=404, detail="Shipment not found")
    events = db.execute(select(ShipmentEvent).filter(ShipmentEvent.shipment_id == shipment_id).order_by(ShipmentEvent.occurred_at.asc())).scalars().all()
    return events

@router.get("/shipments/{shipment_id}/sensors", response_model=list[PublicSensorRead])
def list_public_sensors(
    shipment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    require_general_read_access(current_user)
    shipment = db.execute(select(Shipment).filter(Shipment.id == shipment_id)).scalar_one_or_none()
    if not shipment:
        raise HTTPException(status_code=404, detail="Shipment not found")
    sensors = db.execute(select(Sensor).filter(Sensor.shipment_id == shipment_id)).scalars().all()
    return sensors

@router.get("/shipments/{shipment_id}/alerts", response_model=list[PublicAlertRead])
def list_public_alerts(
    shipment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    require_general_read_access(current_user)
    shipment = db.execute(select(Shipment).filter(Shipment.id == shipment_id)).scalar_one_or_none()
    if not shipment:
        raise HTTPException(status_code=404, detail="Shipment not found")
    alerts = db.execute(select(Alert).filter(Alert.shipment_id == shipment_id).order_by(Alert.detected_at.desc())).scalars().all()
    return alerts

@router.get("/sensors", response_model=list[PublicSensorRead])
def list_all_public_sensors(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    require_general_read_access(current_user)
    sensors = db.execute(select(Sensor).offset(skip).limit(limit)).scalars().all()
    return sensors
