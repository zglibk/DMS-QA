/**
 * 为出版异常页面添加菜单项和权限配置
 * 功能：添加出版异常菜单项到质量管理模块下，并配置相关权限
 * 执行方式：node add-publishing-exceptions-menu.js
 */

const sql = require('mssql');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

/**
 * 数据库连接配置
 */
const dbConfig = {
    server: process.env.DB_SERVER || 'localhost',
    database: process.env.DB_NAME || 'DMS-QA',
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    options: {
        encrypt: false,
        trustServerCertificate: true,
        enableArithAbort: true
    },
    pool: {
        max: 10,
        min: 0,
        idleTimeoutMillis: 30000
    }
};

/**
 * 添加出版异常菜单项和权限配置
 */
async function addPublishingExceptionsMenu() {
    let pool;
    
    try {
        console.log('开始为出版异常页面添加菜单项和权限配置...');
        
        // 连接数据库
        pool = await sql.connect(dbConfig);
        console.log('✅ 数据库连接成功');
        
        // 获取质量管理主菜单ID
        const qualityMenuResult = await pool.request()
            .query("SELECT ID FROM [dbo].[Menus] WHERE MenuCode = 'quality'");
        
        if (qualityMenuResult.recordset.length === 0) {
            throw new Error('未找到质量管理主菜单，请先确保系统菜单已正确初始化');
        }
        
        const qualityMenuId = qualityMenuResult.recordset[0].ID;
        console.log(`✅ 找到质量管理主菜单，ID: ${qualityMenuId}`);
        
        // 检查出版异常菜单是否已存在
        const existingMenuResult = await pool.request()
            .query("SELECT ID FROM [dbo].[Menus] WHERE MenuCode = 'publishing-exceptions'");
        
        let publishingMenuId;
        
        if (existingMenuResult.recordset.length > 0) {
            publishingMenuId = existingMenuResult.recordset[0].ID;
            console.log('⚠️  出版异常菜单已存在，跳过创建');
        } else {
            // 添加出版异常主菜单项
            const insertMenuResult = await pool.request()
                .input('ParentID', sql.Int, qualityMenuId)
                .input('MenuCode', sql.NVarChar(50), 'publishing-exceptions')
                .input('MenuName', sql.NVarChar(50), '出版异常')
                .input('MenuType', sql.NVarChar(10), 'menu')
                .input('Icon', sql.NVarChar(50), 'DocumentRemove')
                .input('Path', sql.NVarChar(200), '/publishing-exceptions')
                .input('Component', sql.NVarChar(200), 'views/PublishingExceptions')
                .input('Permission', sql.NVarChar(100), 'quality:publishing:view')
                .input('SortOrder', sql.Int, 40)
                .input('Visible', sql.Bit, 1)
                .input('Status', sql.Bit, 1)
                .query(`
                    INSERT INTO [dbo].[Menus] (
                        [ParentID], [MenuCode], [MenuName], [MenuType], [Icon], 
                        [Path], [Component], [Permission], [SortOrder], [Visible], [Status]
                    ) VALUES (
                        @ParentID, @MenuCode, @MenuName, @MenuType, @Icon, 
                        @Path, @Component, @Permission, @SortOrder, @Visible, @Status
                    );
                    SELECT SCOPE_IDENTITY() as ID;
                `);
            
            publishingMenuId = insertMenuResult.recordset[0].ID;
            console.log('✅ 出版异常主菜单项创建成功');
        }
        
        // 定义按钮权限配置
        const buttonMenus = [
            { code: 'publishing-exceptions-add', name: '新增出版异常', permission: 'quality:publishing:add', sortOrder: 10 },
            { code: 'publishing-exceptions-edit', name: '编辑出版异常', permission: 'quality:publishing:edit', sortOrder: 20 },
            { code: 'publishing-exceptions-delete', name: '删除出版异常', permission: 'quality:publishing:delete', sortOrder: 30 },
            { code: 'publishing-exceptions-export', name: '导出出版异常', permission: 'quality:publishing:export', sortOrder: 40 },
            { code: 'publishing-exceptions-upload', name: '上传图片', permission: 'quality:publishing:upload', sortOrder: 50 }
        ];
        
        // 创建按钮权限菜单项
        for (const button of buttonMenus) {
            const existingButtonResult = await pool.request()
                .input('MenuCode', sql.NVarChar(50), button.code)
                .query("SELECT ID FROM [dbo].[Menus] WHERE MenuCode = @MenuCode");
            
            if (existingButtonResult.recordset.length === 0) {
                await pool.request()
                    .input('ParentID', sql.Int, publishingMenuId)
                    .input('MenuCode', sql.NVarChar(50), button.code)
                    .input('MenuName', sql.NVarChar(50), button.name)
                    .input('MenuType', sql.NVarChar(10), 'button')
                    .input('Permission', sql.NVarChar(100), button.permission)
                    .input('SortOrder', sql.Int, button.sortOrder)
                    .input('Visible', sql.Bit, 0)
                    .input('Status', sql.Bit, 1)
                    .query(`
                        INSERT INTO [dbo].[Menus] (
                            [ParentID], [MenuCode], [MenuName], [MenuType], 
                            [Permission], [SortOrder], [Visible], [Status]
                        ) VALUES (
                            @ParentID, @MenuCode, @MenuName, @MenuType, 
                            @Permission, @SortOrder, @Visible, @Status
                        )
                    `);
                
                console.log(`✅ 创建按钮权限: ${button.name}`);
            } else {
                console.log(`⚠️  按钮权限已存在: ${button.name}`);
            }
        }
        
        // 为管理员角色分配出版异常相关权限
        const adminRoleResult = await pool.request()
            .query("SELECT ID FROM [dbo].[Roles] WHERE RoleCode = 'admin'");
        
        if (adminRoleResult.recordset.length > 0) {
            const adminRoleId = adminRoleResult.recordset[0].ID;
            
            // 为管理员角色分配出版异常主菜单权限
            const existingRoleMenuResult = await pool.request()
                .input('RoleID', sql.Int, adminRoleId)
                .input('MenuID', sql.Int, publishingMenuId)
                .query("SELECT ID FROM [dbo].[RoleMenus] WHERE RoleID = @RoleID AND MenuID = @MenuID");
            
            if (existingRoleMenuResult.recordset.length === 0) {
                await pool.request()
                    .input('RoleID', sql.Int, adminRoleId)
                    .input('MenuID', sql.Int, publishingMenuId)
                    .query("INSERT INTO [dbo].[RoleMenus] ([RoleID], [MenuID]) VALUES (@RoleID, @MenuID)");
                
                console.log('✅ 为管理员角色分配出版异常主菜单权限');
            }
            
            // 为管理员角色分配所有出版异常按钮权限
            const buttonMenusResult = await pool.request()
                .input('ParentID', sql.Int, publishingMenuId)
                .query(`
                    SELECT ID FROM [dbo].[Menus] 
                    WHERE ParentID = @ParentID AND MenuType = 'button'
                `);
            
            for (const buttonMenu of buttonMenusResult.recordset) {
                const existingButtonRoleResult = await pool.request()
                    .input('RoleID', sql.Int, adminRoleId)
                    .input('MenuID', sql.Int, buttonMenu.ID)
                    .query("SELECT ID FROM [dbo].[RoleMenus] WHERE RoleID = @RoleID AND MenuID = @MenuID");
                
                if (existingButtonRoleResult.recordset.length === 0) {
                    await pool.request()
                        .input('RoleID', sql.Int, adminRoleId)
                        .input('MenuID', sql.Int, buttonMenu.ID)
                        .query("INSERT INTO [dbo].[RoleMenus] ([RoleID], [MenuID]) VALUES (@RoleID, @MenuID)");
                }
            }
            
            console.log('✅ 为管理员角色分配出版异常按钮权限');
        } else {
            console.log('⚠️  未找到管理员角色，请手动分配权限');
        }
        
        // 为质量经理角色分配出版异常权限（如果存在）
        const qualityManagerRoleResult = await pool.request()
            .query("SELECT ID FROM [dbo].[Roles] WHERE RoleCode = 'quality_manager'");
        
        if (qualityManagerRoleResult.recordset.length > 0) {
            const qualityManagerRoleId = qualityManagerRoleResult.recordset[0].ID;
            
            // 为质量经理角色分配出版异常主菜单权限
            const existingQualityRoleMenuResult = await pool.request()
                .input('RoleID', sql.Int, qualityManagerRoleId)
                .input('MenuID', sql.Int, publishingMenuId)
                .query("SELECT ID FROM [dbo].[RoleMenus] WHERE RoleID = @RoleID AND MenuID = @MenuID");
            
            if (existingQualityRoleMenuResult.recordset.length === 0) {
                await pool.request()
                    .input('RoleID', sql.Int, qualityManagerRoleId)
                    .input('MenuID', sql.Int, publishingMenuId)
                    .query("INSERT INTO [dbo].[RoleMenus] ([RoleID], [MenuID]) VALUES (@RoleID, @MenuID)");
                
                console.log('✅ 为质量经理角色分配出版异常主菜单权限');
            }
            
            // 为质量经理角色分配所有出版异常按钮权限
            const buttonMenusResult = await pool.request()
                .input('ParentID', sql.Int, publishingMenuId)
                .query(`
                    SELECT ID FROM [dbo].[Menus] 
                    WHERE ParentID = @ParentID AND MenuType = 'button'
                `);
            
            for (const buttonMenu of buttonMenusResult.recordset) {
                const existingButtonRoleResult = await pool.request()
                    .input('RoleID', sql.Int, qualityManagerRoleId)
                    .input('MenuID', sql.Int, buttonMenu.ID)
                    .query("SELECT ID FROM [dbo].[RoleMenus] WHERE RoleID = @RoleID AND MenuID = @MenuID");
                
                if (existingButtonRoleResult.recordset.length === 0) {
                    await pool.request()
                        .input('RoleID', sql.Int, qualityManagerRoleId)
                        .input('MenuID', sql.Int, buttonMenu.ID)
                        .query("INSERT INTO [dbo].[RoleMenus] ([RoleID], [MenuID]) VALUES (@RoleID, @MenuID)");
                }
            }
            
            console.log('✅ 为质量经理角色分配出版异常按钮权限');
        }
        
        console.log('');
        console.log('🎉 出版异常菜单项和权限配置完成！');
        console.log('');
        console.log('已创建的菜单项：');
        console.log('  ✅ 出版异常主菜单 (质量管理 > 出版异常)');
        console.log('  ✅ 新增出版异常按钮权限');
        console.log('  ✅ 编辑出版异常按钮权限');
        console.log('  ✅ 删除出版异常按钮权限');
        console.log('  ✅ 导出出版异常按钮权限');
        console.log('  ✅ 上传图片按钮权限');
        console.log('');
        console.log('已分配权限的角色：');
        console.log('  ✅ 系统管理员 (admin)');
        if (qualityManagerRoleResult.recordset.length > 0) {
            console.log('  ✅ 质量经理 (quality_manager)');
        }
        console.log('');
        console.log('下一步操作：');
        console.log('  1. 重启前端应用以刷新菜单缓存');
        console.log('  2. 使用管理员账户登录验证菜单显示');
        console.log('  3. 测试出版异常页面的增删改功能');
        console.log('  4. 根据需要为其他角色分配相关权限');
        console.log('');
        
    } catch (error) {
        console.error('❌ 添加出版异常菜单项失败:', error.message);
        throw error;
    } finally {
        if (pool) {
            await pool.close();
            console.log('✅ 数据库连接已关闭');
        }
    }
}

/**
 * 主函数
 */
async function main() {
    try {
        await addPublishingExceptionsMenu();
        process.exit(0);
    } catch (error) {
        console.error('执行失败:', error);
        process.exit(1);
    }
}

// 执行脚本
if (require.main === module) {
    main();
}

module.exports = { addPublishingExceptionsMenu };