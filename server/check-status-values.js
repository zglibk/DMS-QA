/**
 * 检查AssessmentRecords表中现有的Status字段值
 * 用于分析约束冲突问题
 */

const { getConnection } = require('./config/database');

async function checkStatusValues() {
    try {
        console.log('正在连接数据库...');
        const pool = await getConnection();
        console.log('数据库连接成功');
        
        // 查询现有Status字段值统计
        const statusQuery = `
            SELECT DISTINCT Status, COUNT(*) as Count 
            FROM AssessmentRecords 
            GROUP BY Status
            ORDER BY Status
        `;
        
        const statusResult = await pool.request().query(statusQuery);
        console.log('\n现有Status字段值统计：');
        statusResult.recordset.forEach(row => {
            console.log(`  ${row.Status}: ${row.Count}条记录`);
        });
        
        // 检查是否有不符合新约束的值
        const invalidStatusQuery = `
            SELECT Status, COUNT(*) as Count 
            FROM AssessmentRecords 
            WHERE Status NOT IN ('pending', 'improving', 'returned', 'confirmed')
            GROUP BY Status
        `;
        
        const invalidResult = await pool.request().query(invalidStatusQuery);
        if (invalidResult.recordset.length > 0) {
            console.log('\n不符合新约束的Status值：');
            invalidResult.recordset.forEach(row => {
                console.log(`  ${row.Status}: ${row.Count}条记录`);
            });
        } else {
            console.log('\n所有Status值都符合新约束');
        }
        
        // 检查现有约束 - 使用SQL Server 2008R2兼容的查询
        const constraintQuery = `
            SELECT 
                cc.CONSTRAINT_NAME,
                cc.CHECK_CLAUSE
            FROM INFORMATION_SCHEMA.CHECK_CONSTRAINTS cc
            INNER JOIN INFORMATION_SCHEMA.CONSTRAINT_COLUMN_USAGE ccu
                ON cc.CONSTRAINT_NAME = ccu.CONSTRAINT_NAME
            WHERE ccu.TABLE_NAME = 'AssessmentRecords' 
                AND ccu.COLUMN_NAME = 'Status'
        `;
        
        const constraintResult = await pool.request().query(constraintQuery);
        console.log('\n现有Status字段约束：');
        if (constraintResult.recordset.length > 0) {
            constraintResult.recordset.forEach(constraint => {
                console.log(`  ${constraint.CONSTRAINT_NAME}: ${constraint.CHECK_CLAUSE}`);
            });
        } else {
            console.log('  无现有约束');
        }
        
    } catch (error) {
        console.error('查询失败:', error);
    }
}

checkStatusValues();