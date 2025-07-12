@echo off
echo ========================================
echo 修复IIS 500.19错误 - DMS-QA系统
echo ========================================
echo.

echo 正在检查和启用必要的IIS功能...
echo.

echo 1. 启用URL重写模块...
dism /online /enable-feature /featurename:IIS-HttpRedirect /all
echo.

echo 2. 启用静态内容压缩...
dism /online /enable-feature /featurename:IIS-HttpCompressionStatic /all
echo.

echo 3. 启用动态内容压缩...
dism /online /enable-feature /featurename:IIS-HttpCompressionDynamic /all
echo.

echo 4. 启用HTTP错误处理...
dism /online /enable-feature /featurename:IIS-HttpErrors /all
echo.

echo 5. 启用自定义日志...
dism /online /enable-feature /featurename:IIS-CustomLogging /all
echo.

echo 6. 重启IIS服务...
iisreset
echo.

echo ========================================
echo 修复完成！请尝试以下步骤：
echo.
echo 1. 将 deploy/web-minimal.config 重命名为 web.config
echo 2. 复制到您的IIS网站根目录
echo 3. 重启IIS站点
echo 4. 测试访问网站
echo.
echo 如果仍有问题，请检查：
echo - IIS应用程序池是否正常运行
echo - 网站目录权限是否正确
echo - URL重写模块是否正确安装
echo ========================================
pause
