-- 为异常对策库页面添加按钮权限
-- 功能：添加增删改等按钮权限到异常对策库菜单下，并分配给 Admin 角色

USE [DMS-QA];
GO

PRINT '开始为异常对策库页面添加按钮权限配置...';

-- 1. 获取"异常对策库"菜单ID
DECLARE @MeasureMenuID INT;
SELECT @MeasureMenuID = ID FROM Menus WHERE MenuCode = 'measure_library';

-- 如果未找到菜单，尝试通过名称查找
IF @MeasureMenuID IS NULL
BEGIN
    SELECT @MeasureMenuID = ID FROM Menus WHERE MenuName = N'异常对策库';
END

IF @MeasureMenuID IS NULL
BEGIN
    PRINT '❌ 错误：未找到异常对策库菜单，请先执行 add_quality_measures_menu.sql 创建主菜单';
    RETURN;
END

PRINT '✅ 找到异常对策库菜单，ID: ' + CAST(@MeasureMenuID AS NVARCHAR(10));

-- 2. 定义要添加的按钮权限
DECLARE @ButtonPermissions TABLE (
    MenuCode NVARCHAR(100),
    MenuName NVARCHAR(100),
    Permission NVARCHAR(100),
    SortOrder INT
);

INSERT INTO @ButtonPermissions (MenuCode, MenuName, Permission, SortOrder)
VALUES 
('measure_library_add', N'新增对策', 'quality:measure:add', 10),
('measure_library_edit', N'编辑对策', 'quality:measure:edit', 20),
('measure_library_delete', N'删除对策', 'quality:measure:delete', 30),
('measure_library_batch_delete', N'批量删除对策', 'quality:measure:batch_delete', 40);

-- 3. 循环插入按钮权限
DECLARE @BtnCode NVARCHAR(100);
DECLARE @BtnName NVARCHAR(100);
DECLARE @BtnPerm NVARCHAR(100);
DECLARE @BtnSort INT;

DECLARE btn_cursor CURSOR FOR 
SELECT MenuCode, MenuName, Permission, SortOrder FROM @ButtonPermissions;

OPEN btn_cursor;
FETCH NEXT FROM btn_cursor INTO @BtnCode, @BtnName, @BtnPerm, @BtnSort;

WHILE @@FETCH_STATUS = 0
BEGIN
    -- 检查按钮权限是否存在
    IF NOT EXISTS (SELECT 1 FROM Menus WHERE MenuCode = @BtnCode)
    BEGIN
        INSERT INTO Menus (
            ParentID, MenuCode, MenuName, MenuType, 
            Permission, SortOrder, Visible, Status
        ) VALUES (
            @MeasureMenuID, 
            @BtnCode, 
            @BtnName, 
            'button', 
            @BtnPerm, 
            @BtnSort, 
            0, -- 按钮在菜单树中不可见
            1
        );
        PRINT '✅ 创建按钮权限: ' + @BtnName;
    END
    ELSE
    BEGIN
        -- 如果存在但属性不对，更新它
        UPDATE Menus 
        SET ParentID = @MeasureMenuID,
            MenuType = 'button',
            Permission = @BtnPerm,
            Visible = 0
        WHERE MenuCode = @BtnCode;
        PRINT '⚠️  按钮权限已存在，已更新配置: ' + @BtnName;
    END

    FETCH NEXT FROM btn_cursor INTO @BtnCode, @BtnName, @BtnPerm, @BtnSort;
END

CLOSE btn_cursor;
DEALLOCATE btn_cursor;

-- 4. 为 Admin 角色分配所有新权限
DECLARE @AdminRoleID INT;
SELECT @AdminRoleID = ID FROM Roles WHERE RoleCode = 'admin';

-- 兼容 RoleName 查找
IF @AdminRoleID IS NULL
BEGIN
    SELECT @AdminRoleID = ID FROM Roles WHERE RoleName = 'Admin';
END

-- 默认 Admin ID 为 1
IF @AdminRoleID IS NULL
BEGIN
    SET @AdminRoleID = 1;
END

IF @AdminRoleID IS NOT NULL
BEGIN
    PRINT '正在为 Admin 角色 (ID: ' + CAST(@AdminRoleID AS NVARCHAR(10)) + ') 分配权限...';

    -- 插入角色-菜单关联 (RoleMenus 或 RolePermissions，取决于系统表结构)
    -- 根据之前的 add_quality_measures_menu.sql，表名可能是 RolePermissions
    -- 但根据 add-publishing-exceptions-menu.sql，表名是 RoleMenus
    -- 这里我们尝试同时处理两种情况或先检测表名
    
    DECLARE @RolePermTableName NVARCHAR(50) = 'RoleMenus';
    IF OBJECT_ID('RolePermissions', 'U') IS NOT NULL
    BEGIN
        SET @RolePermTableName = 'RolePermissions';
    END
    
    PRINT '检测到权限关联表名为: ' + @RolePermTableName;

    -- 获取所有属于异常对策库的按钮 ID
    DECLARE @ButtonIDs TABLE (ID INT);
    INSERT INTO @ButtonIDs
    SELECT ID FROM Menus WHERE ParentID = @MeasureMenuID AND MenuType = 'button';

    IF @RolePermTableName = 'RoleMenus'
    BEGIN
        INSERT INTO RoleMenus (RoleID, MenuID)
        SELECT @AdminRoleID, ID 
        FROM @ButtonIDs b
        WHERE NOT EXISTS (SELECT 1 FROM RoleMenus WHERE RoleID = @AdminRoleID AND MenuID = b.ID);
    END
    ELSE
    BEGIN
        INSERT INTO RolePermissions (RoleID, MenuID)
        SELECT @AdminRoleID, ID 
        FROM @ButtonIDs b
        WHERE NOT EXISTS (SELECT 1 FROM RolePermissions WHERE RoleID = @AdminRoleID AND MenuID = b.ID);
    END
    
    PRINT '✅ 已为 Admin 角色分配所有按钮权限';
END
ELSE
BEGIN
    PRINT '❌ 错误：未找到 Admin 角色，无法分配权限';
END

PRINT '🎉 异常对策库按钮权限配置完成！';
GO