/**
 * 客户投诉记录批量删除API接口
 * 独立的批量删除功能模块
 */
const express = require('express');
const router = express.Router();
const { getConnection, sql } = require('../db');

/**
 * 批量删除客户投诉记录
 * POST /api/customer-complaints-batch/delete
 * 
 * @param {Array} ids - 要删除的投诉记录ID数组
 * @returns {Object} 删除结果
 */
router.post('/delete', async (req, res) => {
  console.log('=== 客户投诉记录批量删除API被调用 ===');
  console.log('请求体:', JSON.stringify(req.body, null, 2));
  
  try {
    const { ids } = req.body;
    
    // 参数验证
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({
        success: false,
        message: '请提供要删除的投诉记录ID列表',
        code: 'INVALID_PARAMS'
      });
    }

    // 验证ID数量限制（防止一次删除过多数据）
    if (ids.length > 100) {
      return res.status(400).json({
        success: false,
        message: '单次批量删除不能超过100条记录',
        code: 'EXCEED_LIMIT'
      });
    }

    // 验证和转换ID
    const validIds = [];
    for (let i = 0; i < ids.length; i++) {
      const id = ids[i];
      const parsedId = parseInt(id);
      
      if (isNaN(parsedId) || parsedId <= 0) {
        return res.status(400).json({
          success: false,
          message: `无效的投诉记录ID: ${id}`,
          code: 'INVALID_ID'
        });
      }
      validIds.push(parsedId);
    }

    console.log('准备删除的有效ID列表:', validIds);

    const pool = await getConnection();
    
    // 首先检查要删除的记录是否存在
    const checkRequest = pool.request();
    const checkPlaceholders = validIds.map((_, index) => `@checkId${index}`).join(',');
    const checkQuery = `SELECT ID FROM CustomerComplaints WHERE ID IN (${checkPlaceholders})`;
    
    validIds.forEach((id, index) => {
      checkRequest.input(`checkId${index}`, sql.Int, id);
    });
    
    const existingRecords = await checkRequest.query(checkQuery);
    const existingIds = existingRecords.recordset.map(record => record.ID);
    
    if (existingIds.length === 0) {
      return res.status(404).json({
        success: false,
        message: '未找到要删除的投诉记录',
        code: 'RECORDS_NOT_FOUND'
      });
    }

    // 执行批量删除
    const deleteRequest = pool.request();
    const deletePlaceholders = existingIds.map((_, index) => `@deleteId${index}`).join(',');
    const deleteQuery = `DELETE FROM CustomerComplaints WHERE ID IN (${deletePlaceholders})`;
    
    existingIds.forEach((id, index) => {
      deleteRequest.input(`deleteId${index}`, sql.Int, id);
    });
    
    const deleteResult = await deleteRequest.query(deleteQuery);
    
    console.log('批量删除执行结果:', {
      requestedCount: validIds.length,
      existingCount: existingIds.length,
      deletedCount: deleteResult.rowsAffected[0]
    });

    // 返回详细的删除结果
    const notFoundIds = validIds.filter(id => !existingIds.includes(id));
    
    res.json({
      success: true,
      message: `成功删除 ${deleteResult.rowsAffected[0]} 条投诉记录`,
      data: {
        deletedCount: deleteResult.rowsAffected[0],
        deletedIds: existingIds,
        notFoundIds: notFoundIds,
        requestedCount: validIds.length
      },
      code: 'DELETE_SUCCESS'
    });
    
  } catch (error) {
    console.error('批量删除客户投诉记录失败:', error);
    res.status(500).json({
      success: false,
      message: '批量删除客户投诉记录失败',
      error: error.message,
      code: 'SERVER_ERROR'
    });
  }
});

/**
 * 获取批量删除预览信息
 * POST /api/customer-complaints-batch/preview
 * 
 * @param {Array} ids - 要删除的投诉记录ID数组
 * @returns {Object} 预览信息
 */
router.post('/preview', async (req, res) => {
  console.log('=== 获取批量删除预览信息 ===');
  
  try {
    const { ids } = req.body;
    
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({
        success: false,
        message: '请提供要预览的投诉记录ID列表',
        code: 'INVALID_PARAMS'
      });
    }

    const validIds = [];
    for (const id of ids) {
      const parsedId = parseInt(id);
      if (!isNaN(parsedId) && parsedId > 0) {
        validIds.push(parsedId);
      }
    }

    if (validIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: '没有有效的投诉记录ID',
        code: 'NO_VALID_IDS'
      });
    }

    const pool = await getConnection();
    const request = pool.request();
    
    const placeholders = validIds.map((_, index) => `@id${index}`).join(',');
    const query = `
      SELECT ID, Date, CustomerCode, WorkOrderNo, ProductName, 
             ProblemDescription, Status, CreatedBy, CreatedAt
      FROM CustomerComplaints 
      WHERE ID IN (${placeholders})
      ORDER BY CreatedAt DESC
    `;
    
    validIds.forEach((id, index) => {
      request.input(`id${index}`, sql.Int, id);
    });
    
    const result = await request.query(query);
    const records = result.recordset;
    
    const notFoundIds = validIds.filter(id => 
      !records.some(record => record.ID === id)
    );

    res.json({
      success: true,
      message: '获取预览信息成功',
      data: {
        records: records,
        foundCount: records.length,
        notFoundCount: notFoundIds.length,
        notFoundIds: notFoundIds,
        totalRequested: validIds.length
      },
      code: 'PREVIEW_SUCCESS'
    });
    
  } catch (error) {
    console.error('获取批量删除预览信息失败:', error);
    res.status(500).json({
      success: false,
      message: '获取预览信息失败',
      error: error.message,
      code: 'SERVER_ERROR'
    });
  }
});

module.exports = router;