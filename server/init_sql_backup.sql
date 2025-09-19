-- 备份：init.sql中原有的SP_GenerateAssessmentRecords存储过程
-- 备份时间：2024年
-- 备份原因：准备更新为修改后的版本

-- 创建生成考核记录的存储过程
IF NOT EXISTS (SELECT * FROM sys.procedures WHERE name = 'SP_GenerateAssessmentRecords')
BEGIN
    EXEC('
    CREATE PROCEDURE [dbo].[SP_GenerateAssessmentRecords]
        @StartDate DATE = NULL,
        @EndDate DATE = NULL
    AS
    BEGIN
        SET NOCOUNT ON;
        
        -- 如果没有指定日期范围，默认处理当月数据
        IF @StartDate IS NULL 
            SET @StartDate = CONVERT(DATE, CONVERT(VARCHAR(7), GETDATE(), 120) + ''-01'');
        IF @EndDate IS NULL 
        BEGIN
            DECLARE @LastDay INT;
            SET @LastDay = DAY(DATEADD(DAY, -1, DATEADD(MONTH, 1, CONVERT(DATE, CONVERT(VARCHAR(7), GETDATE(), 120) + ''-01''))));
            SET @EndDate = CONVERT(DATE, CONVERT(VARCHAR(7), GETDATE(), 120) + ''-'' + CONVERT(VARCHAR(2), @LastDay));
        END
        
        -- 生成主责人考核记录（来源：投诉记录）
        INSERT INTO AssessmentRecords (ComplaintID, PersonName, PersonType, AssessmentAmount, AssessmentDate, SourceType)
        SELECT 
            ID,
            MainPerson,
            ''MainPerson'',
            MainPersonAssessment,
            Date,
            ''complaint''
        FROM ComplaintRegister
        WHERE Date BETWEEN @StartDate AND @EndDate
            AND MainPerson IS NOT NULL 
            AND MainPersonAssessment IS NOT NULL 
            AND MainPersonAssessment > 0
            AND NOT EXISTS (
                SELECT 1 FROM AssessmentRecords 
                WHERE ComplaintID = ComplaintRegister.ID 
                    AND PersonType = ''MainPerson''
                    AND SourceType = ''complaint''
            );
        
        -- 生成次责人考核记录（来源：投诉记录）
        INSERT INTO AssessmentRecords (ComplaintID, PersonName, PersonType, AssessmentAmount, AssessmentDate, SourceType)
        SELECT 
            ID,
            SecondPerson,
            ''SecondPerson'',
            SecondPersonAssessment,
            Date,
            ''complaint''
        FROM ComplaintRegister
        WHERE Date BETWEEN @StartDate AND @EndDate
            AND SecondPerson IS NOT NULL 
            AND SecondPersonAssessment IS NOT NULL 
            AND SecondPersonAssessment > 0
            AND NOT EXISTS (
                SELECT 1 FROM AssessmentRecords 
                WHERE ComplaintID = ComplaintRegister.ID 
                    AND PersonType = ''SecondPerson''
                    AND SourceType = ''complaint''
            );
        
        -- 生成管理者考核记录（来源：投诉记录）
        INSERT INTO AssessmentRecords (ComplaintID, PersonName, PersonType, AssessmentAmount, AssessmentDate, SourceType)
        SELECT 
            ID,
            Manager,
            ''Manager'',
            ManagerAssessment,
            Date,
            ''complaint''
        FROM ComplaintRegister
        WHERE Date BETWEEN @StartDate AND @EndDate
            AND Manager IS NOT NULL 
            AND ManagerAssessment IS NOT NULL 
            AND ManagerAssessment > 0
            AND NOT EXISTS (
                SELECT 1 FROM AssessmentRecords 
                WHERE ComplaintID = ComplaintRegister.ID 
                    AND PersonType = ''Manager''
                    AND SourceType = ''complaint''
            );
        
        SELECT @@ROWCOUNT as GeneratedRecords;
    END
    ');
    
    PRINT '✅ 生成考核记录存储过程 (SP_GenerateAssessmentRecords) 创建成功';
END
ELSE
BEGIN
    PRINT '⚠️ 生成考核记录存储过程 (SP_GenerateAssessmentRecords) 已存在，跳过创建';
END