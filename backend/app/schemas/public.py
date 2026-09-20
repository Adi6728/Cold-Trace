from datetime import datetime
from pydantic import BaseModel, ConfigDict
from app.schemas.shipments import ShipmentStatus
from app.schemas.sensors import SensorStatus

class PublicShipmentRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    batch_id: int
    origin_organization_id: int
    destination_organization_id: int
    status: ShipmentStatus
    started_at: datetime | None
    expected_delivery_at: datetime | None
    delivered_at: datetime | None
    created_at: datetime

class PublicShipmentEventRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    shipment_id: int
    event_type: str
    location: str | None
    occurred_at: datetime

class PublicSensorRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    sensor_code: str
    status: SensorStatus

class PublicAlertRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    shipment_id: int
    severity: str
    status: str
    detected_at: datetime
