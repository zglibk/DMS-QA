-- =====================================================
-- 仪器管理系统数据表初始化脚本
-- 功能：创建仪器台账、第三方校准检定结果登记等相关表
-- 版本：v2.0
-- 创建日期：2025-09-29
-- 修改说明：
-- 1. 仪器设备表增加管理编号，删除校准日期字段
-- 2. 移除维护记录功能模块
-- 3. 重新设计校准模块为第三方校准结果登记
-- =====================================================

USE [DMS-QA];

PRINT '开始创建仪器管理系统数据表...';

-- =====================================================
-- 1. 仪器设备表 (Instruments)
-- 功能：存储仪器设备的基本信息（仪器台账）
-- =====================================================
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[Instruments]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[Instruments] (
        [ID] INT IDENTITY(1,1) PRIMARY KEY,
        [InstrumentCode] NVARCHAR(50) NOT NULL UNIQUE,     -- 仪器编号
        [ManagementCode] NVARCHAR(50) NOT NULL UNIQUE,     -- 管理编号
        [InstrumentName] NVARCHAR(200) NOT NULL,           -- 仪器名称
        [Model] NVARCHAR(100),                             -- 型号
        [Manufacturer] NVARCHAR(100),                      -- 制造商
        [SerialNumber] NVARCHAR(100),                      -- 序列号
        [Category] NVARCHAR(50),                           -- 仪器类别
        [Specifications] NVARCHAR(1000),                   -- 技术规格
        [PurchaseDate] DATE,                               -- 采购日期
        [PurchasePrice] DECIMAL(12,2),                     -- 采购价格
        [Supplier] NVARCHAR(100),                          -- 供应商
        [Location] NVARCHAR(100),                          -- 存放位置
        [ResponsiblePerson] INT,                           -- 责任人ID
        [DepartmentID] INT,                                -- 所属部门ID
        [Status] NVARCHAR(20) DEFAULT 'normal',            -- 状态：normal/calibration/retired/damaged
        [CalibrationCycle] INT DEFAULT 365,                -- 校准周期(天)
        [WarrantyPeriod] INT,                              -- 保修期(月)
        [WarrantyExpiry] DATE,                             -- 保修到期日
        [UsageInstructions] NVARCHAR(2000),                -- 使用说明
        [SafetyNotes] NVARCHAR(1000),                      -- 安全注意事项
        [Remarks] NVARCHAR(500),                           -- 备注
        [IsActive] BIT DEFAULT 1,                          -- 是否有效
        [CreatedBy] INT NOT NULL,                          -- 创建人
        [CreatedAt] DATETIME DEFAULT GETDATE(),            -- 创建时间
        [UpdatedBy] INT,                                   -- 更新人
        [UpdatedAt] DATETIME DEFAULT GETDATE(),            -- 更新时间
        
        CONSTRAINT FK_Instruments_ResponsiblePerson 
            FOREIGN KEY (ResponsiblePerson) REFERENCES [dbo].[Person](ID),
        CONSTRAINT FK_Instruments_Department 
            FOREIGN KEY (DepartmentID) REFERENCES [dbo].[Department](ID),
        CONSTRAINT FK_Instruments_CreatedBy 
            FOREIGN KEY (CreatedBy) REFERENCES [dbo].[User](ID)
    );
    PRINT '✅ Instruments 表创建成功';
END
ELSE
BEGIN
    PRINT '⚠️ Instruments 表已存在，跳过创建';
END

-- =====================================================
-- 2. 第三方校准检定结果表 (CalibrationResults)
-- 功能：存储第三方校准检定的结果记录
-- =====================================================
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[CalibrationResults]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[CalibrationResults] (
        [ID] INT IDENTITY(1,1) PRIMARY KEY,
        [ResultCode] NVARCHAR(50) NOT NULL UNIQUE,         -- 检定结果编号
        [InstrumentID] INT NOT NULL,                       -- 仪器ID
        [CalibrationDate] DATE NOT NULL,                   -- 校准日期
        [CalibrationAgency] NVARCHAR(100) NOT NULL,        -- 校准机构
        [CertificateNumber] NVARCHAR(100),                 -- 证书编号
        [CalibrationStandard] NVARCHAR(200),               -- 校准标准
        [CalibrationResult] NVARCHAR(20) DEFAULT 'qualified', -- 校准结论：qualified/unqualified/limited
        [ValidityPeriod] INT DEFAULT 365,                  -- 有效期(天)
        [ExpiryDate] DATE,                                 -- 到期日期
        [CalibrationCost] DECIMAL(10,2),                   -- 校准费用
        [CalibrationData] NVARCHAR(MAX),                   -- 校准数据详情
        [Issues] NVARCHAR(1000),                           -- 发现问题
        [Recommendations] NVARCHAR(1000),                  -- 建议
        [Attachments] NVARCHAR(500),                       -- 附件路径（证书扫描件等）
        [Remarks] NVARCHAR(500),                           -- 备注
        [CreatedBy] INT NOT NULL,                          -- 创建人
        [CreatedAt] DATETIME DEFAULT GETDATE(),            -- 创建时间
        [UpdatedBy] INT,                                   -- 更新人
        [UpdatedAt] DATETIME DEFAULT GETDATE(),            -- 更新时间
        
        CONSTRAINT FK_CalibrationResults_Instrument 
            FOREIGN KEY (InstrumentID) REFERENCES [dbo].[Instruments](ID),
        CONSTRAINT FK_CalibrationResults_CreatedBy 
            FOREIGN KEY (CreatedBy) REFERENCES [dbo].[User](ID)
    );
    PRINT '✅ CalibrationResults 表创建成功';
END
ELSE
BEGIN
    PRINT '⚠️ CalibrationResults 表已存在，跳过创建';
END

-- =====================================================
-- 3. 年度校准计划表 (AnnualCalibrationPlan)
-- 功能：存储年度校准计划，用于导出年度检定计划和实施表
-- =====================================================
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[AnnualCalibrationPlan]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[AnnualCalibrationPlan] (
        [ID] INT IDENTITY(1,1) PRIMARY KEY,
        [PlanYear] INT NOT NULL,                           -- 计划年度
        [InstrumentID] INT NOT NULL,                       -- 仪器ID
        [PlannedDate] DATE NOT NULL,                       -- 计划校准日期
        [CalibrationAgency] NVARCHAR(100),                 -- 计划校准机构
        [EstimatedCost] DECIMAL(10,2),                     -- 预估费用
        [Priority] NVARCHAR(20) DEFAULT 'normal',          -- 优先级：high/normal/low
        [Status] NVARCHAR(20) DEFAULT 'planned',           -- 状态：planned/in_progress/completed/cancelled/overdue
        [ActualDate] DATE,                                 -- 实际校准日期
        [ActualCost] DECIMAL(10,2),                        -- 实际费用
        [CalibrationResultID] INT,                         -- 关联的校准结果ID
        [Remarks] NVARCHAR(500),                           -- 备注
        [CreatedBy] INT NOT NULL,                          -- 创建人
        [CreatedAt] DATETIME DEFAULT GETDATE(),            -- 创建时间
        [UpdatedBy] INT,                                   -- 更新人
        [UpdatedAt] DATETIME DEFAULT GETDATE(),            -- 更新时间
        
        CONSTRAINT FK_AnnualCalibrationPlan_Instrument 
            FOREIGN KEY (InstrumentID) REFERENCES [dbo].[Instruments](ID),
        CONSTRAINT FK_AnnualCalibrationPlan_CalibrationResult 
            FOREIGN KEY (CalibrationResultID) REFERENCES [dbo].[CalibrationResults](ID),
        CONSTRAINT FK_AnnualCalibrationPlan_CreatedBy 
            FOREIGN KEY (CreatedBy) REFERENCES [dbo].[User](ID),
        CONSTRAINT UK_AnnualCalibrationPlan_Year_Instrument 
            UNIQUE (PlanYear, InstrumentID)
    );
    PRINT '✅ AnnualCalibrationPlan 表创建成功';
END
ELSE
BEGIN
    PRINT '⚠️ AnnualCalibrationPlan 表已存在，跳过创建';
END

-- =====================================================
-- 4. 仪器类别表 (InstrumentCategories)
-- 功能：存储仪器设备的分类信息
-- =====================================================
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[InstrumentCategories]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[InstrumentCategories] (
        [ID] INT IDENTITY(1,1) PRIMARY KEY,
        [CategoryCode] NVARCHAR(20) NOT NULL UNIQUE,       -- 类别编码
        [CategoryName] NVARCHAR(100) NOT NULL,             -- 类别名称
        [ParentID] INT NULL,                               -- 父类别ID
        [Description] NVARCHAR(500),                       -- 描述
        [SortOrder] INT DEFAULT 0,                         -- 排序
        [IsActive] BIT DEFAULT 1,                          -- 是否有效
        [CreatedAt] DATETIME DEFAULT GETDATE(),            -- 创建时间
        [UpdatedAt] DATETIME DEFAULT GETDATE(),            -- 更新时间
        
        CONSTRAINT FK_InstrumentCategories_Parent 
            FOREIGN KEY (ParentID) REFERENCES [dbo].[InstrumentCategories](ID)
    );
    PRINT '✅ InstrumentCategories 表创建成功';
END
ELSE
BEGIN
    PRINT '⚠️ InstrumentCategories 表已存在，跳过创建';
END

-- =====================================================
-- 创建索引以提高查询性能
-- =====================================================
PRINT '开始创建索引...';

-- Instruments 表索引
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_Instruments_InstrumentCode')
    CREATE NONCLUSTERED INDEX [IX_Instruments_InstrumentCode] ON [dbo].[Instruments] ([InstrumentCode]);

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_Instruments_ManagementCode')
    CREATE NONCLUSTERED INDEX [IX_Instruments_ManagementCode] ON [dbo].[Instruments] ([ManagementCode]);

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_Instruments_Status')
    CREATE NONCLUSTERED INDEX [IX_Instruments_Status] ON [dbo].[Instruments] ([Status]);

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_Instruments_DepartmentID')
    CREATE NONCLUSTERED INDEX [IX_Instruments_DepartmentID] ON [dbo].[Instruments] ([DepartmentID]);

-- CalibrationResults 表索引
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_CalibrationResults_InstrumentID')
    CREATE NONCLUSTERED INDEX [IX_CalibrationResults_InstrumentID] ON [dbo].[CalibrationResults] ([InstrumentID]);

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_CalibrationResults_CalibrationDate')
    CREATE NONCLUSTERED INDEX [IX_CalibrationResults_CalibrationDate] ON [dbo].[CalibrationResults] ([CalibrationDate]);

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_CalibrationResults_ExpiryDate')
    CREATE NONCLUSTERED INDEX [IX_CalibrationResults_ExpiryDate] ON [dbo].[CalibrationResults] ([ExpiryDate]);

-- AnnualCalibrationPlan 表索引
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_AnnualCalibrationPlan_PlanYear')
    CREATE NONCLUSTERED INDEX [IX_AnnualCalibrationPlan_PlanYear] ON [dbo].[AnnualCalibrationPlan] ([PlanYear]);

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_AnnualCalibrationPlan_PlannedDate')
    CREATE NONCLUSTERED INDEX [IX_AnnualCalibrationPlan_PlannedDate] ON [dbo].[AnnualCalibrationPlan] ([PlannedDate]);

PRINT '✅ 索引创建完成';

-- =====================================================
-- 插入初始数据
-- =====================================================
PRINT '开始插入初始数据...';

-- 插入仪器类别初始数据
IF NOT EXISTS (SELECT * FROM [dbo].[InstrumentCategories] WHERE CategoryCode = 'MEASURE')
BEGIN
    INSERT INTO [dbo].[InstrumentCategories] (CategoryCode, CategoryName, Description, SortOrder)
    VALUES 
    ('MEASURE', '测量仪器', '用于各种物理量测量的仪器设备', 1),
    ('TEST', '测试设备', '用于材料和产品测试的设备', 2),
    ('ANALYSIS', '分析仪器', '用于成分分析和检测的仪器', 3),
    ('CALIBRATION', '校准设备', '用于校准其他仪器的标准设备', 4),
    ('AUXILIARY', '辅助设备', '实验室辅助设备和工具', 5);
    
    PRINT '✅ 仪器类别初始数据插入完成';
END
ELSE
BEGIN
    PRINT '⚠️ 仪器类别数据已存在，跳过插入';
END

PRINT '🎉 仪器管理系统数据表创建完成！';
PRINT '';
PRINT '已创建的表：';
PRINT '1. Instruments - 仪器设备表（仪器台账）';
PRINT '2. CalibrationResults - 第三方校准检定结果表';
PRINT '3. AnnualCalibrationPlan - 年度校准计划表';
PRINT '4. InstrumentCategories - 仪器类别表';
PRINT '';
PRINT '功能特点：';
PRINT '- 仪器设备表增加了管理编号字段';
PRINT '- 移除了维护记录功能模块';
PRINT '- 重新设计为第三方校准结果登记';
PRINT '- 支持年度检定计划和实施表导出';
PRINT '';
PRINT '请运行此脚本来初始化仪器管理系统的数据库结构。';