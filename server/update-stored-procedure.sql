-- 修复SP_GenerateAssessmentRecords存储过程，添加对生产返工和异常记录的支持

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
        -- 生成主责人考核记录
        INSERT INTO AssessmentRecords (ComplaintID, PersonName, PersonType, AssessmentAmount, AssessmentDate, SourceType)
        SELECT
            ID,
            MainPerson,
            'MainPerson',
            MainPersonAssessment,
            Date,
            'rework'
        FROM ProductionReworkRegister
        WHERE Date BETWEEN @StartDate AND @EndDate 
            AND MainPerson IS NOT NULL
            AND MainPersonAssessment IS NOT NULL   
            AND MainPersonAssessment > 0
            AND NOT EXISTS (
                SELECT 1 FROM AssessmentRecords    
                WHERE ComplaintID = ProductionReworkRegister.ID
                    AND PersonType = 'MainPerson'
                    AND SourceType = 'rework'
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
            'rework'
        FROM ProductionReworkRegister
        WHERE Date BETWEEN @StartDate AND @EndDate 
            AND SecondPerson IS NOT NULL
            AND SecondPersonAssessment IS NOT NULL 
            AND SecondPersonAssessment > 0
            AND NOT EXISTS (
                SELECT 1 FROM AssessmentRecords    
                WHERE ComplaintID = ProductionReworkRegister.ID
                    AND PersonType = 'SecondPerson'
                    AND SourceType = 'rework'
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
            'rework'
        FROM ProductionReworkRegister
        WHERE Date BETWEEN @StartDate AND @EndDate 
            AND Manager IS NOT NULL
            AND ManagerAssessment IS NOT NULL      
            AND ManagerAssessment > 0
            AND NOT EXISTS (
                SELECT 1 FROM AssessmentRecords    
                WHERE ComplaintID = ProductionReworkRegister.ID
                    AND PersonType = 'Manager'
                    AND SourceType = 'rework'
            );
        
        SET @GeneratedCount = @GeneratedCount + @@ROWCOUNT;
    END

    -- 3. 生成异常记录的考核记录
    -- 检查publishing_exceptions表是否存在并有数据
    IF EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'publishing_exceptions')
    BEGIN
        -- 生成主责人考核记录
        INSERT INTO AssessmentRecords (ComplaintID, PersonName, PersonType, AssessmentAmount, AssessmentDate, SourceType)
        SELECT
            id,
            main_person,
            'MainPerson',
            main_person_assessment,
            created_at,
            'exception'
        FROM publishing_exceptions
        WHERE created_at BETWEEN @StartDate AND @EndDate 
            AND main_person IS NOT NULL
            AND main_person_assessment IS NOT NULL   
            AND main_person_assessment > 0
            AND NOT EXISTS (
                SELECT 1 FROM AssessmentRecords    
                WHERE ComplaintID = publishing_exceptions.id
                    AND PersonType = 'MainPerson'
                    AND SourceType = 'exception'
            );
        
        SET @GeneratedCount = @GeneratedCount + @@ROWCOUNT;

        -- 生成次责人考核记录
        INSERT INTO AssessmentRecords (ComplaintID, PersonName, PersonType, AssessmentAmount, AssessmentDate, SourceType)
        SELECT
            id,
            second_person,
            'SecondPerson',
            second_person_assessment,
            created_at,
            'exception'
        FROM publishing_exceptions
        WHERE created_at BETWEEN @StartDate AND @EndDate 
            AND second_person IS NOT NULL
            AND second_person_assessment IS NOT NULL 
            AND second_person_assessment > 0
            AND NOT EXISTS (
                SELECT 1 FROM AssessmentRecords    
                WHERE ComplaintID = publishing_exceptions.id
                    AND PersonType = 'SecondPerson'
                    AND SourceType = 'exception'
            );
        
        SET @GeneratedCount = @GeneratedCount + @@ROWCOUNT;

        -- 生成管理者考核记录
        INSERT INTO AssessmentRecords (ComplaintID, PersonName, PersonType, AssessmentAmount, AssessmentDate, SourceType)
        SELECT
            id,
            manager,
            'Manager',
            manager_assessment,
            created_at,
            'exception'
        FROM publishing_exceptions
        WHERE created_at BETWEEN @StartDate AND @EndDate 
            AND manager IS NOT NULL
            AND manager_assessment IS NOT NULL      
            AND manager_assessment > 0
            AND NOT EXISTS (
                SELECT 1 FROM AssessmentRecords    
                WHERE ComplaintID = publishing_exceptions.id
                    AND PersonType = 'Manager'
                    AND SourceType = 'exception'
            );
        
        SET @GeneratedCount = @GeneratedCount + @@ROWCOUNT;
    END

    -- 返回生成的记录数
    SELECT @GeneratedCount as GeneratedCount;
END;
GO