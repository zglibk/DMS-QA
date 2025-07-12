/**
 * 检查User表中的用户数据
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

async function checkUser() {
  let pool = null;
  
  try {
    console.log('🔄 连接数据库...');
    pool = await sql.connect(config);
    
    // 查询User表结构
    console.log('📋 User表结构:');
    const columns = await pool.request().query(`
      SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'User'
      ORDER BY ORDINAL_POSITION
    `);
    
    columns.recordset.forEach(col => {
      console.log(`  ${col.COLUMN_NAME}: ${col.DATA_TYPE} ${col.IS_NULLABLE === 'YES' ? '(可空)' : '(非空)'}`);
    });
    
    // 查询所有用户
    console.log('\n👥 User表中的所有用户:');
    const users = await pool.request().query('SELECT * FROM [User]');
    
    if (users.recordset.length > 0) {
      users.recordset.forEach((user, index) => {
        console.log(`${index + 1}. 用户名: ${user.Username}, 角色: ${user.Role}, 状态: ${user.Status || '未设置'}`);
        console.log(`   真实姓名: ${user.RealName || '未设置'}, 部门: ${user.Department || '未设置'}`);
        console.log(`   密码哈希: ${user.Password ? user.Password.substring(0, 20) + '...' : '未设置'}`);
        console.log('');
      });
    } else {
      console.log('❌ User表中没有任何用户');
    }
    
    // 特别检查admin用户
    console.log('🔍 检查admin用户:');
    const adminUser = await pool.request()
      .input('username', sql.NVarChar, 'admin')
      .query('SELECT * FROM [User] WHERE Username = @username');
    
    if (adminUser.recordset.length > 0) {
      const admin = adminUser.recordset[0];
      console.log('✅ admin用户存在');
      console.log(`   ID: ${admin.ID}`);
      console.log(`   用户名: ${admin.Username}`);
      console.log(`   角色: ${admin.Role}`);
      console.log(`   状态: ${admin.Status || '未设置'}`);
      console.log(`   密码哈希: ${admin.Password}`);
    } else {
      console.log('❌ admin用户不存在');
      console.log('💡 需要初始化admin用户');
    }
    
  } catch (error) {
    console.error('❌ 错误:', error.message);
  } finally {
    if (pool) {
      await pool.close();
    }
  }
}

checkUser();
