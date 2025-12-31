
-- =====================================================
-- 来料检验管理相关表
-- =====================================================

-- 1. 检验项目表 (InspectionItems)
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[InspectionItems]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[InspectionItems] (
        [ID] INT IDENTITY(1,1) PRIMARY KEY,
        [ItemName] NVARCHAR(100) NOT NULL,
        [Description] NVARCHAR(500),
        [SortOrder] INT DEFAULT 0,
        [DataType] NVARCHAR(50) DEFAULT 'Normal', -- Normal, Dimension, Force, etc.
        [InspectionStandard] NVARCHAR(200),
        [AcceptanceCriteria] NVARCHAR(200),
        [MaterialCategory] NVARCHAR(50), -- Added field
        [Status] BIT DEFAULT 1,
        [CreatedBy] NVARCHAR(50),
        [CreatedAt] DATETIME DEFAULT GETDATE(),
        [UpdatedBy] NVARCHAR(50),
        [UpdatedAt] DATETIME DEFAULT GETDATE()
    );
    PRINT '✅ InspectionItems 表创建成功';
END
ELSE
BEGIN
    PRINT '⚠️ InspectionItems 表已存在，跳过创建';
END

-- 2. 来料检验报告表 (IncomingInspectionReports)
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[IncomingInspectionReports]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[IncomingInspectionReports] (
        [ID] INT IDENTITY(1,1) PRIMARY KEY,
        [ReportNo] NVARCHAR(50) NOT NULL UNIQUE,
        [Supplier] NVARCHAR(200),
        [ProductName] NVARCHAR(200),
        [Specification] NVARCHAR(200),
        [Quantity] DECIMAL(18, 2),
        [PackageCount] INT, -- Added field
        [ArrivalDate] DATE,
        [SamplingQuantity] INT,
        [InspectionBasis] NVARCHAR(200),
        [PONumber] NVARCHAR(50),
        [Type] NVARCHAR(50),
        [TestImages] NVARCHAR(MAX),
        [ReportResult] NVARCHAR(50), -- 合格, 不合格, 特采
        [ReportRemark] NVARCHAR(1000),
        [Inspector] NVARCHAR(50),
        [InspectionDate] DATE,
        [Auditor] NVARCHAR(50),
        [AuditDate] DATE,
        [Status] NVARCHAR(50) DEFAULT 'Saved', -- Saved, Submitted, Approved, Rejected
        [CreatedBy] NVARCHAR(50),
        [CreatedAt] DATETIME DEFAULT GETDATE(),
        [UpdatedBy] NVARCHAR(50),
        [UpdatedAt] DATETIME,
        [IsDeleted] BIT DEFAULT 0
    );
    PRINT '✅ IncomingInspectionReports 表创建成功';
END
ELSE
BEGIN
    PRINT '⚠️ IncomingInspectionReports 表已存在，跳过创建';
END

-- 3. 检验报告明细表 (IncomingInspectionDetails)
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[IncomingInspectionDetails]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[IncomingInspectionDetails] (
        [ID] INT IDENTITY(1,1) PRIMARY KEY,
        [ReportID] INT NOT NULL,
        [ItemID] INT,
        [ItemName] NVARCHAR(100),
        [InspectionContent] NVARCHAR(500),
        [SingleItemJudgment] NVARCHAR(50), -- 合格, 不合格
        [ResultJudgment] NVARCHAR(200), -- 具体数值或文本
        [ItemRemark] NVARCHAR(500),
        [SampleValues] NVARCHAR(MAX), -- JSON array of values
        [Unit] NVARCHAR(50),
        [SubMethod] NVARCHAR(50), -- For dimensions: LW, Diameter
        [InspectionStandard] NVARCHAR(200),
        [AcceptanceCriteria] NVARCHAR(200),
        
        CONSTRAINT FK_IncomingInspectionDetails_Report 
            FOREIGN KEY (ReportID) REFERENCES [dbo].[IncomingInspectionReports](ID) ON DELETE CASCADE
    );
    PRINT '✅ IncomingInspectionDetails 表创建成功';
END
ELSE
BEGIN
    PRINT '⚠️ IncomingInspectionDetails 表已存在，跳过创建';
END
