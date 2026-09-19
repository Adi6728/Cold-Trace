from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict

from app.models.alert import AlertSeverity, AlertStatus


class AlertBase(BaseModel):
    shipment_id: int
    sensor_id: int
    severity: AlertSeverity
    status: AlertStatus
    message: str
    latest_temperature: float
    detected_at: datetime
    acknowledged_at: Optional[datetime] = None
    resolved_at: Optional[datetime] = None


class AlertRead(AlertBase):
    id: int

    model_config = ConfigDict(from_attributes=True)


class AlertAcknowledge(BaseModel):
    pass


class AlertResolve(BaseModel):
    pass
