const { sql, config } = require('./db');
const fs = require('fs');
const path = require('path');

async function updateDatabase() {
  let pool;
  try {
    console.log('连接数据库...');
    pool = await sql.connect(config);
    
    console.log('读取SQL更新脚本...');
    const sqlScript = fs.readFileSync(path.join(__dirname, 'update-db-schema.sql'), 'utf8');
    
    console.log('执行数据库更新...');
    const result = await pool.request().query(sqlScript);
    
    console.log('数据库更新完成！');
    console.log('结果:', result);
    
  } catch (error) {
    console.error('数据库更新失败:', error);
  } finally {
    if (pool) {
      await pool.close();
    }
  }
}

updateDatabase();
