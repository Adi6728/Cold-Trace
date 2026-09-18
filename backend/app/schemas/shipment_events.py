from __future__ import annotations

from datetime import datetime
from enum import Enum

from pydantic import BaseModel, ConfigDict, Field


class ShipmentEventType(str, Enum):
    CREATED = "CREATED"
    DISPATCHED = "DISPATCHED"
    RECEIVED = "RECEIVED"
    DELAYED = "DELAYED"
    HAZARD = "HAZARD"
    CUSTODY_TRANSFER = "CUSTODY_TRANSFER"


class ShipmentEventBase(BaseModel):
    event_type: ShipmentEventType
    description: str | None = None
    location: str | None = Field(default=None, max_length=255)
    occurred_at: datetime


class ShipmentEventCreate(ShipmentEventBase):
    pass


class ShipmentEventRead(ShipmentEventBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    shipment_id: int
    created_at: datetime
