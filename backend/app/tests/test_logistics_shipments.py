import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models.user import User
from app.models.organization import Organization
from app.models.product import Product
from app.models.batch import Batch
from app.models.shipment import Shipment, ShipmentStatus
from app.core.permissions import UserRole
from app.core.security import create_access_token
from datetime import datetime, timezone
from app.main import app
from app.database.session import SessionLocal

@pytest.fixture(scope="module")
def db_session():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@pytest.fixture(scope="module")
def client():
    return TestClient(app)

def test_logistics_can_list_shipments_but_not_batches(client: TestClient, db_session: Session):
    db = db_session
    import uuid
    # Create orgs
    org1 = Organization(name="Logistics Org", slug=f"logistics-org-{uuid.uuid4().hex[:8]}")
    org2 = Organization(name="Hospital Org", slug=f"hospital-org-{uuid.uuid4().hex[:8]}")
    db.add_all([org1, org2])
    db.commit()

    # Create LOGISTICS user
    user = User(
        email=f"logistics2-{uuid.uuid4().hex[:8]}@example.com",
        password_hash="hashed_password",
        role=UserRole.LOGISTICS,
        organization_id=org1.id
    )
    db.add(user)
    db.commit()

    # Create Product and Batch
    prod = Product(name="Test Product", manufacturer_id=org1.id, storage_min_temp=2.0, storage_max_temp=8.0)
    db.add(prod)
    db.commit()
    
    batch = Batch(product_id=prod.id, batch_number="B-1234", quantity=100, manufactured_at=datetime.now(timezone.utc), expiry_date=datetime.now(timezone.utc))
    db.add(batch)
    db.commit()

    # Create Shipment
    ship = Shipment(
        batch_id=batch.id,
        origin_organization_id=org1.id,
        destination_organization_id=org2.id,
        status=ShipmentStatus.PLANNED
    )
    db.add(ship)
    db.commit()

    # Generate token
    token = create_access_token(user.id)
    headers = {"Authorization": f"Bearer {token}"}

    # Verify denied master batch listing
    resp_batches = client.get("/api/v1/batches", headers=headers)
    assert resp_batches.status_code == 403, "Logistics must be denied master batch listing"

    # Verify shipments can be listed
    resp_ship = client.get("/api/v1/shipments", headers=headers)
    assert resp_ship.status_code == 200, "Logistics must be able to list shipments"
    
    data = resp_ship.json()
    assert len(data) == 1
    # Verify the embedded batch and product info exists
    assert "batch" in data[0]
    assert data[0]["batch"]["batch_number"] == "B-1234"
    assert data[0]["batch"]["product"]["name"] == "Test Product"
