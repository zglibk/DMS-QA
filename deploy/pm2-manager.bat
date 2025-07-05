@echo off
chcp 65001 >nul
echo ================================
echo DMS-QA PM2 进程管理工具
echo ================================
echo.

:menu
echo 请选择操作：
echo 1. 安装PM2
echo 2. 启动应用
echo 3. 停止应用
echo 4. 重启应用
echo 5. 查看状态
echo 6. 查看日志
echo 7. 设置开机自启
echo 8. 取消开机自启
echo 9. 退出
echo.
set /p choice=请输入选项 (1-9): 

if "%choice%"=="1" goto install_pm2
if "%choice%"=="2" goto start_app
if "%choice%"=="3" goto stop_app
if "%choice%"=="4" goto restart_app
if "%choice%"=="5" goto status
if "%choice%"=="6" goto logs
if "%choice%"=="7" goto startup
if "%choice%"=="8" goto unstartup
if "%choice%"=="9" goto exit
echo 无效选项，请重新选择
goto menu

:install_pm2
echo.
echo 正在安装PM2...
npm install -g pm2
npm install -g pm2-windows-startup
echo PM2安装完成！
echo.
pause
goto menu

:start_app
echo.
echo 正在启动DMS-QA应用...
cd /d "%~dp0"
if not exist "logs" mkdir logs
pm2 start ecosystem.config.js
echo.
pause
goto menu

:stop_app
echo.
echo 正在停止DMS-QA应用...
pm2 stop dms-qa-backend
echo.
pause
goto menu

:restart_app
echo.
echo 正在重启DMS-QA应用...
pm2 restart dms-qa-backend
echo.
pause
goto menu

:status
echo.
echo DMS-QA应用状态：
pm2 status
echo.
echo 详细信息：
pm2 show dms-qa-backend
echo.
pause
goto menu

:logs
echo.
echo DMS-QA应用日志：
pm2 logs dms-qa-backend --lines 50
echo.
pause
goto menu

:startup
echo.
echo 正在设置开机自启...
pm2 startup
echo.
echo 保存当前PM2进程列表：
pm2 save
echo.
echo 开机自启设置完成！
echo 系统重启后PM2将自动启动所有应用
echo.
pause
goto menu

:unstartup
echo.
echo 正在取消开机自启...
pm2 unstartup
echo 开机自启已取消！
echo.
pause
goto menu

:exit
echo 再见！
exit /b 0
