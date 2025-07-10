@echo off
echo ========================================
echo DMS-QA IIS部署故障排除工具
echo ========================================
echo.

echo 1. 检查IIS功能状态...
dism /online /get-features | findstr /i "IIS"
echo.

echo 2. 检查URL重写模块...
if exist "%ProgramFiles%\IIS\Microsoft Web Platform Installer\WebPlatformInstaller.exe" (
    echo URL重写模块可能已安装
) else (
    echo 警告：未找到Web Platform Installer，请手动检查URL重写模块
)
echo.

echo 3. 检查.NET Framework版本...
reg query "HKEY_LOCAL_MACHINE\SOFTWARE\Microsoft\NET Framework Setup\NDP\v4\Full\" /v Release
echo.

echo 4. 检查Node.js版本...
node --version 2>nul
if %errorlevel% neq 0 (
    echo 警告：Node.js未安装或不在PATH中
) else (
    echo Node.js已安装
)
echo.

echo 5. 检查常见端口占用...
netstat -an | findstr ":80 "
netstat -an | findstr ":3000 "
echo.

echo 6. 检查IIS服务状态...
sc query W3SVC
echo.

echo 7. 生成诊断报告...
echo 系统信息： > iis-diagnostic.txt
systeminfo | findstr /B /C:"OS Name" /C:"OS Version" >> iis-diagnostic.txt
echo. >> iis-diagnostic.txt
echo IIS版本： >> iis-diagnostic.txt
reg query "HKEY_LOCAL_MACHINE\SOFTWARE\Microsoft\InetStp" /v MajorVersion >> iis-diagnostic.txt 2>nul
echo. >> iis-diagnostic.txt
echo 已安装的.NET版本： >> iis-diagnostic.txt
dir /b "%WINDIR%\Microsoft.NET\Framework\v*" >> iis-diagnostic.txt 2>nul
echo.

echo 诊断完成！请检查生成的 iis-diagnostic.txt 文件
echo.
echo 常见解决方案：
echo 1. 如果遇到404错误，请确保安装URL重写模块
echo 2. 如果遇到500错误，请检查web.config语法
echo 3. 如果静态文件无法访问，请检查MIME类型配置
echo 4. 如果API无法访问，请确保后端服务正在运行
echo.
pause
