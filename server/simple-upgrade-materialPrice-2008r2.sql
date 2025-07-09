-- MaterialPrice表简化升级脚本 (SQL Server 2008 R2)
-- 只添加核心字段：备注、生效日期、版本控制

USE [你的数据库名称];  -- 请替换为实际的数据库名称
GO

PRINT '开始MaterialPrice表简化升级...';
GO

-- 1. 备份现有数据（可选，建议执行）
/*
SELECT * INTO MaterialPrice_Backup_Simple FROM MaterialPrice;
PRINT '数据已备份到 MaterialPrice_Backup_Simple 表';
*/

-- 2. 添加备注字段
IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'MaterialPrice' AND COLUMN_NAME = 'Remarks')
BEGIN
    ALTER TABLE MaterialPrice ADD Remarks NVARCHAR(500) NULL;
    PRINT '✓ 已添加备注字段 (Remarks)';
END
ELSE
    PRINT '× 备注字段已存在';

-- 3. 添加生效日期字段
IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'MaterialPrice' AND COLUMN_NAME = 'EffectiveDate')
BEGIN
    ALTER TABLE MaterialPrice ADD EffectiveDate DATETIME NOT NULL DEFAULT GETDATE();
    PRINT '✓ 已添加生效日期字段 (EffectiveDate)';
END
ELSE
    PRINT '× 生效日期字段已存在';

-- 4. 添加失效日期字段
IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'MaterialPrice' AND COLUMN_NAME = 'ExpiryDate')
BEGIN
    ALTER TABLE MaterialPrice ADD ExpiryDate DATETIME NULL;
    PRINT '✓ 已添加失效日期字段 (ExpiryDate)';
END
ELSE
    PRINT '× 失效日期字段已存在';

-- 5. 添加是否有效字段
IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'MaterialPrice' AND COLUMN_NAME = 'IsActive')
BEGIN
    ALTER TABLE MaterialPrice ADD IsActive BIT NOT NULL DEFAULT 1;
    PRINT '✓ 已添加有效标志字段 (IsActive)';
END
ELSE
    PRINT '× 有效标志字段已存在';

-- 6. 添加版本号字段
IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'MaterialPrice' AND COLUMN_NAME = 'Version')
BEGIN
    ALTER TABLE MaterialPrice ADD Version INT NOT NULL DEFAULT 1;
    PRINT '✓ 已添加版本号字段 (Version)';
END
ELSE
    PRINT '× 版本号字段已存在';

-- 7. 为现有记录设置默认值
UPDATE MaterialPrice 
SET Remarks = '原有数据'
WHERE Remarks IS NULL;

PRINT '✓ 现有记录默认值设置完成';

-- 8. 创建基本索引
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_MaterialPrice_Active' AND object_id = OBJECT_ID('MaterialPrice'))
BEGIN
    CREATE NONCLUSTERED INDEX IX_MaterialPrice_Active 
    ON MaterialPrice (MaterialName, IsActive);
    PRINT '✓ 已创建活动记录索引';
END

-- 9. 验证升级结果
PRINT '';
PRINT '=== 升级完成 ===';
PRINT '新表结构:';

SELECT 
    COLUMN_NAME AS '字段名',
    DATA_TYPE AS '类型',
    IS_NULLABLE AS '允许空值'
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_NAME = 'MaterialPrice'
ORDER BY ORDINAL_POSITION;

DECLARE @Count INT
SELECT @Count = COUNT(*) FROM MaterialPrice
PRINT '总记录数: ' + CAST(@Count AS VARCHAR(10));

GO

-- 10. 创建简单的当前价格视图
IF OBJECT_ID('CurrentMaterialPrice', 'V') IS NOT NULL
    DROP VIEW CurrentMaterialPrice;

CREATE VIEW CurrentMaterialPrice AS
SELECT 
    ID,
    MaterialName,
    Supplier,
    UnitPrice,
    Remarks,
    EffectiveDate,
    Version
FROM MaterialPrice 
WHERE IsActive = 1;

PRINT '✓ 已创建当前价格视图 (CurrentMaterialPrice)';

-- 测试视图
SELECT TOP 3 * FROM CurrentMaterialPrice;

PRINT '';
PRINT '升级完成！新增字段说明：';
PRINT '- Remarks: 备注信息';
PRINT '- EffectiveDate: 生效日期';
PRINT '- ExpiryDate: 失效日期（空值表示当前有效）';
PRINT '- IsActive: 是否为当前有效价格（1=有效，0=历史）';
PRINT '- Version: 版本号（用于追踪价格变更）';

GO
