from datetime import datetime, timezone
from typing import TYPE_CHECKING, Optional

from sqlalchemy import DateTime, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base

if TYPE_CHECKING:
    from app.models.organization import Organization
    from app.models.shipment import Shipment


class CustodyTransfer(Base):
    __tablename__ = "custody_transfers"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    shipment_id: Mapped[int] = mapped_column(ForeignKey("shipments.id"), nullable=False, index=True)
    from_organization_id: Mapped[int] = mapped_column(ForeignKey("organizations.id"), nullable=False, index=True)
    to_organization_id: Mapped[int] = mapped_column(ForeignKey("organizations.id"), nullable=False, index=True)
    transferred_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(default=lambda: datetime.now(timezone.utc), nullable=False)

    shipment: Mapped["Shipment"] = relationship(back_populates="custody_transfers")
    from_organization: Mapped["Organization"] = relationship(back_populates="outgoing_custody", foreign_keys="CustodyTransfer.from_organization_id")
    to_organization: Mapped["Organization"] = relationship(back_populates="incoming_custody", foreign_keys="CustodyTransfer.to_organization_id")
