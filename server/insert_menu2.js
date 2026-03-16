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

async function insertMenu() {
  try {
    await sql.connect(config);
    // Add permission to RoleMenus (assuming Role ID 1 is admin)
    const newMenuId = 197; // from previous output
    await sql.query(`
      IF NOT EXISTS (SELECT * FROM RoleMenus WHERE RoleID = 1 AND MenuID = ${newMenuId})
      BEGIN
        INSERT INTO RoleMenus (RoleID, MenuID) VALUES (1, ${newMenuId});
      END
    `);
    console.log('Permission added to Admin role.');
  } catch (err) {
    console.error(err);
  } finally {
    sql.close();
  }
}

insertMenu();