-- 创建二维码扫描记录表 (QrScanRecords) - 支持 SQL Server 2008R2
-- =====================================================

USE [DMS-QA]
GO

-- 删除已存在的表（如果存在）
IF EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[QrScanMaterials]') AND type in (N'U'))
BEGIN
    DROP TABLE [dbo].[QrScanMaterials];
    PRINT '已删除现有的 QrScanMaterials 表';
END

IF EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[QrScanRecords]') AND type in (N'U'))
BEGIN
    DROP TABLE [dbo].[QrScanRecords];
    PRINT '已删除现有的 QrScanRecords 表';
END

-- 创建二维码扫描记录主表
CREATE TABLE [dbo].[QrScanRecords] (
    [ID] INT IDENTITY(1,1) PRIMARY KEY,                    -- 主键，自增ID
    [ScanCode] NVARCHAR(100) NULL,                         -- 扫描编号（唯一标识）
    [RawData] NVARCHAR(MAX) NOT NULL,                      -- 原始扫描数据
    
    -- 基本订单信息字段
    [CustomerCode] NVARCHAR(100) NULL,                     -- 客户编码
    [CPO] NVARCHAR(100) NULL,                              -- CPO
    [OrderNumber] NVARCHAR(100) NULL,                      -- 订单号
    [WorkOrderNumber] NVARCHAR(100) NULL,                  -- 工单号
    [FactoryOrderNumber] NVARCHAR(100) NULL,               -- 工厂订单号
    
    -- 物料信息字段
    [MaterialNames] NVARCHAR(MAX) NULL,                    -- 物料名称（原始格式）
    [MaterialCodes] NVARCHAR(MAX) NULL,                    -- 物料编码（原始格式）
    [OrderQuantities] NVARCHAR(MAX) NULL,                  -- 订单数量（原始格式）
    
    -- 统计信息字段
    [TotalItems] INT DEFAULT 0,                            -- 总物料种类数（兼容旧字段名）
    [TotalQuantity] INT DEFAULT 0,                         -- 总数量
    [MaterialCount] INT DEFAULT 0,                         -- 物料数量
    
    -- 解析状态字段
    [IsValid] BIT DEFAULT 1,                               -- 解析是否有效
    [ParseError] NVARCHAR(MAX) NULL,                       -- 解析错误信息
    [ParsedAt] DATETIME NULL,                              -- 解析时间
    
    -- 扫描信息字段
    [ScanTime] DATETIME DEFAULT GETDATE(),                 -- 扫描时间
    [ScanUser] NVARCHAR(50) NULL,                          -- 扫描用户名
    [ScanUserID] INT NULL,                                 -- 扫描用户ID
    [UserID] INT NULL,                                     -- 用户ID（兼容字段）
    
    -- 状态和备注字段
    [Status] NVARCHAR(20) DEFAULT 'active',                -- 状态：active/deleted
    [Remark] NVARCHAR(500) NULL,                           -- 备注信息
    
    -- 时间戳字段
    [CreatedAt] DATETIME DEFAULT GETDATE(),                -- 创建时间
    [UpdatedAt] DATETIME DEFAULT GETDATE(),                -- 更新时间
    [IsActive] BIT DEFAULT 1                               -- 是否有效（1=有效，0=无效）
);

-- 创建索引以提高查询性能
CREATE INDEX IX_QrScanRecords_ScanCode ON [dbo].[QrScanRecords] (ScanCode);
CREATE INDEX IX_QrScanRecords_ScanTime ON [dbo].[QrScanRecords] (ScanTime DESC);
CREATE INDEX IX_QrScanRecords_ScanUser ON [dbo].[QrScanRecords] (ScanUser);
CREATE INDEX IX_QrScanRecords_ScanUserID ON [dbo].[QrScanRecords] (ScanUserID);
CREATE INDEX IX_QrScanRecords_UserID ON [dbo].[QrScanRecords] (UserID);
CREATE INDEX IX_QrScanRecords_Status ON [dbo].[QrScanRecords] (Status);
CREATE INDEX IX_QrScanRecords_CustomerCode ON [dbo].[QrScanRecords] (CustomerCode);
CREATE INDEX IX_QrScanRecords_OrderNumber ON [dbo].[QrScanRecords] (OrderNumber);
CREATE INDEX IX_QrScanRecords_WorkOrderNumber ON [dbo].[QrScanRecords] (WorkOrderNumber);
CREATE INDEX IX_QrScanRecords_IsValid ON [dbo].[QrScanRecords] (IsValid);

PRINT '二维码扫描记录表 (QrScanRecords) 创建成功';

-- =====================================================
-- 创建二维码扫描物料详情表 (QrScanMaterials)
-- =====================================================

CREATE TABLE [dbo].[QrScanMaterials] (
    [ID] INT IDENTITY(1,1) PRIMARY KEY,                    -- 主键，自增ID
    [ScanRecordID] INT NOT NULL,                           -- 扫描记录ID（外键）
    [MaterialName] NVARCHAR(200) NOT NULL,                 -- 物料名称
    [MaterialCode] NVARCHAR(100) NULL,                     -- 物料编码
    [Quantity] INT NOT NULL DEFAULT 0,                     -- 数量
    [Unit] NVARCHAR(20) DEFAULT N'个',                     -- 单位
    [SortOrder] INT DEFAULT 0,                             -- 排序
    [CreatedAt] DATETIME DEFAULT GETDATE(),                -- 创建时间
    
    -- 外键约束
    CONSTRAINT FK_QrScanMaterials_ScanRecord 
        FOREIGN KEY (ScanRecordID) REFERENCES [dbo].[QrScanRecords](ID) ON DELETE CASCADE
);

-- 创建索引
CREATE INDEX IX_QrScanMaterials_ScanRecordID ON [dbo].[QrScanMaterials] (ScanRecordID);
CREATE INDEX IX_QrScanMaterials_MaterialName ON [dbo].[QrScanMaterials] (MaterialName);
CREATE INDEX IX_QrScanMaterials_MaterialCode ON [dbo].[QrScanMaterials] (MaterialCode);

PRINT '二维码扫描物料详情表 (QrScanMaterials) 创建成功';

-- =====================================================
-- 创建二维码扫描统计表 (QrScanStats) - 可选
-- =====================================================

IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[QrScanStats]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[QrScanStats] (
        [ID] INT IDENTITY(1,1) PRIMARY KEY,                -- 主键，自增ID
        [StatDate] DATE NOT NULL,                          -- 统计日期
        [ScanCount] INT DEFAULT 0,                         -- 扫描次数
        [TotalItems] INT DEFAULT 0,                        -- 总物料种类数
        [TotalQuantity] INT DEFAULT 0,                     -- 总数量
        [UniqueUsers] INT DEFAULT 0,                       -- 独立用户数
        [CreatedAt] DATETIME DEFAULT GETDATE(),            -- 创建时间
        [UpdatedAt] DATETIME DEFAULT GETDATE(),            -- 更新时间
        
        -- 唯一约束
        CONSTRAINT UK_QrScanStats_StatDate UNIQUE (StatDate)
    );
    
    -- 创建索引
    CREATE INDEX IX_QrScanStats_StatDate ON [dbo].[QrScanStats] (StatDate DESC);
    
    PRINT '二维码扫描统计表 (QrScanStats) 创建成功';
END
ELSE
BEGIN
    PRINT '二维码扫描统计表 (QrScanStats) 已存在，跳过创建';
END

-- =====================================================
-- 插入测试数据（可选）
-- =====================================================

-- 插入一条测试记录
INSERT INTO [dbo].[QrScanRecords] (
    [RawData], 
    [CustomerCode], 
    [CPO], 
    [OrderNumber], 
    [WorkOrderNumber], 
    [FactoryOrderNumber],
    [MaterialNames], 
    [MaterialCodes],
    [OrderQuantities], 
    [TotalQuantity], 
    [MaterialCount],
    [IsValid],
    [ScanUser], 
    [ScanUserID],
    [UserID]
) VALUES (
    N'客户编码：CUST001
CPO：CPO123456
订单号：ORDER789
工单号：WO001
物料编码：MAT001+MAT002+MAT003
物料名称：产品1+产品2+产品3
工厂订单号：FACTORY001
订单数：10+20+30',
    N'CUST001',
    N'CPO123456',
    N'ORDER789',
    N'WO001',
    N'FACTORY001',
    N'产品1+产品2+产品3',
    N'MAT001+MAT002+MAT003',
    N'10+20+30',
    60,
    3,
    1,
    N'测试用户',
    1,
    1
);

-- 获取插入的记录ID
DECLARE @ScanRecordID INT;
SET @ScanRecordID = SCOPE_IDENTITY();

-- 插入对应的物料明细
INSERT INTO [dbo].[QrScanMaterials] ([ScanRecordID], [MaterialName], [MaterialCode], [Quantity], [SortOrder])
VALUES 
    (@ScanRecordID, N'产品1', N'MAT001', 10, 1),
    (@ScanRecordID, N'产品2', N'MAT002', 20, 2),
    (@ScanRecordID, N'产品3', N'MAT003', 30, 3);

PRINT '测试数据插入成功';

-- =====================================================
-- 验证表结构
-- =====================================================

PRINT '=== 表结构验证 ===';
PRINT '主表字段数量: ' + CAST((SELECT COUNT(*) FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[QrScanRecords]')) AS NVARCHAR(10));
PRINT '物料表字段数量: ' + CAST((SELECT COUNT(*) FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[QrScanMaterials]')) AS NVARCHAR(10));
PRINT '测试记录数量: ' + CAST((SELECT COUNT(*) FROM [dbo].[QrScanRecords]) AS NVARCHAR(10));
PRINT '测试物料数量: ' + CAST((SELECT COUNT(*) FROM [dbo].[QrScanMaterials]) AS NVARCHAR(10));

PRINT '=== 数据库表创建完成 ===';