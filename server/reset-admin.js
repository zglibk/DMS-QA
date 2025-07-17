const mysql = require('mysql2/promise'); // 使用 mysql2 驱动
const bcrypt = require('bcryptjs');

// 数据库配置（适配 MySQL 及云服务器）
const config = {
  host: process.env.DB_HOST || '123.207.75.61', // 云服务器 IP
  user: process.env.DB_USER || 'zglibk',         // 使用 MySQL 用户名
  password: process.env.DB_PASSWORD || 'Qa369*', // 使用 MySQL 密码
  database: process.env.DB_NAME || 'DMS-QA',     // 数据库名（小写更符合 MySQL 习惯）
  port: 3306,             // MySQL 默认端口
  connectionLimit: 10,
  waitForConnections: true
};

async function resetAdmin() {
  let connection = null;
  try {
    console.log('正在连接数据库...');
    const pool = mysql.createPool(config);
    connection = await pool.getConnection();
    console.log('数据库连接成功');
    
    // 生成新密码哈希
    const newPassword = '123456';
    const hash = await bcrypt.hash(newPassword, 10);
    console.log(`新密码: ${newPassword}`);
    console.log(`密码哈希: ${hash}`);
    
    // 更新 admin 用户密码和状态（使用 MySQL 语法）
    const [updateResult] = await connection.execute(
      'UPDATE `User` SET `Password` = ?, `Status` = ? WHERE `Username` = ?',
      [hash, 1, 'admin'] // 对应上面的 ? 占位符
    );
    
    console.log(`更新了 ${updateResult.affectedRows} 行记录`);
    
    // 验证更新
    const [verifyResult] = await connection.execute(
      'SELECT `Username`, `Role`, `Status` FROM `User` WHERE `Username` = ?',
      ['admin']
    );
    
    if (verifyResult.length > 0) {
      const user = verifyResult[0];
      console.log(`验证结果: 用户名=${user.Username}, 角色=${user.Role}, 状态=${user.Status}`);
    } else {
      console.log('未找到 admin 用户，请检查表结构和数据');
    }
    
    console.log('admin 用户密码重置完成');
  } catch (err) {
    console.error('错误:', err.message);
    console.error('错误堆栈:', err.stack); // 输出完整堆栈信息
  } finally {
    // 确保释放数据库连接
    if (connection) {
      connection.release();
      console.log('数据库连接已释放');
    }
  }
}

resetAdmin();