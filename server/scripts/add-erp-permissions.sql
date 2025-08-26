-- =====================================================
-- ERP权限数据添加脚本
-- 功能：为ERP配置管理页面添加详细的操作权限
-- 版本：v1.0
-- 创建日期：2025-08-26
-- =====================================================

USE [DMS-QA];
GO

PRINT '开始添加ERP权限数据...';

-- =====================================================
-- 1. 获取ERP管理菜单ID
-- =====================================================
DECLARE @ErpMenuId INT;
SELECT @ErpMenuId = ID FROM [dbo].[Menus] WHERE MenuCode = 'erp-management';

IF @ErpMenuId IS NULL
BEGIN
    PRINT '❌ 错误：未找到ERP管理菜单，请先执行add-erp-management-menu.sql脚本';
    RETURN;
END
ELSE
BEGIN
    PRINT '✅ 找到ERP管理菜单，ID: ' + CAST(@ErpMenuId AS NVARCHAR(10));
END

-- =====================================================
-- 2. 添加ERP配置管理按钮权限菜单项
-- =====================================================

-- 新增配置权限
IF NOT EXISTS (SELECT * FROM [dbo].[Menus] WHERE MenuCode = 'erp-config-add')
BEGIN
    INSERT INTO [dbo].[Menus] (
        [ParentID], [MenuCode], [MenuName], [MenuType], [Icon], [Path], 
        [Component], [Permission], [SortOrder], [Visible], [Status], [Description]
    ) VALUES (
        @ErpMenuId, 'erp-config-add', N'新增ERP配置', 'button', '', '', 
        '', 'erp:config:add', 10, 0, 1, N'新增ERP配置的权限'
    );
    PRINT '✅ 新增ERP配置权限添加成功';
END
ELSE
BEGIN
    PRINT '⚠️ 新增ERP配置权限已存在，跳过添加';
END

-- 编辑配置权限
IF NOT EXISTS (SELECT * FROM [dbo].[Menus] WHERE MenuCode = 'erp-config-edit')
BEGIN
    INSERT INTO [dbo].[Menus] (
        [ParentID], [MenuCode], [MenuName], [MenuType], [Icon], [Path], 
        [Component], [Permission], [SortOrder], [Visible], [Status], [Description]
    ) VALUES (
        @ErpMenuId, 'erp-config-edit', N'编辑ERP配置', 'button', '', '', 
        '', 'erp:config:edit', 20, 0, 1, N'编辑ERP配置的权限'
    );
    PRINT '✅ 编辑ERP配置权限添加成功';
END
ELSE
BEGIN
    PRINT '⚠️ 编辑ERP配置权限已存在，跳过添加';
END

-- 删除配置权限
IF NOT EXISTS (SELECT * FROM [dbo].[Menus] WHERE MenuCode = 'erp-config-delete')
BEGIN
    INSERT INTO [dbo].[Menus] (
        [ParentID], [MenuCode], [MenuName], [MenuType], [Icon], [Path], 
        [Component], [Permission], [SortOrder], [Visible], [Status], [Description]
    ) VALUES (
        @ErpMenuId, 'erp-config-delete', N'删除ERP配置', 'button', '', '', 
        '', 'erp:config:delete', 30, 0, 1, N'删除ERP配置的权限'
    );
    PRINT '✅ 删除ERP配置权限添加成功';
END
ELSE
BEGIN
    PRINT '⚠️ 删除ERP配置权限已存在，跳过添加';
END

-- 手动同步权限
IF NOT EXISTS (SELECT * FROM [dbo].[Menus] WHERE MenuCode = 'erp-sync-manual')
BEGIN
    INSERT INTO [dbo].[Menus] (
        [ParentID], [MenuCode], [MenuName], [MenuType], [Icon], [Path], 
        [Component], [Permission], [SortOrder], [Visible], [Status], [Description]
    ) VALUES (
        @ErpMenuId, 'erp-sync-manual', N'手动同步ERP', 'button', '', '', 
        '', 'erp:sync:manual', 40, 0, 1, N'手动触发ERP同步的权限'
    );
    PRINT '✅ 手动同步ERP权限添加成功';
END
ELSE
BEGIN
    PRINT '⚠️ 手动同步ERP权限已存在，跳过添加';
END

-- 清理日志权限
IF NOT EXISTS (SELECT * FROM [dbo].[Menus] WHERE MenuCode = 'erp-logs-clear')
BEGIN
    INSERT INTO [dbo].[Menus] (
        [ParentID], [MenuCode], [MenuName], [MenuType], [Icon], [Path], 
        [Component], [Permission], [SortOrder], [Visible], [Status], [Description]
    ) VALUES (
        @ErpMenuId, 'erp-logs-clear', N'清理ERP日志', 'button', '', '', 
        '', 'erp:logs:clear', 50, 0, 1, N'清理ERP同步日志的权限'
    );
    PRINT '✅ 清理ERP日志权限添加成功';
END
ELSE
BEGIN
    PRINT '⚠️ 清理ERP日志权限已存在，跳过添加';
END

-- =====================================================
-- 3. 为管理员角色分配所有ERP权限
-- =====================================================
DECLARE @AdminRoleId INT = (SELECT ID FROM [dbo].[Roles] WHERE RoleCode = 'admin');

IF @AdminRoleId IS NOT NULL
BEGIN
    -- 获取所有ERP相关权限菜单ID
    DECLARE @ErpPermissionMenuIds TABLE (MenuId INT);
    INSERT INTO @ErpPermissionMenuIds (MenuId)
    SELECT ID FROM [dbo].[Menus] 
    WHERE MenuCode IN (
        'erp-management',
        'erp-config-add', 
        'erp-config-edit', 
        'erp-config-delete', 
        'erp-sync-manual', 
        'erp-logs-clear'
    );
    
    -- 为管理员角色分配ERP权限
    INSERT INTO [dbo].[RoleMenus] ([RoleID], [MenuID], [CreatedAt])
    SELECT @AdminRoleId, MenuId, GETDATE()
    FROM @ErpPermissionMenuIds 
    WHERE NOT EXISTS (
        SELECT 1 FROM [dbo].[RoleMenus] 
        WHERE RoleID = @AdminRoleId AND MenuID = MenuId
    );
    
    PRINT '✅ 管理员角色ERP权限分配完成';
END
ELSE
BEGIN
    PRINT '❌ 错误：未找到管理员角色，权限分配失败';
END

-- =====================================================
-- 4. 验证权限添加结果
-- =====================================================
PRINT '';
PRINT '📋 验证ERP权限结构：';

SELECT 
    p.MenuName AS ParentMenu,
    m.MenuName AS PermissionName,
    m.MenuCode,
    m.Permission,
    m.MenuType,
    CASE WHEN m.Status = 1 THEN '启用' ELSE '禁用' END AS Status
FROM [dbo].[Menus] m
LEFT JOIN [dbo].[Menus] p ON m.ParentID = p.ID
WHERE m.MenuCode LIKE 'erp-%'
ORDER BY m.SortOrder;

-- =====================================================
-- 5. 显示完成信息
-- =====================================================
PRINT '';
PRINT '🎉 ERP权限数据添加完成！';
PRINT '';
PRINT '🔑 已添加的权限：';
PRINT '  ✅ erp:config:add - 新增ERP配置';
PRINT '  ✅ erp:config:edit - 编辑ERP配置';
PRINT '  ✅ erp:config:delete - 删除ERP配置';
PRINT '  ✅ erp:sync:manual - 手动同步ERP';
PRINT '  ✅ erp:logs:clear - 清理ERP日志';
PRINT '';
PRINT '👥 权限分配：';
PRINT '  ✅ 管理员角色已获得所有ERP权限';
PRINT '';
PRINT '📝 使用说明：';
PRINT '  1. 前端页面已配置权限检查逻辑';
PRINT '  2. 管理员用户可以看到所有按钮';
PRINT '  3. 其他角色需要单独分配相应权限';
PRINT '  4. 可通过用户权限管理页面为特定用户分配权限';
PRINT '';
PRINT '下一步：';
PRINT '  1. 重启前端应用以加载权限配置';
PRINT '  2. 测试不同角色用户的按钮显示';
PRINT '  3. 根据需要为其他角色分配权限';
PRINT '';

GO