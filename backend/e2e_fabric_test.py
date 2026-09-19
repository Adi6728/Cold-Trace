import logging
import uuid
import datetime
import time

# Setup logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

from app.services.fabric_service import fabric_service, FabricClientError
from app.core.config import settings

def test_fabric_e2e():
    logger.info("Starting Fabric E2E Test...")
    logger.info(f"Using CLI bin: {settings.FABRIC_CLI_BIN_DIR}")
    
    test_shipment_id = f"SHIP-TEST-{uuid.uuid4().hex[:6].upper()}"
    test_event_id = f"EVT-{uuid.uuid4().hex[:6].upper()}"
    timestamp = datetime.datetime.now(datetime.timezone.utc).isoformat()

    try:
        logger.info("Calling InitLedger...")
        fabric_service._run_peer_command("invoke", "InitLedger", [])
        time.sleep(2)
        
        # 1. Write an event
        logger.info(f"Recording shipment event for {test_shipment_id}...")
        fabric_service.record_shipment_event(
            event_id=test_event_id,
            shipment_id=test_shipment_id,
            event_type="DISPATCHED",
            location="Test Warehouse E2E",
            timestamp=timestamp,
            recorded_by="Org1"
        )
        logger.info("Event recorded successfully! Waiting 2 seconds for block commit...")
        time.sleep(2)
        
        # 2. Query the history
        logger.info(f"Querying history for {test_shipment_id}...")
        history = fabric_service.get_shipment_history(test_shipment_id)
        
        logger.info(f"History returned {len(history)} records.")
        assert len(history) == 1
        assert history[0]["eventId"] == test_event_id
        assert history[0]["shipmentId"] == test_shipment_id
        
        logger.info("E2E Test Passed Successfully!")
        
    except FabricClientError as e:
        logger.error(f"E2E Test Failed with Fabric Client Error: {e}")
        exit(1)
    except AssertionError as e:
        logger.error("E2E Test Failed: Data validation error!")
        exit(1)
    except Exception as e:
        logger.error(f"E2E Test Failed with Unexpected Error: {e}")
        exit(1)

if __name__ == "__main__":
    test_fabric_e2e()
