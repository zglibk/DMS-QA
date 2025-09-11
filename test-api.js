const axios = require('axios');

/**
 * 测试系统日志API接口
 * 用于验证前后端数据格式是否匹配
 */
async function testSystemLogsAPI() {
  try {
    console.log('正在测试系统日志API...');
    
    // 首先登录获取token
    const loginResponse = await axios.post('http://localhost:3001/api/auth/login', {
      username: 'admin',
      password: 'Password112233'
    });
    
    if (!loginResponse.data.success) {
      console.error('登录失败:', loginResponse.data.message);
      return;
    }
    
    const token = loginResponse.data.data.token;
    console.log('登录成功，获取到token');
    
    // 测试系统日志列表API
    const logsResponse = await axios.get('http://localhost:3001/api/system-logs/list', {
      params: {
        page: 1,
        pageSize: 5
      },
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('API响应状态:', logsResponse.status);
    console.log('API响应数据结构:');
    console.log('- success:', logsResponse.data.success);
    console.log('- message:', logsResponse.data.message);
    
    if (logsResponse.data.success && logsResponse.data.data) {
      console.log('- data.list 长度:', logsResponse.data.data.list?.length || 0);
      console.log('- data.pagination:', logsResponse.data.data.pagination);
      
      if (logsResponse.data.data.list && logsResponse.data.data.list.length > 0) {
        console.log('\n第一条日志记录的字段:');
        const firstLog = logsResponse.data.data.list[0];
        Object.keys(firstLog).forEach(key => {
          console.log(`- ${key}:`, typeof firstLog[key], firstLog[key]);
        });
      } else {
        console.log('\n日志列表为空');
      }
    } else {
      console.error('API返回失败:', logsResponse.data);
    }
    
  } catch (error) {
    console.error('测试失败:', error.message);
    if (error.response) {
      console.error('响应状态:', error.response.status);
      console.error('响应数据:', error.response.data);
    }
  }
}

// 运行测试
testSystemLogsAPI();