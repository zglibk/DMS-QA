-- 为ProductionReworkRegister表添加返工类别字段
-- 并更新ReworkCategory表的初始数据

USE [DMS-QA]
GO

-- 检查并添加ReworkCategory字段到ProductionReworkRegister表
IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'ProductionReworkRegister' AND COLUMN_NAME = 'ReworkCategory')
BEGIN
    ALTER TABLE [dbo].[ProductionReworkRegister] ADD [ReworkCategory] NVARCHAR(50) NULL;
    PRINT '已添加 ReworkCategory 字段到 ProductionReworkRegister 表';
END
ELSE
BEGIN
    PRINT 'ReworkCategory 字段已存在于 ProductionReworkRegister 表中';
END
GO

-- 清空并重新插入返工类别数据
DELETE FROM [dbo].[ReworkCategory];
DBCC CHECKIDENT ('[dbo].[ReworkCategory]', RESEED, 0);

-- 插入新的返工类别数据（包含用户要求的三个类别）
INSERT INTO [dbo].[ReworkCategory] ([Name], [Description]) VALUES 
(N'客退返工', N'客户退货导致的返工处理'),
(N'来料返工', N'原材料质量问题导致的返工'),
(N'制程返工', N'生产制程中出现问题的返工'),
(N'印刷返工', N'印刷过程中的质量问题返工'),
(N'裁切返工', N'裁切工序的尺寸或质量问题返工'),
(N'包装返工', N'包装工序的问题返工'),
(N'设备返工', N'设备故障导致的返工'),
(N'人为返工', N'操作失误导致的返工'),
(N'其他返工', N'其他原因导致的返工');

PRINT '返工类别数据已更新完成';

-- 验证字段和数据
SELECT 
    COLUMN_NAME,
    DATA_TYPE,
    CHARACTER_MAXIMUM_LENGTH,
    IS_NULLABLE
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_NAME = 'ProductionReworkRegister' 
    AND COLUMN_NAME = 'ReworkCategory';

SELECT * FROM [dbo].[ReworkCategory] ORDER BY ID;

PRINT '返工类别字段添加和数据更新完成';