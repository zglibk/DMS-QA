/**
 * 检查用户zsx的详细权限设置
 * 查看V_UserCompletePermissions视图中的数据
 */

const sql = require('mssql');
const path = require('path');
const fs = require('fs');

// 动态获取数据库配置
async function getDynamicConfig() {
  const configPath = path.join(__dirname, '..', 'config', 'database.js');
  
  if (fs.existsSync(configPath)) {
    delete require.cache[require.resolve(configPath)];
    const { getDynamicConfig } = require(configPath);
    return await getDynamicConfig();
  } else {
    throw new Error('数据库配置文件不存在');
  }
}

async function checkZsxPermissions() {
  let pool;
  
  try {
    console.log('=== 检查用户zsx的详细权限设置 ===\n');
    
    // 连接数据库
    pool = await sql.connect(await getDynamicConfig());
    console.log('✅ 数据库连接成功\n');
    
    // 1. 查找用户zsx
    console.log('1. 查找用户zsx:');
    const userResult = await pool.request()
      .input('Username', sql.NVarChar, 'zsx')
      .query('SELECT ID, Username, RealName FROM [User] WHERE Username = @Username');
    
    if (userResult.recordset.length === 0) {
      console.log('❌ 用户zsx不存在');
      return;
    }
    
    const user = userResult.recordset[0];
    console.log(`✅ 找到用户: ID=${user.ID}, Username=${user.Username}, RealName=${user.RealName}\n`);
    
    // 2. 查看用户的角色
    console.log('2. 用户角色:');
    const rolesResult = await pool.request()
      .input('UserID', sql.Int, user.ID)
      .query(`
        SELECT r.ID, r.RoleName, r.RoleCode, r.Status
        FROM [UserRoles] ur
        JOIN [Roles] r ON ur.RoleID = r.ID
        WHERE ur.UserID = @UserID
      `);
    
    console.log(`角色数量: ${rolesResult.recordset.length}`);
    rolesResult.recordset.forEach(role => {
      console.log(`  - ${role.RoleName} (${role.RoleCode}) - Status: ${role.Status}`);
    });
    console.log();
    
    // 3. 查看V_UserCompletePermissions视图中的所有权限（不过滤HasPermission）
    console.log('3. V_UserCompletePermissions视图中的所有权限:');
    const allPermissionsResult = await pool.request()
      .input('UserID', sql.Int, user.ID)
      .query(`
        SELECT 
          v.MenuID,
          v.MenuName,
          v.MenuCode,
          v.Path,
          v.Permission,
          v.PermissionSource,
          v.PermissionType,
          v.HasPermission
        FROM [V_UserCompletePermissions] v
        WHERE v.UserID = @UserID
        ORDER BY v.Path
      `);
    
    console.log(`总权限数量: ${allPermissionsResult.recordset.length}`);
    
    // 统计权限状态
    const hasPermissionCount = allPermissionsResult.recordset.filter(p => p.HasPermission === 1).length;
    const noPermissionCount = allPermissionsResult.recordset.filter(p => p.HasPermission === 0).length;
    
    console.log(`  - 有权限 (HasPermission=1): ${hasPermissionCount}`);
    console.log(`  - 无权限 (HasPermission=0): ${noPermissionCount}\n`);
    
    // 4. 显示admin相关权限的详细信息
    console.log('4. admin相关权限详细信息:');
    const adminPermissions = allPermissionsResult.recordset.filter(p => 
      p.Path && p.Path.startsWith('/admin')
    );
    
    console.log(`admin权限数量: ${adminPermissions.length}`);
    adminPermissions.forEach(perm => {
      const status = perm.HasPermission === 1 ? '✅' : '❌';
      console.log(`  ${status} ${perm.Path} - ${perm.MenuName} (${perm.PermissionSource}/${perm.PermissionType})`);
    });
    console.log();
    
    // 5. 检查是否有角色权限或用户权限设置
    console.log('5. 权限来源分析:');
    const rolePermissions = allPermissionsResult.recordset.filter(p => p.PermissionSource === 'Role');
    const userPermissions = allPermissionsResult.recordset.filter(p => p.PermissionSource === 'User');
    
    console.log(`  - 角色权限: ${rolePermissions.length}`);
    console.log(`  - 用户权限: ${userPermissions.length}\n`);
    
    // 6. 检查RoleMenus表（角色菜单关联）
    console.log('6. 检查RoleMenus表:');
    if (rolesResult.recordset.length > 0) {
      const roleIds = rolesResult.recordset.map(r => r.ID);
      const roleMenuResult = await pool.request()
        .query(`
          SELECT rm.RoleID, rm.MenuID, m.MenuName, m.Path, r.RoleName
          FROM [RoleMenus] rm
          JOIN [Menus] m ON rm.MenuID = m.ID
          JOIN [Roles] r ON rm.RoleID = r.ID
          WHERE rm.RoleID IN (${roleIds.join(',')})
          ORDER BY m.Path
        `);
      
      console.log(`角色菜单关联数量: ${roleMenuResult.recordset.length}`);
      const adminRoleMenus = roleMenuResult.recordset.filter(p => 
        p.Path && p.Path.startsWith('/admin')
      );
      console.log(`其中admin相关: ${adminRoleMenus.length}`);
      
      if (adminRoleMenus.length > 0) {
        console.log('admin相关角色菜单:');
        adminRoleMenus.forEach(perm => {
          console.log(`  - ${perm.Path} - ${perm.MenuName} (角色: ${perm.RoleName})`);
        });
      }
    }
    console.log();
    
    // 7. 检查UserPermissions表
    console.log('7. 检查UserPermissions表:');
    const userPermissionsResult = await pool.request()
      .input('UserID', sql.Int, user.ID)
      .query(`
        SELECT up.UserID, up.MenuID, up.PermissionType, m.MenuName, m.Path
        FROM [UserPermissions] up
        JOIN [Menus] m ON up.MenuID = m.ID
        WHERE up.UserID = @UserID
        ORDER BY m.Path
      `);
    
    console.log(`用户权限设置数量: ${userPermissionsResult.recordset.length}`);
    const adminUserPermissions = userPermissionsResult.recordset.filter(p => 
      p.Path && p.Path.startsWith('/admin')
    );
    console.log(`其中admin相关: ${adminUserPermissions.length}`);
    
    if (adminUserPermissions.length > 0) {
      console.log('admin相关用户权限:');
      adminUserPermissions.forEach(perm => {
        console.log(`  - ${perm.Path} - ${perm.MenuName} (${perm.PermissionType})`);
      });
    }
    
    console.log('\n=== 检查完成 ===');
    
  } catch (error) {
    console.error('检查权限时发生错误:', error);
  } finally {
    if (pool) {
      await pool.close();
    }
  }
}

// 运行检查
checkZsxPermissions();