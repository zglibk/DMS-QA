-- 添加用户权限管理的授予权限按钮
-- 为用户权限管理页面添加"授予权限"按钮的权限配置

USE [DMS_QA];
GO

-- 查找用户权限管理菜单的ID
DECLARE @UserPermissionMenuID INT;
SELECT @UserPermissionMenuID = ID FROM [Menus] WHERE MenuCode = 'user-permission-management';

IF @UserPermissionMenuID IS NOT NULL
BEGIN
    -- 检查是否已存在授予权限按钮
    IF NOT EXISTS (
        SELECT 1 FROM [Menus] 
        WHERE ParentID = @UserPermissionMenuID 
            AND MenuCode = 'user-permission-grant'
            AND Permission = 'user-permission:grant'
    )
    BEGIN
        -- 插入授予权限按钮
        INSERT INTO [Menus] (
            MenuName, MenuCode, MenuType, ParentID, 
            Permission, SortOrder, Status, Icon,
            CreatedAt, UpdatedAt
        )
        VALUES (
            '授予权限', 'user-permission-grant', 'button', @UserPermissionMenuID,
            'user-permission:grant', 1, 1, 'Plus',
            GETDATE(), GETDATE()
        );
        
        PRINT '已添加用户权限管理-授予权限按钮';
    END
    ELSE
    BEGIN
        PRINT '用户权限管理-授予权限按钮已存在，跳过添加';
    END
    
    -- 检查是否已存在撤销权限按钮
    IF NOT EXISTS (
        SELECT 1 FROM [Menus] 
        WHERE ParentID = @UserPermissionMenuID 
            AND MenuCode = 'user-permission-revoke'
            AND Permission = 'user-permission:revoke'
    )
    BEGIN
        -- 插入撤销权限按钮
        INSERT INTO [Menus] (
            MenuName, MenuCode, MenuType, ParentID, 
            Permission, SortOrder, Status, Icon,
            CreatedAt, UpdatedAt
        )
        VALUES (
            '撤销权限', 'user-permission-revoke', 'button', @UserPermissionMenuID,
            'user-permission:revoke', 2, 1, 'Delete',
            GETDATE(), GETDATE()
        );
        
        PRINT '已添加用户权限管理-撤销权限按钮';
    END
    ELSE
    BEGIN
        PRINT '用户权限管理-撤销权限按钮已存在，跳过添加';
    END
    
    -- 检查是否已存在查看历史按钮
    IF NOT EXISTS (
        SELECT 1 FROM [Menus] 
        WHERE ParentID = @UserPermissionMenuID 
            AND MenuCode = 'user-permission-history'
            AND Permission = 'user-permission:history'
    )
    BEGIN
        -- 插入查看历史按钮
        INSERT INTO [Menus] (
            MenuName, MenuCode, MenuType, ParentID, 
            Permission, SortOrder, Status, Icon,
            CreatedAt, UpdatedAt
        )
        VALUES (
            '查看历史', 'user-permission-history', 'button', @UserPermissionMenuID,
            'user-permission:history', 3, 1, 'Clock',
            GETDATE(), GETDATE()
        );
        
        PRINT '已添加用户权限管理-查看历史按钮';
    END
    ELSE
    BEGIN
        PRINT '用户权限管理-查看历史按钮已存在，跳过添加';
    END
END
ELSE
BEGIN
    PRINT '未找到用户权限管理菜单，请先确保菜单已创建';
END

-- 查看添加结果
SELECT 
    m1.MenuName as '父菜单',
    m2.MenuName as '子菜单',
    m2.MenuCode as '菜单代码',
    m2.Permission as '权限标识',
    m2.MenuType as '类型',
    m2.SortOrder as '排序'
FROM [Menus] m1
INNER JOIN [Menus] m2 ON m1.ID = m2.ParentID
WHERE m1.MenuCode = 'user-permission-management'
ORDER BY m2.SortOrder;

GO