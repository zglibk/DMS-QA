/**
 * 测试dashboard数据的脚本
 * 用于验证待处理任务和质量预警的实际数据
 */

const sql = require('mssql');
const db = require('./db');

(async () => {
    try {
        const pool = await db.getConnection();
        console.log('=== 模拟dashboard API调用 ===');
        
        // 检查待处理任务数
        const taskCountQuery = `
            SELECT COUNT(*) as count 
            FROM WorkPlans 
            WHERE Status IN ('pending', 'in_progress')
        `;
        const taskCountResult = await pool.request().query(taskCountQuery);
        const taskCount = taskCountResult.recordset[0].count;
        console.log('待处理任务数:', taskCount);
        
        // 检查质量预警数
        const alertCountQuery = `
            SELECT 
                (
                    SELECT COUNT(*) 
                    FROM ComplaintRegister 
                    WHERE ComplaintCategory = N'客诉' 
                        AND YEAR(Date) = YEAR(GETDATE()) 
                        AND MONTH(Date) = MONTH(GETDATE())
                ) + 
                (
                    SELECT COUNT(*) 
                    FROM ComplaintRegister 
                    WHERE ComplaintCategory = N'内诉' 
                        AND YEAR(Date) = YEAR(GETDATE()) 
                        AND MONTH(Date) = MONTH(GETDATE())
                ) + 
                (
                    SELECT COUNT(*) 
                    FROM WorkPlans 
                    WHERE Status IN ('pending', 'in_progress') 
                        AND EndDate < GETDATE()
                ) as count
        `;
        const alertCountResult = await pool.request().query(alertCountQuery);
        const alertCount = alertCountResult.recordset[0].count;
        console.log('质量预警数:', alertCount);
        
        console.log('\n=== 检查逾期任务详情 ===');
        const overdueQuery = `
            SELECT ID, PlanName, Status, EndDate 
            FROM WorkPlans 
            WHERE Status IN ('pending', 'in_progress') 
                AND EndDate < GETDATE()
        `;
        const overdueResult = await pool.request().query(overdueQuery);
        console.log('逾期任务:', overdueResult.recordset);
        
        console.log('\n=== 测试dashboard API接口 ===');
        const http = require('http');
        const options = {
            hostname: 'localhost',
            port: 3001,
            path: '/api/dashboard/stats',
            method: 'GET',
            headers: {
                'Authorization': 'Bearer test-token' // 临时测试token
            }
        };
        
        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => {
                data += chunk;
            });
            res.on('end', () => {
                console.log('API响应状态:', res.statusCode);
                try {
                    const response = JSON.parse(data);
                    console.log('API返回数据:', response);
                } catch (e) {
                    console.log('API原始响应:', data);
                }
                process.exit(0);
            });
        });
        
        req.on('error', (e) => {
            console.error('API请求失败:', e.message);
            process.exit(0);
        });
        
        req.end();
        
    } catch (error) {
        console.error('查询失败:', error.message);
        process.exit(1);
    }
})();