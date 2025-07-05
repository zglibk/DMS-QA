@echo off
echo ================================
echo DMS-QA 服务器启动脚本
echo ================================

cd /d "%~dp0server"

echo 检查Node.js环境...
node --version
if %errorlevel% neq 0 (
    echo 错误：未找到Node.js，请先安装Node.js 18.x或更高版本
    pause
    exit /b 1
)

echo.
echo 检查依赖包...
if not exist "node_modules" (
    echo 正在安装依赖包...
    npm install
    if %errorlevel% neq 0 (
        echo 错误：依赖包安装失败
        pause
        exit /b 1
    )
)

echo.
echo 启动DMS-QA后端服务...
echo 服务地址：http://localhost:3001
echo 按 Ctrl+C 停止服务
echo.

node app.js

pause
