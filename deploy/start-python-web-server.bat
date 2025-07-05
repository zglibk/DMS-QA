@echo off
chcp 65001 >nul
title DMS-QA Python Web服务器

echo =================================
echo DMS-QA Python Web服务器启动工具
echo =================================
echo.

REM 检查Python环境
echo 🔍 检查Python环境...
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Python未安装或不在PATH中
    echo.
    echo 请安装Python 3.6+或将Python添加到系统PATH
    echo 下载地址: https://www.python.org/downloads/
    pause
    exit /b 1
)

python --version
echo ✅ Python环境可用
echo.

REM 检查前端文件
echo 🔍 检查前端文件...
set FRONTEND_FOUND=0

if exist "D:\DMS-QA server\frontend\index.html" (
    echo ✅ 发现前端文件：D:\DMS-QA server\frontend
    set FRONTEND_FOUND=1
) else if exist "frontend\index.html" (
    echo ✅ 发现前端文件：%CD%\frontend
    set FRONTEND_FOUND=1
) else if exist "..\frontend\index.html" (
    echo ✅ 发现前端文件：%CD%\..\frontend
    set FRONTEND_FOUND=1
)

if %FRONTEND_FOUND% equ 0 (
    echo ❌ 未找到前端文件
    echo.
    echo 请确保以下位置之一存在前端文件：
    echo   - D:\DMS-QA server\frontend\index.html
    echo   - %CD%\frontend\index.html
    echo   - %CD%\..\frontend\index.html
    echo.
    pause
    exit /b 1
)

REM 检查端口占用
echo 🔍 检查端口8081占用情况...
netstat -ano | findstr :8081 >nul
if %errorlevel% equ 0 (
    echo ⚠️  端口8081已被占用
    echo.
    echo 当前占用情况：
    netstat -ano | findstr :8081
    echo.
    set /p kill_process=是否结束占用端口的进程？(y/n): 
    if /i "!kill_process!"=="y" (
        for /f "tokens=5" %%a in ('netstat -ano ^| findstr :8081') do (
            echo 正在结束进程 %%a...
            taskkill /PID %%a /F >nul 2>&1
        )
        echo ✅ 进程已结束
        timeout /t 2 >nul
    )
) else (
    echo ✅ 端口8081可用
)

echo.

REM 检查服务器脚本
if not exist "%~dp0python-web-server.py" (
    echo ❌ 未找到服务器脚本：python-web-server.py
    echo 请确保脚本文件存在于当前目录
    pause
    exit /b 1
)

echo ✅ 服务器脚本已找到
echo.

echo 🚀 启动Python Web服务器...
echo.
echo 💡 提示：
echo   - 服务器将在端口8081上运行
echo   - 支持SPA单页应用路由
echo   - 自动处理CORS跨域请求
echo   - 按 Ctrl+C 停止服务器
echo.
echo --------------------------------

REM 启动Python服务器
python "%~dp0python-web-server.py"

echo.
echo 服务器已停止
pause
