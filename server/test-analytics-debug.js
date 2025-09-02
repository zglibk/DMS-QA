/**
 * 测试analytics API调用
 */
const axios = require('axios');
const jwt = require('jsonwebtoken');

async function testAnalyticsAPI() {
  try {
    console.log('🔍 开始测试analytics API...');
    
    // 生成测试token
    const token = jwt.sign(
      { userId: 1, username: 'admin' }, 
      'dms-secret', 
      { expiresIn: '2h' }
    );
    
    console.log('✅ 测试token生成成功');
    
    // 测试overview接口
    console.log('\n📊 测试 /analytics/overview 接口...');
    const response = await axios.get('http://localhost:3001/api/system-logs/analytics/overview', {
      params: {
        startDate: '2025-01-01',
        endDate: '2025-12-31'
      },
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    
    console.log('✅ API调用成功!');
    console.log('响应状态:', response.status);
    console.log('响应数据:', JSON.stringify(response.data, null, 2));
    
  } catch (error) {
    console.error('❌ API调用失败:');
    console.error('状态码:', error.response?.status);
    console.error('错误信息:', error.response?.data || error.message);
  }
}

// 运行测试
testAnalyticsAPI();