/**
 * 检查数据库表脚本
 */

const sql = require('mssql');
require('dotenv').config();

// 数据库配置
const config = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  server: process.env.DB_SERVER,
  database: process.env.DB_DATABASE,
  options: {
    encrypt: false,
    trustServerCertificate: true
  }
};

/**
 * 检查数据库表
 */
async function checkTables() {
  try {
    console.log('连接数据库...');
    await sql.connect(config);
    console.log('数据库连接成功');

    // 查询所有表
    const tablesQuery = `
      SELECT TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_TYPE = 'BASE TABLE' 
      ORDER BY TABLE_NAME
    `;

    console.log('查询数据库中的表...');
    const tablesResult = await sql.query(tablesQuery);
    
    console.log('\n数据库中的表:');
    console.log('================================================================================');
    
    if (tablesResult.recordset.length === 0) {
      console.log('没有找到任何表');
    } else {
      tablesResult.recordset.forEach((row, index) => {
        console.log(`${index + 1}. ${row.TABLE_NAME}`);
      });
    }

    // 查找包含"Calibration"的表
    const calibrationTables = tablesResult.recordset.filter(row => 
      row.TABLE_NAME.toLowerCase().includes('calibration')
    );

    if (calibrationTables.length > 0) {
      console.log('\n包含"Calibration"的表:');
      calibrationTables.forEach(row => {
        console.log(`- ${row.TABLE_NAME}`);
      });
    } else {
      console.log('\n没有找到包含"Calibration"的表');
    }

  } catch (error) {
    console.error('错误:', error.message);
  } finally {
    await sql.close();
    console.log('\n数据库连接已关闭');
  }
}

// 运行检查
checkTables();