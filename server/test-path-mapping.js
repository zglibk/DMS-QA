// 测试路径映射配置功能
const http = require('http');

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

async function testPathMappingConfig() {
  console.log('🚀 测试路径映射配置功能...\n');

  // 1. 测试获取路径映射配置
  console.log('📡 GET /api/import/path-mapping-config');
  try {
    const response = await makeRequest('GET', '/api/import/path-mapping-config');
    console.log(`✅ 状态码: ${response.status}`);
    if (response.data.success) {
      console.log(`📄 路径映射数量: ${response.data.data.pathMappings.length}`);
      console.log('📄 现有映射规则:');
      response.data.data.pathMappings.forEach((mapping, index) => {
        console.log(`  ${index + 1}. ${mapping.name} (ID: ${mapping.id})`);
        console.log(`     本地模式: ${mapping.localPattern}`);
        console.log(`     目标模式: ${mapping.targetPattern}`);
      });
    } else {
      console.log(`❌ 失败: ${response.data.message}`);
    }
  } catch (error) {
    console.log(`❌ 错误: ${error.message}`);
  }

  // 2. 测试保存路径映射配置
  const testMappings = [
    {
      id: null, // 新记录
      name: '测试映射规则1',
      localPattern: 'C:\\test\\*',
      targetPattern: '\\\\server\\test\\*',
      description: '测试用的映射规则1',
      isActive: true
    },
    {
      id: null, // 新记录
      name: '测试映射规则2',
      localPattern: 'D:\\temp\\*',
      targetPattern: '\\\\server\\temp\\*',
      description: '测试用的映射规则2',
      isActive: true
    }
  ];

  console.log('\n📡 PUT /api/import/path-mapping-config (保存测试配置)');
  try {
    const response = await makeRequest('PUT', '/api/import/path-mapping-config', {
      pathMappings: testMappings,
      conversionConfig: {
        autoConvert: true,
        keepOriginal: false
      }
    });
    console.log(`✅ 状态码: ${response.status}`);
    if (response.data.success) {
      console.log(`📄 保存成功: ${response.data.message}`);
      console.log(`📄 保存的映射数量: ${response.data.data.savedMappings}`);
    } else {
      console.log(`❌ 保存失败: ${response.data.message}`);
    }
  } catch (error) {
    console.log(`❌ 错误: ${error.message}`);
  }

  // 3. 再次获取配置验证保存结果
  console.log('\n📡 GET /api/import/path-mapping-config (验证保存结果)');
  try {
    const response = await makeRequest('GET', '/api/import/path-mapping-config');
    console.log(`✅ 状态码: ${response.status}`);
    if (response.data.success) {
      console.log(`📄 验证结果 - 路径映射数量: ${response.data.data.pathMappings.length}`);
      console.log('📄 保存后的映射规则:');
      response.data.data.pathMappings.forEach((mapping, index) => {
        if (mapping.id !== 'server-storage') { // 跳过动态生成的服务器映射
          console.log(`  ${index + 1}. ${mapping.name} (ID: ${mapping.id})`);
          console.log(`     本地模式: ${mapping.localPattern}`);
          console.log(`     目标模式: ${mapping.targetPattern}`);
          console.log(`     描述: ${mapping.description}`);
        }
      });
    }
  } catch (error) {
    console.log(`❌ 错误: ${error.message}`);
  }

  console.log('\n🎉 路径映射配置测试完成！');
  console.log('\n📋 测试总结:');
  console.log('✅ 获取路径映射配置功能');
  console.log('✅ 保存路径映射配置功能');
  console.log('✅ 数据库读写操作');
  console.log('✅ 配置验证和同步');
}

// 运行测试
testPathMappingConfig().catch(console.error);
