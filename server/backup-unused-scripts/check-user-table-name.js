/**
 * 检查用户表的正确名称
 */

const sql = require('mssql');
const { getDynamicConfig } = require('./config/database');

/**
 * 检查用户相关表名
 */
async function checkUserTableName() {
  let pool;
  
  try {
    console.log('=== 检查用户相关表名 ===');
    
    // 连接数据库
    pool = await sql.connect(await getDynamicConfig());
    console.log('数据库连接成功');
    
    // 查找用户相关表
    const result = await pool.request()
      .query(`
        SELECT TABLE_NAME 
        FROM INFORMATION_SCHEMA.TABLES 
        WHERE TABLE_TYPE = 'BASE TABLE' 
        AND (TABLE_NAME LIKE '%User%' OR TABLE_NAME LIKE '%user%')
        ORDER BY TABLE_NAME
      `);
    
    console.log('用户相关表:');
    result.recordset.forEach(table => {
      console.log(`- ${table.TABLE_NAME}`);
    });
    
    // 查找所有表
    console.log('\n所有表:');
    const allTablesResult = await pool.request()
      .query(`
        SELECT TABLE_NAME 
        FROM INFORMATION_SCHEMA.TABLES 
        WHERE TABLE_TYPE = 'BASE TABLE'
        ORDER BY TABLE_NAME
      `);
    
    allTablesResult.recordset.forEach(table => {
      console.log(`- ${table.TABLE_NAME}`);
    });
    
  } catch (error) {
    console.error('检查过程中发生错误:', error.message);
  } finally {
    if (pool) {
      await pool.close();
      console.log('\n数据库连接已关闭');
    }
  }
}

// 运行检查
checkUserTableName();