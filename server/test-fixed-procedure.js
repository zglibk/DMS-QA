/**
 * 测试修复后的存储过程功能
 * 验证SP_GenerateAssessmentRecords是否能正确生成投诉和返工记录的考核记录
 */

const { executeQuery, sql } = require('./config/database');

/**
 * 测试修复后的存储过程功能
 * 使用现有的数据库连接池，避免重复创建连接
 */
async function testFixedProcedure() {
    try {
        console.log('使用现有数据库连接池...');

        // 1. 检查存储过程是否存在
        console.log('\n=== 检查存储过程 ===');
        const procedureCheck = await executeQuery(async (pool) => {
            return await pool.request().query(`
                SELECT name, create_date, modify_date 
                FROM sys.procedures 
                WHERE name = 'SP_GenerateAssessmentRecords'
            `);
        });
        
        if (procedureCheck.recordset.length > 0) {
            console.log('✓ 存储过程存在');
            console.log('创建时间:', procedureCheck.recordset[0].create_date);
            console.log('修改时间:', procedureCheck.recordset[0].modify_date);
        } else {
            console.log('❌ 存储过程不存在');
            return;
        }

        // 2. 查看当前考核记录数量
        console.log('\n=== 执行前的数据状态 ===');
        const beforeCount = await executeQuery(async (pool) => {
            return await pool.request().query(`
                SELECT 
                    SourceType,
                    COUNT(*) as Count
                FROM AssessmentRecords 
                GROUP BY SourceType
                ORDER BY SourceType
            `);
        });
        
        console.log('执行前考核记录分布:');
        beforeCount.recordset.forEach(row => {
            console.log(`  ${row.SourceType}: ${row.Count} 条`);
        });

        // 3. 执行存储过程（测试最近30天的数据）
        console.log('\n=== 执行存储过程 ===');
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(endDate.getDate() - 30);
        
        console.log(`测试时间范围: ${startDate.toISOString().split('T')[0]} 到 ${endDate.toISOString().split('T')[0]}`);
        
        const result = await executeQuery(async (pool) => {
            const request = pool.request();
            request.input('StartDate', sql.Date, startDate);
            request.input('EndDate', sql.Date, endDate);
            return await request.execute('SP_GenerateAssessmentRecords');
        });
        
        if (result.recordset && result.recordset.length > 0) {
            console.log(`✓ 存储过程执行成功，生成了 ${result.recordset[0].GeneratedCount} 条新记录`);
        } else {
            console.log('✓ 存储过程执行成功，但没有生成新记录（可能已存在）');
        }

        // 4. 查看执行后的考核记录数量
        console.log('\n=== 执行后的数据状态 ===');
        const afterCount = await executeQuery(async (pool) => {
            return await pool.request().query(`
                SELECT 
                    SourceType,
                    COUNT(*) as Count
                FROM AssessmentRecords 
                GROUP BY SourceType
                ORDER BY SourceType
            `);
        });
        
        console.log('执行后考核记录分布:');
        afterCount.recordset.forEach(row => {
            console.log(`  ${row.SourceType}: ${row.Count} 条`);
        });

        // 5. 检查新生成的记录详情
        console.log('\n=== 最新生成的记录样本 ===');
        const latestRecords = await executeQuery(async (pool) => {
            return await pool.request().query(`
                SELECT TOP 10
                    SourceType,
                    PersonType,
                    PersonName,
                    AssessmentAmount,
                    AssessmentDate,
                    CreatedAt
                FROM AssessmentRecords 
                ORDER BY CreatedAt DESC
            `);
        });
        
        console.log('最新的10条考核记录:');
        latestRecords.recordset.forEach((record, index) => {
            console.log(`  ${index + 1}. ${record.SourceType} - ${record.PersonType} - ${record.PersonName} - ¥${record.AssessmentAmount} - ${record.AssessmentDate.toISOString().split('T')[0]}`);
        });

        // 6. 验证数据源匹配情况
        console.log('\n=== 数据源匹配验证 ===');
        
        // 检查投诉记录匹配
        const complaintMatch = await executeQuery(async (pool) => {
            return await pool.request().query(`
                SELECT COUNT(*) as MatchedCount
                FROM AssessmentRecords ar
                INNER JOIN ComplaintRegister cr ON ar.ComplaintID = cr.ID
                WHERE ar.SourceType = 'complaint'
            `);
        });
        console.log(`投诉记录匹配: ${complaintMatch.recordset[0].MatchedCount} 条`);

        // 检查返工记录匹配
        const reworkMatch = await executeQuery(async (pool) => {
            return await pool.request().query(`
                SELECT COUNT(*) as MatchedCount
                FROM AssessmentRecords ar
                INNER JOIN ProductionReworkRegister prr ON ar.ComplaintID = prr.ID
                WHERE ar.SourceType = 'rework'
            `);
        });
        console.log(`返工记录匹配: ${reworkMatch.recordset[0].MatchedCount} 条`);

        console.log('\n=== 测试完成 ===');

    } catch (error) {
        console.error('测试过程中发生错误:', error.message);
        console.error('错误详情:', error);
    }
}

// 执行测试
testFixedProcedure();