-- 为CustomerComplaints表添加complaintType字段
-- 用于记录客户投诉类型（改善提醒、分析整改、退货换货等）

USE [DMS_QA];
GO

-- 检查字段是否已存在，如果不存在则添加
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[CustomerComplaints]') AND name = 'ComplaintType')
BEGIN
    ALTER TABLE [dbo].[CustomerComplaints]
    ADD [ComplaintType] NVARCHAR(50) NULL;  -- 投诉类型，可空
    
    PRINT 'CustomerComplaints表已成功添加ComplaintType字段。';
END
ELSE
BEGIN
    PRINT 'CustomerComplaints表中ComplaintType字段已存在，跳过添加。';
END
GO

-- 为新字段创建索引以优化查询性能
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE object_id = OBJECT_ID(N'[dbo].[CustomerComplaints]') AND name = 'IX_CustomerComplaints_ComplaintType')
BEGIN
    CREATE INDEX [IX_CustomerComplaints_ComplaintType] ON [dbo].[CustomerComplaints] ([ComplaintType]);
    PRINT 'CustomerComplaints表ComplaintType字段索引创建成功。';
END
ELSE
BEGIN
    PRINT 'CustomerComplaints表ComplaintType字段索引已存在，跳过创建。';
END
GO

-- 添加字段注释
IF NOT EXISTS (SELECT * FROM sys.extended_properties WHERE major_id = OBJECT_ID(N'[dbo].[CustomerComplaints]') AND minor_id = (SELECT column_id FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[CustomerComplaints]') AND name = 'ComplaintType') AND name = 'MS_Description')
BEGIN
    EXEC sys.sp_addextendedproperty 
        @name = N'MS_Description',
        @value = N'投诉类型：改善提醒、分析整改、退货换货等',
        @level0type = N'SCHEMA',
        @level0name = N'dbo',
        @level1type = N'TABLE',
        @level1name = N'CustomerComplaints',
        @level2type = N'COLUMN',
        @level2name = N'ComplaintType';
    PRINT 'CustomerComplaints表ComplaintType字段注释添加成功。';
END
GO

PRINT '数据库迁移脚本执行完成。';