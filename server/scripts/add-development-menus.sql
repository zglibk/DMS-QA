/*
 * 添加二次开发菜单的SQL脚本
 * 功能：为项目添加"二次开发"顶级菜单和相关子菜单
 * 执行方式：在SQL Server Management Studio中执行此脚本
 */

-- =====================================================
-- 添加"二次开发"顶级菜单
-- =====================================================
INSERT INTO [dbo].[Menus] (
    [MenuCode], 
    [MenuName], 
    [MenuType], 
    [Icon], 
    [Path], 
    [Permission], 
    [SortOrder], 
    [Visible], 
    [Status],
    [Description]
) VALUES (
    'development', 
    N'二次开发', 
    'menu', 
    'Tools', 
    '/development', 
    'development:view', 
    100, 
    1, 
    1,
    N'二次开发相关的组件和工具'
);

-- 获取刚插入的"二次开发"菜单ID
DECLARE @developmentMenuId INT = (SELECT ID FROM [dbo].[Menus] WHERE MenuCode = 'development');

-- =====================================================
-- 添加"结构组件"子菜单
-- =====================================================
INSERT INTO [dbo].[Menus] (
    [ParentID],
    [MenuCode], 
    [MenuName], 
    [MenuType], 
    [Icon], 
    [Path], 
    [Component],
    [Permission], 
    [SortOrder], 
    [Visible], 
    [Status],
    [Description]
) VALUES (
    @developmentMenuId,
    'structure-components', 
    N'结构组件', 
    'menu', 
    'Cpu', 
    '/development/structure-components', 
    'development/StructureComponents',
    'development:structure:view', 
    10, 
    1, 
    1,
    N'可复用的结构组件展示和说明'
);

-- =====================================================
-- 为系统管理员角色分配新菜单权限
-- =====================================================
-- 获取管理员角色ID
DECLARE @adminRoleId INT = (SELECT ID FROM [dbo].[Roles] WHERE RoleCode = 'admin');

-- 获取新添加的菜单ID
DECLARE @structureComponentsMenuId INT = (SELECT ID FROM [dbo].[Menus] WHERE MenuCode = 'structure-components');

-- 为管理员角色分配"二次开发"菜单权限
IF NOT EXISTS (SELECT 1 FROM [dbo].[RoleMenus] WHERE RoleID = @adminRoleId AND MenuID = @developmentMenuId)
BEGIN
    INSERT INTO [dbo].[RoleMenus] ([RoleID], [MenuID], [CreatedAt]) 
    VALUES (@adminRoleId, @developmentMenuId, GETDATE());
END

-- 为管理员角色分配"结构组件"菜单权限
IF NOT EXISTS (SELECT 1 FROM [dbo].[RoleMenus] WHERE RoleID = @adminRoleId AND MenuID = @structureComponentsMenuId)
BEGIN
    INSERT INTO [dbo].[RoleMenus] ([RoleID], [MenuID], [CreatedAt]) 
    VALUES (@adminRoleId, @structureComponentsMenuId, GETDATE());
END

-- =====================================================
-- 验证插入结果
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
WHERE m.MenuCode IN ('development', 'structure-components')
ORDER BY m.ParentID, m.SortOrder;

-- 验证角色权限分配
SELECT 
    r.RoleName,
    m.MenuName,
    m.MenuCode,
    rm.CreatedAt
FROM [dbo].[RoleMenus] rm
INNER JOIN [dbo].[Roles] r ON rm.RoleID = r.ID
INNER JOIN [dbo].[Menus] m ON rm.MenuID = m.ID
WHERE m.MenuCode IN ('development', 'structure-components')
ORDER BY r.RoleName, m.MenuCode;

PRINT N'二次开发菜单添加完成！';
PRINT N'- 已添加"二次开发"顶级菜单';
PRINT N'- 已添加"结构组件"子菜单';
PRINT N'- 已为系统管理员角色分配相应权限';