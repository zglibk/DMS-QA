/**
 * 查询考核记录管理菜单路径配置脚本
 * 用于检查数据库中菜单的路径设置是否与前端路由匹配
 */

const { getConnection } = require('../db');

/**
 * 主函数：查询考核记录管理相关菜单
 */
async function checkAssessmentMenuPaths() {
  try {
    console.log('=== 查询考核记录管理菜单路径配置 ===');
    
    // 获取数据库连接
    const pool = await getConnection();
    
    // 查询考核记录管理相关菜单
    const result = await pool.request().query(`
      SELECT 
        MenuCode,
        MenuName,
        Path,
        ParentID,
        SortOrder
      FROM [dbo].[Menus] 
      WHERE MenuCode LIKE '%assessment%' 
      ORDER BY ParentID, SortOrder
    `);
    
    console.log('\n考核记录管理菜单配置：');
    console.table(result.recordset);
    
    // 检查路径格式
    console.log('\n路径分析：');
    result.recordset.forEach(menu => {
      console.log(`${menu.MenuName}: ${menu.Path}`);
    });
    
    console.log('\n=== 查询完成 ===');
    
  } catch (error) {
    console.error('查询失败:', error.message);
  }
}

// 执行查询
checkAssessmentMenuPaths();