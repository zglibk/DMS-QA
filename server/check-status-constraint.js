/**
 * 检查Status字段约束定义的脚本
 */

const { sql, getDynamicConfig } = require('./db');

async function checkStatusConstraint() {
    try {
        console.log('正在连接数据库...');
        const pool = await sql.connect(await getDynamicConfig());
        
        // 查询Status字段的约束定义
        const result = await pool.request().query(`
            SELECT 
                cc.name as constraint_name,
                cc.definition,
                c.name as column_name,
                t.name as table_name
            FROM sys.check_constraints cc
            JOIN sys.columns c ON cc.parent_column_id = c.column_id AND cc.parent_object_id = c.object_id
            JOIN sys.tables t ON cc.parent_object_id = t.object_id
            WHERE cc.name = 'CK_AssessmentRecords_Status'
        `);
        
        if (result.recordset.length > 0) {
            const constraint = result.recordset[0];
            console.log('✅ 找到Status约束定义:');
            console.log('约束名称:', constraint.constraint_name);
            console.log('表名:', constraint.table_name);
            console.log('字段名:', constraint.column_name);
            console.log('约束定义:', constraint.definition);
        } else {
            console.log('❌ 未找到CK_AssessmentRecords_Status约束');
        }
        
        // 查询AssessmentRecords表的所有约束
        const allConstraints = await pool.request().query(`
            SELECT 
                cc.name as constraint_name,
                cc.definition,
                c.name as column_name
            FROM sys.check_constraints cc
            JOIN sys.columns c ON cc.parent_column_id = c.column_id AND cc.parent_object_id = c.object_id
            JOIN sys.tables t ON cc.parent_object_id = t.object_id
            WHERE t.name = 'AssessmentRecords'
        `);
        
        console.log('\n📋 AssessmentRecords表的所有约束:');
        allConstraints.recordset.forEach(constraint => {
            console.log(`- ${constraint.constraint_name} (${constraint.column_name}): ${constraint.definition}`);
        });
        
        await pool.close();
        
    } catch (error) {
        console.error('❌ 查询失败:', error.message);
    }
}

if (require.main === module) {
    checkStatusConstraint();
}

module.exports = { checkStatusConstraint };