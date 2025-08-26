-- =====================================================
-- ERP菜单名称更新脚本
-- 功能：将侧边栏中的"ERP管理"改为"ERP对接"
-- 版本：v1.0
-- 创建日期：2025-01-27
-- =====================================================

USE [DMS-QA];
GO

PRINT '开始更新ERP菜单名称...';

-- =====================================================
-- 1. 查找ERP管理菜单
-- =====================================================
DECLARE @ErpMenuId INT;
SELECT @ErpMenuId = ID FROM [dbo].[Menus] WHERE MenuCode = 'erp-management';

IF @ErpMenuId IS NULL
BEGIN
    PRINT '❌ 错误：未找到ERP管理菜单';
    RETURN;
END
ELSE
BEGIN
    PRINT '✅ 找到ERP管理菜单，ID: ' + CAST(@ErpMenuId AS NVARCHAR(10));
END

-- =====================================================
-- 2. 更新菜单名称
-- =====================================================
UPDATE [dbo].[Menus] 
SET [MenuName] = N'ERP对接',
    [UpdatedAt] = GETDATE()
WHERE MenuCode = 'erp-management';

PRINT '✅ ERP菜单名称更新成功：ERP管理 → ERP对接';

-- =====================================================
-- 3. 验证更新结果
-- =====================================================
PRINT '';
PRINT '📋 验证更新结果：';

SELECT 
    p.MenuName AS ParentMenu,
    m.MenuName AS MenuName,
    m.MenuCode,
    m.Path,
    m.Component,
    m.Icon,
    m.Permission,
    m.SortOrder,
    CASE WHEN m.Status = 1 THEN '启用' ELSE '禁用' END AS Status,
    m.UpdatedAt
FROM [dbo].[Menus] m
LEFT JOIN [dbo].[Menus] p ON m.ParentID = p.ID
WHERE m.MenuCode = 'erp-management'
ORDER BY m.SortOrder;

-- =====================================================
-- 4. 显示完成信息
-- =====================================================
PRINT '';
PRINT '🎉 ERP菜单名称更新完成！';
PRINT '';
PRINT '📁 更新后的菜单结构：';
PRINT '  系统管理 (system)';
PRINT '    └── ERP对接 (erp-management)';
PRINT '';
PRINT '📝 更新说明：';
PRINT '  - 菜单名称：ERP管理 → ERP对接';
PRINT '  - 菜单编码：erp-management（保持不变）';
PRINT '  - 访问路径：/system/erp（保持不变）';
PRINT '  - Vue组件：admin/ErpManagement（保持不变）';
PRINT '  - 权限标识：system:erp:view（保持不变）';
PRINT '';
PRINT '下一步：';
PRINT '  1. 重启前端应用以加载更新后的菜单名称';
PRINT '  2. 确认侧边栏显示正确的菜单名称';
PRINT '';

GO