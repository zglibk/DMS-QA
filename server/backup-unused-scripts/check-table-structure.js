const { getConnection } = require('./db');

(async () => {
  try {
    const pool = await getConnection();
    const result = await pool.request().query(`
      SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'QualityTargets'
      ORDER BY ORDINAL_POSITION
    `);
    
    console.log('QualityTargets表结构:');
    if (result.recordset.length === 0) {
      console.log('表不存在或没有列');
    } else {
      result.recordset.forEach(col => {
        console.log(`${col.COLUMN_NAME} - ${col.DATA_TYPE} (${col.IS_NULLABLE})`);
      });
    }
    
    process.exit(0);
  } catch(e) {
    console.error('错误:', e.message);
    process.exit(1);
  }
})();