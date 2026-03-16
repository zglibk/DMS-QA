const sql = require('mssql');
require('dotenv').config({ path: '.env.development' });

const config = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  server: process.env.DB_SERVER,
  database: process.env.DB_NAME,
  options: {
    encrypt: false,
    trustServerCertificate: true
  }
};

async function checkTables() {
  try {
    await sql.connect(config);
    const result = await sql.query(`
      SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME LIKE '%Role%' OR TABLE_NAME LIKE '%Menu%';
    `);
    console.log(result.recordset);
  } catch (err) {
    console.error(err);
  } finally {
    sql.close();
  }
}

checkTables();