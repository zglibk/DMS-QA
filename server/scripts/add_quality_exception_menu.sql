
DECLARE @ParentID INT;

-- 1. Find 'Quality Management' (质量管理) parent menu
SELECT @ParentID = ID FROM Menus WHERE MenuName = '质量管理' AND (ParentID IS NULL OR ParentID = 0);

IF @ParentID IS NULL
BEGIN
    INSERT INTO Menus (MenuName, MenuCode, ParentID, MenuType, Icon, Path, Component, Permission, SortOrder, Status, CreatedAt, UpdatedAt)
    VALUES ('质量管理', 'quality', NULL, 'catalog', 'Management', '/quality', 'Layout', NULL, 10, 1, GETDATE(), GETDATE());
    
    SET @ParentID = SCOPE_IDENTITY();
    PRINT 'Created Quality Management parent menu with ID: ' + CAST(@ParentID AS VARCHAR);
END
ELSE
BEGIN
    PRINT 'Found Quality Management parent menu with ID: ' + CAST(@ParentID AS VARCHAR);
END

-- 2. Check if 'Quality Exception' (品质异常联络单) exists
IF NOT EXISTS (SELECT 1 FROM Menus WHERE MenuCode = 'quality-exception')
BEGIN
    INSERT INTO Menus (MenuName, MenuCode, ParentID, MenuType, Icon, Path, Component, Permission, SortOrder, Status, CreatedAt, UpdatedAt)
    VALUES ('品质异常联络单', 'quality-exception', @ParentID, 'menu', 'WarningFilled', '/quality/exception', 'quality/exception/QualityException', 'quality:exception:list', 20, 1, GETDATE(), GETDATE());
    
    PRINT 'Quality Exception menu added successfully.';
END
ELSE
BEGIN
    PRINT 'Quality Exception menu already exists.';
END
