/**
 * 用户登录日志管理路由
 * 提供登录日志的查询、统计和管理功能
 */

const express = require('express');
const { sql, getDynamicConfig } = require('../db');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const router = express.Router();

/**
 * 获取登录日志列表（分页查询）
 * GET /api/user-login-logs
 * 查询参数：
 * - page: 页码（默认1）
 * - pageSize: 每页数量（默认20）
 * - username: 用户名筛选
 * - loginStatus: 登录状态筛选（成功/失败）
 * - startDate: 开始日期
 * - endDate: 结束日期
 * - departmentId: 部门ID筛选
 */
router.get('/', authenticateToken, async (req, res) => {
  try {
    const {
      page = 1,
      pageSize = 20,
      username,
      loginStatus,
      startDate,
      endDate,
      departmentId
    } = req.query;

    const pool = await sql.connect(await getDynamicConfig());
    
    // 构建查询条件
    let whereConditions = [];
    let queryParams = {};
    
    if (username) {
      whereConditions.push('ull.Username LIKE @Username');
      queryParams.Username = `%${username}%`;
    }
    
    if (loginStatus) {
      whereConditions.push('ull.LoginStatus = @LoginStatus');
      queryParams.LoginStatus = loginStatus;
    }
    
    if (startDate) {
      whereConditions.push('ull.LoginTime >= @StartDate');
      queryParams.StartDate = startDate;
    }
    
    if (endDate) {
      whereConditions.push('ull.LoginTime <= @EndDate');
      queryParams.EndDate = endDate;
    }
    
    if (departmentId) {
      whereConditions.push('ull.DepartmentID = @DepartmentID');
      queryParams.DepartmentID = parseInt(departmentId);
    }
    
    const whereClause = whereConditions.length > 0 ? 'WHERE ' + whereConditions.join(' AND ') : '';
    
    // 计算总数
    const countRequest = pool.request();
    Object.keys(queryParams).forEach(key => {
      if (key.includes('Date')) {
        countRequest.input(key, sql.DateTime2, queryParams[key]);
      } else if (key === 'DepartmentID') {
        countRequest.input(key, sql.Int, queryParams[key]);
      } else {
        countRequest.input(key, sql.NVarChar, queryParams[key]);
      }
    });
    
    const countResult = await countRequest.query(`
      SELECT COUNT(*) as total
      FROM [UserLoginLogs] ull
      LEFT JOIN [Departments] d ON ull.DepartmentID = d.ID
      ${whereClause}
    `);
    
    const total = countResult.recordset[0].total;
    
    // 分页查询数据
    const offset = (page - 1) * pageSize;
    const dataRequest = pool.request();
    Object.keys(queryParams).forEach(key => {
      if (key.includes('Date')) {
        dataRequest.input(key, sql.DateTime2, queryParams[key]);
      } else if (key === 'DepartmentID') {
        dataRequest.input(key, sql.Int, queryParams[key]);
      } else {
        dataRequest.input(key, sql.NVarChar, queryParams[key]);
      }
    });
    
    dataRequest.input('Offset', sql.Int, offset);
    dataRequest.input('PageSize', sql.Int, parseInt(pageSize));
    
    const dataResult = await dataRequest.query(`
      SELECT 
        ull.ID,
        ull.UserID,
        ull.Username,
        ull.RealName,
        ull.DepartmentID,
        d.DepartmentName,
        ull.SessionID,
        ull.LoginTime,
        ull.LogoutTime,
        ull.IPAddress,
        ull.UserAgent,
        ull.Browser,
        ull.OS,
        ull.LoginStatus,
        ull.FailureReason,
        ull.IsOnline,
        ull.LastActivity,
        ull.CreatedAt
      FROM [UserLoginLogs] ull
      LEFT JOIN [Departments] d ON ull.DepartmentID = d.ID
      ${whereClause}
      ORDER BY ull.LoginTime DESC
      OFFSET @Offset ROWS
      FETCH NEXT @PageSize ROWS ONLY
    `);
    
    res.json({
      success: true,
      data: {
        list: dataResult.recordset,
        pagination: {
          current: parseInt(page),
          pageSize: parseInt(pageSize),
          total: total,
          totalPages: Math.ceil(total / pageSize)
        }
      }
    });
    
  } catch (error) {
    console.error('获取登录日志列表失败:', error);
    res.status(500).json({
      success: false,
      message: '获取登录日志列表失败',
      error: error.message
    });
  }
});

/**
 * 获取登录日志统计信息
 * GET /api/user-login-logs/statistics
 * 查询参数：
 * - period: 统计周期（today/week/month/year）
 * - departmentId: 部门ID筛选
 */
router.get('/statistics', authenticateToken, async (req, res) => {
  try {
    const { period = 'today', departmentId } = req.query;
    
    const pool = await sql.connect(await getDynamicConfig());
    
    // 根据周期确定时间范围
    let dateCondition = '';
    switch (period) {
      case 'today':
        dateCondition = 'CAST(LoginTime AS DATE) = CAST(GETDATE() AS DATE)';
        break;
      case 'week':
        dateCondition = 'LoginTime >= DATEADD(WEEK, -1, GETDATE())';
        break;
      case 'month':
        dateCondition = 'LoginTime >= DATEADD(MONTH, -1, GETDATE())';
        break;
      case 'year':
        dateCondition = 'LoginTime >= DATEADD(YEAR, -1, GETDATE())';
        break;
      default:
        dateCondition = '1=1';
    }
    
    let whereClause = `WHERE ${dateCondition}`;
    const request = pool.request();
    
    if (departmentId) {
      whereClause += ' AND DepartmentID = @DepartmentID';
      request.input('DepartmentID', sql.Int, parseInt(departmentId));
    }
    
    // 获取基础统计数据
    const statsResult = await request.query(`
      SELECT 
        COUNT(*) as totalLogins,
        COUNT(CASE WHEN LoginStatus = '成功' THEN 1 END) as successLogins,
        COUNT(CASE WHEN LoginStatus = '失败' THEN 1 END) as failedLogins,
        COUNT(DISTINCT UserID) as uniqueUsers,
        COUNT(CASE WHEN IsOnline = 1 THEN 1 END) as currentOnlineUsers
      FROM [UserLoginLogs]
      ${whereClause}
    `);
    
    // 获取失败原因统计
    const failureReasonsResult = await pool.request().query(`
      SELECT 
        FailureReason,
        COUNT(*) as count
      FROM [UserLoginLogs]
      WHERE LoginStatus = '失败' AND FailureReason IS NOT NULL
        AND ${dateCondition}
        ${departmentId ? 'AND DepartmentID = ' + departmentId : ''}
      GROUP BY FailureReason
      ORDER BY count DESC
    `);
    
    // 获取浏览器统计
    const browserStatsResult = await pool.request().query(`
      SELECT 
        Browser,
        COUNT(*) as count
      FROM [UserLoginLogs]
      WHERE Browser IS NOT NULL AND Browser != ''
        AND ${dateCondition}
        ${departmentId ? 'AND DepartmentID = ' + departmentId : ''}
      GROUP BY Browser
      ORDER BY count DESC
    `);
    
    // 获取操作系统统计
    const osStatsResult = await pool.request().query(`
      SELECT 
        OS,
        COUNT(*) as count
      FROM [UserLoginLogs]
      WHERE OS IS NOT NULL AND OS != ''
        AND ${dateCondition}
        ${departmentId ? 'AND DepartmentID = ' + departmentId : ''}
      GROUP BY OS
      ORDER BY count DESC
    `);
    
    // 获取每小时登录统计（仅当period为today时）
    let hourlyStats = [];
    if (period === 'today') {
      const hourlyResult = await pool.request().query(`
        SELECT 
          DATEPART(HOUR, LoginTime) as hour,
          COUNT(*) as count,
          COUNT(CASE WHEN LoginStatus = '成功' THEN 1 END) as successCount,
          COUNT(CASE WHEN LoginStatus = '失败' THEN 1 END) as failedCount
        FROM [UserLoginLogs]
        WHERE CAST(LoginTime AS DATE) = CAST(GETDATE() AS DATE)
          ${departmentId ? 'AND DepartmentID = ' + departmentId : ''}
        GROUP BY DATEPART(HOUR, LoginTime)
        ORDER BY hour
      `);
      hourlyStats = hourlyResult.recordset;
    }
    
    const stats = statsResult.recordset[0];
    const successRate = stats.totalLogins > 0 ? 
      ((stats.successLogins / stats.totalLogins) * 100).toFixed(2) : 0;
    
    res.json({
      success: true,
      data: {
        summary: {
          totalLogins: stats.totalLogins,
          successLogins: stats.successLogins,
          failedLogins: stats.failedLogins,
          successRate: parseFloat(successRate),
          uniqueUsers: stats.uniqueUsers,
          currentOnlineUsers: stats.currentOnlineUsers
        },
        failureReasons: failureReasonsResult.recordset,
        browserStats: browserStatsResult.recordset,
        osStats: osStatsResult.recordset,
        hourlyStats: hourlyStats,
        period: period
      }
    });
    
  } catch (error) {
    console.error('获取登录日志统计失败:', error);
    res.status(500).json({
      success: false,
      message: '获取登录日志统计失败',
      error: error.message
    });
  }
});

/**
 * 获取当前在线用户列表
 * GET /api/user-login-logs/online-users
 */
router.get('/online-users', authenticateToken, async (req, res) => {
  try {
    const pool = await sql.connect(await getDynamicConfig());
    
    const result = await pool.request().query(`
      SELECT 
        ull.UserID,
        ull.Username,
        ull.RealName,
        d.DepartmentName,
        ull.LoginTime,
        ull.LastActivity,
        ull.IPAddress,
        ull.Browser,
        ull.OS,
        DATEDIFF(MINUTE, ull.LastActivity, GETDATE()) as IdleMinutes
      FROM [UserLoginLogs] ull
      LEFT JOIN [Departments] d ON ull.DepartmentID = d.ID
      WHERE ull.IsOnline = 1
      ORDER BY ull.LastActivity DESC
    `);
    
    res.json({
      success: true,
      data: result.recordset
    });
    
  } catch (error) {
    console.error('获取在线用户列表失败:', error);
    res.status(500).json({
      success: false,
      message: '获取在线用户列表失败',
      error: error.message
    });
  }
});

/**
 * 强制用户下线（管理员功能）
 * POST /api/user-login-logs/force-logout/:sessionId
 */
router.post('/force-logout/:sessionId', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { reason = '管理员强制下线' } = req.body;
    
    const pool = await sql.connect(await getDynamicConfig());
    
    // 更新登录日志，设置为下线状态
    const result = await pool.request()
      .input('SessionID', sql.NVarChar, sessionId)
      .input('LogoutTime', sql.DateTime2, new Date())
      .input('Reason', sql.NVarChar, reason)
      .query(`
        UPDATE [UserLoginLogs]
        SET 
          IsOnline = 0,
          LogoutTime = @LogoutTime,
          FailureReason = @Reason
        WHERE SessionID = @SessionID AND IsOnline = 1
      `);
    
    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({
        success: false,
        message: '未找到对应的在线会话'
      });
    }
    
    res.json({
      success: true,
      message: '用户已强制下线'
    });
    
  } catch (error) {
    console.error('强制用户下线失败:', error);
    res.status(500).json({
      success: false,
      message: '强制用户下线失败',
      error: error.message
    });
  }
});

/**
 * 清理过期的登录日志（管理员功能）
 * DELETE /api/user-login-logs/cleanup
 * 请求体：
 * - days: 保留天数（默认90天）
 */
router.delete('/cleanup', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { days = 90 } = req.body;
    
    const pool = await sql.connect(await getDynamicConfig());
    
    const result = await pool.request()
      .input('Days', sql.Int, days)
      .query(`
        DELETE FROM [UserLoginLogs]
        WHERE LoginTime < DATEADD(DAY, -@Days, GETDATE())
      `);
    
    res.json({
      success: true,
      message: `已清理 ${result.rowsAffected[0]} 条过期登录日志`,
      deletedCount: result.rowsAffected[0]
    });
    
  } catch (error) {
    console.error('清理登录日志失败:', error);
    res.status(500).json({
      success: false,
      message: '清理登录日志失败',
      error: error.message
    });
  }
});

/**
 * 导出登录日志（管理员功能）
 * GET /api/user-login-logs/export
 * 查询参数：与列表查询相同
 */
router.get('/export', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const {
      username,
      loginStatus,
      startDate,
      endDate,
      departmentId,
      format = 'csv'
    } = req.query;

    const pool = await sql.connect(await getDynamicConfig());
    
    // 构建查询条件（与列表查询相同逻辑）
    let whereConditions = [];
    let queryParams = {};
    
    if (username) {
      whereConditions.push('ull.Username LIKE @Username');
      queryParams.Username = `%${username}%`;
    }
    
    if (loginStatus) {
      whereConditions.push('ull.LoginStatus = @LoginStatus');
      queryParams.LoginStatus = loginStatus;
    }
    
    if (startDate) {
      whereConditions.push('ull.LoginTime >= @StartDate');
      queryParams.StartDate = startDate;
    }
    
    if (endDate) {
      whereConditions.push('ull.LoginTime <= @EndDate');
      queryParams.EndDate = endDate;
    }
    
    if (departmentId) {
      whereConditions.push('ull.DepartmentID = @DepartmentID');
      queryParams.DepartmentID = parseInt(departmentId);
    }
    
    const whereClause = whereConditions.length > 0 ? 'WHERE ' + whereConditions.join(' AND ') : '';
    
    const request = pool.request();
    Object.keys(queryParams).forEach(key => {
      if (key.includes('Date')) {
        request.input(key, sql.DateTime2, queryParams[key]);
      } else if (key === 'DepartmentID') {
        request.input(key, sql.Int, queryParams[key]);
      } else {
        request.input(key, sql.NVarChar, queryParams[key]);
      }
    });
    
    const result = await request.query(`
      SELECT 
        ull.ID as '日志ID',
        ull.UserID as '用户ID',
        ull.Username as '用户名',
        ull.RealName as '真实姓名',
        d.DepartmentName as '部门',
        ull.LoginTime as '登录时间',
        ull.LogoutTime as '退出时间',
        ull.IPAddress as 'IP地址',
        ull.Browser as '浏览器',
        ull.OS as '操作系统',
        ull.LoginStatus as '登录状态',
        ull.FailureReason as '失败原因',
        CASE WHEN ull.IsOnline = 1 THEN '是' ELSE '否' END as '是否在线'
      FROM [UserLoginLogs] ull
      LEFT JOIN [Departments] d ON ull.DepartmentID = d.ID
      ${whereClause}
      ORDER BY ull.LoginTime DESC
    `);
    
    if (format === 'csv') {
      // 生成CSV格式
      const csvHeader = Object.keys(result.recordset[0] || {}).join(',');
      const csvRows = result.recordset.map(row => 
        Object.values(row).map(value => 
          value === null ? '' : `"${String(value).replace(/"/g, '""')}"`
        ).join(',')
      );
      const csvContent = [csvHeader, ...csvRows].join('\n');
      
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="login-logs-${new Date().toISOString().split('T')[0]}.csv"`);
      res.send('\uFEFF' + csvContent); // 添加BOM以支持中文
    } else {
      // 返回JSON格式
      res.json({
        success: true,
        data: result.recordset
      });
    }
    
  } catch (error) {
    console.error('导出登录日志失败:', error);
    res.status(500).json({
      success: false,
      message: '导出登录日志失败',
      error: error.message
    });
  }
});

module.exports = router;