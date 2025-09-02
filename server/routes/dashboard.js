/**
 * 仪表板相关API路由
 * 
 * 功能说明：
 * 1. 获取登录日志数据
 * 2. 获取在线用户数据
 * 3. 获取系统统计数据
 */

const express = require('express');
const router = express.Router();
const { executeQuery } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

/**
 * 获取登录日志列表
 * GET /api/dashboard/login-logs
 */
router.get('/login-logs', authenticateToken, async (req, res) => {
  try {
    const { page = 1, pageSize = 10, status, username, startDate, endDate } = req.query;
    const offset = (page - 1) * pageSize;
    
    // 构建查询条件
    let whereConditions = [];
    let queryParams = [];
    
    if (status) {
      whereConditions.push('ul.IsOnline = @param' + queryParams.length);
      queryParams.push(status === 'online' ? 1 : 0);
    }
    
    if (username) {
      whereConditions.push('ul.Username LIKE @param' + queryParams.length);
      queryParams.push(`%${username}%`);
    }
    
    if (startDate) {
      whereConditions.push('ul.LoginTime >= @param' + queryParams.length);
      queryParams.push(startDate);
    }
    
    if (endDate) {
      whereConditions.push('ul.LoginTime <= @param' + queryParams.length);
      queryParams.push(endDate);
    }
    
    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
    
    // 查询总数
    const countQuery = `
      SELECT COUNT(*) as total 
      FROM UserLoginLogs 
      ${whereClause}
    `;
    
    const countResult = await executeQuery(async (pool) => {
      let request = pool.request();
      queryParams.forEach((param, index) => {
        request.input(`param${index}`, param);
      });
      return await request.query(countQuery);
    });
    const total = countResult ? countResult.recordset[0].total : 0;
    
    // 查询数据 - 使用ROW_NUMBER()进行分页，兼容SQL Server 2008R2
    const dataQuery = `
      SELECT * FROM (
        SELECT 
            ul.ID,
            ul.UserID,
            ul.Username,
            ul.RealName,
            ul.DepartmentID,
            ISNULL(d.Name, '') as DepartmentName,
            ul.LoginTime,
            ul.LogoutTime,
            ul.IsOnline,
            ul.IPAddress,
            ul.UserAgent,
            ul.Browser,
            ul.OS as OperatingSystem,
            ul.LoginStatus,
            ul.CreatedAt,
            ROW_NUMBER() OVER (ORDER BY ul.LoginTime DESC) AS RowNum
         FROM UserLoginLogs ul
          LEFT JOIN Department d ON ul.DepartmentID = d.ID
         ${whereClause}
      ) AS T
      WHERE T.RowNum BETWEEN (@offset + 1) AND (@offset + @pageSize)
      ORDER BY T.RowNum
    `;
    
    const dataResult = await executeQuery(async (pool) => {
      let request = pool.request();
      queryParams.forEach((param, index) => {
        request.input(`param${index}`, param);
      });
      request.input('pageSize', parseInt(pageSize));
      request.input('offset', offset);
      return await request.query(dataQuery);
    });
    const rows = dataResult ? dataResult.recordset : [];
    
    // 格式化数据
    const formattedData = rows.map(row => ({
      id: row.ID,
      userId: row.UserID,
      username: row.Username,
      realName: row.RealName,
      departmentId: row.DepartmentID,
      loginTime: row.LoginTime,
      logoutTime: row.LogoutTime,
      isOnline: row.IsOnline === 1,
      ipAddress: row.IPAddress,
      userAgent: row.UserAgent,
      browser: row.Browser,
      operatingSystem: row.OperatingSystem,
      loginStatus: row.LoginStatus,
      status: row.IsOnline === 1 ? 'online' : 'offline',
      departmentName: row.DepartmentName,
      createdAt: row.CreatedAt
    }));
    
    res.json({
      success: true,
      data: {
        list: formattedData,
        total,
        page: parseInt(page),
        pageSize: parseInt(pageSize),
        totalPages: Math.ceil(total / pageSize)
      },
      message: '获取登录日志成功'
    });
    
  } catch (error) {
    console.error('获取登录日志失败:', error);
    res.status(500).json({
      success: false,
      message: '获取登录日志失败',
      error: error.message
    });
  }
});

/**
 * 获取在线用户列表
 * GET /api/dashboard/online-users
 */
router.get('/online-users', authenticateToken, async (req, res) => {
  try {
    const { page = 1, pageSize = 20 } = req.query;
    const offset = (page - 1) * pageSize;
    
    // 查询当前在线用户
    const query = `
      SELECT * FROM (
        SELECT 
            ul.ID,
            ul.UserID,
            ul.Username,
            ul.RealName,
            ul.DepartmentID,
            ISNULL(d.Name, '') as DepartmentName,
            ul.LoginTime,
            ul.IPAddress,
            ul.Browser,
            ul.OS as OperatingSystem,
            ul.CreatedAt,
            ROW_NUMBER() OVER (ORDER BY ul.LoginTime DESC) AS RowNum
         FROM UserLoginLogs ul
          LEFT JOIN Department d ON ul.DepartmentID = d.ID
         WHERE ul.IsOnline = 1
      ) AS T
      WHERE T.RowNum BETWEEN (@offset + 1) AND (@offset + @pageSize)
      ORDER BY T.RowNum
    `;
    
    const dataResult = await executeQuery(async (pool) => {
      let request = pool.request();
      request.input('pageSize', parseInt(pageSize));
      request.input('offset', offset);
      return await request.query(query);
    });
    const rows = dataResult ? dataResult.recordset : [];
    
    // 查询总数
    const countQuery = 'SELECT COUNT(*) as total FROM UserLoginLogs WHERE IsOnline = 1';
    const countResult = await executeQuery(async (pool) => {
      let request = pool.request();
      return await request.query(countQuery);
    });
    const total = countResult ? countResult.recordset[0].total : 0;
    
    // 格式化数据
    const formattedData = rows.map(row => ({
      id: row.ID,
      userId: row.UserID,
      username: row.Username,
      realName: row.RealName,
      departmentId: row.DepartmentID,
      loginTime: row.LoginTime,
      ipAddress: row.IPAddress,
      browser: row.Browser,
      operatingSystem: row.OperatingSystem,

      role: '用户', // 默认角色，可以后续关联用户表获取真实角色
      status: 'online',
      createdAt: row.CreatedAt
    }));
    
    res.json({
      success: true,
      data: {
        list: formattedData,
        total,
        page: parseInt(page),
        pageSize: parseInt(pageSize),
        totalPages: Math.ceil(total / pageSize)
      },
      message: '获取在线用户成功'
    });
    
  } catch (error) {
    console.error('获取在线用户失败:', error);
    res.status(500).json({
      success: false,
      message: '获取在线用户失败',
      error: error.message
    });
  }
});

/**
 * 获取仪表板统计数据
 * GET /api/dashboard/stats
 */
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    const today = new Date();
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);
    
    // 今日登录次数
    const loginCountQuery = `
      SELECT COUNT(*) as count 
      FROM UserLoginLogs 
      WHERE LoginTime >= @todayStart AND LoginTime < @todayEnd
    `;
    const loginCountResult = await executeQuery(async (pool) => {
      let request = pool.request();
      request.input('todayStart', todayStart);
      request.input('todayEnd', todayEnd);
      return await request.query(loginCountQuery);
    });
    const todayLoginCount = loginCountResult ? loginCountResult.recordset[0].count : 0;
    
    // 当前在线用户数
    const onlineCountQuery = 'SELECT COUNT(*) as count FROM UserLoginLogs WHERE IsOnline = 1';
    const onlineCountResult = await executeQuery(async (pool) => {
      let request = pool.request();
      return await request.query(onlineCountQuery);
    });
    const onlineUserCount = onlineCountResult ? onlineCountResult.recordset[0].count : 0;
    
    // 总用户数（从用户表获取，如果没有用户表则从登录日志去重获取）
    const totalUsersQuery = 'SELECT COUNT(DISTINCT Username) as count FROM UserLoginLogs';
    const totalUsersResult = await executeQuery(async (pool) => {
      let request = pool.request();
      return await request.query(totalUsersQuery);
    });
    const totalUsers = totalUsersResult ? totalUsersResult.recordset[0].count : 0;
    
    res.json({
      success: true,
      data: {
        todayLoginCount,
        onlineUserCount,
        totalUsers,
        taskCount: 0, // 待处理任务数，需要根据实际业务逻辑实现
        alertCount: 0 // 质量预警数，需要根据实际业务逻辑实现
      },
      message: '获取统计数据成功'
    });
    
  } catch (error) {
    console.error('获取统计数据失败:', error);
    res.status(500).json({
      success: false,
      message: '获取统计数据失败',
      error: error.message
    });
  }
});

module.exports = router;