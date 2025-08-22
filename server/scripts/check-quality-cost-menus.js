/**
 * 检查质量成本统计菜单是否正确添加
 * 功能：验证菜单和权限配置
 */

const sql = require('mssql');
const { getConnection } = require('../db');

async function checkQualityCostMenus() {
  try {
    console.log('正在检查质量成本统计菜单配置...');
    
    const pool = await getConnection();
    
    // 检查菜单是否添加成功
    const menuResult = await pool.request().query(`
      SELECT 
        m.ID,
        m.MenuCode,
        m.MenuName,
        m.MenuType,
        m.Permission,
        m.ParentID,
        m.Path,
        m.SortOrder,
        m.Status
      FROM [dbo].[Menus] m 
      WHERE m.MenuCode IN (
        'copq', 
        'quality-cost-statistics', 
        'quality-cost-export', 
        'quality-cost-filter', 
        'quality-cost-detail'
      )
      ORDER BY m.ParentID, m.SortOrder
    `);
    
    console.log('\n=== 质量成本统计相关菜单 ===');
    console.table(menuResult.recordset);
    
    // 检查角色权限分配
    const roleMenuResult = await pool.request().query(`
      SELECT 
        r.RoleName,
        r.RoleCode,
        m.MenuName,
        m.MenuCode,
        m.Permission
      FROM [dbo].[RoleMenus] rm
      INNER JOIN [dbo].[Roles] r ON rm.RoleID = r.ID
      INNER JOIN [dbo].[Menus] m ON rm.MenuID = m.ID
      WHERE m.MenuCode IN (
        'copq', 
        'quality-cost-statistics', 
        'quality-cost-export', 
        'quality-cost-filter', 
        'quality-cost-detail'
      )
      ORDER BY r.RoleName, m.MenuCode
    `);
    
    console.log('\n=== 角色权限分配情况 ===');
    console.table(roleMenuResult.recordset);
    
    // 统计信息
    console.log('\n=== 统计信息 ===');
    console.log(`添加的菜单数量: ${menuResult.recordset.length}`);
    console.log(`权限分配数量: ${roleMenuResult.recordset.length}`);
    
    // 按角色分组显示权限
    const roleGroups = {};
    roleMenuResult.recordset.forEach(row => {
      if (!roleGroups[row.RoleName]) {
        roleGroups[row.RoleName] = [];
      }
      roleGroups[row.RoleName].push(row.MenuName);
    });
    
    console.log('\n=== 各角色拥有的质量成本统计权限 ===');
    Object.keys(roleGroups).forEach(roleName => {
      console.log(`${roleName}: ${roleGroups[roleName].join(', ')}`);
    });
    
    console.log('\n✅ 质量成本统计菜单配置检查完成！');
    
  } catch (error) {
    console.error('❌ 检查失败:', error);
  }
}

// 执行检查
checkQualityCostMenus();