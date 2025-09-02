/**
 * 简化的analytics接口测试
 * 直接使用JWT token测试
 */
const axios = require('axios');
const jwt = require('jsonwebtoken');

// 配置axios基础URL
axios.defaults.baseURL = 'http://localhost:3001/api';

async function testAnalyticsSimple() {
  try {
    console.log('开始简化测试analytics接口...');
    
    // 直接生成JWT token（模拟登录成功）
    const SECRET = 'dms-secret';
    const token = jwt.sign(
      { 
        userId: 1, 
        username: 'admin' 
      }, 
      SECRET, 
      { expiresIn: '2h' }
    );
    
    console.log('✅ 生成测试token成功');
    
    // 设置认证头
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    
    // 测试analytics/overview接口
    console.log('\n测试analytics/overview接口...');
    try {
      const overviewResponse = await axios.get('/system-logs/analytics/overview', {
        params: {
          startDate: '2025-01-01',
          endDate: '2025-12-31'
        }
      });
      
      console.log('✅ analytics/overview响应成功:');
      console.log('响应数据:', JSON.stringify(overviewResponse.data, null, 2));
      
      // 测试其他analytics接口
      console.log('\n测试analytics/category接口...');
      const categoryResponse = await axios.get('/system-logs/analytics/category');
      console.log('✅ analytics/category响应成功');
      console.log('分类数据:', JSON.stringify(categoryResponse.data, null, 2));
      
    } catch (apiError) {
      console.log('❌ API请求失败:', apiError.response?.status, apiError.response?.data || apiError.message);
      if (apiError.response?.data) {
        console.log('详细错误信息:', JSON.stringify(apiError.response.data, null, 2));
      }
    }
    
  } catch (error) {
    console.error('❌ 测试失败:', error.message);
  }
}

// 运行测试
testAnalyticsSimple();