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

- Node.js >= 16
- SQL Server
- Git

### 安装依赖

```bash
# 安装前端依赖
cd frontend
npm install

# 安装后端依赖
cd ../server
npm install
```

### 配置数据库

1. 确保 SQL Server 正在运行
2. 修改 `server/db.js` 中的数据库连接配置
3. 运行数据库初始化脚本

### 启动项目

```bash
# 启动后端服务 (端口 3001)
cd server
node app.js

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
