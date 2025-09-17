/**
 * 检查publishing_exceptions表是否存在的脚本
 */

const sql = require('mssql');

// 数据库配置
const config = {
    user: 'sa',
    password: 'Qa369*',
    server: '192.168.1.57',
    database: 'DMS-QA',
    options: {
        encrypt: false,
        trustServerCertificate: true,
        enableArithAbort: true
    },
    pool: {
        max: 10,
        min: 0,
        idleTimeoutMillis: 30000
    }
};

/**
 * 检查表是否存在
 */
async function checkTable() {
    let pool;
    
    try {
        console.log('连接数据库...');
        pool = await sql.connect(config);
        console.log('数据库连接成功');
        
        // 1. 检查所有表
        console.log('\n=== 检查所有表 ===');
        const allTables = await pool.request().query(`
            SELECT TABLE_NAME 
            FROM INFORMATION_SCHEMA.TABLES 
            WHERE TABLE_TYPE = 'BASE TABLE'
            ORDER BY TABLE_NAME
        `);
        
        console.log('数据库中的所有表:');
        allTables.recordset.forEach(table => {
            console.log(`  - ${table.TABLE_NAME}`);
        });
        
        // 2. 检查publishing_exceptions表
        console.log('\n=== 检查publishing_exceptions表 ===');
        const publishingTable = allTables.recordset.find(table => 
            table.TABLE_NAME.toLowerCase() === 'publishing_exceptions'
        );
        
        if (publishingTable) {
            console.log('✓ publishing_exceptions表存在');
            
            // 检查表结构
            const columns = await pool.request().query(`
                SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT
                FROM INFORMATION_SCHEMA.COLUMNS 
                WHERE TABLE_NAME = 'publishing_exceptions'
                ORDER BY ORDINAL_POSITION
            `);
            
            console.log('表结构:');
            columns.recordset.forEach(col => {
                console.log(`  - ${col.COLUMN_NAME}: ${col.DATA_TYPE} (${col.IS_NULLABLE === 'YES' ? 'NULL' : 'NOT NULL'})`);
            });
            
            // 检查数据
            const count = await pool.request().query('SELECT COUNT(*) as count FROM publishing_exceptions');
            console.log(`数据行数: ${count.recordset[0].count}`);
            
            if (count.recordset[0].count > 0) {
                const sample = await pool.request().query(`
                    SELECT TOP 3 id, responsible_person, amount, registration_date, publishing_date, created_date, isDeleted
                    FROM publishing_exceptions
                `);
                
                console.log('样本数据:');
                sample.recordset.forEach((row, index) => {
                    console.log(`  ${index + 1}. ID: ${row.id}, 责任人: ${row.responsible_person}, 金额: ${row.amount}`);
                });
            }
            
        } else {
            console.log('❌ publishing_exceptions表不存在');
            
            // 查找类似的表名
            const similarTables = allTables.recordset.filter(table => 
                table.TABLE_NAME.toLowerCase().includes('publish') || 
                table.TABLE_NAME.toLowerCase().includes('exception')
            );
            
            if (similarTables.length > 0) {
                console.log('找到类似的表:');
                similarTables.forEach(table => {
                    console.log(`  - ${table.TABLE_NAME}`);
                });
            }
        }
        
        console.log('\n=== 检查完成 ===');
        
    } catch (error) {
        console.error('检查失败:', error.message);
        throw error;
    } finally {
        if (pool) {
            await pool.close();
            console.log('数据库连接已关闭');
        }
    }
}

// 执行检查
checkTable().catch(error => {
    console.error('程序执行失败:', error);
    process.exit(1);
});