/**
 * 测试zsx用户权限数据获取流程
 * 验证从登录到权限数据保存到Pinia store的完整流程
 */

const http = require('http');

// 简单的HTTP请求封装
function makeRequest(method, path, data = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3001,
      path: `/api${path}`,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        ...headers
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
          resolve({ data: jsonData, status: res.statusCode });
        } catch (e) {
          reject(new Error('Invalid JSON response'));
        }
      });
    });

    req.on('error', (err) => {
      reject(err);
    });

    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

async function testZsxUserPermissions() {
  try {
    console.log('=== 开始测试zsx用户权限数据获取流程 ===\n');
    
    // 1. 获取验证码
    console.log('1. 获取验证码...');
    const captchaResponse = await makeRequest('GET', '/auth/captcha');
    const { captchaId } = captchaResponse.data;
    console.log('验证码ID:', captchaId);
    
    // 2. 模拟登录（使用固定验证码或跳过验证码验证）
    console.log('\n2. 尝试登录zsx用户...');
    let loginResponse;
    try {
      loginResponse = await makeRequest('POST', '/auth/login', {
        username: 'zsx',
        password: 'Password112233',
        captchaId: captchaId,
        captchaText: '1234' // 尝试使用固定验证码
      });
    } catch (error) {
      if (error.response?.data?.message?.includes('验证码')) {
        console.log('验证码验证失败，尝试获取新验证码...');
        const newCaptchaResponse = await makeRequest('GET', '/auth/captcha');
        const newCaptchaId = newCaptchaResponse.data.captchaId;
        
        // 再次尝试登录
        loginResponse = await makeRequest('POST', '/auth/login', {
          username: 'zsx',
          password: 'Password112233',
          captchaId: newCaptchaId,
          captchaText: '0000' // 尝试另一个验证码
        });
      } else {
        throw error;
      }
    }
    
    if (!loginResponse.data.token) {
      throw new Error('登录失败，未获取到token');
    }
    
    const token = loginResponse.data.token;
    const user = loginResponse.data.user;
    console.log('登录成功！');
    console.log('Token:', token.substring(0, 20) + '...');
    console.log('用户信息:', {
      id: user.id,
      username: user.username,
      realName: user.realName
    });
    
    // 3. 获取用户资料
    console.log('\n3. 获取用户资料...');
    const authHeaders = { 'Authorization': `Bearer ${token}` };
    
    const profileResponse = await makeRequest('GET', '/auth/profile', null, authHeaders);
    if (profileResponse.data.success) {
      const profileData = profileResponse.data.data;
      console.log('用户资料获取成功:', {
        ID: profileData.ID,
        Username: profileData.Username,
        RealName: profileData.RealName,
        DepartmentName: profileData.DepartmentName
      });
    } else {
      console.log('用户资料获取失败:', profileResponse.data);
    }
    
    // 4. 获取用户角色和权限
    console.log('\n4. 获取用户角色和权限...');
    const permissionsResponse = await makeRequest('GET', `/auth/user/${user.id}/roles-permissions`, null, authHeaders);
    
    if (permissionsResponse.data.success) {
      const permData = permissionsResponse.data.data;
      console.log('权限数据获取成功!');
      console.log('角色信息:', permData.roles);
      console.log('权限数量:', permData.permissions?.length || 0);
      
      // 检查admin和system相关权限
      const adminPermissions = (permData.permissions || []).filter(perm => {
        const path = perm.path || perm.Path;
        return path && (path.includes('/admin') || path.includes('/system'));
      });
      
      const buttonPermissions = (permData.permissions || []).filter(perm => {
        const path = perm.path || perm.Path;
        return !path; // 按钮级权限（path为null）
      });
      
      console.log('\n=== 权限分析 ===');
      console.log('Admin/System路径权限数量:', adminPermissions.length);
      console.log('Admin/System路径权限:', adminPermissions.slice(0, 5));
      console.log('按钮级权限数量:', buttonPermissions.length);
      console.log('按钮级权限样本:', buttonPermissions.slice(0, 5));
      
      // 模拟前端hasAnyAdminPermission逻辑
      const adminRouteRegex = /^\/admin(\/.*)?$/;
      const systemRouteRegex = /^\/system(\/.*)?$/;
      const menus = permData.permissions || [];
      
      const hasAdminMenus = menus.some(menu => {
        const path = menu.path || menu.Path;
        return path && (adminRouteRegex.test(path) || systemRouteRegex.test(path));
      });
      
      const hasButtonPermissions = menus.some(menu => {
        const path = menu.path || menu.Path;
        return !path;
      });
      
      const hasAnyAdminPermission = hasAdminMenus || hasButtonPermissions;
      
      console.log('\n=== hasAnyAdminPermission模拟结果 ===');
      console.log('hasAdminMenus:', hasAdminMenus);
      console.log('hasButtonPermissions:', hasButtonPermissions);
      console.log('hasAnyAdminPermission:', hasAnyAdminPermission);
      
      if (hasAnyAdminPermission) {
        console.log('✅ zsx用户应该能够看到"登录后台"按钮');
      } else {
        console.log('❌ zsx用户无法看到"登录后台"按钮');
      }
      
    } else {
      console.log('权限数据获取失败:', permissionsResponse.data);
    }
    
    console.log('\n=== 测试完成 ===');
    
  } catch (error) {
    console.error('测试过程中发生错误:', {
      message: error.message,
      response: error.response?.data || 'No response data',
      status: error.status || 'No status'
    });
  }
}

// 运行测试
testZsxUserPermissions();