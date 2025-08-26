-- =====================================================
-- ERP管理菜单添加脚本
-- 功能：在系统管理模块下添加ERP管理菜单
-- 版本：v1.0
-- 创建日期：2025-01-27
-- =====================================================

USE [DMS-QA];
GO

PRINT '开始添加ERP管理菜单...';

-- =====================================================
-- 1. 获取系统管理菜单ID
-- =====================================================
DECLARE @SystemMenuId INT;
SELECT @SystemMenuId = ID FROM [dbo].[Menus] WHERE MenuCode = 'system';

IF @SystemMenuId IS NULL
BEGIN
    PRINT '❌ 错误：未找到系统管理菜单，请先确保系统管理菜单存在';
    RETURN;
END
ELSE
BEGIN
    PRINT '✅ 找到系统管理菜单，ID: ' + CAST(@SystemMenuId AS NVARCHAR(10));
END

-- =====================================================
-- 2. 添加ERP管理子菜单
-- =====================================================
IF NOT EXISTS (SELECT * FROM [dbo].[Menus] WHERE MenuCode = 'erp-management')
BEGIN
    INSERT INTO [dbo].[Menus] (
        [ParentID], [MenuCode], [MenuName], [MenuType], [Icon], [Path], 
        [Component], [Permission], [SortOrder], [Visible], [Status], [Description]
    ) VALUES (
        @SystemMenuId, 'erp-management', N'ERP管理', 'menu', 'Connection', '/system/erp', 
        'admin/ErpManagement', 'system:erp:view', 60, 1, 1, N'ERP系统配置管理和同步日志查看'
    );
    PRINT '✅ ERP管理菜单添加成功';
END
ELSE
BEGIN
    PRINT '⚠️ ERP管理菜单已存在，跳过添加';
END

-- =====================================================
-- 3. 为管理员角色分配菜单权限
-- =====================================================
DECLARE @AdminRoleId INT = (SELECT ID FROM [dbo].[Roles] WHERE RoleCode = 'admin');
DECLARE @ErpMenuId INT = (SELECT ID FROM [dbo].[Menus] WHERE MenuCode = 'erp-management');

IF @AdminRoleId IS NOT NULL AND @ErpMenuId IS NOT NULL
BEGIN
    -- 为管理员角色分配ERP管理菜单权限
    IF NOT EXISTS (SELECT 1 FROM [dbo].[RoleMenus] WHERE RoleID = @AdminRoleId AND MenuID = @ErpMenuId)
    BEGIN
        INSERT INTO [dbo].[RoleMenus] ([RoleID], [MenuID], [CreatedAt]) 
        VALUES (@AdminRoleId, @ErpMenuId, GETDATE());
        PRINT '✅ 管理员角色ERP管理权限分配完成';
    END
    ELSE
    BEGIN
        PRINT '⚠️ 管理员角色已拥有ERP管理权限，跳过分配';
    END
END
ELSE
BEGIN
    PRINT '❌ 错误：未找到管理员角色或ERP管理菜单，权限分配失败';
END

-- =====================================================
-- 4. 验证菜单添加结果
-- =====================================================
PRINT '';
PRINT '📋 验证菜单结构：';

SELECT 
    p.MenuName AS ParentMenu,
    m.MenuName AS MenuName,
    m.MenuCode,
    m.Path,
    m.Component,
    m.Icon,
    m.Permission,
    m.SortOrder,
    CASE WHEN m.Status = 1 THEN '启用' ELSE '禁用' END AS Status
FROM [dbo].[Menus] m
LEFT JOIN [dbo].[Menus] p ON m.ParentID = p.ID
WHERE m.MenuCode = 'erp-management'
ORDER BY m.SortOrder;

-- =====================================================
-- 5. 显示完成信息
-- =====================================================
PRINT '';
PRINT '🎉 ERP管理菜单添加完成！';
PRINT '';
PRINT '📁 菜单结构：';
PRINT '  系统管理 (system)';
PRINT '    └── ERP管理 (erp-management)';
PRINT '';
PRINT '🔑 权限配置：';
PRINT '  ✅ 菜单访问权限：system:erp:view';
PRINT '  ✅ 管理员角色权限分配完成';
PRINT '';
PRINT '🌐 访问路径：';
PRINT '  前端路由：/system/erp';
PRINT '  Vue组件：admin/ErpManagement';
PRINT '';
PRINT '📝 功能说明：';
PRINT '  - ERP配置管理（关联erp_config表）';
PRINT '  - ERP同步日志（关联erp_sync_logs表）';
PRINT '  - 配置管理和同步日志在同一页面，通过按钮切换';
PRINT '';
PRINT '下一步：';
PRINT '  1. 重启前端应用以加载新菜单';
PRINT '  2. 确保后端API接口正常工作';
PRINT '  3. 为其他角色分配相应权限（如需要）';
PRINT '';

GO