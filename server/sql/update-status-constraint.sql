-- 更新AssessmentRecords表的Status字段约束，添加exempt（免考核）选项支持

-- 删除现有的Status检查约束并添加新约束
IF EXISTS (SELECT * FROM sys.check_constraints WHERE name = 'CK_AssessmentRecords_Status')
BEGIN
    ALTER TABLE [dbo].[AssessmentRecords] DROP CONSTRAINT CK_AssessmentRecords_Status
END

ALTER TABLE [dbo].[AssessmentRecords] 
ADD CONSTRAINT CK_AssessmentRecords_Status 
CHECK ([Status] IN ('pending', 'improving', 'returned', 'confirmed', 'exempt'))