const sql = require('mssql');
const { getConnection } = require('../db');

async function checkMenuSortOrder() {
  let pool;
  try {
    pool = await getConnection();
    const result = await pool.request().query(`
      SELECT ID, MenuName, MenuCode, SortOrder 
      FROM [dbo].[Menus] 
      WHERE ParentID IS NULL 
      ORDER BY SortOrder
    `);
    
    console.log('Current Top Level Menus:');
    console.table(result.recordset);
    
  } catch (err) {
    console.error('Error:', err);
  } finally {
    if (pool) await pool.close();
  }
}

checkMenuSortOrder();
