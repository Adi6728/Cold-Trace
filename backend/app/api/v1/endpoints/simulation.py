from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.database.session import get_db
from app.core.permissions import require_roles, UserRole
from app.models.user import User
from app.services.sensor_service import SensorService
from app.services.simulation_service import SimulationService

router = APIRouter(prefix="/api/v1/sensors", tags=["simulation"])

# Allowed roles to manage simulations
OPERATOR_ROLES = [
    UserRole.ADMIN,
    UserRole.MANUFACTURER,
    UserRole.LOGISTICS,
    UserRole.WAREHOUSE,
    UserRole.HOSPITAL,
]

class ModePayload(BaseModel):
    mode: str

@router.post("/{sensor_id}/simulation/start")
def start_simulation(
    sensor_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(*OPERATOR_ROLES))
):
    sensor = SensorService.get_sensor_for_user(db, current_user, sensor_id)
    try:
        SimulationService.start_simulation(sensor_id, sensor.sensor_code, sensor.shipment_id, "NORMAL")
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    return {"message": "Simulation started", "status": "RUNNING", "mode": "NORMAL"}

@router.post("/{sensor_id}/simulation/stop")
def stop_simulation(
    sensor_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(*OPERATOR_ROLES))
):
    SensorService.get_sensor_for_user(db, current_user, sensor_id)
    SimulationService.stop_simulation(sensor_id)
    return {"message": "Simulation stopped", "status": "STOPPED", "mode": "NORMAL"}

@router.post("/{sensor_id}/simulation/mode")
def set_simulation_mode(
    sensor_id: int,
    payload: ModePayload,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(*OPERATOR_ROLES))
):
    if payload.mode not in ["NORMAL", "EXCURSION"]:
        raise HTTPException(status_code=400, detail="Invalid mode")
    
    sensor = SensorService.get_sensor_for_user(db, current_user, sensor_id)
    SimulationService.set_simulation_mode(sensor_id, sensor.sensor_code, sensor.shipment_id, payload.mode)
    return {"message": f"Simulation mode changed to {payload.mode}", "status": "RUNNING", "mode": payload.mode}

@router.get("/{sensor_id}/simulation/status")
def get_simulation_status(
    sensor_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(*OPERATOR_ROLES))
):
    SensorService.get_sensor_for_user(db, current_user, sensor_id)
    return SimulationService.get_simulation_status(sensor_id)
