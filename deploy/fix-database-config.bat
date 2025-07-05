@echo off
chcp 65001 >nul
echo =================================
echo DMS-QA 数据库配置修复工具
echo =================================
echo.

REM 检查是否在正确的目录
if not exist "server\db.js" (
    echo ❌ 错误：请在DMS-QA部署目录中运行此脚本
    echo 当前目录：%CD%
    echo 期望文件：server\db.js
    pause
    exit /b 1
)

echo 📖 当前数据库配置文件：%CD%\server\db.js
echo.

REM 显示当前配置
echo 🔍 检查当前配置...
findstr /C:"server:" server\db.js
findstr /C:"database:" server\db.js
findstr /C:"user:" server\db.js
echo.

echo 🔧 即将应用以下配置：
echo 服务器地址: 192.168.1.57
echo 数据库名: DMS-QA
echo 用户名: sa
echo 密码: Qa369*
echo.

set /p confirm=确认修改配置？(y/n): 
if /i not "%confirm%"=="y" (
    echo 操作已取消
    pause
    exit /b 0
)

echo.
echo 正在修复数据库配置...
node fix-database-config.js

if %errorlevel% equ 0 (
    echo.
    echo ✅ 配置修复成功！
    echo.
    echo 🔄 现在需要重启服务：
    echo.
    echo 请选择重启方式：
    echo 1. Windows服务重启
    echo 2. PM2重启
    echo 3. 手动重启
    echo 4. 跳过重启
    echo.
    set /p restart_choice=请选择 (1-4): 
    
    if "%restart_choice%"=="1" (
        echo 正在重启Windows服务...
        net stop DMS-QA-Backend 2>nul
        timeout /t 2 >nul
        net start DMS-QA-Backend
    ) else if "%restart_choice%"=="2" (
        echo 正在重启PM2服务...
        pm2 restart dms-qa-backend
    ) else if "%restart_choice%"=="3" (
        echo 请手动重启服务后测试连接
    ) else (
        echo 跳过重启，请稍后手动重启服务
    )
    
    echo.
    echo 🌐 配置完成后的访问地址：
    echo 前端: http://192.168.1.57:8080
    echo 后端: http://192.168.1.57:3001/api
    echo.
    echo 🧪 测试数据库连接：
    echo curl http://192.168.1.57:3001/api/test
    
) else (
    echo ❌ 配置修复失败，请检查错误信息
)

echo.
pause
