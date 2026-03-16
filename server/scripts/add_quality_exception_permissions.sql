DECLARE @ParentID INT;

-- 1. 查找 '品质异常联络单' 菜单 ID
SELECT @ParentID = ID FROM Menus WHERE MenuCode = 'quality-exception';

IF @ParentID IS NOT NULL
BEGIN
    PRINT 'Found Quality Exception menu with ID: ' + CAST(@ParentID AS VARCHAR);

    -- 2. 添加按钮权限
    
    -- 新增 (Add)
    IF NOT EXISTS (SELECT 1 FROM Menus WHERE MenuCode = 'quality-exception-add')
    BEGIN
        INSERT INTO Menus (MenuName, MenuCode, ParentID, MenuType, Permission, SortOrder, Status, CreatedAt, UpdatedAt)
        VALUES ('新增', 'quality-exception-add', @ParentID, 'button', 'quality:exception:add', 10, 1, GETDATE(), GETDATE());
        PRINT 'Added button permission: Add';
    END

    -- 编辑 (Edit)
    IF NOT EXISTS (SELECT 1 FROM Menus WHERE MenuCode = 'quality-exception-edit')
    BEGIN
        INSERT INTO Menus (MenuName, MenuCode, ParentID, MenuType, Permission, SortOrder, Status, CreatedAt, UpdatedAt)
        VALUES ('编辑', 'quality-exception-edit', @ParentID, 'button', 'quality:exception:edit', 20, 1, GETDATE(), GETDATE());
        PRINT 'Added button permission: Edit';
    END

    -- 删除 (Delete)
    IF NOT EXISTS (SELECT 1 FROM Menus WHERE MenuCode = 'quality-exception-delete')
    BEGIN
        INSERT INTO Menus (MenuName, MenuCode, ParentID, MenuType, Permission, SortOrder, Status, CreatedAt, UpdatedAt)
        VALUES ('删除', 'quality-exception-delete', @ParentID, 'button', 'quality:exception:delete', 30, 1, GETDATE(), GETDATE());
        PRINT 'Added button permission: Delete';
    END

    -- 生成考核通知 (Generate Notice)
    IF NOT EXISTS (SELECT 1 FROM Menus WHERE MenuCode = 'quality-exception-generate-notice')
    BEGIN
        INSERT INTO Menus (MenuName, MenuCode, ParentID, MenuType, Permission, SortOrder, Status, CreatedAt, UpdatedAt)
        VALUES ('生成考核通知', 'quality-exception-generate-notice', @ParentID, 'button', 'quality:exception:generate-notice', 40, 1, GETDATE(), GETDATE());
        PRINT 'Added button permission: Generate Notice';
    END
    
    -- 导出 (Export) - 如果页面有导出功能的话，目前代码中未见，暂时预留或不加
    -- 批量删除 (Batch Delete) - 复用删除权限
    
END
ELSE
BEGIN
    PRINT 'Error: Quality Exception menu (quality-exception) not found. Please run add_quality_exception_menu.sql first.';
END
