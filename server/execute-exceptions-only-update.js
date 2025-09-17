const sql = require('mssql');
const fs = require('fs');
const path = require('path');

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
 * 执行存储过程更新
 */
async function executeUpdate() {
    let pool;
    try {
        console.log('连接数据库...');
        pool = new sql.ConnectionPool(config);
        await pool.connect();
        console.log('数据库连接成功');

        // 读取SQL文件
        const sqlFilePath = path.join(__dirname, 'update-stored-procedure-exceptions-only.sql');
        const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');
        
        console.log('读取SQL文件成功');

        // 分割SQL语句（按GO分割）
        const sqlStatements = sqlContent
            .split(/\bGO\b/i)
            .map(stmt => stmt.trim())
            .filter(stmt => stmt.length > 0);

        console.log(`找到 ${sqlStatements.length} 个SQL语句块`);

        // 执行每个SQL语句块
        for (let i = 0; i < sqlStatements.length; i++) {
            console.log(`\n执行第 ${i + 1} 个语句块...`);
            
            try {
                const request = pool.request();
                const result = await request.query(sqlStatements[i]);
                console.log(`✓ 语句块 ${i + 1} 执行成功`);
                
                // 如果有返回的消息，显示它们
                if (result.recordset && result.recordset.length > 0) {
                    result.recordset.forEach(row => {
                        console.log('  ', Object.values(row).join(' '));
                    });
                }
            } catch (error) {
                console.error(`❌ 语句块 ${i + 1} 执行失败:`, error.message);
                throw error;
            }
        }

        console.log('\n✅ 所有SQL语句执行完成！');

    } catch (error) {
        console.error('执行失败:', error.message);
        console.error('详细错误:', error);
        process.exit(1);
    } finally {
        if (pool) {
            await pool.close();
            console.log('\n数据库连接已关闭');
        }
    }
}

executeUpdate();