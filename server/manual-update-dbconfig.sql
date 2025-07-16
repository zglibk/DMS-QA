-- MS SQL Server 2008R2 兼容的手动更新脚本
-- 为DbConfig表添加路径映射配置字段

USE [DMS-QA]
GO

PRINT '开始更新DbConfig表结构...'

-- 检查并添加 ExcelTempPath 字段
IF NOT EXISTS (
    SELECT * FROM sys.columns 
    WHERE object_id = OBJECT_ID(N'[dbo].[DbConfig]') 
    AND name = 'ExcelTempPath'
)
BEGIN
    ALTER TABLE [dbo].[DbConfig] ADD [ExcelTempPath] NVARCHAR(500) NULL
    PRINT '✓ 已添加 ExcelTempPath 字段'
END
ELSE
BEGIN
    PRINT '○ ExcelTempPath 字段已存在'
END

-- 检查并添加 NetworkSharePath 字段
IF NOT EXISTS (
    SELECT * FROM sys.columns 
    WHERE object_id = OBJECT_ID(N'[dbo].[DbConfig]') 
    AND name = 'NetworkSharePath'
)
BEGIN
    ALTER TABLE [dbo].[DbConfig] ADD [NetworkSharePath] NVARCHAR(500) NULL
    PRINT '✓ 已添加 NetworkSharePath 字段'
END
ELSE
BEGIN
    PRINT '○ NetworkSharePath 字段已存在'
END

-- 检查并添加 FileStoragePath 字段（如果不存在）
IF NOT EXISTS (
    SELECT * FROM sys.columns 
    WHERE object_id = OBJECT_ID(N'[dbo].[DbConfig]') 
    AND name = 'FileStoragePath'
)
BEGIN
    ALTER TABLE [dbo].[DbConfig] ADD [FileStoragePath] NVARCHAR(500) NULL
    PRINT '✓ 已添加 FileStoragePath 字段'
END
ELSE
BEGIN
    PRINT '○ FileStoragePath 字段已存在'
END

-- 检查并添加 FileServerPort 字段（如果不存在）
IF NOT EXISTS (
    SELECT * FROM sys.columns 
    WHERE object_id = OBJECT_ID(N'[dbo].[DbConfig]') 
    AND name = 'FileServerPort'
)
BEGIN
    ALTER TABLE [dbo].[DbConfig] ADD [FileServerPort] INT DEFAULT 8080
    PRINT '✓ 已添加 FileServerPort 字段'
END
ELSE
BEGIN
    PRINT '○ FileServerPort 字段已存在'
END

-- 检查并添加 FileUrlPrefix 字段（如果不存在）
IF NOT EXISTS (
    SELECT * FROM sys.columns 
    WHERE object_id = OBJECT_ID(N'[dbo].[DbConfig]') 
    AND name = 'FileUrlPrefix'
)
BEGIN
    ALTER TABLE [dbo].[DbConfig] ADD [FileUrlPrefix] NVARCHAR(100) DEFAULT '/files'
    PRINT '✓ 已添加 FileUrlPrefix 字段'
END
ELSE
BEGIN
    PRINT '○ FileUrlPrefix 字段已存在'
END

PRINT '字段添加完成，开始更新默认值...'

-- 为现有记录设置默认值
UPDATE [dbo].[DbConfig] 
SET 
    [FileServerPort] = ISNULL([FileServerPort], 8080),
    [FileUrlPrefix] = ISNULL([FileUrlPrefix], '/files'),
    [ExcelTempPath] = ISNULL([ExcelTempPath], 'file:///C:\Users\TJ\AppData\Roaming\Microsoft\Excel'),
    [NetworkSharePath] = ISNULL([NetworkSharePath], '\\localhost\工作\品质部\生产异常周报考核统计')

PRINT '✓ 默认值设置完成'

-- 显示更新后的表结构
PRINT '当前DbConfig表结构:'
SELECT 
    COLUMN_NAME as '字段名',
    DATA_TYPE as '数据类型',
    CHARACTER_MAXIMUM_LENGTH as '最大长度',
    IS_NULLABLE as '允许空值',
    COLUMN_DEFAULT as '默认值'
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_NAME = 'DbConfig' 
ORDER BY ORDINAL_POSITION

-- 显示当前配置记录
PRINT '当前配置记录:'
SELECT 
    ID,
    ConfigName,
    Host,
    DatabaseName,
    ExcelTempPath,
    NetworkSharePath,
    FileStoragePath,
    IsCurrent
FROM [dbo].[DbConfig]
ORDER BY ID

PRINT '数据库更新完成！'
PRINT ''
PRINT '路径映射配置说明:'
PRINT '- ExcelTempPath: Excel临时文件路径前缀，用于识别需要转换的路径'
PRINT '- NetworkSharePath: 对应的网络共享路径，用于路径转换'
PRINT '- 示例转换: file:///C:\Users\TJ\AppData\Roaming\Microsoft\Excel\2025年异常汇总\...'
PRINT '           -> \\tj_server\工作\品质部\生产异常周报考核统计\2025年异常汇总\...'

GO
