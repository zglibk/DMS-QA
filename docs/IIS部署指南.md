# IIS部署指南 - DMS-QA系统

## 🎯 概述
本指南详细说明如何在Windows Server 2012的IIS上部署DMS-QA系统。

## 📋 前置要求

### 1. IIS功能要求
确保以下IIS功能已启用：
- **Web服务器(IIS)** → **万维网服务**
- **应用程序开发功能**：
  - ASP.NET 4.5/4.8
  - .NET Framework 4.5/4.8
- **常见HTTP功能**：
  - 默认文档
  - 目录浏览
  - HTTP错误
  - HTTP重定向
  - 静态内容
- **HTTP功能**：
  - HTTP压缩
- **安全性**：
  - 请求筛选
- **管理工具**：
  - IIS管理控制台

### 2. URL重写模块
**必须安装URL重写模块**：
1. 下载：[URL Rewrite Module 2.1](https://www.iis.net/downloads/microsoft/url-rewrite)
2. 安装到服务器
3. 重启IIS

### 3. Node.js环境（后端需要）
1. 下载并安装Node.js 16+
2. 验证安装：`node --version`

## 🚀 部署步骤

### 第一步：准备文件
1. **前端文件**：将`frontend/dist`目录下的所有文件复制到IIS网站根目录
2. **后端文件**：将`server`目录复制到服务器合适位置
3. **确保web.config文件**在网站根目录

### 第二步：配置IIS站点
1. 打开IIS管理器
2. 右键"网站" → "添加网站"
3. 配置：
   - **网站名称**：DMS-QA
   - **物理路径**：指向前端文件目录
   - **端口**：80或其他可用端口
   - **主机名**：（可选）

### 第三步：配置应用程序池
1. 选择应用程序池
2. 右键应用程序池 → "高级设置"
3. 设置：
   - **.NET Framework版本**：v4.0
   - **托管管道模式**：集成
   - **启用32位应用程序**：False

### 第四步：验证URL重写
1. 选择网站
2. 双击"URL重写"
3. 确认规则"Vue Router History Mode"存在

## 🔧 web.config配置说明

关键配置项：
```xml
<!-- URL重写规则 - 解决Vue Router的History模式404问题 -->
<rewrite>
  <rules>
    <rule name="Vue Router History Mode" stopProcessing="true">
      <match url=".*" />
      <conditions logicalGrouping="MatchAll">
        <add input="{REQUEST_FILENAME}" matchType="IsFile" negate="true" />
        <add input="{REQUEST_FILENAME}" matchType="IsDirectory" negate="true" />
        <add input="{REQUEST_URI}" pattern="^/api/" negate="true" />
      </conditions>
      <action type="Rewrite" url="/index.html" />
    </rule>
  </rules>
</rewrite>
```

## 🐛 常见问题解决

### 1. 404错误（如您遇到的问题）
**原因**：Vue Router使用History模式，直接访问路由时IIS找不到对应文件
**解决**：
- 确保安装了URL重写模块
- 使用提供的web.config文件
- 重启IIS

### 2. 500错误
**可能原因**：
- web.config语法错误
- 缺少必要的IIS功能
- 权限问题

**解决步骤**：
1. 检查web.config语法
2. 确认IIS功能完整
3. 检查文件夹权限

### 3. 静态资源404
**解决**：确保MIME类型配置正确，特别是字体文件

### 4. API请求失败
**原因**：后端服务未启动或配置错误
**解决**：
1. 启动Node.js后端服务
2. 检查API地址配置
3. 配置反向代理（如需要）

## 📝 后端服务配置

### 1. 安装依赖
```bash
cd server
npm install
```

### 2. 配置数据库
编辑`db.js`文件，配置SQL Server连接

### 3. 启动服务
```bash
node app.js
```

### 4. 配置为Windows服务（推荐）
使用PM2或NSSM将Node.js应用配置为Windows服务

## ✅ 验证部署

1. **访问首页**：`http://your-server/`
2. **测试路由**：`http://your-server/login`
3. **测试API**：检查网络请求是否正常

## 🔒 安全建议

1. **HTTPS配置**：配置SSL证书
2. **防火墙**：只开放必要端口
3. **权限控制**：设置适当的文件夹权限
4. **定期更新**：保持系统和组件更新

## 📞 技术支持

如遇到问题，请检查：
1. IIS日志文件
2. Windows事件日志
3. 浏览器开发者工具网络面板

---
**注意**：确保所有步骤按顺序执行，特别是URL重写模块的安装。
