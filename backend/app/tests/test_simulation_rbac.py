import pytest
import uuid
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.main import app
from app.database.session import SessionLocal
from app.core.config import settings

@pytest.fixture(scope="module")
def db_session():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@pytest.fixture(autouse=True)
def set_admin_key(monkeypatch):
    monkeypatch.setattr(settings, "ADMIN_REGISTRATION_KEY", "super_secret_key_123")

@pytest.fixture(scope="module")
def client():
    with TestClient(app) as c:
        yield c

def register_and_login(client, role, org_name):
    email = f"test_{role}_{uuid.uuid4().hex}@example.com"
    payload = {
        "email": email,
        "password": "password123",
        "role": role,
    }
    if org_name:
        payload["organization_name"] = org_name
        if role != "USER":
            payload["admin_registration_key"] = "super_secret_key_123"
    
    if role == "USER":
        payload.pop("admin_registration_key", None)
        payload.pop("organization_name", None)
        
    r = client.post("/api/v1/auth/register", json=payload)
    assert r.status_code == 201
    user = r.json()
    
    l = client.post("/api/v1/auth/login", json={"email": email, "password": "password123"})
    token = l.json()["access_token"]
    return user, token

from app.models.user import User
from app.core.security import hash_password
from app.core.permissions import UserRole
from app.services.auth_service import create_token_for_user

def test_simulation_endpoint_rbac(client: TestClient, db_session: Session):
    mfg1_user, mfg1_token = register_and_login(client, "MANUFACTURER", "MFG1 Org")
    mfg2_user, mfg2_token = register_and_login(client, "MANUFACTURER", "MFG2 Org")
    aud_user, aud_token = register_and_login(client, "AUDITOR", "Auditor Org")
    usr_user, usr_token = register_and_login(client, "USER", None)
    
    # MFG1 creates a shipment and a sensor
    org_mfg1 = mfg1_user["organization_id"]
    p_resp = client.post("/api/v1/products", json={"name": "Prod 1", "manufacturer_id": org_mfg1, "storage_min_temp": 2, "storage_max_temp": 8}, headers={"Authorization": f"Bearer {mfg1_token}"})
    b_resp = client.post("/api/v1/batches", json={"product_id": p_resp.json()["id"], "batch_number": "B1", "manufactured_at": "2026-09-01T00:00:00Z", "expiry_date": "2027-09-01T00:00:00Z", "quantity": 100}, headers={"Authorization": f"Bearer {mfg1_token}"})
    s_resp = client.post("/api/v1/shipments", json={"batch_id": b_resp.json()["id"], "origin_organization_id": org_mfg1, "destination_organization_id": aud_user["organization_id"]}, headers={"Authorization": f"Bearer {mfg1_token}"})
    shipment_id = s_resp.json()["id"]

    sensor_code = f"SN-TEST-{uuid.uuid4().hex[:8]}"
    c1 = client.post("/api/v1/sensors/", json={
        "sensor_code": sensor_code,
        "shipment_id": shipment_id,
        "status": "ACTIVE"
    }, headers={"Authorization": f"Bearer {mfg1_token}"})
    sensor_id = c1.json()["id"]

    # 1. Authorized MANUFACTURER can access the simulation endpoint (should return 200 or 400 depending on mqtt but NOT 403 or 500)
    # The endpoint will attempt to start simulation. If MQTT fails or is unavailable it might throw 400, but we just verify it reaches the logic.
    sim1 = client.post(f"/api/v1/sensors/{sensor_id}/simulation/start", headers={"Authorization": f"Bearer {mfg1_token}"})
    assert sim1.status_code in (200, 400), f"Expected 200 or 400 but got {sim1.status_code}"
    
    # Stop simulation
    if sim1.status_code == 200:
        client.post(f"/api/v1/sensors/{sensor_id}/simulation/stop", headers={"Authorization": f"Bearer {mfg1_token}"})

    # 2. USER/AUDITOR receive 403
    sim_usr = client.post(f"/api/v1/sensors/{sensor_id}/simulation/start", headers={"Authorization": f"Bearer {usr_token}"})
    assert sim_usr.status_code == 403

    sim_aud = client.post(f"/api/v1/sensors/{sensor_id}/simulation/start", headers={"Authorization": f"Bearer {aud_token}"})
    assert sim_aud.status_code == 403

    # 3. Cross-organization sensor access remains denied
    sim_mfg2 = client.post(f"/api/v1/sensors/{sensor_id}/simulation/start", headers={"Authorization": f"Bearer {mfg2_token}"})
    assert sim_mfg2.status_code == 403
