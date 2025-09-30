-- =====================================================
-- 仪器管理模块菜单配置脚本
-- 功能：为仪器管理模块添加菜单结构和权限配置
-- 创建时间：2025年
-- 版本：v1.0
-- =====================================================

PRINT '开始添加仪器管理模块菜单...';

-- =====================================================
-- 1. 添加仪器管理主菜单
-- =====================================================
DECLARE @InstrumentMenuId INT;

-- 检查仪器管理主菜单是否已存在
IF NOT EXISTS (SELECT 1 FROM [dbo].[Menus] WHERE MenuCode = 'instrument-management')
BEGIN
    INSERT INTO [dbo].[Menus] (
        [ParentID], [MenuCode], [MenuName], [MenuType], [Icon], [Path], 
        [Component], [Permission], [SortOrder], [Visible], [Status], [Description]
    ) VALUES (
        NULL, 'instrument-management', N'仪器管理', 'menu', 'Experiment', '/admin/instruments', 
        NULL, 'instrument:view', 80, 1, 1, N'仪器设备管理模块，包含仪器台账、校准检定等功能'
    );
    
    SET @InstrumentMenuId = SCOPE_IDENTITY();
    PRINT '✅ 仪器管理主菜单添加成功，ID: ' + CAST(@InstrumentMenuId AS NVARCHAR(10));
END
ELSE
BEGIN
    SELECT @InstrumentMenuId = ID FROM [dbo].[Menus] WHERE MenuCode = 'instrument-management';
    PRINT '⚠️ 仪器管理主菜单已存在，ID: ' + CAST(@InstrumentMenuId AS NVARCHAR(10));
END

-- =====================================================
-- 2. 添加仪器台账子菜单
-- =====================================================
IF NOT EXISTS (SELECT 1 FROM [dbo].[Menus] WHERE MenuCode = 'instrument-ledger')
BEGIN
    INSERT INTO [dbo].[Menus] (
        [ParentID], [MenuCode], [MenuName], [MenuType], [Icon], [Path], 
        [Component], [Permission], [SortOrder], [Visible], [Status], [Description]
    ) VALUES (
        @InstrumentMenuId, 'instrument-ledger', N'仪器台账', 'menu', 'Database', '/admin/instruments/ledger', 
        'instruments/InstrumentLedger', 'instrument:ledger:view', 10, 1, 1, N'仪器设备台账管理，包含设备信息、管理编号等'
    );
    PRINT '✅ 仪器台账子菜单添加成功';
END
ELSE
BEGIN
    PRINT '⚠️ 仪器台账子菜单已存在，跳过添加';
END

-- =====================================================
-- 3. 添加校准检定子菜单
-- =====================================================
IF NOT EXISTS (SELECT 1 FROM [dbo].[Menus] WHERE MenuCode = 'calibration-results')
BEGIN
    INSERT INTO [dbo].[Menus] (
        [ParentID], [MenuCode], [MenuName], [MenuType], [Icon], [Path], 
        [Component], [Permission], [SortOrder], [Visible], [Status], [Description]
    ) VALUES (
        @InstrumentMenuId, 'calibration-results', N'校准检定', 'menu', 'CheckCircle', '/admin/instruments/calibration', 
        'instruments/CalibrationResults', 'instrument:calibration:view', 20, 1, 1, N'第三方校准检定结果登记和管理'
    );
    PRINT '✅ 校准检定子菜单添加成功';
END
ELSE
BEGIN
    PRINT '⚠️ 校准检定子菜单已存在，跳过添加';
END

-- =====================================================
-- 4. 添加年度计划子菜单
-- =====================================================
IF NOT EXISTS (SELECT 1 FROM [dbo].[Menus] WHERE MenuCode = 'annual-calibration-plan')
BEGIN
    INSERT INTO [dbo].[Menus] (
        [ParentID], [MenuCode], [MenuName], [MenuType], [Icon], [Path], 
        [Component], [Permission], [SortOrder], [Visible], [Status], [Description]
    ) VALUES (
        @InstrumentMenuId, 'annual-calibration-plan', N'年度计划', 'menu', 'Calendar', '/admin/instruments/annual-plan', 
        'instruments/AnnualCalibrationPlan', 'instrument:plan:view', 30, 1, 1, N'年度校准检定计划制定和实施表导出'
    );
    PRINT '✅ 年度计划子菜单添加成功';
END
ELSE
BEGIN
    PRINT '⚠️ 年度计划子菜单已存在，跳过添加';
END

-- =====================================================
-- 5. 添加仪器台账操作权限按钮
-- =====================================================
-- 新增仪器权限
IF NOT EXISTS (SELECT 1 FROM [dbo].[Menus] WHERE MenuCode = 'instrument-ledger-add')
BEGIN
    INSERT INTO [dbo].[Menus] (
        [ParentID], [MenuCode], [MenuName], [MenuType], [Icon], [Path], 
        [Component], [Permission], [SortOrder], [Visible], [Status], [Description]
    ) VALUES (
        (SELECT ID FROM [dbo].[Menus] WHERE MenuCode = 'instrument-ledger'), 
        'instrument-ledger-add', N'新增仪器', 'button', '', '', 
        '', 'instrument:ledger:add', 10, 0, 1, N'新增仪器设备的权限'
    );
    PRINT '✅ 新增仪器权限添加成功';
END

-- 编辑仪器权限
IF NOT EXISTS (SELECT 1 FROM [dbo].[Menus] WHERE MenuCode = 'instrument-ledger-edit')
BEGIN
    INSERT INTO [dbo].[Menus] (
        [ParentID], [MenuCode], [MenuName], [MenuType], [Icon], [Path], 
        [Component], [Permission], [SortOrder], [Visible], [Status], [Description]
    ) VALUES (
        (SELECT ID FROM [dbo].[Menus] WHERE MenuCode = 'instrument-ledger'), 
        'instrument-ledger-edit', N'编辑仪器', 'button', '', '', 
        '', 'instrument:ledger:edit', 20, 0, 1, N'编辑仪器设备信息的权限'
    );
    PRINT '✅ 编辑仪器权限添加成功';
END

-- 删除仪器权限
IF NOT EXISTS (SELECT 1 FROM [dbo].[Menus] WHERE MenuCode = 'instrument-ledger-delete')
BEGIN
    INSERT INTO [dbo].[Menus] (
        [ParentID], [MenuCode], [MenuName], [MenuType], [Icon], [Path], 
        [Component], [Permission], [SortOrder], [Visible], [Status], [Description]
    ) VALUES (
        (SELECT ID FROM [dbo].[Menus] WHERE MenuCode = 'instrument-ledger'), 
        'instrument-ledger-delete', N'删除仪器', 'button', '', '', 
        '', 'instrument:ledger:delete', 30, 0, 1, N'删除仪器设备的权限'
    );
    PRINT '✅ 删除仪器权限添加成功';
END

-- =====================================================
-- 6. 添加校准检定操作权限按钮
-- =====================================================
-- 新增校准记录权限
IF NOT EXISTS (SELECT 1 FROM [dbo].[Menus] WHERE MenuCode = 'calibration-results-add')
BEGIN
    INSERT INTO [dbo].[Menus] (
        [ParentID], [MenuCode], [MenuName], [MenuType], [Icon], [Path], 
        [Component], [Permission], [SortOrder], [Visible], [Status], [Description]
    ) VALUES (
        (SELECT ID FROM [dbo].[Menus] WHERE MenuCode = 'calibration-results'), 
        'calibration-results-add', N'新增校准记录', 'button', '', '', 
        '', 'instrument:calibration:add', 10, 0, 1, N'新增校准检定记录的权限'
    );
    PRINT '✅ 新增校准记录权限添加成功';
END

-- 编辑校准记录权限
IF NOT EXISTS (SELECT 1 FROM [dbo].[Menus] WHERE MenuCode = 'calibration-results-edit')
BEGIN
    INSERT INTO [dbo].[Menus] (
        [ParentID], [MenuCode], [MenuName], [MenuType], [Icon], [Path], 
        [Component], [Permission], [SortOrder], [Visible], [Status], [Description]
    ) VALUES (
        (SELECT ID FROM [dbo].[Menus] WHERE MenuCode = 'calibration-results'), 
        'calibration-results-edit', N'编辑校准记录', 'button', '', '', 
        '', 'instrument:calibration:edit', 20, 0, 1, N'编辑校准检定记录的权限'
    );
    PRINT '✅ 编辑校准记录权限添加成功';
END

-- 删除校准记录权限
IF NOT EXISTS (SELECT 1 FROM [dbo].[Menus] WHERE MenuCode = 'calibration-results-delete')
BEGIN
    INSERT INTO [dbo].[Menus] (
        [ParentID], [MenuCode], [MenuName], [MenuType], [Icon], [Path], 
        [Component], [Permission], [SortOrder], [Visible], [Status], [Description]
    ) VALUES (
        (SELECT ID FROM [dbo].[Menus] WHERE MenuCode = 'calibration-results'), 
        'calibration-results-delete', N'删除校准记录', 'button', '', '', 
        '', 'instrument:calibration:delete', 30, 0, 1, N'删除校准检定记录的权限'
    );
    PRINT '✅ 删除校准记录权限添加成功';
END

-- =====================================================
-- 7. 添加年度计划操作权限按钮
-- =====================================================
-- 制定年度计划权限
IF NOT EXISTS (SELECT 1 FROM [dbo].[Menus] WHERE MenuCode = 'annual-plan-create')
BEGIN
    INSERT INTO [dbo].[Menus] (
        [ParentID], [MenuCode], [MenuName], [MenuType], [Icon], [Path], 
        [Component], [Permission], [SortOrder], [Visible], [Status], [Description]
    ) VALUES (
        (SELECT ID FROM [dbo].[Menus] WHERE MenuCode = 'annual-calibration-plan'), 
        'annual-plan-create', N'制定年度计划', 'button', '', '', 
        '', 'instrument:plan:create', 10, 0, 1, N'制定年度校准检定计划的权限'
    );
    PRINT '✅ 制定年度计划权限添加成功';
END

-- 导出计划表权限
IF NOT EXISTS (SELECT 1 FROM [dbo].[Menus] WHERE MenuCode = 'annual-plan-export')
BEGIN
    INSERT INTO [dbo].[Menus] (
        [ParentID], [MenuCode], [MenuName], [MenuType], [Icon], [Path], 
        [Component], [Permission], [SortOrder], [Visible], [Status], [Description]
    ) VALUES (
        (SELECT ID FROM [dbo].[Menus] WHERE MenuCode = 'annual-calibration-plan'), 
        'annual-plan-export', N'导出计划表', 'button', '', '', 
        '', 'instrument:plan:export', 20, 0, 1, N'导出年度检定计划和实施表的权限'
    );
    PRINT '✅ 导出计划表权限添加成功';
END

-- =====================================================
-- 8. 为管理员角色分配菜单权限
-- =====================================================
DECLARE @AdminRoleId INT = (SELECT ID FROM [dbo].[Roles] WHERE RoleCode = 'admin');

IF @AdminRoleId IS NOT NULL
BEGIN
    -- 获取所有仪器管理相关菜单ID
    DECLARE @MenuIds TABLE (MenuId INT);
    INSERT INTO @MenuIds (MenuId)
    SELECT ID FROM [dbo].[Menus] 
    WHERE MenuCode IN (
        'instrument-management', 'instrument-ledger', 'calibration-results', 'annual-calibration-plan',
        'instrument-ledger-add', 'instrument-ledger-edit', 'instrument-ledger-delete',
        'calibration-results-add', 'calibration-results-edit', 'calibration-results-delete',
        'annual-plan-create', 'annual-plan-export'
    );
    
    -- 为管理员角色分配菜单权限
    INSERT INTO [dbo].[RoleMenus] ([RoleID], [MenuID], [CreatedAt])
    SELECT @AdminRoleId, MenuId, GETDATE()
    FROM @MenuIds 
    WHERE NOT EXISTS (
        SELECT 1 FROM [dbo].[RoleMenus] 
        WHERE RoleID = @AdminRoleId AND MenuID = MenuId
    );
    
    PRINT '✅ 管理员角色菜单权限分配完成';
END
ELSE
BEGIN
    PRINT '⚠️ 管理员角色不存在，跳过权限分配';
END

-- =====================================================
-- 9. 显示添加结果
-- =====================================================
PRINT '';
PRINT '📋 仪器管理模块菜单添加完成！';
PRINT '';
PRINT '已添加的菜单结构：';
PRINT '  🔬 仪器管理 (instrument-management)';
PRINT '    ├── 📊 仪器台账 (instrument-ledger)';
PRINT '    │   ├── ➕ 新增仪器 (instrument-ledger-add)';
PRINT '    │   ├── ✏️ 编辑仪器 (instrument-ledger-edit)';
PRINT '    │   └── 🗑️ 删除仪器 (instrument-ledger-delete)';
PRINT '    ├── ✅ 校准检定 (calibration-results)';
PRINT '    │   ├── ➕ 新增校准记录 (calibration-results-add)';
PRINT '    │   ├── ✏️ 编辑校准记录 (calibration-results-edit)';
PRINT '    │   └── 🗑️ 删除校准记录 (calibration-results-delete)';
PRINT '    └── 📅 年度计划 (annual-calibration-plan)';
PRINT '        ├── 📝 制定年度计划 (annual-plan-create)';
PRINT '        └── 📤 导出计划表 (annual-plan-export)';
PRINT '';
PRINT '菜单路径：';
PRINT '  - 仪器台账：/admin/instruments/ledger';
PRINT '  - 校准检定：/admin/instruments/calibration';
PRINT '  - 年度计划：/admin/instruments/annual-plan';
PRINT '';
PRINT '权限标识：';
PRINT '  - 仪器管理：instrument:view';
PRINT '  - 仪器台账：instrument:ledger:*';
PRINT '  - 校准检定：instrument:calibration:*';
PRINT '  - 年度计划：instrument:plan:*';
PRINT '';
PRINT '下一步：';
PRINT '  1. 重启前端应用以加载新菜单';
PRINT '  2. 创建对应的Vue组件文件';
PRINT '  3. 配置前端路由';
PRINT '  4. 测试菜单权限功能';
PRINT '';