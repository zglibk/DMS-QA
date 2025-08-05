-- =====================================================
-- 工作计划管理系统数据表初始化脚本
-- 功能：创建工作计划、工作日志、进度跟踪等相关表
-- 版本：v1.0
-- 创建日期：2025-01-27
-- =====================================================

USE [DMS-QA];
GO

PRINT '开始创建工作计划管理系统数据表...';

-- =====================================================
-- 1. 工作计划表 (WorkPlans)
-- 功能：存储工作计划的基本信息
-- =====================================================
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[WorkPlans]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[WorkPlans] (
        [ID] INT IDENTITY(1,1) PRIMARY KEY,
        [PlanCode] NVARCHAR(50) NOT NULL UNIQUE,        -- 计划编号
        [PlanName] NVARCHAR(200) NOT NULL,              -- 计划名称
        [PlanType] NVARCHAR(20) DEFAULT 'normal',       -- 计划类型：normal/urgent/routine
        [Priority] INT DEFAULT 2,                       -- 优先级：1=高，2=中，3=低
        [Description] NVARCHAR(1000),                   -- 计划描述
        [StartDate] DATE NOT NULL,                      -- 开始日期
        [EndDate] DATE NOT NULL,                        -- 结束日期
        [EstimatedHours] DECIMAL(8,2),                  -- 预计工时
        [ActualHours] DECIMAL(8,2) DEFAULT 0,           -- 实际工时
        [Progress] INT DEFAULT 0,                       -- 进度百分比
        [Status] NVARCHAR(20) DEFAULT 'pending',        -- 状态：pending/in_progress/completed/cancelled
        [CreatedBy] INT NOT NULL,                       -- 创建人ID
        [AssignedTo] INT,                               -- 负责人ID
        [DepartmentID] INT,                             -- 所属部门ID
        [ParentPlanID] INT,                             -- 父计划ID（支持子计划）
        [Tags] NVARCHAR(500),                           -- 标签（JSON格式）
        [Attachments] NVARCHAR(MAX),                    -- 附件路径（JSON格式）
        [CreatedAt] DATETIME DEFAULT GETDATE(),
        [UpdatedAt] DATETIME DEFAULT GETDATE(),
        [CompletedAt] DATETIME,                         -- 完成时间
        
        CONSTRAINT FK_WorkPlans_Creator 
            FOREIGN KEY (CreatedBy) REFERENCES [dbo].[User](ID),
        CONSTRAINT FK_WorkPlans_Assignee 
            FOREIGN KEY (AssignedTo) REFERENCES [dbo].[User](ID),
        CONSTRAINT FK_WorkPlans_Department 
            FOREIGN KEY (DepartmentID) REFERENCES [dbo].[Department](ID),
        CONSTRAINT FK_WorkPlans_Parent 
            FOREIGN KEY (ParentPlanID) REFERENCES [dbo].[WorkPlans](ID)
    );
    PRINT '✅ WorkPlans 表创建成功';
END
ELSE
BEGIN
    PRINT '⚠️ WorkPlans 表已存在，跳过创建';
END

-- =====================================================
-- 2. 工作日志表 (WorkLogs)
-- 功能：存储用户的工作日志记录
-- =====================================================
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[WorkLogs]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[WorkLogs] (
        [ID] INT IDENTITY(1,1) PRIMARY KEY,
        [LogDate] DATE NOT NULL,                        -- 日志日期
        [UserID] INT NOT NULL,                          -- 用户ID
        [PlanID] INT,                                   -- 关联计划ID（可选）
        [WorkContent] NVARCHAR(2000) NOT NULL,          -- 工作内容
        [WorkHours] DECIMAL(4,2) NOT NULL,              -- 工作时长
        [WorkType] NVARCHAR(50),                        -- 工作类型
        [Difficulty] INT DEFAULT 2,                     -- 难度等级：1=简单，2=中等，3=困难
        [Achievement] NVARCHAR(1000),                   -- 工作成果
        [Issues] NVARCHAR(1000),                        -- 遇到的问题
        [NextPlan] NVARCHAR(1000),                      -- 下一步计划
        [Mood] INT DEFAULT 3,                           -- 工作心情：1-5分
        [Weather] NVARCHAR(20),                         -- 天气情况
        [Location] NVARCHAR(100),                       -- 工作地点
        [Collaborators] NVARCHAR(500),                  -- 协作人员
        [Tags] NVARCHAR(300),                           -- 标签
        [Attachments] NVARCHAR(MAX),                    -- 附件（JSON格式）
        [IsPrivate] BIT DEFAULT 0,                      -- 是否私人日志
        [CreatedAt] DATETIME DEFAULT GETDATE(),
        [UpdatedAt] DATETIME DEFAULT GETDATE(),
        
        CONSTRAINT FK_WorkLogs_User 
            FOREIGN KEY (UserID) REFERENCES [dbo].[User](ID),
        CONSTRAINT FK_WorkLogs_Plan 
            FOREIGN KEY (PlanID) REFERENCES [dbo].[WorkPlans](ID)
    );
    PRINT '✅ WorkLogs 表创建成功';
END
ELSE
BEGIN
    PRINT '⚠️ WorkLogs 表已存在，跳过创建';
END

-- =====================================================
-- 3. 计划里程碑表 (PlanMilestones)
-- 功能：存储计划的里程碑节点
-- =====================================================
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[PlanMilestones]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[PlanMilestones] (
        [ID] INT IDENTITY(1,1) PRIMARY KEY,
        [PlanID] INT NOT NULL,                          -- 计划ID
        [MilestoneName] NVARCHAR(200) NOT NULL,         -- 里程碑名称
        [Description] NVARCHAR(1000),                   -- 描述
        [TargetDate] DATE NOT NULL,                     -- 目标日期
        [ActualDate] DATE,                              -- 实际完成日期
        [Status] NVARCHAR(20) DEFAULT 'pending',        -- 状态：pending/completed/overdue
        [Progress] INT DEFAULT 0,                       -- 进度百分比
        [SortOrder] INT DEFAULT 0,                      -- 排序
        [CreatedAt] DATETIME DEFAULT GETDATE(),
        [UpdatedAt] DATETIME DEFAULT GETDATE(),
        
        CONSTRAINT FK_PlanMilestones_Plan 
            FOREIGN KEY (PlanID) REFERENCES [dbo].[WorkPlans](ID) ON DELETE CASCADE
    );
    PRINT '✅ PlanMilestones 表创建成功';
END
ELSE
BEGIN
    PRINT '⚠️ PlanMilestones 表已存在，跳过创建';
END

-- =====================================================
-- 4. 计划模板表 (PlanTemplates)
-- 功能：存储可复用的计划模板
-- =====================================================
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[PlanTemplates]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[PlanTemplates] (
        [ID] INT IDENTITY(1,1) PRIMARY KEY,
        [TemplateName] NVARCHAR(200) NOT NULL,          -- 模板名称
        [Category] NVARCHAR(50),                        -- 模板分类
        [Description] NVARCHAR(1000),                   -- 模板描述
        [TemplateData] NVARCHAR(MAX) NOT NULL,          -- 模板数据（JSON格式）
        [EstimatedDays] INT,                            -- 预计天数
        [EstimatedHours] DECIMAL(8,2),                  -- 预计工时
        [DepartmentID] INT,                             -- 适用部门
        [IsPublic] BIT DEFAULT 1,                       -- 是否公开
        [UsageCount] INT DEFAULT 0,                     -- 使用次数
        [CreatedBy] INT NOT NULL,                       -- 创建人
        [CreatedAt] DATETIME DEFAULT GETDATE(),
        [UpdatedAt] DATETIME DEFAULT GETDATE(),
        
        CONSTRAINT FK_PlanTemplates_Creator 
            FOREIGN KEY (CreatedBy) REFERENCES [dbo].[User](ID),
        CONSTRAINT FK_PlanTemplates_Department 
            FOREIGN KEY (DepartmentID) REFERENCES [dbo].[Department](ID)
    );
    PRINT '✅ PlanTemplates 表创建成功';
END
ELSE
BEGIN
    PRINT '⚠️ PlanTemplates 表已存在，跳过创建';
END

-- =====================================================
-- 5. 工作提醒表 (WorkReminders)
-- 功能：存储工作提醒和预警信息
-- =====================================================
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[WorkReminders]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[WorkReminders] (
        [ID] INT IDENTITY(1,1) PRIMARY KEY,
        [UserID] INT NOT NULL,                          -- 用户ID
        [PlanID] INT,                                   -- 关联计划ID
        [ReminderType] NVARCHAR(20) NOT NULL,           -- 提醒类型：deadline/milestone/daily
        [Title] NVARCHAR(200) NOT NULL,                 -- 提醒标题
        [Content] NVARCHAR(1000),                       -- 提醒内容
        [ReminderTime] DATETIME NOT NULL,               -- 提醒时间
        [IsRead] BIT DEFAULT 0,                         -- 是否已读
        [IsActive] BIT DEFAULT 1,                       -- 是否激活
        [CreatedAt] DATETIME DEFAULT GETDATE(),
        
        CONSTRAINT FK_WorkReminders_User 
            FOREIGN KEY (UserID) REFERENCES [dbo].[User](ID),
        CONSTRAINT FK_WorkReminders_Plan 
            FOREIGN KEY (PlanID) REFERENCES [dbo].[WorkPlans](ID)
    );
    PRINT '✅ WorkReminders 表创建成功';
END
ELSE
BEGIN
    PRINT '⚠️ WorkReminders 表已存在，跳过创建';
END

-- =====================================================
-- 6. 工作类型字典表 (WorkTypes)
-- 功能：存储工作类型的标准化数据
-- =====================================================
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[WorkTypes]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[WorkTypes] (
        [ID] INT IDENTITY(1,1) PRIMARY KEY,
        [TypeName] NVARCHAR(50) NOT NULL UNIQUE,        -- 类型名称
        [TypeCode] NVARCHAR(20) NOT NULL UNIQUE,        -- 类型编码
        [Description] NVARCHAR(200),                    -- 描述
        [Color] NVARCHAR(10) DEFAULT '#409EFF',         -- 显示颜色
        [Icon] NVARCHAR(50),                            -- 图标
        [SortOrder] INT DEFAULT 0,                      -- 排序
        [IsActive] BIT DEFAULT 1,                       -- 是否启用
        [CreatedAt] DATETIME DEFAULT GETDATE()
    );
    PRINT '✅ WorkTypes 表创建成功';
END
ELSE
BEGIN
    PRINT '⚠️ WorkTypes 表已存在，跳过创建';
END

-- =====================================================
-- 创建索引以优化查询性能
-- =====================================================
PRINT '创建索引...';

-- WorkPlans 表索引
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_WorkPlans_CreatedBy')
    CREATE NONCLUSTERED INDEX [IX_WorkPlans_CreatedBy] ON [dbo].[WorkPlans] ([CreatedBy]);

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_WorkPlans_AssignedTo')
    CREATE NONCLUSTERED INDEX [IX_WorkPlans_AssignedTo] ON [dbo].[WorkPlans] ([AssignedTo]);

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_WorkPlans_DepartmentID')
    CREATE NONCLUSTERED INDEX [IX_WorkPlans_DepartmentID] ON [dbo].[WorkPlans] ([DepartmentID]);

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_WorkPlans_Status')
    CREATE NONCLUSTERED INDEX [IX_WorkPlans_Status] ON [dbo].[WorkPlans] ([Status]);

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_WorkPlans_StartDate')
    CREATE NONCLUSTERED INDEX [IX_WorkPlans_StartDate] ON [dbo].[WorkPlans] ([StartDate]);

-- WorkLogs 表索引
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_WorkLogs_UserID')
    CREATE NONCLUSTERED INDEX [IX_WorkLogs_UserID] ON [dbo].[WorkLogs] ([UserID]);

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_WorkLogs_LogDate')
    CREATE NONCLUSTERED INDEX [IX_WorkLogs_LogDate] ON [dbo].[WorkLogs] ([LogDate]);

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_WorkLogs_PlanID')
    CREATE NONCLUSTERED INDEX [IX_WorkLogs_PlanID] ON [dbo].[WorkLogs] ([PlanID]);

-- PlanMilestones 表索引
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_PlanMilestones_PlanID')
    CREATE NONCLUSTERED INDEX [IX_PlanMilestones_PlanID] ON [dbo].[PlanMilestones] ([PlanID]);

-- WorkReminders 表索引
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_WorkReminders_UserID')
    CREATE NONCLUSTERED INDEX [IX_WorkReminders_UserID] ON [dbo].[WorkReminders] ([UserID]);

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_WorkReminders_ReminderTime')
    CREATE NONCLUSTERED INDEX [IX_WorkReminders_ReminderTime] ON [dbo].[WorkReminders] ([ReminderTime]);

PRINT '✅ 索引创建完成';

-- =====================================================
-- 插入基础数据
-- =====================================================
PRINT '插入基础数据...';

-- 插入工作类型基础数据
IF NOT EXISTS (SELECT * FROM [dbo].[WorkTypes] WHERE TypeCode = 'DEV')
BEGIN
    INSERT INTO [dbo].[WorkTypes] ([TypeName], [TypeCode], [Description], [Color], [Icon], [SortOrder]) VALUES
    (N'开发工作', 'DEV', N'软件开发、编程相关工作', '#409EFF', 'Cpu', 1),
    (N'测试工作', 'TEST', N'软件测试、质量保证工作', '#67C23A', 'CircleCheck', 2),
    (N'设计工作', 'DESIGN', N'UI/UX设计、产品设计工作', '#E6A23C', 'Edit', 3),
    (N'会议沟通', 'MEETING', N'会议、沟通、协调工作', '#F56C6C', 'ChatDotRound', 4),
    (N'文档编写', 'DOC', N'文档编写、整理工作', '#909399', 'Document', 5),
    (N'学习培训', 'LEARN', N'学习、培训、研究工作', '#9C27B0', 'Reading', 6),
    (N'维护运营', 'MAINTAIN', N'系统维护、运营工作', '#FF9800', 'Tools', 7),
    (N'其他工作', 'OTHER', N'其他类型工作', '#607D8B', 'MoreFilled', 8);
    
    PRINT '✅ 工作类型基础数据插入完成';
END
ELSE
BEGIN
    PRINT '⚠️ 工作类型基础数据已存在，跳过插入';
END

-- 插入计划模板示例数据
IF NOT EXISTS (SELECT * FROM [dbo].[PlanTemplates] WHERE TemplateName = N'软件开发项目模板')
BEGIN
    DECLARE @AdminUserId INT = (SELECT TOP 1 ID FROM [dbo].[User] WHERE Username = 'admin');
    
    IF @AdminUserId IS NOT NULL
    BEGIN
        INSERT INTO [dbo].[PlanTemplates] ([TemplateName], [Category], [Description], [TemplateData], [EstimatedDays], [EstimatedHours], [IsPublic], [CreatedBy]) VALUES
        (N'软件开发项目模板', N'开发', N'标准的软件开发项目模板，包含需求分析、设计、开发、测试等阶段', 
         N'{"phases":[{"name":"需求分析","duration":3,"tasks":["需求收集","需求分析","需求评审"]},{"name":"系统设计","duration":5,"tasks":["架构设计","数据库设计","接口设计"]},{"name":"开发实现","duration":15,"tasks":["前端开发","后端开发","接口联调"]},{"name":"测试验收","duration":5,"tasks":["单元测试","集成测试","用户验收"]}]}', 
         28, 224, 1, @AdminUserId),
        (N'质量改进计划模板', N'质量', N'质量管理和改进计划模板', 
         N'{"phases":[{"name":"问题识别","duration":2,"tasks":["问题收集","问题分析"]},{"name":"改进方案","duration":3,"tasks":["方案设计","方案评审"]},{"name":"实施改进","duration":10,"tasks":["方案实施","效果监控"]},{"name":"总结评估","duration":2,"tasks":["效果评估","经验总结"]}]}', 
         17, 136, 1, @AdminUserId),
        (N'培训计划模板', N'培训', N'员工培训计划模板', 
         N'{"phases":[{"name":"培训准备","duration":3,"tasks":["需求调研","课程设计","资料准备"]},{"name":"培训实施","duration":5,"tasks":["理论培训","实践操作","答疑解惑"]},{"name":"效果评估","duration":2,"tasks":["考核测试","效果评估","改进建议"]}]}', 
         10, 80, 1, @AdminUserId);
         
        PRINT '✅ 计划模板示例数据插入完成';
    END
    ELSE
    BEGIN
        PRINT '⚠️ 未找到admin用户，跳过模板数据插入';
    END
END
ELSE
BEGIN
    PRINT '⚠️ 计划模板示例数据已存在，跳过插入';
END

PRINT '🎉 工作计划管理系统数据表初始化完成！';
PRINT '';
PRINT '已创建的表：';
PRINT '  ✅ WorkPlans - 工作计划表';
PRINT '  ✅ WorkLogs - 工作日志表';
PRINT '  ✅ PlanMilestones - 计划里程碑表';
PRINT '  ✅ PlanTemplates - 计划模板表';
PRINT '  ✅ WorkReminders - 工作提醒表';
PRINT '  ✅ WorkTypes - 工作类型字典表';
PRINT '';
PRINT '已创建的索引：';
PRINT '  ✅ 用户相关索引';
PRINT '  ✅ 日期相关索引';
PRINT '  ✅ 状态相关索引';
PRINT '';
PRINT '已插入的基础数据：';
PRINT '  ✅ 8种工作类型';
PRINT '  ✅ 3个计划模板';
PRINT '';
PRINT '下一步：';
PRINT '  1. 在菜单管理中添加工作计划管理相关菜单';
PRINT '  2. 为相应角色分配菜单权限';
PRINT '  3. 开发前端页面和后端API接口';
PRINT '';

GO