-- 兼容 SQL Server 2008R2 的 SiteConfig 表创建脚本
USE [DMS-QA]
GO

-- 检查表是否存在，如果存在则删除（可选）
IF EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[SiteConfig]') AND type in (N'U'))
BEGIN
    PRINT 'SiteConfig 表已存在，将先删除再重新创建'
    DROP TABLE [dbo].[SiteConfig]
END

-- 创建 SiteConfig 表
CREATE TABLE [dbo].[SiteConfig](
    [ID] [int] IDENTITY(1,1) NOT NULL,
    [ConfigKey] [nvarchar](50) NOT NULL,
    [ConfigValue] [nvarchar](max) NULL,
    [ConfigType] [nvarchar](20) NULL,
    [Description] [nvarchar](200) NULL,
    [IsActive] [bit] NULL,
    [CreatedAt] [datetime] NULL,
    [UpdatedAt] [datetime] NULL,
    CONSTRAINT [PK_SiteConfig] PRIMARY KEY CLUSTERED ([ID] ASC),
    CONSTRAINT [UQ_SiteConfig_ConfigKey] UNIQUE NONCLUSTERED ([ConfigKey] ASC)
)

-- 添加默认值约束
ALTER TABLE [dbo].[SiteConfig] ADD CONSTRAINT [DF_SiteConfig_ConfigType] DEFAULT ('text') FOR [ConfigType]
ALTER TABLE [dbo].[SiteConfig] ADD CONSTRAINT [DF_SiteConfig_IsActive] DEFAULT ((1)) FOR [IsActive]
ALTER TABLE [dbo].[SiteConfig] ADD CONSTRAINT [DF_SiteConfig_CreatedAt] DEFAULT (getdate()) FOR [CreatedAt]
ALTER TABLE [dbo].[SiteConfig] ADD CONSTRAINT [DF_SiteConfig_UpdatedAt] DEFAULT (getdate()) FOR [UpdatedAt]

PRINT 'SiteConfig 表创建成功'

-- 插入默认网站配置数据
INSERT INTO [dbo].[SiteConfig] ([ConfigKey], [ConfigValue], [ConfigType], [Description], [IsActive], [CreatedAt], [UpdatedAt])
VALUES
(N'siteName', N'质量数据管理系统', N'text', N'网站名称', 1, GETDATE(), GETDATE()),
(N'companyName', N'DMS质量管理系统', N'text', N'公司名称', 1, GETDATE(), GETDATE()),
(N'logoBase64Img', N'/logo.png', N'image', N'网站LOGO图片BASE64数据', 1, GETDATE(), GETDATE()),
(N'faviconBase64Img', N'/logo.png', N'image', N'网站图标BASE64数据', 1, GETDATE(), GETDATE()),
(N'headerTitle', N'质量数据系统', N'text', N'页面头部标题', 1, GETDATE(), GETDATE()),
(N'loginTitle', N'DMS-QA 质量管理系统', N'text', N'登录页面标题', 1, GETDATE(), GETDATE()),
(N'footerCopyright', N'© 2025 DMS质量管理系统. All rights reserved.', N'text', N'页脚版权信息', 1, GETDATE(), GETDATE())

PRINT '默认配置数据插入成功'

-- 验证数据插入
SELECT COUNT(*) AS '配置项数量' FROM [dbo].[SiteConfig]
SELECT * FROM [dbo].[SiteConfig] ORDER BY [ID]

PRINT 'SiteConfig 表创建和初始化完成'
