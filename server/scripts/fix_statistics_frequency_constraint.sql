USE [DMS-QA];
GO

PRINT '开始修改 QualityTargets 表的 StatisticsFrequency 约束...';

-- 1. 检查并删除旧的约束
IF EXISTS (SELECT * FROM sys.check_constraints WHERE object_id = OBJECT_ID(N'[dbo].[CK_QualityTargets_StatisticsFrequency]') AND parent_object_id = OBJECT_ID(N'[dbo].[QualityTargets]'))
BEGIN
    ALTER TABLE [dbo].[QualityTargets] DROP CONSTRAINT [CK_QualityTargets_StatisticsFrequency];
    PRINT '✅ 已删除旧约束 CK_QualityTargets_StatisticsFrequency';
END
ELSE
BEGIN
    PRINT 'ℹ️ 约束 CK_QualityTargets_StatisticsFrequency 不存在，跳过删除';
END
GO

-- 2. 添加新的约束 (严格限制为4种频次)
ALTER TABLE [dbo].[QualityTargets] WITH CHECK ADD CONSTRAINT [CK_QualityTargets_StatisticsFrequency] CHECK (
    [StatisticsFrequency] IN (
        N'每月', N'每季度', N'每半年', N'每年'
    )
);
PRINT '✅ 已创建新约束 CK_QualityTargets_StatisticsFrequency';
GO

-- 3. 验证约束
ALTER TABLE [dbo].[QualityTargets] CHECK CONSTRAINT [CK_QualityTargets_StatisticsFrequency];
PRINT '✅ 约束已启用并验证';
GO

PRINT '🎉 数据库修改完成！';
