/**
 * 检查用户权限数据脚本
 * 用于调试菜单权限问题
 */
const { sql, getDynamicConfig } = require('./db');

async function checkUserPermissions() {
  try {
    console.log('=== 开始检查用户权限数据 ===');
    
    let pool = await sql.connect(await getDynamicConfig());
    
    // 1. 检查用户表
    console.log('\n1. 检查用户表:');
    const usersResult = await pool.request().query('SELECT ID, Username, RealName FROM [User]');
    console.log('用户数量:', usersResult.recordset.length);
    usersResult.recordset.forEach(user => {
      console.log(`  - ID: ${user.ID}, 用户名: ${user.Username}, 真实姓名: ${user.RealName}`);
    });
    
    // 2. 检查角色表
    console.log('\n2. 检查角色表:');
    const rolesResult = await pool.request().query('SELECT ID, RoleName, RoleCode, Status FROM [Roles]');
    console.log('角色数量:', rolesResult.recordset.length);
    rolesResult.recordset.forEach(role => {
      console.log(`  - ID: ${role.ID}, 角色名: ${role.RoleName}, 代码: ${role.RoleCode}, 状态: ${role.Status}`);
    });
    
    // 3. 检查菜单表
    console.log('\n3. 检查菜单表:');
    const menusResult = await pool.request().query('SELECT ID, MenuName, MenuCode, Path, Status FROM [Menus] ORDER BY SortOrder');
    console.log('菜单数量:', menusResult.recordset.length);
    menusResult.recordset.forEach(menu => {
      console.log(`  - ID: ${menu.ID}, 菜单名: ${menu.MenuName}, 代码: ${menu.MenuCode}, 路径: ${menu.Path}, 状态: ${menu.Status}`);
    });
    
    // 4. 检查用户角色关联表
    console.log('\n4. 检查用户角色关联表:');
    const userRolesResult = await pool.request().query(`
      SELECT ur.UserID, ur.RoleID, u.Username, r.RoleName 
      FROM [UserRoles] ur
      LEFT JOIN [User] u ON ur.UserID = u.ID
      LEFT JOIN [Roles] r ON ur.RoleID = r.ID
    `);
    console.log('用户角色关联数量:', userRolesResult.recordset.length);
    userRolesResult.recordset.forEach(ur => {
      console.log(`  - 用户: ${ur.Username} (ID: ${ur.UserID}) -> 角色: ${ur.RoleName} (ID: ${ur.RoleID})`);
    });
    
    // 5. 检查角色菜单关联表
    console.log('\n5. 检查角色菜单关联表:');
    const roleMenusResult = await pool.request().query(`
      SELECT rm.RoleID, rm.MenuID, r.RoleName, m.MenuName 
      FROM [RoleMenus] rm
      LEFT JOIN [Roles] r ON rm.RoleID = r.ID
      LEFT JOIN [Menus] m ON rm.MenuID = m.ID
    `);
    console.log('角色菜单关联数量:', roleMenusResult.recordset.length);
    roleMenusResult.recordset.forEach(rm => {
      console.log(`  - 角色: ${rm.RoleName} (ID: ${rm.RoleID}) -> 菜单: ${rm.MenuName} (ID: ${rm.MenuID})`);
    });
    
    // 6. 检查特定用户的权限（假设用户ID为1）
    console.log('\n6. 检查用户ID=1的权限:');
    const userPermissionsResult = await pool.request()
      .input('UserId', sql.Int, 1)
      .query(`
        SELECT DISTINCT
          m.ID as id,
          m.MenuName as name,
          m.MenuCode as code,
          m.Path as path,
          m.MenuType as type,
          m.ParentID as parentId,
          m.SortOrder
        FROM [UserRoles] ur
        INNER JOIN [RoleMenus] rm ON ur.RoleID = rm.RoleID
        INNER JOIN [Menus] m ON rm.MenuID = m.ID
        WHERE ur.UserID = @UserId AND m.Status = 1
        ORDER BY m.SortOrder
      `);
    console.log('用户权限菜单数量:', userPermissionsResult.recordset.length);
    userPermissionsResult.recordset.forEach(menu => {
      console.log(`  - 菜单: ${menu.name} (${menu.code}) -> 路径: ${menu.path}`);
    });
    
    console.log('\n=== 检查完成 ===');
    
  } catch (error) {
    console.error('检查用户权限数据时出错:', error);
  } finally {
    sql.close();
  }
}

// 运行检查
checkUserPermissions();