/**
 * 通过用户权限设置给wxq用户添加出版异常新增权限
 * 撤销之前添加的角色，使用用户权限优先级机制
 */

const { sql, getDynamicConfig } = require('./db');

async function fixWxqUserPermissions() {
    let pool;
    try {
        console.log('正在连接数据库...');
        pool = await sql.connect(await getDynamicConfig());
        console.log('数据库连接成功');
        
        // 1. 撤销之前添加的质量经理角色
        console.log('\n=== 撤销wxq用户的质量经理角色 ===');
        const deleteRoleResult = await pool.request().query(`
            DELETE FROM UserRoles 
            WHERE UserID = 2 AND RoleID = 4
        `);
        console.log(`已删除 ${deleteRoleResult.rowsAffected[0]} 条角色记录`);
        
        // 2. 检查publishing-exceptions-add菜单ID
        console.log('\n=== 获取publishing-exceptions-add菜单ID ===');
        const menuResult = await pool.request().query(`
            SELECT ID, MenuCode, MenuName
            FROM Menus
            WHERE MenuCode = 'publishing-exceptions-add'
        `);
        
        if (menuResult.recordset.length === 0) {
            console.log('❌ 找不到publishing-exceptions-add菜单');
            return;
        }
        
        const menuId = menuResult.recordset[0].ID;
        console.log(`菜单ID: ${menuId}, 菜单名称: ${menuResult.recordset[0].MenuName}`);
        
        // 3. 检查是否已存在用户权限记录
        console.log('\n=== 检查现有用户权限 ===');
        const existingPermResult = await pool.request().query(`
            SELECT ID, UserID, MenuID, PermissionType, Status
            FROM UserPermissions
            WHERE UserID = 2 AND MenuID = ${menuId}
        `);
        
        if (existingPermResult.recordset.length > 0) {
            console.log('已存在用户权限记录:');
            existingPermResult.recordset.forEach(perm => {
                console.log(`ID: ${perm.ID}, 权限类型: ${perm.PermissionType}, 状态: ${perm.Status}`);
            });
            
            // 更新现有记录为grant权限
            await pool.request().query(`
                UPDATE UserPermissions 
                SET PermissionType = 'grant', Status = 1, UpdatedAt = GETDATE()
                WHERE UserID = 2 AND MenuID = ${menuId}
            `);
            console.log('✅ 已更新现有权限记录为grant');
        } else {
            // 4. 添加新的用户权限记录
            console.log('\n=== 添加用户权限记录 ===');
            await pool.request().query(`
                INSERT INTO UserPermissions (
                    UserID, MenuID, PermissionType, PermissionLevel, 
                    ActionCode, Status, GrantedBy, GrantedAt, 
                    Reason, CreatedAt, UpdatedAt
                )
                VALUES (
                    2, ${menuId}, 'grant', 'menu',
                    'add', 1, 1, GETDATE(),
                    '用户权限设置：允许wxq用户新增出版异常', GETDATE(), GETDATE()
                )
            `);
            console.log('✅ 已添加用户权限记录');
        }
        
        // 5. 验证最终权限配置
        console.log('\n=== 验证最终权限配置 ===');
        
        // 检查用户角色
        const finalRoles = await pool.request().query(`
            SELECT 
                ur.RoleID,
                r.RoleName
            FROM UserRoles ur
            INNER JOIN Roles r ON ur.RoleID = r.ID
            WHERE ur.UserID = 2
        `);
        
        console.log('wxq用户当前角色:');
        if (finalRoles.recordset.length === 0) {
            console.log('- 无角色');
        } else {
            finalRoles.recordset.forEach(role => {
                console.log(`- ${role.RoleName} (ID: ${role.RoleID})`);
            });
        }
        
        // 检查用户权限
        const userPermissions = await pool.request().query(`
            SELECT 
                up.ID,
                up.UserID,
                m.MenuCode,
                m.MenuName,
                up.PermissionType,
                up.ActionCode,
                up.Status
            FROM UserPermissions up
            INNER JOIN Menus m ON up.MenuID = m.ID
            WHERE up.UserID = 2 AND m.MenuCode = 'publishing-exceptions-add'
        `);
        
        console.log('\nwxq用户的publishing-exceptions-add权限:');
        if (userPermissions.recordset.length === 0) {
            console.log('- 无用户权限设置');
        } else {
            userPermissions.recordset.forEach(perm => {
                console.log(`- 菜单: ${perm.MenuCode}, 权限类型: ${perm.PermissionType}, 操作: ${perm.ActionCode}, 状态: ${perm.Status}`);
            });
        }
        
        // 通过视图验证最终权限
        const finalPermResult = await pool.request().query(`
            SELECT 
                UserID, Username, MenuCode, MenuName, 
                PermissionType, HasPermission, PermissionSource
            FROM V_UserCompletePermissions
            WHERE UserID = 2 AND MenuCode = 'publishing-exceptions-add'
        `);
        
        console.log('\n最终权限验证结果:');
        if (finalPermResult.recordset.length === 0) {
            console.log('❌ 仍然没有找到权限配置');
        } else {
            finalPermResult.recordset.forEach(perm => {
                console.log(`菜单: ${perm.MenuCode}, 权限类型: ${perm.PermissionType}, 有权限: ${perm.HasPermission}, 来源: ${perm.PermissionSource}`);
                if (perm.HasPermission === 1) {
                    console.log('🎉 wxq用户现在通过用户权限设置拥有publishing-exceptions-add权限！');
                } else {
                    console.log('❌ 权限设置失败');
                }
            });
        }
        
    } catch (error) {
        console.error('修复用户权限时出错:', error);
    } finally {
        if (pool) {
            await pool.close();
            console.log('\n数据库连接已关闭');
        }
    }
}

fixWxqUserPermissions();