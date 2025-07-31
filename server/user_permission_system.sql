-- =====================================================
-- 用户权限管理系统数据库表结构
-- 功能：完整的用户权限管理体系
-- 包括：部门管理、岗位管理、菜单管理、角色管理
-- =====================================================

USE [DMS-QA];
GO

-- =====================================================
-- 1. 部门管理表 (Departments) - 扩展现有Department表
-- 功能：支持树形结构的部门管理
-- =====================================================

-- 检查并添加部门表的扩展字段
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('[dbo].[Department]') AND name = 'ParentID')
BEGIN
    ALTER TABLE [dbo].[Department] ADD [ParentID] INT NULL;
    ALTER TABLE [dbo].[Department] ADD [DeptCode] NVARCHAR(20) NULL;
    ALTER TABLE [dbo].[Department] ADD [DeptType] NVARCHAR(20) DEFAULT 'department';
    ALTER TABLE [dbo].[Department] ADD [Leader] NVARCHAR(50) NULL;
    ALTER TABLE [dbo].[Department] ADD [Phone] NVARCHAR(20) NULL;
    ALTER TABLE [dbo].[Department] ADD [Email] NVARCHAR(100) NULL;
    ALTER TABLE [dbo].[Department] ADD [Description] NVARCHAR(500) NULL;
    ALTER TABLE [dbo].[Department] ADD [SortOrder] INT DEFAULT 0;
    ALTER TABLE [dbo].[Department] ADD [Status] BIT DEFAULT 1;
    ALTER TABLE [dbo].[Department] ADD [CreatedAt] DATETIME DEFAULT GETDATE();
    ALTER TABLE [dbo].[Department] ADD [UpdatedAt] DATETIME DEFAULT GETDATE();
    
    -- 添加外键约束
    ALTER TABLE [dbo].[Department] ADD CONSTRAINT FK_Department_Parent 
        FOREIGN KEY (ParentID) REFERENCES [dbo].[Department](ID);
    
    PRINT '部门表扩展字段添加完成';
END
ELSE
BEGIN
    PRINT '部门表扩展字段已存在';
END

-- =====================================================
-- 2. 岗位管理表 (Positions)
-- 功能：管理系统中的各种岗位职务
-- =====================================================
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Positions')
BEGIN
    CREATE TABLE [dbo].[Positions] (
        [ID] INT IDENTITY(1,1) PRIMARY KEY,
        [PositionCode] NVARCHAR(20) NOT NULL UNIQUE,    -- 岗位编码
        [PositionName] NVARCHAR(50) NOT NULL,           -- 岗位名称
        [DepartmentID] INT NULL,                        -- 所属部门
        [Level] INT DEFAULT 1,                          -- 岗位级别
        [Description] NVARCHAR(500),                    -- 岗位描述
        [Responsibilities] NVARCHAR(1000),              -- 岗位职责
        [Requirements] NVARCHAR(1000),                  -- 任职要求
        [SortOrder] INT DEFAULT 0,                      -- 排序
        [Status] BIT DEFAULT 1,                         -- 状态（1=启用，0=禁用）
        [CreatedAt] DATETIME DEFAULT GETDATE(),
        [UpdatedAt] DATETIME DEFAULT GETDATE(),
        
        CONSTRAINT FK_Positions_Department 
            FOREIGN KEY (DepartmentID) REFERENCES [dbo].[Department](ID)
    );
    
    PRINT '岗位管理表创建完成';
END
ELSE
BEGIN
    PRINT '岗位管理表已存在';
END

-- =====================================================
-- 3. 菜单管理表 (Menus)
-- 功能：管理系统菜单和权限
-- =====================================================
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Menus')
BEGIN
    CREATE TABLE [dbo].[Menus] (
        [ID] INT IDENTITY(1,1) PRIMARY KEY,
        [ParentID] INT NULL,                            -- 父菜单ID
        [MenuCode] NVARCHAR(50) NOT NULL UNIQUE,        -- 菜单编码
        [MenuName] NVARCHAR(50) NOT NULL,               -- 菜单名称
        [MenuType] NVARCHAR(10) DEFAULT 'menu',         -- 菜单类型：menu/button
        [Icon] NVARCHAR(50),                            -- 图标
        [Path] NVARCHAR(200),                           -- 路由路径
        [Component] NVARCHAR(200),                      -- 组件路径
        [Permission] NVARCHAR(100),                     -- 权限标识
        [SortOrder] INT DEFAULT 0,                      -- 排序
        [Visible] BIT DEFAULT 1,                        -- 是否显示
        [Status] BIT DEFAULT 1,                         -- 状态
        [Description] NVARCHAR(500),                    -- 描述
        [CreatedAt] DATETIME DEFAULT GETDATE(),
        [UpdatedAt] DATETIME DEFAULT GETDATE(),
        
        CONSTRAINT FK_Menus_Parent 
            FOREIGN KEY (ParentID) REFERENCES [dbo].[Menus](ID)
    );
    
    PRINT '菜单管理表创建完成';
END
ELSE
BEGIN
    PRINT '菜单管理表已存在';
END

-- =====================================================
-- 4. 角色管理表 (Roles)
-- 功能：管理系统角色
-- =====================================================
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Roles')
BEGIN
    CREATE TABLE [dbo].[Roles] (
        [ID] INT IDENTITY(1,1) PRIMARY KEY,
        [RoleCode] NVARCHAR(20) NOT NULL UNIQUE,        -- 角色编码
        [RoleName] NVARCHAR(50) NOT NULL,               -- 角色名称
        [DataScope] NVARCHAR(20) DEFAULT 'dept',        -- 数据权限范围：all/dept/self
        [DeptCheckStrictly] BIT DEFAULT 1,              -- 部门树选择项是否关联显示
        [MenuCheckStrictly] BIT DEFAULT 1,              -- 菜单树选择项是否关联显示
        [Description] NVARCHAR(500),                    -- 角色描述
        [SortOrder] INT DEFAULT 0,                      -- 排序
        [Status] BIT DEFAULT 1,                         -- 状态
        [CreatedAt] DATETIME DEFAULT GETDATE(),
        [UpdatedAt] DATETIME DEFAULT GETDATE()
    );
    
    PRINT '角色管理表创建完成';
END
ELSE
BEGIN
    PRINT '角色管理表已存在';
END

-- =====================================================
-- 5. 角色菜单关联表 (RoleMenus)
-- 功能：角色与菜单的多对多关系
-- =====================================================
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'RoleMenus')
BEGIN
    CREATE TABLE [dbo].[RoleMenus] (
        [ID] INT IDENTITY(1,1) PRIMARY KEY,
        [RoleID] INT NOT NULL,
        [MenuID] INT NOT NULL,
        [CreatedAt] DATETIME DEFAULT GETDATE(),
        
        CONSTRAINT FK_RoleMenus_Role 
            FOREIGN KEY (RoleID) REFERENCES [dbo].[Roles](ID) ON DELETE CASCADE,
        CONSTRAINT FK_RoleMenus_Menu 
            FOREIGN KEY (MenuID) REFERENCES [dbo].[Menus](ID) ON DELETE CASCADE,
        CONSTRAINT UK_RoleMenus_RoleMenu 
            UNIQUE (RoleID, MenuID)
    );
    
    PRINT '角色菜单关联表创建完成';
END
ELSE
BEGIN
    PRINT '角色菜单关联表已存在';
END

-- =====================================================
-- 6. 角色部门关联表 (RoleDepartments)
-- 功能：角色的数据权限范围
-- =====================================================
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'RoleDepartments')
BEGIN
    CREATE TABLE [dbo].[RoleDepartments] (
        [ID] INT IDENTITY(1,1) PRIMARY KEY,
        [RoleID] INT NOT NULL,
        [DepartmentID] INT NOT NULL,
        [CreatedAt] DATETIME DEFAULT GETDATE(),
        
        CONSTRAINT FK_RoleDepartments_Role 
            FOREIGN KEY (RoleID) REFERENCES [dbo].[Roles](ID) ON DELETE CASCADE,
        CONSTRAINT FK_RoleDepartments_Department 
            FOREIGN KEY (DepartmentID) REFERENCES [dbo].[Department](ID) ON DELETE CASCADE,
        CONSTRAINT UK_RoleDepartments_RoleDept 
            UNIQUE (RoleID, DepartmentID)
    );
    
    PRINT '角色部门关联表创建完成';
END
ELSE
BEGIN
    PRINT '角色部门关联表已存在';
END

-- =====================================================
-- 7. 用户角色关联表 (UserRoles)
-- 功能：用户与角色的多对多关系
-- =====================================================
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'UserRoles')
BEGIN
    CREATE TABLE [dbo].[UserRoles] (
        [ID] INT IDENTITY(1,1) PRIMARY KEY,
        [UserID] INT NOT NULL,
        [RoleID] INT NOT NULL,
        [CreatedAt] DATETIME DEFAULT GETDATE(),
        
        CONSTRAINT FK_UserRoles_User 
            FOREIGN KEY (UserID) REFERENCES [dbo].[User](ID) ON DELETE CASCADE,
        CONSTRAINT FK_UserRoles_Role 
            FOREIGN KEY (RoleID) REFERENCES [dbo].[Roles](ID) ON DELETE CASCADE,
        CONSTRAINT UK_UserRoles_UserRole 
            UNIQUE (UserID, RoleID)
    );
    
    PRINT '用户角色关联表创建完成';
END
ELSE
BEGIN
    PRINT '用户角色关联表已存在';
END

-- =====================================================
-- 8. 扩展用户表 (User) - 添加岗位等字段
-- =====================================================

-- 添加 PositionID 字段
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('[dbo].[User]') AND name = 'PositionID')
BEGIN
    ALTER TABLE [dbo].[User] ADD [PositionID] INT NULL;
    PRINT 'User表添加PositionID字段完成';
END

-- 添加 DepartmentID 字段
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('[dbo].[User]') AND name = 'DepartmentID')
BEGIN
    ALTER TABLE [dbo].[User] ADD [DepartmentID] INT NULL;
    PRINT 'User表添加DepartmentID字段完成';
END

-- Phone 字段已存在，跳过添加
-- 添加 Gender 字段
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('[dbo].[User]') AND name = 'Gender')
BEGIN
    ALTER TABLE [dbo].[User] ADD [Gender] NVARCHAR(10) NULL;
    PRINT 'User表添加Gender字段完成';
END

-- 添加 Birthday 字段
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('[dbo].[User]') AND name = 'Birthday')
BEGIN
    ALTER TABLE [dbo].[User] ADD [Birthday] DATE NULL;
    PRINT 'User表添加Birthday字段完成';
END

-- 添加 Address 字段
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('[dbo].[User]') AND name = 'Address')
BEGIN
    ALTER TABLE [dbo].[User] ADD [Address] NVARCHAR(200) NULL;
    PRINT 'User表添加Address字段完成';
END

-- 添加 Remark 字段
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('[dbo].[User]') AND name = 'Remark')
BEGIN
    ALTER TABLE [dbo].[User] ADD [Remark] NVARCHAR(500) NULL;
    PRINT 'User表添加Remark字段完成';
END

-- 添加 LastLoginTime 字段
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('[dbo].[User]') AND name = 'LastLoginTime')
BEGIN
    ALTER TABLE [dbo].[User] ADD [LastLoginTime] DATETIME NULL;
    PRINT 'User表添加LastLoginTime字段完成';
END

-- 添加 UpdatedAt 字段
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('[dbo].[User]') AND name = 'UpdatedAt')
BEGIN
    ALTER TABLE [dbo].[User] ADD [UpdatedAt] DATETIME DEFAULT GETDATE();
    PRINT 'User表添加UpdatedAt字段完成';
END

-- 添加外键约束（检查约束是否已存在）
IF NOT EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_User_Position')
BEGIN
    ALTER TABLE [dbo].[User] ADD CONSTRAINT FK_User_Position 
        FOREIGN KEY (PositionID) REFERENCES [dbo].[Positions](ID);
    PRINT 'User表添加Position外键约束完成';
END

IF NOT EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_User_Department')
BEGIN
    ALTER TABLE [dbo].[User] ADD CONSTRAINT FK_User_Department 
        FOREIGN KEY (DepartmentID) REFERENCES [dbo].[Department](ID);
    PRINT 'User表添加Department外键约束完成';
END

PRINT '用户表扩展字段添加完成';

-- =====================================================
-- 初始化基础数据
-- =====================================================

-- 初始化部门数据（更新现有数据）
-- 只有在扩展字段已添加的情况下才执行更新
IF EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('[dbo].[Department]') AND name = 'DeptCode')
BEGIN
    UPDATE [dbo].[Department] SET 
        [DeptCode] = CASE 
            WHEN [Name] = N'生产部' THEN 'PROD'
            WHEN [Name] = N'质检部' THEN 'QC'
            WHEN [Name] = N'销售部' THEN 'SALES'
            ELSE 'DEPT' + CAST(ID AS NVARCHAR(10))
        END,
        [DeptType] = 'department',
        [Status] = 1,
        [SortOrder] = ID * 10
    WHERE [DeptCode] IS NULL;
END

-- 插入根部门（如果不存在）
IF NOT EXISTS (SELECT 1 FROM [dbo].[Department] WHERE [Name] = N'总公司')
BEGIN
    -- 检查扩展字段是否存在，决定插入语句的格式
    IF EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('[dbo].[Department]') AND name = 'DeptCode')
    BEGIN
        INSERT INTO [dbo].[Department] ([Name], [DeptCode], [DeptType], [ParentID], [Status], [SortOrder]) 
        VALUES (N'总公司', 'ROOT', 'company', NULL, 1, 1);
    END
    ELSE
    BEGIN
        INSERT INTO [dbo].[Department] ([Name]) VALUES (N'总公司');
    END
END

-- 初始化岗位数据
IF NOT EXISTS (SELECT 1 FROM [dbo].[Positions])
BEGIN
    INSERT INTO [dbo].[Positions] ([PositionCode], [PositionName], [Level], [Description], [Status], [SortOrder]) VALUES
    ('CEO', N'总经理', 1, N'公司最高管理者', 1, 10),
    ('DEPT_MGR', N'部门经理', 2, N'部门管理者', 1, 20),
    ('TEAM_LEAD', N'组长', 3, N'小组负责人', 1, 30),
    ('ENGINEER', N'工程师', 4, N'技术工程师', 1, 40),
    ('OPERATOR', N'操作员', 5, N'生产操作员', 1, 50),
    ('QC_INSPECTOR', N'质检员', 4, N'质量检验员', 1, 41),
    ('SALES_REP', N'销售代表', 4, N'销售代表', 1, 42);
END

-- 初始化菜单数据
IF NOT EXISTS (SELECT 1 FROM [dbo].[Menus])
BEGIN
    -- 主菜单
    INSERT INTO [dbo].[Menus] ([MenuCode], [MenuName], [MenuType], [Icon], [Path], [Permission], [SortOrder], [Visible], [Status]) VALUES
    ('dashboard', N'仪表盘', 'menu', 'Dashboard', '/dashboard', 'dashboard:view', 10, 1, 1),
    ('system', N'系统管理', 'menu', 'Setting', '/system', 'system:view', 90, 1, 1),
    ('quality', N'质量管理', 'menu', 'DocumentChecked', '/quality', 'quality:view', 20, 1, 1),
    ('production', N'生产管理', 'menu', 'Operation', '/production', 'production:view', 30, 1, 1);
    
    -- 获取主菜单ID
    DECLARE @systemMenuId INT = (SELECT ID FROM [dbo].[Menus] WHERE MenuCode = 'system');
    DECLARE @qualityMenuId INT = (SELECT ID FROM [dbo].[Menus] WHERE MenuCode = 'quality');
    DECLARE @productionMenuId INT = (SELECT ID FROM [dbo].[Menus] WHERE MenuCode = 'production');
    
    -- 系统管理子菜单
    INSERT INTO [dbo].[Menus] ([ParentID], [MenuCode], [MenuName], [MenuType], [Icon], [Path], [Component], [Permission], [SortOrder], [Visible], [Status]) VALUES
    (@systemMenuId, 'user-management', N'用户管理', 'menu', 'User', '/system/user', 'system/user/index', 'system:user:view', 10, 1, 1),
    (@systemMenuId, 'role-management', N'角色管理', 'menu', 'UserFilled', '/system/role', 'system/role/index', 'system:role:view', 20, 1, 1),
    (@systemMenuId, 'menu-management', N'菜单管理', 'menu', 'Menu', '/system/menu', 'system/menu/index', 'system:menu:view', 30, 1, 1),
    (@systemMenuId, 'dept-management', N'部门管理', 'menu', 'OfficeBuilding', '/system/dept', 'system/dept/index', 'system:dept:view', 40, 1, 1),
    (@systemMenuId, 'position-management', N'岗位管理', 'menu', 'Suitcase', '/system/position', 'system/position/index', 'system:position:view', 50, 1, 1);
    
    -- 质量管理子菜单
    INSERT INTO [dbo].[Menus] ([ParentID], [MenuCode], [MenuName], [MenuType], [Icon], [Path], [Component], [Permission], [SortOrder], [Visible], [Status]) VALUES
    (@qualityMenuId, 'complaint-management', N'投诉管理', 'menu', 'Warning', '/quality/complaint', 'quality/complaint/index', 'quality:complaint:view', 10, 1, 1),
    (@qualityMenuId, 'rework-management', N'返工管理', 'menu', 'Refresh', '/quality/rework', 'quality/rework/index', 'quality:rework:view', 20, 1, 1),
    (@qualityMenuId, 'person-management', N'人员管理', 'menu', 'Avatar', '/quality/person', 'quality/person/index', 'quality:person:view', 30, 1, 1);
    
    -- 生产管理子菜单
    INSERT INTO [dbo].[Menus] ([ParentID], [MenuCode], [MenuName], [MenuType], [Icon], [Path], [Component], [Permission], [SortOrder], [Visible], [Status]) VALUES
    (@productionMenuId, 'material-price', N'物料单价', 'menu', 'Coin', '/copq/material-price', 'copq/material-price/index', 'copq:material:view', 10, 1, 1);
END

-- 初始化角色数据
IF NOT EXISTS (SELECT 1 FROM [dbo].[Roles])
BEGIN
    INSERT INTO [dbo].[Roles] ([RoleCode], [RoleName], [DataScope], [Description], [SortOrder], [Status]) VALUES
    ('admin', N'系统管理员', 'all', N'系统管理员，拥有所有权限', 10, 1),
    ('manager', N'部门经理', 'dept', N'部门经理，管理本部门数据', 20, 1),
    ('user', N'普通用户', 'self', N'普通用户，只能查看自己的数据', 30, 1),
    ('quality_manager', N'质量经理', 'dept', N'质量部门经理', 21, 1),
    ('production_manager', N'生产经理', 'dept', N'生产部门经理', 22, 1);
END

-- 为管理员角色分配所有菜单权限
IF NOT EXISTS (SELECT 1 FROM [dbo].[RoleMenus])
BEGIN
    DECLARE @adminRoleIdForMenus INT = (SELECT ID FROM [dbo].[Roles] WHERE RoleCode = 'admin');
    
    INSERT INTO [dbo].[RoleMenus] ([RoleID], [MenuID])
    SELECT @adminRoleIdForMenus, ID FROM [dbo].[Menus];
END

-- 为现有admin用户分配管理员角色
IF NOT EXISTS (SELECT 1 FROM [dbo].[UserRoles])
BEGIN
    DECLARE @adminUserId INT = (SELECT ID FROM [dbo].[User] WHERE Username = 'admin');
    DECLARE @adminRoleIdForUsers INT = (SELECT ID FROM [dbo].[Roles] WHERE RoleCode = 'admin');
    
    IF @adminUserId IS NOT NULL AND @adminRoleIdForUsers IS NOT NULL
    BEGIN
        INSERT INTO [dbo].[UserRoles] ([UserID], [RoleID]) VALUES (@adminUserId, @adminRoleIdForUsers);
    END
END

-- 创建索引优化查询性能（检查索引是否已存在）
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_Departments_ParentID' AND object_id = OBJECT_ID('[dbo].[Department]'))
BEGIN
    CREATE NONCLUSTERED INDEX [IX_Departments_ParentID] ON [dbo].[Department] ([ParentID]);
    PRINT '创建Department表ParentID索引完成';
END

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_Positions_DepartmentID' AND object_id = OBJECT_ID('[dbo].[Positions]'))
BEGIN
    CREATE NONCLUSTERED INDEX [IX_Positions_DepartmentID] ON [dbo].[Positions] ([DepartmentID]);
    PRINT '创建Positions表DepartmentID索引完成';
END

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_Menus_ParentID' AND object_id = OBJECT_ID('[dbo].[Menus]'))
BEGIN
    CREATE NONCLUSTERED INDEX [IX_Menus_ParentID] ON [dbo].[Menus] ([ParentID]);
    PRINT '创建Menus表ParentID索引完成';
END

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_User_DepartmentID' AND object_id = OBJECT_ID('[dbo].[User]'))
BEGIN
    CREATE NONCLUSTERED INDEX [IX_User_DepartmentID] ON [dbo].[User] ([DepartmentID]);
    PRINT '创建User表DepartmentID索引完成';
END

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_User_PositionID' AND object_id = OBJECT_ID('[dbo].[User]'))
BEGIN
    CREATE NONCLUSTERED INDEX [IX_User_PositionID] ON [dbo].[User] ([PositionID]);
    PRINT '创建User表PositionID索引完成';
END

PRINT '用户权限管理系统数据库表结构创建完成！';
GO