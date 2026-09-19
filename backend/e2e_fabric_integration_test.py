import os
import uuid
import time
from datetime import datetime, timezone
import pytest

from fastapi import HTTPException
from unittest.mock import patch
from app.services.fabric_service import FabricClientError
from app.database.session import SessionLocal
from app.models.shipment import Shipment, ShipmentStatus
from app.models.shipment_event import ShipmentEventType
from app.models.user import User, UserRole
from app.models.organization import Organization
from app.models.batch import Batch
from app.models.product import Product
from app.schemas.shipment_events import ShipmentEventCreate
from app.schemas.custody import CustodyTransferCreate
from app.services.shipment_service import add_shipment_event, add_custody_transfer
from app.services.fabric_service import fabric_service
import random

def create_test_data(db):
    base_id = random.randint(10000, 99999)
    org1 = Organization(id=base_id, name=f"Test Org 1 {base_id}", slug=f"test-org-1-{base_id}", created_at=datetime.now(timezone.utc))
    org2 = Organization(id=base_id+1, name=f"Test Org 2 {base_id}", slug=f"test-org-2-{base_id}", created_at=datetime.now(timezone.utc))
    db.add(org1)
    db.add(org2)
    db.commit()

    user = User(id=base_id, email=f"testuser{base_id}@example.com", password_hash="test", role=UserRole.ADMIN, organization_id=org1.id)
    db.add(user)

    product = Product(id=base_id, name="Test Product", manufacturer_id=org1.id, storage_min_temp=2.0, storage_max_temp=8.0, created_at=datetime.now(timezone.utc))
    db.add(product)
    db.commit()

    batch = Batch(id=base_id, product_id=product.id, batch_number=f"B{base_id}", quantity=100, manufactured_at=datetime.now(timezone.utc), expiry_date=datetime.now(timezone.utc), created_at=datetime.now(timezone.utc))
    db.add(batch)
    db.commit()

    shipment = Shipment(
        id=base_id,
        batch_id=batch.id,
        origin_organization_id=org1.id,
        destination_organization_id=org2.id,
        status=ShipmentStatus.IN_TRANSIT,
        started_at=datetime.now(timezone.utc),
        created_at=datetime.now(timezone.utc)
    )
    db.add(shipment)
    db.commit()

    return user, shipment, org1, org2, base_id


def cleanup_test_data(db, base_id):
    from sqlalchemy import text
    db.execute(text(f"DELETE FROM custody_transfers WHERE shipment_id = {base_id}"))
    db.execute(text(f"DELETE FROM shipment_events WHERE shipment_id = {base_id}"))
    db.execute(text(f"DELETE FROM shipments WHERE id = {base_id}"))
    db.execute(text(f"DELETE FROM batches WHERE id = {base_id}"))
    db.execute(text(f"DELETE FROM products WHERE id = {base_id}"))
    db.execute(text(f"DELETE FROM users WHERE id = {base_id}"))
    db.execute(text(f"DELETE FROM organizations WHERE id IN ({base_id}, {base_id+1})"))
    db.commit()


def run_e2e():
    db = SessionLocal()
    base_id = None
    try:
        user, shipment, org1, org2, base_id = create_test_data(db)

        # 1. Create a ShipmentEvent
        payload = ShipmentEventCreate(
            event_type=ShipmentEventType.DISPATCHED,
            location="Test Warehouse",
            occurred_at=datetime.now(timezone.utc)
        )
        
        print("Testing add_shipment_event...")
        event = add_shipment_event(db, shipment, payload, user)
        print(f"Created PostgreSQL Event ID: {event.id}")
        
        # Verify it's in Fabric
        print("Querying Fabric for shipment history...")
        time.sleep(2)  # Give chaincode a moment to settle
        history = fabric_service.get_shipment_history(f"SHIP-{shipment.id}")
        print(f"History: {history}")
        assert len(history) == 1
        assert history[0]["eventId"] == f"EVT-{event.id}"
        assert history[0]["eventType"] == "DISPATCHED"
        print("Fabric verification passed for ShipmentEvent!")
        
        # 2. Test Idempotency
        print("Testing idempotency (retry with same payload)...")
        event2 = add_shipment_event(db, shipment, payload, user)
        assert event2.id == event.id, "Expected same event ID for duplicate payload"
        
        history2 = fabric_service.get_shipment_history(f"SHIP-{shipment.id}")
        assert len(history2) == 1, "Expected exactly 1 event on Fabric, duplicate was prevented"
        print("Idempotency verification passed!")

        # 3. Create a CustodyTransfer
        print("Testing add_custody_transfer...")
        transfer_payload = CustodyTransferCreate(
            from_organization_id=org1.id,
            to_organization_id=org2.id,
            transferred_at=datetime.now(timezone.utc),
            notes="Test transfer"
        )
        transfer = add_custody_transfer(db, shipment, transfer_payload, user)
        print(f"Created PostgreSQL Custody Transfer ID: {transfer.id}")
        
        # Verify it's in Fabric
        print("Querying Fabric for shipment history again...")
        time.sleep(2)
        history3 = fabric_service.get_shipment_history(f"SHIP-{shipment.id}")
        assert len(history3) == 2
        custody_evt = next((h for h in history3 if h["eventId"] == f"CUST-{transfer.id}"), None)
        assert custody_evt is not None
        assert custody_evt["eventType"] == "CUSTODY_TRANSFER"
        print("Fabric verification passed for CustodyTransfer!")
        
        # 4. Simulate Fabric Failure
        print("Testing Fabric failure simulation...")
        with patch('app.services.fabric_service.fabric_service.record_shipment_event', side_effect=FabricClientError("Simulated Node Failure")):
            payload2 = ShipmentEventCreate(
                event_type=ShipmentEventType.RECEIVED,
                location="Destination",
                occurred_at=datetime.now(timezone.utc)
            )
            try:
                add_shipment_event(db, shipment, payload2, user)
                assert False, "Should have raised HTTPException 502"
            except HTTPException as e:
                assert e.status_code == 502
                print("Fabric failure correctly raised HTTP 502!")
        
        print("E2E Integration Verification SUCCESS.")

    except Exception as e:
        print(f"Error occurred: {e}")
        db.rollback()
        raise
    finally:
        db.rollback()
        if base_id:
            cleanup_test_data(db, base_id)
        db.close()


if __name__ == "__main__":
    run_e2e()
