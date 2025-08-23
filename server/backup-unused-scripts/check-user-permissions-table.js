/**
 * 检查UserPermissions表结构
 */

const sql = require('mssql');
const { getDynamicConfig } = require('./config/database');

/**
 * 检查UserPermissions表结构
 */
async function checkUserPermissionsTable() {
  let pool;
  
  try {
    console.log('=== 检查UserPermissions表结构 ===');
    
    // 连接数据库
    pool = await sql.connect(await getDynamicConfig());
    console.log('数据库连接成功');
    
    // 检查UserPermissions表结构
    const result = await pool.request()
      .query(`
        SELECT 
          COLUMN_NAME,
          DATA_TYPE,
          IS_NULLABLE,
          COLUMN_DEFAULT,
          CHARACTER_MAXIMUM_LENGTH
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_NAME = 'UserPermissions'
        ORDER BY ORDINAL_POSITION
      `);
    
    console.log('UserPermissions表结构:');
    result.recordset.forEach(column => {
      console.log(`${column.COLUMN_NAME} - ${column.DATA_TYPE}${column.CHARACTER_MAXIMUM_LENGTH ? `(${column.CHARACTER_MAXIMUM_LENGTH})` : ''} (${column.IS_NULLABLE})`);
    });
    
    // 检查表中的数据示例
    console.log('\n表中数据示例:');
    const dataResult = await pool.request()
      .query('SELECT TOP 3 * FROM UserPermissions ORDER BY CreatedAt DESC');
    
    if (dataResult.recordset.length > 0) {
      console.log('列名:', Object.keys(dataResult.recordset[0]).join(', '));
      dataResult.recordset.forEach((row, index) => {
        console.log(`记录${index + 1}:`, row);
      });
    } else {
      console.log('表中暂无数据');
    }
    
  } catch (error) {
    console.error('检查过程中发生错误:', error.message);
  } finally {
    if (pool) {
      await pool.close();
      console.log('\n数据库连接已关闭');
    }
  }
}

// 运行检查
checkUserPermissionsTable();