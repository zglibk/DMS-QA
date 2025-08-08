/**
 * 工作计划管理系统 - 控制器
 * 功能：处理工作计划相关的业务逻辑
 * 版本：v1.0
 * 创建日期：2025-08-05
 */

const sql = require('mssql');
const { poolPromise } = require('../config/database');
const ExcelJS = require('exceljs');
const moment = require('moment');

// =====================================================
// 工作台相关控制器
// =====================================================

/**
 * 获取工作台概览数据
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
const getDashboardData = async (req, res) => {
    try {
        const pool = await poolPromise;
        const userId = req.user?.id || 1; // 临时使用默认用户ID
        const { timeRange } = req.query; // 获取时间范围参数
        
        // 根据时间范围构建计划统计的日期条件
        let dateCondition = '';
        if (timeRange) {
            switch (timeRange) {
                case 'today':
                    dateCondition = 'AND (CAST(wp.CreatedAt as DATE) = CAST(GETDATE() as DATE) OR CAST(wp.UpdatedAt as DATE) = CAST(GETDATE() as DATE) OR CAST(wp.StartDate as DATE) <= CAST(GETDATE() as DATE) AND CAST(wp.EndDate as DATE) >= CAST(GETDATE() as DATE))';
                    break;
                case 'week':
                    dateCondition = 'AND (wp.CreatedAt >= DATEADD(week, -1, GETDATE()) OR wp.UpdatedAt >= DATEADD(week, -1, GETDATE()) OR (wp.StartDate <= GETDATE() AND wp.EndDate >= DATEADD(week, -1, GETDATE())))';
                    break;
                case 'month':
                    dateCondition = 'AND (wp.CreatedAt >= DATEADD(month, -1, GETDATE()) OR wp.UpdatedAt >= DATEADD(month, -1, GETDATE()) OR (wp.StartDate <= GETDATE() AND wp.EndDate >= DATEADD(month, -1, GETDATE())))';
                    break;
                case 'quarter':
                    dateCondition = 'AND (wp.CreatedAt >= DATEADD(quarter, -1, GETDATE()) OR wp.UpdatedAt >= DATEADD(quarter, -1, GETDATE()) OR (wp.StartDate <= GETDATE() AND wp.EndDate >= DATEADD(quarter, -1, GETDATE())))';
                    break;
                case 'year':
                    dateCondition = 'AND (wp.CreatedAt >= DATEADD(year, -1, GETDATE()) OR wp.UpdatedAt >= DATEADD(year, -1, GETDATE()) OR (wp.StartDate <= GETDATE() AND wp.EndDate >= DATEADD(year, -1, GETDATE())))';
                    break;
            }
        }
        
        // 获取计划统计数据
        const planStatsQuery = `
            SELECT 
                COUNT(*) as totalPlans,
                SUM(CASE WHEN wp.Status = 'pending' THEN 1 ELSE 0 END) as pendingPlans,
                SUM(CASE WHEN wp.Status = 'in_progress' THEN 1 ELSE 0 END) as inProgressPlans,
                SUM(CASE WHEN wp.Status = 'completed' THEN 1 ELSE 0 END) as completedPlans,
                SUM(CASE WHEN wp.Status IN ('pending', 'in_progress') AND wp.EndDate < GETDATE() THEN 1 ELSE 0 END) as overduePlans,
                ISNULL(AVG(CAST(wp.Progress as FLOAT)), 0) as avgProgress
            FROM WorkPlans wp
            WHERE wp.AssignedTo = @userId ${dateCondition}
        `;
        
        const planStatsResult = await pool.request()
            .input('userId', sql.Int, userId)
            .query(planStatsQuery);
        
        // 获取工作日志数量（根据时间范围）
        let logDateCondition = '';
        if (timeRange) {
            switch (timeRange) {
                case 'today':
                    logDateCondition = 'AND CAST(wl.LogDate as DATE) = CAST(GETDATE() as DATE)';
                    break;
                case 'week':
                    logDateCondition = 'AND wl.LogDate >= DATEADD(week, -1, GETDATE())';
                    break;
                case 'month':
                    logDateCondition = 'AND wl.LogDate >= DATEADD(month, -1, GETDATE())';
                    break;
                case 'quarter':
                    logDateCondition = 'AND wl.LogDate >= DATEADD(quarter, -1, GETDATE())';
                    break;
                case 'year':
                    logDateCondition = 'AND wl.LogDate >= DATEADD(year, -1, GETDATE())';
                    break;
                default:
                    logDateCondition = 'AND CAST(wl.LogDate as DATE) = CAST(GETDATE() as DATE)';
            }
        } else {
            logDateCondition = 'AND CAST(wl.LogDate as DATE) = CAST(GETDATE() as DATE)';
        }
        
        const logsQuery = `
            SELECT COUNT(*) as logs
            FROM WorkLogs wl
            WHERE wl.UserID = @userId ${logDateCondition}
        `;
        
        const logsResult = await pool.request()
            .input('userId', sql.Int, userId)
            .query(logsQuery);
        
        // 获取即将到期的计划（7天内）
        const upcomingPlansQuery = `
            SELECT COUNT(*) as upcomingPlans
            FROM WorkPlans wp
            WHERE wp.AssignedTo = @userId 
              AND wp.Status IN ('pending', 'in_progress')
              AND wp.EndDate BETWEEN GETDATE() AND DATEADD(day, 7, GETDATE())
              ${dateCondition}
        `;
        
        const upcomingPlansResult = await pool.request()
            .input('userId', sql.Int, userId)
            .query(upcomingPlansQuery);
        
        // 根据时间范围计算完成率
        let completionDateCondition = '';
        if (timeRange) {
            switch (timeRange) {
                case 'today':
                    completionDateCondition = 'AND (CAST(wp.CreatedAt as DATE) = CAST(GETDATE() as DATE) OR CAST(wp.UpdatedAt as DATE) = CAST(GETDATE() as DATE) OR (wp.StartDate <= GETDATE() AND wp.EndDate >= CAST(GETDATE() as DATE)))';
                    break;
                case 'week':
                    completionDateCondition = 'AND (wp.CreatedAt >= DATEADD(week, -1, GETDATE()) OR wp.UpdatedAt >= DATEADD(week, -1, GETDATE()) OR (wp.StartDate <= GETDATE() AND wp.EndDate >= DATEADD(week, -1, GETDATE())))';
                    break;
                case 'month':
                    completionDateCondition = 'AND (wp.CreatedAt >= DATEADD(month, -1, GETDATE()) OR wp.UpdatedAt >= DATEADD(month, -1, GETDATE()) OR (wp.StartDate <= GETDATE() AND wp.EndDate >= DATEADD(month, -1, GETDATE())))';
                    break;
                case 'quarter':
                    completionDateCondition = 'AND (wp.CreatedAt >= DATEADD(quarter, -1, GETDATE()) OR wp.UpdatedAt >= DATEADD(quarter, -1, GETDATE()) OR (wp.StartDate <= GETDATE() AND wp.EndDate >= DATEADD(quarter, -1, GETDATE())))';
                    break;
                case 'year':
                    completionDateCondition = 'AND (wp.CreatedAt >= DATEADD(year, -1, GETDATE()) OR wp.UpdatedAt >= DATEADD(year, -1, GETDATE()) OR (wp.StartDate <= GETDATE() AND wp.EndDate >= DATEADD(year, -1, GETDATE())))';
                    break;
                default:
                    // 默认使用周范围
                    completionDateCondition = 'AND (wp.CreatedAt >= DATEADD(week, -1, GETDATE()) OR wp.UpdatedAt >= DATEADD(week, -1, GETDATE()) OR (wp.StartDate <= GETDATE() AND wp.EndDate >= DATEADD(week, -1, GETDATE())))';
            }
        } else {
            // 如果没有指定时间范围，默认使用周范围
            completionDateCondition = 'AND (wp.CreatedAt >= DATEADD(week, -1, GETDATE()) OR wp.UpdatedAt >= DATEADD(week, -1, GETDATE()) OR (wp.StartDate <= GETDATE() AND wp.EndDate >= DATEADD(week, -1, GETDATE())))';
        }
        
        const completionQuery = `
            SELECT 
                COUNT(*) as totalPlans,
                SUM(CASE WHEN wp.Status = 'completed' THEN 1 ELSE 0 END) as completedPlans
            FROM WorkPlans wp
            WHERE wp.AssignedTo = @userId ${completionDateCondition}
        `;
        
        const completionResult = await pool.request()
            .input('userId', sql.Int, userId)
            .query(completionQuery);
        
        // 计算任务效率（基于计划完成时间与实际完成时间的比较）
        // 根据时间范围构建任务效率查询的日期条件
        let efficiencyDateCondition = '';
        if (timeRange) {
            switch (timeRange) {
                case 'today':
                    efficiencyDateCondition = 'AND (CAST(wp.CreatedAt as DATE) = CAST(GETDATE() as DATE) OR CAST(wp.UpdatedAt as DATE) = CAST(GETDATE() as DATE) OR CAST(wp.CompletedAt as DATE) = CAST(GETDATE() as DATE))';
                    break;
                case 'week':
                    efficiencyDateCondition = 'AND (wp.CreatedAt >= DATEADD(week, -1, GETDATE()) OR wp.UpdatedAt >= DATEADD(week, -1, GETDATE()) OR wp.CompletedAt >= DATEADD(week, -1, GETDATE()))';
                    break;
                case 'month':
                    efficiencyDateCondition = 'AND (wp.CreatedAt >= DATEADD(month, -1, GETDATE()) OR wp.UpdatedAt >= DATEADD(month, -1, GETDATE()) OR wp.CompletedAt >= DATEADD(month, -1, GETDATE()))';
                    break;
                case 'quarter':
                    efficiencyDateCondition = 'AND (wp.CreatedAt >= DATEADD(quarter, -1, GETDATE()) OR wp.UpdatedAt >= DATEADD(quarter, -1, GETDATE()) OR wp.CompletedAt >= DATEADD(quarter, -1, GETDATE()))';
                    break;
                case 'year':
                    efficiencyDateCondition = 'AND (wp.CreatedAt >= DATEADD(year, -1, GETDATE()) OR wp.UpdatedAt >= DATEADD(year, -1, GETDATE()) OR wp.CompletedAt >= DATEADD(year, -1, GETDATE()))';
                    break;
                default:
                    efficiencyDateCondition = 'AND wp.CreatedAt >= DATEADD(month, -3, GETDATE())'; // 默认最近3个月
            }
        } else {
            efficiencyDateCondition = 'AND wp.CreatedAt >= DATEADD(month, -3, GETDATE())'; // 默认最近3个月
        }
        
        const taskEfficiencyQuery = `
            SELECT 
                COUNT(*) as totalCompletedPlans,
                SUM(CASE 
                    WHEN wp.Status = 'completed' AND wp.CompletedAt <= wp.EndDate THEN 1 
                    ELSE 0 
                END) as onTimeCompletedPlans,
                AVG(CASE 
                     WHEN wp.Status = 'completed' AND wp.CompletedAt IS NOT NULL AND wp.EndDate IS NOT NULL
                     THEN 
                         CASE 
                             WHEN wp.CompletedAt <= wp.EndDate THEN 100
                             ELSE CASE 
                                 WHEN (100 - DATEDIFF(day, wp.EndDate, wp.CompletedAt) * 10) < 0 THEN 0
                                 ELSE (100 - DATEDIFF(day, wp.EndDate, wp.CompletedAt) * 10)
                             END
                         END
                     ELSE wp.Progress
                 END) as avgEfficiency
            FROM WorkPlans wp
            WHERE wp.AssignedTo = @userId ${efficiencyDateCondition}
        `;
        
        const taskEfficiencyResult = await pool.request()
            .input('userId', sql.Int, userId)
            .query(taskEfficiencyQuery);
        
        // 计算完成率百分比
        const completionData = completionResult.recordset[0];
        const completionRate = completionData?.totalPlans > 0 
            ? Math.round((completionData.completedPlans / completionData.totalPlans) * 100)
            : 0;
        
        // 计算任务效率百分比
        const efficiencyData = taskEfficiencyResult.recordset[0];
        const taskEfficiency = efficiencyData?.avgEfficiency 
            ? Math.round(efficiencyData.avgEfficiency)
            : 0;
        
        // 组装仪表盘数据
        const dashboardData = {
            planStats: planStatsResult.recordset[0] || {
                totalPlans: 0,
                pendingPlans: 0,
                inProgressPlans: 0,
                completedPlans: 0,
                overduePlans: 0,
                avgProgress: 0
            },
            todayLogs: logsResult.recordset[0]?.logs || 0,
            upcomingPlans: upcomingPlansResult.recordset[0]?.upcomingPlans || 0,
            completionRate: completionRate, // 完成率（根据时间范围动态计算）
            taskEfficiency: taskEfficiency, // 任务效率
            unreadReminders: 0, // 暂时设为0，等提醒功能完善后再实现
            timeRange: timeRange || 'all' // 返回当前使用的时间范围
        };
        
        res.json({
            success: true,
            data: dashboardData,
            message: '工作台数据获取成功'
        });
        

        
    } catch (error) {
        console.error('获取工作台数据失败:', error);
        res.status(500).json({
            success: false,
            message: '获取工作台数据失败',
            error: error.message
        });
    }
};

/**
 * 获取待办事项列表
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
const getTodoList = async (req, res) => {
    try {
        const pool = await poolPromise;
        const userId = req.user?.id || 1; // 临时使用默认用户ID
        const { limit = 10, timeRange } = req.query;
        
        // 待办事项不受时间范围限制，显示所有未开始或未完成的任务
        let dateCondition = '';
        
        // 查询待办事项（未完成的工作计划）
        const todoQuery = `
            SELECT TOP (@limit)
                wp.ID,
                wp.PlanName as Title,
                wp.Priority,
                wp.EndDate,
                wp.Progress,
                wp.Status,
                wp.AssignedTo,
                ISNULL(wt.TypeName, '常规任务') as WorkTypeName,
                DATEDIFF(day, GETDATE(), wp.EndDate) as DaysRemaining
            FROM WorkPlans wp
            LEFT JOIN WorkTypes wt ON wp.WorkTypeID = wt.ID
            WHERE wp.Status IN ('pending', 'in_progress')
              ${dateCondition}
            ORDER BY 
                CASE wp.Priority 
                    WHEN 'high' THEN 1 
                    WHEN 'medium' THEN 2 
                    WHEN 'low' THEN 3 
                    ELSE 4 
                END,
                wp.EndDate ASC
        `;
        
        const result = await pool.request()
            .input('userId', sql.Int, userId)
            .input('limit', sql.Int, parseInt(limit))
            .query(todoQuery);
        
        res.json({
            success: true,
            data: result.recordset,
            message: '待办事项获取成功'
        });
        
    } catch (error) {
        console.error('获取待办事项失败:', error);
        res.status(500).json({
            success: false,
            message: '获取待办事项失败',
            error: error.message
        });
    }
};

/**
 * 获取最近工作日志
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
const getRecentLogs = async (req, res) => {
    try {
        const pool = await poolPromise;
        const userId = req.user?.id || 1; // 临时使用默认用户ID
        const { limit = 10, timeRange } = req.query;
        
        // 根据时间范围构建日期条件
        let dateCondition = '';
        if (timeRange) {
            switch (timeRange) {
                case 'today':
                    dateCondition = 'AND CAST(wl.LogDate as DATE) = CAST(GETDATE() as DATE)';
                    break;
                case 'week':
                    dateCondition = 'AND wl.LogDate >= DATEADD(week, -1, GETDATE())';
                    break;
                case 'month':
                    dateCondition = 'AND wl.LogDate >= DATEADD(month, -1, GETDATE())';
                    break;
                case 'quarter':
                    dateCondition = 'AND wl.LogDate >= DATEADD(quarter, -1, GETDATE())';
                    break;
                case 'year':
                    dateCondition = 'AND wl.LogDate >= DATEADD(year, -1, GETDATE())';
                    break;
            }
        }
        
        // 查询最近的工作日志
        const logsQuery = `
            SELECT TOP (@limit)
                wl.ID,
                wl.LogDate,
                wl.WorkHours,
                wl.WorkContent as Content,
                wl.Issues,
                wp.PlanName as PlanTitle
            FROM WorkLogs wl
            LEFT JOIN WorkPlans wp ON wl.PlanID = wp.ID
            WHERE wl.UserID = @userId ${dateCondition}
            ORDER BY wl.LogDate DESC, wl.CreatedAt DESC
        `;
        
        const result = await pool.request()
            .input('userId', sql.Int, userId)
            .input('limit', sql.Int, parseInt(limit))
            .query(logsQuery);
        
        // 格式化日期
        const logs = result.recordset.map(log => ({
            ...log,
            LogDate: log.LogDate ? new Date(log.LogDate).toISOString().split('T')[0] : null
        }));
        
        res.json({
            success: true,
            data: logs,
            message: '最近工作日志获取成功'
        });
        
    } catch (error) {
        console.error('获取最近工作日志失败:', error);
        res.status(500).json({
            success: false,
            message: '获取最近工作日志失败',
            error: error.message
        });
    }
};

// =====================================================
// 工作计划相关控制器
// =====================================================

/**
 * 获取工作计划列表（支持分页、筛选、搜索）
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
const getPlanList = async (req, res) => {
    try {
        const pool = await poolPromise;
        const {
            page = 1,
            pageSize = 20,
            status,
            priority,
            assigneeId,
            keyword,
            startDate,
            endDate,
            workTypeId
        } = req.query;
        
        const offset = (page - 1) * pageSize;
        
        // 构建查询条件
        let whereConditions = [];
        const params = {};
        
        if (status) {
            if (status.includes(',')) {
                // 处理多个状态值
                const statusList = status.split(',').map(s => s.trim());
                const statusPlaceholders = statusList.map((_, index) => `@status${index}`).join(',');
                whereConditions.push(`wp.Status IN (${statusPlaceholders})`);
                statusList.forEach((statusValue, index) => {
                    params[`status${index}`] = statusValue;
                });
            } else {
                // 处理单个状态值
                whereConditions.push('wp.Status = @status');
                params.status = status;
            }
        }
        
        if (priority) {
            whereConditions.push('wp.Priority = @priority');
            params.priority = priority;
        }
        
        if (assigneeId) {
            whereConditions.push('wp.AssignedTo = @assigneeId');
            params.assigneeId = parseInt(assigneeId);
        }
        
        if (workTypeId) {
            whereConditions.push('wp.WorkTypeID = @workTypeId');
            params.workTypeId = parseInt(workTypeId);
        }
        
        if (keyword) {
            whereConditions.push('(wp.PlanName LIKE @keyword OR wp.Description LIKE @keyword)');
            params.keyword = `%${keyword}%`;
        }
        
        if (startDate) {
            whereConditions.push('wp.StartDate >= @startDate');
            params.startDate = startDate;
        }
        
        if (endDate) {
            whereConditions.push('wp.EndDate <= @endDate');
            params.endDate = endDate;
        }
        
        const whereClause = whereConditions.length > 0 ? 'WHERE ' + whereConditions.join(' AND ') : '';
        
        // 查询总数
        const countQuery = `
            SELECT COUNT(*) as total
            FROM WorkPlans wp
            ${whereClause}
        `;
        
        // 查询数据 - 使用ROW_NUMBER()进行分页，兼容更多SQL Server版本
        const dataQuery = `
            WITH PagedResults AS (
                SELECT 
                    wp.ID,
                    wp.PlanName as Title,
                    wp.Description,
                    wp.Priority,
                    wp.Status,
                    wp.Progress,
                    wp.StartDate,
                    wp.EndDate,
                    wp.EstimatedHours,
                    wp.ActualHours,
                    wp.CreatedAt,
                    wp.UpdatedAt,
                    wt.TypeName as WorkTypeName,
                    u1.Username as CreatorName,
                    u1.RealName as CreatorRealName,
                    u2.Username as AssigneeName,
                    u2.RealName as AssigneeRealName,
                    d1.Name as ExecuteDepartmentName,
                    u3.Username as UpdatedByName,
                    u3.RealName as UpdatedByRealName,
                    (
                        SELECT STRING_AGG(u4.RealName, ', ') 
                        FROM WorkPlanExecutors wpe 
                        LEFT JOIN [User] u4 ON wpe.ExecutorID = u4.ID 
                        WHERE wpe.PlanID = wp.ID AND wpe.Status = 'active'
                    ) as ExecutorNames,
                    ROW_NUMBER() OVER (ORDER BY wp.CreatedAt DESC) as RowNum
                FROM WorkPlans wp
                LEFT JOIN WorkTypes wt ON wp.WorkTypeID = wt.ID
                LEFT JOIN [User] u1 ON wp.CreatedBy = u1.ID
                LEFT JOIN [User] u2 ON wp.AssignedTo = u2.ID
                LEFT JOIN [User] u3 ON wp.UpdatedBy = u3.ID
                LEFT JOIN Department d1 ON wp.DepartmentID = d1.ID
                ${whereClause}
            )
            SELECT * FROM PagedResults
            WHERE RowNum > @offset AND RowNum <= (@offset + @pageSize)
        `;
        
        // 执行查询
        let countRequest = pool.request();
        let dataRequest = pool.request();
        
        // 添加参数
        Object.keys(params).forEach(key => {
            const value = params[key];
            const sqlType = typeof value === 'number' ? sql.Int : sql.NVarChar;
            countRequest.input(key, sqlType, value);
            dataRequest.input(key, sqlType, value);
        });
        
        dataRequest.input('offset', sql.Int, offset);
        dataRequest.input('pageSize', sql.Int, parseInt(pageSize));
        
        const [countResult, dataResult] = await Promise.all([
            countRequest.query(countQuery),
            dataRequest.query(dataQuery)
        ]);
        
        const total = countResult.recordset[0].total;
        const totalPages = Math.ceil(total / pageSize);
        
        res.json({
            success: true,
            data: {
                list: dataResult.recordset,
                pagination: {
                    current: parseInt(page),
                    pageSize: parseInt(pageSize),
                    total: total,
                    totalPages: totalPages
                }
            },
            message: '工作计划列表获取成功'
        });
        
    } catch (error) {
        console.error('获取工作计划列表失败:', error);
        res.status(500).json({
            success: false,
            message: '获取工作计划列表失败',
            error: error.message
        });
    }
};

/**
 * 获取单个工作计划详情
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
const getPlanById = async (req, res) => {
    try {
        const pool = await poolPromise;
        const { id } = req.params;
        
        const query = `
            SELECT 
                wp.*,
                wt.TypeName as WorkTypeName,
                u1.Username as CreatorName,
                u1.RealName as CreatorRealName,
                u2.Username as AssigneeName,
                u2.RealName as AssigneeRealName,
                d1.Name as ExecuteDepartmentName,
                u3.Username as UpdatedByName,
                u3.RealName as UpdatedByRealName
            FROM WorkPlans wp
            LEFT JOIN WorkTypes wt ON wp.WorkTypeID = wt.ID
            LEFT JOIN [User] u1 ON wp.CreatedBy = u1.ID
            LEFT JOIN [User] u2 ON wp.AssignedTo = u2.ID
            LEFT JOIN [User] u3 ON wp.UpdatedBy = u3.ID
            LEFT JOIN Department d1 ON wp.DepartmentID = d1.ID
            WHERE wp.ID = @id
        `;
        
        const result = await pool.request()
            .input('id', sql.Int, id)
            .query(query);
        
        if (result.recordset.length === 0) {
            return res.status(404).json({
                success: false,
                message: '工作计划不存在'
            });
        }
        
        // 获取计划的里程碑
        const milestonesQuery = `
            SELECT * FROM PlanMilestones 
            WHERE PlanID = @id
            ORDER BY TargetDate ASC
        `;
        
        // 获取计划的执行人
        const executorsQuery = `
            SELECT 
                wpe.ExecutorID,
                wpe.Role,
                wpe.Status,
                u.Username as ExecutorName,
                u.RealName as ExecutorRealName,
                d.Name as ExecutorDepartmentName
            FROM WorkPlanExecutors wpe
            LEFT JOIN [User] u ON wpe.ExecutorID = u.ID
            LEFT JOIN Department d ON u.DepartmentID = d.ID
            WHERE wpe.PlanID = @id AND wpe.Status = 'active'
            ORDER BY wpe.CreatedAt ASC
        `;
        
        const [milestonesResult, executorsResult] = await Promise.all([
            pool.request().input('id', sql.Int, id).query(milestonesQuery),
            pool.request().input('id', sql.Int, id).query(executorsQuery)
        ]);
        
        const planData = {
            ...result.recordset[0],
            milestones: milestonesResult.recordset,
            executors: executorsResult.recordset
        };
        
        res.json({
            success: true,
            data: planData,
            message: '工作计划详情获取成功'
        });
        
    } catch (error) {
        console.error('获取工作计划详情失败:', error);
        res.status(500).json({
            success: false,
            message: '获取工作计划详情失败',
            error: error.message
        });
    }
};

/**
 * 创建新的工作计划
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
const createPlan = async (req, res) => {
    try {
        const pool = await poolPromise;
        const userId = req.user?.id || 1; // 默认用户ID为1，用于测试
        const {
            title,
            description,
            workTypeId,
            priority = 'medium',
            assigneeId,
            departmentId,
            executorIds = [],
            startDate,
            endDate,
            estimatedHours,
            milestones = []
        } = req.body;
        
        // 验证必填字段
        if (!title || !assigneeId || !startDate || !endDate) {
            return res.status(400).json({
                success: false,
                message: '标题、负责人、开始日期和结束日期为必填项'
            });
        }
        
        // 开始事务
        const transaction = new sql.Transaction(pool);
        await transaction.begin();
        
        try {
            // 生成计划编码
            const planCode = `PLAN${Date.now()}`;
            
            // 插入工作计划
            const insertPlanQuery = `
                INSERT INTO WorkPlans (
                    PlanCode, PlanName, Description, WorkTypeID, Priority, CreatedBy, AssignedTo,
                    DepartmentID, UpdatedBy, StartDate, EndDate, EstimatedHours, Status, Progress, CreatedAt, UpdatedAt
                ) VALUES (
                    @planCode, @title, @description, @workTypeId, @priority, @creatorId, @assigneeId,
                    @departmentId, @creatorId, @startDate, @endDate, @estimatedHours, 'pending', 0, GETDATE(), GETDATE()
                );
                SELECT SCOPE_IDENTITY() as planId;
            `;
            
            const planResult = await transaction.request()
                .input('planCode', sql.NVarChar, planCode)
                .input('title', sql.NVarChar, title)
                .input('description', sql.NVarChar, description || '')
                .input('workTypeId', sql.Int, workTypeId)
                .input('priority', sql.NVarChar, priority)
                .input('creatorId', sql.Int, userId)
                .input('assigneeId', sql.Int, assigneeId)
                .input('departmentId', sql.Int, departmentId)
                .input('startDate', sql.DateTime, startDate)
                .input('endDate', sql.DateTime, endDate)
                .input('estimatedHours', sql.Decimal, estimatedHours || 0)
                .query(insertPlanQuery);
            
            const planId = planResult.recordset[0].planId;
            
            // 插入里程碑（如果有）
            if (milestones && milestones.length > 0) {
                for (const milestone of milestones) {
                    const insertMilestoneQuery = `
                        INSERT INTO PlanMilestones (
                            PlanID, MilestoneName, Description, TargetDate, Status
                        ) VALUES (
                            @planId, @title, @description, @targetDate, 'pending'
                        )
                    `;
                    
                    await transaction.request()
                        .input('planId', sql.Int, planId)
                        .input('title', sql.NVarChar, milestone.title)
                        .input('description', sql.NVarChar, milestone.description || '')
                        .input('targetDate', sql.DateTime, milestone.targetDate)
                        .query(insertMilestoneQuery);
                }
            }
            
            // 插入执行人关联记录（如果有）
            if (executorIds && executorIds.length > 0) {
                for (const executorId of executorIds) {
                    const insertExecutorQuery = `
                        INSERT INTO WorkPlanExecutors (
                            PlanID, ExecutorID, Role, AssignedBy, Status, CreatedAt, UpdatedAt
                        ) VALUES (
                            @planId, @executorId, '执行人', @assignedBy, 'active', GETDATE(), GETDATE()
                        )
                    `;
                    
                    await transaction.request()
                        .input('planId', sql.Int, planId)
                        .input('executorId', sql.Int, executorId)
                        .input('assignedBy', sql.Int, userId)
                        .query(insertExecutorQuery);
                }
            }
            
            await transaction.commit();
            
            res.status(201).json({
                success: true,
                data: { id: planId },
                message: '工作计划创建成功'
            });
            
        } catch (error) {
            await transaction.rollback();
            throw error;
        }
        
    } catch (error) {
        console.error('创建工作计划失败:', error);
        res.status(500).json({
            success: false,
            message: '创建工作计划失败',
            error: error.message
        });
    }
};

/**
 * 更新工作计划
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
const updatePlan = async (req, res) => {
    try {
        const pool = await poolPromise;
        const { id } = req.params;
        const {
            title,
            description,
            workTypeId,
            priority,
            assigneeId,
            departmentId,
            executorIds,
            startDate,
            endDate,
            estimatedHours,
            actualHours,
            progress,
            status
        } = req.body;
        
        const userId = req.user?.id || 1; // 获取当前用户ID
        
        // 检查计划是否存在
        const checkQuery = `
            SELECT ID FROM WorkPlans 
            WHERE ID = @id
        `;
        
        const checkResult = await pool.request()
            .input('id', sql.Int, id)
            .query(checkQuery);
        
        if (checkResult.recordset.length === 0) {
            return res.status(404).json({
                success: false,
                message: '工作计划不存在'
            });
        }
        
        // 构建更新字段
        const updateFields = [];
        const params = { id: parseInt(id) };
        
        if (title !== undefined) {
            updateFields.push('Title = @title');
            params.title = title;
        }
        
        if (description !== undefined) {
            updateFields.push('Description = @description');
            params.description = description;
        }
        
        if (workTypeId !== undefined) {
            updateFields.push('WorkTypeID = @workTypeId');
            params.workTypeId = workTypeId;
        }
        
        if (priority !== undefined) {
            updateFields.push('Priority = @priority');
            params.priority = priority;
        }
        
        if (assigneeId !== undefined) {
            updateFields.push('AssignedTo = @assigneeId');
            params.assigneeId = assigneeId;
        }
        
        if (departmentId !== undefined) {
            updateFields.push('DepartmentID = @departmentId');
            params.departmentId = departmentId;
        }
        
        if (startDate !== undefined) {
            updateFields.push('StartDate = @startDate');
            params.startDate = startDate;
        }
        
        if (endDate !== undefined) {
            updateFields.push('EndDate = @endDate');
            params.endDate = endDate;
        }
        
        if (estimatedHours !== undefined) {
            updateFields.push('EstimatedHours = @estimatedHours');
            params.estimatedHours = estimatedHours;
        }
        
        if (actualHours !== undefined) {
            updateFields.push('ActualHours = @actualHours');
            params.actualHours = actualHours;
        }
        
        if (progress !== undefined) {
            updateFields.push('Progress = @progress');
            params.progress = progress;
        }
        
        if (status !== undefined) {
            updateFields.push('Status = @status');
            params.status = status;
        }
        
        if (updateFields.length === 0) {
            return res.status(400).json({
                success: false,
                message: '没有提供要更新的字段'
            });
        }
        
        updateFields.push('UpdatedAt = GETDATE()');
        updateFields.push('UpdatedBy = @updatedBy');
        params.updatedBy = userId;
        
        const updateQuery = `
            UPDATE WorkPlans 
            SET ${updateFields.join(', ')}
            WHERE ID = @id
        `;
        
        let request = pool.request();
        Object.keys(params).forEach(key => {
            const value = params[key];
            let sqlType;
            
            if (typeof value === 'number') {
                sqlType = Number.isInteger(value) ? sql.Int : sql.Decimal;
            } else if (value instanceof Date) {
                sqlType = sql.DateTime;
            } else {
                sqlType = sql.NVarChar;
            }
            
            request.input(key, sqlType, value);
        });
        
        await request.query(updateQuery);
        
        // 更新执行人关联记录（如果提供了executorIds）
        if (executorIds !== undefined) {
            // 先删除现有的执行人关联记录
            const deleteExecutorsQuery = `
                DELETE FROM WorkPlanExecutors WHERE PlanID = @planId
            `;
            
            await pool.request()
                .input('planId', sql.Int, id)
                .query(deleteExecutorsQuery);
            
            // 插入新的执行人关联记录
            if (executorIds && executorIds.length > 0) {
                for (const executorId of executorIds) {
                    const insertExecutorQuery = `
                        INSERT INTO WorkPlanExecutors (
                            PlanID, ExecutorID, Role, AssignedBy, Status, CreatedAt, UpdatedAt
                        ) VALUES (
                            @planId, @executorId, '执行人', @assignedBy, 'active', GETDATE(), GETDATE()
                        )
                    `;
                    
                    await pool.request()
                        .input('planId', sql.Int, id)
                        .input('executorId', sql.Int, executorId)
                        .input('assignedBy', sql.Int, userId)
                        .query(insertExecutorQuery);
                }
            }
        }
        
        res.json({
            success: true,
            message: '工作计划更新成功'
        });
        
    } catch (error) {
        console.error('更新工作计划失败:', error);
        res.status(500).json({
            success: false,
            message: '更新工作计划失败',
            error: error.message
        });
    }
};

/**
 * 删除工作计划
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
const deletePlan = async (req, res) => {
    try {
        const pool = await poolPromise;
        const { id } = req.params;
        
        // 删除工作计划
        const query = `
            DELETE FROM WorkPlans 
            WHERE ID = @id
        `;
        
        const result = await pool.request()
            .input('id', sql.Int, id)
            .query(query);
        
        if (result.rowsAffected[0] === 0) {
            return res.status(404).json({
                success: false,
                message: '工作计划不存在'
            });
        }
        
        res.json({
            success: true,
            message: '工作计划删除成功'
        });
        
    } catch (error) {
        console.error('删除工作计划失败:', error);
        res.status(500).json({
            success: false,
            message: '删除工作计划失败',
            error: error.message
        });
    }
};

// =====================================================
// 导出所有控制器函数
// =====================================================

module.exports = {
    // 工作台
    getDashboardData,
    getTodoList,
    getRecentLogs,
    
    // 工作计划
    getPlanList,
    getPlanById,
    createPlan,
    updatePlan,
    deletePlan,
    
    // 其他计划管理功能
    
    /**
     * 批量删除计划
     * @param {Object} req - 请求对象
     * @param {Object} res - 响应对象
     */
    batchDeletePlans: async (req, res) => {
        try {
            const pool = await poolPromise;
            const { ids } = req.body;
            
            if (!ids || !Array.isArray(ids) || ids.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: '请选择要删除的计划'
                });
            }
            
            const placeholders = ids.map((_, index) => `@id${index}`).join(',');
            const query = `DELETE FROM WorkPlans WHERE ID IN (${placeholders})`;
            
            const request = pool.request();
            ids.forEach((id, index) => {
                request.input(`id${index}`, sql.Int, parseInt(id));
            });
            
            await request.query(query);
            
            res.json({
                success: true,
                message: `成功删除 ${ids.length} 个计划`
            });
            
        } catch (error) {
            console.error('批量删除计划失败:', error);
            res.status(500).json({
                success: false,
                message: '批量删除计划失败',
                error: error.message
            });
        }
    },
    
    /**
     * 更新计划状态
     * @param {Object} req - 请求对象
     * @param {Object} res - 响应对象
     */
    updatePlanStatus: async (req, res) => {
        try {
            const pool = await poolPromise;
            const { id } = req.params;
            const { status } = req.body;
            
            if (!id || !status) {
                return res.status(400).json({
                    success: false,
                    message: '计划ID和状态不能为空'
                });
            }
            
            const validStatuses = ['pending', 'in_progress', 'completed', 'cancelled'];
            if (!validStatuses.includes(status)) {
                return res.status(400).json({
                    success: false,
                    message: '无效的状态值'
                });
            }
            
            let updateFields = 'Status = @status, UpdatedAt = GETDATE()';
            const request = pool.request()
                .input('id', sql.Int, parseInt(id))
                .input('status', sql.NVarChar, status);
            
            // 如果状态为已完成，设置完成时间和进度为100%
            if (status === 'completed') {
                updateFields += ', CompletedAt = GETDATE(), Progress = 100';
            }
            
            const query = `UPDATE WorkPlans SET ${updateFields} WHERE ID = @id`;
            
            await request.query(query);
            
            res.json({
                success: true,
                message: '计划状态更新成功'
            });
            
        } catch (error) {
            console.error('更新计划状态失败:', error);
            res.status(500).json({
                success: false,
                message: '更新计划状态失败',
                error: error.message
            });
        }
    },
    
    /**
     * 更新计划进度
     * @param {Object} req - 请求对象
     * @param {Object} res - 响应对象
     */
    updatePlanProgress: async (req, res) => {
        try {
            const pool = await poolPromise;
            const { id } = req.params;
            const { progress, description } = req.body;
            
            if (!id || progress === undefined) {
                return res.status(400).json({
                    success: false,
                    message: '计划ID和进度不能为空'
                });
            }
            
            if (progress < 0 || progress > 100) {
                return res.status(400).json({
                    success: false,
                    message: '进度值必须在0-100之间'
                });
            }
            
            const updaterID = req.user.id; // 从认证中间件获取用户ID
            
            // 获取当前进度
            const getCurrentProgressQuery = 'SELECT Progress FROM WorkPlans WHERE ID = @id';
            const currentResult = await pool.request()
                .input('id', sql.Int, parseInt(id))
                .query(getCurrentProgressQuery);
            
            if (currentResult.recordset.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: '计划不存在'
                });
            }
            
            const oldProgress = currentResult.recordset[0].Progress || 0;
            
            // 更新计划进度
            let updateFields = 'Progress = @progress, UpdatedAt = GETDATE()';
            const request = pool.request()
                .input('id', sql.Int, parseInt(id))
                .input('progress', sql.Decimal(5,2), progress);
            
            // 如果进度达到100%，自动设置为已完成状态
            if (progress >= 100) {
                updateFields += ", Status = 'completed', CompletedAt = GETDATE()";
            } else if (progress > 0 && oldProgress === 0) {
                // 如果从0开始有进度，设置为进行中状态
                updateFields += ", Status = 'in_progress'";
            }
            
            const updateQuery = `UPDATE WorkPlans SET ${updateFields} WHERE ID = @id`;
            await request.query(updateQuery);
            
            // 记录进度历史
            const historyQuery = `
                INSERT INTO PlanProgressHistory (
                    PlanID, OldProgress, NewProgress, Description, UpdaterID
                ) VALUES (
                    @planId, @oldProgress, @newProgress, @description, @updaterID
                )
            `;
            
            await pool.request()
                .input('planId', sql.Int, parseInt(id))
                .input('oldProgress', sql.Decimal(5,2), oldProgress)
                .input('newProgress', sql.Decimal(5,2), progress)
                .input('description', sql.NVarChar, description || `进度从 ${oldProgress}% 更新到 ${progress}%`)
                .input('updaterID', sql.Int, updaterID)
                .query(historyQuery);
            
            res.json({
                success: true,
                message: '计划进度更新成功'
            });
            
        } catch (error) {
            console.error('更新计划进度失败:', error);
            res.status(500).json({
                success: false,
                message: '更新计划进度失败',
                error: error.message
            });
        }
    },
    
    /**
     * 导出计划列表
     * @param {Object} req - 请求对象
     * @param {Object} res - 响应对象
     */
    exportPlans: async (req, res) => {
        try {
            const pool = await poolPromise;
            const {
                status = '',
                priority = '',
                assigneeId = '',
                startDate = '',
                endDate = ''
            } = req.query;
            
            let whereConditions = ['1=1'];
            const request = pool.request();
            
            if (status) {
                if (status.includes(',')) {
                    // 处理多个状态值
                    const statusValues = status.split(',').map(s => s.trim());
                    const statusPlaceholders = statusValues.map((_, index) => `@status${index}`).join(', ');
                    whereConditions.push(`wp.Status IN (${statusPlaceholders})`);
                    statusValues.forEach((statusValue, index) => {
                        request.input(`status${index}`, sql.NVarChar, statusValue);
                    });
                } else {
                    // 处理单个状态值
                    whereConditions.push('wp.Status = @status');
                    request.input('status', sql.NVarChar, status);
                }
            }
            
            if (priority) {
                whereConditions.push('wp.Priority = @priority');
                request.input('priority', sql.NVarChar, priority);
            }
            
            if (assigneeId) {
                whereConditions.push('wp.AssignedTo = @assigneeId');
                request.input('assigneeId', sql.Int, parseInt(assigneeId));
            }
            
            if (startDate) {
                whereConditions.push('wp.StartDate >= @startDate');
                request.input('startDate', sql.Date, startDate);
            }
            
            if (endDate) {
                whereConditions.push('wp.EndDate <= @endDate');
                request.input('endDate', sql.Date, endDate);
            }
            
            const whereClause = whereConditions.join(' AND ');
            
            const query = `
                SELECT 
                    wp.PlanName as '计划标题',
                    wp.Description as '计划描述',
                    wt.TypeName as '工作类型',
                    wp.Priority as '优先级',
                    wp.Status as '状态',
                    wp.Progress as '进度(%)',
                    wp.StartDate as '开始日期',
                    wp.EndDate as '截止日期',
                    creator.RealName as '创建人',
                    assignee.RealName as '负责人',
                    dept.Name as '所属部门',
                    wp.EstimatedHours as '预估工时',
                    wp.ActualHours as '实际工时',
                    wp.CreatedAt as '创建时间',
                    wp.CompletedAt as '完成时间'
                FROM WorkPlans wp
                LEFT JOIN WorkTypes wt ON wp.WorkTypeID = wt.ID
                LEFT JOIN [User] creator ON wp.CreatedBy = creator.ID
                LEFT JOIN [User] assignee ON wp.AssignedTo = assignee.ID
                LEFT JOIN Department dept ON assignee.DepartmentID = dept.ID
                WHERE ${whereClause}
                ORDER BY wp.CreatedAt DESC
            `;
            
            const result = await request.query(query);
            
            // 创建Excel工作簿
            const workbook = new ExcelJS.Workbook();
            const worksheet = workbook.addWorksheet('工作计划');
            
            // 设置列标题
            const columns = Object.keys(result.recordset[0] || {});
            worksheet.columns = columns.map(col => ({
                header: col,
                key: col,
                width: 20
            }));
            
            // 添加数据
            result.recordset.forEach(row => {
                worksheet.addRow(row);
            });
            
            // 设置响应头
            const fileName = `工作计划_${moment().format('YYYY-MM-DD')}.xlsx`;
            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(fileName)}"`);
            
            // 输出Excel文件
            await workbook.xlsx.write(res);
            res.end();
            
        } catch (error) {
            console.error('导出计划列表失败:', error);
            res.status(500).json({
                success: false,
                message: '导出计划列表失败',
                error: error.message
            });
        }
    },
    
    // 工作日志管理
    
    /**
     * 获取工作日志列表
     * @param {Object} req - 请求对象
     * @param {Object} res - 响应对象
     */
    getLogList: async (req, res) => {
        try {
            const pool = await poolPromise;
            const {
                page = 1,
                pageSize = 20,
                planId = '',
                userId = '',
                startDate = '',
                endDate = '',
                keyword = ''
            } = req.query;
            
            let whereConditions = ['1=1'];
            const request = pool.request();
            
            // 计划筛选
            if (planId) {
                whereConditions.push('wl.PlanID = @planId');
                request.input('planId', sql.Int, parseInt(planId));
            }
            
            // 用户筛选
            if (userId) {
                whereConditions.push('wl.UserID = @userId');
                request.input('userId', sql.Int, parseInt(userId));
            }
            
            // 日期范围筛选
            if (startDate) {
                whereConditions.push('wl.LogDate >= @startDate');
                request.input('startDate', sql.Date, startDate);
            }
            
            if (endDate) {
                whereConditions.push('wl.LogDate <= @endDate');
                request.input('endDate', sql.Date, endDate);
            }
            
            // 关键词搜索
            if (keyword) {
                whereConditions.push('(wl.WorkContent LIKE @keyword OR wl.Issues LIKE @keyword)');
                request.input('keyword', sql.NVarChar, `%${keyword}%`);
            }
            
            const whereClause = whereConditions.join(' AND ');
            
            // 分页参数
            const offset = (parseInt(page) - 1) * parseInt(pageSize);
            request.input('offset', sql.Int, offset);
            request.input('pageSize', sql.Int, parseInt(pageSize));
            
            // 查询总数
            const countQuery = `
                SELECT COUNT(*) as total
                FROM WorkLogs wl
                WHERE ${whereClause}
            `;
            
            const countResult = await request.query(countQuery);
            const total = countResult.recordset[0].total;
            
            // 查询数据 - 使用ROW_NUMBER()实现分页以兼容旧版SQL Server
            const dataQuery = `
                SELECT * FROM (
                    SELECT 
                        wl.ID,
                        wl.PlanID,
                        wl.LogDate,
                        wl.WorkHours,
                        wl.WorkContent,
                        wl.Progress,
                        wl.Issues,
                        wl.NextPlan,
                        wl.Attachments,
                        wl.CreatedAt,
                        wl.UpdatedAt,
                        wp.PlanName as PlanTitle,
                        u.RealName as UserName,
                        ROW_NUMBER() OVER (ORDER BY wl.LogDate DESC, wl.CreatedAt DESC) as RowNum
                    FROM WorkLogs wl
                    LEFT JOIN WorkPlans wp ON wl.PlanID = wp.ID
                    LEFT JOIN [User] u ON wl.UserID = u.ID
                    WHERE ${whereClause}
                ) AS T
                WHERE T.RowNum BETWEEN (@offset + 1) AND (@offset + @pageSize)
                ORDER BY T.RowNum
            `;
            
            const dataResult = await request.query(dataQuery);
            
            res.json({
                success: true,
                data: {
                    list: dataResult.recordset,
                    total: total,
                    page: parseInt(page),
                    pageSize: parseInt(pageSize)
                },
                message: '工作日志获取成功'
            });
            
        } catch (error) {
            console.error('获取工作日志失败:', error);
            res.status(500).json({
                success: false,
                message: '获取工作日志失败',
                error: error.message
            });
        }
    },
    
    /**
     * 获取单个工作日志详情
     * @param {Object} req - 请求对象
     * @param {Object} res - 响应对象
     */
    getLogById: async (req, res) => {
        try {
            const pool = await poolPromise;
            const { id } = req.params;
            
            if (!id) {
                return res.status(400).json({
                    success: false,
                    message: '日志ID不能为空'
                });
            }
            
            const query = `
                SELECT 
                    wl.ID,
                    wl.PlanID,
                    wl.UserID,
                    wl.LogDate,
                    wl.WorkHours,
                    wl.WorkContent,
                    wl.Progress,
                    wl.Issues,
                    wl.NextPlan,
                    wl.Attachments,
                    wl.CreatedAt,
                    wl.UpdatedAt,
                    wp.PlanName as PlanTitle,
                    u.RealName as UserName
                FROM WorkLogs wl
                LEFT JOIN WorkPlans wp ON wl.PlanID = wp.ID
                LEFT JOIN [User] u ON wl.UserID = u.ID
                WHERE wl.ID = @id
            `;
            
            const result = await pool.request()
                .input('id', sql.Int, parseInt(id))
                .query(query);
            
            if (result.recordset.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: '工作日志不存在'
                });
            }
            
            res.json({
                success: true,
                data: result.recordset[0],
                message: '工作日志获取成功'
            });
            
        } catch (error) {
            console.error('获取工作日志详情失败:', error);
            res.status(500).json({
                success: false,
                message: '获取工作日志详情失败',
                error: error.message
            });
        }
    },
    
    /**
     * 创建工作日志
     * @param {Object} req - 请求对象
     * @param {Object} res - 响应对象
     */
    createLog: async (req, res) => {
        try {
            const pool = await poolPromise;
            const {
                PlanID,
                LogDate,
                WorkHours,
                WorkContent,
                Progress,
                Issues,
                NextPlan,
                Attachments
            } = req.body;
            
            // 验证必填字段
            if (!PlanID || !LogDate || !WorkHours || !WorkContent) {
                return res.status(400).json({
                    success: false,
                    message: '请填写必要的日志信息'
                });
            }
            
            const UserID = req.user.id; // 从认证中间件获取用户ID
            
            const query = `
                INSERT INTO WorkLogs (
                    PlanID, UserID, LogDate, WorkHours, WorkContent, 
                    Progress, Issues, NextPlan, Attachments
                )
                OUTPUT INSERTED.ID
                VALUES (
                    @PlanID, @UserID, @LogDate, @WorkHours, @WorkContent,
                    @Progress, @Issues, @NextPlan, @Attachments
                )
            `;
            
            const result = await pool.request()
                .input('PlanID', sql.Int, PlanID)
                .input('UserID', sql.Int, UserID)
                .input('LogDate', sql.Date, LogDate)
                .input('WorkHours', sql.Decimal(4,2), WorkHours)
                .input('WorkContent', sql.NVarChar, WorkContent)
                .input('Progress', sql.Decimal(5,2), Progress || null)
                .input('Issues', sql.NVarChar, Issues || null)
                .input('NextPlan', sql.NVarChar, NextPlan || null)
                .input('Attachments', sql.NVarChar, Attachments || null)
                .query(query);
            
            const newLogId = result.recordset[0].ID;
            
            res.status(201).json({
                success: true,
                data: { ID: newLogId },
                message: '工作日志创建成功'
            });
            
        } catch (error) {
            console.error('创建工作日志失败:', error);
            res.status(500).json({
                success: false,
                message: '创建工作日志失败',
                error: error.message
            });
        }
    },
    
    /**
     * 更新工作日志
     * @param {Object} req - 请求对象
     * @param {Object} res - 响应对象
     */
    updateLog: async (req, res) => {
        try {
            const pool = await poolPromise;
            const { id } = req.params;
            const {
                LogDate,
                WorkHours,
                WorkContent,
                Progress,
                Issues,
                NextPlan,
                Attachments
            } = req.body;
            
            if (!id) {
                return res.status(400).json({
                    success: false,
                    message: '日志ID不能为空'
                });
            }
            
            const query = `
                UPDATE WorkLogs SET
                    LogDate = @LogDate,
                    WorkHours = @WorkHours,
                    WorkContent = @WorkContent,
                    Progress = @Progress,
                    Issues = @Issues,
                    NextPlan = @NextPlan,
                    Attachments = @Attachments,
                    UpdatedAt = GETDATE()
                WHERE ID = @id
            `;
            
            await pool.request()
                .input('id', sql.Int, parseInt(id))
                .input('LogDate', sql.Date, LogDate)
                .input('WorkHours', sql.Decimal(4,2), WorkHours)
                .input('WorkContent', sql.NVarChar, WorkContent)
                .input('Progress', sql.Decimal(5,2), Progress || null)
                .input('Issues', sql.NVarChar, Issues || null)
                .input('NextPlan', sql.NVarChar, NextPlan || null)
                .input('Attachments', sql.NVarChar, Attachments || null)
                .query(query);
            
            res.json({
                success: true,
                message: '工作日志更新成功'
            });
            
        } catch (error) {
            console.error('更新工作日志失败:', error);
            res.status(500).json({
                success: false,
                message: '更新工作日志失败',
                error: error.message
            });
        }
    },
    
    /**
     * 删除工作日志
     * @param {Object} req - 请求对象
     * @param {Object} res - 响应对象
     */
    deleteLog: async (req, res) => {
        try {
            const pool = await poolPromise;
            const { id } = req.params;
            
            if (!id) {
                return res.status(400).json({
                    success: false,
                    message: '日志ID不能为空'
                });
            }
            
            const query = 'DELETE FROM WorkLogs WHERE ID = @id';
            
            await pool.request()
                .input('id', sql.Int, parseInt(id))
                .query(query);
            
            res.json({
                success: true,
                message: '工作日志删除成功'
            });
            
        } catch (error) {
            console.error('删除工作日志失败:', error);
            res.status(500).json({
                success: false,
                message: '删除工作日志失败',
                error: error.message
            });
        }
    },
    
    /**
     * 批量删除工作日志
     * @param {Object} req - 请求对象
     * @param {Object} res - 响应对象
     */
    batchDeleteLogs: async (req, res) => {
        try {
            const pool = await poolPromise;
            const { ids } = req.body;
            
            if (!ids || !Array.isArray(ids) || ids.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: '请选择要删除的日志'
                });
            }
            
            const placeholders = ids.map((_, index) => `@id${index}`).join(',');
            const query = `DELETE FROM WorkLogs WHERE ID IN (${placeholders})`;
            
            const request = pool.request();
            ids.forEach((id, index) => {
                request.input(`id${index}`, sql.Int, parseInt(id));
            });
            
            await request.query(query);
            
            res.json({
                success: true,
                message: `成功删除 ${ids.length} 条工作日志`
            });
            
        } catch (error) {
            console.error('批量删除工作日志失败:', error);
            res.status(500).json({
                success: false,
                message: '批量删除工作日志失败',
                error: error.message
            });
        }
    },
    
    /**
     * 导出工作日志
     * @param {Object} req - 请求对象
     * @param {Object} res - 响应对象
     */
    exportLogs: async (req, res) => {
        try {
            const pool = await poolPromise;
            const {
                planId = '',
                userId = '',
                startDate = '',
                endDate = '',
                selectedIds = ''
            } = req.query;            
           
            let whereConditions = ['1=1'];
            const request = pool.request();
            
            // 如果提供了selectedIds，则只导出选中的记录
            if (selectedIds && selectedIds.trim()) {
                const idArray = selectedIds.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id));
                if (idArray.length > 0) {
                    const placeholders = idArray.map((_, index) => `@id${index}`).join(',');
                    whereConditions.push(`wl.ID IN (${placeholders})`);
                    idArray.forEach((id, index) => {
                        request.input(`id${index}`, sql.Int, id);
                    });

                } else {

                }
            } else {

            }
            
            if (planId) {
                whereConditions.push('wl.PlanID = @planId');
                request.input('planId', sql.Int, parseInt(planId));
            }
            
            if (userId) {
                whereConditions.push('wl.UserID = @userId');
                request.input('userId', sql.Int, parseInt(userId));
            }
            
            if (startDate) {
                whereConditions.push('wl.LogDate >= @startDate');
                request.input('startDate', sql.Date, startDate);
            }
            
            if (endDate) {
                whereConditions.push('wl.LogDate <= @endDate');
                request.input('endDate', sql.Date, endDate);
            }
            
            const whereClause = whereConditions.join(' AND ');
            
            // 兼容SQL Server 2008R2的查询语句
            const query = `
                SELECT 
                    CONVERT(varchar(10), wl.LogDate, 120) as [日志日期],
                    ISNULL(wp.PlanName, N'无关联计划') as [关联计划],
                    ISNULL(u.RealName, N'未知用户') as [记录人],
                    CAST(ISNULL(wl.WorkHours, 0) as varchar(10)) as [工作时长],
                    ISNULL(wl.WorkContent, N'') as [工作内容],
                    CAST(ISNULL(wl.Progress, 0) as varchar(10)) + '%' as [进度],
                    ISNULL(wl.Issues, N'') as [遇到问题],
                    ISNULL(wl.NextPlan, N'') as [下一步计划],
                    CONVERT(varchar(19), wl.CreatedAt, 120) as [创建时间]
                FROM WorkLogs wl
                LEFT JOIN WorkPlans wp ON wl.PlanID = wp.ID
                LEFT JOIN [User] u ON wl.UserID = u.ID
                WHERE ${whereClause}
                ORDER BY wl.LogDate DESC, wl.CreatedAt DESC
            `;            
          
            const result = await request.query(query);
            
            // 创建Excel工作簿
            const workbook = new ExcelJS.Workbook();
            const worksheet = workbook.addWorksheet('工作日志');
            
            // 定义列配置
            const columns = [
                { header: '日志日期', key: '日志日期', width: 15 },
                { header: '关联计划', key: '关联计划', width: 25 },
                { header: '记录人', key: '记录人', width: 15 },
                { header: '工作时长', key: '工作时长', width: 12 },
                { header: '工作内容', key: '工作内容', width: 40 },
                { header: '进度', key: '进度', width: 15 },
                { header: '遇到问题', key: '遇到问题', width: 30 },
                { header: '下一步计划', key: '下一步计划', width: 30 },
                { header: '创建时间', key: '创建时间', width: 20 }
            ];
            
            worksheet.columns = columns;
            
            // 设置表头样式
            const headerRow = worksheet.getRow(1);
            headerRow.height = 25;
            headerRow.eachCell((cell, colNumber) => {
                cell.font = {
                    name: '微软雅黑',
                    size: 11,
                    bold: true,
                    color: { argb: 'FF000000' }
                };
                cell.fill = {
                    type: 'pattern',
                    pattern: 'solid',
                    fgColor: { argb: 'FFD3D3D3' }
                };
                cell.alignment = {
                    horizontal: 'center',
                    vertical: 'middle'
                };
                cell.border = {
                    top: { style: 'thin', color: { argb: 'FF000000' } },
                    left: { style: 'thin', color: { argb: 'FF000000' } },
                    bottom: { style: 'thin', color: { argb: 'FF000000' } },
                    right: { style: 'thin', color: { argb: 'FF000000' } }
                };
            });
            
            // 添加数据
            if (result.recordset && result.recordset.length > 0) {
                result.recordset.forEach((row, index) => {
                    const dataRow = worksheet.addRow(row);
                    dataRow.height = 20;
                    
                    // 设置数据行样式
                    dataRow.eachCell((cell, colNumber) => {
                        cell.font = {
                            name: '微软雅黑',
                            size: 11
                        };
                        cell.alignment = {
                            horizontal: colNumber === 5 || colNumber === 7 || colNumber === 8 ? 'left' : 'center',
                            vertical: 'middle',
                            wrapText: true
                        };
                        cell.border = {
                            top: { style: 'thin', color: { argb: 'FFD0D0D0' } },
                            left: { style: 'thin', color: { argb: 'FFD0D0D0' } },
                            bottom: { style: 'thin', color: { argb: 'FFD0D0D0' } },
                            right: { style: 'thin', color: { argb: 'FFD0D0D0' } }
                        };
                        
                        // 交替行背景色
                        if (index % 2 === 1) {
                            cell.fill = {
                                type: 'pattern',
                                pattern: 'solid',
                                fgColor: { argb: 'FFF8F9FA' }
                            };
                        }
                        
                        // 进度列特殊样式
                        if (colNumber === 6 && cell.value) {
                            const progressValue = parseInt(cell.value.toString().replace('%', ''));
                            if (progressValue >= 100) {
                                cell.font.color = { argb: 'FF198754' };
                                cell.font.bold = true;
                            } else if (progressValue >= 80) {
                                cell.font.color = { argb: 'FF0D6EFD' };
                                cell.font.bold = true;
                            } else if (progressValue >= 50) {
                                cell.font.color = { argb: 'FFFFC107' };
                                cell.font.bold = true;
                            } else {
                                cell.font.color = { argb: 'FFDC3545' };
                                cell.font.bold = true;
                            }
                        }
                        
                        // 日期列样式
                        if (colNumber === 1 || colNumber === 9) {
                            cell.font.color = { argb: 'FF6C757D' };
                        }
                    });
                });
                

            } else {
                // 添加无数据提示
                const noDataRow = worksheet.addRow({
                    '日志日期': '暂无数据',
                    '关联计划': '',
                    '记录人': '',
                    '工作时长': '',
                    '工作内容': '',
                    '进度': '',
                    '遇到问题': '',
                    '下一步计划': '',
                    '创建时间': ''
                });
                
                noDataRow.eachCell((cell) => {
                    cell.font = {
                        name: '微软雅黑',
                        size: 11,
                        color: { argb: 'FF6C757D' },
                        italic: true
                    };
                    cell.alignment = {
                        horizontal: 'center',
                        vertical: 'middle'
                    };
                    cell.border = {
                        top: { style: 'thin', color: { argb: 'FFD0D0D0' } },
                        left: { style: 'thin', color: { argb: 'FFD0D0D0' } },
                        bottom: { style: 'thin', color: { argb: 'FFD0D0D0' } },
                        right: { style: 'thin', color: { argb: 'FFD0D0D0' } }
                    };
                });
            }
            
            // 设置响应头
            const fileName = `工作日志_${moment().format('YYYY-MM-DD')}.xlsx`;
            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(fileName)}"`);
            
            // 输出Excel文件
            await workbook.xlsx.write(res);
            res.end();            
            
        } catch (error) {
            console.error('=== 导出工作日志失败 ===');
            console.error('错误类型:', error.constructor.name);
            console.error('错误信息:', error.message);
            console.error('错误堆栈:', error.stack);
            
            // 检查是否是SQL错误
            if (error.code) {
                console.error('SQL错误代码:', error.code);
            }
            if (error.number) {
                console.error('SQL错误编号:', error.number);
            }
            
            res.status(500).json({
                success: false,
                message: '导出工作日志失败',
                error: error.message,
                sqlError: error.code || error.number || null
            });
        }
    },
    
    // 里程碑管理功能
    
    /**
     * 获取所有里程碑列表
     * @param {Object} req - 请求对象
     * @param {Object} res - 响应对象
     */
    getAllMilestones: async (req, res) => {
        try {
            const pool = await poolPromise;            
            const query = `
                SELECT 
                    pm.ID,
                    pm.PlanID,
                    pm.MilestoneName as Title,
                    pm.Description,
                    pm.TargetDate,
                    CASE WHEN pm.Status = 'completed' THEN 1 ELSE 0 END as IsCompleted,
                    pm.ActualDate as CompletedAt,
                    pm.CreatedAt,
                    'System' as CreatorName,
                    wp.PlanName
                FROM PlanMilestones pm
                LEFT JOIN WorkPlans wp ON pm.PlanID = wp.ID
                ORDER BY pm.TargetDate ASC
            `;
            
            const result = await pool.request().query(query);
            
            res.json({
                success: true,
                data: result.recordset
            });
            
        } catch (error) {
            console.error('获取所有里程碑列表失败:', error);
            res.status(500).json({
                success: false,
                message: '获取所有里程碑列表失败',
                error: error.message
            });
        }
    },
    
    /**
     * 获取计划的里程碑列表
     * @param {Object} req - 请求对象
     * @param {Object} res - 响应对象
     */
    getPlanMilestones: async (req, res) => {
        try {
            const pool = await poolPromise;
            const { planId } = req.params;
            
            if (!planId) {
                return res.status(400).json({
                    success: false,
                    message: '计划ID不能为空'
                });
            }
            
            const query = `
                SELECT 
                    pm.ID,
                    pm.MilestoneName as Title,
                    pm.Description,
                    pm.TargetDate,
                    CASE WHEN pm.Status = 'completed' THEN 1 ELSE 0 END as IsCompleted,
                    pm.ActualDate as CompletedAt,
                    pm.CreatedAt,
                    'System' as CreatorName
                FROM PlanMilestones pm
                WHERE pm.PlanID = @planId
                ORDER BY pm.TargetDate ASC
            `;
            
            const result = await pool.request()
                .input('planId', sql.Int, parseInt(planId))
                .query(query);
            
            res.json({
                success: true,
                data: result.recordset
            });
            
        } catch (error) {
            console.error('获取里程碑列表失败:', error);
            res.status(500).json({
                success: false,
                message: '获取里程碑列表失败',
                error: error.message
            });
        }
    },
    
    /**
     * 创建里程碑
     * @param {Object} req - 请求对象
     * @param {Object} res - 响应对象
     */
    createMilestone: async (req, res) => {
        try {
            const pool = await poolPromise;
            const { planId } = req.params;
            const { title, description, targetDate } = req.body;
            const creatorID = req.user.id; // 从认证中间件获取用户ID
            
            if (!planId || !title || !targetDate) {
                return res.status(400).json({
                    success: false,
                    message: '计划ID、标题和目标日期不能为空'
                });
            }
            
            // 验证计划是否存在
            const planCheckQuery = 'SELECT ID FROM WorkPlans WHERE ID = @planId';
            const planResult = await pool.request()
                .input('planId', sql.Int, parseInt(planId))
                .query(planCheckQuery);
            
            if (planResult.recordset.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: '计划不存在'
                });
            }
            
            const query = `
                INSERT INTO PlanMilestones (
                    PlanID, MilestoneName, Description, TargetDate
                ) VALUES (
                    @planId, @title, @description, @targetDate
                )
                SELECT SCOPE_IDENTITY() as ID
            `;
            
            const result = await pool.request()
                .input('planId', sql.Int, parseInt(planId))
                .input('title', sql.NVarChar, title)
                .input('description', sql.NVarChar, description || '')
                .input('targetDate', sql.Date, targetDate)
                .query(query);
            
            res.json({
                success: true,
                message: '里程碑创建成功',
                data: { id: result.recordset[0].ID }
            });
            
        } catch (error) {
            console.error('创建里程碑失败:', error);
            res.status(500).json({
                success: false,
                message: '创建里程碑失败',
                error: error.message
            });
        }
    },
    
    /**
     * 更新里程碑状态
     * @param {Object} req - 请求对象
     * @param {Object} res - 响应对象
     */
    updateMilestoneStatus: async (req, res) => {
        try {
            const pool = await poolPromise;
            const { id } = req.params;
            const { isCompleted } = req.body;
            
            if (!id || isCompleted === undefined) {
                return res.status(400).json({
                    success: false,
                    message: '里程碑ID和完成状态不能为空'
                });
            }
            
            const status = isCompleted ? 'completed' : 'pending';
            const request = pool.request()
                .input('id', sql.Int, parseInt(id))
                .input('status', sql.NVarChar, status);
            
            let updateFields = 'Status = @status';
            if (isCompleted) {
                updateFields += ', ActualDate = GETDATE()';
            } else {
                updateFields += ', ActualDate = NULL';
            }
            
            const query = `UPDATE PlanMilestones SET ${updateFields} WHERE ID = @id`;
            
            await request.query(query);
            
            res.json({
                success: true,
                message: '里程碑状态更新成功'
            });
            
        } catch (error) {
            console.error('更新里程碑状态失败:', error);
            res.status(500).json({
                success: false,
                message: '更新里程碑状态失败',
                error: error.message
            });
        }
    },
    
    /**
     * 删除里程碑
     * @param {Object} req - 请求对象
     * @param {Object} res - 响应对象
     */
    deleteMilestone: async (req, res) => {
        try {
            const pool = await poolPromise;
            const { id } = req.params;
            
            if (!id) {
                return res.status(400).json({
                    success: false,
                    message: '里程碑ID不能为空'
                });
            }
            
            const query = 'DELETE FROM PlanMilestones WHERE ID = @id';
            
            await pool.request()
                .input('id', sql.Int, parseInt(id))
                .query(query);
            
            res.json({
                success: true,
                message: '里程碑删除成功'
            });
            
        } catch (error) {
            console.error('删除里程碑失败:', error);
            res.status(500).json({
                success: false,
                message: '删除里程碑失败',
                error: error.message
            });
        }
    },
    
    // 模板（占位符）
    getTemplateList: async (req, res) => {
        res.status(501).json({ success: false, message: '功能开发中' });
    },
    getTemplateById: async (req, res) => {
        res.status(501).json({ success: false, message: '功能开发中' });
    },
    createTemplate: async (req, res) => {
        res.status(501).json({ success: false, message: '功能开发中' });
    },
    updateTemplate: async (req, res) => {
        res.status(501).json({ success: false, message: '功能开发中' });
    },
    deleteTemplate: async (req, res) => {
        res.status(501).json({ success: false, message: '功能开发中' });
    },
    createPlanFromTemplate: async (req, res) => {
        res.status(501).json({ success: false, message: '功能开发中' });
    },
    
    // 提醒（占位符）
    getReminderList: async (req, res) => {
        res.status(501).json({ success: false, message: '功能开发中' });
    },
    createReminder: async (req, res) => {
        res.status(501).json({ success: false, message: '功能开发中' });
    },
    markReminderAsRead: async (req, res) => {
        res.status(501).json({ success: false, message: '功能开发中' });
    },
    deleteReminder: async (req, res) => {
        res.status(501).json({ success: false, message: '功能开发中' });
    },
    
    // 统计分析功能
    
    /**
     * 获取统计概览数据
     * @param {Object} req - 请求对象
     * @param {Object} res - 响应对象
     */
    getStatisticsOverview: async (req, res) => {
        try {
            const pool = await poolPromise;
            const { startDate, endDate } = req.query;
            
            let dateCondition = '';
            const request = pool.request();
            
            if (startDate && endDate) {
                dateCondition = 'AND wp.CreatedAt BETWEEN @startDate AND @endDate';
                request.input('startDate', sql.Date, startDate)
                       .input('endDate', sql.Date, endDate);
            }
            
            // 获取总体统计
            const overviewQuery = `
                SELECT 
                    COUNT(*) as TotalPlans,
                    SUM(CASE WHEN Status = 'completed' THEN 1 ELSE 0 END) as CompletedPlans,
                    SUM(CASE WHEN Status = 'in_progress' THEN 1 ELSE 0 END) as InProgressPlans,
                    SUM(CASE WHEN Status = 'pending' THEN 1 ELSE 0 END) as PendingPlans,
                    SUM(CASE WHEN Status = 'cancelled' THEN 1 ELSE 0 END) as CancelledPlans,
                    SUM(CASE WHEN Status IN ('pending', 'in_progress') AND EndDate < GETDATE() THEN 1 ELSE 0 END) as OverduePlans,
                    AVG(CAST(Progress as FLOAT)) as AvgProgress,
                    SUM(EstimatedHours) as TotalEstimatedHours,
                    SUM(ActualHours) as TotalActualHours
                FROM WorkPlans wp
                WHERE 1=1 ${dateCondition}
            `;
            
            const overviewResult = await request.query(overviewQuery);
            const overview = overviewResult.recordset[0];
            
            // 计算完成率
            const completionRate = overview.TotalPlans > 0 
                ? (overview.CompletedPlans / overview.TotalPlans * 100).toFixed(2)
                : 0;
            
            res.json({
                success: true,
                data: {
                    totalPlans: overview.TotalPlans || 0,
                    completedPlans: overview.CompletedPlans || 0,
                    inProgressPlans: overview.InProgressPlans || 0,
                    pendingPlans: overview.PendingPlans || 0,
                    overduePlans: overview.OverduePlans || 0,
                    avgProgress: overview.AvgProgress || 0,
                    completionRate: parseFloat(completionRate),
                    totalEstimatedHours: overview.TotalEstimatedHours || 0,
                    totalActualHours: overview.TotalActualHours || 0
                }
            });
            
        } catch (error) {
            console.error('获取统计概览失败:', error);
            res.status(500).json({
                success: false,
                message: '获取统计概览失败',
                error: error.message
            });
        }
    },
    
    /**
     * 获取完成率统计
     * @param {Object} req - 请求对象
     * @param {Object} res - 响应对象
     */
    getCompletionRateStats: async (req, res) => {
        try {
            const pool = await poolPromise;
            const { period = 'month' } = req.query; // month, quarter, year
            
            let dateFormat, groupBy;
            switch (period) {
                case 'quarter':
                    dateFormat = "CONCAT(YEAR(wp.CreatedAt), '-Q', DATEPART(QUARTER, wp.CreatedAt))";
                    groupBy = "YEAR(wp.CreatedAt), DATEPART(QUARTER, wp.CreatedAt)";
                    break;
                case 'year':
                    dateFormat = "YEAR(wp.CreatedAt)";
                    groupBy = "YEAR(wp.CreatedAt)";
                    break;
                default: // month
                    dateFormat = "FORMAT(wp.CreatedAt, 'yyyy-MM')";
                    groupBy = "YEAR(wp.CreatedAt), MONTH(wp.CreatedAt)";
            }
            
            const query = `
                SELECT 
                    ${dateFormat} as Period,
                    COUNT(*) as TotalPlans,
                    SUM(CASE WHEN Status = 'completed' THEN 1 ELSE 0 END) as CompletedPlans,
                    CASE 
                        WHEN COUNT(*) > 0 THEN 
                            CAST(SUM(CASE WHEN Status = 'completed' THEN 1 ELSE 0 END) * 100.0 / COUNT(*) as DECIMAL(5,2))
                        ELSE 0 
                    END as CompletionRate
                FROM WorkPlans wp
                WHERE wp.CreatedAt >= DATEADD(YEAR, -1, GETDATE())
                GROUP BY ${groupBy}
                ORDER BY ${groupBy}
            `;
            
            const result = await pool.request().query(query);
            
            res.json({
                success: true,
                data: result.recordset
            });
            
        } catch (error) {
            console.error('获取完成率统计失败:', error);
            res.status(500).json({
                success: false,
                message: '获取完成率统计失败',
                error: error.message
            });
        }
    },
    
    /**
     * 获取工作量统计
     * @param {Object} req - 请求对象
     * @param {Object} res - 响应对象
     */
    getWorkloadStats: async (req, res) => {
        try {
            const pool = await poolPromise;
            
            // 按工作类型统计
            const typeStatsQuery = `
                SELECT 
                    wt.TypeName,
                    COUNT(wp.ID) as PlanCount,
                    SUM(wp.EstimatedHours) as EstimatedHours,
                    SUM(wp.ActualHours) as ActualHours,
                    AVG(CAST(wp.Progress as FLOAT)) as AvgProgress
                FROM WorkPlans wp
                LEFT JOIN WorkTypes wt ON wp.WorkTypeID = wt.ID
                WHERE 1=1
                GROUP BY wt.TypeName
                ORDER BY PlanCount DESC
            `;
            
            // 按优先级统计
            const priorityStatsQuery = `
                SELECT 
                    Priority,
                    COUNT(*) as PlanCount,
                    SUM(EstimatedHours) as EstimatedHours,
                    SUM(ActualHours) as ActualHours
                FROM WorkPlans
                WHERE 1=1
                GROUP BY Priority
                ORDER BY 
                    CASE Priority 
                        WHEN 'high' THEN 1 
                        WHEN 'medium' THEN 2 
                        WHEN 'low' THEN 3 
                        ELSE 4 
                    END
            `;
            
            // 按人员统计
            const userStatsQuery = `
                SELECT TOP 10
                    u.RealName as UserName,
                    COUNT(wp.ID) as PlanCount,
                    SUM(CASE WHEN wp.Status = 'completed' THEN 1 ELSE 0 END) as CompletedCount,
                    SUM(wp.EstimatedHours) as EstimatedHours,
                    SUM(wp.ActualHours) as ActualHours,
                    AVG(CAST(wp.Progress as FLOAT)) as AvgProgress
                FROM WorkPlans wp
                LEFT JOIN [User] u ON wp.AssignedTo = u.ID
                WHERE u.RealName IS NOT NULL
                GROUP BY u.RealName
                ORDER BY PlanCount DESC
            `;
            
            const [typeStats, priorityStats, userStats] = await Promise.all([
                pool.request().query(typeStatsQuery),
                pool.request().query(priorityStatsQuery),
                pool.request().query(userStatsQuery)
            ]);
            
            res.json({
                success: true,
                data: {
                    typeStats: typeStats.recordset,
                    priorityStats: priorityStats.recordset,
                    userStats: userStats.recordset
                }
            });
            
        } catch (error) {
            console.error('获取工作量统计失败:', error);
            res.status(500).json({
                success: false,
                message: '获取工作量统计失败',
                error: error.message
            });
        }
    },
    
    /**
     * 获取部门统计
     * @param {Object} req - 请求对象
     * @param {Object} res - 响应对象
     */
    getDepartmentStats: async (req, res) => {
        try {
            const pool = await poolPromise;
            
            const query = `
                SELECT 
                    d.Name as DepartmentName,
                    COUNT(wp.ID) as TotalPlans,
                    SUM(CASE WHEN wp.Status = 'completed' THEN 1 ELSE 0 END) as CompletedPlans,
                    SUM(CASE WHEN wp.Status = 'in_progress' THEN 1 ELSE 0 END) as InProgressPlans,
                    SUM(CASE WHEN wp.Status = 'pending' THEN 1 ELSE 0 END) as PendingPlans,
                    SUM(wp.EstimatedHours) as TotalEstimatedHours,
                    SUM(wp.ActualHours) as TotalActualHours,
                    AVG(CAST(wp.Progress as FLOAT)) as AvgProgress,
                    CASE 
                        WHEN COUNT(wp.ID) > 0 THEN 
                            CAST(SUM(CASE WHEN wp.Status = 'completed' THEN 1 ELSE 0 END) * 100.0 / COUNT(wp.ID) as DECIMAL(5,2))
                        ELSE 0 
                    END as CompletionRate
                FROM Department d
                LEFT JOIN [User] u ON d.ID = u.DepartmentID
                LEFT JOIN WorkPlans wp ON u.ID = wp.AssignedTo
                WHERE 1=1
                GROUP BY d.Name
                HAVING COUNT(wp.ID) > 0
                ORDER BY TotalPlans DESC
            `;
            
            const result = await pool.request().query(query);
            
            res.json({
                success: true,
                data: result.recordset
            });
            
        } catch (error) {
            console.error('获取部门统计失败:', error);
            res.status(500).json({
                success: false,
                message: '获取部门统计失败',
                error: error.message
            });
        }
    },
    
    /**
     * 导出统计报告
     * @param {Object} req - 请求对象
     * @param {Object} res - 响应对象
     */
    exportStatistics: async (req, res) => {
        try {
            const pool = await poolPromise;
            const { startDate, endDate } = req.query;
            
            let dateCondition = '';
            const request = pool.request();
            
            if (startDate && endDate) {
                dateCondition = 'AND wp.CreatedAt BETWEEN @startDate AND @endDate';
                request.input('startDate', sql.Date, startDate)
                       .input('endDate', sql.Date, endDate);
            }
            
            // 获取详细统计数据
            const detailQuery = `
                SELECT 
                    wp.PlanName as '计划标题',
                    wt.TypeName as '工作类型',
                    wp.Priority as '优先级',
                    wp.Status as '状态',
                    wp.Progress as '进度(%)',
                    assignee.RealName as '负责人',
                    dept.Name as '所属部门',
                    wp.EstimatedHours as '预估工时',
                    wp.ActualHours as '实际工时',
                    wp.StartDate as '开始日期',
                    wp.EndDate as '截止日期',
                    wp.CreatedAt as '创建时间',
                    wp.CompletedAt as '完成时间'
                FROM WorkPlans wp
                LEFT JOIN WorkTypes wt ON wp.WorkTypeID = wt.ID
                LEFT JOIN [User] assignee ON wp.AssignedTo = assignee.ID
                LEFT JOIN Department dept ON assignee.DepartmentID = dept.ID
                WHERE 1=1 ${dateCondition}
                ORDER BY wp.CreatedAt DESC
            `;
            
            const result = await request.query(detailQuery);
            
            // 创建Excel工作簿
            const workbook = new ExcelJS.Workbook();
            const worksheet = workbook.addWorksheet('工作计划统计');
            
            // 设置列标题
            const columns = Object.keys(result.recordset[0] || {});
            worksheet.columns = columns.map(col => ({
                header: col,
                key: col,
                width: 20
            }));
            
            // 添加数据
            result.recordset.forEach(row => {
                worksheet.addRow(row);
            });
            
            // 设置响应头
            const fileName = `工作计划统计_${moment().format('YYYY-MM-DD')}.xlsx`;
            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(fileName)}"`);
            
            // 输出Excel文件
            await workbook.xlsx.write(res);
            res.end();
            
        } catch (error) {
            console.error('导出统计报告失败:', error);
            res.status(500).json({
                success: false,
                message: '导出统计报告失败',
                error: error.message
            });
        }
    },
    
    // 辅助功能实现
    
    /**
     * 获取工作类型列表
     * @param {Object} req - 请求对象
     * @param {Object} res - 响应对象
     */
    getWorkTypes: async (req, res) => {
        try {
            const pool = await poolPromise;
            
            const query = `
                SELECT 
                    ID,
                    TypeName,
                    Description,
                    IsActive
                FROM WorkTypes 
                WHERE IsActive = 1
                ORDER BY TypeName
            `;
            
            const result = await pool.request().query(query);
            
            res.json({
                success: true,
                data: result.recordset,
                message: '工作类型获取成功'
            });
            
        } catch (error) {
            console.error('获取工作类型失败:', error);
            res.status(500).json({
                success: false,
                message: '获取工作类型失败',
                error: error.message
            });
        }
    },
    
    /**
     * 获取可分配用户列表
     * @param {Object} req - 请求对象
     * @param {Object} res - 响应对象
     */
    getAssignableUsers: async (req, res) => {
        try {
            const pool = await poolPromise;
            
            const query = `
                SELECT 
                    u.ID,
                    u.Username,
                    u.RealName,
                    u.Email,
                    d.Name as DepartmentName
                FROM [User] u
                LEFT JOIN Department d ON u.DepartmentID = d.ID
                WHERE u.Status = 1
                ORDER BY d.Name, u.RealName
            `;
            
            const result = await pool.request().query(query);
            
            res.json({
                success: true,
                data: result.recordset,
                message: '可分配用户获取成功'
            });
            
        } catch (error) {
            console.error('获取可分配用户失败:', error);
            res.status(500).json({
                success: false,
                message: '获取可分配用户失败',
                error: error.message
            });
        }
    },

    /**
     * 获取部门列表
     * @param {Object} req - 请求对象
     * @param {Object} res - 响应对象
     */
    getDepartments: async (req, res) => {
        try {
            const pool = await poolPromise;
            
            const query = `
                SELECT 
                    ID,
                    Name,
                    DeptCode,
                    ParentID
                FROM Department
                WHERE Status = 1
                ORDER BY SortOrder, Name
            `;
            
            const result = await pool.request().query(query);
            
            // 构建树形结构数据，适配el-cascader组件
            const departments = result.recordset;
            const tree = buildDepartmentTree(departments);
            
            res.json({
                success: true,
                data: tree,
                message: '部门列表获取成功'
            });
            
        } catch (error) {
            console.error('获取部门列表失败:', error);
            res.status(500).json({
                success: false,
                message: '获取部门列表失败',
                error: error.message
            });
        }
    },
    
    /**
     * 搜索计划（高级搜索功能）
     * @param {Object} req - 请求对象
     * @param {Object} res - 响应对象
     */
    searchPlans: async (req, res) => {
        try {
            const pool = await poolPromise;
            const {
                keyword = '',
                status = '',
                priority = '',
                workTypeId = '',
                assigneeId = '',
                departmentId = '',
                startDate = '',
                endDate = '',
                page = 1,
                pageSize = 20
            } = req.query;
            
            let whereConditions = ['1=1'];
            const request = pool.request();
            
            // 关键词搜索（标题和描述）
            if (keyword) {
                whereConditions.push('(wp.PlanName LIKE @keyword OR wp.Description LIKE @keyword)');
                request.input('keyword', sql.NVarChar, `%${keyword}%`);
            }
            
            // 状态筛选
            if (status) {
                if (status.includes(',')) {
                    // 处理多个状态值
                    const statusList = status.split(',').map(s => s.trim());
                    const statusPlaceholders = statusList.map((_, index) => `@status${index}`).join(',');
                    whereConditions.push(`wp.Status IN (${statusPlaceholders})`);
                    statusList.forEach((statusValue, index) => {
                        request.input(`status${index}`, sql.NVarChar, statusValue);
                    });
                } else {
                    // 处理单个状态值
                    whereConditions.push('wp.Status = @status');
                    request.input('status', sql.NVarChar, status);
                }
            }
            
            // 优先级筛选
            if (priority) {
                whereConditions.push('wp.Priority = @priority');
                request.input('priority', sql.NVarChar, priority);
            }
            
            // 工作类型筛选
            if (workTypeId) {
                whereConditions.push('wp.WorkTypeID = @workTypeId');
                request.input('workTypeId', sql.Int, parseInt(workTypeId));
            }
            
            // 负责人筛选
            if (assigneeId) {
                whereConditions.push('wp.AssignedTo = @assigneeId');
                request.input('assigneeId', sql.Int, parseInt(assigneeId));
            }
            
            // 部门筛选
            if (departmentId) {
                whereConditions.push('assignee.DepartmentID = @departmentId');
                request.input('departmentId', sql.Int, parseInt(departmentId));
            }
            
            // 日期范围筛选
            if (startDate) {
                whereConditions.push('wp.StartDate >= @startDate');
                request.input('startDate', sql.Date, startDate);
            }
            
            if (endDate) {
                whereConditions.push('wp.EndDate <= @endDate');
                request.input('endDate', sql.Date, endDate);
            }
            
            const whereClause = whereConditions.join(' AND ');
            
            // 分页参数
            const offset = (parseInt(page) - 1) * parseInt(pageSize);
            request.input('offset', sql.Int, offset);
            request.input('pageSize', sql.Int, parseInt(pageSize));
            
            // 查询总数
            const countQuery = `
                SELECT COUNT(*) as total
                FROM WorkPlans wp
                LEFT JOIN [User] assignee ON wp.AssignedTo = assignee.ID
                WHERE ${whereClause}
            `;
            
            const countResult = await request.query(countQuery);
            const total = countResult.recordset[0].total;
            
            // 查询数据 - 使用ROW_NUMBER()实现分页以兼容旧版SQL Server
            const dataQuery = `
                SELECT * FROM (
                    SELECT 
                        wp.ID,
                        wp.PlanName as Title,
                        wp.Description,
                        wp.Status,
                        wp.Priority,
                        wp.Progress,
                        wp.StartDate,
                        wp.EndDate,
                        wp.CreatedAt,
                        wp.UpdatedAt,
                        wt.TypeName as WorkTypeName,
                        creator.RealName as CreatorName,
                        assignee.RealName as AssigneeName,
                        dept.Name as DepartmentName,
                        ROW_NUMBER() OVER (ORDER BY wp.CreatedAt DESC) as RowNum
                    FROM WorkPlans wp
                    LEFT JOIN WorkTypes wt ON wp.WorkTypeID = wt.ID
                    LEFT JOIN [User] creator ON wp.CreatedBy = creator.ID
                    LEFT JOIN [User] assignee ON wp.AssignedTo = assignee.ID
                LEFT JOIN Department dept ON assignee.DepartmentID = dept.ID
                WHERE ${whereClause}
                ) AS T
                WHERE T.RowNum BETWEEN (@offset + 1) AND (@offset + @pageSize)
                ORDER BY T.RowNum
            `;
            
            const dataResult = await request.query(dataQuery);
            
            res.json({
                success: true,
                data: {
                    list: dataResult.recordset,
                    total: total,
                    page: parseInt(page),
                    pageSize: parseInt(pageSize)
                },
                message: '计划搜索成功'
            });
            
        } catch (error) {
            console.error('搜索计划失败:', error);
            res.status(500).json({
                success: false,
                message: '搜索计划失败',
                error: error.message
            });
        }
    },
    
    /**
     * 获取计划进度历史记录
     * @param {Object} req - 请求对象
     * @param {Object} res - 响应对象
     */
    getPlanProgressHistory: async (req, res) => {
        try {
            const pool = await poolPromise;
            const { id: planId } = req.params;
            
            if (!planId) {
                return res.status(400).json({
                    success: false,
                    message: '计划ID不能为空'
                });
            }
            
            const query = `
                SELECT 
                    ph.ID,
                    ph.OldProgress,
                    ph.NewProgress,
                    ph.Description,
                    ph.UpdatedAt,
                    u.RealName as UpdaterName
                FROM PlanProgressHistory ph
                LEFT JOIN [User] u ON ph.UpdaterID = u.ID
                WHERE ph.PlanID = @planId
                ORDER BY ph.UpdatedAt DESC
            `;
            
            const result = await pool.request()
                .input('planId', sql.Int, parseInt(planId))
                .query(query);
            
            res.json({
                success: true,
                data: result.recordset,
                message: '进度历史获取成功'
            });
            
        } catch (error) {
            console.error('获取进度历史失败:', error);
            res.status(500).json({
                success: false,
                message: '获取进度历史失败',
                error: error.message
            });
        }
    },
    
    /**
     * 获取人员绩效统计
     * @param {Object} req - 请求对象
     * @param {Object} res - 响应对象
     */
    getUserStats: async (req, res) => {
        try {
            const pool = await poolPromise;
            const { startDate, endDate } = req.query;
            
            let dateCondition = '';
            if (startDate && endDate) {
                dateCondition = `AND wp.CreatedAt >= '${startDate}' AND wp.CreatedAt <= '${endDate}'`;
            }
            
            const query = `
                SELECT 
                    u.RealName as UserName,
                    d.Name as DepartmentName,
                    COUNT(wp.ID) as TotalPlans,
                    SUM(CASE WHEN wp.Status = 'completed' THEN 1 ELSE 0 END) as CompletedPlans,
                    SUM(CASE WHEN wp.Status = 'in_progress' THEN 1 ELSE 0 END) as InProgressPlans,
                    SUM(CASE WHEN wp.Status = 'pending' THEN 1 ELSE 0 END) as PendingPlans,
                    SUM(CASE WHEN wp.EndDate < GETDATE() AND wp.Status != 'completed' THEN 1 ELSE 0 END) as OverduePlans,
                    CASE 
                        WHEN COUNT(wp.ID) > 0 THEN 
                            CAST(SUM(CASE WHEN wp.Status = 'completed' THEN 1 ELSE 0 END) * 100.0 / COUNT(wp.ID) as DECIMAL(5,2))
                        ELSE 0 
                    END as CompletionRate,
                    AVG(CAST(wp.Progress as FLOAT)) as AvgProgress
                FROM [User] u
                LEFT JOIN WorkPlans wp ON u.ID = wp.AssignedTo ${dateCondition}
                LEFT JOIN Department d ON u.DepartmentID = d.ID
                WHERE u.Status = 1 AND u.RealName IS NOT NULL
                GROUP BY u.ID, u.RealName, d.Name
                HAVING COUNT(wp.ID) > 0
                ORDER BY CompletionRate DESC, TotalPlans DESC
            `;
            
            const result = await pool.request().query(query);
            
            res.json({
                success: true,
                data: result.recordset
            });
            
        } catch (error) {
            console.error('获取人员统计失败:', error);
            res.status(500).json({
                success: false,
                message: '获取人员统计失败',
                error: error.message
            });
        }
    },
    
    /**
     * 获取工作类型统计
     * @param {Object} req - 请求对象
     * @param {Object} res - 响应对象
     */
    getTypeStats: async (req, res) => {
        try {
            const pool = await poolPromise;
            const { startDate, endDate } = req.query;
            
            let dateCondition = '';
            if (startDate && endDate) {
                dateCondition = `AND wp.CreatedAt >= '${startDate}' AND wp.CreatedAt <= '${endDate}'`;
            }
            
            const query = `
                SELECT 
                    wt.TypeName,
                    COUNT(wp.ID) as TotalPlans,
                    SUM(CASE WHEN wp.Status = 'completed' THEN 1 ELSE 0 END) as CompletedPlans,
                    SUM(CASE WHEN wp.Status = 'in_progress' THEN 1 ELSE 0 END) as InProgressPlans,
                    SUM(CASE WHEN wp.Status = 'pending' THEN 1 ELSE 0 END) as PendingPlans,
                    SUM(CASE WHEN wp.EndDate < GETDATE() AND wp.Status != 'completed' THEN 1 ELSE 0 END) as OverduePlans,
                    CASE 
                        WHEN COUNT(wp.ID) > 0 THEN 
                            CAST(SUM(CASE WHEN wp.Status = 'completed' THEN 1 ELSE 0 END) * 100.0 / COUNT(wp.ID) as DECIMAL(5,2))
                        ELSE 0 
                    END as CompletionRate,
                    AVG(DATEDIFF(DAY, wp.CreatedAt, COALESCE(wp.CompletedAt, GETDATE()))) as AvgDuration
                FROM WorkTypes wt
                LEFT JOIN WorkPlans wp ON wt.ID = wp.WorkTypeID ${dateCondition}
                WHERE wt.IsActive = 1
                GROUP BY wt.ID, wt.TypeName
                HAVING COUNT(wp.ID) > 0
                ORDER BY TotalPlans DESC
            `;
            
            const result = await pool.request().query(query);
            
            res.json({
                success: true,
                data: result.recordset
            });
            
        } catch (error) {
            console.error('获取类型统计失败:', error);
            res.status(500).json({
                success: false,
                message: '获取类型统计失败',
                error: error.message
            });
        }
    },
    
    /**
     * 获取趋势统计数据
     * @param {Object} req - 请求对象
     * @param {Object} res - 响应对象
     */
    getTrendStats: async (req, res) => {
        try {
            const pool = await poolPromise;
            const { period = 'week', startDate, endDate } = req.query;
            
            let dateFormat, groupBy, dateRange;
            const now = new Date();
            
            switch (period) {
                case 'month':
                    dateFormat = "CONVERT(varchar(7), wp.CreatedAt, 120)";
                    groupBy = "YEAR(wp.CreatedAt), MONTH(wp.CreatedAt)";
                    dateRange = new Date(now.getFullYear(), now.getMonth() - 11, 1); // 最近12个月
                    break;
                case 'quarter':
                    dateFormat = "CONCAT(YEAR(wp.CreatedAt), '-Q', DATEPART(QUARTER, wp.CreatedAt))";
                    groupBy = "YEAR(wp.CreatedAt), DATEPART(QUARTER, wp.CreatedAt)";
                    dateRange = new Date(now.getFullYear() - 2, 0, 1); // 最近8个季度
                    break;
                default: // week
                    dateFormat = "CONVERT(varchar(10), wp.CreatedAt, 120)";
                    groupBy = "CAST(wp.CreatedAt as DATE)";
                    dateRange = new Date(now.getTime() - 7 * 7 * 24 * 60 * 60 * 1000); // 最近7周
            }
            
            let dateCondition = `wp.CreatedAt >= '${dateRange.toISOString().split('T')[0]}'`;
            if (startDate && endDate) {
                dateCondition = `wp.CreatedAt >= '${startDate}' AND wp.CreatedAt <= '${endDate}'`;
            }
            
            const query = `
                SELECT 
                    ${dateFormat} as dates,
                    COUNT(*) as created,
                    SUM(CASE WHEN Status = 'completed' THEN 1 ELSE 0 END) as completed,
                    SUM(CASE WHEN EndDate < GETDATE() AND Status != 'completed' THEN 1 ELSE 0 END) as overdue
                FROM WorkPlans wp
                WHERE ${dateCondition}
                GROUP BY ${dateFormat}
                ORDER BY ${dateFormat}
            `;
            
            const result = await pool.request().query(query);
            
            // 格式化数据为前端需要的格式
            const data = {
                dates: result.recordset.map(row => row.dates),
                created: result.recordset.map(row => row.created),
                completed: result.recordset.map(row => row.completed),
                overdue: result.recordset.map(row => row.overdue)
            };
            
            res.json({
                success: true,
                data: data
            });
            
        } catch (error) {
            console.error('获取趋势统计失败:', error);
            res.status(500).json({
                success: false,
                message: '获取趋势统计失败',
                error: error.message
            });
        }
    },
    
    /**
     * 获取状态分布统计
     * @param {Object} req - 请求对象
     * @param {Object} res - 响应对象
     */
    getStatusStats: async (req, res) => {
        try {
            const pool = await poolPromise;
            const { startDate, endDate } = req.query;
            
            let dateCondition = '';
            if (startDate && endDate) {
                dateCondition = `AND CreatedAt >= '${startDate}' AND CreatedAt <= '${endDate}'`;
            }
            
            const query = `
                SELECT 
                    CASE Status
                        WHEN 'pending' THEN '待开始'
                        WHEN 'in_progress' THEN '进行中'
                        WHEN 'completed' THEN '已完成'
                        WHEN 'cancelled' THEN '已取消'
                        ELSE '其他'
                    END as name,
                    COUNT(*) as value
                FROM WorkPlans
                WHERE 1=1 ${dateCondition}
                GROUP BY Status
                ORDER BY value DESC
            `;
            
            const result = await pool.request().query(query);
            
            res.json({
                success: true,
                data: result.recordset
            });
            
        } catch (error) {
            console.error('获取状态统计失败:', error);
            res.status(500).json({
                success: false,
                message: '获取状态统计失败',
                error: error.message
            });
        }
    }
};

/**
 * 构建部门树形结构数据，适配el-cascader组件
 * @param {Array} departments - 部门数据数组
 * @param {Number} parentId - 父部门ID，默认为null（根节点）
 * @returns {Array} 树形结构的部门数据
 */
function buildDepartmentTree(departments, parentId = null) {
    const tree = [];
    
    for (const dept of departments) {
        if (dept.ParentID === parentId) {
            const children = buildDepartmentTree(departments, dept.ID);
            const node = {
                value: dept.ID,
                label: dept.Name,
                children: children.length > 0 ? children : undefined
            };
            tree.push(node);
        }
    }
    
    return tree;
}