/**
 * 检查数据库中通知内容的脚本
 * 用于验证通知内容是否包含HTML标签
 */
const sql = require('mssql');

// 数据库配置
const config = {
    server: 'localhost',
    database: 'DMS_QA',
    options: {
        encrypt: false,
        trustServerCertificate: true
    },
    authentication: {
        type: 'ntlm',
        options: {
            domain: '',
            userName: '',
            password: ''
        }
    }
};

async function checkNoticeContent() {
    try {
        console.log('🔍 连接数据库...');
        await sql.connect(config);
        
        console.log('📋 查询最新的版本通知内容...');
        const result = await sql.query`
            SELECT TOP 3 Title, Content, CreatedAt 
            FROM Notices 
            WHERE Title LIKE '%版本%' 
            ORDER BY CreatedAt DESC
        `;
        
        if (result.recordset.length === 0) {
            console.log('❌ 未找到版本通知记录');
            return;
        }
        
        console.log(`✅ 找到 ${result.recordset.length} 条版本通知记录:\n`);
        
        result.recordset.forEach((record, index) => {
            console.log(`--- 通知 ${index + 1} ---`);
            console.log(`标题: ${record.Title}`);
            console.log(`创建时间: ${record.CreatedAt}`);
            console.log(`内容预览 (前200字符):`);
            console.log(record.Content.substring(0, 200));
            
            // 检查是否包含HTML标签
            const hasHtmlTags = /<[^>]+>/.test(record.Content);
            console.log(`包含HTML标签: ${hasHtmlTags ? '是' : '否'}`);
            console.log('\n');
        });
        
    } catch (err) {
        console.error('❌ 错误:', err.message);
    } finally {
        await sql.close();
        console.log('🔒 数据库连接已关闭');
    }
}

// 执行检查
checkNoticeContent();