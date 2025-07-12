# DMS-QA 自动值守方案

## 📋 概述

本方案使用 NSSM (Non-Sucking Service Manager) 将 Nginx 和 Node.js 应用转换为 Windows 服务，实现开机自启动和自动值守功能。

## ⚠️ PowerShell 运行注意事项

### 🔧 **必要条件**
1. **必须以管理员身份运行 PowerShell**
   - 右键点击 PowerShell 图标，选择"以管理员身份运行"
   - 或按 Win+X，选择"Windows PowerShell (管理员)"

2. **解除执行策略限制**
   如果运行 .ps1 脚本时出现"拒绝执行"错误，需要先解除限制：
   ```powershell
   # 方法1：设置执行策略（推荐）
   Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser

   # 方法2：临时绕过执行策略
   PowerShell.exe -ExecutionPolicy Bypass -File "脚本路径.ps1"
   ```

3. **字符编码要求**
   - PowerShell 脚本中不能包含中文字符，否则会产生乱码
   - 所有脚本已转换为英文版本以避免此问题
   - 如需修改脚本，请使用英文注释和提示信息

### 🚀 **推荐执行方式**
```powershell
# 1. 以管理员身份打开 PowerShell
# 2. 切换到脚本目录
cd "D:\WebServer\scripts"

# 3. 如果首次运行，设置执行策略
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser

# 4. 运行脚本
.\install-services-english.ps1
```

## 🚀 快速开始

### 1. 准备工作

**以管理员身份运行 PowerShell：**
- 按 `Win + X`，选择 "Windows PowerShell (管理员)"
- 或右键点击开始菜单，选择 "Windows PowerShell (管理员)"

**设置执行策略（首次运行）：**
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### 2. 环境检测（推荐先执行）

```powershell
cd "D:\WebServer\scripts"
.\test-paths.ps1
```

### 3. 一键安装（推荐）

环境检测通过后，执行一键安装：

```powershell
.\install-services-english.ps1
```

### 4. 分步安装

如果一键安装失败，可以分步执行：

```powershell
# 1. 检测环境
.\test-paths.ps1

# 2. 安装 Nginx 服务
.\install-nginx-service-fixed.ps1

# 3. 安装 Node.js 服务
.\install-node-service-fixed.ps1
```

### 5. 故障排除

如果遇到执行策略错误：
```powershell
# 临时绕过执行策略
PowerShell.exe -ExecutionPolicy Bypass -File ".\install-services-english.ps1"
```

如果遇到权限错误：
```powershell
# 确认以管理员身份运行
([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] "Administrator")
```

## 📁 脚本文件说明

| 文件名 | 功能 | 用途 | 状态 |
|--------|------|------|------|
| `install-services-english.ps1` | 一键安装脚本（英文版） | 自动安装所有服务 | ✅ 推荐 |
| `install-nginx-service-fixed.ps1` | Nginx 服务安装（英文版） | 将 Nginx 安装为 Windows 服务 | ✅ 推荐 |
| `install-node-service-fixed.ps1` | Node.js 服务安装（英文版） | 将 Node.js 应用安装为 Windows 服务 | ✅ 推荐 |
| `test-paths.ps1` | 环境检测脚本（英文版） | 检测所有路径和环境 | ✅ 推荐 |
| `service-manager.ps1` | 服务管理器 | 管理服务的启动、停止、重启等 | ✅ 可用 |
| `health-monitor.ps1` | 健康监控器 | 监控服务状态并自动恢复 | ✅ 可用 |
| `run-as-admin.bat` | 管理员运行器 | 以管理员身份运行脚本 | ✅ 辅助工具 |

### 📋 **脚本版本说明**
- **英文版脚本**（推荐）：避免 PowerShell 中文乱码问题
- **中文版脚本**：保留用于参考，但可能出现乱码

## 🔧 服务管理

### 使用服务管理器

```powershell
# 注意：以管理员身份运行 PowerShell

# 查看服务状态
.\service-manager.ps1 status

# 启动所有服务
.\service-manager.ps1 start

# 停止所有服务
.\service-manager.ps1 stop

# 重启所有服务
.\service-manager.ps1 restart

# 查看日志
.\service-manager.ps1 logs

# 卸载服务
.\service-manager.ps1 uninstall
```

### 使用 Windows 服务管理

```powershell
# 注意：以管理员身份运行 PowerShell

# 查看服务状态
Get-Service -Name "DMS-QA-*"

# 启动服务
Start-Service -Name "DMS-QA-Nginx"
Start-Service -Name "DMS-QA-Backend"

# 停止服务
Stop-Service -Name "DMS-QA-Nginx"
Stop-Service -Name "DMS-QA-Backend"

# 重启服务
Restart-Service -Name "DMS-QA-Nginx"
Restart-Service -Name "DMS-QA-Backend"

# 批量操作
Start-Service -Name "DMS-QA-Nginx","DMS-QA-Backend"
Stop-Service -Name "DMS-QA-Nginx","DMS-QA-Backend"
```

## 🔍 健康监控

### 启动健康监控器

```powershell
# 注意：以管理员身份运行 PowerShell

# 持续监控（默认60秒间隔）
.\health-monitor.ps1

# 自定义检查间隔（30秒）
.\health-monitor.ps1 -CheckInterval 30

# 只运行一次检查
.\health-monitor.ps1 -RunOnce

# 设置最大重试次数
.\health-monitor.ps1 -MaxRetries 5
```

### 监控功能

- ✅ 服务状态检查
- ✅ Web 服务响应检查
- ✅ 自动重启异常服务
- ✅ 磁盘空间监控
- ✅ 内存使用监控
- ✅ 日志记录
- ✅ Windows 事件日志

## 📊 服务配置

### 安装的服务

| 服务名 | 描述 | 端口 | 启动类型 | 状态 |
|--------|------|------|----------|------|
| `DMS-QA-Nginx` | Web 服务器 | 80, 443 | 自动 | ✅ 已部署 |
| `DMS-QA-Backend` | Node.js 后端 | 3001 | 自动 | ✅ 已部署 |

### 服务特性

- ✅ **开机自启动** - 系统重启后自动启动
- ✅ **异常自动重启** - 进程崩溃时自动恢复
- ✅ **日志轮转** - 自动管理日志文件大小
- ✅ **进程监控** - 实时监控服务状态
- ✅ **依赖关系管理** - Node.js 服务在 Nginx 之后启动
- ✅ **无人值守** - 无需手动干预即可持续运行

## 📝 日志文件

### Nginx 日志
- 位置: `C:\nginx-1.22.1\logs\`
- 文件: `service-stdout.log`, `service-stderr.log`

### Node.js 日志
- 位置: `E:\WebProject\DMS-QA\server\logs\`
- 文件: `service-stdout.log`, `service-stderr.log`

### 健康监控日志
- 位置: `E:\WebProject\DMS-QA\server\logs\health-monitor.log`

## 🛠️ 故障排除

### 常见问题

1. **PowerShell 执行策略错误**
   ```powershell
   # 错误信息：无法加载文件，因为在此系统上禁止运行脚本
   Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser

   # 或临时绕过
   PowerShell.exe -ExecutionPolicy Bypass -File "脚本路径.ps1"
   ```

2. **权限不足错误**
   ```powershell
   # 确保以管理员身份运行 PowerShell
   # 检查当前权限
   ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] "Administrator")
   ```

3. **中文乱码问题**
   - 使用英文版脚本（`*-english.ps1` 或 `*-fixed.ps1`）
   - 避免在脚本中使用中文字符

4. **服务启动失败**
   ```powershell
   # 查看服务状态
   Get-Service -Name "DMS-QA-*"

   # 查看错误日志
   .\service-manager.ps1 logs
   ```

5. **端口被占用**
   ```powershell
   # 查看端口占用
   netstat -ano | findstr :3001
   netstat -ano | findstr :80
   ```

6. **路径问题**
   - 检查 NSSM 路径: `D:\WebServer\tools\nssm-2.24\win64\nssm.exe`
   - 检查 Nginx 路径: `D:\WebServer\nginx-1.22.1\nginx.exe`
   - 检查 Node.js 路径: `D:\Program Files\node\node.exe`
   - 检查项目路径: `D:\WebServer\backend`

### 手动修复

```powershell
# 注意：以管理员身份运行 PowerShell

# 停止所有服务
Stop-Service -Name "DMS-QA-*" -Force

# 重新安装服务（使用英文版脚本）
.\install-services-english.ps1

# 或分步安装
.\install-nginx-service-fixed.ps1
.\install-node-service-fixed.ps1

# 启动服务
Start-Service -Name "DMS-QA-Nginx"
Start-Service -Name "DMS-QA-Backend"
```

## 🔄 更新和维护

### 更新应用代码

```powershell
# 注意：以管理员身份运行 PowerShell

# 停止服务
Stop-Service -Name "DMS-QA-Backend"

# 更新代码
cd D:\WebServer\backend
git pull
npm install

# 启动服务
Start-Service -Name "DMS-QA-Backend"
```

### 更新 Nginx 配置

```powershell
# 注意：以管理员身份运行 PowerShell

# 停止服务
Stop-Service -Name "DMS-QA-Nginx"

# 更新配置文件
# 编辑 D:\WebServer\nginx-1.22.1\conf\nginx.conf

# 测试配置
D:\WebServer\nginx-1.22.1\nginx.exe -t

# 启动服务
Start-Service -Name "DMS-QA-Nginx"
```

## ✅ 部署成功确认

### 验证服务状态
```powershell
# 检查服务状态（应显示 Running）
Get-Service -Name "DMS-QA-*"

# 检查服务自启动设置
Get-WmiObject -Class Win32_Service | Where-Object {$_.Name -like "DMS-QA-*"} | Select-Object Name, StartMode, State
```

### 验证功能
```powershell
# 测试 Nginx（应返回网页内容）
curl http://localhost

# 测试 Node.js API（应返回 200 状态）
curl http://localhost:3001/api/test-connection

# 检查端口监听
netstat -ano | findstr :80
netstat -ano | findstr :3001
```

### 验证自动启动
1. 重启计算机
2. 登录后检查服务是否自动启动
3. 测试网站和 API 是否正常访问

## 📞 技术支持

如果遇到问题，请：

1. **检查 PowerShell 执行策略**
2. **确认以管理员身份运行**
3. **使用英文版脚本避免乱码**
4. **查看日志文件**
5. **检查服务状态**
6. **运行健康检查**
7. **查看 Windows 事件日志**

```powershell
# 查看 Windows 事件日志中的 DMS-QA 相关事件
Get-EventLog -LogName Application -Source "DMS-QA-Monitor" -Newest 10

# 检查执行策略
Get-ExecutionPolicy

# 检查管理员权限
([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] "Administrator")
```
