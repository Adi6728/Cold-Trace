import logging
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from app.database.session import SessionLocal
from app.models.alert import Alert, AlertStatus, AlertSeverity
from app.models.sensor import Sensor
from app.models.product import Product
from app.models.shipment import Shipment
from app.schemas.sensors import TelemetryPayload
from app.services.sensor_service import SensorService

logging.basicConfig(level=logging.INFO)

def run_e2e():
    db = SessionLocal()
    try:
        # Find a shipment with a sensor
        sensor = db.query(Sensor).first()
        if not sensor:
            print("No sensor found in DB.")
            return

        shipment = sensor.shipment
        product = shipment.batch.product
        
        print(f"Using Sensor {sensor.sensor_code}, Product Limits: {product.storage_min_temp} to {product.storage_max_temp}")
        
        # 1. Clear any existing alerts/readings for this sensor
        db.query(Alert).filter(Alert.sensor_id == sensor.id).delete()
        from app.models.sensor_reading import SensorReading
        db.query(SensorReading).filter(SensorReading.sensor_id == sensor.id).delete()
        db.commit()

        t0 = datetime.now(timezone.utc)

        # 2. Trigger an excursion (+3.0 over max, should be HIGH based on config >=2.0)
        excursion_temp = product.storage_max_temp + 3.0
        print(f"Triggering excursion reading 1 with temp: {excursion_temp}")
        payload = TelemetryPayload(
            sensor_code=sensor.sensor_code,
            shipment_id=shipment.id,
            temperature=excursion_temp,
            humidity=50.0,
            recorded_at=t0
        )
        SensorService.ingest_telemetry(db, payload)
        
        # Check Alert (Should be 0 because 0 duration)
        alerts = db.query(Alert).filter(Alert.sensor_id == sensor.id).all()
        assert len(alerts) == 0
        print("Brief excursion correctly ignored (no alert).")

        # 3. Trigger reading at duration >= 15
        import datetime as dt
        t1 = t0 + dt.timedelta(minutes=16)
        print(f"Triggering sustained excursion reading 2 with temp: {excursion_temp} at +16m")
        payload.recorded_at = t1
        SensorService.ingest_telemetry(db, payload)

        alerts = db.query(Alert).filter(Alert.sensor_id == sensor.id).all()
        assert len(alerts) == 1
        assert alerts[0].status == AlertStatus.OPEN
        assert alerts[0].severity == AlertSeverity.HIGH
        print("Sustained excursion alert successfully generated!")

        # 4. Trigger normal reading to resolve
        normal_temp = product.storage_min_temp + 1.0
        print(f"Triggering normal reading with temp: {normal_temp}")
        payload.temperature = normal_temp
        payload.recorded_at = t1 + dt.timedelta(minutes=5)
        SensorService.ingest_telemetry(db, payload)

        db.refresh(alerts[0])
        assert alerts[0].status == AlertStatus.RESOLVED
        print("Alert successfully resolved!")
        print("E2E Alert duration verification passed.")
        
    finally:
        db.close()

if __name__ == "__main__":
    run_e2e()
