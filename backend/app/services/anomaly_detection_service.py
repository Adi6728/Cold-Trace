from datetime import datetime, timezone
from sqlalchemy.orm import Session

from app.models.sensor_reading import SensorReading
from app.models.shipment import Shipment
from app.models.product import Product
from app.models.alert import Alert, AlertSeverity, AlertStatus
from app.core.config import settings


class AnomalyDetectionService:
    @staticmethod
    def _determine_severity(deviation: float) -> AlertSeverity:
        if deviation >= settings.ALERT_CRITICAL_DEVIATION:
            return AlertSeverity.CRITICAL
        elif deviation >= settings.ALERT_HIGH_DEVIATION:
            return AlertSeverity.HIGH
        elif deviation >= settings.ALERT_MEDIUM_DEVIATION:
            return AlertSeverity.MEDIUM
        return AlertSeverity.LOW

    @staticmethod
    def check_telemetry(db: Session, reading: SensorReading, shipment: Shipment, product: Product) -> None:
        """
        Evaluates the reading against product constraints.
        If out of bounds, opens or updates an active alert.
        If in bounds, resolves any active alert for this sensor/shipment.
        """
        temperature = reading.temperature
        
        is_too_cold = temperature < product.storage_min_temp
        is_too_hot = temperature > product.storage_max_temp
        
        # Check for existing OPEN alert for this sensor & shipment
        active_alert = db.query(Alert).filter(
            Alert.shipment_id == shipment.id,
            Alert.sensor_id == reading.sensor_id,
            Alert.status == AlertStatus.OPEN
        ).first()

        if is_too_cold or is_too_hot:
            # Calculate deviation
            deviation = 0.0
            if is_too_cold:
                deviation = product.storage_min_temp - temperature
            else:
                deviation = temperature - product.storage_max_temp
                
            new_severity = AnomalyDetectionService._determine_severity(deviation)
            msg = f"Temperature deviation detected: {temperature}°C (Limits: {product.storage_min_temp} to {product.storage_max_temp})"

            if active_alert:
                # Update existing alert (suppress duplicate)
                active_alert.latest_temperature = temperature
                active_alert.message = msg
                # Escalate severity if it worsened
                severity_order = {
                    AlertSeverity.LOW: 1,
                    AlertSeverity.MEDIUM: 2,
                    AlertSeverity.HIGH: 3,
                    AlertSeverity.CRITICAL: 4
                }
                if severity_order[new_severity] > severity_order[active_alert.severity]:
                    active_alert.severity = new_severity
                db.commit()
            else:
                # Find when this continuous excursion started
                last_normal_reading = db.query(SensorReading).filter(
                    SensorReading.sensor_id == reading.sensor_id,
                    SensorReading.recorded_at <= reading.recorded_at,
                    (SensorReading.temperature >= product.storage_min_temp) & (SensorReading.temperature <= product.storage_max_temp)
                ).order_by(SensorReading.recorded_at.desc()).first()

                if last_normal_reading:
                    first_excursion_reading = db.query(SensorReading).filter(
                        SensorReading.sensor_id == reading.sensor_id,
                        SensorReading.recorded_at > last_normal_reading.recorded_at
                    ).order_by(SensorReading.recorded_at.asc()).first()
                else:
                    first_excursion_reading = db.query(SensorReading).filter(
                        SensorReading.sensor_id == reading.sensor_id,
                        SensorReading.recorded_at <= reading.recorded_at
                    ).order_by(SensorReading.recorded_at.asc()).first()
                
                # We should always find at least `reading` itself.
                if first_excursion_reading:
                    duration_minutes = (reading.recorded_at - first_excursion_reading.recorded_at).total_seconds() / 60.0
                    if duration_minutes >= settings.ALERT_DURATION_MINUTES:
                        # Open a new alert
                        alert = Alert(
                            shipment_id=shipment.id,
                            sensor_id=reading.sensor_id,
                            severity=new_severity,
                            status=AlertStatus.OPEN,
                            message=msg,
                            latest_temperature=temperature,
                            detected_at=first_excursion_reading.recorded_at
                        )
                        db.add(alert)
                        db.commit()
        else:
            # In bounds
            if active_alert:
                # Recovery condition met
                active_alert.status = AlertStatus.RESOLVED
                active_alert.resolved_at = reading.recorded_at or datetime.now(timezone.utc)
                active_alert.latest_temperature = temperature
                db.commit()
