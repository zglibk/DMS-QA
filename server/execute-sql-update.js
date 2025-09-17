/**
 * 执行SQL脚本更新存储过程
 */

const { getConnection, sql } = require('./db');
const fs = require('fs');
const path = require('path');

/**
 * 执行SQL更新
 */
async function executeSqlUpdate() {
    try {
        console.log('连接数据库...');
        const pool = await getConnection();
        console.log('数据库连接成功');

        // 读取SQL文件
        const sqlFilePath = path.join(__dirname, 'update-stored-procedure-with-publishing-exceptions.sql');
        const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');
        
        console.log('读取SQL文件成功');
        
        // 分割SQL语句（按GO分割）
        const sqlStatements = sqlContent.split(/\bGO\b/i).filter(stmt => stmt.trim());
        
        console.log(`找到 ${sqlStatements.length} 个SQL语句块`);
        
        // 逐个执行SQL语句
        for (let i = 0; i < sqlStatements.length; i++) {
            const statement = sqlStatements[i].trim();
            if (statement) {
                console.log(`\n执行第 ${i + 1} 个语句块...`);
                try {
                    const result = await pool.request().query(statement);
                    console.log(`✓ 语句块 ${i + 1} 执行成功`);
                    if (result.recordset && result.recordset.length > 0) {
                        console.log('结果:', result.recordset);
                    }
                } catch (error) {
                    console.error(`❌ 语句块 ${i + 1} 执行失败:`, error.message);
                    // 继续执行下一个语句块
                }
            }
        }
        
        console.log('\n=== SQL更新完成 ===');
        
        // 验证存储过程是否更新成功
        console.log('\n验证存储过程更新...');
        const verifyQuery = `
            SELECT 
                name,
                create_date,
                modify_date
            FROM sys.procedures 
            WHERE name = 'SP_GenerateAssessmentRecords'
        `;
        
        const verifyResult = await pool.request().query(verifyQuery);
        if (verifyResult.recordset.length > 0) {
            const sp = verifyResult.recordset[0];
            console.log(`✓ 存储过程更新成功: ${sp.name}`);
            console.log(`创建时间: ${sp.create_date}`);
            console.log(`修改时间: ${sp.modify_date}`);
        } else {
            console.log('❌ 存储过程验证失败');
        }

    } catch (error) {
        console.error('执行SQL更新时出错:', error);
    }
}

// 运行更新
executeSqlUpdate();