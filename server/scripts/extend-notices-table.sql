/**
 * 通知公告表字段扩充脚本
 * 功能：为Notices表添加已读未读功能支持
 * 创建日期：2025-01-27
 * 版本：v1.0
 */

PRINT '开始执行通知公告表字段扩充脚本...';
PRINT '';

-- =====================================================
-- 1. 扩充Notices表字段
-- 添加通知公告功能增强字段
-- =====================================================

-- 检查并添加新字段到Notices表
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[Notices]') AND name = 'ExpiryDate')
BEGIN
    ALTER TABLE [dbo].[Notices] ADD [ExpiryDate] DATETIME NULL;
    EXEC sp_addextendedproperty @name = N'MS_Description', @value = N'通知过期时间，过期后不再显示', 
        @level0type = N'SCHEMA', @level0name = N'dbo', 
        @level1type = N'TABLE', @level1name = N'Notices', 
        @level2type = N'COLUMN', @level2name = N'ExpiryDate';
    PRINT '✅ 已添加ExpiryDate字段（通知过期时间）';
END
ELSE
BEGIN
    PRINT '⚠️ ExpiryDate字段已存在，跳过添加';
END

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[Notices]') AND name = 'IsSticky')
BEGIN
    ALTER TABLE [dbo].[Notices] ADD [IsSticky] BIT NOT NULL DEFAULT 0;
    EXEC sp_addextendedproperty @name = N'MS_Description', @value = N'是否置顶显示', 
        @level0type = N'SCHEMA', @level0name = N'dbo', 
        @level1type = N'TABLE', @level1name = N'Notices', 
        @level2type = N'COLUMN', @level2name = N'IsSticky';
    PRINT '✅ 已添加IsSticky字段（是否置顶）';
END
ELSE
BEGIN
    PRINT '⚠️ IsSticky字段已存在，跳过添加';
END

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[Notices]') AND name = 'TargetUsers')
BEGIN
    ALTER TABLE [dbo].[Notices] ADD [TargetUsers] NVARCHAR(MAX) NULL;
    EXEC sp_addextendedproperty @name = N'MS_Description', @value = N'目标用户ID列表（JSON格式），为空表示全员可见', 
        @level0type = N'SCHEMA', @level0name = N'dbo', 
        @level1type = N'TABLE', @level1name = N'Notices', 
        @level2type = N'COLUMN', @level2name = N'TargetUsers';
    PRINT '✅ 已添加TargetUsers字段（目标用户）';
END
ELSE
BEGIN
    PRINT '⚠️ TargetUsers字段已存在，跳过添加';
END

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[Notices]') AND name = 'RequireConfirmation')
BEGIN
    ALTER TABLE [dbo].[Notices] ADD [RequireConfirmation] BIT NOT NULL DEFAULT 0;
    EXEC sp_addextendedproperty @name = N'MS_Description', @value = N'是否需要用户确认阅读', 
        @level0type = N'SCHEMA', @level0name = N'dbo', 
        @level1type = N'TABLE', @level1name = N'Notices', 
        @level2type = N'COLUMN', @level2name = N'RequireConfirmation';
    PRINT '✅ 已添加RequireConfirmation字段（是否需要确认阅读）';
END
ELSE
BEGIN
    PRINT '⚠️ RequireConfirmation字段已存在，跳过添加';
END

-- =====================================================
-- 2. 创建用户通知阅读状态表
-- 功能：跟踪每个用户对每条通知的阅读状态
-- =====================================================

IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[NoticeReadStatus]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[NoticeReadStatus] (
        [ID] INT IDENTITY(1,1) PRIMARY KEY,                    -- 主键，自增ID
        [NoticeID] INT NOT NULL,                               -- 通知ID（关联Notices表）
        [UserID] INT NOT NULL,                                 -- 用户ID（关联User表）
        [IsRead] BIT NOT NULL DEFAULT 0,                       -- 是否已读
        [ReadTime] DATETIME NULL,                              -- 阅读时间
        [IsConfirmed] BIT NOT NULL DEFAULT 0,                  -- 是否已确认（针对需要确认的通知）
        [ConfirmTime] DATETIME NULL,                           -- 确认时间
        [CreatedAt] DATETIME NOT NULL DEFAULT GETDATE(),       -- 创建时间
        [UpdatedAt] DATETIME NULL,                             -- 更新时间
        
        -- 创建复合唯一索引，确保每个用户对每条通知只有一条记录
        CONSTRAINT UQ_NoticeReadStatus_NoticeUser UNIQUE ([NoticeID], [UserID]),
        
        -- 外键约束
        CONSTRAINT FK_NoticeReadStatus_Notice 
            FOREIGN KEY ([NoticeID]) REFERENCES [dbo].[Notices]([ID]) ON DELETE CASCADE,
        CONSTRAINT FK_NoticeReadStatus_User 
            FOREIGN KEY ([UserID]) REFERENCES [dbo].[User]([ID]) ON DELETE CASCADE
    );
    
    -- 创建性能优化索引
    CREATE INDEX IX_NoticeReadStatus_NoticeID ON [dbo].[NoticeReadStatus] ([NoticeID]);
    CREATE INDEX IX_NoticeReadStatus_UserID ON [dbo].[NoticeReadStatus] ([UserID]);
    CREATE INDEX IX_NoticeReadStatus_IsRead ON [dbo].[NoticeReadStatus] ([IsRead]);
    CREATE INDEX IX_NoticeReadStatus_ReadTime ON [dbo].[NoticeReadStatus] ([ReadTime]);
    
    -- 添加表注释
    EXEC sp_addextendedproperty 
        @name = N'MS_Description', 
        @value = N'用户通知阅读状态表，跟踪每个用户对每条通知的阅读和确认状态', 
        @level0type = N'SCHEMA', @level0name = N'dbo', 
        @level1type = N'TABLE', @level1name = N'NoticeReadStatus';
    
    -- 添加字段注释
    EXEC sp_addextendedproperty @name = N'MS_Description', @value = N'主键，自增ID', @level0type = N'SCHEMA', @level0name = N'dbo', @level1type = N'TABLE', @level1name = N'NoticeReadStatus', @level2type = N'COLUMN', @level2name = N'ID';
    EXEC sp_addextendedproperty @name = N'MS_Description', @value = N'通知ID', @level0type = N'SCHEMA', @level0name = N'dbo', @level1type = N'TABLE', @level1name = N'NoticeReadStatus', @level2type = N'COLUMN', @level2name = N'NoticeID';
    EXEC sp_addextendedproperty @name = N'MS_Description', @value = N'用户ID', @level0type = N'SCHEMA', @level0name = N'dbo', @level1type = N'TABLE', @level1name = N'NoticeReadStatus', @level2type = N'COLUMN', @level2name = N'UserID';
    EXEC sp_addextendedproperty @name = N'MS_Description', @value = N'是否已读', @level0type = N'SCHEMA', @level0name = N'dbo', @level1type = N'TABLE', @level1name = N'NoticeReadStatus', @level2type = N'COLUMN', @level2name = N'IsRead';
    EXEC sp_addextendedproperty @name = N'MS_Description', @value = N'阅读时间', @level0type = N'SCHEMA', @level0name = N'dbo', @level1type = N'TABLE', @level1name = N'NoticeReadStatus', @level2type = N'COLUMN', @level2name = N'ReadTime';
    EXEC sp_addextendedproperty @name = N'MS_Description', @value = N'是否已确认', @level0type = N'SCHEMA', @level0name = N'dbo', @level1type = N'TABLE', @level1name = N'NoticeReadStatus', @level2type = N'COLUMN', @level2name = N'IsConfirmed';
    EXEC sp_addextendedproperty @name = N'MS_Description', @value = N'确认时间', @level0type = N'SCHEMA', @level0name = N'dbo', @level1type = N'TABLE', @level1name = N'NoticeReadStatus', @level2type = N'COLUMN', @level2name = N'ConfirmTime';
    EXEC sp_addextendedproperty @name = N'MS_Description', @value = N'创建时间', @level0type = N'SCHEMA', @level0name = N'dbo', @level1type = N'TABLE', @level1name = N'NoticeReadStatus', @level2type = N'COLUMN', @level2name = N'CreatedAt';
    EXEC sp_addextendedproperty @name = N'MS_Description', @value = N'更新时间', @level0type = N'SCHEMA', @level0name = N'dbo', @level1type = N'TABLE', @level1name = N'NoticeReadStatus', @level2type = N'COLUMN', @level2name = N'UpdatedAt';
    
    PRINT '✅ NoticeReadStatus表创建成功';
END
ELSE
BEGIN
    PRINT '⚠️ NoticeReadStatus表已存在，跳过创建';
END

-- =====================================================
-- 3. 为Notices表添加新字段的索引
-- =====================================================

-- 为新字段创建索引以优化查询性能
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_Notices_ExpiryDate')
BEGIN
    CREATE INDEX IX_Notices_ExpiryDate ON [dbo].[Notices] ([ExpiryDate]);
    PRINT '✅ 已创建ExpiryDate字段索引';
END

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_Notices_IsSticky')
BEGIN
    CREATE INDEX IX_Notices_IsSticky ON [dbo].[Notices] ([IsSticky]);
    PRINT '✅ 已创建IsSticky字段索引';
END

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_Notices_RequireConfirmation')
BEGIN
    CREATE INDEX IX_Notices_RequireConfirmation ON [dbo].[Notices] ([RequireConfirmation]);
    PRINT '✅ 已创建RequireConfirmation字段索引';
END

-- =====================================================
-- 4. 创建自动更新触发器
-- =====================================================

-- 创建触发器自动更新NoticeReadStatus表的UpdatedAt字段
IF EXISTS (SELECT * FROM sys.triggers WHERE name = 'TR_NoticeReadStatus_UpdateFields')
BEGIN
    DROP TRIGGER TR_NoticeReadStatus_UpdateFields;
END
GO

CREATE TRIGGER TR_NoticeReadStatus_UpdateFields
ON [dbo].[NoticeReadStatus]
FOR UPDATE
AS
BEGIN
    SET NOCOUNT ON;
    
    -- 更新UpdatedAt字段为当前时间
    UPDATE nrs
    SET UpdatedAt = GETDATE()
    FROM [dbo].[NoticeReadStatus] nrs
    INNER JOIN inserted i ON nrs.ID = i.ID;
END
GO

PRINT '✅ NoticeReadStatus表更新触发器创建成功';

-- =====================================================
-- 5. 插入测试数据（可选）
-- =====================================================

-- 为现有通知创建一些测试的阅读状态记录
-- 注意：这里假设用户ID为1的用户存在
IF EXISTS (SELECT 1 FROM [dbo].[User] WHERE ID = 1) AND EXISTS (SELECT 1 FROM [dbo].[Notices])
BEGIN
    -- 为用户1创建一些阅读状态记录
    INSERT INTO [dbo].[NoticeReadStatus] ([NoticeID], [UserID], [IsRead], [ReadTime])
    SELECT TOP 2 
        n.ID, 
        1, 
        1, 
        DATEADD(MINUTE, -RAND() * 1440, GETDATE()) -- 随机时间（最近24小时内）
    FROM [dbo].[Notices] n
    WHERE NOT EXISTS (
        SELECT 1 FROM [dbo].[NoticeReadStatus] nrs 
        WHERE nrs.NoticeID = n.ID AND nrs.UserID = 1
    );
    
    PRINT '✅ 已插入测试阅读状态数据';
END

PRINT '';
PRINT '=== 通知公告表字段扩充完成 ===';
PRINT '';
PRINT '新增功能：';
PRINT '  ✅ 通知过期时间管理';
PRINT '  ✅ 通知置顶功能';
PRINT '  ✅ 目标用户定向推送';
PRINT '  ✅ 阅读确认功能';
PRINT '  ✅ 用户阅读状态跟踪';
PRINT '  ✅ 已读未读状态管理';
PRINT '';
PRINT '数据库结构：';
PRINT '  ✅ Notices表新增4个字段';
PRINT '  ✅ 新建NoticeReadStatus关联表';
PRINT '  ✅ 创建相关索引和触发器';
PRINT '';
PRINT '下一步操作：';
PRINT '  1. 更新后端API以支持新功能';
PRINT '  2. 更新前端界面显示已读未读状态';
PRINT '  3. 实现通知徽标提醒功能';
PRINT '  4. 测试通知公告完整功能';
PRINT '';