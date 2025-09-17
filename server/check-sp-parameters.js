/**
 * 检查存储过程参数定义
 * 确认SP_GenerateAssessmentRecords的正确参数
 */

const { sql, getDynamicConfig } = require('./db');

async function checkSPParameters() {
    try {
        console.log('=== 开始检查存储过程参数 ===');
        const pool = await sql.connect(await getDynamicConfig());
        
        // 1. 检查存储过程参数
        console.log('\n1. 检查存储过程参数:');
        const parametersResult = await pool.request().query(`
            SELECT 
                PARAMETER_NAME,
                DATA_TYPE,
                PARAMETER_MODE,
                IS_RESULT
            FROM INFORMATION_SCHEMA.PARAMETERS 
            WHERE SPECIFIC_NAME = 'SP_GenerateAssessmentRecords'
            ORDER BY ORDINAL_POSITION
        `);
        
        console.log('存储过程参数:');
        parametersResult.recordset.forEach(param => {
            console.log(`参数名: ${param.PARAMETER_NAME}, 类型: ${param.DATA_TYPE}, 模式: ${param.PARAMETER_MODE}`);
        });
        
        // 2. 尝试不同的调用方式
        console.log('\n2. 尝试简化调用:');
        
        try {
            // 只传入必需的参数
            const simpleResult = await pool.request().query(`
                EXEC SP_GenerateAssessmentRecords '2025-01-01', '2025-12-31'
            `);
            console.log('简化调用成功:', simpleResult.recordset);
        } catch (error) {
            console.log('简化调用失败:', error.message);
        }
        
        // 3. 检查现有的API调用方式
        console.log('\n3. 检查现有API的调用方式:');
        console.log('根据assessment.js中的代码，API使用以下方式调用:');
        console.log('await pool.request()');
        console.log('  .input("startDate", sql.Date, startDate)');
        console.log('  .input("endDate", sql.Date, endDate)');
        console.log('  .execute("SP_GenerateAssessmentRecords");');
        
        await pool.close();
        console.log('\n=== 检查完成 ===');
        
    } catch (error) {
        console.error('检查失败:', error);
    }
}

checkSPParameters();