/**
 * 检查各表的结构和字段名
 */

const { getConnection, sql } = require('./db');

/**
 * 检查表结构
 */
async function checkTableStructure() {
    try {
        console.log('连接数据库...');
        const pool = await getConnection();
        console.log('数据库连接成功');

        // 检查AssessmentRecords表结构
        console.log('\n=== AssessmentRecords表结构 ===');
        const assessmentColumnsQuery = `
            SELECT 
                COLUMN_NAME,
                DATA_TYPE,
                IS_NULLABLE,
                COLUMN_DEFAULT
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_NAME = 'AssessmentRecords'
            ORDER BY ORDINAL_POSITION
        `;
        
        const assessmentResult = await pool.request().query(assessmentColumnsQuery);
        console.log('AssessmentRecords表字段:');
        assessmentResult.recordset.forEach(row => {
            console.log(`  ${row.COLUMN_NAME} (${row.DATA_TYPE}) - 可空: ${row.IS_NULLABLE}`);
        });

        // 检查ComplaintRegister表结构
        console.log('\n=== ComplaintRegister表结构 ===');
        const complaintColumnsQuery = `
            SELECT 
                COLUMN_NAME,
                DATA_TYPE,
                IS_NULLABLE,
                COLUMN_DEFAULT
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_NAME = 'ComplaintRegister'
            ORDER BY ORDINAL_POSITION
        `;
        
        const complaintResult = await pool.request().query(complaintColumnsQuery);
        console.log('ComplaintRegister表字段:');
        complaintResult.recordset.forEach(row => {
            console.log(`  ${row.COLUMN_NAME} (${row.DATA_TYPE}) - 可空: ${row.IS_NULLABLE}`);
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
        } catch (error) {
            console.log(`ProductionReworkRegister表不存在或无权限访问: ${error.message}`);
        }

        // 检查publishing_exceptions表结构
        console.log('\n=== publishing_exceptions表结构 ===');
        try {
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
        } catch (error) {
            console.log(`publishing_exceptions表不存在或无权限访问: ${error.message}`);
        }

        // 简单查看AssessmentRecords表的数据样本
        console.log('\n=== AssessmentRecords表数据样本 ===');
        const sampleQuery = `
            SELECT TOP 5 * FROM AssessmentRecords
        `;
        
        const sampleResult = await pool.request().query(sampleQuery);
        console.log('前5条记录:');
        sampleResult.recordset.forEach((row, index) => {
            console.log(`记录 ${index + 1}:`, JSON.stringify(row, null, 2));
        });

    } catch (error) {
        console.error('检查表结构时出错:', error);
    }
}

// 运行检查
checkTableStructure();