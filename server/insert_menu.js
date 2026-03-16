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
    const parentId = 3;
    const result = await sql.query(`
      INSERT INTO Menus (ParentID, MenuCode, MenuName, MenuType, Icon, Path, Component, Permission, SortOrder, Visible, Status, CreatedAt, UpdatedAt)
      VALUES (${parentId}, 'quality:assessment-notices', '考核通知', 'menu', 'Document', '/admin/quality/assessment-notices', 'views/quality/assessment-notices/AssessmentNoticeList.vue', 'quality:assessment-notices:view', 100, 1, 1, GETDATE(), GETDATE());
      SELECT SCOPE_IDENTITY() AS InsertedID;
    `);
    const newMenuId = result.recordset[0].InsertedID;
    console.log('Inserted Menu ID:', newMenuId);
    
    // Add permission to RoleMenu (assuming Role ID 1 is admin)
    await sql.query(`
      INSERT INTO RoleMenu (RoleID, MenuID) VALUES (1, ${newMenuId});
    `);
    console.log('Permission added to Admin role.');
  } catch (err) {
    console.error(err);
  } finally {
    sql.close();
  }
}

insertMenu();