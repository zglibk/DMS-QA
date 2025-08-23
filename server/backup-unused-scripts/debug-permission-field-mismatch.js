/**
 * 调试权限字段不匹配问题
 * 检查数据库中Permission字段的实际值与前端传递的权限标识是否匹配
 */

const sql = require('mssql');
const { getDynamicConfig } = require('./db');

/**
 * 检查权限字段值
 */
async function checkPermissionFieldValues() {
    try {
        console.log('=== 检查权限字段值 ===');
        
        const pool = await sql.connect(await getDynamicConfig());
        
        const userId = 1; // wxq用户ID
        const menuId = 77; // 新增出版异常菜单ID
        
        console.log('查询参数:');
        console.log('- UserId:', userId);
        console.log('- MenuID:', menuId);
        
        // 1. 查看V_UserCompletePermissions视图中的Permission字段值
        console.log('\n1. 查看V_UserCompletePermissions视图中的Permission字段值:');
        const viewQuery = `
            SELECT 
                UserID,
                MenuID,
                MenuName,
                Permission,
                HasPermission,
                PermissionSource,
                ExpiresAt
            FROM V_UserCompletePermissions
            WHERE UserID = @UserId AND MenuID = @MenuId
        `;
        
        const viewResult = await pool.request()
            .input('UserId', sql.Int, userId)
            .input('MenuId', sql.Int, menuId)
            .query(viewQuery);
        
        console.log('视图查询结果:');
        if (viewResult.recordset.length > 0) {
            viewResult.recordset.forEach((record, index) => {
                console.log(`  记录 ${index + 1}:`);
                console.log(`    MenuName: ${record.MenuName}`);
                console.log(`    Permission: "${record.Permission}"`);
                console.log(`    HasPermission: ${record.HasPermission}`);
                console.log(`    PermissionSource: ${record.PermissionSource}`);
                console.log(`    ExpiresAt: ${record.ExpiresAt}`);
                console.log('    ---');
            });
        } else {
            console.log('  未找到记录');
        }
        
        // 2. 查看Menus表中的Permission字段值
        console.log('\n2. 查看Menus表中的Permission字段值:');
        const menuQuery = `
            SELECT 
                ID,
                MenuName,
                Permission,
                MenuCode,
                Status
            FROM Menus
            WHERE ID = @MenuId
        `;
        
        const menuResult = await pool.request()
            .input('MenuId', sql.Int, menuId)
            .query(menuQuery);
        
        console.log('菜单表查询结果:');
        if (menuResult.recordset.length > 0) {
            const menu = menuResult.recordset[0];
            console.log(`  MenuName: ${menu.MenuName}`);
            console.log(`  Permission: "${menu.Permission}"`);
            console.log(`  MenuCode: "${menu.MenuCode}"`);
            console.log(`  Status: ${menu.Status}`);
        } else {
            console.log('  未找到菜单记录');
        }
        
        // 3. 测试不同权限标识的查询结果
        console.log('\n3. 测试不同权限标识的查询结果:');
        
        const testPermissions = [
            'quality:publishing:add',
            '新增出版异常',
            'publishing:add',
            'quality:publishing'
        ];
        
        for (const testPerm of testPermissions) {
            console.log(`\n  测试权限: "${testPerm}"`);
            
            const testQuery = `
                SELECT COUNT(*) as count
                FROM V_UserCompletePermissions
                WHERE UserID = @UserId 
                  AND Permission = @Permission 
                  AND HasPermission = 1
                  AND (ExpiresAt IS NULL OR ExpiresAt > GETDATE())
            `;
            
            const testResult = await pool.request()
                .input('UserId', sql.Int, userId)
                .input('Permission', sql.NVarChar, testPerm)
                .query(testQuery);
            
            const hasPermission = testResult.recordset[0].count > 0;
            console.log(`    查询结果: ${hasPermission ? '✅ 有权限' : '❌ 无权限'} (count: ${testResult.recordset[0].count})`);
        }
        
        // 4. 使用LIKE查询找到相似的权限
        console.log('\n4. 查找包含"publishing"或"出版"的权限:');
        const likeQuery = `
            SELECT DISTINCT
                Permission,
                MenuName,
                COUNT(*) as RecordCount
            FROM V_UserCompletePermissions
            WHERE UserID = @UserId 
              AND (Permission LIKE '%publishing%' OR Permission LIKE '%出版%' OR MenuName LIKE '%出版%')
            GROUP BY Permission, MenuName
            ORDER BY Permission
        `;
        
        const likeResult = await pool.request()
            .input('UserId', sql.Int, userId)
            .query(likeQuery);
        
        console.log('相关权限记录:');
        if (likeResult.recordset.length > 0) {
            likeResult.recordset.forEach((record, index) => {
                console.log(`  ${index + 1}. Permission: "${record.Permission}" | MenuName: "${record.MenuName}" | Count: ${record.RecordCount}`);
            });
        } else {
            console.log('  未找到相关权限记录');
        }
        
        await pool.close();
        
        // 5. 分析结果
        console.log('\n=== 分析结果 ===');
        console.log('问题可能原因:');
        console.log('1. 前端传递的权限标识与数据库中的Permission字段值不匹配');
        console.log('2. 权限标识的格式或命名规则不一致');
        console.log('3. 数据库中的Permission字段可能为空或格式不正确');
        console.log('\n建议解决方案:');
        console.log('1. 统一权限标识的命名规则');
        console.log('2. 更新数据库中的Permission字段值');
        console.log('3. 修改前端或后端的权限检查逻辑以适配现有数据');
        
    } catch (error) {
        console.error('检查权限字段值失败:', error);
    }
}

/**
 * 主函数
 */
async function main() {
    console.log('开始调试权限字段不匹配问题...');
    await checkPermissionFieldValues();
}

// 运行主函数
if (require.main === module) {
    main();
}

module.exports = { checkPermissionFieldValues };