from typing import Optional

from sqlalchemy.orm import Session
from fastapi import HTTPException

from app.models.sensor import Sensor, SensorStatus
from app.models.sensor_reading import SensorReading
from app.models.shipment import Shipment, ShipmentStatus
from app.schemas.sensors import SensorCreate, TelemetryPayload


class SensorService:
    @staticmethod
    def create_sensor(db: Session, sensor_in: SensorCreate) -> Sensor:
        shipment = db.query(Shipment).filter(Shipment.id == sensor_in.shipment_id).first()
        if not shipment:
            raise HTTPException(status_code=404, detail="Shipment not found")

        existing_sensor = db.query(Sensor).filter(Sensor.sensor_code == sensor_in.sensor_code).first()
        if existing_sensor:
            raise HTTPException(status_code=400, detail="Sensor code already registered")

        sensor = Sensor(
            sensor_code=sensor_in.sensor_code,
            shipment_id=sensor_in.shipment_id,
            status=sensor_in.status
        )
        db.add(sensor)
        db.commit()
        db.refresh(sensor)
        return sensor

    @staticmethod
    def get_sensors(db: Session, skip: int = 0, limit: int = 100) -> list[Sensor]:
        return db.query(Sensor).offset(skip).limit(limit).all()

    @staticmethod
    def get_sensor(db: Session, sensor_id: int) -> Optional[Sensor]:
        return db.query(Sensor).filter(Sensor.id == sensor_id).first()

    @staticmethod
    def ingest_telemetry(db: Session, payload: TelemetryPayload) -> SensorReading:
        sensor = db.query(Sensor).filter(Sensor.sensor_code == payload.sensor_code).first()
        if not sensor:
            raise ValueError(f"Sensor {payload.sensor_code} not found")
        
        if sensor.status != SensorStatus.ACTIVE:
            raise ValueError(f"Sensor {payload.sensor_code} is inactive")

        if sensor.shipment_id != payload.shipment_id:
            raise ValueError(
                f"Sensor {payload.sensor_code} belongs to shipment {sensor.shipment_id}, "
                f"but telemetry claims shipment {payload.shipment_id}"
            )
        
        reading = SensorReading(
            sensor_id=sensor.id,
            shipment_id=sensor.shipment_id,
            temperature=payload.temperature,
            humidity=payload.humidity,
            recorded_at=payload.recorded_at,
        )
        db.add(reading)
        db.commit()
        db.refresh(reading)
        return reading
