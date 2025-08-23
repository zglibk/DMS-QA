-- =====================================================
-- 用户级权限管理初始化数据脚本
-- 功能：插入示例数据和常用权限配置
-- 创建时间：2024年
-- =====================================================

-- 检查表是否存在
IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'UserPermissions')
BEGIN
    PRINT '错误：UserPermissions表不存在，请先执行create-user-permissions-table.sql脚本';
    RETURN;
END

PRINT '开始初始化用户权限数据...';

-- 1. 插入一些示例用户权限配置
-- 假设我们有一个普通用户需要特殊权限
DECLARE @TestUserID INT;
DECLARE @AdminUserID INT;
DECLARE @QualityMenuID INT;
DECLARE @PublishingExceptionsMenuID INT;

-- 获取测试用户ID（如果存在）
SELECT @TestUserID = ID FROM [User] WHERE Username = 'testuser';
SELECT @AdminUserID = ID FROM [User] WHERE Username = 'admin';

-- 获取菜单ID
SELECT @QualityMenuID = ID FROM [Menus] WHERE MenuCode = 'quality-management';
SELECT @PublishingExceptionsMenuID = ID FROM [Menus] WHERE MenuCode = 'publishing-exceptions';

-- 如果没有测试用户，创建一个
IF @TestUserID IS NULL
BEGIN
    -- 创建测试用户
    INSERT INTO [User] (Username, Password, RealName, Status)
    VALUES ('testuser', '$2a$10$example.hash.for.testing', '测试用户', 1);
    
    SET @TestUserID = SCOPE_IDENTITY();
    PRINT '已创建测试用户 testuser，ID: ' + CAST(@TestUserID AS NVARCHAR(10));
END

-- 2. 示例权限配置
-- 场景1：授予普通用户访问质量管理模块的权限
IF @TestUserID IS NOT NULL AND @QualityMenuID IS NOT NULL
BEGIN
    -- 检查是否已存在相同权限
    IF NOT EXISTS (
        SELECT 1 FROM [UserPermissions] 
        WHERE UserID = @TestUserID 
            AND MenuID = @QualityMenuID 
            AND PermissionType = 'grant' 
            AND PermissionLevel = 'menu'
            AND Status = 1
    )
    BEGIN
        INSERT INTO [UserPermissions] (
            UserID, MenuID, PermissionType, PermissionLevel, 
            GrantedBy, Reason, Status
        )
        VALUES (
            @TestUserID, @QualityMenuID, 'grant', 'menu',
            @AdminUserID, '临时授权访问质量管理模块进行数据分析', 1
        );
        PRINT '已为测试用户授予质量管理模块访问权限';
    END
    ELSE
    BEGIN
        PRINT '测试用户已拥有质量管理模块访问权限，跳过插入';
    END
END

-- 场景2：授予用户对出版异常模块的特定操作权限
IF @TestUserID IS NOT NULL AND @PublishingExceptionsMenuID IS NOT NULL
BEGIN
    -- 授予查看权限
    IF NOT EXISTS (
        SELECT 1 FROM [UserPermissions] 
        WHERE UserID = @TestUserID 
            AND MenuID = @PublishingExceptionsMenuID 
            AND PermissionType = 'grant' 
            AND PermissionLevel = 'action'
            AND ActionCode = 'view'
            AND Status = 1
    )
    BEGIN
        INSERT INTO [UserPermissions] (
            UserID, MenuID, PermissionType, PermissionLevel, ActionCode,
            GrantedBy, Reason, Status
        )
        VALUES (
            @TestUserID, @PublishingExceptionsMenuID, 'grant', 'action', 'view',
            @AdminUserID, '授权查看出版异常数据', 1
        );
    END
    
    -- 授予编辑权限
    IF NOT EXISTS (
        SELECT 1 FROM [UserPermissions] 
        WHERE UserID = @TestUserID 
            AND MenuID = @PublishingExceptionsMenuID 
            AND PermissionType = 'grant' 
            AND PermissionLevel = 'action'
            AND ActionCode = 'edit'
            AND Status = 1
    )
    BEGIN
        INSERT INTO [UserPermissions] (
            UserID, MenuID, PermissionType, PermissionLevel, ActionCode,
            GrantedBy, Reason, Status
        )
        VALUES (
            @TestUserID, @PublishingExceptionsMenuID, 'grant', 'action', 'edit',
            @AdminUserID, '授权编辑出版异常数据', 1
        );
    END
    
    -- 拒绝删除权限（明确拒绝）
    IF NOT EXISTS (
        SELECT 1 FROM [UserPermissions] 
        WHERE UserID = @TestUserID 
            AND MenuID = @PublishingExceptionsMenuID 
            AND PermissionType = 'deny' 
            AND PermissionLevel = 'action'
            AND ActionCode = 'delete'
            AND Status = 1
    )
    BEGIN
        INSERT INTO [UserPermissions] (
            UserID, MenuID, PermissionType, PermissionLevel, ActionCode,
            GrantedBy, Reason, Status
        )
        VALUES (
            @TestUserID, @PublishingExceptionsMenuID, 'deny', 'action', 'delete',
            @AdminUserID, '出于安全考虑，禁止删除出版异常数据', 1
        );
    END
    
    PRINT '已为测试用户配置出版异常模块的详细权限';
END

-- 3. 创建一些带过期时间的临时权限
DECLARE @TempMenuID INT;
SELECT @TempMenuID = ID FROM [Menus] WHERE MenuCode = 'user-management';

IF @TestUserID IS NOT NULL AND @TempMenuID IS NOT NULL
BEGIN
    -- 检查是否已存在相同权限
    IF NOT EXISTS (
        SELECT 1 FROM [UserPermissions] 
        WHERE UserID = @TestUserID 
            AND MenuID = @TempMenuID 
            AND PermissionType = 'grant' 
            AND PermissionLevel = 'menu'
            AND Status = 1
    )
    BEGIN
        INSERT INTO [UserPermissions] (
            UserID, MenuID, PermissionType, PermissionLevel,
            GrantedBy, ExpiresAt, Reason, Status
        )
        VALUES (
            @TestUserID, @TempMenuID, 'grant', 'menu',
            @AdminUserID, DATEADD(DAY, 7, GETDATE()), '临时授权7天用户管理权限', 1
        );
        PRINT '已为测试用户创建7天临时用户管理权限';
    END
    ELSE
    BEGIN
        PRINT '测试用户已拥有用户管理权限，跳过插入';
    END
END

-- 4. 创建一些常用的权限配置函数
GO

-- 批量授权函数
CREATE PROCEDURE [sp_GrantUserPermission]
    @UserID INT,
    @MenuID INT,
    @PermissionLevel NVARCHAR(20) = 'menu',
    @ActionCode NVARCHAR(50) = NULL,
    @GrantedBy INT,
    @ExpiresAt DATETIME2 = NULL,
    @Reason NVARCHAR(500) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    
    -- 检查是否已存在相同权限
    IF EXISTS (
        SELECT 1 FROM [UserPermissions] 
        WHERE UserID = @UserID 
            AND MenuID = @MenuID 
            AND PermissionLevel = @PermissionLevel 
            AND ISNULL(ActionCode, '') = ISNULL(@ActionCode, '')
            AND Status = 1
    )
    BEGIN
        PRINT '权限已存在，无需重复授权';
        RETURN;
    END
    
    -- 插入新权限
    INSERT INTO [UserPermissions] (
        UserID, MenuID, PermissionType, PermissionLevel, ActionCode,
        GrantedBy, ExpiresAt, Reason, Status
    )
    VALUES (
        @UserID, @MenuID, 'grant', @PermissionLevel, @ActionCode,
        @GrantedBy, @ExpiresAt, @Reason, 1
    );
    
    PRINT '权限授予成功';
END;
GO

-- 撤销权限函数
CREATE PROCEDURE [sp_RevokeUserPermission]
    @UserID INT,
    @MenuID INT,
    @PermissionLevel NVARCHAR(20) = 'menu',
    @ActionCode NVARCHAR(50) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    
    -- 将权限状态设为无效
    UPDATE [UserPermissions]
    SET Status = 0, UpdatedAt = GETDATE()
    WHERE UserID = @UserID 
        AND MenuID = @MenuID 
        AND PermissionLevel = @PermissionLevel 
        AND ISNULL(ActionCode, '') = ISNULL(@ActionCode, '')
        AND Status = 1;
    
    IF @@ROWCOUNT > 0
        PRINT '权限撤销成功';
    ELSE
        PRINT '未找到要撤销的权限';
END;
GO

-- 查询用户权限函数
CREATE PROCEDURE [sp_GetUserPermissions]
    @UserID INT,
    @MenuID INT = NULL
AS
BEGIN
    SET NOCOUNT ON;
    
    SELECT 
        up.ID,
        u.Username,
        u.RealName,
        m.MenuName,
        m.MenuCode,
        up.PermissionType,
        up.PermissionLevel,
        up.ActionCode,
        up.GrantedAt,
        up.ExpiresAt,
        gb.RealName as GrantedByName,
        up.Reason,
        CASE 
            WHEN up.ExpiresAt IS NULL THEN '永久有效'
            WHEN up.ExpiresAt > GETDATE() THEN '有效'
            ELSE '已过期'
        END as PermissionStatus
    FROM [UserPermissions] up
    INNER JOIN [User] u ON up.UserID = u.ID
    INNER JOIN [Menus] m ON up.MenuID = m.ID
    LEFT JOIN [User] gb ON up.GrantedBy = gb.ID
    WHERE up.UserID = @UserID
        AND up.Status = 1
        AND (@MenuID IS NULL OR up.MenuID = @MenuID)
    ORDER BY up.GrantedAt DESC;
END;
GO

-- 清理过期权限的存储过程
CREATE PROCEDURE [sp_CleanExpiredPermissions]
AS
BEGIN
    SET NOCOUNT ON;
    
    DECLARE @CleanedCount INT;
    
    UPDATE [UserPermissions]
    SET Status = 0, UpdatedAt = GETDATE()
    WHERE ExpiresAt IS NOT NULL 
        AND ExpiresAt <= GETDATE() 
        AND Status = 1;
    
    SET @CleanedCount = @@ROWCOUNT;
    
    PRINT '已清理 ' + CAST(@CleanedCount AS NVARCHAR(10)) + ' 条过期权限';
END;
GO

-- 5. 创建定时清理作业（可选）
-- 注意：这需要SQL Server Agent服务
/*
USE msdb;
GO

-- 创建清理过期权限的作业
EXEC dbo.sp_add_job
    @job_name = N'清理过期用户权限';

EXEC dbo.sp_add_jobstep
    @job_name = N'清理过期用户权限',
    @step_name = N'执行清理',
    @command = N'EXEC [DMS_QA].[dbo].[sp_CleanExpiredPermissions];';

EXEC dbo.sp_add_schedule
    @schedule_name = N'每日清理',
    @freq_type = 4,  -- 每日
    @freq_interval = 1,
    @active_start_time = 020000;  -- 凌晨2点

EXEC dbo.sp_attach_schedule
    @job_name = N'清理过期用户权限',
    @schedule_name = N'每日清理';

EXEC dbo.sp_add_jobserver
    @job_name = N'清理过期用户权限';
*/

PRINT '用户权限管理初始化完成！';
PRINT '已创建以下存储过程：';
PRINT '1. sp_GrantUserPermission - 授予用户权限';
PRINT '2. sp_RevokeUserPermission - 撤销用户权限';
PRINT '3. sp_GetUserPermissions - 查询用户权限';
PRINT '4. sp_CleanExpiredPermissions - 清理过期权限';
PRINT '';
PRINT '示例用法：';
PRINT 'EXEC sp_GrantUserPermission @UserID=1, @MenuID=1, @GrantedBy=1, @Reason=''测试权限'';';
PRINT 'EXEC sp_GetUserPermissions @UserID=1;';
PRINT 'EXEC sp_RevokeUserPermission @UserID=1, @MenuID=1;';
PRINT 'EXEC sp_CleanExpiredPermissions;';