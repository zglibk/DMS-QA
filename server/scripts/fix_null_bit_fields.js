const sql = require('mssql');

// 数据库配置
const config = {
  server: '192.168.1.57',
  database: 'DMS-QA',
  user: 'sa',
  password: 'Qa369*',
  options: {
    encrypt: false,
    trustServerCertificate: true,
    enableArithAbort: true
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000
  }
};

async function fixNullBitFields() {
  let pool;
  try {
    console.log('连接数据库...');
    pool = await sql.connect(config);
    
    console.log('修复 ReturnGoods 字段的 NULL 值...');
    const result1 = await pool.request().query(`
      UPDATE ComplaintRegister 
      SET ReturnGoods = 0 
      WHERE ReturnGoods IS NULL
    `);
    console.log(`ReturnGoods 字段更新了 ${result1.rowsAffected[0]} 行记录`);
    
    console.log('修复 IsReprint 字段的 NULL 值...');
    const result2 = await pool.request().query(`
      UPDATE ComplaintRegister 
      SET IsReprint = 0 
      WHERE IsReprint IS NULL
    `);
    console.log(`IsReprint 字段更新了 ${result2.rowsAffected[0]} 行记录`);
    
    console.log('查看修复结果...');
    const result3 = await pool.request().query(`
      SELECT 
        COUNT(*) as TotalRecords,
        SUM(CASE WHEN ReturnGoods IS NULL THEN 1 ELSE 0 END) as ReturnGoods_NullCount,
        SUM(CASE WHEN IsReprint IS NULL THEN 1 ELSE 0 END) as IsReprint_NullCount,
        SUM(CASE WHEN ReturnGoods = 1 THEN 1 ELSE 0 END) as ReturnGoods_TrueCount,
        SUM(CASE WHEN IsReprint = 1 THEN 1 ELSE 0 END) as IsReprint_TrueCount
      FROM ComplaintRegister
    `);
    
    const stats = result3.recordset[0];
    console.log('修复结果统计:');
    console.log(`- 总记录数: ${stats.TotalRecords}`);
    console.log(`- ReturnGoods NULL值数量: ${stats.ReturnGoods_NullCount}`);
    console.log(`- IsReprint NULL值数量: ${stats.IsReprint_NullCount}`);
    console.log(`- ReturnGoods 为True的数量: ${stats.ReturnGoods_TrueCount}`);
    console.log(`- IsReprint 为True的数量: ${stats.IsReprint_TrueCount}`);
    
    console.log('✅ 数据修复完成！');
    
  } catch (error) {
    console.error('❌ 修复过程中出现错误:', error);
  } finally {
    if (pool) {
      await pool.close();
      console.log('数据库连接已关闭');
    }
  }
}

// 执行修复
fixNullBitFields();
