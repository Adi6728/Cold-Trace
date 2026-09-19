import pytest
from unittest.mock import MagicMock, patch
from datetime import datetime, timezone
from fastapi import HTTPException

from app.services.shipment_service import add_shipment_event, add_custody_transfer
from app.models.shipment_event import ShipmentEvent, ShipmentEventType
from app.models.custody_transfer import CustodyTransfer
from app.services.fabric_service import FabricClientError


@pytest.fixture
def mock_db():
    db = MagicMock()
    # Mock for standard DB add/commit/refresh
    def mock_refresh(obj):
        if not getattr(obj, "id", None):
            obj.id = 1
    db.refresh.side_effect = mock_refresh
    
    # Mock scalars().first() to return None by default (no existing record)
    mock_scalars = MagicMock()
    mock_scalars.first.return_value = None
    db.scalars.return_value = mock_scalars
    
    return db


@pytest.fixture
def mock_user():
    user = MagicMock()
    user.email = "test@example.com"
    return user


@pytest.fixture
def mock_shipment():
    shipment = MagicMock()
    shipment.id = 100
    return shipment


@pytest.fixture
def mock_fabric_service():
    with patch('app.services.fabric_service.fabric_service') as mock_fs:
        yield mock_fs


def test_add_shipment_event_success(mock_db, mock_shipment, mock_user, mock_fabric_service):
    payload = MagicMock()
    payload.event_type = ShipmentEventType.DISPATCHED
    payload.location = "Warehouse A"
    payload.occurred_at = datetime.now(timezone.utc)
    payload.model_dump.return_value = {
        "event_type": payload.event_type,
        "location": payload.location,
        "occurred_at": payload.occurred_at
    }

    event = add_shipment_event(mock_db, mock_shipment, payload, mock_user)
    
    assert event.id == 1
    mock_db.add.assert_called_once()
    mock_db.commit.assert_called_once()
    mock_fabric_service.record_shipment_event.assert_called_once_with(
        event_id="EVT-1",
        shipment_id="SHIP-100",
        event_type="DISPATCHED",
        location="Warehouse A",
        timestamp=payload.occurred_at.isoformat(),
        recorded_by="test@example.com"
    )


def test_add_shipment_event_idempotent(mock_db, mock_shipment, mock_user, mock_fabric_service):
    # Setup mock to return an existing event
    existing_event = ShipmentEvent(id=50, event_type=ShipmentEventType.DISPATCHED)
    existing_event.location = "Warehouse A"
    existing_event.occurred_at = datetime.now(timezone.utc)
    
    mock_scalars = MagicMock()
    mock_scalars.first.return_value = existing_event
    mock_db.scalars.return_value = mock_scalars

    payload = MagicMock()
    payload.event_type = ShipmentEventType.DISPATCHED
    payload.occurred_at = existing_event.occurred_at
    
    event = add_shipment_event(mock_db, mock_shipment, payload, mock_user)
    
    # Should not have called add/commit
    assert event.id == 50
    mock_db.add.assert_not_called()
    mock_db.commit.assert_not_called()
    
    # Should STILL call fabric_service with the existing ID to retry sync
    mock_fabric_service.record_shipment_event.assert_called_once()


def test_add_shipment_event_fabric_failure(mock_db, mock_shipment, mock_user, mock_fabric_service):
    payload = MagicMock()
    payload.event_type = ShipmentEventType.DISPATCHED
    payload.occurred_at = datetime.now(timezone.utc)
    payload.model_dump.return_value = {
        "event_type": payload.event_type,
        "occurred_at": payload.occurred_at
    }
    
    mock_fabric_service.record_shipment_event.side_effect = FabricClientError("Fabric node down")
    
    with pytest.raises(HTTPException) as excinfo:
        add_shipment_event(mock_db, mock_shipment, payload, mock_user)
        
    assert excinfo.value.status_code == 502
    assert "Blockchain synchronization failed" in excinfo.value.detail
    
    # DB commit still happens before Fabric failure!
    mock_db.commit.assert_called_once()
