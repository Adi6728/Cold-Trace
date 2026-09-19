$ErrorActionPreference = "Stop"
$bash = "C:\Program Files\Git\bin\bash.exe"

Write-Host "Starting Hyperledger Fabric Test Network..." -ForegroundColor Cyan

# Ensure Docker Desktop API compatibility patches are applied
Write-Host "Applying Docker API compatibility patches..."
& .\patch_docker_api.ps1

# Bring down existing network
Write-Host "Cleaning up previous network state..."
& $bash -c "cd /c/fabric/fabric-samples/test-network && ./network.sh down && rm -rf organizations/peerOrganizations organizations/ordererOrganizations"

# Bring up network with tracechannel (Org1 and Org2)
Write-Host "Bringing up Org1 and Org2 with tracechannel..."
& $bash -c "cd /c/fabric/fabric-samples/test-network && ./network.sh up createChannel -c tracechannel -ca"
if ($LASTEXITCODE -ne 0) { throw "Network startup failed." }

# Add Org3 to tracechannel
Write-Host "Adding Org3 to tracechannel..."
& $bash -c "cd /c/fabric/fabric-samples/test-network/addOrg3 && ./addOrg3.sh up -c tracechannel -ca"
if ($LASTEXITCODE -ne 0) { throw "Failed to add Org3." }

Write-Host "Fabric Network Successfully Started with 3 Organizations!" -ForegroundColor Green
