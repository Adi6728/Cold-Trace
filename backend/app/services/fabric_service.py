import os
import json
import logging
import subprocess
from typing import Any, Dict, List
from app.core.config import settings

logger = logging.getLogger(__name__)

class FabricClientError(Exception):
    """Exception raised for errors in the Fabric CLI execution."""
    pass

class FabricService:
    """Service to interact with Hyperledger Fabric using the peer CLI."""
    
    def __init__(self):
        # Only initialize if Fabric configuration is present.
        if not settings.FABRIC_CLI_BIN_DIR or not settings.FABRIC_CFG_PATH:
            logger.warning("Fabric configuration is missing. FabricService will fail if invoked.")
            
    def _build_env(self) -> Dict[str, str]:
        """Construct the environment variables required by the peer CLI."""
        env = os.environ.copy()
        
        # Ensure the bin dir is in the PATH
        if settings.FABRIC_CLI_BIN_DIR:
            env["PATH"] = f"{settings.FABRIC_CLI_BIN_DIR}{os.pathsep}{env.get('PATH', '')}"
            
        env["FABRIC_CFG_PATH"] = settings.FABRIC_CFG_PATH
        env["CORE_PEER_TLS_ENABLED"] = "true"
        env["CORE_PEER_LOCALMSPID"] = settings.FABRIC_MSP_ID
        env["CORE_PEER_MSPCONFIGPATH"] = settings.FABRIC_MSP_DIR
        # The first peer in the list is used as the CORE_PEER_ADDRESS
        peer_addresses = [p.strip() for p in settings.FABRIC_PEER_ADDRESSES.split(",") if p.strip()]
        peer_tls_cas = [p.strip() for p in settings.FABRIC_PEER_TLS_CAS.split(",") if p.strip()]
        
        env["CORE_PEER_ADDRESS"] = peer_addresses[0] if peer_addresses else "localhost:7051"
        env["CORE_PEER_TLS_ROOTCERT_FILE"] = peer_tls_cas[0] if peer_tls_cas else ""
        
        return env

    def _run_peer_command(self, action: str, function: str, args: List[str]) -> str:
        """
        Executes a peer chaincode command (invoke or query).
        """
        env = self._build_env()
        
        # On Windows, we need to explicitly run peer.exe if it's in the bin folder
        peer_bin = "peer"
        if os.name == 'nt':
            peer_bin = os.path.join(settings.FABRIC_CLI_BIN_DIR, "peer.exe") if settings.FABRIC_CLI_BIN_DIR else "peer"
            
        cmd = [
            peer_bin, "chaincode", action,
            "-C", settings.FABRIC_CHANNEL,
            "-n", settings.FABRIC_CHAINCODE,
            "-c", json.dumps({"function": function, "Args": args})
        ]

        if action == "invoke":
            cmd.extend([
                "-o", settings.FABRIC_ORDERER_URL,
                "--ordererTLSHostnameOverride", "orderer.example.com",
                "--tls",
                "--cafile", settings.FABRIC_ORDERER_TLS_CA
            ])
            
            peer_addresses = [p.strip() for p in settings.FABRIC_PEER_ADDRESSES.split(",") if p.strip()]
            peer_tls_cas = [p.strip() for p in settings.FABRIC_PEER_TLS_CAS.split(",") if p.strip()]
            
            for p_addr, p_ca in zip(peer_addresses, peer_tls_cas):
                cmd.extend([
                    "--peerAddresses", p_addr,
                    "--tlsRootCertFiles", p_ca
                ])
            
        logger.debug(f"Running fabric command: {' '.join(cmd)}")
        
        try:
            result = subprocess.run(
                cmd,
                env=env,
                capture_output=True,
                text=True,
                check=False
            )
            
            if result.returncode != 0:
                error_msg = result.stderr.strip() or result.stdout.strip()
                logger.error(f"Fabric CLI Error: {error_msg}")
                raise FabricClientError(f"Fabric command failed: {error_msg}")
                
            if action == "invoke":
                logger.debug(f"Fabric invoke stderr: {result.stderr.strip()}")
                
            return result.stdout.strip()
            
        except FileNotFoundError:
            raise FabricClientError(f"Fabric CLI binary '{peer_bin}' not found. Please check FABRIC_CLI_BIN_DIR.")
        except Exception as e:
            if isinstance(e, FabricClientError):
                raise
            raise FabricClientError(f"Unexpected error executing Fabric command: {str(e)}")

    def record_shipment_event(self, event_id: str, shipment_id: str, event_type: str, location: str, timestamp: str, recorded_by: str) -> None:
        """
        Invokes RecordShipmentEvent on the chaincode.
        """
        args = [shipment_id, event_id, event_type, location, timestamp, recorded_by]
        self._run_peer_command("invoke", "RecordShipmentEvent", args)

    def get_shipment_history(self, shipment_id: str) -> List[Dict[str, Any]]:
        """
        Queries GetShipmentHistory on the chaincode.
        """
        output = self._run_peer_command("query", "GetShipmentHistory", [shipment_id])
        if not output:
            return []
            
        try:
            return json.loads(output)
        except json.JSONDecodeError:
            logger.error(f"Failed to parse Fabric output as JSON: {output}")
            raise FabricClientError("Invalid response format from Fabric")

fabric_service = FabricService()
