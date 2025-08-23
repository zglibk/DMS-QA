/**
 * 验证前端权限获取功能
 * 测试修复后的权限是否能被前端正确获取
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
 * 获取验证码
 */
async function getCaptcha() {
    try {
        const response = await axios.get('http://localhost:3001/api/auth/captcha');
        console.log('获取验证码成功:', {
            captchaId: response.data.captchaId,
            hasText: !!response.data.text
        });
        return response.data;
    } catch (error) {
        console.log('验证码API不可用，跳过验证码验证');
        throw new Error('验证码API不可用');
    }
}

/**
 * 模拟用户登录
 */
async function loginUser(username, password) {
    try {
        console.log('=== 用户登录 ===');
        console.log('用户名:', username);
        
        // 尝试获取验证码
        let captchaData;
        try {
            captchaData = await getCaptcha();
        } catch (captchaError) {
            console.log('跳过验证码验证，直接尝试登录');
            // 如果验证码API不可用，尝试不带验证码的登录
            const loginResponse = await axios.post('http://localhost:3001/api/auth/login', {
                username: username,
                password: password
            });
            console.log('登录成功:', loginResponse.data.message);
            return loginResponse.data.token;
        }
        
        // 如果获取到验证码，使用验证码登录
        const loginResponse = await axios.post('http://localhost:3001/api/auth/login', {
            username: username,
            password: password,
            captchaText: captchaData.text,
            captchaId: captchaData.captchaId
        });
        
        console.log('登录成功:', loginResponse.data.message);
        return loginResponse.data.token;
        
    } catch (error) {
        console.error('登录失败:', error.response?.data || error.message);
        throw error;
    }
}

/**
 * 测试权限获取API
 */
async function testPermissionAPIs(token, userId) {
    try {
        console.log('\n=== 测试权限获取API ===');
        
        // 1. 测试用户角色权限API
        console.log('1. 测试用户角色权限API...');
        const rolesResponse = await axios.get(
            `http://localhost:3001/api/auth/user/${userId}/roles-permissions`,
            {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            }
        );
        
        console.log('用户角色权限API返回:', {
            roles: rolesResponse.data.roles?.length || 0,
            permissions: rolesResponse.data.permissions?.length || 0
        });
        
        // 检查是否包含"新增出版异常"权限
        const hasTargetPermission = rolesResponse.data.permissions?.some(p => 
            p.MenuName === '新增出版异常' || p.Action === '新增出版异常'
        );
        console.log('包含"新增出版异常"权限:', hasTargetPermission);
        
        // 2. 测试权限检查API
        console.log('\n2. 测试权限检查API...');
        const checkResponse = await axios.get(
            'http://localhost:3001/api/auth/check-permission/新增出版异常',
            {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            }
        );
        
        console.log('权限检查API结果:', checkResponse.data);
        
        return {
            rolesPermissions: rolesResponse.data,
            permissionCheck: checkResponse.data,
            hasTargetPermission
        };
        
    } catch (error) {
        console.error('API测试失败:', error.response?.data || error.message);
        throw error;
    }
}

/**
 * 验证数据库权限状态
 */
async function verifyDatabasePermission() {
    try {
        console.log('\n=== 验证数据库权限状态 ===');
        
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
 * 主函数
 */
async function main() {
    try {
        console.log('开始验证前端权限获取功能...');
        
        const username = 'wxq';
        const password = '123456';
        const userId = 1;
        
        // 1. 验证数据库权限状态
        const dbStatus = await verifyDatabasePermission();
        
        // 2. 模拟登录
        const token = await loginUser(username, password);
        
        // 3. 测试权限API
        const apiResults = await testPermissionAPIs(token, userId);
        
        // 4. 综合分析
        console.log('\n=== 综合分析结果 ===');
        
        const dbHasPermission = dbStatus.viewPermissions.some(p => p.HasPermission === 1);
        const apiHasPermission = apiResults.permissionCheck.hasPermission;
        
        console.log('数据库权限状态:', dbHasPermission ? '✅ 有权限' : '❌ 无权限');
        console.log('API权限检查结果:', apiHasPermission ? '✅ 有权限' : '❌ 无权限');
        console.log('前端权限获取:', apiResults.hasTargetPermission ? '✅ 能获取到权限' : '❌ 无法获取权限');
        
        if (dbHasPermission && apiHasPermission && apiResults.hasTargetPermission) {
            console.log('\n🎉 权限问题已完全解决！');
            console.log('- 数据库权限状态正确');
            console.log('- 权限检查API正常工作');
            console.log('- 前端能正确获取权限');
            console.log('\n建议用户：');
            console.log('1. 清除浏览器缓存');
            console.log('2. 重新登录系统');
            console.log('3. 刷新权限管理页面');
        } else {
            console.log('\n⚠️  仍存在问题：');
            if (!dbHasPermission) console.log('- 数据库权限状态异常');
            if (!apiHasPermission) console.log('- 权限检查API返回无权限');
            if (!apiResults.hasTargetPermission) console.log('- 前端无法获取到权限');
        }
        
    } catch (error) {
        console.error('验证过程中发生错误:', error);
    }
}

// 运行主函数
if (require.main === module) {
    main();
}

module.exports = { verifyDatabasePermission, testPermissionAPIs, loginUser };