-- 数据库表结构更新脚本
-- 用于更新现有数据库以支持完整的系统配置功能

USE [DMS-QA];
GO

-- 检查并添加 ExcelTempPath 字段
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('[dbo].[DbConfig]') AND name = 'ExcelTempPath')
BEGIN
    ALTER TABLE [dbo].[DbConfig] ADD [ExcelTempPath] NVARCHAR(500);
    PRINT 'Added ExcelTempPath column to DbConfig table';
END
ELSE
BEGIN
    PRINT 'ExcelTempPath column already exists in DbConfig table';
END

-- 检查并添加 NetworkSharePath 字段
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('[dbo].[DbConfig]') AND name = 'NetworkSharePath')
BEGIN
    ALTER TABLE [dbo].[DbConfig] ADD [NetworkSharePath] NVARCHAR(500);
    PRINT 'Added NetworkSharePath column to DbConfig table';
END
ELSE
BEGIN
    PRINT 'NetworkSharePath column already exists in DbConfig table';
END

-- 更新现有记录的默认值（如果字段为空）
UPDATE [dbo].[DbConfig] 
SET [ExcelTempPath] = 'file:///C:\Users\TJ\AppData\Roaming\Microsoft\Excel'
WHERE [ExcelTempPath] IS NULL OR [ExcelTempPath] = '';

UPDATE [dbo].[DbConfig] 
SET [NetworkSharePath] = '\\tj_server\工作\品质部\生产异常周报考核统计'
WHERE [NetworkSharePath] IS NULL OR [NetworkSharePath] = '';

-- 确保 FileStoragePath 有默认值
UPDATE [dbo].[DbConfig] 
SET [FileStoragePath] = 'D:\DMSData\IMG-VIDEO'
WHERE [FileStoragePath] IS NULL OR [FileStoragePath] = '';

-- 确保 FileServerPort 有默认值
UPDATE [dbo].[DbConfig] 
SET [FileServerPort] = 8080
WHERE [FileServerPort] IS NULL;

-- 确保 FileUrlPrefix 有默认值
UPDATE [dbo].[DbConfig] 
SET [FileUrlPrefix] = '/files'
WHERE [FileUrlPrefix] IS NULL OR [FileUrlPrefix] = '';

-- 如果没有任何配置记录，插入一个默认配置
IF NOT EXISTS (SELECT 1 FROM [dbo].[DbConfig])
BEGIN
    INSERT INTO [dbo].[DbConfig] (
        [Host], 
        [DatabaseName], 
        [DbUser], 
        [DbPassword], 
        [ConfigName], 
        [Remark], 
        [IsCurrent], 
        [IsValid], 
        [UpdatedAt],
        [FileStoragePath],
        [FileServerPort],
        [FileUrlPrefix],
        [ExcelTempPath],
        [NetworkSharePath]
    ) VALUES (
        '192.168.1.57',
        'DMS-QA',
        'sa',
        'Qa369*',
        '默认配置',
        '系统默认数据库配置',
        1,
        1,
        GETDATE(),
        'D:\DMSData\IMG-VIDEO',
        8080,
        '/files',
        'file:///C:\Users\TJ\AppData\Roaming\Microsoft\Excel',
        '\\tj_server\工作\品质部\生产异常周报考核统计'
    );
    PRINT 'Inserted default configuration record';
END

-- 显示当前配置表结构
SELECT 
    COLUMN_NAME,
    DATA_TYPE,
    CHARACTER_MAXIMUM_LENGTH,
    IS_NULLABLE,
    COLUMN_DEFAULT
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_NAME = 'DbConfig'
ORDER BY ORDINAL_POSITION;

PRINT 'Database schema update completed successfully!';
