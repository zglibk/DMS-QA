# DMS-QA 部署包

## 📦 部署包内容

```
deploy/
├── frontend/          # 前端编译文件
│   ├── index.html     # 主页面
│   ├── assets/        # 静态资源
│   └── logo.png       # Logo文件
├── server/            # 后端服务文件
│   ├── app.js         # 主服务文件
│   ├── db.js          # 数据库配置
│   ├── package.json   # 依赖配置
│   ├── routes/        # 路由文件
│   ├── middleware/    # 中间件
│   ├── services/      # 服务文件
│   ├── config/        # 配置文件
│   └── uploads/       # 上传目录
└── README.md          # 部署说明
```

## 🚀 部署步骤

### 1. 环境要求
- Windows 10/11 或 Windows Server
- Node.js 18.x 或更高版本
- SQL Server 2008R2 或更高版本
- 网络访问权限

### 2. 后端部署

#### 2.1 复制文件
将 `server/` 目录复制到目标服务器，例如：
```
C:\DMS-QA\server\
```

#### 2.2 安装依赖
```cmd
cd C:\DMS-QA\server
npm install
```

#### 2.3 配置数据库
编辑 `db.js` 文件，修改数据库连接信息：
```javascript
const config = {
  server: '192.168.1.57',    // 数据库服务器IP
  database: 'DMS-QA',        // 数据库名
  user: 'sa',                // 用户名
  password: 'Qa369*',        // 密码
  // ...其他配置
};
```

#### 2.4 启动服务
```cmd
node app.js
```

服务将在端口 3001 启动。

### 3. 前端部署

#### 3.1 使用IIS部署（推荐）

1. **安装IIS**：
   - 控制面板 → 程序 → 启用或关闭Windows功能
   - 勾选"Internet Information Services"

2. **创建网站**：
   - 打开IIS管理器
   - 右键"网站" → 添加网站
   - 网站名称：DMS-QA
   - 物理路径：指向 `frontend/` 目录
   - 端口：80 或 8080

3. **配置URL重写**（重要）：
   - 安装URL Rewrite模块
   - 在网站根目录创建 `web.config`：

```xml
<?xml version="1.0" encoding="UTF-8"?>
<configuration>
  <system.webServer>
    <rewrite>
      <rules>
        <rule name="Handle History Mode and Hash Mode" stopProcessing="true">
          <match url="(.*)" />
          <conditions logicalGrouping="MatchAll">
            <add input="{REQUEST_FILENAME}" matchType="IsFile" negate="true" />
            <add input="{REQUEST_FILENAME}" matchType="IsDirectory" negate="true" />
          </conditions>
          <action type="Rewrite" url="/" />
        </rule>
      </rules>
    </rewrite>
  </system.webServer>
</configuration>
```

#### 3.2 使用Node.js静态服务器

```cmd
npm install -g serve
serve -s frontend -l 8080
```

### 4. 网络配置

#### 4.1 防火墙设置
确保以下端口开放：
- 3001：后端API服务
- 80/8080：前端Web服务

#### 4.2 修改前端API地址
如果后端服务器IP不是默认的，需要修改前端配置：

在前端代码中搜索 `localhost:3001` 并替换为实际的服务器IP。

## 🔧 配置说明

### 数据库配置
- 确保SQL Server服务正在运行
- 确保数据库用户有足够权限
- 导入初始化SQL脚本

### 文件存储配置
- 确保文件存储路径存在：`D:\DMSData\IMG-VIDEO`
- 确保网络共享路径可访问
- 配置文件服务器（可选）

### 网络共享配置
- 确保网络共享路径可访问：`\\tj_server\工作\品质部\生产异常周报考核统计`
- 配置适当的网络权限

## 🌐 访问地址

部署完成后，可通过以下地址访问：

- **前端Web界面**：`http://服务器IP:端口`
- **后端API**：`http://服务器IP:3001/api`

## 🔍 故障排除

### 常见问题

1. **数据库连接失败**
   - 检查数据库服务是否启动
   - 检查连接字符串是否正确
   - 检查网络连通性

2. **前端页面空白**
   - 检查静态文件是否正确部署
   - 检查浏览器控制台错误
   - 检查API地址配置

3. **文件上传失败**
   - 检查uploads目录权限
   - 检查文件存储路径配置
   - 检查磁盘空间

### 日志查看
- 后端日志：控制台输出
- IIS日志：`C:\inetpub\logs\LogFiles`
- 应用程序日志：Windows事件查看器

## 📞 技术支持

如遇问题，请联系：
- 开发者：David Lee
- 邮箱：1039297691@qq.com
- 项目地址：https://gitee.com/lbk168/dms-qa

---

**编译时间**：2025-07-05 19:00
**版本**：v2.1.0
