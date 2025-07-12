# DMS-QA 健康监控和自动恢复脚本
# 定期检查服务状态并自动恢复异常服务

param(
    [int]$CheckInterval = 60,  # 检查间隔（秒）
    [int]$MaxRetries = 3,      # 最大重试次数
    [switch]$RunOnce = $false  # 只运行一次检查
)

Write-Host "=== DMS-QA 健康监控器 ===" -ForegroundColor Green
Write-Host "检查间隔: $CheckInterval 秒" -ForegroundColor Cyan
Write-Host "最大重试: $MaxRetries 次" -ForegroundColor Cyan

$nginxService = "DMS-QA-Nginx"
$nodeService = "DMS-QA-Backend"
$logFile = "E:\WebProject\DMS-QA\server\logs\health-monitor.log"

# 确保日志目录存在
$logDir = Split-Path -Parent $logFile
if (!(Test-Path $logDir)) {
    New-Item -ItemType Directory -Path $logDir -Force
}

function Write-Log {
    param([string]$Message, [string]$Level = "INFO")
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $logEntry = "[$timestamp] [$Level] $Message"
    Write-Host $logEntry -ForegroundColor $(
        switch($Level) {
            "ERROR" { "Red" }
            "WARN" { "Yellow" }
            "SUCCESS" { "Green" }
            default { "White" }
        }
    )
    Add-Content -Path $logFile -Value $logEntry
}

function Test-ServiceHealth {
    param([string]$ServiceName)
    
    try {
        $service = Get-Service -Name $ServiceName -ErrorAction Stop
        return $service.Status -eq "Running"
    } catch {
        return $false
    }
}

function Test-WebServiceHealth {
    param([string]$Url, [int]$TimeoutSec = 10)
    
    try {
        $response = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec $TimeoutSec
        return $response.StatusCode -eq 200
    } catch {
        return $false
    }
}

function Restart-ServiceWithRetry {
    param([string]$ServiceName, [int]$MaxRetries = 3)
    
    for ($i = 1; $i -le $MaxRetries; $i++) {
        try {
            Write-Log "尝试重启服务 $ServiceName (第 $i 次)" "WARN"
            Restart-Service -Name $ServiceName -Force -ErrorAction Stop
            Start-Sleep -Seconds 5
            
            if (Test-ServiceHealth -ServiceName $ServiceName) {
                Write-Log "服务 $ServiceName 重启成功" "SUCCESS"
                return $true
            }
        } catch {
            Write-Log "服务 $ServiceName 重启失败: $($_.Exception.Message)" "ERROR"
        }
        
        if ($i -lt $MaxRetries) {
            Start-Sleep -Seconds 10
        }
    }
    
    Write-Log "服务 $ServiceName 重启失败，已达到最大重试次数" "ERROR"
    return $false
}

function Send-Alert {
    param([string]$Message)
    
    # 这里可以添加邮件通知、微信通知等
    Write-Log "ALERT: $Message" "ERROR"
    
    # 可以添加更多通知方式，例如：
    # - 发送邮件
    # - 调用 webhook
    # - 写入 Windows 事件日志
    
    # 写入 Windows 事件日志
    try {
        Write-EventLog -LogName Application -Source "DMS-QA-Monitor" -EventId 1001 -EntryType Error -Message $Message
    } catch {
        # 如果事件源不存在，创建它
        try {
            New-EventLog -LogName Application -Source "DMS-QA-Monitor"
            Write-EventLog -LogName Application -Source "DMS-QA-Monitor" -EventId 1001 -EntryType Error -Message $Message
        } catch {
            Write-Log "无法写入事件日志: $($_.Exception.Message)" "WARN"
        }
    }
}

function Perform-HealthCheck {
    Write-Log "开始健康检查" "INFO"
    
    $issues = @()
    
    # 检查 Nginx 服务
    if (!(Test-ServiceHealth -ServiceName $nginxService)) {
        $issues += "Nginx 服务未运行"
        Write-Log "Nginx 服务异常，尝试重启" "WARN"
        
        if (!(Restart-ServiceWithRetry -ServiceName $nginxService -MaxRetries $MaxRetries)) {
            Send-Alert "Nginx 服务重启失败，需要人工干预"
        }
    } else {
        Write-Log "Nginx 服务正常" "SUCCESS"
    }
    
    # 检查 Node.js 服务
    if (!(Test-ServiceHealth -ServiceName $nodeService)) {
        $issues += "Node.js 服务未运行"
        Write-Log "Node.js 服务异常，尝试重启" "WARN"
        
        if (!(Restart-ServiceWithRetry -ServiceName $nodeService -MaxRetries $MaxRetries)) {
            Send-Alert "Node.js 服务重启失败，需要人工干预"
        }
    } else {
        Write-Log "Node.js 服务正常" "SUCCESS"
        
        # 检查 Web 服务响应
        if (!(Test-WebServiceHealth -Url "http://localhost:3001/api/test-connection")) {
            $issues += "Node.js Web 服务无响应"
            Write-Log "Node.js Web 服务无响应，尝试重启" "WARN"
            
            if (!(Restart-ServiceWithRetry -ServiceName $nodeService -MaxRetries $MaxRetries)) {
                Send-Alert "Node.js Web 服务重启失败，需要人工干预"
            }
        } else {
            Write-Log "Node.js Web 服务响应正常" "SUCCESS"
        }
    }
    
    # 检查磁盘空间
    $systemDrive = Get-WmiObject -Class Win32_LogicalDisk | Where-Object { $_.DeviceID -eq "C:" }
    $freeSpaceGB = [math]::Round($systemDrive.FreeSpace / 1GB, 2)
    $totalSpaceGB = [math]::Round($systemDrive.Size / 1GB, 2)
    $freeSpacePercent = [math]::Round(($systemDrive.FreeSpace / $systemDrive.Size) * 100, 2)
    
    Write-Log "磁盘空间: $freeSpaceGB GB / $totalSpaceGB GB ($freeSpacePercent%)" "INFO"
    
    if ($freeSpacePercent -lt 10) {
        $issues += "磁盘空间不足 ($freeSpacePercent%)"
        Send-Alert "系统磁盘空间不足，剩余: $freeSpacePercent%"
    }
    
    # 检查内存使用
    $memory = Get-WmiObject -Class Win32_OperatingSystem
    $totalMemoryGB = [math]::Round($memory.TotalVisibleMemorySize / 1MB, 2)
    $freeMemoryGB = [math]::Round($memory.FreePhysicalMemory / 1MB, 2)
    $memoryUsagePercent = [math]::Round((($totalMemoryGB - $freeMemoryGB) / $totalMemoryGB) * 100, 2)
    
    Write-Log "内存使用: $memoryUsagePercent% ($freeMemoryGB GB 可用 / $totalMemoryGB GB 总计)" "INFO"
    
    if ($memoryUsagePercent -gt 90) {
        $issues += "内存使用率过高 ($memoryUsagePercent%)"
        Send-Alert "系统内存使用率过高: $memoryUsagePercent%"
    }
    
    if ($issues.Count -eq 0) {
        Write-Log "所有检查项目正常" "SUCCESS"
    } else {
        Write-Log "发现 $($issues.Count) 个问题: $($issues -join ', ')" "WARN"
    }
    
    Write-Log "健康检查完成" "INFO"
}

# 主循环
try {
    Write-Log "健康监控器启动" "INFO"
    
    do {
        Perform-HealthCheck
        
        if (!$RunOnce) {
            Write-Log "等待 $CheckInterval 秒后进行下次检查..." "INFO"
            Start-Sleep -Seconds $CheckInterval
        }
    } while (!$RunOnce)
    
} catch {
    Write-Log "监控器异常退出: $($_.Exception.Message)" "ERROR"
    Send-Alert "健康监控器异常退出: $($_.Exception.Message)"
} finally {
    Write-Log "健康监控器停止" "INFO"
}

Write-Host "`n=== 使用说明 ===" -ForegroundColor Cyan
Write-Host ".\health-monitor.ps1                    - 持续监控（60秒间隔）" -ForegroundColor White
Write-Host ".\health-monitor.ps1 -CheckInterval 30  - 持续监控（30秒间隔）" -ForegroundColor White
Write-Host ".\health-monitor.ps1 -RunOnce           - 只运行一次检查" -ForegroundColor White
Write-Host ".\health-monitor.ps1 -MaxRetries 5      - 设置最大重试次数" -ForegroundColor White
