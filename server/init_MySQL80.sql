/*
 * DMS-QA 质量管理系统数据库初始化脚本（MySQL 8.0版，兼容原表名）
 * 表名与原SQL Server一致：ComplaintRegister、MaterialPrice 等
 */

-- =====================================================
-- 投诉登记表 (ComplaintRegister)
-- =====================================================
CREATE TABLE `ComplaintRegister` (
    `ID` INT AUTO_INCREMENT PRIMARY KEY,              -- 主键，自增ID
    `Date` DATE NOT NULL,                            -- 投诉日期，必填
    `Customer` VARCHAR(100) NOT NULL,                -- 客户名称（MySQL用VARCHAR，默认utf8mb4支持中文）
    `OrderNo` VARCHAR(50),                           -- 订单号
    `ProductName` VARCHAR(100),                      -- 产品名称
    `Specification` VARCHAR(100),                    -- 产品规格
    `Workshop` VARCHAR(50),                          -- 生产车间

    -- 数量和质量信息
    `ProductionQty` INT,                             -- 生产数量
    `DefectiveQty` INT,                              -- 不良品数量
    `DefectiveRate` DECIMAL(5,2),                    -- 不良率（百分比）

    -- 投诉分类信息
    `ComplaintCategory` VARCHAR(50),                 -- 投诉类别
    `CustomerComplaintType` VARCHAR(50),             -- 客户投诉类型
    `DefectiveCategory` VARCHAR(50),                 -- 不良品类别
    `DefectiveItem` VARCHAR(100),                    -- 不良项目
    `DefectiveDescription` VARCHAR(500),             -- 不良描述
    `AttachmentFile` VARCHAR(500),                   -- 附件文件路径

    -- 处理信息
    `DefectiveReason` VARCHAR(500),                  -- 不良原因分析
    `Disposition` VARCHAR(500),                       -- 处置措施
    `ReturnGoods` TINYINT(1),                         -- 是否退货（0=否，1=是，MySQL用TINYINT替代BIT）
    `IsReprint` TINYINT(1),                           -- 是否重印
    `ReprintQty` INT,                                -- 重印数量

    -- 成本核算 - 纸张
    `Paper` VARCHAR(50),                              -- 纸张名称
    `PaperSpecification` VARCHAR(100),               -- 纸张规格
    `PaperQty` INT,                                  -- 纸张数量
    `PaperUnitPrice` DECIMAL(10,2),                  -- 纸张单价

    -- 成本核算 - 材料A/B/C
    `MaterialA` VARCHAR(50),                         -- 材料A名称
    `MaterialASpec` VARCHAR(100),                    -- 材料A规格
    `MaterialAQty` INT,                              -- 材料A数量
    `MaterialAUnitPrice` DECIMAL(10,2),              -- 材料A单价
    `MaterialB` VARCHAR(50),                         -- 材料B名称
    `MaterialBSpec` VARCHAR(100),                    -- 材料B规格
    `MaterialBQty` INT,                              -- 材料B数量
    `MaterialBUnitPrice` DECIMAL(10,2),              -- 材料B单价
    `MaterialC` VARCHAR(50),                         -- 材料C名称
    `MaterialCSpec` VARCHAR(100),                    -- 材料C规格
    `MaterialCQty` INT,                              -- 材料C数量
    `MaterialCUnitPrice` DECIMAL(10,2),              -- 材料C单价

    -- 成本核算 - 总计
    `LaborCost` DECIMAL(10,2),                        -- 人工成本
    `TotalCost` DECIMAL(10,2),                        -- 总成本

    -- 责任追溯
    `MainDept` VARCHAR(50),                          -- 主要责任部门
    `MainPerson` VARCHAR(50),                        -- 主要责任人
    `MainPersonAssessment` DECIMAL(10,2),           -- 主要责任人考核金额
    `SecondPerson` VARCHAR(50),                       -- 次要责任人
    `SecondPersonAssessment` DECIMAL(10,2),         -- 次要责任人考核金额
    `Manager` VARCHAR(50),                           -- 管理责任人
    `ManagerAssessment` DECIMAL(10,2),               -- 管理责任人考核金额
    `AssessmentDescription` VARCHAR(500)             -- 考核说明
);

-- =====================================================
-- 材料价格表 (MaterialPrice)
-- =====================================================
CREATE TABLE `MaterialPrice` (
    `ID` INT AUTO_INCREMENT PRIMARY KEY,              -- 主键，自增ID
    `MaterialName` VARCHAR(100) NOT NULL,             -- 材料名称，必填
    `Supplier` VARCHAR(100),                          -- 供应商名称
    `UnitPrice` DECIMAL(10,2) NULL,                   -- 单价（允许为空）
    `Remarks` VARCHAR(500),                            -- 备注信息

    -- 时间管理
    `EffectiveDate` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, -- 生效日期（MySQL用CURRENT_TIMESTAMP）
    `ExpiryDate` DATETIME NULL,                       -- 失效日期（NULL=当前有效）
    `IsActive` TINYINT(1) NOT NULL DEFAULT 1,         -- 是否为当前有效价格（1=是）
    `Version` INT NOT NULL DEFAULT 1,                  -- 版本号

    -- 审计信息
    `CreatedBy` VARCHAR(50),                          -- 创建人
    `CreatedDate` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, -- 创建时间
    `UpdatedBy` VARCHAR(50),                          -- 更新人
    `UpdatedDate` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP  -- 更新时间
);

-- 索引（MySQL无需指定NONCLUSTERED，默认二级索引为非聚簇）
CREATE INDEX `IX_MaterialPrice_Active` ON `MaterialPrice` (`MaterialName`, `Supplier`, `IsActive`);
CREATE INDEX `IX_MaterialPrice_EffectiveDate` ON `MaterialPrice` (`EffectiveDate`);
CREATE INDEX `IX_MaterialPrice_Material` ON `MaterialPrice` (`MaterialName`);

-- =====================================================
-- 当前有效价格视图 (CurrentMaterialPrice)
-- =====================================================
CREATE VIEW `CurrentMaterialPrice` AS
SELECT
    `ID`, `MaterialName`, `Supplier`, `UnitPrice`, `Remarks`,
    `EffectiveDate`, `Version`, `CreatedBy`, `CreatedDate`, `UpdatedBy`, `UpdatedDate`
FROM `MaterialPrice`
WHERE `IsActive` = 1;

-- =====================================================
-- 存储过程：更新价格（自动处理历史记录）
-- =====================================================
DELIMITER $$
CREATE PROCEDURE `UpdateMaterialPrice`(
    IN `p_MaterialName` VARCHAR(100),
    IN `p_Supplier` VARCHAR(100),
    IN `p_NewUnitPrice` DECIMAL(10,2),
    IN `p_Remarks` VARCHAR(500),
    IN `p_UpdatedBy` VARCHAR(50),
    IN `p_EffectiveDate` DATETIME
)
BEGIN
    DECLARE `v_CurrentDate` DATETIME;
    DECLARE `v_MaxVersion` INT;
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        SELECT 'ERROR' AS `Result`, '价格更新失败' AS `Message`;
    END;

    SET `v_CurrentDate` = IFNULL(`p_EffectiveDate`, CURRENT_TIMESTAMP);
    
    -- 获取当前最大版本号
    SELECT IFNULL(MAX(`Version`), 0) INTO `v_MaxVersion`
    FROM `MaterialPrice`
    WHERE `MaterialName` = `p_MaterialName`
      AND IFNULL(`Supplier`, '') = IFNULL(`p_Supplier`, '');

    START TRANSACTION;

    -- 将当前有效记录设为历史记录
    UPDATE `MaterialPrice`
    SET
        `IsActive` = 0,
        `ExpiryDate` = `v_CurrentDate`,
        `UpdatedBy` = `p_UpdatedBy`,
        `UpdatedDate` = `v_CurrentDate`
    WHERE `MaterialName` = `p_MaterialName`
      AND IFNULL(`Supplier`, '') = IFNULL(`p_Supplier`, '')
      AND `IsActive` = 1;

    -- 插入新的价格记录
    INSERT INTO `MaterialPrice` (
        `MaterialName`, `Supplier`, `UnitPrice`, `Remarks`,
        `EffectiveDate`, `IsActive`, `Version`, `CreatedBy`, `UpdatedBy`
    ) VALUES (
        `p_MaterialName`, `p_Supplier`, `p_NewUnitPrice`, `p_Remarks`,
        `v_CurrentDate`, 1, `v_MaxVersion` + 1, `p_UpdatedBy`, `p_UpdatedBy`
    );

    COMMIT;
    SELECT 'SUCCESS' AS `Result`, '价格更新成功' AS `Message`;
END$$
DELIMITER ;

-- =====================================================
-- 存储过程：获取价格历史
-- =====================================================
DELIMITER $$
CREATE PROCEDURE `GetMaterialPriceHistory`(
    IN `p_MaterialName` VARCHAR(100),
    IN `p_Supplier` VARCHAR(100)
)
BEGIN
    SELECT
        `ID`, `MaterialName`, `Supplier`, `UnitPrice`, `Remarks`,
        `EffectiveDate`, `ExpiryDate`, `IsActive`, `Version`,
        `CreatedBy`, `CreatedDate`, `UpdatedBy`, `UpdatedDate`,
        CASE WHEN `IsActive` = 1 THEN '当前价格' ELSE '历史价格' END AS `PriceStatus`
    FROM `MaterialPrice`
    WHERE `MaterialName` = `p_MaterialName`
      AND IFNULL(`Supplier`, '') = IFNULL(`p_Supplier`, '')
    ORDER BY `Version` DESC, `EffectiveDate` DESC;
END$$
DELIMITER ;

-- =====================================================
-- 用户表 (User)
-- =====================================================
CREATE TABLE `User` (
    `ID` INT AUTO_INCREMENT PRIMARY KEY,              -- 主键，自增ID
    `Username` VARCHAR(50) NOT NULL UNIQUE,           -- 用户名，唯一
    `Password` VARCHAR(100) NOT NULL,                 -- 密码（bcrypt哈希）
    `RealName` VARCHAR(32),                           -- 真实姓名
    `Avatar` TEXT,                                     -- 头像（MySQL用TEXT替代NVARCHAR(MAX)）
    `Email` VARCHAR(64),                               -- 邮箱地址
    `Phone` VARCHAR(20),                               -- 手机号码
    `Department` VARCHAR(32),                          -- 所属部门
    `Role` VARCHAR(32),                                -- 用户角色（admin/user等）
    `Status` INT DEFAULT 1,                            -- 状态（1=启用，0=禁用）
    `CreatedAt` DATETIME DEFAULT CURRENT_TIMESTAMP    -- 创建时间
);

-- =====================================================
-- 车间表 (Workshop)
-- =====================================================
CREATE TABLE `Workshop` (
    `ID` INT AUTO_INCREMENT PRIMARY KEY,              -- 主键，自增ID
    `Name` VARCHAR(50) NOT NULL UNIQUE                -- 车间名称，唯一
);

-- =====================================================
-- 部门表 (Department)
-- =====================================================
CREATE TABLE `Department` (
    `ID` INT AUTO_INCREMENT PRIMARY KEY,              -- 主键，自增ID
    `Name` VARCHAR(50) NOT NULL UNIQUE                -- 部门名称，唯一
);

-- =====================================================
-- 人员表 (Person)
-- =====================================================
CREATE TABLE `Person` (
    `ID` INT AUTO_INCREMENT PRIMARY KEY,              -- 主键，自增ID
    `Name` VARCHAR(50) NOT NULL UNIQUE,               -- 人员姓名，唯一
    `DepartmentID` INT,
    FOREIGN KEY (`DepartmentID`) REFERENCES `Department`(`ID`)  -- 外键关联部门表
);

-- =====================================================
-- 投诉类别表 (ComplaintCategory)
-- =====================================================
CREATE TABLE `ComplaintCategory` (
    `ID` INT AUTO_INCREMENT PRIMARY KEY,              -- 主键，自增ID
    `Name` VARCHAR(50) NOT NULL UNIQUE                -- 类别名称，唯一
);

-- 客诉类型表
CREATE TABLE `CustomerComplaintType` (
    `ID` INT AUTO_INCREMENT PRIMARY KEY,
    `Name` VARCHAR(50) NOT NULL UNIQUE
);

-- 不良类别表
CREATE TABLE `DefectiveCategory` (
    `ID` INT AUTO_INCREMENT PRIMARY KEY,
    `Name` VARCHAR(50) NOT NULL UNIQUE
);

-- 不良项表
CREATE TABLE `DefectiveItem` (
    `ID` INT AUTO_INCREMENT PRIMARY KEY,
    `Name` VARCHAR(100) NOT NULL UNIQUE,
    `CategoryID` INT,
    FOREIGN KEY (`CategoryID`) REFERENCES `DefectiveCategory`(`ID`)
);

-- "记住我"功能的令牌表
CREATE TABLE `UserTokens` (
    `ID` INT AUTO_INCREMENT PRIMARY KEY,
    `UserId` INT NOT NULL,
    `Token` VARCHAR(255) NOT NULL UNIQUE,
    `ExpiresAt` DATETIME NOT NULL,
    FOREIGN KEY (`UserId`) REFERENCES `User`(`ID`) ON DELETE CASCADE
);

-- =====================================================
-- 数据库配置表 (DbConfig)
-- =====================================================
CREATE TABLE `DbConfig` (
    `ID` INT AUTO_INCREMENT PRIMARY KEY,              -- 主键，自增ID
    `Host` VARCHAR(100) NOT NULL,                     -- 数据库服务器地址
    `DatabaseName` VARCHAR(100) NOT NULL,             -- 数据库名称
    `DbUser` VARCHAR(100) NOT NULL,                   -- 数据库用户名
    `DbPassword` VARCHAR(100) NOT NULL,               -- 数据库密码
    `UpdatedAt` DATETIME,                             -- 更新时间
    `ConfigName` VARCHAR(50),                         -- 配置名称
    `IsCurrent` TINYINT(1),                           -- 是否为当前使用的配置
    `IsValid` TINYINT(1),                             -- 配置是否有效
    `Remark` VARCHAR(200),                            -- 备注说明
    `FileStoragePath` VARCHAR(500),                   -- 文件存储路径
    `FileServerPort` INT,                             -- 文件服务器端口
    `FileUrlPrefix` VARCHAR(100),                     -- 文件URL前缀
    `ExcelTempPath` VARCHAR(500),                     -- Excel临时文件路径
    `NetworkSharePath` VARCHAR(500)                   -- 网络共享路径
);

-- 检查并添加ExcelTempPath字段（MySQL版本）
SET @col_exists = (
    SELECT COUNT(*) 
    FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'DbConfig' 
      AND COLUMN_NAME = 'ExcelTempPath'
);
IF @col_exists = 0 THEN
    ALTER TABLE `DbConfig` ADD `ExcelTempPath` VARCHAR(500);
END IF;

-- 检查并添加NetworkSharePath字段
SET @col_exists = (
    SELECT COUNT(*) 
    FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'DbConfig' 
      AND COLUMN_NAME = 'NetworkSharePath'
);
IF @col_exists = 0 THEN
    ALTER TABLE `DbConfig` ADD `NetworkSharePath` VARCHAR(500);
END IF;

-- =====================================================
-- 路径映射配置表 (PathMappingConfig)
-- =====================================================
CREATE TABLE `PathMappingConfig` (
    `ID` INT AUTO_INCREMENT PRIMARY KEY,              -- 主键，自增ID
    `Name` VARCHAR(100) NOT NULL,                     -- 映射规则名称
    `LocalPattern` VARCHAR(500) NOT NULL,             -- 本地路径模式
    `TargetPattern` VARCHAR(500) NOT NULL,            -- 目标路径模式
    `Description` VARCHAR(200),                       -- 规则描述
    `IsActive` TINYINT(1) DEFAULT 1,                  -- 是否启用
    `CreatedAt` DATETIME DEFAULT CURRENT_TIMESTAMP,   -- 创建时间
    `UpdatedAt` DATETIME DEFAULT CURRENT_TIMESTAMP    -- 更新时间
);

-- =====================================================
-- 主页卡片配置表 (HomeCardConfig)
-- =====================================================
CREATE TABLE `HomeCardConfig` (
    `ID` INT AUTO_INCREMENT PRIMARY KEY,              -- 主键，自增ID
    `ConfigKey` VARCHAR(50) NOT NULL,                 -- 配置键名
    `ConfigValue` TEXT,                               -- 配置值（JSON格式，用TEXT存储）
    `Description` VARCHAR(200),                       -- 配置描述
    `IsActive` TINYINT(1) DEFAULT 1,                  -- 是否启用
    `CreatedAt` DATETIME DEFAULT CURRENT_TIMESTAMP,   -- 创建时间
    `UpdatedAt` DATETIME DEFAULT CURRENT_TIMESTAMP    -- 更新时间
);

-- =====================================================
-- 网站配置表 (SiteConfig)
-- =====================================================
CREATE TABLE `SiteConfig` (
    `ID` INT AUTO_INCREMENT PRIMARY KEY,              -- 主键，自增ID
        `ConfigKey` VARCHAR(50) NOT NULL UNIQUE,          -- 配置键名，唯一
    `ConfigValue` TEXT,                               -- 配置值
    `ConfigType` VARCHAR(20) DEFAULT 'text',          -- 配置类型（text/image/json）
    `Description` VARCHAR(200),                       -- 配置描述
    `IsActive` TINYINT(1) DEFAULT 1,                  -- 是否启用
    `CreatedAt` DATETIME DEFAULT CURRENT_TIMESTAMP,   -- 创建时间
    `UpdatedAt` DATETIME DEFAULT CURRENT_TIMESTAMP    -- 更新时间
);

-- =====================================================
-- 插入初始化数据
-- =====================================================

-- 路径映射规则
INSERT INTO `PathMappingConfig` (`Name`, `LocalPattern`, `TargetPattern`, `Description`) VALUES
('Excel临时文件映射', 'C:\\Users\\*\\AppData\\Roaming\\Microsoft\\Excel\\*', '\\\\tj_server\\工作\\品质部\\生产异常周报考核统计\\*', 'Excel临时文件映射到tj_server共享盘'),
('2025年异常汇总映射', '*2025年异常汇总\\*', '\\\\tj_server\\工作\\品质部\\生产异常周报考核统计\\2025年异常汇总\\不良图片&资料\\*', '2025年异常汇总文件映射');

-- 主页卡片配置
INSERT INTO `HomeCardConfig` (`ConfigKey`, `ConfigValue`, `Description`) VALUES
('showTodayCount', 'true', '是否显示今日投诉统计卡片'),
('showMonthCount', 'true', '是否显示本月投诉统计卡片'),
('displayUnits', '[{"name":"数码印刷","type":"workshop","enabled":true},{"name":"轮转机","type":"workshop","enabled":true},{"name":"跟单","type":"department","enabled":true},{"name":"设计","type":"department","enabled":true},{"name":"品检","type":"department","enabled":true}]', '显示的部门/车间单位配置');

-- 网站配置
INSERT INTO `SiteConfig` (`ConfigKey`, `ConfigValue`, `ConfigType`, `Description`) VALUES
('siteName', '质量数据管理系统', 'text', '网站名称'),
('companyName', 'DMS质量管理系统', 'text', '公司名称'),
('logoBase64Img', '/logo.png', 'image', '网站LOGO图片BASE64数据'),
('faviconBase64Img', '/logo.png', 'image', '网站图标BASE64数据'),
('headerTitle', '质量数据系统', 'text', '页面头部标题'),
('loginTitle', 'DMS-QA 质量管理系统', 'text', '登录页面标题'),
('footerCopyright', '© 2025 DMS质量管理系统. All rights reserved.', 'text', '页脚版权信息');

-- 车间
INSERT INTO `Workshop` (`Name`) VALUES ('印刷车间'), ('裁切车间'), ('包装车间');

-- 部门
INSERT INTO `Department` (`Name`) VALUES ('生产部'), ('质检部'), ('销售部');

-- 人员（依赖部门表的ID：1=生产部, 2=质检部）
INSERT INTO `Person` (`Name`, `DepartmentID`) VALUES ('张三', 1), ('李四', 1), ('王五', 2);

-- 投诉类别
INSERT INTO `ComplaintCategory` (`Name`) VALUES ('客户投诉'), ('内部质量问题');

-- 客诉类型
INSERT INTO `CustomerComplaintType` (`Name`) VALUES ('产品质量'), ('交货期'), ('服务态度');

-- 不良类别
INSERT INTO `DefectiveCategory` (`Name`) VALUES ('印刷类'), ('裁切类'), ('包装类'), ('未分类');

-- =====================================================
-- 数据备份功能相关表结构
-- =====================================================

-- 备份记录表
CREATE TABLE `BackupRecord` (
    `ID` INT AUTO_INCREMENT PRIMARY KEY,
    `BackupName` VARCHAR(255) NOT NULL,
    `BackupType` VARCHAR(20) NOT NULL DEFAULT 'FULL',
    `BackupPath` VARCHAR(500) NOT NULL,
    `BackupSize` BIGINT NULL,
    `DatabaseName` VARCHAR(128) NOT NULL,
    `BackupStartTime` DATETIME NOT NULL,
    `BackupEndTime` DATETIME NULL,
    `BackupStatus` VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    `ErrorMessage` TEXT NULL,
    `CreatedBy` VARCHAR(50) NOT NULL,
    `CreatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `UpdatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `Description` VARCHAR(500) NULL
);

-- 索引
CREATE INDEX `IX_BackupRecord_BackupStartTime` ON `BackupRecord` (`BackupStartTime` DESC);
CREATE INDEX `IX_BackupRecord_BackupStatus` ON `BackupRecord` (`BackupStatus`);
CREATE INDEX `IX_BackupRecord_DatabaseName` ON `BackupRecord` (`DatabaseName`);

-- 为DbConfig表添加备份相关字段（如果不存在）
SET @col_exists = (
    SELECT COUNT(*) 
    FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'DbConfig' 
      AND COLUMN_NAME = 'BackupPath'
);
IF @col_exists = 0 THEN
    ALTER TABLE `DbConfig` ADD `BackupPath` VARCHAR(500) NULL;
END IF;

SET @col_exists = (
    SELECT COUNT(*) 
    FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'DbConfig' 
      AND COLUMN_NAME = 'BackupRetentionDays'
);
IF @col_exists = 0 THEN
    ALTER TABLE `DbConfig` ADD `BackupRetentionDays` INT NULL DEFAULT 30;
END IF;

SET @col_exists = (
    SELECT COUNT(*) 
    FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'DbConfig' 
      AND COLUMN_NAME = 'AutoBackupEnabled'
);
IF @col_exists = 0 THEN
    ALTER TABLE `DbConfig` ADD `AutoBackupEnabled` TINYINT(1) NULL DEFAULT 0;
END IF;

SET @col_exists = (
    SELECT COUNT(*) 
    FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'DbConfig' 
      AND COLUMN_NAME = 'AutoBackupTime'
);
IF @col_exists = 0 THEN
    ALTER TABLE `DbConfig` ADD `AutoBackupTime` VARCHAR(10) NULL DEFAULT '02:00';
END IF;

-- 添加备份方案字段
SET @col_exists = (
    SELECT COUNT(*) 
    FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'DbConfig' 
      AND COLUMN_NAME = 'DefaultBackupPath'
);
IF @col_exists = 0 THEN
    ALTER TABLE `DbConfig` ADD `DefaultBackupPath` VARCHAR(500) NULL;
END IF;

SET @col_exists = (
    SELECT COUNT(*) 
    FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'DbConfig' 
      AND COLUMN_NAME = 'AlternativeBackupPath'
);
IF @col_exists = 0 THEN
    ALTER TABLE `DbConfig` ADD `AlternativeBackupPath` VARCHAR(500) NULL;
END IF;

SET @col_exists = (
    SELECT COUNT(*) 
    FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'DbConfig' 
      AND COLUMN_NAME = 'PreferredBackupScheme'
);
IF @col_exists = 0 THEN
    ALTER TABLE `DbConfig` ADD `PreferredBackupScheme` VARCHAR(20) NULL DEFAULT 'default';
END IF;

-- 更新DbConfig表的备份配置默认值
UPDATE `DbConfig`
SET `BackupPath` = IFNULL(`BackupPath`, '\\\\tj_server\\公共\\杂七杂八\\品质部临时文件'),
    `BackupRetentionDays` = IFNULL(`BackupRetentionDays`, 30),
    `AutoBackupEnabled` = IFNULL(`AutoBackupEnabled`, 0),
    `AutoBackupTime` = IFNULL(`AutoBackupTime`, '02:00'),
    `DefaultBackupPath` = IFNULL(`DefaultBackupPath`, ''),
    `AlternativeBackupPath` = IFNULL(`AlternativeBackupPath`, '\\\\tj_server\\公共\\杂七杂八\\品质部临时文件'),
    `PreferredBackupScheme` = IFNULL(`PreferredBackupScheme`, 'default');

-- =====================================================
-- 月度批次统计表
-- =====================================================
CREATE TABLE `MonthlyBatchStats` (
    `ID` INT AUTO_INCREMENT PRIMARY KEY,
    `StatYear` INT NOT NULL,
    `StatMonth` INT NOT NULL,
    `InspectionBatches` INT NOT NULL DEFAULT 0,
    `DeliveryBatches` INT NOT NULL DEFAULT 0,
    `Remarks` VARCHAR(500) NULL,
    `CreatedBy` VARCHAR(50) NOT NULL DEFAULT 'admin',
    `CreatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `UpdatedBy` VARCHAR(50) NULL,
    `UpdatedAt` DATETIME NULL,
    UNIQUE KEY `UK_MonthlyBatchStats_YearMonth` (`StatYear`, `StatMonth`)  -- 唯一约束
);

-- 索引
CREATE INDEX `IX_MonthlyBatchStats_YearMonth` ON `MonthlyBatchStats` (`StatYear` DESC, `StatMonth` DESC);
CREATE INDEX `IX_MonthlyBatchStats_CreatedAt` ON `MonthlyBatchStats` (`CreatedAt` DESC);

-- 插入2025年1-6月数据
INSERT INTO `MonthlyBatchStats` (`StatYear`, `StatMonth`, `InspectionBatches`, `DeliveryBatches`, `Remarks`, `CreatedBy`, `CreatedAt`) VALUES
(2025, 1, 4887, 4745, '2025年1月数据', 'admin', '2025-07-07 09:23:30.433'),
(2025, 2, 5172, 4891, '2025年2月数据', 'admin', '2025-07-07 09:23:30.433'),
(2025, 3, 6715, 6424, '2025年3月数据', 'admin', '2025-07-07 09:23:30.433'),
(2025, 4, 6122, 5982, '2025年4月数据', 'admin', '2025-07-07 09:23:30.433'),
(2025, 5, 5402, 5247, '2025年5月数据', 'admin', '2025-07-07 09:23:30.433'),
(2025, 6, 6014, 5710, '2025年6月数据', 'admin', '2025-07-07 09:23:30.433');

-- 调整User表的Avatar字段为TEXT（确保兼容性）
ALTER TABLE `User` MODIFY COLUMN `Avatar` TEXT;

-- 完成提示
SELECT '数据库初始化完成（兼容原表名）' AS `Result`;