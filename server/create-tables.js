/**
 * 创建质量考核管理系统数据表
 */

const sql = require('mssql');
const fs = require('fs');
const path = require('path');

// 数据库配置
const config = {
    user: 'sa',
    password: 'Aa123456',
    server: 'localhost',
    database: 'DMS_QA',
    options: {
        encrypt: false,
        trustServerCertificate: true
    }
};

async function createTables() {
    try {
        console.log('正在连接数据库...');
        const pool = await sql.connect(config);
        console.log('数据库连接成功');
        
        // 读取SQL脚本
        const sqlScript = fs.readFileSync(path.join(__dirname, 'sql', 'create-assessment-tables-2008r2.sql'), 'utf8');
        
        // 按GO分割SQL语句
        const statements = sqlScript.split(/\bGO\b/i).filter(s => s.trim());
        
        console.log(`共找到 ${statements.length} 个SQL语句`);
        
        // 逐个执行SQL语句
        for (let i = 0; i < statements.length; i++) {
            const statement = statements[i].trim();
            if (statement) {
                try {
                    console.log(`执行第 ${i + 1} 个语句...`);
                    await pool.request().query(statement);
                    console.log(`第 ${i + 1} 个语句执行成功`);
                } catch (err) {
                    console.error(`第 ${i + 1} 个语句执行失败:`, err.message);
                    // 继续执行下一个语句，不中断整个过程
                }
            }
        }
        
        console.log('数据表创建完成');
        
        // 验证表是否创建成功
        const checkQuery = `
            SELECT TABLE_NAME 
            FROM INFORMATION_SCHEMA.TABLES 
            WHERE TABLE_NAME IN ('AssessmentRecords', 'ImprovementTracking', 'AssessmentConfig', 'AssessmentHistory')
        `;
        
        const result = await pool.request().query(checkQuery);
        console.log('已创建的表:', result.recordset.map(r => r.TABLE_NAME));
        
        await pool.close();
        process.exit(0);
        
    } catch (error) {
        console.error('创建数据表失败:', error);
        process.exit(1);
    }
}

createTables();