from typing import Optional

from sqlalchemy.orm import Session
from fastapi import HTTPException

from app.models.sensor import Sensor, SensorStatus
from app.models.sensor_reading import SensorReading
from app.models.shipment import Shipment, ShipmentStatus
from app.models.user import User
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
    def list_sensors_for_user(db: Session, user: User, organization_id: Optional[int] = None, shipment_id: Optional[int] = None, skip: int = 0, limit: int = 100) -> list[Sensor]:
        from app.core.permissions import UserRole
        if user.role not in {UserRole.ADMIN, UserRole.MANUFACTURER, UserRole.LOGISTICS, UserRole.WAREHOUSE, UserRole.HOSPITAL, UserRole.AUDITOR}:
            raise HTTPException(status_code=403, detail="Insufficient permissions.")
            
        org_id = organization_id or user.organization_id
        if user.organization_id is not None and org_id != user.organization_id:
            raise HTTPException(status_code=403, detail="Insufficient permissions for this organization.")
            
        query = db.query(Sensor)
        
        if org_id is not None:
            query = query.join(Shipment).filter(
                (Shipment.origin_organization_id == org_id) | (Shipment.destination_organization_id == org_id)
            )
        else:
            if user.role not in {UserRole.ADMIN, UserRole.AUDITOR}:
                raise HTTPException(status_code=403, detail="An organization assignment is required.")
        
        if shipment_id is not None:
            query = query.filter(Sensor.shipment_id == shipment_id)
            
        return query.offset(skip).limit(limit).all()

    @staticmethod
    def get_sensor_for_user(db: Session, user: User, sensor_id: int) -> Sensor:
        sensor = db.query(Sensor).filter(Sensor.id == sensor_id).first()
        if not sensor:
            raise HTTPException(status_code=404, detail="Sensor not found")
            
        from app.core.permissions import UserRole
        if user.organization_id is not None and user.role not in {UserRole.ADMIN, UserRole.AUDITOR}:
            shipment = sensor.shipment
            if shipment.origin_organization_id != user.organization_id and shipment.destination_organization_id != user.organization_id:
                raise HTTPException(status_code=403, detail="Insufficient permissions for this organization.")
        elif user.organization_id is None and user.role not in {UserRole.ADMIN, UserRole.AUDITOR}:
            raise HTTPException(status_code=403, detail="An organization assignment is required.")
        return sensor

    @staticmethod
    def get_sensor_readings(db: Session, sensor_id: int) -> list[SensorReading]:
        return db.query(SensorReading).filter(SensorReading.sensor_id == sensor_id).order_by(SensorReading.recorded_at.desc()).all()

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

        # Retrieve the shipment and product to get temp limits
        from app.models.shipment import Shipment
        from app.models.batch import Batch
        from app.models.product import Product
        from app.services.anomaly_detection_service import AnomalyDetectionService
        
        shipment = db.query(Shipment).filter(Shipment.id == sensor.shipment_id).first()
        if shipment and shipment.batch and shipment.batch.product:
            AnomalyDetectionService.check_telemetry(db, reading, shipment, shipment.batch.product)

        return reading
