/**
 * 验证考核记录管理菜单脚本
 * 功能：检查考核记录管理相关菜单是否已成功添加到数据库
 */

const sql = require('mssql');
const { getConnection } = require('../db');

/**
 * 查询考核记录管理相关菜单
 */
async function checkAssessmentMenus() {
  try {
    // 查询考核记录管理相关菜单
    
    const pool = await getConnection();
    
    // 查询考核记录管理相关菜单
    const query = `
      SELECT 
        ID,
        MenuCode,
        MenuName,
        Path,
        ParentID,
        SortOrder,
        Visible,
        Status
      FROM [dbo].[Menus] 
      WHERE MenuCode LIKE '%assessment%'
      ORDER BY ParentID, SortOrder
    `;
    
    const result = await pool.request().query(query);
    
    if (result.recordset.length === 0) {
      // 未找到考核记录管理相关的菜单
      return false;
    }
    
    // 找到以下考核记录管理相关菜单
    console.table(result.recordset);
    
    // 检查权限分配
    // 检查管理员角色权限分配
    const permissionQuery = `
      SELECT 
        r.RoleName,
        m.MenuName,
        m.MenuCode
      FROM [dbo].[RoleMenus] rm
      INNER JOIN [dbo].[Roles] r ON rm.RoleID = r.ID
      INNER JOIN [dbo].[Menus] m ON rm.MenuID = m.ID
      WHERE m.MenuCode LIKE '%assessment%'
      ORDER BY r.RoleName, m.MenuName
    `;
    
    const permissionResult = await pool.request().query(permissionQuery);
    
    if (permissionResult.recordset.length > 0) {
      // 权限分配情况
      console.table(permissionResult.recordset);
    }
    
    return true;
    
  } catch (error) {
    console.error('❌ 查询菜单失败:', error.message);
    return false;
  }
}

// 执行查询
checkAssessmentMenus().then((success) => {
  if (success) {
    // 考核记录管理菜单验证完成
  } else {
    // 考核记录管理菜单验证失败
  }
}).catch(error => {
  console.error('❌ 执行失败:', error);
  process.exit(1);
});