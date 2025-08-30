/**
 * 测试用户权限获取API
 * 验证修改后的/auth/user/:userId/roles-permissions接口是否正确返回用户级权限
 */

const axios = require('axios');
const { sql, getDynamicConfig } = require('../db');

/**
 * 测试用户权限获取API
 */
async function testUserPermissionAPI() {
  console.log('=== 测试用户权限获取API ===');
  
  try {
    // 连接数据库
    const pool = await sql.connect(await getDynamicConfig());
    console.log('数据库连接成功');
    
    // 1. 查找测试用户hhl和zsx
    console.log('\n1. 查找测试用户hhl和zsx:');
    const userResult = await pool.request()
      .query('SELECT ID, Username, RealName FROM [User] WHERE Username IN (\'hhl\', \'zsx\') ORDER BY Username');
    
    if (userResult.recordset.length === 0) {
      console.log('❌ 未找到用户hhl或zsx');
      return;
    }
    
    const users = userResult.recordset;
    console.log(`✅ 找到${users.length}个用户:`);
    users.forEach(user => {
      console.log(`  - ${user.RealName} (${user.Username})`);
    });
    
    // 2. 循环检查每个用户的权限
    for (const user of users) {
      console.log(`\n=== 检查用户 ${user.Username} 的权限 ===`);
      
      // 查询数据库中的admin相关权限
      console.log('\n2.1 查询数据库中的admin相关权限:');
      const dbPermissionResult = await pool.request()
        .input('UserId', sql.Int, user.ID)
        .query(`
          SELECT DISTINCT
            v.MenuID,
            v.MenuName,
            v.MenuCode,
            v.Path,
            v.Permission,
            v.PermissionSource,
            v.PermissionType,
            v.HasPermission
          FROM [V_UserCompletePermissions] v
          INNER JOIN [Menus] m ON v.MenuID = m.ID
          WHERE v.UserID = @UserId 
            AND (v.Path LIKE '/admin%' OR v.Permission LIKE '%admin%')
          ORDER BY v.Path
        `);
      
      console.log('数据库admin权限查询结果:');
      if (dbPermissionResult.recordset.length > 0) {
        dbPermissionResult.recordset.forEach(perm => {
          console.log(`  - ${perm.MenuName} (${perm.MenuCode})`);
          console.log(`    路径: ${perm.Path || '无'}`);
          console.log(`    权限: ${perm.Permission}`);
          console.log(`    来源: ${perm.PermissionSource}, 有权限: ${perm.HasPermission}`);
        });
      } else {
        console.log('  ❌ 未找到admin相关权限');
      }
    }
    
    // 3. 测试每个用户的API权限
    for (const user of users) {
      console.log(`\n=== 测试用户 ${user.Username} 的API权限 ===`);
      
      try {
        // 获取验证码
        console.log('\n3.1 获取验证码:');
        const captchaResponse = await axios.get('http://localhost:3001/api/auth/captcha');
        const { captchaId, captcha } = captchaResponse.data;
        console.log(`✅ 获取验证码成功: ${captcha}`);
        
        // 模拟登录获取token
        console.log('\n3.2 模拟登录获取token:');
        const loginResponse = await axios.post('http://localhost:3001/api/auth/login', {
          username: user.Username,
          password: '123456', // 请根据实际密码修改
          captcha: captcha,
          captchaId: captchaId
        });
        
        if (!loginResponse.data.token) {
          console.log('❌ 登录失败，无法获取token');
          console.log('响应:', loginResponse.data);
          continue;
        }
        
        const token = loginResponse.data.token;
        console.log('✅ 登录成功，获取到token');
        
        // 测试权限获取API
        console.log('\n3.3 测试权限获取API:');
        const permissionResponse = await axios.get(
          `http://localhost:3001/api/auth/user/${user.ID}/roles-permissions`,
          {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          }
        );
        
        if (permissionResponse.data.success) {
          const { roles, permissions } = permissionResponse.data.data;
          console.log(`✅ API调用成功`);
          console.log(`角色数量: ${roles.length}`);
          console.log(`权限数量: ${permissions.length}`);
          
          // 查找admin相关权限
          const adminPermissions = permissions.filter(p => 
            (p.path && p.path.startsWith('/admin')) || 
            (p.Permission && p.Permission.includes('admin'))
          );
          
          if (adminPermissions.length > 0) {
            console.log('\n✅ 找到admin相关权限:');
            adminPermissions.forEach(perm => {
              console.log(`  - ${perm.name} (${perm.code})`);
              console.log(`    路径: ${perm.path || '无'}`);
              console.log(`    权限: ${perm.Permission}`);
            });
          } else {
            console.log('\n❌ 未找到admin相关权限');
            console.log('所有权限路径:');
            permissions.forEach(p => {
              if (p.path) {
                console.log(`  - ${p.name}: ${p.path}`);
              }
            });
          }
        } else {
          console.log('❌ API调用失败:', permissionResponse.data.message);
        }
        
      } catch (error) {
        console.log(`❌ 用户 ${user.Username} 测试失败:`, error.response?.data || error.message);
      }
    }
    
    await pool.close();
    console.log('\n数据库连接已关闭');
    
  } catch (error) {
    console.error('测试过程中发生错误:', error.message);
  }
}

// 运行测试
if (require.main === module) {
  testUserPermissionAPI();
}

module.exports = { testUserPermissionAPI };