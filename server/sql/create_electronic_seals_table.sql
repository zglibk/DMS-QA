IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[ElectronicSeals]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[ElectronicSeals] (
        [ID] INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        [SealName] NVARCHAR(100) NOT NULL,
        [SealType] NVARCHAR(50) NOT NULL, -- 'department' or 'special'
        [DepartmentID] INT NULL,
        [DepartmentName] NVARCHAR(100) NULL,
        [ImageUrl] NVARCHAR(500) NOT NULL,
        [Description] NVARCHAR(500) NULL,
        [CreatedBy] INT NULL,
        [CreatedAt] DATETIME DEFAULT GETDATE(),
        [UpdatedBy] INT NULL,
        [UpdatedAt] DATETIME DEFAULT GETDATE(),
        [IsActive] BIT DEFAULT 1
    );

    CREATE INDEX [IX_ElectronicSeals_Type] ON [dbo].[ElectronicSeals] ([SealType]);
    CREATE INDEX [IX_ElectronicSeals_Department] ON [dbo].[ElectronicSeals] ([DepartmentID]);
    
    PRINT 'ElectronicSeals table created successfully';
END
ELSE
BEGIN
    PRINT 'ElectronicSeals table already exists';
END
