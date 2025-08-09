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
        [WorkTypeID] INT,                               -- 工作类型ID
        [Priority] NVARCHAR(20) DEFAULT 'medium',       -- 优先级：low/medium/high/urgent
        [IsPublic] BIT DEFAULT 1,                       -- 是否公开
        [UsageCount] INT DEFAULT 0,                     -- 使用次数
        [CreatedBy] INT NOT NULL,                       -- 创建人
        [CreatedAt] DATETIME DEFAULT GETDATE(),
        [UpdatedAt] DATETIME DEFAULT GETDATE(),
        
        CONSTRAINT FK_PlanTemplates_Creator 
            FOREIGN KEY (CreatedBy) REFERENCES [dbo].[User](ID),
        CONSTRAINT FK_PlanTemplates_Department 
            FOREIGN KEY (DepartmentID) REFERENCES [dbo].[Department](ID),
        CONSTRAINT FK_PlanTemplates_WorkType 
            FOREIGN KEY (WorkTypeID) REFERENCES [dbo].[WorkTypes](ID)
    );
    PRINT '✅ PlanTemplates 表创建成功';
END
ELSE
BEGIN
    PRINT '⚠️ PlanTemplates 表已存在，跳过创建';
END

-- 创建 PlanTemplates 表索引
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_PlanTemplates_WorkTypeID')
    CREATE NONCLUSTERED INDEX [IX_PlanTemplates_WorkTypeID] ON [dbo].[PlanTemplates] ([WorkTypeID]);

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_PlanTemplates_DepartmentID')
    CREATE NONCLUSTERED INDEX [IX_PlanTemplates_DepartmentID] ON [dbo].[PlanTemplates] ([DepartmentID]);

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_PlanTemplates_CreatedBy')
    CREATE NONCLUSTERED INDEX [IX_PlanTemplates_CreatedBy] ON [dbo].[PlanTemplates] ([CreatedBy]);

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_PlanTemplates_Category')
    CREATE NONCLUSTERED INDEX [IX_PlanTemplates_Category] ON [dbo].[PlanTemplates] ([Category]);

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_PlanTemplates_IsPublic')
    CREATE NONCLUSTERED INDEX [IX_PlanTemplates_IsPublic] ON [dbo].[PlanTemplates] ([IsPublic]);

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_PlanTemplates_Priority')
    CREATE NONCLUSTERED INDEX [IX_PlanTemplates_Priority] ON [dbo].[PlanTemplates] ([Priority]);

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
-- 7. 计划进度历史表 (PlanProgressHistory)
-- 功能：记录计划进度变更历史
-- =====================================================
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[PlanProgressHistory]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[PlanProgressHistory] (
        [ID] INT IDENTITY(1,1) PRIMARY KEY,
        [PlanID] INT NOT NULL,                          -- 计划ID
        [OldProgress] DECIMAL(5,2) NOT NULL,            -- 原进度
        [NewProgress] DECIMAL(5,2) NOT NULL,            -- 新进度
        [Description] NVARCHAR(500),                    -- 变更说明
        [UpdaterID] INT NOT NULL,                       -- 更新人ID
        [UpdatedAt] DATETIME DEFAULT GETDATE(),         -- 更新时间
        
        CONSTRAINT FK_PlanProgressHistory_Plan 
            FOREIGN KEY (PlanID) REFERENCES [dbo].[WorkPlans](ID) ON DELETE CASCADE,
        CONSTRAINT FK_PlanProgressHistory_Updater 
            FOREIGN KEY (UpdaterID) REFERENCES [dbo].[User](ID)
    );
    PRINT '✅ PlanProgressHistory 表创建成功';
END
ELSE
BEGIN
    PRINT '⚠️ PlanProgressHistory 表已存在，跳过创建';
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

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_WorkReminders_ReminderDate')
    CREATE NONCLUSTERED INDEX [IX_WorkReminders_ReminderDate] ON [dbo].[WorkReminders] ([ReminderDate]);

-- PlanProgressHistory 表索引
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_PlanProgressHistory_PlanID')
    CREATE NONCLUSTERED INDEX [IX_PlanProgressHistory_PlanID] ON [dbo].[PlanProgressHistory] ([PlanID]);

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_PlanProgressHistory_UpdatedAt')
    CREATE NONCLUSTERED INDEX [IX_PlanProgressHistory_UpdatedAt] ON [dbo].[PlanProgressHistory] ([UpdatedAt]);

PRINT '✅ 索引创建完成';

-- =====================================================
-- 插入基础数据
-- =====================================================
PRINT '插入基础数据...';

-- 插入工作类型基础数据
IF NOT EXISTS (SELECT * FROM [dbo].[WorkTypes] WHERE TypeCode = 'REPORT')
BEGIN
    INSERT INTO [dbo].[WorkTypes] ([TypeName], [TypeCode], [Description], [Color], [Icon], [SortOrder]) VALUES
    (N'编制报表', 'REPORT', N'各类质量报表的编制工作', '#1890ff', 'file-text', 10),
    (N'数据记录', 'DATA_RECORD', N'质量数据的记录和录入工作', '#52c41a', 'edit', 20),
    (N'数据统计', 'DATA_STAT', N'质量数据的统计汇总工作', '#722ed1', 'bar-chart', 30),
    (N'数据分析', 'DATA_ANALYSIS', N'质量数据的深度分析工作', '#fa8c16', 'line-chart', 40),
    (N'统计分析', 'STAT_ANALYSIS', N'质量统计分析和趋势分析', '#13c2c2', 'pie-chart', 50),
    (N'文件开发', 'FILE_DEV', N'质量文件和程序的开发', '#eb2f96', 'file-add', 60),
    (N'文件更新', 'FILE_UPDATE', N'质量文件和程序的更新维护', '#faad14', 'file-sync', 70),
    (N'来料检验', 'IQC', N'来料质量检验工作', '#f5222d', 'inbox', 80),
    (N'制程检验', 'IPQC', N'制程质量检验工作', '#fa541c', 'tool', 90),
    (N'出货检验', 'OQC', N'出货质量检验工作', '#fadb14', 'export', 100),
    (N'测试', 'TEST', N'产品测试和验证工作', '#a0d911', 'experiment', 110),
    (N'会议', 'MEETING', N'质量会议和讨论工作', '#52c41a', 'team', 120),
    (N'培训', 'TRAINING', N'质量培训和学习工作', '#1890ff', 'read', 130),
    (N'校准', 'CALIBRATION', N'设备校准和维护工作', '#722ed1', 'setting', 140),
    (N'其他', 'OTHER', N'其他质量相关工作', '#8c8c8c', 'ellipsis', 150);
    
    PRINT '✅ 工作类型基础数据插入完成';
END
ELSE
BEGIN
    PRINT '⚠️ 工作类型基础数据已存在，跳过插入';
END

-- 插入计划模板示例数据
IF NOT EXISTS (SELECT * FROM [dbo].[PlanTemplates] WHERE TemplateName = N'质量报表编制计划模板')
BEGIN
    DECLARE @AdminUserId INT = (SELECT TOP 1 ID FROM [dbo].[User] WHERE Username = 'admin');
    
    IF @AdminUserId IS NOT NULL
    BEGIN
        INSERT INTO [dbo].[PlanTemplates] ([TemplateName], [Category], [Description], [TemplateData], [EstimatedDays], [EstimatedHours], [IsPublic], [CreatedBy]) VALUES
        (N'质量报表编制计划模板', N'报表', N'月度/季度质量报表编制工作计划模板', 
         N'{"phases":[{"name":"数据收集","duration":2,"tasks":["收集检验数据","收集统计数据"]},{"name":"数据整理","duration":1,"tasks":["数据清洗","数据分类"]},{"name":"报表编制","duration":2,"tasks":["编制月报","编制分析报告"]},{"name":"数据分析","duration":1,"tasks":["趋势分析","问题分析"]},{"name":"报表审核","duration":1,"tasks":["内容审核","数据核实"]}]}', 
         7, 56, 1, @AdminUserId),
        (N'质量检验计划模板', N'检验', N'产品质量检验工作计划模板', 
         N'{"phases":[{"name":"检验准备","duration":1,"tasks":["检验计划制定","检验设备准备"]},{"name":"来料检验","duration":2,"tasks":["原材料检验","检验记录"]},{"name":"制程检验","duration":3,"tasks":["过程检验","质量控制"]},{"name":"出货检验","duration":2,"tasks":["成品检验","包装检验"]},{"name":"检验记录整理","duration":1,"tasks":["数据汇总","报告编制"]}]}', 
         9, 72, 1, @AdminUserId),
        (N'质量文件开发计划模板', N'文件', N'质量管理文件开发和更新计划模板', 
         N'{"phases":[{"name":"需求分析","duration":2,"tasks":["需求调研","现状分析"]},{"name":"文件起草","duration":5,"tasks":["文件编写","流程设计"]},{"name":"内部评审","duration":2,"tasks":["技术评审","管理评审"]},{"name":"修订完善","duration":3,"tasks":["问题修正","内容完善"]},{"name":"发布实施","duration":1,"tasks":["正式发布","培训实施"]}]}', 
         13, 104, 1, @AdminUserId),
        (N'设备校准计划模板', N'校准', N'测量设备校准工作计划模板', 
         N'{"phases":[{"name":"校准准备","duration":1,"tasks":["设备清单","校准计划"]},{"name":"设备校准","duration":2,"tasks":["内部校准","外部校准"]},{"name":"校准记录","duration":1,"tasks":["记录整理","数据录入"]},{"name":"结果分析","duration":1,"tasks":["偏差分析","趋势分析"]},{"name":"证书管理","duration":1,"tasks":["证书归档","到期提醒"]}]}', 
         6, 48, 1, @AdminUserId),
        (N'质量培训计划模板', N'培训', N'质量管理培训工作计划模板', 
         N'{"phases":[{"name":"培训需求调研","duration":2,"tasks":["需求收集","技能评估"]},{"name":"培训方案设计","duration":3,"tasks":["课程设计","教材准备"]},{"name":"培训材料准备","duration":2,"tasks":["PPT制作","案例收集"]},{"name":"培训实施","duration":5,"tasks":["理论培训","实操培训"]},{"name":"培训效果评估","duration":1,"tasks":["考核测试","效果评估"]}]}', 
         13, 104, 1, @AdminUserId),
        (N'数据统计分析计划模板', N'统计', N'质量数据统计分析工作计划模板', 
         N'{"phases":[{"name":"数据收集","duration":2,"tasks":["数据采集","数据验证"]},{"name":"数据清洗","duration":1,"tasks":["异常值处理","数据标准化"]},{"name":"统计分析","duration":3,"tasks":["描述性统计","相关性分析"]},{"name":"趋势分析","duration":2,"tasks":["时间序列分析","预测分析"]},{"name":"报告编制","duration":2,"tasks":["分析报告","图表制作"]}]}', 
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
PRINT '  ✅ 15种工作类型（制造业质量管理专用）';
PRINT '  ✅ 6个计划模板（制造业质量管理专用）';
PRINT '';
PRINT '下一步：';
PRINT '  1. 在菜单管理中添加工作计划管理相关菜单';
PRINT '  2. 为相应角色分配菜单权限';
PRINT '  3. 开发前端页面和后端API接口';
PRINT '';

GO