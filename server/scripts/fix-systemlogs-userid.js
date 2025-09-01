/**
 * 修复SystemLogs表的UserID字段，允许NULL值
 * 解决匿名访问时无法记录日志的问题
 */

const { executeQuery } = require('../db');

async function fixSystemLogsUserID() {
  try {
    console.log('开始修复SystemLogs表的UserID字段...');
    
    // 修改UserID字段，允许NULL值
    await executeQuery(async (pool) => {
      await pool.request().query(`
        ALTER TABLE SystemLogs 
        ALTER COLUMN UserID INT NULL
      `);
    });
    
    console.log('✅ SystemLogs表的UserID字段已成功修改为允许NULL值');
    
    // 验证修改结果
    const result = await executeQuery(async (pool) => {
      return await pool.request().query(`
        SELECT COLUMN_NAME, IS_NULLABLE, DATA_TYPE 
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_NAME = 'SystemLogs' AND COLUMN_NAME = 'UserID'
      `);
    });
    
    console.log('修改后的UserID字段信息:', result.recordset);
    
  } catch (error) {
    console.error('修复SystemLogs表失败:', error);
    process.exit(1);
  }
}

// 执行修复
fixSystemLogsUserID()
  .then(() => {
    console.log('SystemLogs表修复完成');
    process.exit(0);
  })
  .catch((error) => {
    console.error('修复过程中发生错误:', error);
    process.exit(1);
  });