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
 * 调试存储过程错误
 */
async function debugProcedureError() {
    try {
        console.log('连接数据库...');
        await sql.connect(config);
        console.log('数据库连接成功');

        // 1. 检查存储过程是否存在
        const procExists = await sql.query(`
            SELECT 
                name,
                create_date,
                modify_date
            FROM sys.objects 
            WHERE type = 'P' AND name = 'GenerateAssessmentRecords'
        `);

        if (procExists.recordset.length === 0) {
            console.log('❌ 存储过程不存在');
            return;
        }

        console.log('✓ 存储过程存在');
        console.log(`创建时间: ${procExists.recordset[0].create_date}`);
        console.log(`修改时间: ${procExists.recordset[0].modify_date}`);

        // 2. 检查各个表是否存在
        const tables = ['rework_records', 'complaint_records', 'publishing_exceptions', 'AssessmentRecords'];
        
        for (const tableName of tables) {
            const tableExists = await sql.query(`
                SELECT COUNT(*) as count
                FROM INFORMATION_SCHEMA.TABLES 
                WHERE TABLE_NAME = '${tableName}'
            `);
            
            if (tableExists.recordset[0].count > 0) {
                console.log(`✓ 表 ${tableName} 存在`);
            } else {
                console.log(`❌ 表 ${tableName} 不存在`);
            }
        }

        // 3. 检查publishing_exceptions表的字段
        const peColumns = await sql.query(`
            SELECT COLUMN_NAME
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_NAME = 'publishing_exceptions'
            ORDER BY ORDINAL_POSITION
        `);

        console.log('\n=== publishing_exceptions表字段 ===');
        const columnNames = peColumns.recordset.map(col => col.COLUMN_NAME);
        console.log(columnNames.join(', '));

        // 检查必需字段是否存在
        const requiredFields = ['responsible_person', 'amount', 'registration_date', 'publishing_date', 'created_date', 'isDeleted'];
        const missingFields = requiredFields.filter(field => !columnNames.includes(field));
        
        if (missingFields.length > 0) {
            console.log(`❌ 缺少字段: ${missingFields.join(', ')}`);
        } else {
            console.log('✓ 所有必需字段都存在');
        }

        // 4. 尝试单独执行存储过程中的SELECT语句
        console.log('\n=== 测试出版异常记录查询 ===');
        try {
            const testQuery = await sql.query(`
                SELECT 
                    pe.responsible_person,
                    'MainPerson' as PersonType,
                    'exception' as SourceType,
                    pe.amount,
                    COALESCE(pe.registration_date, pe.publishing_date, pe.created_date) as AssessmentDate,
                    pe.id as ComplaintID,
                    'pending' as Status,
                    GETDATE() as CreatedAt
                FROM publishing_exceptions pe
                WHERE pe.responsible_person IS NOT NULL 
                    AND pe.amount IS NOT NULL
                    AND pe.amount > 0
                    AND (pe.isDeleted = 0 OR pe.isDeleted IS NULL)
                    AND NOT EXISTS (
                        SELECT 1 FROM AssessmentRecords ar 
                        WHERE ar.SourceType = 'exception' 
                            AND ar.ComplaintID = pe.id
                    )
            `);

            console.log(`✓ 查询成功，找到 ${testQuery.recordset.length} 条符合条件的记录`);
            
            if (testQuery.recordset.length > 0) {
                console.log('样本记录:');
                console.log(testQuery.recordset[0]);
            }

        } catch (queryError) {
            console.log('❌ 查询失败:', queryError.message);
        }

        await sql.close();
        console.log('\n数据库连接已关闭');

    } catch (error) {
        console.error('调试失败:', error.message);
        console.error('详细错误:', error);
        process.exit(1);
    }
}

debugProcedureError();