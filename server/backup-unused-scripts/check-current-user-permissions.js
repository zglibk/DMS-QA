/**
 * 检查当前用户的权限配置
 * 特别是出版异常页面的权限
 */

const { sql, getDynamicConfig } = require('./db');

async function checkCurrentUserPermissions() {
  try {
    console.log('正在检查用户权限配置...');
    
    const pool = await sql.connect(await getDynamicConfig());
    
    // 查询所有用户
    const usersResult = await pool.request().query(`
      SELECT ID, Username, RealName, Status
      FROM [User]
      WHERE Status = 1
      ORDER BY ID
    `);
    
    console.log('\n📋 系统中的用户:');
    usersResult.recordset.forEach(user => {
      console.log(`ID: ${user.ID}, 用户名: ${user.Username}, 真实姓名: ${user.RealName}`);
    });
    
    // 查询出版异常相关的菜单
    const publishingMenuResult = await pool.request().query(`
      SELECT ID, MenuCode, MenuName, Permission, MenuType
      FROM [Menus]
      WHERE MenuCode LIKE '%publishing%' OR MenuName LIKE '%出版%'
      ORDER BY ID
    `);
    
    console.log('\n📋 出版异常相关菜单:');
    if (publishingMenuResult.recordset.length === 0) {
      console.log('没有找到出版异常相关菜单');
    } else {
      publishingMenuResult.recordset.forEach(menu => {
        console.log(`ID: ${menu.ID}, 代码: ${menu.MenuCode}, 名称: ${menu.MenuName}, 权限: ${menu.Permission}, 类型: ${menu.MenuType}`);
      });
    }
    
    // 查询UserPermissions表中的所有数据
    const userPermissionsResult = await pool.request().query(`
      SELECT 
        up.ID,
        up.UserID,
        u.Username,
        up.MenuID,
        m.MenuCode,
        m.MenuName,
        up.PermissionType,
        up.PermissionLevel,
        up.ActionCode,
        up.Status,
        up.GrantedAt,
        up.ExpiresAt
      FROM [UserPermissions] up
      LEFT JOIN [User] u ON up.UserID = u.ID
      LEFT JOIN [Menus] m ON up.MenuID = m.ID
      ORDER BY up.UserID, up.MenuID
    `);
    
    console.log('\n📋 UserPermissions表中的所有数据:');
    if (userPermissionsResult.recordset.length === 0) {
      console.log('UserPermissions表中没有数据');
    } else {
      userPermissionsResult.recordset.forEach(record => {
        const expiresInfo = record.ExpiresAt ? `过期时间: ${record.ExpiresAt}` : '永久有效';
        console.log(`用户: ${record.Username}, 菜单: ${record.MenuCode}(${record.MenuName}), 权限类型: ${record.PermissionType}, 级别: ${record.PermissionLevel}, 操作: ${record.ActionCode}, 状态: ${record.Status}, ${expiresInfo}`);
      });
    }
    
    // 查询非admin用户的完整权限
    const nonAdminPermissionsResult = await pool.request().query(`
      SELECT 
        UserID,
        Username,
        MenuCode,
        MenuName,
        Permission,
        ActionCode,
        HasPermission,
        PermissionSource
      FROM [V_UserCompletePermissions]
      WHERE Username != 'admin'
      ORDER BY UserID, MenuCode
    `);
    
    console.log('\n📋 非admin用户的完整权限:');
    if (nonAdminPermissionsResult.recordset.length === 0) {
      console.log('没有找到非admin用户的权限数据');
    } else {
      nonAdminPermissionsResult.recordset.forEach(record => {
        console.log(`用户: ${record.Username}, 菜单: ${record.MenuCode}, 权限: ${record.Permission}, 操作: ${record.ActionCode}, 有权限: ${record.HasPermission}, 来源: ${record.PermissionSource}`);
      });
    }
    
    // 特别查询出版异常的权限
    const publishingPermissionsResult = await pool.request().query(`
      SELECT 
        UserID,
        Username,
        MenuCode,
        MenuName,
        Permission,
        ActionCode,
        HasPermission,
        PermissionSource
      FROM [V_UserCompletePermissions]
      WHERE MenuCode LIKE '%publishing%' OR Permission LIKE '%publishing%'
      ORDER BY UserID, MenuCode
    `);
    
    console.log('\n📋 出版异常相关权限:');
    if (publishingPermissionsResult.recordset.length === 0) {
      console.log('没有找到出版异常相关权限');
    } else {
      publishingPermissionsResult.recordset.forEach(record => {
        console.log(`用户: ${record.Username}, 菜单: ${record.MenuCode}, 权限: ${record.Permission}, 操作: ${record.ActionCode}, 有权限: ${record.HasPermission}, 来源: ${record.PermissionSource}`);
      });
    }
    
    await pool.close();
    console.log('\n检查完成！');
    
  } catch (error) {
    console.error('检查用户权限时出错:', error.message);
    console.error('错误详情:', error);
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  checkCurrentUserPermissions();
}

module.exports = { checkCurrentUserPermissions };