/**
 * 测试JOIN条件是否过滤掉了所有数据
 * 分析API查询返回0条数据的具体原因
 */

const { getConnection, sql } = require('./db');

/**
 * 测试JOIN问题
 */
async function testJoinIssue() {
    try {
        console.log('连接数据库...');
        const pool = await getConnection();
        console.log('数据库连接成功');

        // 1. 测试AssessmentRecords单表查询
        console.log('\n=== 1. AssessmentRecords单表查询 ===');
        const singleTableResult = await pool.request().query(`
            SELECT COUNT(*) as count FROM AssessmentRecords
        `);
        console.log(`AssessmentRecords表记录数: ${singleTableResult.recordset[0].count}`);

        // 2. 测试ComplaintRegister表中是否有对应的ID
        console.log('\n=== 2. 检查ComplaintRegister表中的ID ===');
        const complaintRegisterResult = await pool.request().query(`
            SELECT MIN(ID) as minId, MAX(ID) as maxId, COUNT(*) as count 
            FROM ComplaintRegister
        `);
        console.log(`ComplaintRegister表: ID范围 ${complaintRegisterResult.recordset[0].minId}-${complaintRegisterResult.recordset[0].maxId}, 总数: ${complaintRegisterResult.recordset[0].count}`);

        // 3. 检查AssessmentRecords中的ComplaintID是否在ComplaintRegister中存在
        console.log('\n=== 3. 检查ID匹配情况 ===');
        const matchCheckResult = await pool.request().query(`
            SELECT 
                ar.ComplaintID,
                CASE WHEN cr.ID IS NOT NULL THEN 'EXISTS' ELSE 'NOT_EXISTS' END as ExistsInComplaintRegister
            FROM AssessmentRecords ar
            LEFT JOIN ComplaintRegister cr ON ar.ComplaintID = cr.ID
            WHERE ar.SourceType = 'complaint'
        `);
        
        const existsCount = matchCheckResult.recordset.filter(r => r.ExistsInComplaintRegister === 'EXISTS').length;
        const notExistsCount = matchCheckResult.recordset.filter(r => r.ExistsInComplaintRegister === 'NOT_EXISTS').length;
        
        console.log(`匹配的记录数: ${existsCount}`);
        console.log(`不匹配的记录数: ${notExistsCount}`);

        if (notExistsCount > 0) {
            console.log('\n不匹配的ComplaintID (前10个):');
            matchCheckResult.recordset
                .filter(r => r.ExistsInComplaintRegister === 'NOT_EXISTS')
                .slice(0, 10)
                .forEach(record => {
                    console.log(`  ComplaintID: ${record.ComplaintID}`);
                });
        }

        // 4. 测试不同的JOIN方式
        console.log('\n=== 4. 测试不同的JOIN方式 ===');
        
        // 4.1 LEFT JOIN (API当前使用的方式)
        const leftJoinResult = await pool.request().query(`
            SELECT COUNT(*) as count
            FROM AssessmentRecords ar
            LEFT JOIN ComplaintRegister cr ON ar.ComplaintID = cr.ID AND ar.SourceType = 'complaint'
            LEFT JOIN ProductionReworkRegister prr ON ar.ComplaintID = prr.ID AND ar.SourceType = 'rework'
            LEFT JOIN publishing_exceptions pe ON ar.ComplaintID = pe.ID AND ar.SourceType = 'exception'
        `);
        console.log(`LEFT JOIN查询结果数: ${leftJoinResult.recordset[0].count}`);

        // 4.2 只查询AssessmentRecords，不JOIN其他表
        const noJoinResult = await pool.request().query(`
            SELECT COUNT(*) as count
            FROM AssessmentRecords ar
        `);
        console.log(`不JOIN其他表的查询结果数: ${noJoinResult.recordset[0].count}`);

        // 5. 测试API的完整查询（简化版）
        console.log('\n=== 5. 测试API的完整查询（简化版） ===');
        const apiQueryResult = await pool.request().query(`
            SELECT 
                ar.ID,
                ar.ComplaintID,
                ar.SourceType,
                ar.PersonName,
                ar.Status
            FROM AssessmentRecords ar
            LEFT JOIN ComplaintRegister cr ON ar.ComplaintID = cr.ID AND ar.SourceType = 'complaint'
            LEFT JOIN ProductionReworkRegister prr ON ar.ComplaintID = prr.ID AND ar.SourceType = 'rework'
            LEFT JOIN publishing_exceptions pe ON ar.ComplaintID = pe.ID AND ar.SourceType = 'exception'
        `);
        console.log(`API查询（简化版）结果数: ${apiQueryResult.recordset.length}`);

        if (apiQueryResult.recordset.length > 0) {
            console.log('前5条记录:');
            apiQueryResult.recordset.slice(0, 5).forEach((record, index) => {
                console.log(`${index + 1}. ID: ${record.ID}, ComplaintID: ${record.ComplaintID}, SourceType: ${record.SourceType}, PersonName: ${record.PersonName}`);
            });
        }

        // 6. 检查是否有WHERE条件过滤
        console.log('\n=== 6. 检查可能的过滤条件 ===');
        
        // 检查Status字段的值
        const statusResult = await pool.request().query(`
            SELECT Status, COUNT(*) as count 
            FROM AssessmentRecords 
            GROUP BY Status
        `);
        console.log('Status分布:');
        statusResult.recordset.forEach(row => {
            console.log(`  ${row.Status}: ${row.count}条`);
        });

    } catch (error) {
        console.error('测试JOIN问题时出错:', error);
    }
}

// 运行测试
testJoinIssue();