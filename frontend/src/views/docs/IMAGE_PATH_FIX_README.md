# 图片路径修复说明

## 问题原因

开发环境上传图片后，缩略图显示失败，原因是路径拼接逻辑错误：
- 开发环境没有独立的文件服务器（生产环境文件服务器在 8080 端口）
- 原代码在开发环境拼接了错误的路径前缀

## 修复方案

### 1. 核心修改：统一的 buildImageUrl 函数

三个文件都添加了相同的 `buildImageUrl` 函数来处理图片路径：

```javascript
/**
 * 判断是否为开发环境
 */
const isDev = computed(() => {
  const base = apiService.baseURL || ''
  return base.includes('localhost') || base.includes('127.0.0.1')
})

/**
 * 计算文件服务器基础地址
 * - 开发环境：返回空字符串，让 Vite 代理处理 /files 路径
 * - 生产环境：使用 8080 端口的文件服务器
 */
const fileServerBase = computed(() => {
  if (isDev.value) {
    return ''
  }
  return window.location.origin.replace(/:\d+$/, '') + ':8080'
})

/**
 * 构建图片访问URL（统一处理各种情况）
 */
function buildImageUrl(imageInfo) {
  // 1. 如果后端返回了完整的 url（以 /files 开头）
  if (imageInfo.url && imageInfo.url.startsWith('/files')) {
    return isDev.value ? imageInfo.url : `${fileServerBase.value}${imageInfo.url}`
  }
  
  // 2. 如果后端返回了完整的 http/https URL，直接使用
  if (imageInfo.url && (imageInfo.url.startsWith('http://') || imageInfo.url.startsWith('https://'))) {
    return imageInfo.url
  }
  
  // 3. 根据 relativePath 构建路径
  const rel = (imageInfo.relativePath || imageInfo.url || '').replace(/\\/g, '/')
  const cleanPath = rel.replace(/^attachments[\\\/]?/, '')
  const staticUrl = `/files/attachments/${cleanPath}`
  
  return isDev.value ? staticUrl : `${fileServerBase.value}${staticUrl}`
}
```

### 2. Vite 代理配置（已确认正确）

您的 `vite.config.js` 已正确配置：

```javascript
proxy: {
  '/api': {
    target: 'http://localhost:3001',
    changeOrigin: true,
    secure: false
  },
  '/files': {
    target: 'http://localhost:3001',
    changeOrigin: true,
    secure: false
  }
}
```

### 3. 后端要求

请确保后端（端口 3001）配置了 `/files` 静态文件服务：

```javascript
// 后端 app.js 或 server.js
const path = require('path')

// 静态文件服务 - 用于访问上传的附件
app.use('/files', express.static(path.join(__dirname, 'uploads')))
```

### 4. 环境对比

| 环境 | `fileServerBase` | 图片路径示例 |
|------|------------------|-------------|
| 开发 | `''`（空） | `/files/attachments/help-center/topic-internal/0/xxx.png` |
| 生产 | `http://192.168.1.57:8080` | `http://192.168.1.57:8080/files/attachments/help-center/topic-internal/0/xxx.png` |

### 5. 修复的文件

- `HelpCenter.vue` - 帮助中心主页面
- `ComplaintBatchImportDoc.vue` - 投诉批量导入指南
- `ComplaintRegisterDoc.vue` - 内部投诉操作指南

## 测试验证

1. 启动后端服务（端口 3001）
2. 启动前端开发服务器（Vite）
3. 访问帮助中心页面，上传图片
4. 打开浏览器开发者工具 -> Network
5. 检查图片请求：
   - URL 应该是 `/files/attachments/...` 格式
   - 请求应该被代理到 `http://localhost:3001/files/attachments/...`
6. 确认图片能正常加载显示

## 常见问题排查

### 图片仍然无法显示？

1. **检查后端是否提供了 `/files` 静态服务**
   - 访问 `http://localhost:3001/files/attachments/` 看是否有响应
   
2. **检查 Vite 代理是否生效**
   - 在浏览器 Network 中查看图片请求
   - 确认请求被正确代理（查看请求头中的 `X-Forwarded-*` 等）

3. **检查后端返回的数据格式**
   - 在上传成功后，查看响应中的 `relativePath` 或 `url` 字段
   - 确保路径格式正确
