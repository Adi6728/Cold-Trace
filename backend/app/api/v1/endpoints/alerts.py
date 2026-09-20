from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.security import get_current_user
from app.database.session import get_db
from app.models.alert import Alert, AlertStatus
from app.models.user import User
from app.schemas.alerts import AlertRead
from app.services.shipment_service import get_shipment_for_user

router = APIRouter(prefix="/api/v1", tags=["alerts"])


@router.get("/shipments/{shipment_id}/alerts", response_model=list[AlertRead])
def list_shipment_alerts_endpoint(
    shipment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> list[Alert]:
    shipment = get_shipment_for_user(db, current_user, shipment_id)
    return shipment.alerts


from app.core.permissions import UserRole

@router.patch("/alerts/{alert_id}/acknowledge", response_model=AlertRead)
def acknowledge_alert_endpoint(
    alert_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Alert:
    if current_user.role in {UserRole.AUDITOR, UserRole.USER}:
        raise HTTPException(status_code=403, detail="Role is read-only")
        
    alert = db.query(Alert).filter(Alert.id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
        
    # Enforce RBAC by ensuring user can access the shipment
    _ = get_shipment_for_user(db, current_user, alert.shipment_id)
    
    if alert.status == AlertStatus.RESOLVED:
        raise HTTPException(status_code=400, detail="Cannot acknowledge a resolved alert")
        
    if alert.status == AlertStatus.OPEN:
        alert.status = AlertStatus.ACKNOWLEDGED
        alert.acknowledged_at = datetime.now(timezone.utc)
        db.commit()
        db.refresh(alert)
        
    return alert


@router.patch("/alerts/{alert_id}/resolve", response_model=AlertRead)
def resolve_alert_endpoint(
    alert_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Alert:
    if current_user.role in {UserRole.AUDITOR, UserRole.USER}:
        raise HTTPException(status_code=403, detail="Role is read-only")
        
    alert = db.query(Alert).filter(Alert.id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
        
    # Enforce RBAC by ensuring user can access the shipment
    _ = get_shipment_for_user(db, current_user, alert.shipment_id)
    
    if alert.status != AlertStatus.RESOLVED:
        alert.status = AlertStatus.RESOLVED
        alert.resolved_at = datetime.now(timezone.utc)
        db.commit()
        db.refresh(alert)
        
    return alert
