# IIS部署故障排除指南

## 🚨 常见错误及解决方案

### 错误1：web.config文件错误
**错误信息**：`执行操作时出错，文件名: \\?\D:\frontend\web.config 错误`

#### 解决方案A：安装URL Rewrite模块
1. 下载：https://www.iis.net/downloads/microsoft/url-rewrite
2. 安装 "URL Rewrite Module 2.1"
3. 重启IIS：`iisreset`

#### 解决方案B：使用简化的web.config
已提供简化版web.config，如果仍有问题：

1. **删除web.config文件**：
   ```cmd
   del "D:\frontend\web.config"
   ```

2. **手动配置默认文档**：
   - IIS管理器 → 选择网站 → 默认文档
   - 确保 `index.html` 在列表顶部

#### 解决方案C：使用Node.js静态服务器
```cmd
# 安装serve
npm install -g serve

# 启动服务器
cd D:\frontend
serve -s . -l 8080
```

### 错误2：权限问题
**错误信息**：`无法验证对路径的访问`

#### 解决方案：
```cmd
# 设置文件夹权限
icacls "D:\frontend" /grant "IIS AppPool\DMS-QA-Pool":(OI)(CI)F

# 或者给Everyone权限（临时解决）
icacls "D:\frontend" /grant "Everyone":(OI)(CI)F
```

### 错误3：端口冲突
**错误信息**：`端口已被占用`

#### 解决方案：
1. 更改端口为 8081、9090 等
2. 或停止占用端口的服务

## 🔧 完整IIS配置步骤

### 1. 创建应用程序池
```cmd
%windir%\system32\inetsrv\appcmd add apppool /name:"DMS-QA-Pool" /managedRuntimeVersion:""
```

### 2. 创建网站
```cmd
%windir%\system32\inetsrv\appcmd add site /name:"DMS-QA" /physicalPath:"D:\frontend" /bindings:http/*:8080:
```

### 3. 设置应用程序池
```cmd
%windir%\system32\inetsrv\appcmd set app "DMS-QA/" /applicationPool:"DMS-QA-Pool"
```

### 4. 设置权限
```cmd
icacls "D:\frontend" /grant "IIS AppPool\DMS-QA-Pool":(OI)(CI)F
```

## 🌐 替代部署方案

### 方案1：使用IIS Express
```cmd
# 安装IIS Express
# 在frontend目录下运行
"C:\Program Files\IIS Express\iisexpress.exe" /path:D:\frontend /port:8080
```

### 方案2：使用Python HTTP服务器
```cmd
cd D:\frontend
python -m http.server 8080
```

### 方案3：使用Node.js http-server
```cmd
npm install -g http-server
cd D:\frontend
http-server -p 8080
```

## 🔍 验证部署

### 检查清单：
- [ ] 文件已正确复制到D:\frontend
- [ ] index.html文件存在
- [ ] 应用程序池已创建
- [ ] 网站已创建并绑定正确端口
- [ ] 文件夹权限已设置
- [ ] 防火墙端口已开放

### 测试访问：
1. 本地测试：`http://localhost:8080`
2. 远程测试：`http://服务器IP:8080`

## 📞 如果仍有问题

1. **检查Windows事件日志**：
   - 运行 `eventvwr.msc`
   - 查看 Windows日志 → 应用程序

2. **检查IIS日志**：
   - 位置：`C:\inetpub\logs\LogFiles`

3. **使用浏览器开发者工具**：
   - 按F12查看控制台错误
   - 检查网络请求状态

4. **联系技术支持**：
   - 提供具体错误信息
   - 提供系统环境信息
