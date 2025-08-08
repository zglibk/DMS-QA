/**
 * 添加工作计划里程碑相关的操作权限
 * 功能：为进度跟踪页面添加细粒度的里程碑操作权限
 * 版本：v1.0
 * 创建日期：2025-01-27
 */

USE [DMS-QA];
GO

PRINT '开始添加工作计划里程碑相关权限...';
PRINT '';

-- =====================================================
-- 1. 添加进度跟踪相关的按钮权限
-- =====================================================

-- 获取进度跟踪菜单ID
DECLARE @ProgressTrackingMenuId INT = (SELECT ID FROM [dbo].[Menus] WHERE MenuCode = 'progress-tracking');

IF @ProgressTrackingMenuId IS NOT NULL
BEGIN
    -- 检查并添加进度编辑权限
    IF NOT EXISTS (SELECT * FROM [dbo].[Menus] WHERE MenuCode = 'progress-edit')
    BEGIN
        INSERT INTO [dbo].[Menus] (
            [ParentID], [MenuCode], [MenuName], [MenuType], [Permission], [SortOrder], [Visible], [Status]
        ) VALUES 
        (@ProgressTrackingMenuId, 'progress-edit', N'编辑进度', 'button', 'work-plan:progress:edit', 1, 0, 1);
        
        PRINT '✅ 进度编辑权限添加成功';
    END
    ELSE
    BEGIN
        PRINT '⚠️ 进度编辑权限已存在，跳过添加';
    END
    
    -- 检查并添加里程碑添加权限
    IF NOT EXISTS (SELECT * FROM [dbo].[Menus] WHERE MenuCode = 'milestone-add')
    BEGIN
        INSERT INTO [dbo].[Menus] (
            [ParentID], [MenuCode], [MenuName], [MenuType], [Permission], [SortOrder], [Visible], [Status]
        ) VALUES 
        (@ProgressTrackingMenuId, 'milestone-add', N'添加里程碑', 'button', 'work-plan:milestone:add', 2, 0, 1);
        
        PRINT '✅ 里程碑添加权限添加成功';
    END
    ELSE
    BEGIN
        PRINT '⚠️ 里程碑添加权限已存在，跳过添加';
    END
    
    -- 检查并添加里程碑编辑权限
    IF NOT EXISTS (SELECT * FROM [dbo].[Menus] WHERE MenuCode = 'milestone-edit')
    BEGIN
        INSERT INTO [dbo].[Menus] (
            [ParentID], [MenuCode], [MenuName], [MenuType], [Permission], [SortOrder], [Visible], [Status]
        ) VALUES 
        (@ProgressTrackingMenuId, 'milestone-edit', N'编辑里程碑', 'button', 'work-plan:milestone:edit', 3, 0, 1);
        
        PRINT '✅ 里程碑编辑权限添加成功';
    END
    ELSE
    BEGIN
        PRINT '⚠️ 里程碑编辑权限已存在，跳过添加';
    END
    
    -- 检查并添加里程碑删除权限
    IF NOT EXISTS (SELECT * FROM [dbo].[Menus] WHERE MenuCode = 'milestone-delete')
    BEGIN
        INSERT INTO [dbo].[Menus] (
            [ParentID], [MenuCode], [MenuName], [MenuType], [Permission], [SortOrder], [Visible], [Status]
        ) VALUES 
        (@ProgressTrackingMenuId, 'milestone-delete', N'删除里程碑', 'button', 'work-plan:milestone:delete', 4, 0, 1);
        
        PRINT '✅ 里程碑删除权限添加成功';
    END
    ELSE
    BEGIN
        PRINT '⚠️ 里程碑删除权限已存在，跳过添加';
    END
END
ELSE
BEGIN
    PRINT '❌ 未找到进度跟踪菜单，无法添加按钮权限';
END

-- =====================================================
-- 2. 为管理员角色分配新增的权限
-- =====================================================

DECLARE @AdminRoleId INT = (SELECT ID FROM [dbo].[Roles] WHERE RoleCode = 'admin');

IF @AdminRoleId IS NOT NULL
BEGIN
    -- 为管理员角色分配所有新增的里程碑相关权限
    INSERT INTO [dbo].[RoleMenus] ([RoleID], [MenuID])
    SELECT @AdminRoleId, ID 
    FROM [dbo].[Menus] 
    WHERE MenuType = 'button' 
      AND MenuCode IN ('progress-edit', 'milestone-add', 'milestone-edit', 'milestone-delete')
      AND NOT EXISTS (
          SELECT 1 FROM [dbo].[RoleMenus] 
          WHERE RoleID = @AdminRoleId AND MenuID = [Menus].ID
      );
    
    PRINT '✅ 管理员角色里程碑权限分配完成';
END
ELSE
BEGIN
    PRINT '⚠️ 未找到管理员角色，跳过权限分配';
END

-- =====================================================
-- 3. 显示添加的权限列表
-- =====================================================

PRINT '';
PRINT '📋 已添加的里程碑相关权限：';
SELECT 
    MenuCode as '权限代码',
    MenuName as '权限名称',
    Permission as '权限标识',
    MenuType as '类型'
FROM [dbo].[Menus] 
WHERE MenuCode IN ('progress-edit', 'milestone-add', 'milestone-edit', 'milestone-delete')
ORDER BY SortOrder;

PRINT '';
PRINT '🎉 工作计划里程碑权限添加完成！';
PRINT '';
PRINT '权限说明：';
PRINT '  📝 work-plan:progress:edit - 编辑进度权限';
PRINT '  ➕ work-plan:milestone:add - 添加里程碑权限';
PRINT '  ✏️ work-plan:milestone:edit - 编辑里程碑权限';
PRINT '  🗑️ work-plan:milestone:delete - 删除里程碑权限';
PRINT '';
PRINT '下一步：';
PRINT '  1. 重启前端应用以应用新的权限控制';
PRINT '  2. 为其他角色分配相应的权限';
PRINT '  3. 测试权限控制功能';
PRINT '';

GO