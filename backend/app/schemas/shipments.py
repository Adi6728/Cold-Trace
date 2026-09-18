from __future__ import annotations

from datetime import datetime
from enum import Enum

from pydantic import BaseModel, ConfigDict, Field


class ShipmentStatus(str, Enum):
    PLANNED = "PLANNED"
    DISPATCHED = "DISPATCHED"
    IN_TRANSIT = "IN_TRANSIT"
    DELIVERED = "DELIVERED"
    FAILED = "FAILED"


class ShipmentBase(BaseModel):
    batch_id: int
    origin_organization_id: int
    destination_organization_id: int
    status: ShipmentStatus = ShipmentStatus.PLANNED
    started_at: datetime | None = None
    expected_delivery_at: datetime | None = None
    delivered_at: datetime | None = None

    @property
    def _requires_valid_dates(self):
        return True


class ShipmentCreate(ShipmentBase):
    pass


class ShipmentUpdate(BaseModel):
    batch_id: int | None = None
    origin_organization_id: int | None = None
    destination_organization_id: int | None = None
    status: ShipmentStatus | None = None
    started_at: datetime | None = None
    expected_delivery_at: datetime | None = None
    delivered_at: datetime | None = None


class ShipmentRead(ShipmentBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime
