@echo off
chcp 65001 >nul
echo =================================
echo 停止本地DMS-QA后端服务
echo =================================
echo.

echo 🔍 检查当前运行的服务...
echo.

REM 检查Windows服务
echo 检查Windows服务状态：
sc query DMS-QA-Backend 2>nul
if %errorlevel% equ 0 (
    echo ✅ 发现DMS-QA-Backend Windows服务
    set /p stop_service=是否停止Windows服务？(y/n): 
    if /i "!stop_service!"=="y" (
        echo 正在停止Windows服务...
        net stop DMS-QA-Backend
        if %errorlevel% equ 0 (
            echo ✅ Windows服务已停止
        ) else (
            echo ❌ Windows服务停止失败
        )
    )
) else (
    echo ⚠️  未找到DMS-QA-Backend Windows服务
)

echo.

REM 检查PM2进程
echo 检查PM2进程：
pm2 list 2>nul | findstr dms-qa-backend
if %errorlevel% equ 0 (
    echo ✅ 发现PM2进程
    set /p stop_pm2=是否停止PM2进程？(y/n): 
    if /i "!stop_pm2!"=="y" (
        echo 正在停止PM2进程...
        pm2 stop dms-qa-backend
        if %errorlevel% equ 0 (
            echo ✅ PM2进程已停止
        ) else (
            echo ❌ PM2进程停止失败
        )
    )
) else (
    echo ⚠️  未找到PM2进程
)

echo.

REM 检查端口占用
echo 检查端口3001占用情况：
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3001') do (
    set pid=%%a
    echo 发现进程PID: !pid!
    
    REM 获取进程名称
    for /f "tokens=1" %%b in ('tasklist /FI "PID eq !pid!" /FO CSV /NH') do (
        set process_name=%%b
        set process_name=!process_name:"=!
        echo 进程名称: !process_name!
        
        if /i "!process_name!"=="node.exe" (
            set /p kill_node=发现Node.js进程占用端口3001，是否结束？(y/n): 
            if /i "!kill_node!"=="y" (
                echo 正在结束进程PID !pid!...
                taskkill /PID !pid! /F
                if %errorlevel% equ 0 (
                    echo ✅ 进程已结束
                ) else (
                    echo ❌ 进程结束失败
                )
            )
        )
    )
)

echo.

REM 最终验证
echo 🔍 验证服务停止状态...
echo.

echo 检查端口3001监听状态：
netstat -ano | findstr :3001
if %errorlevel% neq 0 (
    echo ✅ 端口3001已释放，本地服务已停止
) else (
    echo ❌ 端口3001仍被占用，可能还有服务在运行
    echo.
    echo 占用端口的进程：
    netstat -ano | findstr :3001
    echo.
    echo 如需强制停止所有Node.js进程，请运行：
    echo taskkill /IM node.exe /F
)

echo.

echo 检查Windows服务状态：
sc query DMS-QA-Backend 2>nul | findstr STATE
if %errorlevel% equ 0 (
    echo ⚠️  Windows服务可能仍在运行
) else (
    echo ✅ Windows服务已停止或不存在
)

echo.

echo 检查PM2状态：
pm2 status 2>nul | findstr dms-qa-backend
if %errorlevel% neq 0 (
    echo ✅ PM2进程已停止或不存在
) else (
    echo ⚠️  PM2进程可能仍在运行
)

echo.
echo ✅ 本地服务停止检查完成！
echo.
echo 🧪 现在可以测试远程服务器：
echo 1. 确保远程服务器上的DMS-QA服务正在运行
echo 2. 在远程服务器上测试：curl http://localhost:3001/api/test-connection
echo 3. 从其他电脑测试：curl http://192.168.1.57:3001/api/test-connection
echo.

pause
