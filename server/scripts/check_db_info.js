const { executeQuery } = require('../db');

executeQuery(async pool => {
    try {
        const inst = await pool.request().query("SELECT TOP 10 ID, InstrumentName, ManagementCode FROM Instruments");
        console.log('Instruments:', inst.recordset);
        
        const tables = await pool.request().query("SELECT name FROM sys.tables");
        console.log('Tables:', tables.recordset.map(r => r.name));
        
        // Check for Inspection Items table
        // It might be 'InspectionItems' or similar
        const items = await pool.request().query("SELECT TOP 5 * FROM InspectionItems");
        console.log('InspectionItems:', items.recordset);
    } catch (e) {
        console.error(e);
    }
});
