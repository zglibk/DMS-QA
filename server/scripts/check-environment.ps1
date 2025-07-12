# 环境检测脚本
# 检测并确认所有必要的路径和文件

Write-Host "=== DMS-QA 环境检测 ===" -ForegroundColor Green

$checkResults = @()

function Test-PathAndReport {
    param(
        [string]$Description,
        [string]$Path,
        [string]$Type = "File"
    )
    
    $exists = Test-Path $Path
    $status = if ($exists) { "✅" } else { "❌" }
    $color = if ($exists) { "Green" } else { "Red" }
    
    Write-Host "$status $Description" -ForegroundColor $color
    Write-Host "   路径: $Path" -ForegroundColor Gray
    
    $script:checkResults += [PSCustomObject]@{
        Description = $Description
        Path = $Path
        Exists = $exists
        Type = $Type
    }
    
    return $exists
}

Write-Host "`n=== 检测 NSSM ===" -ForegroundColor Cyan

# 检测 NSSM
$nssmPaths = @(
    "D:\WebServer\tools\nssm-2.24\win64\nssm.exe",
    "D:\WebServer\tools\nssm-2.24\x64\nssm.exe",
    "C:\Tools\nssm\win64\nssm.exe"
)

$nssmFound = $false
$nssmPath = ""
foreach ($path in $nssmPaths) {
    if (Test-PathAndReport "NSSM 可执行文件" $path) {
        $nssmFound = $true
        $nssmPath = $path
        break
    }
}

if (!$nssmFound) {
    Write-Host "`n⚠️  未找到 NSSM，请检查以下位置:" -ForegroundColor Yellow
    $nssmPaths | ForEach-Object { Write-Host "   $_" -ForegroundColor Gray }
}

Write-Host "`n=== 检测 Nginx ===" -ForegroundColor Cyan

# 检测 Nginx
$nginxPaths = @(
    "D:\WebServer\nginx-1.22.1\nginx.exe",
    "C:\nginx-1.22.1\nginx.exe",
    "D:\nginx\nginx.exe",
    "C:\nginx\nginx.exe"
)

$nginxFound = $false
$nginxPath = ""
$nginxDir = ""
foreach ($path in $nginxPaths) {
    if (Test-PathAndReport "Nginx 可执行文件" $path) {
        $nginxFound = $true
        $nginxPath = $path
        $nginxDir = Split-Path $path -Parent
        
        # 检测 Nginx 配置文件
        $nginxConf = Join-Path $nginxDir "conf\nginx.conf"
        Test-PathAndReport "Nginx 配置文件" $nginxConf | Out-Null
        
        # 检测日志目录
        $nginxLogs = Join-Path $nginxDir "logs"
        Test-PathAndReport "Nginx 日志目录" $nginxLogs "Directory" | Out-Null
        
        break
    }
}

if (!$nginxFound) {
    Write-Host "`n⚠️  未找到 Nginx，请检查以下位置:" -ForegroundColor Yellow
    $nginxPaths | ForEach-Object { Write-Host "   $_" -ForegroundColor Gray }
}

Write-Host "`n=== 检测 Node.js ===" -ForegroundColor Cyan

# 检测 Node.js
$nodePaths = @(
    "C:\Program Files\nodejs\node.exe",
    "C:\Program Files (x86)\nodejs\node.exe",
    "D:\nodejs\node.exe",
    "D:\WebServer\nodejs\node.exe"
)

$nodeFound = $false
$nodePath = ""
foreach ($path in $nodePaths) {
    if (Test-PathAndReport "Node.js 可执行文件" $path) {
        $nodeFound = $true
        $nodePath = $path
        
        # 检测 Node.js 版本
        try {
            $nodeVersion = & $path --version
            Write-Host "   版本: $nodeVersion" -ForegroundColor Green
        } catch {
            Write-Host "   无法获取版本信息" -ForegroundColor Yellow
        }
        break
    }
}

if (!$nodeFound) {
    Write-Host "`n⚠️  未找到 Node.js，请检查以下位置:" -ForegroundColor Yellow
    $nodePaths | ForEach-Object { Write-Host "   $_" -ForegroundColor Gray }
    
    # 尝试从 PATH 中查找
    try {
        $nodeFromPath = Get-Command node -ErrorAction Stop
        Write-Host "✅ 在 PATH 中找到 Node.js: $($nodeFromPath.Source)" -ForegroundColor Green
        $nodeFound = $true
        $nodePath = $nodeFromPath.Source
    } catch {
        Write-Host "❌ PATH 中也未找到 Node.js" -ForegroundColor Red
    }
}

Write-Host "`n=== 检测项目文件 ===" -ForegroundColor Cyan

# 检测项目路径
$projectPath = "E:\WebProject\DMS-QA\server"
Test-PathAndReport "项目目录" $projectPath "Directory" | Out-Null

if (Test-Path $projectPath) {
    # 检测关键文件
    $appJs = Join-Path $projectPath "app.js"
    Test-PathAndReport "应用主文件" $appJs | Out-Null
    
    $packageJson = Join-Path $projectPath "package.json"
    Test-PathAndReport "Package.json" $packageJson | Out-Null
    
    $nodeModules = Join-Path $projectPath "node_modules"
    Test-PathAndReport "Node modules" $nodeModules "Directory" | Out-Null
}

Write-Host "`n=== 检测现有服务 ===" -ForegroundColor Cyan

# 检测现有服务
$services = @("DMS-QA-Nginx", "DMS-QA-Backend")
foreach ($serviceName in $services) {
    try {
        $service = Get-Service -Name $serviceName -ErrorAction Stop
        Write-Host "✅ 服务 $serviceName 已安装 (状态: $($service.Status))" -ForegroundColor Green
    } catch {
        Write-Host "❌ 服务 $serviceName 未安装" -ForegroundColor Yellow
    }
}

Write-Host "`n=== 检测结果汇总 ===" -ForegroundColor Cyan

$failedChecks = $checkResults | Where-Object { !$_.Exists }
$passedChecks = $checkResults | Where-Object { $_.Exists }

Write-Host "通过检测: $($passedChecks.Count) 项" -ForegroundColor Green
Write-Host "失败检测: $($failedChecks.Count) 项" -ForegroundColor Red

if ($failedChecks.Count -gt 0) {
    Write-Host "`n❌ 失败的检测项目:" -ForegroundColor Red
    $failedChecks | ForEach-Object {
        Write-Host "   $($_.Description): $($_.Path)" -ForegroundColor Yellow
    }
}

Write-Host "`n=== 建议的配置 ===" -ForegroundColor Cyan

if ($nssmFound) {
    Write-Host "NSSM 路径: $nssmPath" -ForegroundColor Green
}

if ($nginxFound) {
    Write-Host "Nginx 路径: $nginxPath" -ForegroundColor Green
    Write-Host "Nginx 目录: $nginxDir" -ForegroundColor Green
}

if ($nodeFound) {
    Write-Host "Node.js 路径: $nodePath" -ForegroundColor Green
}

Write-Host "项目路径: $projectPath" -ForegroundColor Green

# 生成配置文件
$configContent = @"
# DMS-QA 自动生成的配置
# 生成时间: $(Get-Date)

# NSSM 配置
`$nssmPath = "$nssmPath"

# Nginx 配置
`$nginxPath = "$nginxPath"
`$nginxDir = "$nginxDir"

# Node.js 配置
`$nodePath = "$nodePath"

# 项目配置
`$projectPath = "$projectPath"

# 服务名称
`$nginxServiceName = "DMS-QA-Nginx"
`$nodeServiceName = "DMS-QA-Backend"
"@

$configFile = Join-Path (Split-Path $MyInvocation.MyCommand.Path -Parent) "config.ps1"
$configContent | Out-File -FilePath $configFile -Encoding UTF8

Write-Host "`n✅ 配置文件已生成: $configFile" -ForegroundColor Green

if ($nssmFound -and $nginxFound -and $nodeFound) {
    Write-Host "`n🎉 环境检测通过！可以开始安装服务。" -ForegroundColor Green
    Write-Host "运行命令: .\install-all-services.ps1" -ForegroundColor Cyan
} else {
    Write-Host "`n⚠️  环境检测未完全通过，请先解决上述问题。" -ForegroundColor Yellow
}

Read-Host "`n按任意键退出"
