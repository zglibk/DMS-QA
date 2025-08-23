/**
 * 测试用户权限获取API
 * 验证修改后的/auth/user/:userId/roles-permissions接口是否正确返回用户级权限
 */

const axios = require('axios');
const { sql, getDynamicConfig } = require('./db');

/**
 * 测试用户权限获取API
 */
async function testUserPermissionAPI() {
  console.log('=== 测试用户权限获取API ===');
  
  try {
    // 连接数据库
    const pool = await sql.connect(await getDynamicConfig());
    console.log('数据库连接成功');
    
    // 1. 查找测试用户wxq
    console.log('\n1. 查找测试用户wxq:');
    const userResult = await pool.request()
      .input('Username', sql.NVarChar, 'wxq')
      .query('SELECT ID, Username, RealName FROM [User] WHERE Username = @Username');
    
    if (userResult.recordset.length === 0) {
      console.log('❌ 未找到用户wxq');
      return;
    }
    
    const user = userResult.recordset[0];
    console.log(`✅ 找到用户: ${user.RealName} (${user.Username})`);
    
    // 2. 直接查询数据库中的完整权限
    console.log('\n2. 查询数据库中的完整权限:');
    const dbPermissionResult = await pool.request()
      .input('UserId', sql.Int, user.ID)
      .query(`
        SELECT 
          MenuID,
          MenuName,
          MenuCode,
          Permission,
          PermissionSource,
          PermissionType,
          HasPermission
        FROM [V_UserCompletePermissions]
        WHERE UserID = @UserId AND Permission = 'quality:publishing:add'
      `);
    
    console.log('数据库权限查询结果:');
    if (dbPermissionResult.recordset.length > 0) {
      dbPermissionResult.recordset.forEach(perm => {
        console.log(`  - ${perm.MenuName}: ${perm.Permission}`);
        console.log(`    来源: ${perm.PermissionSource}, 类型: ${perm.PermissionType}, 有权限: ${perm.HasPermission}`);
      });
    } else {
      console.log('  ❌ 未找到quality:publishing:add权限');
    }
    
    // 3. 获取验证码
    console.log('\n3. 获取验证码:');
    const captchaResponse = await axios.get('http://localhost:3001/api/auth/captcha');
    const { captchaId, captcha } = captchaResponse.data;
    console.log(`✅ 获取验证码成功: ${captcha}`);
    
    // 4. 模拟登录获取token
    console.log('\n4. 模拟登录获取token:');
    try {
      const loginResponse = await axios.post('http://localhost:3001/api/auth/login', {
        username: 'wxq',
        password: '123456', // 请根据实际密码修改
        captcha: captcha,
        captchaId: captchaId
      });
      
      if (!loginResponse.data.token) {
        console.log('❌ 登录失败，无法获取token');
        console.log('响应:', loginResponse.data);
        return;
      }
      
      const token = loginResponse.data.token;
      console.log('✅ 登录成功，获取到token');
      
      // 4. 测试权限获取API
      console.log('\n4. 测试权限获取API:');
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
        
        // 查找quality:publishing:add权限
        const targetPermission = permissions.find(p => p.Permission === 'quality:publishing:add');
        if (targetPermission) {
          console.log('\n✅ 找到quality:publishing:add权限:');
          console.log(`  菜单名称: ${targetPermission.name}`);
          console.log(`  权限代码: ${targetPermission.Permission}`);
          console.log(`  权限来源: ${targetPermission.PermissionSource || '未知'}`);
          console.log(`  权限类型: ${targetPermission.PermissionType || '未知'}`);
        } else {
          console.log('\n❌ 未找到quality:publishing:add权限');
          console.log('所有权限:');
          permissions.forEach(p => {
            console.log(`  - ${p.name}: ${p.Permission}`);
          });
        }
      } else {
        console.log('❌ API调用失败:', permissionResponse.data.message);
      }
      
    } catch (loginError) {
      console.log('❌ 登录或API调用失败:', loginError.response?.data || loginError.message);
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