-- 为出版异常页面添加菜单项和权限配置
-- 执行时间：需要在系统运行时执行
-- 功能：添加出版异常菜单项到质量管理模块下，并配置相关权限

USE [DMS-QA];
GO

PRINT '开始为出版异常页面添加菜单项和权限配置...';

-- 获取质量管理主菜单ID
DECLARE @qualityMenuId INT;
SELECT @qualityMenuId = ID FROM [dbo].[Menus] WHERE MenuCode = 'quality';

IF @qualityMenuId IS NULL
BEGIN
    PRINT '❌ 错误：未找到质量管理主菜单，请先确保系统菜单已正确初始化';
    RETURN;
END

PRINT '✅ 找到质量管理主菜单，ID: ' + CAST(@qualityMenuId AS NVARCHAR(10));

-- 检查出版异常菜单是否已存在
IF EXISTS (SELECT 1 FROM [dbo].[Menus] WHERE MenuCode = 'publishing-exceptions')
BEGIN
    PRINT '⚠️  出版异常菜单已存在，跳过创建';
END
ELSE
BEGIN
    -- 添加出版异常主菜单项
    INSERT INTO [dbo].[Menus] (
        [ParentID], [MenuCode], [MenuName], [MenuType], [Icon], 
        [Path], [Component], [Permission], [SortOrder], [Visible], [Status]
    ) VALUES (
        @qualityMenuId, 
        'publishing-exceptions', 
        N'出版异常', 
        'menu', 
        'DocumentRemove', 
        '/quality/publishing-exceptions', 
        'quality/publishing-exceptions/index', 
        'quality:publishing:view', 
        40, 
        1, 
        1
    );
    
    PRINT '✅ 出版异常主菜单项创建成功';
END

-- 获取出版异常菜单ID
DECLARE @publishingMenuId INT;
SELECT @publishingMenuId = ID FROM [dbo].[Menus] WHERE MenuCode = 'publishing-exceptions';

-- 添加出版异常操作按钮权限
DECLARE @buttonMenus TABLE (
    MenuCode NVARCHAR(50),
    MenuName NVARCHAR(50),
    Permission NVARCHAR(100),
    SortOrder INT
);

-- 插入按钮权限配置
INSERT INTO @buttonMenus VALUES
('publishing-exceptions-add', N'新增出版异常', 'quality:publishing:add', 10),
('publishing-exceptions-edit', N'编辑出版异常', 'quality:publishing:edit', 20),
('publishing-exceptions-delete', N'删除出版异常', 'quality:publishing:delete', 30),
('publishing-exceptions-export', N'导出出版异常', 'quality:publishing:export', 40),
('publishing-exceptions-upload', N'上传图片', 'quality:publishing:upload', 50);

-- 创建按钮权限菜单项
DECLARE @menuCode NVARCHAR(50), @menuName NVARCHAR(50), @permission NVARCHAR(100), @sortOrder INT;

DECLARE button_cursor CURSOR FOR
SELECT MenuCode, MenuName, Permission, SortOrder FROM @buttonMenus;

OPEN button_cursor;
FETCH NEXT FROM button_cursor INTO @menuCode, @menuName, @permission, @sortOrder;

WHILE @@FETCH_STATUS = 0
BEGIN
    -- 检查按钮权限是否已存在
    IF NOT EXISTS (SELECT 1 FROM [dbo].[Menus] WHERE MenuCode = @menuCode)
    BEGIN
        INSERT INTO [dbo].[Menus] (
            [ParentID], [MenuCode], [MenuName], [MenuType], 
            [Permission], [SortOrder], [Visible], [Status]
        ) VALUES (
            @publishingMenuId, 
            @menuCode, 
            @menuName, 
            'button', 
            @permission, 
            @sortOrder, 
            0, 
            1
        );
        
        PRINT '✅ 创建按钮权限: ' + @menuName;
    END
    ELSE
    BEGIN
        PRINT '⚠️  按钮权限已存在: ' + @menuName;
    END
    
    FETCH NEXT FROM button_cursor INTO @menuCode, @menuName, @permission, @sortOrder;
END

CLOSE button_cursor;
DEALLOCATE button_cursor;

-- 为管理员角色分配出版异常相关权限
DECLARE @adminRoleId INT;
SELECT @adminRoleId = ID FROM [dbo].[Roles] WHERE RoleCode = 'admin';

IF @adminRoleId IS NOT NULL
BEGIN
    -- 为管理员角色分配出版异常主菜单权限
    IF NOT EXISTS (SELECT 1 FROM [dbo].[RoleMenus] WHERE RoleID = @adminRoleId AND MenuID = @publishingMenuId)
    BEGIN
        INSERT INTO [dbo].[RoleMenus] ([RoleID], [MenuID]) VALUES (@adminRoleId, @publishingMenuId);
        PRINT '✅ 为管理员角色分配出版异常主菜单权限';
    END
    
    -- 为管理员角色分配所有出版异常按钮权限
    INSERT INTO [dbo].[RoleMenus] ([RoleID], [MenuID])
    SELECT @adminRoleId, ID 
    FROM [dbo].[Menus] 
    WHERE ParentID = @publishingMenuId 
    AND MenuType = 'button'
    AND NOT EXISTS (
        SELECT 1 FROM [dbo].[RoleMenus] 
        WHERE RoleID = @adminRoleId AND MenuID = [dbo].[Menus].ID
    );
    
    PRINT '✅ 为管理员角色分配出版异常按钮权限';
END
ELSE
BEGIN
    PRINT '⚠️  未找到管理员角色，请手动分配权限';
END

-- 为质量经理角色分配出版异常权限（如果存在）
DECLARE @qualityManagerRoleId INT;
SELECT @qualityManagerRoleId = ID FROM [dbo].[Roles] WHERE RoleCode = 'quality_manager';

IF @qualityManagerRoleId IS NOT NULL
BEGIN
    -- 为质量经理角色分配出版异常主菜单权限
    IF NOT EXISTS (SELECT 1 FROM [dbo].[RoleMenus] WHERE RoleID = @qualityManagerRoleId AND MenuID = @publishingMenuId)
    BEGIN
        INSERT INTO [dbo].[RoleMenus] ([RoleID], [MenuID]) VALUES (@qualityManagerRoleId, @publishingMenuId);
        PRINT '✅ 为质量经理角色分配出版异常主菜单权限';
    END
    
    -- 为质量经理角色分配所有出版异常按钮权限
    INSERT INTO [dbo].[RoleMenus] ([RoleID], [MenuID])
    SELECT @qualityManagerRoleId, ID 
    FROM [dbo].[Menus] 
    WHERE ParentID = @publishingMenuId 
    AND MenuType = 'button'
    AND NOT EXISTS (
        SELECT 1 FROM [dbo].[RoleMenus] 
        WHERE RoleID = @qualityManagerRoleId AND MenuID = [dbo].[Menus].ID
    );
    
    PRINT '✅ 为质量经理角色分配出版异常按钮权限';
END

PRINT '';
PRINT '🎉 出版异常菜单项和权限配置完成！';
PRINT '';
PRINT '已创建的菜单项：';
PRINT '  ✅ 出版异常主菜单 (质量管理 > 出版异常)';
PRINT '  ✅ 新增出版异常按钮权限';
PRINT '  ✅ 编辑出版异常按钮权限';
PRINT '  ✅ 删除出版异常按钮权限';
PRINT '  ✅ 导出出版异常按钮权限';
PRINT '  ✅ 上传图片按钮权限';
PRINT '';
PRINT '已分配权限的角色：';
PRINT '  ✅ 系统管理员 (admin)';
IF @qualityManagerRoleId IS NOT NULL
    PRINT '  ✅ 质量经理 (quality_manager)';
PRINT '';
PRINT '下一步操作：';
PRINT '  1. 重启前端应用以刷新菜单缓存';
PRINT '  2. 使用管理员账户登录验证菜单显示';
PRINT '  3. 测试出版异常页面的增删改功能';
PRINT '  4. 根据需要为其他角色分配相关权限';
PRINT '';

GO