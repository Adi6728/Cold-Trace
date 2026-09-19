param (
    [switch]$WithSimulator
)

$ErrorActionPreference = "Stop"

Write-Host "Starting ColdChain Trace Local Development Environment..." -ForegroundColor Cyan

# Check if Docker is running
Write-Host "Checking Docker..."
try {
    docker info > $null 2>&1
    if ($LASTEXITCODE -ne 0) { throw "Docker is not running" }
} catch {
    Write-Host "Docker is not running. Please start Docker Desktop and try again." -ForegroundColor Red
    exit 1
}

Write-Host "Starting PostgreSQL and Mosquitto..."
docker compose up -d postgres mosquitto

Write-Host "Waiting for PostgreSQL to be ready..."
$retryCount = 0
$pgReady = $false
while ($retryCount -lt 15) {
    $status = docker inspect -f '{{.State.Health.Status}}' coldchain-trace-postgres 2>$null
    if ($status -eq 'healthy') { 
        $pgReady = $true
        break 
    }
    Start-Sleep -Seconds 2
    $retryCount++
}

if (-not $pgReady) {
    Write-Host "Warning: PostgreSQL health check timed out. Proceeding anyway..." -ForegroundColor Yellow
}

Write-Host "Checking Hyperledger Fabric state..."
$fabricNodes = docker ps -aq -f "name=peer0.org1.example.com"
if ($fabricNodes) {
    Write-Host "Existing Fabric network found. Reusing it to preserve ledger state..."
    $allFabricContainers = docker ps -aq -f "name=example.com"
    if ($allFabricContainers) { 
        docker start $allFabricContainers | Out-Null
        Write-Host "Waiting for Fabric Orderer to elect a leader..."
        Start-Sleep -Seconds 10
    }
    
    $ccaasNodes = docker ps -q -f "name=ccaas"
    if (-not $ccaasNodes) {
        Write-Host "Chaincode containers not found (likely removed on stop). Redeploying chaincode..."
        & .\blockchain\deploy-chaincode.ps1
    }
} else {
    Write-Host "No Fabric network found. Starting fresh network..."
    $startNet = ".\blockchain\start-network.ps1"
    if (Test-Path $startNet) {
        & $startNet
        & .\blockchain\deploy-chaincode.ps1
    } else {
        Write-Host "Warning: Fabric scripts not found at .\blockchain\" -ForegroundColor Yellow
    }
}

Write-Host "Starting FastAPI Backend..."
$fastApiConn = Get-NetTCPConnection -LocalPort 8000 -ErrorAction SilentlyContinue
if (-not $fastApiConn) {
    Start-Process powershell -WorkingDirectory $PWD.Path -ArgumentList "-NoExit", "-Command", "`$env:PYTHONPATH='backend'; python -m uvicorn backend.app.main:app --reload" -WindowStyle Normal
    Write-Host "Launched FastAPI in a new window."
} else {
    Write-Host "Port 8000 is already in use. Assuming FastAPI is running." -ForegroundColor Yellow
}

Write-Host "Starting Next.js Frontend..."
$nextConn = Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue
if (-not $nextConn) {
    Start-Process powershell -WorkingDirectory "$($PWD.Path)\frontend" -ArgumentList "-NoExit", "-Command", "npm run dev" -WindowStyle Normal
    Write-Host "Launched Next.js in a new window."
} else {
    Write-Host "Port 3000 is already in use. Assuming Next.js is running." -ForegroundColor Yellow
}

if ($WithSimulator) {
    Write-Host "Starting IoT Simulator..."
    $simRunning = Get-CimInstance Win32_Process | Where-Object { $_.CommandLine -match 'iot_simulator.py' -and $_.ProcessId -ne $PID }
    if (-not $simRunning) {
        Start-Process powershell -WorkingDirectory $PWD.Path -ArgumentList "-NoExit", "-Command", "`$env:PYTHONPATH='backend'; python iot_simulator.py" -WindowStyle Normal
        Write-Host "Launched IoT Simulator in a new window."
    } else {
        Write-Host "IoT Simulator appears to be already running." -ForegroundColor Yellow
    }
}

Write-Host "`nDevelopment Environment Started Successfully!" -ForegroundColor Green
Write-Host "  - Frontend: http://localhost:3000"
Write-Host "  - API Docs: http://localhost:8000/docs"
Write-Host "  - PostgreSQL: localhost:5432"
Write-Host "  - MQTT Broker: localhost:1883"
Write-Host ""
