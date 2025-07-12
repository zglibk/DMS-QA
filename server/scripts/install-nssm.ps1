# NSSM 安装脚本
# 用于下载和安装 NSSM (Non-Sucking Service Manager)

Write-Host "=== NSSM 安装脚本 ===" -ForegroundColor Green

# 检查是否以管理员身份运行
if (-NOT ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] "Administrator")) {
    Write-Host "错误: 请以管理员身份运行此脚本" -ForegroundColor Red
    Read-Host "按任意键退出"
    exit 1
}

# 设置路径（根据您的实际环境）
$downloadPath = "D:\WebServer\tools"
$nssmPath = "$downloadPath\nssm-2.24"

# 创建目录
if (!(Test-Path $downloadPath)) {
    New-Item -ItemType Directory -Path $downloadPath -Force
    Write-Host "创建目录: $downloadPath" -ForegroundColor Yellow
}

# 检查是否已安装
if (Test-Path "$nssmPath\win64\nssm.exe") {
    Write-Host "NSSM 已安装在: $nssmPath" -ForegroundColor Green
} else {
    Write-Host "NSSM 目录不存在，请检查路径: $nssmPath" -ForegroundColor Red
    Write-Host "当前检查的路径: $nssmPath\win64\nssm.exe" -ForegroundColor Yellow

    # 尝试查找 NSSM
    $possiblePaths = @(
        "D:\WebServer\tools\nssm-2.24\win64\nssm.exe",
        "D:\WebServer\tools\nssm-2.24\x64\nssm.exe",
        "C:\Tools\nssm\win64\nssm.exe"
    )

    $foundPath = $null
    foreach ($path in $possiblePaths) {
        if (Test-Path $path) {
            $foundPath = $path
            $nssmPath = Split-Path (Split-Path $path -Parent) -Parent
            Write-Host "找到 NSSM: $path" -ForegroundColor Green
            break
        }
    }

    if (!$foundPath) {
        Write-Host "未找到 NSSM，请确认以下路径之一存在:" -ForegroundColor Red
        $possiblePaths | ForEach-Object { Write-Host "  $_" -ForegroundColor Yellow }
        Read-Host "按任意键退出"
        exit 1
    }
}

# 添加到系统 PATH
$currentPath = [Environment]::GetEnvironmentVariable("Path", "Machine")
$nssmExePath = "$nssmPath\win64"

if ($currentPath -notlike "*$nssmExePath*") {
    $newPath = "$currentPath;$nssmExePath"
    [Environment]::SetEnvironmentVariable("Path", $newPath, "Machine")
    Write-Host "已添加 NSSM 到系统 PATH" -ForegroundColor Green
    Write-Host "请重新打开命令提示符以使用 nssm 命令" -ForegroundColor Yellow
} else {
    Write-Host "NSSM 已在系统 PATH 中" -ForegroundColor Green
}

Write-Host "=== 安装完成 ===" -ForegroundColor Green
Write-Host "NSSM 路径: $nssmExePath\nssm.exe" -ForegroundColor Cyan
Write-Host "使用方法: nssm install <服务名>" -ForegroundColor Cyan

Read-Host "按任意键退出"
