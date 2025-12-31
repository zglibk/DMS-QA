-- Add InspectionBasis to InspectionItems
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('InspectionItems') AND name = 'InspectionBasis')
BEGIN
    ALTER TABLE InspectionItems ADD InspectionBasis NVARCHAR(255);
    PRINT 'InspectionBasis column added to InspectionItems';
END

-- Add InspectionBasis to IncomingInspectionDetails
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('IncomingInspectionDetails') AND name = 'InspectionBasis')
BEGIN
    ALTER TABLE IncomingInspectionDetails ADD InspectionBasis NVARCHAR(255);
    PRINT 'InspectionBasis column added to IncomingInspectionDetails';
END
