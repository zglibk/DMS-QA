-- 更新2025年7月的批次统计数据
-- 为Dashboard仪表盘提供真实的测试数据

USE [DMS_QA];

-- 更新2025年7月的批次数据
UPDATE [dbo].[MonthlyBatchStats] 
SET 
    [InspectionBatches] = 159,  -- 交检批次数
    [DeliveryBatches] = 151,    -- 发货批次数
    [Remarks] = N'2025年7月数据 - 已更新',
    [UpdatedBy] = N'admin',
    [UpdatedAt] = GETDATE()
WHERE [StatYear] = 2025 AND [StatMonth] = 7;

-- 如果7月数据不存在，则插入
IF @@ROWCOUNT = 0
BEGIN
    INSERT INTO [dbo].[MonthlyBatchStats] 
    ([StatYear], [StatMonth], [InspectionBatches], [DeliveryBatches], [Remarks], [CreatedBy], [CreatedAt])
    VALUES 
    (2025, 7, 159, 151, N'2025年7月数据 - 新增', N'admin', GETDATE());
    
    PRINT '2025年7月批次数据已插入';
END
ELSE
BEGIN
    PRINT '2025年7月批次数据已更新';
END

-- 验证数据
SELECT 
    [StatYear] as 年份,
    [StatMonth] as 月份,
    [InspectionBatches] as 交检批次,
    [DeliveryBatches] as 发货批次,
    [Remarks] as 备注,
    [UpdatedAt] as 更新时间
FROM [dbo].[MonthlyBatchStats] 
WHERE [StatYear] = 2025 AND [StatMonth] = 7;

PRINT '=== 2025年7月批次数据更新完成 ===';
