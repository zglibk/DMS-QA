-- MaterialPrice表手工升级脚本 (SQL Server 2008 R2兼容版本)
-- 执行前请先备份数据库！

USE [你的数据库名称];  -- 请替换为实际的数据库名称
GO

PRINT '开始MaterialPrice表升级...';
PRINT '当前时间: ' + CONVERT(VARCHAR(20), GETDATE(), 120);
GO

-- 1. 备份现有数据
PRINT '步骤1: 备份现有数据...';
IF OBJECT_ID('MaterialPrice_Backup_' + REPLACE(CONVERT(VARCHAR(10), GETDATE(), 112), '-', ''), 'U') IS NOT NULL
BEGIN
    EXEC('DROP TABLE MaterialPrice_Backup_' + REPLACE(CONVERT(VARCHAR(10), GETDATE(), 112), '-', ''))
END

DECLARE @BackupTableName NVARCHAR(100) = 'MaterialPrice_Backup_' + REPLACE(CONVERT(VARCHAR(10), GETDATE(), 112), '-', '')
DECLARE @BackupSQL NVARCHAR(500) = 'SELECT * INTO ' + @BackupTableName + ' FROM MaterialPrice'
EXEC sp_executesql @BackupSQL

PRINT '数据备份完成，备份表名: ' + @BackupTableName;
GO

-- 2. 检查现有表结构
PRINT '步骤2: 检查现有表结构...';
SELECT 
    COLUMN_NAME,
    DATA_TYPE,
    CHARACTER_MAXIMUM_LENGTH,
    IS_NULLABLE
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_NAME = 'MaterialPrice'
ORDER BY ORDINAL_POSITION;
GO

-- 3. 添加新字段
PRINT '步骤3: 添加新字段...';

-- 添加备注字段
IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'MaterialPrice' AND COLUMN_NAME = 'Remarks')
BEGIN
    ALTER TABLE MaterialPrice ADD Remarks NVARCHAR(500) NULL;
    PRINT '✓ 已添加 Remarks 字段';
END
ELSE
BEGIN
    PRINT '× Remarks 字段已存在，跳过';
END

-- 添加生效日期字段
IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'MaterialPrice' AND COLUMN_NAME = 'EffectiveDate')
BEGIN
    ALTER TABLE MaterialPrice ADD EffectiveDate DATETIME NOT NULL DEFAULT GETDATE();
    PRINT '✓ 已添加 EffectiveDate 字段';
END
ELSE
BEGIN
    PRINT '× EffectiveDate 字段已存在，跳过';
END

-- 添加失效日期字段
IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'MaterialPrice' AND COLUMN_NAME = 'ExpiryDate')
BEGIN
    ALTER TABLE MaterialPrice ADD ExpiryDate DATETIME NULL;
    PRINT '✓ 已添加 ExpiryDate 字段';
END
ELSE
BEGIN
    PRINT '× ExpiryDate 字段已存在，跳过';
END

-- 添加是否有效字段
IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'MaterialPrice' AND COLUMN_NAME = 'IsActive')
BEGIN
    ALTER TABLE MaterialPrice ADD IsActive BIT NOT NULL DEFAULT 1;
    PRINT '✓ 已添加 IsActive 字段';
END
ELSE
BEGIN
    PRINT '× IsActive 字段已存在，跳过';
END

-- 添加版本号字段
IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'MaterialPrice' AND COLUMN_NAME = 'Version')
BEGIN
    ALTER TABLE MaterialPrice ADD Version INT NOT NULL DEFAULT 1;
    PRINT '✓ 已添加 Version 字段';
END
ELSE
BEGIN
    PRINT '× Version 字段已存在，跳过';
END

-- 添加创建人字段
IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'MaterialPrice' AND COLUMN_NAME = 'CreatedBy')
BEGIN
    ALTER TABLE MaterialPrice ADD CreatedBy NVARCHAR(50) NULL;
    PRINT '✓ 已添加 CreatedBy 字段';
END
ELSE
BEGIN
    PRINT '× CreatedBy 字段已存在，跳过';
END

-- 添加创建时间字段
IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'MaterialPrice' AND COLUMN_NAME = 'CreatedDate')
BEGIN
    ALTER TABLE MaterialPrice ADD CreatedDate DATETIME NOT NULL DEFAULT GETDATE();
    PRINT '✓ 已添加 CreatedDate 字段';
END
ELSE
BEGIN
    PRINT '× CreatedDate 字段已存在，跳过';
END

-- 添加更新人字段
IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'MaterialPrice' AND COLUMN_NAME = 'UpdatedBy')
BEGIN
    ALTER TABLE MaterialPrice ADD UpdatedBy NVARCHAR(50) NULL;
    PRINT '✓ 已添加 UpdatedBy 字段';
END
ELSE
BEGIN
    PRINT '× UpdatedBy 字段已存在，跳过';
END

-- 添加更新时间字段
IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'MaterialPrice' AND COLUMN_NAME = 'UpdatedDate')
BEGIN
    ALTER TABLE MaterialPrice ADD UpdatedDate DATETIME NOT NULL DEFAULT GETDATE();
    PRINT '✓ 已添加 UpdatedDate 字段';
END
ELSE
BEGIN
    PRINT '× UpdatedDate 字段已存在，跳过';
END

GO

-- 4. 更新现有数据的默认值
PRINT '步骤4: 更新现有数据的默认值...';

-- 为现有记录设置默认备注
UPDATE MaterialPrice 
SET Remarks = '数据迁移 - 原有数据'
WHERE Remarks IS NULL;

-- 为现有记录设置创建人
UPDATE MaterialPrice 
SET CreatedBy = 'system'
WHERE CreatedBy IS NULL;

-- 为现有记录设置更新人
UPDATE MaterialPrice 
SET UpdatedBy = 'system'
WHERE UpdatedBy IS NULL;

PRINT '✓ 现有数据默认值更新完成';
GO

-- 5. 创建索引（SQL Server 2008 R2兼容语法）
PRINT '步骤5: 创建索引...';

-- 检查并创建复合索引
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_MaterialPrice_Active' AND object_id = OBJECT_ID('MaterialPrice'))
BEGIN
    CREATE NONCLUSTERED INDEX IX_MaterialPrice_Active 
    ON MaterialPrice (MaterialName, Supplier, IsActive);
    PRINT '✓ 已创建 IX_MaterialPrice_Active 索引';
END
ELSE
BEGIN
    PRINT '× IX_MaterialPrice_Active 索引已存在，跳过';
END

-- 检查并创建生效日期索引
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_MaterialPrice_EffectiveDate' AND object_id = OBJECT_ID('MaterialPrice'))
BEGIN
    CREATE NONCLUSTERED INDEX IX_MaterialPrice_EffectiveDate 
    ON MaterialPrice (EffectiveDate);
    PRINT '✓ 已创建 IX_MaterialPrice_EffectiveDate 索引';
END
ELSE
BEGIN
    PRINT '× IX_MaterialPrice_EffectiveDate 索引已存在，跳过';
END

-- 检查并创建材料名称索引
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_MaterialPrice_Material' AND object_id = OBJECT_ID('MaterialPrice'))
BEGIN
    CREATE NONCLUSTERED INDEX IX_MaterialPrice_Material 
    ON MaterialPrice (MaterialName);
    PRINT '✓ 已创建 IX_MaterialPrice_Material 索引';
END
ELSE
BEGIN
    PRINT '× IX_MaterialPrice_Material 索引已存在，跳过';
END

GO

-- 6. 验证表结构
PRINT '步骤6: 验证新表结构...';
SELECT 
    COLUMN_NAME AS '字段名',
    DATA_TYPE AS '数据类型',
    CASE 
        WHEN CHARACTER_MAXIMUM_LENGTH IS NOT NULL 
        THEN DATA_TYPE + '(' + CAST(CHARACTER_MAXIMUM_LENGTH AS VARCHAR(10)) + ')'
        WHEN NUMERIC_PRECISION IS NOT NULL 
        THEN DATA_TYPE + '(' + CAST(NUMERIC_PRECISION AS VARCHAR(10)) + ',' + CAST(NUMERIC_SCALE AS VARCHAR(10)) + ')'
        ELSE DATA_TYPE
    END AS '完整类型',
    IS_NULLABLE AS '允许空值',
    COLUMN_DEFAULT AS '默认值'
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_NAME = 'MaterialPrice'
ORDER BY ORDINAL_POSITION;

-- 显示记录统计
DECLARE @RecordCount INT
SELECT @RecordCount = COUNT(*) FROM MaterialPrice
PRINT '当前记录总数: ' + CAST(@RecordCount AS VARCHAR(10));

DECLARE @ActiveCount INT
SELECT @ActiveCount = COUNT(*) FROM MaterialPrice WHERE IsActive = 1
PRINT '有效记录数: ' + CAST(@ActiveCount AS VARCHAR(10));

GO

-- 7. 创建当前有效价格视图
PRINT '步骤7: 创建当前有效价格视图...';

IF OBJECT_ID('CurrentMaterialPrice', 'V') IS NOT NULL
BEGIN
    DROP VIEW CurrentMaterialPrice;
    PRINT '× 删除已存在的视图';
END

-- 创建视图
CREATE VIEW CurrentMaterialPrice AS
SELECT 
    ID,
    MaterialName,
    Supplier,
    UnitPrice,
    Remarks,
    EffectiveDate,
    Version,
    CreatedBy,
    CreatedDate,
    UpdatedBy,
    UpdatedDate
FROM MaterialPrice 
WHERE IsActive = 1;

PRINT '✓ 已创建 CurrentMaterialPrice 视图';
GO

-- 8. 测试视图
PRINT '步骤8: 测试视图...';
SELECT TOP 5 
    MaterialName,
    Supplier,
    UnitPrice,
    Version,
    EffectiveDate
FROM CurrentMaterialPrice
ORDER BY MaterialName;
GO

-- 9. 修改UnitPrice字段为可空
PRINT '步骤9: 修改UnitPrice字段为可空...';

-- 检查字段是否为NOT NULL
IF EXISTS (
    SELECT * FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_NAME = 'MaterialPrice'
    AND COLUMN_NAME = 'UnitPrice'
    AND IS_NULLABLE = 'NO'
)
BEGIN
    -- 修改字段为可空
    ALTER TABLE MaterialPrice ALTER COLUMN UnitPrice DECIMAL(10,2) NULL;
    PRINT '✓ UnitPrice字段已修改为可空';
END
ELSE
BEGIN
    PRINT '× UnitPrice字段已经是可空的';
END

GO

PRINT '=== MaterialPrice表升级完成 ===';
PRINT '升级时间: ' + CONVERT(VARCHAR(20), GETDATE(), 120);
PRINT '';
PRINT '字段变更说明:';
PRINT '- UnitPrice: 单价字段已修改为可空 (DECIMAL(10,2) NULL)';
PRINT '- Remarks: 备注信息 (NVARCHAR(500))';
PRINT '- EffectiveDate: 生效日期 (DATETIME)';
PRINT '- ExpiryDate: 失效日期 (DATETIME, 可空)';
PRINT '- IsActive: 是否有效 (BIT, 默认1)';
PRINT '- Version: 版本号 (INT, 默认1)';
PRINT '- CreatedBy: 创建人 (NVARCHAR(50))';
PRINT '- CreatedDate: 创建时间 (DATETIME)';
PRINT '- UpdatedBy: 更新人 (NVARCHAR(50))';
PRINT '- UpdatedDate: 更新时间 (DATETIME)';
PRINT '';
PRINT '新增视图:';
PRINT '- CurrentMaterialPrice: 当前有效价格视图';
PRINT '';
PRINT '请注意: 如需回滚，请使用备份表进行数据恢复！';
GO
