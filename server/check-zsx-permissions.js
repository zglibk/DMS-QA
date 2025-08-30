const sql = require('mssql');
const { getDynamicConfig } = require('./db');

/**
 * 查询zsx用户的完整权限信息
 */
async function checkZsxPermissions() {
    try {
        const pool = await sql.connect(await getDynamicConfig());
        console.log('=== 查询zsx用户完整权限信息 ===');
        
        // 1. 查询用户基本信息
        const userResult = await pool.request()
            .query('SELECT ID, Username FROM [User] WHERE Username = \'zsx\'');
        
        if(userResult.recordset.length === 0) {
            console.log('用户zsx不存在');
            return;
        }
        
        const userId = userResult.recordset[0].ID;
        console.log('用户ID:', userId);
        
        // 2. 查询用户角色
        const roleResult = await pool.request()
            .input('UserId', sql.Int, userId)
            .query(`SELECT r.ID, r.RoleName, r.RoleCode 
                    FROM [UserRoles] ur 
                    JOIN [Roles] r ON ur.RoleID = r.ID 
                    WHERE ur.UserID = @UserId`);
        console.log('用户角色:', roleResult.recordset);
        
        // 3. 查询用户权限
        const permResult = await pool.request()
            .input('UserId', sql.Int, userId)
            .query(`SELECT MenuID, MenuName, Path, Permission 
                    FROM [V_UserCompletePermissions] 
                    WHERE UserID = @UserId AND HasPermission = 1`);
        console.log('用户权限总数:', permResult.recordset.length);
        
        // 4. 筛选Admin相关权限
        const adminPerms = permResult.recordset.filter(p => 
            (p.Path && (p.Path.includes('admin') || p.Path.includes('system'))) || 
            (p.Permission && p.Permission.includes('admin'))
        );
        console.log('Admin相关权限数量:', adminPerms.length);
        console.log('Admin相关权限:', adminPerms);
        
        // 5. 查看按钮级权限
        const buttonPerms = permResult.recordset.filter(p => !p.Path);
        console.log('按钮级权限数量:', buttonPerms.length);
        console.log('按钮级权限样本:', buttonPerms.slice(0, 10));
        
        // 6. 查看菜单级权限
        const menuPerms = permResult.recordset.filter(p => p.Path);
        console.log('菜单级权限数量:', menuPerms.length);
        console.log('菜单级权限样本:', menuPerms.slice(0, 10));
        
        // 7. 检查特定的admin权限
        const specificAdminPerms = permResult.recordset.filter(p => 
            p.Permission && (
                p.Permission.includes('admin:dashboard') ||
                p.Permission.includes('admin:access') ||
                p.Permission === 'admin'
            )
        );
        console.log('特定admin权限:', specificAdminPerms);
        
        await pool.close();
        
    } catch(e) {
        console.error('错误:', e.message);
    }
}

checkZsxPermissions();