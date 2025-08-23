/**
 * 测试完整的权限流程
 * 模拟前端从登录到权限检查的完整流程
 */

const axios = require('axios');
const jwt = require('jsonwebtoken');

/**
 * 模拟用户登录
 */
async function loginUser(username, password) {
    try {
        console.log('=== 模拟用户登录 ===');
        console.log('用户名:', username);
        
        const loginResponse = await axios.post('http://localhost:3001/api/auth/login', {
            username: username,
            password: password
        });
        
        if (loginResponse.data.token) {
            console.log('✅ 登录成功');
            console.log('Token:', loginResponse.data.token.substring(0, 50) + '...');
            return loginResponse.data.token;
        } else {
            throw new Error('登录失败：未获取到token');
        }
        
    } catch (error) {
        console.error('❌ 登录失败:', error.response?.data || error.message);
        throw error;
    }
}

/**
 * 测试权限检查API
 */
async function testPermissionCheckAPI(token, permission) {
    try {
        console.log('\n=== 测试权限检查API ===');
        console.log('检查权限:', permission);
        console.log('请求URL:', `http://localhost:3001/api/auth/check-permission/${encodeURIComponent(permission)}`);
        
        const response = await axios.get(
            `http://localhost:3001/api/auth/check-permission/${encodeURIComponent(permission)}`,
            {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            }
        );
        
        console.log('API响应状态:', response.status);
        console.log('API响应数据:', JSON.stringify(response.data, null, 2));
        
        return response.data;
        
    } catch (error) {
        console.error('❌ 权限检查API失败:');
        console.error('状态码:', error.response?.status);
        console.error('错误信息:', error.response?.data || error.message);
        return { success: false, error: error.message };
    }
}

/**
 * 测试用户角色权限API
 */
async function testUserRolesPermissionsAPI(token, userId) {
    try {
        console.log('\n=== 测试用户角色权限API ===');
        console.log('用户ID:', userId);
        console.log('请求URL:', `http://localhost:3001/api/auth/user/${userId}/roles-permissions`);
        
        const response = await axios.get(
            `http://localhost:3001/api/auth/user/${userId}/roles-permissions`,
            {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            }
        );
        
        console.log('API响应状态:', response.status);
        console.log('API响应数据结构:', {
            success: response.data.success,
            roles: response.data.data?.roles?.length || 0,
            permissions: response.data.data?.permissions?.length || 0
        });
        
        // 检查是否包含目标权限
        const permissions = response.data.data?.permissions || [];
        const targetPermission = permissions.find(p => 
            p.Permission === 'quality:publishing:add' || 
            p.MenuName === '新增出版异常'
        );
        
        console.log('包含目标权限:', targetPermission ? '✅ 是' : '❌ 否');
        if (targetPermission) {
            console.log('权限详情:', targetPermission);
        }
        
        return {
            ...response.data,
            hasTargetPermission: !!targetPermission
        };
        
    } catch (error) {
        console.error('❌ 用户角色权限API失败:');
        console.error('状态码:', error.response?.status);
        console.error('错误信息:', error.response?.data || error.message);
        return { success: false, error: error.message };
    }
}

/**
 * 模拟前端hasActionPermissionAsync方法
 */
async function simulateFrontendPermissionCheck(token, action) {
    try {
        console.log('\n=== 模拟前端权限检查 ===');
        console.log('检查权限:', action);
        
        // 解析token获取用户信息
        const decoded = jwt.decode(token);
        console.log('用户信息:', {
            id: decoded.id,
            username: decoded.username,
            roles: decoded.roles
        });
        
        // 检查是否为管理员
        const isAdmin = decoded.roles && decoded.roles.some(role => 
            role.name === 'admin' || role.name === '系统管理员' ||
            role.Name === 'admin' || role.Name === '系统管理员' ||
            role.code === 'admin' || role.Code === 'admin'
        );
        
        console.log('是否为管理员:', isAdmin);
        
        if (isAdmin) {
            console.log('✅ 管理员用户，直接返回true');
            return true;
        }
        
        // 调用权限检查API
        console.log('调用权限检查API...');
        const response = await axios.get(
            `http://localhost:3001/api/auth/check-permission/${encodeURIComponent(action)}`,
            {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            }
        );
        
        console.log('API调用结果:', response.data);
        
        if (response.data.success) {
            const hasPermission = response.data.data.hasPermission;
            console.log('权限检查结果:', hasPermission ? '✅ 有权限' : '❌ 无权限');
            return hasPermission;
        } else {
            console.log('❌ API调用失败，回退到本地权限检查');
            // 这里应该有本地权限检查的逻辑，但我们先返回false
            return false;
        }
        
    } catch (error) {
        console.error('❌ 前端权限检查失败:', error.response?.data || error.message);
        console.log('回退到本地权限检查...');
        // 实际前端会有本地权限检查的逻辑
        return false;
    }
}

/**
 * 主函数
 */
async function main() {
    try {
        console.log('开始测试完整的权限流程...');
        console.log('目标：模拟wxq用户检查quality:publishing:add权限');
        
        const username = 'wxq';
        const password = '123456';
        const userId = 1;
        const targetPermission = 'quality:publishing:add';
        
        // 1. 模拟登录
        const token = await loginUser(username, password);
        
        // 2. 测试权限检查API
        const permissionCheckResult = await testPermissionCheckAPI(token, targetPermission);
        
        // 3. 测试用户角色权限API
        const rolesPermissionsResult = await testUserRolesPermissionsAPI(token, userId);
        
        // 4. 模拟前端权限检查
        const frontendResult = await simulateFrontendPermissionCheck(token, targetPermission);
        
        // 5. 综合分析
        console.log('\n=== 综合分析结果 ===');
        
        const permissionCheckSuccess = permissionCheckResult.success && permissionCheckResult.data?.hasPermission;
        const rolesPermissionsSuccess = rolesPermissionsResult.success && rolesPermissionsResult.hasTargetPermission;
        
        console.log('权限检查API结果:', permissionCheckSuccess ? '✅ 有权限' : '❌ 无权限');
        console.log('用户角色权限API结果:', rolesPermissionsSuccess ? '✅ 有权限' : '❌ 无权限');
        console.log('前端权限检查结果:', frontendResult ? '✅ 有权限' : '❌ 无权限');
        
        // 6. 问题诊断
        console.log('\n=== 问题诊断 ===');
        
        if (permissionCheckSuccess && frontendResult) {
            console.log('🎉 权限流程完全正常！');
            console.log('前端应该能够启用新增按钮');
            console.log('\n💡 如果前端仍然无法启用按钮，请检查：');
            console.log('1. 浏览器缓存是否已清除');
            console.log('2. 用户是否已重新登录');
            console.log('3. 前端组件是否正确调用了权限检查方法');
            console.log('4. 前端是否有其他权限检查逻辑干扰');
        } else {
            console.log('⚠️  权限流程存在问题：');
            
            if (!permissionCheckSuccess) {
                console.log('❌ 权限检查API返回无权限或失败');
                if (permissionCheckResult.error) {
                    console.log('   错误信息:', permissionCheckResult.error);
                }
            }
            
            if (!rolesPermissionsSuccess) {
                console.log('❌ 用户角色权限API未返回目标权限');
                if (rolesPermissionsResult.error) {
                    console.log('   错误信息:', rolesPermissionsResult.error);
                }
            }
            
            if (!frontendResult) {
                console.log('❌ 前端权限检查返回无权限');
            }
            
            console.log('\n🔧 建议检查：');
            console.log('1. 后端服务是否正常运行');
            console.log('2. 数据库连接是否正常');
            console.log('3. 权限数据是否正确');
            console.log('4. API路由是否正确配置');
        }
        
    } catch (error) {
        console.error('测试过程中发生错误:', error);
    }
}

// 运行主函数
if (require.main === module) {
    main();
}

module.exports = { 
    loginUser, 
    testPermissionCheckAPI, 
    testUserRolesPermissionsAPI, 
    simulateFrontendPermissionCheck 
};