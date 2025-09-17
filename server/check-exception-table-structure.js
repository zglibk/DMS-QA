/**
 * 检查publishing_exceptions表的实际字段结构
 */

const { getConnection, sql } = require('./db');

/**
 * 检查异常表结构
 */
async function checkExceptionTableStructure() {
    try {
        console.log('连接数据库...');
        const pool = await getConnection();
        console.log('数据库连接成功');

        // 检查publishing_exceptions表结构
        console.log('\n=== publishing_exceptions表结构 ===');
        const exceptionColumnsQuery = `
            SELECT 
                COLUMN_NAME,
                DATA_TYPE,
                IS_NULLABLE,
                COLUMN_DEFAULT
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_NAME = 'publishing_exceptions'
            ORDER BY ORDINAL_POSITION
        `;
        
        const exceptionResult = await pool.request().query(exceptionColumnsQuery);
        console.log('publishing_exceptions表字段:');
        exceptionResult.recordset.forEach(row => {
            console.log(`  ${row.COLUMN_NAME} (${row.DATA_TYPE}) - 可空: ${row.IS_NULLABLE}`);
        });

        // 查看样本数据
        console.log('\n=== publishing_exceptions表样本数据 ===');
        const sampleQuery = `
            SELECT TOP 3 * FROM publishing_exceptions
        `;
        
        const sampleResult = await pool.request().query(sampleQuery);
        console.log('前3条记录:');
        sampleResult.recordset.forEach((row, index) => {
            console.log(`记录 ${index + 1}:`, JSON.stringify(row, null, 2));
        });

        // 检查ProductionReworkRegister表结构
        console.log('\n=== ProductionReworkRegister表结构 ===');
        try {
            const reworkColumnsQuery = `
                SELECT 
                    COLUMN_NAME,
                    DATA_TYPE,
                    IS_NULLABLE,
                    COLUMN_DEFAULT
                FROM INFORMATION_SCHEMA.COLUMNS 
                WHERE TABLE_NAME = 'ProductionReworkRegister'
                ORDER BY ORDINAL_POSITION
            `;
            
            const reworkResult = await pool.request().query(reworkColumnsQuery);
            console.log('ProductionReworkRegister表字段:');
            reworkResult.recordset.forEach(row => {
                console.log(`  ${row.COLUMN_NAME} (${row.DATA_TYPE}) - 可空: ${row.IS_NULLABLE}`);
            });

            // 查看样本数据
            console.log('\n=== ProductionReworkRegister表样本数据 ===');
            const reworkSampleQuery = `
                SELECT TOP 3 * FROM ProductionReworkRegister
            `;
            
            const reworkSampleResult = await pool.request().query(reworkSampleQuery);
            console.log('前3条记录:');
            reworkSampleResult.recordset.forEach((row, index) => {
                console.log(`记录 ${index + 1}:`, JSON.stringify(row, null, 2));
            });

        } catch (error) {
            console.log(`ProductionReworkRegister表查询失败: ${error.message}`);
        }

    } catch (error) {
        console.error('检查表结构时出错:', error);
    }
}

// 运行检查
checkExceptionTableStructure();