/**
 * 权限同步问题分析脚本
 * 功能：对比脚本授权和手动保存的差异，找出权限无法立即生效的根本原因
 * 版本：v1.0
 * 创建日期：2025-01-21
 */

const { sql, getDynamicConfig } = require('../db');

/**
 * 分析权限同步问题的主函数
 */
async function analyzePermissionSyncIssue() {
  console.log('🔍 开始分析权限同步问题...');
  console.log('=' .repeat(60));
  
  let pool;
  try {
    // 连接数据库
    pool = await sql.connect(await getDynamicConfig());
    console.log('✅ 数据库连接成功');
    
    // 1. 分析脚本授权和手动保存的差异
    await analyzePermissionSaveDifference(pool);
    
    // 2. 检查权限缓存机制
    await checkPermissionCacheMechanism(pool);
    
    // 3. 分析前端权限加载流程
    await analyzeFrontendPermissionFlow();
    
    // 4. 提供解决方案
    await provideSolutions();
    
  } catch (error) {
    console.error('❌ 分析过程中发生错误:', error);
  } finally {
    if (pool) {
      await pool.close();
      console.log('\n🔌 数据库连接已关闭');
    }
  }
}

/**
 * 分析脚本授权和手动保存的差异
 */
async function analyzePermissionSaveDifference(pool) {
  console.log('\n📊 1. 分析脚本授权和手动保存的差异');
  console.log('-'.repeat(50));
  
  // 获取测试角色和菜单
  const testRoleResult = await pool.request()
    .query(`
      SELECT TOP 1 ID, RoleName, RoleCode 
      FROM Roles 
      WHERE RoleCode != 'admin' AND Status = 1
      ORDER BY CreatedAt DESC
    `);
  
  if (testRoleResult.recordset.length === 0) {
    console.log('⚠️ 未找到测试角色，跳过差异分析');
    return;
  }
  
  const testRole = testRoleResult.recordset[0];
  console.log(`📋 使用测试角色: ${testRole.RoleName} (${testRole.RoleCode})`);
  
  // 获取一个测试菜单
  const testMenuResult = await pool.request()
    .query(`
      SELECT TOP 1 ID, MenuName, MenuCode 
      FROM Menus 
      WHERE Status = 1 AND Visible = 1 AND MenuType = 'menu'
      ORDER BY ID
    `);
  
  if (testMenuResult.recordset.length === 0) {
    console.log('⚠️ 未找到测试菜单，跳过差异分析');
    return;
  }
  
  const testMenu = testMenuResult.recordset[0];
  console.log(`📋 使用测试菜单: ${testMenu.MenuName} (${testMenu.MenuCode})`);
  
  // 检查当前权限状态
  const currentPermissionResult = await pool.request()
    .input('roleId', sql.Int, testRole.ID)
    .input('menuId', sql.Int, testMenu.ID)
    .query(`
      SELECT COUNT(*) as count, MAX(CreatedAt) as LastCreated
      FROM RoleMenus 
      WHERE RoleID = @roleId AND MenuID = @menuId
    `);
  
  const hasPermission = currentPermissionResult.recordset[0].count > 0;
  console.log(`📊 当前权限状态: ${hasPermission ? '有权限' : '无权限'}`);
  
  if (hasPermission) {
    const lastCreated = currentPermissionResult.recordset[0].LastCreated;
    console.log(`📅 最后授权时间: ${lastCreated}`);
  }
  
  // 模拟脚本授权过程
  console.log('\n🔧 模拟脚本授权过程:');
  await simulateScriptPermissionGrant(pool, testRole.ID, testMenu.ID);
  
  // 模拟手动保存过程
  console.log('\n🔧 模拟手动保存过程:');
  await simulateManualPermissionSave(pool, testRole.ID, testMenu.ID);
}

/**
 * 模拟脚本授权过程
 */
async function simulateScriptPermissionGrant(pool, roleId, menuId) {
  console.log('  📝 脚本授权特点:');
  console.log('    - 直接INSERT INTO RoleMenus');
  console.log('    - 不删除现有权限');
  console.log('    - 可能产生重复记录');
  console.log('    - 不触发前端缓存更新');
  
  // 检查是否已有权限
  const existingResult = await pool.request()
    .input('roleId', sql.Int, roleId)
    .input('menuId', sql.Int, menuId)
    .query('SELECT COUNT(*) as count FROM RoleMenus WHERE RoleID = @roleId AND MenuID = @menuId');
  
  if (existingResult.recordset[0].count > 0) {
    console.log('  ⚠️ 权限已存在，脚本可能会跳过或产生重复记录');
  } else {
    console.log('  ✅ 权限不存在，脚本会直接插入新记录');
  }
  
  // 模拟脚本插入（不实际执行）
  console.log('  🔍 脚本执行的SQL:');
  console.log('    INSERT INTO RoleMenus (RoleID, MenuID, CreatedAt)');
  console.log('    VALUES (@roleId, @menuId, GETDATE())');
}

/**
 * 模拟手动保存过程
 */
async function simulateManualPermissionSave(pool, roleId, menuId) {
  console.log('  📝 手动保存特点:');
  console.log('    - 先DELETE FROM RoleMenus WHERE RoleID = @roleId');
  console.log('    - 再INSERT INTO RoleMenus 所有选中的菜单');
  console.log('    - 使用事务确保数据一致性');
  console.log('    - 前端会重新获取权限数据');
  
  // 检查当前角色的所有权限
  const allPermissionsResult = await pool.request()
    .input('roleId', sql.Int, roleId)
    .query(`
      SELECT COUNT(*) as totalCount
      FROM RoleMenus 
      WHERE RoleID = @roleId
    `);
  
  // 获取菜单ID列表（兼容旧版SQL Server）
  const menuIdsResult = await pool.request()
    .input('roleId', sql.Int, roleId)
    .query(`
      SELECT MenuID
      FROM RoleMenus 
      WHERE RoleID = @roleId
      ORDER BY MenuID
    `);
  
  const totalPermissions = allPermissionsResult.recordset[0].totalCount;
  const menuIds = menuIdsResult.recordset.map(row => row.MenuID).join(',');
  
  console.log(`  📊 当前角色总权限数: ${totalPermissions}`);
  if (totalPermissions > 0) {
    console.log(`  📋 权限菜单ID列表: ${menuIds}`);
  }
  
  console.log('  🔍 手动保存执行的SQL:');
  console.log('    BEGIN TRANSACTION');
  console.log('    DELETE FROM RoleMenus WHERE RoleID = @roleId');
  console.log('    INSERT INTO RoleMenus (RoleID, MenuID, CreatedAt) VALUES ...');
  console.log('    COMMIT TRANSACTION');
}

/**
 * 检查权限缓存机制
 */
async function checkPermissionCacheMechanism(pool) {
  console.log('\n🔄 2. 检查权限缓存机制');
  console.log('-'.repeat(50));
  
  console.log('📋 前端权限缓存层级:');
  console.log('  1. 浏览器 localStorage (持久化)');
  console.log('  2. Pinia store (内存缓存)');
  console.log('  3. Vue组件状态 (临时缓存)');
  
  console.log('\n📋 后端权限查询路径:');
  console.log('  1. /auth/user/:userId/roles-permissions API');
  console.log('  2. V_UserCompletePermissions 视图');
  console.log('  3. RoleMenus + UserPermissions 表');
  
  // 检查视图是否有缓存
  console.log('\n🔍 检查数据库视图缓存:');
  try {
    const viewCacheResult = await pool.request()
      .query(`
        SELECT 
          OBJECT_NAME(object_id) as ViewName,
          name as IndexName,
          type_desc as IndexType
        FROM sys.indexes 
        WHERE object_id = OBJECT_ID('V_UserCompletePermissions')
      `);
    
    if (viewCacheResult.recordset.length > 0) {
      console.log('  📊 视图索引信息:');
      viewCacheResult.recordset.forEach(index => {
        console.log(`    - ${index.IndexName}: ${index.IndexType}`);
      });
    } else {
      console.log('  ⚠️ V_UserCompletePermissions 视图没有索引，可能影响查询性能');
    }
  } catch (error) {
    console.log('  ❌ 无法检查视图索引:', error.message);
  }
}

/**
 * 分析前端权限加载流程
 */
async function analyzeFrontendPermissionFlow() {
  console.log('\n🌐 3. 分析前端权限加载流程');
  console.log('-'.repeat(50));
  
  console.log('📋 前端权限加载时机:');
  console.log('  1. 用户登录时 (login)');
  console.log('  2. 页面刷新时 (router.beforeEach)');
  console.log('  3. Token验证时 (fetchProfile)');
  console.log('  4. 手动刷新时 (refreshMenus)');
  
  console.log('\n📋 权限缓存问题分析:');
  console.log('  ❌ 问题1: 脚本授权后前端缓存未更新');
  console.log('    - localStorage 中的权限数据过期');
  console.log('    - Pinia store 中的权限数据未刷新');
  console.log('    - 组件中的菜单列表未重新渲染');
  
  console.log('\n  ❌ 问题2: 权限分配对话框显示"伪权限"');
  console.log('    - 对话框从数据库实时查询权限');
  console.log('    - 显示的是数据库中的真实权限状态');
  console.log('    - 但前端缓存中的权限数据未同步');
  
  console.log('\n  ❌ 问题3: 手动保存才能生效的原因');
  console.log('    - 手动保存触发前端权限数据重新获取');
  console.log('    - 清除了过期的缓存数据');
  console.log('    - 重新从数据库加载最新权限');
}

/**
 * 提供解决方案
 */
async function provideSolutions() {
  console.log('\n💡 4. 解决方案建议');
  console.log('-'.repeat(50));
  
  console.log('🔧 方案1: 优化脚本授权流程');
  console.log('  - 脚本执行后调用权限刷新API');
  console.log('  - 添加权限变更通知机制');
  console.log('  - 实现权限缓存自动失效');
  
  console.log('\n🔧 方案2: 添加权限刷新API');
  console.log('  - POST /auth/refresh-permissions');
  console.log('  - 清除指定用户的权限缓存');
  console.log('  - 强制重新加载权限数据');
  
  console.log('\n🔧 方案3: 优化前端缓存策略');
  console.log('  - 添加权限数据版本号');
  console.log('  - 实现权限数据增量更新');
  console.log('  - 添加权限变更实时通知');
  
  console.log('\n🔧 方案4: 改进权限分配流程');
  console.log('  - 统一权限保存接口');
  console.log('  - 脚本调用相同的保存逻辑');
  console.log('  - 确保数据一致性和缓存同步');
  
  console.log('\n📋 推荐实施顺序:');
  console.log('  1. 立即实施: 添加权限刷新API');
  console.log('  2. 短期实施: 优化脚本授权流程');
  console.log('  3. 中期实施: 改进前端缓存策略');
  console.log('  4. 长期实施: 统一权限管理架构');
}

// 运行分析
if (require.main === module) {
  analyzePermissionSyncIssue().catch(console.error);
}

module.exports = {
  analyzePermissionSyncIssue
};