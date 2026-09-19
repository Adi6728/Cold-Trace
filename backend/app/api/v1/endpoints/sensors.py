from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.security import get_current_user
from app.database.session import get_db
from app.models.user import User
from app.schemas.sensors import SensorCreate, SensorResponse, SensorReadingResponse
from app.services.sensor_service import SensorService

router = APIRouter(prefix="/api/v1/sensors", tags=["sensors"])


@router.post("/", response_model=SensorResponse)
def create_sensor(
    sensor_in: SensorCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> SensorResponse:
    """Create a new sensor and link it to a shipment."""
    # In a real app, we might check if user's organization is allowed to add sensors to this shipment.
    return SensorService.create_sensor(db=db, sensor_in=sensor_in)


@router.get("/", response_model=list[SensorResponse])
def get_sensors(
    skip: int = 0,
    limit: int = 100,
    organization_id: int | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[SensorResponse]:
    """Retrieve sensors."""
    return SensorService.list_sensors_for_user(db=db, user=current_user, organization_id=organization_id, skip=skip, limit=limit)


@router.get("/{sensor_id}", response_model=SensorResponse)
def get_sensor(
    sensor_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> SensorResponse:
    """Get sensor by ID."""
    return SensorService.get_sensor_for_user(db=db, user=current_user, sensor_id=sensor_id)


@router.get("/{sensor_id}/readings", response_model=list[SensorReadingResponse])
def get_sensor_readings(
    sensor_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[SensorReadingResponse]:
    """Get telemetry readings for a sensor."""
    # First, validate the user has access to this sensor
    SensorService.get_sensor_for_user(db=db, user=current_user, sensor_id=sensor_id)
    return SensorService.get_sensor_readings(db=db, sensor_id=sensor_id)
