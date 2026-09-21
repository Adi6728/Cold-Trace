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

def test_product_creation_authorization(client: TestClient):
    # Register Manufacturer
    email = f"mfg_{uuid.uuid4().hex}@example.com"
    r = client.post("/api/v1/auth/register", json={
        "email": email,
        "password": "password123",
        "role": "MANUFACTURER",
        "organization_name": "Test Org",
        "admin_registration_key": "super_secret_key_123"
    })
    assert r.status_code == 201
    user = r.json()
    org_id = user.get("organization_id")
    assert org_id is not None
    
    # Also verify that /auth/me returns organization_id
    login_resp = client.post("/api/v1/auth/login", json={"email": email, "password": "password123"})
    assert login_resp.status_code == 200
    token = login_resp.json()["access_token"]
    
    me_resp = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me_resp.status_code == 200
    me_data = me_resp.json()
    assert "organization_id" in me_data
    assert me_data["organization_id"] == org_id
    
    # 1. MANUFACTURER with organization_id can create a product for their organization
    p1 = client.post("/api/v1/products", json={
        "name": "Valid Product",
        "manufacturer_id": org_id,
        "storage_min_temp": 2,
        "storage_max_temp": 8
    }, headers={"Authorization": f"Bearer {token}"})
    assert p1.status_code == 201
    
    # 2. wrong organization is still rejected with 403
    p2 = client.post("/api/v1/products", json={
        "name": "Invalid Product",
        "manufacturer_id": org_id + 9999,
        "storage_min_temp": 2,
        "storage_max_temp": 8
    }, headers={"Authorization": f"Bearer {token}"})
    assert p2.status_code == 403
    assert "Products must be created for your own organization" in p2.text
