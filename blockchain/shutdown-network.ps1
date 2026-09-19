$ErrorActionPreference = 'Stop'

$bash = "C:\Program Files\Git\bin\bash.exe"

Write-Host "Shutting down the Fabric test network..."
& $bash -c "cd /c/fabric/fabric-samples/test-network && ./network.sh down"

# Also remove CCAAS containers if they exist
Write-Host "Removing any leftover CCAAS containers..."
& $bash -c "docker rm -f peer0org1_traceability_ccaas peer0org2_traceability_ccaas peer0org3_traceability_ccaas 2>/dev/null || true"

Write-Host "Network successfully shut down!"
