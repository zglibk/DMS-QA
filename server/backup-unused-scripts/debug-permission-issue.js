const sql = require('mssql');
const { getDynamicConfig } = require('./db');

/**
 * 调试权限问题的脚本
 * 功能：检查权限系统中操作级权限的处理问题
 */
async function debugPermissionIssue() {
  let pool;
  
  try {
    console.log('=== 调试权限系统问题 ===');
    
    // 连接数据库
    pool = await sql.connect(await getDynamicConfig());
    console.log('数据库连接成功');
    
    // 1. 检查wxq用户的UserPermissions表记录
    console.log('\n1. 检查wxq用户在UserPermissions表中的记录:');
    const userPermissionsResult = await pool.request()
      .input('Username', sql.NVarChar, 'wxq')
      .query(`
        SELECT 
          up.ID,
          up.UserId,
          u.Username,
          up.MenuId,
          m.MenuName,
          m.MenuCode,
          up.PermissionType,
          up.PermissionLevel,
          up.ActionCode,
          up.Status,
          up.GrantedAt,
          up.ExpiresAt
        FROM UserPermissions up
        JOIN [User] u ON up.UserId = u.ID
        LEFT JOIN Menus m ON up.MenuId = m.ID
        WHERE u.Username = @Username
        ORDER BY up.ID DESC
      `);
    
    console.log(`找到 ${userPermissionsResult.recordset.length} 条记录:`);
    userPermissionsResult.recordset.forEach(record => {
      console.log(`  ID: ${record.ID}, 菜单: ${record.MenuCode}, 权限类型: ${record.PermissionType}, 权限级别: ${record.PermissionLevel}, 操作代码: ${record.ActionCode}, 状态: ${record.Status}`);
    });
    
    // 2. 检查publishing-exceptions-add菜单的权限配置
    console.log('\n2. 检查publishing-exceptions-add菜单的权限配置:');
    const menuResult = await pool.request()
      .input('MenuCode', sql.NVarChar, 'publishing-exceptions-add')
      .query(`
        SELECT 
          ID,
          MenuName,
          MenuCode,
          Permission,
          ParentID,
          Status
        FROM Menus 
        WHERE MenuCode = @MenuCode
      `);
    
    if (menuResult.recordset.length > 0) {
      const menu = menuResult.recordset[0];
      console.log(`  菜单ID: ${menu.ID}, 菜单名: ${menu.MenuName}, 权限标识: ${menu.Permission}, 状态: ${menu.Status}`);
    } else {
      console.log('  ❌ 未找到publishing-exceptions-add菜单');
    }
    
    // 3. 检查V_UserCompletePermissions视图中wxq用户的权限
    console.log('\n3. 检查V_UserCompletePermissions视图中wxq用户的权限:');
    const viewResult = await pool.request()
      .input('Username', sql.NVarChar, 'wxq')
      .query(`
        SELECT 
          UserID,
          Username,
          MenuID,
          MenuName,
          Permission,
          HasPermission,
          PermissionSource
        FROM V_UserCompletePermissions
        WHERE Username = @Username
          AND Permission LIKE '%publishing%'
        ORDER BY Permission
      `);
    
    console.log(`视图中找到 ${viewResult.recordset.length} 条相关权限记录:`);
    viewResult.recordset.forEach(record => {
      console.log(`  菜单: ${record.MenuName}, 权限: ${record.Permission}, 有权限: ${record.HasPermission}, 来源: ${record.PermissionSource}`);
    });
    
    // 4. 直接查询quality:publishing:add权限
    console.log('\n4. 直接查询quality:publishing:add权限:');
    const directResult = await pool.request()
      .input('Username', sql.NVarChar, 'wxq')
      .input('Permission', sql.NVarChar, 'quality:publishing:add')
      .query(`
        SELECT 
          UserID,
          Username,
          Permission,
          HasPermission,
          PermissionSource
        FROM V_UserCompletePermissions
        WHERE Username = @Username
          AND Permission = @Permission
      `);
    
    console.log(`直接查询结果: ${directResult.recordset.length} 条记录`);
    directResult.recordset.forEach(record => {
      console.log(`  权限: ${record.Permission}, 有权限: ${record.HasPermission}, 来源: ${record.PermissionSource}`);
    });
    
    // 5. 检查视图定义是否包含操作级权限
    console.log('\n5. 检查当前视图定义:');
    const viewDefinitionResult = await pool.request()
      .query(`
        SELECT OBJECT_DEFINITION(OBJECT_ID('V_UserCompletePermissions')) as ViewDefinition
      `);
    
    const viewDefinition = viewDefinitionResult.recordset[0].ViewDefinition;
    console.log('视图定义包含操作级权限处理:', viewDefinition.includes('ActionCode') ? '✅ 是' : '❌ 否');
    console.log('视图定义包含PermissionLevel筛选:', viewDefinition.includes('PermissionLevel') ? '✅ 是' : '❌ 否');
    
    // 6. 测试手动权限查询（模拟正确的权限检查逻辑）
    console.log('\n6. 测试手动权限查询（包含操作级权限）:');
    const manualResult = await pool.request()
      .input('Username', sql.NVarChar, 'wxq')
      .input('Permission', sql.NVarChar, 'quality:publishing:add')
      .query(`
        SELECT COUNT(*) as PermissionCount
        FROM [User] u
        LEFT JOIN UserPermissions up ON u.ID = up.UserId 
          AND up.Status = 1
          AND (up.ExpiresAt IS NULL OR up.ExpiresAt > GETDATE())
        LEFT JOIN Menus m ON up.MenuId = m.ID
        WHERE u.Username = @Username
          AND (
            -- 菜单级权限
            (up.PermissionLevel = 'menu' AND m.Permission = @Permission AND up.PermissionType = 'grant')
            OR
            -- 操作级权限
            (up.PermissionLevel = 'action' AND m.Permission = @Permission AND up.PermissionType = 'grant')
          )
      `);
    
    const hasPermissionManual = manualResult.recordset[0].PermissionCount > 0;
    console.log(`手动查询结果: ${hasPermissionManual ? '有权限' : '无权限'}`);
    
    console.log('\n=== 问题分析 ===');
    console.log('1. V_UserCompletePermissions视图可能只处理菜单级权限');
    console.log('2. 操作级权限（如新增按钮权限）可能没有被正确处理');
    console.log('3. 需要更新视图定义以包含操作级权限');
    
  } catch (error) {
    console.error('调试过程中发生错误:', error.message);
  } finally {
    if (pool) {
      await pool.close();
      console.log('\n数据库连接已关闭');
    }
  }
}

// 运行调试
debugPermissionIssue();