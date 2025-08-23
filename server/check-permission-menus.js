const { getConnection } = require('./db');

(async () => {
  try {
    const pool = await getConnection();
    const result = await pool.request().query(`
      SELECT ID, MenuName, MenuCode, Path 
      FROM Menus 
      WHERE MenuCode LIKE '%permission%' OR MenuName LIKE '%权限%' 
      ORDER BY ID
    `);
    
    console.log('权限相关菜单:');
    if (result.recordset.length === 0) {
      console.log('未找到权限相关菜单');
    } else {
      result.recordset.forEach(menu => {
        console.log(`ID: ${menu.ID}, 名称: ${menu.MenuName}, 代码: ${menu.MenuCode}, 路径: ${menu.Path}`);
      });
    }
    
    // 查看权限管理父菜单
    const parentResult = await pool.request().query(`
      SELECT ID, MenuName, MenuCode, Path 
      FROM Menus 
      WHERE MenuCode = 'permission' OR MenuName = '权限管理'
      ORDER BY ID
    `);
    
    console.log('\n权限管理父菜单:');
    if (parentResult.recordset.length === 0) {
      console.log('未找到权限管理父菜单');
    } else {
      parentResult.recordset.forEach(menu => {
        console.log(`ID: ${menu.ID}, 名称: ${menu.MenuName}, 代码: ${menu.MenuCode}, 路径: ${menu.Path}`);
      });
    }
    
    process.exit(0);
  } catch(e) {
    console.error('查询失败:', e.message);
    process.exit(1);
  }
})();