const sql = require('mssql');

// 数据库连接配置
const config = {
    user: 'sa',
    password: 'Qa369*',
    server: '192.168.1.57',
    port: 1433,
    database: 'DMS-QA',
    options: {
        encrypt: false,
        trustServerCertificate: true,
        connectTimeout: 30000,
        requestTimeout: 30000
    }
};

/**
 * 直接测试存储过程
 */
async function testProcedureDirect() {
    let pool;
    try {
        console.log('连接数据库...');
        pool = await sql.connect(config);
        console.log('数据库连接成功');

        // 检查执行前的记录数量
        const beforeResult = await pool.request().query(`
            SELECT COUNT(*) as count FROM AssessmentRecords
        `);
        console.log(`\n执行前考核记录数量: ${beforeResult.recordset[0].count}`);

        // 直接执行存储过程，不使用事务
        console.log('\n=== 执行存储过程 ===');
        const result = await pool.request().execute('GenerateAssessmentRecords');
        
        console.log('存储过程执行成功');
        console.log('返回信息:', result.recordset);

        // 检查执行后的记录数量
        const afterResult = await pool.request().query(`
            SELECT COUNT(*) as count FROM AssessmentRecords
        `);
        console.log(`\n执行后考核记录数量: ${afterResult.recordset[0].count}`);
        console.log(`新增记录数量: ${afterResult.recordset[0].count - beforeResult.recordset[0].count}`);

        // 检查各类型记录数量
        const typeResult = await pool.request().query(`
            SELECT 
                SourceType,
                COUNT(*) as count
            FROM AssessmentRecords 
            GROUP BY SourceType
            ORDER BY SourceType
        `);

        console.log('\n=== 按类型统计 ===');
        typeResult.recordset.forEach(row => {
            console.log(`${row.SourceType}: ${row.count} 条记录`);
        });

        // 检查最新的出版异常记录
        const exceptionResult = await pool.request().query(`
            SELECT TOP 5 
                PersonName,
                PersonType,
                SourceType,
                AssessmentAmount,
                AssessmentDate,
                ComplaintID,
                CreatedAt
            FROM AssessmentRecords 
            WHERE SourceType = 'exception'
            ORDER BY CreatedAt DESC
        `);

        console.log('\n=== 最新出版异常记录 ===');
        exceptionResult.recordset.forEach(row => {
            console.log(`${row.PersonName} - ${row.AssessmentAmount}元 - ${row.AssessmentDate}`);
        });

        console.log('\n测试完成！');

    } catch (error) {
        console.error('测试失败:', error.message);
        console.error('详细错误:', error);
        process.exit(1);
    } finally {
        if (pool) {
            await pool.close();
            console.log('\n数据库连接已关闭');
        }
    }
}

testProcedureDirect();