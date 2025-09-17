/**
 * 调试生成API的返回数据问题
 * 直接调用存储过程查看返回结果
 */

const { sql, getDynamicConfig } = require('./db');

async function debugGenerateAPI() {
    try {
        console.log('=== 开始调试生成API ===');
        const pool = await sql.connect(await getDynamicConfig());
        
        // 1. 模拟API调用存储过程的方式
        console.log('\n1. 模拟API调用方式:');
        const request = pool.request();
        
        const startDate = '2025-01-01';
        const endDate = '2025-12-31';
        
        request.input('startDate', sql.Date, startDate);
        request.input('endDate', sql.Date, endDate);
        
        console.log('调用存储过程...');
        const result = await request.execute('SP_GenerateAssessmentRecords');
        
        console.log('存储过程返回结果:');
        console.log('result.recordset:', result.recordset);
        console.log('result.recordsets:', result.recordsets);
        console.log('result.output:', result.output);
        console.log('result.returnValue:', result.returnValue);
        
        // 2. 检查recordset的内容
        if (result.recordset && result.recordset.length > 0) {
            console.log('\n2. recordset内容详情:');
            result.recordset.forEach((record, index) => {
                console.log(`记录 ${index}:`, record);
                console.log('记录的所有属性:', Object.keys(record));
            });
        } else {
            console.log('\n2. recordset为空或不存在');
        }
        
        // 3. 检查所有recordsets
        if (result.recordsets && result.recordsets.length > 0) {
            console.log('\n3. 所有recordsets:');
            result.recordsets.forEach((recordset, index) => {
                console.log(`recordset ${index}:`, recordset);
            });
        }
        
        await pool.close();
        console.log('\n=== 调试完成 ===');
        
    } catch (error) {
        console.error('调试失败:', error);
    }
}

debugGenerateAPI();