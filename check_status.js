/**
 * 查询数据库中仪器状态的实际存储值
 */

const sql = require('./server/node_modules/mssql');

// 数据库配置
const config = {
  user: process.env.DB_USER || 'sa',
  password: process.env.DB_PASSWORD || 'Qa369*',
  server: process.env.DB_SERVER || '192.168.1.57',
  port: parseInt(process.env.DB_PORT) || 1433,
  database: process.env.DB_NAME || 'DMS-QA',
  options: {
    encrypt: false,
    trustServerCertificate: true,
    enableArithAbort: true,
    useUTC: false,
    requestTimeout: 30000,
    connectionTimeout: 30000
  }
};

async function checkInstrumentStatus() {
  try {
    console.log('连接数据库...');
    const pool = await sql.connect(config);
    
    // 查询所有不同的状态值
    const result = await pool.request().query(`
      SELECT DISTINCT Status, COUNT(*) as Count
      FROM Instruments 
      WHERE IsActive = 1 
      GROUP BY Status
      ORDER BY Status
    `);
    
    console.log('\n数据库中仪器状态的实际存储值：');
    console.log('================================');
    result.recordset.forEach(row => {
      console.log(`状态: "${row.Status}" - 数量: ${row.Count}`);
    });
    
    // 查询具体的报废状态记录
    const retiredResult = await pool.request().query(`
      SELECT InstrumentCode, InstrumentName, Status
      FROM Instruments 
      WHERE IsActive = 1 AND (Status LIKE '%报废%' OR Status LIKE '%retired%' OR Status LIKE '%scrapped%')
    `);
    
    console.log('\n报废状态的具体记录：');
    console.log('================================');
    if (retiredResult.recordset.length > 0) {
      retiredResult.recordset.forEach(row => {
        console.log(`仪器编号: ${row.InstrumentCode}, 仪器名称: ${row.InstrumentName}, 状态: "${row.Status}"`);
      });
    } else {
      console.log('没有找到报废状态的记录');
    }
    
    await pool.close();
    console.log('\n查询完成');
    
  } catch (error) {
    console.error('查询失败:', error.message);
  }
}

checkInstrumentStatus();