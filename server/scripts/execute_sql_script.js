/**
 * SQL脚本执行工具
 * 
 * 用于执行SQL Server建表脚本和数据库更新脚本
 * 支持SQL Server 2008R2及以上版本
 */

const fs = require('fs');
const { getConnection } = require('../db');

/**
 * 执行SQL脚本文件
 * @param {string} scriptPath - SQL脚本文件路径
 * @returns {Promise<boolean>} - 执行结果
 */
async function executeSqlScript(scriptPath) {
  try {
    console.log(`开始执行SQL脚本: ${scriptPath}`);
    
    // 读取SQL脚本文件
    const sqlContent = fs.readFileSync(scriptPath, 'utf8');
    
    // 获取数据库连接
    const pool = await getConnection();
    
    if (!pool || !pool.connected) {
      throw new Error('数据库连接失败');
    }
    
    // 按GO分割SQL语句
    const queries = sqlContent
      .split(/\bGO\b/i)  // 使用正则表达式分割，忽略大小写
      .map(query => query.trim())
      .filter(query => query.length > 0);
    
    console.log(`发现 ${queries.length} 个SQL语句块`);
    
    // 逐个执行SQL语句
    for (let i = 0; i < queries.length; i++) {
      const query = queries[i];
      
      if (query.length === 0) continue;
      
      console.log(`执行第 ${i + 1} 个语句块...`);
      
      try {
        const request = pool.request();
        await request.query(query);
        console.log(`第 ${i + 1} 个语句块执行成功`);
      } catch (queryError) {
        console.error(`第 ${i + 1} 个语句块执行失败:`, queryError.message);
        
        // 如果是表已存在的错误，继续执行
        if (queryError.message.includes('已存在') || 
            queryError.message.includes('already exists') ||
            queryError.number === 2714) {
          console.log('表已存在，跳过创建');
          continue;
        }
        
        throw queryError;
      }
    }
    
    console.log('SQL脚本执行完成');
    return true;
    
  } catch (error) {
    console.error('SQL脚本执行失败:', error.message);
    return false;
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  const scriptPath = process.argv[2];
  
  if (!scriptPath) {
    console.error('请提供SQL脚本文件路径');
    console.log('用法: node execute_sql_script.js <script_path>');
    process.exit(1);
  }
  
  if (!fs.existsSync(scriptPath)) {
    console.error(`SQL脚本文件不存在: ${scriptPath}`);
    process.exit(1);
  }
  
  executeSqlScript(scriptPath)
    .then(success => {
      if (success) {
        console.log('✅ SQL脚本执行成功');
        process.exit(0);
      } else {
        console.log('❌ SQL脚本执行失败');
        process.exit(1);
      }
    })
    .catch(error => {
      console.error('❌ 执行过程中发生错误:', error.message);
      process.exit(1);
    });
}

module.exports = {
  executeSqlScript
};