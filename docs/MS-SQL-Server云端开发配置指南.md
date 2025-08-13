# MS SQL Server 云端开发配置指南

## 📋 概述

本指南详细说明如何在 GitHub Codespaces 开发容器中配置和使用 MS SQL Server 数据库，解决云端开发环境中的数据库连接问题。

## 🎯 解决方案概览

### 方案1：云数据库服务（推荐）
- **Azure SQL Database**
- **AWS RDS SQL Server**
- **Google Cloud SQL Server**

### 方案2：VPN隧道连接
- 通过VPN连接内网数据库
- 适合企业内部开发

### 方案3：开发环境数据库
- 在开发容器中运行SQL Server
- 适合开发和测试

## 🚀 方案1：Azure SQL Database（推荐）

### 1.1 创建Azure SQL Database

```bash
# 使用Azure CLI创建资源组
az group create --name dms-qa-dev --location eastus

# 创建SQL Server
az sql server create \
  --name dms-qa-server \
  --resource-group dms-qa-dev \
  --location eastus \
  --admin-user sqladmin \
  --admin-password YourPassword123!

# 创建数据库
az sql db create \
  --resource-group dms-qa-dev \
  --server dms-qa-server \
  --name dms_qa \
  --service-objective Basic

# 配置防火墙规则（允许Azure服务访问）
az sql server firewall-rule create \
  --resource-group dms-qa-dev \
  --server dms-qa-server \
  --name AllowAzureServices \
  --start-ip-address 0.0.0.0 \
  --end-ip-address 0.0.0.0
```

### 1.2 获取连接字符串

```bash
# 获取连接字符串
az sql db show-connection-string \
  --client ado.net \
  --name dms_qa \
  --server dms-qa-server
```

### 1.3 配置环境变量

在 `.devcontainer/devcontainer.json` 中配置：

```json
{
  "containerEnv": {
    "DB_HOST": "dms-qa-server.database.windows.net",
    "DB_USER": "sqladmin",
    "DB_PASSWORD": "YourPassword123!",
    "DB_NAME": "dms_qa",
    "DB_TYPE": "mssql",
    "DB_PORT": "1433",
    "DB_ENCRYPT": "true",
    "DB_TRUST_CERT": "false"
  }
}
```

## 🔧 方案2：VPN隧道连接

### 2.1 配置VPN客户端

在 `devcontainer.json` 中添加VPN支持：

```json
{
  "features": {
    "ghcr.io/devcontainers/features/node:1": {
      "version": "18"
    },
    "ghcr.io/devcontainers-contrib/features/openvpn:1": {}
  },
  "postCreateCommand": "npm install && sudo apt-get update && sudo apt-get install -y openvpn"
}
```

### 2.2 VPN连接脚本

创建 `.devcontainer/scripts/connect-vpn.sh`：

```bash
#!/bin/bash

# VPN连接脚本
echo "🔐 连接企业VPN..."

# 检查VPN配置文件
if [ ! -f "/workspaces/DMS-QA/.devcontainer/vpn/client.ovpn" ]; then
    echo "❌ VPN配置文件不存在，请联系管理员获取"
    exit 1
fi

# 启动VPN连接
sudo openvpn --config /workspaces/DMS-QA/.devcontainer/vpn/client.ovpn --daemon

# 等待连接建立
sleep 10

# 测试连接
if ping -c 1 192.168.1.100 > /dev/null 2>&1; then
    echo "✅ VPN连接成功"
    echo "📊 可以访问内网数据库: 192.168.1.100"
else
    echo "❌ VPN连接失败"
    exit 1
fi
```

## 🐳 方案3：开发环境数据库

### 3.1 使用Docker Compose

创建 `.devcontainer/docker-compose.yml`：

```yaml
version: '3.8'

services:
  app:
    build:
      context: .
      dockerfile: Dockerfile
    volumes:
      - ../..:/workspaces:cached
    command: sleep infinity
    depends_on:
      - sqlserver
    environment:
      - DB_HOST=sqlserver
      - DB_USER=sa
      - DB_PASSWORD=YourPassword123!
      - DB_NAME=dms_qa
      - DB_TYPE=mssql

  sqlserver:
    image: mcr.microsoft.com/mssql/server:2022-latest
    environment:
      - ACCEPT_EULA=Y
      - SA_PASSWORD=YourPassword123!
      - MSSQL_PID=Express
    ports:
      - "1433:1433"
    volumes:
      - sqlserver_data:/var/opt/mssql

volumes:
  sqlserver_data:
```

### 3.2 更新devcontainer.json

```json
{
  "name": "DMS-QA Development",
  "dockerComposeFile": "docker-compose.yml",
  "service": "app",
  "workspaceFolder": "/workspaces/DMS-QA",
  
  "features": {
    "ghcr.io/devcontainers/features/node:1": {
      "version": "18"
    },
    "ghcr.io/devcontainers-contrib/features/mssql-cli:1": {}
  },
  
  "postCreateCommand": "npm install && cd frontend && npm install && cd ../server && npm install",
  "postStartCommand": "bash .devcontainer/scripts/init-database.sh"
}
```

### 3.3 数据库初始化脚本

创建 `.devcontainer/scripts/init-database.sh`：

```bash
#!/bin/bash

echo "🗄️ 初始化MS SQL Server数据库..."

# 等待SQL Server启动
echo "⏳ 等待SQL Server启动..."
sleep 30

# 测试连接
until sqlcmd -S sqlserver -U sa -P YourPassword123! -Q "SELECT 1" > /dev/null 2>&1; do
    echo "⏳ 等待SQL Server就绪..."
    sleep 5
done

echo "✅ SQL Server已就绪"

# 创建数据库
sqlcmd -S sqlserver -U sa -P YourPassword123! -Q "CREATE DATABASE dms_qa"

# 执行初始化脚本
if [ -f "/workspaces/DMS-QA/server/init.sql" ]; then
    echo "📊 执行数据库初始化脚本..."
    sqlcmd -S sqlserver -U sa -P YourPassword123! -d dms_qa -i /workspaces/DMS-QA/server/init.sql
    echo "✅ 数据库初始化完成"
else
    echo "⚠️ 未找到初始化脚本 server/init.sql"
fi

echo "🎉 数据库配置完成！"
echo "📊 连接信息:"
echo "   服务器: sqlserver"
echo "   数据库: dms_qa"
echo "   用户名: sa"
echo "   端口: 1433"
```

## 📝 Node.js 连接配置

### 4.1 安装依赖

```bash
# 安装MS SQL Server驱动
npm install mssql
```

### 4.2 数据库连接配置

更新 `server/config/database.js`：

```javascript
const sql = require('mssql');

/**
 * MS SQL Server 数据库连接配置
 */
const config = {
  server: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'dms_qa',
  user: process.env.DB_USER || 'sa',
  password: process.env.DB_PASSWORD || 'YourPassword123!',
  port: parseInt(process.env.DB_PORT) || 1433,
  options: {
    encrypt: process.env.DB_ENCRYPT === 'true', // Azure需要加密
    trustServerCertificate: process.env.DB_TRUST_CERT === 'true', // 本地开发
    enableArithAbort: true,
    requestTimeout: 30000,
    connectionTimeout: 30000
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000
  }
};

/**
 * 创建数据库连接池
 */
let pool;

async function getConnection() {
  try {
    if (!pool) {
      pool = await sql.connect(config);
      console.log('✅ MS SQL Server 连接成功');
    }
    return pool;
  } catch (error) {
    console.error('❌ 数据库连接失败:', error.message);
    throw error;
  }
}

/**
 * 执行SQL查询
 * @param {string} query - SQL查询语句
 * @param {object} params - 查询参数
 */
async function executeQuery(query, params = {}) {
  try {
    const pool = await getConnection();
    const request = pool.request();
    
    // 添加参数
    Object.keys(params).forEach(key => {
      request.input(key, params[key]);
    });
    
    const result = await request.query(query);
    return result.recordset;
  } catch (error) {
    console.error('❌ SQL查询失败:', error.message);
    throw error;
  }
}

module.exports = {
  getConnection,
  executeQuery,
  sql
};
```

## 🔍 故障排除

### 常见问题及解决方案

#### 1. 连接超时
```bash
# 检查网络连接
telnet your-server.database.windows.net 1433

# 检查防火墙规则
az sql server firewall-rule list --resource-group dms-qa-dev --server dms-qa-server
```

#### 2. 认证失败
```bash
# 测试连接
sqlcmd -S your-server.database.windows.net -U sqladmin -P YourPassword123! -d dms_qa
```

#### 3. SSL/TLS 错误
```javascript
// 在连接配置中添加
options: {
  encrypt: true,
  trustServerCertificate: true // 仅用于开发环境
}
```

## 💰 成本控制

### Azure SQL Database 成本优化

1. **选择合适的服务层级**
   - Basic: 开发测试
   - Standard: 生产环境
   - Premium: 高性能需求

2. **自动暂停配置**
```bash
# 配置自动暂停（无服务器模式）
az sql db update \
  --resource-group dms-qa-dev \
  --server dms-qa-server \
  --name dms_qa \
  --compute-model Serverless \
  --auto-pause-delay 60
```

3. **监控使用情况**
```bash
# 查看数据库使用情况
az monitor metrics list \
  --resource /subscriptions/{subscription-id}/resourceGroups/dms-qa-dev/providers/Microsoft.Sql/servers/dms-qa-server/databases/dms_qa \
  --metric "cpu_percent,dtu_consumption_percent"
```

## 🔐 安全最佳实践

### 1. 密码管理
- 使用强密码
- 定期更换密码
- 使用Azure Key Vault存储敏感信息

### 2. 网络安全
- 配置防火墙规则
- 使用VPN或私有端点
- 启用SSL/TLS加密

### 3. 访问控制
- 最小权限原则
- 使用Azure AD认证
- 定期审核访问权限

## 📚 参考资源

- [Azure SQL Database 文档](https://docs.microsoft.com/azure/azure-sql/)
- [Node.js mssql 驱动文档](https://www.npmjs.com/package/mssql)
- [GitHub Codespaces 文档](https://docs.github.com/codespaces)
- [开发容器规范](https://containers.dev/)

---

**注意**: 本指南提供了多种解决方案，请根据实际需求和预算选择合适的方案。建议在生产环境中使用云数据库服务，在开发环境中可以使用容器化的数据库。