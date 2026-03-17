const { getConnection, sql } = require('./server/db');
require('dotenv').config({ path: './server/.env' });

async function debugQualityTargets() {
  try {
    const pool = await getConnection();
    const year = 2026;
    const keyword = '一次交检合格率';
    
    console.log(`Querying for Year: ${year}, Keyword: ${keyword}`);

    const query = `
      SELECT * FROM QualityTargets 
      WHERE TargetYear = @year 
      AND QualityTarget LIKE @keyword
      AND IsDeleted = 0
    `;
    
    const request = pool.request();
    // Use proper type definitions from the imported sql module
    request.input('year', sql.Int, year);
    request.input('keyword', sql.NVarChar(100), `%${keyword}%`);
    
    const result = await request.query(query);
    
    console.log('Found records:', result.recordset.length);
    result.recordset.forEach(r => {
      console.log('--- Record ---');
      console.log('ID:', r.ID);
      console.log('Year:', r.TargetYear);
      console.log('Category:', `"${r.TargetCategory}"`);
      console.log('Target:', `"${r.QualityTarget}"`);
      console.log('Value:', `"${r.TargetValue}"`);
    });
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

debugQualityTargets();
