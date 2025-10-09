/**
 * 创建Instruments表脚本
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
 * 创建Instruments表
 */
async function createInstrumentsTable() {
  try {
    console.log('连接数据库...');
    await sql.connect(config);
    console.log('数据库连接成功');

    // 检查表是否存在
    const checkTableQuery = `
      SELECT COUNT(*) as count 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_NAME = 'Instruments'
    `;

    const checkResult = await sql.query(checkTableQuery);
    
    if (checkResult.recordset[0].count > 0) {
      console.log('Instruments表已存在');
      return;
    }

    // 创建Instruments表
    const createTableQuery = `
      CREATE TABLE [dbo].[Instruments] (
        [ID] INT IDENTITY(1,1) PRIMARY KEY,
        [InstrumentCode] NVARCHAR(50) NOT NULL UNIQUE,     -- 仪器编号
        [ManagementCode] NVARCHAR(50) NOT NULL UNIQUE,     -- 管理编号
        [InstrumentName] NVARCHAR(200) NOT NULL,           -- 仪器名称
        [Model] NVARCHAR(100),                             -- 型号
        [Manufacturer] NVARCHAR(100),                      -- 制造商
        [SerialNumber] NVARCHAR(100),                      -- 序列号
        [Category] NVARCHAR(50),                           -- 仪器类别
        [Specifications] NVARCHAR(500),                    -- 技术规格
        [PurchaseDate] DATE,                               -- 购买日期
        [PurchasePrice] DECIMAL(12,2),                     -- 购买价格
        [Supplier] NVARCHAR(100),                          -- 供应商
        [Location] NVARCHAR(100),                          -- 存放位置
        [ResponsiblePerson] NVARCHAR(50),                  -- 责任人
        [Status] NVARCHAR(20) DEFAULT 'active',            -- 状态：active/inactive/maintenance/scrapped
        [CalibrationCycle] INT DEFAULT 365,                -- 校准周期(天)
        [LastCalibrationDate] DATE,                        -- 最后校准日期
        [NextCalibrationDate] DATE,                        -- 下次校准日期
        [CalibrationStatus] NVARCHAR(20) DEFAULT 'pending', -- 校准状态：pending/valid/expired/overdue
        [Remarks] NVARCHAR(500),                           -- 备注
        [CreatedBy] INT NOT NULL DEFAULT 1,                -- 创建人
        [CreatedAt] DATETIME DEFAULT GETDATE(),            -- 创建时间
        [UpdatedBy] INT,                                   -- 更新人
        [UpdatedAt] DATETIME DEFAULT GETDATE()             -- 更新时间
      );
    `;

    console.log('创建Instruments表...');
    await sql.query(createTableQuery);
    console.log('✅ Instruments表创建成功');

    // 创建索引
    const createIndexQueries = [
      'CREATE NONCLUSTERED INDEX [IX_Instruments_InstrumentCode] ON [dbo].[Instruments] ([InstrumentCode]);',
      'CREATE NONCLUSTERED INDEX [IX_Instruments_ManagementCode] ON [dbo].[Instruments] ([ManagementCode]);',
      'CREATE NONCLUSTERED INDEX [IX_Instruments_Category] ON [dbo].[Instruments] ([Category]);',
      'CREATE NONCLUSTERED INDEX [IX_Instruments_Status] ON [dbo].[Instruments] ([Status]);'
    ];

    console.log('创建索引...');
    for (const indexQuery of createIndexQueries) {
      await sql.query(indexQuery);
    }
    console.log('✅ 索引创建成功');

    // 插入测试数据
    const insertTestDataQuery = `
      INSERT INTO [dbo].[Instruments] (
        [InstrumentCode], [ManagementCode], [InstrumentName], [Model], 
        [Manufacturer], [Category], [Status], [CreatedBy]
      ) VALUES 
      ('INST-001', 'MGT-001', '数字万用表', 'DMM-6500', 'Keithley', '电子测量', 'active', 1),
      ('INST-002', 'MGT-002', '示波器', 'MSO64', 'Tektronix', '电子测量', 'active', 1),
      ('INST-003', 'MGT-003', '天平', 'XS205', 'Mettler Toledo', '称重测量', 'active', 1)
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
createInstrumentsTable();