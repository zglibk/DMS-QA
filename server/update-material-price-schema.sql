-- 材料价格表结构更新脚本
-- 支持历史价格追踪和备注功能

-- 1. 备份现有数据
IF OBJECT_ID('MaterialPrice_Backup', 'U') IS NOT NULL
    DROP TABLE MaterialPrice_Backup;

SELECT * INTO MaterialPrice_Backup FROM MaterialPrice;

-- 2. 删除现有表
DROP TABLE MaterialPrice;

-- 3. 创建新的MaterialPrice表
CREATE TABLE [dbo].[MaterialPrice] (
    [ID] INT IDENTITY(1,1) PRIMARY KEY,
    [MaterialName] NVARCHAR(100) NOT NULL,
    [Supplier] NVARCHAR(100),
    [UnitPrice] DECIMAL(10,2) NOT NULL,
    [Remarks] NVARCHAR(500),                    -- 备注字段
    [EffectiveDate] DATETIME NOT NULL DEFAULT GETDATE(),  -- 生效日期
    [ExpiryDate] DATETIME NULL,                 -- 失效日期（NULL表示当前有效）
    [IsActive] BIT NOT NULL DEFAULT 1,          -- 是否为当前有效价格
    [Version] INT NOT NULL DEFAULT 1,           -- 版本号
    [CreatedBy] NVARCHAR(50),                   -- 创建人
    [CreatedDate] DATETIME NOT NULL DEFAULT GETDATE(),    -- 创建时间
    [UpdatedBy] NVARCHAR(50),                   -- 更新人
    [UpdatedDate] DATETIME NOT NULL DEFAULT GETDATE(),    -- 更新时间
    
    -- 索引优化
    INDEX IX_MaterialPrice_Active NONCLUSTERED (MaterialName, Supplier, IsActive),
    INDEX IX_MaterialPrice_EffectiveDate NONCLUSTERED (EffectiveDate),
    INDEX IX_MaterialPrice_Material NONCLUSTERED (MaterialName)
);

-- 4. 迁移原有数据
INSERT INTO MaterialPrice (MaterialName, Supplier, UnitPrice, Remarks, EffectiveDate, IsActive, Version)
SELECT 
    MaterialName,
    Supplier,
    UnitPrice,
    '数据迁移' as Remarks,
    GETDATE() as EffectiveDate,
    1 as IsActive,
    1 as Version
FROM MaterialPrice_Backup;

-- 5. 创建视图：当前有效价格
CREATE VIEW [dbo].[CurrentMaterialPrice] AS
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

-- 6. 创建存储过程：更新价格（自动处理历史记录）
CREATE PROCEDURE [dbo].[UpdateMaterialPrice]
    @MaterialName NVARCHAR(100),
    @Supplier NVARCHAR(100) = NULL,
    @NewUnitPrice DECIMAL(10,2),
    @Remarks NVARCHAR(500) = NULL,
    @UpdatedBy NVARCHAR(50) = NULL,
    @EffectiveDate DATETIME = NULL
AS
BEGIN
    SET NOCOUNT ON;
    
    DECLARE @CurrentDate DATETIME = ISNULL(@EffectiveDate, GETDATE());
    DECLARE @MaxVersion INT;
    
    BEGIN TRANSACTION;
    
    TRY
        -- 获取当前最大版本号
        SELECT @MaxVersion = ISNULL(MAX(Version), 0)
        FROM MaterialPrice 
        WHERE MaterialName = @MaterialName 
        AND ISNULL(Supplier, '') = ISNULL(@Supplier, '');
        
        -- 将当前有效记录设为历史记录
        UPDATE MaterialPrice 
        SET 
            IsActive = 0,
            ExpiryDate = @CurrentDate,
            UpdatedBy = @UpdatedBy,
            UpdatedDate = @CurrentDate
        WHERE MaterialName = @MaterialName 
        AND ISNULL(Supplier, '') = ISNULL(@Supplier, '')
        AND IsActive = 1;
        
        -- 插入新的价格记录
        INSERT INTO MaterialPrice (
            MaterialName, Supplier, UnitPrice, Remarks, 
            EffectiveDate, IsActive, Version, CreatedBy, UpdatedBy
        )
        VALUES (
            @MaterialName, @Supplier, @NewUnitPrice, @Remarks,
            @CurrentDate, 1, @MaxVersion + 1, @UpdatedBy, @UpdatedBy
        );
        
        COMMIT TRANSACTION;
        
        SELECT 'SUCCESS' as Result, '价格更新成功' as Message;
        
    END TRY
    BEGIN CATCH
        ROLLBACK TRANSACTION;
        
        SELECT 'ERROR' as Result, ERROR_MESSAGE() as Message;
    END CATCH
END;

-- 7. 创建存储过程：获取价格历史
CREATE PROCEDURE [dbo].[GetMaterialPriceHistory]
    @MaterialName NVARCHAR(100),
    @Supplier NVARCHAR(100) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    
    SELECT 
        ID,
        MaterialName,
        Supplier,
        UnitPrice,
        Remarks,
        EffectiveDate,
        ExpiryDate,
        IsActive,
        Version,
        CreatedBy,
        CreatedDate,
        UpdatedBy,
        UpdatedDate,
        CASE 
            WHEN IsActive = 1 THEN '当前价格'
            ELSE '历史价格'
        END as PriceStatus
    FROM MaterialPrice 
    WHERE MaterialName = @MaterialName 
    AND ISNULL(Supplier, '') = ISNULL(@Supplier, '')
    ORDER BY Version DESC, EffectiveDate DESC;
END;

-- 8. 创建函数：获取指定日期的价格
CREATE FUNCTION [dbo].[GetMaterialPriceAtDate]
(
    @MaterialName NVARCHAR(100),
    @Supplier NVARCHAR(100),
    @QueryDate DATETIME
)
RETURNS DECIMAL(10,2)
AS
BEGIN
    DECLARE @Price DECIMAL(10,2);
    
    SELECT TOP 1 @Price = UnitPrice
    FROM MaterialPrice
    WHERE MaterialName = @MaterialName
    AND ISNULL(Supplier, '') = ISNULL(@Supplier, '')
    AND EffectiveDate <= @QueryDate
    AND (ExpiryDate IS NULL OR ExpiryDate > @QueryDate)
    ORDER BY EffectiveDate DESC;
    
    RETURN @Price;
END;

-- 9. 示例数据插入
/*
-- 插入示例数据
EXEC UpdateMaterialPrice 
    @MaterialName = '铜版纸',
    @Supplier = '供应商A',
    @NewUnitPrice = 8.50,
    @Remarks = '2024年第一季度价格',
    @UpdatedBy = 'admin';

-- 更新价格（会自动保留历史）
EXEC UpdateMaterialPrice 
    @MaterialName = '铜版纸',
    @Supplier = '供应商A',
    @NewUnitPrice = 9.00,
    @Remarks = '2024年第二季度价格调整',
    @UpdatedBy = 'admin';

-- 查看价格历史
EXEC GetMaterialPriceHistory @MaterialName = '铜版纸', @Supplier = '供应商A';

-- 查看当前有效价格
SELECT * FROM CurrentMaterialPrice WHERE MaterialName = '铜版纸';

-- 查看指定日期的价格
SELECT dbo.GetMaterialPriceAtDate('铜版纸', '供应商A', '2024-01-01') as PriceAtDate;
*/

PRINT '材料价格表结构更新完成！';
PRINT '新增功能：';
PRINT '1. 备注字段 (Remarks)';
PRINT '2. 价格历史追踪 (Version, EffectiveDate, ExpiryDate)';
PRINT '3. 当前有效价格视图 (CurrentMaterialPrice)';
PRINT '4. 价格更新存储过程 (UpdateMaterialPrice)';
PRINT '5. 历史查询存储过程 (GetMaterialPriceHistory)';
PRINT '6. 指定日期价格查询函数 (GetMaterialPriceAtDate)';
