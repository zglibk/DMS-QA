-- =====================================================
-- 不良类别和不良项表结构升级脚本
-- 功能：支持不良项同时属于多个不良类别（多对多关系）
-- 版本：v1.0
-- 创建日期：2025-12-16
-- =====================================================

USE [DMS-QA];

PRINT '开始升级不良类别和不良项表结构...';

-- =====================================================
-- 1. 扩展 DefectiveCategory 表（增加描述、排序、状态字段）
-- =====================================================
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('[dbo].[DefectiveCategory]') AND name = 'Description')
BEGIN
    ALTER TABLE [dbo].[DefectiveCategory] ADD [Description] NVARCHAR(200) NULL;
    PRINT '✅ DefectiveCategory 表添加 Description 字段成功';
END

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('[dbo].[DefectiveCategory]') AND name = 'SortOrder')
BEGIN
    ALTER TABLE [dbo].[DefectiveCategory] ADD [SortOrder] INT DEFAULT 0;
    PRINT '✅ DefectiveCategory 表添加 SortOrder 字段成功';
END

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('[dbo].[DefectiveCategory]') AND name = 'IsActive')
BEGIN
    ALTER TABLE [dbo].[DefectiveCategory] ADD [IsActive] BIT DEFAULT 1;
    PRINT '✅ DefectiveCategory 表添加 IsActive 字段成功';
END

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('[dbo].[DefectiveCategory]') AND name = 'CreatedAt')
BEGIN
    ALTER TABLE [dbo].[DefectiveCategory] ADD [CreatedAt] DATETIME DEFAULT GETDATE();
    PRINT '✅ DefectiveCategory 表添加 CreatedAt 字段成功';
END

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('[dbo].[DefectiveCategory]') AND name = 'UpdatedAt')
BEGIN
    ALTER TABLE [dbo].[DefectiveCategory] ADD [UpdatedAt] DATETIME DEFAULT GETDATE();
    PRINT '✅ DefectiveCategory 表添加 UpdatedAt 字段成功';
END

-- =====================================================
-- 2. 扩展 DefectiveItem 表（增加描述、排序、状态字段）
-- =====================================================
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('[dbo].[DefectiveItem]') AND name = 'Description')
BEGIN
    ALTER TABLE [dbo].[DefectiveItem] ADD [Description] NVARCHAR(500) NULL;
    PRINT '✅ DefectiveItem 表添加 Description 字段成功';
END

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('[dbo].[DefectiveItem]') AND name = 'SortOrder')
BEGIN
    ALTER TABLE [dbo].[DefectiveItem] ADD [SortOrder] INT DEFAULT 0;
    PRINT '✅ DefectiveItem 表添加 SortOrder 字段成功';
END

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('[dbo].[DefectiveItem]') AND name = 'IsActive')
BEGIN
    ALTER TABLE [dbo].[DefectiveItem] ADD [IsActive] BIT DEFAULT 1;
    PRINT '✅ DefectiveItem 表添加 IsActive 字段成功';
END

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('[dbo].[DefectiveItem]') AND name = 'CreatedAt')
BEGIN
    ALTER TABLE [dbo].[DefectiveItem] ADD [CreatedAt] DATETIME DEFAULT GETDATE();
    PRINT '✅ DefectiveItem 表添加 CreatedAt 字段成功';
END

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('[dbo].[DefectiveItem]') AND name = 'UpdatedAt')
BEGIN
    ALTER TABLE [dbo].[DefectiveItem] ADD [UpdatedAt] DATETIME DEFAULT GETDATE();
    PRINT '✅ DefectiveItem 表添加 UpdatedAt 字段成功';
END

-- =====================================================
-- 3. 创建不良项-类别关联表（多对多关系）
-- =====================================================
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[DefectiveItemCategory]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[DefectiveItemCategory] (
        [ID] INT IDENTITY(1,1) PRIMARY KEY,
        [ItemID] INT NOT NULL,                    -- 不良项ID
        [CategoryID] INT NOT NULL,                -- 类别ID
        [CreatedAt] DATETIME DEFAULT GETDATE(),   -- 创建时间
        
        CONSTRAINT FK_DefectiveItemCategory_Item 
            FOREIGN KEY (ItemID) REFERENCES [dbo].[DefectiveItem](ID) ON DELETE CASCADE,
        CONSTRAINT FK_DefectiveItemCategory_Category 
            FOREIGN KEY (CategoryID) REFERENCES [dbo].[DefectiveCategory](ID) ON DELETE CASCADE,
        CONSTRAINT UK_DefectiveItemCategory_ItemCategory 
            UNIQUE (ItemID, CategoryID)           -- 唯一约束，防止重复关联
    );
    PRINT '✅ DefectiveItemCategory 关联表创建成功';
END
ELSE
BEGIN
    PRINT '⚠️ DefectiveItemCategory 关联表已存在，跳过创建';
END

-- =====================================================
-- 4. 迁移现有数据到新的关联表
-- =====================================================
IF EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('[dbo].[DefectiveItem]') AND name = 'CategoryID')
BEGIN
    -- 检查是否有数据需要迁移
    IF EXISTS (SELECT 1 FROM [dbo].[DefectiveItem] WHERE CategoryID IS NOT NULL)
    BEGIN
        -- 迁移现有的单一关联关系到多对多关联表
        INSERT INTO [dbo].[DefectiveItemCategory] (ItemID, CategoryID)
        SELECT ID, CategoryID 
        FROM [dbo].[DefectiveItem] 
        WHERE CategoryID IS NOT NULL
        AND NOT EXISTS (
            SELECT 1 FROM [dbo].[DefectiveItemCategory] dic 
            WHERE dic.ItemID = [DefectiveItem].ID AND dic.CategoryID = [DefectiveItem].CategoryID
        );
        PRINT '✅ 已将现有关联数据迁移到 DefectiveItemCategory 表';
    END
    ELSE
    BEGIN
        PRINT '⚠️ DefectiveItem 表中没有需要迁移的关联数据';
    END
END

-- =====================================================
-- 5. 创建索引优化查询性能
-- =====================================================
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_DefectiveItemCategory_ItemID')
BEGIN
    CREATE NONCLUSTERED INDEX [IX_DefectiveItemCategory_ItemID] 
    ON [dbo].[DefectiveItemCategory] ([ItemID]);
    PRINT '✅ DefectiveItemCategory ItemID 索引创建成功';
END

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_DefectiveItemCategory_CategoryID')
BEGIN
    CREATE NONCLUSTERED INDEX [IX_DefectiveItemCategory_CategoryID] 
    ON [dbo].[DefectiveItemCategory] ([CategoryID]);
    PRINT '✅ DefectiveItemCategory CategoryID 索引创建成功';
END

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_DefectiveCategory_IsActive')
BEGIN
    CREATE NONCLUSTERED INDEX [IX_DefectiveCategory_IsActive] 
    ON [dbo].[DefectiveCategory] ([IsActive]);
    PRINT '✅ DefectiveCategory IsActive 索引创建成功';
END

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_DefectiveItem_IsActive')
BEGIN
    CREATE NONCLUSTERED INDEX [IX_DefectiveItem_IsActive] 
    ON [dbo].[DefectiveItem] ([IsActive]);
    PRINT '✅ DefectiveItem IsActive 索引创建成功';
END

-- =====================================================
-- 6. 创建视图：获取不良项及其关联的所有类别
-- =====================================================
IF EXISTS (SELECT * FROM sys.views WHERE name = 'V_DefectiveItemWithCategories')
BEGIN
    DROP VIEW [dbo].[V_DefectiveItemWithCategories];
END
GO

CREATE VIEW [dbo].[V_DefectiveItemWithCategories] AS
SELECT 
    di.ID AS ItemID,
    di.Name AS ItemName,
    di.Description AS ItemDescription,
    di.SortOrder AS ItemSortOrder,
    di.IsActive AS ItemIsActive,
    di.CreatedAt AS ItemCreatedAt,
    di.UpdatedAt AS ItemUpdatedAt,
    dc.ID AS CategoryID,
    dc.Name AS CategoryName,
    dc.Description AS CategoryDescription
FROM [dbo].[DefectiveItem] di
LEFT JOIN [dbo].[DefectiveItemCategory] dic ON di.ID = dic.ItemID
LEFT JOIN [dbo].[DefectiveCategory] dc ON dic.CategoryID = dc.ID;
GO

PRINT '✅ V_DefectiveItemWithCategories 视图创建成功';

-- =====================================================
-- 7. 添加菜单项
-- =====================================================
-- 检查是否已存在不良类别管理菜单
IF NOT EXISTS (SELECT 1 FROM [dbo].[Menus] WHERE MenuCode = 'defective-management')
BEGIN
    -- 获取质量管理菜单ID
    DECLARE @qualityMenuId INT;
    SELECT @qualityMenuId = ID FROM [dbo].[Menus] WHERE MenuCode = 'quality';
    
    -- 如果质量管理菜单不存在，尝试获取系统管理菜单
    IF @qualityMenuId IS NULL
    BEGIN
        SELECT @qualityMenuId = ID FROM [dbo].[Menus] WHERE MenuCode = 'system';
    END
    
    -- 插入不良类别管理菜单
    INSERT INTO [dbo].[Menus] (
        [ParentID], [MenuCode], [MenuName], [MenuType], [Icon], 
        [Path], [Component], [Permission], [SortOrder], [Visible], [Status], [Description]
    ) VALUES (
        @qualityMenuId, 
        'defective-management', 
        N'不良类别管理', 
        'menu', 
        'Warning', 
        '/admin/quality/defective-management', 
        'admin/quality/DefectiveManagement', 
        'quality:defective:view', 
        35, 
        1, 
        1, 
        N'管理不良类别和不良项数据'
    );
    
    PRINT '✅ 不良类别管理菜单添加成功';
    
    -- 获取新插入菜单的ID
    DECLARE @defectiveMenuId INT = SCOPE_IDENTITY();
    
    -- 添加按钮权限
    INSERT INTO [dbo].[Menus] (
        [ParentID], [MenuCode], [MenuName], [MenuType], [Permission], [SortOrder], [Visible], [Status]
    ) VALUES 
    (@defectiveMenuId, 'defective-category-add', N'新增类别', 'button', 'quality:defective:category:add', 1, 1, 1),
    (@defectiveMenuId, 'defective-category-edit', N'编辑类别', 'button', 'quality:defective:category:edit', 2, 1, 1),
    (@defectiveMenuId, 'defective-category-delete', N'删除类别', 'button', 'quality:defective:category:delete', 3, 1, 1),
    (@defectiveMenuId, 'defective-item-add', N'新增不良项', 'button', 'quality:defective:item:add', 4, 1, 1),
    (@defectiveMenuId, 'defective-item-edit', N'编辑不良项', 'button', 'quality:defective:item:edit', 5, 1, 1),
    (@defectiveMenuId, 'defective-item-delete', N'删除不良项', 'button', 'quality:defective:item:delete', 6, 1, 1);
    
    PRINT '✅ 不良类别管理按钮权限添加成功';
END
ELSE
BEGIN
    PRINT '⚠️ 不良类别管理菜单已存在，跳过添加';
END

-- =====================================================
-- 8. 为管理员角色分配新菜单权限
-- =====================================================
DECLARE @adminRoleId INT;
SELECT @adminRoleId = ID FROM [dbo].[Roles] WHERE RoleCode = 'admin';

IF @adminRoleId IS NOT NULL
BEGIN
    -- 获取所有新增的菜单ID
    INSERT INTO [dbo].[RoleMenus] (RoleID, MenuID)
    SELECT @adminRoleId, ID 
    FROM [dbo].[Menus] 
    WHERE MenuCode IN ('defective-management', 'defective-category-add', 'defective-category-edit', 
                       'defective-category-delete', 'defective-item-add', 'defective-item-edit', 'defective-item-delete')
    AND NOT EXISTS (
        SELECT 1 FROM [dbo].[RoleMenus] rm 
        WHERE rm.RoleID = @adminRoleId AND rm.MenuID = [Menus].ID
    );
    
    PRINT '✅ 已为管理员角色分配不良类别管理权限';
END

PRINT '';
PRINT '🎉 不良类别和不良项表结构升级完成！';
PRINT '';
PRINT '变更说明：';
PRINT '1. DefectiveCategory 表新增字段：Description, SortOrder, IsActive, CreatedAt, UpdatedAt';
PRINT '2. DefectiveItem 表新增字段：Description, SortOrder, IsActive, CreatedAt, UpdatedAt';
PRINT '3. 新建 DefectiveItemCategory 关联表，支持多对多关系';
PRINT '4. 已将现有单一关联数据迁移到新的关联表';
PRINT '5. 新增 V_DefectiveItemWithCategories 视图';
PRINT '6. 新增不良类别管理菜单及按钮权限';
PRINT '';
PRINT '注意：原 DefectiveItem.CategoryID 字段保留用于向后兼容，新功能请使用 DefectiveItemCategory 表';
