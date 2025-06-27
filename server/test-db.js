const { sql, config } = require('./db');

(async () => {
  try {
    let pool = await sql.connect(config);
    console.log('数据库连接成功！');
    await pool.close();
  } catch (err) {
    console.error('数据库连接失败：', err.message);
  }
})(); 