# DMS-QA Service Installation Script - English Version
# Install both Nginx and Node.js services using NSSM

Write-Host "=== DMS-QA Service Installation Script ===" -ForegroundColor Green

# Check administrator privileges
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] "Administrator")
if (-not $isAdmin) {
    Write-Host "[ERROR] Please run this script as administrator" -ForegroundColor Red
    Read-Host "Press any key to exit"
    exit 1
}

# Configuration
$nginxServiceName = "DMS-QA-Nginx"
$nodeServiceName = "DMS-QA-Backend"
$nginxPath = "D:\WebServer\nginx-1.22.1\nginx.exe"
$nginxDir = "D:\WebServer\nginx-1.22.1"
$nodePath = "D:\Program Files\node\node.exe"
$projectPath = "D:\WebServer\backend"
$appScript = "app.js"
$nssmPath = "D:\WebServer\tools\nssm-2.24\win64\nssm.exe"

Write-Host "`nConfiguration:" -ForegroundColor Cyan
Write-Host "  Nginx Service: $nginxServiceName" -ForegroundColor White
Write-Host "  Node Service: $nodeServiceName" -ForegroundColor White
Write-Host "  NSSM Path: $nssmPath" -ForegroundColor White

# Function to check path and find alternatives
function Find-ExecutablePath {
    param(
        [string]$PrimaryPath,
        [string[]]$AlternativePaths,
        [string]$Name
    )
    
    if (Test-Path $PrimaryPath) {
        Write-Host "[OK] Found $Name at: $PrimaryPath" -ForegroundColor Green
        return $PrimaryPath
    }
    
    foreach ($altPath in $AlternativePaths) {
        if (Test-Path $altPath) {
            Write-Host "[OK] Found $Name at: $altPath" -ForegroundColor Green
            return $altPath
        }
    }
    
    Write-Host "[ERROR] $Name not found. Checked paths:" -ForegroundColor Red
    Write-Host "  Primary: $PrimaryPath" -ForegroundColor Yellow
    foreach ($altPath in $AlternativePaths) {
        Write-Host "  Alternative: $altPath" -ForegroundColor Yellow
    }
    return $null
}

# Check NSSM
Write-Host "`nStep 1: Checking NSSM..." -ForegroundColor Yellow
$nssmAltPaths = @(
    "D:\WebServer\tools\nssm-2.24\x64\nssm.exe",
    "C:\Tools\nssm\win64\nssm.exe"
)
$nssmPath = Find-ExecutablePath -PrimaryPath $nssmPath -AlternativePaths $nssmAltPaths -Name "NSSM"
if (-not $nssmPath) {
    Read-Host "Press any key to exit"
    exit 1
}

# Check Nginx
Write-Host "`nStep 2: Checking Nginx..." -ForegroundColor Yellow
$nginxAltPaths = @(
    "C:\nginx-1.22.1\nginx.exe",
    "D:\nginx\nginx.exe",
    "C:\nginx\nginx.exe"
)
$nginxPath = Find-ExecutablePath -PrimaryPath $nginxPath -AlternativePaths $nginxAltPaths -Name "Nginx"
if (-not $nginxPath) {
    Read-Host "Press any key to exit"
    exit 1
}
$nginxDir = Split-Path $nginxPath -Parent

# Check Node.js
Write-Host "`nStep 3: Checking Node.js..." -ForegroundColor Yellow
$nodeAltPaths = @(
    "C:\Program Files\nodejs\node.exe",
    "C:\Program Files (x86)\nodejs\node.exe",
    "D:\nodejs\node.exe"
)
$nodePath = Find-ExecutablePath -PrimaryPath $nodePath -AlternativePaths $nodeAltPaths -Name "Node.js"
if (-not $nodePath) {
    Read-Host "Press any key to exit"
    exit 1
}

# Check project files
Write-Host "`nStep 4: Checking project files..." -ForegroundColor Yellow
if (-not (Test-Path $projectPath)) {
    Write-Host "[ERROR] Project directory not found: $projectPath" -ForegroundColor Red
    Read-Host "Press any key to exit"
    exit 1
}

$appPath = Join-Path $projectPath $appScript
if (-not (Test-Path $appPath)) {
    Write-Host "[ERROR] Application file not found: $appPath" -ForegroundColor Red
    Read-Host "Press any key to exit"
    exit 1
}

Write-Host "[OK] Project files check passed" -ForegroundColor Green

# Function to install service
function Install-ServiceWithNSSM {
    param(
        [string]$ServiceName,
        [string]$ExecutablePath,
        [string]$Arguments = "",
        [string]$WorkingDirectory,
        [string]$Description
    )
    
    Write-Host "`nInstalling service: $ServiceName" -ForegroundColor Green
    
    # Remove existing service if exists
    try {
        $existingService = Get-Service -Name $ServiceName -ErrorAction SilentlyContinue
        if ($existingService) {
            Write-Host "Stopping existing service..." -ForegroundColor Yellow
            Stop-Service -Name $ServiceName -Force -ErrorAction SilentlyContinue
            & $nssmPath remove $ServiceName confirm
            Start-Sleep -Seconds 2
        }
    } catch {
        Write-Host "Warning: $($_.Exception.Message)" -ForegroundColor Yellow
    }
    
    # Install service
    if ($Arguments) {
        & $nssmPath install $ServiceName $ExecutablePath $Arguments
    } else {
        & $nssmPath install $ServiceName $ExecutablePath
    }
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "[ERROR] Failed to install service: $ServiceName" -ForegroundColor Red
        return $false
    }
    
    # Configure service
    & $nssmPath set $ServiceName AppDirectory $WorkingDirectory
    & $nssmPath set $ServiceName Description $Description
    & $nssmPath set $ServiceName Start SERVICE_AUTO_START
    
    # Setup logging
    $logDir = Join-Path $WorkingDirectory "logs"
    if (-not (Test-Path $logDir)) {
        New-Item -ItemType Directory -Path $logDir -Force | Out-Null
    }
    
    & $nssmPath set $ServiceName AppStdout "$logDir\service-stdout.log"
    & $nssmPath set $ServiceName AppStderr "$logDir\service-stderr.log"
    & $nssmPath set $ServiceName AppRotateFiles 1
    & $nssmPath set $ServiceName AppRotateOnline 1
    & $nssmPath set $ServiceName AppRotateSeconds 86400
    & $nssmPath set $ServiceName AppRotateBytes 1048576
    
    Write-Host "[OK] Service $ServiceName installed successfully" -ForegroundColor Green
    return $true
}

# Install Nginx service
Write-Host "`nStep 5: Installing Nginx service..." -ForegroundColor Yellow
$nginxInstalled = Install-ServiceWithNSSM -ServiceName $nginxServiceName -ExecutablePath $nginxPath -WorkingDirectory $nginxDir -Description "DMS-QA Nginx Web Server"

# Install Node.js service
Write-Host "`nStep 6: Installing Node.js service..." -ForegroundColor Yellow
$nodeInstalled = Install-ServiceWithNSSM -ServiceName $nodeServiceName -ExecutablePath $nodePath -Arguments $appScript -WorkingDirectory $projectPath -Description "DMS-QA Node.js Backend Service"

# Start services
Write-Host "`nStep 7: Starting services..." -ForegroundColor Yellow

if ($nginxInstalled) {
    try {
        Start-Service -Name $nginxServiceName
        Start-Sleep -Seconds 3
        $nginxService = Get-Service -Name $nginxServiceName
        Write-Host "[OK] Nginx service status: $($nginxService.Status)" -ForegroundColor Green
    } catch {
        Write-Host "[ERROR] Failed to start Nginx service: $($_.Exception.Message)" -ForegroundColor Red
    }
}

if ($nodeInstalled) {
    try {
        Start-Service -Name $nodeServiceName
        Start-Sleep -Seconds 5
        $nodeService = Get-Service -Name $nodeServiceName
        Write-Host "[OK] Node.js service status: $($nodeService.Status)" -ForegroundColor Green
        
        # Test API connection
        Write-Host "Testing API connection..." -ForegroundColor Yellow
        Start-Sleep -Seconds 3
        try {
            $response = Invoke-WebRequest -Uri "http://localhost:3001/api/test-connection" -UseBasicParsing -TimeoutSec 10
            if ($response.StatusCode -eq 200) {
                Write-Host "[OK] API is responding normally" -ForegroundColor Green
            }
        } catch {
            Write-Host "[WARN] API test failed, service may still be starting" -ForegroundColor Yellow
        }
    } catch {
        Write-Host "[ERROR] Failed to start Node.js service: $($_.Exception.Message)" -ForegroundColor Red
    }
}

# Final status
Write-Host "`n=== Installation Summary ===" -ForegroundColor Cyan
$services = Get-Service -Name "DMS-QA-*" -ErrorAction SilentlyContinue
foreach ($service in $services) {
    $status = $service.Status
    $color = if ($status -eq "Running") { "Green" } else { "Red" }
    Write-Host "$($service.Name): $status" -ForegroundColor $color
}

Write-Host "`n=== Service Management Commands ===" -ForegroundColor Cyan
Write-Host "Check status: Get-Service -Name 'DMS-QA-*'" -ForegroundColor White
Write-Host "Start all: Start-Service -Name 'DMS-QA-Nginx','DMS-QA-Backend'" -ForegroundColor White
Write-Host "Stop all: Stop-Service -Name 'DMS-QA-Nginx','DMS-QA-Backend'" -ForegroundColor White
Write-Host "Restart all: Restart-Service -Name 'DMS-QA-Nginx','DMS-QA-Backend'" -ForegroundColor White

Write-Host "`nInstallation completed!" -ForegroundColor Green
Read-Host "Press any key to exit"
