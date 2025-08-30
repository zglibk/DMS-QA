/**
 * DMS-QA 文件服务器 - 开发环境专用
 *
 * 功能说明：
 * 1. 提供静态文件服务（图片、文档等）
 * 2. 监听8080端口
 * 3. 支持跨域访问
 * 4. 自动创建上传目录
 *
 * 使用场景：
 * - 开发环境中替代Nginx文件服务器
 * - 本地测试文件上传和访问功能
 * - 图标和图片资源的HTTP访问
 */

// 加载环境变量配置
require('dotenv').config();

// 导入必要的模块
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

// 创建文件服务器应用实例
const fileApp = express();

// 获取配置参数
const FILE_SERVER_PORT = process.env.FILE_SERVER_PORT || 8080;
const FILE_STORAGE_PATH = process.env.FILE_STORAGE_PATH || path.join(__dirname, 'uploads');

/**
 * 配置CORS中间件
 * 允许所有来源的跨域请求
 */
fileApp.use(cors({
  origin: '*',
  methods: ['GET', 'HEAD', 'OPTIONS'],
  allowedHeaders: ['*']
}));

/**
 * 请求日志中间件
 * 记录所有文件访问请求
 */
fileApp.use((req, res, next) => {
  const logMessage = `${new Date().toLocaleString()} - 文件服务器 ${req.method} ${req.url}`;
  console.log(logMessage);
  next();
});

/**
 * 确保上传目录存在
 * 如果目录不存在则自动创建
 */
function ensureDirectoryExists(dirPath) {
  if (!fs.existsSync(dirPath)) {
    try {
      fs.mkdirSync(dirPath, { recursive: true });
      console.log(`✅ 创建目录: ${dirPath}`);
    } catch (error) {
      console.error(`❌ 创建目录失败: ${dirPath}`, error);
    }
  }
}

/**
 * 初始化上传目录结构
 */
function initializeUploadDirectories() {
  const directories = [
    FILE_STORAGE_PATH,
    path.join(FILE_STORAGE_PATH, 'attachments'),
    path.join(FILE_STORAGE_PATH, 'site-images'),
    path.join(FILE_STORAGE_PATH, 'customer-complaint'),
    path.join(FILE_STORAGE_PATH, 'notice-images'),
    path.join(FILE_STORAGE_PATH, 'rework-attachments'),
    path.join(FILE_STORAGE_PATH, 'complaints')
  ];

  directories.forEach(ensureDirectoryExists);
}

/**
 * 健康检查端点
 * 用于检测文件服务器是否正常运行
 */
fileApp.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    message: '文件服务器运行正常',
    timestamp: new Date().toISOString(),
    port: FILE_SERVER_PORT,
    storagePath: FILE_STORAGE_PATH
  });
});

/**
 * 文件列表端点
 * 显示可用的文件目录
 */
fileApp.get('/', (req, res) => {
  res.json({
    message: 'DMS-QA 文件服务器',
    version: '1.0.0',
    endpoints: [
      '/health - 健康检查',
      '/files/ - 文件访问根目录',
      '/files/attachments/ - 附件文件',
      '/files/site-images/ - 网站图片',
      '/files/customer-complaint/ - 客户投诉文件',
      '/files/notice-images/ - 通知图片',
      '/files/rework-attachments/ - 返工附件',
      '/files/complaints/ - 投诉文件'
    ]
  });
});

/**
 * 配置静态文件服务
 * 提供各种类型文件的HTTP访问
 */

// 主文件目录
fileApp.use('/files', express.static(FILE_STORAGE_PATH, {
  setHeaders: (res, path) => {
    // 设置缓存头
    res.setHeader('Cache-Control', 'public, max-age=3600');
    // 设置CORS头
    res.setHeader('Access-Control-Allow-Origin', '*');
  }
}));

// 兼容性路径 - 直接访问uploads目录
fileApp.use('/uploads', express.static(FILE_STORAGE_PATH, {
  setHeaders: (res, path) => {
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.setHeader('Access-Control-Allow-Origin', '*');
  }
}));

/**
 * 404错误处理
 * 当请求的文件不存在时返回友好的错误信息
 */
fileApp.use((req, res) => {
  res.status(404).json({
    error: '文件未找到',
    message: `请求的文件 ${req.url} 不存在`,
    timestamp: new Date().toISOString()
  });
});

/**
 * 错误处理中间件
 * 捕获服务器内部错误
 */
fileApp.use((error, req, res, next) => {
  console.error('文件服务器错误:', error);
  res.status(500).json({
    error: '服务器内部错误',
    message: '文件服务器遇到问题，请稍后重试',
    timestamp: new Date().toISOString()
  });
});

/**
 * 启动文件服务器
 */
function startFileServer() {
  // 初始化目录结构
  initializeUploadDirectories();

  // 启动HTTP服务器
  const server = fileApp.listen(FILE_SERVER_PORT, '0.0.0.0', () => {
    console.log('=== 文件服务器已启动 ===');
    console.log(`端口: ${FILE_SERVER_PORT}`);
    console.log(`存储路径: ${FILE_STORAGE_PATH}`);
    console.log(`访问地址: http://localhost:${FILE_SERVER_PORT}`);
    console.log(`健康检查: http://localhost:${FILE_SERVER_PORT}/health`);
    console.log('时间:', new Date().toLocaleString());
    console.log('========================');
  });

  // 错误处理
  server.on('error', (error) => {
    if (error.code === 'EADDRINUSE') {
      console.error(`❌ 端口 ${FILE_SERVER_PORT} 已被占用，请检查是否有其他服务在运行`);
      console.error('   可以尝试以下解决方案:');
      console.error('   1. 停止占用端口的服务');
      console.error('   2. 修改 .env 文件中的 FILE_SERVER_PORT 配置');
      console.error('   3. 使用 netstat -ano | findstr :8080 查看占用进程');
    } else {
      console.error('文件服务器启动错误:', error);
    }
    process.exit(1);
  });

  return server;
}

// 如果直接运行此文件，则启动文件服务器
if (require.main === module) {
  startFileServer();
}

// 导出启动函数，供其他模块使用
module.exports = { startFileServer, fileApp };