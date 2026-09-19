$ErrorActionPreference = "Stop"
$bash = "C:\Program Files\Git\bin\bash.exe"

Write-Host "Tearing down Hyperledger Fabric Test Network..." -ForegroundColor Cyan

& $bash -c "cd /c/fabric/fabric-samples/test-network && ./network.sh down"

Write-Host "Teardown complete!" -ForegroundColor Green
