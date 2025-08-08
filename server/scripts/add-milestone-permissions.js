/**
 * 添加工作计划里程碑相关的操作权限
 * 功能：为进度跟踪页面添加细粒度的里程碑操作权限
 * 版本：v1.0
 * 创建日期：2025-01-27
 */

const sql = require('mssql');
const { getDynamicConfig } = require('../db');

/**
 * 添加里程碑相关权限
 */
async function addMilestonePermissions() {
    try {
        console.log('开始添加工作计划里程碑相关权限...');
        console.log('');
        
        const config = await getDynamicConfig();
        const pool = await sql.connect(config);
        
        // 1. 获取进度跟踪菜单ID
        const progressMenuResult = await pool.request()
            .query("SELECT ID FROM [dbo].[Menus] WHERE MenuCode = 'progress-tracking'");
        
        if (progressMenuResult.recordset.length === 0) {
            console.log('❌ 未找到进度跟踪菜单，无法添加按钮权限');
            return;
        }
        
        const progressTrackingMenuId = progressMenuResult.recordset[0].ID;
        console.log(`✅ 找到进度跟踪菜单，ID: ${progressTrackingMenuId}`);
        
        // 2. 定义要添加的权限
        const permissions = [
            {
                code: 'progress-edit',
                name: '编辑进度',
                permission: 'work-plan:progress:edit',
                sortOrder: 1
            },
            {
                code: 'milestone-add',
                name: '添加里程碑',
                permission: 'work-plan:milestone:add',
                sortOrder: 2
            },
            {
                code: 'milestone-edit',
                name: '编辑里程碑',
                permission: 'work-plan:milestone:edit',
                sortOrder: 3
            },
            {
                code: 'milestone-delete',
                name: '删除里程碑',
                permission: 'work-plan:milestone:delete',
                sortOrder: 4
            }
        ];
        
        // 3. 添加权限到菜单表
        for (const perm of permissions) {
            // 检查权限是否已存在
            const existsResult = await pool.request()
                .input('menuCode', sql.NVarChar, perm.code)
                .query('SELECT ID FROM [dbo].[Menus] WHERE MenuCode = @menuCode');
            
            if (existsResult.recordset.length === 0) {
                // 添加新权限
                await pool.request()
                    .input('parentId', sql.Int, progressTrackingMenuId)
                    .input('menuCode', sql.NVarChar, perm.code)
                    .input('menuName', sql.NVarChar, perm.name)
                    .input('permission', sql.NVarChar, perm.permission)
                    .input('sortOrder', sql.Int, perm.sortOrder)
                    .query(`
                        INSERT INTO [dbo].[Menus] (
                            [ParentID], [MenuCode], [MenuName], [MenuType], [Permission], [SortOrder], [Visible], [Status]
                        ) VALUES (
                            @parentId, @menuCode, @menuName, 'button', @permission, @sortOrder, 0, 1
                        )
                    `);
                
                console.log(`✅ ${perm.name}权限添加成功`);
            } else {
                console.log(`⚠️ ${perm.name}权限已存在，跳过添加`);
            }
        }
        
        // 4. 为管理员角色分配权限
        const adminRoleResult = await pool.request()
            .query("SELECT ID FROM [dbo].[Roles] WHERE RoleCode = 'admin'");
        
        if (adminRoleResult.recordset.length > 0) {
            const adminRoleId = adminRoleResult.recordset[0].ID;
            console.log(`✅ 找到管理员角色，ID: ${adminRoleId}`);
            
            // 获取新添加的权限菜单ID
            const newMenusResult = await pool.request()
                .query(`
                    SELECT ID, MenuCode, MenuName 
                    FROM [dbo].[Menus] 
                    WHERE MenuType = 'button' 
                      AND MenuCode IN ('progress-edit', 'milestone-add', 'milestone-edit', 'milestone-delete')
                `);
            
            // 为管理员分配权限
            for (const menu of newMenusResult.recordset) {
                // 检查是否已分配
                const roleMenuExists = await pool.request()
                    .input('roleId', sql.Int, adminRoleId)
                    .input('menuId', sql.Int, menu.ID)
                    .query('SELECT 1 FROM [dbo].[RoleMenus] WHERE RoleID = @roleId AND MenuID = @menuId');
                
                if (roleMenuExists.recordset.length === 0) {
                    await pool.request()
                        .input('roleId', sql.Int, adminRoleId)
                        .input('menuId', sql.Int, menu.ID)
                        .query('INSERT INTO [dbo].[RoleMenus] ([RoleID], [MenuID]) VALUES (@roleId, @menuId)');
                    
                    console.log(`✅ 为管理员分配${menu.MenuName}权限`);
                } else {
                    console.log(`⚠️ 管理员已有${menu.MenuName}权限，跳过分配`);
                }
            }
        } else {
            console.log('⚠️ 未找到管理员角色，跳过权限分配');
        }
        
        // 5. 显示添加的权限列表
        console.log('');
        console.log('📋 已添加的里程碑相关权限：');
        const permissionsResult = await pool.request()
            .query(`
                SELECT 
                    MenuCode as '权限代码',
                    MenuName as '权限名称',
                    Permission as '权限标识',
                    MenuType as '类型'
                FROM [dbo].[Menus] 
                WHERE MenuCode IN ('progress-edit', 'milestone-add', 'milestone-edit', 'milestone-delete')
                ORDER BY SortOrder
            `);
        
        console.table(permissionsResult.recordset);
        
        console.log('');
        console.log('🎉 工作计划里程碑权限添加完成！');
        console.log('');
        console.log('权限说明：');
        console.log('  📝 work-plan:progress:edit - 编辑进度权限');
        console.log('  ➕ work-plan:milestone:add - 添加里程碑权限');
        console.log('  ✏️ work-plan:milestone:edit - 编辑里程碑权限');
        console.log('  🗑️ work-plan:milestone:delete - 删除里程碑权限');
        console.log('');
        console.log('下一步：');
        console.log('  1. 重启前端应用以应用新的权限控制');
        console.log('  2. 为其他角色分配相应的权限');
        console.log('  3. 测试权限控制功能');
        console.log('');
        
        await pool.close();
        process.exit(0);
        
    } catch (error) {
        console.error('添加权限失败:', error.message);
        console.error(error);
        process.exit(1);
    }
}

// 执行脚本
addMilestonePermissions();