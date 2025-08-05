-- =====================================================
-- 工作计划管理系统菜单初始化脚本
-- 功能：添加工作计划管理相关菜单项
-- 版本：v1.0
-- 创建日期：2025-01-27
-- =====================================================

USE [DMS-QA];
GO

PRINT '开始添加工作计划管理系统菜单...';

-- =====================================================
-- 1. 添加工作计划管理顶级菜单
-- =====================================================
DECLARE @WorkPlanMenuId INT;

IF NOT EXISTS (SELECT * FROM [dbo].[Menus] WHERE MenuCode = 'work-plan')
BEGIN
    INSERT INTO [dbo].[Menus] (
        [MenuCode], [MenuName], [MenuType], [Icon], [Path], 
        [Permission], [SortOrder], [Visible], [Status], [Description]
    ) VALUES (
        'work-plan', N'工作计划', 'menu', 'Calendar', '/admin/work-plan', 
        'work-plan:view', 50, 1, 1, N'工作计划管理模块，包含计划制定、日志记录、进度跟踪等功能'
    );
    
    SET @WorkPlanMenuId = SCOPE_IDENTITY();
    PRINT '✅ 工作计划管理顶级菜单添加成功，ID: ' + CAST(@WorkPlanMenuId AS NVARCHAR(10));
END
ELSE
BEGIN
    SELECT @WorkPlanMenuId = ID FROM [dbo].[Menus] WHERE MenuCode = 'work-plan';
    PRINT '⚠️ 工作计划管理顶级菜单已存在，ID: ' + CAST(@WorkPlanMenuId AS NVARCHAR(10));
END

-- =====================================================
-- 2. 添加工作台子菜单
-- =====================================================
IF NOT EXISTS (SELECT * FROM [dbo].[Menus] WHERE MenuCode = 'work-dashboard')
BEGIN
    INSERT INTO [dbo].[Menus] (
        [ParentID], [MenuCode], [MenuName], [MenuType], [Icon], [Path], 
        [Component], [Permission], [SortOrder], [Visible], [Status], [Description]
    ) VALUES (
        @WorkPlanMenuId, 'work-dashboard', N'工作台', 'menu', 'Monitor', '/admin/work-plan/dashboard', 
        'work-plan/WorkDashboard', 'work-plan:dashboard:view', 10, 1, 1, N'工作概览、待办事项、进度统计'
    );
    PRINT '✅ 工作台子菜单添加成功';
END
ELSE
BEGIN
    PRINT '⚠️ 工作台子菜单已存在，跳过添加';
END

-- =====================================================
-- 3. 添加工作计划子菜单
-- =====================================================
IF NOT EXISTS (SELECT * FROM [dbo].[Menus] WHERE MenuCode = 'plan-management')
BEGIN
    INSERT INTO [dbo].[Menus] (
        [ParentID], [MenuCode], [MenuName], [MenuType], [Icon], [Path], 
        [Component], [Permission], [SortOrder], [Visible], [Status], [Description]
    ) VALUES (
        @WorkPlanMenuId, 'plan-management', N'计划管理', 'menu', 'List', '/admin/work-plan/plans', 
        'work-plan/PlanManagement', 'work-plan:plan:view', 20, 1, 1, N'工作计划的创建、编辑、查看和管理'
    );
    PRINT '✅ 计划管理子菜单添加成功';
END
ELSE
BEGIN
    PRINT '⚠️ 计划管理子菜单已存在，跳过添加';
END

-- =====================================================
-- 4. 添加工作日志子菜单
-- =====================================================
IF NOT EXISTS (SELECT * FROM [dbo].[Menus] WHERE MenuCode = 'work-log')
BEGIN
    INSERT INTO [dbo].[Menus] (
        [ParentID], [MenuCode], [MenuName], [MenuType], [Icon], [Path], 
        [Component], [Permission], [SortOrder], [Visible], [Status], [Description]
    ) VALUES (
        @WorkPlanMenuId, 'work-log', N'工作日志', 'menu', 'EditPen', '/admin/work-plan/logs', 
        'work-plan/WorkLogManagement', 'work-plan:log:view', 30, 1, 1, N'工作日志的记录、查看和统计分析'
    );
    PRINT '✅ 工作日志子菜单添加成功';
END
ELSE
BEGIN
    PRINT '⚠️ 工作日志子菜单已存在，跳过添加';
END

-- =====================================================
-- 5. 添加进度跟踪子菜单
-- =====================================================
IF NOT EXISTS (SELECT * FROM [dbo].[Menus] WHERE MenuCode = 'progress-tracking')
BEGIN
    INSERT INTO [dbo].[Menus] (
        [ParentID], [MenuCode], [MenuName], [MenuType], [Icon], [Path], 
        [Component], [Permission], [SortOrder], [Visible], [Status], [Description]
    ) VALUES (
        @WorkPlanMenuId, 'progress-tracking', N'进度跟踪', 'menu', 'TrendCharts', '/admin/work-plan/progress', 
        'work-plan/ProgressTracking', 'work-plan:progress:view', 40, 1, 1, N'项目进度可视化跟踪和里程碑管理'
    );
    PRINT '✅ 进度跟踪子菜单添加成功';
END
ELSE
BEGIN
    PRINT '⚠️ 进度跟踪子菜单已存在，跳过添加';
END

-- =====================================================
-- 6. 添加统计分析子菜单
-- =====================================================
IF NOT EXISTS (SELECT * FROM [dbo].[Menus] WHERE MenuCode = 'work-statistics')
BEGIN
    INSERT INTO [dbo].[Menus] (
        [ParentID], [MenuCode], [MenuName], [MenuType], [Icon], [Path], 
        [Component], [Permission], [SortOrder], [Visible], [Status], [Description]
    ) VALUES (
        @WorkPlanMenuId, 'work-statistics', N'统计分析', 'menu', 'DataAnalysis', '/admin/work-plan/statistics', 
        'work-plan/WorkStatistics', 'work-plan:statistics:view', 50, 1, 1, N'工作量统计、效率分析和报表生成'
    );
    PRINT '✅ 统计分析子菜单添加成功';
END
ELSE
BEGIN
    PRINT '⚠️ 统计分析子菜单已存在，跳过添加';
END

-- =====================================================
-- 7. 添加计划模板子菜单
-- =====================================================
IF NOT EXISTS (SELECT * FROM [dbo].[Menus] WHERE MenuCode = 'plan-templates')
BEGIN
    INSERT INTO [dbo].[Menus] (
        [ParentID], [MenuCode], [MenuName], [MenuType], [Icon], [Path], 
        [Component], [Permission], [SortOrder], [Visible], [Status], [Description]
    ) VALUES (
        @WorkPlanMenuId, 'plan-templates', N'计划模板', 'menu', 'Files', '/admin/work-plan/templates', 
        'work-plan/PlanTemplates', 'work-plan:template:view', 60, 1, 1, N'计划模板的创建、管理和使用'
    );
    PRINT '✅ 计划模板子菜单添加成功';
END
ELSE
BEGIN
    PRINT '⚠️ 计划模板子菜单已存在，跳过添加';
END

-- =====================================================
-- 8. 为管理员角色分配菜单权限
-- =====================================================
DECLARE @AdminRoleId INT = (SELECT ID FROM [dbo].[Roles] WHERE RoleCode = 'admin');

IF @AdminRoleId IS NOT NULL
BEGIN
    -- 获取所有工作计划相关菜单ID
    DECLARE @MenuIds TABLE (MenuId INT);
    INSERT INTO @MenuIds (MenuId)
    SELECT ID FROM [dbo].[Menus] 
    WHERE MenuCode IN ('work-plan', 'work-dashboard', 'plan-management', 'work-log', 'progress-tracking', 'work-statistics', 'plan-templates');
    
    -- 为管理员角色分配菜单权限
    INSERT INTO [dbo].[RoleMenus] ([RoleID], [MenuID])
    SELECT @AdminRoleId, MenuId 
    FROM @MenuIds 
    WHERE NOT EXISTS (
        SELECT 1 FROM [dbo].[RoleMenus] 
        WHERE RoleID = @AdminRoleId AND MenuID = MenuId
    );
    
    PRINT '✅ 管理员角色菜单权限分配完成';
END
ELSE
BEGIN
    PRINT '⚠️ 未找到管理员角色，跳过权限分配';
END

-- =====================================================
-- 9. 添加按钮级权限（可选）
-- =====================================================
PRINT '添加按钮级权限...';

-- 计划管理相关按钮权限
IF NOT EXISTS (SELECT * FROM [dbo].[Menus] WHERE MenuCode = 'plan-add')
BEGIN
    DECLARE @PlanManagementMenuId INT = (SELECT ID FROM [dbo].[Menus] WHERE MenuCode = 'plan-management');
    
    INSERT INTO [dbo].[Menus] (
        [ParentID], [MenuCode], [MenuName], [MenuType], [Permission], [SortOrder], [Visible], [Status]
    ) VALUES 
    (@PlanManagementMenuId, 'plan-add', N'新增计划', 'button', 'work-plan:plan:add', 1, 0, 1),
    (@PlanManagementMenuId, 'plan-edit', N'编辑计划', 'button', 'work-plan:plan:edit', 2, 0, 1),
    (@PlanManagementMenuId, 'plan-delete', N'删除计划', 'button', 'work-plan:plan:delete', 3, 0, 1),
    (@PlanManagementMenuId, 'plan-export', N'导出计划', 'button', 'work-plan:plan:export', 4, 0, 1);
    
    PRINT '✅ 计划管理按钮权限添加成功';
END

-- 工作日志相关按钮权限
IF NOT EXISTS (SELECT * FROM [dbo].[Menus] WHERE MenuCode = 'log-add')
BEGIN
    DECLARE @WorkLogMenuId INT = (SELECT ID FROM [dbo].[Menus] WHERE MenuCode = 'work-log');
    
    INSERT INTO [dbo].[Menus] (
        [ParentID], [MenuCode], [MenuName], [MenuType], [Permission], [SortOrder], [Visible], [Status]
    ) VALUES 
    (@WorkLogMenuId, 'log-add', N'新增日志', 'button', 'work-plan:log:add', 1, 0, 1),
    (@WorkLogMenuId, 'log-edit', N'编辑日志', 'button', 'work-plan:log:edit', 2, 0, 1),
    (@WorkLogMenuId, 'log-delete', N'删除日志', 'button', 'work-plan:log:delete', 3, 0, 1),
    (@WorkLogMenuId, 'log-export', N'导出日志', 'button', 'work-plan:log:export', 4, 0, 1);
    
    PRINT '✅ 工作日志按钮权限添加成功';
END

-- 为管理员角色分配所有按钮权限
IF @AdminRoleId IS NOT NULL
BEGIN
    INSERT INTO [dbo].[RoleMenus] ([RoleID], [MenuID])
    SELECT @AdminRoleId, ID 
    FROM [dbo].[Menus] 
    WHERE MenuType = 'button' 
      AND (MenuCode LIKE 'plan-%' OR MenuCode LIKE 'log-%')
      AND NOT EXISTS (
          SELECT 1 FROM [dbo].[RoleMenus] 
          WHERE RoleID = @AdminRoleId AND MenuID = [Menus].ID
      );
    
    PRINT '✅ 管理员角色按钮权限分配完成';
END

-- =====================================================
-- 10. 更新菜单排序，确保工作计划菜单在合适位置
-- =====================================================
UPDATE [dbo].[Menus] SET SortOrder = 45 WHERE MenuCode = 'work-plan';
PRINT '✅ 菜单排序更新完成';

PRINT '';
PRINT '🎉 工作计划管理系统菜单初始化完成！';
PRINT '';
PRINT '已添加的菜单：';
PRINT '  📋 工作计划 (work-plan) - 顶级菜单';
PRINT '    ├── 🖥️ 工作台 (work-dashboard)';
PRINT '    ├── 📝 计划管理 (plan-management)';
PRINT '    ├── ✍️ 工作日志 (work-log)';
PRINT '    ├── 📊 进度跟踪 (progress-tracking)';
PRINT '    ├── 📈 统计分析 (work-statistics)';
PRINT '    └── 📄 计划模板 (plan-templates)';
PRINT '';
PRINT '已添加的权限：';
PRINT '  ✅ 页面访问权限';
PRINT '  ✅ 按钮操作权限';
PRINT '  ✅ 管理员角色权限分配';
PRINT '';
PRINT '下一步：';
PRINT '  1. 重启前端应用以加载新菜单';
PRINT '  2. 开发对应的Vue组件页面';
PRINT '  3. 开发后端API接口';
PRINT '  4. 为其他角色分配相应权限';
PRINT '';

GO