# Path Testing Script
# Verify all paths are correct

Write-Host "=== Path Testing Script ===" -ForegroundColor Green

# Define paths
$paths = @{
    "NSSM" = "D:\WebServer\tools\nssm-2.24\win64\nssm.exe"
    "NSSM Alternative" = "D:\WebServer\tools\nssm-2.24\x64\nssm.exe"
    "Nginx" = "D:\WebServer\nginx-1.22.1\nginx.exe"
    "Node.js" = "D:\Program Files\node\node.exe"
    "Project Directory" = "D:\WebServer\backend"
    "Project Main File" = "D:\WebServer\backend\app.js"
}

Write-Host "`nChecking paths:" -ForegroundColor Cyan

foreach ($item in $paths.GetEnumerator()) {
    $name = $item.Key
    $path = $item.Value

    if (Test-Path $path) {
        Write-Host "[OK] $name : $path" -ForegroundColor Green
    } else {
        Write-Host "[FAIL] $name : $path" -ForegroundColor Red
    }
}

# Check service status
Write-Host "`nChecking existing services:" -ForegroundColor Cyan

$services = @("DMS-QA-Nginx", "DMS-QA-Backend")
foreach ($serviceName in $services) {
    try {
        $service = Get-Service -Name $serviceName -ErrorAction Stop
        Write-Host "[OK] $serviceName : $($service.Status)" -ForegroundColor Green
    } catch {
        Write-Host "[FAIL] $serviceName : Not installed" -ForegroundColor Yellow
    }
}

# Check port usage
Write-Host "`nChecking port usage:" -ForegroundColor Cyan

$ports = @(80, 443, 3001)
foreach ($port in $ports) {
    try {
        $connections = netstat -ano | Select-String ":$port "
        if ($connections) {
            Write-Host "[WARN] Port $port is in use" -ForegroundColor Yellow
            $connections | ForEach-Object { Write-Host "   $_" -ForegroundColor Gray }
        } else {
            Write-Host "[OK] Port $port is available" -ForegroundColor Green
        }
    } catch {
        Write-Host "[ERROR] Cannot check port $port" -ForegroundColor Red
    }
}

Write-Host "`nTesting completed!" -ForegroundColor Green
Read-Host "Press any key to exit"
