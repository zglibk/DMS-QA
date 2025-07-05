@echo off
chcp 65001 >nul
echo ================================
echo DMS-QA 服务管理工具
echo ================================
echo.

:menu
echo 请选择操作：
echo 1. 安装Windows服务
echo 2. 卸载Windows服务
echo 3. 启动服务
echo 4. 停止服务
echo 5. 查看服务状态
echo 6. 查看服务日志
echo 7. 退出
echo.
set /p choice=请输入选项 (1-7): 

if "%choice%"=="1" goto install
if "%choice%"=="2" goto uninstall
if "%choice%"=="3" goto start
if "%choice%"=="4" goto stop
if "%choice%"=="5" goto status
if "%choice%"=="6" goto logs
if "%choice%"=="7" goto exit
echo 无效选项，请重新选择
goto menu

:install
echo.
echo 正在安装DMS-QA后端服务...
echo 注意：需要管理员权限
echo.
cd /d "%~dp0"
npm install node-windows
node install-service.js
echo.
pause
goto menu

:uninstall
echo.
echo 正在卸载DMS-QA后端服务...
echo.
cd /d "%~dp0"
node uninstall-service.js
echo.
pause
goto menu

:start
echo.
echo 正在启动DMS-QA后端服务...
net start DMS-QA-Backend
echo.
pause
goto menu

:stop
echo.
echo 正在停止DMS-QA后端服务...
net stop DMS-QA-Backend
echo.
pause
goto menu

:status
echo.
echo DMS-QA后端服务状态：
sc query DMS-QA-Backend
echo.
echo 端口占用情况：
netstat -ano | findstr :3001
echo.
pause
goto menu

:logs
echo.
echo 服务日志位置：
echo %ALLUSERSPROFILE%\DMS-QA-Backend\daemon\
echo.
echo 正在打开日志目录...
explorer "%ALLUSERSPROFILE%\DMS-QA-Backend\daemon\"
echo.
pause
goto menu

:exit
echo 再见！
exit /b 0
