/**
 * 检查wxq用户的角色和角色权限配置
 * 找出为什么publishing-exceptions-add权限为0
 */

const { sql, getDynamicConfig } = require('./db');

async function checkWxqRolePermissions() {
    let pool;
    try {
        console.log('正在连接数据库...');
        pool = await sql.connect(await getDynamicConfig());
        console.log('数据库连接成功');
        
        // 1. 查询wxq用户的角色
        console.log('\n=== 检查wxq用户的角色 ===');
        const userRolesResult = await pool.request().query(`
            SELECT 
                ur.UserID,
                ur.RoleID,
                r.RoleName,
                r.Description,
                r.Status as RoleStatus
            FROM UserRoles ur
            INNER JOIN Roles r ON ur.RoleID = r.ID
            WHERE ur.UserID = 2
            ORDER BY ur.RoleID
        `);
        
        console.log('wxq用户的角色:');
        if (userRolesResult.recordset.length === 0) {
            console.log('wxq用户没有分配任何角色！');
        } else {
            userRolesResult.recordset.forEach(role => {
                console.log(`角色ID: ${role.RoleID}, 角色名: ${role.RoleName}, 描述: ${role.Description}, 状态: ${role.RoleStatus}`);
            });
        }
        
        // 2. 查询这些角色对publishing-exceptions-add的权限
        console.log('\n=== 检查角色对publishing-exceptions-add的权限 ===');
        const roleMenusResult = await pool.request().query(`
            SELECT 
                rm.RoleID,
                r.RoleName,
                rm.MenuID,
                m.MenuCode,
                m.MenuName,
                1 as PermissionStatus  -- RoleMenus表没有Status字段，存在记录即表示有权限
            FROM RoleMenus rm
            INNER JOIN Roles r ON rm.RoleID = r.ID
            INNER JOIN Menus m ON rm.MenuID = m.ID
            WHERE rm.RoleID IN (
                SELECT RoleID FROM UserRoles WHERE UserID = 2
            )
            AND m.MenuCode = 'publishing-exceptions-add'
            ORDER BY rm.RoleID
        `);
        
        if (roleMenusResult.recordset.length === 0) {
            console.log('wxq用户的角色都没有publishing-exceptions-add权限配置');
        } else {
            roleMenusResult.recordset.forEach(perm => {
                console.log(`角色: ${perm.RoleName} (ID: ${perm.RoleID}), 菜单: ${perm.MenuCode}, 权限状态: ${perm.PermissionStatus}`);
            });
        }
        
        // 3. 查询所有角色对publishing-exceptions-add的权限
        console.log('\n=== 检查所有角色对publishing-exceptions-add的权限 ===');
        const allRoleMenusResult = await pool.request().query(`
            SELECT 
                rm.RoleID,
                r.RoleName,
                rm.MenuID,
                m.MenuCode,
                m.MenuName,
                1 as PermissionStatus  -- RoleMenus表没有Status字段，存在记录即表示有权限
            FROM RoleMenus rm
            INNER JOIN Roles r ON rm.RoleID = r.ID
            INNER JOIN Menus m ON rm.MenuID = m.ID
            WHERE m.MenuCode = 'publishing-exceptions-add'
            ORDER BY rm.RoleID
        `);
        
        if (allRoleMenusResult.recordset.length === 0) {
            console.log('没有任何角色配置了publishing-exceptions-add权限');
        } else {
            allRoleMenusResult.recordset.forEach(perm => {
                console.log(`角色: ${perm.RoleName} (ID: ${perm.RoleID}), 菜单: ${perm.MenuCode}, 权限状态: ${perm.PermissionStatus}`);
            });
        }
        
        // 4. 检查publishing-exceptions-add菜单是否存在
        console.log('\n=== 检查publishing-exceptions-add菜单 ===');
        const menuResult = await pool.request().query(`
            SELECT ID, MenuCode, MenuName, Status, Permission
            FROM Menus
            WHERE MenuCode = 'publishing-exceptions-add'
        `);
        
        if (menuResult.recordset.length === 0) {
            console.log('publishing-exceptions-add菜单不存在！');
        } else {
            menuResult.recordset.forEach(menu => {
                console.log(`菜单ID: ${menu.ID}, 代码: ${menu.MenuCode}, 名称: ${menu.MenuName}, 状态: ${menu.Status}, 权限: ${menu.Permission}`);
            });
        }
        
    } catch (error) {
        console.error('检查权限时出错:', error);
    } finally {
        if (pool) {
            await pool.close();
            console.log('数据库连接已关闭');
        }
    }
}

checkWxqRolePermissions();