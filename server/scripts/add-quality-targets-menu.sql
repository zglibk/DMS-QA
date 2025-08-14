-- =====================================================
-- 质量目标管理菜单添加脚本
-- 功能：在质量管理模块下添加目标管理子菜单
-- 版本：v1.0
-- 创建日期：2025-01-27
-- =====================================================

USE [DMS-QA];
GO

PRINT '开始添加质量目标管理菜单...';

-- =====================================================
-- 1. 获取质量管理模块的菜单ID
-- =====================================================
DECLARE @QualityMenuId INT;
SELECT @QualityMenuId = ID FROM [dbo].[Menus] WHERE MenuCode = 'quality';

IF @QualityMenuId IS NULL
BEGIN
    PRINT '❌ 未找到质量管理模块菜单，请先确保质量管理模块已创建';
    RETURN;
END
ELSE
BEGIN
    PRINT '✅ 找到质量管理模块，ID: ' + CAST(@QualityMenuId AS NVARCHAR(10));
END

-- =====================================================
-- 2. 添加目标管理子菜单
-- =====================================================
IF NOT EXISTS (SELECT * FROM [dbo].[Menus] WHERE MenuCode = 'quality-targets')
BEGIN
    INSERT INTO [dbo].[Menus] (
        [ParentID], [MenuCode], [MenuName], [MenuType], [Icon], [Path], 
        [Component], [Permission], [SortOrder], [Visible], [Status], [Description]
    ) VALUES (
        @QualityMenuId, 'quality-targets', N'目标管理', 'menu', 'Target', '/admin/quality/targets', 
        'quality/targets/index', 'quality:targets:view', 50, 1, 1, 
        N'质量目标管理，包含目标录入、统计分析、图表展示等功能'
    );
    PRINT '✅ 目标管理子菜单添加成功';
END
ELSE
BEGIN
    PRINT '⚠️ 目标管理子菜单已存在，跳过添加';
END

-- =====================================================
-- 3. 添加目标管理相关的按钮权限
-- =====================================================
DECLARE @QualityTargetsMenuId INT = (SELECT ID FROM [dbo].[Menus] WHERE MenuCode = 'quality-targets');

IF @QualityTargetsMenuId IS NOT NULL
BEGIN
    -- 检查是否已存在按钮权限
    IF NOT EXISTS (SELECT * FROM [dbo].[Menus] WHERE MenuCode LIKE 'quality-targets-%' AND MenuType = 'button')
    BEGIN
        INSERT INTO [dbo].[Menus] (
            [ParentID], [MenuCode], [MenuName], [MenuType], [Permission], 
            [SortOrder], [Visible], [Status]
        ) VALUES 
        (@QualityTargetsMenuId, 'quality-targets-add', N'新增目标', 'button', 'quality:targets:add', 10, 1, 1),
        (@QualityTargetsMenuId, 'quality-targets-edit', N'编辑目标', 'button', 'quality:targets:edit', 20, 1, 1),
        (@QualityTargetsMenuId, 'quality-targets-delete', N'删除目标', 'button', 'quality:targets:delete', 30, 1, 1),
        (@QualityTargetsMenuId, 'quality-targets-export', N'导出数据', 'button', 'quality:targets:export', 40, 1, 1),
        (@QualityTargetsMenuId, 'quality-targets-statistics', N'统计分析', 'button', 'quality:targets:statistics', 50, 1, 1);
        
        PRINT '✅ 目标管理按钮权限添加成功';
    END
    ELSE
    BEGIN
        PRINT '⚠️ 目标管理按钮权限已存在，跳过添加';
    END
END

-- =====================================================
-- 4. 为管理员角色分配菜单权限
-- =====================================================
DECLARE @AdminRoleId INT = (SELECT ID FROM [dbo].[Roles] WHERE RoleCode = 'admin');

IF @AdminRoleId IS NOT NULL
BEGIN
    -- 获取所有目标管理相关菜单ID
    DECLARE @MenuIds TABLE (MenuId INT);
    INSERT INTO @MenuIds (MenuId)
    SELECT ID FROM [dbo].[Menus] 
    WHERE MenuCode = 'quality-targets' 
       OR MenuCode LIKE 'quality-targets-%';
    
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
-- 5. 为质量经理角色分配相关权限（如果存在）
-- =====================================================
DECLARE @QualityManagerRoleId INT = (SELECT ID FROM [dbo].[Roles] WHERE RoleCode = 'quality_manager');

IF @QualityManagerRoleId IS NOT NULL
BEGIN
    -- 为质量经理分配目标管理查看和编辑权限
    INSERT INTO [dbo].[RoleMenus] ([RoleID], [MenuID])
    SELECT @QualityManagerRoleId, ID 
    FROM [dbo].[Menus] 
    WHERE MenuCode IN ('quality-targets', 'quality-targets-add', 'quality-targets-edit', 'quality-targets-export', 'quality-targets-statistics')
      AND NOT EXISTS (
          SELECT 1 FROM [dbo].[RoleMenus] 
          WHERE RoleID = @QualityManagerRoleId AND MenuID = [dbo].[Menus].ID
      );
    
    PRINT '✅ 质量经理角色权限分配完成';
END
ELSE
BEGIN
    PRINT '⚠️ 未找到质量经理角色，跳过权限分配';
END

-- =====================================================
-- 6. 更新菜单排序，确保目标管理菜单在合适位置
-- =====================================================
UPDATE [dbo].[Menus] 
SET SortOrder = 50 
WHERE MenuCode = 'quality-targets';

PRINT '✅ 菜单排序更新完成';

-- =====================================================
-- 7. 验证菜单添加结果
-- =====================================================
PRINT '';
PRINT '📋 验证菜单结构：';

SELECT 
    CASE 
        WHEN m.ParentID IS NULL THEN m.MenuName
        WHEN m.MenuType = 'menu' THEN '  └── ' + m.MenuName
        ELSE '      └── ' + m.MenuName
    END AS MenuStructure,
    m.MenuCode,
    m.Path,
    m.Icon,
    m.Permission,
    m.SortOrder,
    CASE WHEN m.Status = 1 THEN '启用' ELSE '禁用' END AS Status
FROM [dbo].[Menus] m
WHERE m.MenuCode = 'quality' 
   OR m.ParentID = @QualityMenuId
   OR m.MenuCode LIKE 'quality-targets%'
ORDER BY 
    CASE WHEN m.ParentID IS NULL THEN 0 
         WHEN m.MenuType = 'menu' THEN 1 
         ELSE 2 END,
    m.SortOrder,
    m.MenuCode;

PRINT '';
PRINT '🔐 验证角色权限分配：';

SELECT 
    r.RoleName AS 角色名称,
    m.MenuName AS 菜单名称,
    m.MenuCode AS 菜单编码,
    m.MenuType AS 菜单类型,
    rm.CreatedAt AS 分配时间
FROM [dbo].[RoleMenus] rm
INNER JOIN [dbo].[Roles] r ON rm.RoleID = r.ID
INNER JOIN [dbo].[Menus] m ON rm.MenuID = m.ID
WHERE m.MenuCode LIKE 'quality-targets%'
ORDER BY r.RoleName, m.SortOrder;

PRINT '';
PRINT '🎉 质量目标管理菜单添加完成！';
PRINT '';
PRINT '📊 已添加的菜单：';
PRINT '  📋 质量管理 (quality)';
PRINT '    └── 🎯 目标管理 (quality-targets)';
PRINT '        ├── ➕ 新增目标 (quality-targets-add)';
PRINT '        ├── ✏️ 编辑目标 (quality-targets-edit)';
PRINT '        ├── 🗑️ 删除目标 (quality-targets-delete)';
PRINT '        ├── 📤 导出数据 (quality-targets-export)';
PRINT '        └── 📊 统计分析 (quality-targets-statistics)';
PRINT '';
PRINT '已添加的权限：';
PRINT '  ✅ 页面访问权限 (quality:targets:view)';
PRINT '  ✅ 按钮操作权限 (add/edit/delete/export/statistics)';
PRINT '  ✅ 管理员角色权限分配';
PRINT '  ✅ 质量经理角色权限分配（如果存在）';
PRINT '';
PRINT '下一步：';
PRINT '  1. 重启前端应用以加载新菜单';
PRINT '  2. 创建后端API接口';
PRINT '  3. 开发前端页面组件';
PRINT '  4. 实现CRUD功能和统计分析';
PRINT '';

GO