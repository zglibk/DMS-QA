IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('IncomingInspectionReports') AND name = 'PackageCount')
BEGIN
    ALTER TABLE IncomingInspectionReports ADD PackageCount INT;
    PRINT 'PackageCount column added';
END
ELSE
BEGIN
    PRINT 'PackageCount column already exists';
END
