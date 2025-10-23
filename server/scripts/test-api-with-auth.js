/**
 * 带有认证信息的API测试脚本
 */

const http = require('http');

function makeRequest(options, data) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => {
        body += chunk;
      });
      res.on('end', () => {
        try {
          const parsedBody = JSON.parse(body);
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            data: parsedBody
          });
        } catch (error) {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            data: body
          });
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

async function testAPIWithAuth() {
  try {
    console.log('🔐 带认证的API测试...');

    // 1. 先登录获取token
    console.log('\n1. 用户登录...');
    
    const loginData = {
      username: 'admin',
      password: 'admin123'
    };

    const loginOptions = {
      hostname: 'localhost',
      port: 3001,
      path: '/api/auth/login',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(JSON.stringify(loginData))
      }
    };

    const loginResponse = await makeRequest(loginOptions, loginData);
    console.log('登录响应状态:', loginResponse.statusCode);
    console.log('登录响应数据:', loginResponse.data);

    if (loginResponse.statusCode !== 200 || !loginResponse.data.success) {
      console.log('❌ 登录失败，无法继续测试');
      return;
    }

    const token = loginResponse.data.token;
    console.log('✅ 登录成功，获得token');

    // 2. 测试创建（带认证）
    console.log('\n2. 测试创建供应商投诉（带认证）...');
    
    const createData = {
      complaintNo: 'TEST-AUTH-' + Date.now(),
      complaintDate: '2025-10-23',
      supplierName: '测试供应商',
      materialName: '测试材料',
      materialCode: 'MAT001',
      complaintType: '质量问题',
      description: '测试投诉描述',
      quantity: 100,
      unitPrice: 10.5,
      totalAmount: 1050,
      urgencyLevel: 'high',
      expectedSolution: '期望解决方案',
      initiatedBy: '测试人员',
      processResult: '待处理',
      verificationResult: '待验证'
    };

    const createOptions = {
      hostname: 'localhost',
      port: 3001,
      path: '/api/supplier-complaints',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'Content-Length': Buffer.byteLength(JSON.stringify(createData))
      }
    };

    const createResponse = await makeRequest(createOptions, createData);
    console.log('创建响应状态:', createResponse.statusCode);
    console.log('创建响应数据:', createResponse.data);

    if (createResponse.statusCode === 200 && createResponse.data.success) {
      const createdId = createResponse.data.data?.id;
      console.log(`✅ 创建成功，ID: ${createdId}`);

      if (createdId) {
        // 3. 测试更新（带认证）
        console.log('\n3. 测试更新供应商投诉（带认证）...');
        
        const updateData = {
          processStatus: '已处理',
          processResult: '处理完成',
          verificationResult: '验证通过，问题已解决'
        };

        const updateOptions = {
          hostname: 'localhost',
          port: 3001,
          path: `/api/supplier-complaints/${createdId}`,
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
            'Content-Length': Buffer.byteLength(JSON.stringify(updateData))
          }
        };

        const updateResponse = await makeRequest(updateOptions, updateData);
        console.log('更新响应状态:', updateResponse.statusCode);
        console.log('更新响应数据:', updateResponse.data);

        if (updateResponse.statusCode === 200 && updateResponse.data.success) {
          console.log('✅ 更新成功');
        } else {
          console.log('❌ 更新失败');
        }
      }
    } else {
      console.log('❌ 创建失败');
    }

    console.log('\n🎯 测试完成');

  } catch (error) {
    console.error('❌ 测试过程中发生错误:', error.message);
  }
}

testAPIWithAuth();