-- =====================================================
-- 质量目标管理表创建脚本
-- 功能：创建质量目标管理相关数据表
-- 版本：v1.0
-- 创建日期：2025-01-27
-- =====================================================

USE [DMS-QA];
GO

PRINT '开始创建质量目标管理数据表...';

-- =====================================================
-- 1. 创建质量目标表 (QualityTargets)
-- 功能：存储质量目标的基本信息
-- =====================================================
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[QualityTargets]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[QualityTargets] (
        [ID] INT IDENTITY(1,1) PRIMARY KEY,                    -- 主键，自增ID
        [TargetCategory] NVARCHAR(20) NOT NULL,                -- 目标分类：公司、部门
        [AssessmentUnit] NVARCHAR(100) NOT NULL,               -- 考核单位
        [QualityTarget] NVARCHAR(200) NOT NULL,                -- 质量目标
        [CalculationFormula] NVARCHAR(500),                    -- 计算公式（描述类）
        [TargetValue] NVARCHAR(50) NOT NULL,                   -- 目标值（如≥95%、≤1次、≤2%）
        [Measures] NVARCHAR(1000),                             -- 保证达标的措施（描述类）
        [ResponsiblePerson] NVARCHAR(100) NOT NULL,            -- 责任人
        [StatisticsFrequency] NVARCHAR(20) NOT NULL,           -- 统计频次：每月、每季度、每年
        [TargetYear] INT NOT NULL DEFAULT YEAR(GETDATE()),     -- 目标年度
        [Status] BIT DEFAULT 1,                                -- 状态：1-启用，0-禁用
        [IsDeleted] BIT DEFAULT 0,                             -- 软删除标记：1-已删除，0-未删除
        [CreatedBy] NVARCHAR(50),                              -- 创建人
        [CreatedAt] DATETIME DEFAULT GETDATE(),                -- 创建时间
        [UpdatedBy] NVARCHAR(50),                              -- 更新人
        [UpdatedAt] DATETIME DEFAULT GETDATE(),                -- 更新时间
        [Description] NVARCHAR(500),                           -- 备注说明
        
        -- 约束
        CONSTRAINT CK_QualityTargets_TargetCategory 
            CHECK (TargetCategory IN (N'公司', N'部门')),
        CONSTRAINT CK_QualityTargets_StatisticsFrequency 
            CHECK (StatisticsFrequency IN (N'每月', N'每季度', N'每年')),
        CONSTRAINT CK_QualityTargets_TargetYear 
            CHECK (TargetYear >= 2020 AND TargetYear <= 2050)
    );
    
    PRINT '✅ 质量目标表 (QualityTargets) 创建成功';
END
ELSE
BEGIN
    PRINT '⚠️ 质量目标表 (QualityTargets) 已存在，跳过创建';
END

-- =====================================================
-- 2. 创建质量目标统计表 (QualityTargetStatistics)
-- 功能：存储质量目标的实际达成情况统计数据
-- =====================================================
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[QualityTargetStatistics]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[QualityTargetStatistics] (
        [ID] INT IDENTITY(1,1) PRIMARY KEY,                    -- 主键，自增ID
        [TargetID] INT NOT NULL,                               -- 质量目标ID，外键
        [Year] INT NOT NULL,                                   -- 统计年份
        [Quarter] INT NULL,                                    -- 季度（1-4），可为空
        [Month] INT NULL,                                      -- 月份（1-12），可为空
        [ActualValue] NVARCHAR(50),                            -- 实际达成值
        [AchievementRate] DECIMAL(5,2),                        -- 达成率（百分比）
        [IsAchieved] BIT,                                      -- 是否达标：1-达标，0-未达标
        [Remarks] NVARCHAR(500),                               -- 备注说明
        [CreatedBy] NVARCHAR(50),                              -- 创建人
        [CreatedAt] DATETIME DEFAULT GETDATE(),                -- 创建时间
        [UpdatedBy] NVARCHAR(50),                              -- 更新人
        [UpdatedAt] DATETIME DEFAULT GETDATE(),                -- 更新时间
        
        -- 外键约束
        CONSTRAINT FK_QualityTargetStatistics_TargetID 
            FOREIGN KEY (TargetID) REFERENCES [dbo].[QualityTargets](ID) 
            ON DELETE CASCADE,
            
        -- 检查约束
        CONSTRAINT CK_QualityTargetStatistics_Quarter 
            CHECK (Quarter IS NULL OR Quarter BETWEEN 1 AND 4),
        CONSTRAINT CK_QualityTargetStatistics_Month 
            CHECK (Month IS NULL OR Month BETWEEN 1 AND 12),
        CONSTRAINT CK_QualityTargetStatistics_AchievementRate 
            CHECK (AchievementRate IS NULL OR AchievementRate >= 0)
    );
    
    PRINT '✅ 质量目标统计表 (QualityTargetStatistics) 创建成功';
END
ELSE
BEGIN
    PRINT '⚠️ 质量目标统计表 (QualityTargetStatistics) 已存在，跳过创建';
END

-- =====================================================
-- 3. 创建索引优化查询性能
-- =====================================================

-- 质量目标表索引
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_QualityTargets_TargetCategory')
BEGIN
    CREATE NONCLUSTERED INDEX [IX_QualityTargets_TargetCategory] 
    ON [dbo].[QualityTargets] ([TargetCategory]);
    PRINT '✅ 质量目标表目标分类索引创建成功';
END

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_QualityTargets_ResponsiblePerson')
BEGIN
    CREATE NONCLUSTERED INDEX [IX_QualityTargets_ResponsiblePerson] 
    ON [dbo].[QualityTargets] ([ResponsiblePerson]);
    PRINT '✅ 质量目标表责任人索引创建成功';
END

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_QualityTargets_Status')
BEGIN
    CREATE NONCLUSTERED INDEX [IX_QualityTargets_Status] 
    ON [dbo].[QualityTargets] ([Status]);
    PRINT '✅ 质量目标表状态索引创建成功';
END

-- 质量目标统计表索引
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_QualityTargetStatistics_TargetID')
BEGIN
    CREATE NONCLUSTERED INDEX [IX_QualityTargetStatistics_TargetID] 
    ON [dbo].[QualityTargetStatistics] ([TargetID]);
    PRINT '✅ 质量目标统计表目标ID索引创建成功';
END

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_QualityTargetStatistics_Year_Quarter_Month')
BEGIN
    CREATE NONCLUSTERED INDEX [IX_QualityTargetStatistics_Year_Quarter_Month] 
    ON [dbo].[QualityTargetStatistics] ([Year], [Quarter], [Month]);
    PRINT '✅ 质量目标统计表时间索引创建成功';
END

-- =====================================================
-- 4. 插入示例数据（可选）
-- =====================================================
IF NOT EXISTS (SELECT * FROM [dbo].[QualityTargets])
BEGIN
    INSERT INTO [dbo].[QualityTargets] (
        [TargetCategory], [AssessmentUnit], [QualityTarget], [CalculationFormula], 
        [TargetValue], [Measures], [ResponsiblePerson], [StatisticsFrequency], 
        [CreatedBy], [Description]
    ) VALUES 
    (N'公司', N'质量部', N'产品合格率', N'合格产品数量 / 总产品数量 × 100%', 
     N'≥95%', N'加强质量检验，完善质量管理体系，定期培训操作人员', N'质量经理', N'每月', 
     N'系统管理员', N'公司整体产品质量合格率目标'),
     
    (N'部门', N'生产部', N'设备故障率', N'设备故障次数 / 设备总运行时间', 
     N'≤2%', N'定期设备维护保养，建立设备档案，加强操作培训', N'生产经理', N'每季度', 
     N'系统管理员', N'生产设备故障率控制目标'),
     
    (N'公司', N'客服部', N'客户投诉处理及时率', N'及时处理的投诉数量 / 总投诉数量 × 100%', 
     N'≥98%', N'建立快速响应机制，完善投诉处理流程，提升服务质量', N'客服经理', N'每月', 
     N'系统管理员', N'客户投诉处理效率目标');
     
    PRINT '✅ 质量目标示例数据插入成功';
END
ELSE
BEGIN
    PRINT '⚠️ 质量目标表已有数据，跳过示例数据插入';
END

-- =====================================================
-- 5. 验证表创建结果
-- =====================================================
PRINT '';
PRINT '📋 验证表创建结果：';

-- 检查质量目标表
IF EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[QualityTargets]'))
BEGIN
    DECLARE @QualityTargetsCount INT = (SELECT COUNT(*) FROM [dbo].[QualityTargets]);
    PRINT '  ✅ QualityTargets 表已创建，当前记录数：' + CAST(@QualityTargetsCount AS NVARCHAR(10));
END

-- 检查质量目标统计表
IF EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[QualityTargetStatistics]'))
BEGIN
    DECLARE @StatisticsCount INT = (SELECT COUNT(*) FROM [dbo].[QualityTargetStatistics]);
    PRINT '  ✅ QualityTargetStatistics 表已创建，当前记录数：' + CAST(@StatisticsCount AS NVARCHAR(10));
END

PRINT '';
PRINT '🎉 质量目标管理数据表创建完成！';
PRINT '';
PRINT '📊 表结构说明：';
PRINT '  📋 QualityTargets - 质量目标基础信息表';
PRINT '    ├── 目标分类：公司/部门';
PRINT '    ├── 考核单位、质量目标、计算公式';
PRINT '    ├── 目标值、保证措施、责任人';
PRINT '    └── 统计频次：每月/每季度/每年';
PRINT '';
PRINT '  📈 QualityTargetStatistics - 质量目标统计数据表';
PRINT '    ├── 关联质量目标ID';
PRINT '    ├── 年份、季度、月份';
PRINT '    ├── 实际达成值、达成率';
PRINT '    └── 是否达标标识';
PRINT '';
PRINT '下一步：';
PRINT '  1. 添加目标管理菜单权限';
PRINT '  2. 创建后端API接口';
PRINT '  3. 开发前端页面组件';
PRINT '  4. 实现CRUD功能和统计分析';
PRINT '';

GO