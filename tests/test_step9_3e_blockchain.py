import pytest
from fastapi.testclient import TestClient
from datetime import datetime, timezone
from unittest.mock import patch

from app.main import app
from app.models.organization import Organization
from app.models.user import User, UserRole
from app.models.product import Product
from app.models.batch import Batch
from app.models.shipment import Shipment, ShipmentStatus
from app.core.security import create_access_token
from sqlalchemy import create_engine
from sqlalchemy.orm import Session
from sqlalchemy.pool import StaticPool
from app.database.base import Base
from app.database.session import get_db
from app.services.fabric_service import FabricClientError

def _build_session() -> Session:
    engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
    Base.metadata.create_all(bind=engine)
    return Session(bind=engine)

def test_blockchain_history_access():
    db_session = _build_session()
    app.dependency_overrides[get_db] = lambda: db_session

    # Organizations
    org1 = Organization(name="Test Org 1", slug="test-org-1", created_at=datetime.now(timezone.utc))
    org2 = Organization(name="Test Org 2", slug="test-org-2", created_at=datetime.now(timezone.utc))
    org3 = Organization(name="Unrelated Org", slug="unrelated-org", created_at=datetime.now(timezone.utc))
    db_session.add_all([org1, org2, org3])
    db_session.commit()
    
    # Users
    user1 = User(email="user1@example.com", password_hash="hash", role=UserRole.ADMIN, organization_id=org1.id)
    user2 = User(email="user2@example.com", password_hash="hash", role=UserRole.LOGISTICS, organization_id=org3.id)
    auditor = User(email="auditor@example.com", password_hash="hash", role=UserRole.AUDITOR, organization_id=None)
    db_session.add_all([user1, user2, auditor])
    db_session.commit()
    
    # Product & Batch
    prod = Product(name="Test Product", manufacturer_id=org1.id, storage_min_temp=2.0, storage_max_temp=8.0, created_at=datetime.now(timezone.utc))
    db_session.add(prod)
    db_session.commit()
    
    batch = Batch(product_id=prod.id, batch_number="B1", quantity=100, manufactured_at=datetime.now(timezone.utc), expiry_date=datetime.now(timezone.utc), created_at=datetime.now(timezone.utc))
    db_session.add(batch)
    db_session.commit()
    
    # Shipment
    shipment = Shipment(
        batch_id=batch.id,
        origin_organization_id=org1.id,
        destination_organization_id=org2.id,
        status=ShipmentStatus.IN_TRANSIT,
        started_at=datetime.now(timezone.utc),
        created_at=datetime.now(timezone.utc)
    )
    db_session.add(shipment)
    db_session.commit()
    
    client = TestClient(app)
    
    # Tokens
    token_authorized = create_access_token(user1.id)
    token_unauthorized = create_access_token(user2.id)
    token_auditor = create_access_token(auditor.id)
    
    shipment_id = shipment.id
    
    # Mock fabric service
    mock_history = [
        {"eventId": "EVT-1", "eventType": "DISPATCHED", "location": "Loc1", "timestamp": "2026-09-20T00:00:00Z", "recordedBy": "user@example.com"}
    ]
    
    with patch("app.services.fabric_service.fabric_service.get_shipment_history", return_value=mock_history) as mock_get:
        # 1. Authorized Access
        response = client.get(f"/api/v1/shipments/{shipment_id}/blockchain-history", headers={"Authorization": f"Bearer {token_authorized}"})
        assert response.status_code == 200
        assert response.json() == mock_history
        mock_get.assert_called_once_with(f"SHIP-{shipment_id}")
        mock_get.reset_mock()
        
        # 2. Auditor Access (Auditors can view any shipment)
        response = client.get(f"/api/v1/shipments/{shipment_id}/blockchain-history", headers={"Authorization": f"Bearer {token_auditor}"})
        assert response.status_code == 200
        assert response.json() == mock_history
        mock_get.assert_called_once_with(f"SHIP-{shipment_id}")
        mock_get.reset_mock()
        
        # 3. Unauthorized Org Access (user2 belongs to org3, not involved in shipment)
        response = client.get(f"/api/v1/shipments/{shipment_id}/blockchain-history", headers={"Authorization": f"Bearer {token_unauthorized}"})
        assert response.status_code == 403
        mock_get.assert_not_called()
        
        # 4. Fabric Failure Simulation
        mock_get.side_effect = FabricClientError("Fabric node down")
        response = client.get(f"/api/v1/shipments/{shipment_id}/blockchain-history", headers={"Authorization": f"Bearer {token_authorized}"})
        assert response.status_code == 503
        assert "Blockchain history unavailable" in response.json()["detail"]
