-- 更新存储过程以支持publishing_exceptions表
-- 添加对出版异常记录的考核记录生成

-- 删除现有存储过程
IF EXISTS (SELECT * FROM sys.objects WHERE type = 'P' AND name = 'GenerateAssessmentRecords')
BEGIN
    DROP PROCEDURE GenerateAssessmentRecords;
    PRINT '已删除现有存储过程 GenerateAssessmentRecords';
END
GO

-- 创建新的存储过程，支持返工记录、投诉记录和出版异常记录
CREATE PROCEDURE GenerateAssessmentRecords
AS
BEGIN
    SET NOCOUNT ON;
    
    DECLARE @GeneratedCount INT = 0;
    DECLARE @ErrorMessage NVARCHAR(4000);
    
    BEGIN TRY
        -- 开始事务
        BEGIN TRANSACTION;
        
        PRINT '开始生成考核记录...';
        
        -- 1. 处理返工记录 (rework_records)
        PRINT '正在处理返工记录...';
        INSERT INTO AssessmentRecords (
            PersonName,
            PersonType,
            SourceType,
            AssessmentAmount,
            AssessmentDate,
            ComplaintID,
            Status,
            CreatedAt
        )
        SELECT 
            r.ResponsiblePerson,
            'MainPerson' as PersonType,
            'rework' as SourceType,
            r.Amount,
            r.RecordDate,
            r.Id as ComplaintID,
            'pending' as Status,
            GETDATE() as CreatedAt
        FROM rework_records r
        WHERE r.ResponsiblePerson IS NOT NULL 
            AND r.Amount IS NOT NULL
            AND r.Amount > 0
            AND NOT EXISTS (
                SELECT 1 FROM AssessmentRecords ar 
                WHERE ar.SourceType = 'rework' 
                    AND ar.ComplaintID = r.Id
            );
        
        SET @GeneratedCount = @GeneratedCount + @@ROWCOUNT;
        PRINT '返工记录处理完成，生成 ' + CAST(@@ROWCOUNT AS NVARCHAR(10)) + ' 条考核记录';
        
        -- 2. 处理投诉记录 (complaint_records)
        PRINT '正在处理投诉记录...';
        INSERT INTO AssessmentRecords (
            PersonName,
            PersonType,
            SourceType,
            AssessmentAmount,
            AssessmentDate,
            ComplaintID,
            Status,
            CreatedAt
        )
        SELECT 
            c.ResponsiblePerson,
            'MainPerson' as PersonType,
            'complaint' as SourceType,
            c.Amount,
            c.RecordDate,
            c.Id as ComplaintID,
            'pending' as Status,
            GETDATE() as CreatedAt
        FROM complaint_records c
        WHERE c.ResponsiblePerson IS NOT NULL 
            AND c.Amount IS NOT NULL
            AND c.Amount > 0
            AND NOT EXISTS (
                SELECT 1 FROM AssessmentRecords ar 
                WHERE ar.SourceType = 'complaint' 
                    AND ar.ComplaintID = c.Id
            );
        
        SET @GeneratedCount = @GeneratedCount + @@ROWCOUNT;
        PRINT '投诉记录处理完成，生成 ' + CAST(@@ROWCOUNT AS NVARCHAR(10)) + ' 条考核记录';
        
        -- 3. 处理出版异常记录 (publishing_exceptions)
        PRINT '正在处理出版异常记录...';
        INSERT INTO AssessmentRecords (
            PersonName,
            PersonType,
            SourceType,
            AssessmentAmount,
            AssessmentDate,
            ComplaintID,
            Status,
            CreatedAt
        )
        SELECT 
            pe.responsible_person,
            'MainPerson' as PersonType,
            'exception' as SourceType,
            pe.amount,
            COALESCE(pe.registration_date, pe.publishing_date, pe.created_date) as AssessmentDate,
            pe.id as ComplaintID,
            'pending' as Status,
            GETDATE() as CreatedAt
        FROM publishing_exceptions pe
        WHERE pe.responsible_person IS NOT NULL 
            AND pe.amount IS NOT NULL
            AND pe.amount > 0
            AND (pe.isDeleted = 0 OR pe.isDeleted IS NULL)
            AND NOT EXISTS (
                SELECT 1 FROM AssessmentRecords ar 
                WHERE ar.SourceType = 'exception' 
                    AND ar.ComplaintID = pe.id
            );
        
        SET @GeneratedCount = @GeneratedCount + @@ROWCOUNT;
        PRINT '出版异常记录处理完成，生成 ' + CAST(@@ROWCOUNT AS NVARCHAR(10)) + ' 条考核记录';
        
        -- 提交事务
        COMMIT TRANSACTION;
        
        PRINT '所有记录处理完成！总共生成 ' + CAST(@GeneratedCount AS NVARCHAR(10)) + ' 条考核记录';
        
    END TRY
    BEGIN CATCH
        -- 回滚事务
        IF @@TRANCOUNT > 0
            ROLLBACK TRANSACTION;
            
        SET @ErrorMessage = ERROR_MESSAGE();
        PRINT '生成考核记录时发生错误: ' + @ErrorMessage;
        RAISERROR(@ErrorMessage, 16, 1);
    END CATCH
END
GO

PRINT '存储过程 GenerateAssessmentRecords 创建完成，现在支持返工记录、投诉记录和出版异常记录';