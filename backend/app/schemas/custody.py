from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class CustodyTransferBase(BaseModel):
    from_organization_id: int
    to_organization_id: int
    transferred_at: datetime
    notes: str | None = None


class CustodyTransferCreate(CustodyTransferBase):
    pass


class CustodyTransferRead(CustodyTransferBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    shipment_id: int
    created_at: datetime
