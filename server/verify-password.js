/**
 * 验证admin用户密码
 */

const bcrypt = require('bcryptjs');
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

async function verifyPassword() {
  let pool = null;
  
  try {
    console.log('🔄 连接数据库...');
    pool = await sql.connect(config);
    
    // 获取admin用户的密码哈希
    const result = await pool.request()
      .input('username', sql.NVarChar, 'admin')
      .query('SELECT Password FROM [User] WHERE Username = @username');
    
    if (result.recordset.length === 0) {
      console.log('❌ admin用户不存在');
      return;
    }
    
    const storedHash = result.recordset[0].Password;
    console.log('📋 存储的密码哈希:', storedHash);
    
    // 测试常见密码
    const testPasswords = ['123456', 'admin123', 'admin', 'password', '123', 'Qa369*'];
    
    console.log('\n🔍 测试常见密码:');
    for (const password of testPasswords) {
      try {
        const isMatch = await bcrypt.compare(password, storedHash);
        console.log(`  ${password}: ${isMatch ? '✅ 匹配' : '❌ 不匹配'}`);
        
        if (isMatch) {
          console.log(`\n🎉 找到正确密码: ${password}`);
          break;
        }
      } catch (error) {
        console.log(`  ${password}: ❌ 验证出错 - ${error.message}`);
      }
    }
    
  } catch (error) {
    console.error('❌ 错误:', error.message);
  } finally {
    if (pool) {
      await pool.close();
    }
  }
}

verifyPassword();
