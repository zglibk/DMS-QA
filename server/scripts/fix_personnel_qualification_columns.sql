-- =============================================
-- 修正 PersonnelQualification 表结构以匹配代码
-- =============================================

-- 1. 重命名 QualificationStatus 为 OverallStatus
IF EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('PersonnelQualification') AND name = 'QualificationStatus')
BEGIN
    EXEC sp_rename 'PersonnelQualification.QualificationStatus', 'OverallStatus', 'COLUMN';
    PRINT '列 QualificationStatus 已重命名为 OverallStatus';
END
GO

-- 2. 添加 IsActive 字段
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('PersonnelQualification') AND name = 'IsActive')
BEGIN
    ALTER TABLE PersonnelQualification ADD IsActive BIT DEFAULT 1;
    PRINT '列 IsActive 已添加';
END
GO

-- 3. 添加 PersonID 字段 (用于关联基础人员表)
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('PersonnelQualification') AND name = 'PersonID')
BEGIN
    ALTER TABLE PersonnelQualification ADD PersonID INT NULL;
    PRINT '列 PersonID 已添加';
END
GO
