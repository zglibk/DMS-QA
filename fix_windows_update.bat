@echo off
chcp 65001 >nul
echo Fixing Windows Update settings...
echo.

echo 1. Modifying Windows Update service startup type
reg add "HKLM\SYSTEM\CurrentControlSet\Services\wuauserv" /v Start /t REG_DWORD /d 2 /f
if %errorlevel% equ 0 (
    echo Service startup type changed to automatic
) else (
    echo Failed to modify service startup type
)

echo.
echo 2. Starting Windows Update service
net start wuauserv
if %errorlevel% equ 0 (
    echo Windows Update service started
) else (
    echo Failed to start service or service already running
)

echo.
echo 3. Checking service status
sc query wuauserv

echo.
echo 4. Refreshing group policy
gpupdate /force

echo.
echo Fix completed!
echo Please open Windows Settings ^> Update ^& Security ^> Windows Update
echo Check if it still shows "Some settings are managed by your organization"
echo.
echo If the problem persists, please restart your computer and check again.
echo.
pause