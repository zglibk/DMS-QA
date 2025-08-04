/*
 * DMS-QA 质量管理系统数据库初始化脚本
 *
 * 功能说明：
 * 1. 创建系统所需的所有数据表
 * 2. 设置表结构、字段类型和约束
 * 3. 插入初始化数据
 * 4. 创建索引优化查询性能
 *
 * 数据库要求：
 * - SQL Server 2008R2 或更高版本
 * - 数据库名称：DMS-QA
 * - 字符集：支持中文（NVARCHAR）
 *
 * 执行说明：
 * 1. 在SQL Server Management Studio中连接数据库
 * 2. 创建名为"DMS-QA"的数据库
 * 3. 选择该数据库并执行此脚本
 *
 * 注意事项：
 * - 执行前请备份现有数据
 * - 某些表可能已存在，请根据需要调整
 * - 建议在测试环境先验证
 */

-- =====================================================
-- 投诉登记表 (ComplaintRegister)
-- 功能：记录客户投诉的详细信息
-- 用途：质量问题跟踪、成本核算、责任追溯
-- =====================================================
CREATE TABLE [dbo].[ComplaintRegister] (
    -- 基础信息字段
    [ID] INT IDENTITY(1,1) PRIMARY KEY,              -- 主键，自增ID
    [Date] DATE NOT NULL,                            -- 投诉日期，必填
    [Customer] NVARCHAR(100) NOT NULL,               -- 客户名称，必填
    [OrderNo] NVARCHAR(50),                          -- 订单号
    [ProductName] NVARCHAR(100),                     -- 产品名称
    [Specification] NVARCHAR(100),                   -- 产品规格
    [Workshop] NVARCHAR(50),                         -- 生产车间

    -- 数量和质量信息
    [ProductionQty] INT,                             -- 生产数量
    [DefectiveQty] INT,                              -- 不良品数量
    [DefectiveRate] DECIMAL(5,2),                    -- 不良率（百分比）

    -- 投诉分类信息
    [ComplaintCategory] NVARCHAR(50),                -- 投诉类别
    [CustomerComplaintType] NVARCHAR(50),            -- 客户投诉类型
    [DefectiveCategory] NVARCHAR(50),                -- 不良品类别
    [DefectiveItem] NVARCHAR(100),                   -- 不良项目
    [DefectiveDescription] NVARCHAR(500),            -- 不良描述
    [AttachmentFile] NVARCHAR(500),                  -- 附件文件路径

    -- 处理信息
    [DefectiveReason] NVARCHAR(500),                 -- 不良原因分析
    [Disposition] NVARCHAR(500),                     -- 处置措施
    [ReturnGoods] BIT,                               -- 是否退货（0=否，1=是）
    [IsReprint] BIT,                                 -- 是否重印（0=否，1=是）
    [ReprintQty] INT,                                -- 重印数量

    -- 成本核算 - 纸张
    [Paper] NVARCHAR(50),                            -- 纸张名称
    [PaperSpecification] NVARCHAR(100),              -- 纸张规格
    [PaperQty] INT,                                  -- 纸张数量
    [PaperUnitPrice] DECIMAL(10,2),                  -- 纸张单价

    -- 成本核算 - 材料A
    [MaterialA] NVARCHAR(50),                        -- 材料A名称
    [MaterialASpec] NVARCHAR(100),                   -- 材料A规格
    [MaterialAQty] INT,                              -- 材料A数量
    [MaterialAUnitPrice] DECIMAL(10,2),              -- 材料A单价

    -- 成本核算 - 材料B
    [MaterialB] NVARCHAR(50),                        -- 材料B名称
    [MaterialBSpec] NVARCHAR(100),                   -- 材料B规格
    [MaterialBQty] INT,                              -- 材料B数量
    [MaterialBUnitPrice] DECIMAL(10,2),              -- 材料B单价

    -- 成本核算 - 材料C
    [MaterialC] NVARCHAR(50),                        -- 材料C名称
    [MaterialCSpec] NVARCHAR(100),                   -- 材料C规格
    [MaterialCQty] INT,                              -- 材料C数量
    [MaterialCUnitPrice] DECIMAL(10,2),              -- 材料C单价

    -- 成本核算 - 总计
    [LaborCost] DECIMAL(10,2),                       -- 人工成本
    [TotalCost] DECIMAL(10,2),                       -- 总成本

    -- 责任追溯
    [MainDept] NVARCHAR(50),                         -- 主要责任部门
    [MainPerson] NVARCHAR(50),                       -- 主要责任人
    [MainPersonAssessment] DECIMAL(10,2),            -- 主要责任人考核金额
    [SecondPerson] NVARCHAR(50),                     -- 次要责任人
    [SecondPersonAssessment] DECIMAL(10,2),          -- 次要责任人考核金额
    [Manager] NVARCHAR(50),                          -- 管理责任人
    [ManagerAssessment] DECIMAL(10,2),               -- 管理责任人考核金额
    [AssessmentDescription] NVARCHAR(500)            -- 考核说明
);

-- =====================================================
-- 材料价格表 (MaterialPrice)
-- 功能：管理供应商材料价格信息，支持历史价格追踪
-- 特性：版本控制、价格历史、有效期管理
-- =====================================================
CREATE TABLE [dbo].[MaterialPrice] (
    -- 基础信息
    [ID] INT IDENTITY(1,1) PRIMARY KEY,               -- 主键，自增ID
    [MaterialName] NVARCHAR(100) NOT NULL,            -- 材料名称，必填
    [Supplier] NVARCHAR(100),                         -- 供应商名称
    [UnitPrice] DECIMAL(10,2) NULL,                   -- 单价（允许为空）
    [Remarks] NVARCHAR(500),                          -- 备注信息

    -- 时间管理
    [EffectiveDate] DATETIME NOT NULL DEFAULT GETDATE(), -- 生效日期
    [ExpiryDate] DATETIME NULL,                       -- 失效日期（NULL=当前有效）
    [IsActive] BIT NOT NULL DEFAULT 1,                -- 是否为当前有效价格
    [Version] INT NOT NULL DEFAULT 1,                 -- 版本号（价格变更时递增）

    -- 审计信息
    [CreatedBy] NVARCHAR(50),                         -- 创建人
    [CreatedDate] DATETIME NOT NULL DEFAULT GETDATE(), -- 创建时间
    [UpdatedBy] NVARCHAR(50),                         -- 更新人
    [UpdatedDate] DATETIME NOT NULL DEFAULT GETDATE(), -- 更新时间

    -- 性能优化索引
    INDEX IX_MaterialPrice_Active NONCLUSTERED (MaterialName, Supplier, IsActive),
    INDEX IX_MaterialPrice_EffectiveDate NONCLUSTERED (EffectiveDate),
    INDEX IX_MaterialPrice_Material NONCLUSTERED (MaterialName)
);

-- =====================================================
-- 当前有效价格视图 (CurrentMaterialPrice)
-- 功能：快速查询当前有效的材料价格
-- 用途：简化查询逻辑，提高查询性能
-- =====================================================
CREATE VIEW [dbo].[CurrentMaterialPrice] AS
SELECT
    ID,                    -- 价格记录ID
    MaterialName,          -- 材料名称
    Supplier,              -- 供应商
    UnitPrice,             -- 单价
    Remarks,               -- 备注
    EffectiveDate,         -- 生效日期
    Version,               -- 版本号
    CreatedBy,             -- 创建人
    CreatedDate,           -- 创建时间
    UpdatedBy,             -- 更新人
    UpdatedDate            -- 更新时间
FROM MaterialPrice
WHERE IsActive = 1;        -- 只显示当前有效的价格

-- 创建存储过程：更新价格（自动处理历史记录）
CREATE PROCEDURE [dbo].[UpdateMaterialPrice]
    @MaterialName NVARCHAR(100),
    @Supplier NVARCHAR(100) = NULL,
    @NewUnitPrice DECIMAL(10,2) = NULL,
    @Remarks NVARCHAR(500) = NULL,
    @UpdatedBy NVARCHAR(50) = NULL,
    @EffectiveDate DATETIME = NULL
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @CurrentDate DATETIME = ISNULL(@EffectiveDate, GETDATE());
    DECLARE @MaxVersion INT;

    BEGIN TRANSACTION;

    BEGIN TRY
        -- 获取当前最大版本号
        SELECT @MaxVersion = ISNULL(MAX(Version), 0)
        FROM MaterialPrice
        WHERE MaterialName = @MaterialName
        AND ISNULL(Supplier, '') = ISNULL(@Supplier, '');

        -- 将当前有效记录设为历史记录
        UPDATE MaterialPrice
        SET
            IsActive = 0,
            ExpiryDate = @CurrentDate,
            UpdatedBy = @UpdatedBy,
            UpdatedDate = @CurrentDate
        WHERE MaterialName = @MaterialName
        AND ISNULL(Supplier, '') = ISNULL(@Supplier, '')
        AND IsActive = 1;

        -- 插入新的价格记录
        INSERT INTO MaterialPrice (
            MaterialName, Supplier, UnitPrice, Remarks,
            EffectiveDate, IsActive, Version, CreatedBy, UpdatedBy
        )
        VALUES (
            @MaterialName, @Supplier, @NewUnitPrice, @Remarks,
            @CurrentDate, 1, @MaxVersion + 1, @UpdatedBy, @UpdatedBy
        );

        COMMIT TRANSACTION;

        SELECT 'SUCCESS' as Result, '价格更新成功' as Message;

    END TRY
    BEGIN CATCH
        ROLLBACK TRANSACTION;

        SELECT 'ERROR' as Result, ERROR_MESSAGE() as Message;
    END CATCH
END;

-- 创建存储过程：获取价格历史
CREATE PROCEDURE [dbo].[GetMaterialPriceHistory]
    @MaterialName NVARCHAR(100),
    @Supplier NVARCHAR(100) = NULL
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        ID,
        MaterialName,
        Supplier,
        UnitPrice,
        Remarks,
        EffectiveDate,
        ExpiryDate,
        IsActive,
        Version,
        CreatedBy,
        CreatedDate,
        UpdatedBy,
        UpdatedDate,
        CASE
            WHEN IsActive = 1 THEN '当前价格'
            ELSE '历史价格'
        END as PriceStatus
    FROM MaterialPrice
    WHERE MaterialName = @MaterialName
    AND ISNULL(Supplier, '') = ISNULL(@Supplier, '')
    ORDER BY Version DESC, EffectiveDate DESC;
END;

-- =====================================================
-- 用户表 (User)
-- 功能：管理系统用户账户信息
-- 用途：登录认证、权限控制、用户资料管理
-- =====================================================
CREATE TABLE [dbo].[User] (
    [ID] INT IDENTITY(1,1) PRIMARY KEY,               -- 主键，自增ID
    [Username] NVARCHAR(50) NOT NULL UNIQUE,          -- 用户名，唯一标识
    [Password] NVARCHAR(100) NOT NULL,                -- 密码（bcrypt哈希）
    [Department] NVARCHAR(32),                        -- 所属部门名称
    [RealName] NVARCHAR(32),                          -- 真实姓名
    [Avatar] NVARCHAR(MAX),                           -- 头像（Base64或URL）
    [Email] NVARCHAR(64),                             -- 邮箱地址
    [Phone] NVARCHAR(20),                             -- 手机号码
    [CreatedAt] DATETIME DEFAULT CURRENT_TIMESTAMP,   -- 创建时间
    [Status] INT DEFAULT 1,                           -- 状态（1=启用，0=禁用）
    [PositionID] INT,                                  -- 职位ID
    [DepartmentID] INT,                               -- 部门ID
    [Gender] NVARCHAR(10),                            -- 性别
    [Birthday] DATE,                                  -- 生日
    [Address] NVARCHAR(200),                          -- 地址
    [Remark] NVARCHAR(500),                           -- 备注
    [LastLoginTime] DATETIME,                         -- 最后登录时间
    [UpdatedAt] DATETIME                              -- 更新时间
);

-- 添加User表的外键约束
ALTER TABLE [dbo].[User] ADD CONSTRAINT FK_User_Position 
    FOREIGN KEY (PositionID) REFERENCES [dbo].[Positions](ID);

ALTER TABLE [dbo].[User] ADD CONSTRAINT FK_User_Department 
    FOREIGN KEY (DepartmentID) REFERENCES [dbo].[Department](ID);

-- =====================================================
-- 权限管理系统相关表结构
-- 功能：完整的用户权限管理体系
-- 包括：部门管理、岗位管理、菜单管理、角色管理
-- =====================================================

-- =====================================================
-- 岗位管理表 (Positions)
-- 功能：管理系统中的各种岗位职务
-- =====================================================
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

-- =====================================================
-- 菜单管理表 (Menus)
-- 功能：管理系统菜单和权限
-- =====================================================
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

-- =====================================================
-- 角色管理表 (Roles)
-- 功能：管理系统角色
-- =====================================================
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

-- =====================================================
-- 角色菜单关联表 (RoleMenus)
-- 功能：角色与菜单的多对多关系
-- =====================================================
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

-- =====================================================
-- 角色部门关联表 (RoleDepartments)
-- 功能：角色的数据权限范围
-- =====================================================
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

-- =====================================================
-- 用户角色关联表 (UserRoles)
-- 功能：用户与角色的多对多关系
-- =====================================================
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

-- =====================================================
-- 车间表 (Workshop)
-- 功能：管理生产车间信息
-- 用途：投诉记录中的车间选择
-- =====================================================
CREATE TABLE [dbo].[Workshop] (
    [ID] INT IDENTITY(1,1) PRIMARY KEY,               -- 主键，自增ID
    [Name] NVARCHAR(50) NOT NULL UNIQUE               -- 车间名称，唯一
);

-- =====================================================
-- 部门表 (Department) - 扩展支持树形结构
-- 功能：管理公司部门信息，支持层级结构
-- 用途：人员归属、责任划分、权限管理
-- =====================================================
CREATE TABLE [dbo].[Department] (
    [ID] INT IDENTITY(1,1) PRIMARY KEY,               -- 主键，自增ID
    [Name] NVARCHAR(50) NOT NULL UNIQUE,              -- 部门名称，唯一
    [ParentID] INT NULL,                               -- 父部门ID
    [DeptCode] NVARCHAR(20) NULL,                      -- 部门编码
    [DeptType] NVARCHAR(20) DEFAULT 'department',      -- 部门类型
    [Leader] NVARCHAR(50) NULL,                        -- 部门负责人
    [Phone] NVARCHAR(20) NULL,                         -- 联系电话
    [Email] NVARCHAR(100) NULL,                        -- 邮箱地址
    [Description] NVARCHAR(500) NULL,                  -- 部门描述
    [SortOrder] INT DEFAULT 0,                         -- 排序
    [Status] BIT DEFAULT 1,                            -- 状态
    [CreatedAt] DATETIME DEFAULT GETDATE(),            -- 创建时间
    [UpdatedAt] DATETIME DEFAULT GETDATE(),            -- 更新时间
    
    CONSTRAINT FK_Department_Parent 
        FOREIGN KEY (ParentID) REFERENCES [dbo].[Department](ID)
);

-- =====================================================
-- 人员表 (Person)
-- 功能：管理公司人员信息
-- 用途：责任人选择、考核管理
-- =====================================================
CREATE TABLE [dbo].[Person] (
    [ID] INT IDENTITY(1,1) PRIMARY KEY,               -- 主键，自增ID
    [Name] NVARCHAR(50) NOT NULL UNIQUE,              -- 人员姓名，唯一
    [DepartmentID] INT FOREIGN KEY REFERENCES Department(ID), -- 所属部门外键
    [IsActive] BIT DEFAULT 1                           -- 人员有效性标记（1=在职，0=离职）
);

-- =====================================================
-- 投诉类别表 (ComplaintCategory)
-- 功能：管理投诉分类信息
-- 用途：投诉记录的分类标准化
-- =====================================================
CREATE TABLE [dbo].[ComplaintCategory] (
    [ID] INT IDENTITY(1,1) PRIMARY KEY,               -- 主键，自增ID
    [Name] NVARCHAR(50) NOT NULL UNIQUE               -- 类别名称，唯一
);

-- 客诉类型表
CREATE TABLE [dbo].[CustomerComplaintType] (
    [ID] INT IDENTITY(1,1) PRIMARY KEY,
    [Name] NVARCHAR(50) NOT NULL UNIQUE
);

-- 不良类别表
CREATE TABLE [dbo].[DefectiveCategory] (
    [ID] INT IDENTITY(1,1) PRIMARY KEY,
    [Name] NVARCHAR(50) NOT NULL UNIQUE
);

-- 不良项表
CREATE TABLE [dbo].[DefectiveItem] (
    [ID] INT IDENTITY(1,1) PRIMARY KEY,
    [Name] NVARCHAR(100) NOT NULL UNIQUE,
    [CategoryID] INT FOREIGN KEY REFERENCES DefectiveCategory(ID)
);

-- "记住我"功能的令牌表
CREATE TABLE [dbo].[UserTokens] (
    [ID] INT IDENTITY(1,1) PRIMARY KEY,
    [UserId] INT NOT NULL FOREIGN KEY REFERENCES [User](ID) ON DELETE CASCADE,
    [Token] NVARCHAR(255) NOT NULL UNIQUE,
    [ExpiresAt] DATETIME NOT NULL
);

-- =====================================================
-- 数据库配置表 (DbConfig)
-- 功能：管理数据库连接和文件存储配置
-- 用途：支持动态切换数据库连接、文件路径配置
-- =====================================================
CREATE TABLE [dbo].[DbConfig] (
    [ID] INT IDENTITY(1,1) PRIMARY KEY,               -- 主键，自增ID
    [Host] NVARCHAR(100) NOT NULL,                    -- 数据库服务器地址
    [DatabaseName] NVARCHAR(100) NOT NULL,            -- 数据库名称
    [DbUser] NVARCHAR(100) NOT NULL,                  -- 数据库用户名
    [DbPassword] NVARCHAR(100) NOT NULL,              -- 数据库密码
    [UpdatedAt] DATETIME,                             -- 更新时间
    [ConfigName] NVARCHAR(50),                        -- 配置名称
    [IsCurrent] BIT,                                  -- 是否为当前使用的配置
    [IsValid] BIT,                                    -- 配置是否有效
    [Remark] NVARCHAR(200),                           -- 备注说明
    [FileStoragePath] NVARCHAR(500),                  -- 文件存储路径
    [FileServerPort] INT,                             -- 文件服务器端口
    [FileUrlPrefix] NVARCHAR(100),                    -- 文件URL前缀
    [ExcelTempPath] NVARCHAR(500),                    -- Excel临时文件路径
    [NetworkSharePath] NVARCHAR(500)                  -- 网络共享路径
);

-- =====================================================
-- 数据库表结构升级脚本
-- 功能：为已存在的表添加新字段，确保向后兼容
-- =====================================================

-- 检查并添加ExcelTempPath字段
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('[dbo].[DbConfig]') AND name = 'ExcelTempPath')
BEGIN
    ALTER TABLE [dbo].[DbConfig] ADD [ExcelTempPath] NVARCHAR(500);
END

-- 检查并添加NetworkSharePath字段
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('[dbo].[DbConfig]') AND name = 'NetworkSharePath')
BEGIN
    ALTER TABLE [dbo].[DbConfig] ADD [NetworkSharePath] NVARCHAR(500);
END

-- =====================================================
-- 路径映射配置表 (PathMappingConfig)
-- 功能：管理文件路径映射规则
-- 用途：支持不同环境下的路径转换
-- =====================================================
CREATE TABLE [dbo].[PathMappingConfig] (
    [ID] INT IDENTITY(1,1) PRIMARY KEY,               -- 主键，自增ID
    [Name] NVARCHAR(100) NOT NULL,                    -- 映射规则名称
    [LocalPattern] NVARCHAR(500) NOT NULL,            -- 本地路径模式
    [TargetPattern] NVARCHAR(500) NOT NULL,           -- 目标路径模式
    [Description] NVARCHAR(200),                      -- 规则描述
    [IsActive] BIT DEFAULT 1,                         -- 是否启用
    [CreatedAt] DATETIME DEFAULT GETDATE(),           -- 创建时间
    [UpdatedAt] DATETIME DEFAULT GETDATE()            -- 更新时间
);

-- =====================================================
-- 主页卡片配置表 (HomeCardConfig)
-- 功能：管理首页显示的卡片配置
-- 用途：动态配置首页布局和内容
-- =====================================================
CREATE TABLE [dbo].[HomeCardConfig] (
    [ID] INT IDENTITY(1,1) PRIMARY KEY,               -- 主键，自增ID
    [ConfigKey] NVARCHAR(50) NOT NULL,                -- 配置键名
    [ConfigValue] NVARCHAR(MAX),                      -- 配置值（JSON格式）
    [Description] NVARCHAR(200),                      -- 配置描述
    [IsActive] BIT DEFAULT 1,                         -- 是否启用
    [CreatedAt] DATETIME DEFAULT GETDATE(),           -- 创建时间
    [UpdatedAt] DATETIME DEFAULT GETDATE()            -- 更新时间
);

-- =====================================================
-- 网站配置表 (SiteConfig)
-- 功能：管理网站全局配置信息
-- 用途：网站标题、Logo、样式等配置
-- =====================================================
CREATE TABLE [dbo].[SiteConfig] (
    [ID] INT IDENTITY(1,1) PRIMARY KEY,               -- 主键，自增ID
    [ConfigKey] NVARCHAR(50) NOT NULL UNIQUE,         -- 配置键名，唯一
    [ConfigValue] NVARCHAR(MAX),                      -- 配置值
    [ConfigType] NVARCHAR(20) DEFAULT 'text',         -- 配置类型（text/image/json）
    [Description] NVARCHAR(200),                      -- 配置描述
    [IsActive] BIT DEFAULT 1,                         -- 是否启用
    [CreatedAt] DATETIME DEFAULT GETDATE(),           -- 创建时间
    [UpdatedAt] DATETIME DEFAULT GETDATE()            -- 更新时间
);

-- 插入默认路径映射规则
INSERT INTO [dbo].[PathMappingConfig] ([Name], [LocalPattern], [TargetPattern], [Description]) VALUES
(N'Excel临时文件映射', N'C:\Users\*\AppData\Roaming\Microsoft\Excel\*', N'\\tj_server\工作\品质部\生产异常周报考核统计\*', N'Excel临时文件映射到tj_server共享盘'),
(N'2025年异常汇总映射', N'*2025年异常汇总\*', N'\\tj_server\工作\品质部\生产异常周报考核统计\2025年异常汇总\不良图片&资料\*', N'2025年异常汇总文件映射');

-- =====================================================
-- 转换配置表 (ConversionConfig)
-- 功能：管理路径转换相关的配置选项
-- 用途：控制路径转换行为和开关设置
-- =====================================================
CREATE TABLE [dbo].[ConversionConfig] (
    [ID] INT IDENTITY(1,1) PRIMARY KEY,               -- 主键，自增ID
    [ConfigKey] NVARCHAR(50) NOT NULL UNIQUE,         -- 配置键名
    [ConfigValue] NVARCHAR(500),                      -- 配置值
    [Description] NVARCHAR(200),                      -- 配置描述
    [CreatedAt] DATETIME DEFAULT GETDATE(),           -- 创建时间
    [UpdatedAt] DATETIME DEFAULT GETDATE()            -- 更新时间
);

-- 插入默认转换配置
INSERT INTO [dbo].[ConversionConfig] ([ConfigKey], [ConfigValue], [Description]) VALUES
(N'autoConvert', N'true', N'启用自动转换'),
(N'keepOriginal', N'false', N'保留原始路径'),
(N'fileCopyMode', N'true', N'启用文件拷贝模式'),
(N'validatePaths', N'false', N'路径验证');

-- 插入默认主页卡片配置
INSERT INTO [dbo].[HomeCardConfig] ([ConfigKey], [ConfigValue], [Description]) VALUES
(N'showTodayCount', N'true', N'是否显示今日投诉统计卡片'),
(N'showMonthCount', N'true', N'是否显示本月投诉统计卡片'),
(N'displayUnits', N'[{"name":"数码印刷","type":"workshop","enabled":true},{"name":"轮转机","type":"workshop","enabled":true},{"name":"跟单","type":"department","enabled":true},{"name":"设计","type":"department","enabled":true},{"name":"品检","type":"department","enabled":true}]', N'显示的部门/车间单位配置');

-- 插入默认网站LOGO配置
INSERT INTO [dbo].[SiteConfig] ([ConfigKey], [ConfigValue], [ConfigType], [Description]) VALUES
(N'siteName', N'质量数据管理系统', N'text', N'网站名称'),
(N'companyName', N'DMS质量管理系统', N'text', N'公司名称'),
(N'logoBase64Img', N'/logo.png', N'image', N'网站LOGO图片BASE64数据'),
(N'faviconBase64Img', N'/logo.png', N'image', N'网站图标BASE64数据'),
(N'headerTitle', N'质量数据系统', N'text', N'页面头部标题'),
(N'loginTitle', N'DMS-QA 质量管理系统', N'text', N'登录页面标题'),
(N'footerCopyright', N'© 2025 DMS质量管理系统. All rights reserved.', N'text', N'页脚版权信息');

-- =====================================================
-- 权限管理系统初始化数据
-- =====================================================

-- 初始化岗位数据
INSERT INTO [dbo].[Positions] ([PositionCode], [PositionName], [Level], [Description], [Status], [SortOrder]) VALUES
('CEO', N'总经理', 1, N'公司最高管理者', 1, 10),
('DEPT_MGR', N'部门经理', 2, N'部门管理者', 1, 20),
('TEAM_LEAD', N'组长', 3, N'小组负责人', 1, 30),
('ENGINEER', N'工程师', 4, N'技术工程师', 1, 40),
('OPERATOR', N'操作员', 5, N'生产操作员', 1, 50),
('QC_INSPECTOR', N'质检员', 4, N'质量检验员', 1, 41),
('SALES_REP', N'销售代表', 4, N'销售代表', 1, 42);

-- 初始化菜单数据
-- 主菜单
INSERT INTO [dbo].[Menus] ([MenuCode], [MenuName], [MenuType], [Icon], [Path], [Permission], [SortOrder], [Visible], [Status]) VALUES
('dashboard', N'仪表盘', 'menu', 'Dashboard', '/dashboard', 'dashboard:view', 10, 1, 1),
('system', N'系统管理', 'menu', 'Setting', '/system', 'system:view', 90, 1, 1),
('quality', N'质量管理', 'menu', 'DocumentChecked', '/quality', 'quality:view', 20, 1, 1),
('production', N'生产管理', 'menu', 'Operation', '/production', 'production:view', 30, 1, 1);

-- 获取主菜单ID并插入子菜单
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

-- 初始化角色数据
INSERT INTO [dbo].[Roles] ([RoleCode], [RoleName], [DataScope], [Description], [SortOrder], [Status]) VALUES
('admin', N'系统管理员', 'all', N'系统管理员，拥有所有权限', 10, 1),
('manager', N'部门经理', 'dept', N'部门经理，管理本部门数据', 20, 1),
('user', N'普通用户', 'self', N'普通用户，只能查看自己的数据', 30, 1),
('quality_manager', N'质量经理', 'dept', N'质量部门经理', 21, 1),
('production_manager', N'生产经理', 'dept', N'生产部门经理', 22, 1);

-- 为管理员角色分配所有菜单权限
DECLARE @adminRoleIdForMenus INT = (SELECT ID FROM [dbo].[Roles] WHERE RoleCode = 'admin');
INSERT INTO [dbo].[RoleMenus] ([RoleID], [MenuID])
SELECT @adminRoleIdForMenus, ID FROM [dbo].[Menus];

-- 为现有admin用户分配管理员角色
DECLARE @adminUserId INT = (SELECT ID FROM [dbo].[User] WHERE Username = 'admin');
DECLARE @adminRoleIdForUsers INT = (SELECT ID FROM [dbo].[Roles] WHERE RoleCode = 'admin');
IF @adminUserId IS NOT NULL AND @adminRoleIdForUsers IS NOT NULL
BEGIN
    INSERT INTO [dbo].[UserRoles] ([UserID], [RoleID]) VALUES (@adminUserId, @adminRoleIdForUsers);
END

-- 插入下拉列表的初始数据
-- 车间
INSERT INTO [dbo].[Workshop] (Name) VALUES (N'印刷车间'), (N'裁切车间'), (N'包装车间');

-- 部门（更新为支持扩展字段的格式）
INSERT INTO [dbo].[Department] ([Name], [DeptCode], [DeptType], [ParentID], [Status], [SortOrder]) VALUES 
(N'总公司', 'ROOT', 'company', NULL, 1, 1),
(N'生产部', 'PROD', 'department', 1, 1, 10),
(N'质检部', 'QC', 'department', 1, 1, 20),
(N'销售部', 'SALES', 'department', 1, 1, 30);

-- 人员 (注意：这里的DepartmentID依赖于上面部门的插入顺序，2=生产部, 3=质检部)
INSERT INTO [dbo].[Person] (Name, DepartmentID, IsActive) VALUES 
(N'张三', 2, 1), (N'李四', 2, 1), (N'王五', 3, 1), (N'赵六', 2, 0);

-- 投诉类别
INSERT INTO [dbo].[ComplaintCategory] (Name) VALUES (N'客户投诉'), (N'内部质量问题');

-- 客诉类型
INSERT INTO [dbo].[CustomerComplaintType] (Name) VALUES (N'产品质量'), (N'交货期'), (N'服务态度');

-- 不良类别 (与之前插入不良项的脚本对应)
INSERT INTO [dbo].[DefectiveCategory] (Name) VALUES (N'印刷类'), (N'裁切类'), (N'包装类'), (N'未分类');

-- 创建权限管理系统相关索引
CREATE NONCLUSTERED INDEX [IX_Departments_ParentID] ON [dbo].[Department] ([ParentID]);
CREATE NONCLUSTERED INDEX [IX_Positions_DepartmentID] ON [dbo].[Positions] ([DepartmentID]);
CREATE NONCLUSTERED INDEX [IX_Menus_ParentID] ON [dbo].[Menus] ([ParentID]);
CREATE NONCLUSTERED INDEX [IX_User_DepartmentID] ON [dbo].[User] ([DepartmentID]);
CREATE NONCLUSTERED INDEX [IX_User_PositionID] ON [dbo].[User] ([PositionID]);

PRINT '权限管理系统表结构和基础数据已成功创建。';
PRINT '不良项和基础下拉选项已成功插入或更新。';

ALTER TABLE [User] ALTER COLUMN [Avatar] NVARCHAR(MAX);

-- 为DbConfig表的文件存储字段设置默认值
-- 注意：这个UPDATE语句只在有记录时执行，新建数据库时可能没有记录
-- 如果需要为新插入的记录设置默认值，请在应用程序中处理
UPDATE [dbo].[DbConfig]
SET
    [FileServerPort] = 8080,
    [FileUrlPrefix] = '/files'
WHERE [FileServerPort] IS NULL OR [FileUrlPrefix] IS NULL;

PRINT '数据库初始化完成，包含文件存储配置字段。';

-- =============================================
-- 数据备份功能相关表结构
-- =============================================

-- 创建备份记录表
CREATE TABLE [dbo].[BackupRecord] (
    [ID] [int] IDENTITY(1,1) NOT NULL,
    [BackupName] [nvarchar](255) NOT NULL,
    [BackupType] [nvarchar](20) NOT NULL DEFAULT 'FULL',
    [BackupPath] [nvarchar](500) NOT NULL,
    [BackupSize] [bigint] NULL,
    [DatabaseName] [nvarchar](128) NOT NULL,
    [BackupStartTime] [datetime] NOT NULL,
    [BackupEndTime] [datetime] NULL,
    [BackupStatus] [nvarchar](20) NOT NULL DEFAULT 'PENDING',
    [ErrorMessage] [nvarchar](max) NULL,
    [CreatedBy] [nvarchar](50) NOT NULL,
    [CreatedAt] [datetime] NOT NULL DEFAULT GETDATE(),
    [UpdatedAt] [datetime] NOT NULL DEFAULT GETDATE(),
    [Description] [nvarchar](500) NULL,
    CONSTRAINT [PK_BackupRecord] PRIMARY KEY CLUSTERED ([ID] ASC)
);

-- 创建索引
CREATE NONCLUSTERED INDEX [IX_BackupRecord_BackupStartTime] ON [dbo].[BackupRecord] ([BackupStartTime] DESC);
CREATE NONCLUSTERED INDEX [IX_BackupRecord_BackupStatus] ON [dbo].[BackupRecord] ([BackupStatus]);
CREATE NONCLUSTERED INDEX [IX_BackupRecord_DatabaseName] ON [dbo].[BackupRecord] ([DatabaseName]);

-- 为DbConfig表添加备份相关字段（如果不存在）
IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS
               WHERE TABLE_NAME = 'DbConfig' AND COLUMN_NAME = 'BackupPath')
BEGIN
    ALTER TABLE [dbo].[DbConfig] ADD [BackupPath] [nvarchar](500) NULL;
END

IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS
               WHERE TABLE_NAME = 'DbConfig' AND COLUMN_NAME = 'BackupRetentionDays')
BEGIN
    ALTER TABLE [dbo].[DbConfig] ADD [BackupRetentionDays] [int] NULL DEFAULT 30;
END

IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS
               WHERE TABLE_NAME = 'DbConfig' AND COLUMN_NAME = 'AutoBackupEnabled')
BEGIN
    ALTER TABLE [dbo].[DbConfig] ADD [AutoBackupEnabled] [bit] NULL DEFAULT 0;
END

IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS
               WHERE TABLE_NAME = 'DbConfig' AND COLUMN_NAME = 'AutoBackupTime')
BEGIN
    ALTER TABLE [dbo].[DbConfig] ADD [AutoBackupTime] [nvarchar](10) NULL DEFAULT '02:00';
END

-- 为DbConfig表添加新的备份方案字段（如果不存在）
IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS
               WHERE TABLE_NAME = 'DbConfig' AND COLUMN_NAME = 'DefaultBackupPath')
BEGIN
    ALTER TABLE [dbo].[DbConfig] ADD [DefaultBackupPath] [nvarchar](500) NULL;
END

IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS
               WHERE TABLE_NAME = 'DbConfig' AND COLUMN_NAME = 'AlternativeBackupPath')
BEGIN
    ALTER TABLE [dbo].[DbConfig] ADD [AlternativeBackupPath] [nvarchar](500) NULL;
END

IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS
               WHERE TABLE_NAME = 'DbConfig' AND COLUMN_NAME = 'PreferredBackupScheme')
BEGIN
    ALTER TABLE [dbo].[DbConfig] ADD [PreferredBackupScheme] [nvarchar](20) NULL DEFAULT 'default';
END

-- 更新DbConfig表的备份配置默认值
UPDATE [dbo].[DbConfig]
SET [BackupPath] = ISNULL([BackupPath], '\\tj_server\公共\杂七杂八\品质部临时文件'),
    [BackupRetentionDays] = ISNULL([BackupRetentionDays], 30),
    [AutoBackupEnabled] = ISNULL([AutoBackupEnabled], 0),
    [AutoBackupTime] = ISNULL([AutoBackupTime], '02:00'),
    [DefaultBackupPath] = ISNULL([DefaultBackupPath], ''),
    [AlternativeBackupPath] = ISNULL([AlternativeBackupPath], '\\tj_server\公共\杂七杂八\品质部临时文件'),
    [PreferredBackupScheme] = ISNULL([PreferredBackupScheme], 'default');

PRINT '数据备份功能表结构和配置已初始化完成。';

-- =============================================
-- 月度批次统计表
-- =============================================

-- 创建月度批次统计表
CREATE TABLE [dbo].[MonthlyBatchStats] (
    [ID] [int] IDENTITY(1,1) NOT NULL,
    [StatYear] [int] NOT NULL,
    [StatMonth] [int] NOT NULL,
    [InspectionBatches] [int] NOT NULL DEFAULT 0,
    [DeliveryBatches] [int] NOT NULL DEFAULT 0,
    [Remarks] [nvarchar](500) NULL,
    [CreatedBy] [nvarchar](50) NOT NULL DEFAULT 'admin',
    [CreatedAt] [datetime] NOT NULL DEFAULT GETDATE(),
    [UpdatedBy] [nvarchar](50) NULL,
    [UpdatedAt] [datetime] NULL,
    CONSTRAINT [PK_MonthlyBatchStats] PRIMARY KEY CLUSTERED ([ID] ASC),
    CONSTRAINT [UK_MonthlyBatchStats_YearMonth] UNIQUE ([StatYear], [StatMonth])
);

-- 创建索引
CREATE NONCLUSTERED INDEX [IX_MonthlyBatchStats_YearMonth] ON [dbo].[MonthlyBatchStats] ([StatYear] DESC, [StatMonth] DESC);
CREATE NONCLUSTERED INDEX [IX_MonthlyBatchStats_CreatedAt] ON [dbo].[MonthlyBatchStats] ([CreatedAt] DESC);

-- 插入2025年1-6月的初始数据
INSERT INTO [dbo].[MonthlyBatchStats] ([StatYear], [StatMonth], [InspectionBatches], [DeliveryBatches], [Remarks], [CreatedBy], [CreatedAt]) VALUES
(2025, 1, 4887, 4745, N'2025年1月数据', N'admin', '2025-07-07 09:23:30.433'),
(2025, 2, 5172, 4891, N'2025年2月数据', N'admin', '2025-07-07 09:23:30.433'),
(2025, 3, 6715, 6424, N'2025年3月数据', N'admin', '2025-07-07 09:23:30.433'),
(2025, 4, 6122, 5982, N'2025年4月数据', N'admin', '2025-07-07 09:23:30.433'),
(2025, 5, 5402, 5247, N'2025年5月数据', N'admin', '2025-07-07 09:23:30.433'),
(2025, 6, 6014, 5710, N'2025年6月数据', N'admin', '2025-07-07 09:23:30.433');

PRINT '月度批次统计表已创建并初始化完成。';

-- =====================================================
-- 生产不良返工登记表 (ProductionReworkRegister)
-- 功能：记录生产过程中的不良品返工信息
-- 用途：返工跟踪、成本核算、质量分析、责任追溯
-- =====================================================
CREATE TABLE [dbo].[ProductionReworkRegister] (
    -- 基础信息字段
    [ID] INT IDENTITY(1,1) PRIMARY KEY,              -- 主键，自增ID
    [ReworkDate] DATE NOT NULL,                      -- 返工日期，必填
    [CustomerCode] NVARCHAR(100) NOT NULL,           -- 客户编号，必填
    [OrderNo] NVARCHAR(50) NOT NULL,                 -- 工单号，必填
    [ProductName] NVARCHAR(100) NOT NULL,            -- 产品名称，必填
    [ProductSpec] NVARCHAR(100),                     -- 产品规格
    [TotalQty] INT NOT NULL,                         -- 总数量，必填
    [DefectiveQty] INT NOT NULL,                     -- 不良数量，必填
    [GoodQty] INT,                                   -- 良品数量
    
    -- 不良和返工信息
    [DefectiveReason] NVARCHAR(500) NOT NULL,        -- 不良原因，必填
    [DefectiveCategory] NVARCHAR(50),                -- 不良类别
    [DefectiveDescription] NVARCHAR(500),            -- 不良描述
    [ResponsiblePerson] NVARCHAR(50) NOT NULL,       -- 责任人，必填
    [ResponsibleDept] NVARCHAR(50),                  -- 责任部门
    [Workshop] NVARCHAR(50),                         -- 生产车间
    
    -- 返工信息
    [ReworkCategory] NVARCHAR(50),                   -- 返工类别
    [ReworkPersonnel] NVARCHAR(200),                 -- 返工人员（可多人，逗号分隔）
    [ReworkHours] DECIMAL(8,2),                      -- 返工工时
    [ReworkMethod] NVARCHAR(500),                    -- 返工方法
    [ReworkResult] NVARCHAR(500),                    -- 返工结果
    [ReworkStatus] NVARCHAR(20) DEFAULT N'进行中',    -- 返工状态（进行中/已完成/已取消）
    
    -- 成本信息
    [MaterialCost] DECIMAL(10,2) DEFAULT 0,          -- 材料成本
    [LaborCost] DECIMAL(10,2) DEFAULT 0,             -- 人工成本
    [OtherCost] DECIMAL(10,2) DEFAULT 0,             -- 其他成本
    [TotalCost] DECIMAL(10,2) DEFAULT 0,             -- 总成本
    
    -- 质量信息
    [QualityLevel] NVARCHAR(20),                     -- 质量等级（A/B/C/D）
    [ReworkTimes] INT DEFAULT 1,                     -- 返工次数
    [FinalResult] NVARCHAR(20),                      -- 最终结果（合格/报废/降级）
    
    -- 附件和备注
    [AttachmentFiles] NVARCHAR(1000),                -- 附件文件路径（多个文件用分号分隔）
    [Remarks] NVARCHAR(1000),                        -- 备注说明
    [ProcessNotes] NVARCHAR(1000),                   -- 处理记录
    
    -- 审计信息
    [CreatedBy] NVARCHAR(50) NOT NULL DEFAULT 'admin', -- 创建人
    [CreatedAt] DATETIME NOT NULL DEFAULT GETDATE(),   -- 创建时间
    [UpdatedBy] NVARCHAR(50),                           -- 更新人
    [UpdatedAt] DATETIME,                               -- 更新时间
    [ApprovedBy] NVARCHAR(50),                          -- 审批人
    [ApprovedAt] DATETIME,                              -- 审批时间
    [ApprovalStatus] NVARCHAR(20) DEFAULT N'待审批',     -- 审批状态（待审批/已审批/已拒绝）
    
    -- 统计分析字段
    [DefectiveRate] AS (CAST(DefectiveQty AS DECIMAL(10,2)) / NULLIF(TotalQty, 0) * 100), -- 不良率（计算字段）
    [ReworkEfficiency] AS (CAST(GoodQty AS DECIMAL(10,2)) / NULLIF(DefectiveQty, 0) * 100) -- 返工效率（计算字段）
);

-- 创建索引
CREATE NONCLUSTERED INDEX IX_ReworkRegister_Date ON [dbo].[ProductionReworkRegister] (ReworkDate DESC);
CREATE NONCLUSTERED INDEX IX_ReworkRegister_Customer ON [dbo].[ProductionReworkRegister] (CustomerCode);
CREATE NONCLUSTERED INDEX IX_ReworkRegister_Order ON [dbo].[ProductionReworkRegister] (OrderNo);
CREATE NONCLUSTERED INDEX IX_ReworkRegister_Status ON [dbo].[ProductionReworkRegister] (ReworkStatus, ApprovalStatus);
CREATE NONCLUSTERED INDEX IX_ReworkRegister_Responsible ON [dbo].[ProductionReworkRegister] (ResponsiblePerson, ResponsibleDept);

-- =====================================================
-- 返工类别表 (ReworkCategory)
-- 功能：管理返工类别信息
-- 用途：返工记录的分类标准化
-- =====================================================
CREATE TABLE [dbo].[ReworkCategory] (
    [ID] INT IDENTITY(1,1) PRIMARY KEY,               -- 主键，自增ID
    [Name] NVARCHAR(50) NOT NULL UNIQUE,              -- 类别名称，唯一
    [Description] NVARCHAR(200),                      -- 类别描述
    [IsActive] BIT DEFAULT 1,                         -- 是否启用
    [CreatedAt] DATETIME DEFAULT GETDATE()            -- 创建时间
);

-- =====================================================
-- 返工方法表 (ReworkMethod)
-- 功能：管理标准返工方法
-- 用途：返工方法的标准化管理
-- =====================================================
CREATE TABLE [dbo].[ReworkMethod] (
    [ID] INT IDENTITY(1,1) PRIMARY KEY,               -- 主键，自增ID
    [Name] NVARCHAR(100) NOT NULL,                    -- 方法名称
    [CategoryID] INT FOREIGN KEY REFERENCES ReworkCategory(ID), -- 所属类别
    [Description] NVARCHAR(500),                      -- 方法描述
    [StandardHours] DECIMAL(8,2),                     -- 标准工时
    [StandardCost] DECIMAL(10,2),                     -- 标准成本
    [IsActive] BIT DEFAULT 1,                         -- 是否启用
    [CreatedAt] DATETIME DEFAULT GETDATE()            -- 创建时间
);

GO

-- =====================================================
-- 返工统计视图 (ReworkStatistics)
-- 功能：提供返工数据的统计分析
-- 用途：报表生成、趋势分析
-- =====================================================
CREATE VIEW [dbo].[ReworkStatistics] AS
SELECT 
    YEAR(ReworkDate) as StatYear,
    MONTH(ReworkDate) as StatMonth,
    COUNT(*) as TotalReworkCount,
    SUM(DefectiveQty) as TotalDefectiveQty,
    SUM(GoodQty) as TotalGoodQty,
    SUM(TotalCost) as TotalReworkCost,
    AVG(CAST(DefectiveQty AS DECIMAL(10,2)) / NULLIF(TotalQty, 0) * 100) as AvgDefectiveRate,
    AVG(ReworkHours) as AvgReworkHours,
    COUNT(CASE WHEN FinalResult = N'合格' THEN 1 END) as QualifiedCount,
    COUNT(CASE WHEN FinalResult = N'报废' THEN 1 END) as ScrapCount,
    COUNT(CASE WHEN FinalResult = N'降级' THEN 1 END) as DowngradeCount
FROM ProductionReworkRegister
GROUP BY YEAR(ReworkDate), MONTH(ReworkDate);

GO

-- =====================================================
-- 年度返工汇总视图 (YearlyReworkSummary)
-- 功能：提供年度返工数据汇总
-- 用途：年度报告、KPI统计
-- =====================================================
CREATE VIEW [dbo].[YearlyReworkSummary] AS
SELECT 
    YEAR(ReworkDate) as StatYear,
    COUNT(*) as YearlyReworkCount,
    SUM(DefectiveQty) as YearlyDefectiveQty,
    SUM(GoodQty) as YearlyGoodQty,
    SUM(TotalCost) as YearlyReworkCost,
    AVG(CAST(DefectiveQty AS DECIMAL(10,2)) / NULLIF(TotalQty, 0) * 100) as YearlyAvgDefectiveRate,
    SUM(ReworkHours) as YearlyReworkHours,
    COUNT(CASE WHEN FinalResult = N'合格' THEN 1 END) as YearlyQualifiedCount,
    COUNT(CASE WHEN FinalResult = N'报废' THEN 1 END) as YearlyScrapCount
FROM ProductionReworkRegister
GROUP BY YEAR(ReworkDate);

GO

-- 插入返工类别初始数据
INSERT INTO [dbo].[ReworkCategory] ([Name], [Description]) VALUES 
(N'客退返工', N'客户退货导致的返工处理'),
(N'来料返工', N'原材料质量问题导致的返工'),
(N'制程返工', N'生产制程中出现问题的返工'),
(N'印刷返工', N'印刷过程中的质量问题返工'),
(N'裁切返工', N'裁切工序的尺寸或质量问题返工'),
(N'包装返工', N'包装工序的问题返工'),
(N'设备返工', N'设备故障导致的返工'),
(N'人为返工', N'操作失误导致的返工'),
(N'其他返工', N'其他原因导致的返工');

-- 插入返工方法初始数据
INSERT INTO [dbo].[ReworkMethod] ([Name], [CategoryID], [Description], [StandardHours], [StandardCost]) VALUES 
(N'重新印刷', 1, N'完全重新印刷产品', 2.0, 50.00),
(N'局部修补', 1, N'对印刷缺陷进行局部修补', 0.5, 15.00),
(N'重新裁切', 2, N'重新进行裁切工序', 1.0, 20.00),
(N'尺寸调整', 2, N'对尺寸进行微调', 0.3, 8.00),
(N'重新包装', 3, N'重新进行包装', 0.5, 10.00),
(N'包装修复', 3, N'对包装进行修复', 0.2, 5.00),
(N'材料更换', 4, N'更换不合格材料重新生产', 3.0, 80.00),
(N'设备维修后重做', 5, N'设备维修后重新生产', 4.0, 100.00);

PRINT '生产不良返工登记表及相关表结构已创建完成。';

GO

-- =====================================================
-- 质量等级设定表 (QualityLevelSettings)
-- 功能：存储质量等级的配置信息
-- 用途：质量等级管理、返工记录分级
-- =====================================================
CREATE TABLE [dbo].[QualityLevelSettings] (
    [ID] INT IDENTITY(1,1) PRIMARY KEY,              -- 主键，自增ID
    [Grade] NVARCHAR(10) NOT NULL,                   -- 质量等级（如A、B、C、D）
    [Title] NVARCHAR(50) NOT NULL,                   -- 等级名称（如优秀、良好等）
    [Description] NVARCHAR(200) NOT NULL,           -- 等级描述
    [Range] NVARCHAR(100) NOT NULL,                 -- 适用范围（如合格率范围）
    [CreatedAt] DATETIME DEFAULT GETDATE(),         -- 创建时间
    [UpdatedAt] DATETIME DEFAULT GETDATE()          -- 更新时间
);

-- 创建唯一索引以优化查询性能
CREATE UNIQUE INDEX [IX_QualityLevelSettings_Grade] ON [dbo].[QualityLevelSettings] ([Grade]);

-- 插入质量等级默认数据
INSERT INTO [dbo].[QualityLevelSettings] ([Grade], [Title], [Description], [Range]) VALUES 
(N'A', N'优秀', N'产品质量完全符合标准，无任何缺陷', N'合格率 ≥ 99%'),
(N'B', N'良好', N'产品质量基本符合标准，存在轻微缺陷', N'合格率 95-99%'),
(N'C', N'一般', N'产品质量勉强符合标准，存在明显缺陷', N'合格率 90-95%'),
(N'D', N'不合格', N'产品质量不符合标准，存在严重缺陷', N'合格率 < 90%');

PRINT '质量等级设定表已创建并初始化完成。';

-- =====================================================
-- 权限管理系统索引优化
-- 功能：为权限管理相关表创建索引以优化查询性能
-- =====================================================

-- Department表ParentID索引
CREATE NONCLUSTERED INDEX [IX_Departments_ParentID] ON [dbo].[Department] ([ParentID]);

-- Positions表DepartmentID索引
CREATE NONCLUSTERED INDEX [IX_Positions_DepartmentID] ON [dbo].[Positions] ([DepartmentID]);

-- Menus表ParentID索引
CREATE NONCLUSTERED INDEX [IX_Menus_ParentID] ON [dbo].[Menus] ([ParentID]);

-- User表DepartmentID和PositionID索引
CREATE NONCLUSTERED INDEX [IX_User_DepartmentID] ON [dbo].[User] ([DepartmentID]);
CREATE NONCLUSTERED INDEX [IX_User_PositionID] ON [dbo].[User] ([PositionID]);

PRINT '权限管理系统索引创建完成。';

-- =====================================================
-- 样品承认书管理表 (SampleApproval)
-- 功能：管理样品承认书的制作、签收、分发等全流程
-- 用途：样品管理、质量控制、流程跟踪
-- =====================================================

-- 如果表已存在则删除
IF OBJECT_ID('[dbo].[SampleApproval]', 'U') IS NOT NULL
    DROP TABLE [dbo].[SampleApproval];
GO

CREATE TABLE [dbo].[SampleApproval] (
    -- 基础信息字段
    [ID] INT IDENTITY(1,1) PRIMARY KEY,              -- 主键，自增ID
    [CertificateNo] NVARCHAR(50) NOT NULL UNIQUE,    -- 承认书编号，唯一
    [CustomerNo] NVARCHAR(50) NOT NULL,              -- 客户编号，必填
    [WorkOrderNo] NVARCHAR(50) NOT NULL,             -- 工单号，必填
    [ProductNo] NVARCHAR(50) NOT NULL,               -- 产品编号，必填
    [ProductName] NVARCHAR(100) NOT NULL,            -- 品名，必填
    [ProductSpec] NVARCHAR(200) NOT NULL,            -- 产品规格，必填
    
    -- 图片文件字段
    [ProductDrawing] NVARCHAR(500),                  -- 产品图纸文件路径
    [ColorCardImage] NVARCHAR(500),                  -- 色卡图像文件路径
    [ColorCardQuantity] INT NOT NULL DEFAULT 1,      -- 色卡数量，默认1
    
    -- 制作信息
    [CreateDate] DATE NOT NULL,                      -- 制作日期，必填
    [Creator] NVARCHAR(50) NOT NULL,                 -- 制作人，必填
    [Follower] NVARCHAR(50) NOT NULL,                -- 跟单员，必填
    
    -- 签收信息
    [Receiver] NVARCHAR(50),                         -- 签收人
    [ReceiveDate] DATE,                              -- 签收日期
    [ReturnQuantity] INT DEFAULT 0,                  -- 退回数量
    [Signer] NVARCHAR(50),                           -- 签字人
    [SignDate] DATE,                                 -- 签字日期
    [Judgment] NVARCHAR(200),                        -- 判定结果
    
    -- 分发信息
    [DistributionDepartment] NVARCHAR(500),          -- 分发部门（JSON格式存储多个部门）
    [DistributionQuantity] INT DEFAULT 0,            -- 分发数量
    
    -- 状态和备注
    [SampleStatus] NVARCHAR(20) DEFAULT N'正常使用', -- 样板状态：正常使用、待更新、待作废、已作废
    [ExpiryDate] DATE,                               -- 到期日期
    [Remark] NVARCHAR(1000),                         -- 备注信息
    
    -- 系统字段
    [CreatedAt] DATETIME DEFAULT GETDATE(),          -- 记录创建时间
    [UpdatedAt] DATETIME DEFAULT GETDATE(),          -- 记录更新时间
    [CreatedBy] NVARCHAR(50),                        -- 创建人
    [UpdatedBy] NVARCHAR(50),                        -- 更新人
    [IsDeleted] BIT DEFAULT 0                        -- 软删除标记
);

-- 创建索引优化查询性能
CREATE NONCLUSTERED INDEX [IX_SampleApproval_CertificateNo] ON [dbo].[SampleApproval] ([CertificateNo]);
CREATE NONCLUSTERED INDEX [IX_SampleApproval_CustomerNo] ON [dbo].[SampleApproval] ([CustomerNo]);
CREATE NONCLUSTERED INDEX [IX_SampleApproval_WorkOrderNo] ON [dbo].[SampleApproval] ([WorkOrderNo]);
CREATE NONCLUSTERED INDEX [IX_SampleApproval_ProductNo] ON [dbo].[SampleApproval] ([ProductNo]);
CREATE NONCLUSTERED INDEX [IX_SampleApproval_CreateDate] ON [dbo].[SampleApproval] ([CreateDate] DESC);
CREATE NONCLUSTERED INDEX [IX_SampleApproval_SampleStatus] ON [dbo].[SampleApproval] ([SampleStatus]);
CREATE NONCLUSTERED INDEX [IX_SampleApproval_ExpiryDate] ON [dbo].[SampleApproval] ([ExpiryDate] DESC);
CREATE NONCLUSTERED INDEX [IX_SampleApproval_Creator] ON [dbo].[SampleApproval] ([Creator]);
CREATE NONCLUSTERED INDEX [IX_SampleApproval_Follower] ON [dbo].[SampleApproval] ([Follower]);

GO

-- =====================================================
-- 样品承认书统计视图 (SampleApprovalStatistics)
-- 功能：提供样品承认书数据的统计分析
-- 用途：报表生成、趋势分析、KPI统计
-- =====================================================

-- 如果视图已存在则删除
IF OBJECT_ID('[dbo].[SampleApprovalStatistics]', 'V') IS NOT NULL
    DROP VIEW [dbo].[SampleApprovalStatistics];
GO

CREATE VIEW [dbo].[SampleApprovalStatistics] AS
SELECT 
    YEAR(CreateDate) as StatYear,
    MONTH(CreateDate) as StatMonth,
    COUNT(*) as TotalSampleCount,
    SUM(ColorCardQuantity) as TotalColorCardQty,
    SUM(DistributionQuantity) as TotalDistributionQty,
    AVG(DATEDIFF(DAY, CreateDate, ReceiveDate)) as AvgReceiveDays,
    COUNT(DISTINCT CustomerNo) as UniqueCustomerCount,
    COUNT(DISTINCT Creator) as UniqueCreatorCount,
    COUNT(DISTINCT Follower) as UniqueFollowerCount
FROM SampleApproval
WHERE IsDeleted = 0
GROUP BY YEAR(CreateDate), MONTH(CreateDate);

GO

-- =====================================================
-- 年度样品承认书汇总视图 (YearlySampleApprovalSummary)
-- 功能：提供年度样品承认书数据汇总
-- 用途：年度报告、绩效评估
-- =====================================================

-- 如果视图已存在则删除
IF OBJECT_ID('[dbo].[YearlySampleApprovalSummary]', 'V') IS NOT NULL
    DROP VIEW [dbo].[YearlySampleApprovalSummary];
GO

CREATE VIEW [dbo].[YearlySampleApprovalSummary] AS
SELECT 
    YEAR(CreateDate) as StatYear,
    COUNT(*) as YearlySampleCount,
    SUM(ColorCardQuantity) as YearlyColorCardQty,
    SUM(DistributionQuantity) as YearlyDistributionQty,
    AVG(DATEDIFF(DAY, CreateDate, ReceiveDate)) as YearlyAvgReceiveDays,
    COUNT(DISTINCT CustomerNo) as YearlyUniqueCustomerCount
FROM SampleApproval
WHERE IsDeleted = 0
GROUP BY YEAR(CreateDate);

GO

-- 插入样品承认书测试数据
INSERT INTO [dbo].[SampleApproval] (
    [CertificateNo], [CustomerNo], [WorkOrderNo], [ProductNo], [ProductName], [ProductSpec],
    [ProductDrawing], [ColorCardImage], [ColorCardQuantity], [CreateDate], [Creator], [Follower],
    [Remark], [CreatedBy]
) VALUES 
(N'SA2025001', N'C001', N'WO2025001', N'P001', N'产品A', N'规格A', 
 N'/files/site-images/产品图纸/drawing1-1735891200000-123456789.jpg', 
 N'/files/site-images/样板图像/colorcard1-1735891200000-987654321.jpg', 
 2, '2025-01-01', N'张三', N'李四', N'测试数据1', N'admin'),
(N'SA2025002', N'C002', N'WO2025002', N'P002', N'产品B', N'规格B', 
 N'/files/site-images/产品图纸/drawing2-1735891200000-123456790.jpg', 
 N'/files/site-images/样板图像/colorcard2-1735891200000-987654322.jpg', 
 1, '2025-01-02', N'王五', N'赵六', N'测试数据2', N'admin'),
(N'SA2025003', N'C003', N'WO2025003', N'P003', N'产品C', N'规格C', 
 N'/files/site-images/产品图纸/drawing3-1735891200000-123456791.jpg', 
 N'/files/site-images/样板图像/colorcard3-1735891200000-987654323.jpg', 
 3, '2025-01-03', N'孙七', N'周八', N'测试数据3', N'admin');

PRINT '样品承认书管理表及相关视图已创建完成。';
PRINT '用户权限管理系统数据库表结构已完整集成到init.sql中！';
PRINT '样品管理模块数据库表结构创建完成！';

-- =====================================================
-- 客户投诉记录表 (CustomerComplaints)
-- 功能：记录客户投诉的详细信息和处理过程
-- 用途：投诉管理、质量跟踪、责任追溯
-- 兼容：SQL Server 2008R2 及以上版本
-- =====================================================
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[CustomerComplaints]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[CustomerComplaints] (
        -- 基础信息字段
        [ID] INT IDENTITY(1,1) PRIMARY KEY,                    -- 主键，自增ID
        [Date] DATE NOT NULL,                                  -- 投诉日期，必填
        [CustomerCode] NVARCHAR(50) NOT NULL,                  -- 客户编号，必填
        [WorkOrderNo] NVARCHAR(50) NOT NULL,                   -- 工单号，必填
        [ProductName] NVARCHAR(200) NOT NULL,                  -- 品名，必填
        [Specification] NVARCHAR(200) NULL,                    -- 规格，可空
        [OrderQuantity] INT NULL,                              -- 订单数量，可空
        [ProblemDescription] NVARCHAR(2000) NOT NULL,          -- 问题描述，必填
        [ProblemImages] NVARCHAR(MAX) NULL,                    -- 问题图片（JSON格式），可空
        [DefectQuantity] INT NULL,                             -- 不良数量，可空
        [DefectRate] DECIMAL(5,2) NULL,                       -- 不良率，可空
        [ComplaintMethod] NVARCHAR(20) NOT NULL,               -- 投诉方式，必填
        
        -- 处理信息字段
        [ProcessingDeadline] DATE NULL,                        -- 处理时限，可空
        [RequireReport] BIT NULL,                              -- 是否需要报告，可空
        [CauseAnalysis] NVARCHAR(2000) NULL,                  -- 原因分析，可空
        [CorrectiveActions] NVARCHAR(2000) NULL,              -- 纠正措施，可空
        [DisposalMeasures] NVARCHAR(2000) NULL,               -- 处置措施，可空
        [ResponsibleDepartment] NVARCHAR(50) NULL,            -- 责任部门，可空
        [ResponsiblePerson] NVARCHAR(50) NULL,                -- 责任人，可空
        [ReplyDate] DATE NULL,                                 -- 回复日期，可空
        [ReportAttachments] NVARCHAR(MAX) NULL,               -- 报告附件（JSON格式），可空
        [FeedbackPerson] NVARCHAR(50) NULL,                   -- 反馈人，可空
        [FeedbackDate] DATE NULL,                             -- 反馈日期，可空
        [Processor] NVARCHAR(50) NULL,                        -- 处理人，可空
        [ImprovementVerification] NVARCHAR(2000) NULL,        -- 改善验证，可空
        [VerificationDate] DATE NULL,                         -- 验证日期，可空
        [Status] NVARCHAR(20) NULL DEFAULT 'pending',         -- 处理状态，默认pending
        
        -- 系统字段
        [CreatedBy] NVARCHAR(50) NULL,                        -- 创建人
        [CreatedAt] DATETIME NULL DEFAULT GETDATE(),          -- 创建时间
        [UpdatedBy] NVARCHAR(50) NULL,                        -- 更新人
        [UpdatedAt] DATETIME NULL DEFAULT GETDATE()           -- 更新时间
    );
    
    -- 创建索引以优化查询性能
    CREATE INDEX [IX_CustomerComplaints_Date] ON [dbo].[CustomerComplaints] ([Date]);
    CREATE INDEX [IX_CustomerComplaints_CustomerCode] ON [dbo].[CustomerComplaints] ([CustomerCode]);
    CREATE INDEX [IX_CustomerComplaints_WorkOrderNo] ON [dbo].[CustomerComplaints] ([WorkOrderNo]);
    CREATE INDEX [IX_CustomerComplaints_Status] ON [dbo].[CustomerComplaints] ([Status]);
    CREATE INDEX [IX_CustomerComplaints_ResponsibleDepartment] ON [dbo].[CustomerComplaints] ([ResponsibleDepartment]);
    CREATE INDEX [IX_CustomerComplaints_ResponsiblePerson] ON [dbo].[CustomerComplaints] ([ResponsiblePerson]);
    
    PRINT 'CustomerComplaints 表创建成功。';
END
ELSE
BEGIN
    PRINT 'CustomerComplaints 表已存在，跳过创建。';
END

PRINT '客户投诉记录表结构创建完成！';
PRINT 'DMS-QA 数据库初始化脚本执行完成！';