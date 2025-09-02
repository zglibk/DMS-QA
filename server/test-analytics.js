/**
 * 测试analytics接口
 */
const axios = require('axios');

// 配置axios基础URL
axios.defaults.baseURL = 'http://localhost:3001/api';

async function testAnalytics() {
  try {
    console.log('开始测试analytics接口...');
    
    // 1. 先获取验证码
    console.log('\n1. 获取验证码...');
    const captchaResponse = await axios.get('/auth/captcha');
    const { captchaId, captchaSvg } = captchaResponse.data;
    console.log('✅ 验证码获取成功，ID:', captchaId);
    
    // 从SVG中提取验证码文本（简单解析）
    const textMatch = captchaSvg.match(/>([0-9]{4})</g);
    let captchaText = '';
    if (textMatch) {
      captchaText = textMatch.map(match => match.slice(1, -1)).join('');
    }
    console.log('验证码内容:', captchaText);
    
    // 2. 尝试登录获取token
    console.log('\n2. 尝试登录...');
    try {
      const loginResponse = await axios.post('/auth/login', {
        username: 'admin',
        password: '123456',
        captchaId: captchaId,
        captchaText: captchaText
      });
      
      if (loginResponse.data.success) {
        const token = loginResponse.data.token;
        console.log('✅ 登录成功，获取到token');
        
        // 设置认证头
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        
        // 2. 测试analytics/overview接口
        console.log('\n2. 测试analytics/overview接口...');
        const overviewResponse = await axios.get('/system-logs/analytics/overview', {
          params: {
            startDate: '2025-08-01',
            endDate: '2025-09-01'
          }
        });
        
        console.log('✅ analytics/overview响应:', overviewResponse.data);
        
      } else {
        console.log('❌ 登录失败:', loginResponse.data.message);
      }
    } catch (loginError) {
      console.log('❌ 登录请求失败:', loginError.message);
      
      // 如果登录失败，尝试直接测试接口（可能会返回401）
      console.log('\n尝试直接测试接口（无认证）...');
      try {
        const directResponse = await axios.get('/system-logs/analytics/overview');
        console.log('✅ 直接访问成功:', directResponse.data);
      } catch (directError) {
        console.log('❌ 直接访问失败:', directError.response?.status, directError.response?.data || directError.message);
      }
    }
    
  } catch (error) {
    console.error('❌ 测试失败:', error.message);
    if (error.response) {
      console.error('响应状态:', error.response.status);
      console.error('响应数据:', error.response.data);
    }
  }
}

// 运行测试
testAnalytics();