/**
 * 检查CalibrationResults表中的数据
 * 查找可能存在的无效InstrumentID
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

async function checkCalibrationData() {
  try {
    console.log('连接数据库...');
    const pool = await sql.connect(config);
    
    // 检查CalibrationResults表中的数据
    console.log('\n=== 检查CalibrationResults表数据 ===');
    const calibrationQuery = `
      SELECT TOP 10 
        ID, 
        InstrumentID, 
        CalibrationDate, 
        CalibrationResult,
        CreatedAt
      FROM CalibrationResults 
      ORDER BY CreatedAt DESC
    `;
    
    const calibrationResult = await pool.request().query(calibrationQuery);
    console.log('CalibrationResults表数据:');
    console.log(JSON.stringify(calibrationResult.recordset, null, 2));
    
    // 检查是否存在无效的InstrumentID
    console.log('\n=== 检查无效的InstrumentID ===');
    const invalidQuery = `
      SELECT 
        cr.ID,
        cr.InstrumentID,
        cr.CalibrationDate,
        i.InstrumentName
      FROM CalibrationResults cr
      LEFT JOIN Instruments i ON cr.InstrumentID = i.ID
      WHERE i.ID IS NULL OR i.IsActive = 0
    `;
    
    const invalidResult = await pool.request().query(invalidQuery);
    console.log('无效的InstrumentID数据:');
    console.log(JSON.stringify(invalidResult.recordset, null, 2));
    
    // 检查Instruments表中的数据
    console.log('\n=== 检查Instruments表数据 ===');
    const instrumentQuery = `
      SELECT TOP 5 
        ID, 
        InstrumentName, 
        InstrumentCode,
        IsActive
      FROM Instruments 
      WHERE IsActive = 1
      ORDER BY CreatedAt DESC
    `;
    
    const instrumentResult = await pool.request().query(instrumentQuery);
    console.log('Instruments表数据:');
    console.log(JSON.stringify(instrumentResult.recordset, null, 2));
    
    await sql.close();
    console.log('\n数据库连接已关闭');
    
  } catch (error) {
    console.error('检查数据时发生错误:', error);
    await sql.close();
  }
}

checkCalibrationData();