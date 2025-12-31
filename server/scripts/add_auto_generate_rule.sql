IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('InspectionItems') AND name = 'AutoGenerateRule')
BEGIN
    ALTER TABLE InspectionItems ADD AutoGenerateRule NVARCHAR(MAX);
    PRINT 'AutoGenerateRule column added';
END
ELSE
BEGIN
    PRINT 'AutoGenerateRule column already exists';
END
