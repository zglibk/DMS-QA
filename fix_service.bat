@echo off
echo Removing Windows Update group policy settings...
reg delete "HKLM\SOFTWARE\Policies\Microsoft\Windows\WindowsUpdate\AU" /v NoAutoUpdate /f
reg delete "HKLM\SOFTWARE\Policies\Microsoft\Windows\WindowsUpdate\AU" /v AUOptions /f
reg delete "HKLM\SOFTWARE\Policies\Microsoft\Windows\WindowsUpdate\AU" /v ScheduledInstallDay /f
reg delete "HKLM\SOFTWARE\Policies\Microsoft\Windows\WindowsUpdate\AU" /v ScheduledInstallTime /f
reg delete "HKLM\SOFTWARE\Policies\Microsoft\Windows\WindowsUpdate\AU" /v ScheduledInstallEveryWeek /f
echo Group policy settings removed.

echo Configuring Windows Update service...
sc.exe config wuauserv start= auto
if %errorlevel% equ 0 (
    echo Service configured successfully
) else (
    echo Failed to configure service
)

echo Starting Windows Update service...
net start wuauserv
if %errorlevel% equ 0 (
    echo Service started successfully
) else (
    echo Service start failed or already running
)

echo Refreshing group policy...
gpupdate /force

echo Checking final service status...
sc.exe query wuauserv

echo.
echo Press any key to continue...
pause >nul