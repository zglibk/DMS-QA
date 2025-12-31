IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('InspectionItems') AND name = 'Unit')
BEGIN
    ALTER TABLE InspectionItems ADD Unit NVARCHAR(50);
    PRINT 'Unit column added to InspectionItems';
END
ELSE
BEGIN
    PRINT 'Unit column already exists in InspectionItems';
END
GO

UPDATE InspectionItems SET Unit = 'mm' WHERE ItemName LIKE '%厚度%' OR ItemName LIKE '%宽度%' OR ItemName LIKE '%长度%' OR ItemName LIKE '%直径%' OR ItemName LIKE '%尺寸%';
UPDATE InspectionItems SET Unit = 'N/25mm' WHERE ItemName LIKE '%剥离力%';
UPDATE InspectionItems SET Unit = 'g' WHERE ItemName LIKE '%重量%';
