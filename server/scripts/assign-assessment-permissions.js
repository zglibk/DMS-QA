/**
 * 为admin角色分配考核记录管理菜单权限脚本
 * 功能：确保admin角色拥有考核记录管理相关菜单的显示权限
 */

const sql = require('mssql');
const { getConnection } = require('../db');

/**
 * 为admin角色分配考核记录管理菜单权限
 */
async function assignAssessmentPermissions() {
  let pool;
  
  try {
    console.log('🔧 开始为admin角色分配考核记录管理菜单权限...');
    
    // 获取数据库连接
    pool = await getConnection();
    
    // 1. 获取admin角色ID
    const adminRoleResult = await pool.request()
      .query(`SELECT ID FROM [dbo].[Roles] WHERE RoleCode = 'admin'`);
    
    if (adminRoleResult.recordset.length === 0) {
      console.log('❌ 未找到admin角色');
      return;
    }
    
    const adminRoleId = adminRoleResult.recordset[0].ID;
    console.log(`✅ 找到admin角色，ID: ${adminRoleId}`);
    
    // 2. 获取考核记录管理相关菜单
    const menusResult = await pool.request()
      .query(`
        SELECT ID, MenuCode, MenuName
        FROM [dbo].[Menus] 
        WHERE MenuCode IN ('assessment-records', 'assessment-management', 'improvement-tracking', 'assessment-statistics')
      `);
    
    if (menusResult.recordset.length === 0) {
      console.log('❌ 未找到考核记录管理相关菜单');
      return;
    }
    
    console.log(`✅ 找到 ${menusResult.recordset.length} 个考核记录管理菜单`);
    
    // 3. 为admin角色分配菜单权限
    let assignedCount = 0;
    let skippedCount = 0;
    
    for (const menu of menusResult.recordset) {
      // 检查权限是否已存在
      const existingPermission = await pool.request()
        .input('roleId', sql.Int, adminRoleId)
        .input('menuId', sql.Int, menu.ID)
        .query(`
          SELECT COUNT(*) as count 
          FROM [dbo].[RoleMenus] 
          WHERE RoleID = @roleId AND MenuID = @menuId
        `);
      
      if (existingPermission.recordset[0].count > 0) {
        console.log(`⚠️ 跳过已存在的权限: ${menu.MenuName} (${menu.MenuCode})`);
        skippedCount++;
      } else {
        // 分配新权限
        await pool.request()
          .input('roleId', sql.Int, adminRoleId)
          .input('menuId', sql.Int, menu.ID)
          .query(`
            INSERT INTO [dbo].[RoleMenus] ([RoleID], [MenuID], [CreatedAt])
            VALUES (@roleId, @menuId, GETDATE())
          `);
        
        console.log(`✅ 已分配权限: ${menu.MenuName} (${menu.MenuCode})`);
        assignedCount++;
      }
    }
    
    // 4. 输出结果统计
    console.log('\n📊 权限分配结果统计:');
    console.log(`- 新分配权限: ${assignedCount} 个`);
    console.log(`- 跳过已存在: ${skippedCount} 个`);
    console.log(`- 总菜单数量: ${menusResult.recordset.length} 个`);
    
    // 5. 验证最终结果
    console.log('\n🔍 验证admin角色的考核记录管理菜单权限...');
    const verificationResult = await pool.request()
      .input('roleId', sql.Int, adminRoleId)
      .query(`
        SELECT 
          m.MenuCode,
          m.MenuName,
          m.Path,
          CASE WHEN m.ParentID IS NULL THEN '顶级菜单' ELSE '子菜单' END AS MenuLevel
        FROM [dbo].[RoleMenus] rm
        INNER JOIN [dbo].[Menus] m ON rm.MenuID = m.ID
        WHERE rm.RoleID = @roleId 
        AND m.MenuCode IN ('assessment-records', 'assessment-management', 'improvement-tracking', 'assessment-statistics')
        ORDER BY m.ParentID, m.SortOrder
      `);
    
    console.log('\n✅ admin角色现有的考核记录管理菜单权限:');
    console.table(verificationResult.recordset);
    
    if (verificationResult.recordset.length === menusResult.recordset.length) {
      console.log('\n🎉 权限分配完成！admin角色已拥有所有考核记录管理菜单的显示权限');
    } else {
      console.log('\n⚠️ 权限分配可能不完整，请检查数据库状态');
    }
    
  } catch (error) {
    console.error('❌ 权限分配过程中发生错误:', error.message);
    console.error('详细错误信息:', error);
  } finally {
    if (pool) {
      await pool.close();
    }
  }
}

// 执行权限分配
if (require.main === module) {
  assignAssessmentPermissions()
    .then(() => {
      console.log('\n🎉 脚本执行完成');
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ 脚本执行失败:', error);
      process.exit(1);
    });
}

module.exports = { assignAssessmentPermissions };