-- MaterialPrice表最小化升级脚本 (SQL Server 2008 R2)
-- 只添加备注字段，保持最小改动

USE [你的数据库名称];  -- 请替换为实际的数据库名称
GO

PRINT '开始为MaterialPrice表添加备注字段...';

-- 检查并添加备注字段
IF NOT EXISTS (
    SELECT * 
    FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_NAME = 'MaterialPrice' 
    AND COLUMN_NAME = 'Remarks'
)
BEGIN
    -- 添加备注字段
    ALTER TABLE MaterialPrice ADD Remarks NVARCHAR(500) NULL;
    
    PRINT '✓ 成功添加备注字段 (Remarks NVARCHAR(500))';
    
    -- 验证字段添加成功
    IF EXISTS (
        SELECT * 
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_NAME = 'MaterialPrice' 
        AND COLUMN_NAME = 'Remarks'
    )
    BEGIN
        PRINT '✓ 字段验证成功';
        
        -- 显示当前表结构
        PRINT '';
        PRINT '当前MaterialPrice表结构:';
        SELECT 
            COLUMN_NAME AS '字段名',
            DATA_TYPE AS '数据类型',
            CASE 
                WHEN CHARACTER_MAXIMUM_LENGTH IS NOT NULL 
                THEN '(' + CAST(CHARACTER_MAXIMUM_LENGTH AS VARCHAR(10)) + ')'
                WHEN NUMERIC_PRECISION IS NOT NULL 
                THEN '(' + CAST(NUMERIC_PRECISION AS VARCHAR(10)) + ',' + CAST(NUMERIC_SCALE AS VARCHAR(10)) + ')'
                ELSE ''
            END AS '长度',
            IS_NULLABLE AS '允许空值'
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_NAME = 'MaterialPrice'
        ORDER BY ORDINAL_POSITION;
        
        -- 显示记录统计
        DECLARE @RecordCount INT
        SELECT @RecordCount = COUNT(*) FROM MaterialPrice
        PRINT '';
        PRINT '当前记录总数: ' + CAST(@RecordCount AS VARCHAR(10));
        
    END
    ELSE
    BEGIN
        PRINT '× 字段验证失败！';
    END
END
ELSE
BEGIN
    PRINT '× 备注字段已存在，无需添加';
    
    -- 显示现有字段信息
    SELECT 
        DATA_TYPE AS '现有字段类型',
        CHARACTER_MAXIMUM_LENGTH AS '字段长度',
        IS_NULLABLE AS '允许空值'
    FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_NAME = 'MaterialPrice' 
    AND COLUMN_NAME = 'Remarks';
END

PRINT '';
PRINT '=== 升级完成 ===';
PRINT '备注字段用途：存储材料价格的备注信息，如价格调整原因、供应商说明等';

GO

-- 可选：为现有记录添加示例备注（取消注释以执行）
/*
UPDATE MaterialPrice 
SET Remarks = '原有价格数据'
WHERE Remarks IS NULL;

PRINT '已为现有记录设置默认备注';
*/

-- 可选：查看前几条记录验证（取消注释以执行）
/*
PRINT '';
PRINT '前5条记录示例:';
SELECT TOP 5 
    ID,
    MaterialName,
    UnitPrice,
    Supplier,
    Remarks
FROM MaterialPrice
ORDER BY ID;
*/
