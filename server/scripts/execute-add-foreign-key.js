/**
 * 执行外键约束添加脚本
 * 为CustomerComplaints表的ComplaintType字段添加外键约束
 */

const sql = require('mssql');
const fs = require('fs');
const path = require('path');
// 引入数据库配置
const { config: dbConfig } = require('../db');

// 创建迁移专用的数据库配置
const config = {
    ...dbConfig,
    database: 'DMS-QA'  // 确保使用正确的数据库名称
};

/**
 * 执行外键约束添加的主函数
 */
async function addForeignKeyConstraint() {
    let pool;
    
    try {
        console.log('开始执行外键约束添加脚本...');
        console.log('数据库配置:', {
            server: config.server,
            database: config.database,
            user: config.user
        });
        
        // 创建数据库连接池
        pool = await sql.connect(config);
        console.log('数据库连接成功');
        
        // 读取SQL脚本文件
        const sqlFilePath = path.join(__dirname, 'add-complaint-type-foreign-key.sql');
        const sqlScript = fs.readFileSync(sqlFilePath, 'utf8');
        
        console.log('开始执行外键约束SQL脚本...');
        
        // 分割SQL脚本（按GO分割）
        const sqlCommands = sqlScript.split(/\bGO\b/gi).filter(cmd => cmd.trim());
        
        // 逐个执行SQL命令
        for (let i = 0; i < sqlCommands.length; i++) {
            const command = sqlCommands[i].trim();
            if (command) {
                console.log(`执行SQL命令 ${i + 1}/${sqlCommands.length}...`);
                const request = pool.request();
                await request.query(command);
            }
        }
        
        console.log('外键约束添加脚本执行成功！');
        
        // 验证外键约束是否创建成功
        console.log('\n验证外键约束...');
        const verifyRequest = pool.request();
        const verifyResult = await verifyRequest.query(`
            SELECT 
                fk.name AS ForeignKeyName,
                tp.name AS ParentTable,
                cp.name AS ParentColumn,
                tr.name AS ReferencedTable,
                cr.name AS ReferencedColumn,
                fk.delete_referential_action_desc AS DeleteAction,
                fk.update_referential_action_desc AS UpdateAction
            FROM sys.foreign_keys fk
            INNER JOIN sys.foreign_key_columns fkc ON fk.object_id = fkc.constraint_object_id
            INNER JOIN sys.tables tp ON fk.parent_object_id = tp.object_id
            INNER JOIN sys.columns cp ON fkc.parent_object_id = cp.object_id AND fkc.parent_column_id = cp.column_id
            INNER JOIN sys.tables tr ON fk.referenced_object_id = tr.object_id
            INNER JOIN sys.columns cr ON fkc.referenced_object_id = cr.object_id AND fkc.referenced_column_id = cr.column_id
            WHERE fk.name = 'FK_CustomerComplaints_ComplaintType'
        `);
        
        if (verifyResult.recordset.length > 0) {
            console.log('外键约束验证成功！');
            console.log('外键约束详情:', verifyResult.recordset[0]);
        } else {
            console.log('警告：外键约束验证失败，未找到FK_CustomerComplaints_ComplaintType约束');
        }
        
    } catch (error) {
        console.error('执行外键约束添加脚本时发生错误:', error.message);
        console.error('错误详情:', error);
        process.exit(1);
    } finally {
        // 关闭数据库连接
        if (pool) {
            try {
                await pool.close();
                console.log('数据库连接已关闭');
            } catch (closeError) {
                console.error('关闭数据库连接时发生错误:', closeError.message);
            }
        }
    }
}

// 执行脚本
if (require.main === module) {
    addForeignKeyConstraint()
        .then(() => {
            console.log('\n外键约束添加脚本执行完成');
            process.exit(0);
        })
        .catch((error) => {
            console.error('脚本执行失败:', error.message);
            process.exit(1);
        });
}

module.exports = { addForeignKeyConstraint };