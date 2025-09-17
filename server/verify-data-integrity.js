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
 * 验证数据完整性
 */
async function verifyDataIntegrity() {
    try {
        console.log('连接数据库...');
        await sql.connect(config);
        console.log('数据库连接成功');

        console.log('\n=== 数据完整性验证 ===');

        // 1. 验证考核记录总数
        const totalRecords = await sql.query(`
            SELECT COUNT(*) as total FROM AssessmentRecords
        `);
        console.log(`✓ 考核记录总数: ${totalRecords.recordset[0].total}`);

        // 2. 验证各类型记录数量
        const typeStats = await sql.query(`
            SELECT 
                SourceType,
                COUNT(*) as count,
                MIN(CreatedAt) as earliest,
                MAX(CreatedAt) as latest
            FROM AssessmentRecords 
            GROUP BY SourceType
            ORDER BY SourceType
        `);

        console.log('\n=== 按类型统计 ===');
        typeStats.recordset.forEach(row => {
            console.log(`${row.SourceType}: ${row.count} 条记录 (${row.earliest.toISOString().split('T')[0]} ~ ${row.latest.toISOString().split('T')[0]})`);
        });

        // 3. 验证出版异常记录的数据完整性
        const exceptionIntegrity = await sql.query(`
            SELECT 
                ar.PersonName,
                ar.PersonType,
                ar.AssessmentAmount,
                ar.AssessmentDate,
                ar.ComplaintID,
                pe.responsible_person,
                pe.amount,
                COALESCE(pe.registration_date, pe.publishing_date, pe.created_date) as source_date
            FROM AssessmentRecords ar
            JOIN publishing_exceptions pe ON ar.ComplaintID = pe.id
            WHERE ar.SourceType = 'exception'
            ORDER BY ar.CreatedAt DESC
        `);

        console.log('\n=== 出版异常记录数据完整性检查 ===');
        console.log(`✓ 出版异常考核记录数量: ${exceptionIntegrity.recordset.length}`);

        // 检查数据一致性
        let inconsistentCount = 0;
        exceptionIntegrity.recordset.forEach((row, index) => {
            const nameMatch = row.PersonName === row.responsible_person;
            const amountMatch = row.AssessmentAmount === row.amount;
            const dateMatch = row.AssessmentDate.toDateString() === row.source_date.toDateString();

            if (!nameMatch || !amountMatch || !dateMatch) {
                inconsistentCount++;
                if (inconsistentCount <= 3) { // 只显示前3个不一致的记录
                    console.log(`❌ 数据不一致 (记录 ${index + 1}):`);
                    console.log(`   姓名: ${row.PersonName} vs ${row.responsible_person} (${nameMatch ? '✓' : '❌'})`);
                    console.log(`   金额: ${row.AssessmentAmount} vs ${row.amount} (${amountMatch ? '✓' : '❌'})`);
                    console.log(`   日期: ${row.AssessmentDate.toDateString()} vs ${row.source_date.toDateString()} (${dateMatch ? '✓' : '❌'})`);
                }
            }
        });

        if (inconsistentCount === 0) {
            console.log('✓ 所有出版异常记录数据一致性检查通过');
        } else {
            console.log(`❌ 发现 ${inconsistentCount} 条数据不一致的记录`);
        }

        // 4. 验证是否有重复记录
        const duplicateCheck = await sql.query(`
            SELECT 
                SourceType,
                ComplaintID,
                COUNT(*) as count
            FROM AssessmentRecords 
            GROUP BY SourceType, ComplaintID
            HAVING COUNT(*) > 1
        `);

        console.log('\n=== 重复记录检查 ===');
        if (duplicateCheck.recordset.length === 0) {
            console.log('✓ 没有发现重复记录');
        } else {
            console.log(`❌ 发现 ${duplicateCheck.recordset.length} 组重复记录:`);
            duplicateCheck.recordset.forEach(row => {
                console.log(`   ${row.SourceType} - ID:${row.ComplaintID} (${row.count} 条)`);
            });
        }

        // 5. 验证必填字段完整性
        const fieldIntegrity = await sql.query(`
            SELECT 
                COUNT(*) as total,
                COUNT(PersonName) as has_person_name,
                COUNT(PersonType) as has_person_type,
                COUNT(AssessmentAmount) as has_amount,
                COUNT(AssessmentDate) as has_date,
                COUNT(ComplaintID) as has_complaint_id,
                COUNT(SourceType) as has_source_type
            FROM AssessmentRecords
        `);

        console.log('\n=== 必填字段完整性检查 ===');
        const integrity = fieldIntegrity.recordset[0];
        const fields = [
            { name: 'PersonName', count: integrity.has_person_name },
            { name: 'PersonType', count: integrity.has_person_type },
            { name: 'AssessmentAmount', count: integrity.has_amount },
            { name: 'AssessmentDate', count: integrity.has_date },
            { name: 'ComplaintID', count: integrity.has_complaint_id },
            { name: 'SourceType', count: integrity.has_source_type }
        ];

        fields.forEach(field => {
            const isComplete = field.count === integrity.total;
            console.log(`${isComplete ? '✓' : '❌'} ${field.name}: ${field.count}/${integrity.total} (${isComplete ? '完整' : '不完整'})`);
        });

        // 6. 验证金额范围
        const amountStats = await sql.query(`
            SELECT 
                SourceType,
                MIN(AssessmentAmount) as min_amount,
                MAX(AssessmentAmount) as max_amount,
                AVG(AssessmentAmount) as avg_amount,
                COUNT(CASE WHEN AssessmentAmount <= 0 THEN 1 END) as invalid_amounts
            FROM AssessmentRecords 
            GROUP BY SourceType
        `);

        console.log('\n=== 金额统计 ===');
        amountStats.recordset.forEach(row => {
            console.log(`${row.SourceType}:`);
            console.log(`   范围: ${row.min_amount} ~ ${row.max_amount} 元`);
            console.log(`   平均: ${row.avg_amount.toFixed(2)} 元`);
            console.log(`   无效金额: ${row.invalid_amounts} 条`);
        });

        await sql.close();
        console.log('\n数据库连接已关闭');
        console.log('\n✅ 数据完整性验证完成！');

    } catch (error) {
        console.error('验证失败:', error.message);
        console.error('详细错误:', error);
        process.exit(1);
    }
}

verifyDataIntegrity();