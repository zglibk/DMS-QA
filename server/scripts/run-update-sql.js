const fs = require('fs');
const path = require('path');
const { sql, getConnection } = require('../db');

async function runScript() {
  try {
    const pool = await getConnection();
    const sqlFilePath = path.join(__dirname, 'update_inspection_standards.sql');
    const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');

    const batches = sqlContent.split(/^GO/m);

    console.log(`Executing SQL script: ${sqlFilePath}`);

    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i].trim();
      if (batch) {
        console.log(`Executing batch ${i + 1}...`);
        await pool.request().query(batch);
      }
    }

    console.log('✅ SQL script executed successfully.');
  } catch (error) {
    console.error('❌ Error executing SQL script:', error);
  } finally {
    process.exit(0);
  }
}

runScript();
