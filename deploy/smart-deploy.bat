@echo off
chcp 65001 >nul
title DMS-QA 智能部署工具

echo ===============================================
echo 🚀 DMS-QA 智能部署工具
echo ===============================================
echo.
echo 此工具将自动检测服务器环境并配置系统
echo 适用于服务器迁移和新环境部署
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

REM 检查智能部署脚本
if not exist "%~dp0smart-deploy.py" (
    echo ❌ 未找到智能部署脚本：smart-deploy.py
    echo 请确保脚本文件存在于当前目录
    pause
    exit /b 1
)

echo ✅ 智能部署脚本已找到
echo.

echo 🔧 开始智能部署...
echo --------------------------------

REM 运行智能部署脚本
python "%~dp0smart-deploy.py"

echo.
echo ===============================================
echo 智能部署完成
echo ===============================================
echo.
echo 💡 提示：
echo   - 查看 deployment-summary.json 了解部署详情
echo   - 运行 start-python-web-server.bat 启动前端服务
echo   - 访问显示的URL进行测试
echo.
pause
