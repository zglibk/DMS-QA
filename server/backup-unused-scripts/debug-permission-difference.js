/**
 * 调试权限设置与权限获取差异的脚本
 * 对比数据库中的权限设置与API返回的权限数据
 */

const sql = require('mssql');
const axios = require('axios');

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
 * 获取数据库中的用户权限设置
 */
async function getDatabasePermissions(userId, menuId) {
    try {
        const pool = await sql.connect(dbConfig);
        
        console.log('\n=== 数据库权限查询 ===');
        
        // 查询用户基本信息
        const userResult = await pool.request()
            .input('userId', sql.Int, userId)
            .query('SELECT * FROM [User] WHERE ID = @userId');
        
        console.log('用户信息:', userResult.recordset[0]);
        
        // 查询菜单信息
        const menuResult = await pool.request()
            .input('menuId', sql.Int, menuId)
            .query('SELECT * FROM Menus WHERE ID = @menuId');
        
        console.log('菜单信息:', menuResult.recordset[0]);
        
        // 查询用户角色
        const roleResult = await pool.request()
            .input('userId', sql.Int, userId)
            .query(`
                SELECT ur.*, r.RoleName 
                FROM UserRoles ur 
                JOIN Roles r ON ur.RoleID = r.ID 
                WHERE ur.UserID = @userId
            `);
        
        console.log('用户角色:', roleResult.recordset);
        
        // 查询角色菜单权限
        const roleMenuResult = await pool.request()
            .input('userId', sql.Int, userId)
            .input('menuId', sql.Int, menuId)
            .query(`
                SELECT rm.*, m.MenuName, r.RoleName
                FROM RoleMenus rm
                JOIN UserRoles ur ON rm.RoleID = ur.RoleID
                JOIN Menus m ON rm.MenuID = m.ID
                JOIN Roles r ON rm.RoleID = r.ID
                WHERE ur.UserID = @userId AND rm.MenuID = @menuId
            `);
        
        console.log('角色菜单权限:', roleMenuResult.recordset);
        
        // 查询用户独立权限
        const userPermResult = await pool.request()
            .input('userId', sql.Int, userId)
            .input('menuId', sql.Int, menuId)
            .query(`
                SELECT * FROM UserPermissions 
                WHERE UserID = @userId AND MenuID = @menuId
            `);
        
        console.log('用户独立权限:', userPermResult.recordset);
        
        // 查询完整权限视图
        const completePermResult = await pool.request()
            .input('userId', sql.Int, userId)
            .input('menuId', sql.Int, menuId)
            .query(`
                SELECT * FROM V_UserCompletePermissions 
                WHERE UserID = @userId AND MenuID = @menuId
            `);
        
        console.log('完整权限视图结果:', completePermResult.recordset);
        
        await pool.close();
        
        return {
            user: userResult.recordset[0],
            menu: menuResult.recordset[0],
            roles: roleResult.recordset,
            roleMenus: roleMenuResult.recordset,
            userPermissions: userPermResult.recordset,
            completePermissions: completePermResult.recordset
        };
        
    } catch (error) {
        console.error('数据库查询错误:', error);
        throw error;
    }
}

/**
 * 获取验证码
 */
async function getCaptcha() {
    try {
        const response = await axios.get('http://localhost:3001/auth/captcha');
        return response.data;
    } catch (error) {
        console.error('获取验证码失败:', error.message);
        return null;
    }
}

/**
 * 模拟用户登录
 */
async function loginUser(username, password) {
    try {
        // 获取验证码
        const captchaData = await getCaptcha();
        if (!captchaData) {
            throw new Error('无法获取验证码');
        }
        
        console.log('\n=== 用户登录 ===');
        console.log('验证码ID:', captchaData.captchaId);
        
        const loginResponse = await axios.post('http://localhost:3001/auth/login', {
            username: username,
            password: password,
            captcha: 'test',
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
 * 获取API返回的用户权限
 */
async function getAPIPermissions(token, userId) {
    try {
        console.log('\n=== API权限查询 ===');
        
        // 获取用户角色和权限
        const permResponse = await axios.get(
            `http://localhost:3001/auth/user/${userId}/roles-permissions`,
            {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            }
        );
        
        console.log('API返回的权限数据:', JSON.stringify(permResponse.data, null, 2));
        
        return permResponse.data;
        
    } catch (error) {
        console.error('API权限查询失败:', error.response?.data || error.message);
        throw error;
    }
}

/**
 * 测试权限检查API
 */
async function testPermissionCheckAPI(token, action) {
    try {
        console.log('\n=== 权限检查API测试 ===');
        console.log('检查权限:', action);
        
        const checkResponse = await axios.get(
            `http://localhost:3001/auth/check-permission/${action}`,
            {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            }
        );
        
        console.log('权限检查结果:', checkResponse.data);
        return checkResponse.data;
        
    } catch (error) {
        console.error('权限检查API失败:', error.response?.data || error.message);
        return { hasPermission: false, error: error.message };
    }
}

/**
 * 主函数
 */
async function main() {
    try {
        const userId = 1; // wxq用户ID
        const menuId = 15; // 新增出版异常菜单ID
        const username = 'wxq';
        const password = '123456';
        const action = '新增出版异常';
        
        console.log('开始调试权限设置与获取的差异...');
        console.log('目标用户:', username, '(ID:', userId, ')');
        console.log('目标菜单ID:', menuId);
        console.log('目标权限:', action);
        
        // 1. 获取数据库中的权限设置
        const dbPermissions = await getDatabasePermissions(userId, menuId);
        
        // 2. 模拟登录获取token
        const token = await loginUser(username, password);
        
        // 3. 获取API返回的权限数据
        const apiPermissions = await getAPIPermissions(token, userId);
        
        // 4. 测试权限检查API
        const permissionCheck = await testPermissionCheckAPI(token, action);
        
        // 5. 对比分析
        console.log('\n=== 权限差异分析 ===');
        
        // 分析数据库权限
        const dbHasPermission = dbPermissions.completePermissions.some(p => p.HasPermission === 1);
        console.log('数据库权限状态:', dbHasPermission ? '有权限' : '无权限');
        
        // 分析API权限
        const apiHasPermission = apiPermissions.permissions && 
            apiPermissions.permissions.some(p => p.MenuName === '新增出版异常' || p.Action === action);
        console.log('API权限状态:', apiHasPermission ? '有权限' : '无权限');
        
        // 分析权限检查API
        console.log('权限检查API状态:', permissionCheck.hasPermission ? '有权限' : '无权限');
        
        // 详细对比
        console.log('\n=== 详细对比 ===');
        console.log('数据库完整权限记录数:', dbPermissions.completePermissions.length);
        console.log('API返回权限记录数:', apiPermissions.permissions ? apiPermissions.permissions.length : 0);
        
        if (dbPermissions.completePermissions.length > 0) {
            console.log('数据库权限详情:');
            dbPermissions.completePermissions.forEach((perm, index) => {
                console.log(`  ${index + 1}. ${perm.MenuName} - 有权限: ${perm.HasPermission} - 来源: ${perm.PermissionSource}`);
            });
        }
        
        if (apiPermissions.permissions && apiPermissions.permissions.length > 0) {
            console.log('API权限详情:');
            apiPermissions.permissions.forEach((perm, index) => {
                console.log(`  ${index + 1}. ${perm.MenuName || perm.Action} - 权限类型: ${perm.PermissionType || 'N/A'}`);
            });
        }
        
        // 问题诊断
        console.log('\n=== 问题诊断 ===');
        if (dbHasPermission && !apiHasPermission) {
            console.log('❌ 问题: 数据库有权限但API未返回权限');
            console.log('可能原因: API查询逻辑问题或权限数据格式不匹配');
        } else if (dbHasPermission && apiHasPermission && !permissionCheck.hasPermission) {
            console.log('❌ 问题: 数据库和API都有权限但权限检查失败');
            console.log('可能原因: 权限检查API的查询条件或逻辑问题');
        } else if (!dbHasPermission) {
            console.log('❌ 问题: 数据库中没有有效权限记录');
            console.log('可能原因: 权限设置未正确保存或权限状态为无效');
        } else {
            console.log('✅ 权限状态一致，可能是前端缓存或其他问题');
        }
        
    } catch (error) {
        console.error('调试过程中发生错误:', error);
    }
}

// 运行主函数
if (require.main === module) {
    main();
}

module.exports = { getDatabasePermissions, getAPIPermissions, testPermissionCheckAPI };