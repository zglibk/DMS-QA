const { sql, executeQuery } = require('../db');

async function run() {
    try {
        await executeQuery(async (pool) => {
            // 1. Find Parent
            const parentRes = await pool.request()
                .query("SELECT ID FROM Menus WHERE Permission = 'quality:performance:list'");
            
            if (parentRes.recordset.length === 0) {
                console.log('Parent menu not found');
                return;
            }
            const parentId = parentRes.recordset[0].ID;
            
            // 2. Check if exists
            const check = await pool.request()
                .input('Permission', 'quality:performance:config')
                .query("SELECT ID FROM Menus WHERE Permission = @Permission");
                
            if (check.recordset.length > 0) {
                console.log('Menu already exists');
                return;
            }
            
            // 3. Insert
            const insert = await pool.request()
                .input('ParentID', parentId)
                .input('MenuName', '实验项目配置')
                .input('MenuCode', 'performance:config')
                .input('MenuType', 'button')
                .input('Permission', 'quality:performance:config')
                .input('SortOrder', 1)
                .input('Status', 1)
                .query(`
                    INSERT INTO Menus (ParentID, MenuName, MenuCode, MenuType, Permission, SortOrder, Status, Visible)
                    OUTPUT INSERTED.ID
                    VALUES (@ParentID, @MenuName, @MenuCode, @MenuType, @Permission, @SortOrder, @Status, 0)
                `);
            
            const newId = insert.recordset[0].ID;
            console.log(`Inserted Menu ID: ${newId}`);
            
            // 4. Assign to Admin Role (ID 1 usually)
            // Check Admin Role ID
            const roleRes = await pool.request().query("SELECT ID FROM Roles WHERE Name IN ('admin', '系统管理员')");
            if (roleRes.recordset.length > 0) {
                const roleId = roleRes.recordset[0].ID;
                
                // Check if mapping exists
                const mappingCheck = await pool.request()
                    .input('RoleID', roleId)
                    .input('MenuID', newId)
                    .query("SELECT * FROM RoleMenus WHERE RoleID = @RoleID AND MenuID = @MenuID");
                
                if (mappingCheck.recordset.length === 0) {
                    await pool.request()
                        .input('RoleID', roleId)
                        .input('MenuID', newId)
                        .query("INSERT INTO RoleMenus (RoleID, MenuID) VALUES (@RoleID, @MenuID)");
                    console.log(`Assigned to Role ID: ${roleId}`);
                }
            }
        });
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}
run();