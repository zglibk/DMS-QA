const { getConnection } = require('./config/database');

/**
 * 查看最新的登录日志记录
 */
async function checkLatestLogs() {
  try {
    const pool = await getConnection();
    
    const result = await pool.request().query(`
      SELECT TOP 5 
        UserID, 
        Username, 
        RealName, 
        DepartmentID, 
        LoginStatus, 
        FailureReason, 
        LoginTime,
        CreatedAt
      FROM UserLoginLogs 
      ORDER BY CreatedAt DESC
    `);
    
    console.log('\n📋 最近5条登录日志记录:');
    console.log('=' .repeat(120));
    
    if (result.recordset.length === 0) {
      console.log('暂无登录日志记录');
      return;
    }
    
    result.recordset.forEach((log, index) => {
      console.log(`${index + 1}. UserID: ${log.UserID || 'N/A'}`);
      console.log(`   Username: ${log.Username}`);
      console.log(`   RealName: ${log.RealName || 'N/A'}`);
      console.log(`   DepartmentID: ${log.DepartmentID || 'N/A'}`);
      console.log(`   Status: ${log.LoginStatus}`);
      console.log(`   FailureReason: ${log.FailureReason || 'N/A'}`);
      console.log(`   LoginTime: ${log.LoginTime}`);
      console.log(`   CreatedAt: ${log.CreatedAt}`);
      console.log('-'.repeat(80));
    });
    
  } catch (error) {
    console.error('❌ 查询失败:', error.message);
  }
}

// 执行查询
checkLatestLogs();