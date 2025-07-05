@echo off
chcp 65001 >nul
echo =================================
echo DMS-QA 防火墙配置工具
echo =================================
echo.

REM 检查管理员权限
net session >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ 错误：需要管理员权限！
    echo 请右键点击此文件，选择"以管理员身份运行"
    pause
    exit /b 1
)

echo ✅ 管理员权限确认
echo.

echo 🔥 正在配置防火墙规则...
echo.

REM 删除可能存在的旧规则
echo 清理旧规则...
netsh advfirewall firewall delete rule name="DMS-QA-Backend" >nul 2>&1
netsh advfirewall firewall delete rule name="DMS-QA-Frontend" >nul 2>&1
netsh advfirewall firewall delete rule name="DMS-QA-Backend-3001" >nul 2>&1
netsh advfirewall firewall delete rule name="DMS-QA-Frontend-8080" >nul 2>&1

REM 添加新的防火墙规则
echo 添加DMS-QA后端端口规则（3001）...
netsh advfirewall firewall add rule name="DMS-QA-Backend-3001" dir=in action=allow protocol=TCP localport=3001
if %errorlevel% equ 0 (
    echo ✅ 后端端口3001规则添加成功
) else (
    echo ❌ 后端端口3001规则添加失败
)

echo 添加DMS-QA前端端口规则（8080）...
netsh advfirewall firewall add rule name="DMS-QA-Frontend-8080" dir=in action=allow protocol=TCP localport=8080
if %errorlevel% equ 0 (
    echo ✅ 前端端口8080规则添加成功
) else (
    echo ❌ 前端端口8080规则添加失败
)

echo.
echo 🔍 验证防火墙规则...
echo.

echo 检查后端端口规则：
netsh advfirewall firewall show rule name="DMS-QA-Backend-3001" | findstr "规则名\|操作\|方向\|协议\|本地端口"

echo.
echo 检查前端端口规则：
netsh advfirewall firewall show rule name="DMS-QA-Frontend-8080" | findstr "规则名\|操作\|方向\|协议\|本地端口"

echo.
echo 📡 检查端口监听状态...
echo.

echo 后端端口3001监听状态：
netstat -ano | findstr :3001
if %errorlevel% neq 0 (
    echo ⚠️  端口3001未被监听，请确保DMS-QA后端服务正在运行
)

echo.
echo 前端端口8080监听状态：
netstat -ano | findstr :8080
if %errorlevel% neq 0 (
    echo ⚠️  端口8080未被监听，请确保前端服务正在运行
)

echo.
echo 🌐 获取服务器IP地址...
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /C:"IPv4"') do (
    set ip=%%a
    set ip=!ip: =!
    echo 服务器IP: !ip!
)

echo.
echo ✅ 防火墙配置完成！
echo.
echo 🧪 测试连接：
echo.
echo 从其他电脑测试以下地址：
echo 前端访问: http://192.168.1.57:8080
echo 后端API测试: http://192.168.1.57:3001/api/test-connection
echo.
echo 命令行测试：
echo curl http://192.168.1.57:3001/api/test-connection
echo telnet 192.168.1.57 3001
echo.

set /p test_now=是否立即测试本地连接？(y/n): 
if /i "%test_now%"=="y" (
    echo.
    echo 测试本地API连接...
    curl -s http://localhost:3001/api/test-connection 2>nul
    if %errorlevel% equ 0 (
        echo ✅ 本地API连接正常
    ) else (
        echo ❌ 本地API连接失败，请检查服务是否运行
    )
)

echo.
echo 🔧 如果仍无法远程访问，请检查：
echo 1. 路由器/交换机是否阻止了端口
echo 2. 客户端防火墙是否阻止了连接
echo 3. 网络是否在同一局域网段
echo.

pause
