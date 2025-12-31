const { sql, executeQuery } = require('../db');

async function check() {
    try {
        await executeQuery(async (pool) => {
            // Check table
            const table = await pool.request().query("SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'PerformanceItemConfigs'");
            if (table.recordset.length === 0) {
                console.log('Table PerformanceItemConfigs does NOT exist!');
            } else {
                console.log('Table exists.');
                
                // Try the query
                try {
                    const res = await pool.request().query('SELECT * FROM PerformanceItemConfigs WHERE IsEnabled = 1 ORDER BY SortOrder');
                    console.log('Query success. Rows:', res.recordset.length);
                    console.log(res.recordset);
                } catch (err) {
                    console.error('Query failed:', err);
                }
            }
        });
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}
check();