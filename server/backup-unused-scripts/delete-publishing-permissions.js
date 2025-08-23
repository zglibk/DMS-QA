/**
 * 删除UserPermissions表中关于新增出版异常的重复权限记录
 * 包括action和menu两种类型的记录
 */

const { sql, getDynamicConfig } = require('./db');

/**
 * 删除新增出版异常的权限记录
 */
async function deletePublishingPermissions() {
    let pool;
    try {
        console.log('=== 删除UserPermissions表中的新增出版异常权限记录 ===');
        
        pool = await sql.connect(await getDynamicConfig());
        
        // 首先查看要删除的记录
        console.log('\n查看即将删除的记录:');
        const viewResult = await pool.request().query(`
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
                up.Reason
            FROM UserPermissions up 
            LEFT JOIN [User] u ON up.UserID = u.ID 
            LEFT JOIN Menus m ON up.MenuID = m.ID 
            WHERE m.MenuCode = 'publishing-exceptions-add'
               OR (m.MenuCode = 'publishing-exceptions' AND up.ActionCode = 'add')
            ORDER BY up.ID
        `);
        
        if (viewResult.recordset.length === 0) {
            console.log('没有找到需要删除的新增出版异常权限记录');
            return;
        }
        
        viewResult.recordset.forEach(record => {
            console.log(`ID: ${record.ID}, 用户: ${record.Username}, 菜单: ${record.MenuCode}(${record.MenuName}), 类型: ${record.PermissionType}, 级别: ${record.PermissionLevel}, 操作: ${record.ActionCode}, 状态: ${record.Status}`);
        });
        
        // 开始删除操作
        console.log('\n开始删除操作...');
        
        // 首先获取要删除的UserPermissions记录的ID
        const idsToDelete = viewResult.recordset.map(record => record.ID);
        console.log(`准备删除的UserPermissions记录IDs: ${idsToDelete.join(', ')}`);
        
        // 先删除UserPermissionHistory表中的相关记录
        if (idsToDelete.length > 0) {
            const deleteHistoryResult = await pool.request().query(`
                DELETE FROM UserPermissionHistory 
                WHERE UserPermissionID IN (${idsToDelete.join(',')})
            `);
            console.log(`已删除 ${deleteHistoryResult.rowsAffected[0]} 条UserPermissionHistory记录`);
        }
        
        // 删除publishing-exceptions-add菜单的所有权限记录
        const deleteMenuResult = await pool.request().query(`
            DELETE FROM UserPermissions 
            WHERE MenuID IN (
                SELECT ID FROM Menus WHERE MenuCode = 'publishing-exceptions-add'
            )
        `);
        
        console.log(`已删除 ${deleteMenuResult.rowsAffected[0]} 条publishing-exceptions-add菜单的权限记录`);
        
        // 删除publishing-exceptions菜单中ActionCode为'add'的权限记录
        const deleteActionResult = await pool.request().query(`
            DELETE FROM UserPermissions 
            WHERE MenuID IN (
                SELECT ID FROM Menus WHERE MenuCode = 'publishing-exceptions'
            )
            AND ActionCode = 'add'
        `);
        
        console.log(`已删除 ${deleteActionResult.rowsAffected[0]} 条publishing-exceptions菜单中add操作的权限记录`);
        
        // 验证删除结果
        console.log('\n验证删除结果:');
        const verifyResult = await pool.request().query(`
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
                up.Reason
            FROM UserPermissions up 
            LEFT JOIN [User] u ON up.UserID = u.ID 
            LEFT JOIN Menus m ON up.MenuID = m.ID 
            WHERE m.MenuCode = 'publishing-exceptions-add'
               OR (m.MenuCode = 'publishing-exceptions' AND up.ActionCode = 'add')
            ORDER BY up.ID
        `);
        
        if (verifyResult.recordset.length === 0) {
            console.log('✅ 所有新增出版异常的权限记录已成功删除');
        } else {
            console.log('❌ 仍有未删除的记录:');
            verifyResult.recordset.forEach(record => {
                console.log(`ID: ${record.ID}, 用户: ${record.Username}, 菜单: ${record.MenuCode}(${record.MenuName}), 类型: ${record.PermissionType}, 级别: ${record.PermissionLevel}, 操作: ${record.ActionCode}`);
            });
        }
        
        console.log('\n删除操作完成！现在您可以通过前端页面重新添加权限并进行测试。');
        
    } catch (error) {
        console.error('删除操作出错:', error.message);
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
    deletePublishingPermissions();
}

module.exports = { deletePublishingPermissions };