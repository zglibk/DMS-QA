# DMS-QA 服务管理脚本
# 用于管理 Nginx 和 Node.js 后端服务

param(
    [Parameter(Mandatory=$false)]
    [ValidateSet("start", "stop", "restart", "status", "install", "uninstall", "logs")]
    [string]$Action = "status"
)

Write-Host "=== DMS-QA 服务管理器 ===" -ForegroundColor Green

$nginxService = "DMS-QA-Nginx"
$nodeService = "DMS-QA-Backend"

function Show-ServiceStatus {
    Write-Host "`n服务状态:" -ForegroundColor Cyan
    
    $nginx = Get-Service -Name $nginxService -ErrorAction SilentlyContinue
    $node = Get-Service -Name $nodeService -ErrorAction SilentlyContinue
    
    if ($nginx) {
        $status = $nginx.Status
        $color = if($status -eq "Running"){"Green"}elseif($status -eq "Stopped"){"Yellow"}else{"Red"}
        Write-Host "  $nginxService : $status" -ForegroundColor $color
    } else {
        Write-Host "  $nginxService : 未安装" -ForegroundColor Red
    }
    
    if ($node) {
        $status = $node.Status
        $color = if($status -eq "Running"){"Green"}elseif($status -eq "Stopped"){"Yellow"}else{"Red"}
        Write-Host "  $nodeService : $status" -ForegroundColor $color
    } else {
        Write-Host "  $nodeService : 未安装" -ForegroundColor Red
    }
}

function Start-Services {
    Write-Host "`n启动服务..." -ForegroundColor Yellow
    
    try {
        Start-Service -Name $nginxService -ErrorAction Stop
        Write-Host "✅ $nginxService 启动成功" -ForegroundColor Green
    } catch {
        Write-Host "❌ $nginxService 启动失败: $($_.Exception.Message)" -ForegroundColor Red
    }
    
    Start-Sleep -Seconds 2
    
    try {
        Start-Service -Name $nodeService -ErrorAction Stop
        Write-Host "✅ $nodeService 启动成功" -ForegroundColor Green
    } catch {
        Write-Host "❌ $nodeService 启动失败: $($_.Exception.Message)" -ForegroundColor Red
    }
}

function Stop-Services {
    Write-Host "`n停止服务..." -ForegroundColor Yellow
    
    try {
        Stop-Service -Name $nodeService -Force -ErrorAction Stop
        Write-Host "✅ $nodeService 停止成功" -ForegroundColor Green
    } catch {
        Write-Host "❌ $nodeService 停止失败: $($_.Exception.Message)" -ForegroundColor Red
    }
    
    try {
        Stop-Service -Name $nginxService -Force -ErrorAction Stop
        Write-Host "✅ $nginxService 停止成功" -ForegroundColor Green
    } catch {
        Write-Host "❌ $nginxService 停止失败: $($_.Exception.Message)" -ForegroundColor Red
    }
}

function Restart-Services {
    Write-Host "`n重启服务..." -ForegroundColor Yellow
    Stop-Services
    Start-Sleep -Seconds 3
    Start-Services
}

function Show-Logs {
    Write-Host "`n查看日志..." -ForegroundColor Yellow
    
    $nginxLogDir = "D:\WebServer\nginx-1.22.1\logs"  # 根据实际 nginx 路径调整
    $nodeLogDir = "D:\WebServer\backend\logs"
    
    Write-Host "`nNginx 日志目录: $nginxLogDir" -ForegroundColor Cyan
    if (Test-Path $nginxLogDir) {
        Get-ChildItem -Path $nginxLogDir -Filter "*.log" | ForEach-Object {
            Write-Host "  $($_.Name) - $($_.LastWriteTime)" -ForegroundColor White
        }
    } else {
        Write-Host "  日志目录不存在" -ForegroundColor Red
    }
    
    Write-Host "`nNode.js 日志目录: $nodeLogDir" -ForegroundColor Cyan
    if (Test-Path $nodeLogDir) {
        Get-ChildItem -Path $nodeLogDir -Filter "*.log" | ForEach-Object {
            Write-Host "  $($_.Name) - $($_.LastWriteTime)" -ForegroundColor White
        }
    } else {
        Write-Host "  日志目录不存在" -ForegroundColor Red
    }
    
    Write-Host "`n查看最新错误日志:" -ForegroundColor Yellow
    $nodeErrorLog = "$nodeLogDir\service-stderr.log"
    if (Test-Path $nodeErrorLog) {
        Write-Host "Node.js 错误日志 (最后10行):" -ForegroundColor Cyan
        Get-Content -Path $nodeErrorLog -Tail 10 | ForEach-Object {
            Write-Host "  $_" -ForegroundColor Gray
        }
    }
}

function Install-Services {
    Write-Host "`n安装服务..." -ForegroundColor Yellow
    $scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
    $installScript = Join-Path $scriptDir "install-all-services.ps1"
    
    if (Test-Path $installScript) {
        & $installScript
    } else {
        Write-Host "错误: 未找到安装脚本 install-all-services.ps1" -ForegroundColor Red
    }
}

function Uninstall-Services {
    Write-Host "`n卸载服务..." -ForegroundColor Yellow
    
    # 检查是否以管理员身份运行
    if (-NOT ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] "Administrator")) {
        Write-Host "错误: 请以管理员身份运行此脚本" -ForegroundColor Red
        return
    }
    
    $nssmPath = "D:\WebServer\tools\nssm-2.24\win64\nssm.exe"
    
    if (!(Test-Path $nssmPath)) {
        Write-Host "错误: 未找到 NSSM" -ForegroundColor Red
        return
    }
    
    # 停止并删除服务
    Stop-Services
    
    Write-Host "删除服务..." -ForegroundColor Yellow
    & $nssmPath remove $nodeService confirm
    & $nssmPath remove $nginxService confirm
    
    Write-Host "✅ 服务卸载完成" -ForegroundColor Green
}

# 执行操作
switch ($Action.ToLower()) {
    "start" { Start-Services }
    "stop" { Stop-Services }
    "restart" { Restart-Services }
    "status" { Show-ServiceStatus }
    "install" { Install-Services }
    "uninstall" { Uninstall-Services }
    "logs" { Show-Logs }
    default { 
        Write-Host "未知操作: $Action" -ForegroundColor Red
        Write-Host "可用操作: start, stop, restart, status, install, uninstall, logs" -ForegroundColor Yellow
    }
}

Show-ServiceStatus

Write-Host "`n=== 使用说明 ===" -ForegroundColor Cyan
Write-Host ".\service-manager.ps1 start     - 启动所有服务" -ForegroundColor White
Write-Host ".\service-manager.ps1 stop      - 停止所有服务" -ForegroundColor White
Write-Host ".\service-manager.ps1 restart   - 重启所有服务" -ForegroundColor White
Write-Host ".\service-manager.ps1 status    - 查看服务状态" -ForegroundColor White
Write-Host ".\service-manager.ps1 install   - 安装所有服务" -ForegroundColor White
Write-Host ".\service-manager.ps1 uninstall - 卸载所有服务" -ForegroundColor White
Write-Host ".\service-manager.ps1 logs      - 查看日志信息" -ForegroundColor White
