-- =====================================================
-- 为仪器台账表添加量程和准确度字段
-- 功能：为Instruments表增加MeasurementRange和Accuracy字段
-- 版本：v1.0
-- 创建日期：2025年
-- =====================================================

USE [DMS-QA];

PRINT '开始为仪器台账表添加量程和准确度字段...';

-- 检查并添加量程字段
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[Instruments]') AND name = 'MeasurementRange')
BEGIN
    ALTER TABLE [dbo].[Instruments] 
    ADD [MeasurementRange] NVARCHAR(200) NULL;
    PRINT '✅ 量程(MeasurementRange)字段添加成功';
END
ELSE
BEGIN
    PRINT '⚠️ 量程(MeasurementRange)字段已存在，跳过添加';
END

-- 检查并添加准确度字段
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[Instruments]') AND name = 'Accuracy')
BEGIN
    ALTER TABLE [dbo].[Instruments] 
    ADD [Accuracy] NVARCHAR(100) NULL;
    PRINT '✅ 准确度(Accuracy)字段添加成功';
END
ELSE
BEGIN
    PRINT '⚠️ 准确度(Accuracy)字段已存在，跳过添加';
END

-- 为新字段添加注释
EXEC sp_addextendedproperty 
    @name = N'MS_Description', 
    @value = N'仪器的测量量程范围，如：0-100℃、0-1000mm等', 
    @level0type = N'SCHEMA', @level0name = N'dbo', 
    @level1type = N'TABLE', @level1name = N'Instruments', 
    @level2type = N'COLUMN', @level2name = N'MeasurementRange';

EXEC sp_addextendedproperty 
    @name = N'MS_Description', 
    @value = N'仪器的测量准确度，如：±0.1℃、±0.01mm等', 
    @level0type = N'SCHEMA', @level0name = N'dbo', 
    @level1type = N'TABLE', @level1name = N'Instruments', 
    @level2type = N'COLUMN', @level2name = N'Accuracy';

PRINT '✅ 字段注释添加完成';

PRINT '🎉 仪器台账表字段扩展完成！';
PRINT '';
PRINT '新增字段说明：';
PRINT '1. MeasurementRange (NVARCHAR(200)) - 测量量程';
PRINT '2. Accuracy (NVARCHAR(100)) - 测量准确度';
PRINT '';
PRINT '字段用途：';
PRINT '- 量程：记录仪器的测量范围，如温度计的测量范围0-100℃';
PRINT '- 准确度：记录仪器的测量精度，如±0.1℃、±0.01mm等';