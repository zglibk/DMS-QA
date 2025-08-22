/**
 * 检查菜单路径配置
 * 功能：查询数据库中质量成本相关的菜单路径配置
 */

const sql = require('mssql');
const { getConnection } = require('../db');

/**
 * 查询质量成本相关菜单
 */
async function checkMenuPaths() {
  try {
    console.log('🔍 查询质量成本相关菜单配置...');
    
    const pool = await getConnection();
    
    const query = `
      SELECT 
        ID,
        MenuName,
        Path,
        Permission,
        ParentID
      FROM Menus 
      WHERE MenuName LIKE '%质量成本%' 
         OR MenuName LIKE '%成本损失%'
         OR Path LIKE '%cost%'
         OR Path LIKE '%copq%'
      ORDER BY ParentID, ID
    `;
    
    const result = await pool.request().query(query);
    
    if (result.recordset.length === 0) {
      console.log('❌ 未找到质量成本相关的菜单配置');
      return;
    }
    
    console.log('\n📋 找到以下质量成本相关菜单:');
    console.table(result.recordset);
    
    // 检查具体的路径配置
    console.log('\n🔗 详细路径信息:');
    result.recordset.forEach(menu => {
      console.log(`- ${menu.MenuName}: ${menu.Path} (权限: ${menu.Permission})`);
    });
    
  } catch (error) {
    console.error('❌ 查询菜单配置失败:', error.message);
  }
}

// 执行查询
checkMenuPaths().then(() => {
  console.log('\n✅ 菜单路径检查完成');
}).catch(error => {
  console.error('❌ 执行失败:', error);
  process.exit(1);
});