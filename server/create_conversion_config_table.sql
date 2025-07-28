-- 创建转换配置表
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='ConversionConfig' AND xtype='U')
BEGIN
    CREATE TABLE [dbo].[ConversionConfig] (
        [ID] INT IDENTITY(1,1) PRIMARY KEY,               -- 主键，自增ID
        [ConfigKey] NVARCHAR(50) NOT NULL UNIQUE,         -- 配置键名
        [ConfigValue] NVARCHAR(500),                      -- 配置值
        [Description] NVARCHAR(200),                      -- 配置描述
        [CreatedAt] DATETIME DEFAULT GETDATE(),           -- 创建时间
        [UpdatedAt] DATETIME DEFAULT GETDATE()            -- 更新时间
    );
    
    PRINT '转换配置表创建成功';
END
ELSE
BEGIN
    PRINT '转换配置表已存在';
END

-- 插入默认转换配置（如果不存在）
IF NOT EXISTS (SELECT * FROM [dbo].[ConversionConfig] WHERE [ConfigKey] = 'autoConvert')
BEGIN
    INSERT INTO [dbo].[ConversionConfig] ([ConfigKey], [ConfigValue], [Description]) VALUES
    (N'autoConvert', N'true', N'启用自动转换'),
    (N'keepOriginal', N'false', N'保留原始路径'),
    (N'fileCopyMode', N'true', N'启用文件拷贝模式'),
    (N'validatePaths', N'false', N'路径验证');
    
    PRINT '默认转换配置插入成功';
END
ELSE
BEGIN
    PRINT '默认转换配置已存在';
END

-- 查看当前配置
SELECT * FROM [dbo].[ConversionConfig];
