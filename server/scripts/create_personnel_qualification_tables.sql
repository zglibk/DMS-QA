-- =============================================
-- 人员资质管理模块 - 数据库表结构
-- 创建日期: 2025-12-19
-- 功能: 人员资质管理、FM100色觉测试记录
-- =============================================

-- 1. 人员资质表
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='PersonnelQualification' AND xtype='U')
BEGIN
    CREATE TABLE PersonnelQualification (
        ID INT IDENTITY(1,1) PRIMARY KEY,
        EmployeeNo NVARCHAR(50) NOT NULL,           -- 工号
        Name NVARCHAR(100) NOT NULL,                 -- 姓名
        Department NVARCHAR(100),                    -- 部门
        Position NVARCHAR(100),                      -- 岗位
        PositionType NVARCHAR(10),                   -- 岗位类型: A/B/C/D
        HireDate DATE,                               -- 入职日期
        QualificationStatus NVARCHAR(20) DEFAULT '待评估',  -- 资质状态: 合格/待评估/不合格
        CertificateExpiry DATE,                      -- 证书有效期
        Remarks NVARCHAR(500),                       -- 备注
        CreatedAt DATETIME DEFAULT GETDATE(),        -- 创建时间
        UpdatedAt DATETIME                           -- 更新时间
    );
    
    -- 创建索引
    CREATE UNIQUE INDEX IX_PersonnelQualification_EmployeeNo ON PersonnelQualification(EmployeeNo);
    CREATE INDEX IX_PersonnelQualification_Department ON PersonnelQualification(Department);
    CREATE INDEX IX_PersonnelQualification_PositionType ON PersonnelQualification(PositionType);
    CREATE INDEX IX_PersonnelQualification_Status ON PersonnelQualification(QualificationStatus);
    
    PRINT '表 PersonnelQualification 创建成功';
END
ELSE
BEGIN
    PRINT '表 PersonnelQualification 已存在';
END
GO

-- 2. FM100 色觉测试记录表
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='ColorVisionTest' AND xtype='U')
BEGIN
    CREATE TABLE ColorVisionTest (
        ID INT IDENTITY(1,1) PRIMARY KEY,
        PersonnelID INT NOT NULL,                    -- 关联人员ID
        TestDate DATETIME NOT NULL,                  -- 测试日期
        Duration FLOAT,                              -- 测试时长（分钟）
        TES INT,                                     -- 错误总分 (TES)
        SqrtTES FLOAT,                               -- 错误总分平方根 (√TES)
        Category NVARCHAR(50),                       -- 分类: 优秀色彩分辨力/一般色彩分辨力/低色彩分辨力
        
        -- 百分位数
        PctUnselected INT,                           -- 未选定人群百分位
        PctFactory INT,                              -- 工厂人群百分位
        PctExperienced INT,                          -- 经验丰富人群百分位
        
        -- Vingrys 分析
        Angle FLOAT,                                 -- 角度
        CIndex FLOAT,                                -- C 指数
        SIndex FLOAT,                                -- S 指数
        Diagnosis NVARCHAR(50),                      -- 诊断建议
        
        -- 评估结果
        Grade NVARCHAR(20),                          -- 等级: 优异/良好/需关注/不达标
        JobMatch NVARCHAR(100),                      -- 岗位匹配结果
        
        -- 附件
        ScreenshotPath NVARCHAR(500),                -- 测试软件截图路径
        ReportPath NVARCHAR(500),                    -- 生成报告路径
        
        CreatedAt DATETIME DEFAULT GETDATE(),        -- 创建时间
        
        -- 外键约束
        CONSTRAINT FK_ColorVisionTest_Personnel FOREIGN KEY (PersonnelID)
            REFERENCES PersonnelQualification(ID) ON DELETE CASCADE
    );
    
    -- 创建索引
    CREATE INDEX IX_ColorVisionTest_PersonnelID ON ColorVisionTest(PersonnelID);
    CREATE INDEX IX_ColorVisionTest_TestDate ON ColorVisionTest(TestDate);
    CREATE INDEX IX_ColorVisionTest_Grade ON ColorVisionTest(Grade);
    
    PRINT '表 ColorVisionTest 创建成功';
END
ELSE
BEGIN
    PRINT '表 ColorVisionTest 已存在';
END
GO

-- 3. 添加注释
EXEC sp_addextendedproperty
    @name = N'MS_Description',
    @value = N'人员资质管理表 - 记录关键岗位人员的资质信息',
    @level0type = N'SCHEMA', @level0name = N'dbo',
    @level1type = N'TABLE', @level1name = N'PersonnelQualification';

EXEC sp_addextendedproperty
    @name = N'MS_Description',
    @value = N'FM100色觉测试记录表 - 记录Farnsworth-Munsell 100 Hue Test测试结果',
    @level0type = N'SCHEMA', @level0name = N'dbo',
    @level1type = N'TABLE', @level1name = N'ColorVisionTest';

-- 4. 插入示例数据（可选）
/*
INSERT INTO PersonnelQualification (EmployeeNo, Name, Department, Position, PositionType, HireDate, QualificationStatus)
VALUES
    ('EMP001', '张三', '印刷部', '调墨员', 'A', '2020-03-15', '合格'),
    ('EMP002', '李四', '品质部', '终检员', 'B', '2021-06-20', '合格'),
    ('EMP003', '王五', '品质部', '过程检验员', 'C', '2022-01-10', '待评估'),
    ('EMP004', '赵六', '印前部', '调墨学徒', 'A', '2024-11-01', '待评估');
*/

PRINT '人员资质管理模块数据库表创建完成！';
GO
