/**
 * 测试修复后的API生成功能
 * 模拟前端调用生成考核记录API
 */

const axios = require('axios');

async function testAPIGenerate() {
    try {
        console.log('=== 开始测试API生成功能 ===');
        
        // 1. 先清理已有的考核记录（可选）
        console.log('\n1. 准备测试数据...');
        
        // 2. 调用生成考核记录API
        console.log('\n2. 调用生成考核记录API:');
        const apiUrl = 'http://localhost:3001/api/assessment/generate';
        const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwidXNlcm5hbWUiOiJhZG1pbiIsInJvbGUiOiJhZG1pbiIsInJvbGVDb2RlIjoiYWRtaW4iLCJyb2xlcyI6W3siSUQiOjEsIlJvbGVOYW1lIjoi57O757uf566h55CG5ZGYIiwiUm9sZUNvZGUiOiJhZG1pbiJ9XSwiaWF0IjoxNzU4MDA0MjM5LCJleHAiOjE3NTgwMTE0Mzl9.D_vX3y70GvOWzT5bfEg_JI9G4Gu5tm0uK6gv9e7vZVg';
        const requestData = {
            startDate: '2025-01-01',
            endDate: '2025-12-31'
        };
        
        console.log(`API地址: ${apiUrl}`);
        console.log('请求数据:', requestData);
        
        const response = await axios.post(apiUrl, requestData, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            timeout: 30000 // 30秒超时
        });
        
        console.log('API响应状态:', response.status);
        console.log('API响应数据:', response.data);
        
        // 3. 验证生成结果
        if (response.data.success) {
            console.log(`\n✅ 生成成功！生成了 ${response.data.data.generatedCount} 条考核记录`);
            
            // 4. 查询验证管理人员考核记录
            console.log('\n3. 验证管理人员考核记录:');
            const recordsResponse = await axios.get('http://localhost:3001/api/assessment/records?personType=Manager', {
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                timeout: 10000
            });
            
            console.log('管理人员考核记录查询结果:');
            console.log('记录数量:', recordsResponse.data.data.records.length);
            
            if (recordsResponse.data.data.records.length > 0) {
                console.log('前5条管理人员考核记录:');
                recordsResponse.data.data.records.slice(0, 5).forEach((record, index) => {
                    console.log(`${index + 1}. ID: ${record.ID}, 姓名: ${record.PersonName}, 金额: ${record.AssessmentAmount}, 日期: ${record.AssessmentDate}`);
                });
            } else {
                console.log('❌ 未找到管理人员考核记录');
            }
        } else {
            console.log('❌ 生成失败:', response.data.message);
        }
        
        console.log('\n=== 测试完成 ===');
        
    } catch (error) {
        console.error('测试失败:', error.message);
        if (error.response) {
            console.error('错误响应:', error.response.data);
        }
    }
}

testAPIGenerate();