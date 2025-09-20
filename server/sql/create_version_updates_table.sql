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

-- 检查表是否存在，如果不存在则创建
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[VersionUpdates]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[VersionUpdates] (
        -- 基础信息字段
        [ID] INT IDENTITY(1,1) PRIMARY KEY,                    -- 主键，自增ID
        [Version] NVARCHAR(50) NOT NULL UNIQUE,                -- 版本号（如：v2.3.0）
        [VersionName] NVARCHAR(200) NULL,                      -- 版本名称（如：质量管理系统优化版）
        [ReleaseDate] DATETIME NOT NULL DEFAULT GETDATE(),     -- 发布日期
        [IsActive] BIT NOT NULL DEFAULT 1,                     -- 是否激活状态
        [IsCurrent] BIT NOT NULL DEFAULT 0,                    -- 是否为当前版本
        
        -- 更新内容字段
        [Summary] NVARCHAR(1000) NULL,                         -- 版本更新摘要
        [Features] NVARCHAR(MAX) NULL,                         -- 新功能列表（JSON格式）
        [Fixes] NVARCHAR(MAX) NULL,                            -- 修复内容列表（JSON格式）
        [Improvements] NVARCHAR(MAX) NULL,                     -- 改进内容列表（JSON格式）
        [BreakingChanges] NVARCHAR(MAX) NULL,                  -- 破坏性变更（JSON格式）
        [Dependencies] NVARCHAR(MAX) NULL,                     -- 依赖变更（JSON格式）
        
        -- Git版本控制信息
        [GitTag] NVARCHAR(100) NULL,                           -- Git标签
        [GitCommit] NVARCHAR(100) NULL,                        -- Git提交哈希
        [GitBranch] NVARCHAR(100) NULL,                        -- Git分支
        
        -- 发布信息
        [ReleaseNotes] NVARCHAR(MAX) NULL,                     -- 发布说明（Markdown格式）
        [DownloadUrl] NVARCHAR(500) NULL,                      -- 下载链接
        [DocumentationUrl] NVARCHAR(500) NULL,                 -- 文档链接
        [ChangelogUrl] NVARCHAR(500) NULL,                     -- 变更日志链接
        
        -- 版本类型和优先级
        [VersionType] NVARCHAR(20) NOT NULL DEFAULT 'minor',   -- 版本类型：major/minor/patch/hotfix
        [Priority] NVARCHAR(20) NOT NULL DEFAULT 'normal',     -- 优先级：low/normal/high/critical
        [Stability] NVARCHAR(20) NOT NULL DEFAULT 'stable',    -- 稳定性：alpha/beta/rc/stable
        
        -- 兼容性信息
        [MinRequiredVersion] NVARCHAR(50) NULL,                -- 最低兼容版本
        [DatabaseVersion] NVARCHAR(50) NULL,                   -- 数据库版本要求
        [NodeVersion] NVARCHAR(50) NULL,                       -- Node.js版本要求
        
        -- 统计信息
        [DownloadCount] INT NOT NULL DEFAULT 0,                -- 下载次数
        [InstallCount] INT NOT NULL DEFAULT 0,                 -- 安装次数
        [FeedbackCount] INT NOT NULL DEFAULT 0,                -- 反馈次数
        [RatingAverage] DECIMAL(3,2) NULL,                     -- 平均评分
        
        -- 时间管理字段
        [CreatedAt] DATETIME NOT NULL DEFAULT GETDATE(),       -- 创建时间
        [UpdatedAt] DATETIME NULL,                             -- 更新时间
        [PublishedAt] DATETIME NULL,                           -- 发布时间
        [DeprecatedAt] DATETIME NULL,                          -- 废弃时间
        
        -- 操作人员信息
        [CreatedBy] NVARCHAR(100) NULL,                        -- 创建人
        [UpdatedBy] NVARCHAR(100) NULL,                        -- 更新人
        [PublishedBy] NVARCHAR(100) NULL,                      -- 发布人
        
        -- 扩展信息
        [Metadata] NVARCHAR(MAX) NULL,                         -- 元数据（JSON格式）
        [Tags] NVARCHAR(500) NULL,                             -- 标签（逗号分隔）
        [Contributors] NVARCHAR(MAX) NULL,                     -- 贡献者信息（JSON格式）
        
        -- 通知相关
        [NotificationSent] BIT NOT NULL DEFAULT 0,             -- 是否已发送通知
        [NoticeID] INT NULL                                    -- 关联的通知ID
    );
    
    -- 创建性能优化索引
    CREATE INDEX IX_VersionUpdates_Version ON [dbo].[VersionUpdates] ([Version]);
    CREATE INDEX IX_VersionUpdates_ReleaseDate ON [dbo].[VersionUpdates] ([ReleaseDate]);
    CREATE INDEX IX_VersionUpdates_IsActive ON [dbo].[VersionUpdates] ([IsActive]);
    CREATE INDEX IX_VersionUpdates_IsCurrent ON [dbo].[VersionUpdates] ([IsCurrent]);
    CREATE INDEX IX_VersionUpdates_VersionType ON [dbo].[VersionUpdates] ([VersionType]);
    CREATE INDEX IX_VersionUpdates_Priority ON [dbo].[VersionUpdates] ([Priority]);
    CREATE INDEX IX_VersionUpdates_Stability ON [dbo].[VersionUpdates] ([Stability]);
    CREATE INDEX IX_VersionUpdates_PublishedAt ON [dbo].[VersionUpdates] ([PublishedAt]);
    CREATE INDEX IX_VersionUpdates_CreatedAt ON [dbo].[VersionUpdates] ([CreatedAt]);
    
    -- 添加表注释
    EXEC sp_addextendedproperty 
        @name = N'MS_Description', 
        @value = N'版本更新信息表，存储系统版本更新的详细信息', 
        @level0type = N'SCHEMA', @level0name = N'dbo', 
        @level1type = N'TABLE', @level1name = N'VersionUpdates';
    
    -- 添加字段注释
    EXEC sp_addextendedproperty @name = N'MS_Description', @value = N'主键，自增ID', @level0type = N'SCHEMA', @level0name = N'dbo', @level1type = N'TABLE', @level1name = N'VersionUpdates', @level2type = N'COLUMN', @level2name = N'ID';
    EXEC sp_addextendedproperty @name = N'MS_Description', @value = N'版本号（如：v2.3.0）', @level0type = N'SCHEMA', @level0name = N'dbo', @level1type = N'TABLE', @level1name = N'VersionUpdates', @level2type = N'COLUMN', @level2name = N'Version';
    EXEC sp_addextendedproperty @name = N'MS_Description', @value = N'版本名称（如：质量管理系统优化版）', @level0type = N'SCHEMA', @level0name = N'dbo', @level1type = N'TABLE', @level1name = N'VersionUpdates', @level2type = N'COLUMN', @level2name = N'VersionName';
    EXEC sp_addextendedproperty @name = N'MS_Description', @value = N'发布日期', @level0type = N'SCHEMA', @level0name = N'dbo', @level1type = N'TABLE', @level1name = N'VersionUpdates', @level2type = N'COLUMN', @level2name = N'ReleaseDate';
    EXEC sp_addextendedproperty @name = N'MS_Description', @value = N'是否激活状态', @level0type = N'SCHEMA', @level0name = N'dbo', @level1type = N'TABLE', @level1name = N'VersionUpdates', @level2type = N'COLUMN', @level2name = N'IsActive';
    EXEC sp_addextendedproperty @name = N'MS_Description', @value = N'是否为当前版本', @level0type = N'SCHEMA', @level0name = N'dbo', @level1type = N'TABLE', @level1name = N'VersionUpdates', @level2type = N'COLUMN', @level2name = N'IsCurrent';
    EXEC sp_addextendedproperty @name = N'MS_Description', @value = N'版本更新摘要', @level0type = N'SCHEMA', @level0name = N'dbo', @level1type = N'TABLE', @level1name = N'VersionUpdates', @level2type = N'COLUMN', @level2name = N'Summary';
    EXEC sp_addextendedproperty @name = N'MS_Description', @value = N'新功能列表（JSON格式）', @level0type = N'SCHEMA', @level0name = N'dbo', @level1type = N'TABLE', @level1name = N'VersionUpdates', @level2type = N'COLUMN', @level2name = N'Features';
    EXEC sp_addextendedproperty @name = N'MS_Description', @value = N'修复内容列表（JSON格式）', @level0type = N'SCHEMA', @level0name = N'dbo', @level1type = N'TABLE', @level1name = N'VersionUpdates', @level2type = N'COLUMN', @level2name = N'Fixes';
    EXEC sp_addextendedproperty @name = N'MS_Description', @value = N'改进内容列表（JSON格式）', @level0type = N'SCHEMA', @level0name = N'dbo', @level1type = N'TABLE', @level1name = N'VersionUpdates', @level2type = N'COLUMN', @level2name = N'Improvements';
    EXEC sp_addextendedproperty @name = N'MS_Description', @value = N'破坏性变更（JSON格式）', @level0type = N'SCHEMA', @level0name = N'dbo', @level1type = N'TABLE', @level1name = N'VersionUpdates', @level2type = N'COLUMN', @level2name = N'BreakingChanges';
    EXEC sp_addextendedproperty @name = N'MS_Description', @value = N'依赖变更（JSON格式）', @level0type = N'SCHEMA', @level0name = N'dbo', @level1type = N'TABLE', @level1name = N'VersionUpdates', @level2type = N'COLUMN', @level2name = N'Dependencies';
    EXEC sp_addextendedproperty @name = N'MS_Description', @value = N'Git标签', @level0type = N'SCHEMA', @level0name = N'dbo', @level1type = N'TABLE', @level1name = N'VersionUpdates', @level2type = N'COLUMN', @level2name = N'GitTag';
    EXEC sp_addextendedproperty @name = N'MS_Description', @value = N'Git提交哈希', @level0type = N'SCHEMA', @level0name = N'dbo', @level1type = N'TABLE', @level1name = N'VersionUpdates', @level2type = N'COLUMN', @level2name = N'GitCommit';
    EXEC sp_addextendedproperty @name = N'MS_Description', @value = N'Git分支', @level0type = N'SCHEMA', @level0name = N'dbo', @level1type = N'TABLE', @level1name = N'VersionUpdates', @level2type = N'COLUMN', @level2name = N'GitBranch';
    EXEC sp_addextendedproperty @name = N'MS_Description', @value = N'发布说明（Markdown格式）', @level0type = N'SCHEMA', @level0name = N'dbo', @level1type = N'TABLE', @level1name = N'VersionUpdates', @level2type = N'COLUMN', @level2name = N'ReleaseNotes';
    EXEC sp_addextendedproperty @name = N'MS_Description', @value = N'下载链接', @level0type = N'SCHEMA', @level0name = N'dbo', @level1type = N'TABLE', @level1name = N'VersionUpdates', @level2type = N'COLUMN', @level2name = N'DownloadUrl';
    EXEC sp_addextendedproperty @name = N'MS_Description', @value = N'文档链接', @level0type = N'SCHEMA', @level0name = N'dbo', @level1type = N'TABLE', @level1name = N'VersionUpdates', @level2type = N'COLUMN', @level2name = N'DocumentationUrl';
    EXEC sp_addextendedproperty @name = N'MS_Description', @value = N'变更日志链接', @level0type = N'SCHEMA', @level0name = N'dbo', @level1type = N'TABLE', @level1name = N'VersionUpdates', @level2type = N'COLUMN', @level2name = N'ChangelogUrl';
    EXEC sp_addextendedproperty @name = N'MS_Description', @value = N'版本类型：major/minor/patch/hotfix', @level0type = N'SCHEMA', @level0name = N'dbo', @level1type = N'TABLE', @level1name = N'VersionUpdates', @level2type = N'COLUMN', @level2name = N'VersionType';
    EXEC sp_addextendedproperty @name = N'MS_Description', @value = N'优先级：low/normal/high/critical', @level0type = N'SCHEMA', @level0name = N'dbo', @level1type = N'TABLE', @level1name = N'VersionUpdates', @level2type = N'COLUMN', @level2name = N'Priority';
    EXEC sp_addextendedproperty @name = N'MS_Description', @value = N'稳定性：alpha/beta/rc/stable', @level0type = N'SCHEMA', @level0name = N'dbo', @level1type = N'TABLE', @level1name = N'VersionUpdates', @level2type = N'COLUMN', @level2name = N'Stability';
    EXEC sp_addextendedproperty @name = N'MS_Description', @value = N'最低兼容版本', @level0type = N'SCHEMA', @level0name = N'dbo', @level1type = N'TABLE', @level1name = N'VersionUpdates', @level2type = N'COLUMN', @level2name = N'MinRequiredVersion';
    EXEC sp_addextendedproperty @name = N'MS_Description', @value = N'数据库版本要求', @level0type = N'SCHEMA', @level0name = N'dbo', @level1type = N'TABLE', @level1name = N'VersionUpdates', @level2type = N'COLUMN', @level2name = N'DatabaseVersion';
    EXEC sp_addextendedproperty @name = N'MS_Description', @value = N'Node.js版本要求', @level0type = N'SCHEMA', @level0name = N'dbo', @level1type = N'TABLE', @level1name = N'VersionUpdates', @level2type = N'COLUMN', @level2name = N'NodeVersion';
    EXEC sp_addextendedproperty @name = N'MS_Description', @value = N'下载次数', @level0type = N'SCHEMA', @level0name = N'dbo', @level1type = N'TABLE', @level1name = N'VersionUpdates', @level2type = N'COLUMN', @level2name = N'DownloadCount';
    EXEC sp_addextendedproperty @name = N'MS_Description', @value = N'安装次数', @level0type = N'SCHEMA', @level0name = N'dbo', @level1type = N'TABLE', @level1name = N'VersionUpdates', @level2type = N'COLUMN', @level2name = N'InstallCount';
    EXEC sp_addextendedproperty @name = N'MS_Description', @value = N'反馈次数', @level0type = N'SCHEMA', @level0name = N'dbo', @level1type = N'TABLE', @level1name = N'VersionUpdates', @level2type = N'COLUMN', @level2name = N'FeedbackCount';
    EXEC sp_addextendedproperty @name = N'MS_Description', @value = N'平均评分', @level0type = N'SCHEMA', @level0name = N'dbo', @level1type = N'TABLE', @level1name = N'VersionUpdates', @level2type = N'COLUMN', @level2name = N'RatingAverage';
    EXEC sp_addextendedproperty @name = N'MS_Description', @value = N'创建时间', @level0type = N'SCHEMA', @level0name = N'dbo', @level1type = N'TABLE', @level1name = N'VersionUpdates', @level2type = N'COLUMN', @level2name = N'CreatedAt';
    EXEC sp_addextendedproperty @name = N'MS_Description', @value = N'更新时间', @level0type = N'SCHEMA', @level0name = N'dbo', @level1type = N'TABLE', @level1name = N'VersionUpdates', @level2type = N'COLUMN', @level2name = N'UpdatedAt';
    EXEC sp_addextendedproperty @name = N'MS_Description', @value = N'发布时间', @level0type = N'SCHEMA', @level0name = N'dbo', @level1type = N'TABLE', @level1name = N'VersionUpdates', @level2type = N'COLUMN', @level2name = N'PublishedAt';
    EXEC sp_addextendedproperty @name = N'MS_Description', @value = N'废弃时间', @level0type = N'SCHEMA', @level0name = N'dbo', @level1type = N'TABLE', @level1name = N'VersionUpdates', @level2type = N'COLUMN', @level2name = N'DeprecatedAt';
    EXEC sp_addextendedproperty @name = N'MS_Description', @value = N'创建人', @level0type = N'SCHEMA', @level0name = N'dbo', @level1type = N'TABLE', @level1name = N'VersionUpdates', @level2type = N'COLUMN', @level2name = N'CreatedBy';
    EXEC sp_addextendedproperty @name = N'MS_Description', @value = N'更新人', @level0type = N'SCHEMA', @level0name = N'dbo', @level1type = N'TABLE', @level1name = N'VersionUpdates', @level2type = N'COLUMN', @level2name = N'UpdatedBy';
    EXEC sp_addextendedproperty @name = N'MS_Description', @value = N'发布人', @level0type = N'SCHEMA', @level0name = N'dbo', @level1type = N'TABLE', @level1name = N'VersionUpdates', @level2type = N'COLUMN', @level2name = N'PublishedBy';
    EXEC sp_addextendedproperty @name = N'MS_Description', @value = N'元数据（JSON格式）', @level0type = N'SCHEMA', @level0name = N'dbo', @level1type = N'TABLE', @level1name = N'VersionUpdates', @level2type = N'COLUMN', @level2name = N'Metadata';
    EXEC sp_addextendedproperty @name = N'MS_Description', @value = N'标签（逗号分隔）', @level0type = N'SCHEMA', @level0name = N'dbo', @level1type = N'TABLE', @level1name = N'VersionUpdates', @level2type = N'COLUMN', @level2name = N'Tags';
    EXEC sp_addextendedproperty @name = N'MS_Description', @value = N'贡献者信息（JSON格式）', @level0type = N'SCHEMA', @level0name = N'dbo', @level1type = N'TABLE', @level1name = N'VersionUpdates', @level2type = N'COLUMN', @level2name = N'Contributors';
    EXEC sp_addextendedproperty @name = N'MS_Description', @value = N'是否已发送通知', @level0type = N'SCHEMA', @level0name = N'dbo', @level1type = N'TABLE', @level1name = N'VersionUpdates', @level2type = N'COLUMN', @level2name = N'NotificationSent';
    EXEC sp_addextendedproperty @name = N'MS_Description', @value = N'关联的通知ID', @level0type = N'SCHEMA', @level0name = N'dbo', @level1type = N'TABLE', @level1name = N'VersionUpdates', @level2type = N'COLUMN', @level2name = N'NoticeID';
END

-- 创建版本更新详细项目表
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='VersionUpdateItems' AND xtype='U')
BEGIN
    CREATE TABLE VersionUpdateItems (
        id INT IDENTITY(1,1) PRIMARY KEY,
        version_id INT NOT NULL,
        item_type NVARCHAR(20) NOT NULL, -- 'feature', 'bugfix', 'improvement', 'security'
        title NVARCHAR(200) NOT NULL,
        description NTEXT,
        priority NVARCHAR(10) DEFAULT 'medium', -- 'high', 'medium', 'low'
        category NVARCHAR(50),
        created_at DATETIME DEFAULT GETDATE(),
        
        -- 外键约束
        CONSTRAINT FK_VersionUpdateItems_VersionUpdates 
            FOREIGN KEY (version_id) REFERENCES VersionUpdates(id) ON DELETE CASCADE
    );
    
    -- 创建索引
    CREATE INDEX idx_version_id ON VersionUpdateItems (version_id);
    CREATE INDEX idx_item_type ON VersionUpdateItems (item_type);
    CREATE INDEX idx_priority ON VersionUpdateItems (priority);
END
GO

PRINT '✅ 版本更新相关表创建完成';
PRINT '📋 可以开始使用版本更新管理功能了！';