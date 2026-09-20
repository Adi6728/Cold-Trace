import pytest
import uuid
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

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
    with TestClient(app) as c:
        yield c

@pytest.fixture
def user_token(client: TestClient):
    email = f"readonly_user_{uuid.uuid4().hex}@example.com"
    client.post(
        "/api/v1/auth/register",
        json={
            "email": email,
            "password": "strongpassword123",
            "role": "USER"
        }
    )
    response = client.post(
        "/api/v1/auth/login",
        json={
            "email": email,
            "password": "strongpassword123"
        }
    )
    return response.json()["access_token"]

@pytest.fixture
def admin_token(client: TestClient, monkeypatch):
    from app.core.config import settings
    monkeypatch.setattr(settings, "ADMIN_REGISTRATION_KEY", "super_secret_key_123")
    
    # We must mock ADMIN login or manually create one, but ADMIN registration is forbidden.
    # Actually, we can just use the login endpoint directly if there is an admin seeded, 
    # but the simplest way is to directly create the admin in DB.
    pass

def test_user_can_read_products_and_batches(client: TestClient, user_token: str):
    headers = {"Authorization": f"Bearer {user_token}"}
    
    # Can read products
    res = client.get("/api/v1/products", headers=headers)
    assert res.status_code == 200
    assert isinstance(res.json(), list)
    
    # Can read batches
    res = client.get("/api/v1/batches", headers=headers)
    assert res.status_code == 200
    assert isinstance(res.json(), list)

def test_user_cannot_create_products(client: TestClient, user_token: str):
    headers = {"Authorization": f"Bearer {user_token}"}
    res = client.post("/api/v1/products", headers=headers, json={
        "name": "Test Product",
        "description": "Desc",
        "manufacturer_id": 1,
        "storage_min_temp": 2.0,
        "storage_max_temp": 8.0,
        "handling_instructions": "Keep cool"
    })
    # Since it's a mutation, USER shouldn't be allowed.
    assert res.status_code == 403

def test_user_shipments_return_empty_list_for_no_org(client: TestClient, user_token: str):
    # Authenticated original endpoints
    headers = {"Authorization": f"Bearer {user_token}"}
    res = client.get("/api/v1/shipments", headers=headers)
    assert res.status_code == 403 # Reverted to strict checking

def test_user_specific_shipment_returns_403_for_no_org(client: TestClient, user_token: str):
    headers = {"Authorization": f"Bearer {user_token}"}
    res = client.get("/api/v1/shipments/9999", headers=headers)
    # The shipment doesn't exist, but it checks permissions first
    assert res.status_code == 403

def test_user_sensors_return_empty_list_for_no_org(client: TestClient, user_token: str):
    headers = {"Authorization": f"Bearer {user_token}"}
    res = client.get("/api/v1/sensors", headers=headers)
    assert res.status_code == 403 # Reverted to strict checking

def test_user_can_access_sanitized_public_endpoints(client: TestClient, user_token: str):
    headers = {"Authorization": f"Bearer {user_token}"}
    
    # Can access public shipments
    res = client.get("/api/v1/public/shipments", headers=headers)
    assert res.status_code == 200
    assert isinstance(res.json(), list)
    
    # Can access public sensors
    res = client.get("/api/v1/public/sensors", headers=headers)
    assert res.status_code == 200
    assert isinstance(res.json(), list)

def test_user_cannot_acknowledge_alerts(client: TestClient, user_token: str):
    headers = {"Authorization": f"Bearer {user_token}"}
    res = client.patch("/api/v1/alerts/1/acknowledge", headers=headers)
    assert res.status_code == 403

