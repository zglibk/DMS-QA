-- 为质量目标表添加目标年度字段
-- 检查字段是否已存在
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[QualityTargets]') AND name = 'TargetYear')
BEGIN
    -- 添加目标年度字段
    ALTER TABLE [dbo].[QualityTargets]
    ADD [TargetYear] INT NOT NULL DEFAULT YEAR(GETDATE());
    
    PRINT '目标年度字段 (TargetYear) 添加成功';
    
    -- 添加检查约束，确保年度在合理范围内
    ALTER TABLE [dbo].[QualityTargets]
    ADD CONSTRAINT CK_QualityTargets_TargetYear 
        CHECK (TargetYear >= 2020 AND TargetYear <= 2050);
    
    PRINT '目标年度字段约束添加成功';
END
ELSE
BEGIN
    PRINT '目标年度字段 (TargetYear) 已存在，跳过添加';
END