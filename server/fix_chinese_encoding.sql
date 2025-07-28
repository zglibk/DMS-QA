-- 修复中文编码问题的SQL脚本
-- 清理现有的乱码数据并重新插入正确的中文数据

-- 1. 清理PathMappingConfig表中的乱码数据
DELETE FROM PathMappingConfig;

-- 2. 重新插入正确的中文数据
INSERT INTO PathMappingConfig (Name, LocalPattern, TargetPattern, Description, IsActive, CreatedAt, UpdatedAt) VALUES
(N'Excel临时文件映射', N'C:\Users\*\AppData\Roaming\Microsoft\Excel\*', N'\\tj_server\工作\品质部\生产异常周报考核统计\*', N'Excel临时文件映射到tj_server共享盘', 1, GETDATE(), GETDATE()),
(N'2025年异常汇总映射', N'*2025年异常汇总\*', N'D:\WebServer\backend\uploads\attachments\2025年异常汇总\*', N'2025年异常汇总文件映射到服务器存储路径', 1, GETDATE(), GETDATE()),
(N'服务器存储映射', N'2025年异常汇总\*', N'D:\WebServer\backend\uploads\attachments\2025年异常汇总\*', N'相对路径到服务器存储路径的映射', 1, GETDATE(), GETDATE());

-- 3. 清理ConversionConfig表中的乱码数据（如果存在）
IF EXISTS (SELECT * FROM sysobjects WHERE name='ConversionConfig' AND xtype='U')
BEGIN
    DELETE FROM ConversionConfig;
    
    -- 重新插入转换配置
    INSERT INTO ConversionConfig (ConfigKey, ConfigValue, Description, CreatedAt, UpdatedAt) VALUES
    (N'autoConvert', N'true', N'启用自动转换', GETDATE(), GETDATE()),
    (N'keepOriginal', N'false', N'保留原始路径', GETDATE(), GETDATE()),
    (N'fileCopyMode', N'true', N'启用文件拷贝模式', GETDATE(), GETDATE()),
    (N'validatePaths', N'false', N'路径验证', GETDATE(), GETDATE());
END
ELSE
BEGIN
    -- 如果表不存在，先创建表
    CREATE TABLE [dbo].[ConversionConfig] (
        [ID] INT IDENTITY(1,1) PRIMARY KEY,
        [ConfigKey] NVARCHAR(50) NOT NULL UNIQUE,
        [ConfigValue] NVARCHAR(500),
        [Description] NVARCHAR(200),
        [CreatedAt] DATETIME DEFAULT GETDATE(),
        [UpdatedAt] DATETIME DEFAULT GETDATE()
    );
    
    -- 插入默认配置
    INSERT INTO ConversionConfig (ConfigKey, ConfigValue, Description, CreatedAt, UpdatedAt) VALUES
    (N'autoConvert', N'true', N'启用自动转换', GETDATE(), GETDATE()),
    (N'keepOriginal', N'false', N'保留原始路径', GETDATE(), GETDATE()),
    (N'fileCopyMode', N'true', N'启用文件拷贝模式', GETDATE(), GETDATE()),
    (N'validatePaths', N'false', N'路径验证', GETDATE(), GETDATE());
END

-- 4. 验证数据
SELECT 'PathMappingConfig数据:' AS TableName;
SELECT ID, Name, LocalPattern, TargetPattern, Description FROM PathMappingConfig;

SELECT 'ConversionConfig数据:' AS TableName;
SELECT ID, ConfigKey, ConfigValue, Description FROM ConversionConfig;
