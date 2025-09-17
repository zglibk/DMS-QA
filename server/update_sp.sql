ALTER PROCEDURE [dbo].[SP_GenerateAssessmentRecords]
    @StartDate DATE,
    @EndDate DATE,
    @GeneratedCount INT OUTPUT
AS
BEGIN
    SET NOCOUNT ON;
    SET @GeneratedCount = 0;

    -- 1. 生成投诉记录的考核记录
    -- 生成主责人考核记录
    INSERT INTO AssessmentRecords (ComplaintID, PersonName, PersonType, AssessmentAmount, AssessmentDate, SourceType, Status)
    SELECT
        ID,
        MainPerson,
        'MainPerson',
        MainPersonAssessment,
        Date,
        'complaint',
        'pending'
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

    -- 生成管理者考核记录
    INSERT INTO AssessmentRecords (ComplaintID, PersonName, PersonType, AssessmentAmount, AssessmentDate, SourceType, Status)
    SELECT
        ID,
        Manager,
        'Manager',
        ManagerAssessment,
        Date,
        'complaint',
        'pending'
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
    IF EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'ProductionReworkRegister')
    BEGIN
        INSERT INTO AssessmentRecords (ComplaintID, PersonName, PersonType, AssessmentAmount, AssessmentDate, SourceType, Status)
        SELECT
            ID,
            ResponsiblePerson,
            'MainPerson',
            TotalCost,
            ReworkDate,
            'rework',
            'pending'
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

    -- 3. 生成出版异常记录的考核记录
    IF EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'publishing_exceptions')
    BEGIN
        INSERT INTO AssessmentRecords (ComplaintID, PersonName, PersonType, AssessmentAmount, AssessmentDate, SourceType, Status)
        SELECT
            id,
            responsible_person,
            'MainPerson',
            amount,
            registration_date,
            'exception',
            'pending'
        FROM publishing_exceptions
        WHERE registration_date BETWEEN @StartDate AND @EndDate
            AND responsible_person IS NOT NULL
            AND amount IS NOT NULL
            AND amount > 0
            AND isDeleted = 0
            AND NOT EXISTS (
                SELECT 1 FROM AssessmentRecords
                WHERE ComplaintID = publishing_exceptions.id
                    AND PersonType = 'MainPerson'
                    AND SourceType = 'exception'
            );

        SET @GeneratedCount = @GeneratedCount + @@ROWCOUNT;
    END
END