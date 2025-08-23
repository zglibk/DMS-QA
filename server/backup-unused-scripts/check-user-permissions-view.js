/**
 * 检查V_UserCompletePermissions视图是否存在
 * 以及查询用户权限数据
 */

const { sql, getDynamicConfig } = require('./db');

async function checkUserPermissionsView() {
  try {
    console.log('正在检查V_UserCompletePermissions视图...');
    
    const pool = await sql.connect(await getDynamicConfig());
    
    // 检查视图是否存在
    const checkViewResult = await pool.request().query(`
      SELECT name 
      FROM sys.views 
      WHERE name = 'V_UserCompletePermissions'
    `);
    
    if (checkViewResult.recordset.length === 0) {
      console.log('❌ V_UserCompletePermissions视图不存在');
      
      // 检查UserPermissions表是否存在
      const checkTableResult = await pool.request().query(`
        SELECT TABLE_NAME 
        FROM INFORMATION_SCHEMA.TABLES 
        WHERE TABLE_NAME = 'UserPermissions'
      `);
      
      if (checkTableResult.recordset.length === 0) {
        console.log('❌ UserPermissions表也不存在');
        console.log('需要先创建用户权限相关的表和视图');
      } else {
        console.log('✅ UserPermissions表存在');
        
        // 查询UserPermissions表中的数据
        const userPermissionsResult = await pool.request().query(`
          SELECT TOP 10 
            up.ID,
            up.UserID,
            u.Username,
            up.MenuID,
            m.MenuCode,
            m.MenuName,
            up.PermissionType,
            up.PermissionLevel,
            up.ActionCode,
            up.Status
          FROM [UserPermissions] up
          LEFT JOIN [User] u ON up.UserID = u.ID
          LEFT JOIN [Menus] m ON up.MenuID = m.ID
          ORDER BY up.ID DESC
        `);
        
        console.log('\n📋 UserPermissions表中的数据:');
        if (userPermissionsResult.recordset.length === 0) {
          console.log('表中没有数据');
        } else {
          userPermissionsResult.recordset.forEach(record => {
            console.log(`ID: ${record.ID}, 用户: ${record.Username}, 菜单: ${record.MenuCode}(${record.MenuName}), 权限类型: ${record.PermissionType}, 权限级别: ${record.PermissionLevel}, 操作: ${record.ActionCode}, 状态: ${record.Status}`);
          });
        }
      }
    } else {
      console.log('✅ V_UserCompletePermissions视图存在');
      
      // 查询视图中的数据
      const viewDataResult = await pool.request().query(`
        SELECT TOP 10 
          UserID,
          Username,
          MenuCode,
          MenuName,
          Permission,
          ActionCode,
          HasPermission,
          PermissionSource
        FROM [V_UserCompletePermissions]
        ORDER BY UserID, MenuCode
      `);
      
      console.log('\n📋 V_UserCompletePermissions视图中的数据:');
      if (viewDataResult.recordset.length === 0) {
        console.log('视图中没有数据');
      } else {
        viewDataResult.recordset.forEach(record => {
          console.log(`用户: ${record.Username}, 菜单: ${record.MenuCode}, 权限: ${record.Permission}, 操作: ${record.ActionCode}, 有权限: ${record.HasPermission}, 来源: ${record.PermissionSource}`);
        });
      }
    }
    
    await pool.close();
    console.log('\n检查完成！');
    
  } catch (error) {
    console.error('检查用户权限视图时出错:', error.message);
    console.error('错误详情:', error);
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  checkUserPermissionsView();
}

module.exports = { checkUserPermissionsView };