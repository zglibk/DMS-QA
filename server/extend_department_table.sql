-- =====================================================
-- Department表扩展字段SQL脚本
-- 功能：为现有Department表添加权限管理所需的扩展字段
-- 使用方法：在SQL Server Management Studio中执行此脚本
-- =====================================================

USE [DMS-QA];
GO

-- 检查并添加部门表的扩展字段
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('[dbo].[Department]') AND name = 'ParentID')
BEGIN
    -- 添加扩展字段
    ALTER TABLE [dbo].[Department] ADD [ParentID] INT NULL;                    -- 父部门ID，支持树形结构
    ALTER TABLE [dbo].[Department] ADD [DeptCode] NVARCHAR(20) NULL;           -- 部门编码
    ALTER TABLE [dbo].[Department] ADD [DeptType] NVARCHAR(20) DEFAULT 'department'; -- 部门类型
    ALTER TABLE [dbo].[Department] ADD [Leader] NVARCHAR(50) NULL;             -- 部门负责人
    ALTER TABLE [dbo].[Department] ADD [Phone] NVARCHAR(20) NULL;              -- 联系电话
    ALTER TABLE [dbo].[Department] ADD [Email] NVARCHAR(100) NULL;             -- 邮箱地址
    ALTER TABLE [dbo].[Department] ADD [Description] NVARCHAR(500) NULL;       -- 部门描述
    ALTER TABLE [dbo].[Department] ADD [SortOrder] INT DEFAULT 0;              -- 排序字段
    ALTER TABLE [dbo].[Department] ADD [Status] BIT DEFAULT 1;                 -- 状态（1=启用，0=禁用）
    ALTER TABLE [dbo].[Department] ADD [CreatedAt] DATETIME DEFAULT GETDATE(); -- 创建时间
    ALTER TABLE [dbo].[Department] ADD [UpdatedAt] DATETIME DEFAULT GETDATE(); -- 更新时间
    
    PRINT 'Department表扩展字段添加完成';
END
ELSE
BEGIN
    PRINT 'Department表扩展字段已存在';
END
GO

-- 添加外键约束（父部门关系）
IF NOT EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_Department_Parent')
BEGIN
    ALTER TABLE [dbo].[Department] ADD CONSTRAINT FK_Department_Parent 
        FOREIGN KEY (ParentID) REFERENCES [dbo].[Department](ID);
    PRINT '父部门外键约束添加完成';
END
ELSE
BEGIN
    PRINT '父部门外键约束已存在';
END
GO

-- 创建索引优化查询性能
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_Departments_ParentID')
BEGIN
    CREATE NONCLUSTERED INDEX [IX_Departments_ParentID] ON [dbo].[Department] ([ParentID]);
    PRINT '部门父级索引创建完成';
END
ELSE
BEGIN
    PRINT '部门父级索引已存在';
END
GO

-- 初始化现有部门数据
-- 为现有部门添加默认的扩展字段值
UPDATE [dbo].[Department] SET 
    [DeptCode] = CASE 
        WHEN [Name] = N'生产部' THEN 'PROD'
        WHEN [Name] = N'质检部' THEN 'QC'
        WHEN [Name] = N'销售部' THEN 'SALES'
        WHEN [Name] = N'跟单' THEN 'FOLLOW'
        WHEN [Name] = N'设计' THEN 'DESIGN'
        WHEN [Name] = N'品检' THEN 'QA'
        ELSE 'DEPT' + CAST(ID AS NVARCHAR(10))
    END,
    [DeptType] = 'department',
    [Status] = 1,
    [SortOrder] = ID * 10,
    [UpdatedAt] = GETDATE()
WHERE [DeptCode] IS NULL;
GO

-- 插入根部门（如果不存在）
IF NOT EXISTS (SELECT 1 FROM [dbo].[Department] WHERE [Name] = N'总公司')
BEGIN
    INSERT INTO [dbo].[Department] ([Name], [DeptCode], [DeptType], [ParentID], [Status], [SortOrder], [CreatedAt], [UpdatedAt]) 
    VALUES (N'总公司', 'ROOT', 'company', NULL, 1, 1, GETDATE(), GETDATE());
    PRINT '根部门创建完成';
END
ELSE
BEGIN
    PRINT '根部门已存在';
END
GO

PRINT 'Department表扩展完成！';
PRINT '新增字段说明：';
PRINT '- ParentID: 父部门ID，支持树形结构';
PRINT '- DeptCode: 部门编码，便于系统识别';
PRINT '- DeptType: 部门类型（department/company等）';
PRINT '- Leader: 部门负责人';
PRINT '- Phone: 联系电话';
PRINT '- Email: 邮箱地址';
PRINT '- Description: 部门描述';
PRINT '- SortOrder: 排序字段';
PRINT '- Status: 状态（1=启用，0=禁用）';
PRINT '- CreatedAt: 创建时间';
PRINT '- UpdatedAt: 更新时间';
GO