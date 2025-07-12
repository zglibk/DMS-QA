/**
 * 数据库连接测试脚本
 * 用于诊断SQL Server连接问题
 */

const sql = require('mssql');

// 数据库配置（直接使用配置值）
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
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000
  }
};

console.log('=== 数据库连接测试 ===');
console.log('配置信息:');
console.log(`服务器: ${config.server}`);
console.log(`数据库: ${config.database}`);
console.log(`用户名: ${config.user}`);
console.log(`密码: ${config.password ? '***已设置***' : '未设置'}`);
console.log('========================');

async function testConnection() {
  let pool = null;
  
  try {
    console.log('🔄 正在连接数据库...');
    
    // 创建连接池
    pool = await sql.connect(config);
    console.log('✅ 数据库连接成功！');
    
    // 测试基本查询
    console.log('🔄 测试基本查询...');
    const result = await pool.request().query('SELECT @@VERSION as Version, DB_NAME() as CurrentDB');
    
    if (result.recordset && result.recordset.length > 0) {
      console.log('✅ 查询测试成功！');
      console.log('数据库版本:', result.recordset[0].Version);
      console.log('当前数据库:', result.recordset[0].CurrentDB);
    }
    
    // 测试用户表是否存在
    console.log('🔄 检查用户表...');
    const tableCheck = await pool.request().query(`
      SELECT COUNT(*) as TableExists 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_NAME = 'Users'
    `);
    
    if (tableCheck.recordset[0].TableExists > 0) {
      console.log('✅ Users表存在');
      
      // 查询用户数据
      const userCheck = await pool.request().query('SELECT COUNT(*) as UserCount FROM Users');
      console.log(`📊 用户表记录数: ${userCheck.recordset[0].UserCount}`);
      
      // 查询admin用户
      const adminCheck = await pool.request()
        .input('username', sql.NVarChar, 'admin')
        .query('SELECT Username, Role FROM Users WHERE Username = @username');
      
      if (adminCheck.recordset.length > 0) {
        console.log('✅ admin用户存在');
        console.log('用户信息:', adminCheck.recordset[0]);
      } else {
        console.log('❌ admin用户不存在');
      }
    } else {
      console.log('❌ Users表不存在');
    }
    
  } catch (error) {
    console.error('❌ 数据库连接失败:');
    console.error('错误类型:', error.name);
    console.error('错误消息:', error.message);
    
    if (error.code) {
      console.error('错误代码:', error.code);
    }
    
    if (error.originalError) {
      console.error('原始错误:', error.originalError.message);
    }
    
    // 常见错误解决建议
    if (error.message.includes('Login failed')) {
      console.log('💡 建议: 检查用户名和密码是否正确');
    } else if (error.message.includes('Cannot open database')) {
      console.log('💡 建议: 检查数据库名称是否正确，或数据库是否存在');
    } else if (error.message.includes('timeout')) {
      console.log('💡 建议: 检查网络连接或增加超时时间');
    }
    
  } finally {
    if (pool) {
      try {
        await pool.close();
        console.log('🔒 数据库连接已关闭');
      } catch (closeError) {
        console.error('关闭连接时出错:', closeError.message);
      }
    }
  }
}

// 运行测试
testConnection().then(() => {
  console.log('=== 测试完成 ===');
  process.exit(0);
}).catch((error) => {
  console.error('测试脚本执行失败:', error);
  process.exit(1);
});
