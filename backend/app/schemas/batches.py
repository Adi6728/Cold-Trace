from __future__ import annotations

from datetime import datetime
from enum import Enum

from pydantic import BaseModel, ConfigDict, Field


class BatchStatus(str, Enum):
    IN_PRODUCTION = "IN_PRODUCTION"
    READY_FOR_SHIPMENT = "READY_FOR_SHIPMENT"
    IN_TRANSIT = "IN_TRANSIT"
    DELIVERED = "DELIVERED"
    EXPIRED = "EXPIRED"
    CANCELLED = "CANCELLED"


class BatchBase(BaseModel):
    product_id: int
    batch_number: str = Field(..., min_length=1, max_length=100)
    manufactured_at: datetime
    expiry_date: datetime
    quantity: int = Field(..., gt=0)
    status: BatchStatus = BatchStatus.IN_PRODUCTION


class BatchCreate(BatchBase):
    pass


class BatchUpdate(BaseModel):
    product_id: int | None = None
    batch_number: str | None = Field(default=None, min_length=1, max_length=100)
    manufactured_at: datetime | None = None
    expiry_date: datetime | None = None
    quantity: int | None = Field(default=None, gt=0)
    status: BatchStatus | None = None


class BatchRead(BatchBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime
