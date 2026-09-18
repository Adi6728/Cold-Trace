from __future__ import annotations

import uuid
from datetime import datetime, timedelta

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session
from sqlalchemy.pool import StaticPool

from app.core.permissions import UserRole
from app.core.security import create_access_token, hash_password
from app.database.base import Base
from app.database.session import get_db
from app.main import app
from app.models.batch import Batch, BatchStatus
from app.models.custody_transfer import CustodyTransfer
from app.models.organization import Organization
from app.models.product import Product
from app.models.shipment import Shipment, ShipmentStatus
from app.models.shipment_event import ShipmentEvent, ShipmentEventType
from app.models.user import User


def _build_session() -> Session:
    engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
    Base.metadata.create_all(bind=engine)
    return Session(bind=engine)


def test_product_batch_shipment_flow_and_validation() -> None:
    session = _build_session()
    app.dependency_overrides[get_db] = lambda: session

    org_a = Organization(name="Alpha Labs", slug="alpha-labs")
    org_b = Organization(name="Beta Pharma", slug="beta-pharma")
    session.add_all([org_a, org_b])
    session.flush()

    admin = User(
        email=f"admin-{uuid.uuid4()}@example.com",
        password_hash=hash_password("Password123!"),
        organization_id=org_a.id,
        role=UserRole.ADMIN,
        is_active=True,
    )
    session.add(admin)
    session.commit()

    client = TestClient(app)
    token = create_access_token(admin.id)
    headers = {"Authorization": f"Bearer {token}"}

    product_payload = {
        "name": "Acetaminophen",
        "description": "Pain relief tablets",
        "manufacturer_id": org_a.id,
        "storage_min_temp": 2,
        "storage_max_temp": 8,
    }
    product_response = client.post("/api/v1/products", json=product_payload, headers=headers)
    assert product_response.status_code == 201, product_response.text
    product = product_response.json()
    assert product["name"] == "Acetaminophen"

    invalid_product = client.post(
        "/api/v1/products",
        json={
            "name": "Bad",
            "description": "bad",
            "manufacturer_id": org_a.id,
            "storage_min_temp": 12,
            "storage_max_temp": 8,
        },
        headers=headers,
    )
    assert invalid_product.status_code == 422

    batch_response = client.post(
        "/api/v1/batches",
        json={
            "product_id": product["id"],
            "batch_number": "B-1001",
            "manufactured_at": "2026-01-15T00:00:00Z",
            "expiry_date": "2027-01-15T00:00:00Z",
            "quantity": 500,
            "status": BatchStatus.IN_PRODUCTION.value,
        },
        headers=headers,
    )
    assert batch_response.status_code == 201, batch_response.text
    batch = batch_response.json()
    assert batch["batch_number"] == "B-1001"

    shipment_response = client.post(
        "/api/v1/shipments",
        json={
            "batch_id": batch["id"],
            "origin_organization_id": org_a.id,
            "destination_organization_id": org_b.id,
            "status": ShipmentStatus.IN_TRANSIT.value,
            "started_at": "2026-02-01T00:00:00Z",
            "expected_delivery_at": "2026-02-04T00:00:00Z",
        },
        headers=headers,
    )
    assert shipment_response.status_code == 201, shipment_response.text
    shipment = shipment_response.json()
    assert shipment["status"] == ShipmentStatus.IN_TRANSIT.value

    event_response = client.post(
        f"/api/v1/shipments/{shipment['id']}/events",
        json={
            "event_type": ShipmentEventType.DISPATCHED.value,
            "description": "Left origin facility",
            "location": "Boston",
            "occurred_at": "2026-02-01T08:00:00Z",
        },
        headers=headers,
    )
    assert event_response.status_code == 201, event_response.text
    assert event_response.json()["event_type"] == ShipmentEventType.DISPATCHED.value

    custody_response = client.post(
        f"/api/v1/shipments/{shipment['id']}/custody",
        json={
            "from_organization_id": org_a.id,
            "to_organization_id": org_b.id,
            "transferred_at": "2026-02-02T10:00:00Z",
            "notes": "Handed off at transfer hub",
        },
        headers=headers,
    )
    assert custody_response.status_code == 201, custody_response.text
    assert custody_response.json()["to_organization_id"] == org_b.id

    list_response = client.get("/api/v1/shipments", headers=headers)
    assert list_response.status_code == 200
    assert len(list_response.json()) >= 1

    app.dependency_overrides.clear()
    session.close()


def test_rbac_and_org_boundaries() -> None:
    session = _build_session()
    app.dependency_overrides[get_db] = lambda: session

    org_a = Organization(name="Alpha Labs", slug="alpha-labs")
    org_b = Organization(name="Beta Pharma", slug="beta-pharma")
    session.add_all([org_a, org_b])
    session.flush()

    user_a = User(
        email=f"org-a-{uuid.uuid4()}@example.com",
        password_hash=hash_password("Password123!"),
        organization_id=org_a.id,
        role=UserRole.MANUFACTURER,
        is_active=True,
    )
    user_b = User(
        email=f"org-b-{uuid.uuid4()}@example.com",
        password_hash=hash_password("Password123!"),
        organization_id=org_b.id,
        role=UserRole.WAREHOUSE,
        is_active=True,
    )
    org_c = Organization(name="Gamma Distribution", slug="gamma-distribution")
    session.add(org_c)
    session.flush()
    user_c = User(
        email=f"org-c-{uuid.uuid4()}@example.com",
        password_hash=hash_password("Password123!"),
        organization_id=org_c.id,
        role=UserRole.HOSPITAL,
        is_active=True,
    )
    session.add_all([user_a, user_b, user_c])
    session.commit()

    product = Product(
        name="Cough Syrup",
        description="Cough remedy",
        manufacturer_id=org_a.id,
        storage_min_temp=2,
        storage_max_temp=8,
    )
    session.add(product)
    session.commit()

    batch = Batch(
        product_id=product.id,
        batch_number="RBAC-1001",
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
        status=ShipmentStatus.PLANNED,
    )
    session.add(shipment)
    session.commit()

    client = TestClient(app)

    a_headers = {"Authorization": f"Bearer {create_access_token(user_a.id)}"}
    b_headers = {"Authorization": f"Bearer {create_access_token(user_b.id)}"}
    c_headers = {"Authorization": f"Bearer {create_access_token(user_c.id)}"}

    forbidden = client.get(f"/api/v1/products/{product.id}", headers=b_headers)
    assert forbidden.status_code == 403

    allowed = client.get(f"/api/v1/products/{product.id}", headers=a_headers)
    assert allowed.status_code == 200
    assert allowed.json()["manufacturer_id"] == org_a.id

    assert client.get(f"/api/v1/products?organization_id={org_a.id}", headers=b_headers).status_code == 403
    assert client.get(f"/api/v1/batches?product_id={product.id}", headers=b_headers).status_code == 403
    assert client.get(f"/api/v1/shipments/{shipment.id}", headers=c_headers).status_code == 403

    forbidden_shipment_create = client.post(
        "/api/v1/shipments",
        json={
            "batch_id": batch.id,
            "origin_organization_id": org_b.id,
            "destination_organization_id": org_a.id,
        },
        headers=b_headers,
    )
    assert forbidden_shipment_create.status_code == 403

    app.dependency_overrides.clear()
    session.close()
