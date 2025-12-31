const { sql, executeQuery } = require('../db');

async function check() {
    try {
        await executeQuery(async (pool) => {
            const cols = await pool.request().query("SELECT TOP 1 * FROM Roles");
            console.log('Roles Columns:', Object.keys(cols.recordset[0]));
        });
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}
check();