-- 插入当前日期的测试数据，用于验证时间范围功能
-- 创建日期：2025-08-08

-- 插入今天的待办事项
INSERT INTO work_plans (Title, Description, StartDate, EndDate, Priority, Status, Progress, WorkTypeID, AssignedUserID, CreatedBy, CreatedAt, UpdatedAt) VALUES
('今日紧急任务', '需要今天完成的紧急任务', '2025-08-08', '2025-08-08', 'high', 'in_progress', 30, 1, 1, 1, NOW(), NOW()),
('今日常规工作', '今天的常规工作安排', '2025-08-08', '2025-08-09', 'medium', 'pending', 0, 2, 1, 1, NOW(), NOW()),
('今日文档整理', '整理项目相关文档', '2025-08-08', '2025-08-08', 'low', 'in_progress', 60, 3, 1, 1, NOW(), NOW());

-- 插入本周的待办事项
INSERT INTO work_plans (Title, Description, StartDate, EndDate, Priority, Status, Progress, WorkTypeID, AssignedUserID, CreatedBy, CreatedAt, UpdatedAt) VALUES
('本周项目评审', '本周需要完成的项目评审', '2025-08-05', '2025-08-09', 'high', 'in_progress', 45, 1, 1, 1, NOW(), NOW()),
('本周培训安排', '本周的员工培训计划', '2025-08-06', '2025-08-10', 'medium', 'pending', 0, 2, 1, 1, NOW(), NOW());

-- 插入本月的待办事项
INSERT INTO work_plans (Title, Description, StartDate, EndDate, Priority, Status, Progress, WorkTypeID, AssignedUserID, CreatedBy, CreatedAt, UpdatedAt) VALUES
('月度报告编制', '8月份的月度工作报告', '2025-08-01', '2025-08-31', 'high', 'in_progress', 25, 1, 1, 1, NOW(), NOW()),
('月度系统维护', '8月份的系统维护工作', '2025-08-15', '2025-08-30', 'medium', 'pending', 0, 3, 1, 1, NOW(), NOW());

-- 插入今天的工作日志
INSERT INTO work_logs (PlanID, LogDate, WorkHours, Content, Issues, Solutions, CreatedBy, CreatedAt, UpdatedAt) VALUES
(1, '2025-08-08', 4, '完成了今日紧急任务的前期准备工作', '无', '按计划进行', 1, NOW(), NOW()),
(3, '2025-08-08', 2, '整理了项目文档，更新了技术规范', '文档格式需要统一', '制定了统一的文档模板', 1, NOW(), NOW());

-- 插入本周的工作日志
INSERT INTO work_logs (PlanID, LogDate, WorkHours, Content, Issues, Solutions, CreatedBy, CreatedAt, UpdatedAt) VALUES
(4, '2025-08-07', 6, '进行了项目评审准备工作', '需要更多的测试数据', '联系测试团队提供数据', 1, NOW(), NOW()),
(4, '2025-08-06', 5, '完成了项目评审文档的初稿', '无', '按计划进行', 1, NOW(), NOW());

-- 插入本月的工作日志
INSERT INTO work_logs (PlanID, LogDate, WorkHours, Content, Issues, Solutions, CreatedBy, CreatedAt, UpdatedAt) VALUES
(6, '2025-08-05', 8, '开始编制月度报告，收集各部门数据', '部分数据收集困难', '直接联系相关负责人', 1, NOW(), NOW()),
(6, '2025-08-03', 4, '制定了月度报告的框架和大纲', '无', '按计划进行', 1, NOW(), NOW());

-- 更新现有数据的日期，使其更符合测试需求
UPDATE work_plans SET 
    StartDate = '2025-08-01', 
    EndDate = '2025-08-31', 
    UpdatedAt = NOW() 
WHERE ID IN (18, 19, 20);

UPDATE work_logs SET 
    LogDate = '2025-08-05', 
    UpdatedAt = NOW() 
WHERE ID = 7;

UPDATE work_logs SET 
    LogDate = '2025-08-04', 
    UpdatedAt = NOW() 
WHERE ID = 9;

-- 提交更改
COMMIT;