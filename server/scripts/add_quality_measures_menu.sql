-- 添加"异常对策库"菜单
-- 路径: 质量管理 > 数据字典 > 异常对策库

DECLARE @ParentID INT;
DECLARE @QualityManageID INT;
DECLARE @DataDictID INT;

-- 1. 获取"质量管理"菜单ID (MenuName = '质量管理')
SELECT @QualityManageID = ID FROM Menus WHERE MenuName = N'质量管理' AND ParentID IS NULL;

-- 如果不存在"质量管理"，则创建（通常应该存在）
IF @QualityManageID IS NULL
BEGIN
    INSERT INTO Menus (MenuCode, MenuName, Path, Icon, SortOrder, ParentID, MenuType, Visible, Status, Permission)
    VALUES ('quality_manage', N'质量管理', '/quality', 'List', 10, NULL, 'menu', 1, 1, 'quality:view');
    SET @QualityManageID = SCOPE_IDENTITY();
END

-- 2. 获取或创建"数据字典"菜单 (作为"质量管理"的子菜单)
SELECT @DataDictID = ID FROM Menus WHERE MenuName = N'数据字典' AND ParentID = @QualityManageID;

IF @DataDictID IS NULL
BEGIN
    INSERT INTO Menus (MenuCode, MenuName, Path, Icon, SortOrder, ParentID, MenuType, Visible, Status, Permission)
    VALUES ('data_dict', N'数据字典', '/quality/basic', 'Collection', 90, @QualityManageID, 'menu', 1, 1, 'quality:basic:view');
    SET @DataDictID = SCOPE_IDENTITY();
END

-- 3. 添加"异常对策库"菜单
IF NOT EXISTS (SELECT 1 FROM Menus WHERE MenuName = N'异常对策库' AND ParentID = @DataDictID)
BEGIN
    INSERT INTO Menus (MenuCode, MenuName, Path, Component, Icon, SortOrder, ParentID, MenuType, Visible, Status, Permission)
    VALUES ('measure_library', N'异常对策库', '/quality/basic/measure-library', 'quality/basic/MeasureLibrary.vue', 'Tickets', 10, @DataDictID, 'menu', 1, 1, 'quality:measure:list');
END

-- 4. 为 Admin 角色分配权限
DECLARE @AdminRoleID INT;
SELECT @AdminRoleID = ID FROM Roles WHERE RoleName = 'Admin' OR RoleCode = 'admin'; -- 尝试兼容 RoleName 或 RoleCode

-- 如果 Roles 表没有 RoleName 列，可能是 Name 列
IF @AdminRoleID IS NULL
BEGIN
     -- 尝试直接使用 ID 1 (通常是 Admin)
     SET @AdminRoleID = 1;
END

DECLARE @MeasureMenuID INT;
SELECT @MeasureMenuID = ID FROM Menus WHERE MenuName = N'异常对策库' AND ParentID = @DataDictID;

IF @AdminRoleID IS NOT NULL AND @MeasureMenuID IS NOT NULL
BEGIN
    -- 1. 获取"RolePermissions"表名 (可能是 UserPermissions 或其他)
    -- 检查 RolePermissions 表是否存在
    IF OBJECT_ID('RolePermissions', 'U') IS NOT NULL
    BEGIN
        IF NOT EXISTS (SELECT 1 FROM RolePermissions WHERE RoleID = @AdminRoleID AND MenuID = @MeasureMenuID)
        BEGIN
            INSERT INTO RolePermissions (RoleID, MenuID)
            VALUES (@AdminRoleID, @MeasureMenuID);
        END
        
        -- 同时也给数据字典父菜单权限
        IF NOT EXISTS (SELECT 1 FROM RolePermissions WHERE RoleID = @AdminRoleID AND MenuID = @DataDictID)
        BEGIN
            INSERT INTO RolePermissions (RoleID, MenuID)
            VALUES (@AdminRoleID, @DataDictID);
        END
        
        -- 同时也给质量管理父菜单权限
        IF NOT EXISTS (SELECT 1 FROM RolePermissions WHERE RoleID = @AdminRoleID AND MenuID = @QualityManageID)
        BEGIN
            INSERT INTO RolePermissions (RoleID, MenuID)
            VALUES (@AdminRoleID, @QualityManageID);
        END
    END
END

PRINT '异常对策库菜单及权限添加完成';