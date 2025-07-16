/**
 * 共享文件访问路由
 * 
 * 功能：提供网络共享盘文件的HTTP访问代理
 * 用途：将网络共享路径的文件通过HTTP方式提供给前端访问
 * 
 * 路由：/shared-files/*
 * 方法：GET
 * 
 * 安全考虑：
 * - 限制访问路径在指定的共享目录内
 * - 防止路径遍历攻击
 * - 支持的文件类型限制
 */

const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const mime = require('mime-types');

// 网络共享盘的基础路径
const NETWORK_SHARE_BASE = '\\\\tj_server\\工作\\品质部\\生产异常周报考核统计';

// 支持的文件类型
const SUPPORTED_FILE_TYPES = [
  '.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.svg',
  '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',
  '.mp4', '.avi', '.mov', '.wmv', '.flv', '.mp3', '.wav'
];

/**
 * 检查文件类型是否支持
 */
function isSupportedFileType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  return SUPPORTED_FILE_TYPES.includes(ext);
}

/**
 * 安全路径检查
 */
function isSecurePath(requestedPath) {
  // 防止路径遍历攻击
  if (requestedPath.includes('..') || requestedPath.includes('//')) {
    return false;
  }
  
  // 检查是否在允许的路径范围内
  const normalizedPath = requestedPath.replace(/\//g, '\\');
  
  // 只允许访问2025年异常汇总目录下的文件
  if (!normalizedPath.startsWith('2025年异常汇总\\')) {
    return false;
  }
  
  return true;
}

/**
 * 构建完整的网络路径
 */
function buildNetworkPath(relativePath) {
  // URL解码
  const decodedPath = decodeURIComponent(relativePath);
  
  // 将URL路径转换为Windows路径格式
  const windowsPath = decodedPath.replace(/\//g, '\\');
  
  // 构建完整的网络路径
  const fullPath = path.join(NETWORK_SHARE_BASE, windowsPath);
  
  return fullPath;
}

/**
 * 健康检查接口
 */
router.get('/', (req, res) => {
  res.json({
    success: true,
    message: '共享文件服务正常运行',
    baseNetworkPath: NETWORK_SHARE_BASE,
    supportedFileTypes: SUPPORTED_FILE_TYPES
  });
});

/**
 * 获取共享文件
 * GET /shared-files/*
 */
router.get('/*', async (req, res) => {
  try {
    const requestedPath = req.params[0]; // 获取通配符匹配的路径

    console.log('=== 共享文件访问请求 ===');
    console.log('请求路径:', requestedPath);

    // 如果是空路径，返回健康检查信息
    if (!requestedPath || requestedPath.trim() === '') {
      return res.json({
        success: true,
        message: '共享文件服务正常运行',
        baseNetworkPath: NETWORK_SHARE_BASE,
        supportedFileTypes: SUPPORTED_FILE_TYPES
      });
    }

    // 安全检查
    if (!isSecurePath(requestedPath)) {
      console.log('❌ 路径安全检查失败');
      return res.status(403).json({
        success: false,
        message: '访问被拒绝：路径不安全'
      });
    }
    
    // 构建完整的网络路径
    const fullNetworkPath = buildNetworkPath(requestedPath);
    console.log('完整网络路径:', fullNetworkPath);
    
    // 检查文件类型
    if (!isSupportedFileType(fullNetworkPath)) {
      console.log('❌ 不支持的文件类型');
      return res.status(415).json({
        success: false,
        message: '不支持的文件类型'
      });
    }
    
    // 检查文件是否存在
    try {
      const stats = fs.statSync(fullNetworkPath);
      
      if (!stats.isFile()) {
        console.log('❌ 不是文件');
        return res.status(404).json({
          success: false,
          message: '文件不存在'
        });
      }
      
      console.log('✅ 文件存在，大小:', stats.size, 'bytes');
      
    } catch (statError) {
      console.log('❌ 文件访问失败:', statError.message);
      return res.status(404).json({
        success: false,
        message: '文件不存在或无法访问'
      });
    }
    
    // 设置响应头
    const mimeType = mime.lookup(fullNetworkPath) || 'application/octet-stream';
    const fileName = path.basename(fullNetworkPath);
    
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(fileName)}"`);
    res.setHeader('Cache-Control', 'public, max-age=3600'); // 缓存1小时
    
    // 添加CORS头
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    console.log('✅ 开始传输文件');
    
    // 创建文件流并发送
    const fileStream = fs.createReadStream(fullNetworkPath);
    
    fileStream.on('error', (error) => {
      console.error('❌ 文件流错误:', error);
      if (!res.headersSent) {
        res.status(500).json({
          success: false,
          message: '文件读取失败'
        });
      }
    });
    
    fileStream.on('end', () => {
      console.log('✅ 文件传输完成');
    });
    
    // 管道传输文件
    fileStream.pipe(res);
    
  } catch (error) {
    console.error('❌ 共享文件访问错误:', error);
    
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        message: '服务器内部错误: ' + error.message
      });
    }
  }
});

/**
 * 处理OPTIONS请求（CORS预检）
 */
router.options('/*', (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Max-Age', '86400'); // 24小时
  res.status(204).send();
});

module.exports = router;
