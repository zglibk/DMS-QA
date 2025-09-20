-- 为AssessmentRecords表添加SourceType字段以支持多表数据整合
-- SQL Server 2008R2 兼容版本

-- 1. 添加SourceType字段
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[AssessmentRecords]') AND name = 'SourceType')
BEGIN
    ALTER TABLE [dbo].[AssessmentRecords] 
    ADD [SourceType] NVARCHAR(20) NOT NULL DEFAULT 'complaint';
END
GO

-- 2. 添加检查约束
IF NOT EXISTS (SELECT * FROM sys.check_constraints WHERE name = 'CK_AssessmentRecords_SourceType')
BEGIN
    ALTER TABLE [dbo].[AssessmentRecords] 
    ADD CONSTRAINT CK_AssessmentRecords_SourceType 
    CHECK ([SourceType] IN ('complaint', 'rework', 'exception'));
END
GO

-- 3. 更新现有Status字段值以符合新约束
UPDATE [dbo].[AssessmentRecords] 
SET [Status] = 'pending' 
WHERE [Status] = 'Active';
GO

-- 4. 更新Status字段的检查约束（如果存在旧约束则先删除）
IF EXISTS (SELECT * FROM sys.check_constraints WHERE name = 'CK_AssessmentRecords_Status')
BEGIN
    ALTER TABLE [dbo].[AssessmentRecords] 
    DROP CONSTRAINT CK_AssessmentRecords_Status;
END
GO

-- 添加新的Status检查约束
ALTER TABLE [dbo].[AssessmentRecords] 
ADD CONSTRAINT CK_AssessmentRecords_Status 
CHECK ([Status] IN ('pending', 'improving', 'returned', 'confirmed'));
GO

-- 5. 更新字段名称（如果需要）
IF EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[AssessmentRecords]') AND name = 'ImprovementPeriodStart')
BEGIN
    EXEC sp_rename 'AssessmentRecords.ImprovementPeriodStart', 'ImprovementStartDate', 'COLUMN';
END
GO

IF EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[AssessmentRecords]') AND name = 'ImprovementPeriodEnd')
BEGIN
    EXEC sp_rename 'AssessmentRecords.ImprovementPeriodEnd', 'ImprovementEndDate', 'COLUMN';
END
GO