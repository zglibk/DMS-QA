-- Add MaterialCategory column to InspectionItems table
IF NOT EXISTS (
  SELECT * FROM sys.columns 
  WHERE object_id = OBJECT_ID('InspectionItems') 
  AND name = 'MaterialCategory'
)
BEGIN
    ALTER TABLE InspectionItems
    ADD MaterialCategory NVARCHAR(100) NULL;
END
GO

-- Add AutoGenerateRule column to InspectionItems table (for future use)
IF NOT EXISTS (
  SELECT * FROM sys.columns 
  WHERE object_id = OBJECT_ID('InspectionItems') 
  AND name = 'AutoGenerateRule'
)
BEGIN
    ALTER TABLE InspectionItems
    ADD AutoGenerateRule NVARCHAR(MAX) NULL;
END
GO
