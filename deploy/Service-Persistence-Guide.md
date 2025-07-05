# DMS-QA Node.js服务持久化指南

## 🎯 目标
确保DMS-QA后端服务在服务器重启后自动启动，实现7x24小时不间断运行。

## 📋 方案对比

| 方案 | 优点 | 缺点 | 推荐度 |
|------|------|------|--------|
| **Windows服务** | 原生支持、稳定性高 | 配置稍复杂 | ⭐⭐⭐⭐⭐ |
| **任务计划程序** | 系统自带、简单 | 功能有限 | ⭐⭐⭐ |
| **PM2** | 功能强大、易管理 | 需要额外安装 | ⭐⭐⭐⭐ |
| **NSSM** | 轻量级、易用 | 第三方工具 | ⭐⭐⭐⭐ |

## 🚀 推荐方案：Windows服务

### 步骤1：安装依赖
```cmd
cd D:\DMS-QA
npm install node-windows
```

### 步骤2：安装服务
```cmd
# 以管理员身份运行
node install-service.js
```

### 步骤3：管理服务
```cmd
# 启动服务
net start DMS-QA-Backend

# 停止服务  
net stop DMS-QA-Backend

# 查看状态
sc query DMS-QA-Backend
```

### 步骤4：使用管理工具
双击运行 `service-manager.bat` 进行图形化管理。

## 🔧 备选方案

### 方案A：PM2进程管理器
```cmd
# 1. 安装PM2
npm install -g pm2

# 2. 启动应用
pm2 start ecosystem.config.js

# 3. 设置开机自启
pm2 startup
pm2 save
```

### 方案B：任务计划程序
```cmd
# 以管理员身份运行
create-task-scheduler.bat
```

### 方案C：NSSM服务管理器
```cmd
# 1. 下载NSSM: https://nssm.cc/download
# 2. 以管理员身份运行
nssm-install.bat
```

## 📊 服务监控

### 检查服务状态
```cmd
# Windows服务
sc query DMS-QA-Backend

# PM2
pm2 status

# 端口占用
netstat -ano | findstr :3001
```

### 查看日志
- **Windows服务**: `%ALLUSERSPROFILE%\DMS-QA-Backend\daemon\`
- **PM2**: `pm2 logs dms-qa-backend`
- **NSSM**: `D:\DMS-QA\logs\`

## 🔍 故障排除

### 常见问题

1. **服务无法启动**
   - 检查Node.js路径是否正确
   - 确认应用文件存在
   - 查看错误日志

2. **端口冲突**
   - 检查端口3001是否被占用
   - 修改应用端口配置

3. **权限问题**
   - 确保以管理员身份安装服务
   - 检查文件夹权限

### 测试服务
```cmd
# 测试API是否正常
curl http://192.168.1.57:3001/api/test

# 或在浏览器访问
http://192.168.1.57:3001/api/test
```

## 🎯 最佳实践

1. **选择合适的方案**：
   - 生产环境推荐Windows服务
   - 开发环境可使用PM2

2. **配置日志轮转**：
   - 防止日志文件过大
   - 定期清理旧日志

3. **监控服务状态**：
   - 设置健康检查
   - 配置告警通知

4. **备份配置**：
   - 定期备份服务配置
   - 记录安装步骤

## 📞 技术支持

如遇问题，请提供：
- 错误信息截图
- 系统环境信息
- 操作步骤描述

联系方式：
- 开发者：David Lee
- 邮箱：1039297691@qq.com
