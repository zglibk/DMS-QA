const { sql, executeQuery } = require('../db');

async function checkItems() {
    try {
        await executeQuery(async (pool) => {
            const result = await pool.request().query('SELECT ID, ItemName, MaterialCategory, InspectionStandard, AcceptanceCriteria FROM InspectionItems WHERE Status = 1 ORDER BY MaterialCategory, SortOrder');
            console.table(result.recordset);
        });
    } catch (err) {
        console.error(err);
    }
}

checkItems();