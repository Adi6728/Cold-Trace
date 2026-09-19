import pytest
import uuid
from datetime import datetime, timezone, timedelta
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session
from sqlalchemy.pool import StaticPool

from app.database.base import Base
from app.database.session import get_db
from app.main import app
from app.core.permissions import UserRole
from app.core.security import create_access_token, hash_password
from app.models.user import User
from app.models.organization import Organization
from app.models.product import Product
from app.models.batch import Batch, BatchStatus
from app.models.shipment import Shipment, ShipmentStatus
from app.models.sensor import Sensor, SensorStatus
from app.schemas.sensors import TelemetryPayload
from app.services.sensor_service import SensorService

def _build_session() -> Session:
    engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
    Base.metadata.create_all(bind=engine)
    return Session(bind=engine)

def test_sensor_read_apis():
    db_session = _build_session()
    app.dependency_overrides[get_db] = lambda: db_session

    org_a = Organization(name="Org A", slug="org-a")
    org_b = Organization(name="Org B", slug="org-b")
    db_session.add_all([org_a, org_b])
    db_session.flush()

    user_a = User(
        email=f"usera-{uuid.uuid4()}@example.com",
        password_hash=hash_password("Password123!"),
        organization_id=org_a.id,
        role=UserRole.LOGISTICS,
        is_active=True,
    )
    user_b = User(
        email=f"userb-{uuid.uuid4()}@example.com",
        password_hash=hash_password("Password123!"),
        organization_id=org_b.id,
        role=UserRole.LOGISTICS,
        is_active=True,
    )
    db_session.add_all([user_a, user_b])
    db_session.commit()

    client = TestClient(app)
    token_a = create_access_token(user_a.id)
    token_b = create_access_token(user_b.id)
    headers_a = {"Authorization": f"Bearer {token_a}"}
    headers_b = {"Authorization": f"Bearer {token_b}"}

    # Setup Data for Org A
    product = Product(name="Vaccine A", description="Test", manufacturer_id=org_a.id, storage_min_temp=2.0, storage_max_temp=8.0)
    db_session.add(product)
    db_session.commit()
    
    batch = Batch(product_id=product.id, batch_number="B1", quantity=100, status=BatchStatus.IN_PRODUCTION, manufactured_at=datetime.now(timezone.utc), expiry_date=datetime.now(timezone.utc))
    db_session.add(batch)
    db_session.commit()
    
    shipment = Shipment(batch_id=batch.id, origin_organization_id=org_a.id, destination_organization_id=org_a.id, status=ShipmentStatus.IN_TRANSIT)
    db_session.add(shipment)
    db_session.commit()
    
    sensor = Sensor(sensor_code="SENS-READ-01", shipment_id=shipment.id, status=SensorStatus.ACTIVE)
    db_session.add(sensor)
    db_session.commit()
    
    t0 = datetime.now(timezone.utc)
    t1 = t0 + timedelta(minutes=10)

    # Ingest Readings
    SensorService.ingest_telemetry(db_session, TelemetryPayload(sensor_code="SENS-READ-01", shipment_id=shipment.id, temperature=5.0, humidity=50.0, recorded_at=t0))
    SensorService.ingest_telemetry(db_session, TelemetryPayload(sensor_code="SENS-READ-01", shipment_id=shipment.id, temperature=5.2, humidity=50.0, recorded_at=t1))
    
    # 1. Successful read of sensors scoped to org
    res_a = client.get("/api/v1/sensors", headers=headers_a)
    assert res_a.status_code == 200
    assert len(res_a.json()) == 1
    assert res_a.json()[0]["sensor_code"] == "SENS-READ-01"

    # User B should see 0 sensors (since they are in Org B and shipment is for Org A)
    res_b = client.get("/api/v1/sensors", headers=headers_b)
    assert res_b.status_code == 200
    assert len(res_b.json()) == 0

    # 2. Successful read of sensor readings (User A)
    res_readings = client.get(f"/api/v1/sensors/{sensor.id}/readings", headers=headers_a)
    assert res_readings.status_code == 200
    readings = res_readings.json()
    assert len(readings) == 2
    # newest first
    assert readings[0]["temperature"] == 5.2
    assert readings[1]["temperature"] == 5.0

    # 3. Cross-organization access denial (User B trying to read User A's sensor readings)
    res_readings_b = client.get(f"/api/v1/sensors/{sensor.id}/readings", headers=headers_b)
    assert res_readings_b.status_code == 403

    # 4. Missing sensor
    res_missing = client.get("/api/v1/sensors/999/readings", headers=headers_a)
    assert res_missing.status_code == 404

    app.dependency_overrides.clear()
    db_session.close()
