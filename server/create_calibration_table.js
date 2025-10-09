/**
 * 创建CalibrationResults表脚本
 */

const sql = require('mssql');
require('dotenv').config();

// 数据库配置
const config = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  server: process.env.DB_SERVER,
  database: process.env.DB_DATABASE,
  options: {
    encrypt: false,
    trustServerCertificate: true
  }
};

/**
 * 创建CalibrationResults表
 */
async function createCalibrationTable() {
  try {
    console.log('连接数据库...');
    await sql.connect(config);
    console.log('数据库连接成功');

    // 检查表是否存在
    const checkTableQuery = `
      SELECT COUNT(*) as count 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_NAME = 'CalibrationResults'
    `;

    const checkResult = await sql.query(checkTableQuery);
    
    if (checkResult.recordset[0].count > 0) {
      console.log('CalibrationResults表已存在');
      return;
    }

    // 创建CalibrationResults表
    const createTableQuery = `
      CREATE TABLE [dbo].[CalibrationResults] (
        [ID] INT IDENTITY(1,1) PRIMARY KEY NOT NULL,
        [ResultCode] NVARCHAR(50) NOT NULL UNIQUE,         -- 检定结果编号
        [InstrumentID] INT NOT NULL,                       -- 仪器ID
        [CalibrationDate] DATE NOT NULL,                   -- 校准日期
        [CalibrationAgency] NVARCHAR(100) NOT NULL,        -- 校准机构
        [CertificateNumber] NVARCHAR(100),                 -- 证书编号
        [CalibrationStandard] NVARCHAR(200),               -- 校准标准
        [CalibrationResult] NVARCHAR(20),                  -- 校准结论：qualified/unqualified/limited
        [ExpiryDate] DATE,                                 -- 到期日期
        [NextCalibrationDate] DATE,                        -- 下次校准日期
        [CalibrationCost] DECIMAL(10,2),                   -- 校准费用
        [CalibrationData] NVARCHAR(MAX),                   -- 校准数据详情
        [Issues] NVARCHAR(1000),                           -- 发现问题
        [Recommendations] NVARCHAR(1000),                  -- 建议
        [EnvironmentalConditions] NVARCHAR(500),           -- 环境条件
        [CertificateFile] NVARCHAR(500),                   -- 证书文件路径
        [Remarks] NVARCHAR(500),                           -- 备注
        [CreatedBy] INT NOT NULL DEFAULT 1,                -- 创建人
        [CreatedAt] DATETIME DEFAULT GETDATE(),            -- 创建时间
        [UpdatedBy] INT,                                   -- 更新人
        [UpdatedAt] DATETIME DEFAULT GETDATE(),            -- 更新时间
        [InstrumentCode] NVARCHAR(50),                     -- 仪器编号（冗余字段，用于快速查询）
        [ManagementCode] NVARCHAR(50)                      -- 管理编号（冗余字段，用于快速查询）
      );
    `;

    console.log('创建CalibrationResults表...');
    await sql.query(createTableQuery);
    console.log('✅ CalibrationResults表创建成功');

    // 创建索引
    const createIndexQueries = [
      'CREATE NONCLUSTERED INDEX [IX_CalibrationResults_InstrumentID] ON [dbo].[CalibrationResults] ([InstrumentID]);',
      'CREATE NONCLUSTERED INDEX [IX_CalibrationResults_CalibrationDate] ON [dbo].[CalibrationResults] ([CalibrationDate]);',
      'CREATE NONCLUSTERED INDEX [IX_CalibrationResults_ExpiryDate] ON [dbo].[CalibrationResults] ([ExpiryDate]);',
      'CREATE NONCLUSTERED INDEX [IX_CalibrationResults_NextCalibrationDate] ON [dbo].[CalibrationResults] ([NextCalibrationDate]);'
    ];

    console.log('创建索引...');
    for (const indexQuery of createIndexQueries) {
      await sql.query(indexQuery);
    }
    console.log('✅ 索引创建成功');

    // 插入测试数据
    const insertTestDataQuery = `
      INSERT INTO [dbo].[CalibrationResults] (
        [ResultCode], [InstrumentID], [CalibrationDate], [CalibrationAgency], 
        [CertificateNumber], [CalibrationResult], [ExpiryDate], [NextCalibrationDate],
        [CalibrationCost], [Remarks], [CreatedBy]
      ) VALUES 
      ('CAL-2024-001', 1, '2024-01-15', '国家计量院', 'CERT-2024-001', 'qualified', '2025-01-15', '2024-12-15', 1500.00, '校准正常', 1),
      ('CAL-2024-002', 2, '2024-02-20', '省计量所', 'CERT-2024-002', 'qualified', '2025-02-20', '2025-01-20', 800.00, '校准正常', 1),
      ('CAL-2024-003', 3, '2024-03-10', '市计量站', 'CERT-2024-003', 'limited', '2024-09-10', '2024-08-10', 600.00, '部分参数超差', 1)
    `;

    console.log('插入测试数据...');
    await sql.query(insertTestDataQuery);
    console.log('✅ 测试数据插入成功');

  } catch (error) {
    console.error('错误:', error.message);
  } finally {
    await sql.close();
    console.log('\n数据库连接已关闭');
  }
}

// 运行创建
createCalibrationTable();