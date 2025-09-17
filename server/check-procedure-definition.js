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
 * 检查存储过程定义
 */
async function checkProcedureDefinition() {
    try {
        console.log('连接数据库...');
        await sql.connect(config);
        console.log('数据库连接成功');

        // 获取存储过程定义
        const result = await sql.query(`
            SELECT 
                OBJECT_DEFINITION(OBJECT_ID('GenerateAssessmentRecords')) as ProcedureDefinition
        `);

        console.log('\n=== 存储过程定义 ===');
        console.log(result.recordset[0].ProcedureDefinition);

        // 检查AssessmentRecords表结构
        const tableStructure = await sql.query(`
            SELECT 
                COLUMN_NAME,
                DATA_TYPE,
                IS_NULLABLE,
                COLUMN_DEFAULT
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_NAME = 'AssessmentRecords'
            ORDER BY ORDINAL_POSITION
        `);

        console.log('\n=== AssessmentRecords表结构 ===');
        tableStructure.recordset.forEach(col => {
            console.log(`${col.COLUMN_NAME}: ${col.DATA_TYPE} (可空: ${col.IS_NULLABLE})`);
        });

        await sql.close();
        console.log('\n数据库连接已关闭');

    } catch (error) {
        console.error('检查失败:', error.message);
        console.error('详细错误:', error);
        process.exit(1);
    }
}

checkProcedureDefinition();