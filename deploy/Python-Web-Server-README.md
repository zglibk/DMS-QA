# DMS-QA Python Web服务器 (智能部署版)

## 📖 简介

这是一个专为DMS-QA质量管理系统设计的Python Web服务器，支持智能部署和自动配置，完美适应服务器迁移场景。

## ✨ 功能特性

### 🧠 智能部署功能
- 🔍 **自动IP检测**: 自动检测服务器IP地址
- 🔧 **自动配置**: 自动配置前端API地址
- 🔗 **后端检测**: 自动检测后端服务状态
- 📦 **一键部署**: 支持服务器迁移一键配置
- 🔄 **配置同步**: 自动更新所有相关配置文件

### 🚀 核心功能
- 🚀 **高性能**: 多线程并发处理请求
- 🌐 **SPA支持**: 完美支持单页应用路由
- 🔒 **安全性**: 防目录遍历攻击，文件类型限制
- 📱 **CORS支持**: 自动处理跨域请求
- 💾 **智能缓存**: 针对不同文件类型的缓存策略
- ⚙️ **可配置**: 支持JSON配置文件自定义设置
- 🔧 **服务化**: 支持安装为Windows系统服务

## 🚀 快速开始

### 🧠 方法1: 智能部署（推荐，适用于服务器迁移）

```bash
# 一键智能部署
smart-deploy.bat

# 或直接运行Python脚本
python smart-deploy.py
```

**智能部署功能**：
- ✅ 自动检测服务器IP地址
- ✅ 自动配置前端API地址
- ✅ 自动检测后端服务状态
- ✅ 自动选择可用端口
- ✅ 生成部署摘要报告

### 🔧 方法2: 直接运行

```bash
# 使用启动脚本
start-python-web-server.bat

# 或直接运行Python脚本
python python-web-server.py
```

### 🛠️ 方法3: 安装为Windows服务

```bash
# 以管理员身份运行
python install-python-service.py
```

## 📁 文件结构

```
deploy/
├── python-web-server.py          # 主服务器脚本（智能版）
├── server-config.json            # 配置文件（支持智能部署）
├── smart-deploy.py               # 智能部署脚本
├── smart-deploy.bat              # 智能部署启动器
├── start-python-web-server.bat   # 启动脚本
├── install-python-service.py     # 服务安装脚本
├── deployment-summary.json       # 部署摘要（自动生成）
├── deployment-info.json          # 部署信息（自动生成）
└── Python-Web-Server-README.md   # 说明文档
```

## ⚙️ 配置说明

### server-config.json 配置文件

```json
{
  "server": {
    "host": "0.0.0.0",     // 监听地址
    "port": 8081           // 监听端口
  },
  "frontend": {
    "paths": [             // 前端文件搜索路径（按优先级）
      "D:\\DMS-QA server\\frontend",
      "./frontend",
      "../frontend"
    ],
    "spa_mode": true       // SPA模式（404时返回index.html）
  },
  "cors": {
    "enabled": true,       // 启用CORS
    "allow_origin": "*"    // 允许的源
  },
  "cache": {
    "html_cache": "no-cache",  // HTML文件缓存策略
    "static_cache": 3600,      // 静态文件缓存时间（秒）
    "asset_cache": 86400       // 资源文件缓存时间（秒）
  }
}
```

## 🌐 访问地址

- **本地访问**: http://localhost:8081
- **远程访问**: http://192.168.1.57:8081
- **登录页面**: http://192.168.1.57:8081/login

## 🔧 管理命令

### 直接运行模式

```bash
# 启动服务器
python python-web-server.py

# 停止服务器
Ctrl+C
```

### Windows服务模式

```bash
# 启动服务
net start DMS-QA-WebServer

# 停止服务
net stop DMS-QA-WebServer

# 查看服务状态
sc query DMS-QA-WebServer

# 卸载服务
uninstall-service.bat
```

## 📋 系统要求

- **Python**: 3.6 或更高版本
- **操作系统**: Windows 10/11, Windows Server 2016+
- **内存**: 最少 256MB
- **磁盘**: 前端文件大小 + 50MB

## 🔍 故障排除

### 常见问题

1. **端口被占用**
   ```bash
   # 查看端口占用
   netstat -ano | findstr :8081
   
   # 结束占用进程
   taskkill /PID <进程ID> /F
   ```

2. **前端文件未找到**
   - 确保前端文件已正确部署
   - 检查配置文件中的路径设置
   - 确保index.html文件存在

3. **权限问题**
   - 以管理员身份运行（安装服务时）
   - 检查文件夹读取权限

4. **Python环境问题**
   ```bash
   # 检查Python版本
   python --version
   
   # 安装依赖（如需要）
   pip install pywin32
   ```

### 日志查看

- **直接运行**: 控制台输出
- **Windows服务**: Windows事件查看器 → Windows日志 → 应用程序

## 🔒 安全注意事项

1. **防火墙设置**: 确保端口8081在防火墙中开放
2. **文件权限**: 服务器只能访问配置的前端目录
3. **文件类型**: 只允许安全的文件类型访问
4. **目录遍历**: 自动防护目录遍历攻击

## 📞 技术支持

如遇问题，请检查：

1. Python环境是否正确安装
2. 前端文件是否完整部署
3. 端口是否被其他程序占用
4. 防火墙设置是否正确

## 📝 更新日志

### v1.0.0
- 初始版本发布
- 支持静态文件服务
- SPA路由支持
- CORS跨域支持
- 配置文件支持
- Windows服务支持

---

**DMS-QA质量管理系统** - 让质量管理更简单高效！
