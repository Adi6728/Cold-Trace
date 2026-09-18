import json
import logging
import os
import time
from datetime import datetime, timezone
from typing import Optional

import paho.mqtt.client as mqtt
from pydantic import BaseModel

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class TelemetryPayload(BaseModel):
    sensor_code: str
    shipment_id: int
    temperature: float
    humidity: Optional[float]
    recorded_at: str


def run_simulator() -> None:
    broker = os.environ.get("MQTT_BROKER_HOST", "localhost")
    port = int(os.environ.get("MQTT_BROKER_PORT", 1883))
    topic = os.environ.get("MQTT_TOPIC", "coldchain/telemetry/simulated")
    sensor_code = os.environ.get("SENSOR_CODE", "SENS-001")
    shipment_id = int(os.environ.get("SHIPMENT_ID", 1))
    scenario = os.environ.get("SCENARIO", "NORMAL")

    client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2)
    client.connect(broker, port, 60)
    client.loop_start()

    logger.info(f"Simulator started. Broker: {broker}:{port}, Topic: {topic}")
    logger.info(f"Sensor: {sensor_code}, Shipment: {shipment_id}, Scenario: {scenario}")

    try:
        while True:
            # Deterministic scenario logic
            if scenario == "NORMAL":
                temp = 4.5
                humidity = 45.0
            elif scenario == "EXCURSION":
                temp = 10.2  # Above 8C
                humidity = 50.0
            else:
                temp = 5.0
                humidity = 40.0

            payload = TelemetryPayload(
                sensor_code=sensor_code,
                shipment_id=shipment_id,
                temperature=temp,
                humidity=humidity,
                recorded_at=datetime.now(timezone.utc).isoformat()
            )

            msg = payload.model_dump_json()
            client.publish(topic, msg)
            logger.info(f"Published: {msg}")

            time.sleep(5)
    except KeyboardInterrupt:
        logger.info("Simulator stopped.")
    finally:
        client.loop_stop()
        client.disconnect()


if __name__ == "__main__":
    run_simulator()
