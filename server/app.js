/**
 * DMS-QA Quality Management System - 后端服务器主入口文件
 *
 * 版权信息：
 * Copyright (c) 2024-2025 David Lee (zglibk)
 * Licensed under the Apache License, Version 2.0
 *
 * 功能说明：
 * 1. 创建Express服务器实例
 * 2. 配置中间件（CORS、请求解析、日志等）
 * 3. 注册API路由
 * 4. 启动HTTP服务器
 *
 * 技术栈：
 * - Express.js (Web框架)
 * - CORS (跨域资源共享)
 * - Body-parser (请求体解析)
 * - 自定义路由模块
 *
 * 服务器架构：
 * - RESTful API设计
 * - 模块化路由管理
 * - 统一错误处理
 * - 请求日志记录
 */

// 导入Express Web框架
const express = require('express');
// 导入CORS中间件，处理跨域请求
const cors = require('cors');
// 导入请求体解析中间件
const bodyParser = require('body-parser');
// 导入路径处理工具
const path = require('path');

// 导入各个功能模块的路由
const complaintRouter = require('./routes/complaint');        // 投诉管理路由
const authRouter = require('./routes/auth');                  // 认证授权路由
const configRouter = require('./routes/config');              // 配置管理路由
const importRouter = require('./routes/import');              // 数据导入路由
const uploadRouter = require('./routes/upload');              // 文件上传路由
const qualityMetricsRouter = require('./routes/quality-metrics'); // 质量指标路由
const materialPriceRouter = require('./routes/material-price'); // 材料价格路由
const reworkRouter = require('./routes/rework');              // 返工登记路由
const personRouter = require('./routes/person');              // 人员管理路由

/**
 * 创建Express应用实例
 */
const app = express();

/**
 * 配置中间件
 *
 * 中间件执行顺序很重要，按以下顺序配置：
 * 1. CORS - 处理跨域请求
 * 2. Body解析器 - 解析请求体
 * 3. 自定义中间件 - 日志记录等
 */

// 启用CORS，允许前端跨域访问
app.use(cors());

// 配置JSON请求体解析，限制大小为50MB（支持大文件上传）
app.use(bodyParser.json({limit: '50mb'}));

// 配置URL编码请求体解析，支持表单数据
app.use(bodyParser.urlencoded({limit: '50mb', extended: true}));

/**
 * 请求日志中间件
 *
 * 功能：记录所有HTTP请求的基本信息
 * 格式：时间 - 请求方法 请求路径
 *
 * 用途：
 * - 调试和监控
 * - 性能分析
 * - 安全审计
 */
app.use((req, res, next) => {
  const logMessage = `${new Date().toLocaleString()} - ${req.method} ${req.url}`;
  console.log(logMessage);
  next(); // 继续执行下一个中间件
});

/**
 * API测试端点
 *
 * 功能：提供服务器连接测试接口
 * 路径：GET /api/test-connection
 *
 * 用途：
 * - 前端检测后端服务是否可用
 * - 网络连接测试
 * - 服务器状态监控
 *
 * 响应信息：
 * - 成功状态
 * - 服务器时间
 * - 进程ID
 * - 时间戳
 */
app.get('/api/test-connection', (req, res) => {
  const testMessage = `连接测试成功 - 服务器时间: ${new Date().toLocaleString()}`;
  console.log(testMessage);

  // 记录测试日志到文件
  require('fs').appendFileSync('debug.log', `${new Date().toISOString()} - ${testMessage}\n`);

  // 返回测试结果
  res.json({
    success: true,
    message: testMessage,
    serverPid: process.pid,      // 服务器进程ID
    timestamp: new Date().toISOString()
  });
});

/**
 * 注册API路由
 *
 * 路由模块说明：
 * - /api/complaint: 投诉记录管理（增删改查、导出等）
 * - /api/auth: 用户认证（登录、注册、权限验证）
 * - /api/config: 系统配置（网站设置、参数配置）
 * - /api/import: 数据导入（Excel导入、批量处理）
 * - /api/upload: 文件上传（附件、图片上传）
 * - /api/quality-metrics: 质量指标（统计分析、图表数据）
 * - /api/admin/material-prices: 材料价格管理（供应商价格）
 * - /api/rework: 生产不良返工登记管理（增删改查、统计分析）
 */
app.use('/api/complaint', complaintRouter);
app.use('/api/auth', authRouter);
app.use('/api/config', configRouter);
app.use('/api/import', importRouter);
app.use('/api/upload', uploadRouter);
app.use('/api/quality-metrics', qualityMetricsRouter);
app.use('/api/admin/material-prices', materialPriceRouter);
app.use('/api/rework', reworkRouter);
app.use('/api/person', personRouter);

/**
 * 静态文件服务配置
 *
 * 功能：提供文件访问服务
 *
 * 路由说明：
 * - /files/attachments: 访问投诉记录的附件文件
 * - /files/site-images: 访问网站配置的图片文件
 * - /shared-files: 访问网络共享盘的文件（通过HTTP代理）
 *
 * 安全考虑：
 * - 文件路径限制在指定目录内
 * - Express.static自动处理路径遍历攻击
 */
app.use('/files/attachments', express.static(path.join(__dirname, 'uploads/attachments')));
app.use('/files/site-images', express.static(path.join(__dirname, 'uploads/site-images')));
app.use('/files/rework-attachments', express.static(path.join(__dirname, 'uploads/rework-attachments')));

// 添加共享文件访问路由
app.use('/shared-files', require('./routes/shared-files'));

/**
 * 全局错误处理
 *
 * 功能：捕获未处理的异常和Promise拒绝
 *
 * 重要性：
 * - 防止服务器崩溃
 * - 记录错误信息用于调试
 * - 提高系统稳定性
 */

// 捕获未处理的同步异常
process.on('uncaughtException', (error) => {
  console.error('未捕获的异常:', error);
  // 注意：在生产环境中，可能需要优雅地关闭服务器
});

// 捕获未处理的Promise拒绝
process.on('unhandledRejection', (reason, promise) => {
  console.error('未处理的Promise拒绝:', reason);
  // 注意：在生产环境中，可能需要记录到日志文件
});

/**
 * 启动HTTP服务器
 *
 * 配置说明：
 * - 端口：3001
 * - 监听地址：0.0.0.0（允许外部访问）
 * - 错误处理：监听启动错误事件
 *
 * 启动信息：
 * - 显示服务器状态
 * - 记录启动时间
 * - 显示工作目录
 */
app.listen(3001, '0.0.0.0', () => {
  console.log('=== 后端服务已启动 ===');
  console.log('端口: 3001');
  console.log('时间:', new Date().toLocaleString());
  console.log('工作目录:', process.cwd());
  console.log('========================');
}).on('error', (error) => {
  console.error('服务器启动错误:', error);
  // 在生产环境中，可能需要退出进程或重试
});