-- =====================================================
-- 添加IsDeleted字段到质量目标表
-- 功能：为现有的QualityTargets表添加软删除标记字段
-- 执行时间：2025-01-27
-- =====================================================

USE [DMS-QA];
GO

PRINT '开始为质量目标表添加IsDeleted字段...';

-- 检查字段是否已存在
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[QualityTargets]') AND name = 'IsDeleted')
BEGIN
    -- 添加IsDeleted字段
    ALTER TABLE [dbo].[QualityTargets] 
    ADD [IsDeleted] BIT DEFAULT 0;
    
    PRINT '✅ IsDeleted字段添加成功';
    
    -- 为现有记录设置默认值
    UPDATE [dbo].[QualityTargets] 
    SET [IsDeleted] = 0 
    WHERE [IsDeleted] IS NULL;
    
    PRINT '✅ 现有记录IsDeleted字段初始化完成';
END
ELSE
BEGIN
    PRINT '⚠️ IsDeleted字段已存在，跳过添加';
END

-- 创建IsDeleted字段索引以优化查询性能
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_QualityTargets_IsDeleted')
BEGIN
    CREATE NONCLUSTERED INDEX [IX_QualityTargets_IsDeleted] 
    ON [dbo].[QualityTargets] ([IsDeleted]);
    PRINT '✅ IsDeleted字段索引创建成功';
END
ELSE
BEGIN
    PRINT '⚠️ IsDeleted字段索引已存在，跳过创建';
END

PRINT '🎉 质量目标表IsDeleted字段添加完成！';
GO