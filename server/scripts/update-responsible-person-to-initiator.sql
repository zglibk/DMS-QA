/*
 * 将供应商投诉表中的"负责人"字段修改为"发起人"的SQL脚本
 * 功能：将ResponsiblePerson字段重命名为InitiatedBy
 * 执行方式：在SQL Server Management Studio中执行此脚本
 */

USE [DMS-QA]
GO

PRINT '开始修改供应商投诉表字段名称...'

-- 检查表是否存在
IF EXISTS (SELECT * FROM sysobjects WHERE name='SupplierComplaints' AND xtype='U')
BEGIN
    -- 检查ResponsiblePerson字段是否存在
    IF EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('SupplierComplaints') AND name = 'ResponsiblePerson')
    BEGIN
        -- 添加新的InitiatedBy字段
        IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('SupplierComplaints') AND name = 'InitiatedBy')
        BEGIN
            ALTER TABLE [dbo].[SupplierComplaints] ADD [InitiatedBy] NVARCHAR(100) NULL
            PRINT '✓ 发起人字段 InitiatedBy 添加成功'
            
            -- 将ResponsiblePerson的数据复制到InitiatedBy
            UPDATE [dbo].[SupplierComplaints] SET [InitiatedBy] = [ResponsiblePerson]
            PRINT '✓ 数据迁移完成'
            
            -- 删除旧的ResponsiblePerson字段
            ALTER TABLE [dbo].[SupplierComplaints] DROP COLUMN [ResponsiblePerson]
            PRINT '✓ 旧字段 ResponsiblePerson 删除成功'
        END
        ELSE
        BEGIN
            PRINT '- 发起人字段 InitiatedBy 已存在'
        END
    END
    ELSE
    BEGIN
        PRINT '- ResponsiblePerson 字段不存在，可能已经修改过'
        
        -- 如果InitiatedBy字段不存在，则创建它
        IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('SupplierComplaints') AND name = 'InitiatedBy')
        BEGIN
            ALTER TABLE [dbo].[SupplierComplaints] ADD [InitiatedBy] NVARCHAR(100) NULL
            PRINT '✓ 发起人字段 InitiatedBy 添加成功'
        END
    END
END
ELSE
BEGIN
    PRINT '❌ SupplierComplaints 表不存在'
END

PRINT '字段名称修改完成！'
GO