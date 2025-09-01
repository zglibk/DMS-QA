/**
 * 检查数据库中的日志相关表
 * 用于诊断SystemLogs表不存在的问题
 */

const { sql, getDynamicConfig } = require('./db');

async function checkLogTables() {
  let pool;
  
  try {
    console.log('🔍 正在检查数据库中的日志相关表...');
    
    pool = await sql.connect(await getDynamicConfig());
    
    // 查询所有包含Log的表名
    const tablesResult = await pool.request()
      .query(`
        SELECT TABLE_NAME 
        FROM INFORMATION_SCHEMA.TABLES 
        WHERE TABLE_NAME LIKE '%Log%' 
        ORDER BY TABLE_NAME
      `);
    
    console.log('\n📋 数据库中包含"Log"的表:');
    if (tablesResult.recordset.length === 0) {
      console.log('❌ 没有找到包含"Log"的表');
    } else {
      tablesResult.recordset.forEach((table, index) => {
        console.log(`  ${index + 1}. ${table.TABLE_NAME}`);
      });
    }
    
    // 查询所有表名，看看是否有类似的表
    const allTablesResult = await pool.request()
      .query(`
        SELECT TABLE_NAME 
        FROM INFORMATION_SCHEMA.TABLES 
        WHERE TABLE_TYPE = 'BASE TABLE'
        ORDER BY TABLE_NAME
      `);
    
    console.log('\n📋 数据库中的所有表:');
    allTablesResult.recordset.forEach((table, index) => {
      console.log(`  ${index + 1}. ${table.TABLE_NAME}`);
    });
    
    // 特别检查是否存在SystemLogs表
    const systemLogsCheck = await pool.request()
      .query(`
        SELECT COUNT(*) as count
        FROM INFORMATION_SCHEMA.TABLES 
        WHERE TABLE_NAME = 'SystemLogs'
      `);
    
    console.log('\n🔍 SystemLogs表检查结果:');
    if (systemLogsCheck.recordset[0].count > 0) {
      console.log('✅ SystemLogs表存在');
    } else {
      console.log('❌ SystemLogs表不存在');
      
      // 检查可能的替代表名
      const alternativeNames = ['SystemLog', 'Logs', 'Log', 'AuditLogs', 'AuditLog', 'OperationLogs', 'OperationLog'];
      
      console.log('\n🔍 检查可能的替代表名:');
      for (const name of alternativeNames) {
        const checkResult = await pool.request()
          .query(`
            SELECT COUNT(*) as count
            FROM INFORMATION_SCHEMA.TABLES 
            WHERE TABLE_NAME = '${name}'
          `);
        
        if (checkResult.recordset[0].count > 0) {
          console.log(`✅ 找到替代表: ${name}`);
        } else {
          console.log(`❌ ${name} 不存在`);
        }
      }
    }
    
  } catch (error) {
    console.error('❌ 检查数据库表时出错:', error.message);
  } finally {
    if (pool) {
      await pool.close();
      console.log('\n🔒 数据库连接已关闭');
    }
  }
}

// 运行检查
checkLogTables();