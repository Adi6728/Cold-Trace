$files = @(
    "C:\fabric\fabric-samples\test-network\compose\docker\docker-compose-test-net.yaml",
    "C:\fabric\fabric-samples\test-network\addOrg3\compose\docker\docker-compose-org3.yaml"
)

foreach ($file in $files) {
    if (Test-Path $file) {
        $content = Get-Content $file -Raw
        $content = $content -replace "- CORE_VM_DOCKER_HOSTCONFIG_NETWORKMODE=fabric_test`n", "- CORE_VM_DOCKER_HOSTCONFIG_NETWORKMODE=fabric_test`n      - DOCKER_API_VERSION=1.41`n"
        $content = $content -replace "- CORE_VM_DOCKER_HOSTCONFIG_NETWORKMODE=fabric_test`r`n", "- CORE_VM_DOCKER_HOSTCONFIG_NETWORKMODE=fabric_test`r`n      - DOCKER_API_VERSION=1.41`r`n"
        Set-Content -Path $file -Value $content -NoNewline
        Write-Host "Patched $file"
    } else {
        Write-Host "File not found: $file"
    }
}
