# DMS-QA Service Management Script
# Used to manage Nginx and Node.js backend services

param(
    [Parameter(Mandatory=$false)]
    [ValidateSet("start", "stop", "restart", "status", "install", "uninstall", "logs")]
    [string]$Action = "status"
)

Write-Host "=== DMS-QA service manager ===" -ForegroundColor Green

$nginxService = "DMS-QA-Nginx"
$nodeService = "DMS-QA-Backend"

function Show-ServiceStatus {
    Write-Host "`Service status:" -ForegroundColor Cyan
    
    $nginx = Get-Service -Name $nginxService -ErrorAction SilentlyContinue
    $node = Get-Service -Name $nodeService -ErrorAction SilentlyContinue
    
    if ($nginx) {
        $status = $nginx.Status
        $color = if($status -eq "Running"){"Green"}elseif($status -eq "Stopped"){"Yellow"}else{"Red"}
        Write-Host "  $nginxService : $status" -ForegroundColor $color
    } else {
        Write-Host "  $nginxService : Not Installed" -ForegroundColor Red
    }
    
    if ($node) {
        $status = $node.Status
        $color = if($status -eq "Running"){"Green"}elseif($status -eq "Stopped"){"Yellow"}else{"Red"}
        Write-Host "  $nodeService : $status" -ForegroundColor $color
    } else {
        Write-Host "  $nodeService : Not Installed" -ForegroundColor Red
    }
}

function Start-Services {
    Write-Host "`Start Service..." -ForegroundColor Yellow
    
    try {
        Start-Service -Name $nginxService -ErrorAction Stop
        Write-Host "$nginxService Successfully started" -ForegroundColor Green
    } catch {
        Write-Host "$nginxService FAIL TO START: $($_.Exception.Message)" -ForegroundColor Red
    }
    
    Start-Sleep -Seconds 2
    
    try {
        Start-Service -Name $nodeService -ErrorAction Stop
        Write-Host "$nodeService Successfully started" -ForegroundColor Green
    } catch {
        Write-Host "$nodeService FAIL TO START: $($_.Exception.Message)" -ForegroundColor Red
    }
}

function Stop-Services {
    Write-Host "`stop service..." -ForegroundColor Yellow
    
    try {
        Stop-Service -Name $nodeService -Force -ErrorAction Stop
        Write-Host "$nodeService Stop successfully" -ForegroundColor Green
    } catch {
        Write-Host "$nodeService Stop failed: $($_.Exception.Message)" -ForegroundColor Red
    }
    
    try {
        Stop-Service -Name $nginxService -Force -ErrorAction Stop
        Write-Host "$nginxService Stop successfully" -ForegroundColor Green
    } catch {
        Write-Host "$nginxService Stop failed: $($_.Exception.Message)" -ForegroundColor Red
    }
}

function Restart-Services {
    Write-Host "`Restart the service..." -ForegroundColor Yellow
    Stop-Services
    Start-Sleep -Seconds 3
    Start-Services
}

function Show-Logs {
    Write-Host "`view log..." -ForegroundColor Yellow
    
    $nginxLogDir = "D:\WebServer\nginx-1.22.1\logs"  # Adjust the nginx path according to the actual situation
    $nodeLogDir = "D:\WebServer\backend\logs"
    
    Write-Host "`nNginx log directory: $nginxLogDir" -ForegroundColor Cyan
    if (Test-Path $nginxLogDir) {
        Get-ChildItem -Path $nginxLogDir -Filter "*.log" | ForEach-Object {
            Write-Host "  $($_.Name) - $($_.LastWriteTime)" -ForegroundColor White
        }
    } else {
        Write-Host "  The log directory does not exist" -ForegroundColor Red
    }
    
    Write-Host "`nNode.js log directory: $nodeLogDir" -ForegroundColor Cyan
    if (Test-Path $nodeLogDir) {
        Get-ChildItem -Path $nodeLogDir -Filter "*.log" | ForEach-Object {
            Write-Host "  $($_.Name) - $($_.LastWriteTime)" -ForegroundColor White
        }
    } else {
        Write-Host "  The log directory does not exist" -ForegroundColor Red
    }
    
    Write-Host "`View the latest error log:" -ForegroundColor Yellow
    $nodeErrorLog = "$nodeLogDir\service-stderr.log"
    if (Test-Path $nodeErrorLog) {
        Write-Host "Node.js Error log (last 10 lines):" -ForegroundColor Cyan
        Get-Content -Path $nodeErrorLog -Tail 10 | ForEach-Object {
            Write-Host "  $_" -ForegroundColor Gray
        }
    }
}

function Install-Services {
    Write-Host "`Installation service..." -ForegroundColor Yellow
    $scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
    $installScript = Join-Path $scriptDir "install-all-services.ps1"
    
    if (Test-Path $installScript) {
        & $installScript
    } else {
        Write-Host "Error: Installation script not found install-all-services.ps1" -ForegroundColor Red
    }
}

function Uninstall-Services {
    Write-Host "`Uninstall Service..." -ForegroundColor Yellow
    
    # Check if it is running as an administrator
    if (-NOT ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] "Administrator")) {
        Write-Host "Error: Please run this script as an administrator" -ForegroundColor Red
        return
    }
    
    $nssmPath = "D:\WebServer\tools\nssm-2.24\win64\nssm.exe"
    
    if (!(Test-Path $nssmPath)) {
        Write-Host "Error: NSSM not found" -ForegroundColor Red
        return
    }
    
    # Stop and delete the service
    Stop-Services
    
    Write-Host "Delete Service..." -ForegroundColor Yellow
    & $nssmPath remove $nodeService confirm
    & $nssmPath remove $nginxService confirm
    
    Write-Host "Service uninstallation completed" -ForegroundColor Green
}

# perform operations
switch ($Action.ToLower()) {
    "start" { Start-Services }
    "stop" { Stop-Services }
    "restart" { Restart-Services }
    "status" { Show-ServiceStatus }
    "install" { Install-Services }
    "uninstall" { Uninstall-Services }
    "logs" { Show-Logs }
    default { 
        Write-Host "Unknown operation: $Action" -ForegroundColor Red
        Write-Host "Available operations: start, stop, restart, status, install, uninstall, logs" -ForegroundColor Yellow
    }
}

Show-ServiceStatus

Write-Host "`=== instructions ===" -ForegroundColor Cyan
Write-Host ".\service-manager.ps1 start     - Start All Services" -ForegroundColor White
Write-Host ".\service-manager.ps1 stop      - Stop all services" -ForegroundColor White
Write-Host ".\service-manager.ps1 restart   - Restart all services" -ForegroundColor White
Write-Host ".\service-manager.ps1 status    - View Service Status" -ForegroundColor White
Write-Host ".\service-manager.ps1 install   - Install all services" -ForegroundColor White
Write-Host ".\service-manager.ps1 uninstall - Uninstall all services" -ForegroundColor White
Write-Host ".\service-manager.ps1 logs      - View log information" -ForegroundColor White
