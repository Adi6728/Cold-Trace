from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.permissions import UserRole
from app.core.security import get_current_user
from app.database.session import get_db
from app.models.custody_transfer import CustodyTransfer
from app.models.user import User
from app.schemas.custody import CustodyTransferCreate, CustodyTransferRead
from app.services.shipment_service import add_custody_transfer, get_shipment_for_user

router = APIRouter(prefix="/api/v1", tags=["custody"])


@router.get("/shipments/{shipment_id}/custody", response_model=list[CustodyTransferRead])
def list_custody_transfers_endpoint(shipment_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)) -> list[CustodyTransfer]:
    shipment = get_shipment_for_user(db, current_user, shipment_id)
    return shipment.custody_transfers


@router.post("/shipments/{shipment_id}/custody", response_model=CustodyTransferRead, status_code=status.HTTP_201_CREATED)
def create_custody_transfer_endpoint(shipment_id: int, payload: CustodyTransferCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)) -> CustodyTransfer:
    shipment = get_shipment_for_user(db, current_user, shipment_id)
    if current_user.role not in {UserRole.ADMIN, UserRole.LOGISTICS, UserRole.WAREHOUSE}:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permissions.")
    return add_custody_transfer(db, shipment, payload, current_user)
