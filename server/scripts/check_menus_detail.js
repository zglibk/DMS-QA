const { sql, executeQuery } = require('../db');

async function check() {
    try {
        await executeQuery(async (pool) => {
            const cols = await pool.request().query("SELECT TOP 1 * FROM Menus");
            if (cols.recordset.length > 0) {
                console.log('Columns:', Object.keys(cols.recordset[0]));
            } else {
                console.log('Menus table empty');
            }
            
            const perms = await pool.request().query("SELECT ID, MenuName, Permission, MenuType, ParentID FROM Menus WHERE Permission LIKE '%performance%'");
            console.log('Performance Permissions:', perms.recordset);
        });
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}
check();