-- 更新二维码扫描记录表，添加新的订单信息字段
-- =====================================================

USE [DMS_QA]
GO

-- 检查并添加客户编码字段
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[QrScanRecords]') AND name = 'CustomerCode')
BEGIN
    ALTER TABLE [dbo].[QrScanRecords] ADD [CustomerCode] NVARCHAR(100) NULL;
    PRINT '已添加字段: CustomerCode';
END
ELSE
BEGIN
    PRINT '字段 CustomerCode 已存在，跳过添加';
END

-- 检查并添加CPO字段
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[QrScanRecords]') AND name = 'CPO')
BEGIN
    ALTER TABLE [dbo].[QrScanRecords] ADD [CPO] NVARCHAR(100) NULL;
    PRINT '已添加字段: CPO';
END
ELSE
BEGIN
    PRINT '字段 CPO 已存在，跳过添加';
END

-- 检查并添加订单号字段
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[QrScanRecords]') AND name = 'OrderNumber')
BEGIN
    ALTER TABLE [dbo].[QrScanRecords] ADD [OrderNumber] NVARCHAR(100) NULL;
    PRINT '已添加字段: OrderNumber';
END
ELSE
BEGIN
    PRINT '字段 OrderNumber 已存在，跳过添加';
END

-- 检查并添加工单号字段
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[QrScanRecords]') AND name = 'WorkOrderNumber')
BEGIN
    ALTER TABLE [dbo].[QrScanRecords] ADD [WorkOrderNumber] NVARCHAR(100) NULL;
    PRINT '已添加字段: WorkOrderNumber';
END
ELSE
BEGIN
    PRINT '字段 WorkOrderNumber 已存在，跳过添加';
END

-- 检查并添加物料编码字段
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[QrScanRecords]') AND name = 'MaterialCodes')
BEGIN
    ALTER TABLE [dbo].[QrScanRecords] ADD [MaterialCodes] NVARCHAR(MAX) NULL;
    PRINT '已添加字段: MaterialCodes';
END
ELSE
BEGIN
    PRINT '字段 MaterialCodes 已存在，跳过添加';
END

-- 检查并添加工厂订单号字段
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[QrScanRecords]') AND name = 'FactoryOrderNumber')
BEGIN
    ALTER TABLE [dbo].[QrScanRecords] ADD [FactoryOrderNumber] NVARCHAR(100) NULL;
    PRINT '已添加字段: FactoryOrderNumber';
END
ELSE
BEGIN
    PRINT '字段 FactoryOrderNumber 已存在，跳过添加';
END

-- 检查并添加物料数量字段
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[QrScanRecords]') AND name = 'MaterialCount')
BEGIN
    ALTER TABLE [dbo].[QrScanRecords] ADD [MaterialCount] INT DEFAULT 0;
    PRINT '已添加字段: MaterialCount';
END
ELSE
BEGIN
    PRINT '字段 MaterialCount 已存在，跳过添加';
END

-- 检查并添加解析状态字段
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[QrScanRecords]') AND name = 'IsValid')
BEGIN
    ALTER TABLE [dbo].[QrScanRecords] ADD [IsValid] BIT DEFAULT 1;
    PRINT '已添加字段: IsValid';
END
ELSE
BEGIN
    PRINT '字段 IsValid 已存在，跳过添加';
END

-- 检查并添加解析错误字段
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[QrScanRecords]') AND name = 'ParseError')
BEGIN
    ALTER TABLE [dbo].[QrScanRecords] ADD [ParseError] NVARCHAR(MAX) NULL;
    PRINT '已添加字段: ParseError';
END
ELSE
BEGIN
    PRINT '字段 ParseError 已存在，跳过添加';
END

-- 检查并添加解析时间字段
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[QrScanRecords]') AND name = 'ParsedAt')
BEGIN
    ALTER TABLE [dbo].[QrScanRecords] ADD [ParsedAt] DATETIME NULL;
    PRINT '已添加字段: ParsedAt';
END
ELSE
BEGIN
    PRINT '字段 ParsedAt 已存在，跳过添加';
END

-- 更新物料详情表，添加物料编码字段
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[QrScanMaterials]') AND name = 'MaterialCode')
BEGIN
    ALTER TABLE [dbo].[QrScanMaterials] ADD [MaterialCode] NVARCHAR(100) NULL;
    PRINT '已添加字段: MaterialCode (QrScanMaterials表)';
END
ELSE
BEGIN
    PRINT '字段 MaterialCode 已存在，跳过添加 (QrScanMaterials表)';
END

-- 创建新的索引以提高查询性能
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE object_id = OBJECT_ID(N'[dbo].[QrScanRecords]') AND name = 'IX_QrScanRecords_CustomerCode')
BEGIN
    CREATE INDEX IX_QrScanRecords_CustomerCode ON [dbo].[QrScanRecords] (CustomerCode);
    PRINT '已创建索引: IX_QrScanRecords_CustomerCode';
END

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE object_id = OBJECT_ID(N'[dbo].[QrScanRecords]') AND name = 'IX_QrScanRecords_OrderNumber')
BEGIN
    CREATE INDEX IX_QrScanRecords_OrderNumber ON [dbo].[QrScanRecords] (OrderNumber);
    PRINT '已创建索引: IX_QrScanRecords_OrderNumber';
END

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE object_id = OBJECT_ID(N'[dbo].[QrScanRecords]') AND name = 'IX_QrScanRecords_WorkOrderNumber')
BEGIN
    CREATE INDEX IX_QrScanRecords_WorkOrderNumber ON [dbo].[QrScanRecords] (WorkOrderNumber);
    PRINT '已创建索引: IX_QrScanRecords_WorkOrderNumber';
END

PRINT '数据库表结构更新完成！';