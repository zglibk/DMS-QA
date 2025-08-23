/**
 * 非管理员用户权限测试脚本
 * 功能：测试非管理员用户的权限分配和检查机制
 */

const { executeQuery } = require('./db');
const sql = require('mssql');

/**
 * 测试非管理员用户权限
 */
async function testNonAdminPermission() {
    console.log('=== 非管理员用户权限测试开始 ===\n');
    
    try {
        // 1. 创建测试用户和角色
        console.log('1. 创建测试用户和角色...');
        
        // 创建测试角色
        const createRoleResult = await executeQuery(async (pool) => {
            return await pool.request()
                .input('roleCode', sql.NVarChar(20), 'test_user')
                .input('roleName', sql.NVarChar(50), '测试普通用户')
                .input('description', sql.NVarChar(500), '用于测试的普通用户角色')
                .query(`
                    IF NOT EXISTS (SELECT 1 FROM Roles WHERE RoleCode = @roleCode)
                    BEGIN
                        INSERT INTO Roles (RoleCode, RoleName, Description, Status, SortOrder)
                        VALUES (@roleCode, @roleName, @description, 1, 100)
                    END
                `);
        });
        
        // 创建测试用户
        const createUserResult = await executeQuery(async (pool) => {
            return await pool.request()
                .input('username', sql.NVarChar(50), 'testuser')
                .input('password', sql.NVarChar(100), '$2b$10$hashedpassword')
                .input('realName', sql.NVarChar(32), '测试用户')
                .query(`
                    IF NOT EXISTS (SELECT 1 FROM [User] WHERE Username = @username)
                    BEGIN
                        INSERT INTO [User] (Username, Password, RealName, Status)
                        VALUES (@username, @password, @realName, 1)
                    END
                `);
        });
        
        // 获取角色和用户ID
        const roleResult = await executeQuery(async (pool) => {
            return await pool.request()
                .input('roleCode', sql.NVarChar(20), 'test_user')
                .query('SELECT ID FROM Roles WHERE RoleCode = @roleCode');
        });
        
        const userResult = await executeQuery(async (pool) => {
            return await pool.request()
                .input('username', sql.NVarChar(50), 'testuser')
                .query('SELECT ID FROM [User] WHERE Username = @username');
        });
        
        if (!roleResult || !userResult || roleResult.recordset.length === 0 || userResult.recordset.length === 0) {
            throw new Error('创建测试用户或角色失败');
        }
        
        const roleId = roleResult.recordset[0].ID;
        const userId = userResult.recordset[0].ID;
        
        // 分配角色给用户
        const assignRoleResult = await executeQuery(async (pool) => {
            return await pool.request()
                .input('userId', sql.Int, userId)
                .input('roleId', sql.Int, roleId)
                .query(`
                    IF NOT EXISTS (SELECT 1 FROM UserRoles WHERE UserID = @userId AND RoleID = @roleId)
                    BEGIN
                        INSERT INTO UserRoles (UserID, RoleID)
                        VALUES (@userId, @roleId)
                    END
                `);
        });
        
        console.log('✓ 测试用户和角色创建完成');
        
        // 2. 查询用户信息和角色
        console.log('\n2. 查询用户信息和角色...');
        const userInfo = await executeQuery(async (pool) => {
            return await pool.request()
                .input('username', sql.NVarChar(50), 'testuser')
                .query(`
                    SELECT u.ID, u.Username, u.RealName
                    FROM [User] u
                    WHERE u.Username = @username
                `);
        });
        
        if (!userInfo || userInfo.recordset.length === 0) {
            throw new Error('未找到测试用户');
        }
        
        const user = userInfo.recordset[0];
        console.log(`✓ 找到用户: ${user.Username} (${user.RealName})`);
        
        // 查询用户角色
        const userRoles = await executeQuery(async (pool) => {
            return await pool.request()
                .input('userId', sql.Int, user.ID)
                .query(`
                    SELECT r.RoleName, r.RoleCode
                    FROM UserRoles ur
                    JOIN Roles r ON ur.RoleID = r.ID
                    WHERE ur.UserID = @userId
                `);
        });
        
        console.log('✓ 用户角色:');
        if (userRoles && userRoles.recordset.length > 0) {
            userRoles.recordset.forEach(role => {
                console.log(`  - ${role.RoleName} (${role.RoleCode})`);
            });
        } else {
            console.log('  - 无角色');
        }
        
        // 3. 检查是否为管理员
        console.log('\n3. 检查是否为管理员...');
        const isAdmin = userRoles && userRoles.recordset.some(role => 
            role.RoleCode === 'admin' || role.RoleName.includes('管理员')
        );
        console.log(`✓ 是否为管理员: ${isAdmin ? '是' : '否'}`);
        
        // 4. 查询出版异常菜单信息
        console.log('\n4. 查询出版异常菜单信息...');
        const menuResult = await executeQuery(async (pool) => {
            return await pool.request()
                .query(`
                    SELECT ID, MenuName, MenuCode, Permission
                    FROM Menus
                    WHERE MenuCode LIKE '%exception%' OR MenuName LIKE '%异常%'
                       OR MenuCode LIKE '%publish%' OR MenuName LIKE '%出版%'
                `);
        });
        
        if (!menuResult) {
            console.log('❌ 菜单查询失败');
            return;
        }
        
        console.log('✓ 出版异常相关菜单:');
        if (menuResult.recordset.length > 0) {
            menuResult.recordset.forEach(menu => {
                console.log(`  - ${menu.MenuName} (${menu.MenuCode}) - 权限: ${menu.Permission}`);
            });
        } else {
            console.log('  - 未找到相关菜单');
        }
        
        // 5. 模拟前端权限检查
        console.log('\n5. 模拟前端权限检查...');
        
        // 模拟 hasRole 方法
        function hasRole(userRoles, targetRole) {
            if (!userRoles || userRoles.length === 0) return false;
            return userRoles.some(role => role.RoleCode === targetRole || role.RoleName === targetRole);
        }
        
        // 模拟 hasActionPermissionAsync 方法
        async function hasActionPermissionAsync(userId, menuCode, action) {
            // 如果是管理员，直接返回 true
            if (isAdmin) return true;
            
            // 查询用户是否有该菜单的权限
            const permissionResult = await executeQuery(async (pool) => {
                return await pool.request()
                    .input('userId', sql.Int, userId)
                    .input('menuCode', sql.NVarChar(50), menuCode)
                    .query(`
                        SELECT COUNT(*) as count
                        FROM UserRoles ur
                        JOIN RoleMenus rm ON ur.RoleID = rm.RoleID
                        JOIN Menus m ON rm.MenuID = m.ID
                        WHERE ur.UserID = @userId AND m.MenuCode = @menuCode
                    `);
            });
            
            return permissionResult && permissionResult.recordset[0].count > 0;
        }
        
        // 模拟 checkPermissions 方法
        async function checkPermissions(userId) {
            const hasAdminRole = hasRole(userRoles?.recordset, 'admin');
            const hasManagerRole = hasRole(userRoles?.recordset, 'manager');
            const hasQualityManagerRole = hasRole(userRoles?.recordset, 'quality_manager');
            
            // 检查新增权限
            const hasAddPermission = hasAdminRole || hasManagerRole || hasQualityManagerRole ||
                await hasActionPermissionAsync(userId, 'publish-exception', 'add');
            
            return {
                canAdd: hasAddPermission,
                canEdit: hasAdminRole || hasManagerRole || hasQualityManagerRole,
                canDelete: hasAdminRole || hasManagerRole,
                canView: true // 假设所有用户都可以查看
            };
        }
        
        // 执行权限检查
        const permissions = await checkPermissions(user.ID);
        console.log('✓ 权限检查结果:');
        console.log(`  - 新增权限: ${permissions.canAdd}`);
        console.log(`  - 编辑权限: ${permissions.canEdit}`);
        console.log(`  - 删除权限: ${permissions.canDelete}`);
        console.log(`  - 查看权限: ${permissions.canView}`);
        
        // 6. 模拟 handleAdd 方法的权限检查
        console.log('\n6. 模拟 handleAdd 方法的权限检查...');
        
        function simulateHandleAdd(permissions) {
            if (!permissions.canAdd) {
                console.log('❌ 新增按钮应该被禁用');
                console.log('原因: 用户没有新增权限');
                return false;
            } else {
                console.log('✓ 新增按钮应该被启用');
                console.log('原因: 用户拥有新增权限');
                return true;
            }
        }
        
        const canAdd = simulateHandleAdd(permissions);
        
        // 7. 测试结果总结
        console.log('\n=== 测试结果总结 ===');
        console.log(`用户: ${user.Username} (${user.RealName})`);
        console.log(`角色: ${userRoles?.recordset?.map(r => r.RoleName).join(', ') || '无'}`);
        console.log(`是否为管理员: ${isAdmin}`);
        console.log(`新增权限: ${permissions.canAdd}`);
        console.log(`前端按钮状态: ${canAdd ? '启用' : '禁用'}`);
        
        // 8. 问题分析
        console.log('\n=== 问题分析 ===');
        if (!permissions.canAdd) {
            console.log('✓ 测试符合预期：非管理员用户没有新增权限，按钮被禁用');
        } else {
            console.log('⚠️  需要检查：非管理员用户拥有新增权限，可能存在权限配置问题');
        }
        
        // 9. 清理测试数据
        console.log('\n9. 清理测试数据...');
        await executeQuery(async (pool) => {
            return await pool.request()
                .input('userId', sql.Int, user.ID)
                .query('DELETE FROM UserRoles WHERE UserID = @userId');
        });
        
        await executeQuery(async (pool) => {
            return await pool.request()
                .input('userId', sql.Int, user.ID)
                .query('DELETE FROM [User] WHERE ID = @userId');
        });
        
        await executeQuery(async (pool) => {
            return await pool.request()
                .input('roleCode', sql.NVarChar(20), 'test_user')
                .query('DELETE FROM Roles WHERE RoleCode = @roleCode');
        });
        
        console.log('✓ 测试数据清理完成');
        
    } catch (error) {
        console.error('❌ 测试过程中发生错误:', error.message);
        console.error('错误详情:', error);
    }
    
    console.log('\n=== 非管理员用户权限测试结束 ===');
}

// 运行测试
testNonAdminPermission();