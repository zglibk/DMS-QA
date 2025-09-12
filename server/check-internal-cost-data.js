const { getConnection } = require('./db');

(async () => {
  try {
    const conn = await getConnection();
    
    console.log('=== 检查ProductionReworkRegister表结构 ===');
    
    // 查看ProductionReworkRegister表的字段结构
    const columnsResult = await conn.request().query(`
      SELECT COLUMN_NAME, DATA_TYPE 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'ProductionReworkRegister'
      ORDER BY ORDINAL_POSITION
    `);
    console.log('ProductionReworkRegister表字段:', columnsResult.recordset);
    
    // 查看样本数据
    const sampleResult = await conn.request().query(`
      SELECT TOP 3 * FROM ProductionReworkRegister
    `);
    console.log('ProductionReworkRegister表样本数据:', sampleResult.recordset);
    
    process.exit(0);
  } catch(e) {
    console.error('查询失败:', e.message);
    process.exit(1);
  }
})();