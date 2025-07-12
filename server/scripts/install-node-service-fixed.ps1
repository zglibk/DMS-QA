# Node.js Backend Service Installation Script - Fixed Version
# Use NSSM to install Node.js application as Windows Service

Write-Host "=== Node.js Backend Service Installation Script (Fixed Version) ===" -ForegroundColor Green

# Check administrator privileges
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] "Administrator")
if (-not $isAdmin) {
    Write-Host "ERROR: Please run this script as administrator" -ForegroundColor Red
    Read-Host "Press any key to exit"
    exit 1
}

# Configuration parameters
$serviceName = "DMS-QA-Backend"
$projectPath = "D:\WebServer\backend"
$nodePath = "D:\Program Files\node\node.exe"
$appScript = "app.js"
$nssmPath = "D:\WebServer\tools\nssm-2.24\win64\nssm.exe"

Write-Host "Configuration:" -ForegroundColor Cyan
Write-Host "  Service Name: $serviceName" -ForegroundColor White
Write-Host "  Project Path: $projectPath" -ForegroundColor White
Write-Host "  Node.js Path: $nodePath" -ForegroundColor White
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

# Check Node.js
Write-Host "`Check out Node.js......" -ForegroundColor Yellow
if (-not (Test-Path $nodePath)) {
    Write-Host "Error: Node.js not found: $nodePath" -ForegroundColor Red
    
    # Try another path
    $altNodePaths = @(
        "C:\Program Files\nodejs\node.exe",
        "C:\Program Files (x86)\nodejs\node.exe",
        "D:\nodejs\node.exe"
    )
    
    $foundNode = $false
    foreach ($altPath in $altNodePaths) {
        if (Test-Path $altPath) {
            $nodePath = $altPath
            Write-Host "Find Node.js: $nodePath" -ForegroundColor Green
            $foundNode = $true
            break
        }
    }
    
    if (-not $foundNode) {
        Write-Host "Node.js not found, please check your installation" -ForegroundColor Red
        Read-Host "Press any key to exit"
        exit 1
    }
} else {
    Write-Host "Node.js check passed" -ForegroundColor Green
}

# Check the project path
Write-Host "`Checking project paths..." -ForegroundColor Yellow
if (-not (Test-Path $projectPath)) {
    Write-Host "Error: Project path not found: $projectPath" -ForegroundColor Red
    Read-Host "Press any key to exit"
    exit 1
}

$appPath = Join-Path $projectPath $appScript
if (-not (Test-Path $appPath)) {
    Write-Host "Error: Application file not found: $appPath" -ForegroundColor Red
    Read-Host "Press any key to exit"
    exit 1
}

Write-Host "Project file check passed" -ForegroundColor Green

# Stop existing services
Write-Host "`Checking available services..." -ForegroundColor Yellow
try {
    $existingService = Get-Service -Name $serviceName -ErrorAction SilentlyContinue
    if ($existingService) {
        Write-Host "Stop existing services: $serviceName" -ForegroundColor Yellow
        Stop-Service -Name $serviceName -Force -ErrorAction SilentlyContinue
        
        Write-Host "Deleting an existing service: $serviceName" -ForegroundColor Yellow
        & $nssmPath remove $serviceName confirm
        Start-Sleep -Seconds 2
    }
} catch {
    Write-Host "Error checking for existing services: $($_.Exception.Message)" -ForegroundColor Yellow
}

# Installing a new service
Write-Host "`Install Node.js server..." -ForegroundColor Green
try {
    & $nssmPath install $serviceName $nodePath $appScript
    if ($LASTEXITCODE -ne 0) {
        throw "NSSM install command fails"
    }
    Write-Host "Service installation successful" -ForegroundColor Green
} catch {
    Write-Host "Service installation failed: $($_.Exception.Message)" -ForegroundColor Red
    Read-Host "Press any key to exit"
    exit 1
}

# Configuring service parameters
Write-Host "`Configure service parameters..." -ForegroundColor Yellow

# Set the working directory
& $nssmPath set $serviceName AppDirectory $projectPath

# Set the service description
& $nssmPath set $serviceName Description "DMS-QA Node.js Backend Service"

# Set the startup type
& $nssmPath set $serviceName Start SERVICE_AUTO_START

# Setting Environment Variables
& $nssmPath set $serviceName AppEnvironmentExtra "NODE_ENV=production"

# Create a log directory
$logDir = Join-Path $projectPath "logs"
if (-not (Test-Path $logDir)) {
    New-Item -ItemType Directory -Path $logDir -Force | Out-Null
}

# Setting up logging
& $nssmPath set $serviceName AppStdout "$logDir\service-stdout.log"
& $nssmPath set $serviceName AppStderr "$logDir\service-stderr.log"

# Setting up log rotation
& $nssmPath set $serviceName AppRotateFiles 1
& $nssmPath set $serviceName AppRotateOnline 1
& $nssmPath set $serviceName AppRotateSeconds 86400
& $nssmPath set $serviceName AppRotateBytes 10485760

# Setting process priority
& $nssmPath set $serviceName AppPriority NORMAL_PRIORITY_CLASS

# Setting service recovery options
& $nssmPath set $serviceName AppExit Default Restart
& $nssmPath set $serviceName AppRestartDelay 10000

Write-Host "Service parameter configuration completed" -ForegroundColor Green

# Start the service
Write-Host "`Start the service..." -ForegroundColor Green
try {
    Start-Service -Name $serviceName
    Start-Sleep -Seconds 5
    
    $service = Get-Service -Name $serviceName
    if ($service.Status -eq "Running") {
        Write-Host "Node.js The service was installed and started successfully!" -ForegroundColor Green
        Write-Host "Service Name: $serviceName" -ForegroundColor Cyan
        Write-Host "state: $($service.Status)" -ForegroundColor Cyan
        
        # Testing service response
        Write-Host "Testing service connection..." -ForegroundColor Yellow
        Start-Sleep -Seconds 3
        try {
            $response = Invoke-WebRequest -Uri "http://localhost:3001/api/test-connection" -UseBasicParsing -TimeoutSec 10
            if ($response.StatusCode -eq 200) {
                Write-Host "Service response is normal!" -ForegroundColor Green
            }
        } catch {
            Write-Host "The service may still be starting, please test it later" -ForegroundColor Yellow
        }
    } else {
        Write-Host "Service startup failed, status: $($service.Status)" -ForegroundColor Red
        Write-Host "Please check the log: $logDir" -ForegroundColor Yellow
    }
} catch {
    Write-Host "Error starting service: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n=== Service Management Commands ===" -ForegroundColor Cyan
Write-Host "Start service: Start-Service -Name $serviceName" -ForegroundColor White
Write-Host "Stop service: Stop-Service -Name $serviceName" -ForegroundColor White
Write-Host "Restart service: Restart-Service -Name $serviceName" -ForegroundColor White
Write-Host "View Status: Get-Service -Name $serviceName" -ForegroundColor White
Write-Host "Deleting service: $nssmPath remove $serviceName" -ForegroundColor White

Read-Host "`Press any key to exit"
