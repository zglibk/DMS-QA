/**
 * 权限检查API测试脚本
 * 直接测试权限检查API是否能正确返回更新后的权限
 */

const axios = require('axios');
const sql = require('mssql');

// 数据库配置
const dbConfig = {
    server: '192.168.1.57',
    database: 'DMS-QA',
    user: 'sa',
    password: 'Qa369*',
    options: {
        encrypt: false,
        trustServerCertificate: true
    }
};

/**
 * 验证数据库权限状态
 */
async function verifyDatabasePermission() {
    try {
        console.log('=== 验证数据库权限状态 ===');
        
        const pool = await sql.connect(dbConfig);
        
        // 检查UserPermissions表
        const userPerm = await pool.request()
            .query('SELECT * FROM UserPermissions WHERE UserID = 1 AND MenuID = 77');
        
        console.log('UserPermissions表状态:', {
            记录数: userPerm.recordset.length,
            权限类型: userPerm.recordset[0]?.PermissionType,
            状态: userPerm.recordset[0]?.Status
        });
        
        // 检查权限视图
        const viewPerm = await pool.request()
            .query('SELECT * FROM V_UserCompletePermissions WHERE UserID = 1 AND MenuID = 77');
        
        console.log('权限视图状态:', {
            记录数: viewPerm.recordset.length,
            有权限记录数: viewPerm.recordset.filter(p => p.HasPermission === 1).length
        });
        
        // 显示详细权限信息
        if (viewPerm.recordset.length > 0) {
            console.log('权限详情:');
            viewPerm.recordset.forEach((perm, index) => {
                console.log(`  ${index + 1}. ${perm.MenuName} - 有权限: ${perm.HasPermission} - 来源: ${perm.PermissionSource}`);
            });
        }
        
        await pool.close();
        
        return {
            userPermissions: userPerm.recordset,
            viewPermissions: viewPerm.recordset
        };
        
    } catch (error) {
        console.error('数据库验证失败:', error);
        throw error;
    }
}

/**
 * 生成测试用的JWT token
 */
function generateTestToken() {
    const jwt = require('jsonwebtoken');
    const SECRET = 'dms-secret';
    
    // 模拟用户信息
    const user = {
        id: 1,
        username: 'wxq',
        roles: ['user']
    };
    
    // 生成token（2小时有效期）
    const token = jwt.sign(user, SECRET, { expiresIn: '2h' });
    console.log('生成测试token成功');
    
    return token;
}

/**
 * 测试权限检查API
 */
async function testPermissionCheckAPI() {
    try {
        console.log('\n=== 测试权限检查API ===');
        
        // 生成测试token
        const token = generateTestToken();
        
        // 测试权限检查API
        console.log('测试权限: quality:publishing:add');
        
        const checkResponse = await axios.get(
            'http://localhost:3001/api/auth/check-permission/quality:publishing:add',
            {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            }
        );
        
        console.log('权限检查API结果:', checkResponse.data);
        
        return checkResponse.data;
        
    } catch (error) {
        console.error('权限检查API测试失败:', error.response?.data || error.message);
        return { hasPermission: false, error: error.message };
    }
}

/**
 * 测试用户角色权限API
 */
async function testUserRolesPermissionsAPI() {
    try {
        console.log('\n=== 测试用户角色权限API ===');
        
        // 生成测试token
        const token = generateTestToken();
        
        // 测试用户角色权限API
        const rolesResponse = await axios.get(
            'http://localhost:3001/api/auth/user/1/roles-permissions',
            {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            }
        );
        
        console.log('用户角色权限API返回:', {
            success: rolesResponse.data.success,
            roles: rolesResponse.data.data?.roles?.length || 0,
            permissions: rolesResponse.data.data?.permissions?.length || 0
        });
        
        // 检查是否包含"quality:publishing:add"权限
        const permissions = rolesResponse.data.data?.permissions || [];
        const hasTargetPermission = permissions.some(p => 
            p.Permission === 'quality:publishing:add' || p.MenuName === '新增出版异常'
        );
        
        console.log('包含"quality:publishing:add"权限:', hasTargetPermission);
        
        if (hasTargetPermission) {
            const targetPerm = permissions.find(p => 
                p.Permission === 'quality:publishing:add' || p.MenuName === '新增出版异常'
            );
            console.log('权限详情:', targetPerm);
        }
        
        return {
            rolesPermissions: rolesResponse.data,
            hasTargetPermission
        };
        
    } catch (error) {
        console.error('用户角色权限API测试失败:', error.response?.data || error.message);
        return { hasTargetPermission: false, error: error.message };
    }
}

/**
 * 主函数
 */
async function main() {
    try {
        console.log('开始测试权限检查API功能...');
        
        // 1. 验证数据库权限状态
        const dbStatus = await verifyDatabasePermission();
        
        // 2. 测试权限检查API
        const permissionCheck = await testPermissionCheckAPI();
        
        // 3. 测试用户角色权限API
        const rolesPermissions = await testUserRolesPermissionsAPI();
        
        // 4. 综合分析
        console.log('\n=== 综合分析结果 ===');
        
        const dbHasPermission = dbStatus.viewPermissions.some(p => p.HasPermission === 1);
        const apiHasPermission = permissionCheck.data?.hasPermission || false;
        const frontendCanGetPermission = rolesPermissions.hasTargetPermission;
        
        console.log('数据库权限状态:', dbHasPermission ? '✅ 有权限' : '❌ 无权限');
        console.log('权限检查API结果:', apiHasPermission ? '✅ 有权限' : '❌ 无权限');
        console.log('前端权限获取:', frontendCanGetPermission ? '✅ 能获取到权限' : '❌ 无法获取权限');
        
        if (dbHasPermission && apiHasPermission && frontendCanGetPermission) {
            console.log('\n🎉 权限问题已完全解决！');
            console.log('✅ 数据库权限状态正确');
            console.log('✅ 权限检查API正常工作');
            console.log('✅ 前端能正确获取权限');
            console.log('\n💡 用户操作建议：');
            console.log('1. 清除浏览器缓存和Cookie');
            console.log('2. 重新登录系统');
            console.log('3. 刷新权限管理页面');
            console.log('4. 权限设置现在应该能够实时生效');
        } else {
            console.log('\n⚠️  仍存在问题：');
            if (!dbHasPermission) console.log('❌ 数据库权限状态异常');
            if (!apiHasPermission) console.log('❌ 权限检查API返回无权限');
            if (!frontendCanGetPermission) console.log('❌ 前端无法获取到权限');
            
            console.log('\n🔧 建议进一步检查：');
            console.log('1. 检查权限视图V_UserCompletePermissions的定义');
            console.log('2. 检查权限检查API的实现逻辑');
            console.log('3. 检查前端权限获取API的调用');
        }
        
    } catch (error) {
        console.error('测试过程中发生错误:', error);
    }
}

// 运行主函数
if (require.main === module) {
    main();
}

module.exports = { verifyDatabasePermission, testPermissionCheckAPI, testUserRolesPermissionsAPI };