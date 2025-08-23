/**
 * 更新出版异常菜单路径配置
 * 功能：修正出版异常菜单的路径和组件配置
 * 执行方式：node update-publishing-exceptions-path.js
 */

const sql = require('mssql');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

/**
 * 数据库连接配置
 */
const dbConfig = {
    server: process.env.DB_SERVER || 'localhost',
    database: process.env.DB_NAME || 'DMS-QA',
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    options: {
        encrypt: false,
        trustServerCertificate: true,
        enableArithAbort: true
    },
    pool: {
        max: 10,
        min: 0,
        idleTimeoutMillis: 30000
    }
};

/**
 * 更新出版异常菜单路径配置
 */
async function updatePublishingExceptionsPath() {
    let pool;
    
    try {
        console.log('开始更新出版异常菜单路径配置...');
        
        // 连接数据库
        pool = await sql.connect(dbConfig);
        console.log('✅ 数据库连接成功');
        
        // 更新出版异常主菜单的路径和组件配置
        const updateResult = await pool.request()
            .input('MenuCode', sql.NVarChar(50), 'publishing-exceptions')
            .input('Path', sql.NVarChar(200), '/publishing-exceptions')
            .input('Component', sql.NVarChar(200), 'views/PublishingExceptions')
            .query(`
                UPDATE [dbo].[Menus] 
                SET [Path] = @Path, [Component] = @Component, [UpdatedAt] = GETDATE()
                WHERE [MenuCode] = @MenuCode
            `);
        
        if (updateResult.rowsAffected[0] > 0) {
            console.log('✅ 出版异常菜单路径配置更新成功');
            console.log('   - 路径已更新为: /publishing-exceptions');
            console.log('   - 组件已更新为: views/PublishingExceptions');
        } else {
            console.log('⚠️  未找到出版异常菜单，无需更新');
        }
        
        console.log('');
        console.log('🎉 出版异常菜单路径配置更新完成！');
        console.log('');
        console.log('下一步操作：');
        console.log('  1. 重启前端应用以刷新菜单缓存');
        console.log('  2. 使用管理员账户登录验证菜单显示');
        console.log('  3. 测试出版异常页面的路由跳转');
        console.log('  4. 测试出版异常页面的增删改功能');
        console.log('');
        
    } catch (error) {
        console.error('❌ 更新出版异常菜单路径配置失败:', error.message);
        throw error;
    } finally {
        if (pool) {
            await pool.close();
            console.log('✅ 数据库连接已关闭');
        }
    }
}

// 执行更新
updatePublishingExceptionsPath()
    .then(() => {
        console.log('✅ 脚本执行完成');
        process.exit(0);
    })
    .catch((error) => {
        console.error('❌ 脚本执行失败:', error.message);
        process.exit(1);
    });