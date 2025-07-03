-- 创建网站LOGO配置表
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='SiteConfig' AND xtype='U')
BEGIN
    CREATE TABLE [dbo].[SiteConfig] (
        [ID] INT IDENTITY(1,1) PRIMARY KEY,
        [ConfigKey] NVARCHAR(50) NOT NULL UNIQUE,
        [ConfigValue] NVARCHAR(MAX),
        [ConfigType] NVARCHAR(20) DEFAULT 'text', -- text, image, json
        [Description] NVARCHAR(200),
        [IsActive] BIT DEFAULT 1,
        [CreatedAt] DATETIME DEFAULT GETDATE(),
        [UpdatedAt] DATETIME DEFAULT GETDATE()
    );
    
    PRINT 'SiteConfig 表创建成功';
END
ELSE
BEGIN
    PRINT 'SiteConfig 表已存在';
END

-- 插入默认网站LOGO配置
IF NOT EXISTS (SELECT * FROM SiteConfig WHERE ConfigKey = 'siteName')
BEGIN
    INSERT INTO [dbo].[SiteConfig] ([ConfigKey], [ConfigValue], [ConfigType], [Description]) VALUES
    (N'siteName', N'质量数据管理系统', N'text', N'网站名称'),
    (N'companyName', N'DMS质量管理系统', N'text', N'公司名称'),
    (N'logoBase64Img', N'/logo.png', N'image', N'网站LOGO图片BASE64数据'),
    (N'faviconBase64Img', N'/logo.png', N'image', N'网站图标BASE64数据'),
    (N'headerTitle', N'质量数据系统', N'text', N'页面头部标题'),
    (N'loginTitle', N'DMS-QA 质量管理系统', N'text', N'登录页面标题'),
    (N'footerCopyright', N'© 2025 DMS质量管理系统. All rights reserved.', N'text', N'页脚版权信息');
    
    PRINT '默认配置数据插入成功';
END
ELSE
BEGIN
    PRINT '配置数据已存在';
END
