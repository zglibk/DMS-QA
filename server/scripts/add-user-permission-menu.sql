-- =====================================================
-- 添加用户权限管理菜单脚本
-- 功能：为权限管理模块添加用户权限管理子菜单
-- =====================================================

PRINT '开始添加用户权限管理菜单...';

-- 1. 检查权限管理父菜单是否存在
DECLARE @PermissionParentId INT;
SELECT @PermissionParentId = ID FROM [dbo].[Menus] WHERE MenuCode = 'permission';

IF @PermissionParentId IS NULL
BEGIN
    PRINT '权限管理父菜单不存在，正在创建...';
    
    INSERT INTO [dbo].[Menus] (
        [ParentID], [MenuCode], [MenuName], [MenuType], [Icon], [Path], 
        [Component], [Permission], [SortOrder], [Visible], [Status], [Description]
    ) VALUES (
        NULL, 'permission', N'权限管理', 'menu', 'Lock', '/admin/permission', 
        NULL, 'permission:view', 60, 1, 1, N'系统权限管理模块'
    );
    
    SET @PermissionParentId = SCOPE_IDENTITY();
    PRINT '✅ 权限管理父菜单创建成功，ID: ' + CAST(@PermissionParentId AS NVARCHAR(10));
END
ELSE
BEGIN
    PRINT '✅ 权限管理父菜单已存在，ID: ' + CAST(@PermissionParentId AS NVARCHAR(10));
END

-- 2. 检查用户权限管理菜单是否已存在
IF NOT EXISTS (SELECT 1 FROM [dbo].[Menus] WHERE MenuCode = 'user-permission-management')
BEGIN
    INSERT INTO [dbo].[Menus] (
        [ParentID], [MenuCode], [MenuName], [MenuType], [Icon], [Path], 
        [Component], [Permission], [SortOrder], [Visible], [Status], [Description]
    ) VALUES (
        @PermissionParentId, 'user-permission-management', N'用户权限管理', 'menu', 'Key', '/admin/user-permissions', 
        'UserPermissions', 'user-permission:view', 65, 1, 1, N'管理用户的个人权限配置'
    );
    
    DECLARE @UserPermissionMenuId INT = SCOPE_IDENTITY();
    PRINT '✅ 用户权限管理菜单添加成功，ID: ' + CAST(@UserPermissionMenuId AS NVARCHAR(10));
END
ELSE
BEGIN
    PRINT '⚠️ 用户权限管理菜单已存在，跳过添加';
END

-- 3. 为管理员角色分配菜单权限
DECLARE @AdminRoleId INT;
SELECT @AdminRoleId = ID FROM [dbo].[Roles] WHERE RoleCode = 'admin';

IF @AdminRoleId IS NOT NULL
BEGIN
    -- 分配权限管理父菜单权限
    IF NOT EXISTS (SELECT 1 FROM [dbo].[RoleMenus] WHERE RoleID = @AdminRoleId AND MenuID = @PermissionParentId)
    BEGIN
        INSERT INTO [dbo].[RoleMenus] ([RoleID], [MenuID]) VALUES (@AdminRoleId, @PermissionParentId);
        PRINT '✅ 管理员角色权限管理父菜单权限分配成功';
    END
    
    -- 分配用户权限管理菜单权限
    DECLARE @UserPermMenuId INT;
    SELECT @UserPermMenuId = ID FROM [dbo].[Menus] WHERE MenuCode = 'user-permission-management';
    
    IF @UserPermMenuId IS NOT NULL AND NOT EXISTS (SELECT 1 FROM [dbo].[RoleMenus] WHERE RoleID = @AdminRoleId AND MenuID = @UserPermMenuId)
    BEGIN
        INSERT INTO [dbo].[RoleMenus] ([RoleID], [MenuID]) VALUES (@AdminRoleId, @UserPermMenuId);
        PRINT '✅ 管理员角色用户权限管理菜单权限分配成功';
    END
END
ELSE
BEGIN
    PRINT '⚠️ 管理员角色不存在，跳过权限分配';
END

-- 4. 显示添加结果
PRINT '';
PRINT '📋 菜单添加完成！';
PRINT '';
PRINT '已添加的菜单：';
PRINT '  📁 权限管理 (permission)';
PRINT '    └── 👤 用户权限管理 (user-permission-management)';
PRINT '';
PRINT '菜单路径：/admin/user-permissions';
PRINT '组件名称：UserPermissions';
PRINT '权限标识：user-permission:view';
PRINT '';
PRINT '下一步：';
PRINT '  1. 重启前端应用以加载新菜单';
PRINT '  2. 确保UserPermissions.vue组件已正确放置';
PRINT '  3. 检查路由配置是否正确';
PRINT '';