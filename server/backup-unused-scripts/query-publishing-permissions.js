/**
 * 查询UserPermissions表中的出版异常相关记录
 */

const { sql, getDynamicConfig } = require('./db');

/**
 * 查询出版异常相关的权限记录
 */
async function queryPublishingPermissions() {
    let pool;
    try {
        console.log('=== 查询UserPermissions表中的出版异常相关记录 ===');
        
        pool = await sql.connect(await getDynamicConfig());
        
        // 查询所有出版异常相关的权限记录
        const result = await pool.request().query(`
            SELECT 
                up.ID, 
                up.UserID, 
                u.Username, 
                up.MenuID, 
                m.MenuCode, 
                m.MenuName, 
                up.PermissionType, 
                up.PermissionLevel, 
                up.ActionCode, 
                up.Status, 
                up.Reason,
                up.CreatedAt,
                up.UpdatedAt
            FROM UserPermissions up 
            LEFT JOIN [User] u ON up.UserID = u.ID 
            LEFT JOIN Menus m ON up.MenuID = m.ID 
            WHERE m.MenuCode LIKE '%publishing%' 
               OR m.MenuName LIKE '%出版%' 
               OR up.Reason LIKE '%出版异常%'
               OR up.ActionCode = 'add'
            ORDER BY up.ID
        `);
        
        console.log('\n出版异常相关权限记录:');
        if (result.recordset.length === 0) {
            console.log('没有找到出版异常相关的权限记录');
        } else {
            result.recordset.forEach(record => {
                console.log(`ID: ${record.ID}, 用户: ${record.Username}, 菜单: ${record.MenuCode}(${record.MenuName}), 类型: ${record.PermissionType}, 级别: ${record.PermissionLevel}, 操作: ${record.ActionCode}, 状态: ${record.Status}, 原因: ${record.Reason}`);
            });
        }
        
        // 特别查询MenuID为77的记录（从之前的输出看到这个ID）
        console.log('\n=== 查询MenuID为77的所有记录 ===');
        const menu77Result = await pool.request().query(`
            SELECT 
                up.ID, 
                up.UserID, 
                u.Username, 
                up.MenuID, 
                m.MenuCode, 
                m.MenuName, 
                up.PermissionType, 
                up.PermissionLevel, 
                up.ActionCode, 
                up.Status, 
                up.Reason,
                up.CreatedAt,
                up.UpdatedAt
            FROM UserPermissions up 
            LEFT JOIN [User] u ON up.UserID = u.ID 
            LEFT JOIN Menus m ON up.MenuID = m.ID 
            WHERE up.MenuID = 77
            ORDER BY up.ID
        `);
        
        if (menu77Result.recordset.length === 0) {
            console.log('没有找到MenuID为77的权限记录');
        } else {
            menu77Result.recordset.forEach(record => {
                console.log(`ID: ${record.ID}, 用户: ${record.Username}, 菜单: ${record.MenuCode}(${record.MenuName}), 类型: ${record.PermissionType}, 级别: ${record.PermissionLevel}, 操作: ${record.ActionCode}, 状态: ${record.Status}, 原因: ${record.Reason}`);
            });
        }
        
        // 查询可能的重复记录（同一用户、同一菜单、同一操作的多条记录）
        console.log('\n=== 查询可能的重复权限记录 ===');
        const duplicateResult = await pool.request().query(`
            SELECT 
                up.UserID,
                u.Username,
                up.MenuID,
                m.MenuCode,
                m.MenuName,
                up.PermissionLevel,
                up.ActionCode,
                COUNT(*) as RecordCount
            FROM UserPermissions up 
            LEFT JOIN [User] u ON up.UserID = u.ID 
            LEFT JOIN Menus m ON up.MenuID = m.ID 
            GROUP BY up.UserID, u.Username, up.MenuID, m.MenuCode, m.MenuName, up.PermissionLevel, up.ActionCode
            HAVING COUNT(*) > 1
            ORDER BY RecordCount DESC
        `);
        
        if (duplicateResult.recordset.length === 0) {
            console.log('没有找到重复的权限记录');
        } else {
            duplicateResult.recordset.forEach(record => {
                console.log(`用户: ${record.Username}, 菜单: ${record.MenuCode}(${record.MenuName}), 级别: ${record.PermissionLevel}, 操作: ${record.ActionCode}, 重复数量: ${record.RecordCount}`);
            });
            
            // 对于每个重复组，查询具体的记录ID
            for (const record of duplicateResult.recordset) {
                const detailResult = await pool.request().query(`
                    SELECT ID, Status, CreatedAt, UpdatedAt
                    FROM UserPermissions 
                    WHERE UserID = ${record.UserID} 
                      AND MenuID = ${record.MenuID} 
                      AND PermissionLevel = '${record.PermissionLevel}'
                      ${record.ActionCode ? `AND ActionCode = '${record.ActionCode}'` : 'AND ActionCode IS NULL'}
                    ORDER BY ID
                `);
                console.log(`  具体记录IDs: ${detailResult.recordset.map(r => `${r.ID}(状态:${r.Status})`).join(', ')}`);
            }
        }
        
    } catch (error) {
        console.error('查询出错:', error.message);
        console.error('错误详情:', error);
    } finally {
        if (pool) {
            await pool.close();
            console.log('\n数据库连接已关闭');
        }
    }
}

// 如果直接运行此脚本
if (require.main === module) {
    queryPublishingPermissions();
}

module.exports = { queryPublishingPermissions };