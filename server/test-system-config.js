// 系统配置功能测试脚本
const http = require('http');

const BASE_URL = 'http://localhost:3001';

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

// 测试配置
const testConfig = {
  Host: '192.168.1.57',
  DatabaseName: 'DMS-QA',
  DbUser: 'sa',
  DbPassword: 'Qa369*',
  ConfigName: '测试配置',
  Remark: '自动化测试创建的配置',
  FileStoragePath: 'D:\\DMSData\\IMG-VIDEO\\test',
  FileServerPort: 8080,
  FileUrlPrefix: '/files',
  ExcelTempPath: 'file:///C:\\Users\\TJ\\AppData\\Roaming\\Microsoft\\Excel\\test',
  NetworkSharePath: '\\\\tj_server\\工作\\品质部\\生产异常周报考核统计\\test'
};

async function testAPI(name, method, path, data = null) {
  try {
    console.log(`\n🧪 测试: ${name}`);
    console.log(`📡 ${method} ${path}`);

    const response = await makeRequest(method, path, data);

    console.log(`✅ 状态码: ${response.status}`);
    console.log(`📄 响应:`, JSON.stringify(response.data, null, 2));
    return response.data;
  } catch (error) {
    console.log(`❌ 错误: ${error.message}`);
    return null;
  }
}

async function runTests() {
  console.log('🚀 开始系统配置功能测试...\n');
  
  // 1. 测试获取配置列表
  const configList = await testAPI(
    '获取数据库配置列表',
    'GET',
    '/api/config/db-list'
  );
  
  // 2. 测试创建新配置
  const createResult = await testAPI(
    '创建新的数据库配置',
    'POST',
    '/api/config/db',
    testConfig
  );
  
  let configId = null;
  if (createResult && createResult.configId) {
    configId = createResult.configId;
    console.log(`📝 创建的配置ID: ${configId}`);
  }
  
  // 3. 测试获取单个配置
  if (configId) {
    await testAPI(
      '获取单个配置详情',
      'GET',
      `/api/config/db/${configId}`
    );
  }
  
  // 4. 测试更新配置
  if (configId) {
    const updateData = {
      ...testConfig,
      ConfigName: '测试配置-已更新',
      Remark: '测试更新功能'
    };
    
    await testAPI(
      '更新数据库配置',
      'PUT',
      `/api/config/db/${configId}`,
      updateData
    );
  }

  // 5. 测试存储路径验证
  await testAPI(
    '验证存储路径',
    'POST',
    '/api/config/validate-storage-path',
    { path: 'D:\\DMSData\\IMG-VIDEO' }
  );

  // 6. 测试存储测试
  await testAPI(
    '测试存储路径',
    'POST',
    '/api/config/test-storage',
    { path: 'D:\\DMSData\\IMG-VIDEO' }
  );

  // 7. 测试路径映射配置获取
  await testAPI(
    '获取路径映射配置',
    'GET',
    '/api/import/path-mapping-config'
  );
  
  // 8. 测试路径映射配置保存
  const pathMappingData = {
    pathMappings: [
      {
        name: '测试映射规则',
        localPattern: 'C:\\test\\*',
        targetPattern: '\\\\server\\test\\*',
        description: '测试用的映射规则'
      }
    ],
    conversionConfig: {
      autoConvert: true,
      keepOriginal: false
    }
  };
  
  await testAPI(
    '保存路径映射配置',
    'PUT',
    '/api/import/path-mapping-config',
    pathMappingData
  );

  // 9. 测试删除配置（如果创建成功）
  if (configId) {
    await testAPI(
      '删除数据库配置',
      'DELETE',
      `/api/config/db/${configId}`
    );
  }
  
  console.log('\n🎉 系统配置功能测试完成！');
}

// 运行测试
runTests().catch(console.error);
