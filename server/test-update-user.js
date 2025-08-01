/**
 * 测试update-user接口的脚本
 * 用于诊断用户编辑功能的问题
 */

const axios = require('axios');

// 测试数据
const testData = {
  Username: 'admin',
  Role: 'admin',
  Department: '管理部',
  RealName: '管理员',
  Phone: '13800138000',
  Email: 'admin@example.com',
  Avatar: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='
};

/**
 * 获取登录token
 */
async function getAuthToken() {
  try {
    console.log('正在获取认证token...');
    const loginResponse = await axios.post('http://localhost:3001/api/auth/login', {
      username: 'admin',
      password: '112233'
    });
    
    if (loginResponse.data.token) {
      console.log('登录成功，获取到token');
      return loginResponse.data.token;
    } else {
      throw new Error('登录失败: ' + JSON.stringify(loginResponse.data));
    }
  } catch (error) {
    console.error('获取token失败:', error.message);
    throw error;
  }
}

/**
 * 测试update-user接口
 */
async function testUpdateUser() {
  try {
    // 先获取有效的token
    const token = await getAuthToken();
    
    console.log('\n开始测试update-user接口...');
    console.log('测试数据:', testData);
    
    const response = await axios.put('http://localhost:3001/api/auth/update-user', testData, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });
    
    console.log('\n响应状态:', response.status);
    console.log('响应数据:', response.data);
    
  } catch (error) {
    console.error('\n请求失败:');
    console.error('状态码:', error.response?.status);
    console.error('错误信息:', error.response?.data);
    console.error('完整错误:', error.message);
  }
}

// 执行测试
testUpdateUser();