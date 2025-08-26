-- =====================================================
-- 质量成本统计菜单和权限配置脚本
-- 功能：为质量成本统计功能添加菜单项和用户角色权限
-- 创建时间：2025-01-21
-- =====================================================

PRINT N'开始添加质量成本统计菜单和权限配置...';

-- =====================================================
-- 1. 检查并添加成本损失主菜单（如果不存在）
-- =====================================================
IF NOT EXISTS (SELECT 1 FROM [dbo].[Menus] WHERE MenuCode = 'copq')
BEGIN
    INSERT INTO [dbo].[Menus] (
        [MenuCode], [MenuName], [MenuType], [Icon], [Path], [Permission], 
        [SortOrder], [Visible], [Status], [Description]
    ) VALUES (
        'copq', N'成本损失', 'menu', 'Money', '/copq', 'copq:view', 
        30, 1, 1, N'质量成本损失管理模块'
    );
    PRINT N'✅ 成本损失主菜单添加成功';
END
ELSE
BEGIN
    PRINT N'⚠️ 成本损失主菜单已存在，跳过添加';
END

-- =====================================================
-- 2. 获取成本损失主菜单ID
-- =====================================================
DECLARE @CopqMenuId INT = (SELECT ID FROM [dbo].[Menus] WHERE MenuCode = 'copq');

IF @CopqMenuId IS NULL
BEGIN
    PRINT N'❌ 错误：无法找到成本损失主菜单ID';
    RETURN;
END

-- =====================================================
-- 3. 添加质量成本统计子菜单
-- =====================================================
IF NOT EXISTS (SELECT 1 FROM [dbo].[Menus] WHERE MenuCode = 'quality-cost-statistics')
BEGIN
    INSERT INTO [dbo].[Menus] (
        [ParentID], [MenuCode], [MenuName], [MenuType], [Icon], [Path], 
        [Component], [Permission], [SortOrder], [Visible], [Status], [Description]
    ) VALUES (
        @CopqMenuId, 'quality-cost-statistics', N'质量成本统计', 'menu', 'PieChart', 
        '/copq/quality-cost-statistics', 'copq/quality-cost-statistics/index', 
        'copq:statistics:view', 20, 1, 1, N'质量成本损失统计分析'
    );
    PRINT N'✅ 质量成本统计子菜单添加成功';
END
ELSE
BEGIN
    PRINT N'⚠️ 质量成本统计子菜单已存在，跳过添加';
END

-- =====================================================
-- 4. 添加质量成本统计相关的按钮权限
-- =====================================================
DECLARE @QualityCostStatisticsMenuId INT = (SELECT ID FROM [dbo].[Menus] WHERE MenuCode = 'quality-cost-statistics');

IF @QualityCostStatisticsMenuId IS NOT NULL
BEGIN
    -- 查看权限（已在主菜单中定义）
    
    -- 导出权限
    IF NOT EXISTS (SELECT 1 FROM [dbo].[Menus] WHERE MenuCode = 'quality-cost-export')
    BEGIN
        INSERT INTO [dbo].[Menus] (
            [ParentID], [MenuCode], [MenuName], [MenuType], [Icon], [Path], 
            [Component], [Permission], [SortOrder], [Visible], [Status], [Description]
        ) VALUES (
            @QualityCostStatisticsMenuId, 'quality-cost-export', N'导出统计', 'button', NULL, NULL, 
            NULL, 'copq:statistics:export', 10, 1, 1, N'导出质量成本统计数据'
        );
        PRINT N'✅ 质量成本统计导出权限添加成功';
    END
    
    -- 筛选权限
    IF NOT EXISTS (SELECT 1 FROM [dbo].[Menus] WHERE MenuCode = 'quality-cost-filter')
    BEGIN
        INSERT INTO [dbo].[Menus] (
            [ParentID], [MenuCode], [MenuName], [MenuType], [Icon], [Path], 
            [Component], [Permission], [SortOrder], [Visible], [Status], [Description]
        ) VALUES (
            @QualityCostStatisticsMenuId, 'quality-cost-filter', N'数据筛选', 'button', NULL, NULL, 
            NULL, 'copq:statistics:filter', 20, 1, 1, N'筛选质量成本统计数据'
        );
        PRINT N'✅ 质量成本统计筛选权限添加成功';
    END
    
    -- 详细查看权限
    IF NOT EXISTS (SELECT 1 FROM [dbo].[Menus] WHERE MenuCode = 'quality-cost-detail')
    BEGIN
        INSERT INTO [dbo].[Menus] (
            [ParentID], [MenuCode], [MenuName], [MenuType], [Icon], [Path], 
            [Component], [Permission], [SortOrder], [Visible], [Status], [Description]
        ) VALUES (
            @QualityCostStatisticsMenuId, 'quality-cost-detail', N'详细查看', 'button', NULL, NULL, 
            NULL, 'copq:statistics:detail', 30, 1, 1, N'查看质量成本详细信息'
        );
        PRINT N'✅ 质量成本统计详细查看权限添加成功';
    END
END

-- =====================================================
-- 5. 为系统管理员角色分配新菜单权限
-- =====================================================
DECLARE @AdminRoleId INT = (SELECT ID FROM [dbo].[Roles] WHERE RoleCode = 'admin');

IF @AdminRoleId IS NOT NULL
BEGIN
    -- 获取所有新添加的质量成本统计相关菜单ID
    DECLARE @NewMenuIds TABLE (MenuId INT);
    INSERT INTO @NewMenuIds (MenuId)
    SELECT ID FROM [dbo].[Menus] 
    WHERE MenuCode IN (
        'copq', 
        'quality-cost-statistics', 
        'quality-cost-export', 
        'quality-cost-filter', 
        'quality-cost-detail'
    );
    
    -- 为管理员角色分配菜单权限
    INSERT INTO [dbo].[RoleMenus] ([RoleID], [MenuID])
    SELECT @AdminRoleId, MenuId 
    FROM @NewMenuIds 
    WHERE NOT EXISTS (
        SELECT 1 FROM [dbo].[RoleMenus] 
        WHERE RoleID = @AdminRoleId AND MenuID = MenuId
    );
    
    PRINT N'✅ 管理员角色菜单权限分配完成';
END
ELSE
BEGIN
    PRINT N'❌ 错误：无法找到管理员角色';
END

-- =====================================================
-- 6. 为质量经理角色分配质量成本统计权限
-- =====================================================
DECLARE @QualityManagerRoleId INT = (SELECT ID FROM [dbo].[Roles] WHERE RoleCode = 'quality_manager');

IF @QualityManagerRoleId IS NOT NULL
BEGIN
    -- 为质量经理分配质量成本统计相关权限
    INSERT INTO [dbo].[RoleMenus] ([RoleID], [MenuID])
    SELECT @QualityManagerRoleId, ID 
    FROM [dbo].[Menus] 
    WHERE MenuCode IN (
        'copq', 
        'quality-cost-statistics', 
        'quality-cost-export', 
        'quality-cost-filter', 
        'quality-cost-detail'
    )
    AND NOT EXISTS (
        SELECT 1 FROM [dbo].[RoleMenus] 
        WHERE RoleID = @QualityManagerRoleId AND MenuID = [dbo].[Menus].ID
    );
    
    PRINT N'✅ 质量经理角色菜单权限分配完成';
END
ELSE
BEGIN
    PRINT N'⚠️ 质量经理角色不存在，跳过权限分配';
END

-- =====================================================
-- 7. 为部门经理角色分配质量成本统计查看权限
-- =====================================================
DECLARE @ManagerRoleId INT = (SELECT ID FROM [dbo].[Roles] WHERE RoleCode = 'manager');

IF @ManagerRoleId IS NOT NULL
BEGIN
    -- 为部门经理分配查看权限（不包括导出权限）
    INSERT INTO [dbo].[RoleMenus] ([RoleID], [MenuID])
    SELECT @ManagerRoleId, ID 
    FROM [dbo].[Menus] 
    WHERE MenuCode IN (
        'copq', 
        'quality-cost-statistics', 
        'quality-cost-filter', 
        'quality-cost-detail'
    )
    AND NOT EXISTS (
        SELECT 1 FROM [dbo].[RoleMenus] 
        WHERE RoleID = @ManagerRoleId AND MenuID = [dbo].[Menus].ID
    );
    
    PRINT N'✅ 部门经理角色菜单权限分配完成';
END
ELSE
BEGIN
    PRINT N'⚠️ 部门经理角色不存在，跳过权限分配';
END

-- =====================================================
-- 8. 验证插入结果
-- =====================================================
PRINT N'\n=== 验证菜单插入结果 ===';
SELECT 
    m.ID,
    m.ParentID,
    m.MenuCode,
    m.MenuName,
    m.MenuType,
    m.Icon,
    m.Path,
    m.Permission,
    m.SortOrder,
    m.Status
FROM [dbo].[Menus] m
WHERE m.MenuCode IN (
    'copq', 
    'quality-cost-statistics', 
    'quality-cost-export', 
    'quality-cost-filter', 
    'quality-cost-detail'
)
ORDER BY m.ParentID, m.SortOrder;

PRINT N'\n=== 验证角色权限分配结果 ===';
SELECT 
    r.RoleName,
    r.RoleCode,
    m.MenuName,
    m.MenuCode,
    m.Permission,
    rm.CreatedAt
FROM [dbo].[RoleMenus] rm
INNER JOIN [dbo].[Roles] r ON rm.RoleID = r.ID
INNER JOIN [dbo].[Menus] m ON rm.MenuID = m.ID
WHERE m.MenuCode IN (
    'copq', 
    'quality-cost-statistics', 
    'quality-cost-export', 
    'quality-cost-filter', 
    'quality-cost-detail'
)
ORDER BY r.RoleName, m.MenuCode;

PRINT N'\n✅ 质量成本统计菜单和权限配置完成！';
PRINT N'- 已添加"成本损失"主菜单（如果不存在）';
PRINT N'- 已添加"质量成本统计"子菜单';
PRINT N'- 已添加相关按钮权限（导出、筛选、详细查看）';
PRINT N'- 已为系统管理员、质量经理、部门经理角色分配相应权限';
PRINT N'- 管理员：拥有所有权限';
PRINT N'- 质量经理：拥有所有质量成本统计权限';
PRINT N'- 部门经理：拥有查看和筛选权限（不包括导出）';