/**
 * 工作计划表初始化脚本
 * 功能：通过 Node.js 执行 SQL 脚本创建工作计划相关表
 */

const fs = require('fs');
const path = require('path');
const { poolPromise } = require('../config/database');

/**
 * 执行 SQL 初始化脚本
 */
async function initWorkPlanTables() {
    try {
        console.log('开始初始化工作计划表...');
        
        // 读取 SQL 脚本文件
        const sqlFilePath = path.join(__dirname, 'init-work-plan-tables.sql');
        const sqlScript = fs.readFileSync(sqlFilePath, 'utf8');
        
        // 获取数据库连接
        const pool = await poolPromise;
        
        // 分割 SQL 语句（按 GO 分割）
        const sqlStatements = sqlScript
            .split(/\bGO\b/gi)
            .map(stmt => stmt.trim())
            .filter(stmt => stmt.length > 0 && !stmt.startsWith('--') && !stmt.startsWith('USE'));
        
        // 逐个执行 SQL 语句
        for (let i = 0; i < sqlStatements.length; i++) {
            const statement = sqlStatements[i];
            if (statement.trim()) {
                try {
                    console.log(`执行第 ${i + 1} 个语句...`);
                    await pool.request().query(statement);
                } catch (error) {
                    console.log(`语句 ${i + 1} 执行结果:`, error.message);
                }
            }
        }
        
        console.log('✅ 工作计划表初始化完成');
        
    } catch (error) {
        console.error('❌ 初始化失败:', error.message);
    } finally {
        process.exit(0);
    }
}

// 执行初始化
initWorkPlanTables();