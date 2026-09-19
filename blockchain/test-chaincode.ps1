$ErrorActionPreference = "Stop"
$bash = "C:\Program Files\Git\bin\bash.exe"

Write-Host "Testing Traceability Chaincode..." -ForegroundColor Cyan

$testScript = @"
export PATH=`$PWD/../bin:`$PATH
export FABRIC_CFG_PATH=`$PWD/../config/

# Function to set env for Org1
setOrg1() {
    export CORE_PEER_TLS_ENABLED=true
    export CORE_PEER_LOCALMSPID="Org1MSP"
    export CORE_PEER_TLS_ROOTCERT_FILE=`$PWD/organizations/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/ca.crt
    export CORE_PEER_MSPCONFIGPATH=`$PWD/organizations/peerOrganizations/org1.example.com/users/Admin@org1.example.com/msp
    export CORE_PEER_ADDRESS=localhost:7051
}

setOrg1

echo "Invoking RecordShipmentEvent..."
peer chaincode invoke -o localhost:7050 --ordererTLSHostnameOverride orderer.example.com --tls --cafile `$PWD/organizations/ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem -C tracechannel -n traceability --peerAddresses localhost:7051 --tlsRootCertFiles `$PWD/organizations/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/ca.crt --peerAddresses localhost:9051 --tlsRootCertFiles `$PWD/organizations/peerOrganizations/org2.example.com/peers/peer0.org2.example.com/tls/ca.crt -c '{"function":"RecordShipmentEvent","Args":["SHIP-001", "EVT-100", "DISPATCHED", "Warehouse A", "2026-09-19T10:00:00Z", "Admin"]}'

# Wait for commit
sleep 3

echo "Querying GetShipmentHistory..."
peer chaincode query -C tracechannel -n traceability -c '{"Args":["GetShipmentHistory","SHIP-001"]}' > query_result.txt
cat query_result.txt
"@

& $bash -c "cd /c/fabric/fabric-samples/test-network && $testScript"

Write-Host "Test complete!" -ForegroundColor Green
