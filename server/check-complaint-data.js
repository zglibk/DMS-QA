/**
 * 检查投诉数据中的管理人员信息
 * 验证是否有符合条件的管理人员数据用于生成考核记录
 */

const { sql, getDynamicConfig } = require('./db');

async function checkComplaintData() {
    try {
        console.log('=== 开始检查投诉数据 ===');
        const pool = await sql.connect(await getDynamicConfig());
        
        // 1. 检查所有投诉记录的管理人员字段
        console.log('\n1. 检查投诉记录中的管理人员字段:');
        const allComplaintsResult = await pool.request().query(`
            SELECT TOP 10
                ID,
                Manager,
                ManagerAssessment,
                Date,
                CASE 
                    WHEN Manager IS NULL THEN '管理人员为空'
                    WHEN ManagerAssessment IS NULL THEN '管理人员考核金额为空'
                    WHEN ManagerAssessment <= 0 THEN '管理人员考核金额<=0'
                    ELSE '符合条件'
                END as Status
            FROM ComplaintRegister
            ORDER BY Date DESC
        `);
        
        console.log('最近10条投诉记录:');
        allComplaintsResult.recordset.forEach(record => {
            console.log(`ID: ${record.ID}, Manager: ${record.Manager}, ManagerAssessment: ${record.ManagerAssessment}, Date: ${record.Date}, Status: ${record.Status}`);
        });
        
        // 2. 统计符合生成管理人员考核记录条件的数据
        console.log('\n2. 统计符合条件的管理人员数据:');
        const validManagerDataResult = await pool.request().query(`
            SELECT COUNT(*) as ValidCount
            FROM ComplaintRegister
            WHERE Manager IS NOT NULL
                AND ManagerAssessment IS NOT NULL
                AND ManagerAssessment > 0
        `);
        
        console.log(`符合条件的管理人员记录数: ${validManagerDataResult.recordset[0].ValidCount}`);
        
        // 3. 检查是否已经存在管理人员考核记录
        console.log('\n3. 检查已存在的管理人员考核记录:');
        const existingManagerRecordsResult = await pool.request().query(`
            SELECT COUNT(*) as ExistingCount
            FROM AssessmentRecords
            WHERE PersonType = 'Manager'
        `);
        
        console.log(`已存在的管理人员考核记录数: ${existingManagerRecordsResult.recordset[0].ExistingCount}`);
        
        // 4. 检查特定日期范围的数据（如2025-09-06）
        console.log('\n4. 检查2025-09-06附近的投诉数据:');
        const specificDateResult = await pool.request().query(`
            SELECT 
                ID,
                Manager,
                ManagerAssessment,
                Date
            FROM ComplaintRegister
            WHERE Date >= '2025-09-01' AND Date <= '2025-09-30'
                AND Manager IS NOT NULL
            ORDER BY Date DESC
        `);
        
        console.log('2025年9月的投诉记录:');
        specificDateResult.recordset.forEach(record => {
            console.log(`ID: ${record.ID}, Manager: ${record.Manager}, ManagerAssessment: ${record.ManagerAssessment}, Date: ${record.Date}`);
        });
        
        await pool.close();
        console.log('\n=== 检查完成 ===');
        
    } catch (error) {
        console.error('查询失败:', error);
    }
}

checkComplaintData();