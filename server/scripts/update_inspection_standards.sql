-- =====================================================
-- 升级脚本：增加检验依据和合格标准字段
-- =====================================================

USE [DMS-QA];
GO

PRINT '开始更新数据库表结构...';

-- 1. 更新 InspectionItems 表
IF NOT EXISTS(SELECT * FROM sys.columns WHERE Name = N'InspectionStandard' AND Object_ID = Object_ID(N'[dbo].[InspectionItems]'))
BEGIN
    ALTER TABLE [dbo].[InspectionItems] ADD [InspectionStandard] NVARCHAR(200); -- 检验依据（如 GB/T 1234-2020）
    PRINT '✅ InspectionItems 表添加 InspectionStandard 字段';
END

IF NOT EXISTS(SELECT * FROM sys.columns WHERE Name = N'AcceptanceCriteria' AND Object_ID = Object_ID(N'[dbo].[InspectionItems]'))
BEGIN
    ALTER TABLE [dbo].[InspectionItems] ADD [AcceptanceCriteria] NVARCHAR(200); -- 合格标准（如 >= 5.0N）
    PRINT '✅ InspectionItems 表添加 AcceptanceCriteria 字段';
END

-- 2. 更新 IncomingInspectionDetails 表 (用于存储快照)
IF NOT EXISTS(SELECT * FROM sys.columns WHERE Name = N'InspectionStandard' AND Object_ID = Object_ID(N'[dbo].[IncomingInspectionDetails]'))
BEGIN
    ALTER TABLE [dbo].[IncomingInspectionDetails] ADD [InspectionStandard] NVARCHAR(200);
    PRINT '✅ IncomingInspectionDetails 表添加 InspectionStandard 字段';
END

IF NOT EXISTS(SELECT * FROM sys.columns WHERE Name = N'AcceptanceCriteria' AND Object_ID = Object_ID(N'[dbo].[IncomingInspectionDetails]'))
BEGIN
    ALTER TABLE [dbo].[IncomingInspectionDetails] ADD [AcceptanceCriteria] NVARCHAR(200);
    PRINT '✅ IncomingInspectionDetails 表添加 AcceptanceCriteria 字段';
END

PRINT '🎉 数据库更新完成';
GO
