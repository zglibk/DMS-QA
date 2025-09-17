/**
 * 测试API的确切查询逻辑
 * 找出API返回0条数据的具体原因
 */

const { getConnection, sql } = require('./db');

/**
 * 测试API的确切查询
 */
async function testApiExact() {
    try {
        console.log('连接数据库...');
        const pool = await getConnection();
        console.log('数据库连接成功');

        // 1. 测试API的WHERE条件（默认条件：1=1）
        console.log('\n=== 1. 测试API的WHERE条件（默认条件：1=1） ===');
        const whereClause = '1=1';
        
        const countQuery = `
            SELECT COUNT(*) as total
            FROM AssessmentRecords ar
            LEFT JOIN ComplaintRegister cr ON ar.ComplaintID = cr.ID AND ar.SourceType = 'complaint'
            LEFT JOIN ProductionReworkRegister prr ON ar.ComplaintID = prr.ID AND ar.SourceType = 'rework'
            LEFT JOIN publishing_exceptions pe ON ar.ComplaintID = pe.id AND ar.SourceType = 'exception'
            WHERE ${whereClause}
        `;
        
        console.log('执行的COUNT查询:');
        console.log(countQuery);
        
        try {
            const countResult = await pool.request().query(countQuery);
            console.log(`COUNT查询结果: ${countResult.recordset[0].total}`);
        } catch (error) {
            console.log(`COUNT查询失败: ${error.message}`);
            
            // 检查是否是字段名问题
            if (error.message.includes('Invalid column name')) {
                console.log('可能是字段名问题，检查publishing_exceptions表的字段...');
                
                try {
                    const columnsResult = await pool.request().query(`
                        SELECT COLUMN_NAME 
                        FROM INFORMATION_SCHEMA.COLUMNS 
                        WHERE TABLE_NAME = 'publishing_exceptions'
                        ORDER BY ORDINAL_POSITION
                    `);
                    
                    console.log('publishing_exceptions表的字段:');
                    columnsResult.recordset.forEach(col => {
                        console.log(`  - ${col.COLUMN_NAME}`);
                    });
                } catch (colError) {
                    console.log(`获取字段信息失败: ${colError.message}`);
                }
            }
        }

        // 2. 测试修正后的查询（使用正确的字段名）
        console.log('\n=== 2. 测试修正后的查询 ===');
        
        // 先检查publishing_exceptions表的实际字段
        let peIdField = 'id'; // 默认使用小写id
        try {
            const peColumnsResult = await pool.request().query(`
                SELECT COLUMN_NAME 
                FROM INFORMATION_SCHEMA.COLUMNS 
                WHERE TABLE_NAME = 'publishing_exceptions' AND COLUMN_NAME IN ('id', 'ID', 'Id')
            `);
            
            if (peColumnsResult.recordset.length > 0) {
                peIdField = peColumnsResult.recordset[0].COLUMN_NAME;
                console.log(`publishing_exceptions表的ID字段名: ${peIdField}`);
            }
        } catch (error) {
            console.log('检查publishing_exceptions表字段失败，使用默认字段名');
        }

        const correctedCountQuery = `
            SELECT COUNT(*) as total
            FROM AssessmentRecords ar
            LEFT JOIN ComplaintRegister cr ON ar.ComplaintID = cr.ID AND ar.SourceType = 'complaint'
            LEFT JOIN ProductionReworkRegister prr ON ar.ComplaintID = prr.ID AND ar.SourceType = 'rework'
            LEFT JOIN publishing_exceptions pe ON ar.ComplaintID = pe.${peIdField} AND ar.SourceType = 'exception'
            WHERE ${whereClause}
        `;
        
        console.log('修正后的COUNT查询:');
        console.log(correctedCountQuery);
        
        try {
            const correctedCountResult = await pool.request().query(correctedCountQuery);
            console.log(`修正后的COUNT查询结果: ${correctedCountResult.recordset[0].total}`);
        } catch (error) {
            console.log(`修正后的COUNT查询仍然失败: ${error.message}`);
        }

        // 3. 测试简化的查询（只JOIN存在的表）
        console.log('\n=== 3. 测试简化的查询（只JOIN存在的表） ===');
        
        const simplifiedQuery = `
            SELECT COUNT(*) as total
            FROM AssessmentRecords ar
            LEFT JOIN ComplaintRegister cr ON ar.ComplaintID = cr.ID AND ar.SourceType = 'complaint'
            LEFT JOIN ProductionReworkRegister prr ON ar.ComplaintID = prr.ID AND ar.SourceType = 'rework'
            WHERE ${whereClause}
        `;
        
        console.log('简化的查询:');
        console.log(simplifiedQuery);
        
        try {
            const simplifiedResult = await pool.request().query(simplifiedQuery);
            console.log(`简化查询结果: ${simplifiedResult.recordset[0].total}`);
        } catch (error) {
            console.log(`简化查询失败: ${error.message}`);
        }

        // 4. 测试AssessmentRecords表中是否有AssessmentDate字段
        console.log('\n=== 4. 检查AssessmentRecords表的字段 ===');
        
        try {
            const arColumnsResult = await pool.request().query(`
                SELECT COLUMN_NAME 
                FROM INFORMATION_SCHEMA.COLUMNS 
                WHERE TABLE_NAME = 'AssessmentRecords'
                ORDER BY ORDINAL_POSITION
            `);
            
            console.log('AssessmentRecords表的字段:');
            arColumnsResult.recordset.forEach(col => {
                console.log(`  - ${col.COLUMN_NAME}`);
            });
            
            // 检查是否有AssessmentDate字段
            const hasAssessmentDate = arColumnsResult.recordset.some(col => col.COLUMN_NAME === 'AssessmentDate');
            console.log(`是否有AssessmentDate字段: ${hasAssessmentDate}`);
            
        } catch (error) {
            console.log(`获取AssessmentRecords字段信息失败: ${error.message}`);
        }

    } catch (error) {
        console.error('测试API查询时出错:', error);
    }
}

// 运行测试
testApiExact();