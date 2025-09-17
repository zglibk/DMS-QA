/**
 * 检查存储过程定义脚本
 * 查看SP_GenerateAssessmentRecords存储过程的具体实现
 */

const { sql, getDynamicConfig } = require('./db');

async function checkStoredProcedure() {
    try {
        console.log('=== 开始检查存储过程 ===');
        const pool = await sql.connect(await getDynamicConfig());
        
        // 查询存储过程定义
        const result = await pool.request().query(`
            SELECT OBJECT_DEFINITION(OBJECT_ID('SP_GenerateAssessmentRecords')) AS ProcedureDefinition
        `);
        
        console.log('存储过程定义:');
        console.log(result.recordset[0].ProcedureDefinition);
        
        // 同时检查存储过程是否存在
        const existsResult = await pool.request().query(`
            SELECT COUNT(*) as count 
            FROM sys.procedures 
            WHERE name = 'SP_GenerateAssessmentRecords'
        `);
        
        console.log('\n存储过程存在检查:', existsResult.recordset[0].count > 0 ? '存在' : '不存在');
        
        await pool.close();
        console.log('=== 检查完成 ===');
        
    } catch (error) {
        console.error('查询失败:', error);
    }
}

checkStoredProcedure();