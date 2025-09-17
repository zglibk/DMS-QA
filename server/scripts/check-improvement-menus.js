/**
 * 检查数据库中所有与改善期跟踪相关的菜单项
 * 用于排查菜单路径配置问题
 */

const { executeQuery, sql } = require('../config/database');

/**
 * 查询所有包含改善的菜单项
 */
async function checkImprovementMenus() {
  try {
    console.log('正在查询数据库...');
    
    console.log('\n=== 查询所有包含改善的菜单项 ===');
    const result = await executeQuery(async (pool) => {
      return await pool.request().query(`
        SELECT MenuCode, MenuName, Path, Component, ParentID, Visible, Status, SortOrder
        FROM Menus 
        WHERE MenuName LIKE '%改善%' 
        ORDER BY ParentID, SortOrder
      `);
    });
    
    console.log(`找到 ${result.recordset.length} 个相关菜单项：\n`);
    
    result.recordset.forEach((menu, index) => {
      console.log(`${index + 1}. MenuCode: ${menu.MenuCode}`);
      console.log(`   MenuName: ${menu.MenuName}`);
      console.log(`   Path: ${menu.Path}`);
      console.log(`   Component: ${menu.Component}`);
      console.log(`   ParentID: ${menu.ParentID}`);
      console.log(`   Visible: ${menu.Visible}`);
      console.log(`   Status: ${menu.Status}`);
      console.log(`   SortOrder: ${menu.SortOrder}`);
      console.log('   ---');
    });
    
    // 查询ParentID为109的所有子菜单（根据上面查询结果，改善期跟踪的ParentID都是109）
    console.log('\n=== 查询ParentID为109的所有子菜单 ===');
    const assessmentMenus = await executeQuery(async (pool) => {
      return await pool.request().query(`
        SELECT MenuCode, MenuName, Path, Component, ParentID, Visible, Status, SortOrder
        FROM Menus 
        WHERE ParentID = 109
        ORDER BY SortOrder
      `);
    });
    
    console.log(`找到 ${assessmentMenus.recordset.length} 个ParentID为109的子菜单：\n`);
    
    assessmentMenus.recordset.forEach((menu, index) => {
      console.log(`${index + 1}. MenuCode: ${menu.MenuCode}`);
      console.log(`   MenuName: ${menu.MenuName}`);
      console.log(`   Path: ${menu.Path}`);
      console.log(`   Component: ${menu.Component}`);
      console.log(`   ParentID: ${menu.ParentID}`);
      console.log(`   Visible: ${menu.Visible}`);
      console.log(`   Status: ${menu.Status}`);
      console.log(`   SortOrder: ${menu.SortOrder}`);
      console.log('   ---');
    });
    
  } catch (err) {
    console.error('查询失败:', err.message);
    console.error('错误详情:', err);
  }
}

// 执行查询
checkImprovementMenus();