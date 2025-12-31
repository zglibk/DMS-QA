/*
 * 添加供应商投诉管理物理删除权限的SQL脚本
 * 功能：添加物理删除按钮权限，并赋予管理员角色
 */

USE [DMS-QA];
GO

PRINT '开始添加供应商投诉管理物理删除权限...';

-- =====================================================
-- 1. 获取供应商投诉管理菜单ID
-- =====================================================
DECLARE @SupplierComplaintsMenuId INT;
SELECT @SupplierComplaintsMenuId = ID 
FROM [dbo].[Menus] 
WHERE MenuCode = 'supplier-complaints';

IF @SupplierComplaintsMenuId IS NULL
BEGIN
    PRINT '❌ 错误：未找到供应商投诉管理菜单(supplier-complaints)，请先运行菜单创建脚本';
    RETURN;
END

PRINT '✅ 找到供应商投诉管理菜单ID: ' + CAST(@SupplierComplaintsMenuId AS NVARCHAR(10));

-- =====================================================
-- 2. 添加物理删除按钮权限
-- =====================================================
IF NOT EXISTS (SELECT * FROM [dbo].[Menus] WHERE MenuCode = 'supplier-complaints-physical-delete')
BEGIN
    INSERT INTO [dbo].[Menus] (
        [ParentID], [MenuCode], [MenuName], [MenuType], [Permission], 
        [SortOrder], [Visible], [Status]
    ) VALUES (
        @SupplierComplaintsMenuId, 'supplier-complaints-physical-delete', N'物理删除', 'button', 'supplier:complaints:physical-delete', 
        9, 0, 1 -- 排序设为9，排在其他按钮后面
    );
    
    PRINT '✅ 物理删除按钮权限添加成功';
END
ELSE
BEGIN
    PRINT '⚠️ 物理删除按钮权限已存在，跳过添加';
END

-- =====================================================
-- 3. 为管理员角色分配物理删除权限
-- =====================================================
DECLARE @AdminRoleId INT = (SELECT ID FROM [dbo].[Roles] WHERE RoleCode = 'admin');
DECLARE @PhysicalDeleteMenuId INT = (SELECT ID FROM [dbo].[Menus] WHERE MenuCode = 'supplier-complaints-physical-delete');

IF @AdminRoleId IS NOT NULL AND @PhysicalDeleteMenuId IS NOT NULL
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM [dbo].[RoleMenus] 
        WHERE RoleID = @AdminRoleId AND MenuID = @PhysicalDeleteMenuId
    )
    BEGIN
        INSERT INTO [dbo].[RoleMenus] ([RoleID], [MenuID])
        VALUES (@AdminRoleId, @PhysicalDeleteMenuId);
        
        PRINT '✅ 管理员角色物理删除权限分配完成';
    END
    ELSE
    BEGIN
        PRINT '⚠️ 管理员角色已拥有该权限，跳过分配';
    END
END

PRINT '🎉 物理删除权限配置完成！';
GO
