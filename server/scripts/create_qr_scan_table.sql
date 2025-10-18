-- =====================================================
-- 二维码扫描数据表创建脚本
-- 功能：创建二维码扫描相关的数据表
-- 版本：v1.0
-- 创建日期：2025-10-17
-- =====================================================

USE [DMS-QA];
GO

PRINT '开始创建二维码扫描数据表...';

-- =====================================================
-- 二维码扫描记录表 (QrScanRecords)
-- 功能：存储二维码扫描的详细记录
-- =====================================================
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[QrScanRecords]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[QrScanRecords] (
        [ID] INT IDENTITY(1,1) PRIMARY KEY,                    -- 主键，自增ID
        [ScanCode] NVARCHAR(100) NOT NULL,                     -- 扫描编号（唯一标识）
        [RawData] NVARCHAR(MAX) NOT NULL,                      -- 原始扫描数据
        [MaterialNames] NVARCHAR(MAX),                         -- 物料名称（JSON格式存储）
        [OrderQuantities] NVARCHAR(MAX),                       -- 订单数量（JSON格式存储）
        [TotalItems] INT DEFAULT 0,                            -- 总物料种类数
        [TotalQuantity] INT DEFAULT 0,                         -- 总数量
        [ScanTime] DATETIME DEFAULT GETDATE(),                 -- 扫描时间
        [ScanUser] NVARCHAR(50),                               -- 扫描用户
        [ScanUserID] INT,                                      -- 扫描用户ID
        [Status] NVARCHAR(20) DEFAULT 'active',                -- 状态：active/deleted
        [Remark] NVARCHAR(500),                                -- 备注信息
        [CreatedAt] DATETIME DEFAULT GETDATE(),                -- 创建时间
        [UpdatedAt] DATETIME DEFAULT GETDATE(),                -- 更新时间
        [IsActive] BIT DEFAULT 1,                              -- 是否有效（1=有效，0=无效）
        
        -- 创建索引
        INDEX IX_QrScanRecords_ScanCode (ScanCode),
        INDEX IX_QrScanRecords_ScanTime (ScanTime DESC),
        INDEX IX_QrScanRecords_ScanUser (ScanUser),
        INDEX IX_QrScanRecords_Status (Status)
    );
    
    PRINT '二维码扫描记录表 (QrScanRecords) 创建成功';
END
ELSE
BEGIN
    PRINT '二维码扫描记录表 (QrScanRecords) 已存在，跳过创建';
END

-- =====================================================
-- 二维码扫描物料详情表 (QrScanMaterials)
-- 功能：存储扫描记录中的物料详细信息
-- =====================================================
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[QrScanMaterials]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[QrScanMaterials] (
        [ID] INT IDENTITY(1,1) PRIMARY KEY,                    -- 主键，自增ID
        [ScanRecordID] INT NOT NULL,                           -- 扫描记录ID（外键）
        [MaterialName] NVARCHAR(200) NOT NULL,                 -- 物料名称
        [Quantity] INT NOT NULL DEFAULT 0,                     -- 数量
        [Unit] NVARCHAR(20) DEFAULT '个',                      -- 单位
        [SortOrder] INT DEFAULT 0,                             -- 排序
        [CreatedAt] DATETIME DEFAULT GETDATE(),                -- 创建时间
        
        -- 外键约束
        CONSTRAINT FK_QrScanMaterials_ScanRecord 
            FOREIGN KEY (ScanRecordID) REFERENCES [dbo].[QrScanRecords](ID) ON DELETE CASCADE,
            
        -- 创建索引
        INDEX IX_QrScanMaterials_ScanRecordID (ScanRecordID),
        INDEX IX_QrScanMaterials_MaterialName (MaterialName)
    );
    
    PRINT '二维码扫描物料详情表 (QrScanMaterials) 创建成功';
END
ELSE
BEGIN
    PRINT '二维码扫描物料详情表 (QrScanMaterials) 已存在，跳过创建';
END

-- =====================================================
-- 二维码扫描统计表 (QrScanStats)
-- 功能：存储扫描统计数据，提高查询性能
-- =====================================================
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[QrScanStats]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[QrScanStats] (
        [ID] INT IDENTITY(1,1) PRIMARY KEY,                    -- 主键，自增ID
        [StatDate] DATE NOT NULL,                              -- 统计日期
        [ScanCount] INT DEFAULT 0,                             -- 扫描次数
        [TotalItems] INT DEFAULT 0,                            -- 总物料种类数
        [TotalQuantity] INT DEFAULT 0,                         -- 总数量
        [UniqueUsers] INT DEFAULT 0,                           -- 扫描用户数
        [CreatedAt] DATETIME DEFAULT GETDATE(),                -- 创建时间
        [UpdatedAt] DATETIME DEFAULT GETDATE(),                -- 更新时间
        
        -- 唯一约束
        CONSTRAINT UK_QrScanStats_StatDate UNIQUE (StatDate),
        
        -- 创建索引
        INDEX IX_QrScanStats_StatDate (StatDate DESC)
    );
    
    PRINT '二维码扫描统计表 (QrScanStats) 创建成功';
END
ELSE
BEGIN
    PRINT '二维码扫描统计表 (QrScanStats) 已存在，跳过创建';
END

PRINT '二维码扫描数据表创建完成！';

-- =====================================================
-- 插入测试数据（可选）
-- =====================================================
/*
-- 插入测试扫描记录
INSERT INTO [dbo].[QrScanRecords] (
    [ScanCode], [RawData], [MaterialNames], [OrderQuantities], 
    [TotalItems], [TotalQuantity], [ScanUser], [ScanUserID]
) VALUES (
    'QR20250127001',
    '物料名称：产品1+产品2+产品3\n订单数：10+20+30',
    '["产品1","产品2","产品3"]',
    '[10,20,30]',
    3,
    60,
    'admin',
    1
);

-- 插入对应的物料详情
INSERT INTO [dbo].[QrScanMaterials] ([ScanRecordID], [MaterialName], [Quantity], [SortOrder])
VALUES 
    (1, '产品1', 10, 1),
    (1, '产品2', 20, 2),
    (1, '产品3', 30, 3);

-- 插入统计数据
INSERT INTO [dbo].[QrScanStats] ([StatDate], [ScanCount], [TotalItems], [TotalQuantity], [UniqueUsers])
VALUES (CAST(GETDATE() AS DATE), 1, 3, 60, 1);

PRINT '测试数据插入完成！';
*/