-- 修复SP_GenerateAssessmentRecords存储过程，简化版（先支持投诉和返工记录）

-- 删除现有存储过程
IF EXISTS (SELECT * FROM sys.procedures WHERE name = 'SP_GenerateAssessmentRecords')
    DROP PROCEDURE SP_GenerateAssessmentRecords;
GO

-- 创建新的存储过程
CREATE PROCEDURE SP_GenerateAssessmentRecords
    @StartDate DATE,
    @EndDate DATE
AS
BEGIN
    SET NOCOUNT ON;
    
    DECLARE @GeneratedCount INT = 0;
    
    -- 1. 生成投诉记录的考核记录
    -- 生成主责人考核记录
    INSERT INTO AssessmentRecords (ComplaintID, PersonName, PersonType, AssessmentAmount, AssessmentDate, SourceType)
    SELECT
        ID,
        MainPerson,
        'MainPerson',
        MainPersonAssessment,
        Date,
        'complaint'
    FROM ComplaintRegister
    WHERE Date BETWEEN @StartDate AND @EndDate 
        AND MainPerson IS NOT NULL
        AND MainPersonAssessment IS NOT NULL   
        AND MainPersonAssessment > 0
        AND NOT EXISTS (
            SELECT 1 FROM AssessmentRecords    
            WHERE ComplaintID = ComplaintRegister.ID
                AND PersonType = 'MainPerson'
                AND SourceType = 'complaint'
        );
    
    SET @GeneratedCount = @GeneratedCount + @@ROWCOUNT;

    -- 生成次责人考核记录
    INSERT INTO AssessmentRecords (ComplaintID, PersonName, PersonType, AssessmentAmount, AssessmentDate, SourceType)
    SELECT
        ID,
        SecondPerson,
        'SecondPerson',
        SecondPersonAssessment,
        Date,
        'complaint'
    FROM ComplaintRegister
    WHERE Date BETWEEN @StartDate AND @EndDate 
        AND SecondPerson IS NOT NULL
        AND SecondPersonAssessment IS NOT NULL 
        AND SecondPersonAssessment > 0
        AND NOT EXISTS (
            SELECT 1 FROM AssessmentRecords    
            WHERE ComplaintID = ComplaintRegister.ID
                AND PersonType = 'SecondPerson'
                AND SourceType = 'complaint'
        );
    
    SET @GeneratedCount = @GeneratedCount + @@ROWCOUNT;

    -- 生成管理者考核记录
    INSERT INTO AssessmentRecords (ComplaintID, PersonName, PersonType, AssessmentAmount, AssessmentDate, SourceType)
    SELECT
        ID,
        Manager,
        'Manager',
        ManagerAssessment,
        Date,
        'complaint'
    FROM ComplaintRegister
    WHERE Date BETWEEN @StartDate AND @EndDate 
        AND Manager IS NOT NULL
        AND ManagerAssessment IS NOT NULL      
        AND ManagerAssessment > 0
        AND NOT EXISTS (
            SELECT 1 FROM AssessmentRecords    
            WHERE ComplaintID = ComplaintRegister.ID
                AND PersonType = 'Manager'
                AND SourceType = 'complaint'
        );
    
    SET @GeneratedCount = @GeneratedCount + @@ROWCOUNT;

    -- 2. 生成生产返工记录的考核记录
    -- 检查ProductionReworkRegister表是否存在并有数据
    IF EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'ProductionReworkRegister')
    BEGIN
        -- 基于ResponsiblePerson生成主责人考核记录
        INSERT INTO AssessmentRecords (ComplaintID, PersonName, PersonType, AssessmentAmount, AssessmentDate, SourceType)
        SELECT
            ID,
            ResponsiblePerson,
            'MainPerson',
            TotalCost, -- 使用总成本作为考核金额
            ReworkDate,
            'rework'
        FROM ProductionReworkRegister
        WHERE ReworkDate BETWEEN @StartDate AND @EndDate 
            AND ResponsiblePerson IS NOT NULL
            AND TotalCost IS NOT NULL   
            AND TotalCost > 0
            AND NOT EXISTS (
                SELECT 1 FROM AssessmentRecords    
                WHERE ComplaintID = ProductionReworkRegister.ID
                    AND PersonType = 'MainPerson'
                    AND SourceType = 'rework'
            );
        
        SET @GeneratedCount = @GeneratedCount + @@ROWCOUNT;
    END

    -- 返回生成的记录数
    SELECT @GeneratedCount as GeneratedCount;
END;
GO