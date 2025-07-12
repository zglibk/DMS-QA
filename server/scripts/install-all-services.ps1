# DMS-QA 系统服务一键安装脚本
# 自动安装 NSSM、Nginx 服务和 Node.js 后端服务

Write-Host "=== DMS-QA 系统服务一键安装 ===" -ForegroundColor Green
Write-Host "此脚本将安装以下服务:" -ForegroundColor Cyan
Write-Host "1. NSSM (服务管理工具)" -ForegroundColor White
Write-Host "2. DMS-QA-Nginx (Web 服务器)" -ForegroundColor White
Write-Host "3. DMS-QA-Backend (Node.js 后端)" -ForegroundColor White

# 检查是否以管理员身份运行
if (-NOT ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] "Administrator")) {
    Write-Host "`n❌ 错误: 请以管理员身份运行此脚本" -ForegroundColor Red
    Write-Host "右键点击 PowerShell 并选择 '以管理员身份运行'" -ForegroundColor Yellow
    Read-Host "按任意键退出"
    exit 1
}

Write-Host "`n确认安装? (Y/N): " -ForegroundColor Yellow -NoNewline
$confirm = Read-Host
if ($confirm -ne "Y" -and $confirm -ne "y") {
    Write-Host "安装已取消" -ForegroundColor Yellow
    exit 0
}

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path

try {
    # 步骤 0: 环境检测
    Write-Host "`n=== 步骤 0/4: 环境检测 ===" -ForegroundColor Green
    $checkScript = Join-Path $scriptDir "check-environment.ps1"
    if (Test-Path $checkScript) {
        & $checkScript
    } else {
        Write-Host "警告: 未找到环境检测脚本，跳过检测" -ForegroundColor Yellow
    }

    Write-Host "`n环境检测完成，按任意键继续安装..." -ForegroundColor Yellow
    Read-Host

    # 步骤 1: 确认 NSSM
    Write-Host "`n=== 步骤 1/3: 确认 NSSM ===" -ForegroundColor Green

    # 检查 NSSM 是否存在
    $nssmPaths = @(
        "D:\WebServer\tools\nssm-2.24\win64\nssm.exe",
        "D:\WebServer\tools\nssm-2.24\x64\nssm.exe"
    )

    $nssmFound = $false
    foreach ($path in $nssmPaths) {
        if (Test-Path $path) {
            Write-Host "✅ 找到 NSSM: $path" -ForegroundColor Green
            $nssmFound = $true
            break
        }
    }

    if (!$nssmFound) {
        Write-Host "❌ 未找到 NSSM，请确认路径正确" -ForegroundColor Red
        Write-Host "预期路径: D:\WebServer\tools\nssm-2.24\win64\nssm.exe" -ForegroundColor Yellow
        exit 1
    }

    # 等待用户确认 NSSM 安装完成
    Write-Host "`nNSSM 安装完成，按任意键继续..." -ForegroundColor Yellow
    Read-Host

    # 步骤 2: 安装 Nginx 服务
    Write-Host "`n=== 步骤 2/3: 安装 Nginx 服务 ===" -ForegroundColor Green
    $nginxScript = Join-Path $scriptDir "install-nginx-service.ps1"
    if (Test-Path $nginxScript) {
        & $nginxScript
    } else {
        Write-Host "错误: 未找到 install-nginx-service.ps1" -ForegroundColor Red
        exit 1
    }

    # 等待用户确认 Nginx 服务安装完成
    Write-Host "`nNginx 服务安装完成，按任意键继续..." -ForegroundColor Yellow
    Read-Host

    # 步骤 3: 安装 Node.js 服务
    Write-Host "`n=== 步骤 3/3: 安装 Node.js 服务 ===" -ForegroundColor Green
    $nodeScript = Join-Path $scriptDir "install-node-service.ps1"
    if (Test-Path $nodeScript) {
        & $nodeScript
    } else {
        Write-Host "错误: 未找到 install-node-service.ps1" -ForegroundColor Red
        exit 1
    }

    # 最终检查
    Write-Host "`n=== 安装完成检查 ===" -ForegroundColor Green
    
    $nginxService = Get-Service -Name "DMS-QA-Nginx" -ErrorAction SilentlyContinue
    $nodeService = Get-Service -Name "DMS-QA-Backend" -ErrorAction SilentlyContinue
    
    Write-Host "`n服务状态:" -ForegroundColor Cyan
    if ($nginxService) {
        Write-Host "DMS-QA-Nginx: $($nginxService.Status)" -ForegroundColor $(if($nginxService.Status -eq "Running"){"Green"}else{"Red"})
    } else {
        Write-Host "DMS-QA-Nginx: 未安装" -ForegroundColor Red
    }
    
    if ($nodeService) {
        Write-Host "DMS-QA-Backend: $($nodeService.Status)" -ForegroundColor $(if($nodeService.Status -eq "Running"){"Green"}else{"Red"})
    } else {
        Write-Host "DMS-QA-Backend: 未安装" -ForegroundColor Red
    }

    # 测试服务
    Write-Host "`n测试服务连接..." -ForegroundColor Yellow
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:3001/api/test-connection" -UseBasicParsing -TimeoutSec 10
        if ($response.StatusCode -eq 200) {
            Write-Host "✅ 后端服务响应正常!" -ForegroundColor Green
        }
    } catch {
        Write-Host "⚠️ 后端服务测试失败，请检查服务状态" -ForegroundColor Yellow
    }

    Write-Host "`n=== 安装完成! ===" -ForegroundColor Green
    Write-Host "所有服务已安装并配置为开机自启动" -ForegroundColor Cyan
    Write-Host "服务将在系统重启后自动启动" -ForegroundColor Cyan

} catch {
    Write-Host "`n❌ 安装过程中出现错误: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "请检查错误信息并重新运行脚本" -ForegroundColor Yellow
}

Write-Host "`n=== 常用管理命令 ===" -ForegroundColor Cyan
Write-Host "查看所有服务状态:" -ForegroundColor White
Write-Host "  Get-Service -Name 'DMS-QA-*'" -ForegroundColor Gray
Write-Host "重启所有服务:" -ForegroundColor White
Write-Host "  Restart-Service -Name 'DMS-QA-Nginx','DMS-QA-Backend'" -ForegroundColor Gray
Write-Host "停止所有服务:" -ForegroundColor White
Write-Host "  Stop-Service -Name 'DMS-QA-Nginx','DMS-QA-Backend'" -ForegroundColor Gray

Read-Host "`n按任意键退出"
