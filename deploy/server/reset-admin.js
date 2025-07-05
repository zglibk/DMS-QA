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

async function resetAdmin() {
  try {
    console.log('正在连接数据库...');
    const pool = await sql.connect(config);
    console.log('数据库连接成功');
    
    // 生成新密码哈希
    const newPassword = '123456';
    const hash = await bcrypt.hash(newPassword, 10);
    console.log(`新密码: ${newPassword}`);
    console.log(`密码哈希: ${hash}`);
    
    // 更新admin用户密码和状态
    const result = await pool.request()
      .input('Username', sql.NVarChar, 'admin')
      .input('Password', sql.NVarChar, hash)
      .input('Status', sql.Int, 1)  // 设置为启用状态
      .query('UPDATE [User] SET Password = @Password, Status = @Status WHERE Username = @Username');
    
    console.log(`更新了 ${result.rowsAffected[0]} 行记录`);
    
    // 验证更新
    const verifyResult = await pool.request()
      .input('Username', sql.NVarChar, 'admin')
      .query('SELECT Username, Role, Status FROM [User] WHERE Username = @Username');
    
    if (verifyResult.recordset.length > 0) {
      const user = verifyResult.recordset[0];
      console.log(`验证结果: 用户名=${user.Username}, 角色=${user.Role}, 状态=${user.Status}`);
    }
    
    await pool.close();
    console.log('admin用户密码重置完成');
  } catch (err) {
    console.error('错误:', err.message);
  }
}

resetAdmin();
