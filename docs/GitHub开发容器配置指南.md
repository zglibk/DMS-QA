# GitHub开发容器配置指南

本指南将详细介绍如何在GitHub上配置开发容器（Dev Container），让您可以在任何地方通过浏览器进行开发。

## 1. 前置准备

### 1.1 确保项目已推送到GitHub
```bash
# 如果还未推送，执行以下命令
git remote add origin https://github.com/你的用户名/DMS-QA.git
git branch -M main
git push -u origin main
```

### 1.2 启用GitHub Codespaces
- 登录GitHub账户
- 确保账户有Codespaces权限（免费账户每月有60小时免费额度）

## 2. 创建开发容器配置

### 2.1 创建配置目录结构
在项目根目录创建以下文件结构：
```
.devcontainer/
├── devcontainer.json
├── Dockerfile (可选)
└── docker-compose.yml (可选)
```

### 2.2 基础配置文件

#### devcontainer.json（推荐配置）
```json
{
  "name": "DMS-QA 质量管理系统开发环境",
  "image": "mcr.microsoft.com/devcontainers/javascript-node:18",
  
  // 功能扩展
  "features": {
    "ghcr.io/devcontainers/features/node:1": {
      "version": "18",
      "nodeGypDependencies": true
    },
    "ghcr.io/devcontainers/features/git:1": {},
    "ghcr.io/devcontainers/features/github-cli:1": {}
  },
  
  // 端口转发
  "forwardPorts": [3000, 5173, 8080],
  "portsAttributes": {
    "5173": {
      "label": "前端开发服务器",
      "onAutoForward": "openPreview"
    },
    "3000": {
      "label": "后端API服务器",
      "onAutoForward": "notify"
    }
  },
  
  // 容器启动后执行的命令
  "postCreateCommand": "npm install && cd frontend && npm install && cd ../server && npm install",
  
  // VS Code 自定义配置
  "customizations": {
    "vscode": {
      "extensions": [
        "Vue.vscode-vue",
        "ms-vscode.vscode-json",
        "bradlc.vscode-tailwindcss",
        "esbenp.prettier-vscode",
        "ms-vscode.vscode-eslint",
        "formulahendry.auto-rename-tag",
        "christian-kohler.path-intellisense",
        "ms-vscode.vscode-typescript-next"
      ],
      "settings": {
        "editor.formatOnSave": true,
        "editor.defaultFormatter": "esbenp.prettier-vscode",
        "emmet.includeLanguages": {
          "vue": "html"
        },
        "terminal.integrated.defaultProfile.linux": "bash"
      }
    }
  },
  
  // 挂载点配置
  "mounts": [
    "source=${localWorkspaceFolder}/.git,target=/workspaces/DMS-QA/.git,type=bind,consistency=cached"
  ],
  
  // 容器用户配置
  "remoteUser": "node",
  
  // 生命周期脚本
  "postStartCommand": "echo '开发环境已就绪！前端: http://localhost:5173, 后端: http://localhost:3000'"
}
```

### 2.3 高级配置（使用自定义Dockerfile）

#### Dockerfile
```dockerfile
# 基于官方Node.js镜像
FROM mcr.microsoft.com/devcontainers/javascript-node:18

# 安装系统依赖
RUN apt-get update && apt-get install -y \
    git \
    curl \
    vim \
    && rm -rf /var/lib/apt/lists/*

# 设置工作目录
WORKDIR /workspace

# 复制package.json文件
COPY package*.json ./
COPY frontend/package*.json ./frontend/
COPY server/package*.json ./server/

# 安装依赖
RUN npm install
RUN cd frontend && npm install
RUN cd server && npm install

# 暴露端口
EXPOSE 3000 5173

# 设置默认命令
CMD ["bash"]
```

#### 使用Dockerfile的devcontainer.json
```json
{
  "name": "DMS-QA 自定义开发环境",
  "build": {
    "dockerfile": "Dockerfile",
    "context": ".."
  },
  "forwardPorts": [3000, 5173],
  "postCreateCommand": "echo '自定义开发环境已就绪！'",
  "customizations": {
    "vscode": {
      "extensions": [
        "Vue.vscode-vue",
        "ms-vscode.vscode-json",
        "esbenp.prettier-vscode"
      ]
    }
  }
}
```

## 3. 启动开发容器

### 3.1 通过GitHub网页启动
1. 访问您的GitHub仓库
2. 点击绿色的 **Code** 按钮
3. 选择 **Codespaces** 标签
4. 点击 **Create codespace on main**

### 3.2 通过VS Code启动
1. 安装 **GitHub Codespaces** 扩展
2. 按 `Ctrl+Shift+P` 打开命令面板
3. 输入 "Codespaces: Create New Codespace"
4. 选择您的仓库和分支

### 3.3 通过GitHub CLI启动
```bash
# 安装GitHub CLI
gh codespace create --repo 你的用户名/DMS-QA

# 连接到现有的Codespace
gh codespace ssh
```

## 4. 开发环境使用

### 4.1 启动开发服务器
```bash
# 启动前端开发服务器
cd frontend
npm run dev

# 新开终端，启动后端服务器
cd server
node app.js
```

### 4.2 访问应用
- 前端：点击端口5173的预览链接
- 后端API：点击端口3000的链接

### 4.3 数据库配置
如果需要数据库，可以在devcontainer.json中添加：
```json
{
  "features": {
    "ghcr.io/devcontainers/features/mysql:1": {
      "version": "8.0"
    }
  }
}
```

## 5. 环境变量配置

### 5.1 创建环境变量文件
```bash
# 在Codespace中创建环境变量
echo "DATABASE_URL=mysql://user:password@localhost:3306/dms_qa" >> .env
echo "JWT_SECRET=your-secret-key" >> .env
```

### 5.2 在devcontainer.json中设置
```json
{
  "containerEnv": {
    "NODE_ENV": "development",
    "DATABASE_URL": "mysql://user:password@localhost:3306/dms_qa"
  }
}
```

## 6. 常用命令和技巧

### 6.1 Codespace管理命令
```bash
# 查看所有Codespaces
gh codespace list

# 停止Codespace
gh codespace stop

# 删除Codespace
gh codespace delete
```

### 6.2 文件同步
- Codespace会自动同步代码更改
- 使用Git正常提交和推送代码
- 本地文件会实时同步到云端

### 6.3 性能优化
```json
{
  "mounts": [
    "source=dms-qa-node-modules,target=${containerWorkspaceFolder}/node_modules,type=volume"
  ]
}
```

## 7. 故障排除

### 7.1 常见问题

**问题1：端口无法访问**
```bash
# 检查端口是否正在监听
netstat -tlnp | grep :5173

# 手动转发端口
gh codespace ports forward 5173:5173
```

**问题2：依赖安装失败**
```bash
# 清理缓存重新安装
npm cache clean --force
rm -rf node_modules package-lock.json
npm install
```

**问题3：容器启动慢**
- 使用预构建镜像
- 优化Dockerfile层级
- 使用.dockerignore排除不必要文件

### 7.2 调试技巧
```bash
# 查看容器日志
docker logs <container-id>

# 进入容器调试
docker exec -it <container-id> bash
```

## 8. 成本控制

### 8.1 免费额度管理
- 每月60小时免费使用时间
- 及时停止不使用的Codespace
- 使用自动停止功能

### 8.2 配置自动停止
```json
{
  "shutdownAction": "stopCodespace",
  "idleTimeout": "30m"
}
```

## 9. 最佳实践

### 9.1 配置文件管理
- 将.devcontainer配置提交到版本控制
- 为不同环境创建不同配置
- 定期更新基础镜像

### 9.2 安全考虑
- 不在配置文件中硬编码敏感信息
- 使用GitHub Secrets管理密钥
- 定期更新依赖包

### 9.3 团队协作
- 统一开发环境配置
- 文档化特殊配置需求
- 定期同步配置更新

## 10. 扩展功能

### 10.1 添加数据库服务
```json
{
  "dockerComposeFile": "docker-compose.yml",
  "service": "app",
  "workspaceFolder": "/workspace"
}
```

### 10.2 集成测试环境
```json
{
  "postCreateCommand": "npm install && npm run test:setup",
  "features": {
    "ghcr.io/devcontainers/features/docker-in-docker:1": {}
  }
}
```

---

通过以上配置，您就可以在任何地方通过浏览器访问完整的DMS-QA开发环境，无需担心本地环境配置问题！