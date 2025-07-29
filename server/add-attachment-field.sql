-- 检查并添加ProductionReworkRegister表的AttachmentFiles字段

-- 检查AttachmentFiles字段是否存在，如果不存在则添加
IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'ProductionReworkRegister' AND COLUMN_NAME = 'AttachmentFiles')
BEGIN
    ALTER TABLE [dbo].[ProductionReworkRegister] ADD [AttachmentFiles] NVARCHAR(1000) NULL;
    PRINT '已添加 AttachmentFiles 字段到 ProductionReworkRegister 表';
END
ELSE
BEGIN
    PRINT 'AttachmentFiles 字段已存在于 ProductionReworkRegister 表中';
END

-- 验证字段是否添加成功
SELECT 
    COLUMN_NAME,
    DATA_TYPE,
    CHARACTER_MAXIMUM_LENGTH,
    IS_NULLABLE
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_NAME = 'ProductionReworkRegister' 
    AND COLUMN_NAME = 'AttachmentFiles';

PRINT '字段检查完成';