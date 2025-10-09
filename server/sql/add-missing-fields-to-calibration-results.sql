-- 为CalibrationResults表添加缺少的字段
-- 这些字段是后端API更新操作所需要的

-- 检查并添加InstrumentCode字段
IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS 
               WHERE TABLE_NAME = 'CalibrationResults' AND COLUMN_NAME = 'InstrumentCode')
BEGIN
    ALTER TABLE CalibrationResults 
    ADD InstrumentCode NVARCHAR(50) NULL
    PRINT '已添加InstrumentCode字段'
END
ELSE
BEGIN
    PRINT 'InstrumentCode字段已存在'
END

-- 检查并添加ManagementCode字段
IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS 
               WHERE TABLE_NAME = 'CalibrationResults' AND COLUMN_NAME = 'ManagementCode')
BEGIN
    ALTER TABLE CalibrationResults 
    ADD ManagementCode NVARCHAR(50) NULL
    PRINT '已添加ManagementCode字段'
END
ELSE
BEGIN
    PRINT 'ManagementCode字段已存在'
END

-- 检查并添加EnvironmentalConditions字段
IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS 
               WHERE TABLE_NAME = 'CalibrationResults' AND COLUMN_NAME = 'EnvironmentalConditions')
BEGIN
    ALTER TABLE CalibrationResults 
    ADD EnvironmentalConditions NVARCHAR(500) NULL
    PRINT '已添加EnvironmentalConditions字段'
END
ELSE
BEGIN
    PRINT 'EnvironmentalConditions字段已存在'
END

-- 检查并添加NextCalibrationDate字段（如果不存在）
IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS 
               WHERE TABLE_NAME = 'CalibrationResults' AND COLUMN_NAME = 'NextCalibrationDate')
BEGIN
    ALTER TABLE CalibrationResults 
    ADD NextCalibrationDate DATETIME NULL
    PRINT '已添加NextCalibrationDate字段'
END
ELSE
BEGIN
    PRINT 'NextCalibrationDate字段已存在'
END

-- 显示表结构
SELECT 
    COLUMN_NAME, 
    DATA_TYPE, 
    IS_NULLABLE,
    CHARACTER_MAXIMUM_LENGTH
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_NAME = 'CalibrationResults' 
ORDER BY ORDINAL_POSITION

PRINT '字段添加完成！'