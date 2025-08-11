/*
 * 供应商投诉管理表结构创建脚本
 * 功能：创建供应商投诉相关的数据库表
 * 执行方式：在SQL Server Management Studio中执行此脚本
 */

-- =====================================================
-- 创建供应商投诉表
-- =====================================================
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='SupplierComplaints' AND xtype='U')
BEGIN
    CREATE TABLE [dbo].[SupplierComplaints] (
        [ID] INT IDENTITY(1,1) PRIMARY KEY,
        [ComplaintNo] NVARCHAR(50) NOT NULL UNIQUE,                    -- 投诉编号
        [ComplaintDate] DATETIME NOT NULL DEFAULT GETDATE(),           -- 投诉日期
        [SupplierName] NVARCHAR(200) NOT NULL,                         -- 供应商名称
        [MaterialName] NVARCHAR(200) NOT NULL,                         -- 材料名称
        [ComplaintType] NVARCHAR(50) NOT NULL,                         -- 投诉类型
        [Description] NTEXT NOT NULL,                                  -- 问题描述
        [Quantity] DECIMAL(18,2) DEFAULT 0,                           -- 问题数量
        [UnitPrice] DECIMAL(18,2) DEFAULT 0,                          -- 单价
        [TotalAmount] DECIMAL(18,2) DEFAULT 0,                        -- 总金额
        [UrgencyLevel] NVARCHAR(20) DEFAULT 'medium',                 -- 紧急程度
        [ExpectedSolution] NTEXT,                                      -- 期望解决方案
        [ResponsiblePerson] NVARCHAR(100),                            -- 负责人
        [ProcessStatus] NVARCHAR(50) DEFAULT 'pending',               -- 处理状态
        [ProcessResult] NVARCHAR(50),                                  -- 处理结果
        [SolutionDescription] NTEXT,                                   -- 解决方案描述
        [VerificationResult] NTEXT,                                    -- 验证结果
        [ClaimAmount] DECIMAL(18,2) DEFAULT 0,                        -- 索赔金额
        [ActualLoss] DECIMAL(18,2) DEFAULT 0,                         -- 实际损失
        [CompensationAmount] DECIMAL(18,2) DEFAULT 0,                 -- 赔偿金额
        [ReworkCost] DECIMAL(18,2) DEFAULT 0,                         -- 返工成本
        [ReplacementCost] DECIMAL(18,2) DEFAULT 0,                    -- 更换成本
        [ReturnQuantity] DECIMAL(18,2) DEFAULT 0,                     -- 退货数量
        [ReturnAmount] DECIMAL(18,2) DEFAULT 0,                       -- 退货金额
        [FollowUpActions] NTEXT,                                       -- 后续行动
        [PreventiveMeasures] NTEXT,                                    -- 预防措施
        [SupplierResponse] NTEXT,                                      -- 供应商回复
        [InternalNotes] NTEXT,                                         -- 内部备注
        [AttachmentPaths] NTEXT,                                       -- 附件路径
        [CompletedDate] DATETIME,                                      -- 完成日期
        [ClosedDate] DATETIME,                                         -- 关闭日期
        [Status] INT DEFAULT 1,                                       -- 状态(1:正常, 0:删除)
        [CreatedBy] INT,                                               -- 创建人ID
        [CreatedAt] DATETIME DEFAULT GETDATE(),                       -- 创建时间
        [UpdatedBy] INT,                                               -- 更新人ID
        [UpdatedAt] DATETIME DEFAULT GETDATE(),                       -- 更新时间
        
        -- 外键约束
        CONSTRAINT [FK_SupplierComplaints_CreatedBy] FOREIGN KEY ([CreatedBy]) REFERENCES [Users]([ID]),
        CONSTRAINT [FK_SupplierComplaints_UpdatedBy] FOREIGN KEY ([UpdatedBy]) REFERENCES [Users]([ID])
    )
    
    PRINT '供应商投诉表 SupplierComplaints 创建成功'
END
ELSE
BEGIN
    PRINT '供应商投诉表 SupplierComplaints 已存在'
END
GO

-- =====================================================
-- 创建索引
-- =====================================================

-- 投诉编号索引
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_SupplierComplaints_ComplaintNo')
BEGIN
    CREATE UNIQUE INDEX [IX_SupplierComplaints_ComplaintNo] ON [SupplierComplaints] ([ComplaintNo])
    PRINT '投诉编号索引创建成功'
END

-- 供应商名称索引
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_SupplierComplaints_SupplierName')
BEGIN
    CREATE INDEX [IX_SupplierComplaints_SupplierName] ON [SupplierComplaints] ([SupplierName])
    PRINT '供应商名称索引创建成功'
END

-- 投诉日期索引
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_SupplierComplaints_ComplaintDate')
BEGIN
    CREATE INDEX [IX_SupplierComplaints_ComplaintDate] ON [SupplierComplaints] ([ComplaintDate])
    PRINT '投诉日期索引创建成功'
END

-- 处理状态索引
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_SupplierComplaints_ProcessStatus')
BEGIN
    CREATE INDEX [IX_SupplierComplaints_ProcessStatus] ON [SupplierComplaints] ([ProcessStatus])
    PRINT '处理状态索引创建成功'
END

-- 状态索引
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_SupplierComplaints_Status')
BEGIN
    CREATE INDEX [IX_SupplierComplaints_Status] ON [SupplierComplaints] ([Status])
    PRINT '状态索引创建成功'
END
GO

-- =====================================================
-- 插入测试数据
-- =====================================================

-- 检查是否已有数据
IF NOT EXISTS (SELECT * FROM SupplierComplaints)
BEGIN
    INSERT INTO [SupplierComplaints] (
        [ComplaintNo], [ComplaintDate], [SupplierName], [MaterialName], [ComplaintType],
        [Description], [Quantity], [UnitPrice], [TotalAmount], [UrgencyLevel],
        [ResponsiblePerson], [ProcessStatus], [CreatedBy]
    ) VALUES 
    (
        'SC20250101001', '2025-01-01', '华东材料供应商', '面材A型', '质量问题',
        '收到的面材存在明显的色差问题，影响产品外观质量', 1000.00, 12.50, 12500.00, 'high',
        '张三', 'pending', 1
    ),
    (
        'SC20250102001', '2025-01-02', '江南胶水公司', '环保胶水B型', '交货延迟',
        '原定交货日期为12月30日，实际交货延迟3天，影响生产计划', 500.00, 8.20, 4100.00, 'medium',
        '李四', 'processing', 1
    ),
    (
        'SC20250103001', '2025-01-03', '精密仪器设备厂', '检测设备配件', '规格不符',
        '收到的配件规格与订单要求不符，无法正常安装使用', 10.00, 150.00, 1500.00, 'high',
        '王五', 'pending', 1
    ),
    (
        'SC20250104001', '2025-01-04', '绿色包装材料', '底纸C型', '包装破损',
        '运输过程中包装破损，导致部分材料受潮变质', 200.00, 5.80, 1160.00, 'low',
        '赵六', 'completed', 1
    ),
    (
        'SC20250105001', '2025-01-05', '优质油墨供应商', '环保油墨D型', '质量问题',
        '油墨粘度不符合要求，印刷效果不佳，需要重新调配', 100.00, 25.00, 2500.00, 'medium',
        '钱七', 'processing', 1
    )
    
    PRINT '测试数据插入成功'
END
ELSE
BEGIN
    PRINT '测试数据已存在，跳过插入'
END
GO

-- =====================================================
-- 创建视图（可选）
-- =====================================================

-- 供应商投诉概览视图
IF EXISTS (SELECT * FROM sys.views WHERE name = 'V_SupplierComplaintsOverview')
BEGIN
    DROP VIEW [V_SupplierComplaintsOverview]
END
GO

CREATE VIEW [V_SupplierComplaintsOverview] AS
SELECT 
    sc.ID,
    sc.ComplaintNo,
    sc.ComplaintDate,
    sc.SupplierName,
    sc.MaterialName,
    sc.ComplaintType,
    sc.Description,
    sc.Quantity,
    sc.UnitPrice,
    sc.TotalAmount,
    sc.UrgencyLevel,
    sc.ProcessStatus,
    sc.ProcessResult,
    sc.ResponsiblePerson,
    u1.Username as CreatedByName,
    sc.CreatedAt,
    u2.Username as UpdatedByName,
    sc.UpdatedAt,
    CASE 
        WHEN sc.ProcessStatus = 'pending' THEN '待处理'
        WHEN sc.ProcessStatus = 'processing' THEN '处理中'
        WHEN sc.ProcessStatus = 'completed' THEN '已完成'
        WHEN sc.ProcessStatus = 'closed' THEN '已关闭'
        ELSE '未知状态'
    END as ProcessStatusText,
    CASE 
        WHEN sc.UrgencyLevel = 'low' THEN '低'
        WHEN sc.UrgencyLevel = 'medium' THEN '中'
        WHEN sc.UrgencyLevel = 'high' THEN '高'
        ELSE '未知'
    END as UrgencyLevelText
FROM SupplierComplaints sc
LEFT JOIN Users u1 ON sc.CreatedBy = u1.ID
LEFT JOIN Users u2 ON sc.UpdatedBy = u2.ID
WHERE sc.Status = 1
GO

PRINT '供应商投诉概览视图创建成功'
GO

-- =====================================================
-- 创建存储过程（可选）
-- =====================================================

-- 获取投诉统计信息的存储过程
IF EXISTS (SELECT * FROM sys.procedures WHERE name = 'SP_GetSupplierComplaintStatistics')
BEGIN
    DROP PROCEDURE [SP_GetSupplierComplaintStatistics]
END
GO

CREATE PROCEDURE [SP_GetSupplierComplaintStatistics]
    @StartDate DATETIME = NULL,
    @EndDate DATETIME = NULL
AS
BEGIN
    SET NOCOUNT ON;
    
    -- 如果没有提供日期范围，默认查询最近30天
    IF @StartDate IS NULL
        SET @StartDate = DATEADD(DAY, -30, GETDATE())
    
    IF @EndDate IS NULL
        SET @EndDate = GETDATE()
    
    SELECT 
        COUNT(*) as TotalComplaints,
        SUM(CASE WHEN ProcessStatus = 'pending' THEN 1 ELSE 0 END) as PendingCount,
        SUM(CASE WHEN ProcessStatus = 'processing' THEN 1 ELSE 0 END) as ProcessingCount,
        SUM(CASE WHEN ProcessStatus = 'completed' THEN 1 ELSE 0 END) as CompletedCount,
        SUM(CASE WHEN ProcessStatus = 'closed' THEN 1 ELSE 0 END) as ClosedCount,
        SUM(TotalAmount) as TotalAmount,
        AVG(TotalAmount) as AvgAmount,
        SUM(ClaimAmount) as TotalClaimAmount,
        SUM(ActualLoss) as TotalActualLoss,
        SUM(CompensationAmount) as TotalCompensationAmount
    FROM SupplierComplaints
    WHERE Status = 1 
        AND ComplaintDate BETWEEN @StartDate AND @EndDate
END
GO

PRINT '投诉统计存储过程创建成功'
GO

PRINT '================================================='
PRINT '供应商投诉管理表结构创建完成！'
PRINT '================================================='
PRINT '已创建的对象：'
PRINT '1. 表：SupplierComplaints'
PRINT '2. 索引：投诉编号、供应商名称、投诉日期、处理状态、状态'
PRINT '3. 视图：V_SupplierComplaintsOverview'
PRINT '4. 存储过程：SP_GetSupplierComplaintStatistics'
PRINT '5. 测试数据：5条示例记录'
PRINT '================================================='