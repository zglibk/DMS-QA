/**
 * 月度批次统计管理路由
 * 功能：处理MonthlyBatchStats表的增删改查操作
 * 版本：v1.0
 * 创建日期：2025-09-06
 */

const express = require('express');
const router = express.Router();
const { sql, getDynamicConfig } = require('../db');
const { authenticateToken, checkPermission } = require('../middleware/auth');
const { logger, LOG_CATEGORIES, SEVERITY_LEVELS, MODULES } = require('../utils/logger');
const erpService = require('../services/erpService');

/**
 * 获取月度批次统计列表
 * GET /api/monthly-batch-stats
 * 支持分页、筛选、搜索
 */
router.get('/', authenticateToken, async (req, res) => {
  let pool;
  
  try {
    const {
      page = 1,
      pageSize = 20,
      statYear,
      statMonth,
      sortBy = 'CreatedAt',
      sortOrder = 'DESC'
    } = req.query;
    
    const offset = (page - 1) * pageSize;
    
    pool = await sql.connect(await getDynamicConfig());
    
    // 构建查询条件
    let whereConditions = [];
    let queryParams = {};
    
    if (statYear) {
      whereConditions.push('StatYear = @statYear');
      queryParams.statYear = statYear;
    }
    
    if (statMonth) {
      whereConditions.push('StatMonth = @statMonth');
      queryParams.statMonth = statMonth;
    }
    
    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
    
    // 查询总数
    const countRequest = pool.request();
    Object.keys(queryParams).forEach(key => {
      countRequest.input(key, queryParams[key]);
    });
    
    const countResult = await countRequest.query(`
      SELECT COUNT(*) as total 
      FROM MonthlyBatchStats 
      ${whereClause}
    `);
    
    const total = countResult.recordset[0].total;
    
    // 查询数据
    const dataRequest = pool.request();
    Object.keys(queryParams).forEach(key => {
      dataRequest.input(key, queryParams[key]);
    });
    dataRequest.input('offset', offset);
    dataRequest.input('pageSize', parseInt(pageSize));
    
    const dataResult = await dataRequest.query(`
      SELECT 
        ID,
        StatYear,
        StatMonth,
        InspectionBatches,
        DeliveryBatches,
        Remarks,
        CreatedBy,
        CreatedAt,
        UpdatedBy,
        UpdatedAt
      FROM MonthlyBatchStats 
      ${whereClause}
      ORDER BY ${sortBy} ${sortOrder}
      OFFSET @offset ROWS
      FETCH NEXT @pageSize ROWS ONLY
    `);
    
    res.json({
      success: true,
      data: {
        list: dataResult.recordset,
        total: total,
        page: parseInt(page),
        pageSize: parseInt(pageSize),
        totalPages: Math.ceil(total / pageSize)
      }
    });
    
    // 记录操作日志
    logger.info('查询月度批次统计列表', {
      category: LOG_CATEGORIES.BUSINESS,
      module: MODULES.MONTHLY_BATCH_STATS,
      userID: req.user?.id,
      operationType: 'QUERY',
      details: { page, pageSize, total }
    });
    
  } catch (error) {
    console.error('获取月度批次统计列表失败:', error);
    
    // 记录错误日志
    logger.error('获取月度批次统计列表失败', {
      category: LOG_CATEGORIES.SYSTEM,
      module: MODULES.MONTHLY_BATCH_STATS,
      userID: req.user?.id,
      operationType: 'QUERY',
      error: error.message,
      stack: error.stack
    });
    
    res.status(500).json({
      success: false,
      message: '获取数据失败',
      error: error.message
    });
  } finally {
    if (pool) {
      try {
        await pool.close();
      } catch (closeError) {
        console.error('关闭数据库连接失败:', closeError);
      }
    }
  }
});

/**
 * 创建月度批次统计记录
 * POST /api/monthly-batch-stats
 */
router.post('/', authenticateToken, async (req, res) => {
  let pool;
  
  try {
    const {
      StatYear,
      StatMonth,
      InspectionBatches,
      DeliveryBatches,
      Remarks
    } = req.body;
    
    // 参数验证
    if (!StatYear || !StatMonth) {
      return res.status(400).json({
        success: false,
        message: '统计年份和月份不能为空'
      });
    }
    
    if (InspectionBatches === undefined || DeliveryBatches === undefined) {
      return res.status(400).json({
        success: false,
        message: '交检批次数和交货批次数不能为空'
      });
    }
    
    pool = await sql.connect(await getDynamicConfig());
    
    // 检查是否已存在相同年月的记录
    const checkRequest = pool.request();
    checkRequest.input('statYear', StatYear);
    checkRequest.input('statMonth', StatMonth);
    
    const existResult = await checkRequest.query(`
      SELECT ID FROM MonthlyBatchStats 
      WHERE StatYear = @statYear AND StatMonth = @statMonth
    `);
    
    if (existResult.recordset.length > 0) {
      // 如果存在，则更新记录
      const updateRequest = pool.request();
      updateRequest.input('id', existResult.recordset[0].ID);
      updateRequest.input('inspectionBatches', InspectionBatches);
      updateRequest.input('deliveryBatches', DeliveryBatches);
      updateRequest.input('remarks', Remarks || '');
      updateRequest.input('updatedBy', req.user?.username || 'system');
      
      const updateResult = await updateRequest.query(`
        UPDATE MonthlyBatchStats 
        SET 
          InspectionBatches = @inspectionBatches,
          DeliveryBatches = @deliveryBatches,
          Remarks = @remarks,
          UpdatedBy = @updatedBy,
          UpdatedAt = GETDATE()
        WHERE ID = @id
      `);
      
      res.json({
        success: true,
        message: '数据更新成功',
        data: { id: existResult.recordset[0].ID }
      });
      
      // 记录操作日志
      logger.info('更新月度批次统计记录', {
        category: LOG_CATEGORIES.BUSINESS,
        module: MODULES.MONTHLY_BATCH_STATS,
        userID: req.user?.id,
        operationType: 'UPDATE',
        details: { id: existResult.recordset[0].ID, StatYear, StatMonth }
      });
      
    } else {
      // 如果不存在，则创建新记录
      const insertRequest = pool.request();
      insertRequest.input('statYear', StatYear);
      insertRequest.input('statMonth', StatMonth);
      insertRequest.input('inspectionBatches', InspectionBatches);
      insertRequest.input('deliveryBatches', DeliveryBatches);
      insertRequest.input('remarks', Remarks || '');
      insertRequest.input('createdBy', req.user?.username || 'system');
      
      const insertResult = await insertRequest.query(`
        INSERT INTO MonthlyBatchStats (
          StatYear, StatMonth, InspectionBatches, DeliveryBatches, 
          Remarks, CreatedBy, CreatedAt
        )
        OUTPUT INSERTED.ID
        VALUES (
          @statYear, @statMonth, @inspectionBatches, @deliveryBatches,
          @remarks, @createdBy, GETDATE()
        )
      `);
      
      const newId = insertResult.recordset[0].ID;
      
      res.json({
        success: true,
        message: '数据保存成功',
        data: { id: newId }
      });
      
      // 记录操作日志
      logger.info('创建月度批次统计记录', {
        category: LOG_CATEGORIES.BUSINESS,
        module: MODULES.MONTHLY_BATCH_STATS,
        userID: req.user?.id,
        operationType: 'CREATE',
        details: { id: newId, StatYear, StatMonth }
      });
    }
    
  } catch (error) {
    console.error('保存月度批次统计记录失败:', error);
    
    // 记录错误日志
    logger.error('保存月度批次统计记录失败', {
      category: LOG_CATEGORIES.SYSTEM,
      module: MODULES.MONTHLY_BATCH_STATS,
      userID: req.user?.id,
      operationType: 'CREATE',
      error: error.message,
      stack: error.stack
    });
    
    res.status(500).json({
      success: false,
      message: '保存数据失败',
      error: error.message
    });
  } finally {
    if (pool) {
      try {
        await pool.close();
      } catch (closeError) {
        console.error('关闭数据库连接失败:', closeError);
      }
    }
  }
});

/**
 * 获取需要同步的月份范围
 * GET /api/monthly-batch-stats/sync-range
 */
router.get('/sync-range', authenticateToken, async (req, res) => {
  let pool;
  
  try {
    pool = await sql.connect(await getDynamicConfig());
    
    // 获取当前年份
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1;
    
    // 查询已有数据的最新年月
    const request = pool.request();
    const result = await request.query(`
      SELECT TOP 1 StatYear, StatMonth
      FROM MonthlyBatchStats
      ORDER BY StatYear DESC, StatMonth DESC
    `);
    
    let startYear, startMonth;
    
    if (result.recordset.length > 0) {
      // 如果有数据，检查最新记录
      const lastRecord = result.recordset[0];
      
      // 如果最新记录是当前月，允许重新同步当前月
      if (lastRecord.StatYear === currentYear && lastRecord.StatMonth === currentMonth) {
        startYear = currentYear;
        startMonth = currentMonth;
      } else {
        // 如果最新记录不是当前月，从下一个月开始
        startYear = lastRecord.StatYear;
        startMonth = lastRecord.StatMonth + 1;
        
        // 处理月份溢出
        if (startMonth > 12) {
          startYear += 1;
          startMonth = 1;
        }
      }
    } else {
      // 如果没有数据，从当前年份的1月开始
      startYear = currentYear;
      startMonth = 1;
    }
    
    // 生成需要同步的月份列表
    const monthsToSync = [];
    let year = startYear;
    let month = startMonth;
    
    while (year < currentYear || (year === currentYear && month <= currentMonth)) {
      monthsToSync.push({
        year: year,
        month: month,
        label: `${year}年${month}月`
      });
      
      month++;
      if (month > 12) {
        year++;
        month = 1;
      }
    }
    
    res.json({
      success: true,
      data: {
        startYear,
        startMonth,
        currentYear,
        currentMonth,
        monthsToSync,
        totalMonths: monthsToSync.length
      }
    });
    
  } catch (error) {
    console.error('获取同步范围失败:', error);
    
    res.status(500).json({
      success: false,
      message: '获取同步范围失败',
      error: error.message
    });
  } finally {
    if (pool) {
      try {
        await pool.close();
      } catch (closeError) {
        console.error('关闭数据库连接失败:', closeError);
      }
    }
  }
});

/**
 * 获取指定年份需要同步的月份范围
 * GET /api/monthly-batch-stats/sync-range/:year
 */
router.get('/sync-range/:year', authenticateToken, async (req, res) => {
  let pool;
  
  try {
    const { year } = req.params;
    const targetYear = parseInt(year);
    
    if (isNaN(targetYear) || targetYear < 2020 || targetYear > 2030) {
      return res.status(400).json({
        success: false,
        message: '年份参数无效，请输入2020-2030之间的年份'
      });
    }
    
    pool = await sql.connect(await getDynamicConfig());
    
    // 查询指定年份已有的月份数据
    const request = pool.request();
    request.input('year', targetYear);
    
    const result = await request.query(`
      SELECT StatMonth
      FROM MonthlyBatchStats
      WHERE StatYear = @year
      ORDER BY StatMonth
    `);
    
    const existingMonths = result.recordset.map(record => record.StatMonth);
    
    // 生成该年份缺失的月份列表
    const missingMonths = [];
    for (let month = 1; month <= 12; month++) {
      if (!existingMonths.includes(month)) {
        missingMonths.push({
          year: targetYear,
          month: month,
          label: `${targetYear}年${month}月`
        });
      }
    }
    
    res.json({
      success: true,
      data: {
        year: targetYear,
        existingMonths,
        missingMonths,
        totalMissing: missingMonths.length
      }
    });
    
  } catch (error) {
    console.error('获取年份同步范围失败:', error);
    
    res.status(500).json({
      success: false,
      message: '获取年份同步范围失败',
      error: error.message
    });
  } finally {
    if (pool) {
      try {
        await pool.close();
      } catch (closeError) {
        console.error('关闭数据库连接失败:', closeError);
      }
    }
  }
});

/**
 * 获取单个月度批次统计记录
 * GET /api/monthly-batch-stats/:id
 */
router.get('/:id', authenticateToken, async (req, res) => {
  let pool;
  
  try {
    const { id } = req.params;
    
    pool = await sql.connect(await getDynamicConfig());
    
    const request = pool.request();
    request.input('id', id);
    
    const result = await request.query(`
      SELECT 
        ID,
        StatYear,
        StatMonth,
        InspectionBatches,
        DeliveryBatches,
        Remarks,
        CreatedBy,
        CreatedAt,
        UpdatedBy,
        UpdatedAt
      FROM MonthlyBatchStats 
      WHERE ID = @id
    `);
    
    if (result.recordset.length === 0) {
      return res.status(404).json({
        success: false,
        message: '记录不存在'
      });
    }
    
    res.json({
      success: true,
      data: result.recordset[0]
    });
    
  } catch (error) {
    console.error('获取月度批次统计记录失败:', error);
    
    res.status(500).json({
      success: false,
      message: '获取数据失败',
      error: error.message
    });
  } finally {
    if (pool) {
      try {
        await pool.close();
      } catch (closeError) {
        console.error('关闭数据库连接失败:', closeError);
      }
    }
  }
});

/**
 * 删除月度批次统计记录
 * DELETE /api/monthly-batch-stats/:id
 */
router.delete('/:id', authenticateToken, async (req, res) => {
  let pool;
  
  try {
    const { id } = req.params;
    
    pool = await sql.connect(await getDynamicConfig());
    
    const request = pool.request();
    request.input('id', id);
    
    const result = await request.query(`
      DELETE FROM MonthlyBatchStats 
      WHERE ID = @id
    `);
    
    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({
        success: false,
        message: '记录不存在'
      });
    }
    
    res.json({
      success: true,
      message: '删除成功'
    });
    
    // 记录操作日志
    logger.info('删除月度批次统计记录', {
      category: LOG_CATEGORIES.BUSINESS,
      module: MODULES.MONTHLY_BATCH_STATS,
      userID: req.user?.id,
      operationType: 'DELETE',
      details: { id }
    });
    
  } catch (error) {
    console.error('删除月度批次统计记录失败:', error);
    
    // 记录错误日志
    logger.error('删除月度批次统计记录失败', {
      category: LOG_CATEGORIES.SYSTEM,
      module: MODULES.MONTHLY_BATCH_STATS,
      userID: req.user?.id,
      operationType: 'DELETE',
      error: error.message,
      stack: error.stack
    });
    
    res.status(500).json({
      success: false,
      message: '删除失败',
      error: error.message
    });
  } finally {
    if (pool) {
      try {
        await pool.close();
      } catch (closeError) {
        console.error('关闭数据库连接失败:', closeError);
      }
    }
  }
});



/**
 * 同步ERP数据接口
 * POST /api/monthly-batch-stats/sync-erp-data
 */
router.post('/sync-erp-data', authenticateToken, async (req, res) => {
  let pool;
  
  try {
    const { year, month, remarks, erpToken } = req.body;
    const userId = req.user?.id;
    const username = req.user?.username || 'system';

    // 如果提供了ERP token，则设置到ERP服务中
    if (erpToken) {
      erpService.setErpToken(erpToken);
    }

    // 参数验证
    if (!year || !month) {
      return res.status(400).json({
        success: false,
        message: '年份和月份不能为空'
      });
    }

    if (year < 2020 || year > 2030) {
      return res.status(400).json({
        success: false,
        message: '年份范围无效'
      });
    }

    if (month < 1 || month > 12) {
      return res.status(400).json({
        success: false,
        message: '月份范围无效'
      });
    }

    logger.info('开始同步ERP数据', {
      category: LOG_CATEGORIES.BUSINESS,
      module: MODULES.MONTHLY_BATCH_STATS,
      userID: userId,
      operationType: 'SYNC',
      details: { year, month, remarks }
    });

    pool = await sql.connect(await getDynamicConfig());

    // 检查该月份数据是否已存在
    const checkRequest = pool.request();
    checkRequest.input('year', year);
    checkRequest.input('month', month);
    
    const existResult = await checkRequest.query(`
      SELECT ID FROM MonthlyBatchStats 
      WHERE StatYear = @year AND StatMonth = @month
    `);

    const isUpdate = existResult.recordset.length > 0;
    let recordId = isUpdate ? existResult.recordset[0].ID : null;

    // 从ERP获取月度批次统计数据
    const erpStats = await erpService.getMonthlyBatchStatistics(year, month);

    let result;
    if (isUpdate) {
      // 更新现有记录
      const updateRequest = pool.request();
      updateRequest.input('id', recordId);
      updateRequest.input('inspectionBatches', erpStats.inspectionBatches);
      updateRequest.input('deliveryBatches', erpStats.deliveryBatches);
      updateRequest.input('remarks', remarks || `ERP同步数据 - ${erpStats.dateRange}`);
      updateRequest.input('updatedBy', username);
      
      result = await updateRequest.query(`
        UPDATE MonthlyBatchStats 
        SET InspectionBatches = @inspectionBatches, 
            DeliveryBatches = @deliveryBatches, 
            Remarks = @remarks, 
            UpdatedBy = @updatedBy, 
            UpdatedAt = GETDATE()
        WHERE ID = @id
      `);
    } else {
      // 插入新记录
      const insertRequest = pool.request();
      insertRequest.input('year', year);
      insertRequest.input('month', month);
      insertRequest.input('inspectionBatches', erpStats.inspectionBatches);
      insertRequest.input('deliveryBatches', erpStats.deliveryBatches);
      insertRequest.input('remarks', remarks || `ERP同步数据 - ${erpStats.dateRange}`);
      insertRequest.input('createdBy', username);
      
      result = await insertRequest.query(`
        INSERT INTO MonthlyBatchStats 
        (StatYear, StatMonth, InspectionBatches, DeliveryBatches, Remarks, CreatedBy, CreatedAt)
        OUTPUT INSERTED.ID
        VALUES (@year, @month, @inspectionBatches, @deliveryBatches, @remarks, @createdBy, GETDATE())
      `);
      
      recordId = result.recordset[0].ID;
    }

    logger.info('ERP数据同步成功', {
      category: LOG_CATEGORIES.BUSINESS,
      module: MODULES.MONTHLY_BATCH_STATS,
      userID: userId,
      operationType: isUpdate ? 'UPDATE' : 'CREATE',
      details: {
        recordId,
        year,
        month,
        inspectionBatches: erpStats.inspectionBatches,
        deliveryBatches: erpStats.deliveryBatches,
        isUpdate
      }
    });

    res.json({
      success: true,
      message: `${year}年${month}月数据同步成功`,
      data: {
        id: recordId,
        year,
        month,
        inspectionBatches: erpStats.inspectionBatches,
        deliveryBatches: erpStats.deliveryBatches,
        remarks: remarks || `ERP同步数据 - ${erpStats.dateRange}`,
        isUpdate,
        erpStatistics: erpStats
      }
    });

  } catch (error) {
    console.error('ERP数据同步失败:', error);
    
    logger.error('ERP数据同步失败', {
      category: LOG_CATEGORIES.SYSTEM,
      module: MODULES.MONTHLY_BATCH_STATS,
      userID: req.user?.id,
      operationType: 'SYNC',
      error: error.message,
      stack: error.stack
    });

    res.status(500).json({
      success: false,
      message: 'ERP数据同步失败',
      error: error.message
    });
  } finally {
    if (pool) {
      try {
        await pool.close();
      } catch (closeError) {
        console.error('关闭数据库连接失败:', closeError);
      }
    }
  }
});

/**
 * 批量同步ERP数据接口
 * POST /api/monthly-batch-stats/batch-sync-erp-data
 */
router.post('/batch-sync-erp-data', authenticateToken, async (req, res) => {
  let pool;
  
  try {
    const { months, remarks, erpToken } = req.body;
    const userId = req.user?.id;
    const username = req.user?.username || 'system';

    // 如果提供了ERP token，则设置到ERP服务中
    if (erpToken) {
      erpService.setErpToken(erpToken);
      console.log('使用前端传递的ERP token进行批量数据同步');
    }

    // 参数验证
    if (!Array.isArray(months) || months.length === 0) {
      return res.status(400).json({
        success: false,
        message: '月份列表不能为空'
      });
    }

    logger.info('开始批量同步ERP数据', {
      category: LOG_CATEGORIES.BUSINESS,
      module: MODULES.MONTHLY_BATCH_STATS,
      userID: userId,
      operationType: 'BATCH_SYNC',
      details: { monthsCount: months.length, months, remarks }
    });

    pool = await sql.connect(await getDynamicConfig());
    
    const results = [];
    const errors = [];

    // 逐个处理每个月份
    for (const monthData of months) {
      try {
        const { year, month } = monthData;
        
        // 检查该月份数据是否已存在
        const checkRequest = pool.request();
        checkRequest.input('year', year);
        checkRequest.input('month', month);
        
        const existResult = await checkRequest.query(`
          SELECT ID FROM MonthlyBatchStats 
          WHERE StatYear = @year AND StatMonth = @month
        `);

        const isUpdate = existResult.recordset.length > 0;
        let recordId = isUpdate ? existResult.recordset[0].ID : null;

        // 从ERP获取月度批次统计数据
        const erpStats = await erpService.getMonthlyBatchStatistics(year, month);

        if (isUpdate) {
          // 更新现有记录
          const updateRequest = pool.request();
          updateRequest.input('id', recordId);
          updateRequest.input('inspectionBatches', erpStats.inspectionBatches);
          updateRequest.input('deliveryBatches', erpStats.deliveryBatches);
          updateRequest.input('remarks', remarks || `批量ERP同步 - ${erpStats.dateRange}`);
          updateRequest.input('updatedBy', username);
          
          await updateRequest.query(`
            UPDATE MonthlyBatchStats 
            SET InspectionBatches = @inspectionBatches, 
                DeliveryBatches = @deliveryBatches, 
                Remarks = @remarks, 
                UpdatedBy = @updatedBy, 
                UpdatedAt = GETDATE()
            WHERE ID = @id
          `);
        } else {
          // 插入新记录
          const insertRequest = pool.request();
          insertRequest.input('year', year);
          insertRequest.input('month', month);
          insertRequest.input('inspectionBatches', erpStats.inspectionBatches);
          insertRequest.input('deliveryBatches', erpStats.deliveryBatches);
          insertRequest.input('remarks', remarks || `批量ERP同步 - ${erpStats.dateRange}`);
          insertRequest.input('createdBy', username);
          
          const insertResult = await insertRequest.query(`
            INSERT INTO MonthlyBatchStats 
            (StatYear, StatMonth, InspectionBatches, DeliveryBatches, Remarks, CreatedBy, CreatedAt)
            OUTPUT INSERTED.ID
            VALUES (@year, @month, @inspectionBatches, @deliveryBatches, @remarks, @createdBy, GETDATE())
          `);
          
          recordId = insertResult.recordset[0].ID;
        }

        results.push({
          year,
          month,
          id: recordId,
          inspectionBatches: erpStats.inspectionBatches,
          deliveryBatches: erpStats.deliveryBatches,
          isUpdate,
          success: true
        });

      } catch (error) {
        errors.push({
          year: monthData.year,
          month: monthData.month,
          error: error.message,
          success: false
        });
      }
    }

    const successCount = results.length;
    const errorCount = errors.length;

    logger.info('批量ERP数据同步完成', {
      category: LOG_CATEGORIES.BUSINESS,
      module: MODULES.MONTHLY_BATCH_STATS,
      userID: userId,
      operationType: 'BATCH_SYNC',
      details: {
        totalCount: months.length,
        successCount,
        errorCount,
        results,
        errors
      }
    });

    res.json({
      success: errorCount === 0,
      message: `批量同步完成：成功${successCount}个，失败${errorCount}个`,
      data: {
        totalCount: months.length,
        successCount,
        errorCount,
        results,
        errors
      }
    });

  } catch (error) {
    console.error('批量ERP数据同步失败:', error);
    
    logger.error('批量ERP数据同步失败', {
      category: LOG_CATEGORIES.SYSTEM,
      module: MODULES.MONTHLY_BATCH_STATS,
      userID: req.user?.id,
      operationType: 'BATCH_SYNC',
      error: error.message,
      stack: error.stack
    });

    res.status(500).json({
      success: false,
      message: '批量ERP数据同步失败',
      error: error.message
    });
  } finally {
    if (pool) {
      try {
        await pool.close();
      } catch (closeError) {
        console.error('关闭数据库连接失败:', closeError);
      }
    }
  }
});

module.exports = router;