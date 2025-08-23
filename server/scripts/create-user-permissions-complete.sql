-- =====================================================
-- 用户级权限管理数据库完整创建脚本
-- 功能：支持针对具体用户进行菜单或按钮权限的分配
-- 创建时间：2024年
-- =====================================================

-- 1. 用户权限表（UserPermissions）
-- 用于存储用户的个人权限配置，可以覆盖角色权限
CREATE TABLE [UserPermissions] (
    [ID] INT IDENTITY(1,1) PRIMARY KEY,
    [UserID] INT NOT NULL,                    -- 用户ID，关联User表
    [MenuID] INT NOT NULL,                    -- 菜单ID，关联Menus表
    [PermissionType] NVARCHAR(20) NOT NULL,   -- 权限类型：'grant'(授予) 或 'deny'(拒绝)
    [PermissionLevel] NVARCHAR(20) NOT NULL,  -- 权限级别：'menu'(菜单访问) 或 'action'(操作权限)
    [ActionCode] NVARCHAR(50) NULL,           -- 具体操作代码（如：add, edit, delete, view等）
    [GrantedBy] INT NULL,                     -- 授权人ID，关联User表
    [GrantedAt] DATETIME2 DEFAULT GETDATE(),  -- 授权时间
    [ExpiresAt] DATETIME2 NULL,               -- 权限过期时间（NULL表示永久有效）
    [Reason] NVARCHAR(500) NULL,              -- 授权原因说明
    [Status] BIT DEFAULT 1,                   -- 状态：1=有效，0=无效
    [CreatedAt] DATETIME2 DEFAULT GETDATE(),  -- 创建时间
    [UpdatedAt] DATETIME2 DEFAULT GETDATE(),  -- 更新时间
    
    -- 外键约束
    CONSTRAINT [FK_UserPermissions_User] FOREIGN KEY ([UserID]) REFERENCES [User]([ID]) ON DELETE CASCADE,
    CONSTRAINT [FK_UserPermissions_Menu] FOREIGN KEY ([MenuID]) REFERENCES [Menus]([ID]) ON DELETE CASCADE,
    CONSTRAINT [FK_UserPermissions_GrantedBy] FOREIGN KEY ([GrantedBy]) REFERENCES [User]([ID]),
    
    -- 检查约束
    CONSTRAINT [CK_UserPermissions_PermissionType] CHECK ([PermissionType] IN ('grant', 'deny')),
    CONSTRAINT [CK_UserPermissions_PermissionLevel] CHECK ([PermissionLevel] IN ('menu', 'action')),
    
    -- 唯一约束：同一用户对同一菜单的同一操作只能有一条有效记录
    CONSTRAINT [UK_UserPermissions_Unique] UNIQUE ([UserID], [MenuID], [PermissionLevel], [ActionCode], [Status])
);
GO

-- 2. 创建索引以提高查询性能
-- 用户权限查询索引
CREATE INDEX [IX_UserPermissions_UserID_Status] ON [UserPermissions] ([UserID], [Status]);

-- 菜单权限查询索引
CREATE INDEX [IX_UserPermissions_MenuID_Status] ON [UserPermissions] ([MenuID], [Status]);

-- 权限类型查询索引
CREATE INDEX [IX_UserPermissions_PermissionType_Status] ON [UserPermissions] ([PermissionType], [Status]);

-- 过期时间查询索引
CREATE INDEX [IX_UserPermissions_ExpiresAt] ON [UserPermissions] ([ExpiresAt]);
GO

-- 3. 用户权限历史记录表（UserPermissionHistory）
-- 用于记录权限变更历史，便于审计和追踪
CREATE TABLE [UserPermissionHistory] (
    [ID] INT IDENTITY(1,1) PRIMARY KEY,
    [UserPermissionID] INT NULL,              -- 关联的用户权限ID（删除时为NULL）
    [UserID] INT NOT NULL,                    -- 用户ID
    [MenuID] INT NOT NULL,                    -- 菜单ID
    [PermissionType] NVARCHAR(20) NOT NULL,   -- 权限类型
    [PermissionLevel] NVARCHAR(20) NOT NULL,  -- 权限级别
    [ActionCode] NVARCHAR(50) NULL,           -- 操作代码
    [Action] NVARCHAR(20) NOT NULL,           -- 历史操作：'create', 'update', 'delete'
    [OldValue] NVARCHAR(MAX) NULL,            -- 变更前的值（JSON格式）
    [NewValue] NVARCHAR(MAX) NULL,            -- 变更后的值（JSON格式）
    [OperatorID] INT NOT NULL,                -- 操作人ID
    [OperatedAt] DATETIME2 DEFAULT GETDATE(), -- 操作时间
    [Reason] NVARCHAR(500) NULL,              -- 操作原因
    
    -- 外键约束
    CONSTRAINT [FK_UserPermissionHistory_UserPermission] FOREIGN KEY ([UserPermissionID]) REFERENCES [UserPermissions]([ID]),
    CONSTRAINT [FK_UserPermissionHistory_User] FOREIGN KEY ([UserID]) REFERENCES [User]([ID]),
    CONSTRAINT [FK_UserPermissionHistory_Menu] FOREIGN KEY ([MenuID]) REFERENCES [Menus]([ID]),
    CONSTRAINT [FK_UserPermissionHistory_Operator] FOREIGN KEY ([OperatorID]) REFERENCES [User]([ID]),
    
    -- 检查约束
    CONSTRAINT [CK_UserPermissionHistory_Action] CHECK ([Action] IN ('create', 'update', 'delete'))
);
GO

-- 4. 创建历史记录表索引
CREATE INDEX [IX_UserPermissionHistory_UserID] ON [UserPermissionHistory] ([UserID]);
CREATE INDEX [IX_UserPermissionHistory_OperatedAt] ON [UserPermissionHistory] ([OperatedAt]);
CREATE INDEX [IX_UserPermissionHistory_OperatorID] ON [UserPermissionHistory] ([OperatorID]);
GO

-- 5. 创建触发器，自动记录权限变更历史
-- 插入触发器
CREATE TRIGGER [TR_UserPermissions_Insert]
ON [UserPermissions]
AFTER INSERT
AS
BEGIN
    SET NOCOUNT ON;
    
    INSERT INTO [UserPermissionHistory] (
        [UserPermissionID], [UserID], [MenuID], [PermissionType], 
        [PermissionLevel], [ActionCode], [Action], [NewValue], 
        [OperatorID], [Reason]
    )
    SELECT 
        i.[ID], i.[UserID], i.[MenuID], i.[PermissionType],
        i.[PermissionLevel], i.[ActionCode], 'create',
        '{"PermissionType":"' + i.[PermissionType] + '","Status":' + CAST(i.[Status] AS NVARCHAR) + '}',
        ISNULL(i.[GrantedBy], i.[UserID]), i.[Reason]
    FROM inserted i;
END;
GO

-- 更新触发器
CREATE TRIGGER [TR_UserPermissions_Update]
ON [UserPermissions]
AFTER UPDATE
AS
BEGIN
    SET NOCOUNT ON;
    
    INSERT INTO [UserPermissionHistory] (
        [UserPermissionID], [UserID], [MenuID], [PermissionType], 
        [PermissionLevel], [ActionCode], [Action], [OldValue], [NewValue], 
        [OperatorID]
    )
    SELECT 
        i.[ID], i.[UserID], i.[MenuID], i.[PermissionType],
        i.[PermissionLevel], i.[ActionCode], 'update',
        '{"PermissionType":"' + d.[PermissionType] + '","Status":' + CAST(d.[Status] AS NVARCHAR) + '}',
        '{"PermissionType":"' + i.[PermissionType] + '","Status":' + CAST(i.[Status] AS NVARCHAR) + '}',
        ISNULL(i.[GrantedBy], i.[UserID])
    FROM inserted i
    INNER JOIN deleted d ON i.[ID] = d.[ID]
    WHERE i.[PermissionType] != d.[PermissionType] OR i.[Status] != d.[Status];
END;
GO

-- 删除触发器
CREATE TRIGGER [TR_UserPermissions_Delete]
ON [UserPermissions]
AFTER DELETE
AS
BEGIN
    SET NOCOUNT ON;
    
    INSERT INTO [UserPermissionHistory] (
        [UserPermissionID], [UserID], [MenuID], [PermissionType], 
        [PermissionLevel], [ActionCode], [Action], [OldValue], 
        [OperatorID]
    )
    SELECT 
        NULL, d.[UserID], d.[MenuID], d.[PermissionType],
        d.[PermissionLevel], d.[ActionCode], 'delete',
        '{"PermissionType":"' + d.[PermissionType] + '","Status":' + CAST(d.[Status] AS NVARCHAR) + '}',
        ISNULL(d.[GrantedBy], d.[UserID])
    FROM deleted d;
END;
GO

-- 6. 创建视图，方便查询用户的完整权限信息
CREATE VIEW [V_UserCompletePermissions] AS
SELECT 
    u.[ID] as UserID,
    u.[Username],
    u.[RealName],
    m.[ID] as MenuID,
    m.[MenuName],
    m.[MenuCode],
    m.[Path],
    m.[Permission],
    -- 权限来源：'role'(角色权限) 或 'user'(用户权限)
    CASE 
        WHEN up.[ID] IS NOT NULL THEN 'user'
        ELSE 'role'
    END as PermissionSource,
    -- 权限类型：'grant'(授予) 或 'deny'(拒绝) 或 'inherit'(继承角色)
    CASE 
        WHEN up.[PermissionType] IS NOT NULL THEN up.[PermissionType]
        ELSE 'inherit'
    END as PermissionType,
    -- 最终权限状态：考虑用户权限覆盖角色权限
    CASE 
        WHEN up.[PermissionType] = 'deny' THEN 0
        WHEN up.[PermissionType] = 'grant' THEN 1
        WHEN rm.[ID] IS NOT NULL THEN 1
        ELSE 0
    END as HasPermission,
    up.[ActionCode],
    up.[ExpiresAt],
    up.[GrantedBy],
    up.[GrantedAt]
FROM [User] u
CROSS JOIN [Menus] m
LEFT JOIN [UserRoles] ur ON u.[ID] = ur.[UserID]
LEFT JOIN [RoleMenus] rm ON ur.[RoleID] = rm.[RoleID] AND m.[ID] = rm.[MenuID]
LEFT JOIN [UserPermissions] up ON u.[ID] = up.[UserID] 
    AND m.[ID] = up.[MenuID] 
    AND up.[Status] = 1 
    AND (up.[ExpiresAt] IS NULL OR up.[ExpiresAt] > GETDATE())
WHERE u.[Status] = 1 AND m.[Status] = 1;
GO

-- 7. 添加表注释
EXEC sp_addextendedproperty 
    @name = N'MS_Description', 
    @value = N'用户权限表：存储用户的个人权限配置，可以覆盖角色权限', 
    @level0type = N'SCHEMA', @level0name = N'dbo', 
    @level1type = N'TABLE', @level1name = N'UserPermissions';

EXEC sp_addextendedproperty 
    @name = N'MS_Description', 
    @value = N'用户权限历史记录表：记录权限变更历史，便于审计和追踪', 
    @level0type = N'SCHEMA', @level0name = N'dbo', 
    @level1type = N'TABLE', @level1name = N'UserPermissionHistory';

EXEC sp_addextendedproperty 
    @name = N'MS_Description', 
    @value = N'用户完整权限视图：展示用户的完整权限信息，包括角色权限和用户权限', 
    @level0type = N'SCHEMA', @level0name = N'dbo', 
    @level1type = N'VIEW', @level1name = N'V_UserCompletePermissions';
GO

PRINT '用户级权限管理数据库表创建完成！';
PRINT '包含以下组件：';
PRINT '1. UserPermissions - 用户权限表';
PRINT '2. UserPermissionHistory - 权限变更历史表';
PRINT '3. V_UserCompletePermissions - 用户完整权限视图';
PRINT '4. 相关索引和触发器';
PRINT '5. 权限优先级：用户权限 > 角色权限';