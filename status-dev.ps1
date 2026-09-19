$ErrorActionPreference = "Continue"

Write-Host "ColdChain Trace Status" -ForegroundColor Cyan
Write-Host "======================"

# Docker
docker info > $null 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "Docker: Running" -ForegroundColor Green
} else {
    Write-Host "Docker: Stopped" -ForegroundColor Red
}

# Postgres
$pg = docker ps -q -f "name=coldchain-trace-postgres"
if ($pg) { Write-Host "PostgreSQL: Running (Port 5432)" -ForegroundColor Green }
else { Write-Host "PostgreSQL: Stopped" -ForegroundColor Yellow }

# Mosquitto
$mqtt = docker ps -q -f "name=coldchain-trace-mosquitto"
if ($mqtt) { Write-Host "Mosquitto: Running (Port 1883)" -ForegroundColor Green }
else { Write-Host "Mosquitto: Stopped" -ForegroundColor Yellow }

# Fabric
$fabric = docker ps -q -f "name=peer0.org1.example.com"
if ($fabric) { Write-Host "Fabric Network: Running" -ForegroundColor Green }
else { Write-Host "Fabric Network: Stopped" -ForegroundColor Yellow }

# Chaincode
$cc = docker ps -q -f "name=traceability_ccaas"
if ($cc) { Write-Host "Chaincode: Running" -ForegroundColor Green }
else { Write-Host "Chaincode: Stopped" -ForegroundColor Yellow }

# FastAPI
$api = Get-NetTCPConnection -LocalPort 8000 -ErrorAction SilentlyContinue
if ($api) { Write-Host "FastAPI: Running (Port 8000)" -ForegroundColor Green }
else { Write-Host "FastAPI: Stopped" -ForegroundColor Yellow }

# Next.js
$next = Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue
if ($next) { Write-Host "Next.js: Running (Port 3000)" -ForegroundColor Green }
else { Write-Host "Next.js: Stopped" -ForegroundColor Yellow }
