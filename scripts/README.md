# 📝 DMS-QA 更新日志生成器

本目录包含了用于自动生成版本迭代更新日志的工具集，支持根据Git提交历史智能生成结构化的更新日志。

## 🚀 功能特性

- **智能分类**: 根据提交信息自动分类（新功能、问题修复、性能优化等）
- **多种格式**: 支持Markdown、JSON、HTML格式输出
- **配置灵活**: 支持自定义配置文件和模板
- **版本管理**: 自动版本号递增和package.json更新
- **提交过滤**: 智能过滤无关提交（如Merge提交、临时提交等）
- **模板定制**: 完全可定制的输出模板
- **批量生成**: 支持批量生成多个版本的更新日志

## 📁 文件说明

| 文件 | 说明 |
|------|------|
| `generate-changelog.js` | 基础版本更新日志生成器 |
| `generate-changelog-advanced.js` | 高级版本更新日志生成器（推荐） |
| `changelog-config.json` | 默认配置文件 |
| `changelog-examples.js` | 使用示例和演示脚本 |
| `README.md` | 本说明文档 |

## 🎯 快速开始

### 1. 基础使用

```bash
# 生成当前版本的更新日志
npm run changelog

# 使用高级生成器（推荐）
npm run changelog:advanced

# 预览模式（不写入文件）
npm run changelog:preview
```

### 2. 指定版本号

```bash
# 生成指定版本的更新日志
npm run changelog:advanced -- --version 2.3.0

# 同时更新package.json中的版本号
npm run changelog:advanced -- --version 2.3.0 --update-package
```

### 3. 不同格式输出

```bash
# 生成JSON格式
npm run changelog:json

# 生成HTML格式
npm run changelog:html

# 指定输出文件
npm run changelog:advanced -- --output RELEASE_NOTES.md
```

### 4. 版本号管理

```bash
# 自动递增补丁版本（2.2.0 → 2.2.1）
npm run version:patch

# 手动指定次版本（2.2.0 → 2.3.0）
npm run changelog:advanced -- --version 2.3.0 --update-package

# 手动指定主版本（2.2.0 → 3.0.0）
npm run changelog:advanced -- --version 3.0.0 --update-package
```

## 📖 使用示例

### 查看所有示例

```bash
# 显示所有可用示例
npm run changelog:examples

# 运行特定示例
npm run changelog:examples basic
npm run changelog:examples advanced
npm run changelog:examples custom-config
```

### 示例列表

1. **basic** - 基础使用示例
2. **advanced** - 高级功能示例
3. **custom-config** - 自定义配置示例
4. **multiple-format** - 多格式输出示例
5. **version-bump** - 版本号管理示例
6. **filter-commits** - 提交过滤示例
7. **template-custom** - 自定义模板示例
8. **batch-generate** - 批量生成示例

## ⚙️ 配置说明

### 默认配置文件

配置文件位于 `scripts/changelog-config.json`，包含以下主要部分：

```json
{
  "title": "项目更新日志",
  "description": "本文档记录了项目的版本更新历史。",
  "categories": {
    "features": {
      "title": "✨ 新增功能",
      "icon": "🎯",
      "patterns": ["^(feat|feature|新增|添加|增加|实现)"],
      "priority": 1
    },
    "fixes": {
      "title": "🐛 问题修复",
      "icon": "🔧",
      "patterns": ["^(fix|修复|解决|修正|bugfix)"],
      "priority": 2
    }
  },
  "options": {
    "includeHash": true,
    "includeAuthor": true,
    "maxCommitLength": 100
  }
}
```

### 自定义配置

```bash
# 使用自定义配置文件
npm run changelog:advanced -- --config my-config.json

# 创建自定义配置示例
npm run changelog:examples custom-config
```

## 🎨 提交信息分类

生成器会根据提交信息的前缀自动分类：

| 分类 | 匹配模式 | 示例 |
|------|----------|------|
| ✨ 新增功能 | `feat`, `feature`, `新增`, `添加`, `实现` | `feat: 添加用户管理功能` |
| 🐛 问题修复 | `fix`, `修复`, `解决`, `修正`, `bugfix` | `fix: 修复登录验证问题` |
| ⚡ 性能优化 | `perf`, `performance`, `优化`, `提升` | `perf: 优化数据库查询性能` |
| 🔒 安全更新 | `security`, `安全`, `权限` | `security: 修复XSS安全漏洞` |
| 📚 文档更新 | `docs`, `doc`, `文档`, `说明` | `docs: 更新API文档` |
| 💄 样式调整 | `style`, `样式`, `UI`, `界面` | `style: 调整按钮样式` |
| ✅ 测试相关 | `test`, `测试`, `单元测试` | `test: 添加用户模块测试` |
| 📦 构建相关 | `build`, `构建`, `打包`, `部署` | `build: 更新构建配置` |

## 🔧 高级功能

### 1. 提交范围指定

```bash
# 生成指定提交范围的更新日志
npm run changelog:advanced -- --from v2.2.0 --to HEAD

# 生成指定标签之间的更新日志
npm run changelog:advanced -- --from v2.1.0 --to v2.2.0
```

### 2. 提交过滤

```bash
# 使用过滤配置
npm run changelog:examples filter-commits
```

过滤规则包括：
- 排除Merge提交
- 排除临时提交（WIP、temp等）
- 排除README更新
- 设置最小提交信息长度

### 3. 自定义模板

```bash
# 使用自定义模板
npm run changelog:examples template-custom
```

支持自定义：
- 版本标题格式
- 分类标题格式
- 提交信息格式
- 贡献者格式
- 分隔符格式

### 4. 批量生成

```bash
# 批量生成示例
npm run changelog:examples batch-generate
```

## 📊 输出格式

### Markdown格式（默认）

```markdown
## v2.3.0 (2024-01-15)

### 📊 版本概述
本版本包含 15 个提交，主要改进如下：

### ✨ 新增功能
- 🎯 添加ERP同步日志功能 ([a1b2c3d](../../commit/a1b2c3d))
- 🎯 实现材料价格智能提示 ([e4f5g6h](../../commit/e4f5g6h))

### 🐛 问题修复
- 🔧 修复登录验证问题 ([i7j8k9l](../../commit/i7j8k9l))

### 👥 贡献者
感谢以下贡献者的努力：David Lee
```

### JSON格式

```json
{
  "version": "2.3.0",
  "date": "2024-01-15",
  "totalCommits": 15,
  "contributors": ["David Lee"],
  "categories": {
    "features": {
      "title": "✨ 新增功能",
      "icon": "🎯",
      "commits": [
        {
          "hash": "a1b2c3d...",
          "shortHash": "a1b2c3d",
          "subject": "添加ERP同步日志功能",
          "author": "David Lee",
          "date": "2024-01-15"
        }
      ]
    }
  }
}
```

### HTML格式

生成完整的HTML页面，包含样式和交互功能。

## 🛠️ 开发和扩展

### 添加新的分类

在配置文件中添加新的分类：

```json
{
  "categories": {
    "breaking": {
      "title": "💥 破坏性变更",
      "icon": "⚠️",
      "patterns": ["^(breaking|BREAKING|破坏性)"],
      "priority": 0
    }
  }
}
```

### 自定义过滤规则

```json
{
  "filters": {
    "excludePatterns": [
      "^Merge",
      "^WIP",
      "^临时"
    ],
    "includePatterns": [
      "^(feat|fix|perf)"
    ],
    "minCommitLength": 10
  }
}
```

### 扩展输出格式

可以在 `generate-changelog-advanced.js` 中添加新的格式生成函数。

## 📋 最佳实践

### 1. 提交信息规范

建议使用以下格式：

```
<类型>: <简短描述>

<详细描述>（可选）

<相关问题>（可选）
```

示例：
```
feat: 添加用户权限管理功能

实现了基于角色的权限控制系统，支持动态权限分配。

关闭 #123
```

### 2. 版本发布流程

```bash
# 1. 确保所有更改已提交
git status

# 2. 生成更新日志并更新版本
npm run changelog:advanced -- --version 2.3.0 --update-package

# 3. 提交更新日志
git add CHANGELOG.md package.json
git commit -m "chore: 发布版本 2.3.0"

# 4. 创建标签
git tag v2.3.0

# 5. 推送到远程
git push origin master --tags
```

### 3. 持续集成

可以在CI/CD流程中自动生成更新日志：

```yaml
# .github/workflows/release.yml
name: Release
on:
  push:
    tags:
      - 'v*'

jobs:
  release:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Generate Changelog
        run: |
          npm install
          npm run changelog:advanced -- --version ${GITHUB_REF#refs/tags/v} --output RELEASE_NOTES.md
      - name: Create Release
        uses: actions/create-release@v1
        with:
          body_path: RELEASE_NOTES.md
```

## 🤝 贡献指南

欢迎提交问题和改进建议！

1. Fork 本项目
2. 创建功能分支 (`git checkout -b feature/amazing-feature`)
3. 提交更改 (`git commit -m 'feat: 添加某个功能'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 创建 Pull Request

## 📄 许可证

本项目采用 Apache-2.0 许可证。详情请参阅 [LICENSE](../LICENSE) 文件。

## 🙋‍♂️ 支持

如有问题或建议，请：

1. 查看本文档和示例
2. 运行 `npm run changelog:examples` 查看使用示例
3. 在项目仓库中提交 Issue
4. 联系维护者：David Lee <1039297691@qq.com>

---

**Happy Coding! 🎉**