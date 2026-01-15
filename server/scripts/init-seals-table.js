const fs = require('fs');
const path = require('path');
const { sql, getConnection } = require('../db');

async function main() {
    try {
        console.log('Connecting to database...');
        const pool = await getConnection();
        
        const sqlPath = path.join(__dirname, '../sql/create_electronic_seals_table.sql');
        console.log(`Reading SQL file from: ${sqlPath}`);
        
        const sqlContent = fs.readFileSync(sqlPath, 'utf8');
        
        console.log('Executing SQL...');
        await pool.request().query(sqlContent);
        
        console.log('Done!');
        process.exit(0);
    } catch (err) {
        console.error('Error:', err);
        process.exit(1);
    }
}

main();
