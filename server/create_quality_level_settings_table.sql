-- =====================================================
-- 质量等级设定表 (QualityLevelSettings)
-- 功能：存储质量等级的配置信息
-- 用途：质量等级管理、返工记录分级
-- =====================================================

-- 检查表是否存在，如果不存在则创建
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='QualityLevelSettings' AND xtype='U')
BEGIN
    CREATE TABLE [dbo].[QualityLevelSettings] (
        [ID] INT IDENTITY(1,1) PRIMARY KEY,              -- 主键，自增ID
        [Grade] NVARCHAR(10) NOT NULL,                   -- 质量等级（如A、B、C、D）
        [Title] NVARCHAR(50) NOT NULL,                   -- 等级名称（如优秀、良好等）
        [Description] NVARCHAR(200) NOT NULL,           -- 等级描述
        [Range] NVARCHAR(100) NOT NULL,                 -- 适用范围（如合格率范围）
        [CreatedAt] DATETIME DEFAULT GETDATE(),         -- 创建时间
        [UpdatedAt] DATETIME DEFAULT GETDATE()          -- 更新时间
    );
    
    PRINT '质量等级设定表 (QualityLevelSettings) 创建成功。';
END
ELSE
BEGIN
    PRINT '质量等级设定表 (QualityLevelSettings) 已存在，跳过创建。';
END

GO

-- 检查是否已有数据，如果没有则插入默认数据
IF NOT EXISTS (SELECT * FROM [dbo].[QualityLevelSettings])
BEGIN
    INSERT INTO [dbo].[QualityLevelSettings] ([Grade], [Title], [Description], [Range]) VALUES 
    (N'A', N'优秀', N'产品质量完全符合标准，无任何缺陷', N'合格率 ≥ 99%'),
    (N'B', N'良好', N'产品质量基本符合标准，存在轻微缺陷', N'合格率 95-99%'),
    (N'C', N'一般', N'产品质量勉强符合标准，存在明显缺陷', N'合格率 90-95%'),
    (N'D', N'不合格', N'产品质量不符合标准，存在严重缺陷', N'合格率 < 90%');
    
    PRINT '质量等级设定表默认数据插入成功。';
END
ELSE
BEGIN
    PRINT '质量等级设定表已有数据，跳过默认数据插入。';
END

GO

-- 创建索引以优化查询性能
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_QualityLevelSettings_Grade')
BEGIN
    CREATE UNIQUE INDEX [IX_QualityLevelSettings_Grade] ON [dbo].[QualityLevelSettings] ([Grade]);
    PRINT '质量等级设定表索引创建成功。';
END

GO

PRINT '质量等级设定表初始化完成。';