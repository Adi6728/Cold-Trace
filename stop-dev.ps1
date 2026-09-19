$ErrorActionPreference = "Continue"

Write-Host "Stopping ColdChain Trace Local Development Environment..." -ForegroundColor Cyan

Write-Host "Stopping FastAPI (Port 8000)..."
$fastApiConn = Get-NetTCPConnection -LocalPort 8000 -ErrorAction SilentlyContinue
if ($fastApiConn) {
    $fastApiConn.OwningProcess | Select-Object -Unique | ForEach-Object { Stop-Process -Id $_ -Force -ErrorAction SilentlyContinue }
}

Write-Host "Stopping Next.js (Port 3000)..."
$nextConn = Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue
if ($nextConn) {
    $nextConn.OwningProcess | Select-Object -Unique | ForEach-Object { Stop-Process -Id $_ -Force -ErrorAction SilentlyContinue }
}

Write-Host "Stopping IoT Simulator..."
Get-CimInstance Win32_Process | Where-Object { $_.CommandLine -match 'iot_simulator.py' -and $_.ProcessId -ne $PID } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }

Write-Host "Stopping PostgreSQL and Mosquitto..."
docker compose stop postgres mosquitto

Write-Host "Stopping Fabric Network..."
$fabricNodes = docker ps -q -f "name=example.com"
if ($fabricNodes) { docker stop $fabricNodes | Out-Null }
$ccaasNodes = docker ps -q -f "name=ccaas"
if ($ccaasNodes) { docker stop $ccaasNodes | Out-Null }

Write-Host "Done! Services stopped (volumes and ledger state preserved)." -ForegroundColor Green
