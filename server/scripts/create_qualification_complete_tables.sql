-- =============================================
-- 人员资质管理模块 - 补充表结构
-- 创建日期: 2025-12-23
-- 功能: 资质类型、资质认证、考核记录
-- =============================================

-- 3. 资质类型表
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='QualificationType' AND xtype='U')
BEGIN
    CREATE TABLE QualificationType (
        ID INT IDENTITY(1,1) PRIMARY KEY,
        CategoryCode NVARCHAR(50) NOT NULL,          -- 类别编码: QUALITY/SKILL/etc
        CategoryName NVARCHAR(50) NOT NULL,          -- 类别名称: 质量检验/生产技能/etc
        TypeCode NVARCHAR(50) NOT NULL,              -- 类型编码
        TypeName NVARCHAR(100) NOT NULL,             -- 资质名称
        Description NVARCHAR(500),                   -- 描述
        RequiresTest BIT DEFAULT 0,                  -- 是否需要考核
        TestType NVARCHAR(50),                       -- 考核类型: WRITTEN/PRACTICAL/FM100/etc
        ValidityPeriod INT,                          -- 有效期(月), NULL为长期
        CertLevels NVARCHAR(200),                    -- 认证等级(逗号分隔): 初级,中级,高级
        SortOrder INT DEFAULT 0,                     -- 排序
        IsActive BIT DEFAULT 1,                      -- 是否启用
        CreatedAt DATETIME DEFAULT GETDATE(),
        UpdatedAt DATETIME
    );
    
    CREATE UNIQUE INDEX IX_QualificationType_TypeCode ON QualificationType(TypeCode);
    CREATE INDEX IX_QualificationType_CategoryCode ON QualificationType(CategoryCode);
    
    PRINT '表 QualificationType 创建成功';
    
    -- 插入初始数据
    INSERT INTO QualificationType (CategoryCode, CategoryName, TypeCode, TypeName, Description, RequiresTest, TestType, ValidityPeriod, CertLevels, SortOrder)
    VALUES 
    ('QUALITY', '质量检验', 'FM100', 'FM100色觉测试', 'Farnsworth-Munsell 100 Hue Test 色彩辨别能力测试', 1, 'FM100', 12, '优异,良好,合格', 1),
    ('QUALITY', '质量检验', 'INSPECTOR', '质检员上岗证', '质量检验岗位资格认证', 1, 'WRITTEN', 24, '初级,中级,高级', 2),
    ('SKILL', '生产技能', 'COLOR_MATCH', '调色技能', '油墨调配与色彩管理技能', 1, 'PRACTICAL', 24, '合格,优秀', 3);
END
ELSE
BEGIN
    PRINT '表 QualificationType 已存在';
END
GO

-- 4. 资质认证表
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='PersonnelCertification' AND xtype='U')
BEGIN
    CREATE TABLE PersonnelCertification (
        ID INT IDENTITY(1,1) PRIMARY KEY,
        PersonnelID INT NOT NULL,                    -- 人员ID
        QualificationTypeID INT NOT NULL,            -- 资质类型ID
        CertLevel NVARCHAR(50),                      -- 认证等级
        CertNo NVARCHAR(100),                        -- 证书编号
        CertDate DATE NOT NULL,                      -- 认证日期
        ExpiryDate DATE,                             -- 到期日期
        Issuer NVARCHAR(100),                        -- 发证机构
        CertStatus NVARCHAR(20) DEFAULT '有效',      -- 状态: 有效/已过期/吊销
        AttachmentPath NVARCHAR(500),                -- 附件路径
        Remarks NVARCHAR(500),                       -- 备注
        CreatedAt DATETIME DEFAULT GETDATE(),
        UpdatedAt DATETIME,
        
        CONSTRAINT FK_PersonnelCertification_Personnel FOREIGN KEY (PersonnelID)
            REFERENCES PersonnelQualification(ID) ON DELETE CASCADE,
        CONSTRAINT FK_PersonnelCertification_QualificationType FOREIGN KEY (QualificationTypeID)
            REFERENCES QualificationType(ID) ON DELETE CASCADE
    );
    
    CREATE INDEX IX_PersonnelCertification_PersonnelID ON PersonnelCertification(PersonnelID);
    CREATE INDEX IX_PersonnelCertification_QualificationTypeID ON PersonnelCertification(QualificationTypeID);
    CREATE INDEX IX_PersonnelCertification_ExpiryDate ON PersonnelCertification(ExpiryDate);
    
    PRINT '表 PersonnelCertification 创建成功';
END
ELSE
BEGIN
    PRINT '表 PersonnelCertification 已存在';
END
GO

-- 5. 考核记录表 (通用)
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='QualificationTest' AND xtype='U')
BEGIN
    CREATE TABLE QualificationTest (
        ID INT IDENTITY(1,1) PRIMARY KEY,
        PersonnelID INT NOT NULL,                    -- 人员ID
        QualificationTypeID INT NOT NULL,            -- 资质类型ID
        TestDate DATETIME NOT NULL,                  -- 考核日期
        TestType NVARCHAR(50),                       -- 考核类型
        Score DECIMAL(10, 2),                        -- 得分
        Grade NVARCHAR(50),                          -- 等级
        TestResult NVARCHAR(20),                     -- 结果: 通过/不通过
        Duration INT,                                -- 时长(分钟)
        Examiner NVARCHAR(50),                       -- 考核人
        Remarks NVARCHAR(500),                       -- 备注
        CreatedAt DATETIME DEFAULT GETDATE(),
        UpdatedAt DATETIME,
        
        CONSTRAINT FK_QualificationTest_Personnel FOREIGN KEY (PersonnelID)
            REFERENCES PersonnelQualification(ID) ON DELETE CASCADE,
        CONSTRAINT FK_QualificationTest_QualificationType FOREIGN KEY (QualificationTypeID)
            REFERENCES QualificationType(ID) ON DELETE CASCADE
    );
    
    CREATE INDEX IX_QualificationTest_PersonnelID ON QualificationTest(PersonnelID);
    CREATE INDEX IX_QualificationTest_TestDate ON QualificationTest(TestDate);
    
    PRINT '表 QualificationTest 创建成功';
END
ELSE
BEGIN
    PRINT '表 QualificationTest 已存在';
END
GO

-- 添加注释
EXEC sp_addextendedproperty @name = N'MS_Description', @value = N'资质类型定义表', @level0type = N'SCHEMA', @level0name = N'dbo', @level1type = N'TABLE', @level1name = N'QualificationType';
EXEC sp_addextendedproperty @name = N'MS_Description', @value = N'人员资质认证记录表', @level0type = N'SCHEMA', @level0name = N'dbo', @level1type = N'TABLE', @level1name = N'PersonnelCertification';
EXEC sp_addextendedproperty @name = N'MS_Description', @value = N'资质考核记录表', @level0type = N'SCHEMA', @level0name = N'dbo', @level1type = N'TABLE', @level1name = N'QualificationTest';
