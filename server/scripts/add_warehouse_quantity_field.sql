-- 为二维码扫描记录表添加入库数字段
-- =====================================================

USE [DMS-QA]
GO

-- 为QrScanRecords主表添加入库数相关字段
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[QrScanRecords]') AND name = 'WarehouseQuantity')
BEGIN
    ALTER TABLE [dbo].[QrScanRecords] 
    ADD [WarehouseQuantity] INT NULL;
    PRINT '已添加 WarehouseQuantity 字段到 QrScanRecords 表';
END
ELSE
BEGIN
    PRINT 'WarehouseQuantity 字段已存在于 QrScanRecords 表';
END

-- 添加入库确认状态字段
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[QrScanRecords]') AND name = 'WarehouseStatus')
BEGIN
    ALTER TABLE [dbo].[QrScanRecords] 
    ADD [WarehouseStatus] NVARCHAR(20) DEFAULT 'pending';
    PRINT '已添加 WarehouseStatus 字段到 QrScanRecords 表';
END
ELSE
BEGIN
    PRINT 'WarehouseStatus 字段已存在于 QrScanRecords 表';
END

-- 添加入库确认时间字段
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[QrScanRecords]') AND name = 'WarehouseConfirmedAt')
BEGIN
    ALTER TABLE [dbo].[QrScanRecords] 
    ADD [WarehouseConfirmedAt] DATETIME NULL;
    PRINT '已添加 WarehouseConfirmedAt 字段到 QrScanRecords 表';
END
ELSE
BEGIN
    PRINT 'WarehouseConfirmedAt 字段已存在于 QrScanRecords 表';
END

-- 添加入库确认用户字段
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[QrScanRecords]') AND name = 'WarehouseConfirmedBy')
BEGIN
    ALTER TABLE [dbo].[QrScanRecords] 
    ADD [WarehouseConfirmedBy] NVARCHAR(50) NULL;
    PRINT '已添加 WarehouseConfirmedBy 字段到 QrScanRecords 表';
END
ELSE
BEGIN
    PRINT 'WarehouseConfirmedBy 字段已存在于 QrScanRecords 表';
END

-- 添加备注字段（用于记录入库差异原因等）
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[QrScanRecords]') AND name = 'WarehouseRemark')
BEGIN
    ALTER TABLE [dbo].[QrScanRecords] 
    ADD [WarehouseRemark] NVARCHAR(500) NULL;
    PRINT '已添加 WarehouseRemark 字段到 QrScanRecords 表';
END
ELSE
BEGIN
    PRINT 'WarehouseRemark 字段已存在于 QrScanRecords 表';
END

GO

-- 为QrScanMaterials物料详情表添加实际入库数字段
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[QrScanMaterials]') AND name = 'ActualQuantity')
BEGIN
    ALTER TABLE [dbo].[QrScanMaterials] 
    ADD [ActualQuantity] INT NULL;
    PRINT '已添加 ActualQuantity 字段到 QrScanMaterials 表';
END
ELSE
BEGIN
    PRINT 'ActualQuantity 字段已存在于 QrScanMaterials 表';
END

-- 添加差异数量字段（实际数量 - 订单数量）
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[QrScanMaterials]') AND name = 'QuantityDifference')
BEGIN
    ALTER TABLE [dbo].[QrScanMaterials] 
    ADD [QuantityDifference] INT NULL;
    PRINT '已添加 QuantityDifference 字段到 QrScanMaterials 表';
END
ELSE
BEGIN
    PRINT 'QuantityDifference 字段已存在于 QrScanMaterials 表';
END

-- 添加差异原因字段
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[QrScanMaterials]') AND name = 'DifferenceReason')
BEGIN
    ALTER TABLE [dbo].[QrScanMaterials] 
    ADD [DifferenceReason] NVARCHAR(200) NULL;
    PRINT '已添加 DifferenceReason 字段到 QrScanMaterials 表';
END
ELSE
BEGIN
    PRINT 'DifferenceReason 字段已存在于 QrScanMaterials 表';
END

GO

-- 创建入库相关索引以提高查询性能
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE object_id = OBJECT_ID(N'[dbo].[QrScanRecords]') AND name = 'IX_QrScanRecords_WarehouseStatus')
BEGIN
    CREATE INDEX IX_QrScanRecords_WarehouseStatus ON [dbo].[QrScanRecords] (WarehouseStatus);
    PRINT '已创建 WarehouseStatus 索引';
END

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE object_id = OBJECT_ID(N'[dbo].[QrScanRecords]') AND name = 'IX_QrScanRecords_WarehouseConfirmedAt')
BEGIN
    CREATE INDEX IX_QrScanRecords_WarehouseConfirmedAt ON [dbo].[QrScanRecords] (WarehouseConfirmedAt DESC);
    PRINT '已创建 WarehouseConfirmedAt 索引';
END

GO

-- 添加字段说明注释
EXEC sp_addextendedproperty 
    @name = N'MS_Description', 
    @value = N'实际入库总数量', 
    @level0type = N'SCHEMA', @level0name = N'dbo',
    @level1type = N'TABLE', @level1name = N'QrScanRecords',
    @level2type = N'COLUMN', @level2name = N'WarehouseQuantity';

EXEC sp_addextendedproperty 
    @name = N'MS_Description', 
    @value = N'入库状态：pending(待确认)、confirmed(已确认)、cancelled(已取消)', 
    @level0type = N'SCHEMA', @level0name = N'dbo',
    @level1type = N'TABLE', @level1name = N'QrScanRecords',
    @level2type = N'COLUMN', @level2name = N'WarehouseStatus';

EXEC sp_addextendedproperty 
    @name = N'MS_Description', 
    @value = N'入库确认时间', 
    @level0type = N'SCHEMA', @level0name = N'dbo',
    @level1type = N'TABLE', @level1name = N'QrScanRecords',
    @level2type = N'COLUMN', @level2name = N'WarehouseConfirmedAt';

EXEC sp_addextendedproperty 
    @name = N'MS_Description', 
    @value = N'入库确认用户', 
    @level0type = N'SCHEMA', @level0name = N'dbo',
    @level1type = N'TABLE', @level1name = N'QrScanRecords',
    @level2type = N'COLUMN', @level2name = N'WarehouseConfirmedBy';

EXEC sp_addextendedproperty 
    @name = N'MS_Description', 
    @value = N'入库备注（差异原因等）', 
    @level0type = N'SCHEMA', @level0name = N'dbo',
    @level1type = N'TABLE', @level1name = N'QrScanRecords',
    @level2type = N'COLUMN', @level2name = N'WarehouseRemark';

EXEC sp_addextendedproperty 
    @name = N'MS_Description', 
    @value = N'实际入库数量', 
    @level0type = N'SCHEMA', @level0name = N'dbo',
    @level1type = N'TABLE', @level1name = N'QrScanMaterials',
    @level2type = N'COLUMN', @level2name = N'ActualQuantity';

EXEC sp_addextendedproperty 
    @name = N'MS_Description', 
    @value = N'数量差异（实际数量-订单数量）', 
    @level0type = N'SCHEMA', @level0name = N'dbo',
    @level1type = N'TABLE', @level1name = N'QrScanMaterials',
    @level2type = N'COLUMN', @level2name = N'QuantityDifference';

EXEC sp_addextendedproperty 
    @name = N'MS_Description', 
    @value = N'差异原因说明', 
    @level0type = N'SCHEMA', @level0name = N'dbo',
    @level1type = N'TABLE', @level1name = N'QrScanMaterials',
    @level2type = N'COLUMN', @level2name = N'DifferenceReason';

PRINT '=== 入库数字段添加完成 ===';
PRINT '新增字段说明：';
PRINT '1. WarehouseQuantity - 实际入库总数量';
PRINT '2. WarehouseStatus - 入库状态（pending/confirmed/cancelled）';
PRINT '3. WarehouseConfirmedAt - 入库确认时间';
PRINT '4. WarehouseConfirmedBy - 入库确认用户';
PRINT '5. WarehouseRemark - 入库备注';
PRINT '6. ActualQuantity - 物料实际入库数量';
PRINT '7. QuantityDifference - 数量差异';
PRINT '8. DifferenceReason - 差异原因';