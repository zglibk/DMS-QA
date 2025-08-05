/**
 * 工作计划管理系统 - 路由配置
 * 功能：定义工作计划相关的API路由
 * 版本：v1.0
 * 创建日期：2025-08-05
 */

const express = require('express');
const router = express.Router();
const workPlanController = require('../controllers/workPlanController');
const { authenticateToken, checkPermission } = require('../middleware/auth');

// =====================================================
// 工作台相关路由
// =====================================================

/**
 * 获取工作台概览数据
 * GET /api/work-plan/dashboard
 */
router.get('/dashboard', 
    authenticateToken, 
    checkPermission('work-plan:dashboard:view'),
    workPlanController.getDashboardData
);

/**
 * 获取待办事项列表
 * GET /api/work-plan/dashboard/todos
 */
router.get('/dashboard/todos', 
    authenticateToken, 
    checkPermission('work-plan:dashboard:view'),
    workPlanController.getTodoList
);

/**
 * 获取最近工作日志
 * GET /api/work-plan/dashboard/recent-logs
 */
router.get('/dashboard/recent-logs', 
    authenticateToken, 
    checkPermission('work-plan:dashboard:view'),
    workPlanController.getRecentLogs
);

// =====================================================
// 工作计划相关路由
// =====================================================

/**
 * 获取工作计划列表（支持分页、筛选、搜索）
 * GET /api/work-plan/plans
 * 查询参数：page, pageSize, status, priority, assigneeId, keyword, startDate, endDate
 */
router.get('/plans', 
    authenticateToken, 
    checkPermission('work-plan:plan:view'),
    workPlanController.getPlanList
);

/**
 * 获取单个工作计划详情
 * GET /api/work-plan/plans/:id
 */
router.get('/plans/:id', 
    authenticateToken, 
    checkPermission('work-plan:plan:view'),
    workPlanController.getPlanById
);

/**
 * 创建新的工作计划
 * POST /api/work-plan/plans
 */
router.post('/plans', 
    authenticateToken, 
    checkPermission('work-plan:plan:add'),
    workPlanController.createPlan
);

/**
 * 更新工作计划
 * PUT /api/work-plan/plans/:id
 */
router.put('/plans/:id', 
    authenticateToken, 
    checkPermission('work-plan:plan:edit'),
    workPlanController.updatePlan
);

/**
 * 删除工作计划
 * DELETE /api/work-plan/plans/:id
 */
router.delete('/plans/:id', 
    authenticateToken, 
    checkPermission('work-plan:plan:delete'),
    workPlanController.deletePlan
);

/**
 * 批量删除工作计划
 * DELETE /api/work-plan/plans
 */
router.delete('/plans', 
    authenticateToken, 
    checkPermission('work-plan:plan:delete'),
    workPlanController.batchDeletePlans
);

/**
 * 更新计划状态
 * PATCH /api/work-plan/plans/:id/status
 */
router.patch('/plans/:id/status', 
    authenticateToken, 
    checkPermission('work-plan:plan:edit'),
    workPlanController.updatePlanStatus
);

/**
 * 更新计划进度
 * PATCH /api/work-plan/plans/:id/progress
 */
router.patch('/plans/:id/progress', 
    authenticateToken, 
    checkPermission('work-plan:plan:edit'),
    workPlanController.updatePlanProgress
);

/**
 * 导出工作计划
 * GET /api/work-plan/plans/export
 */
router.get('/plans/export', 
    authenticateToken, 
    checkPermission('work-plan:plan:export'),
    workPlanController.exportPlans
);

// =====================================================
// 工作日志相关路由
// =====================================================

/**
 * 获取工作日志列表（支持分页、筛选、搜索）
 * GET /api/work-plan/logs
 * 查询参数：page, pageSize, planId, userId, logDate, keyword
 */
router.get('/logs', 
    authenticateToken, 
    checkPermission('work-plan:log:view'),
    workPlanController.getLogList
);

/**
 * 获取单个工作日志详情
 * GET /api/work-plan/logs/:id
 */
router.get('/logs/:id', 
    authenticateToken, 
    checkPermission('work-plan:log:view'),
    workPlanController.getLogById
);

/**
 * 创建新的工作日志
 * POST /api/work-plan/logs
 */
router.post('/logs', 
    authenticateToken, 
    checkPermission('work-plan:log:add'),
    workPlanController.createLog
);

/**
 * 更新工作日志
 * PUT /api/work-plan/logs/:id
 */
router.put('/logs/:id', 
    authenticateToken, 
    checkPermission('work-plan:log:edit'),
    workPlanController.updateLog
);

/**
 * 删除工作日志
 * DELETE /api/work-plan/logs/:id
 */
router.delete('/logs/:id', 
    authenticateToken, 
    checkPermission('work-plan:log:delete'),
    workPlanController.deleteLog
);

/**
 * 批量删除工作日志
 * DELETE /api/work-plan/logs
 */
router.delete('/logs', 
    authenticateToken, 
    checkPermission('work-plan:log:delete'),
    workPlanController.batchDeleteLogs
);

/**
 * 导出工作日志
 * GET /api/work-plan/logs/export
 */
router.get('/logs/export', 
    authenticateToken, 
    checkPermission('work-plan:log:export'),
    workPlanController.exportLogs
);

// =====================================================
// 计划里程碑相关路由
// =====================================================

/**
 * 获取计划的里程碑列表
 * GET /api/work-plan/plans/:planId/milestones
 */
router.get('/plans/:planId/milestones', 
    authenticateToken, 
    checkPermission('work-plan:plan:view'),
    workPlanController.getPlanMilestones
);

/**
 * 创建计划里程碑
 * POST /api/work-plan/plans/:planId/milestones
 */
router.post('/plans/:planId/milestones', 
    authenticateToken, 
    checkPermission('work-plan:plan:edit'),
    workPlanController.createMilestone
);

/**
 * 更新里程碑状态
 * PATCH /api/work-plan/milestones/:id/status
 */
router.patch('/milestones/:id/status', 
    authenticateToken, 
    checkPermission('work-plan:plan:edit'),
    workPlanController.updateMilestoneStatus
);

/**
 * 删除里程碑
 * DELETE /api/work-plan/milestones/:id
 */
router.delete('/milestones/:id', 
    authenticateToken, 
    checkPermission('work-plan:plan:edit'),
    workPlanController.deleteMilestone
);

// =====================================================
// 计划模板相关路由
// =====================================================

/**
 * 获取计划模板列表
 * GET /api/work-plan/templates
 */
router.get('/templates', 
    authenticateToken, 
    checkPermission('work-plan:template:view'),
    workPlanController.getTemplateList
);

/**
 * 获取单个计划模板详情
 * GET /api/work-plan/templates/:id
 */
router.get('/templates/:id', 
    authenticateToken, 
    checkPermission('work-plan:template:view'),
    workPlanController.getTemplateById
);

/**
 * 创建计划模板
 * POST /api/work-plan/templates
 */
router.post('/templates', 
    authenticateToken, 
    checkPermission('work-plan:template:add'),
    workPlanController.createTemplate
);

/**
 * 更新计划模板
 * PUT /api/work-plan/templates/:id
 */
router.put('/templates/:id', 
    authenticateToken, 
    checkPermission('work-plan:template:edit'),
    workPlanController.updateTemplate
);

/**
 * 删除计划模板
 * DELETE /api/work-plan/templates/:id
 */
router.delete('/templates/:id', 
    authenticateToken, 
    checkPermission('work-plan:template:delete'),
    workPlanController.deleteTemplate
);

/**
 * 基于模板创建计划
 * POST /api/work-plan/templates/:id/create-plan
 */
router.post('/templates/:id/create-plan', 
    authenticateToken, 
    checkPermission('work-plan:plan:add'),
    workPlanController.createPlanFromTemplate
);

// =====================================================
// 工作提醒相关路由
// =====================================================

/**
 * 获取用户的工作提醒列表
 * GET /api/work-plan/reminders
 */
router.get('/reminders', 
    authenticateToken, 
    checkPermission('work-plan:plan:view'),
    workPlanController.getReminderList
);

/**
 * 创建工作提醒
 * POST /api/work-plan/reminders
 */
router.post('/reminders', 
    authenticateToken, 
    checkPermission('work-plan:plan:edit'),
    workPlanController.createReminder
);

/**
 * 标记提醒为已读
 * PATCH /api/work-plan/reminders/:id/read
 */
router.patch('/reminders/:id/read', 
    authenticateToken, 
    checkPermission('work-plan:plan:view'),
    workPlanController.markReminderAsRead
);

/**
 * 删除工作提醒
 * DELETE /api/work-plan/reminders/:id
 */
router.delete('/reminders/:id', 
    authenticateToken, 
    checkPermission('work-plan:plan:edit'),
    workPlanController.deleteReminder
);

// =====================================================
// 统计分析相关路由
// =====================================================

/**
 * 获取工作统计数据
 * GET /api/work-plan/statistics/overview
 * 查询参数：startDate, endDate, userId, departmentId
 */
router.get('/statistics/overview', 
    authenticateToken, 
    checkPermission('work-plan:statistics:view'),
    workPlanController.getStatisticsOverview
);

/**
 * 获取计划完成率统计
 * GET /api/work-plan/statistics/completion-rate
 */
router.get('/statistics/completion-rate', 
    authenticateToken, 
    checkPermission('work-plan:statistics:view'),
    workPlanController.getCompletionRateStats
);

/**
 * 获取工作量统计
 * GET /api/work-plan/statistics/workload
 */
router.get('/statistics/workload', 
    authenticateToken, 
    checkPermission('work-plan:statistics:view'),
    workPlanController.getWorkloadStats
);

/**
 * 获取部门工作统计
 * GET /api/work-plan/statistics/department
 */
router.get('/statistics/department', 
    authenticateToken, 
    checkPermission('work-plan:statistics:view'),
    workPlanController.getDepartmentStats
);

/**
 * 导出统计报表
 * GET /api/work-plan/statistics/export
 */
router.get('/statistics/export', 
    authenticateToken, 
    checkPermission('work-plan:statistics:export'),
    workPlanController.exportStatistics
);

// =====================================================
// 辅助功能路由
// =====================================================

/**
 * 获取工作类型字典
 * GET /api/work-plan/work-types
 */
router.get('/work-types', 
    authenticateToken, 
    workPlanController.getWorkTypes
);

/**
 * 获取可分配的用户列表
 * GET /api/work-plan/assignable-users
 */
router.get('/assignable-users', 
    authenticateToken, 
    checkPermission('work-plan:plan:view'),
    workPlanController.getAssignableUsers
);

/**
 * 搜索计划（用于关联选择）
 * GET /api/work-plan/search-plans
 */
router.get('/search-plans', 
    authenticateToken, 
    checkPermission('work-plan:plan:view'),
    workPlanController.searchPlans
);

/**
 * 获取计划进度历史
 * GET /api/work-plan/plans/:id/progress-history
 */
router.get('/plans/:id/progress-history', 
    authenticateToken, 
    checkPermission('work-plan:plan:view'),
    workPlanController.getPlanProgressHistory
);

module.exports = router;