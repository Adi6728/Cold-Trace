$ErrorActionPreference = "Stop"
$bash = "C:\Program Files\Git\bin\bash.exe"

Write-Host "Deploying traceability chaincode to Org1 and Org2..." -ForegroundColor Cyan

# Since addOrg3 script adds org3 to the channel, we must deploy the chaincode across the orgs.
# The standard test-network deployCC script doesn't cleanly handle Org3 if it's already added without modifying standard scripts.
# However, if we just deploy to Org1 and Org2 using the standard script,# Deploy traceability chaincode using the scripts
Write-Host "Deploying traceability chaincode to tracechannel..."
& $bash -c "cd /c/fabric/fabric-samples/test-network && ./network.sh deployCCAAS -ccn traceability -ccp /c/ColdTrace/blockchain/chaincode/traceability -c tracechannel"
if ($LASTEXITCODE -ne 0) { throw "Chaincode deployment to Org1/Org2 failed." }

Write-Host "Packaging and deploying chaincode to Org3..." -ForegroundColor Cyan
# Set Org3 Environment variables and install/approve
$org3Env = @"
export PATH=`$PWD/../bin:`$PATH
export FABRIC_CFG_PATH=`$PWD/../config/
export CORE_PEER_TLS_ENABLED=true
export CORE_PEER_LOCALMSPID="Org3MSP"
export CORE_PEER_TLS_ROOTCERT_FILE=`$PWD/organizations/peerOrganizations/org3.example.com/peers/peer0.org3.example.com/tls/ca.crt
export CORE_PEER_MSPCONFIGPATH=`$PWD/organizations/peerOrganizations/org3.example.com/users/Admin@org3.example.com/msp
export CORE_PEER_ADDRESS=localhost:11051

# Check if packaged already exists (test-network usually leaves it in test-network folder)
if [ ! -f traceability.tar.gz ]; then
  peer lifecycle chaincode package traceability.tar.gz --path /c/ColdTrace/blockchain/chaincode/traceability/ --lang node --label traceability_1.0
fi

peer lifecycle chaincode install traceability.tar.gz
PACKAGE_ID=`$(peer lifecycle chaincode queryinstalled | grep traceability_1.0 | awk '{print `$3}' | sed 's/,//')

# Approve for Org3 (note: if endorsement policy requires majority, we might need to commit again, but default is ANY for test-network or MAJORITY. For test network, default is majority of 2 which is 2. Now it's 3, so majority is 2. It's already committed, we just approve it so Org3 can use it).
peer lifecycle chaincode approveformyorg -o localhost:7050 --ordererTLSHostnameOverride orderer.example.com --tls --cafile `$PWD/organizations/ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem --channelID tracechannel --name traceability --version 1.0 --package-id `$PACKAGE_ID --sequence 1
"@

& $bash -c "cd /c/fabric/fabric-samples/test-network && $org3Env"

Write-Host "Chaincode successfully deployed to all 3 organizations!" -ForegroundColor Green
