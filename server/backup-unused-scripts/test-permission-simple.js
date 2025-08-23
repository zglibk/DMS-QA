/**
 * 简单的权限测试脚本
 * 使用项目现有的数据库连接方法
 */

const { executeQuery } = require('./db');
const sql = require('mssql');

/**
 * 测试权限检查流程
 */
async function testPermissionFlow() {
  try {
    console.log('=== 权限检查测试 ===');
    
    // 1. 查询测试用户
    console.log('\n1. 查询测试用户...');
    const userResult = await executeQuery(async (pool) => {
      return await pool.request()
        .query(`
          SELECT TOP 1 
            u.ID, u.Username, u.RealName
          FROM [User] u
          WHERE u.Username IN ('admin', 'test', 'wxq')
          ORDER BY 
            CASE 
              WHEN u.Username = 'admin' THEN 1
              WHEN u.Username = 'test' THEN 2
              WHEN u.Username = 'wxq' THEN 3
              ELSE 4
            END
        `);
    });
    
    if (!userResult || userResult.recordset.length === 0) {
      console.log('❌ 未找到测试用户');
      return;
    }
    
    const testUser = userResult.recordset[0];
    console.log('✅ 找到测试用户:', testUser);
    
    // 2. 查询用户角色
    console.log('\n2. 查询用户角色...');
    const roleResult = await executeQuery(async (pool) => {
      return await pool.request()
        .input('UserID', sql.Int, testUser.ID)
        .query(`
          SELECT r.RoleName, r.RoleCode
          FROM [UserRoles] ur
          JOIN [Roles] r ON ur.RoleID = r.ID
          WHERE ur.UserID = @UserID
        `);
    });
    
    const userRoles = roleResult.recordset.map(r => r.RoleName);
    console.log('✅ 用户角色:', userRoles);
    
    // 3. 检查是否为管理员
    const hasAdminRole = userRoles.includes('系统管理员') || 
                        roleResult.recordset.some(r => r.RoleCode === 'admin');
    console.log('✅ 是否为管理员:', hasAdminRole);
    
    // 4. 查询具体权限（如果不是管理员）
    let hasAddPermission = hasAdminRole;
    
    if (!hasAdminRole) {
      console.log('\n3. 查询具体权限...');
      const permissionResult = await executeQuery(async (pool) => {
        return await pool.request()
          .input('UserID', sql.Int, testUser.ID)
          .query(`
            SELECT DISTINCT m.Permission
            FROM [UserRoles] ur
            JOIN [RoleMenus] rm ON ur.RoleID = rm.RoleID
            JOIN [Menus] m ON rm.MenuID = m.ID
            WHERE ur.UserID = @UserID
            AND m.Permission = 'quality:publishing:add'
          `);
      });
      
      hasAddPermission = permissionResult.recordset.length > 0;
      console.log('✅ 是否有新增权限:', hasAddPermission);
      
      if (permissionResult.recordset.length > 0) {
        console.log('✅ 权限详情:', permissionResult.recordset);
      }
    }
    
    // 5. 查询出版异常菜单信息
    console.log('\n4. 查询出版异常菜单信息...');
    const menuResult = await executeQuery(async (pool) => {
      return await pool.request()
        .query(`
          SELECT ID, MenuName, MenuCode, Permission
          FROM [Menus]
          WHERE MenuCode LIKE '%publishing%' OR MenuName LIKE '%出版%'
        `);
    });
    
    console.log('✅ 出版异常相关菜单:', menuResult.recordset);
    
    // 6. 总结测试结果
    console.log('\n=== 测试结果总结 ===');
    console.log('用户:', testUser.Username, '(' + testUser.RealName + ')');
    console.log('角色:', userRoles.join(', '));
    console.log('是否管理员:', hasAdminRole);
    console.log('新增权限:', hasAddPermission);
    console.log('前端按钮状态:', hasAddPermission ? '启用' : '禁用');
    
    if (!hasAddPermission) {
      console.log('\n🔍 问题分析:');
      console.log('1. 用户不是管理员角色');
      console.log('2. 用户没有 quality:publishing:add 权限');
      console.log('3. 需要检查角色权限配置或用户角色分配');
      
      // 查询所有可用权限
      console.log('\n5. 查询用户所有权限...');
      const allPermissionsResult = await executeQuery(async (pool) => {
        return await pool.request()
          .input('UserID', sql.Int, testUser.ID)
          .query(`
            SELECT DISTINCT m.Permission, m.MenuName
            FROM [UserRoles] ur
            JOIN [RoleMenus] rm ON ur.RoleID = rm.RoleID
            JOIN [Menus] m ON rm.MenuID = m.ID
            WHERE ur.UserID = @UserID
            AND m.Permission IS NOT NULL
            ORDER BY m.Permission
          `);
      });
      
      console.log('✅ 用户所有权限:');
      allPermissionsResult.recordset.forEach(p => {
        console.log(`  - ${p.Permission} (${p.MenuName})`);
      });
    }
    
  } catch (error) {
    console.error('❌ 测试过程中发生错误:', error);
  }
}

// 运行测试
testPermissionFlow().then(() => {
  console.log('\n测试完成');
  process.exit(0);
}).catch(error => {
  console.error('测试失败:', error);
  process.exit(1);
});