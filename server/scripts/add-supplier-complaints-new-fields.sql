/*
 * 为供应商投诉表添加新字段的SQL脚本
 * 功能：添加材料编号、采购单号、来料日期、批量数量、检验日期、使用工单、抽检数量、附图、IQC判定等字段
 * 执行方式：在SQL Server Management Studio中执行此脚本
 */

USE [DMS-QA]
GO

/* ===================================================== */
/* 为供应商投诉表添加新字段 */
/* ===================================================== */

PRINT '开始为供应商投诉表添加新字段...'

-- 检查表是否存在
IF EXISTS (SELECT * FROM sysobjects WHERE name='SupplierComplaints' AND xtype='U')
BEGIN
    -- 添加材料编号字段
    IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('SupplierComplaints') AND name = 'MaterialCode')
    BEGIN
        ALTER TABLE [dbo].[SupplierComplaints] ADD [MaterialCode] NVARCHAR(100) NULL
        PRINT '✓ 材料编号字段 MaterialCode 添加成功'
    END
    ELSE
    BEGIN
        PRINT '- 材料编号字段 MaterialCode 已存在'
    END

    -- 添加采购单号字段
    IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('SupplierComplaints') AND name = 'PurchaseOrderNo')
    BEGIN
        ALTER TABLE [dbo].[SupplierComplaints] ADD [PurchaseOrderNo] NTEXT NULL
        PRINT '✓ 采购单号字段 PurchaseOrderNo 添加成功'
    END
    ELSE
    BEGIN
        PRINT '- 采购单号字段 PurchaseOrderNo 已存在'
    END

    -- 添加来料日期字段
    IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('SupplierComplaints') AND name = 'IncomingDate')
    BEGIN
        ALTER TABLE [dbo].[SupplierComplaints] ADD [IncomingDate] DATETIME NULL
        PRINT '✓ 来料日期字段 IncomingDate 添加成功'
    END
    ELSE
    BEGIN
        PRINT '- 来料日期字段 IncomingDate 已存在'
    END

    -- 添加批量数量字段
    IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('SupplierComplaints') AND name = 'BatchQuantity')
    BEGIN
        ALTER TABLE [dbo].[SupplierComplaints] ADD [BatchQuantity] DECIMAL(18,2) DEFAULT 0
        PRINT '✓ 批量数量字段 BatchQuantity 添加成功'
    END
    ELSE
    BEGIN
        PRINT '- 批量数量字段 BatchQuantity 已存在'
    END

    -- 添加检验日期字段
    IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('SupplierComplaints') AND name = 'InspectionDate')
    BEGIN
        ALTER TABLE [dbo].[SupplierComplaints] ADD [InspectionDate] DATETIME NULL
        PRINT '✓ 检验日期字段 InspectionDate 添加成功'
    END
    ELSE
    BEGIN
        PRINT '- 检验日期字段 InspectionDate 已存在'
    END

    -- 添加使用工单字段
    IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('SupplierComplaints') AND name = 'WorkOrderNo')
    BEGIN
        ALTER TABLE [dbo].[SupplierComplaints] ADD [WorkOrderNo] NTEXT NULL
        PRINT '✓ 使用工单字段 WorkOrderNo 添加成功'
    END
    ELSE
    BEGIN
        PRINT '- 使用工单字段 WorkOrderNo 已存在'
    END

    -- 添加抽检数量字段
    IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('SupplierComplaints') AND name = 'SampleQuantity')
    BEGIN
        ALTER TABLE [dbo].[SupplierComplaints] ADD [SampleQuantity] DECIMAL(18,2) DEFAULT 0
        PRINT '✓ 抽检数量字段 SampleQuantity 添加成功'
    END
    ELSE
    BEGIN
        PRINT '- 抽检数量字段 SampleQuantity 已存在'
    END

    -- 添加附图字段
    IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('SupplierComplaints') AND name = 'AttachedImages')
    BEGIN
        ALTER TABLE [dbo].[SupplierComplaints] ADD [AttachedImages] NTEXT NULL
        PRINT '✓ 附图字段 AttachedImages 添加成功'
    END
    ELSE
    BEGIN
        PRINT '- 附图字段 AttachedImages 已存在'
    END

    -- 添加IQC判定字段
    IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('SupplierComplaints') AND name = 'IQCResult')
    BEGIN
        ALTER TABLE [dbo].[SupplierComplaints] ADD [IQCResult] NVARCHAR(50) NULL
        PRINT '✓ IQC判定字段 IQCResult 添加成功'
    END
    ELSE
    BEGIN
        PRINT '- IQC判定字段 IQCResult 已存在'
    END

    PRINT '供应商投诉表新字段添加完成！'
END
ELSE
BEGIN
    PRINT '错误：供应商投诉表 SupplierComplaints 不存在，请先创建表！'
END

/* ===================================================== */
/* 创建新字段的索引（可选） */
/* ===================================================== */

-- 材料编号索引
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_SupplierComplaints_MaterialCode')
BEGIN
    CREATE INDEX [IX_SupplierComplaints_MaterialCode] ON [SupplierComplaints] ([MaterialCode])
    PRINT '✓ 材料编号索引创建成功'
END

-- IQC判定索引
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_SupplierComplaints_IQCResult')
BEGIN
    CREATE INDEX [IX_SupplierComplaints_IQCResult] ON [SupplierComplaints] ([IQCResult])
    PRINT '✓ IQC判定索引创建成功'
END

PRINT '所有操作完成！'
GO