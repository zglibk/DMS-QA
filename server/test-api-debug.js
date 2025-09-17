/**
 * 测试考核记录API接口，查看调试日志
 */

const axios = require('axios');

/**
 * 测试API接口
 */
async function testAssessmentAPI() {
    try {
        console.log('开始测试考核记录API...');
        
        // 测试基本的获取考核记录列表接口
        const response = await axios.get('http://localhost:3001/api/assessment/records', {
            params: {
                page: 1,
                pageSize: 20
            }
        });
        
        console.log('\n=== API响应结果 ===');
        console.log('状态码:', response.status);
        console.log('响应数据:', JSON.stringify(response.data, null, 2));
        
        if (response.data.success) {
            console.log('\n=== 分页信息 ===');
            console.log('总记录数:', response.data.data.pagination.total);
            console.log('当前页:', response.data.data.pagination.page);
            console.log('每页大小:', response.data.data.pagination.pageSize);
            console.log('总页数:', response.data.data.pagination.totalPages);
            
            console.log('\n=== 记录数据 ===');
            console.log('返回记录数:', response.data.data.records.length);
            
            if (response.data.data.records.length > 0) {
                console.log('前3条记录:');
                response.data.data.records.slice(0, 3).forEach((record, index) => {
                    console.log(`${index + 1}. ID: ${record.id}, 员工: ${record.employeeName}, 部门: ${record.department}, 金额: ${record.assessmentAmount}`);
                });
            } else {
                console.log('⚠️ API返回0条记录！');
            }
        } else {
            console.log('❌ API调用失败:', response.data.message);
        }
        
    } catch (error) {
        console.error('测试API时出错:', error.message);
        if (error.response) {
            console.error('响应状态:', error.response.status);
            console.error('响应数据:', error.response.data);
        }
    }
}

// 等待服务器启动后再测试
setTimeout(() => {
    testAssessmentAPI();
}, 2000);