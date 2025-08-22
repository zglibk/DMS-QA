-- 为CustomerComplaints表添加质量成本相关字段
-- 用于支持客户损失统计和质量成本分析

USE [DMS_QA];
GO

-- 检查并添加质量成本相关字段
PRINT '开始为CustomerComplaints表添加质量成本相关字段...';
GO

-- 1. 质量罚款 (QualityPenalty)
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[CustomerComplaints]') AND name = 'QualityPenalty')
BEGIN
    ALTER TABLE [dbo].[CustomerComplaints]
    ADD [QualityPenalty] DECIMAL(18,2) NULL DEFAULT 0;  -- 质量罚款金额
    
    PRINT 'CustomerComplaints表已成功添加QualityPenalty字段。';
END
ELSE
BEGIN
    PRINT 'CustomerComplaints表中QualityPenalty字段已存在，跳过添加。';
END
GO

-- 2. 返工成本 (ReworkCost)
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[CustomerComplaints]') AND name = 'ReworkCost')
BEGIN
    ALTER TABLE [dbo].[CustomerComplaints]
    ADD [ReworkCost] DECIMAL(18,2) NULL DEFAULT 0;  -- 返工成本
    
    PRINT 'CustomerComplaints表已成功添加ReworkCost字段。';
END
ELSE
BEGIN
    PRINT 'CustomerComplaints表中ReworkCost字段已存在，跳过添加。';
END
GO

-- 3. 客户赔偿 (CustomerCompensation)
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[CustomerComplaints]') AND name = 'CustomerCompensation')
BEGIN
    ALTER TABLE [dbo].[CustomerComplaints]
    ADD [CustomerCompensation] DECIMAL(18,2) NULL DEFAULT 0;  -- 客户赔偿金额
    
    PRINT 'CustomerComplaints表已成功添加CustomerCompensation字段。';
END
ELSE
BEGIN
    PRINT 'CustomerComplaints表中CustomerCompensation字段已存在，跳过添加。';
END
GO

-- 4. 质量损失成本 (QualityLossCost)
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[CustomerComplaints]') AND name = 'QualityLossCost')
BEGIN
    ALTER TABLE [dbo].[CustomerComplaints]
    ADD [QualityLossCost] DECIMAL(18,2) NULL DEFAULT 0;  -- 质量损失成本（包括废品损失、停工损失等）
    
    PRINT 'CustomerComplaints表已成功添加QualityLossCost字段。';
END
ELSE
BEGIN
    PRINT 'CustomerComplaints表中QualityLossCost字段已存在，跳过添加。';
END
GO

-- 5. 检验成本 (InspectionCost)
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[CustomerComplaints]') AND name = 'InspectionCost')
BEGIN
    ALTER TABLE [dbo].[CustomerComplaints]
    ADD [InspectionCost] DECIMAL(18,2) NULL DEFAULT 0;  -- 额外检验成本
    
    PRINT 'CustomerComplaints表已成功添加InspectionCost字段。';
END
ELSE
BEGIN
    PRINT 'CustomerComplaints表中InspectionCost字段已存在，跳过添加。';
END
GO

-- 6. 运输成本 (TransportationCost)
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[CustomerComplaints]') AND name = 'TransportationCost')
BEGIN
    ALTER TABLE [dbo].[CustomerComplaints]
    ADD [TransportationCost] DECIMAL(18,2) NULL DEFAULT 0;  -- 运输成本（退货、换货运费）
    
    PRINT 'CustomerComplaints表已成功添加TransportationCost字段。';
END
ELSE
BEGIN
    PRINT 'CustomerComplaints表中TransportationCost字段已存在，跳过添加。';
END
GO

-- 7. 预防成本 (PreventionCost)
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[CustomerComplaints]') AND name = 'PreventionCost')
BEGIN
    ALTER TABLE [dbo].[CustomerComplaints]
    ADD [PreventionCost] DECIMAL(18,2) NULL DEFAULT 0;  -- 预防成本（改进措施投入）
    
    PRINT 'CustomerComplaints表已成功添加PreventionCost字段。';
END
ELSE
BEGIN
    PRINT 'CustomerComplaints表中PreventionCost字段已存在，跳过添加。';
END
GO

-- 8. 总质量成本 (TotalQualityCost)
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[CustomerComplaints]') AND name = 'TotalQualityCost')
BEGIN
    ALTER TABLE [dbo].[CustomerComplaints]
    ADD [TotalQualityCost] AS ([QualityPenalty] + [ReworkCost] + [CustomerCompensation] + [QualityLossCost] + [InspectionCost] + [TransportationCost] + [PreventionCost]) PERSISTED;  -- 总质量成本（计算字段）
    
    PRINT 'CustomerComplaints表已成功添加TotalQualityCost计算字段。';
END
ELSE
BEGIN
    PRINT 'CustomerComplaints表中TotalQualityCost字段已存在，跳过添加。';
END
GO

-- 9. 成本备注 (CostRemarks)
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[CustomerComplaints]') AND name = 'CostRemarks')
BEGIN
    ALTER TABLE [dbo].[CustomerComplaints]
    ADD [CostRemarks] NVARCHAR(1000) NULL;  -- 成本备注说明
    
    PRINT 'CustomerComplaints表已成功添加CostRemarks字段。';
END
ELSE
BEGIN
    PRINT 'CustomerComplaints表中CostRemarks字段已存在，跳过添加。';
END
GO

-- 创建质量成本相关字段的索引以优化查询性能
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE object_id = OBJECT_ID(N'[dbo].[CustomerComplaints]') AND name = 'IX_CustomerComplaints_QualityPenalty')
BEGIN
    CREATE INDEX [IX_CustomerComplaints_QualityPenalty] ON [dbo].[CustomerComplaints] ([QualityPenalty]);
    PRINT 'CustomerComplaints表QualityPenalty字段索引创建成功。';
END
ELSE
BEGIN
    PRINT 'CustomerComplaints表QualityPenalty字段索引已存在，跳过创建。';
END
GO

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE object_id = OBJECT_ID(N'[dbo].[CustomerComplaints]') AND name = 'IX_CustomerComplaints_TotalQualityCost')
BEGIN
    CREATE INDEX [IX_CustomerComplaints_TotalQualityCost] ON [dbo].[CustomerComplaints] ([TotalQualityCost]);
    PRINT 'CustomerComplaints表TotalQualityCost字段索引创建成功。';
END
ELSE
BEGIN
    PRINT 'CustomerComplaints表TotalQualityCost字段索引已存在，跳过创建。';
END
GO

-- 添加字段注释
EXEC sys.sp_addextendedproperty 
    @name = N'MS_Description', 
    @value = N'质量罚款金额', 
    @level0type = N'SCHEMA', @level0name = N'dbo', 
    @level1type = N'TABLE', @level1name = N'CustomerComplaints', 
    @level2type = N'COLUMN', @level2name = N'QualityPenalty';

EXEC sys.sp_addextendedproperty 
    @name = N'MS_Description', 
    @value = N'返工成本', 
    @level0type = N'SCHEMA', @level0name = N'dbo', 
    @level1type = N'TABLE', @level1name = N'CustomerComplaints', 
    @level2type = N'COLUMN', @level2name = N'ReworkCost';

EXEC sys.sp_addextendedproperty 
    @name = N'MS_Description', 
    @value = N'客户赔偿金额', 
    @level0type = N'SCHEMA', @level0name = N'dbo', 
    @level1type = N'TABLE', @level1name = N'CustomerComplaints', 
    @level2type = N'COLUMN', @level2name = N'CustomerCompensation';

EXEC sys.sp_addextendedproperty 
    @name = N'MS_Description', 
    @value = N'质量损失成本（包括废品损失、停工损失等）', 
    @level0type = N'SCHEMA', @level0name = N'dbo', 
    @level1type = N'TABLE', @level1name = N'CustomerComplaints', 
    @level2type = N'COLUMN', @level2name = N'QualityLossCost';

EXEC sys.sp_addextendedproperty 
    @name = N'MS_Description', 
    @value = N'额外检验成本', 
    @level0type = N'SCHEMA', @level0name = N'dbo', 
    @level1type = N'TABLE', @level1name = N'CustomerComplaints', 
    @level2type = N'COLUMN', @level2name = N'InspectionCost';

EXEC sys.sp_addextendedproperty 
    @name = N'MS_Description', 
    @value = N'运输成本（退货、换货运费）', 
    @level0type = N'SCHEMA', @level0name = N'dbo', 
    @level1type = N'TABLE', @level1name = N'CustomerComplaints', 
    @level2type = N'COLUMN', @level2name = N'TransportationCost';

EXEC sys.sp_addextendedproperty 
    @name = N'MS_Description', 
    @value = N'预防成本（改进措施投入）', 
    @level0type = N'SCHEMA', @level0name = N'dbo', 
    @level1type = N'TABLE', @level1name = N'CustomerComplaints', 
    @level2type = N'COLUMN', @level2name = N'PreventionCost';

EXEC sys.sp_addextendedproperty 
    @name = N'MS_Description', 
    @value = N'总质量成本（自动计算）', 
    @level0type = N'SCHEMA', @level0name = N'dbo', 
    @level1type = N'TABLE', @level1name = N'CustomerComplaints', 
    @level2type = N'COLUMN', @level2name = N'TotalQualityCost';

EXEC sys.sp_addextendedproperty 
    @name = N'MS_Description', 
    @value = N'成本备注说明', 
    @level0type = N'SCHEMA', @level0name = N'dbo', 
    @level1type = N'TABLE', @level1name = N'CustomerComplaints', 
    @level2type = N'COLUMN', @level2name = N'CostRemarks';

PRINT '=================================================';
PRINT '质量成本字段添加完成！';
PRINT '=================================================';
PRINT '已添加的字段：';
PRINT '1. QualityPenalty - 质量罚款';
PRINT '2. ReworkCost - 返工成本';
PRINT '3. CustomerCompensation - 客户赔偿';
PRINT '4. QualityLossCost - 质量损失成本';
PRINT '5. InspectionCost - 检验成本';
PRINT '6. TransportationCost - 运输成本';
PRINT '7. PreventionCost - 预防成本';
PRINT '8. TotalQualityCost - 总质量成本（计算字段）';
PRINT '9. CostRemarks - 成本备注';
PRINT '=================================================';
GO