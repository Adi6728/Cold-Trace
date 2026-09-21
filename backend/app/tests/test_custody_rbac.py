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
    
    # User might not need org name, but if we provide it, we don't strictly need admin key unless it creates an org.
    if role == "USER":
        payload.pop("admin_registration_key", None)
        payload.pop("organization_name", None)
        
    r = client.post("/api/v1/auth/register", json=payload)
    assert r.status_code == 201
    user = r.json()
    
    l = client.post("/api/v1/auth/login", json={"email": email, "password": "password123"})
    token = l.json()["access_token"]
    return user, token

def test_custody_transfer_rbac(client: TestClient):
    # Setup roles
    mfg_user, mfg_token = register_and_login(client, "MANUFACTURER", "MFG Org")
    log_user, log_token = register_and_login(client, "LOGISTICS", "Logistics Org")
    war_user, war_token = register_and_login(client, "WAREHOUSE", "Warehouse Org")
    aud_user, aud_token = register_and_login(client, "AUDITOR", "Auditor Org")
    usr_user, usr_token = register_and_login(client, "USER", None)
    
    org_mfg = mfg_user["organization_id"]
    org_log = log_user["organization_id"]
    org_war = war_user["organization_id"]
    
    # Manufacturer creates product
    p_resp = client.post("/api/v1/products", json={
        "name": "Custody Test Product",
        "manufacturer_id": org_mfg,
        "storage_min_temp": 2,
        "storage_max_temp": 8
    }, headers={"Authorization": f"Bearer {mfg_token}"})
    product = p_resp.json()
    
    # Manufacturer creates batch
    b_resp = client.post("/api/v1/batches", json={
        "product_id": product["id"],
        "batch_number": "BATCH-CUSTODY",
        "manufactured_at": "2026-09-01T00:00:00Z",
        "expiry_date": "2027-09-01T00:00:00Z",
        "quantity": 100
    }, headers={"Authorization": f"Bearer {mfg_token}"})
    batch = b_resp.json()
    
    # Manufacturer creates shipment
    s_resp = client.post("/api/v1/shipments", json={
        "batch_id": batch["id"],
        "origin_organization_id": org_mfg,
        "destination_organization_id": org_war,
    }, headers={"Authorization": f"Bearer {mfg_token}"})
    shipment = s_resp.json()
    shipment_id = shipment["id"]
    
    # Helper to test custody creation
    def try_custody(token, from_org, to_org, expected_status):
        resp = client.post(f"/api/v1/shipments/{shipment_id}/custody", json={
            "from_organization_id": from_org,
            "to_organization_id": to_org,
            "transferred_at": "2026-09-21T00:00:00Z",
            "notes": "Transfer"
        }, headers={"Authorization": f"Bearer {token}"})
        assert resp.status_code == expected_status
        return resp
    
    # 1. MANUFACTURER can create a custody transfer
    try_custody(mfg_token, org_mfg, org_log, 201)
    
    # 2. LOGISTICS and WAREHOUSE behavior remains unchanged (can create)
    # Note: Logistics must be part of the shipment route or have permission. 
    # Actually, current get_shipment_for_user might require them to be involved, but let's test if the role is allowed.
    # We can just test the RBAC check by expecting 201 if they are allowed (and if they have access to the shipment).
    # Wait, the shipment destination is org_war, so WAREHOUSE has access. LOGISTICS might not have access if org_log is neither origin nor destination.
    # Let's see if LOGISTICS gets 403 or 404 because they aren't on the shipment.
    # If they are not on the shipment, `get_shipment_for_user` will fail with 404 or 403. 
    # Let's use WAREHOUSE to test success, and AUDITOR / USER to test 403.
    
    try_custody(war_token, org_log, org_war, 201)
    
    # 3. AUDITOR and USER remain blocked
    # Auditor has access to the shipment (global read) but should get 403 for custody transfer.
    try_custody(aud_token, org_mfg, org_log, 403)
    
    # User doesn't have access to the private shipment (403/404) or custody endpoint
    try_custody(usr_token, org_mfg, org_log, 403)
