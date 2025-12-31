const { sql, getDynamicConfig } = require('../server/db');

async function run() {
    try {
        console.log("Connecting to DB...");
        const pool = await sql.connect(await getDynamicConfig());
        
        // Check if ParentID column exists
        const check = await pool.request().query(`
            SELECT COL_LENGTH('Positions', 'ParentID') as ColLength
        `);
        
        if (check.recordset[0].ColLength !== null) {
            console.log("ParentID column already exists.");
        } else {
            console.log("Adding ParentID column...");
            await pool.request().query(`
                ALTER TABLE Positions ADD ParentID INT NULL;
                ALTER TABLE Positions ADD CONSTRAINT FK_Positions_ParentID FOREIGN KEY (ParentID) REFERENCES Positions(ID);
            `);
            console.log("ParentID column added.");
        }
        
        process.exit(0);
    } catch (err) {
        console.error("Error:", err);
        process.exit(1);
    }
}

run();
