/**
 * 调试checkUserPermission函数的查询逻辑
 * 分析为什么权限检查API返回无权限
 */

const sql = require('mssql');
const { getDynamicConfig } = require('./db');

/**
 * 调试checkUserPermission函数的查询逻辑
 */
async function debugCheckUserPermission() {
    try {
        console.log('=== 调试checkUserPermission函数查询逻辑 ===');
        
        const pool = await sql.connect(await getDynamicConfig());
        
        const userId = 1;
        const permission = '新增出版异常';
        
        console.log('查询参数:');
        console.log('- UserId:', userId);
        console.log('- Permission:', permission);
        
        // 1. 执行与checkUserPermission函数相同的查询
        console.log('\n1. 执行checkUserPermission函数的查询:');
        const mainQuery = `
            SELECT COUNT(*) as count
            FROM [V_UserCompletePermissions] v
            WHERE v.UserID = @UserId 
              AND v.Permission = @Permission 
              AND v.HasPermission = 1
              AND (v.ExpiresAt IS NULL OR v.ExpiresAt > GETDATE())
        `;
        
        console.log('查询语句:', mainQuery);
        
        const mainResult = await pool.request()
            .input('UserId', sql.Int, userId)
            .input('Permission', sql.NVarChar, permission)
            .query(mainQuery);
        
        console.log('查询结果:', mainResult.recordset[0]);
        
        // 2. 分步调试 - 检查基本条件
        console.log('\n2. 分步调试 - 检查基本条件:');
        
        // 2.1 检查UserID匹配
        const userIdCheck = await pool.request()
            .input('UserId', sql.Int, userId)
            .query('SELECT COUNT(*) as count FROM [V_UserCompletePermissions] WHERE UserID = @UserId');
        console.log('UserID匹配的记录数:', userIdCheck.recordset[0].count);
        
        // 2.2 检查Permission字段匹配
        const permissionCheck = await pool.request()
            .input('UserId', sql.Int, userId)
            .input('Permission', sql.NVarChar, permission)
            .query('SELECT COUNT(*) as count FROM [V_UserCompletePermissions] WHERE UserID = @UserId AND Permission = @Permission');
        console.log('Permission字段匹配的记录数:', permissionCheck.recordset[0].count);
        
        // 2.3 检查HasPermission=1的记录
        const hasPermissionCheck = await pool.request()
            .input('UserId', sql.Int, userId)
            .input('Permission', sql.NVarChar, permission)
            .query('SELECT COUNT(*) as count FROM [V_UserCompletePermissions] WHERE UserID = @UserId AND Permission = @Permission AND HasPermission = 1');
        console.log('HasPermission=1的记录数:', hasPermissionCheck.recordset[0].count);
        
        // 3. 查看所有相关记录的详细信息
        console.log('\n3. 查看所有相关记录的详细信息:');
        const detailQuery = `
            SELECT 
                UserID,
                MenuID,
                MenuName,
                MenuCode,
                Permission,
                PermissionSource,
                PermissionType,
                HasPermission,
                ExpiresAt
            FROM [V_UserCompletePermissions] 
            WHERE UserID = @UserId 
              AND Permission = @Permission
        `;
        
        const detailResult = await pool.request()
            .input('UserId', sql.Int, userId)
            .input('Permission', sql.NVarChar, permission)
            .query(detailQuery);
        
        console.log('详细记录:');
        detailResult.recordset.forEach((record, index) => {
            console.log(`记录 ${index + 1}:`);
            console.log(`  MenuID: ${record.MenuID}`);
            console.log(`  MenuName: ${record.MenuName}`);
            console.log(`  MenuCode: ${record.MenuCode}`);
            console.log(`  Permission: ${record.Permission}`);
            console.log(`  PermissionSource: ${record.PermissionSource}`);
            console.log(`  PermissionType: ${record.PermissionType}`);
            console.log(`  HasPermission: ${record.HasPermission}`);
            console.log(`  ExpiresAt: ${record.ExpiresAt}`);
            console.log('---');
        });
        
        // 4. 检查是否存在Permission字段为null或空的情况
        console.log('\n4. 检查Permission字段的数据质量:');
        const permissionQualityCheck = await pool.request()
            .input('UserId', sql.Int, userId)
            .query(`
                SELECT 
                    COUNT(*) as total_records,
                    COUNT(Permission) as non_null_permissions,
                    COUNT(CASE WHEN Permission = '' THEN 1 END) as empty_permissions,
                    COUNT(CASE WHEN Permission IS NULL THEN 1 END) as null_permissions
                FROM [V_UserCompletePermissions] 
                WHERE UserID = @UserId
            `);
        
        const qualityResult = permissionQualityCheck.recordset[0];
        console.log('Permission字段数据质量:');
        console.log(`  总记录数: ${qualityResult.total_records}`);
        console.log(`  非空Permission记录数: ${qualityResult.non_null_permissions}`);
        console.log(`  空字符串Permission记录数: ${qualityResult.empty_permissions}`);
        console.log(`  NULL Permission记录数: ${qualityResult.null_permissions}`);
        
        // 5. 查找所有包含"新增出版异常"的记录（模糊匹配）
        console.log('\n5. 查找所有包含"新增出版异常"的记录（模糊匹配）:');
        const fuzzyQuery = `
            SELECT 
                MenuID,
                MenuName,
                MenuCode,
                Permission,
                PermissionSource,
                HasPermission
            FROM [V_UserCompletePermissions] 
            WHERE UserID = @UserId 
              AND (
                MenuName LIKE '%新增出版异常%' 
                OR Permission LIKE '%新增出版异常%'
                OR MenuCode LIKE '%新增出版异常%'
              )
        `;
        
        const fuzzyResult = await pool.request()
            .input('UserId', sql.Int, userId)
            .query(fuzzyQuery);
        
        console.log('模糊匹配结果:');
        if (fuzzyResult.recordset.length > 0) {
            fuzzyResult.recordset.forEach((record, index) => {
                console.log(`匹配记录 ${index + 1}:`);
                console.log(`  MenuName: ${record.MenuName}`);
                console.log(`  MenuCode: ${record.MenuCode}`);
                console.log(`  Permission: ${record.Permission}`);
                console.log(`  PermissionSource: ${record.PermissionSource}`);
                console.log(`  HasPermission: ${record.HasPermission}`);
                console.log('---');
            });
        } else {
            console.log('  未找到任何匹配记录');
        }
        
        // 6. 检查MenuID=77的所有记录
        console.log('\n6. 检查MenuID=77的所有记录:');
        const menuIdQuery = `
            SELECT 
                MenuID,
                MenuName,
                MenuCode,
                Permission,
                PermissionSource,
                PermissionType,
                HasPermission,
                ExpiresAt
            FROM [V_UserCompletePermissions] 
            WHERE UserID = @UserId AND MenuID = 77
        `;
        
        const menuIdResult = await pool.request()
            .input('UserId', sql.Int, userId)
            .query(menuIdQuery);
        
        console.log('MenuID=77的记录:');
        if (menuIdResult.recordset.length > 0) {
            menuIdResult.recordset.forEach((record, index) => {
                console.log(`记录 ${index + 1}:`);
                console.log(`  MenuName: ${record.MenuName}`);
                console.log(`  MenuCode: ${record.MenuCode}`);
                console.log(`  Permission: ${record.Permission}`);
                console.log(`  PermissionSource: ${record.PermissionSource}`);
                console.log(`  PermissionType: ${record.PermissionType}`);
                console.log(`  HasPermission: ${record.HasPermission}`);
                console.log(`  ExpiresAt: ${record.ExpiresAt}`);
                console.log('---');
            });
        } else {
            console.log('  未找到MenuID=77的记录');
        }
        
        await pool.close();
        
        // 7. 分析结果
        console.log('\n=== 分析结果 ===');
        const hasValidPermission = mainResult.recordset[0].count > 0;
        
        if (hasValidPermission) {
            console.log('✅ checkUserPermission函数应该返回true');
            console.log('🔍 如果API仍返回false，可能存在以下问题:');
            console.log('1. API路由中的权限检查逻辑有误');
            console.log('2. 数据库连接配置不一致');
            console.log('3. 权限检查函数的参数传递有误');
        } else {
            console.log('❌ checkUserPermission函数返回false');
            console.log('🔍 可能的原因:');
            console.log('1. Permission字段值不匹配（大小写、空格等）');
            console.log('2. HasPermission字段值不为1');
            console.log('3. 权限已过期（ExpiresAt字段）');
            console.log('4. 视图数据不正确');
            
            // 提供修复建议
            if (fuzzyResult.recordset.length > 0) {
                console.log('\n💡 发现相似记录，建议检查:');
                const firstMatch = fuzzyResult.recordset[0];
                if (firstMatch.Permission !== permission) {
                    console.log(`- Permission字段值差异: 期望"${permission}", 实际"${firstMatch.Permission}"`);
                }
                if (firstMatch.HasPermission !== 1) {
                    console.log(`- HasPermission值为: ${firstMatch.HasPermission}`);
                }
            }
        }
        
    } catch (error) {
        console.error('调试过程中发生错误:', error);
    }
}

/**
 * 主函数
 */
async function main() {
    await debugCheckUserPermission();
}

// 运行主函数
if (require.main === module) {
    main();
}

module.exports = { debugCheckUserPermission };