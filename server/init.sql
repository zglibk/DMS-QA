-- 投诉登记表
CREATE TABLE [dbo].[ComplaintRegister] (
    [ID] INT IDENTITY(1,1) PRIMARY KEY,
    [Date] DATE NOT NULL,
    [Customer] NVARCHAR(100) NOT NULL,
    [OrderNo] NVARCHAR(50),
    [ProductName] NVARCHAR(100),
    [Specification] NVARCHAR(100),
    [Workshop] NVARCHAR(50),
    [ProductionQty] INT,
    [DefectiveQty] INT,
    [DefectiveRate] DECIMAL(5,2),
    [ComplaintCategory] NVARCHAR(50),
    [CustomerComplaintType] NVARCHAR(50),
    [DefectiveCategory] NVARCHAR(50),
    [DefectiveItem] NVARCHAR(100),
    [DefectiveDescription] NVARCHAR(500),
    [AttachmentFile] NVARCHAR(500),
    [DefectiveReason] NVARCHAR(500),
    [Disposition] NVARCHAR(500),
    [ReturnGoods] BIT,
    [IsReprint] BIT,
    [ReprintQty] INT,
    [Paper] NVARCHAR(50),
    [PaperSpecification] NVARCHAR(100),
    [PaperQty] INT,
    [PaperUnitPrice] DECIMAL(10,2),
    [MaterialA] NVARCHAR(50),
    [MaterialASpec] NVARCHAR(100),
    [MaterialAQty] INT,
    [MaterialAUnitPrice] DECIMAL(10,2),
    [MaterialB] NVARCHAR(50),
    [MaterialBSpec] NVARCHAR(100),
    [MaterialBQty] INT,
    [MaterialBUnitPrice] DECIMAL(10,2),
    [MaterialC] NVARCHAR(50),
    [MaterialCSpec] NVARCHAR(100),
    [MaterialCQty] INT,
    [MaterialCUnitPrice] DECIMAL(10,2),
    [LaborCost] DECIMAL(10,2),
    [TotalCost] DECIMAL(10,2),
    [MainDept] NVARCHAR(50),
    [MainPerson] NVARCHAR(50),
    [MainPersonAssessment] DECIMAL(10,2),
    [SecondPerson] NVARCHAR(50),
    [SecondPersonAssessment] DECIMAL(10,2),
    [Manager] NVARCHAR(50),
    [ManagerAssessment] DECIMAL(10,2),
    [AssessmentDescription] NVARCHAR(500)
);

-- 单价表
CREATE TABLE [dbo].[MaterialPrice] (
    [ID] INT IDENTITY(1,1) PRIMARY KEY,
    [MaterialName] NVARCHAR(100) NOT NULL,
    [UnitPrice] DECIMAL(10,2) NOT NULL,
    [Supplier] NVARCHAR(100)
);

-- 用户表
CREATE TABLE [dbo].[User] (
    [ID] INT IDENTITY(1,1) PRIMARY KEY,
    [Username] NVARCHAR(50) NOT NULL UNIQUE,
    [Password] NVARCHAR(100) NOT NULL,
    [RealName] NVARCHAR(32),
    [Avatar] NVARCHAR(MAX),
    [Email] NVARCHAR(64),
    [Phone] NVARCHAR(20),
    [Department] NVARCHAR(32),
    [Role] NVARCHAR(32),
    [Status] INT DEFAULT 1, -- 1=启用, 0=禁用
    [CreatedAt] DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 车间表
CREATE TABLE [dbo].[Workshop] (
    [ID] INT IDENTITY(1,1) PRIMARY KEY,
    [Name] NVARCHAR(50) NOT NULL UNIQUE
);

-- 部门表
CREATE TABLE [dbo].[Department] (
    [ID] INT IDENTITY(1,1) PRIMARY KEY,
    [Name] NVARCHAR(50) NOT NULL UNIQUE
);

-- 人员表
CREATE TABLE [dbo].[Person] (
    [ID] INT IDENTITY(1,1) PRIMARY KEY,
    [Name] NVARCHAR(50) NOT NULL UNIQUE,
    [DepartmentID] INT FOREIGN KEY REFERENCES Department(ID)
);

-- 投诉类别表
CREATE TABLE [dbo].[ComplaintCategory] (
    [ID] INT IDENTITY(1,1) PRIMARY KEY,
    [Name] NVARCHAR(50) NOT NULL UNIQUE
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

-- 数据库配置表
CREATE TABLE [dbo].[DbConfig] (
    [ID] INT IDENTITY(1,1) PRIMARY KEY,
    [Host] NVARCHAR(100) NOT NULL,
    [DatabaseName] NVARCHAR(100) NOT NULL,
    [DbUser] NVARCHAR(100) NOT NULL,
    [DbPassword] NVARCHAR(100) NOT NULL,
    [UpdatedAt] DATETIME,
    [ConfigName] NVARCHAR(50),
    [IsCurrent] BIT,
    [IsValid] BIT,
    [Remark] NVARCHAR(200),
    [FileStoragePath] NVARCHAR(500),
    [FileServerPort] INT,
    [FileUrlPrefix] NVARCHAR(100),
    [ExcelTempPath] NVARCHAR(500),
    [NetworkSharePath] NVARCHAR(500)
);

-- 如果表已存在，添加缺少的字段
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('[dbo].[DbConfig]') AND name = 'ExcelTempPath')
BEGIN
    ALTER TABLE [dbo].[DbConfig] ADD [ExcelTempPath] NVARCHAR(500);
END

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('[dbo].[DbConfig]') AND name = 'NetworkSharePath')
BEGIN
    ALTER TABLE [dbo].[DbConfig] ADD [NetworkSharePath] NVARCHAR(500);
END

-- 路径映射配置表
CREATE TABLE [dbo].[PathMappingConfig] (
    [ID] INT IDENTITY(1,1) PRIMARY KEY,
    [Name] NVARCHAR(100) NOT NULL,
    [LocalPattern] NVARCHAR(500) NOT NULL,
    [TargetPattern] NVARCHAR(500) NOT NULL,
    [Description] NVARCHAR(200),
    [IsActive] BIT DEFAULT 1,
    [CreatedAt] DATETIME DEFAULT GETDATE(),
    [UpdatedAt] DATETIME DEFAULT GETDATE()
);

-- 主页卡片配置表
CREATE TABLE [dbo].[HomeCardConfig] (
    [ID] INT IDENTITY(1,1) PRIMARY KEY,
    [ConfigKey] NVARCHAR(50) NOT NULL,
    [ConfigValue] NVARCHAR(MAX),
    [Description] NVARCHAR(200),
    [IsActive] BIT DEFAULT 1,
    [CreatedAt] DATETIME DEFAULT GETDATE(),
    [UpdatedAt] DATETIME DEFAULT GETDATE()
);

-- 插入默认路径映射规则
INSERT INTO [dbo].[PathMappingConfig] ([Name], [LocalPattern], [TargetPattern], [Description]) VALUES
(N'Excel临时文件映射', N'C:\Users\*\AppData\Roaming\Microsoft\Excel\*', N'\\tj_server\工作\品质部\生产异常周报考核统计\*', N'Excel临时文件映射到tj_server共享盘'),
(N'2025年异常汇总映射', N'*2025年异常汇总\*', N'\\tj_server\工作\品质部\生产异常周报考核统计\2025年异常汇总\不良图片&资料\*', N'2025年异常汇总文件映射');

-- 插入默认主页卡片配置
INSERT INTO [dbo].[HomeCardConfig] ([ConfigKey], [ConfigValue], [Description]) VALUES
(N'showTodayCount', N'true', N'是否显示今日投诉统计卡片'),
(N'showMonthCount', N'true', N'是否显示本月投诉统计卡片'),
(N'displayUnits', N'[{"name":"数码印刷","type":"workshop","enabled":true},{"name":"轮转机","type":"workshop","enabled":true},{"name":"跟单","type":"department","enabled":true},{"name":"设计","type":"department","enabled":true},{"name":"品检","type":"department","enabled":true}]', N'显示的部门/车间单位配置');

-- 插入下拉列表的初始数据
-- 车间
INSERT INTO [dbo].[Workshop] (Name) VALUES (N'印刷车间'), (N'裁切车间'), (N'包装车间');
-- 部门
INSERT INTO [dbo].[Department] (Name) VALUES (N'生产部'), (N'质检部'), (N'销售部');
-- 人员 (注意：这里的DepartmentID依赖于上面部门的插入顺序，1=生产部, 2=质检部)
INSERT INTO [dbo].[Person] (Name, DepartmentID) VALUES (N'张三', 1), (N'李四', 1), (N'王五', 2);
-- 投诉类别
INSERT INTO [dbo].[ComplaintCategory] (Name) VALUES (N'客户投诉'), (N'内部质量问题');
-- 客诉类型
INSERT INTO [dbo].[CustomerComplaintType] (Name) VALUES (N'产品质量'), (N'交货期'), (N'服务态度');
-- 不良类别 (与之前插入不良项的脚本对应)
INSERT INTO [dbo].[DefectiveCategory] (Name) VALUES (N'印刷类'), (N'裁切类'), (N'包装类'), (N'未分类');

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