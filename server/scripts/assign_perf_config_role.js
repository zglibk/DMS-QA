const { sql, executeQuery } = require('../db');

async function run() {
    try {
        await executeQuery(async (pool) => {
            // 1. Get MenuID
            const menuRes = await pool.request()
                .input('Permission', 'quality:performance:config')
                .query("SELECT ID FROM Menus WHERE Permission = @Permission");
            
            if (menuRes.recordset.length === 0) {
                console.log('Menu not found');
                return;
            }
            const menuId = menuRes.recordset[0].ID;
            console.log(`Menu ID: ${menuId}`);

            // 2. Get RoleID
            const roleRes = await pool.request()
                .query("SELECT ID FROM Roles WHERE RoleCode = 'admin' OR RoleName = '系统管理员'");
            
            if (roleRes.recordset.length === 0) {
                console.log('Admin role not found');
                return;
            }
            
            // Assign to all found admin roles
            for (const role of roleRes.recordset) {
                const roleId = role.ID;
                
                const check = await pool.request()
                    .input('RoleID', roleId)
                    .input('MenuID', menuId)
                    .query("SELECT * FROM RoleMenus WHERE RoleID = @RoleID AND MenuID = @MenuID");
                
                if (check.recordset.length === 0) {
                    await pool.request()
                        .input('RoleID', roleId)
                        .input('MenuID', menuId)
                        .query("INSERT INTO RoleMenus (RoleID, MenuID) VALUES (@RoleID, @MenuID)");
                    console.log(`Assigned to Role ID: ${roleId}`);
                } else {
                    console.log(`Role ID ${roleId} already has this permission`);
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