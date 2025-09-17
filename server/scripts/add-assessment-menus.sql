-- =====================================================
-- 考核记录管理菜单添加脚本
-- 功能：为系统添加考核记录管理相关菜单项
-- 版本：v1.0
-- 创建日期：2025-01-27
-- =====================================================

USE [DMS-QA];
GO

PRINT '开始添加考核记录管理菜单...';

-- =====================================================
-- 1. 添加考核记录管理顶级菜单
-- =====================================================
DECLARE @AssessmentMenuId INT;

IF NOT EXISTS (SELECT * FROM [dbo].[Menus] WHERE MenuCode = 'assessment-records')
BEGIN
    INSERT INTO [dbo].[Menus] (
        [MenuCode], [MenuName], [MenuType], [Icon], [Path], 
        [Permission], [SortOrder], [Visible], [Status], [Description]
    ) VALUES (
        'assessment-records', N'考核记录管理', 'menu', 'DocumentText', '/admin/assessment-records', 
        'assessment:view', 40, 1, 1, N'供应商质量考核记录管理模块，包含考核记录、改善跟踪、统计分析等功能'
    );
    
    SET @AssessmentMenuId = SCOPE_IDENTITY();
    PRINT '✅ 考核记录管理顶级菜单添加成功，ID: ' + CAST(@AssessmentMenuId AS NVARCHAR(10));
END
ELSE
BEGIN
    SELECT @AssessmentMenuId = ID FROM [dbo].[Menus] WHERE MenuCode = 'assessment-records';
    PRINT '⚠️ 考核记录管理顶级菜单已存在，ID: ' + CAST(@AssessmentMenuId AS NVARCHAR(10));
END

-- =====================================================
-- 2. 添加考核记录管理子菜单
-- =====================================================
IF NOT EXISTS (SELECT * FROM [dbo].[Menus] WHERE MenuCode = 'assessment-management')
BEGIN
    INSERT INTO [dbo].[Menus] (
        [ParentID], [MenuCode], [MenuName], [MenuType], [Icon], [Path], 
        [Component], [Permission], [SortOrder], [Visible], [Status], [Description]
    ) VALUES (
        @AssessmentMenuId, 'assessment-management', N'考核记录管理', 'menu', 'List', '/admin/assessment-records/management', 
        'assessment/AssessmentRecords', 'assessment:records:view', 10, 1, 1, N'供应商质量考核记录的查看、编辑和管理'
    );
    PRINT '✅ 考核记录管理子菜单添加成功';
END
ELSE
BEGIN
    PRINT '⚠️ 考核记录管理子菜单已存在，跳过添加';
END

-- =====================================================
-- 3. 添加改善期跟踪子菜单
-- =====================================================
IF NOT EXISTS (SELECT * FROM [dbo].[Menus] WHERE MenuCode = 'improvement-tracking')
BEGIN
    INSERT INTO [dbo].[Menus] (
        [ParentID], [MenuCode], [MenuName], [MenuType], [Icon], [Path], 
        [Component], [Permission], [SortOrder], [Visible], [Status], [Description]
    ) VALUES (
        @AssessmentMenuId, 'improvement-tracking', N'改善期跟踪', 'menu', 'TrendCharts', '/admin/assessment-records/improvement', 
        'assessment/ImprovementTracking', 'assessment:improvement:view', 20, 1, 1, N'供应商改善期跟踪和进度监控'
    );
    PRINT '✅ 改善期跟踪子菜单添加成功';
END
ELSE
BEGIN
    PRINT '⚠️ 改善期跟踪子菜单已存在，跳过添加';
END

-- =====================================================
-- 4. 添加考核统计分析子菜单
-- =====================================================
IF NOT EXISTS (SELECT * FROM [dbo].[Menus] WHERE MenuCode = 'assessment-statistics')
BEGIN
    INSERT INTO [dbo].[Menus] (
        [ParentID], [MenuCode], [MenuName], [MenuType], [Icon], [Path], 
        [Component], [Permission], [SortOrder], [Visible], [Status], [Description]
    ) VALUES (
        @AssessmentMenuId, 'assessment-statistics', N'考核统计分析', 'menu', 'DataAnalysis', '/admin/assessment-records/statistics', 
        'assessment/AssessmentStatistics', 'assessment:statistics:view', 30, 1, 1, N'考核数据统计分析和报表生成'
    );
    PRINT '✅ 考核统计分析子菜单添加成功';
END
ELSE
BEGIN
    PRINT '⚠️ 考核统计分析子菜单已存在，跳过添加';
END

-- =====================================================
-- 5. 为管理员角色分配菜单权限
-- =====================================================
DECLARE @AdminRoleId INT = (SELECT ID FROM [dbo].[Roles] WHERE RoleCode = 'admin');

IF @AdminRoleId IS NOT NULL
BEGIN
    -- 获取所有考核记录管理相关菜单ID
    DECLARE @MenuIds TABLE (MenuId INT);
    INSERT INTO @MenuIds (MenuId)
    SELECT ID FROM [dbo].[Menus] 
    WHERE MenuCode IN ('assessment-records', 'assessment-management', 'improvement-tracking', 'assessment-statistics');
    
    -- 为管理员角色分配菜单权限
    INSERT INTO [dbo].[RoleMenus] ([RoleID], [MenuID], [CreatedAt])
    SELECT @AdminRoleId, MenuId, GETDATE()
    FROM @MenuIds 
    WHERE NOT EXISTS (
        SELECT 1 FROM [dbo].[RoleMenus] 
        WHERE RoleID = @AdminRoleId AND MenuID = MenuId
    );
    
    PRINT '✅ 管理员角色菜单权限分配完成';
END
ELSE
BEGIN
    PRINT '❌ 未找到管理员角色，请检查角色配置';
END

-- =====================================================
-- 6. 验证插入结果
-- =====================================================
SELECT 
    m.ID,
    m.ParentID,
    m.MenuCode,
    m.MenuName,
    m.Icon,
    m.Path,
    m.Component,
    m.Permission,
    m.SortOrder,
    CASE WHEN m.ParentID IS NULL THEN N'顶级菜单' ELSE N'子菜单' END AS MenuLevel
FROM [dbo].[Menus] m
WHERE m.MenuCode IN ('assessment-records', 'assessment-management', 'improvement-tracking', 'assessment-statistics')
ORDER BY m.ParentID, m.SortOrder;

PRINT '✅ 考核记录管理菜单添加完成！';
GO