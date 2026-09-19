import os
import json
import pytest
from unittest.mock import patch, MagicMock

from app.services.fabric_service import FabricService, FabricClientError
from app.core.config import settings

@pytest.fixture
def mock_subprocess_run():
    with patch('subprocess.run') as mock_run:
        yield mock_run

@pytest.fixture
def fabric_service():
    return FabricService()

def test_build_env(fabric_service):
    env = fabric_service._build_env()
    assert env["CORE_PEER_TLS_ENABLED"] == "true"
    assert "FABRIC_CFG_PATH" in env

def test_get_shipment_history_success(fabric_service, mock_subprocess_run):
    # Mock successful query
    mock_result = MagicMock()
    mock_result.returncode = 0
    mock_result.stdout = '[{"eventId": "E1", "shipmentId": "S1"}]'
    mock_subprocess_run.return_value = mock_result

    history = fabric_service.get_shipment_history("S1")
    
    assert len(history) == 1
    assert history[0]["eventId"] == "E1"
    
    # Verify subprocess was called correctly
    mock_subprocess_run.assert_called_once()
    args, kwargs = mock_subprocess_run.call_args
    cmd = args[0]
    
    assert "chaincode" in cmd
    assert "query" in cmd
    assert "-c" in cmd
    
    # Check the JSON args passed to -c
    c_index = cmd.index("-c") + 1
    json_args = json.loads(cmd[c_index])
    assert json_args["function"] == "GetShipmentHistory"
    assert json_args["Args"] == ["S1"]

def test_record_shipment_event_success(fabric_service, mock_subprocess_run):
    mock_result = MagicMock()
    mock_result.returncode = 0
    mock_result.stdout = 'Chaincode invoke successful. result: status:200'
    mock_subprocess_run.return_value = mock_result

    fabric_service.record_shipment_event("E1", "S1", "DISPATCHED", "WH-A", "2024-01-01T00:00:00Z", "Org1")
    
    mock_subprocess_run.assert_called_once()
    args, kwargs = mock_subprocess_run.call_args
    cmd = args[0]
    
    assert "invoke" in cmd
    assert "--tls" in cmd
    
    c_index = cmd.index("-c") + 1
    json_args = json.loads(cmd[c_index])
    assert json_args["function"] == "RecordShipmentEvent"
    assert json_args["Args"] == ["S1", "E1", "DISPATCHED", "WH-A", "2024-01-01T00:00:00Z", "Org1"]

def test_fabric_client_error(fabric_service, mock_subprocess_run):
    # Mock a failure
    mock_result = MagicMock()
    mock_result.returncode = 1
    mock_result.stderr = 'error getting endorser client'
    mock_subprocess_run.return_value = mock_result

    with pytest.raises(FabricClientError, match="error getting endorser client"):
        fabric_service.get_shipment_history("S1")
