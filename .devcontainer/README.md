# DMS-QA 开发容器配置

这个目录包含了DMS-QA质量管理系统的GitHub Codespaces开发容器配置。

## 📁 文件说明

- `devcontainer.json` - 开发容器主配置文件
- `start-dev.sh` - 快速启动脚本
- `README.md` - 本说明文件

## 🚀 快速开始

### 方法1：通过GitHub网页启动

1. 访问 [GitHub仓库](https://github.com/你的用户名/DMS-QA)
2. 点击绿色的 **Code** 按钮
3. 选择 **Codespaces** 标签
4. 点击 **Create codespace on main**

### 方法2：通过VS Code启动

1. 安装 **GitHub Codespaces** 扩展
2. 按 `Ctrl+Shift+P` 打开命令面板
3. 输入 "Codespaces: Create New Codespace"
4. 选择您的仓库和分支

## 🛠️ 开发环境特性

### 预装软件
- Node.js 18
- Git
- GitHub CLI
- 常用开发工具

### VS Code 扩展
- Vue Language Features
- Prettier 代码格式化
- ESLint 代码检查
- Tailwind CSS 智能提示
- 路径智能提示
- MySQL 支持

### 端口配置
- `5173` - 前端开发服务器 (Vue + Vite)
- `3000` - 后端API服务器 (Node.js + Express)
- `8080` - 备用端口

## 📋 使用说明

### 启动开发服务

#### 方法1：使用快速启动脚本
```bash
# 启动前端和后端服务
./.devcontainer/start-dev.sh

# 仅启动前端
./.devcontainer/start-dev.sh frontend

# 仅启动后端
./.devcontainer/start-dev.sh backend
```

#### 方法2：手动启动
```bash
# 启动前端 (新终端)
cd frontend
npm run dev

# 启动后端 (新终端)
cd server
node app.js
```

### 访问应用
- **前端应用**: 点击端口5173的预览链接
- **后端API**: 点击端口3000的链接
- **自动预览**: 前端服务启动后会自动打开预览

## 🔧 环境配置

### 环境变量
开发容器已预配置以下环境变量：
- `NODE_ENV=development`
- `TZ=Asia/Shanghai`

如需添加其他环境变量，可以：
1. 在项目根目录创建 `.env` 文件
2. 或在 `devcontainer.json` 的 `containerEnv` 中添加

### 数据库配置
如果需要MySQL数据库，可以在 `devcontainer.json` 中添加：
```json
"features": {
  "ghcr.io/devcontainers/features/mysql:1": {
    "version": "8.0"
  }
}
```

## 📊 性能优化

### 依赖缓存
配置使用了Docker卷来缓存node_modules，提高启动速度：
- `dms-qa-node-modules` - 根目录依赖
- `dms-qa-frontend-node-modules` - 前端依赖
- `dms-qa-server-node-modules` - 后端依赖

### 自动停止
配置了自动停止功能，节省资源和成本。

## 🐛 故障排除

### 常见问题

**问题1：端口无法访问**
```bash
# 检查服务是否运行
ps aux | grep node

# 检查端口占用
netstat -tlnp | grep :5173
```

**问题2：依赖安装失败**
```bash
# 清理并重新安装
npm cache clean --force
rm -rf node_modules package-lock.json
npm install
```

**问题3：权限问题**
```bash
# 给启动脚本执行权限
chmod +x ./.devcontainer/start-dev.sh
```

### 重置环境
如果遇到问题，可以：
1. 停止当前Codespace
2. 删除Codespace
3. 重新创建新的Codespace

## 💰 成本控制

### 免费额度
- GitHub免费账户：每月60小时
- 及时停止不使用的Codespace
- 使用自动停止功能

### 管理命令
```bash
# 查看所有Codespaces
gh codespace list

# 停止Codespace
gh codespace stop

# 删除Codespace
gh codespace delete
```

## 🤝 团队协作

### 配置同步
- 所有开发容器配置都已提交到版本控制
- 团队成员将获得一致的开发环境
- 新成员可以快速上手

### 自定义配置
如需个人自定义配置，可以：
1. 在本地创建 `.devcontainer/devcontainer.local.json`
2. 添加到 `.gitignore` 避免提交

## 📚 更多资源

- [GitHub Codespaces 文档](https://docs.github.com/en/codespaces)
- [开发容器规范](https://containers.dev/)
- [VS Code 远程开发](https://code.visualstudio.com/docs/remote/remote-overview)

---

🎉 现在您可以在任何地方通过浏览器进行DMS-QA项目开发了！