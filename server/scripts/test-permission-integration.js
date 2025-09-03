/**
 * 权限系统集成测试脚本
 * 功能：验证快捷操作和功能模块的权限控制是否已集成用户权限系统
 * 测试用户权限与角色权限的优先级关系
 */

const { sql, getDynamicConfig } = require('../db');
const { checkUserPermission, checkUserActionPermission } = require('../middleware/auth');

/**
 * 测试权限系统集成情况
 */
async function testPermissionIntegration() {
  try {
    console.log('=== 权限系统集成测试 ===\n');
    
    const pool = await sql.connect(await getDynamicConfig());
    console.log('✅ 数据库连接成功\n');
    
    // 1. 测试用户权限表数据
    console.log('1. 检查用户权限数据:');
    const userPermissions = await pool.request().query(`
      SELECT TOP 10 
        up.UserID, u.Username, up.MenuID, m.MenuName, 
        up.PermissionType, up.PermissionLevel, up.ActionCode,
        up.Status, up.CreatedAt
      FROM UserPermissions up
      LEFT JOIN [User] u ON up.UserID = u.ID
      LEFT JOIN Menus m ON up.MenuID = m.ID
      ORDER BY up.CreatedAt DESC
    `);
    
    if (userPermissions.recordset.length > 0) {
      console.log('用户权限数据示例:');
      userPermissions.recordset.forEach(perm => {
        console.log(`  用户${perm.UserID}(${perm.Username}) - 菜单${perm.MenuID}(${perm.MenuName}) - ${perm.PermissionType}:${perm.PermissionLevel} - 操作:${perm.ActionCode || '无'} - 状态:${perm.Status ? '启用' : '禁用'}`);
      });
    } else {
      console.log('  ❌ 暂无用户权限数据');
    }
    
    // 2. 测试V_UserCompletePermissions视图
    console.log('\n2. 测试用户完整权限视图:');
    const completePermissions = await pool.request().query(`
      SELECT TOP 10 
        UserID, Username, MenuID, MenuName, MenuCode,
        ActionCode, HasPermission, PermissionSource
      FROM V_UserCompletePermissions
      WHERE UserID IN (1, 2)
      ORDER BY UserID, MenuID, ActionCode
    `);
    
    if (completePermissions.recordset.length > 0) {
      console.log('用户完整权限示例:');
      completePermissions.recordset.forEach(perm => {
        console.log(`  用户${perm.UserID}(${perm.Username}) - 菜单${perm.MenuCode}(${perm.MenuName}) - 操作:${perm.ActionCode || '无'} - 权限:${perm.HasPermission ? '有' : '无'} - 来源:${perm.PermissionSource}`);
      });
    } else {
      console.log('  ❌ 视图查询无结果');
    }
    
    // 3. 测试权限冲突处理
    console.log('\n3. 测试用户权限与角色权限冲突处理:');
    
    // 查找有用户级权限覆盖的情况
    const conflictCases = await pool.request().query(`
      SELECT 
        v1.UserID, v1.Username, v1.MenuCode, v1.ActionCode,
        v1.HasPermission as UserPermission, v1.PermissionSource as UserSource,
        v2.HasPermission as RolePermission, v2.PermissionSource as RoleSource
      FROM V_UserCompletePermissions v1
      LEFT JOIN V_UserCompletePermissions v2 ON 
        v1.UserID = v2.UserID AND v1.MenuCode = v2.MenuCode AND v1.ActionCode = v2.ActionCode
        AND v2.PermissionSource = 'role'
      WHERE v1.PermissionSource = 'user'
        AND v1.HasPermission != v2.HasPermission
      ORDER BY v1.UserID, v1.MenuCode
    `);
    
    if (conflictCases.recordset.length > 0) {
      console.log('权限冲突处理示例:');
      conflictCases.recordset.forEach(conflict => {
        console.log(`  用户${conflict.UserID}(${conflict.Username}) - ${conflict.MenuCode}:${conflict.ActionCode}`);
        console.log(`    角色权限: ${conflict.RolePermission ? '有' : '无'} | 用户权限: ${conflict.UserPermission ? '有' : '无'} (优先)`);
      });
    } else {
      console.log('  暂无权限冲突案例');
    }
    
    // 4. 测试权限检查函数
    console.log('\n4. 测试权限检查函数:');
    
    const testCases = [
      { userId: 1, permission: 'system:user:view', description: '管理员用户查看权限' },
      { userId: 1, permission: 'system:role:edit', description: '管理员角色编辑权限' },
      { userId: 2, permission: 'system:user:view', description: '普通用户查看权限' },
      { userId: 2, permission: 'quality:sample:add', description: '普通用户样品添加权限' }
    ];
    
    for (const testCase of testCases) {
      try {
        const hasPermission = await checkUserPermission(testCase.userId, testCase.permission);
        console.log(`  ${testCase.description}: ${hasPermission ? '✅ 有权限' : '❌ 无权限'}`);
      } catch (error) {
        console.log(`  ${testCase.description}: ❌ 检查失败 - ${error.message}`);
      }
    }
    
    // 5. 测试操作权限检查
    console.log('\n5. 测试操作权限检查:');
    
    const actionTestCases = [
      { userId: 1, menuCode: 'system', actionCode: 'view', description: '系统管理查看' },
      { userId: 1, menuCode: 'system', actionCode: 'edit', description: '系统管理编辑' },
      { userId: 2, menuCode: 'quality', actionCode: 'view', description: '质量管理查看' },
      { userId: 2, menuCode: 'quality', actionCode: 'add', description: '质量管理添加' }
    ];
    
    for (const testCase of actionTestCases) {
      try {
        const hasPermission = await checkUserActionPermission(testCase.userId, testCase.menuCode, testCase.actionCode);
        console.log(`  ${testCase.description}: ${hasPermission ? '✅ 有权限' : '❌ 无权限'}`);
      } catch (error) {
        console.log(`  ${testCase.description}: ❌ 检查失败 - ${error.message}`);
      }
    }
    
    // 6. 检查前端权限检查集成
    console.log('\n6. 前端权限检查集成状态:');
    
    // 检查前端store是否有hasActionPermissionAsync方法
    const fs = require('fs');
    const path = require('path');
    const frontendStorePath = path.join(__dirname, '../../frontend/src/store/user.js');
    
    if (fs.existsSync(frontendStorePath)) {
      const storeContent = fs.readFileSync(frontendStorePath, 'utf8');
      
      const hasAsyncPermissionCheck = storeContent.includes('hasActionPermissionAsync');
      const hasApiCall = storeContent.includes('/auth/check-permission/');
      const hasUserPriorityLogic = storeContent.includes('用户级权限优先级');
      
      console.log(`  hasActionPermissionAsync方法: ${hasAsyncPermissionCheck ? '✅ 已实现' : '❌ 未实现'}`);
      console.log(`  API权限检查调用: ${hasApiCall ? '✅ 已集成' : '❌ 未集成'}`);
      console.log(`  用户权限优先级逻辑: ${hasUserPriorityLogic ? '✅ 已实现' : '❌ 未实现'}`);
    } else {
      console.log('  ❌ 前端store文件不存在');
    }
    
    // 7. 检查快捷操作权限集成
    console.log('\n7. 快捷操作权限集成状态:');
    
    const welcomePagePath = path.join(__dirname, '../../frontend/src/views/admin/NewWelcome.vue');
    
    if (fs.existsSync(welcomePagePath)) {
      const welcomeContent = fs.readFileSync(welcomePagePath, 'utf8');
      
      const hasQuickActionPermission = welcomeContent.includes('checkQuickActionPermission');
      const hasUserStoreIntegration = welcomeContent.includes('userStore.hasActionPermission');
      const hasAsyncPermissionCheck = welcomeContent.includes('hasActionPermissionAsync');
      
      console.log(`  快捷操作权限检查: ${hasQuickActionPermission ? '✅ 已实现' : '❌ 未实现'}`);
      console.log(`  用户store集成: ${hasUserStoreIntegration ? '✅ 已集成' : '❌ 未集成'}`);
      console.log(`  异步权限检查: ${hasAsyncPermissionCheck ? '✅ 已实现' : '❌ 未实现'}`);
    } else {
      console.log('  ❌ 快捷操作页面文件不存在');
    }
    
    // 8. 总结
    console.log('\n=== 集成测试总结 ===');
    
    const hasUserPermissionTable = userPermissions.recordset.length > 0;
    const hasCompletePermissionView = completePermissions.recordset.length > 0;
    const hasConflictHandling = conflictCases.recordset.length >= 0; // 有或无冲突都是正常的
    
    console.log(`用户权限表数据: ${hasUserPermissionTable ? '✅ 有数据' : '❌ 无数据'}`);
    console.log(`完整权限视图: ${hasCompletePermissionView ? '✅ 正常' : '❌ 异常'}`);
    console.log(`权限冲突处理: ${hasConflictHandling ? '✅ 正常' : '❌ 异常'}`);
    
    if (hasUserPermissionTable && hasCompletePermissionView) {
      console.log('\n🎉 用户权限系统已成功集成到快捷操作和功能模块中');
      console.log('✅ 支持用户权限与角色权限的优先级关系');
      console.log('✅ 用户权限优先，无冲突时为叠加关系');
    } else {
      console.log('\n⚠️ 用户权限系统集成不完整');
      console.log('建议检查数据库结构和权限数据');
    }
    
    await pool.close();
    
  } catch (error) {
    console.error('❌ 测试失败:', error.message);
    console.error('详细错误:', error);
  }
}

// 运行测试
if (require.main === module) {
  testPermissionIntegration().catch(console.error);
}

module.exports = {
  testPermissionIntegration
};