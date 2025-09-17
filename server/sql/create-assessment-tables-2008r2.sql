-- 质量考核管理系统数据表设计 (SQL Server 2008R2 兼容版本)
-- 基于ComplaintRegister、ProductionReworkRegister、publishing_exceptions三个表的考核数据分析结果

-- 1. 考核记录表 (AssessmentRecords)
-- 存储从ComplaintRegister、ProductionReworkRegister、publishing_exceptions表生成的考核记录
CREATE TABLE [dbo].[AssessmentRecords] (
    [ID] INT IDENTITY(1,1) PRIMARY KEY,
    [ComplaintID] INT NOT NULL,                    -- 关联源表的ID（ComplaintRegister.ID/ProductionReworkRegister.ID/publishing_exceptions.id）
    [SourceType] NVARCHAR(20) NOT NULL,            -- 来源类型：complaint/rework/exception
    [PersonName] NVARCHAR(50) NOT NULL,            -- 被考核人员姓名
    [PersonType] NVARCHAR(20) NOT NULL,            -- 人员类型：MainPerson/SecondPerson/Manager
    [AssessmentAmount] DECIMAL(10,2) NOT NULL,     -- 考核金额
    [AssessmentDate] DATE NOT NULL,                -- 考核日期（投诉/返工/异常发生日期）
    [AssessmentMonth] AS (YEAR(AssessmentDate) * 100 + MONTH(AssessmentDate)), -- 考核月份（格式：202501）
    [Status] NVARCHAR(20) DEFAULT 'pending',       -- 状态：pending/improving/returned/confirmed
    [IsReturned] BIT DEFAULT 0,                    -- 是否已返还
    [ReturnDate] DATE NULL,                        -- 返还日期
    [ReturnAmount] DECIMAL(10,2) NULL,             -- 返还金额
    [ReturnReason] NVARCHAR(200) NULL,             -- 返还原因
    [ImprovementStartDate] DATE NULL,              -- 改善期开始日期
    [ImprovementEndDate] DATE NULL,                -- 改善期结束日期
    [CreatedAt] DATETIME DEFAULT GETDATE(),        -- 创建时间
    [UpdatedAt] DATETIME DEFAULT GETDATE(),        -- 更新时间
    [CreatedBy] NVARCHAR(50) NULL,                 -- 创建人
    [UpdatedBy] NVARCHAR(50) NULL,                 -- 更新人
    [Remarks] NVARCHAR(500) NULL,                  -- 备注
    
    -- 检查约束
    CONSTRAINT CK_AssessmentRecords_SourceType 
        CHECK (SourceType IN ('complaint', 'rework', 'exception')),
    CONSTRAINT CK_AssessmentRecords_Status 
        CHECK (Status IN ('pending', 'improving', 'returned', 'confirmed'))
);

-- 创建索引（SQL Server 2008R2 兼容语法）
CREATE INDEX IX_AssessmentRecords_ComplaintID ON AssessmentRecords (ComplaintID);
CREATE INDEX IX_AssessmentRecords_PersonName ON AssessmentRecords (PersonName);
CREATE INDEX IX_AssessmentRecords_AssessmentMonth ON AssessmentRecords (AssessmentMonth);
CREATE INDEX IX_AssessmentRecords_Status ON AssessmentRecords (Status);
CREATE INDEX IX_AssessmentRecords_IsReturned ON AssessmentRecords (IsReturned);

GO

-- 2. 改善期跟踪表 (ImprovementTracking)
-- 跟踪每个人员的改善期状态
CREATE TABLE [dbo].[ImprovementTracking] (
    [ID] INT IDENTITY(1,1) PRIMARY KEY,
    [PersonName] NVARCHAR(50) NOT NULL,            -- 人员姓名
    [PersonType] NVARCHAR(20) NOT NULL,            -- 人员类型
    [AssessmentRecordID] INT NOT NULL,             -- 关联的考核记录ID
    [ImprovementStartMonth] INT NOT NULL,          -- 改善期开始月份（格式：202501）
    [ImprovementEndMonth] INT NOT NULL,            -- 改善期结束月份（格式：202504）
    [MonthsWithoutAssessment] INT DEFAULT 0,       -- 连续无考核月数
    [IsEligibleForReturn] BIT DEFAULT 0,           -- 是否符合返还条件
    [ReturnProcessed] BIT DEFAULT 0,               -- 是否已处理返还
    [CreatedAt] DATETIME DEFAULT GETDATE(),
    [UpdatedAt] DATETIME DEFAULT GETDATE(),
    
    -- 外键约束
    CONSTRAINT FK_ImprovementTracking_AssessmentRecords 
        FOREIGN KEY (AssessmentRecordID) REFERENCES AssessmentRecords(ID)
);

-- 创建索引
CREATE INDEX IX_ImprovementTracking_PersonName ON ImprovementTracking (PersonName);
CREATE INDEX IX_ImprovementTracking_ImprovementMonth ON ImprovementTracking (ImprovementStartMonth, ImprovementEndMonth);
CREATE INDEX IX_ImprovementTracking_IsEligibleForReturn ON ImprovementTracking (IsEligibleForReturn);

GO

-- 3. 考核配置表 (AssessmentConfig)
-- 存储考核相关的配置参数
CREATE TABLE [dbo].[AssessmentConfig] (
    [ID] INT IDENTITY(1,1) PRIMARY KEY,
    [ConfigKey] NVARCHAR(50) NOT NULL UNIQUE,      -- 配置键
    [ConfigValue] NVARCHAR(200) NOT NULL,          -- 配置值
    [Description] NVARCHAR(200) NULL,              -- 配置描述
    [IsActive] BIT DEFAULT 1,                      -- 是否启用
    [CreatedAt] DATETIME DEFAULT GETDATE(),
    [UpdatedAt] DATETIME DEFAULT GETDATE()
);

-- 插入默认配置
INSERT INTO [dbo].[AssessmentConfig] ([ConfigKey], [ConfigValue], [Description]) VALUES
('IMPROVEMENT_PERIOD_MONTHS', '3', '改善期月数（默认3个月）'),
('MANAGER_EXEMPT_FROM_RETURN', '1', '管理者是否免于返还（1=是，0=否）'),
('AUTO_GENERATE_ASSESSMENT', '1', '是否自动生成考核记录（1=是，0=否）'),
('RETURN_FULL_AMOUNT', '1', '是否返还全额（1=全额，0=部分）');

GO

-- 4. 考核历史表 (AssessmentHistory)
-- 记录考核记录的变更历史
CREATE TABLE [dbo].[AssessmentHistory] (
    [ID] INT IDENTITY(1,1) PRIMARY KEY,
    [AssessmentRecordID] INT NOT NULL,             -- 关联的考核记录ID
    [Action] NVARCHAR(50) NOT NULL,                -- 操作类型：CREATE/UPDATE/RETURN/CANCEL
    [OldValue] NVARCHAR(MAX) NULL,                 -- 变更前的值（JSON格式）
    [NewValue] NVARCHAR(MAX) NULL,                 -- 变更后的值（JSON格式）
    [OperatorName] NVARCHAR(50) NULL,              -- 操作人
    [OperationTime] DATETIME DEFAULT GETDATE(),    -- 操作时间
    [Remarks] NVARCHAR(500) NULL,                  -- 备注
    
    -- 外键约束
    CONSTRAINT FK_AssessmentHistory_AssessmentRecords 
        FOREIGN KEY (AssessmentRecordID) REFERENCES AssessmentRecords(ID)
);

-- 创建索引
CREATE INDEX IX_AssessmentHistory_AssessmentRecordID ON AssessmentHistory (AssessmentRecordID);
CREATE INDEX IX_AssessmentHistory_Action ON AssessmentHistory (Action);
CREATE INDEX IX_AssessmentHistory_OperationTime ON AssessmentHistory (OperationTime);

GO

-- 5. 创建视图：考核统计视图
CREATE VIEW [dbo].[V_AssessmentStatistics] AS
SELECT 
    PersonName,
    PersonType,
    YEAR(AssessmentDate) as AssessmentYear,
    MONTH(AssessmentDate) as AssessmentMonth,
    COUNT(*) as AssessmentCount,
    SUM(AssessmentAmount) as TotalAssessmentAmount,
    SUM(CASE WHEN IsReturned = 1 THEN ReturnAmount ELSE 0 END) as TotalReturnAmount,
    COUNT(CASE WHEN IsReturned = 1 THEN 1 END) as ReturnCount
FROM AssessmentRecords
WHERE Status = 'Active'
GROUP BY PersonName, PersonType, YEAR(AssessmentDate), MONTH(AssessmentDate);

GO

-- 6. 创建存储过程：生成考核记录
CREATE PROCEDURE [dbo].[SP_GenerateAssessmentRecords]
    @StartDate DATE = NULL,
    @EndDate DATE = NULL
AS
BEGIN
    SET NOCOUNT ON;
    
    -- 如果没有指定日期范围，默认处理当月数据
    -- SQL Server 2008R2 兼容的日期处理
    IF @StartDate IS NULL 
        SET @StartDate = CONVERT(DATE, CONVERT(VARCHAR(7), GETDATE(), 120) + '-01');
    IF @EndDate IS NULL 
    BEGIN
        DECLARE @LastDay INT;
        SET @LastDay = DAY(DATEADD(DAY, -1, DATEADD(MONTH, 1, CONVERT(DATE, CONVERT(VARCHAR(7), GETDATE(), 120) + '-01'))));
        SET @EndDate = CONVERT(DATE, CONVERT(VARCHAR(7), GETDATE(), 120) + '-' + CONVERT(VARCHAR(2), @LastDay));
    END
    
    -- 生成主责人考核记录
    INSERT INTO AssessmentRecords (ComplaintID, PersonName, PersonType, AssessmentAmount, AssessmentDate)
    SELECT 
        ID,
        MainPerson,
        'MainPerson',
        MainPersonAssessment,
        Date
    FROM ComplaintRegister
    WHERE Date BETWEEN @StartDate AND @EndDate
        AND MainPerson IS NOT NULL 
        AND MainPersonAssessment IS NOT NULL 
        AND MainPersonAssessment > 0
        AND NOT EXISTS (
            SELECT 1 FROM AssessmentRecords 
            WHERE ComplaintID = ComplaintRegister.ID 
                AND PersonType = 'MainPerson'
        );
    
    -- 生成次责人考核记录
    INSERT INTO AssessmentRecords (ComplaintID, PersonName, PersonType, AssessmentAmount, AssessmentDate)
    SELECT 
        ID,
        SecondPerson,
        'SecondPerson',
        SecondPersonAssessment,
        Date
    FROM ComplaintRegister
    WHERE Date BETWEEN @StartDate AND @EndDate
        AND SecondPerson IS NOT NULL 
        AND SecondPersonAssessment IS NOT NULL 
        AND SecondPersonAssessment > 0
        AND NOT EXISTS (
            SELECT 1 FROM AssessmentRecords 
            WHERE ComplaintID = ComplaintRegister.ID 
                AND PersonType = 'SecondPerson'
        );
    
    -- 生成管理者考核记录
    INSERT INTO AssessmentRecords (ComplaintID, PersonName, PersonType, AssessmentAmount, AssessmentDate)
    SELECT 
        ID,
        Manager,
        'Manager',
        ManagerAssessment,
        Date
    FROM ComplaintRegister
    WHERE Date BETWEEN @StartDate AND @EndDate
        AND Manager IS NOT NULL 
        AND ManagerAssessment IS NOT NULL 
        AND ManagerAssessment > 0
        AND NOT EXISTS (
            SELECT 1 FROM AssessmentRecords 
            WHERE ComplaintID = ComplaintRegister.ID 
                AND PersonType = 'Manager'
        );
    
    SELECT @@ROWCOUNT as GeneratedRecords;
END;

GO

-- 7. 创建存储过程：处理改善期返还
CREATE PROCEDURE [dbo].[SP_ProcessImprovementReturns]
    @ProcessMonth INT = NULL  -- 格式：202501
AS
BEGIN
    SET NOCOUNT ON;
    
    -- 如果没有指定月份，使用当前月份
    IF @ProcessMonth IS NULL 
        SET @ProcessMonth = YEAR(GETDATE()) * 100 + MONTH(GETDATE());
    
    -- 查找符合返还条件的考核记录
    -- 条件：考核后连续3个月无新的考核记录（管理者除外）
    WITH EligibleReturns AS (
        SELECT DISTINCT
            ar.ID,
            ar.PersonName,
            ar.PersonType,
            ar.AssessmentAmount,
            ar.AssessmentMonth
        FROM AssessmentRecords ar
        WHERE ar.Status = 'Active'
            AND ar.IsReturned = 0
            AND ar.PersonType != 'Manager'  -- 管理者除外
            AND ar.AssessmentMonth <= @ProcessMonth - 4  -- 至少4个月前的考核
            AND NOT EXISTS (
                -- 检查后续3个月是否有新的考核
                SELECT 1 FROM AssessmentRecords ar2
                WHERE ar2.PersonName = ar.PersonName
                    AND ar2.PersonType = ar.PersonType
                    AND ar2.Status = 'Active'
                    AND ar2.AssessmentMonth > ar.AssessmentMonth
                    AND ar2.AssessmentMonth <= ar.AssessmentMonth + 3
            )
    )
    UPDATE AssessmentRecords 
    SET 
        IsReturned = 1,
        ReturnDate = GETDATE(),
        ReturnAmount = AssessmentAmount,
        ReturnReason = '连续3个月改善期无新考核，符合返还条件',
        Status = 'Returned',
        UpdatedAt = GETDATE()
    WHERE ID IN (SELECT ID FROM EligibleReturns);
    
    SELECT @@ROWCOUNT as ProcessedReturns;
END;

GO

-- 8. 创建辅助函数：获取月末日期（替代EOMONTH函数）
CREATE FUNCTION [dbo].[GetMonthEnd](@InputDate DATE)
RETURNS DATE
AS
BEGIN
    RETURN DATEADD(DAY, -1, DATEADD(MONTH, 1, CONVERT(DATE, CONVERT(VARCHAR(7), @InputDate, 120) + '-01')));
END;

GO

-- 9. 创建辅助函数：构造日期（替代DATEFROMPARTS函数）
CREATE FUNCTION [dbo].[CreateDate](@Year INT, @Month INT, @Day INT)
RETURNS DATE
AS
BEGIN
    DECLARE @DateString VARCHAR(10);
    SET @DateString = CONVERT(VARCHAR(4), @Year) + '-' + 
                      RIGHT('0' + CONVERT(VARCHAR(2), @Month), 2) + '-' + 
                      RIGHT('0' + CONVERT(VARCHAR(2), @Day), 2);
    RETURN CONVERT(DATE, @DateString);
END;