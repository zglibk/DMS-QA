// 测试系统配置功能脚本
const http = require('http');

// HTTP 请求函数
function makeRequest(method, path, data = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: '127.0.0.1',
      port: 3001,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => {
        body += chunk;
      });
      res.on('end', () => {
        try {
          const jsonData = JSON.parse(body);
          resolve({ status: res.statusCode, data: jsonData });
        } catch (e) {
          resolve({ status: res.statusCode, data: body });
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

async function testConnectionAPI() {
  console.log('\n🧪 测试数据库连接功能...');
  
  // 测试正确的连接配置
  const validConfig = {
    Host: '192.168.1.57',
    DatabaseName: 'DMS-QA',
    DbUser: 'sa',
    DbPassword: 'Qa369*'
  };

  try {
    console.log('📡 POST /api/config/test-connection (正确配置)');
    const response = await makeRequest('POST', '/api/config/test-connection', validConfig);
    console.log(`✅ 状态码: ${response.status}`);
    console.log(`📄 响应:`, JSON.stringify(response.data, null, 2));
  } catch (error) {
    console.log(`❌ 错误: ${error.message}`);
  }

  // 测试错误的连接配置
  const invalidConfig = {
    Host: '192.168.1.57',
    DatabaseName: 'NonExistentDB',
    DbUser: 'sa',
    DbPassword: 'WrongPassword'
  };

  try {
    console.log('\n📡 POST /api/config/test-connection (错误配置)');
    const response = await makeRequest('POST', '/api/config/test-connection', invalidConfig);
    console.log(`✅ 状态码: ${response.status}`);
    console.log(`📄 响应:`, JSON.stringify(response.data, null, 2));
  } catch (error) {
    console.log(`❌ 错误: ${error.message}`);
  }
}

async function testStorageAPI() {
  console.log('\n🧪 测试存储路径功能...');
  
  // 测试存在的路径
  const validPath = 'D:\\DMSData\\IMG-VIDEO';

  try {
    console.log('📡 POST /api/config/test-storage (有效路径)');
    const response = await makeRequest('POST', '/api/config/test-storage', { path: validPath });
    console.log(`✅ 状态码: ${response.status}`);
    console.log(`📄 响应:`, JSON.stringify(response.data, null, 2));
  } catch (error) {
    console.log(`❌ 错误: ${error.message}`);
  }

  // 测试不存在的路径
  const invalidPath = 'Z:\\NonExistentPath\\Test';

  try {
    console.log('\n📡 POST /api/config/test-storage (无效路径)');
    const response = await makeRequest('POST', '/api/config/test-storage', { path: invalidPath });
    console.log(`✅ 状态码: ${response.status}`);
    console.log(`📄 响应:`, JSON.stringify(response.data, null, 2));
  } catch (error) {
    console.log(`❌ 错误: ${error.message}`);
  }

  // 测试当前目录
  const currentPath = '.';

  try {
    console.log('\n📡 POST /api/config/test-storage (当前目录)');
    const response = await makeRequest('POST', '/api/config/test-storage', { path: currentPath });
    console.log(`✅ 状态码: ${response.status}`);
    console.log(`📄 响应:`, JSON.stringify(response.data, null, 2));
  } catch (error) {
    console.log(`❌ 错误: ${error.message}`);
  }
}

async function runTests() {
  console.log('🚀 开始测试系统配置功能...');
  
  await testConnectionAPI();
  await testStorageAPI();
  
  console.log('\n🎉 测试完成！');
}

// 运行测试
runTests().catch(console.error);
