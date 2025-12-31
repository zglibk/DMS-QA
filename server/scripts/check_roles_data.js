const { sql, executeQuery } = require('../db');

async function check() {
    try {
        await executeQuery(async (pool) => {
            const roles = await pool.request().query("SELECT ID, RoleCode, RoleName FROM Roles");
            console.log('Roles:', roles.recordset);
        });
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}
check();