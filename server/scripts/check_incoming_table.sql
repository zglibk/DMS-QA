IF EXISTS (SELECT * FROM sys.tables WHERE name = 'IncomingInspectionReports')
BEGIN
    PRINT 'IncomingInspectionReports exists';
    IF EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('IncomingInspectionReports') AND name = 'PackageCount')
    BEGIN
        PRINT 'PackageCount column exists';
    END
    ELSE
    BEGIN
        PRINT 'PackageCount column MISSING';
    END
END
ELSE
BEGIN
    PRINT 'IncomingInspectionReports MISSING';
END
