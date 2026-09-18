from datetime import datetime, timezone
from enum import Enum
from typing import TYPE_CHECKING, Optional

from sqlalchemy import DateTime, Enum as SAEnum, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base

if TYPE_CHECKING:
    from app.models.shipment import Shipment


class ShipmentEventType(str, Enum):
    CREATED = "CREATED"
    DISPATCHED = "DISPATCHED"
    RECEIVED = "RECEIVED"
    DELAYED = "DELAYED"
    HAZARD = "HAZARD"
    CUSTODY_TRANSFER = "CUSTODY_TRANSFER"


class ShipmentEvent(Base):
    __tablename__ = "shipment_events"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    shipment_id: Mapped[int] = mapped_column(ForeignKey("shipments.id"), nullable=False, index=True)
    event_type: Mapped[ShipmentEventType] = mapped_column(SAEnum(ShipmentEventType, native_enum=False), nullable=False, index=True)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    location: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    occurred_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    created_at: Mapped[datetime] = mapped_column(default=lambda: datetime.now(timezone.utc), nullable=False)

    shipment: Mapped["Shipment"] = relationship(back_populates="events")
