-- 为出版异常表添加错误类型字段
-- 执行日期: 2024年
-- 说明: 添加error_type字段，用于记录出版异常的错误类型

USE [DMS_QA];
GO

-- 检查字段是否已存在，如果不存在则添加
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('publishing_exceptions') AND name = 'error_type')
BEGIN
    ALTER TABLE publishing_exceptions
    ADD error_type NVARCHAR(50) NULL;
    
    PRINT '成功添加error_type字段到publishing_exceptions表';
END
ELSE
BEGIN
    PRINT 'error_type字段已存在于publishing_exceptions表中';
END
GO

-- 为error_type字段创建索引以提高查询性能
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE object_id = OBJECT_ID('publishing_exceptions') AND name = 'IX_publishing_exceptions_error_type')
BEGIN
    CREATE INDEX IX_publishing_exceptions_error_type ON publishing_exceptions(error_type);
    PRINT '成功为error_type字段创建索引';
END
ELSE
BEGIN
    PRINT 'error_type字段索引已存在';
END
GO

PRINT '数据库表结构更新完成';