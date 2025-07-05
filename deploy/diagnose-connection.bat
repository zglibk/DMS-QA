@echo off
chcp 65001 >nul
echo =================================
echo DMS-QA 连接诊断工具
echo =================================
echo.

echo 🔍 正在诊断DMS-QA连接问题...
echo.

echo 📊 1. 检查服务状态
echo --------------------------------
echo 检查DMS-QA后端服务：
sc query DMS-QA-Backend 2>nul
if %errorlevel% neq 0 (
    echo ❌ DMS-QA-Backend服务未找到或未运行
) else (
    echo ✅ DMS-QA-Backend服务状态正常
)
echo.

echo 检查PM2进程：
pm2 list 2>nul | findstr dms-qa-backend
if %errorlevel% neq 0 (
    echo ⚠️  PM2中未找到dms-qa-backend进程
) else (
    echo ✅ PM2进程状态正常
)
echo.

echo 📡 2. 检查端口监听
echo --------------------------------
echo 检查端口3001（后端API）：
netstat -ano | findstr :3001
if %errorlevel% neq 0 (
    echo ❌ 端口3001未被监听
) else (
    echo ✅ 端口3001正在监听
)
echo.

echo 检查端口8080（前端）：
netstat -ano | findstr :8080
if %errorlevel% neq 0 (
    echo ❌ 端口8080未被监听
) else (
    echo ✅ 端口8080正在监听
)
echo.

echo 🌐 3. 测试网络连接
echo --------------------------------
echo 测试本地API连接：
curl -s -o nul -w "HTTP状态码: %%{http_code}\n" http://localhost:3001/api/test 2>nul
if %errorlevel% neq 0 (
    echo ❌ 本地API连接失败
) else (
    echo ✅ 本地API连接正常
)

echo 测试远程API连接：
curl -s -o nul -w "HTTP状态码: %%{http_code}\n" http://192.168.1.57:3001/api/test 2>nul
if %errorlevel% neq 0 (
    echo ❌ 远程API连接失败
) else (
    echo ✅ 远程API连接正常
)
echo.

echo 🔥 4. 检查防火墙
echo --------------------------------
echo 检查防火墙规则：
netsh advfirewall firewall show rule name="DMS-QA-Backend" 2>nul | findstr "规则名"
if %errorlevel% neq 0 (
    echo ❌ 未找到DMS-QA防火墙规则
    echo 建议添加防火墙例外：
    echo netsh advfirewall firewall add rule name="DMS-QA-Backend" dir=in action=allow protocol=TCP localport=3001
) else (
    echo ✅ 防火墙规则已配置
)
echo.

echo 🗄️ 5. 检查数据库连接
echo --------------------------------
echo 测试SQL Server连接（192.168.1.57:1433）：
powershell -Command "Test-NetConnection -ComputerName 192.168.1.57 -Port 1433 -WarningAction SilentlyContinue | Select-Object TcpTestSucceeded" 2>nul | findstr True
if %errorlevel% neq 0 (
    echo ❌ 数据库服务器连接失败
    echo 请检查：
    echo - SQL Server是否运行
    echo - TCP/IP协议是否启用
    echo - 端口1433是否开放
) else (
    echo ✅ 数据库服务器连接正常
)
echo.

echo 📋 6. 系统信息
echo --------------------------------
echo 服务器IP地址：
ipconfig | findstr "IPv4"
echo.
echo Node.js版本：
node --version 2>nul
echo.

echo 🔧 7. 建议的解决方案
echo --------------------------------
echo 如果发现问题，请尝试以下解决方案：
echo.
echo 1. 启动服务：
echo    net start DMS-QA-Backend
echo    或 pm2 start ecosystem.config.js
echo.
echo 2. 添加防火墙例外：
echo    netsh advfirewall firewall add rule name="DMS-QA-Backend" dir=in action=allow protocol=TCP localport=3001
echo    netsh advfirewall firewall add rule name="DMS-QA-Frontend" dir=in action=allow protocol=TCP localport=8080
echo.
echo 3. 重启服务：
echo    net stop DMS-QA-Backend ^&^& net start DMS-QA-Backend
echo.
echo 4. 检查日志：
echo    查看 logs 目录下的日志文件
echo.

echo ✅ 诊断完成！
pause
