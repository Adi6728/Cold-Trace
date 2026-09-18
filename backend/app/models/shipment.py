from datetime import datetime, timezone
from enum import Enum
from typing import TYPE_CHECKING, Optional

from sqlalchemy import DateTime, Enum as SAEnum, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base

if TYPE_CHECKING:
    from app.models.batch import Batch
    from app.models.custody_transfer import CustodyTransfer
    from app.models.organization import Organization
    from app.models.shipment_event import ShipmentEvent


class ShipmentStatus(str, Enum):
    PLANNED = "PLANNED"
    DISPATCHED = "DISPATCHED"
    IN_TRANSIT = "IN_TRANSIT"
    DELIVERED = "DELIVERED"
    FAILED = "FAILED"


class Shipment(Base):
    __tablename__ = "shipments"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    batch_id: Mapped[int] = mapped_column(ForeignKey("batches.id"), nullable=False, index=True)
    origin_organization_id: Mapped[int] = mapped_column(ForeignKey("organizations.id"), nullable=False, index=True)
    destination_organization_id: Mapped[int] = mapped_column(ForeignKey("organizations.id"), nullable=False, index=True)
    status: Mapped[ShipmentStatus] = mapped_column(SAEnum(ShipmentStatus, native_enum=False), nullable=False, default=ShipmentStatus.PLANNED, index=True)
    started_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    expected_delivery_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    delivered_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(default=lambda: datetime.now(timezone.utc), nullable=False)

    batch: Mapped["Batch"] = relationship(back_populates="shipments")
    origin_organization: Mapped["Organization"] = relationship(back_populates="origin_shipments", foreign_keys="Shipment.origin_organization_id")
    destination_organization: Mapped["Organization"] = relationship(back_populates="destination_shipments", foreign_keys="Shipment.destination_organization_id")
    events: Mapped[list["ShipmentEvent"]] = relationship(back_populates="shipment", cascade="all, delete-orphan")
    custody_transfers: Mapped[list["CustodyTransfer"]] = relationship(back_populates="shipment", cascade="all, delete-orphan")
