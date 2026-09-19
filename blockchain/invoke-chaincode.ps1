$ErrorActionPreference = 'Stop'

$bash = "C:\Program Files\Git\bin\bash.exe"

Write-Host "Invoking InitLedger..."
& $bash -c "cd /c/fabric/fabric-samples/test-network && \
    export CORE_PEER_TLS_ENABLED=true && \
    export CORE_PEER_LOCALMSPID=Org1MSP && \
    export CORE_PEER_TLS_ROOTCERT_FILE=/c/fabric/fabric-samples/test-network/organizations/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/ca.crt && \
    export CORE_PEER_MSPCONFIGPATH=/c/fabric/fabric-samples/test-network/organizations/peerOrganizations/org1.example.com/users/Admin@org1.example.com/msp && \
    export CORE_PEER_ADDRESS=localhost:7051 && \
    export FABRIC_CFG_PATH=/c/fabric/fabric-samples/config && \
    export PATH=`$PATH:/c/fabric/fabric-samples/bin && \
    peer chaincode invoke -o localhost:7050 --ordererTLSHostnameOverride orderer.example.com --tls --cafile /c/fabric/fabric-samples/test-network/organizations/ordererOrganizations/example.com/tlsca/tlsca.example.com-cert.pem -C tracechannel -n traceability --peerAddresses localhost:7051 --tlsRootCertFiles /c/fabric/fabric-samples/test-network/organizations/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/ca.crt --peerAddresses localhost:9051 --tlsRootCertFiles /c/fabric/fabric-samples/test-network/organizations/peerOrganizations/org2.example.com/peers/peer0.org2.example.com/tls/ca.crt -c '{\`"function\`":\`"InitLedger\`",\`"Args\`":[]}'"

Start-Sleep -Seconds 3

Write-Host "Recording Shipment Event..."
& $bash -c "cd /c/fabric/fabric-samples/test-network && \
    export CORE_PEER_TLS_ENABLED=true && \
    export CORE_PEER_LOCALMSPID=Org1MSP && \
    export CORE_PEER_TLS_ROOTCERT_FILE=/c/fabric/fabric-samples/test-network/organizations/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/ca.crt && \
    export CORE_PEER_MSPCONFIGPATH=/c/fabric/fabric-samples/test-network/organizations/peerOrganizations/org1.example.com/users/Admin@org1.example.com/msp && \
    export CORE_PEER_ADDRESS=localhost:7051 && \
    export FABRIC_CFG_PATH=/c/fabric/fabric-samples/config && \
    export PATH=`$PATH:/c/fabric/fabric-samples/bin && \
    peer chaincode invoke -o localhost:7050 --ordererTLSHostnameOverride orderer.example.com --tls --cafile /c/fabric/fabric-samples/test-network/organizations/ordererOrganizations/example.com/tlsca/tlsca.example.com-cert.pem -C tracechannel -n traceability --peerAddresses localhost:7051 --tlsRootCertFiles /c/fabric/fabric-samples/test-network/organizations/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/ca.crt --peerAddresses localhost:9051 --tlsRootCertFiles /c/fabric/fabric-samples/test-network/organizations/peerOrganizations/org2.example.com/peers/peer0.org2.example.com/tls/ca.crt -c '{\`"function\`":\`"RecordShipmentEvent\`",\`"Args\`":[\`"SHIP-001\`",\`"EVT-001\`",\`"DISPATCHED\`",\`"Warehouse A\`",\`"2024-01-01T10:00:00Z\`",\`"Org1\`"]}'"

Start-Sleep -Seconds 3

Write-Host "Querying Shipment History..."
& $bash -c "cd /c/fabric/fabric-samples/test-network && \
    export CORE_PEER_TLS_ENABLED=true && \
    export CORE_PEER_LOCALMSPID=Org1MSP && \
    export CORE_PEER_TLS_ROOTCERT_FILE=/c/fabric/fabric-samples/test-network/organizations/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/ca.crt && \
    export CORE_PEER_MSPCONFIGPATH=/c/fabric/fabric-samples/test-network/organizations/peerOrganizations/org1.example.com/users/Admin@org1.example.com/msp && \
    export CORE_PEER_ADDRESS=localhost:7051 && \
    export FABRIC_CFG_PATH=/c/fabric/fabric-samples/config && \
    export PATH=`$PATH:/c/fabric/fabric-samples/bin && \
    peer chaincode query -C tracechannel -n traceability -c '{\`"function\`":\`"GetShipmentHistory\`",\`"Args\`":[\`"SHIP-001\`"]}'"
