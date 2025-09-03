/**
 * 检查用户权限相关表和视图是否存在
 * 功能：验证用户权限系统的数据库结构
 */

const { sql, getDynamicConfig } = require('../db');

/**
 * 检查用户权限表和视图
 */
async function checkUserPermissionTables() {
  try {
    console.log('=== 检查用户权限系统数据库结构 ===\n');
    
    const pool = await sql.connect(await getDynamicConfig());
    console.log('✅ 数据库连接成功\n');
    
    // 1. 检查UserPermissions表
    console.log('1. 检查UserPermissions表:');
    const userPermissionsTable = await pool.request().query(`
      SELECT TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_NAME = 'UserPermissions'
    `);
    
    if (userPermissionsTable.recordset.length > 0) {
      console.log('✅ UserPermissions表存在');
      
      // 查询表结构
      const tableStructure = await pool.request().query(`
        SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_NAME = 'UserPermissions'
        ORDER BY ORDINAL_POSITION
      `);
      
      console.log('表结构:');
      tableStructure.recordset.forEach(col => {
        console.log(`  - ${col.COLUMN_NAME}: ${col.DATA_TYPE} (${col.IS_NULLABLE === 'YES' ? 'NULL' : 'NOT NULL'})`);
      });
      
      // 查询数据量
      const dataCount = await pool.request().query('SELECT COUNT(*) as count FROM UserPermissions');
      console.log(`数据量: ${dataCount.recordset[0].count} 条记录`);
    } else {
      console.log('❌ UserPermissions表不存在');
    }
    
    // 2. 检查UserPermissionHistory表
    console.log('\n2. 检查UserPermissionHistory表:');
    const userPermissionHistoryTable = await pool.request().query(`
      SELECT TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_NAME = 'UserPermissionHistory'
    `);
    
    if (userPermissionHistoryTable.recordset.length > 0) {
      console.log('✅ UserPermissionHistory表存在');
      
      // 查询数据量
      const historyCount = await pool.request().query('SELECT COUNT(*) as count FROM UserPermissionHistory');
      console.log(`数据量: ${historyCount.recordset[0].count} 条记录`);
    } else {
      console.log('❌ UserPermissionHistory表不存在');
    }
    
    // 3. 检查V_UserCompletePermissions视图
    console.log('\n3. 检查V_UserCompletePermissions视图:');
    const userCompletePermissionsView = await pool.request().query(`
      SELECT name 
      FROM sys.views 
      WHERE name = 'V_UserCompletePermissions'
    `);
    
    if (userCompletePermissionsView.recordset.length > 0) {
      console.log('✅ V_UserCompletePermissions视图存在');
      
      // 测试视图查询
      try {
        const viewTest = await pool.request().query(`
          SELECT TOP 5 UserID, Username, MenuID, MenuName, HasPermission, PermissionSource
          FROM V_UserCompletePermissions
          WHERE UserID = 1
        `);
        
        console.log('视图测试查询结果:');
        if (viewTest.recordset.length > 0) {
          viewTest.recordset.forEach(row => {
            console.log(`  用户${row.UserID}(${row.Username}) - 菜单${row.MenuID}(${row.MenuName}) - 权限:${row.HasPermission ? '有' : '无'} - 来源:${row.PermissionSource}`);
          });
        } else {
          console.log('  视图查询无结果');
        }
      } catch (viewError) {
        console.log('❌ 视图查询失败:', viewError.message);
      }
    } else {
      console.log('❌ V_UserCompletePermissions视图不存在');
    }
    
    // 4. 检查现有的权限相关表
    console.log('\n4. 检查现有权限相关表:');
    const existingTables = await pool.request().query(`
      SELECT TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_NAME IN ('User', 'Roles', 'UserRoles', 'Menus', 'RoleMenus')
      ORDER BY TABLE_NAME
    `);
    
    console.log('现有权限相关表:');
    existingTables.recordset.forEach(table => {
      console.log(`  ✅ ${table.TABLE_NAME}`);
    });
    
    // 5. 总结
    console.log('\n=== 检查结果总结 ===');
    const hasUserPermissions = userPermissionsTable.recordset.length > 0;
    const hasUserPermissionHistory = userPermissionHistoryTable.recordset.length > 0;
    const hasCompletePermissionsView = userCompletePermissionsView.recordset.length > 0;
    
    console.log(`UserPermissions表: ${hasUserPermissions ? '✅ 存在' : '❌ 不存在'}`);
    console.log(`UserPermissionHistory表: ${hasUserPermissionHistory ? '✅ 存在' : '❌ 不存在'}`);
    console.log(`V_UserCompletePermissions视图: ${hasCompletePermissionsView ? '✅ 存在' : '❌ 不存在'}`);
    
    if (!hasUserPermissions || !hasCompletePermissionsView) {
      console.log('\n⚠️ 用户权限系统未完全部署');
      console.log('建议执行以下操作:');
      console.log('1. 运行 create-user-permissions-complete.sql 脚本创建用户权限表和视图');
      console.log('2. 或者运行 init.sql 脚本中的用户权限相关部分');
    } else {
      console.log('\n🎉 用户权限系统数据库结构完整');
    }
    
    await pool.close();
    
  } catch (error) {
    console.error('❌ 检查失败:', error.message);
    console.error('详细错误:', error);
  }
}

// 运行检查
if (require.main === module) {
  checkUserPermissionTables().catch(console.error);
}

module.exports = {
  checkUserPermissionTables
};