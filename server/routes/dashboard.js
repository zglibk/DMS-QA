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
    
    // 获取待处理任务数（状态为pending或in_progress的工作计划）
    const taskCountQuery = `
      SELECT COUNT(*) as count 
      FROM WorkPlans 
      WHERE Status IN ('pending', 'in_progress')
    `;
    const taskCountResult = await executeQuery(async (pool) => {
      let request = pool.request();
      return await request.query(taskCountQuery);
    });
    const taskCount = taskCountResult ? taskCountResult.recordset[0].count : 0;
    
    // 获取质量预警数（包括客诉、内诉和逾期任务）
    const alertCountQuery = `
      SELECT 
        (
          -- 本月客诉数量
          SELECT COUNT(*) 
          FROM ComplaintRegister 
          WHERE ComplaintCategory = N'客诉' 
            AND YEAR(Date) = YEAR(GETDATE()) 
            AND MONTH(Date) = MONTH(GETDATE())
        ) + 
        (
          -- 本月内诉数量
          SELECT COUNT(*) 
          FROM ComplaintRegister 
          WHERE ComplaintCategory = N'内诉' 
            AND YEAR(Date) = YEAR(GETDATE()) 
            AND MONTH(Date) = MONTH(GETDATE())
        ) + 
        (
          -- 逾期未完成的工作计划数量
          SELECT COUNT(*) 
          FROM WorkPlans 
          WHERE Status IN ('pending', 'in_progress') 
            AND EndDate < GETDATE()
        ) as count
    `;
    const alertCountResult = await executeQuery(async (pool) => {
      let request = pool.request();
      return await request.query(alertCountQuery);
    });
    const alertCount = alertCountResult ? alertCountResult.recordset[0].count : 0;

    res.json({
      success: true,
      data: {
        todayLoginCount,
        onlineUserCount,
        totalUsers,
        taskCount, // 待处理任务数（真实数据）
        alertCount // 质量预警数（真实数据）
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

router.get('/statistics', async (req, res) => {
  try {
    const now = new Date();
    const {
      queryMode = 'yearMonth',
      year = now.getFullYear(),
      month = now.getMonth() + 1,
      yearMonth = '',
      startDate = '',
      endDate = ''
    } = req.query;
    const safeQueryMode = queryMode === 'dateRange' ? 'dateRange' : 'yearMonth';
    const parseDateOnly = (value) => {
      const date = new Date(value);
      if (Number.isNaN(date.getTime())) return null;
      return new Date(date.getFullYear(), date.getMonth(), date.getDate());
    };
    const startDateObj = parseDateOnly(startDate);
    const endDateObj = parseDateOnly(endDate);
    const hasValidRangeParams = Boolean(startDateObj && endDateObj && endDateObj >= startDateObj);
    const isDateRangeMode = hasValidRangeParams;
    let yearNum = parseInt(year);
    let monthNum = parseInt(month);
    if (isDateRangeMode && endDateObj) {
      yearNum = endDateObj.getFullYear();
      monthNum = endDateObj.getMonth() + 1;
    } else if (safeQueryMode === 'yearMonth' && yearMonth) {
      const [ymYear, ymMonth] = String(yearMonth).split('-');
      const parsedYear = parseInt(ymYear);
      const parsedMonth = parseInt(ymMonth);
      if (!Number.isNaN(parsedYear)) yearNum = parsedYear;
      if (!Number.isNaN(parsedMonth)) monthNum = parsedMonth;
    }
    if (Number.isNaN(yearNum)) yearNum = now.getFullYear();
    if (Number.isNaN(monthNum) || monthNum < 1 || monthNum > 12) monthNum = now.getMonth() + 1;
    const prevYear = monthNum === 1 ? yearNum - 1 : yearNum;
    const prevMonth = monthNum === 1 ? 12 : monthNum - 1;
    const rangeDays = isDateRangeMode ? Math.floor((endDateObj.getTime() - startDateObj.getTime()) / (24 * 60 * 60 * 1000)) + 1 : 0;
    const prevRangeEndObj = isDateRangeMode ? new Date(startDateObj.getTime() - 24 * 60 * 60 * 1000) : null;
    const prevRangeStartObj = isDateRangeMode ? new Date(prevRangeEndObj.getTime() - (rangeDays - 1) * 24 * 60 * 60 * 1000) : null;
    const formatDateText = (dateObj) => {
      if (!dateObj) return '';
      const year = dateObj.getFullYear();
      const month = String(dateObj.getMonth() + 1).padStart(2, '0');
      const day = String(dateObj.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };
    const startDateText = isDateRangeMode ? formatDateText(startDateObj) : '';
    const endDateText = isDateRangeMode ? formatDateText(endDateObj) : '';
    const prevStartDateText = isDateRangeMode ? formatDateText(prevRangeStartObj) : '';
    const prevEndDateText = isDateRangeMode ? formatDateText(prevRangeEndObj) : '';

    const data = await executeQuery(async (pool) => {
      const queryRows = async (query, params = []) => {
        const request = pool.request();
        params.forEach(param => request.input(param.name, param.value));
        const result = await request.query(query);
        return result.recordset || [];
      };
      const trendsWhereCondition = isDateRangeMode
        ? `
          DATEADD(MONTH, (mbs.StatYear - 1900) * 12 + (mbs.StatMonth - 1), 0) >= DATEADD(MONTH, DATEDIFF(MONTH, 0, CONVERT(date, @startDate)), 0)
          AND DATEADD(MONTH, (mbs.StatYear - 1900) * 12 + (mbs.StatMonth - 1), 0) <= DATEADD(MONTH, DATEDIFF(MONTH, 0, CONVERT(date, @endDate)), 0)
        `
        : `mbs.StatYear = @year`;
      const complaintDateCondition = isDateRangeMode
        ? `CAST(Date AS date) >= CONVERT(date, @startDate) AND CAST(Date AS date) <= CONVERT(date, @endDate)`
        : `YEAR(Date) = @year`;
      const realtimeDateCondition = isDateRangeMode
        ? `CAST(Date AS date) >= CONVERT(date, @startDate) AND CAST(Date AS date) <= CONVERT(date, @endDate)`
        : `YEAR(Date) = @year AND MONTH(Date) <= @month`;
      const currentBatchCondition = isDateRangeMode
        ? `
          DATEADD(MONTH, (StatYear - 1900) * 12 + (StatMonth - 1), 0) >= DATEADD(MONTH, DATEDIFF(MONTH, 0, CONVERT(date, @startDate)), 0)
          AND DATEADD(MONTH, (StatYear - 1900) * 12 + (StatMonth - 1), 0) <= DATEADD(MONTH, DATEDIFF(MONTH, 0, CONVERT(date, @endDate)), 0)
        `
        : `StatYear = @year AND StatMonth = @month`;
      const prevBatchCondition = isDateRangeMode
        ? `
          DATEADD(MONTH, (StatYear - 1900) * 12 + (StatMonth - 1), 0) >= DATEADD(MONTH, DATEDIFF(MONTH, 0, CONVERT(date, @prevStartDate)), 0)
          AND DATEADD(MONTH, (StatYear - 1900) * 12 + (StatMonth - 1), 0) <= DATEADD(MONTH, DATEDIFF(MONTH, 0, CONVERT(date, @prevEndDate)), 0)
        `
        : `StatYear = @year AND StatMonth = @month`;
      const currentComplaintCondition = isDateRangeMode
        ? `CAST(Date AS date) >= CONVERT(date, @startDate) AND CAST(Date AS date) <= CONVERT(date, @endDate)`
        : `YEAR(Date) = @year AND MONTH(Date) = @month`;
      const prevComplaintCondition = isDateRangeMode
        ? `CAST(Date AS date) >= CONVERT(date, @prevStartDate) AND CAST(Date AS date) <= CONVERT(date, @prevEndDate)`
        : `YEAR(Date) = @year AND MONTH(Date) = @month`;

      const trendsQuery = `
        WITH MonthlyData AS (
          SELECT
            mbs.StatYear,
            mbs.StatMonth,
            mbs.InspectionBatches,
            mbs.DeliveryBatches,
            ISNULL((
              SELECT COUNT(*)
              FROM ComplaintRegister cr
              WHERE cr.ComplaintCategory = N'内诉'
                AND YEAR(cr.Date) = mbs.StatYear
                AND MONTH(cr.Date) = mbs.StatMonth
            ), 0) AS InternalComplaints,
            ISNULL((
              SELECT COUNT(*)
              FROM ComplaintRegister cr
              WHERE cr.ComplaintCategory = N'客诉'
                AND YEAR(cr.Date) = mbs.StatYear
                AND MONTH(cr.Date) = mbs.StatMonth
            ), 0) AS CustomerComplaints
          FROM MonthlyBatchStats mbs
          WHERE ${trendsWhereCondition}
        )
        SELECT
          StatYear,
          StatMonth,
          InspectionBatches,
          DeliveryBatches,
          InternalComplaints,
          CustomerComplaints,
          CASE
            WHEN InspectionBatches > 0
              THEN CAST(ROUND((InspectionBatches - InternalComplaints) * 100.0 / InspectionBatches, 2) AS decimal(5,2))
            ELSE 0
          END AS FirstPassRate,
          CASE
            WHEN DeliveryBatches > 0
              THEN CAST(ROUND((DeliveryBatches - CustomerComplaints) * 100.0 / DeliveryBatches, 2) AS decimal(5,2))
            ELSE 0
          END AS DeliveryPassRate,
          RIGHT(CAST(StatYear AS nvarchar(4)), 2) + N'年' + CAST(StatMonth AS nvarchar(2)) + N'月' AS MonthLabel
        FROM MonthlyData
        ORDER BY StatYear, StatMonth
      `;

      const monthlyComplaintsQuery = `
        SELECT
          YEAR(cr.Date) AS StatYear,
          MONTH(cr.Date) AS StatMonth,
          SUM(CASE WHEN cr.ComplaintCategory = N'内诉' THEN 1 ELSE 0 END) AS InternalComplaints,
          SUM(CASE WHEN cr.ComplaintCategory = N'客诉' THEN 1 ELSE 0 END) AS CustomerComplaints
        FROM ComplaintRegister cr
        WHERE ${complaintDateCondition}
        GROUP BY YEAR(cr.Date), MONTH(cr.Date)
        ORDER BY YEAR(cr.Date), MONTH(cr.Date)
      `;

      const customerWarningTop5Query = `
        SELECT TOP 5
          Customer,
          COUNT(*) AS ComplaintCount
        FROM ComplaintRegister
        WHERE ${complaintDateCondition}
          AND Customer IS NOT NULL
          AND Customer != ''
        GROUP BY Customer
        ORDER BY ComplaintCount DESC
      `;

      const defectiveCategoriesQuery = `
        SELECT
          ComplaintCategory,
          DefectiveCategory,
          COUNT(*) AS DefectCount
        FROM ComplaintRegister
        WHERE ${complaintDateCondition}
          AND DefectiveCategory IS NOT NULL
          AND DefectiveCategory != ''
        GROUP BY ComplaintCategory, DefectiveCategory
        ORDER BY ComplaintCategory, DefectCount DESC
      `;

      const departmentQueryByField = (field) => `
        SELECT
          ${field} AS Department,
          COUNT(*) AS IssueCount
        FROM ComplaintRegister
        WHERE ${complaintDateCondition}
          AND ${field} IS NOT NULL
          AND ${field} != ''
        GROUP BY ${field}
        ORDER BY IssueCount DESC
      `;

      const realtimeIssuesQuery = `
        SELECT TOP 10
          Date,
          DefectiveDescription,
          Workshop,
          MainPerson
        FROM ComplaintRegister
        WHERE ${realtimeDateCondition}
        ORDER BY Date DESC, ID DESC
      `;

      const currentBatchQuery = `
        SELECT
          ISNULL(SUM(InspectionBatches), 0) AS InspectionBatches,
          ISNULL(SUM(DeliveryBatches), 0) AS DeliveryBatches
        FROM MonthlyBatchStats
        WHERE ${currentBatchCondition}
      `;

      const prevBatchQuery = `
        SELECT
          ISNULL(SUM(InspectionBatches), 0) AS InspectionBatches,
          ISNULL(SUM(DeliveryBatches), 0) AS DeliveryBatches
        FROM MonthlyBatchStats
        WHERE ${prevBatchCondition}
      `;

      const currentComplaintQuery = `
        SELECT
          SUM(CASE WHEN ComplaintCategory = N'内诉' THEN 1 ELSE 0 END) AS InternalComplaints,
          SUM(CASE WHEN ComplaintCategory = N'客诉' THEN 1 ELSE 0 END) AS CustomerComplaints,
          SUM(ISNULL(TotalCost, 0)) AS TotalCostAmount,
          SUM(CASE WHEN Disposition IS NULL OR LTRIM(RTRIM(Disposition)) = '' THEN 1 ELSE 0 END) AS PendingIssueCount
        FROM ComplaintRegister
        WHERE ${currentComplaintCondition}
      `;

      const prevComplaintQuery = `
        SELECT
          SUM(CASE WHEN ComplaintCategory = N'内诉' THEN 1 ELSE 0 END) AS InternalComplaints,
          SUM(CASE WHEN ComplaintCategory = N'客诉' THEN 1 ELSE 0 END) AS CustomerComplaints,
          SUM(ISNULL(TotalCost, 0)) AS TotalCostAmount,
          SUM(CASE WHEN Disposition IS NULL OR LTRIM(RTRIM(Disposition)) = '' THEN 1 ELSE 0 END) AS PendingIssueCount
        FROM ComplaintRegister
        WHERE ${prevComplaintCondition}
      `;

      const siteConfigQuery = `
        SELECT TOP 1 ConfigValue
        FROM SiteConfig
        WHERE ConfigKey = 'companyName'
      `;

      const currentRangeParams = isDateRangeMode
        ? [
            { name: 'startDate', value: startDateText },
            { name: 'endDate', value: endDateText }
          ]
        : [
            { name: 'year', value: yearNum },
            { name: 'month', value: monthNum }
          ];
      const previousRangeParams = isDateRangeMode
        ? [
            { name: 'prevStartDate', value: prevStartDateText },
            { name: 'prevEndDate', value: prevEndDateText }
          ]
        : [
            { name: 'year', value: prevYear },
            { name: 'month', value: prevMonth }
          ];

      const trends = await queryRows(
        trendsQuery,
        isDateRangeMode
          ? [
              { name: 'startDate', value: startDateText },
              { name: 'endDate', value: endDateText }
            ]
          : [{ name: 'year', value: yearNum }]
      );
      const monthlyComplaints = await queryRows(monthlyComplaintsQuery, currentRangeParams);
      const customerWarningTop5 = await queryRows(customerWarningTop5Query, currentRangeParams);
      const defectiveRows = await queryRows(defectiveCategoriesQuery, currentRangeParams);
      const departmentMain = await queryRows(departmentQueryByField('MainDept'), currentRangeParams);
      const departmentWorkshop = await queryRows(departmentQueryByField('Workshop'), currentRangeParams);
      const realtimeIssues = await queryRows(realtimeIssuesQuery, currentRangeParams);

      const currentBatchRows = await queryRows(
        currentBatchQuery,
        isDateRangeMode
          ? [
              { name: 'startDate', value: startDateText },
              { name: 'endDate', value: endDateText }
            ]
          : [
              { name: 'year', value: yearNum },
              { name: 'month', value: monthNum }
            ]
      );
      const prevBatchRows = await queryRows(
        prevBatchQuery,
        isDateRangeMode
          ? [
              { name: 'prevStartDate', value: prevStartDateText },
              { name: 'prevEndDate', value: prevEndDateText }
            ]
          : [
              { name: 'year', value: prevYear },
              { name: 'month', value: prevMonth }
            ]
      );
      const currentComplaintRows = await queryRows(currentComplaintQuery, currentRangeParams);
      const prevComplaintRows = await queryRows(prevComplaintQuery, previousRangeParams);
      const siteConfigRows = await queryRows(siteConfigQuery);

      const defectiveCategories = { internal: [], external: [] };
      defectiveRows.forEach(row => {
        const item = { name: row.DefectiveCategory, value: row.DefectCount };
        if (row.ComplaintCategory === '内诉') defectiveCategories.internal.push(item);
        if (row.ComplaintCategory === '客诉') defectiveCategories.external.push(item);
      });

      const currentBatch = currentBatchRows[0] || {};
      const prevBatch = prevBatchRows[0] || {};
      const currentComplaint = currentComplaintRows[0] || {};
      const prevComplaint = prevComplaintRows[0] || {};

      const calcRate = (baseVal, complaintVal) => {
        const base = Number(baseVal) || 0;
        const complaint = Number(complaintVal) || 0;
        if (base <= 0) return 0;
        return Number((((base - complaint) / base) * 100).toFixed(2));
      };

      const calcTrend = (currentVal, prevVal) => {
        const current = Number(currentVal) || 0;
        const previous = Number(prevVal) || 0;
        if (previous === 0) return current === 0 ? 0 : 100;
        return Number((((current - previous) / previous) * 100).toFixed(1));
      };

      const currentFirstPassRate = calcRate(currentBatch.InspectionBatches, currentComplaint.InternalComplaints);
      const prevFirstPassRate = calcRate(prevBatch.InspectionBatches, prevComplaint.InternalComplaints);
      const currentTotalCost = Number(currentComplaint.TotalCostAmount) || 0;
      const prevTotalCost = Number(prevComplaint.TotalCostAmount) || 0;
      const currentPendingIssueCount = Number(currentComplaint.PendingIssueCount) || 0;
      const prevPendingIssueCount = Number(prevComplaint.PendingIssueCount) || 0;

      return {
        period: {
          year: yearNum,
          month: monthNum,
          queryMode: safeQueryMode,
          yearMonth: yearMonth || null,
          startDate: startDateText || null,
          endDate: endDateText || null
        },
        siteConfig: {
          companyName: (siteConfigRows[0] && siteConfigRows[0].ConfigValue) || 'DMS质量管理系统'
        },
        kpi: {
          year: yearNum,
          month: monthNum,
          qualityTargetAchievementRate: currentFirstPassRate,
          qualityTargetAchievementTrend: calcTrend(currentFirstPassRate, prevFirstPassRate),
          monthlyQualityLossAmount: Number(currentTotalCost.toFixed(2)),
          monthlyQualityLossTrend: calcTrend(currentTotalCost, prevTotalCost),
          incomingInspectionPassRate: currentFirstPassRate,
          incomingInspectionPassTrend: calcTrend(currentFirstPassRate, prevFirstPassRate),
          pendingIssueCount: currentPendingIssueCount,
          pendingIssueTrend: calcTrend(currentPendingIssueCount, prevPendingIssueCount)
        },
        trendRows: trends,
        monthlyComplaints,
        customerWarningTop5,
        defectiveCategories,
        departmentResponsibility: {
          main: departmentMain,
          workshop: departmentWorkshop
        },
        realtimeIssues
      };
    });

    res.json({
      success: true,
      data,
      message: '看板聚合统计数据获取成功'
    });
  } catch (error) {
    console.error('获取看板聚合统计数据失败:', error);
    res.status(500).json({
      success: false,
      message: '获取看板聚合统计数据失败',
      error: error.message
    });
  }
});

module.exports = router;
