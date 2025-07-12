# GitHub 远程仓库配置指南

## 📋 概述

本指南将帮助您配置 GitHub 作为第二个远程仓库，实现同时推送到 Gitee 和 GitHub 两个平台。

## 🚀 配置步骤

### 1. 在 GitHub 上创建仓库

1. **登录 GitHub**
   - 访问 https://github.com
   - 使用您的 GitHub 账号登录

2. **创建新仓库**
   - 点击右上角的 "+" 号
   - 选择 "New repository"
   - 填写仓库信息：
     - **Repository name**: `dms-qa`
     - **Description**: `DMS-QA 质量管理系统 - Vue 3 + Node.js + SQL Server`
     - **Visibility**: 选择 Public 或 Private
     - **重要**: 不要勾选 "Initialize this repository with a README"

3. **获取仓库 URL**
   - 创建完成后，复制仓库 URL
   - 格式：`https://github.com/您的用户名/dms-qa.git`

### 2. 配置本地 Git 仓库

#### 方案一：多推送 URL 配置（推荐）

```bash
# 添加 GitHub 作为 origin 的第二个推送地址
git remote set-url --add --push origin https://github.com/您的用户名/dms-qa.git

# 重新添加 Gitee 的推送地址
git remote set-url --add --push origin https://gitee.com/lbk168/dms-qa.git

# 验证配置
git remote -v
```

**预期输出**：
```
origin  https://gitee.com/lbk168/dms-qa.git (fetch)
origin  https://gitee.com/lbk168/dms-qa.git (push)
origin  https://github.com/您的用户名/dms-qa.git (push)
```

#### 方案二：独立远程仓库配置

```bash
# 添加 GitHub 作为独立的远程仓库
git remote add github https://github.com/您的用户名/dms-qa.git

# 验证配置
git remote -v
```

**预期输出**：
```
origin  https://gitee.com/lbk168/dms-qa.git (fetch)
origin  https://gitee.com/lbk168/dms-qa.git (push)
github  https://github.com/您的用户名/dms-qa.git (fetch)
github  https://github.com/您的用户名/dms-qa.git (push)
```

### 3. 首次推送到 GitHub

```bash
# 推送所有分支到两个仓库
git push origin --all

# 推送所有标签
git push origin --tags
```

## 🔐 身份验证配置

### GitHub Personal Access Token（推荐）

1. **生成 Token**
   - 访问 GitHub Settings > Developer settings > Personal access tokens
   - 点击 "Generate new token"
   - 选择适当的权限（至少需要 `repo` 权限）
   - 复制生成的 token

2. **配置 Git 凭据**
   ```bash
   # 方法1：使用 Git 凭据管理器
   git config --global credential.helper manager-core
   
   # 方法2：在 URL 中包含用户名
   git remote set-url origin https://您的用户名@github.com/您的用户名/dms-qa.git
   ```

3. **首次推送时输入凭据**
   - 用户名：您的 GitHub 用户名
   - 密码：Personal Access Token（不是您的 GitHub 密码）

### SSH 密钥配置（可选）

```bash
# 生成 SSH 密钥
ssh-keygen -t ed25519 -C "your_email@example.com"

# 添加到 SSH 代理
ssh-add ~/.ssh/id_ed25519

# 复制公钥到 GitHub
cat ~/.ssh/id_ed25519.pub
```

然后在 GitHub Settings > SSH and GPG keys 中添加公钥。

## 📝 日常使用

### 方案一：一键推送到两个仓库

```bash
# 推送到两个仓库
git push origin master

# 推送其他分支
git push origin feature-branch

# 推送标签
git push origin --tags
```

### 方案二：分别推送

```bash
# 推送到 Gitee
git push origin master

# 推送到 GitHub
git push github master

# 一次性推送到两个仓库
git push origin master && git push github master
```

### 使用推送脚本

项目根目录提供了两个推送脚本：

```bash
# 使用批处理脚本（Windows）
push-to-all.bat

# 使用 PowerShell 脚本
.\push-to-all.ps1

# PowerShell 脚本参数
.\push-to-all.ps1 -Branch "feature-branch" -Force
```

## 🛠️ 故障排除

### 常见问题

1. **认证失败**
   ```
   remote: Support for password authentication was removed on August 13, 2021.
   ```
   **解决方案**: 使用 Personal Access Token 而不是密码

2. **推送被拒绝**
   ```
   ! [rejected] master -> master (fetch first)
   ```
   **解决方案**: 
   ```bash
   git pull origin master
   git push origin master
   ```

3. **远程仓库不存在**
   ```
   remote: Repository not found.
   ```
   **解决方案**: 检查仓库 URL 和权限

### 检查配置

```bash
# 查看远程仓库配置
git remote -v

# 查看 Git 配置
git config --list

# 测试连接
git ls-remote origin
```

### 重置配置

```bash
# 删除远程仓库
git remote remove github

# 重新添加
git remote add github https://github.com/您的用户名/dms-qa.git

# 重置推送 URL
git remote set-url --delete --push origin https://github.com/您的用户名/dms-qa.git
```

## 📊 配置验证

### 验证步骤

1. **检查远程配置**
   ```bash
   git remote -v
   ```

2. **测试推送**
   ```bash
   # 创建测试提交
   echo "# Test" > test.md
   git add test.md
   git commit -m "test: GitHub configuration test"
   
   # 推送测试
   git push origin master
   
   # 清理测试文件
   git rm test.md
   git commit -m "test: remove test file"
   git push origin master
   ```

3. **验证两个仓库都已更新**
   - 检查 Gitee: https://gitee.com/lbk168/dms-qa
   - 检查 GitHub: https://github.com/您的用户名/dms-qa

## 🎯 最佳实践

1. **使用方案一（多推送 URL）** - 简化日常操作
2. **配置 Personal Access Token** - 安全且方便
3. **定期同步** - 确保两个仓库保持一致
4. **备份重要分支** - 利用多仓库提高可靠性
5. **使用推送脚本** - 自动化重复操作

## 📞 技术支持

如果遇到问题：

1. 检查网络连接
2. 验证 GitHub 仓库权限
3. 确认 Personal Access Token 有效
4. 查看 Git 错误信息
5. 参考 GitHub 官方文档

---

**配置完成后，您就可以通过一个命令同时更新 Gitee 和 GitHub 两个仓库了！** 🎉
