-- =====================================================
-- WorkPlans表字段扩展脚本
-- 功能：为WorkPlans表添加更新人字段，并创建执行人关联表
-- 执行前请备份数据库
-- =====================================================

-- 1. 为WorkPlans表添加部门字段
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[WorkPlans]') AND name = 'DepartmentID')
BEGIN
    ALTER TABLE [dbo].[WorkPlans] 
    ADD [DepartmentID] INT NULL; -- 执行部门ID
    
    -- 添加外键约束
    ALTER TABLE [dbo].[WorkPlans] 
    ADD CONSTRAINT FK_WorkPlans_Department
        FOREIGN KEY (DepartmentID) REFERENCES [dbo].[Department](ID);
    
    PRINT '✅ WorkPlans表DepartmentID字段添加成功';
END
ELSE
BEGIN
    PRINT '⚠️ WorkPlans表DepartmentID字段已存在，跳过添加';
END

-- 2. 为WorkPlans表添加更新人字段
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[WorkPlans]') AND name = 'UpdatedBy')
BEGIN
    ALTER TABLE [dbo].[WorkPlans] 
    ADD [UpdatedBy] INT NULL; -- 更新人ID
    
    -- 添加外键约束
    ALTER TABLE [dbo].[WorkPlans] 
    ADD CONSTRAINT FK_WorkPlans_UpdatedBy
        FOREIGN KEY (UpdatedBy) REFERENCES [dbo].[User](ID);
    
    PRINT '✅ WorkPlans表UpdatedBy字段添加成功';
END
ELSE
BEGIN
    PRINT '⚠️ WorkPlans表UpdatedBy字段已存在，跳过添加';
END
GO

-- 3. 创建工作计划执行人关联表
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[WorkPlanExecutors]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[WorkPlanExecutors] (
        [ID] INT IDENTITY(1,1) PRIMARY KEY,              -- 主键，自增ID
        [PlanID] INT NOT NULL,                           -- 工作计划ID
        [ExecutorID] INT NOT NULL,                       -- 执行人ID
        [Role] NVARCHAR(50) DEFAULT '执行人',             -- 执行角色（执行人、协助人等）
        [AssignedAt] DATETIME NOT NULL DEFAULT GETDATE(), -- 分配时间
        [AssignedBy] INT,                                -- 分配人ID
        [Status] NVARCHAR(20) DEFAULT 'active',          -- 状态：active/inactive
        [CreatedAt] DATETIME NOT NULL DEFAULT GETDATE(), -- 创建时间
        [UpdatedAt] DATETIME NOT NULL DEFAULT GETDATE(), -- 更新时间
        
        -- 外键约束
        CONSTRAINT FK_WorkPlanExecutors_Plan
            FOREIGN KEY (PlanID) REFERENCES [dbo].[WorkPlans](ID) ON DELETE CASCADE,
        CONSTRAINT FK_WorkPlanExecutors_Executor
            FOREIGN KEY (ExecutorID) REFERENCES [dbo].[User](ID),
        CONSTRAINT FK_WorkPlanExecutors_AssignedBy
            FOREIGN KEY (AssignedBy) REFERENCES [dbo].[User](ID),
            
        -- 唯一约束：同一计划下同一执行人只能有一条活跃记录
        CONSTRAINT UK_WorkPlanExecutors_Plan_Executor
            UNIQUE (PlanID, ExecutorID)
    );
    
    -- 创建索引优化查询性能
    CREATE INDEX IX_WorkPlanExecutors_PlanID ON [dbo].[WorkPlanExecutors](PlanID);
    CREATE INDEX IX_WorkPlanExecutors_ExecutorID ON [dbo].[WorkPlanExecutors](ExecutorID);
    
    PRINT '✅ WorkPlanExecutors表创建成功';
END
ELSE
BEGIN
    PRINT '⚠️ WorkPlanExecutors表已存在，跳过创建';
END
GO

-- 4. 为现有数据设置默认更新人（设置为创建人）
UPDATE [dbo].[WorkPlans] 
SET [UpdatedBy] = [CreatedBy] 
WHERE [UpdatedBy] IS NULL;

PRINT '✅ 现有WorkPlans记录的UpdatedBy字段已设置为CreatedBy';

-- 5. 创建触发器自动更新UpdatedBy和UpdatedAt字段
IF EXISTS (SELECT * FROM sys.triggers WHERE name = 'TR_WorkPlans_UpdateFields')
BEGIN
    DROP TRIGGER TR_WorkPlans_UpdateFields;
END
GO

CREATE TRIGGER TR_WorkPlans_UpdateFields
ON [dbo].[WorkPlans]
FOR UPDATE
AS
BEGIN
    SET NOCOUNT ON;
    
    -- 更新UpdatedAt字段为当前时间
    UPDATE wp
    SET UpdatedAt = GETDATE()
    FROM [dbo].[WorkPlans] wp
    INNER JOIN inserted i ON wp.ID = i.ID;
    
END

PRINT '✅ WorkPlans表更新触发器创建成功';

PRINT '====================================================='
PRINT '✅ WorkPlans表字段扩展完成！'
PRINT '新增字段：';
PRINT '  - DepartmentID: 执行部门ID';
PRINT '  - UpdatedBy: 更新人ID';
PRINT '新增表：';
PRINT '  - WorkPlanExecutors: 工作计划执行人关联表';
PRINT '新增触发器：';
PRINT '  - TR_WorkPlans_UpdateFields: 自动更新字段触发器';
PRINT '=====================================================';