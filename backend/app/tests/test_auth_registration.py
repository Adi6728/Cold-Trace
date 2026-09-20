import pytest
import uuid
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.permissions import UserRole
from app.core.security import verify_password
from app.models.user import User

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

@pytest.fixture(autouse=True)
def set_admin_key(monkeypatch):
    monkeypatch.setattr(settings, "ADMIN_REGISTRATION_KEY", "super_secret_key_123")

def test_register_user_success(client: TestClient, db_session: Session):
    email = f"test_user_reg_{uuid.uuid4().hex}@example.com"
    response = client.post(
        "/api/v1/auth/register",
        json={
            "email": email,
            "password": "strongpassword123",
            "role": "USER"
        }
    )
    assert response.status_code == 201
    data = response.json()
    assert data["email"] == email
    assert data["role"] == "USER"
    assert "password_hash" not in data
    assert "admin_registration_key" not in data
    
    # Check DB
    user = db_session.query(User).filter(User.email == email).first()
    assert user is not None
    assert verify_password("strongpassword123", user.password_hash)

def test_register_privileged_without_key(client: TestClient):
    response = client.post(
        "/api/v1/auth/register",
        json={
            "email": "mfg@example.com",
            "password": "strongpassword123",
            "role": "MANUFACTURER"
        }
    )
    assert response.status_code == 403

def test_register_privileged_with_wrong_key(client: TestClient):
    response = client.post(
        "/api/v1/auth/register",
        json={
            "email": "mfg2@example.com",
            "password": "strongpassword123",
            "role": "MANUFACTURER",
            "admin_registration_key": "wrong_key"
        }
    )
    assert response.status_code == 403

def test_register_privileged_with_correct_key(client: TestClient, db_session: Session):
    roles_to_test = [UserRole.MANUFACTURER, UserRole.LOGISTICS, UserRole.WAREHOUSE, UserRole.HOSPITAL, UserRole.AUDITOR]
    for role in roles_to_test:
        email = f"test_{role.value.lower()}_{uuid.uuid4().hex}@example.com"
        response = client.post(
            "/api/v1/auth/register",
            json={
                "email": email,
                "password": "strongpassword123",
                "role": role.value,
                "admin_registration_key": "super_secret_key_123",
                "organization_name": f"Test {role.value} Org"
            }
        )
        assert response.status_code == 201
        assert response.json()["role"] == role.value

def test_register_privileged_missing_org_name_fails(client: TestClient):
    response = client.post(
        "/api/v1/auth/register",
        json={
            "email": "missingorg@example.com",
            "password": "strongpassword123",
            "role": "MANUFACTURER",
            "admin_registration_key": "super_secret_key_123"
        }
    )
    assert response.status_code == 422

def test_register_privileged_creates_organization(client: TestClient, db_session: Session):
    org_name = f"New Org {uuid.uuid4().hex}"
    email = f"orgcreator_{uuid.uuid4().hex}@example.com"
    response = client.post(
        "/api/v1/auth/register",
        json={
            "email": email,
            "password": "strongpassword123",
            "role": "MANUFACTURER",
            "admin_registration_key": "super_secret_key_123",
            "organization_name": org_name
        }
    )
    assert response.status_code == 201
    
    user = db_session.query(User).filter(User.email == email).first()
    assert user is not None
    assert user.organization_id is not None
    assert user.organization.name == org_name

def test_register_privileged_reuses_organization(client: TestClient, db_session: Session):
    org_name = f"Shared Org {uuid.uuid4().hex}"
    email1 = f"user1_{uuid.uuid4().hex}@example.com"
    email2 = f"user2_{uuid.uuid4().hex}@example.com"
    
    # User 1 registers
    client.post(
        "/api/v1/auth/register",
        json={
            "email": email1,
            "password": "strongpassword123",
            "role": "MANUFACTURER",
            "admin_registration_key": "super_secret_key_123",
            "organization_name": org_name
        }
    )
    
    # User 2 registers with the same org name
    client.post(
        "/api/v1/auth/register",
        json={
            "email": email2,
            "password": "strongpassword123",
            "role": "LOGISTICS",
            "admin_registration_key": "super_secret_key_123",
            "organization_name": org_name
        }
    )
    
    user1 = db_session.query(User).filter(User.email == email1).first()
    user2 = db_session.query(User).filter(User.email == email2).first()
    
    assert user1.organization_id is not None
    assert user2.organization_id is not None
    assert user1.organization_id == user2.organization_id

def test_register_admin_forbidden(client: TestClient):
    response = client.post(
        "/api/v1/auth/register",
        json={
            "email": "admin_hacker@example.com",
            "password": "strongpassword123",
            "role": "ADMIN",
            "admin_registration_key": "super_secret_key_123"
        }
    )
    assert response.status_code == 403

def test_register_duplicate_email(client: TestClient):
    email = f"duplicate_{uuid.uuid4().hex}@example.com"
    # First registration
    client.post(
        "/api/v1/auth/register",
        json={
            "email": email,
            "password": "strongpassword123",
            "role": "USER"
        }
    )
    
    # Second registration with same email
    response = client.post(
        "/api/v1/auth/register",
        json={
            "email": email,
            "password": "differentpassword",
            "role": "USER"
        }
    )
    assert response.status_code == 409

def test_newly_registered_user_can_login(client: TestClient):
    email = f"login_test_{uuid.uuid4().hex}@example.com"
    # Register
    client.post(
        "/api/v1/auth/register",
        json={
            "email": email,
            "password": "strongpassword123",
            "role": "USER"
        }
    )
    
    # Login
    response = client.post(
        "/api/v1/auth/login",
        json={
            "email": email,
            "password": "strongpassword123"
        }
    )
    assert response.status_code == 200
    assert "access_token" in response.json()

