/**
 * 系统日志管理路由
 * 提供日志查询、过滤、分页、统计、导出等功能
 */

const express = require('express');
const { sql, getDynamicConfig } = require('../db');
const { logger, LOG_CATEGORIES, SEVERITY_LEVELS, MODULES } = require('../utils/logger');
const { logCleanupService } = require('../services/logCleanupService');
const { authenticateToken, checkPermission } = require('../middleware/auth');
const router = express.Router();

// 为所有系统日志路由添加认证中间件
router.use((req, res, next) => {
  next();
});
router.use(authenticateToken);

/**
 * 获取系统日志列表
 * 支持分页、过滤、排序
 */
router.get('/list', async (req, res) => {
  
  let pool;
  const startTime = Date.now();
  
  try {
    const {
      page = 1,
      pageSize = 20,
      category,
      module,
      severity,
      operationType,
      userID,
      startDate,
      endDate,
      keyword,
      sortBy = 'CreatedAt',
      sortOrder = 'DESC'
    } = req.query;
    
    pool = await sql.connect(await getDynamicConfig());
    
    // 构建查询条件
    let whereConditions = [];
    let queryParams = {};
    
    if (category) {
      whereConditions.push('sl.Category = @category');
      queryParams.category = category;
    }
    
    if (module) {
      whereConditions.push('sl.Module = @module');
      queryParams.module = module;
    }
    
    if (severity) {
      whereConditions.push('sl.Severity = @severity');
      queryParams.severity = severity;
    }
    
    if (operationType) {
      whereConditions.push('sl.OperationType = @operationType');
      queryParams.operationType = operationType;
    }
    
    if (userID) {
      whereConditions.push('sl.UserID = @userID');
      queryParams.userID = parseInt(userID);
    }
    
    if (startDate) {
      whereConditions.push('sl.CreatedAt >= @startDate');
      queryParams.startDate = new Date(startDate);
    }
    
    if (endDate) {
      whereConditions.push('sl.CreatedAt <= @endDate');
      queryParams.endDate = new Date(endDate);
    }
    
    if (keyword) {
      whereConditions.push('(sl.Action LIKE @keyword OR sl.Details LIKE @keyword)');
      queryParams.keyword = `%${keyword}%`;
    }
    
    const whereClause = whereConditions.length > 0 ? 
      'WHERE ' + whereConditions.join(' AND ') : '';
    
    // 计算总数
    const countRequest = pool.request();
    Object.keys(queryParams).forEach(key => {
      countRequest.input(key, queryParams[key]);
    });
    
    const countResult = await countRequest.query(`
      SELECT COUNT(*) as total
      FROM [dbo].[SystemLogs] sl
      LEFT JOIN [dbo].[User] u ON sl.UserID = u.ID
      ${whereClause}
    `);
    
    const total = countResult.recordset[0].total;
    
    // 查询数据
    const offset = (page - 1) * pageSize;
    const dataRequest = pool.request();
    Object.keys(queryParams).forEach(key => {
      dataRequest.input(key, queryParams[key]);
    });
    dataRequest.input('offset', offset);
    dataRequest.input('pageSize', parseInt(pageSize));
    
    const validSortColumns = ['ID', 'CreatedAt', 'Action', 'Category', 'Module', 'Severity', 'UserID'];
    const safeSortBy = validSortColumns.includes(sortBy) ? sortBy : 'CreatedAt';
    const safeSortOrder = ['ASC', 'DESC'].includes(sortOrder.toUpperCase()) ? sortOrder.toUpperCase() : 'DESC';
    
    const dataResult = await dataRequest.query(`
      SELECT 
        ID,
        UserID,
        Username,
        Action,
        Details,
        Category,
        Module,
        ResourceType,
        ResourceID,
        OperationType,
        Severity,
        Duration,
        IPAddress,
        UserAgent,
        Status,
        ErrorMessage,
        CreatedAt,
        SessionID,
        TraceID
      FROM (
        SELECT 
          ROW_NUMBER() OVER (ORDER BY sl.${safeSortBy} ${safeSortOrder}) as RowNum,
          sl.ID,
          sl.UserID,
          u.Username,
          sl.Action,
          sl.Details,
          sl.Category,
          sl.Module,
          sl.ResourceType,
          sl.ResourceID,
          sl.OperationType,
          sl.Severity,
          sl.Duration,
          sl.IPAddress,
          sl.UserAgent,
          sl.Status,
          sl.ErrorMessage,
          sl.CreatedAt,
          sl.SessionID,
          sl.TraceID
        FROM [dbo].[SystemLogs] sl
        LEFT JOIN [dbo].[User] u ON sl.UserID = u.ID
        ${whereClause}
      ) AS PagedResults
      WHERE RowNum > @offset AND RowNum <= (@offset + @pageSize)
      ORDER BY RowNum
    `);
    
    const duration = Date.now() - startTime;
    
    // 记录查询日志
    await logger.logDataOperation(
      req.user?.id || req.user?.ID,
      '查询系统日志',
      'SYSTEM_LOG',
      'LIST',
      'read',
      req,
      { filters: req.query },
      { total, count: dataResult.recordset.length },
      duration
    );
    
    res.json({
      success: true,
      data: {
        list: dataResult.recordset,
        pagination: {
          page: parseInt(page),
          pageSize: parseInt(pageSize),
          total,
          totalPages: Math.ceil(total / pageSize)
        }
      }
    });
    
  } catch (error) {
    
    // 记录错误日志
    await logger.logError(
      req.user?.id || req.user?.ID,
      '查询系统日志失败',
      error,
      req,
      'SYSTEM_LOG'
    );
    
    res.status(500).json({
      success: false,
      message: '获取系统日志列表失败',
      error: error.message
    });
  }
});

/**
 * 获取系统日志统计信息
 */
router.get('/statistics', async (req, res) => {
  let pool;
  const startTime = Date.now();
  
  try {
    const {
      startDate,
      endDate,
      category,
      module,
      severity,
      userID,
      keyword,
      groupBy = 'day' // day, hour, category, module, severity
    } = req.query;
    
    pool = await sql.connect(await getDynamicConfig());
    
    let whereConditions = [];
    let queryParams = {};
    
    if (startDate) {
      whereConditions.push('CreatedAt >= @startDate');
      queryParams.startDate = new Date(startDate);
    }
    
    if (endDate) {
      whereConditions.push('CreatedAt <= @endDate');
      queryParams.endDate = new Date(endDate);
    }
    
    if (category) {
      whereConditions.push('Category = @category');
      queryParams.category = category;
    }
    
    if (module) {
      whereConditions.push('Module = @module');
      queryParams.module = module;
    }
    
    if (severity) {
      whereConditions.push('Severity = @severity');
      queryParams.severity = severity;
    }
    
    if (userID) {
      whereConditions.push('UserID = @userID');
      queryParams.userID = parseInt(userID);
    }
    
    if (keyword) {
      whereConditions.push('(Action LIKE @keyword OR Details LIKE @keyword)');
      queryParams.keyword = `%${keyword}%`;
    }
    
    const whereClause = whereConditions.length > 0 ? 
      'WHERE ' + whereConditions.join(' AND ') : '';
    
    let groupByClause, selectClause;
    
    switch (groupBy) {
      case 'hour':
        selectClause = "CONVERT(VARCHAR(13), CreatedAt, 120) + ':00' as timeGroup";
        groupByClause = "CONVERT(VARCHAR(13), CreatedAt, 120) + ':00'";
        break;
      case 'category':
        selectClause = 'Category as groupKey';
        groupByClause = 'Category';
        break;
      case 'module':
        selectClause = 'Module as groupKey';
        groupByClause = 'Module';
        break;
      case 'severity':
        selectClause = 'Severity as groupKey';
        groupByClause = 'Severity';
        break;
      default: // day
        selectClause = "CONVERT(VARCHAR(10), CreatedAt, 120) as timeGroup";
        groupByClause = "CONVERT(VARCHAR(10), CreatedAt, 120)";
        break;
    }
    
    const request = pool.request();
    Object.keys(queryParams).forEach(key => {
      request.input(key, queryParams[key]);
    });
    
    // 获取统计数据
    const statsResult = await request.query(`
      SELECT 
        ${selectClause},
        COUNT(*) as count,
        COUNT(CASE WHEN Severity = 'ERROR' THEN 1 END) as errorCount,
        COUNT(CASE WHEN Severity = 'WARN' THEN 1 END) as warnCount,
        COUNT(CASE WHEN Severity = 'INFO' THEN 1 END) as infoCount,
        AVG(CAST(Duration as FLOAT)) as avgDuration
      FROM [dbo].[SystemLogs]
      ${whereClause}
      GROUP BY ${groupByClause}
      ORDER BY ${groupByClause}
    `);
    
    // 获取总体统计
    const totalStatsResult = await request.query(`
      SELECT 
        COUNT(*) as totalLogs,
        COUNT(DISTINCT CASE WHEN UserID IS NOT NULL THEN UserID END) as uniqueUsers,
        COUNT(CASE WHEN Severity = 'ERROR' THEN 1 END) as totalErrors,
        COUNT(CASE WHEN Severity = 'WARN' THEN 1 END) as totalWarnings,
        AVG(CAST(Duration as FLOAT)) as avgDuration,
        MAX(CreatedAt) as lastLogTime
      FROM [dbo].[SystemLogs]
      ${whereClause}
    `);
    
    // 获取热门操作
    const topActionsResult = await request.query(`
      SELECT TOP 10
        Action,
        COUNT(*) as count
      FROM [dbo].[SystemLogs]
      ${whereClause}
      GROUP BY Action
      ORDER BY COUNT(*) DESC
    `);
    
    const duration = Date.now() - startTime;
    
    // 记录查询日志
    await logger.logDataOperation(
      req.user?.id || req.user?.ID,
      '查询系统日志统计',
      'SYSTEM_LOG',
      'STATISTICS',
      'read',
      req,
      { groupBy, startDate, endDate },
      { statsCount: statsResult.recordset.length },
      duration
    );
    
    res.json({
      success: true,
      data: {
        statistics: statsResult.recordset,
        totalStats: totalStatsResult.recordset[0],
        topActions: topActionsResult.recordset
      }
    });
    
  } catch (error) {
    
    await logger.logError(
      req.user?.id || req.user?.ID,
      '查询系统日志统计失败',
      error,
      req,
      'SYSTEM_LOG'
    );
    
    res.status(500).json({
      success: false,
      message: '获取系统日志统计失败',
      error: error.message
    });
  }
});

/**
 * 获取日志详情
 */
router.get('/:id', async (req, res) => {
  let pool;
  
  try {
    const { id } = req.params;
    
    pool = await sql.connect(await getDynamicConfig());
    
    const result = await pool.request()
      .input('id', sql.Int, parseInt(id))
      .query(`
        SELECT 
          sl.*,
          u.Username,
          u.Email
        FROM [dbo].[SystemLogs] sl
        LEFT JOIN [dbo].[User] u ON sl.UserID = u.ID
        WHERE sl.ID = @id
      `);
    
    if (result.recordset.length === 0) {
      return res.status(404).json({
        success: false,
        message: '日志记录不存在'
      });
    }
    
    const logRecord = result.recordset[0];
    
    // 解析JSON字段
    if (logRecord.RequestData) {
      try {
        logRecord.RequestData = JSON.parse(logRecord.RequestData);
      } catch (e) {
        // 保持原始字符串
      }
    }
    
    if (logRecord.ResponseData) {
      try {
        logRecord.ResponseData = JSON.parse(logRecord.ResponseData);
      } catch (e) {
        // 保持原始字符串
      }
    }
    
    // 记录查看日志
    await logger.logDataOperation(
      req.user?.id || req.user?.ID,
      '查看系统日志详情',
      'SYSTEM_LOG',
      id,
      'read',
      req
    );
    
    res.json({
      success: true,
      data: logRecord
    });
    
  } catch (error) {
    
    await logger.logError(
      req.user?.id || req.user?.ID,
      '查看系统日志详情失败',
      error,
      req,
      'SYSTEM_LOG'
    );
    
    res.status(500).json({
      success: false,
      message: '获取日志详情失败',
      error: error.message
    });
  }
});

/**
 * 获取日志配置选项
 */
router.get('/config/options', async (req, res) => {
  try {
    // 记录查询日志
    await logger.logDataOperation(
      req.user?.id || req.user?.ID,
      '获取日志配置选项',
      'SYSTEM_LOG',
      'CONFIG',
      'read',
      req
    );
    
    // 从数据库获取实际存在的模块
    let actualModules = Object.values(MODULES);
    try {
      const pool = await sql.connect(await getDynamicConfig());
      const moduleQuery = `
        SELECT DISTINCT Module 
        FROM SystemLogs 
        WHERE Module IS NOT NULL AND Module != ''
        ORDER BY Module
      `;
      const moduleResult = await pool.request().query(moduleQuery);
      if (moduleResult.recordset && moduleResult.recordset.length > 0) {
        actualModules = moduleResult.recordset.map(r => r.Module);
      }
    } catch (dbError) {
      // 获取数据库模块失败，使用默认配置
    }
    
    res.json({
      success: true,
      data: {
        categories: Object.values(LOG_CATEGORIES),
        severityLevels: Object.values(SEVERITY_LEVELS),
        modules: actualModules
      }
    });
    
  } catch (error) {
    
    await logger.logError(
      req.user?.id || req.user?.ID,
      '获取日志配置选项失败',
      error,
      req,
      'SYSTEM_LOG'
    );
    
    res.status(500).json({
      success: false,
      message: '获取日志配置选项失败',
      error: error.message
    });
  }
});

/**
 * 批量删除日志
 * 仅允许管理员操作
 */
router.delete('/batch', async (req, res) => {
  let pool;
  
  try {
    const { ids, beforeDate } = req.body;
    
    // 检查权限（这里应该添加管理员权限检查）
    // if (!req.user?.isAdmin) {
    //   return res.status(403).json({
    //     success: false,
    //     message: '权限不足'
    //   });
    // }
    
    pool = await sql.connect(await getDynamicConfig());
    
    let deletedCount = 0;
    
    if (ids && Array.isArray(ids) && ids.length > 0) {
      // 按ID删除
      const placeholders = ids.map((_, index) => `@id${index}`).join(',');
      const request = pool.request();
      
      ids.forEach((id, index) => {
        request.input(`id${index}`, sql.Int, parseInt(id));
      });
      
      const result = await request.query(`
        DELETE FROM [dbo].[SystemLogs] 
        WHERE ID IN (${placeholders})
      `);
      
      deletedCount = result.rowsAffected[0];
      
    } else if (beforeDate) {
      // 按日期删除
      const result = await pool.request()
        .input('beforeDate', sql.DateTime, new Date(beforeDate))
        .query(`
          DELETE FROM [dbo].[SystemLogs] 
          WHERE CreatedAt < @beforeDate
        `);
      
      deletedCount = result.rowsAffected[0];
    }
    
    // 记录删除操作日志
    await logger.logDataOperation(
      req.user?.id || req.user?.ID,
      '批量删除系统日志',
      'SYSTEM_LOG',
      'BATCH',
      'DELETE',
      req,
      { ids, beforeDate },
      { deletedCount }
    );
    
    res.json({
      success: true,
      message: `成功删除 ${deletedCount} 条日志记录`,
      data: { deletedCount }
    });
    
  } catch (error) {
    
    await logger.logError(
      req.user?.id || req.user?.ID,
      '批量删除系统日志失败',
      error,
      req,
      'SYSTEM_LOG'
    );
    
    res.status(500).json({
      success: false,
      message: '批量删除日志失败',
      error: error.message
    });
  }
});

/**
 * 手动清理日志
 */
router.post('/cleanup', authenticateToken, checkPermission('system:logs:delete'), async (req, res) => {
  try {
    const { severity, beforeDate, maxCount } = req.body;
    
    // 检查权限（这里应该添加管理员权限检查）
    // if (!req.user?.isAdmin) {
    //   return res.status(403).json({
    //     success: false,
    //     message: '权限不足'
    //   });
    // }
    
    const cleanedCount = await logCleanupService.manualCleanup({
      severity,
      beforeDate,
      maxCount
    }, {
      userID: req.user?.id || req.user?.ID,
      userName: req.user?.username || req.user?.Username,
      ipAddress: req.ip || req.connection?.remoteAddress,
      userAgent: req.get('User-Agent')
    });
    
    res.json({
      success: true,
      message: `成功清理 ${cleanedCount} 条日志记录`,
      data: { cleanedCount }
    });
    
  } catch (error) {
    
    await logger.logError(
      req.user?.id || req.user?.ID,
      '手动清理系统日志失败',
      error,
      req,
      'SYSTEM_LOG'
    );
    
    res.status(500).json({
      success: false,
      message: error.message || '手动清理日志失败'
    });
  }
});

/**
 * 获取清理统计信息
 */
router.get('/cleanup/stats', async (req, res) => {
  try {
    const stats = logCleanupService.getCleanupStats();
    
    // 记录查询日志
    await logger.logDataOperation(
      req.user?.id || req.user?.ID,
      '查询日志清理统计',
      'SYSTEM_LOG',
      'CLEANUP_STATS',
      'read',
      req
    );
    
    res.json({
      success: true,
      data: stats
    });
    
  } catch (error) {
    
    await logger.logError(
      req.user?.id || req.user?.ID,
      '查询日志清理统计失败',
      error,
      req,
      'SYSTEM_LOG'
    );
    
    res.status(500).json({
      success: false,
      message: '获取清理统计失败',
      error: error.message
    });
  }
});

/**
 * 立即执行清理任务
 */
router.post('/cleanup/execute', async (req, res) => {
  try {
    // 检查权限（这里应该添加管理员权限检查）
    // if (!req.user?.isAdmin) {
    //   return res.status(403).json({
    //     success: false,
    //     message: '权限不足'
    //   });
    // }
    
    // 异步执行清理任务
    logCleanupService.performCleanup().catch(error => {
      // 清理任务执行失败，已记录到日志系统
    });
    
    // 记录操作日志
    await logger.logDataOperation(
      req.user?.id || req.user?.ID,
      '手动触发日志清理任务',
      'SYSTEM_LOG',
      'CLEANUP_TASK',
      'CREATE',
      req
    );
    
    res.json({
      success: true,
      message: '清理任务已启动，请稍后查看清理结果'
    });
    
  } catch (error) {
    
    await logger.logError(
      req.user?.id || req.user?.ID,
      '启动日志清理任务失败',
      error,
      req,
      'SYSTEM_LOG'
    );
    
    res.status(500).json({
      success: false,
      message: '启动清理任务失败',
      error: error.message
    });
  }
});

/**
 * 获取统计分析概览数据
 */
router.get('/analytics/overview', async (req, res) => {
  
  let pool;
  const startTime = Date.now();
  
  try {
    const {
      startDate,
      endDate,
      category,
      module
    } = req.query;
    
    pool = await sql.connect(await getDynamicConfig());
    
    // 构建查询条件
    let whereConditions = ['1=1'];
    let queryParams = {};
    
    if (startDate) {
      whereConditions.push('sl.CreatedAt >= @startDate');
      queryParams.startDate = startDate;
    }
    
    if (endDate) {
      whereConditions.push('sl.CreatedAt <= @endDate');
      queryParams.endDate = endDate;
    }
    
    if (category) {
      whereConditions.push('sl.Category = @category');
      queryParams.category = category;
    }
    
    if (module) {
      whereConditions.push('sl.Module = @module');
      queryParams.module = module;
    }
    
    const whereClause = whereConditions.join(' AND ');
    
    // 获取概览统计
    const overviewQuery = `
      SELECT 
        COUNT(*) as totalLogs,
        SUM(CASE WHEN sl.Severity = 'ERROR' THEN 1 ELSE 0 END) as errorLogs,
        SUM(CASE WHEN sl.Severity = 'WARN' THEN 1 ELSE 0 END) as warningLogs,
        COUNT(DISTINCT sl.UserID) as uniqueUsers
      FROM SystemLogs sl
      WHERE ${whereClause}
    `;
    
    const request = pool.request();
    Object.keys(queryParams).forEach(key => {
      request.input(key, queryParams[key]);
    });
    
    const result = await request.query(overviewQuery);
    const overview = result.recordset[0];
    
    // 记录操作日志
    const queryDetails = JSON.stringify(req.query);
    logger.log({
      action: '获取日志统计概览',
      category: LOG_CATEGORIES.QUERY_STATS,
      module: MODULES.SYSTEM,
      userID: req.user?.id,
      details: `查询条件: ${queryDetails.length > 900 ? queryDetails.substring(0, 900) + '...' : queryDetails}`,
      duration: Date.now() - startTime
    });
    
    const responseData = {
      totalLogs: parseInt(overview.totalLogs) || 0,
      errorLogs: parseInt(overview.errorLogs) || 0,
      warningLogs: parseInt(overview.warningLogs) || 0,
      uniqueUsers: parseInt(overview.uniqueUsers) || 0
    };
    
    res.json({
      success: true,
      data: responseData
    });
    
  } catch (error) {
    
    logger.log({
      action: '获取日志统计概览失败',
      category: LOG_CATEGORIES.SYSTEM_ERROR,
      module: MODULES.SYSTEM,
      userID: req.user?.id,
      errorMessage: error.message.length > 900 ? error.message.substring(0, 900) + '...' : error.message,
      severity: 'ERROR',
      duration: Date.now() - startTime
    });
    
    res.status(500).json({
      success: false,
      message: '获取统计概览失败'
    });
  }
});

/**
 * 获取分类统计数据
 */
router.get('/analytics/category', async (req, res) => {

  
  let pool;
  const startTime = Date.now();
  
  try {
    const {
      startDate,
      endDate,
      category,
      module
    } = req.query;
    
    pool = await sql.connect(await getDynamicConfig());

    
    // 构建查询条件
    let whereConditions = ['1=1'];
    let queryParams = {};
    
    if (startDate) {
      whereConditions.push('sl.CreatedAt >= @startDate');
      queryParams.startDate = startDate;
    }
    
    if (endDate) {
      whereConditions.push('sl.CreatedAt <= @endDate');
      queryParams.endDate = endDate;
    }
    
    if (category) {
      whereConditions.push('sl.Category = @category');
      queryParams.category = category;
    }
    
    if (module) {
      whereConditions.push('sl.Module = @module');
      queryParams.module = module;
    }
    
    const whereClause = whereConditions.join(' AND ');
    
    // 获取分类统计
    const categoryQuery = `
      SELECT 
        sl.Category as category,
        COUNT(*) as count,
        SUM(CASE WHEN sl.Severity = 'ERROR' THEN 1 ELSE 0 END) as errorCount,
        SUM(CASE WHEN sl.Severity = 'WARN' THEN 1 ELSE 0 END) as warningCount,
        CAST(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM SystemLogs sl2 WHERE ${whereClause.replace(/sl\./g, 'sl2.')}) AS DECIMAL(5,2)) as percentage
      FROM SystemLogs sl
      WHERE ${whereClause}
      GROUP BY sl.Category
      ORDER BY count DESC
    `;
    
    const request = pool.request();
    Object.keys(queryParams).forEach(key => {
      request.input(key, queryParams[key]);
    });
    
    const result = await request.query(categoryQuery);
    
    // 记录操作日志
    const queryDetails = JSON.stringify(req.query);
    logger.log({
      action: '获取日志分类统计',
      category: LOG_CATEGORIES.QUERY_STATS,
      module: MODULES.SYSTEM,
      userID: req.user?.id,
      details: `查询条件: ${queryDetails.length > 900 ? queryDetails.substring(0, 900) + '...' : queryDetails}`,
      duration: Date.now() - startTime
    });
    

    res.json({
      success: true,
      data: result.recordset
    });
    
  } catch (error) {
    
    logger.log({
      action: '获取日志分类统计失败',
      category: LOG_CATEGORIES.SYSTEM_ERROR,
      module: MODULES.SYSTEM,
      userID: req.user?.id,
      errorMessage: error.message.length > 900 ? error.message.substring(0, 900) + '...' : error.message,
      severity: 'ERROR',
      duration: Date.now() - startTime
    });
    
    res.status(500).json({
      success: false,
      message: '获取分类统计失败'
    });
  }
});

/**
 * 获取模块统计数据
 */
router.get('/analytics/module', async (req, res) => {

  
  let pool;
  const startTime = Date.now();
  
  try {
    const {
      startDate,
      endDate,
      category,
      module
    } = req.query;
    
    pool = await sql.connect(await getDynamicConfig());

    
    // 构建查询条件
    let whereConditions = ['1=1'];
    let queryParams = {};
    
    if (startDate) {
      whereConditions.push('sl.CreatedAt >= @startDate');
      queryParams.startDate = startDate;

    }
    
    if (endDate) {
      whereConditions.push('sl.CreatedAt <= @endDate');
      queryParams.endDate = endDate;

    }
    
    if (category) {
      whereConditions.push('sl.Category = @category');
      queryParams.category = category;

    }
    
    if (module) {
      whereConditions.push('sl.Module = @module');
      queryParams.module = module;

    }
    
    const whereClause = whereConditions.join(' AND ');
    
    // 获取模块统计
    const moduleQuery = `
      SELECT 
        sl.Module as module,
        COUNT(*) as count,
        SUM(CASE WHEN sl.Severity = 'ERROR' THEN 1 ELSE 0 END) as errorCount,
        AVG(CAST(sl.Duration AS FLOAT)) as avgDuration,
        CAST(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM SystemLogs sl2 WHERE ${whereClause.replace(/sl\./g, 'sl2.')}) AS DECIMAL(5,2)) as percentage
      FROM SystemLogs sl
      WHERE ${whereClause}
      GROUP BY sl.Module
      ORDER BY count DESC
    `;
    
    const request = pool.request();
    Object.keys(queryParams).forEach(key => {
      request.input(key, queryParams[key]);
    });
    
    const result = await request.query(moduleQuery);
    
    // 记录操作日志
    const queryDetails = JSON.stringify(req.query);
    logger.log({
      action: '获取日志模块统计',
      category: LOG_CATEGORIES.QUERY_STATS,
      module: MODULES.SYSTEM,
      userID: req.user?.id,
      details: `查询条件: ${queryDetails.length > 900 ? queryDetails.substring(0, 900) + '...' : queryDetails}`,
      duration: Date.now() - startTime
    });
    
    const responseData = result.recordset.map(item => ({
      ...item,
      avgDuration: item.avgDuration ? Math.round(item.avgDuration) : null
    }));
    
    res.json({
      success: true,
      data: responseData
    });
    
  } catch (error) {
    
    logger.log({
      action: '获取日志模块统计失败',
      category: LOG_CATEGORIES.SYSTEM_ERROR,
      module: MODULES.SYSTEM,
      userID: req.user?.id,
      errorMessage: error.message.length > 900 ? error.message.substring(0, 900) + '...' : error.message,
      severity: 'ERROR',
      duration: Date.now() - startTime
    });
    
    res.status(500).json({
      success: false,
      message: '获取模块统计失败'
    });
  }
});

/**
 * 获取用户统计数据
 */
router.get('/analytics/user', async (req, res) => {

  
  let pool;
  const startTime = Date.now();
  
  try {
    const {
      startDate,
      endDate,
      category,
      module
    } = req.query;
    
    pool = await sql.connect(await getDynamicConfig());

    
    // 构建查询条件
    let whereConditions = ['1=1'];
    let queryParams = {};
    
    if (startDate) {
      whereConditions.push('sl.CreatedAt >= @startDate');
      queryParams.startDate = startDate;

    }
    
    if (endDate) {
      whereConditions.push('sl.CreatedAt <= @endDate');
      queryParams.endDate = endDate;

    }
    
    if (category) {
      whereConditions.push('sl.Category = @category');
      queryParams.category = category;

    }
    
    if (module) {
      whereConditions.push('sl.Module = @module');
      queryParams.module = module;

    }
    
    const whereClause = whereConditions.join(' AND ');
    
    // 获取用户统计
    const userQuery = `
      SELECT 
        COALESCE(u.Username, '匿名用户') as username,
        sl.UserID,
        COUNT(*) as count,
        MAX(sl.CreatedAt) as lastActivity,
        SUM(CASE WHEN sl.Severity = 'ERROR' THEN 1 ELSE 0 END) as errorCount,
        CAST((COUNT(*) - SUM(CASE WHEN sl.Severity = 'ERROR' THEN 1 ELSE 0 END)) * 100.0 / COUNT(*) AS DECIMAL(5,2)) as successRate
      FROM SystemLogs sl
      LEFT JOIN [dbo].[User] u ON sl.UserID = u.ID
      WHERE ${whereClause}
      GROUP BY sl.UserID, u.Username
      ORDER BY count DESC
    `;
    
    const request = pool.request();
    Object.keys(queryParams).forEach(key => {
      request.input(key, queryParams[key]);
    });
    
    const result = await request.query(userQuery);
    
    // 记录操作日志
    const queryDetails = JSON.stringify(req.query);
    logger.log({
      action: '获取日志用户统计',
      category: LOG_CATEGORIES.QUERY_STATS,
      module: MODULES.SYSTEM,
      userID: req.user?.id,
      details: `查询条件: ${queryDetails.length > 900 ? queryDetails.substring(0, 900) + '...' : queryDetails}`,
      duration: Date.now() - startTime
    });
    

    res.json({
      success: true,
      data: result.recordset
    });
    
  } catch (error) {
    
    logger.log({
      action: '获取日志用户统计失败',
      category: LOG_CATEGORIES.SYSTEM_ERROR,
      module: MODULES.SYSTEM,
      userID: req.user?.id,
      errorMessage: error.message.length > 900 ? error.message.substring(0, 900) + '...' : error.message,
      severity: 'ERROR',
      duration: Date.now() - startTime
    });
    
    res.status(500).json({
      success: false,
      message: '获取用户统计失败'
    });
  }
});

/**
 * 获取趋势数据
 */
router.get('/analytics/trend', async (req, res) => {

  
  let pool;
  const startTime = Date.now();
  
  try {
    const {
      startDate,
      endDate,
      category,
      module,
      period = 'day'
    } = req.query;
    
    pool = await sql.connect(await getDynamicConfig());

    
    // 构建查询条件
    let whereConditions = ['1=1'];
    let queryParams = {};
    
    if (startDate) {
      whereConditions.push('sl.CreatedAt >= @startDate');
      queryParams.startDate = startDate;

    }
    
    if (endDate) {
      whereConditions.push('sl.CreatedAt <= @endDate');
      queryParams.endDate = endDate;

    }
    
    if (category) {
      whereConditions.push('sl.Category = @category');
      queryParams.category = category;

    }
    
    if (module) {
      whereConditions.push('sl.Module = @module');
      queryParams.module = module;

    }
    
    const whereClause = whereConditions.join(' AND ');
    
    // 根据时间周期构建分组字段 (SQL Server 2008R2 兼容)
    let dateFormat;
    switch (period) {
      case 'hour':
        dateFormat = "CONVERT(VARCHAR(13), sl.CreatedAt, 120) + ':00'";
        break;
      case 'week':
        dateFormat = "CAST(YEAR(sl.CreatedAt) AS VARCHAR) + '-W' + RIGHT('0' + CAST(DATEPART(week, sl.CreatedAt) AS VARCHAR), 2)";
        break;
      case 'day':
      default:
        dateFormat = "CONVERT(VARCHAR(10), sl.CreatedAt, 120)";
        break;
    }
    

    
    // 获取趋势数据
    const trendQuery = `
      SELECT 
        ${dateFormat} as time,
        COUNT(*) as total,
        SUM(CASE WHEN sl.Severity = 'ERROR' THEN 1 ELSE 0 END) as error,
        SUM(CASE WHEN sl.Severity = 'WARN' THEN 1 ELSE 0 END) as warning
      FROM SystemLogs sl
      WHERE ${whereClause}
      GROUP BY ${dateFormat}
      ORDER BY time
    `;
    
    const request = pool.request();
    Object.keys(queryParams).forEach(key => {
      request.input(key, queryParams[key]);
    });
    
    const result = await request.query(trendQuery);
    
    // 记录操作日志
    const queryDetails = JSON.stringify(req.query);
    logger.log({
      action: '获取日志趋势数据',
      category: LOG_CATEGORIES.QUERY_STATS,
      module: MODULES.SYSTEM,
      userID: req.user?.id,
      details: `查询条件: ${queryDetails.length > 900 ? queryDetails.substring(0, 900) + '...' : queryDetails}`,
      duration: Date.now() - startTime
    });
    

    res.json({
      success: true,
      data: result.recordset
    });
    
  } catch (error) {
    
    logger.log({
      action: '获取日志趋势数据失败',
      category: LOG_CATEGORIES.SYSTEM_ERROR,
      module: MODULES.SYSTEM,
      userID: req.user?.id,
      errorMessage: error.message.length > 900 ? error.message.substring(0, 900) + '...' : error.message,
      severity: 'ERROR',
      duration: Date.now() - startTime
    });
    
    res.status(500).json({
      success: false,
      message: '获取趋势数据失败'
    });
  }
});

/**
 * 导出统计分析报告
 */
router.get('/analytics/export', async (req, res) => {
  let pool;
  const startTime = Date.now();
  
  try {
    const {
      startDate,
      endDate,
      category,
      module
    } = req.query;
    
    pool = await sql.connect(await getDynamicConfig());
    
    // 构建查询条件
    let whereConditions = ['1=1'];
    let queryParams = {};
    
    if (startDate) {
      whereConditions.push('sl.CreatedAt >= @startDate');
      queryParams.startDate = startDate;
    }
    
    if (endDate) {
      whereConditions.push('sl.CreatedAt <= @endDate');
      queryParams.endDate = endDate;
    }
    
    if (category) {
      whereConditions.push('sl.Category = @category');
      queryParams.category = category;
    }
    
    if (module) {
      whereConditions.push('sl.Module = @module');
      queryParams.module = module;
    }
    
    const whereClause = whereConditions.join(' AND ');
    
    const request = pool.request();
    Object.keys(queryParams).forEach(key => {
      request.input(key, queryParams[key]);
    });
    
    // 获取概览数据
    const overviewQuery = `
      SELECT 
        COUNT(*) as totalLogs,
        SUM(CASE WHEN sl.Severity = 'ERROR' THEN 1 ELSE 0 END) as errorLogs,
        SUM(CASE WHEN sl.Severity = 'WARN' THEN 1 ELSE 0 END) as warningLogs,
        COUNT(DISTINCT sl.UserID) as uniqueUsers
      FROM SystemLogs sl
      WHERE ${whereClause}
    `;
    
    const overviewResult = await request.query(overviewQuery);
    const overview = overviewResult.recordset[0];
    
    // 获取分类统计
    const categoryQuery = `
      SELECT 
        sl.Category as category,
        COUNT(*) as count,
        SUM(CASE WHEN sl.Severity = 'ERROR' THEN 1 ELSE 0 END) as errorCount,
        SUM(CASE WHEN sl.Severity = 'WARN' THEN 1 ELSE 0 END) as warningCount,
        CAST(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM SystemLogs sl2 WHERE ${whereClause.replace(/sl\./g, 'sl2.')}) AS DECIMAL(5,2)) as percentage
      FROM SystemLogs sl
      WHERE ${whereClause}
      GROUP BY sl.Category
      ORDER BY count DESC
    `;
    
    const categoryResult = await request.query(categoryQuery);
    
    // 获取模块统计
    const moduleQuery = `
      SELECT 
        sl.Module as module,
        COUNT(*) as count,
        SUM(CASE WHEN sl.Severity = 'ERROR' THEN 1 ELSE 0 END) as errorCount,
        AVG(CAST(sl.Duration AS FLOAT)) as avgDuration,
        CAST(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM SystemLogs sl2 WHERE ${whereClause.replace(/sl\./g, 'sl2.')}) AS DECIMAL(5,2)) as percentage
      FROM SystemLogs sl
      WHERE ${whereClause}
      GROUP BY sl.Module
      ORDER BY count DESC
    `;
    
    const moduleResult = await request.query(moduleQuery);
    
    // 构建Excel数据
    const XLSX = require('xlsx');
    
    const workbook = XLSX.utils.book_new();
    
    // 概览数据工作表
    const overviewData = [
      ['指标', '数值'],
      ['总日志数', overview.totalLogs || 0],
      ['错误日志数', overview.errorLogs || 0],
      ['警告日志数', overview.warningLogs || 0],
      ['活跃用户数', overview.uniqueUsers || 0]
    ];
    
    const overviewSheet = XLSX.utils.aoa_to_sheet(overviewData);
    XLSX.utils.book_append_sheet(workbook, overviewSheet, '概览统计');
    
    // 分类统计工作表
    const categoryData = [
      ['分类', '日志数量', '错误数', '警告数', '占比(%)']
    ];
    categoryResult.recordset.forEach(item => {
      categoryData.push([
        item.category || '未知',
        item.count || 0,
        item.errorCount || 0,
        item.warningCount || 0,
        item.percentage || 0
      ]);
    });
    
    const categorySheet = XLSX.utils.aoa_to_sheet(categoryData);
    XLSX.utils.book_append_sheet(workbook, categorySheet, '分类统计');
    
    // 模块统计工作表
    const moduleData = [
      ['模块', '日志数量', '错误数', '平均耗时(ms)', '占比(%)']
    ];
    moduleResult.recordset.forEach(item => {
      moduleData.push([
        item.module || '未知',
        item.count || 0,
        item.errorCount || 0,
        item.avgDuration ? Math.round(item.avgDuration) : 0,
        item.percentage || 0
      ]);
    });
    
    const moduleSheet = XLSX.utils.aoa_to_sheet(moduleData);
    XLSX.utils.book_append_sheet(workbook, moduleSheet, '模块统计');
    
    // 生成Excel文件
    const excelBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    
    // 验证缓冲区内容
    if (!excelBuffer || excelBuffer.length === 0) {
      throw new Error('生成的Excel文件为空');
    }
    
    // 记录操作日志
    const queryDetails = JSON.stringify(req.query);
    logger.log({
      action: '导出日志统计分析报告',
      category: LOG_CATEGORIES.IMPORT_EXPORT,
      module: MODULES.SYSTEM,
      userID: req.user?.id,
      details: `查询条件: ${queryDetails.length > 900 ? queryDetails.substring(0, 900) + '...' : queryDetails}`,
      duration: Date.now() - startTime
    });
    
    // 设置响应头
    const fileName = `系统日志分析报告_${new Date().toISOString().slice(0, 10)}.xlsx`;
    
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(fileName)}"`);
    res.setHeader('Content-Length', excelBuffer.length);
    
    res.send(excelBuffer);
    
  } catch (error) {
    logger.log({
      action: '导出日志统计分析报告失败',
      category: LOG_CATEGORIES.SYSTEM_ERROR,
      module: MODULES.SYSTEM,
      userID: req.user?.id,
      errorMessage: error.message.length > 900 ? error.message.substring(0, 900) + '...' : error.message,
      severity: 'ERROR',
      duration: Date.now() - startTime
    });
    
    res.status(500).json({
      success: false,
      message: '导出报告失败'
    });
  }
});

module.exports = router;