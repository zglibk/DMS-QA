/**
 * 测试前端权限检查完整流程
 * 验证从用户登录到权限检查的整个过程
 */

const axios = require('axios')
const config = require('./config/database')
const sql = require('mssql')

// 配置API基础URL
const API_BASE_URL = 'http://localhost:3000/api'

/**
 * 模拟前端权限检查流程
 */
async function testFrontendPermissionFlow() {
    let pool
    
    try {
        console.log('=== 前端权限检查流程测试 ===')
        
        // 1. 连接数据库
        console.log('\n1. 连接数据库...')
        pool = await sql.connect(config)
        console.log('✅ 数据库连接成功')
        
        // 2. 查询测试用户信息
        console.log('\n2. 查询测试用户信息...')
        const userQuery = `
            SELECT TOP 1 
                u.ID, u.Username, u.RealName, u.Email
            FROM [User] u
            WHERE u.Username IN ('admin', 'test', 'wxq')
            ORDER BY 
                CASE 
                    WHEN u.Username = 'admin' THEN 1
                    WHEN u.Username = 'wxq' THEN 2
                    ELSE 3
                END
        `
        
        const userResult = await pool.request().query(userQuery)
        if (userResult.recordset.length === 0) {
            console.log('❌ 未找到测试用户')
            return
        }
        
        const testUser = userResult.recordset[0]
        
        // 查询用户角色
        const roleQuery = `
            SELECT r.RoleName
            FROM [UserRoles] ur
            JOIN [Roles] r ON ur.RoleID = r.ID
            WHERE ur.UserID = @UserID
        `
        
        const roleResult = await pool.request()
            .input('UserID', sql.Int, testUser.ID)
            .query(roleQuery)
            
        const roles = roleResult.recordset.map(r => r.RoleName)
        testUser.Roles = roles.join(',')
        
        console.log('✅ 找到测试用户:', {
            ID: testUser.ID,
            Username: testUser.Username,
            RealName: testUser.RealName,
            Roles: testUser.Roles
        })
        
        // 3. 模拟用户角色权限检查
        console.log('\n3. 检查用户角色权限...')
        const isAdmin = roles.some(role => 
            ['admin', '系统管理员', '质量经理'].includes(role.trim())
        )
        console.log('用户角色:', roles)
        console.log('是否为管理员角色:', isAdmin)
        
        // 4. 查询用户具体权限
        console.log('\n4. 查询用户具体权限...')
        
        // 4.1 通过V_UserCompletePermissions视图查询
        const permissionQuery = `
            SELECT Permission, HasPermission, PermissionSource
            FROM V_UserCompletePermissions
            WHERE UserID = @UserID
            AND Permission IN (
                'quality:publishing:add',
                'quality:publishing:edit', 
                'quality:publishing:delete',
                'quality:publishing:export'
            )
        `
        
        const permissionResult = await pool.request()
            .input('UserID', sql.Int, testUser.ID)
            .query(permissionQuery)
            
        console.log('✅ 用户权限查询结果:')
        permissionResult.recordset.forEach(perm => {
            console.log(`  - ${perm.Permission}: ${perm.HasPermission ? '有权限' : '无权限'} (来源: ${perm.PermissionSource})`)
        })
        
        // 4.2 如果视图查询失败，尝试角色权限查询
        if (permissionResult.recordset.length === 0) {
            console.log('\n4.2 视图无结果，尝试角色权限查询...')
            const rolePermissionQuery = `
                SELECT DISTINCT m.Permission
                FROM [UserRoles] ur
                JOIN [RoleMenus] rm ON ur.RoleID = rm.RoleID
                JOIN [Menus] m ON rm.MenuID = m.ID
                WHERE ur.UserID = @UserID
                AND m.Permission IN (
                    'quality:publishing:add',
                    'quality:publishing:edit', 
                    'quality:publishing:delete',
                    'quality:publishing:export'
                )
            `
            
            const rolePermResult = await pool.request()
                .input('UserID', sql.Int, testUser.ID)
                .query(rolePermissionQuery)
                
            console.log('✅ 角色权限查询结果:')
            rolePermResult.recordset.forEach(perm => {
                console.log(`  - ${perm.Permission}: 有权限 (来源: 角色权限)`)
            })
        }
        
        // 5. 模拟前端权限检查逻辑
        console.log('\n5. 模拟前端权限检查逻辑...')
        
        // 5.1 模拟hasRole方法
        const hasRole = (roleName) => {
            return roles.some(role => role.trim() === roleName)
        }
        
        // 5.2 模拟hasActionPermissionAsync方法
        const hasActionPermissionAsync = async (permission) => {
            // 模拟API调用
            try {
                const response = await axios.get(`${API_BASE_URL}/auth/check-permission/${permission}`, {
                    headers: {
                        'Authorization': `Bearer fake-token-for-user-${testUser.ID}`
                    }
                })
                return response.data.hasPermission
            } catch (error) {
                console.log(`  权限检查API调用失败 (${permission}):`, error.message)
                return false
            }
        }
        
        // 5.3 模拟checkPermissions方法
        const checkPermissions = async () => {
            const permissions = {
                canAdd: false,
                canEdit: false,
                canDelete: false,
                canExport: false
            }
            
            try {
                console.log('  开始权限检查...')
                
                // 检查是否有管理员角色
                const hasAdminRole = hasRole('admin') || hasRole('系统管理员') || hasRole('质量经理')
                console.log('  管理员角色检查:', hasAdminRole)
                
                if (hasAdminRole) {
                    // 管理员拥有所有权限
                    permissions.canAdd = true
                    permissions.canEdit = true
                    permissions.canDelete = true
                    permissions.canExport = true
                    console.log('  管理员权限设置完成:', permissions)
                } else {
                    // 使用异步权限检查
                    console.log('  开始异步权限检查...')
                    const [addPerm, editPerm, deletePerm, exportPerm] = await Promise.all([
                        hasActionPermissionAsync('quality:publishing:add'),
                        hasActionPermissionAsync('quality:publishing:edit'),
                        hasActionPermissionAsync('quality:publishing:delete'),
                        hasActionPermissionAsync('quality:publishing:export')
                    ])
                    
                    console.log('  权限检查结果:', { addPerm, editPerm, deletePerm, exportPerm })
                    
                    permissions.canAdd = addPerm
                    permissions.canEdit = editPerm
                    permissions.canDelete = deletePerm
                    permissions.canExport = exportPerm
                    console.log('  权限设置完成:', permissions)
                }
            } catch (error) {
                console.error('  权限检查失败:', error.message)
                // 权限检查失败时，回退到角色权限
                const hasAdminRole = hasRole('admin') || hasRole('系统管理员') || hasRole('质量经理')
                permissions.canAdd = hasAdminRole
                permissions.canEdit = hasAdminRole
                permissions.canDelete = hasAdminRole
                permissions.canExport = hasAdminRole
            }
            
            return permissions
        }
        
        // 执行权限检查
        const finalPermissions = await checkPermissions()
        
        // 6. 模拟handleAdd方法的权限检查
        console.log('\n6. 模拟handleAdd方法的权限检查...')
        const canAdd = finalPermissions.canAdd
        
        if (!canAdd) {
            console.log('❌ 权限检查失败: 您没有新增出版异常记录的权限')
        } else {
            console.log('✅ 权限检查通过: 可以新增出版异常记录')
        }
        
        // 7. 总结
        console.log('\n=== 测试总结 ===')
        console.log('用户信息:', {
            Username: testUser.Username,
            RealName: testUser.RealName,
            Roles: testUser.Roles
        })
        console.log('最终权限状态:', finalPermissions)
        console.log('新增按钮状态:', canAdd ? '启用' : '禁用')
        
        // 8. 问题分析
        console.log('\n=== 问题分析 ===')
        if (!canAdd && isAdmin) {
            console.log('⚠️  发现问题: 管理员用户但新增按钮被禁用')
            console.log('可能原因:')
            console.log('1. 角色名称不匹配 (检查数据库中的角色名称)')
            console.log('2. 权限API返回错误结果')
            console.log('3. 前端权限检查逻辑有误')
        } else if (!canAdd && !isAdmin) {
            console.log('ℹ️  正常情况: 非管理员用户且无相关权限')
        } else if (canAdd) {
            console.log('✅ 正常情况: 用户有权限，按钮应该启用')
        }
        
    } catch (error) {
        console.error('❌ 测试过程中发生错误:', error)
    } finally {
        if (pool) {
            try {
                await pool.close()
                console.log('\n数据库连接已关闭')
            } catch (closeError) {
                console.log('关闭数据库连接时出错:', closeError.message)
            }
        }
    }
}

// 运行测试
if (require.main === module) {
    testFrontendPermissionFlow()
        .then(() => {
            console.log('\n测试完成')
            process.exit(0)
        })
        .catch(error => {
            console.error('测试失败:', error)
            process.exit(1)
        })
}

module.exports = { testFrontendPermissionFlow }