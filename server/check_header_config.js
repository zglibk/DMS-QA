const { sql, executeQuery } = require('./db');

async function checkConfig() {
    try {
        const result = await executeQuery(async (pool) => {
            return await pool.request().query("SELECT * FROM PerformanceItemConfigs WHERE ItemCode = 'ReportHeader'");
        });
        console.log(JSON.stringify(result.recordset, null, 2));
    } catch (e) {
        console.error(e);
    }
}

checkConfig();
