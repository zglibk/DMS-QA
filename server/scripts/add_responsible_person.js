const { executeQuery } = require('../db');
const { sql } = require('../db');

async function addColumn() {
    await executeQuery(async (pool) => {
        await pool.request().query(`
            IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('QualityExceptions') AND name = 'ResponsiblePerson')
            BEGIN
                ALTER TABLE QualityExceptions ADD ResponsiblePerson NVARCHAR(100);
                PRINT 'ResponsiblePerson column added';
            END
            ELSE
            BEGIN
                PRINT 'ResponsiblePerson column already exists';
            END
        `);
    });
}

addColumn().then(() => {
    console.log('Done');
    process.exit(0);
}).catch(err => {
    console.error(err);
    process.exit(1);
});