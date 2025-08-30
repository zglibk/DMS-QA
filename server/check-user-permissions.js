const { getConnection } = require('./db');

// 查询用户hhl和zsx的权限信息
const checkUserPermissions = async () => {
  let pool = null;
  try {
    pool = await getConnection();
    
    // 查询用户基本信息和角色
    const userRoleQuery = `
      SELECT 
        u.ID as UserID,
        u.Username, 
        u.RealName, 
        r.ID as RoleID,
        r.RoleName, 
         r.RoleCode 
      FROM [User] u 
      LEFT JOIN UserRoles ur ON u.ID = ur.UserID 
       LEFT JOIN Roles r ON ur.RoleID = r.ID 
      WHERE u.Username IN ('hhl', 'zsx') 
      ORDER BY u.Username, r.RoleName
    `;
    
    console.log('=== 用户角色信息 ===');
    const userRoles = await pool.request().query(userRoleQuery);
    console.log(JSON.stringify(userRoles.recordset, null, 2));
    
    // 查询用户菜单权限
    const menuPermissionQuery = `
      SELECT DISTINCT
        u.Username,
        m.ID as MenuID,
        m.MenuName,
         m.Path as MenuPath,
         m.Permission,
         m.MenuCode
      FROM [User] u
      LEFT JOIN UserRoles ur ON u.ID = ur.UserID
       LEFT JOIN RoleMenus rp ON ur.RoleID = rp.RoleID
       LEFT JOIN Menus m ON rp.MenuID = m.ID
      WHERE u.Username IN ('hhl', 'zsx')
        AND m.ID IS NOT NULL
      ORDER BY u.Username, m.Path
    `;
    
    console.log('\n=== 用户菜单权限 ===');
    const menuPermissions = await pool.request().query(menuPermissionQuery);
    console.log(JSON.stringify(menuPermissions.recordset, null, 2));
    
    // 查询admin相关的菜单权限
    const adminMenuQuery = `
      SELECT DISTINCT
        u.Username,
        m.ID as MenuID,
        m.MenuName,
         m.Path as MenuPath,
         m.Permission,
         m.MenuCode
       FROM [User] u
       LEFT JOIN UserRoles ur ON u.ID = ur.UserID
        LEFT JOIN RoleMenus rp ON ur.RoleID = rp.RoleID
        LEFT JOIN Menus m ON rp.MenuID = m.ID
       WHERE u.Username IN ('hhl', 'zsx')
         AND m.Path LIKE '/admin%'
      ORDER BY u.Username, m.Path
    `;
    
    console.log('\n=== Admin相关菜单权限 ===');
    const adminMenus = await pool.request().query(adminMenuQuery);
    console.log(JSON.stringify(adminMenus.recordset, null, 2));
    
    // 查询UserPermissions表中的权限
    const userPermissionsQuery = `
      SELECT 
        u.Username,
        up.ID as PermissionID,
        m.ID as MenuID,
        m.MenuName,
        m.Path as MenuPath,
        m.Permission,
        up.PermissionType,
        up.PermissionLevel,
        up.ActionCode,
        up.Status,
        up.GrantedAt
      FROM [User] u
      INNER JOIN [UserPermissions] up ON u.ID = up.UserID
      INNER JOIN [Menus] m ON up.MenuID = m.ID
      WHERE u.Username IN ('hhl', 'zsx')
        AND up.Status = 1
        AND (up.ExpiresAt IS NULL OR up.ExpiresAt > GETDATE())
      ORDER BY u.Username, m.MenuName
    `;
    
    console.log('\n=== UserPermissions表中的权限 ===');
    const userPermissions = await pool.request().query(userPermissionsQuery);
    console.log(JSON.stringify(userPermissions.recordset, null, 2));
    
    // 查询admin相关的UserPermissions
    const adminUserPermissionsQuery = `
      SELECT 
        u.Username,
        up.ID as PermissionID,
        m.MenuName,
        m.Path as MenuPath,
        m.Permission,
        up.PermissionType,
        up.PermissionLevel,
        up.ActionCode
      FROM [User] u
      INNER JOIN [UserPermissions] up ON u.ID = up.UserID
      INNER JOIN [Menus] m ON up.MenuID = m.ID
      WHERE u.Username IN ('hhl', 'zsx')
        AND up.Status = 1
        AND (up.ExpiresAt IS NULL OR up.ExpiresAt > GETDATE())
        AND (m.Path LIKE '/admin%' OR m.Permission LIKE '%admin%')
      ORDER BY u.Username, m.MenuName
    `;
    
    console.log('\n=== Admin相关的UserPermissions ===');
    const adminUserPermissions = await pool.request().query(adminUserPermissionsQuery);
    console.log(JSON.stringify(adminUserPermissions.recordset, null, 2));
    
  } catch (error) {
    console.error('查询失败:', error);
  } finally {
    process.exit();
  }
};

checkUserPermissions();