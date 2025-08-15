const sql = require('mssql');
const fs = require('fs');
const path = require('path');
const { getDynamicConfig, getConnection } = require('../config/database');

// 使用项目的数据库配置

/**
 * 执行出版异常表初始化
 */
async function initPublishingExceptionsTable() {
  try {
    console.log('开始初始化出版异常表...');
    
    // 获取数据库连接池
    const pool = await getConnection();
    console.log('数据库连接成功');
    
    // 读取SQL文件
    const sqlFilePath = path.join(__dirname, 'create-publishing-exceptions-table.sql');
    const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');
    
    // 直接执行整个SQL内容
    console.log('执行SQL脚本...');
    try {
      const result = await pool.request().query(sqlContent);
      console.log('SQL脚本执行成功');
    } catch (error) {
      console.log(`SQL执行结果: ${error.message}`);
      // 如果是表不存在的错误，可以忽略
      if (!error.message.includes('does not exist')) {
        throw error;
      }
    }
    
    console.log('✅ 出版异常表初始化完成');
    
  } catch (error) {
    console.error('❌ 初始化失败:', error.message);
  }
}

// 执行初始化
initPublishingExceptionsTable();