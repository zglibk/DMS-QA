/**
 * 执行添加IsDeleted字段的SQL脚本
 * 功能：连接数据库并执行SQL语句添加IsDeleted字段
 */

const sql = require('mssql');
const fs = require('fs');
const path = require('path');

// 数据库配置
const config = {
    user: process.env.DB_USER || 'sa',
    password: process.env.DB_PASSWORD || 'Qa369*',
    server: process.env.DB_SERVER || '192.168.1.57',
    database: process.env.DB_NAME || 'DMS-QA',
    options: {
        encrypt: false,
        trustServerCertificate: true,
        enableArithAbort: true,
        useUTC: false,
        requestTimeout: 30000,
        connectionTimeout: 30000
    }
};

async function executeSQL() {
    try {
        console.log('正在连接数据库...');
        await sql.connect(config);
        console.log('✅ 数据库连接成功');
        
        // 检查字段是否已存在
        const checkQuery = `
            SELECT COUNT(*) as count 
            FROM sys.columns 
            WHERE object_id = OBJECT_ID(N'[dbo].[QualityTargets]') 
            AND name = 'IsDeleted'
        `;
        
        const checkResult = await sql.query(checkQuery);
        const fieldExists = checkResult.recordset[0].count > 0;
        
        if (fieldExists) {
            console.log('⚠️ IsDeleted字段已存在，跳过添加');
            return;
        }
        
        console.log('开始添加IsDeleted字段...');
        
        // 添加IsDeleted字段
        const alterQuery = `
            ALTER TABLE [dbo].[QualityTargets] 
            ADD [IsDeleted] BIT DEFAULT 0
        `;
        
        await sql.query(alterQuery);
        console.log('✅ IsDeleted字段添加成功');
        
        // 为现有记录设置默认值
        const updateQuery = `
            UPDATE [dbo].[QualityTargets] 
            SET [IsDeleted] = 0 
            WHERE [IsDeleted] IS NULL
        `;
        
        await sql.query(updateQuery);
        console.log('✅ 现有记录IsDeleted字段初始化完成');
        
        // 创建索引
        const indexQuery = `
            IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_QualityTargets_IsDeleted')
            BEGIN
                CREATE NONCLUSTERED INDEX [IX_QualityTargets_IsDeleted] 
                ON [dbo].[QualityTargets] ([IsDeleted])
            END
        `;
        
        await sql.query(indexQuery);
        console.log('✅ IsDeleted字段索引创建成功');
        
        console.log('🎉 质量目标表IsDeleted字段添加完成！');
        
    } catch (err) {
        console.error('❌ 执行失败:', err.message);
        console.error('详细错误:', err);
    } finally {
        await sql.close();
        console.log('数据库连接已关闭');
    }
}

// 执行脚本
executeSQL();