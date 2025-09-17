/**
 * 调试存储过程执行过程
 * 逐步检查存储过程的执行逻辑
 */

const { sql, getDynamicConfig } = require('./db');

async function debugSPExecution() {
    try {
        console.log('=== 开始调试存储过程执行 ===');
        const pool = await sql.connect(await getDynamicConfig());
        
        const startDate = '2025-01-01';
        const endDate = '2025-12-31';
        
        // 1. 检查符合条件的投诉记录
        console.log('\n1. 检查符合条件的投诉记录:');
        const complaintQuery = `
            SELECT COUNT(*) as Count
            FROM ComplaintRegister
            WHERE Date BETWEEN '${startDate}' AND '${endDate}'
                AND Manager IS NOT NULL
                AND ManagerAssessment IS NOT NULL
                AND ManagerAssessment > 0
        `;
        
        const complaintResult = await pool.request().query(complaintQuery);
        console.log('符合条件的投诉记录数:', complaintResult.recordset[0].Count);
        
        // 2. 检查已存在的管理人员考核记录
        console.log('\n2. 检查已存在的管理人员考核记录:');
        const existingQuery = `
            SELECT COUNT(*) as Count
            FROM AssessmentRecords
            WHERE PersonType = 'Manager'
                AND SourceType = 'complaint'
        `;
        
        const existingResult = await pool.request().query(existingQuery);
        console.log('已存在的管理人员考核记录数:', existingResult.recordset[0].Count);
        
        // 3. 检查具体的投诉记录详情
        console.log('\n3. 检查具体的投诉记录详情:');
        const detailQuery = `
            SELECT TOP 5
                ID,
                Manager,
                ManagerAssessment,
                Date,
                CASE 
                    WHEN EXISTS (
                        SELECT 1 FROM AssessmentRecords
                        WHERE ComplaintID = ComplaintRegister.ID
                            AND PersonType = 'Manager'
                            AND SourceType = 'complaint'
                    ) THEN '已存在考核记录'
                    ELSE '未生成考核记录'
                END as RecordStatus
            FROM ComplaintRegister
            WHERE Date BETWEEN '${startDate}' AND '${endDate}'
                AND Manager IS NOT NULL
                AND ManagerAssessment IS NOT NULL
                AND ManagerAssessment > 0
            ORDER BY Date DESC
        `;
        
        const detailResult = await pool.request().query(detailQuery);
        console.log('投诉记录详情:');
        detailResult.recordset.forEach(record => {
            console.log(`ID: ${record.ID}, Manager: ${record.Manager}, Amount: ${record.ManagerAssessment}, Date: ${record.Date}, Status: ${record.RecordStatus}`);
        });
        
        // 4. 手动执行存储过程的插入逻辑
        console.log('\n4. 手动执行插入逻辑:');
        const insertQuery = `
            INSERT INTO AssessmentRecords (ComplaintID, PersonName, PersonType, AssessmentAmount, AssessmentDate, SourceType, Status)
            SELECT
                ID,
                Manager,
                'Manager',
                ManagerAssessment,
                Date,
                'complaint',
                'pending'
            FROM ComplaintRegister
            WHERE Date BETWEEN '${startDate}' AND '${endDate}'
                AND Manager IS NOT NULL
                AND ManagerAssessment IS NOT NULL
                AND ManagerAssessment > 0
                AND NOT EXISTS (
                    SELECT 1 FROM AssessmentRecords
                    WHERE ComplaintID = ComplaintRegister.ID
                        AND PersonType = 'Manager'
                        AND SourceType = 'complaint'
                );
            
            SELECT @@ROWCOUNT as InsertedCount;
        `;
        
        const insertResult = await pool.request().query(insertQuery);
        console.log('手动插入结果:', insertResult.recordset);
        
        await pool.close();
        console.log('\n=== 调试完成 ===');
        
    } catch (error) {
        console.error('调试失败:', error);
    }
}

debugSPExecution();