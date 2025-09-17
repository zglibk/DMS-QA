/**
 * 分析考核记录的来源类型分布和各来源表的数据情况（修正版）
 */

const { getConnection, sql } = require('./db');

/**
 * 分析来源类型分布
 */
async function analyzeSourceTypes() {
    try {
        console.log('连接数据库...');
        const pool = await getConnection();
        console.log('数据库连接成功');

        // 1. 分析当前AssessmentRecords表中的来源类型分布
        console.log('\n=== 1. AssessmentRecords表来源类型分布 ===');
        const sourceTypeQuery = `
            SELECT 
                SourceType,
                COUNT(*) as Count,
                MIN(CreatedAt) as EarliestRecord,
                MAX(CreatedAt) as LatestRecord
            FROM AssessmentRecords 
            GROUP BY SourceType
            ORDER BY Count DESC
        `;
        
        const sourceTypeResult = await pool.request().query(sourceTypeQuery);
        console.log('来源类型分布:');
        sourceTypeResult.recordset.forEach(row => {
            console.log(`  ${row.SourceType}: ${row.Count}条记录 (最早: ${row.EarliestRecord}, 最新: ${row.LatestRecord})`);
        });

        // 2. 检查ComplaintRegister表的数据情况
        console.log('\n=== 2. ComplaintRegister表数据情况 ===');
        const complaintQuery = `
            SELECT 
                COUNT(*) as TotalCount,
                MIN(ID) as MinID,
                MAX(ID) as MaxID
            FROM ComplaintRegister
        `;
        
        const complaintResult = await pool.request().query(complaintQuery);
        const complaint = complaintResult.recordset[0];
        console.log(`投诉记录总数: ${complaint.TotalCount}`);
        console.log(`ID范围: ${complaint.MinID} - ${complaint.MaxID}`);

        // 3. 检查ProductionReworkRegister表的数据情况
        console.log('\n=== 3. ProductionReworkRegister表数据情况 ===');
        try {
            const reworkQuery = `
                SELECT 
                    COUNT(*) as TotalCount,
                    MIN(ID) as MinID,
                    MAX(ID) as MaxID
                FROM ProductionReworkRegister
            `;
            
            const reworkResult = await pool.request().query(reworkQuery);
            const rework = reworkResult.recordset[0];
            console.log(`生产返工记录总数: ${rework.TotalCount}`);
            console.log(`ID范围: ${rework.MinID} - ${rework.MaxID}`);
        } catch (error) {
            console.log(`生产返工表查询失败: ${error.message}`);
        }

        // 4. 检查publishing_exceptions表的数据情况
        console.log('\n=== 4. publishing_exceptions表数据情况 ===');
        try {
            const exceptionQuery = `
                SELECT 
                    COUNT(*) as TotalCount,
                    MIN(id) as MinID,
                    MAX(id) as MaxID
                FROM publishing_exceptions
            `;
            
            const exceptionResult = await pool.request().query(exceptionQuery);
            const exception = exceptionResult.recordset[0];
            console.log(`异常记录总数: ${exception.TotalCount}`);
            console.log(`ID范围: ${exception.MinID} - ${exception.MaxID}`);
        } catch (error) {
            console.log(`异常记录表查询失败: ${error.message}`);
        }

        // 5. 检查是否存在SP_GenerateAssessmentRecords存储过程
        console.log('\n=== 5. 检查存储过程 ===');
        try {
            const spQuery = `
                SELECT 
                    name,
                    create_date,
                    modify_date
                FROM sys.procedures 
                WHERE name = 'SP_GenerateAssessmentRecords'
            `;
            
            const spResult = await pool.request().query(spQuery);
            if (spResult.recordset.length > 0) {
                const sp = spResult.recordset[0];
                console.log(`存储过程存在: ${sp.name}`);
                console.log(`创建时间: ${sp.create_date}`);
                console.log(`修改时间: ${sp.modify_date}`);
            } else {
                console.log('❌ SP_GenerateAssessmentRecords存储过程不存在');
            }
        } catch (error) {
            console.log(`检查存储过程失败: ${error.message}`);
        }

        // 6. 检查AssessmentRecords表中各来源ID的匹配情况
        console.log('\n=== 6. 检查来源ID匹配情况 ===');
        
        // 检查投诉记录匹配
        const complaintMatchQuery = `
            SELECT COUNT(*) as MatchedCount
            FROM AssessmentRecords ar
            INNER JOIN ComplaintRegister cr ON ar.ComplaintID = cr.ID
            WHERE ar.SourceType = 'complaint'
        `;
        const complaintMatchResult = await pool.request().query(complaintMatchQuery);
        console.log(`投诉记录匹配数: ${complaintMatchResult.recordset[0].MatchedCount}`);

        // 检查返工记录匹配
        try {
            const reworkMatchQuery = `
                SELECT COUNT(*) as MatchedCount
                FROM AssessmentRecords ar
                INNER JOIN ProductionReworkRegister prr ON ar.ComplaintID = prr.ID
                WHERE ar.SourceType = 'rework'
            `;
            const reworkMatchResult = await pool.request().query(reworkMatchQuery);
            console.log(`返工记录匹配数: ${reworkMatchResult.recordset[0].MatchedCount}`);
        } catch (error) {
            console.log(`返工记录匹配检查失败: ${error.message}`);
        }

        // 检查异常记录匹配
        try {
            const exceptionMatchQuery = `
                SELECT COUNT(*) as MatchedCount
                FROM AssessmentRecords ar
                INNER JOIN publishing_exceptions pe ON ar.ComplaintID = pe.id
                WHERE ar.SourceType = 'exception'
            `;
            const exceptionMatchResult = await pool.request().query(exceptionMatchQuery);
            console.log(`异常记录匹配数: ${exceptionMatchResult.recordset[0].MatchedCount}`);
        } catch (error) {
            console.log(`异常记录匹配检查失败: ${error.message}`);
        }

        // 7. 查看AssessmentRecords表中不同来源类型的样本数据
        console.log('\n=== 7. 各来源类型样本数据 ===');
        
        const sampleQuery = `
            SELECT TOP 3 
                ID, ComplaintID, PersonName, SourceType, AssessmentAmount, AssessmentDate
            FROM AssessmentRecords 
            WHERE SourceType = 'complaint'
            ORDER BY ID
        `;
        
        const sampleResult = await pool.request().query(sampleQuery);
        console.log('投诉类型样本:');
        sampleResult.recordset.forEach(row => {
            console.log(`  ID: ${row.ID}, ComplaintID: ${row.ComplaintID}, 姓名: ${row.PersonName}, 金额: ${row.AssessmentAmount}`);
        });

    } catch (error) {
        console.error('分析来源类型时出错:', error);
    }
}

// 运行分析
analyzeSourceTypes();