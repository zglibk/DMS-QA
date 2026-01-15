const sql = require('mssql');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const sealMenu = {
    code: 'electronic-seal',
    name: '电子签章',
    type: 'menu',
    icon: 'Stamp', // Assuming 'Stamp' icon exists in frontend
    path: '/admin/system/seals',
    component: 'admin/system/ElectronicSeal',
    permission: 'system:seal:list',
    sortOrder: 100,
    visible: 1,
    status: 1,
    description: '电子签章管理',
    roles: ['admin'],
    children: [
        {
            code: 'seal-add',
            name: '新增',
            type: 'button',
            permission: 'system:seal:add',
            sortOrder: 10,
            description: '新增印章'
        },
        {
            code: 'seal-edit',
            name: '编辑',
            type: 'button',
            permission: 'system:seal:edit',
            sortOrder: 20,
            description: '编辑印章'
        },
        {
            code: 'seal-delete',
            name: '删除',
            type: 'button',
            permission: 'system:seal:delete',
            sortOrder: 30,
            description: '删除印章'
        }
    ]
};

// Database config
const dbConfig = {
    server: process.env.DB_SERVER || 'localhost',
    database: process.env.DB_DATABASE || 'DMS-QA',
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

async function addSealMenu() {
    let pool;
    try {
        console.log('Connecting to database...');
        pool = await sql.connect(dbConfig);
        console.log('Connected.');

        const transaction = new sql.Transaction(pool);
        await transaction.begin();

        try {
            // 1. Find 'System Management' menu ID
            // Try 'system' code or '系统管理' name
            let parentId = null;
            const parentResult = await transaction.request()
                .query("SELECT ID FROM [dbo].[Menus] WHERE MenuCode = 'system' OR MenuName = '系统管理'");
            
            if (parentResult.recordset.length > 0) {
                parentId = parentResult.recordset[0].ID;
                console.log(`Found parent menu 'System Management', ID: ${parentId}`);
            } else {
                console.warn("Parent menu 'System Management' not found. Creating as top-level menu.");
                parentId = 0; // Top level
            }

            // 2. Insert/Update Seal Menu
            let menuId;
            const existingMenu = await transaction.request()
                .input('code', sql.NVarChar(50), sealMenu.code)
                .query('SELECT ID FROM [dbo].[Menus] WHERE MenuCode = @code');

            if (existingMenu.recordset.length > 0) {
                menuId = existingMenu.recordset[0].ID;
                console.log(`Menu '${sealMenu.name}' exists (ID: ${menuId}), updating...`);
                await transaction.request()
                    .input('id', sql.Int, menuId)
                    .input('parentId', sql.Int, parentId)
                    .input('name', sql.NVarChar(50), sealMenu.name)
                    .input('icon', sql.NVarChar(50), sealMenu.icon)
                    .input('path', sql.NVarChar(200), sealMenu.path)
                    .input('component', sql.NVarChar(200), sealMenu.component)
                    .input('permission', sql.NVarChar(100), sealMenu.permission)
                    .input('sortOrder', sql.Int, sealMenu.sortOrder)
                    .input('description', sql.NVarChar(500), sealMenu.description)
                    .query(`UPDATE [dbo].[Menus] SET ParentID = @parentId, MenuName = @name, Icon = @icon, Path = @path, Component = @component, Permission = @permission, SortOrder = @sortOrder, Description = @description WHERE ID = @id`);
            } else {
                console.log(`Creating menu '${sealMenu.name}'...`);
                const result = await transaction.request()
                    .input('parentId', sql.Int, parentId)
                    .input('code', sql.NVarChar(50), sealMenu.code)
                    .input('name', sql.NVarChar(50), sealMenu.name)
                    .input('type', sql.NVarChar(10), sealMenu.type)
                    .input('icon', sql.NVarChar(50), sealMenu.icon)
                    .input('path', sql.NVarChar(200), sealMenu.path)
                    .input('component', sql.NVarChar(200), sealMenu.component)
                    .input('permission', sql.NVarChar(100), sealMenu.permission)
                    .input('sortOrder', sql.Int, sealMenu.sortOrder)
                    .input('visible', sql.Bit, sealMenu.visible)
                    .input('status', sql.Bit, sealMenu.status)
                    .input('description', sql.NVarChar(500), sealMenu.description)
                    .query(`INSERT INTO [dbo].[Menus] (ParentID, MenuCode, MenuName, MenuType, Icon, Path, Component, Permission, SortOrder, Visible, Status, Description) OUTPUT INSERTED.ID VALUES (@parentId, @code, @name, @type, @icon, @path, @component, @permission, @sortOrder, @visible, @status, @description)`);
                menuId = result.recordset[0].ID;
            }

            // 3. Process Children (Buttons)
            if (sealMenu.children) {
                for (const child of sealMenu.children) {
                    const existingChild = await transaction.request()
                        .input('code', sql.NVarChar(50), child.code)
                        .query('SELECT ID FROM [dbo].[Menus] WHERE MenuCode = @code');
                    
                    let childId;
                    if (existingChild.recordset.length > 0) {
                        childId = existingChild.recordset[0].ID;
                        await transaction.request()
                            .input('id', sql.Int, childId)
                            .input('parentId', sql.Int, menuId)
                            .input('name', sql.NVarChar(50), child.name)
                            .input('permission', sql.NVarChar(100), child.permission)
                            .input('sortOrder', sql.Int, child.sortOrder)
                            .query(`UPDATE [dbo].[Menus] SET ParentID = @parentId, MenuName = @name, Permission = @permission, SortOrder = @sortOrder WHERE ID = @id`);
                    } else {
                        const childResult = await transaction.request()
                            .input('parentId', sql.Int, menuId)
                            .input('code', sql.NVarChar(50), child.code)
                            .input('name', sql.NVarChar(50), child.name)
                            .input('type', sql.NVarChar(10), child.type)
                            .input('permission', sql.NVarChar(100), child.permission)
                            .input('sortOrder', sql.Int, child.sortOrder)
                            .input('visible', sql.Bit, 1)
                            .input('status', sql.Bit, 1)
                            .input('description', sql.NVarChar(500), child.description)
                            .query(`INSERT INTO [dbo].[Menus] (ParentID, MenuCode, MenuName, MenuType, Permission, SortOrder, Visible, Status, Description) OUTPUT INSERTED.ID VALUES (@parentId, @code, @name, @type, @permission, @sortOrder, @visible, @status, @description)`);
                        childId = childResult.recordset[0].ID;
                    }

                    // Assign role permissions for child
                    for (const roleCode of sealMenu.roles) {
                        const roleResult = await transaction.request().input('roleCode', sql.NVarChar(20), roleCode).query('SELECT ID FROM [dbo].[Roles] WHERE RoleCode = @roleCode');
                        if (roleResult.recordset.length > 0) {
                            const roleId = roleResult.recordset[0].ID;
                            const permCheck = await transaction.request().input('roleId', sql.Int, roleId).input('menuId', sql.Int, childId).query('SELECT COUNT(*) as count FROM [dbo].[RoleMenus] WHERE RoleID = @roleId AND MenuID = @menuId');
                            if (permCheck.recordset[0].count === 0) {
                                await transaction.request().input('roleId', sql.Int, roleId).input('menuId', sql.Int, childId).query(`INSERT INTO [dbo].[RoleMenus] (RoleID, MenuID, CreatedAt) VALUES (@roleId, @menuId, GETDATE())`);
                            }
                        }
                    }
                }
            }

            // 4. Assign role permissions for parent menu
            for (const roleCode of sealMenu.roles) {
                const roleResult = await transaction.request().input('roleCode', sql.NVarChar(20), roleCode).query('SELECT ID FROM [dbo].[Roles] WHERE RoleCode = @roleCode');
                if (roleResult.recordset.length > 0) {
                    const roleId = roleResult.recordset[0].ID;
                    const permCheck = await transaction.request().input('roleId', sql.Int, roleId).input('menuId', sql.Int, menuId).query('SELECT COUNT(*) as count FROM [dbo].[RoleMenus] WHERE RoleID = @roleId AND MenuID = @menuId');
                    if (permCheck.recordset[0].count === 0) {
                        await transaction.request().input('roleId', sql.Int, roleId).input('menuId', sql.Int, menuId).query(`INSERT INTO [dbo].[RoleMenus] (RoleID, MenuID, CreatedAt) VALUES (@roleId, @menuId, GETDATE())`);
                    }
                }
            }

            await transaction.commit();
            console.log('Done.');
        } catch (err) {
            await transaction.rollback();
            throw err;
        }
    } catch (err) {
        console.error('Error:', err);
    } finally {
        if (pool) await pool.close();
    }
}

addSealMenu();
