/**
 * 检查数据库表结构
 */

const sql = require('mssql');

const config = {
  user: 'sa',
  password: 'Qa369*',
  server: '192.168.1.57',
  database: 'DMS-QA',
  options: {
    encrypt: false,
    trustServerCertificate: true,
    enableArithAbort: true,
    useUTC: false,
    requestTimeout: 30000,
    connectionTimeout: 30000,
    parseJSON: true
  }
};

async function checkTables() {
  let pool = null;
  
  try {
    console.log('🔄 连接数据库...');
    pool = await sql.connect(config);
    
    // 查询所有表
    console.log('📋 数据库中的所有表:');
    const tables = await pool.request().query(`
      SELECT TABLE_NAME, TABLE_TYPE 
      FROM INFORMATION_SCHEMA.TABLES 
      ORDER BY TABLE_NAME
    `);
    
    if (tables.recordset.length > 0) {
      tables.recordset.forEach((table, index) => {
        console.log(`${index + 1}. ${table.TABLE_NAME} (${table.TABLE_TYPE})`);
      });
    } else {
      console.log('❌ 数据库中没有找到任何表');
    }
    
    // 检查是否有用户相关的表
    console.log('\n🔍 查找用户相关的表:');
    const userTables = await pool.request().query(`
      SELECT TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_NAME LIKE '%user%' OR TABLE_NAME LIKE '%User%'
      ORDER BY TABLE_NAME
    `);
    
    if (userTables.recordset.length > 0) {
      userTables.recordset.forEach(table => {
        console.log(`✅ 找到: ${table.TABLE_NAME}`);
      });
    } else {
      console.log('❌ 没有找到用户相关的表');
    }
    
  } catch (error) {
    console.error('❌ 错误:', error.message);
  } finally {
    if (pool) {
      await pool.close();
    }
  }
}

checkTables();
