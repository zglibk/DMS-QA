/**
 * 权限问题分析脚本
 * 专门分析数据库权限设置与API返回的差异
 */

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
 * 分析权限视图中的重复记录问题
 */
async function analyzePermissionView() {
    try {
        const pool = await sql.connect(dbConfig);
        
        console.log('=== 权限视图分析 ===');
        
        // 查询用户1的所有权限记录
        const allPermissions = await pool.request()
            .query(`
                SELECT UserID, Username, MenuID, MenuName, PermissionSource, 
                       PermissionType, HasPermission, ActionCode
                FROM V_UserCompletePermissions 
                WHERE UserID = 1
                ORDER BY MenuID, HasPermission DESC
            `);
        
        console.log('用户1的所有权限记录数:', allPermissions.recordset.length);
        
        // 按MenuID分组分析
        const menuGroups = {};
        allPermissions.recordset.forEach(perm => {
            if (!menuGroups[perm.MenuID]) {
                menuGroups[perm.MenuID] = [];
            }
            menuGroups[perm.MenuID].push(perm);
        });
        
        console.log('\n=== 按菜单分组的权限分析 ===');
        Object.keys(menuGroups).forEach(menuId => {
            const perms = menuGroups[menuId];
            console.log(`\n菜单ID ${menuId} (${perms[0].MenuName}):`);
            console.log(`  记录数: ${perms.length}`);
            
            perms.forEach((perm, index) => {
                console.log(`  ${index + 1}. 有权限: ${perm.HasPermission}, 来源: ${perm.PermissionSource}, 类型: ${perm.PermissionType}`);
            });
            
            // 检查是否有冲突
            const hasPermissionValues = perms.map(p => p.HasPermission);
            const uniqueValues = [...new Set(hasPermissionValues)];
            if (uniqueValues.length > 1) {
                console.log(`  ⚠️  权限冲突: 同一菜单有不同的权限值`);
            }
        });
        
        // 专门分析MenuID=15的权限
        console.log('\n=== MenuID=15 详细分析 ===');
        const menu15Perms = await pool.request()
            .query(`
                SELECT * FROM V_UserCompletePermissions 
                WHERE UserID = 1 AND MenuID = 15
            `);
        
        console.log('MenuID=15的权限记录:');
        menu15Perms.recordset.forEach((perm, index) => {
            console.log(`记录${index + 1}:`, {
                HasPermission: perm.HasPermission,
                PermissionSource: perm.PermissionSource,
                PermissionType: perm.PermissionType,
                ActionCode: perm.ActionCode,
                GrantedBy: perm.GrantedBy,
                GrantedAt: perm.GrantedAt
            });
        });
        
        // 查看视图定义中的逻辑
        console.log('\n=== 检查基础数据 ===');
        
        // 检查角色权限
        const rolePerms = await pool.request()
            .query(`
                SELECT ur.UserID, ur.RoleID, r.RoleName, rm.MenuID, m.MenuName
                FROM UserRoles ur
                JOIN Roles r ON ur.RoleID = r.ID
                JOIN RoleMenus rm ON ur.RoleID = rm.RoleID
                JOIN Menus m ON rm.MenuID = m.ID
                WHERE ur.UserID = 1 AND rm.MenuID = 15
            `);
        
        console.log('角色权限记录:', rolePerms.recordset);
        
        // 检查用户独立权限
        const userPerms = await pool.request()
            .query(`
                SELECT * FROM UserPermissions 
                WHERE UserID = 1 AND MenuID = 15
            `);
        
        console.log('用户独立权限记录:', userPerms.recordset);
        
        await pool.close();
        
    } catch (error) {
        console.error('分析过程中发生错误:', error);
    }
}

/**
 * 检查权限检查API的逻辑
 */
async function checkPermissionAPI() {
    try {
        const pool = await sql.connect(dbConfig);
        
        console.log('\n=== 权限检查API逻辑分析 ===');
        
        // 模拟权限检查API的查询
        const apiQuery = `
            SELECT TOP 1 HasPermission
            FROM V_UserCompletePermissions
            WHERE UserID = 1 
            AND (MenuName = '新增出版异常' OR Permission = '新增出版异常')
            AND HasPermission = 1
        `;
        
        console.log('权限检查API查询语句:', apiQuery);
        
        const apiResult = await pool.request().query(apiQuery);
        console.log('API查询结果:', apiResult.recordset);
        
        // 检查所有包含"新增出版异常"的记录
        const allMatches = await pool.request()
            .query(`
                SELECT * FROM V_UserCompletePermissions
                WHERE UserID = 1 
                AND (MenuName LIKE '%新增出版异常%' OR Permission LIKE '%新增出版异常%')
            `);
        
        console.log('所有匹配"新增出版异常"的记录:', allMatches.recordset);
        
        await pool.close();
        
    } catch (error) {
        console.error('API检查过程中发生错误:', error);
    }
}

/**
 * 主函数
 */
async function main() {
    console.log('开始分析权限问题...');
    
    await analyzePermissionView();
    await checkPermissionAPI();
    
    console.log('\n=== 问题总结 ===');
    console.log('1. V_UserCompletePermissions视图中同一菜单存在多条记录');
    console.log('2. 这些记录的HasPermission值不同，导致权限检查结果不一致');
    console.log('3. 需要检查视图定义的逻辑，确保每个用户-菜单组合只返回一条最终权限记录');
    console.log('4. 建议优化视图逻辑，使用适当的聚合函数或优先级规则');
}

// 运行主函数
if (require.main === module) {
    main();
}

module.exports = { analyzePermissionView, checkPermissionAPI };