/**
 * 测试获取考核记录列表API的SQL查询逻辑
 * 分析为什么API返回0条数据
 */

const { getConnection, sql } = require('./db');

/**
 * 测试API中的SQL查询逻辑
 */
async function testApiQuery() {
    try {
        console.log('连接数据库...');
        const pool = await getConnection();
        console.log('数据库连接成功');

        // 1. 测试简单的AssessmentRecords查询
        console.log('\n=== 1. 测试简单的AssessmentRecords查询 ===');
        const simpleResult = await pool.request().query(`
            SELECT COUNT(*) as count FROM AssessmentRecords
        `);
        console.log(`AssessmentRecords表记录数: ${simpleResult.recordset[0].count}`);

        // 2. 测试API中的复杂查询（不带分页）
        console.log('\n=== 2. 测试API中的复杂查询（不带分页） ===');
        const complexQuery = `
            SELECT 
                ar.ID,
                ar.ComplaintID,
                ar.SourceType,
                ar.PersonName,
                ar.PersonType,
                ar.AssessmentAmount,
                ar.Status,
                ar.CreatedAt,
                ar.UpdatedAt,
                cr.ComplaintNumber,
                cr.ProductModel,
                cr.ComplaintType,
                prr.ReworkNumber,
                prr.ProductModel as ReworkProductModel,
                pe.ExceptionNumber,
                pe.ProductModel as ExceptionProductModel
            FROM AssessmentRecords ar
            LEFT JOIN ComplaintRegister cr ON ar.ComplaintID = cr.ID AND ar.SourceType = 'complaint'
            LEFT JOIN ProductionReworkRegister prr ON ar.ComplaintID = prr.ID AND ar.SourceType = 'rework'
            LEFT JOIN publishing_exceptions pe ON ar.ComplaintID = pe.ID AND ar.SourceType = 'exception'
        `;
        
        const complexResult = await pool.request().query(complexQuery);
        console.log(`复杂查询结果数: ${complexResult.recordset.length}`);
        
        if (complexResult.recordset.length > 0) {
            console.log('前3条记录:');
            complexResult.recordset.slice(0, 3).forEach((record, index) => {
                console.log(`${index + 1}. ID: ${record.ID}, ComplaintID: ${record.ComplaintID}, SourceType: ${record.SourceType}`);
                console.log(`   ComplaintNumber: ${record.ComplaintNumber}, ReworkNumber: ${record.ReworkNumber}, ExceptionNumber: ${record.ExceptionNumber}`);
            });
        }

        // 3. 检查关联表是否存在
        console.log('\n=== 3. 检查关联表是否存在 ===');
        
        // 检查ComplaintRegister表
        try {
            const crResult = await pool.request().query('SELECT COUNT(*) as count FROM ComplaintRegister');
            console.log(`ComplaintRegister表记录数: ${crResult.recordset[0].count}`);
        } catch (error) {
            console.log(`ComplaintRegister表不存在或查询失败: ${error.message}`);
        }

        // 检查ProductionReworkRegister表
        try {
            const prrResult = await pool.request().query('SELECT COUNT(*) as count FROM ProductionReworkRegister');
            console.log(`ProductionReworkRegister表记录数: ${prrResult.recordset[0].count}`);
        } catch (error) {
            console.log(`ProductionReworkRegister表不存在或查询失败: ${error.message}`);
        }

        // 检查publishing_exceptions表
        try {
            const peResult = await pool.request().query('SELECT COUNT(*) as count FROM publishing_exceptions');
            console.log(`publishing_exceptions表记录数: ${peResult.recordset[0].count}`);
        } catch (error) {
            console.log(`publishing_exceptions表不存在或查询失败: ${error.message}`);
        }

        // 4. 测试JOIN条件
        console.log('\n=== 4. 测试JOIN条件 ===');
        
        // 检查ComplaintID在ComplaintRegister表中的匹配情况
        const joinTestQuery = `
            SELECT 
                ar.ID,
                ar.ComplaintID,
                ar.SourceType,
                CASE WHEN cr.ID IS NOT NULL THEN 'MATCHED' ELSE 'NOT_MATCHED' END as ComplaintMatch
            FROM AssessmentRecords ar
            LEFT JOIN ComplaintRegister cr ON ar.ComplaintID = cr.ID AND ar.SourceType = 'complaint'
            WHERE ar.SourceType = 'complaint'
        `;
        
        const joinTestResult = await pool.request().query(joinTestQuery);
        console.log(`JOIN测试结果数: ${joinTestResult.recordset.length}`);
        
        const matchedCount = joinTestResult.recordset.filter(r => r.ComplaintMatch === 'MATCHED').length;
        const notMatchedCount = joinTestResult.recordset.filter(r => r.ComplaintMatch === 'NOT_MATCHED').length;
        
        console.log(`匹配的记录数: ${matchedCount}`);
        console.log(`未匹配的记录数: ${notMatchedCount}`);
        
        if (notMatchedCount > 0) {
            console.log('未匹配的前5条记录:');
            joinTestResult.recordset
                .filter(r => r.ComplaintMatch === 'NOT_MATCHED')
                .slice(0, 5)
                .forEach(record => {
                    console.log(`  ID: ${record.ID}, ComplaintID: ${record.ComplaintID}`);
                });
        }

        // 5. 检查ComplaintRegister表中是否有对应的ID
        console.log('\n=== 5. 检查ComplaintRegister表中的ID范围 ===');
        try {
            const crIdRangeResult = await pool.request().query(`
                SELECT MIN(ID) as minId, MAX(ID) as maxId, COUNT(*) as count 
                FROM ComplaintRegister
            `);
            console.log(`ComplaintRegister表ID范围: ${crIdRangeResult.recordset[0].minId} - ${crIdRangeResult.recordset[0].maxId}, 总数: ${crIdRangeResult.recordset[0].count}`);
            
            // 检查AssessmentRecords中的ComplaintID是否在ComplaintRegister的ID范围内
            const assessmentIdRangeResult = await pool.request().query(`
                SELECT MIN(ComplaintID) as minId, MAX(ComplaintID) as maxId 
                FROM AssessmentRecords
            `);
            console.log(`AssessmentRecords中ComplaintID范围: ${assessmentIdRangeResult.recordset[0].minId} - ${assessmentIdRangeResult.recordset[0].maxId}`);
            
        } catch (error) {
            console.log(`检查ID范围失败: ${error.message}`);
        }

    } catch (error) {
        console.error('测试查询时出错:', error);
    }
}

// 运行测试
testApiQuery();