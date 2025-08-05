/**
 * 工作计划管理系统 - 控制器
 * 功能：处理工作计划相关的业务逻辑
 * 版本：v1.0
 * 创建日期：2025-01-27
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
        const userId = req.user.id;
        
        // 获取用户的计划统计
        const planStatsQuery = `
            SELECT 
                COUNT(*) as totalPlans,
                SUM(CASE WHEN Status = 'pending' THEN 1 ELSE 0 END) as pendingPlans,
                SUM(CASE WHEN Status = 'in_progress' THEN 1 ELSE 0 END) as inProgressPlans,
                SUM(CASE WHEN Status = 'completed' THEN 1 ELSE 0 END) as completedPlans,
                SUM(CASE WHEN Status = 'overdue' THEN 1 ELSE 0 END) as overduePlans,
                AVG(CAST(Progress as FLOAT)) as avgProgress
            FROM WorkPlans 
            WHERE AssigneeID = @userId AND IsDeleted = 0
        `;
        
        const planStatsResult = await pool.request()
            .input('userId', sql.Int, userId)
            .query(planStatsQuery);
        
        // 获取今日工作日志数量
        const todayLogsQuery = `
            SELECT COUNT(*) as todayLogs
            FROM WorkLogs 
            WHERE UserID = @userId 
              AND CAST(LogDate as DATE) = CAST(GETDATE() as DATE)
              AND IsDeleted = 0
        `;
        
        const todayLogsResult = await pool.request()
            .input('userId', sql.Int, userId)
            .query(todayLogsQuery);
        
        // 获取即将到期的计划（7天内）
        const upcomingPlansQuery = `
            SELECT COUNT(*) as upcomingPlans
            FROM WorkPlans 
            WHERE AssigneeID = @userId 
              AND Status IN ('pending', 'in_progress')
              AND EndDate BETWEEN GETDATE() AND DATEADD(day, 7, GETDATE())
              AND IsDeleted = 0
        `;
        
        const upcomingPlansResult = await pool.request()
            .input('userId', sql.Int, userId)
            .query(upcomingPlansQuery);
        
        // 获取未读提醒数量
        const unreadRemindersQuery = `
            SELECT COUNT(*) as unreadReminders
            FROM WorkReminders 
            WHERE UserID = @userId 
              AND IsRead = 0 
              AND IsDeleted = 0
        `;
        
        const unreadRemindersResult = await pool.request()
            .input('userId', sql.Int, userId)
            .query(unreadRemindersQuery);
        
        const dashboardData = {
            planStats: planStatsResult.recordset[0],
            todayLogs: todayLogsResult.recordset[0].todayLogs,
            upcomingPlans: upcomingPlansResult.recordset[0].upcomingPlans,
            unreadReminders: unreadRemindersResult.recordset[0].unreadReminders
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
        const userId = req.user.id;
        const { limit = 10 } = req.query;
        
        const query = `
            SELECT TOP (@limit)
                wp.ID,
                wp.Title,
                wp.Priority,
                wp.EndDate,
                wp.Progress,
                wp.Status,
                wt.TypeName as WorkTypeName,
                DATEDIFF(day, GETDATE(), wp.EndDate) as DaysRemaining
            FROM WorkPlans wp
            LEFT JOIN WorkTypes wt ON wp.WorkTypeID = wt.ID
            WHERE wp.AssigneeID = @userId 
              AND wp.Status IN ('pending', 'in_progress')
              AND wp.IsDeleted = 0
            ORDER BY 
                CASE wp.Priority 
                    WHEN 'high' THEN 1 
                    WHEN 'medium' THEN 2 
                    WHEN 'low' THEN 3 
                END,
                wp.EndDate ASC
        `;
        
        const result = await pool.request()
            .input('userId', sql.Int, userId)
            .input('limit', sql.Int, parseInt(limit))
            .query(query);
        
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
        const userId = req.user.id;
        const { limit = 5 } = req.query;
        
        const query = `
            SELECT TOP (@limit)
                wl.ID,
                wl.LogDate,
                wl.WorkHours,
                wl.Content,
                wl.Issues,
                wp.Title as PlanTitle
            FROM WorkLogs wl
            LEFT JOIN WorkPlans wp ON wl.PlanID = wp.ID
            WHERE wl.UserID = @userId AND wl.IsDeleted = 0
            ORDER BY wl.LogDate DESC, wl.CreatedAt DESC
        `;
        
        const result = await pool.request()
            .input('userId', sql.Int, userId)
            .input('limit', sql.Int, parseInt(limit))
            .query(query);
        
        res.json({
            success: true,
            data: result.recordset,
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
        let whereConditions = ['wp.IsDeleted = 0'];
        const params = {};
        
        if (status) {
            whereConditions.push('wp.Status = @status');
            params.status = status;
        }
        
        if (priority) {
            whereConditions.push('wp.Priority = @priority');
            params.priority = priority;
        }
        
        if (assigneeId) {
            whereConditions.push('wp.AssigneeID = @assigneeId');
            params.assigneeId = parseInt(assigneeId);
        }
        
        if (workTypeId) {
            whereConditions.push('wp.WorkTypeID = @workTypeId');
            params.workTypeId = parseInt(workTypeId);
        }
        
        if (keyword) {
            whereConditions.push('(wp.Title LIKE @keyword OR wp.Description LIKE @keyword)');
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
        
        const whereClause = whereConditions.join(' AND ');
        
        // 查询总数
        const countQuery = `
            SELECT COUNT(*) as total
            FROM WorkPlans wp
            WHERE ${whereClause}
        `;
        
        // 查询数据
        const dataQuery = `
            SELECT 
                wp.ID,
                wp.Title,
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
                u2.Username as AssigneeName,
                d.DepartmentName
            FROM WorkPlans wp
            LEFT JOIN WorkTypes wt ON wp.WorkTypeID = wt.ID
            LEFT JOIN [User] u1 ON wp.CreatorID = u1.ID
            LEFT JOIN [User] u2 ON wp.AssigneeID = u2.ID
            LEFT JOIN Department d ON u2.DepartmentID = d.ID
            WHERE ${whereClause}
            ORDER BY wp.CreatedAt DESC
            OFFSET @offset ROWS
            FETCH NEXT @pageSize ROWS ONLY
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
                u2.Username as AssigneeName,
                d.DepartmentName
            FROM WorkPlans wp
            LEFT JOIN WorkTypes wt ON wp.WorkTypeID = wt.ID
            LEFT JOIN [User] u1 ON wp.CreatorID = u1.ID
            LEFT JOIN [User] u2 ON wp.AssigneeID = u2.ID
            LEFT JOIN Department d ON u2.DepartmentID = d.ID
            WHERE wp.ID = @id AND wp.IsDeleted = 0
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
            WHERE PlanID = @id AND IsDeleted = 0
            ORDER BY TargetDate ASC
        `;
        
        const milestonesResult = await pool.request()
            .input('id', sql.Int, id)
            .query(milestonesQuery);
        
        const planData = {
            ...result.recordset[0],
            milestones: milestonesResult.recordset
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
        const userId = req.user.id;
        const {
            title,
            description,
            workTypeId,
            priority = 'medium',
            assigneeId,
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
            // 插入工作计划
            const insertPlanQuery = `
                INSERT INTO WorkPlans (
                    Title, Description, WorkTypeID, Priority, CreatorID, AssigneeID,
                    StartDate, EndDate, EstimatedHours, Status, Progress, CreatedAt, UpdatedAt
                ) VALUES (
                    @title, @description, @workTypeId, @priority, @creatorId, @assigneeId,
                    @startDate, @endDate, @estimatedHours, 'pending', 0, GETDATE(), GETDATE()
                );
                SELECT SCOPE_IDENTITY() as planId;
            `;
            
            const planResult = await transaction.request()
                .input('title', sql.NVarChar, title)
                .input('description', sql.NVarChar, description || '')
                .input('workTypeId', sql.Int, workTypeId)
                .input('priority', sql.NVarChar, priority)
                .input('creatorId', sql.Int, userId)
                .input('assigneeId', sql.Int, assigneeId)
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
                            PlanID, Title, Description, TargetDate, Status, CreatedAt
                        ) VALUES (
                            @planId, @title, @description, @targetDate, 'pending', GETDATE()
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
            startDate,
            endDate,
            estimatedHours,
            actualHours,
            progress,
            status
        } = req.body;
        
        // 检查计划是否存在
        const checkQuery = `
            SELECT ID FROM WorkPlans 
            WHERE ID = @id AND IsDeleted = 0
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
            updateFields.push('AssigneeID = @assigneeId');
            params.assigneeId = assigneeId;
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
        
        // 软删除
        const query = `
            UPDATE WorkPlans 
            SET IsDeleted = 1, UpdatedAt = GETDATE()
            WHERE ID = @id AND IsDeleted = 0
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
    
    // 其他功能（占位符，需要继续实现）
    batchDeletePlans: async (req, res) => {
        res.status(501).json({ success: false, message: '功能开发中' });
    },
    updatePlanStatus: async (req, res) => {
        res.status(501).json({ success: false, message: '功能开发中' });
    },
    updatePlanProgress: async (req, res) => {
        res.status(501).json({ success: false, message: '功能开发中' });
    },
    exportPlans: async (req, res) => {
        res.status(501).json({ success: false, message: '功能开发中' });
    },
    
    // 工作日志（占位符）
    getLogList: async (req, res) => {
        res.status(501).json({ success: false, message: '功能开发中' });
    },
    getLogById: async (req, res) => {
        res.status(501).json({ success: false, message: '功能开发中' });
    },
    createLog: async (req, res) => {
        res.status(501).json({ success: false, message: '功能开发中' });
    },
    updateLog: async (req, res) => {
        res.status(501).json({ success: false, message: '功能开发中' });
    },
    deleteLog: async (req, res) => {
        res.status(501).json({ success: false, message: '功能开发中' });
    },
    batchDeleteLogs: async (req, res) => {
        res.status(501).json({ success: false, message: '功能开发中' });
    },
    exportLogs: async (req, res) => {
        res.status(501).json({ success: false, message: '功能开发中' });
    },
    
    // 里程碑（占位符）
    getPlanMilestones: async (req, res) => {
        res.status(501).json({ success: false, message: '功能开发中' });
    },
    createMilestone: async (req, res) => {
        res.status(501).json({ success: false, message: '功能开发中' });
    },
    updateMilestoneStatus: async (req, res) => {
        res.status(501).json({ success: false, message: '功能开发中' });
    },
    deleteMilestone: async (req, res) => {
        res.status(501).json({ success: false, message: '功能开发中' });
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
    
    // 统计（占位符）
    getStatisticsOverview: async (req, res) => {
        res.status(501).json({ success: false, message: '功能开发中' });
    },
    getCompletionRateStats: async (req, res) => {
        res.status(501).json({ success: false, message: '功能开发中' });
    },
    getWorkloadStats: async (req, res) => {
        res.status(501).json({ success: false, message: '功能开发中' });
    },
    getDepartmentStats: async (req, res) => {
        res.status(501).json({ success: false, message: '功能开发中' });
    },
    exportStatistics: async (req, res) => {
        res.status(501).json({ success: false, message: '功能开发中' });
    },
    
    // 辅助功能（占位符）
    getWorkTypes: async (req, res) => {
        res.status(501).json({ success: false, message: '功能开发中' });
    },
    getAssignableUsers: async (req, res) => {
        res.status(501).json({ success: false, message: '功能开发中' });
    },
    searchPlans: async (req, res) => {
        res.status(501).json({ success: false, message: '功能开发中' });
    },
    getPlanProgressHistory: async (req, res) => {
        res.status(501).json({ success: false, message: '功能开发中' });
    }
};