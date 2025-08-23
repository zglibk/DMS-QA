/**
 * 修复wxq用户的出版异常新增权限
 * 方案1：给wxq用户添加质量经理角色
 * 方案2：给普通用户角色添加publishing-exceptions-add权限
 */

const { sql, getDynamicConfig } = require('./db');

async function fixWxqPermissions() {
    let pool;
    try {
        console.log('正在连接数据库...');
        pool = await sql.connect(await getDynamicConfig());
        console.log('数据库连接成功');
        
        console.log('\n=== 当前wxq用户的角色配置 ===');
        const currentRoles = await pool.request().query(`
            SELECT 
                ur.UserID,
                ur.RoleID,
                r.RoleName,
                r.Description
            FROM UserRoles ur
            INNER JOIN Roles r ON ur.RoleID = r.ID
            WHERE ur.UserID = 2
        `);
        
        console.log('wxq用户当前角色:');
        currentRoles.recordset.forEach(role => {
            console.log(`- ${role.RoleName} (ID: ${role.RoleID}): ${role.Description}`);
        });
        
        // 方案1：给wxq用户添加质量经理角色（推荐）
        console.log('\n=== 方案1：给wxq用户添加质量经理角色 ===');
        
        // 检查是否已经有质量经理角色
        const hasQualityManager = currentRoles.recordset.some(role => role.RoleID === 4);
        
        if (hasQualityManager) {
            console.log('wxq用户已经有质量经理角色');
        } else {
            console.log('正在给wxq用户添加质量经理角色...');
            
            await pool.request().query(`
                INSERT INTO UserRoles (UserID, RoleID, CreatedAt)
                VALUES (2, 4, GETDATE())
            `);
            
            console.log('✅ 成功给wxq用户添加质量经理角色');
        }
        
        // 验证修复结果
        console.log('\n=== 验证修复结果 ===');
        const verifyResult = await pool.request().query(`
            SELECT 
                UserID, Username, MenuCode, MenuName, 
                PermissionType, HasPermission, PermissionSource
            FROM V_UserCompletePermissions
            WHERE UserID = 2 AND MenuCode = 'publishing-exceptions-add'
        `);
        
        if (verifyResult.recordset.length === 0) {
            console.log('❌ 仍然没有找到publishing-exceptions-add权限');
        } else {
            verifyResult.recordset.forEach(perm => {
                console.log(`✅ 菜单: ${perm.MenuCode}, 权限类型: ${perm.PermissionType}, 有权限: ${perm.HasPermission}, 来源: ${perm.PermissionSource}`);
                if (perm.HasPermission === 1) {
                    console.log('🎉 wxq用户现在有publishing-exceptions-add权限了！');
                } else {
                    console.log('❌ wxq用户仍然没有publishing-exceptions-add权限');
                }
            });
        }
        
        // 显示最终的角色配置
        console.log('\n=== wxq用户最终的角色配置 ===');
        const finalRoles = await pool.request().query(`
            SELECT 
                ur.UserID,
                ur.RoleID,
                r.RoleName,
                r.Description
            FROM UserRoles ur
            INNER JOIN Roles r ON ur.RoleID = r.ID
            WHERE ur.UserID = 2
            ORDER BY ur.RoleID
        `);
        
        console.log('wxq用户最终角色:');
        finalRoles.recordset.forEach(role => {
            console.log(`- ${role.RoleName} (ID: ${role.RoleID}): ${role.Description}`);
        });
        
    } catch (error) {
        console.error('修复权限时出错:', error);
    } finally {
        if (pool) {
            await pool.close();
            console.log('\n数据库连接已关闭');
        }
    }
}

fixWxqPermissions();