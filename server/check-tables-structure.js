/**
 * 检查数据库中实际存在的表和字段结构
 * 找出API查询中引用的表是否存在
 */

const { getConnection, sql } = require('./db');

/**
 * 检查数据库表结构
 */
async function checkTablesStructure() {
    try {
        console.log('连接数据库...');
        const pool = await getConnection();
        console.log('数据库连接成功');

        // 1. 查询所有表名
        console.log('\n=== 1. 查询所有表名 ===');
        const tablesResult = await pool.request().query(`
            SELECT TABLE_NAME 
            FROM INFORMATION_SCHEMA.TABLES 
            WHERE TABLE_TYPE = 'BASE TABLE'
            ORDER BY TABLE_NAME
        `);
        
        console.log('数据库中的所有表:');
        tablesResult.recordset.forEach(table => {
            console.log(`  - ${table.TABLE_NAME}`);
        });

        // 2. 检查API中引用的表是否存在
        console.log('\n=== 2. 检查API中引用的表是否存在 ===');
        const apiTables = ['AssessmentRecords', 'ComplaintRegister', 'ProductionReworkRegister', 'publishing_exceptions'];
        
        for (const tableName of apiTables) {
            const exists = tablesResult.recordset.some(t => t.TABLE_NAME === tableName);
            console.log(`${tableName}: ${exists ? '存在' : '不存在'}`);
            
            if (exists) {
                // 查询表的字段结构
                const columnsResult = await pool.request()
                    .input('tableName', sql.VarChar, tableName)
                    .query(`
                        SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE
                        FROM INFORMATION_SCHEMA.COLUMNS 
                        WHERE TABLE_NAME = @tableName
                        ORDER BY ORDINAL_POSITION
                    `);
                
                console.log(`  ${tableName}表的字段:`);
                columnsResult.recordset.forEach(col => {
                    console.log(`    - ${col.COLUMN_NAME} (${col.DATA_TYPE}, ${col.IS_NULLABLE === 'YES' ? 'NULL' : 'NOT NULL'})`);
                });
            }
        }

        // 3. 查找可能的替代表名
        console.log('\n=== 3. 查找可能的替代表名 ===');
        const searchTerms = ['complaint', 'rework', 'exception', 'production'];
        
        for (const term of searchTerms) {
            const matchingTables = tablesResult.recordset.filter(t => 
                t.TABLE_NAME.toLowerCase().includes(term.toLowerCase())
            );
            
            if (matchingTables.length > 0) {
                console.log(`包含"${term}"的表:`);
                matchingTables.forEach(table => {
                    console.log(`  - ${table.TABLE_NAME}`);
                });
            }
        }

        // 4. 检查AssessmentRecords表中ComplaintID的值
        console.log('\n=== 4. 检查AssessmentRecords表中ComplaintID的值 ===');
        const complaintIdsResult = await pool.request().query(`
            SELECT DISTINCT ComplaintID, SourceType, COUNT(*) as count
            FROM AssessmentRecords 
            GROUP BY ComplaintID, SourceType
            ORDER BY ComplaintID
        `);
        
        console.log('AssessmentRecords中的ComplaintID分布:');
        complaintIdsResult.recordset.forEach(row => {
            console.log(`  ComplaintID: ${row.ComplaintID}, SourceType: ${row.SourceType}, 数量: ${row.count}`);
        });

    } catch (error) {
        console.error('检查表结构时出错:', error);
    }
}

// 运行检查
checkTablesStructure();