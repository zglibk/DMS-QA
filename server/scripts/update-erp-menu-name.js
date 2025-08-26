/**
 * ERP菜单名称更新脚本
 * 功能：将侧边栏中的"ERP管理"改为"ERP对接"
 * 版本：v1.0
 * 创建日期：2025-01-27
 */

const sql = require('mssql');
const { getConnection } = require('../db');

/**
 * 更新ERP菜单名称
 */
async function updateErpMenuName() {
  let pool;
  
  try {
    console.log('🚀 开始更新ERP菜单名称...');
    
    // 获取数据库连接
    pool = await getConnection();
    
    // 1. 查找ERP管理菜单
    console.log('\n📋 步骤1：查找ERP管理菜单...');
    const result = await pool.request()
      .query("SELECT ID FROM [dbo].[Menus] WHERE MenuCode = 'erp-management'");
    
    if (result.recordset.length === 0) {
      throw new Error('❌ 未找到ERP管理菜单');
    }
    
    const erpMenuId = result.recordset[0].ID;
    console.log(`✅ 找到ERP管理菜单，ID: ${erpMenuId}`);
    
    // 2. 更新菜单名称
    console.log('\n📋 步骤2：更新菜单名称...');
    await pool.request()
      .query(`
        UPDATE [dbo].[Menus] 
        SET [MenuName] = N'ERP对接',
            [UpdatedAt] = GETDATE()
        WHERE MenuCode = 'erp-management'
      `);
    
    console.log('✅ ERP菜单名称更新成功：ERP管理 → ERP对接');
    
    // 3. 验证更新结果
    console.log('\n📋 步骤3：验证更新结果...');
    const verifyResult = await pool.request()
      .query(`
        SELECT 
          p.MenuName AS ParentMenu,
          m.MenuName AS MenuName,
          m.MenuCode,
          m.Path,
          m.Component,
          m.Icon,
          m.Permission,
          m.SortOrder,
          CASE WHEN m.Status = 1 THEN '启用' ELSE '禁用' END AS Status,
          m.UpdatedAt
        FROM [dbo].[Menus] m
        LEFT JOIN [dbo].[Menus] p ON m.ParentID = p.ID
        WHERE m.MenuCode = 'erp-management'
        ORDER BY m.SortOrder
      `);
    
    if (verifyResult.recordset.length > 0) {
      const menu = verifyResult.recordset[0];
      console.log('\n✅ 验证更新结果：');
      console.log(`   父菜单: ${menu.ParentMenu}`);
      console.log(`   菜单名称: ${menu.MenuName}`);
      console.log(`   菜单编码: ${menu.MenuCode}`);
      console.log(`   访问路径: ${menu.Path}`);
      console.log(`   Vue组件: ${menu.Component}`);
      console.log(`   权限标识: ${menu.Permission}`);
      console.log(`   状态: ${menu.Status}`);
      console.log(`   更新时间: ${menu.UpdatedAt}`);
    }
    
    // 4. 显示完成信息
    console.log('\n🎉 ERP菜单名称更新完成！');
    console.log('\n📁 更新后的菜单结构：');
    console.log('  系统管理 (system)');
    console.log('    └── ERP对接 (erp-management)');
    console.log('\n📝 更新说明：');
    console.log('  - 菜单名称：ERP管理 → ERP对接');
    console.log('  - 菜单编码：erp-management（保持不变）');
    console.log('  - 访问路径：/system/erp（保持不变）');
    console.log('  - Vue组件：admin/ErpManagement（保持不变）');
    console.log('  - 权限标识：system:erp:view（保持不变）');
    console.log('\n下一步：');
    console.log('  1. 重启前端应用以加载更新后的菜单名称');
    console.log('  2. 确认侧边栏显示正确的菜单名称');
    
  } catch (error) {
    console.error('❌ 更新ERP菜单名称失败：', error.message);
    throw error;
  } finally {
    if (pool) {
      try {
        await pool.close();
      } catch (closeError) {
        console.error('⚠️ 关闭数据库连接时出错：', closeError.message);
      }
    }
  }
}

// 执行更新
if (require.main === module) {
  updateErpMenuName().catch(console.error);
}

module.exports = { updateErpMenuName };