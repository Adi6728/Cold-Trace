from __future__ import annotations

import uuid
from datetime import datetime

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session
from sqlalchemy.pool import StaticPool
from unittest.mock import patch

from app.core.permissions import UserRole
from app.core.security import hash_password
from app.database.base import Base
from app.database.session import get_db
from app.main import app
from app.models.batch import Batch, BatchStatus
from app.models.organization import Organization
from app.models.product import Product
from app.models.shipment import Shipment, ShipmentStatus
from app.models.user import User


def _build_session() -> Session:
    engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
    Base.metadata.create_all(bind=engine)
    return Session(bind=engine)


@patch("app.services.fabric_service.fabric_service.get_shipment_history")
def test_public_shipment_verify(mock_get_history) -> None:
    session = _build_session()
    app.dependency_overrides[get_db] = lambda: session

    # Setup basic data
    org_a = Organization(name="Alpha Labs", slug="alpha-labs")
    org_b = Organization(name="Beta Pharma", slug="beta-pharma")
    session.add_all([org_a, org_b])
    session.flush()

    product = Product(
        name="Test Vaccine",
        description="Public test",
        manufacturer_id=org_a.id,
        storage_min_temp=2,
        storage_max_temp=8,
    )
    session.add(product)
    session.commit()

    batch = Batch(
        product_id=product.id,
        batch_number="VERIFY-1001",
        manufactured_at=datetime(2026, 1, 1),
        expiry_date=datetime(2027, 1, 1),
        quantity=10,
        status=BatchStatus.READY_FOR_SHIPMENT,
    )
    session.add(batch)
    session.flush()
    shipment = Shipment(
        batch_id=batch.id,
        origin_organization_id=org_a.id,
        destination_organization_id=org_b.id,
        status=ShipmentStatus.IN_TRANSIT,
    )
    session.add(shipment)
    session.commit()

    client = TestClient(app)

    # 1. Test invalid shipment ID
    res_404 = client.get("/api/v1/shipments/9999/verify")
    assert res_404.status_code == 404
    assert res_404.json()["detail"] == "Shipment not found"

    # 2. Test valid shipment ID, unauthenticated
    mock_get_history.return_value = [{"eventType": "TEST"}]
    res_200 = client.get(f"/api/v1/shipments/{shipment.id}/verify")
    assert res_200.status_code == 200

    data = res_200.json()
    
    # 3. Verify exactly the intended fields are present
    expected_fields = {
        "shipment_id",
        "status",
        "batch_id",
        "origin_organization_id",
        "destination_organization_id",
        "created_at",
        "delivered_at",
        "is_blockchain_verified",
        "events_count"
    }
    
    assert set(data.keys()) == expected_fields
    
    # Verify values
    assert data["shipment_id"] == shipment.id
    assert data["status"] == ShipmentStatus.IN_TRANSIT.value
    assert data["origin_organization_id"] == org_a.id
    assert data["destination_organization_id"] == org_b.id
    assert data["is_blockchain_verified"] is True
    assert data["events_count"] == 0

    # 4. Verify blockchain fallback (when history is empty)
    mock_get_history.return_value = []
    res_200_fallback = client.get(f"/api/v1/shipments/{shipment.id}/verify")
    assert res_200_fallback.json()["is_blockchain_verified"] is False

    # 5. Verify blockchain exception handling
    mock_get_history.side_effect = Exception("Fabric unavailable")
    res_200_except = client.get(f"/api/v1/shipments/{shipment.id}/verify")
    assert res_200_except.json()["is_blockchain_verified"] is False

    app.dependency_overrides.clear()
    session.close()
