@echo off
echo ========================================
echo 安装IIS URL重写模块
echo ========================================
echo.

echo 正在下载URL重写模块...
echo 请手动执行以下步骤：
echo.
echo 1. 访问微软官方下载页面：
echo    https://www.iis.net/downloads/microsoft/url-rewrite
echo.
echo 2. 下载 "URL Rewrite Module 2.1" 
echo    - 选择适合您系统的版本（x64 或 x86）
echo    - 文件名通常为：rewrite_amd64.msi 或 rewrite_x86.msi
echo.
echo 3. 运行下载的MSI文件进行安装
echo.
echo 4. 安装完成后重启IIS：
echo    - 打开命令提示符（管理员权限）
echo    - 执行：iisreset
echo.
echo 5. 验证安装：
echo    - 打开IIS管理器
echo    - 选择您的网站
echo    - 查看是否有"URL重写"图标
echo.

echo 或者，您可以使用PowerShell自动下载和安装：
echo.
echo PowerShell -Command "& {
echo   $url = 'https://download.microsoft.com/download/1/2/8/128E2E22-C1B9-44A4-BE2A-5859ED1D4592/rewrite_amd64_en-US.msi'
echo   $output = '$env:TEMP\rewrite_amd64.msi'
echo   Invoke-WebRequest -Uri $url -OutFile $output
echo   Start-Process msiexec.exe -Wait -ArgumentList '/i $output /quiet'
echo   Remove-Item $output
echo   Write-Host 'URL重写模块安装完成，正在重启IIS...'
echo   iisreset
echo }"
echo.

pause
