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

def test_sensor_provisioning_rbac(client: TestClient, db_session: Session):
    mfg1_user, mfg1_token = register_and_login(client, "MANUFACTURER", "MFG1 Org")
    mfg2_user, mfg2_token = register_and_login(client, "MANUFACTURER", "MFG2 Org")
    war_user, war_token = register_and_login(client, "WAREHOUSE", "Warehouse Org")
    aud_user, aud_token = register_and_login(client, "AUDITOR", "Auditor Org")
    usr_user, usr_token = register_and_login(client, "USER", None)
    
    # Create ADMIN directly in DB
    admin_email = f"admin_{uuid.uuid4().hex}@example.com"
    admin_user = User(email=admin_email, password_hash=hash_password("password123"), role=UserRole.ADMIN, is_active=True, organization_id=None)
    db_session.add(admin_user)
    db_session.commit()
    db_session.refresh(admin_user)
    adm_token = create_token_for_user(admin_user)

    org_mfg1 = mfg1_user["organization_id"]
    org_mfg2 = mfg2_user["organization_id"]
    org_war = war_user["organization_id"]

    # MFG1 creates a shipment
    p_resp = client.post("/api/v1/products", json={"name": "Prod 1", "manufacturer_id": org_mfg1, "storage_min_temp": 2, "storage_max_temp": 8}, headers={"Authorization": f"Bearer {mfg1_token}"})
    b_resp = client.post("/api/v1/batches", json={"product_id": p_resp.json()["id"], "batch_number": "B1", "manufactured_at": "2026-09-01T00:00:00Z", "expiry_date": "2027-09-01T00:00:00Z", "quantity": 100}, headers={"Authorization": f"Bearer {mfg1_token}"})
    s_resp = client.post("/api/v1/shipments", json={"batch_id": b_resp.json()["id"], "origin_organization_id": org_mfg1, "destination_organization_id": org_war}, headers={"Authorization": f"Bearer {mfg1_token}"})
    shipment_id = s_resp.json()["id"]

    # 1. MFG1 can create sensor for its own shipment
    sensor_code = f"SN-TEST-{uuid.uuid4().hex[:8]}"
    c1 = client.post("/api/v1/sensors/", json={
        "sensor_code": sensor_code,
        "shipment_id": shipment_id,
        "status": "ACTIVE"
    }, headers={"Authorization": f"Bearer {mfg1_token}"})
    assert c1.status_code == 200
    assert c1.json()["sensor_code"] == sensor_code

    # 2. Duplicate sensor_code -> 400
    c_dup = client.post("/api/v1/sensors/", json={
        "sensor_code": sensor_code,
        "shipment_id": shipment_id,
        "status": "ACTIVE"
    }, headers={"Authorization": f"Bearer {mfg1_token}"})
    assert c_dup.status_code == 400
    assert "already registered" in c_dup.json()["detail"]

    # 3. Created ACTIVE sensor can ingest telemetry
    from app.services.sensor_service import SensorService
    from app.schemas.sensors import TelemetryPayload
    from datetime import datetime
    
    reading = SensorService.ingest_telemetry(db_session, TelemetryPayload(
        sensor_code=sensor_code,
        shipment_id=shipment_id,
        temperature=5.0,
        humidity=None,
        recorded_at=datetime.utcnow()
    ))
    assert reading.temperature == 5.0

    # 4. MFG2 cannot create sensor for MFG1's shipment (403)
    c2 = client.post("/api/v1/sensors/", json={
        "sensor_code": f"SN-TEST-{uuid.uuid4().hex[:8]}",
        "shipment_id": shipment_id,
        "status": "ACTIVE"
    }, headers={"Authorization": f"Bearer {mfg2_token}"})
    assert c2.status_code == 403

    # 5. USER and AUDITOR cannot create sensors (blocked at endpoint)
    c3 = client.post("/api/v1/sensors/", json={
        "sensor_code": f"SN-TEST-{uuid.uuid4().hex[:8]}",
        "shipment_id": shipment_id,
        "status": "ACTIVE"
    }, headers={"Authorization": f"Bearer {usr_token}"})
    assert c3.status_code == 403

    c4 = client.post("/api/v1/sensors/", json={
        "sensor_code": f"SN-TEST-{uuid.uuid4().hex[:8]}",
        "shipment_id": shipment_id,
        "status": "ACTIVE"
    }, headers={"Authorization": f"Bearer {aud_token}"})
    assert c4.status_code == 403

    # 6. ADMIN can create sensor for any shipment (due to get_shipment_for_user ADMIN privileges)
    c5 = client.post("/api/v1/sensors/", json={
        "sensor_code": f"SN-TEST-{uuid.uuid4().hex[:8]}",
        "shipment_id": shipment_id,
        "status": "ACTIVE"
    }, headers={"Authorization": f"Bearer {adm_token}"})
    assert c5.status_code == 200
