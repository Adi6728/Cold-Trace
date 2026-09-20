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
from app.models.alert import Alert, AlertSeverity, AlertStatus
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


def test_alert_generation_and_recovery():
    db_session = _build_session()
    app.dependency_overrides[get_db] = lambda: db_session

    org_a = Organization(name="Org A", slug="org-a")
    db_session.add(org_a)
    db_session.flush()

    admin = User(
        email=f"admin-{uuid.uuid4()}@example.com",
        password_hash=hash_password("Password123!"),
        organization_id=org_a.id,
        role=UserRole.ADMIN,
        is_active=True,
    )
    db_session.add(admin)
    db_session.commit()
    
    auditor = User(
        email=f"auditor-{uuid.uuid4()}@example.com",
        password_hash=hash_password("Password123!"),
        organization_id=org_a.id,
        role=UserRole.AUDITOR,
        is_active=True,
    )
    db_session.add(auditor)
    db_session.commit()

    client = TestClient(app)
    token = create_access_token(admin.id)
    admin_token_headers = {"Authorization": f"Bearer {token}"}
    auditor_token = create_access_token(auditor.id)
    auditor_token_headers = {"Authorization": f"Bearer {auditor_token}"}

    # 1. Setup Data
    product = Product(name="Vaccine A", description="Test", manufacturer_id=org_a.id, storage_min_temp=2.0, storage_max_temp=8.0)
    db_session.add(product)
    db_session.commit()
    
    batch = Batch(product_id=product.id, batch_number="B1", quantity=100, status=BatchStatus.IN_PRODUCTION, manufactured_at=datetime.now(timezone.utc), expiry_date=datetime.now(timezone.utc))
    db_session.add(batch)
    db_session.commit()
    
    shipment = Shipment(batch_id=batch.id, origin_organization_id=org_a.id, destination_organization_id=org_a.id, status=ShipmentStatus.IN_TRANSIT)
    db_session.add(shipment)
    db_session.commit()
    
    sensor = Sensor(sensor_code="SENS-ALERT-01", shipment_id=shipment.id, status=SensorStatus.ACTIVE)
    db_session.add(sensor)
    db_session.commit()
    
    t0 = datetime.now(timezone.utc)

    # 2. Ingest Normal Reading (No alerts)
    payload_normal = TelemetryPayload(sensor_code="SENS-ALERT-01", shipment_id=shipment.id, temperature=5.0, humidity=50.0, recorded_at=t0)
    SensorService.ingest_telemetry(db_session, payload_normal)
    
    alerts = db_session.query(Alert).filter_by(shipment_id=shipment.id).all()
    assert len(alerts) == 0
    
    # 3. Ingest Slight Excursion (Should NOT create alert yet because duration = 0 < 15 mins)
    t1 = t0 + timedelta(minutes=5)
    payload_excursion_1 = TelemetryPayload(sensor_code="SENS-ALERT-01", shipment_id=shipment.id, temperature=9.0, humidity=50.0, recorded_at=t1)
    SensorService.ingest_telemetry(db_session, payload_excursion_1)
    
    alerts = db_session.query(Alert).filter_by(shipment_id=shipment.id).all()
    assert len(alerts) == 0  # Still 0 because duration is 0
    
    # 4. Sustained Excursion (Should create alert because duration = 16 mins >= 15 mins)
    t2 = t1 + timedelta(minutes=16)
    payload_excursion_2 = TelemetryPayload(sensor_code="SENS-ALERT-01", shipment_id=shipment.id, temperature=9.0, humidity=50.0, recorded_at=t2)
    SensorService.ingest_telemetry(db_session, payload_excursion_2)
    
    alerts = db_session.query(Alert).filter_by(shipment_id=shipment.id).all()
    assert len(alerts) == 1
    assert alerts[0].status == AlertStatus.OPEN
    assert alerts[0].severity == AlertSeverity.MEDIUM
    assert alerts[0].latest_temperature == 9.0
    
    # 5. Duplicate/Sustained Excursion (Should UPDATE same alert, not create new)
    t3 = t2 + timedelta(minutes=5)
    payload_sustained = TelemetryPayload(sensor_code="SENS-ALERT-01", shipment_id=shipment.id, temperature=9.5, humidity=50.0, recorded_at=t3)
    SensorService.ingest_telemetry(db_session, payload_sustained)
    
    alerts = db_session.query(Alert).filter_by(shipment_id=shipment.id).all()
    assert len(alerts) == 1
    assert alerts[0].status == AlertStatus.OPEN
    assert alerts[0].latest_temperature == 9.5
    
    # 6. Severe Excursion (Should escalate severity)
    t4 = t3 + timedelta(minutes=5)
    payload_severe = TelemetryPayload(sensor_code="SENS-ALERT-01", shipment_id=shipment.id, temperature=14.0, humidity=50.0, recorded_at=t4)
    SensorService.ingest_telemetry(db_session, payload_severe)
    
    db_session.refresh(alerts[0])
    assert alerts[0].severity == AlertSeverity.CRITICAL
    
    # 7. Recovery (Should resolve alert)
    t5 = t4 + timedelta(minutes=5)
    payload_recovery = TelemetryPayload(sensor_code="SENS-ALERT-01", shipment_id=shipment.id, temperature=6.0, humidity=50.0, recorded_at=t5)
    SensorService.ingest_telemetry(db_session, payload_recovery)
    
    db_session.refresh(alerts[0])
    assert alerts[0].status == AlertStatus.RESOLVED
    assert alerts[0].resolved_at is not None

    # 8. Endpoint Tests - List Alerts
    res = client.get(f"/api/v1/shipments/{shipment.id}/alerts", headers=admin_token_headers)
    assert res.status_code == 200
    data = res.json()
    assert len(data) == 1
    assert data[0]["status"] == "RESOLVED"
    assert data[0]["severity"] == "CRITICAL"
    
    # 9. Endpoint Tests - Acknowledge / Resolve (manual)
    # Acknowledging a resolved alert should fail (400)
    res = client.patch(f"/api/v1/alerts/{alerts[0].id}/acknowledge", headers=admin_token_headers)
    assert res.status_code == 400
    
    # Let's create a new OPEN alert by triggering an excursion again
    # We must satisfy duration!
    t6 = t5 + timedelta(minutes=5)
    payload_new_excursion_1 = TelemetryPayload(sensor_code="SENS-ALERT-01", shipment_id=shipment.id, temperature=-2.0, humidity=50.0, recorded_at=t6)
    SensorService.ingest_telemetry(db_session, payload_new_excursion_1)
    
    t7 = t6 + timedelta(minutes=20)
    payload_new_excursion_2 = TelemetryPayload(sensor_code="SENS-ALERT-01", shipment_id=shipment.id, temperature=-2.0, humidity=50.0, recorded_at=t7)
    SensorService.ingest_telemetry(db_session, payload_new_excursion_2)

    new_alerts = db_session.query(Alert).filter_by(shipment_id=shipment.id, status=AlertStatus.OPEN).all()
    assert len(new_alerts) == 1
    alert_id = new_alerts[0].id
    
    # AUDITOR should get 403
    res_auditor = client.patch(f"/api/v1/alerts/{alert_id}/acknowledge", headers=auditor_token_headers)
    assert res_auditor.status_code == 403
    res_auditor = client.patch(f"/api/v1/alerts/{alert_id}/resolve", headers=auditor_token_headers)
    assert res_auditor.status_code == 403
    
    # Acknowledge
    res = client.patch(f"/api/v1/alerts/{alert_id}/acknowledge", headers=admin_token_headers)
    assert res.status_code == 200
    assert res.json()["status"] == "ACKNOWLEDGED"
    
    # Resolve
    res = client.patch(f"/api/v1/alerts/{alert_id}/resolve", headers=admin_token_headers)
    assert res.status_code == 200
    assert res.json()["status"] == "RESOLVED"

    app.dependency_overrides.clear()
    db_session.close()
