/*
 * 添加供应商投诉管理菜单的SQL脚本
 * 功能：在供应商管理菜单下添加供应商投诉管理子菜单
 * 执行方式：在SQL Server Management Studio中执行此脚本
 */

USE [DMS-QA];
GO

PRINT '开始添加供应商投诉管理菜单...';

-- =====================================================
-- 1. 检查并获取供应商管理菜单ID
-- =====================================================
DECLARE @SupplierMenuId INT;

-- 查找供应商管理菜单
SELECT @SupplierMenuId = ID 
FROM [dbo].[Menus] 
WHERE MenuCode = 'supplier-management' OR MenuCode = 'supplier' OR MenuName = N'供应商管理';

IF @SupplierMenuId IS NULL
BEGIN
    -- 如果供应商管理菜单不存在，先创建它
    INSERT INTO [dbo].[Menus] (
        [MenuCode], [MenuName], [MenuType], [Icon], [Path], 
        [Permission], [SortOrder], [Visible], [Status], [Description]
    ) VALUES (
        'supplier-management', N'供应商管理', 'menu', 'Van', '/admin/supplier', 
        'supplier:view', 20, 1, 1, N'供应商管理模块，包含供应商信息、评估、投诉等功能'
    );
    
    SET @SupplierMenuId = SCOPE_IDENTITY();
    PRINT '✅ 供应商管理顶级菜单创建成功，ID: ' + CAST(@SupplierMenuId AS NVARCHAR(10));
END
ELSE
BEGIN
    PRINT '✅ 供应商管理菜单已存在，ID: ' + CAST(@SupplierMenuId AS NVARCHAR(10));
END

-- =====================================================
-- 2. 添加供应商投诉管理子菜单
-- =====================================================
IF NOT EXISTS (SELECT * FROM [dbo].[Menus] WHERE MenuCode = 'supplier-complaints')
BEGIN
    INSERT INTO [dbo].[Menus] (
        [ParentID], [MenuCode], [MenuName], [MenuType], [Icon], [Path], 
        [Component], [Permission], [SortOrder], [Visible], [Status], [Description]
    ) VALUES (
        @SupplierMenuId, 'supplier-complaints', N'供应商投诉管理', 'menu', 'ChatLineSquare', '/admin/supplier/complaints', 
        'supplier/SupplierComplaints', 'supplier:complaints:view', 90, 1, 1, 
        N'供应商投诉管理，包含投诉记录、处理流程、改善验证、索赔等功能'
    );
    PRINT '✅ 供应商投诉管理子菜单添加成功';
END
ELSE
BEGIN
    PRINT '⚠️ 供应商投诉管理子菜单已存在，跳过添加';
END

-- =====================================================
-- 3. 添加供应商投诉管理相关的按钮权限
-- =====================================================
DECLARE @SupplierComplaintsMenuId INT = (SELECT ID FROM [dbo].[Menus] WHERE MenuCode = 'supplier-complaints');

IF @SupplierComplaintsMenuId IS NOT NULL
BEGIN
    -- 检查是否已存在按钮权限
    IF NOT EXISTS (SELECT * FROM [dbo].[Menus] WHERE MenuCode LIKE 'supplier-complaints-%' AND MenuType = 'button')
    BEGIN
        INSERT INTO [dbo].[Menus] (
            [ParentID], [MenuCode], [MenuName], [MenuType], [Permission], 
            [SortOrder], [Visible], [Status]
        ) VALUES 
        (@SupplierComplaintsMenuId, 'supplier-complaints-add', N'新增投诉', 'button', 'supplier:complaints:add', 1, 0, 1),
        (@SupplierComplaintsMenuId, 'supplier-complaints-edit', N'编辑投诉', 'button', 'supplier:complaints:edit', 2, 0, 1),
        (@SupplierComplaintsMenuId, 'supplier-complaints-delete', N'删除投诉', 'button', 'supplier:complaints:delete', 3, 0, 1),
        (@SupplierComplaintsMenuId, 'supplier-complaints-view', N'查看投诉', 'button', 'supplier:complaints:view', 4, 0, 1),
        (@SupplierComplaintsMenuId, 'supplier-complaints-export', N'导出投诉', 'button', 'supplier:complaints:export', 5, 0, 1),
        (@SupplierComplaintsMenuId, 'supplier-complaints-process', N'处理投诉', 'button', 'supplier:complaints:process', 6, 0, 1),
        (@SupplierComplaintsMenuId, 'supplier-complaints-close', N'关闭投诉', 'button', 'supplier:complaints:close', 7, 0, 1),
        (@SupplierComplaintsMenuId, 'supplier-complaints-statistics', N'投诉统计', 'button', 'supplier:complaints:statistics', 8, 0, 1);
        
        PRINT '✅ 供应商投诉管理按钮权限添加成功';
    END
    ELSE
    BEGIN
        PRINT '⚠️ 供应商投诉管理按钮权限已存在，跳过添加';
    END
END

-- =====================================================
-- 4. 为管理员角色分配菜单权限
-- =====================================================
DECLARE @AdminRoleId INT = (SELECT ID FROM [dbo].[Roles] WHERE RoleCode = 'admin');

IF @AdminRoleId IS NOT NULL
BEGIN
    -- 获取所有供应商投诉相关菜单ID
    DECLARE @MenuIds TABLE (MenuId INT);
    INSERT INTO @MenuIds (MenuId)
    SELECT ID FROM [dbo].[Menus] 
    WHERE MenuCode IN ('supplier-management', 'supplier-complaints') 
       OR MenuCode LIKE 'supplier-complaints-%';
    
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
    -- 为质量经理分配供应商投诉查看和处理权限
    INSERT INTO [dbo].[RoleMenus] ([RoleID], [MenuID])
    SELECT @QualityManagerRoleId, ID 
    FROM [dbo].[Menus] 
    WHERE MenuCode IN ('supplier-management', 'supplier-complaints', 'supplier-complaints-view', 'supplier-complaints-process', 'supplier-complaints-statistics')
      AND NOT EXISTS (
          SELECT 1 FROM [dbo].[RoleMenus] 
          WHERE RoleID = @QualityManagerRoleId AND MenuID = [Menus].ID
      );
    
    PRINT '✅ 质量经理角色权限分配完成';
END
ELSE
BEGIN
    PRINT '⚠️ 未找到质量经理角色，跳过权限分配';
END

-- =====================================================
-- 6. 更新菜单排序，确保供应商投诉菜单在合适位置
-- =====================================================
UPDATE [dbo].[Menus] 
SET SortOrder = 90 
WHERE MenuCode = 'supplier-complaints';

PRINT '✅ 菜单排序更新完成';

-- =====================================================
-- 7. 验证菜单添加结果
-- =====================================================
PRINT '';
PRINT '📋 验证菜单结构：';

SELECT 
    CASE 
        WHEN m.ParentID IS NULL THEN m.MenuName
        ELSE '  └── ' + m.MenuName
    END AS MenuStructure,
    m.MenuCode,
    m.Path,
    m.Icon,
    m.Permission,
    m.SortOrder,
    CASE WHEN m.Status = 1 THEN '启用' ELSE '禁用' END AS Status
FROM [dbo].[Menus] m
WHERE m.MenuCode = 'supplier-management' 
   OR m.ParentID = @SupplierMenuId
   OR m.MenuCode LIKE 'supplier-complaints%'
ORDER BY 
    CASE WHEN m.ParentID IS NULL THEN 0 ELSE 1 END,
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
WHERE m.MenuCode LIKE 'supplier%'
ORDER BY r.RoleName, m.MenuType DESC, m.SortOrder;

PRINT '';
PRINT '🎉 供应商投诉管理菜单添加完成！';
PRINT '';
PRINT '已添加的菜单：';
PRINT '  📋 供应商管理 (supplier-management) - 顶级菜单（如不存在则创建）';
PRINT '    └── 📝 供应商投诉管理 (supplier-complaints) - 子菜单';
PRINT '';
PRINT '已添加的按钮权限：';
PRINT '  ➕ 新增投诉 (supplier-complaints-add)';
PRINT '  ✏️ 编辑投诉 (supplier-complaints-edit)';
PRINT '  🗑️ 删除投诉 (supplier-complaints-delete)';
PRINT '  👁️ 查看投诉 (supplier-complaints-view)';
PRINT '  📤 导出投诉 (supplier-complaints-export)';
PRINT '  ⚙️ 处理投诉 (supplier-complaints-process)';
PRINT '  🔒 关闭投诉 (supplier-complaints-close)';
PRINT '  📊 投诉统计 (supplier-complaints-statistics)';
PRINT '';
PRINT '已分配权限的角色：';
PRINT '  👑 系统管理员 (admin) - 所有权限';
PRINT '  🎯 质量经理 (quality_manager) - 查看和处理权限（如果角色存在）';
PRINT '';
PRINT '下一步：';
PRINT '  1. 重启前端应用以加载新菜单';
PRINT '  2. 检查菜单显示是否正常';
PRINT '  3. 测试供应商投诉管理功能';
PRINT '=================================================';

GO