import logging
import sys
from fastapi.testclient import TestClient

from app.main import app
from app.database.session import SessionLocal
from app.models.user import User
from app.models.shipment import Shipment
from app.core.permissions import UserRole
from app.core.security import create_access_token
from app.schemas.shipments import ShipmentStatus
from unittest.mock import patch

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

client = TestClient(app)

@patch("app.services.fabric_service.fabric_service.record_shipment_event")
def run_e2e(mock_fabric):
    db = SessionLocal()
    try:
        # Generate tokens for each role
        tokens = {}
        users = {}
        roles = [
            UserRole.ADMIN,
            UserRole.MANUFACTURER,
            UserRole.LOGISTICS,
            UserRole.WAREHOUSE,
            UserRole.HOSPITAL,
            UserRole.AUDITOR
        ]
        
        # We need an organization ID that matches a shipment
        org_id = 1
        
        for role in roles:
            user = db.query(User).filter(User.role == role, User.organization_id == org_id).first()
            if not user:
                user = db.query(User).filter(User.role == role).first()
                if not user:
                    user = User(
                        email=f"test_{role.name.lower()}_shipments@example.com",
                        password_hash="dummy",
                        role=role,
                        organization_id=org_id if role != UserRole.ADMIN else None
                    )
                    db.add(user)
                    db.commit()
                    db.refresh(user)
            
            token = create_access_token(user.id)
            tokens[role] = token
            users[role] = user

        # Find or create a shipment for testing
        shipment = db.query(Shipment).filter(Shipment.origin_organization_id == org_id).first()
        if not shipment:
            logger.error("No shipment found for testing. Please ensure at least one shipment exists with origin_organization_id=1.")
            sys.exit(1)
            
        shipment_id = shipment.id

        logger.info(f"Testing POST /api/v1/shipments/{shipment_id}/events")
        # Allowed for Events: ADMIN, MANUFACTURER, LOGISTICS, WAREHOUSE, HOSPITAL
        allowed_events = {UserRole.ADMIN, UserRole.MANUFACTURER, UserRole.LOGISTICS, UserRole.WAREHOUSE, UserRole.HOSPITAL}
        for role, token in tokens.items():
            payload = {
                "event_type": "CREATED",
                "description": f"Test event from {role.name}",
                "location": "Test Loc",
                "occurred_at": "2026-09-19T23:00:00Z"
            }
            resp = client.post(f"/api/v1/shipments/{shipment_id}/events", headers={"Authorization": f"Bearer {token}"}, json=payload)
            if role in allowed_events:
                assert resp.status_code in {200, 201}, f"{role.name} should be allowed (201) to create events, got {resp.status_code}. Detail: {resp.text}"
            else:
                assert resp.status_code == 403, f"{role.name} should be denied (403) from creating events, got {resp.status_code}"

        logger.info(f"Testing POST /api/v1/shipments/{shipment_id}/custody")
        # Allowed for Custody: ADMIN, LOGISTICS, WAREHOUSE
        allowed_custody = {UserRole.ADMIN, UserRole.LOGISTICS, UserRole.WAREHOUSE}
        for role, token in tokens.items():
            payload = {
                "from_organization_id": org_id,
                "to_organization_id": 2, # Assuming org 2 exists, otherwise validation error 404, but RBAC check happens first
                "transferred_at": "2026-09-19T23:00:00Z",
                "notes": f"Transfer by {role.name}"
            }
            resp = client.post(f"/api/v1/shipments/{shipment_id}/custody", headers={"Authorization": f"Bearer {token}"}, json=payload)
            if role in allowed_custody:
                # 201 Created or 404/422 if dummy data isn't perfect, but NOT 403
                assert resp.status_code != 403, f"{role.name} should not get 403 for custody transfer, got {resp.status_code}"
            else:
                assert resp.status_code == 403, f"{role.name} should be denied (403) from creating custody, got {resp.status_code}"

        logger.info("Shipment mutation RBAC backend endpoints hardened and verified successfully!")
        
    finally:
        db.close()

if __name__ == "__main__":
    try:
        run_e2e()
    except AssertionError as e:
        logger.error(f"Test Failed: {e}")
        sys.exit(1)
