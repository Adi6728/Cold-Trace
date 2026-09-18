import json
import logging
from typing import Any

import paho.mqtt.client as mqtt

from app.core.config import settings
from app.database.session import SessionLocal
from app.schemas.sensors import TelemetryPayload
from app.services.sensor_service import SensorService

logger = logging.getLogger(__name__)

# MQTT client instance
client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2)


def on_connect(client: mqtt.Client, userdata: Any, flags: Any, reason_code: Any, properties: Any = None) -> None:
    if reason_code == 0:
        logger.info("Connected to MQTT Broker!")
        # Subscribe to telemetry topic
        client.subscribe("coldchain/telemetry/+")
    else:
        logger.error(f"Failed to connect to MQTT broker, return code {reason_code}")


def on_message(client: mqtt.Client, userdata: Any, msg: mqtt.MQTTMessage) -> None:
    logger.debug(f"Received MQTT message on {msg.topic}")
    try:
        payload_dict = json.loads(msg.payload.decode())
        payload = TelemetryPayload.model_validate(payload_dict)
    except Exception as e:
        logger.error(f"Invalid MQTT payload: {e}")
        return

    # Create a fresh DB session for each message
    db = SessionLocal()
    try:
        SensorService.ingest_telemetry(db=db, payload=payload)
        logger.info(f"Ingested telemetry for sensor {payload.sensor_code}")
    except ValueError as e:
        logger.warning(f"Telemetry ingestion rejected: {e}")
    except Exception as e:
        logger.error(f"Database error during telemetry ingestion: {e}")
    finally:
        db.close()


client.on_connect = on_connect
client.on_message = on_message


def start_mqtt() -> None:
    """Connect to the MQTT broker and start the background loop."""
    try:
        client.connect(settings.MQTT_BROKER_HOST, settings.MQTT_BROKER_PORT, 60)
        client.loop_start()
        logger.info("MQTT loop started")
    except Exception as e:
        logger.error(f"Failed to start MQTT client: {e}")


def stop_mqtt() -> None:
    """Stop the MQTT background loop and disconnect."""
    try:
        client.loop_stop()
        client.disconnect()
        logger.info("MQTT loop stopped")
    except Exception as e:
        logger.error(f"Failed to stop MQTT client: {e}")
