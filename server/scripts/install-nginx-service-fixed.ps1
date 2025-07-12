# Nginx Service Installation Script - Fixed Version
# Use NSSM to install Nginx as Windows Service

Write-Host "=== Nginx Service Installation Script (Fixed Version) ===" -ForegroundColor Green

# Check administrator privileges
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] "Administrator")
if (-not $isAdmin) {
    Write-Host "ERROR: Please run this script as administrator" -ForegroundColor Red
    Read-Host "Press any key to exit"
    exit 1
}

# Configuration parameters
$serviceName = "DMS-QA-Nginx"
$nginxPath = "D:\WebServer\nginx-1.22.1\nginx.exe"
$nginxDir = "D:\WebServer\nginx-1.22.1"
$nssmPath = "D:\WebServer\tools\nssm-2.24\win64\nssm.exe"

Write-Host "Configuration:" -ForegroundColor Cyan
Write-Host "  Service Name: $serviceName" -ForegroundColor White
Write-Host "  Nginx Path: $nginxPath" -ForegroundColor White
Write-Host "  NSSM Path: $nssmPath" -ForegroundColor White

# Check NSSM
Write-Host "`nChecking NSSM..." -ForegroundColor Yellow
if (-not (Test-Path $nssmPath)) {
    Write-Host "ERROR: NSSM not found: $nssmPath" -ForegroundColor Red

    # Try alternative paths
    $altPaths = @(
        "D:\WebServer\tools\nssm-2.24\x64\nssm.exe",
        "C:\Tools\nssm\win64\nssm.exe"
    )

    $found = $false
    foreach ($altPath in $altPaths) {
        if (Test-Path $altPath) {
            $nssmPath = $altPath
            Write-Host "[OK] Found NSSM: $nssmPath" -ForegroundColor Green
            $found = $true
            break
        }
    }

    if (-not $found) {
        Write-Host "NSSM not found, please check installation" -ForegroundColor Red
        Read-Host "Press any key to exit"
        exit 1
    }
} else {
    Write-Host "[OK] NSSM check passed" -ForegroundColor Green
}

# Check Nginx
Write-Host "`nChecking Nginx..." -ForegroundColor Yellow
if (-not (Test-Path $nginxPath)) {
    Write-Host "ERROR: Nginx not found: $nginxPath" -ForegroundColor Red

    # Try alternative paths
    $altNginxPaths = @(
        "C:\nginx-1.22.1\nginx.exe",
        "D:\nginx\nginx.exe",
        "C:\nginx\nginx.exe"
    )

    $foundNginx = $false
    foreach ($altPath in $altNginxPaths) {
        if (Test-Path $altPath) {
            $nginxPath = $altPath
            $nginxDir = Split-Path $altPath -Parent
            Write-Host "[OK] Found Nginx: $nginxPath" -ForegroundColor Green
            $foundNginx = $true
            break
        }
    }

    if (-not $foundNginx) {
        Write-Host "Nginx not found, please check installation" -ForegroundColor Red
        Read-Host "Press any key to exit"
        exit 1
    }
} else {
    Write-Host "[OK] Nginx check passed" -ForegroundColor Green
}

# Stop existing service
Write-Host "`nChecking existing service..." -ForegroundColor Yellow
try {
    $existingService = Get-Service -Name $serviceName -ErrorAction SilentlyContinue
    if ($existingService) {
        Write-Host "Stopping existing service: $serviceName" -ForegroundColor Yellow
        Stop-Service -Name $serviceName -Force -ErrorAction SilentlyContinue

        Write-Host "Removing existing service: $serviceName" -ForegroundColor Yellow
        & $nssmPath remove $serviceName confirm
        Start-Sleep -Seconds 2
    }
} catch {
    Write-Host "Error checking existing service: $($_.Exception.Message)" -ForegroundColor Yellow
}

# Install new service
Write-Host "`nInstalling Nginx service..." -ForegroundColor Green
try {
    & $nssmPath install $serviceName $nginxPath
    if ($LASTEXITCODE -ne 0) {
        throw "NSSM install command failed"
    }
    Write-Host "[OK] Service installed successfully" -ForegroundColor Green
} catch {
    Write-Host "Service installation failed: $($_.Exception.Message)" -ForegroundColor Red
    Read-Host "Press any key to exit"
    exit 1
}

# Configure service parameters
Write-Host "`nConfiguring service parameters..." -ForegroundColor Yellow

# Set working Directory
& $nssmPath set $serviceName AppDirectory $nginxDir

# Set service description
& $nssmPath set $serviceName Description "DMS-QA Nginx Web Server"

# Set startup type
& $nssmPath set $serviceName Start SERVICE_AUTO_START

# Create log directory
$logDir = Join-Path $nginxDir "logs"
if (-not (Test-Path $logDir)) {
    New-Item -ItemType Directory -Path $logDir -Force | Out-Null
}

# Set logs
& $nssmPath set $serviceName AppStdout "$logDir\service-stdout.log"
& $nssmPath set $serviceName AppStderr "$logDir\service-stderr.log"

# Set log rotation
& $nssmPath set $serviceName AppRotateFiles 1
& $nssmPath set $serviceName AppRotateOnline 1
& $nssmPath set $serviceName AppRotateSeconds 86400
& $nssmPath set $serviceName AppRotateBytes 1048576

# Set process priority
& $nssmPath set $serviceName AppPriority NORMAL_PRIORITY_CLASS

# Set service recovery options
& $nssmPath set $serviceName AppExit Default Restart
& $nssmPath set $serviceName AppRestartDelay 5000

Write-Host "[OK] Service parameters configured" -ForegroundColor Green

# Start service
Write-Host "`nStarting service..." -ForegroundColor Green
try {
    Start-Service -Name $serviceName
    Start-Sleep -Seconds 3

    $service = Get-Service -Name $serviceName
    if ($service.Status -eq "Running") {
        Write-Host "[SUCCESS] Nginx service installed and started successfully!" -ForegroundColor Green
        Write-Host "Service Name: $serviceName" -ForegroundColor Cyan
        Write-Host "Status: $($service.Status)" -ForegroundColor Cyan
    } else {
        Write-Host "[FAIL] Service failed to start, Status: $($service.Status)" -ForegroundColor Red
        Write-Host "Please check logs: $logDir" -ForegroundColor Yellow
    }
} catch {
    Write-Host "Error starting service: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n=== Service Management Commands ===" -ForegroundColor Cyan
Write-Host "Start service: Start-Service -Name $serviceName" -ForegroundColor White
Write-Host "Stop service: Stop-Service -Name $serviceName" -ForegroundColor White
Write-Host "Restart service: Restart-Service -Name $serviceName" -ForegroundColor White
Write-Host "Check status: Get-Service -Name $serviceName" -ForegroundColor White
Write-Host "Remove service: $nssmPath remove $serviceName" -ForegroundColor White

Read-Host "`nPress any key to exit"
