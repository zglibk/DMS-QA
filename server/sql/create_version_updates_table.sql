/*
 * 版本更新信息表创建脚本
 * 
 * 功能说明：
 * 1. 创建版本更新信息表，用于存储系统版本更新的详细信息
 * 2. 支持版本更新内容的分类存储和管理
 * 3. 集成到现有通知系统，支持版本更新通知推送
 * 
 * 使用方法：
 * 1. 在SQL Server Management Studio中连接到DMS-QA数据库
 * 2. 执行此脚本创建版本更新相关表
 */

-- =====================================================
-- 版本更新信息表 (VersionUpdates)
-- 功能：存储系统版本更新的详细信息
-- 用途：版本管理、更新日志、通知推送
-- =====================================================

IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[VersionUpdates]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[VersionUpdates] (
        -- 基础信息字段
        [ID] INT IDENTITY(1,1) PRIMARY KEY,                    -- 主键，自增ID
        [Version] NVARCHAR(50) NOT NULL,                       -- 版本号（如：2.3.0）
        [Title] NVARCHAR(200) NOT NULL,                        -- 版本标题
        [Description] NVARCHAR(MAX) NULL,                      -- 版本描述
        [ReleaseDate] DATETIME NOT NULL DEFAULT GETDATE(),     -- 发布日期
        
        -- 版本状态管理
        [Status] NVARCHAR(20) NOT NULL DEFAULT 'draft',        -- 状态：draft(草稿)、published(已发布)、archived(已归档)
        [IsActive] BIT NOT NULL DEFAULT 1,                     -- 是否有效
        [IsMajorUpdate] BIT NOT NULL DEFAULT 0,                -- 是否为重大更新
        
        -- 统计信息
        [TotalCommits] INT NOT NULL DEFAULT 0,                 -- 总提交数
        [FeaturesCount] INT NOT NULL DEFAULT 0,                -- 新功能数量
        [FixesCount] INT NOT NULL DEFAULT 0,                   -- 修复数量
        [ImprovementsCount] INT NOT NULL DEFAULT 0,            -- 改进数量
        [OtherCount] INT NOT NULL DEFAULT 0,                   -- 其他更改数量
        
        -- 内容存储
        [ChangelogMarkdown] NVARCHAR(MAX) NULL,                -- Markdown格式的更新日志
        [ChangelogJson] NVARCHAR(MAX) NULL,                    -- JSON格式的更新日志数据
        [Contributors] NVARCHAR(MAX) NULL,                     -- 贡献者信息（JSON格式）
        
        -- 通知相关
        [NotificationSent] BIT NOT NULL DEFAULT 0,             -- 是否已发送通知
        [NotificationDate] DATETIME NULL,                      -- 通知发送时间
        [NoticeID] INT NULL,                                   -- 关联的通知ID
        
        -- 时间管理字段
        [CreatedAt] DATETIME NOT NULL DEFAULT GETDATE(),       -- 创建时间
        [UpdatedAt] DATETIME NULL,                             -- 更新时间
        [CreatedBy] INT NOT NULL DEFAULT 1,                    -- 创建人ID（关联User表）
        
        -- 外键约束
        CONSTRAINT FK_VersionUpdates_User 
            FOREIGN KEY ([CreatedBy]) REFERENCES [dbo].[User]([ID]),
        CONSTRAINT FK_VersionUpdates_Notice 
            FOREIGN KEY ([NoticeID]) REFERENCES [dbo].[Notices]([ID])
    );
    
    -- 创建性能优化索引
    CREATE UNIQUE INDEX IX_VersionUpdates_Version ON [dbo].[VersionUpdates] ([Version]);
    CREATE INDEX IX_VersionUpdates_Status ON [dbo].[VersionUpdates] ([Status]);
    CREATE INDEX IX_VersionUpdates_ReleaseDate ON [dbo].[VersionUpdates] ([ReleaseDate]);
    CREATE INDEX IX_VersionUpdates_IsActive ON [dbo].[VersionUpdates] ([IsActive]);
    CREATE INDEX IX_VersionUpdates_IsMajorUpdate ON [dbo].[VersionUpdates] ([IsMajorUpdate]);
    CREATE INDEX IX_VersionUpdates_NotificationSent ON [dbo].[VersionUpdates] ([NotificationSent]);
    
    -- 添加表注释
    EXEC sp_addextendedproperty 
        @name = N'MS_Description', 
        @value = N'版本更新信息表，存储系统版本更新的详细信息和统计数据', 
        @level0type = N'SCHEMA', @level0name = N'dbo', 
        @level1type = N'TABLE', @level1name = N'VersionUpdates';
    
    -- 添加字段注释
    EXEC sp_addextendedproperty @name = N'MS_Description', @value = N'主键，自增ID', @level0type = N'SCHEMA', @level0name = N'dbo', @level1type = N'TABLE', @level1name = N'VersionUpdates', @level2type = N'COLUMN', @level2name = N'ID';
    EXEC sp_addextendedproperty @name = N'MS_Description', @value = N'版本号', @level0type = N'SCHEMA', @level0name = N'dbo', @level1type = N'TABLE', @level1name = N'VersionUpdates', @level2type = N'COLUMN', @level2name = N'Version';
    EXEC sp_addextendedproperty @name = N'MS_Description', @value = N'版本标题', @level0type = N'SCHEMA', @level0name = N'dbo', @level1type = N'TABLE', @level1name = N'VersionUpdates', @level2type = N'COLUMN', @level2name = N'Title';
    EXEC sp_addextendedproperty @name = N'MS_Description', @value = N'版本描述', @level0type = N'SCHEMA', @level0name = N'dbo', @level1type = N'TABLE', @level1name = N'VersionUpdates', @level2type = N'COLUMN', @level2name = N'Description';
    EXEC sp_addextendedproperty @name = N'MS_Description', @value = N'发布日期', @level0type = N'SCHEMA', @level0name = N'dbo', @level1type = N'TABLE', @level1name = N'VersionUpdates', @level2type = N'COLUMN', @level2name = N'ReleaseDate';
    EXEC sp_addextendedproperty @name = N'MS_Description', @value = N'状态：draft(草稿)、published(已发布)、archived(已归档)', @level0type = N'SCHEMA', @level0name = N'dbo', @level1type = N'TABLE', @level1name = N'VersionUpdates', @level2type = N'COLUMN', @level2name = N'Status';
    EXEC sp_addextendedproperty @name = N'MS_Description', @value = N'是否为重大更新', @level0type = N'SCHEMA', @level0name = N'dbo', @level1type = N'TABLE', @level1name = N'VersionUpdates', @level2type = N'COLUMN', @level2name = N'IsMajorUpdate';
    EXEC sp_addextendedproperty @name = N'MS_Description', @value = N'总提交数', @level0type = N'SCHEMA', @level0name = N'dbo', @level1type = N'TABLE', @level1name = N'VersionUpdates', @level2type = N'COLUMN', @level2name = N'TotalCommits';
    EXEC sp_addextendedproperty @name = N'MS_Description', @value = N'Markdown格式的更新日志', @level0type = N'SCHEMA', @level0name = N'dbo', @level1type = N'TABLE', @level1name = N'VersionUpdates', @level2type = N'COLUMN', @level2name = N'ChangelogMarkdown';
    EXEC sp_addextendedproperty @name = N'MS_Description', @value = N'JSON格式的更新日志数据', @level0type = N'SCHEMA', @level0name = N'dbo', @level1type = N'TABLE', @level1name = N'VersionUpdates', @level2type = N'COLUMN', @level2name = N'ChangelogJson';
    EXEC sp_addextendedproperty @name = N'MS_Description', @value = N'贡献者信息（JSON格式）', @level0type = N'SCHEMA', @level0name = N'dbo', @level1type = N'TABLE', @level1name = N'VersionUpdates', @level2type = N'COLUMN', @level2name = N'Contributors';
    EXEC sp_addextendedproperty @name = N'MS_Description', @value = N'是否已发送通知', @level0type = N'SCHEMA', @level0name = N'dbo', @level1type = N'TABLE', @level1name = N'VersionUpdates', @level2type = N'COLUMN', @level2name = N'NotificationSent';
    EXEC sp_addextendedproperty @name = N'MS_Description', @value = N'关联的通知ID', @level0type = N'SCHEMA', @level0name = N'dbo', @level1type = N'TABLE', @level1name = N'VersionUpdates', @level2type = N'COLUMN', @level2name = N'NoticeID';
    
    PRINT '✅ 版本更新信息表创建成功';
END
ELSE
BEGIN
    PRINT '⚠️ 版本更新信息表已存在，跳过创建';
END

-- =====================================================
-- 版本更新详细项目表 (VersionUpdateItems)
-- 功能：存储版本更新的具体项目详情
-- 用途：详细记录每个更新项目的信息
-- =====================================================

IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[VersionUpdateItems]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[VersionUpdateItems] (
        -- 基础信息字段
        [ID] INT IDENTITY(1,1) PRIMARY KEY,                    -- 主键，自增ID
        [VersionUpdateID] INT NOT NULL,                        -- 版本更新ID（关联VersionUpdates表）
        [Category] NVARCHAR(50) NOT NULL,                      -- 更新类别（features、fixes、improvements等）
        [Title] NVARCHAR(500) NOT NULL,                        -- 更新项目标题
        [Description] NVARCHAR(MAX) NULL,                      -- 详细描述
        
        -- Git提交信息
        [CommitHash] NVARCHAR(100) NULL,                       -- Git提交哈希值
        [CommitShortHash] NVARCHAR(20) NULL,                   -- Git提交短哈希值
        [CommitAuthor] NVARCHAR(100) NULL,                     -- 提交作者
        [CommitDate] DATETIME NULL,                            -- 提交日期
        [CommitEmail] NVARCHAR(200) NULL,                      -- 提交者邮箱
        
        -- 排序和显示
        [SortOrder] INT NOT NULL DEFAULT 0,                   -- 排序顺序
        [IsHighlight] BIT NOT NULL DEFAULT 0,                 -- 是否为重点项目
        
        -- 时间管理字段
        [CreatedAt] DATETIME NOT NULL DEFAULT GETDATE(),       -- 创建时间
        [UpdatedAt] DATETIME NULL,                             -- 更新时间
        
        -- 外键约束
        CONSTRAINT FK_VersionUpdateItems_VersionUpdate 
            FOREIGN KEY ([VersionUpdateID]) REFERENCES [dbo].[VersionUpdates]([ID]) ON DELETE CASCADE
    );
    
    -- 创建性能优化索引
    CREATE INDEX IX_VersionUpdateItems_VersionUpdateID ON [dbo].[VersionUpdateItems] ([VersionUpdateID]);
    CREATE INDEX IX_VersionUpdateItems_Category ON [dbo].[VersionUpdateItems] ([Category]);
    CREATE INDEX IX_VersionUpdateItems_SortOrder ON [dbo].[VersionUpdateItems] ([SortOrder]);
    CREATE INDEX IX_VersionUpdateItems_IsHighlight ON [dbo].[VersionUpdateItems] ([IsHighlight]);
    CREATE INDEX IX_VersionUpdateItems_CommitHash ON [dbo].[VersionUpdateItems] ([CommitHash]);
    
    -- 添加表注释
    EXEC sp_addextendedproperty 
        @name = N'MS_Description', 
        @value = N'版本更新详细项目表，存储每个版本更新的具体项目信息', 
        @level0type = N'SCHEMA', @level0name = N'dbo', 
        @level1type = N'TABLE', @level1name = N'VersionUpdateItems';
    
    PRINT '✅ 版本更新详细项目表创建成功';
END
ELSE
BEGIN
    PRINT '⚠️ 版本更新详细项目表已存在，跳过创建';
END

PRINT '✅ 版本更新相关表创建完成';
PRINT '📋 可以开始使用版本更新管理功能了！';