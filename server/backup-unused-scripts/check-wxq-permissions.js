/**
 * 检查wxq用户的出版异常权限配置
 * 查看用户是否具有publishing-exceptions-add权限
 */

const { sql, getDynamicConfig } = require('./db');

async function checkWxqPermissions() {
    let pool;
    try {
        console.log('正在连接数据库...');
        pool = await sql.connect(await getDynamicConfig());
        console.log('数据库连接成功');

        // 检查wxq用户的基本信息
        console.log('\n=== 检查wxq用户基本信息 ===');
        const userResult = await pool.request().query(`
            SELECT ID, Username, Department, RealName, Status 
            FROM [User] 
            WHERE Username = 'wxq'
        `);
        console.log('wxq用户信息:', userResult.recordset);

        if (userResult.recordset.length === 0) {
            console.log('未找到wxq用户');
            return;
        }

        const userId = userResult.recordset[0].ID;
        console.log('wxq用户ID:', userId);

        // 检查wxq用户通过V_UserCompletePermissions视图的权限
        console.log('\n=== 检查wxq用户的完整权限 ===');
        const viewPermResult = await pool.request().query(`
            SELECT 
                UserID, Username, MenuCode, MenuName, 
                PermissionType, HasPermission, ActionCode
            FROM V_UserCompletePermissions
            WHERE UserID = ${userId}
            AND MenuCode LIKE '%publishing%'
            ORDER BY MenuCode
        `);
        
        console.log('wxq用户的出版异常相关权限:');
        if (viewPermResult.recordset.length === 0) {
            console.log('没有找到出版异常相关权限');
        } else {
            viewPermResult.recordset.forEach(perm => {
                console.log(`菜单: ${perm.MenuCode} (${perm.MenuName}), 权限类型: ${perm.PermissionType}, 有权限: ${perm.HasPermission}, 操作: ${perm.ActionCode}`);
            });
        }

        // 特别检查publishing-exceptions-add权限
        console.log('\n=== 检查publishing-exceptions-add权限 ===');
        const addPermResult = await pool.request().query(`
            SELECT 
                UserID, Username, MenuCode, MenuName, 
                PermissionType, HasPermission, ActionCode, PermissionSource
            FROM V_UserCompletePermissions
            WHERE UserID = ${userId}
            AND MenuCode = 'publishing-exceptions-add'
        `);
        
        if (addPermResult.recordset.length === 0) {
            console.log('没有找到publishing-exceptions-add权限配置');
        } else {
            addPermResult.recordset.forEach(perm => {
                console.log(`菜单: ${perm.MenuCode}, 权限类型: ${perm.PermissionType}, 有权限: ${perm.HasPermission}, 来源: ${perm.PermissionSource}`);
            });
        }

    } catch (error) {
        console.error('检查权限时出错:', error);
    } finally {
        if (pool) {
            await pool.close();
        }
        console.log('数据库连接已关闭');
    }
}

checkWxqPermissions();