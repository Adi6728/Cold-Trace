import logging
import sys
from fastapi.testclient import TestClient

from app.main import app
from app.database.session import SessionLocal
from app.models.user import User
from app.core.permissions import UserRole
from app.core.security import create_access_token

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

client = TestClient(app)

def run_e2e():
    db = SessionLocal()
    try:
        # Generate tokens for each role
        tokens = {}
        roles = [
            UserRole.ADMIN,
            UserRole.MANUFACTURER,
            UserRole.LOGISTICS,
            UserRole.WAREHOUSE,
            UserRole.HOSPITAL,
            UserRole.AUDITOR
        ]
        
        for role in roles:
            # Check if user exists or create dummy
            user = db.query(User).filter(User.role == role).first()
            if not user:
                user = User(
                    email=f"test_{role.name.lower()}@example.com",
                    password_hash="dummy",
                    role=role,
                    organization_id=1 if role != UserRole.ADMIN else None
                )
                db.add(user)
                db.commit()
                db.refresh(user)
            
            token = create_access_token(user.id)
            tokens[role] = token
            
        logger.info("Testing GET /api/v1/products")
        for role, token in tokens.items():
            resp = client.get("/api/v1/products", headers={"Authorization": f"Bearer {token}"})
            if role in {UserRole.LOGISTICS, UserRole.WAREHOUSE}:
                assert resp.status_code == 403, f"{role.name} should be 403 for products, got {resp.status_code}"
            else:
                assert resp.status_code == 200, f"{role.name} should be 200 for products, got {resp.status_code}"

        logger.info("Testing GET /api/v1/batches")
        for role, token in tokens.items():
            resp = client.get("/api/v1/batches", headers={"Authorization": f"Bearer {token}"})
            if role in {UserRole.LOGISTICS, UserRole.WAREHOUSE}:
                assert resp.status_code == 403, f"{role.name} should be 403 for batches, got {resp.status_code}"
            else:
                assert resp.status_code == 200, f"{role.name} should be 200 for batches, got {resp.status_code}"
                
        logger.info("RBAC backend endpoints hardened and verified successfully!")
        
    finally:
        db.close()

if __name__ == "__main__":
    try:
        run_e2e()
    except AssertionError as e:
        logger.error(f"Test Failed: {e}")
        sys.exit(1)
