/*
 * 版本更新测试数据插入脚本
 * 
 * 功能说明：
 * 1. 插入测试版本更新数据
 * 2. 插入对应的版本更新项目数据
 * 3. 用于测试版本更新功能
 */

-- 插入测试版本更新数据
IF NOT EXISTS (SELECT * FROM VersionUpdates WHERE Version = 'v2.3.1')
BEGIN
    INSERT INTO VersionUpdates (
        Version, Title, Description, ReleaseDate, Status, 
        IsMajorUpdate, TotalCommits, FeaturesCount, FixesCount, 
        ImprovementsCount, OtherCount, ChangelogMarkdown, 
        Contributors, CreatedBy
    ) VALUES (
        'v2.3.1',
        '质量管理系统优化更新',
        '本次更新主要优化了质量管理系统的用户体验，修复了多个已知问题，并新增了版本管理功能。',
        GETDATE(),
        'published',
        0,
        15,
        3,
        5,
        4,
        3,
        '# 版本 v2.3.1 更新日志\n\n## 新功能\n- 新增版本更新管理功能\n- 新增版本通知推送\n- 新增版本详情展示\n\n## 问题修复\n- 修复页面样式问题\n- 修复数据加载异常\n- 修复权限验证问题\n\n## 功能改进\n- 优化用户界面体验\n- 提升系统性能\n- 改进错误提示信息',
        '["张三", "李四", "王五"]',
        1
    );
    
    DECLARE @VersionID INT = SCOPE_IDENTITY();
    
    -- 插入版本更新项目数据
    INSERT INTO VersionUpdateItems (VersionUpdateID, Category, Title, Description, SortOrder, IsHighlight) VALUES
    (@VersionID, 'features', '版本更新管理功能', '新增完整的版本更新管理界面，支持版本的增删改查操作', 1, 1),
    (@VersionID, 'features', '版本通知推送', '集成版本更新通知到现有通知系统，支持向用户推送版本更新信息', 2, 0),
    (@VersionID, 'features', '版本详情展示', '提供详细的版本更新内容展示，包括更新分类和重要程度标识', 3, 0),
    
    (@VersionID, 'fixes', '页面样式修复', '修复版本更新页面中样式显示异常的问题', 4, 0),
    (@VersionID, 'fixes', '数据加载异常修复', '解决版本详情数据无法正确加载的问题', 5, 1),
    (@VersionID, 'fixes', '权限验证问题修复', '修复版本管理功能的权限验证逻辑', 6, 0),
    (@VersionID, 'fixes', 'API接口错误修复', '修复版本更新API接口返回数据格式不一致的问题', 7, 0),
    (@VersionID, 'fixes', '前端组件渲染修复', '解决版本详情组件中更新内容无法正确渲染的问题', 8, 1),
    
    (@VersionID, 'improvements', '用户界面优化', '优化版本管理界面的用户体验，提升操作便捷性', 9, 0),
    (@VersionID, 'improvements', '系统性能提升', '优化数据库查询性能，提升页面加载速度', 10, 0),
    (@VersionID, 'improvements', '错误提示改进', '改进系统错误提示信息，提供更友好的用户反馈', 11, 0),
    (@VersionID, 'improvements', '代码结构优化', '重构版本管理相关代码，提升代码可维护性', 12, 0),
    
    (@VersionID, 'other', '文档更新', '更新版本管理功能相关的技术文档', 13, 0),
    (@VersionID, 'other', '测试用例补充', '补充版本管理功能的自动化测试用例', 14, 0),
    (@VersionID, 'other', '依赖包更新', '更新项目依赖包到最新稳定版本', 15, 0);
    
    PRINT '✅ 测试版本数据插入成功: v2.3.1';
END
ELSE
BEGIN
    PRINT '⚠️ 测试版本 v2.3.1 已存在，跳过插入';
END

-- 插入第二个测试版本
IF NOT EXISTS (SELECT * FROM VersionUpdates WHERE Version = 'v2.3.0')
BEGIN
    INSERT INTO VersionUpdates (
        Version, Title, Description, ReleaseDate, Status, 
        IsMajorUpdate, TotalCommits, FeaturesCount, FixesCount, 
        ImprovementsCount, OtherCount, ChangelogMarkdown, 
        Contributors, CreatedBy
    ) VALUES (
        'v2.3.0',
        '质量管理系统重大更新',
        '本次为重大版本更新，新增了多个核心功能模块，全面提升了系统的功能性和稳定性。',
        DATEADD(day, -7, GETDATE()),
        'published',
        1,
        25,
        8,
        3,
        6,
        8,
        '# 版本 v2.3.0 更新日志\n\n## 重大更新\n这是一个重大版本更新，包含多个核心功能的重构和优化。\n\n## 新功能\n- 全新的仪表盘界面\n- 质量指标统计功能\n- 成本计算模块\n- 工作计划管理\n\n## 系统优化\n- 数据库性能优化\n- 前端架构重构\n- API接口标准化',
        '["系统管理员", "开发团队", "测试团队"]',
        1
    );
    
    DECLARE @Version2ID INT = SCOPE_IDENTITY();
    
    -- 插入版本更新项目数据
    INSERT INTO VersionUpdateItems (VersionUpdateID, Category, Title, Description, SortOrder, IsHighlight) VALUES
    (@Version2ID, 'features', '全新仪表盘界面', '重新设计的仪表盘界面，提供更直观的数据展示', 1, 1),
    (@Version2ID, 'features', '质量指标统计', '新增质量指标统计功能，支持多维度数据分析', 2, 1),
    (@Version2ID, 'features', '成本计算模块', '完整的成本计算体系，支持自动化成本核算', 3, 1),
    (@Version2ID, 'features', '工作计划管理', '新增工作计划管理功能，支持任务分配和进度跟踪', 4, 0),
    
    (@Version2ID, 'improvements', '数据库性能优化', '全面优化数据库查询性能，提升系统响应速度', 5, 1),
    (@Version2ID, 'improvements', '前端架构重构', '重构前端代码架构，提升开发效率和维护性', 6, 0),
    (@Version2ID, 'improvements', 'API接口标准化', '统一API接口规范，提升接口的一致性和可维护性', 7, 0);
    
    PRINT '✅ 测试版本数据插入成功: v2.3.0';
END
ELSE
BEGIN
    PRINT '⚠️ 测试版本 v2.3.0 已存在，跳过插入';
END

PRINT '✅ 版本更新测试数据插入完成！';
PRINT '📋 现在可以测试版本更新功能了。';