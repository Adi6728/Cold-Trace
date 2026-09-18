from __future__ import annotations

from datetime import datetime, timezone
from typing import TYPE_CHECKING

from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base

if TYPE_CHECKING:
    from app.models.batch import Batch
    from app.models.custody_transfer import CustodyTransfer
    from app.models.product import Product
    from app.models.shipment import Shipment
    from app.models.user import User


class Organization(Base):
    __tablename__ = "organizations"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    slug: Mapped[str] = mapped_column(String(120), unique=True, index=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    users: Mapped[list["User"]] = relationship(back_populates="organization")
    products: Mapped[list["Product"]] = relationship(back_populates="manufacturer")
    origin_shipments: Mapped[list["Shipment"]] = relationship(back_populates="origin_organization", foreign_keys="Shipment.origin_organization_id")
    destination_shipments: Mapped[list["Shipment"]] = relationship(back_populates="destination_organization", foreign_keys="Shipment.destination_organization_id")
    outgoing_custody: Mapped[list["CustodyTransfer"]] = relationship(back_populates="from_organization", foreign_keys="CustodyTransfer.from_organization_id")
    incoming_custody: Mapped[list["CustodyTransfer"]] = relationship(back_populates="to_organization", foreign_keys="CustodyTransfer.to_organization_id")
