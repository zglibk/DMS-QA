const { sql, executeQuery } = require('../db');

async function run() {
    try {
        await executeQuery(async (pool) => {
            const check = await pool.request().query("SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'PerformanceItemConfigs' AND COLUMN_NAME = 'FormConfig'");
            
            if (check.recordset.length === 0) {
                console.log('Adding FormConfig column...');
                await pool.request().query("ALTER TABLE PerformanceItemConfigs ADD FormConfig NVARCHAR(MAX)");
                console.log('Done.');
            } else {
                console.log('Column FormConfig already exists.');
            }
        });
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}
run();