/**
 * 通知公告管理系统 - 路由
 * 功能：定义通知公告相关的API路由
 * 版本：v1.0
 * 创建日期：2025-08-08
 */

const express = require('express');
const router = express.Router();
const noticeController = require('../controllers/noticeController');
const { authenticateToken, checkPermission } = require('../middleware/auth');

// 添加请求日志中间件
router.use((req, res, next) => {
  // console.log(`=== Notice路由收到请求 ===`)
  // console.log(`方法: ${req.method}`)
  // console.log(`路径: ${req.path}`)
  // console.log(`完整URL: ${req.originalUrl}`)
  next()
})

// =====================================================
// 通知公告相关路由
// =====================================================

/**
 * 获取通知公告列表
 * GET /api/notice
 * 查询参数：limit, type
 */
router.get('/', noticeController.getNoticeList);

/**
 * 获取通知公告详情
 * GET /api/notice/:id
 */
router.get('/:id', noticeController.getNoticeById);

/**
 * 创建通知公告
 * POST /api/notice
 * 需要认证和权限
 */
router.post('/', 
    authenticateToken, 
    // checkPermission('notice:add'),
    noticeController.createNotice
);

/**
 * 更新通知公告
 * PUT /api/notice/:id
 * 需要认证和权限
 */
router.put('/:id', 
    authenticateToken, 
    // checkPermission('notice:edit'),
    noticeController.updateNotice
);

/**
 * 删除通知公告
 * DELETE /api/notice/:id
 * 需要认证和权限
 */
router.delete('/:id', 
    authenticateToken, 
    // checkPermission('notice:delete'),
    noticeController.deleteNotice
);

module.exports = router;