/**
 * 检查数据库中所有表名的脚本
 * 用于找到考核记录表的正确名称
 */

const sql = require('mssql');
require('dotenv').config({ path: '.env.development' });

/**
 * 数据库连接配置
 */
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
 * 主函数：检查所有表名
 */
async function checkTableNames() {
    try {
        console.log('🔍 开始检查数据库中的所有表名...');
        
        // 连接数据库
        await sql.connect(config);
        console.log('✅ 数据库连接成功');
        
        // 1. 获取所有表名
        console.log('\n=== 数据库中的所有表 ===');
        const allTablesQuery = `
            SELECT TABLE_NAME, TABLE_TYPE
            FROM INFORMATION_SCHEMA.TABLES 
            WHERE TABLE_TYPE = 'BASE TABLE'
            ORDER BY TABLE_NAME
        `;
        const allTablesResult = await sql.query(allTablesQuery);
        console.log('所有表:', allTablesResult.recordset);
        
        // 2. 查找包含"Assessment"的表
        console.log('\n=== 包含"Assessment"的表 ===');
        const assessmentTablesQuery = `
            SELECT TABLE_NAME, TABLE_TYPE
            FROM INFORMATION_SCHEMA.TABLES 
            WHERE TABLE_NAME LIKE '%Assessment%' OR TABLE_NAME LIKE '%assessment%'
            ORDER BY TABLE_NAME
        `;
        const assessmentTablesResult = await sql.query(assessmentTablesQuery);
        console.log('包含Assessment的表:', assessmentTablesResult.recordset);
        
        // 3. 查找包含"Record"的表
        console.log('\n=== 包含"Record"的表 ===');
        const recordTablesQuery = `
            SELECT TABLE_NAME, TABLE_TYPE
            FROM INFORMATION_SCHEMA.TABLES 
            WHERE TABLE_NAME LIKE '%Record%' OR TABLE_NAME LIKE '%record%'
            ORDER BY TABLE_NAME
        `;
        const recordTablesResult = await sql.query(recordTablesQuery);
        console.log('包含Record的表:', recordTablesResult.recordset);
        
        // 4. 查找包含"考核"的表（中文）
        console.log('\n=== 包含"考核"的表 ===');
        const chineseTablesQuery = `
            SELECT TABLE_NAME, TABLE_TYPE
            FROM INFORMATION_SCHEMA.TABLES 
            WHERE TABLE_NAME LIKE '%考核%'
            ORDER BY TABLE_NAME
        `;
        const chineseTablesResult = await sql.query(chineseTablesQuery);
        console.log('包含考核的表:', chineseTablesResult.recordset);
        
        console.log('\n🎉 检查完成！');
        
    } catch (error) {
        console.error('❌ 检查过程中出现错误:', error);
    } finally {
        await sql.close();
    }
}

// 运行检查
checkTableNames();