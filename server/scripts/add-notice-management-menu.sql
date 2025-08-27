-- =====================================================
-- 添加通知公告管理菜单脚本
-- 功能：为系统添加通知公告管理菜单项
-- 创建日期：2025-01-26
-- =====================================================

PRINT '开始添加通知公告管理菜单...';

-- 1. 检查通知公告管理菜单是否已存在
IF NOT EXISTS (SELECT 1 FROM [dbo].[Menus] WHERE MenuCode = 'notice-management')
BEGIN
    -- 插入通知公告管理主菜单
    INSERT INTO [dbo].[Menus] (
        [ParentID], [MenuCode], [MenuName], [MenuType], [Icon], [Path], 
        [Component], [Permission], [SortOrder], [Visible], [Status], [Description]
    ) VALUES (
        NULL, -- 顶级菜单
        'notice-management', 
        N'通知公告管理', 
        'menu', 
        'Bell', 
        '/admin/notice-management', 
        'views/admin/NoticeManagement', 
        'notice:view', 
        50, -- 排序位置
        1, -- 可见
        1, -- 启用
        N'通知公告管理模块，支持发布、编辑、删除通知公告，以及查看已读未读状态'
    );
    
    DECLARE @NoticeMenuId INT = SCOPE_IDENTITY();
    PRINT '✅ 通知公告管理主菜单创建成功，ID: ' + CAST(@NoticeMenuId AS NVARCHAR(10));
    
    -- 2. 添加通知公告管理的子菜单（按钮权限）
    
    -- 发布通知按钮
    INSERT INTO [dbo].[Menus] (
        [ParentID], [MenuCode], [MenuName], [MenuType], [Icon], [Path], 
        [Component], [Permission], [SortOrder], [Visible], [Status], [Description]
    ) VALUES (
        @NoticeMenuId, 'notice-add', N'发布通知', 'button', 'Plus', 
        NULL, NULL, 'notice:add', 1, 1, 1, N'发布新的通知公告'
    );
    
    -- 编辑通知按钮
    INSERT INTO [dbo].[Menus] (
        [ParentID], [MenuCode], [MenuName], [MenuType], [Icon], [Path], 
        [Component], [Permission], [SortOrder], [Visible], [Status], [Description]
    ) VALUES (
        @NoticeMenuId, 'notice-edit', N'编辑通知', 'button', 'Edit', 
        NULL, NULL, 'notice:edit', 2, 1, 1, N'编辑现有通知公告'
    );
    
    -- 删除通知按钮
    INSERT INTO [dbo].[Menus] (
        [ParentID], [MenuCode], [MenuName], [MenuType], [Icon], [Path], 
        [Component], [Permission], [SortOrder], [Visible], [Status], [Description]
    ) VALUES (
        @NoticeMenuId, 'notice-delete', N'删除通知', 'button', 'Delete', 
        NULL, NULL, 'notice:delete', 3, 1, 1, N'删除通知公告'
    );
    
    -- 标记已读按钮
    INSERT INTO [dbo].[Menus] (
        [ParentID], [MenuCode], [MenuName], [MenuType], [Icon], [Path], 
        [Component], [Permission], [SortOrder], [Visible], [Status], [Description]
    ) VALUES (
        @NoticeMenuId, 'notice-mark-read', N'标记已读', 'button', 'Check', 
        NULL, NULL, 'notice:mark-read', 4, 1, 1, N'标记通知为已读状态'
    );
    
    -- 全部已读按钮
    INSERT INTO [dbo].[Menus] (
        [ParentID], [MenuCode], [MenuName], [MenuType], [Icon], [Path], 
        [Component], [Permission], [SortOrder], [Visible], [Status], [Description]
    ) VALUES (
        @NoticeMenuId, 'notice-mark-all-read', N'全部已读', 'button', 'Check', 
        NULL, NULL, 'notice:mark-all-read', 5, 1, 1, N'将所有通知标记为已读'
    );
    
    PRINT '✅ 通知公告管理子菜单（按钮权限）创建成功';
    
END
ELSE
BEGIN
    PRINT '⚠️ 通知公告管理菜单已存在，跳过创建';
END

-- 3. 为管理员角色分配通知公告管理权限
PRINT '正在为管理员角色分配通知公告管理权限...';

-- 查找管理员角色ID
DECLARE @AdminRoleId INT;
SELECT @AdminRoleId = ID FROM [dbo].[Roles] WHERE RoleName = 'admin' OR RoleName = 'Admin' OR RoleName = 'ADMIN';

IF @AdminRoleId IS NOT NULL
BEGIN
    -- 为管理员角色分配通知公告管理相关的菜单权限
    INSERT INTO [dbo].[RoleMenus] ([RoleID], [MenuID])
    SELECT @AdminRoleId, m.ID
    FROM [dbo].[Menus] m
    WHERE m.MenuCode IN (
        'notice-management', 'notice-add', 'notice-edit', 
        'notice-delete', 'notice-mark-read', 'notice-mark-all-read'
    )
    AND NOT EXISTS (
        SELECT 1 FROM [dbo].[RoleMenus] rm 
        WHERE rm.RoleID = @AdminRoleId AND rm.MenuID = m.ID
    );
    
    PRINT '✅ 管理员角色权限分配成功';
END
ELSE
BEGIN
    PRINT '⚠️ 未找到管理员角色，请手动分配权限';
END

-- 4. 显示添加结果
PRINT '';
PRINT '=== 通知公告管理菜单添加完成 ===';
PRINT '';
PRINT '已添加的菜单项:';
PRINT '  📢 通知公告管理 (notice-management)';
PRINT '    ├── ➕ 发布通知 (notice-add)';
PRINT '    ├── ✏️ 编辑通知 (notice-edit)';
PRINT '    ├── 🗑️ 删除通知 (notice-delete)';
PRINT '    ├── ✅ 标记已读 (notice-mark-read)';
PRINT '    └── ✅ 全部已读 (notice-mark-all-read)';
PRINT '';
PRINT '已添加的权限:';
PRINT '  ✅ 页面访问权限 (notice:view)';
PRINT '  ✅ 按钮操作权限 (notice:add, notice:edit, notice:delete, notice:mark-read, notice:mark-all-read)';
PRINT '  ✅ 管理员角色权限分配';
PRINT '';
PRINT '下一步:';
PRINT '  1. 重启前端应用以加载新菜单';
PRINT '  2. 检查菜单是否正确显示';
PRINT '  3. 测试通知公告管理功能';
PRINT '  4. 为其他角色分配相应权限（如需要）';
PRINT '';

-- 查看添加结果
SELECT 
    CASE 
        WHEN m1.ID IS NULL THEN '📢 ' + m2.MenuName
        ELSE '    ├── ' + m2.MenuName
    END as '菜单结构',
    m2.MenuCode as '菜单代码',
    m2.Permission as '权限标识',
    m2.MenuType as '类型',
    CASE WHEN m2.Status = 1 THEN '启用' ELSE '禁用' END as '状态'
FROM [Menus] m2
LEFT JOIN [Menus] m1 ON m1.ID = m2.ParentID
WHERE m2.MenuCode LIKE 'notice%'
ORDER BY ISNULL(m1.SortOrder, m2.SortOrder), m2.SortOrder;

GO