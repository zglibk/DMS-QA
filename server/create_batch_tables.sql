-- DMS-QA 月度批次统计表创建脚本 (SQL Server 2008R2兼容)
-- 用于手工录入月度汇总数据

-- 月度批次统计表
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='MonthlyBatchStats' AND xtype='U')
BEGIN
    CREATE TABLE MonthlyBatchStats (
        ID int IDENTITY(1,1) PRIMARY KEY,
        StatYear int NOT NULL,                       -- 统计年份
        StatMonth int NOT NULL,                      -- 统计月份 (1-12)
        InspectionBatches int DEFAULT 0,             -- 交检批次数
        DeliveryBatches int DEFAULT 0,               -- 发货批次数
        Remarks nvarchar(500),                       -- 备注
        CreatedBy nvarchar(50),                      -- 创建人
        CreatedAt datetime DEFAULT GETDATE(),        -- 创建时间
        UpdatedBy nvarchar(50),                      -- 更新人
        UpdatedAt datetime DEFAULT GETDATE()         -- 更新时间
    );

    -- 创建唯一索引 (年月组合唯一)
    CREATE UNIQUE INDEX IX_MonthlyBatchStats_YearMonth ON MonthlyBatchStats(StatYear, StatMonth);

    PRINT '月度批次统计表 MonthlyBatchStats 创建成功';
END
ELSE
BEGIN
    PRINT '月度批次统计表 MonthlyBatchStats 已存在';
END

-- 插入2024年测试数据
IF NOT EXISTS (SELECT * FROM MonthlyBatchStats WHERE StatYear = 2024 AND StatMonth = 1)
BEGIN
    INSERT INTO MonthlyBatchStats (StatYear, StatMonth, InspectionBatches, DeliveryBatches, CreatedBy, Remarks)
    VALUES
    (2024, 1, 120, 115, 'admin', '2024年1月数据'),
    (2024, 2, 135, 128, 'admin', '2024年2月数据'),
    (2024, 3, 142, 138, 'admin', '2024年3月数据'),
    (2024, 4, 128, 125, 'admin', '2024年4月数据'),
    (2024, 5, 156, 148, 'admin', '2024年5月数据'),
    (2024, 6, 163, 155, 'admin', '2024年6月数据'),
    (2024, 7, 148, 142, 'admin', '2024年7月数据'),
    (2024, 8, 152, 146, 'admin', '2024年8月数据'),
    (2024, 9, 139, 134, 'admin', '2024年9月数据'),
    (2024, 10, 145, 140, 'admin', '2024年10月数据'),
    (2024, 11, 133, 129, 'admin', '2024年11月数据'),
    (2024, 12, 158, 151, 'admin', '2024年12月数据');

    PRINT '2024年月度批次测试数据插入成功';
END

-- 插入2025年测试数据
IF NOT EXISTS (SELECT * FROM MonthlyBatchStats WHERE StatYear = 2025 AND StatMonth = 1)
BEGIN
    INSERT INTO MonthlyBatchStats (StatYear, StatMonth, InspectionBatches, DeliveryBatches, CreatedBy, Remarks)
    VALUES
    (2025, 1, 165, 158, 'admin', '2025年1月数据'),
    (2025, 2, 142, 136, 'admin', '2025年2月数据'),
    (2025, 3, 178, 169, 'admin', '2025年3月数据'),
    (2025, 4, 156, 149, 'admin', '2025年4月数据'),
    (2025, 5, 189, 182, 'admin', '2025年5月数据'),
    (2025, 6, 173, 167, 'admin', '2025年6月数据'),
    (2025, 7, 0, 0, 'admin', '2025年7月数据(待录入)');

    PRINT '2025年月度批次测试数据插入成功';
END

PRINT '=== 月度批次统计表创建完成 ===';
PRINT '请在数据库中执行此脚本以创建相关表结构';

-- 查询示例
-- SELECT * FROM MonthlyBatchStats ORDER BY StatYear DESC, StatMonth DESC;
