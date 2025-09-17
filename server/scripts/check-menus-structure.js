/**
 * 查询Menus表的结构
 * 用于了解正确的字段名
 */

const { executeQuery } = require('../config/database');

/**
 * 查询Menus表结构
 */
async function checkMenusTable() {
  try {
    console.log('正在查询Menus表结构...');
    const result = await executeQuery(async (pool) => {
      return await pool.request().query(`
        SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_NAME = 'Menus'
        ORDER BY ORDINAL_POSITION
      `);
    });
    
    console.log('\nMenus表字段结构：');
    result.recordset.forEach(column => {
      console.log(`- ${column.COLUMN_NAME} (${column.DATA_TYPE}) - 可空: ${column.IS_NULLABLE}`);
    });
    
    // 查询一些示例数据
    console.log('\n=== 查询前5条菜单数据作为示例 ===');
    const sampleResult = await executeQuery(async (pool) => {
      return await pool.request().query(`
        SELECT TOP 5 * FROM Menus
      `);
    });
    
    if (sampleResult.recordset.length > 0) {
      console.log('\n示例数据：');
      sampleResult.recordset.forEach((menu, index) => {
        console.log(`${index + 1}. 菜单数据：`);
        Object.keys(menu).forEach(key => {
          console.log(`   ${key}: ${menu[key]}`);
        });
        console.log('   ---');
      });
    }
    
  } catch (err) {
    console.error('查询失败:', err.message);
    console.error('错误详情:', err);
  }
}

// 执行查询
checkMenusTable();