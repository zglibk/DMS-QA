-- =====================================================
-- 修改仪器台账表字段约束
-- 功能：调整出厂编号和管理编号字段约束，使二者至少有其一
-- 版本：v1.0
-- 创建日期：2025年
-- 
-- 修改说明：
-- 1. InstrumentCode 改为出厂编号（可为空）
-- 2. ManagementCode 为管理编号（可为空）
-- 3. 添加约束确保二者至少有其一不为空
-- 4. 调整唯一性约束，允许空值但不允许重复
-- =====================================================

USE [DMS-QA];

PRINT '开始修改仪器台账表字段约束...';

-- 首先删除现有的唯一约束和外键约束
DECLARE @sql NVARCHAR(MAX) = '';

-- 删除所有引用InstrumentCode的外键约束
SELECT @sql = @sql + 'ALTER TABLE [' + OBJECT_SCHEMA_NAME(parent_object_id) + '].[' + OBJECT_NAME(parent_object_id) + '] DROP CONSTRAINT [' + name + '];' + CHAR(13)
FROM sys.foreign_keys 
WHERE referenced_object_id = OBJECT_ID('Instruments') 
AND EXISTS (SELECT 1 FROM sys.foreign_key_columns fkc 
           INNER JOIN sys.columns c ON fkc.referenced_object_id = c.object_id AND fkc.referenced_column_id = c.column_id
           WHERE fkc.constraint_object_id = sys.foreign_keys.object_id AND c.name = 'InstrumentCode');

IF @sql <> ''
BEGIN
    EXEC sp_executesql @sql;
    PRINT '✅ 删除相关外键约束成功';
END

-- 删除唯一约束
IF EXISTS (SELECT * FROM sys.key_constraints WHERE name LIKE '%InstrumentCode%' AND parent_object_id = OBJECT_ID('Instruments'))
BEGIN
    SELECT @sql = 'ALTER TABLE [dbo].[Instruments] DROP CONSTRAINT [' + name + '];'
    FROM sys.key_constraints 
    WHERE name LIKE '%InstrumentCode%' AND parent_object_id = OBJECT_ID('Instruments');
    
    EXEC sp_executesql @sql;
    PRINT '✅ 删除InstrumentCode唯一约束成功';
END

IF EXISTS (SELECT * FROM sys.key_constraints WHERE name LIKE '%ManagementCode%' AND parent_object_id = OBJECT_ID('Instruments'))
BEGIN
    SELECT @sql = 'ALTER TABLE [dbo].[Instruments] DROP CONSTRAINT [' + name + '];'
    FROM sys.key_constraints 
    WHERE name LIKE '%ManagementCode%' AND parent_object_id = OBJECT_ID('Instruments');
    
    EXEC sp_executesql @sql;
    PRINT '✅ 删除ManagementCode唯一约束成功';
END

-- 删除唯一索引
IF EXISTS (SELECT * FROM sys.indexes WHERE name LIKE '%InstrumentCode%' AND object_id = OBJECT_ID('Instruments'))
BEGIN
    DROP INDEX [UQ__Instrume__InstrumentCode] ON [dbo].[Instruments];
    PRINT '✅ 删除InstrumentCode唯一索引成功';
END

IF EXISTS (SELECT * FROM sys.indexes WHERE name LIKE '%ManagementCode%' AND object_id = OBJECT_ID('Instruments'))
BEGIN
    DROP INDEX [UQ__Instrume__ManagementCode] ON [dbo].[Instruments];
    PRINT '✅ 删除ManagementCode唯一索引成功';
END

-- 修改字段为可空
ALTER TABLE [dbo].[Instruments] 
ALTER COLUMN [InstrumentCode] NVARCHAR(50) NULL;
PRINT '✅ InstrumentCode字段修改为可空成功';

ALTER TABLE [dbo].[Instruments] 
ALTER COLUMN [ManagementCode] NVARCHAR(50) NULL;
PRINT '✅ ManagementCode字段修改为可空成功';

-- 添加新的唯一约束（允许空值但不允许重复非空值）
CREATE UNIQUE NONCLUSTERED INDEX [IX_Instruments_InstrumentCode_Unique] 
ON [dbo].[Instruments] ([InstrumentCode]) 
WHERE [InstrumentCode] IS NOT NULL;
PRINT '✅ 添加InstrumentCode唯一索引成功（允许空值）';

CREATE UNIQUE NONCLUSTERED INDEX [IX_Instruments_ManagementCode_Unique] 
ON [dbo].[Instruments] ([ManagementCode]) 
WHERE [ManagementCode] IS NOT NULL;
PRINT '✅ 添加ManagementCode唯一索引成功（允许空值）';

-- 添加检查约束：确保出厂编号和管理编号至少有其一不为空
ALTER TABLE [dbo].[Instruments] 
ADD CONSTRAINT [CK_Instruments_CodeRequired] 
CHECK ([InstrumentCode] IS NOT NULL OR [ManagementCode] IS NOT NULL);
PRINT '✅ 添加检查约束成功：确保出厂编号和管理编号至少有其一';

-- 添加字段注释
EXEC sp_addextendedproperty 
    @name = N'MS_Description', 
    @value = N'出厂编号（可为空，但与管理编号至少有其一）', 
    @level0type = N'SCHEMA', @level0name = N'dbo', 
    @level1type = N'TABLE', @level1name = N'Instruments', 
    @level2type = N'COLUMN', @level2name = N'InstrumentCode';

EXEC sp_addextendedproperty 
    @name = N'MS_Description', 
    @value = N'内部管理编号（可为空，但与出厂编号至少有其一）', 
    @level0type = N'SCHEMA', @level0name = N'dbo', 
    @level1type = N'TABLE', @level1name = N'Instruments', 
    @level2type = N'COLUMN', @level2name = N'ManagementCode';

PRINT '';
PRINT '🎉 仪器台账表字段约束修改完成！';
PRINT '';
PRINT '修改内容：';
PRINT '1. InstrumentCode（出厂编号）- 改为可空，但不允许重复';
PRINT '2. ManagementCode（管理编号）- 改为可空，但不允许重复';
PRINT '3. 添加约束：出厂编号和管理编号至少有其一不为空';
PRINT '4. 更新字段注释说明';
PRINT '';
PRINT '业务规则：';
PRINT '- 有出厂编号的仪器可以不填管理编号';
PRINT '- 没有出厂编号的低端仪器必须填写管理编号';
PRINT '- 两个编号都有的情况也是允许的';
PRINT '- 但不能两个编号都为空';