/**
 * 简单测试存储过程的脚本
 * 测试修改后的存储过程是否能正常生成考核记录
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
 * 测试存储过程
 */
async function testProcedure() {
    let pool;
    
    try {
        console.log('连接数据库...');
        pool = await sql.connect(config);
        console.log('数据库连接成功');
        
        // 1. 检查存储过程是否存在
        console.log('\n=== 检查存储过程 ===');
        const checkProcedure = await pool.request().query(`
            SELECT name, create_date, modify_date 
            FROM sys.objects 
            WHERE type = 'P' AND name = 'GenerateAssessmentRecords'
        `);
        
        if (checkProcedure.recordset.length === 0) {
            console.log('❌ 存储过程不存在');
            return;
        }
        
        console.log('✓ 存储过程存在');
        console.log('创建时间:', checkProcedure.recordset[0].create_date);
        console.log('修改时间:', checkProcedure.recordset[0].modify_date);
        
        // 2. 检查现有考核记录数量
        console.log('\n=== 执行前检查 ===');
        const beforeCount = await pool.request().query('SELECT COUNT(*) as count FROM AssessmentRecords');
        console.log('执行前考核记录数量:', beforeCount.recordset[0].count);
        
        // 3. 执行存储过程
        console.log('\n=== 执行存储过程 ===');
        const result = await pool.request().execute('GenerateAssessmentRecords');
        console.log('✓ 存储过程执行成功');
        
        // 4. 检查执行后的记录数量
        console.log('\n=== 执行后检查 ===');
        const afterCount = await pool.request().query('SELECT COUNT(*) as count FROM AssessmentRecords');
        console.log('执行后考核记录数量:', afterCount.recordset[0].count);
        console.log('新增记录数量:', afterCount.recordset[0].count - beforeCount.recordset[0].count);
        
        // 5. 检查各类型记录数量
        console.log('\n=== 按类型统计 ===');
        const typeStats = await pool.request().query(`
            SELECT SourceType, COUNT(*) as count 
            FROM AssessmentRecords 
            GROUP BY SourceType
        `);
        
        typeStats.recordset.forEach(row => {
            console.log(`${row.SourceType}: ${row.count} 条记录`);
        });
        
        // 6. 检查最新的出版异常记录
        console.log('\n=== 最新的出版异常考核记录 ===');
        const exceptionRecords = await pool.request().query(`
            SELECT TOP 5 PersonName, AssessmentAmount, AssessmentDate, CreatedAt
            FROM AssessmentRecords 
            WHERE SourceType = 'exception'
            ORDER BY CreatedAt DESC
        `);
        
        if (exceptionRecords.recordset.length > 0) {
            console.log('✓ 找到出版异常考核记录:');
            exceptionRecords.recordset.forEach((record, index) => {
                console.log(`  ${index + 1}. ${record.PersonName} - ¥${record.AssessmentAmount} (${record.AssessmentDate.toISOString().split('T')[0]})`);
            });
        } else {
            console.log('⚠️ 未找到出版异常考核记录');
        }
        
        console.log('\n=== 测试完成 ===');
        
    } catch (error) {
        console.error('测试失败:', error.message);
        throw error;
    } finally {
        if (pool) {
            await pool.close();
            console.log('数据库连接已关闭');
        }
    }
}

// 执行测试
testProcedure().catch(error => {
    console.error('程序执行失败:', error);
    process.exit(1);
});