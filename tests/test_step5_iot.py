import pytest
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from fastapi.testclient import TestClient
from pydantic import ValidationError

from app.main import app
from app.models.sensor import Sensor, SensorStatus
from app.models.sensor_reading import SensorReading
from app.models.shipment import Shipment, ShipmentStatus
from app.models.batch import Batch, BatchStatus
from app.models.product import Product
from app.models.organization import Organization
from app.schemas.sensors import TelemetryPayload, SensorCreate
from app.services.sensor_service import SensorService
from sqlalchemy import create_engine
from app.database.base import Base

@pytest.fixture
def db():
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(bind=engine)
    session = Session(bind=engine)
    yield session
    session.close()


def create_test_data(db: Session):
    # Setup prerequisite data
    org_origin = Organization(name="Org Origin", slug="origin")
    org_dest = Organization(name="Org Dest", slug="dest")
    db.add_all([org_origin, org_dest])
    db.commit()
    
    product = Product(name="Test Vaccine", description="Test", manufacturer_id=org_origin.id, storage_min_temp=2, storage_max_temp=8)
    db.add(product)
    db.commit()
    
    batch = Batch(batch_number="B-IOT-001", product_id=product.id, quantity=100, status=BatchStatus.IN_PRODUCTION, manufactured_at=datetime.now(timezone.utc), expiry_date=datetime.now(timezone.utc))
    db.add(batch)
    db.commit()
    
    shipment = Shipment(
        batch_id=batch.id,
        origin_organization_id=org_origin.id,
        destination_organization_id=org_dest.id,
        status=ShipmentStatus.PLANNED
    )
    db.add(shipment)
    db.commit()
    db.refresh(shipment)
    return shipment


def test_telemetry_payload_schema():
    valid_data = {
        "sensor_code": "SENS-001",
        "shipment_id": 1,
        "temperature": 4.5,
        "humidity": 45.0,
        "recorded_at": datetime.now(timezone.utc).isoformat()
    }
    payload = TelemetryPayload(**valid_data)
    assert payload.sensor_code == "SENS-001"
    assert payload.temperature == 4.5

    invalid_data = valid_data.copy()
    invalid_data.pop("temperature")
    with pytest.raises(ValidationError):
        TelemetryPayload(**invalid_data)


def test_sensor_creation_and_relationship(db: Session):
    shipment = create_test_data(db)
    
    sensor_in = SensorCreate(sensor_code="SENS-001", shipment_id=shipment.id, status=SensorStatus.ACTIVE)
    sensor = SensorService.create_sensor(db, sensor_in)
    
    assert sensor.id is not None
    assert sensor.shipment_id == shipment.id
    
    # Test relationship
    db.refresh(shipment)
    assert len(shipment.sensors) == 1
    assert shipment.sensors[0].sensor_code == "SENS-001"


def test_valid_telemetry_persistence(db: Session):
    shipment = create_test_data(db)
    sensor = SensorService.create_sensor(db, SensorCreate(sensor_code="SENS-002", shipment_id=shipment.id, status=SensorStatus.ACTIVE))
    
    payload = TelemetryPayload(
        sensor_code="SENS-002",
        shipment_id=shipment.id,
        temperature=5.5,
        humidity=40.0,
        recorded_at=datetime.now(timezone.utc)
    )
    
    reading = SensorService.ingest_telemetry(db, payload)
    assert reading.id is not None
    assert reading.temperature == 5.5
    assert reading.sensor_id == sensor.id
    assert reading.shipment_id == shipment.id


def test_invalid_telemetry_rejection(db: Session):
    shipment = create_test_data(db)
    # Create inactive sensor
    sensor = SensorService.create_sensor(db, SensorCreate(sensor_code="SENS-003", shipment_id=shipment.id, status=SensorStatus.INACTIVE))
    
    # 1. Inactive sensor
    payload = TelemetryPayload(
        sensor_code="SENS-003", shipment_id=shipment.id, temperature=5.5, humidity=40.0, recorded_at=datetime.now(timezone.utc)
    )
    with pytest.raises(ValueError, match="is inactive"):
        SensorService.ingest_telemetry(db, payload)
        
    # 2. Non-existent sensor
    payload.sensor_code = "UNKNOWN-999"
    with pytest.raises(ValueError, match="not found"):
        SensorService.ingest_telemetry(db, payload)
        
    # 3. Wrong shipment ID
    sensor.status = SensorStatus.ACTIVE
    db.commit()
    
    payload.sensor_code = "SENS-003"
    payload.shipment_id = 9999
    with pytest.raises(ValueError, match="claims shipment 9999"):
        SensorService.ingest_telemetry(db, payload)
