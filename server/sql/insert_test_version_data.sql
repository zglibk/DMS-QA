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
END

-- 插入第二个测试版本
-- 版本更新测试数据插入脚本
-- 用于测试版本更新功能

-- 检查并插入测试版本数据
IF NOT EXISTS (SELECT 1 FROM VersionUpdates WHERE version_number = 'v2.3.0')
BEGIN
    INSERT INTO VersionUpdates (
        version_number,
        version_name,
        release_date,
        description,
        update_type,
        is_mandatory,
        download_url,
        file_size,
        checksum,
        min_supported_version,
        created_by,
        status
    ) VALUES (
        'v2.3.0',
        '质量管理系统优化版本',
        '2024-01-15',
        '本次更新包含以下改进：
        1. 优化考核记录管理界面
        2. 增强数据导出功能
        3. 修复已知问题
        4. 提升系统性能',
        'minor',
        0,
        'https://releases.example.com/dms-qa/v2.3.0/setup.exe',
        15728640,
        'sha256:a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456',
        'v2.0.0',
        'system',
        'published'
    );
    
    -- 插入版本更新详细项目
    DECLARE @version_id INT = SCOPE_IDENTITY();
    
    INSERT INTO VersionUpdateItems (
        version_id,
        item_type,
        title,
        description,
        priority,
        category
    ) VALUES 
    (@version_id, 'feature', '考核记录管理优化', '优化考核记录的添加、编辑和查询功能，提升用户体验', 'high', 'enhancement'),
    (@version_id, 'feature', '数据导出增强', '支持更多格式的数据导出，包括Excel、PDF等', 'medium', 'feature'),
    (@version_id, 'bugfix', '修复数据统计错误', '修复在特定条件下数据统计不准确的问题', 'high', 'bugfix'),
    (@version_id, 'improvement', '性能优化', '优化数据库查询性能，提升页面加载速度', 'medium', 'performance'),
    (@version_id, 'security', '安全性增强', '加强用户权限验证和数据安全保护', 'high', 'security');
END
GO
    
    PRINT '✅ 测试版本数据插入成功: v2.3.0';
END
ELSE
BEGIN
    PRINT '⚠️ 测试版本 v2.3.0 已存在，跳过插入';
END

PRINT '✅ 版本更新测试数据插入完成！';
PRINT '📋 现在可以测试版本更新功能了。';