const sql = require('mssql');
const bcrypt = require('bcryptjs');

const config = {
  user: 'sa',
  password: 'Qa369*',
  server: '192.168.1.57',
  database: 'DMS-QA',
  options: {
    encrypt: false,
    trustServerCertificate: true,
    enableArithAbort: true
  }
};

async function testDb() {
  try {
    console.log('正在连接数据库...');
    const pool = await sql.connect(config);
    console.log('数据库连接成功');
    
    // 查询用户表
    const result = await pool.request()
      .query('SELECT Username, Password, Role, Status FROM [User]');
    
    console.log('用户列表:');
    result.recordset.forEach(user => {
      console.log(`用户名: ${user.Username}, 角色: ${user.Role}, 状态: ${user.Status}, 密码哈希: ${user.Password.substring(0, 20)}...`);
    });

    // 测试密码验证
    if (result.recordset.length > 0) {
      const adminUser = result.recordset.find(u => u.Username === 'admin');
      if (adminUser) {
        console.log('\n测试密码验证:');
        const testPasswords = ['123456', 'admin123', 'admin'];
        for (const pwd of testPasswords) {
          const isValid = await bcrypt.compare(pwd, adminUser.Password);
          console.log(`密码 "${pwd}": ${isValid ? '正确' : '错误'}`);
        }
      }
    }
    
    await pool.close();
  } catch (err) {
    console.error('数据库错误:', err.message);
  }
}

testDb();
