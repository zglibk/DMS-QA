/**
 * 测试出版异常记录的考核记录生成功能
 * 用于验证存储过程是否正确处理出版异常记录
 */
const { sql, config, getDynamicConfig } = require('./db');

async function testExceptionRecords() {
    try {
        const pool = await sql.connect(await getDynamicConfig());
        
        console.log('=== 测试生成出版异常记录的考核记录 ===');
        
        // 执行存储过程生成考核记录
        const result = await pool.request()
            .input('StartDate', sql.Date, '2024-01-01')
            .input('EndDate', sql.Date, '2024-12-31')
            .output('GeneratedCount', sql.Int)
            .execute('SP_GenerateAssessmentRecords');
        
        console.log('生成的记录数量:', result.output.GeneratedCount);
        
        console.log('\n=== 检查生成的出版异常考核记录 ===');
        
        // 查询生成的出版异常考核记录
        const records = await pool.request().query(`
            SELECT TOP 5 * 
            FROM AssessmentRecords 
            WHERE SourceType = 'exception' 
            ORDER BY AssessmentDate DESC
        `);
        
        console.log('出版异常考核记录:', records.recordset);
        
        console.log('\n=== 检查出版异常记录原始数据 ===');
        
        // 查询出版异常记录原始数据
        const exceptions = await pool.request().query(`
            SELECT TOP 5 id, responsible_person, amount, registration_date, isDeleted
            FROM publishing_exceptions 
            WHERE isDeleted = 0
            ORDER BY registration_date DESC
        `);
        
        console.log('出版异常原始记录:', exceptions.recordset);
        
        await pool.close();
        
    } catch (err) {
        console.error('测试失败:', err.message);
        console.error('错误详情:', err);
    }
}

// 执行测试
testExceptionRecords();