import os
import sys

# Ensure backend can be imported
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy.orm import Session
from app.database.session import SessionLocal
from app.models.user import User
from app.models.organization import Organization
from app.models.shipment import Shipment
from app.models.sensor import Sensor
from app.models.sensor_reading import SensorReading
from app.services.sensor_service import SensorService

def main():
    db: Session = SessionLocal()
    try:
        # Find any admin user or just the first user
        user = db.query(User).filter(User.role == "ADMIN").first()
        if not user:
            print("No admin user found. E2E test skipped.")
            return

        print(f"Testing with user: {user.email} (Org ID: {user.organization_id})")

        # Call the new service methods directly against the real DB
        sensors = SensorService.list_sensors_for_user(db, user=user)
        print(f"Found {len(sensors)} sensors visible to this user.")

        if sensors:
            target_sensor = sensors[0]
            print(f"Testing readings for sensor ID {target_sensor.id}")
            
            # This should succeed since we just got the sensor from the list
            sensor = SensorService.get_sensor_for_user(db, user, target_sensor.id)
            assert sensor.id == target_sensor.id
            
            readings = SensorService.get_sensor_readings(db, sensor.id)
            print(f"Found {len(readings)} readings for sensor {sensor.id}.")
            if readings:
                print(f"Most recent reading: Temp={readings[0].temperature}, Recorded={readings[0].recorded_at}")
        
        print("E2E Verification SUCCESS.")
    except Exception as e:
        print(f"E2E Verification FAILED: {e}")
        sys.exit(1)
    finally:
        db.close()

if __name__ == "__main__":
    main()
