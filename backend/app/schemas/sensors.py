from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field

from app.models.sensor import SensorStatus


class SensorBase(BaseModel):
    sensor_code: str
    shipment_id: int
    status: SensorStatus = SensorStatus.INACTIVE


class SensorCreate(SensorBase):
    pass


class SensorResponse(SensorBase):
    id: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class SensorReadingResponse(BaseModel):
    id: int
    sensor_id: int
    shipment_id: int
    temperature: float
    humidity: Optional[float] = None
    recorded_at: datetime
    received_at: datetime

    model_config = ConfigDict(from_attributes=True)


class TelemetryPayload(BaseModel):
    sensor_code: str = Field(..., description="Unique code for the sensor")
    shipment_id: int = Field(..., description="ID of the shipment this sensor is monitoring")
    temperature: float = Field(..., description="Temperature in Celsius")
    humidity: Optional[float] = Field(None, description="Humidity percentage")
    recorded_at: datetime = Field(..., description="Timestamp of when the reading was taken")
