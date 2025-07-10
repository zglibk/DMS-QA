-- 更新测试数据以验证趋势计算功能
USE [DMS_QA];

-- 确保2025年6月和7月的批次数据存在
-- 更新6月数据
UPDATE [dbo].[MonthlyBatchStats] 
SET 
    [InspectionBatches] = 5710,  -- 交检批次数
    [DeliveryBatches] = 5500,    -- 发货批次数
    [Remarks] = N'2025年6月数据 - 测试用',
    [UpdatedBy] = N'admin',
    [UpdatedAt] = GETDATE()
WHERE [StatYear] = 2025 AND [StatMonth] = 6;

-- 更新7月数据
UPDATE [dbo].[MonthlyBatchStats] 
SET 
    [InspectionBatches] = 6200,  -- 交检批次数（比6月增加）
    [DeliveryBatches] = 5800,    -- 发货批次数（比6月增加）
    [Remarks] = N'2025年7月数据 - 测试用',
    [UpdatedBy] = N'admin',
    [UpdatedAt] = GETDATE()
WHERE [StatYear] = 2025 AND [StatMonth] = 7;

-- 如果7月数据不存在，则插入
IF @@ROWCOUNT = 0
BEGIN
    INSERT INTO [dbo].[MonthlyBatchStats] 
    ([StatYear], [StatMonth], [InspectionBatches], [DeliveryBatches], [Remarks], [CreatedBy], [CreatedAt])
    VALUES 
    (2025, 7, 6200, 5800, N'2025年7月数据 - 新增测试', N'admin', GETDATE());
END

-- 验证数据
SELECT 
    [StatYear] as 年份,
    [StatMonth] as 月份,
    [InspectionBatches] as 交检批次,
    [DeliveryBatches] as 发货批次,
    [Remarks] as 备注
FROM [dbo].[MonthlyBatchStats] 
WHERE [StatYear] = 2025 AND [StatMonth] IN (6, 7)
ORDER BY [StatMonth];

PRINT '=== 测试数据更新完成 ===';
PRINT '6月发货批次: 5500';
PRINT '7月发货批次: 5800';
PRINT '预期趋势: +5.5%';
