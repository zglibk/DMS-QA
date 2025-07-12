# DMS-QA 系统 IP 地址配置迁移总结

## 📋 迁移概述

本次迁移将项目中所有硬编码的IP地址 `192.168.1.57` 替换为环境变量配置，提高系统的部署灵活性和可维护性。

## 🔧 修改的文件列表

### 后端文件

1. **server/db.js** - 主数据库配置
   - 将硬编码IP替换为 `process.env.DB_SERVER || 'localhost'`
   - 支持环境变量配置数据库连接

2. **server/reset-admin.js** - 管理员重置脚本
   - 使用环境变量配置数据库连接

3. **server/scripts/fix_null_bit_fields.js** - 数据库修复脚本
   - 使用环境变量配置数据库连接

4. **server/routes/import.js** - 导入路由
   - 文件服务器IP使用环境变量配置
   - 网络路径映射支持动态IP

5. **server/config/path-mapping.js** - 路径映射配置
   - 网络共享路径支持动态IP配置

6. **server/config/nginx-file-server.conf** - Nginx配置
   - 示例配置更新为localhost

7. **server/update_db_schema.sql** - 数据库初始化脚本
   - 默认配置更新为localhost

### 前端文件

1. **frontend/src/views/Login.vue** - 登录页面
   - API地址示例更新为localhost

2. **frontend/src/components/PathMappingInfo.vue** - 路径映射信息组件
   - 默认URL更新为localhost

3. **frontend/src/components/admin/ConnectionConfig.vue** - 连接配置组件
   - 服务器地址示例更新为localhost

### 文档文件

1. **docs/数据库初始化指南.md**
2. **docs/环境配置指南.md**
3. **docs/Excel超链接局域网访问解决方案.md**
4. **docs/完整解决方案总结.md**
5. **VERSION_HISTORY.md**

## 🆕 新增文件

### 环境变量配置文件

1. **server/.env.example** - 后端环境变量示例
2. **frontend/.env.example** - 前端环境变量示例
3. **docs/部署配置指南.md** - 详细部署指南

## 🔧 环境变量说明

### 后端环境变量

```bash
# 数据库配置
DB_SERVER=localhost          # 数据库服务器地址
DB_NAME=DMS-QA              # 数据库名称
DB_USER=sa                  # 数据库用户名
DB_PASSWORD=Qa369*          # 数据库密码

# 文件服务器配置
FILE_SERVER_IP=localhost    # 文件服务器IP
FILE_SERVER_PORT=8080       # 文件服务器端口
FILE_STORAGE_PATH=D:\DMSData\IMG-VIDEO  # 文件存储路径
FILE_URL_PREFIX=/files      # URL前缀

# 应用配置
NODE_ENV=development        # 环境模式
PORT=3001                   # 后端服务端口

# 安全配置
JWT_SECRET=your-jwt-secret-key-here
SESSION_SECRET=your-session-secret-key-here
```

### 前端环境变量

```bash
# API 服务器配置
VITE_API_BASE_URL=http://localhost:3001

# 应用配置
VITE_APP_TITLE=DMS-QA 质量管理系统
VITE_APP_VERSION=1.0.0
```

## 🚀 部署场景配置

### 1. 本地开发环境

```bash
# 后端 .env
DB_SERVER=localhost
FILE_SERVER_IP=localhost

# 前端 .env
VITE_API_BASE_URL=http://localhost:3001
```

### 2. 局域网环境

```bash
# 后端 .env
DB_SERVER=192.168.1.57
FILE_SERVER_IP=192.168.1.57

# 前端 .env
VITE_API_BASE_URL=http://192.168.1.57:3001
```

### 3. 云服务器环境

```bash
# 后端 .env
DB_SERVER=your-cloud-db-server
FILE_SERVER_IP=your-cloud-server-ip
NODE_ENV=production

# 前端 .env
VITE_API_BASE_URL=http://your-cloud-server-ip:3001
```

## ✅ 迁移优势

1. **部署灵活性**
   - 支持多环境部署
   - 无需修改源代码即可切换环境

2. **安全性提升**
   - 敏感信息通过环境变量配置
   - 避免在代码中暴露服务器信息

3. **维护便利性**
   - 统一的配置管理
   - 环境切换更加简单

4. **扩展性增强**
   - 支持容器化部署
   - 便于CI/CD集成

## 🔄 迁移后的使用方法

### 首次部署

1. 复制环境变量示例文件
   ```bash
   cp server/.env.example server/.env
   cp frontend/.env.example frontend/.env
   ```

2. 根据实际环境修改配置
3. 启动服务

### 环境切换

1. 修改对应的 `.env` 文件
2. 重启服务即可

### 容器化部署

```dockerfile
# Dockerfile 示例
ENV DB_SERVER=your-db-server
ENV FILE_SERVER_IP=your-file-server
```

## 📝 注意事项

1. **环境变量优先级**
   - 环境变量 > 默认值
   - 确保生产环境设置了正确的环境变量

2. **安全考虑**
   - 不要将 `.env` 文件提交到版本控制
   - 生产环境使用强密码

3. **兼容性**
   - 保持了向后兼容性
   - 未设置环境变量时使用默认值

## 🔍 验证方法

1. **本地验证**
   ```bash
   # 检查环境变量是否生效
   node -e "console.log(process.env.DB_SERVER)"
   ```

2. **连接测试**
   - 启动后端服务
   - 检查数据库连接日志
   - 测试API接口

3. **功能测试**
   - 登录功能
   - 文件上传下载
   - 数据查询操作

## 📞 技术支持

如遇到配置问题，请参考：
1. `docs/部署配置指南.md`
2. 检查环境变量配置
3. 查看服务启动日志
