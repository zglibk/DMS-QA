/**
 * 权限缓存问题测试脚本
 * 
 * 功能说明：
 * 1. 模拟通过脚本给角色授权新菜单
 * 2. 测试前端权限检查API的响应
 * 3. 验证V_UserCompletePermissions视图的数据
 * 4. 分析权限缓存不同步的原因
 */

const { sql, getConnection } = require('../db');

/**
 * 测试权限缓存问题的主函数
 */
async function testPermissionCacheIssue() {
  let pool;
  
  try {
    console.log('=== 权限缓存问题测试开始 ===\n');
    
    // 连接数据库
    pool = await getConnection();
    console.log('✅ 数据库连接成功\n');
    
    // 1. 查找测试用户和角色
    console.log('1. 查找测试数据...');
    const testUser = await findTestUser(pool);
    const testRole = await findTestRole(pool);
    const testMenu = await findOrCreateTestMenu(pool);
    
    console.log(`测试用户: ${testUser.Username} (ID: ${testUser.ID})`);
    console.log(`测试角色: ${testRole.RoleName} (ID: ${testRole.ID})`);
    console.log(`测试菜单: ${testMenu.MenuName} (ID: ${testMenu.ID})\n`);
    
    // 2. 检查用户是否有该角色
    await ensureUserHasRole(pool, testUser.ID, testRole.ID);
    
    // 3. 模拟脚本授权：给角色分配新菜单权限
    console.log('3. 模拟脚本授权过程...');
    await simulateScriptAuthorization(pool, testRole.ID, testMenu.ID);
    
    // 4. 检查数据库中的权限数据
    console.log('4. 检查数据库权限数据...');
    await checkDatabasePermissions(pool, testUser.ID, testRole.ID, testMenu.ID);
    
    // 5. 模拟前端权限检查API调用
    console.log('5. 模拟前端权限检查...');
    await simulateFrontendPermissionCheck(pool, testUser.ID, testMenu.Permission);
    
    // 6. 分析权限缓存问题
    console.log('6. 分析权限缓存问题...');
    await analyzePermissionCacheIssue(pool, testUser.ID, testRole.ID, testMenu.ID);
    
    console.log('\n=== 测试完成 ===');
    
  } catch (error) {
    console.error('❌ 测试过程中出现错误:', error);
  } finally {
    if (pool) {
      await pool.close();
      console.log('\n数据库连接已关闭');
    }
  }
}

/**
 * 查找测试用户
 */
async function findTestUser(pool) {
  const result = await pool.request()
    .query(`
      SELECT TOP 1 ID, Username, RealName 
      FROM [User] 
      WHERE Status = 1 AND Username != 'admin'
      ORDER BY ID
    `);
  
  if (result.recordset.length === 0) {
    throw new Error('未找到可用的测试用户');
  }
  
  return result.recordset[0];
}

/**
 * 查找测试角色
 */
async function findTestRole(pool) {
  const result = await pool.request()
    .query(`
      SELECT TOP 1 ID, RoleName, RoleCode 
      FROM [Roles] 
      WHERE Status = 1 AND RoleCode != 'admin'
      ORDER BY ID
    `);
  
  if (result.recordset.length === 0) {
    throw new Error('未找到可用的测试角色');
  }
  
  return result.recordset[0];
}

/**
 * 查找或创建测试菜单
 */
async function findOrCreateTestMenu(pool) {
  // 先查找是否存在测试菜单
  let result = await pool.request()
    .query(`
      SELECT ID, MenuName, MenuCode, Permission 
      FROM [Menus] 
      WHERE MenuCode = 'test-cache-menu' AND Status = 1
    `);
  
  if (result.recordset.length > 0) {
    return result.recordset[0];
  }
  
  // 如果不存在，创建测试菜单
  console.log('创建测试菜单...');
  await pool.request()
    .query(`
      INSERT INTO [Menus] (
        ParentID, MenuCode, MenuName, MenuType, Icon, Path, Component, 
        Permission, SortOrder, Visible, Status, Description
      ) VALUES (
        NULL, 'test-cache-menu', '权限缓存测试菜单', 'menu', 'TestTube', 
        '/test/cache', 'TestCache', 'test:cache:view', 999, 1, 1, 
        '用于测试权限缓存问题的临时菜单'
      )
    `);
  
  // 获取新创建的菜单
  result = await pool.request()
    .query(`
      SELECT ID, MenuName, MenuCode, Permission 
      FROM [Menus] 
      WHERE MenuCode = 'test-cache-menu'
    `);
  
  return result.recordset[0];
}

/**
 * 确保用户拥有指定角色
 */
async function ensureUserHasRole(pool, userId, roleId) {
  const checkResult = await pool.request()
    .input('userId', sql.Int, userId)
    .input('roleId', sql.Int, roleId)
    .query(`
      SELECT COUNT(*) as count 
      FROM [UserRoles] 
      WHERE UserID = @userId AND RoleID = @roleId
    `);
  
  if (checkResult.recordset[0].count === 0) {
    console.log('为用户分配测试角色...');
    await pool.request()
      .input('userId', sql.Int, userId)
      .input('roleId', sql.Int, roleId)
      .query(`
        INSERT INTO [UserRoles] (UserID, RoleID, CreatedAt)
        VALUES (@userId, @roleId, GETDATE())
      `);
  }
}

/**
 * 模拟脚本授权过程
 */
async function simulateScriptAuthorization(pool, roleId, menuId) {
  // 检查是否已经有权限
  const checkResult = await pool.request()
    .input('roleId', sql.Int, roleId)
    .input('menuId', sql.Int, menuId)
    .query(`
      SELECT COUNT(*) as count 
      FROM [RoleMenus] 
      WHERE RoleID = @roleId AND MenuID = @menuId
    `);
  
  if (checkResult.recordset[0].count === 0) {
    console.log('通过脚本给角色分配菜单权限...');
    await pool.request()
      .input('roleId', sql.Int, roleId)
      .input('menuId', sql.Int, menuId)
      .query(`
        INSERT INTO [RoleMenus] (RoleID, MenuID, CreatedAt)
        VALUES (@roleId, @menuId, GETDATE())
      `);
    console.log('✅ 脚本授权完成');
  } else {
    console.log('⚠️ 角色已拥有该菜单权限');
  }
}

/**
 * 检查数据库中的权限数据
 */
async function checkDatabasePermissions(pool, userId, roleId, menuId) {
  // 检查RoleMenus表
  const roleMenuResult = await pool.request()
    .input('roleId', sql.Int, roleId)
    .input('menuId', sql.Int, menuId)
    .query(`
      SELECT rm.*, r.RoleName, m.MenuName, m.Permission
      FROM [RoleMenus] rm
      JOIN [Roles] r ON rm.RoleID = r.ID
      JOIN [Menus] m ON rm.MenuID = m.ID
      WHERE rm.RoleID = @roleId AND rm.MenuID = @menuId
    `);
  
  console.log('RoleMenus表数据:');
  if (roleMenuResult.recordset.length > 0) {
    const record = roleMenuResult.recordset[0];
    console.log(`  ✅ 角色 ${record.RoleName} 拥有菜单 ${record.MenuName} 的权限`);
    console.log(`  权限标识: ${record.Permission}`);
    console.log(`  授权时间: ${record.CreatedAt}`);
  } else {
    console.log('  ❌ 未找到角色菜单权限记录');
  }
  
  // 检查V_UserCompletePermissions视图
  const viewResult = await pool.request()
    .input('userId', sql.Int, userId)
    .input('menuId', sql.Int, menuId)
    .query(`
      SELECT *
      FROM [V_UserCompletePermissions]
      WHERE UserID = @userId AND MenuID = @menuId
    `);
  
  console.log('\nV_UserCompletePermissions视图数据:');
  if (viewResult.recordset.length > 0) {
    const record = viewResult.recordset[0];
    console.log(`  用户: ${record.Username}`);
    console.log(`  菜单: ${record.MenuName}`);
    console.log(`  权限状态: ${record.HasPermission ? '有权限' : '无权限'}`);
    console.log(`  权限来源: ${record.PermissionSource}`);
  } else {
    console.log('  ❌ 视图中未找到权限记录');
  }
}

/**
 * 模拟前端权限检查API调用
 */
async function simulateFrontendPermissionCheck(pool, userId, permission) {
  console.log(`\n模拟前端检查权限: ${permission}`);
  
  // 模拟 /auth/user/:userId/roles-permissions API
  const apiResult = await pool.request()
    .input('userId', sql.Int, userId)
    .query(`
      SELECT 
        u.ID as UserID,
        u.Username,
        r.ID as RoleID,
        r.RoleName,
        m.ID as MenuID,
        m.MenuName,
        m.Permission,
        m.Path
      FROM [User] u
      JOIN [UserRoles] ur ON u.ID = ur.UserID
      JOIN [Roles] r ON ur.RoleID = r.ID
      JOIN [RoleMenus] rm ON r.ID = rm.RoleID
      JOIN [Menus] m ON rm.MenuID = m.ID
      WHERE u.ID = @userId AND u.Status = 1 AND r.Status = 1 AND m.Status = 1
      ORDER BY m.SortOrder
    `);
  
  console.log('API返回的菜单权限:');
  const hasTargetPermission = apiResult.recordset.some(record => record.Permission === permission);
  
  apiResult.recordset.forEach(record => {
    const isTarget = record.Permission === permission;
    console.log(`  ${isTarget ? '🎯' : '  '} ${record.MenuName} (${record.Permission})`);
  });
  
  console.log(`\n目标权限 ${permission}: ${hasTargetPermission ? '✅ 存在' : '❌ 不存在'}`);
  
  return hasTargetPermission;
}

/**
 * 分析权限缓存问题
 */
async function analyzePermissionCacheIssue(pool, userId, roleId, menuId) {
  console.log('\n=== 权限缓存问题分析 ===');
  
  // 1. 检查数据一致性
  console.log('\n1. 数据一致性检查:');
  
  const roleMenuExists = await pool.request()
    .input('roleId', sql.Int, roleId)
    .input('menuId', sql.Int, menuId)
    .query('SELECT COUNT(*) as count FROM [RoleMenus] WHERE RoleID = @roleId AND MenuID = @menuId');
  
  const viewHasPermission = await pool.request()
    .input('userId', sql.Int, userId)
    .input('menuId', sql.Int, menuId)
    .query('SELECT COUNT(*) as count FROM [V_UserCompletePermissions] WHERE UserID = @userId AND MenuID = @menuId AND HasPermission = 1');
  
  console.log(`  RoleMenus表中存在权限记录: ${roleMenuExists.recordset[0].count > 0 ? '是' : '否'}`);
  console.log(`  视图中显示有权限: ${viewHasPermission.recordset[0].count > 0 ? '是' : '否'}`);
  
  // 2. 检查可能的缓存层
  console.log('\n2. 可能的缓存问题:');
  console.log('  - 前端localStorage缓存了旧的权限数据');
  console.log('  - 前端Pinia store中的权限数据未更新');
  console.log('  - 数据库连接池可能有缓存');
  console.log('  - 视图查询结果可能被缓存');
  
  // 3. 解决方案建议
  console.log('\n3. 解决方案建议:');
  console.log('  ✅ 方案1: 权限变更后清除前端缓存');
  console.log('  ✅ 方案2: 实现权限变更通知机制');
  console.log('  ✅ 方案3: 添加强制刷新权限的API');
  console.log('  ✅ 方案4: 优化权限检查逻辑，减少缓存依赖');
  
  // 4. 测试手动保存权限的效果
  console.log('\n4. 模拟手动保存权限操作:');
  console.log('  手动保存权限实际上是重新执行了相同的数据库操作');
  console.log('  这个操作可能触发了前端的权限数据刷新');
  console.log('  建议在权限变更后主动调用前端的权限刷新方法');
}

// 运行测试
if (require.main === module) {
  testPermissionCacheIssue().catch(console.error);
}

module.exports = {
  testPermissionCacheIssue
};