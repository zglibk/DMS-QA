/**
 * 测试zsx用户登录后的权限数据获取和验证脚本
 * 用于调试权限相关问题
 */

const http = require('http');
const querystring = require('querystring');

// 服务器配置
const SERVER_HOST = 'localhost';
const SERVER_PORT = 3001;
const BASE_URL = `http://${SERVER_HOST}:${SERVER_PORT}`;

/**
 * 发送HTTP请求的通用函数
 * @param {string} method - HTTP方法
 * @param {string} path - 请求路径
 * @param {Object} data - 请求数据
 * @param {Object} headers - 请求头
 * @returns {Promise} 返回响应数据
 */
function makeRequest(method, path, data = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const postData = data ? JSON.stringify(data) : null;
    
    const options = {
      hostname: SERVER_HOST,
      port: SERVER_PORT,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Node.js Test Script',
        ...headers
      }
    };

    if (postData) {
      options.headers['Content-Length'] = Buffer.byteLength(postData);
    }

    const req = http.request(options, (res) => {
      let body = '';
      
      res.on('data', (chunk) => {
        body += chunk;
      });
      
      res.on('end', () => {
        try {
          const response = {
            status: res.statusCode,
            headers: res.headers,
            data: body ? JSON.parse(body) : null
          };
          resolve(response);
        } catch (error) {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            data: body,
            parseError: error.message
          });
        }
      });
    });

    req.on('error', (error) => {
      reject({
        message: error.message,
        code: error.code
      });
    });

    if (postData) {
      req.write(postData);
    }
    
    req.end();
  });
}

/**
 * 测试zsx用户登录流程
 */
async function testZsxLogin() {
  try {
    console.log('=== 开始测试zsx用户登录流程 ===\n');
    
    // 步骤1: 获取验证码
    console.log('1. 获取验证码...');
    const captchaResponse = await makeRequest('GET', '/api/auth/captcha');
    
    if (captchaResponse.status !== 200) {
      throw new Error(`获取验证码失败: ${captchaResponse.status}`);
    }
    
    const captchaKey = captchaResponse.data.key;
    console.log(`   验证码Key: ${captchaKey}`);
    
    // 步骤2: 模拟登录（使用固定验证码或跳过验证码验证）
    console.log('\n2. 尝试登录zsx用户...');
    const loginData = {
      username: 'zsx',
      password: 'zsx123', // 假设密码
      captcha: '1234', // 模拟验证码
      captchaKey: captchaKey
    };
    
    const loginResponse = await makeRequest('POST', '/api/auth/login', loginData);
    
    if (loginResponse.status !== 200) {
      console.log(`   登录失败: ${loginResponse.status}`);
      console.log(`   响应数据:`, loginResponse.data);
      
      // 尝试不同的密码
      console.log('\n   尝试其他可能的密码...');
      const passwords = ['123456', 'zsx', 'admin', 'password'];
      
      for (const pwd of passwords) {
        console.log(`   尝试密码: ${pwd}`);
        loginData.password = pwd;
        const retryResponse = await makeRequest('POST', '/api/auth/login', loginData);
        
        if (retryResponse.status === 200) {
          console.log(`   ✓ 登录成功，密码: ${pwd}`);
          Object.assign(loginResponse, retryResponse);
          break;
        }
      }
      
      if (loginResponse.status !== 200) {
        throw new Error('所有密码尝试均失败');
      }
    }
    
    const token = loginResponse.data.token;
    const userId = loginResponse.data.user.id || loginResponse.data.user.UserID;
    
    console.log(`   ✓ 登录成功`);
    console.log(`   Token: ${token.substring(0, 20)}...`);
    console.log(`   用户ID: ${userId}`);
    console.log(`   用户信息:`, loginResponse.data.user);
    
    // 步骤3: 获取用户完整资料
    console.log('\n3. 获取用户完整资料...');
    const profileResponse = await makeRequest('GET', '/api/auth/profile', null, {
      'Authorization': `Bearer ${token}`
    });
    
    if (profileResponse.status !== 200) {
      throw new Error(`获取用户资料失败: ${profileResponse.status}`);
    }
    
    console.log(`   ✓ 获取用户资料成功`);
    console.log(`   用户资料:`, JSON.stringify(profileResponse.data, null, 2));
    
    // 步骤4: 获取用户角色和权限
    console.log('\n4. 获取用户角色和权限...');
    const permissionsResponse = await makeRequest('GET', `/api/auth/user/${userId}/roles-permissions`, null, {
      'Authorization': `Bearer ${token}`
    });
    
    if (permissionsResponse.status !== 200) {
      throw new Error(`获取权限数据失败: ${permissionsResponse.status}`);
    }
    
    console.log(`   ✓ 获取权限数据成功`);
    const permissionsData = permissionsResponse.data;
    
    console.log('\n=== 权限数据分析 ===');
    console.log(`角色数量: ${permissionsData.roles?.length || 0}`);
    console.log(`菜单权限数量: ${permissionsData.permissions?.menus?.length || 0}`);
    console.log(`部门数量: ${permissionsData.permissions?.departments?.length || 0}`);
    console.log(`操作权限数量: ${permissionsData.permissions?.actions?.length || 0}`);
    
    // 分析角色信息
    if (permissionsData.roles && permissionsData.roles.length > 0) {
      console.log('\n--- 角色信息 ---');
      permissionsData.roles.forEach((role, index) => {
        console.log(`${index + 1}. 角色名: ${role.Name || role.name}, 代码: ${role.Code || role.code}`);
      });
    }
    
    // 分析菜单权限
    if (permissionsData.permissions?.menus && permissionsData.permissions.menus.length > 0) {
      console.log('\n--- 菜单权限分析 ---');
      const menus = permissionsData.permissions.menus;
      
      // 查找admin相关权限
      const adminMenus = menus.filter(menu => {
        const path = menu.path || menu.Path || '';
        const permission = menu.Permission || '';
        return path.includes('admin') || path.includes('system') || permission.includes('admin');
      });
      
      console.log(`Admin相关菜单权限数量: ${adminMenus.length}`);
      if (adminMenus.length > 0) {
        console.log('Admin相关权限详情:');
        adminMenus.forEach((menu, index) => {
          console.log(`  ${index + 1}. 菜单: ${menu.MenuName}, 路径: ${menu.path || menu.Path}, 权限: ${menu.Permission}`);
        });
      }
      
      // 查找按钮级权限（path为null的权限）
      const buttonPermissions = menus.filter(menu => {
        const path = menu.path || menu.Path;
        return !path;
      });
      
      console.log(`按钮级权限数量: ${buttonPermissions.length}`);
      if (buttonPermissions.length > 0) {
        console.log('按钮级权限样本（前5个）:');
        buttonPermissions.slice(0, 5).forEach((menu, index) => {
          console.log(`  ${index + 1}. 菜单: ${menu.MenuName}, 权限: ${menu.Permission}`);
        });
      }
      
      // 检查是否有/admin或/system路径的权限
      const adminPathMenus = menus.filter(menu => {
        const path = menu.path || menu.Path || '';
        return path.startsWith('/admin') || path.startsWith('/system');
      });
      
      console.log(`/admin或/system路径权限数量: ${adminPathMenus.length}`);
      if (adminPathMenus.length > 0) {
        console.log('后台路径权限详情:');
        adminPathMenus.forEach((menu, index) => {
          console.log(`  ${index + 1}. 菜单: ${menu.MenuName}, 路径: ${menu.path || menu.Path}`);
        });
      }
    }
    
    // 步骤5: 模拟前端权限检查逻辑
    console.log('\n=== 模拟前端权限检查 ===');
    
    // 检查是否为管理员
    const isAdmin = permissionsData.roles?.some(role => 
      (role.Name || role.name) === 'admin' || 
      (role.Name || role.name) === '系统管理员'
    );
    console.log(`isAdmin检查结果: ${isAdmin}`);
    
    // 检查hasAnyAdminPermission逻辑
    const menus = permissionsData.permissions?.menus || [];
    const adminRouteRegex = /^\/admin(\/.*)?$/;
    const systemRouteRegex = /^\/system(\/.*)?$/;
    
    const hasAdminMenus = menus.some(menu => {
      const path = menu.path || menu.Path;
      return path && (adminRouteRegex.test(path) || systemRouteRegex.test(path));
    });
    
    const hasButtonPermissions = menus.some(menu => {
      const path = menu.path || menu.Path;
      return !path;
    });
    
    const hasAnyAdminPermission = hasAdminMenus || hasButtonPermissions;
    
    console.log(`hasAdminMenus: ${hasAdminMenus}`);
    console.log(`hasButtonPermissions: ${hasButtonPermissions}`);
    console.log(`hasAnyAdminPermission: ${hasAnyAdminPermission}`);
    
    // 最终权限判断
    const finalPermission = isAdmin || hasAnyAdminPermission;
    console.log(`\n最终权限判断结果: ${finalPermission}`);
    
    if (finalPermission) {
      console.log('✓ zsx用户应该能够看到"登录后台"按钮');
    } else {
      console.log('✗ zsx用户无法看到"登录后台"按钮');
      console.log('\n可能的问题:');
      console.log('1. 用户没有admin角色');
      console.log('2. 用户没有/admin或/system路径的菜单权限');
      console.log('3. 用户没有任何按钮级权限');
      console.log('4. 权限数据结构可能有问题');
    }
    
    console.log('\n=== 测试完成 ===');
    
  } catch (error) {
    console.error('测试过程中发生错误:', error);
  }
}

// 运行测试
testZsxLogin();