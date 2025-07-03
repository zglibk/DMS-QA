# DMS-QA 质量管理系统

[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)
[![Version](https://img.shields.io/badge/Version-v2.1.0-green.svg)](https://gitee.com/lbk168/dms-qa)

## 项目简介

DMS-QA 是一个基于 Vue 3 + Node.js + SQL Server 的质量管理系统，主要用于投诉登记和质量数据管理。

**版权所有 © 2024-2025 David Lee (zglibk)**

## 技术栈

### 前端
- Vue 3
- Element Plus
- Vite
- Axios

### 后端
- Node.js
- Express
- SQL Server
- JWT 认证

## 项目结构

```
DMS-QA/
├── frontend/          # 前端项目
│   ├── src/
│   │   ├── views/     # 页面组件
│   │   ├── store/     # 状态管理
│   │   └── ...
│   ├── package.json
│   └── vite.config.js
├── server/            # 后端项目
│   ├── routes/        # 路由
│   ├── middleware/    # 中间件
│   ├── db.js         # 数据库配置
│   ├── app.js        # 应用入口
│   └── package.json
└── README.md
```

## 功能特性

### v2.1.0 新增功能
- 📊 **Excel导入功能** - 支持多工作表选择和字段映射
- 🔄 **智能数据转换** - 自动处理日期、数字等数据类型
- 📁 **文件自动拷贝** - Excel超链接文件自动拷贝到服务器
- ⚙️ **系统配置管理** - 数据库连接、存储路径等可视化配置
- 🎯 **高级查询优化** - 修复响应式定位问题，提升用户体验

### 核心功能
- 🔐 用户认证与授权
- 📊 投诉登记管理
- ⚙️ 动态数据库配置
- 📱 响应式设计
- 🎨 现代化 UI 界面

## 快速开始

### 环境要求

#### 推荐版本（已测试）
- **Node.js**: v18.20.8 (推荐使用此版本)
- **npm**: v10.8.2 或更高版本
- **SQL Server**: 2008R2 或更高版本
- **Git**: 最新版本

#### 最低版本要求
- **Node.js**: >= 16.0.0 (但强烈推荐使用 v18.20.8)
- **SQL Server**: 2008R2+
- **操作系统**: Windows 10/11, Linux, macOS

#### 版本兼容性说明
⚠️ **重要提示**: 不同Node.js版本可能导致依赖包兼容性问题，建议使用推荐版本以避免意外错误。

📖 **详细环境配置**: 请参阅 [环境配置指南](docs/环境配置指南.md) 获取完整的安装和配置说明。

#### 使用nvm管理Node.js版本

项目根目录包含`.nvmrc`文件，如果您使用nvm：

```bash
# 安装并使用推荐版本
nvm install
nvm use

# 或者手动指定版本
nvm install 18.20.8
nvm use 18.20.8
```

### 环境检查

我们提供了自动化环境检查脚本：

```bash
# 运行环境检查脚本
npm run check-env
```

或者手动检查：

```bash
# 检查Node.js版本
node --version
# 应该显示: v18.20.8 (推荐) 或 >= v16.0.0

# 检查npm版本
npm --version
# 应该显示: >= 8.0.0

# 检查Git版本
git --version
```

### 快速开始

```bash
# 一键安装所有依赖（推荐）
npm run setup

# 或者手动安装
# 安装前端依赖
cd frontend
npm install

# 安装后端依赖
cd ../server
npm install
```

#### 版本兼容性测试

```bash
# 测试当前Node.js版本兼容性
npm run test-version
```

#### 常见问题解决

如果遇到依赖安装问题：

```bash
# 清除npm缓存
npm cache clean --force

# 一键清理并重新安装所有依赖
npm run reinstall

# 手动清理（Linux/macOS）
rm -rf node_modules package-lock.json
npm install

# 手动清理（Windows PowerShell）
Remove-Item -Recurse -Force node_modules, package-lock.json
npm install
```

### 配置数据库

1. 确保 SQL Server 正在运行
2. 修改 `server/db.js` 中的数据库连接配置
3. 运行数据库初始化脚本

### 启动项目

```bash
# 一键启动前后端服务（推荐）
npm run dev

# 或者分别启动
# 启动后端服务 (端口 3001)
cd server
npm start

# 启动前端开发服务器 (端口 5173)
cd frontend
npm run dev
```

### 访问应用

- 前端地址: http://localhost:5173
- 后端 API: http://localhost:3001

## 开发说明

### 数据库配置

系统支持动态数据库配置，可以在运行时切换不同的数据库连接。

### API 接口

- `/api/auth/*` - 认证相关接口
- `/api/config/*` - 配置管理接口
- `/api/complaint/*` - 投诉管理接口

## 贡献指南

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 打开 Pull Request

## 版权与许可证

**版权所有 © 2024-2025 David Lee (zglibk)**

本项目采用 Apache License 2.0 开源许可证。

- 📄 查看完整许可证: [LICENSE](LICENSE)
- 📋 第三方组件声明: [NOTICE](NOTICE)

### 许可证要点
- ✅ 允许商业使用
- ✅ 允许修改和分发
- ✅ 提供专利保护
- ⚠️ 必须保留版权声明
- ⚠️ 必须标明修改内容

## 联系方式

- **作者**: David Lee (zglibk)
- **邮箱**: 1039297691@qq.com
- **仓库**: https://gitee.com/lbk168/dms-qa

## 免责声明

本软件按"原样"提供，不提供任何明示或暗示的担保。在任何情况下，作者或版权持有人均不对任何索赔、损害或其他责任负责。
