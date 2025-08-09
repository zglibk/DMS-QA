const { getConnection, sql } = require('./db');

(async () => {
    try {
        console.log('连接数据库...');
        const pool = await getConnection();
        
        // 检查现有数据
        const countResult = await pool.request().query('SELECT COUNT(*) as count FROM PlanTemplates');
        console.log('当前模板数量:', countResult.recordset[0].count);
        
        if (countResult.recordset[0].count === 0) {
            console.log('插入测试数据...');
            
            const insertQuery = `
                INSERT INTO PlanTemplates (
                    TemplateName, Category, Description, TemplateData, 
                    EstimatedHours, CreatedBy, CreatedAt, UpdatedAt
                ) VALUES 
                ('项目启动模板', 'project', '用于项目启动阶段的标准模板', '{"phases": [{"name": "需求分析", "description": "分析项目需求", "estimatedDays": 3}]}', 24, 1, GETDATE(), GETDATE()),
                ('日常工作模板', 'daily', '用于日常工作安排的模板', '{"phases": [{"name": "任务执行", "description": "执行日常任务", "estimatedDays": 1}]}', 8, 1, GETDATE(), GETDATE()),
                ('研发任务模板', 'development', '用于研发项目的标准模板', '{"phases": [{"name": "设计阶段", "description": "系统设计", "estimatedDays": 5}, {"name": "开发阶段", "description": "编码实现", "estimatedDays": 10}]}', 120, 1, GETDATE(), GETDATE())
            `;
            
            await pool.request().query(insertQuery);
            console.log('✅ 测试数据插入成功');
            
            // 验证插入结果
            const verifyResult = await pool.request().query('SELECT * FROM PlanTemplates');
            console.log('插入后的模板列表:');
            verifyResult.recordset.forEach(template => {
                console.log(`- ${template.TemplateName} (${template.Category})`);
            });
        } else {
            console.log('数据库中已有模板数据，无需插入');
        }
        
        process.exit(0);
    } catch (error) {
        console.error('❌ 错误:', error);
        process.exit(1);
    }
})();