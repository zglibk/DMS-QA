-- 为CustomerComplaints表的ComplaintType字段添加外键约束
-- 引用CustomerComplaintType表的Name字段

USE [DMS_QA];
GO

-- 检查外键约束是否已存在
IF NOT EXISTS (
    SELECT * FROM sys.foreign_keys 
    WHERE object_id = OBJECT_ID(N'[dbo].[FK_CustomerComplaints_ComplaintType]') 
    AND parent_object_id = OBJECT_ID(N'[dbo].[CustomerComplaints]')
)
BEGIN
    -- 添加外键约束
    ALTER TABLE [dbo].[CustomerComplaints]
    ADD CONSTRAINT [FK_CustomerComplaints_ComplaintType]
    FOREIGN KEY ([ComplaintType])
    REFERENCES [dbo].[CustomerComplaintType] ([Name])
    ON DELETE SET NULL  -- 当引用的投诉类型被删除时，将ComplaintType设为NULL
    ON UPDATE CASCADE;  -- 当引用的投诉类型名称更新时，自动更新ComplaintType
    
    PRINT 'CustomerComplaints表ComplaintType字段外键约束创建成功。';
END
ELSE
BEGIN
    PRINT 'CustomerComplaints表ComplaintType字段外键约束已存在，跳过创建。';
END
GO

-- 验证外键约束是否创建成功
IF EXISTS (
    SELECT * FROM sys.foreign_keys 
    WHERE object_id = OBJECT_ID(N'[dbo].[FK_CustomerComplaints_ComplaintType]') 
    AND parent_object_id = OBJECT_ID(N'[dbo].[CustomerComplaints]')
)
BEGIN
    PRINT '外键约束验证成功：FK_CustomerComplaints_ComplaintType已存在。';
    
    -- 显示外键约束详细信息
    SELECT 
        fk.name AS ForeignKeyName,
        tp.name AS ParentTable,
        cp.name AS ParentColumn,
        tr.name AS ReferencedTable,
        cr.name AS ReferencedColumn,
        fk.delete_referential_action_desc AS DeleteAction,
        fk.update_referential_action_desc AS UpdateAction
    FROM sys.foreign_keys fk
    INNER JOIN sys.foreign_key_columns fkc ON fk.object_id = fkc.constraint_object_id
    INNER JOIN sys.tables tp ON fk.parent_object_id = tp.object_id
    INNER JOIN sys.columns cp ON fkc.parent_object_id = cp.object_id AND fkc.parent_column_id = cp.column_id
    INNER JOIN sys.tables tr ON fk.referenced_object_id = tr.object_id
    INNER JOIN sys.columns cr ON fkc.referenced_object_id = cr.object_id AND fkc.referenced_column_id = cr.column_id
    WHERE fk.name = 'FK_CustomerComplaints_ComplaintType';
END
ELSE
BEGIN
    PRINT '外键约束验证失败：FK_CustomerComplaints_ComplaintType不存在。';
END
GO

PRINT '外键约束脚本执行完成。';