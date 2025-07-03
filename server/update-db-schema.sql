-- 更新DbConfig表结构，添加文件存储相关字段

-- 检查字段是否存在，如果不存在则添加
IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'DbConfig' AND COLUMN_NAME = 'FileStoragePath')
BEGIN
    ALTER TABLE [dbo].[DbConfig] ADD [FileStoragePath] NVARCHAR(500) NULL;
    PRINT '已添加 FileStoragePath 字段';
END
ELSE
BEGIN
    PRINT 'FileStoragePath 字段已存在';
END

IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'DbConfig' AND COLUMN_NAME = 'FileServerPort')
BEGIN
    ALTER TABLE [dbo].[DbConfig] ADD [FileServerPort] INT DEFAULT 8080;
    PRINT '已添加 FileServerPort 字段';
END
ELSE
BEGIN
    PRINT 'FileServerPort 字段已存在';
END

IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'DbConfig' AND COLUMN_NAME = 'FileUrlPrefix')
BEGIN
    ALTER TABLE [dbo].[DbConfig] ADD [FileUrlPrefix] NVARCHAR(100) DEFAULT '/files';
    PRINT '已添加 FileUrlPrefix 字段';
END
ELSE
BEGIN
    PRINT 'FileUrlPrefix 字段已存在';
END

-- 添加路径映射配置字段
IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'DbConfig' AND COLUMN_NAME = 'ExcelTempPath')
BEGIN
    ALTER TABLE [dbo].[DbConfig] ADD [ExcelTempPath] NVARCHAR(500) NULL;
    PRINT '已添加 ExcelTempPath 字段';
END
ELSE
BEGIN
    PRINT 'ExcelTempPath 字段已存在';
END

IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'DbConfig' AND COLUMN_NAME = 'NetworkSharePath')
BEGIN
    ALTER TABLE [dbo].[DbConfig] ADD [NetworkSharePath] NVARCHAR(500) NULL;
    PRINT '已添加 NetworkSharePath 字段';
END
ELSE
BEGIN
    PRINT 'NetworkSharePath 字段已存在';
END

-- 为现有记录设置默认值
UPDATE [dbo].[DbConfig]
SET
    [FileServerPort] = 8080,
    [FileUrlPrefix] = '/files',
    [ExcelTempPath] = 'file:///C:\Users\TJ\AppData\Roaming\Microsoft\Excel',
    [NetworkSharePath] = '\\tj_server\工作\品质部\生产异常周报考核统计'
WHERE
    [FileServerPort] IS NULL OR [FileUrlPrefix] IS NULL OR [ExcelTempPath] IS NULL OR [NetworkSharePath] IS NULL;

PRINT '数据库表结构更新完成';
