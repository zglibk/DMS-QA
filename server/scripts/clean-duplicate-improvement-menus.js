/**
 * 清理重复的改善跟踪菜单项脚本
 * 功能：删除重复的改善跟踪菜单，保留标准的改善期跟踪菜单
 * 版本：v1.0
 * 创建日期：2025-01-27
 */

const { executeQuery, sql } = require('../config/database');

/**
 * 清理重复的改善跟踪菜单项
 * 删除 assessment-improvement 菜单项，保留 improvement-tracking 菜单项
 * 并将保留的菜单项路径更新为标准路径
 */
async function cleanDuplicateImprovementMenus() {
  try {
    console.log('=== 开始清理重复的改善跟踪菜单项 ===');
    
    // 1. 查询当前的改善相关菜单项
    console.log('\n1. 查询当前改善相关菜单项...');
    const currentMenus = await executeQuery(async (pool) => {
      return await pool.request().query(`
        SELECT MenuCode, MenuName, Path, Component, ParentID, SortOrder
        FROM Menus 
        WHERE MenuName LIKE '%改善%' 
        ORDER BY MenuCode
      `);
    });
    
    console.log('当前改善相关菜单项：');
    currentMenus.recordset.forEach((menu, index) => {
      console.log(`${index + 1}. ${menu.MenuCode} - ${menu.MenuName}`);
      console.log(`   路径: ${menu.Path}`);
      console.log(`   组件: ${menu.Component}`);
      console.log('   ---');
    });
    
    // 2. 删除重复的 assessment-improvement 菜单项
    console.log('\n2. 删除重复的改善跟踪菜单项 (assessment-improvement)...');
    const deleteResult = await executeQuery(async (pool) => {
      return await pool.request().query(`
        DELETE FROM Menus 
        WHERE MenuCode = 'assessment-improvement'
      `);
    });
    
    if (deleteResult.rowsAffected[0] > 0) {
      console.log(`✅ 成功删除重复菜单项，影响行数: ${deleteResult.rowsAffected[0]}`);
    } else {
      console.log('⚠️ 未找到需要删除的菜单项');
    }
    
    // 3. 更新保留菜单项的路径为标准路径
    console.log('\n3. 更新保留菜单项的路径为标准路径...');
    const updateResult = await executeQuery(async (pool) => {
      return await pool.request().query(`
        UPDATE Menus 
        SET Path = '/admin/quality/assessment/improvement',
            Component = 'quality/assessment/ImprovementTracking'
        WHERE MenuCode = 'improvement-tracking'
      `);
    });
    
    if (updateResult.rowsAffected[0] > 0) {
      console.log(`✅ 成功更新菜单路径，影响行数: ${updateResult.rowsAffected[0]}`);
    } else {
      console.log('⚠️ 未找到需要更新的菜单项');
    }
    
    // 4. 验证清理结果
    console.log('\n4. 验证清理结果...');
    const finalMenus = await executeQuery(async (pool) => {
      return await pool.request().query(`
        SELECT MenuCode, MenuName, Path, Component, ParentID, SortOrder
        FROM Menus 
        WHERE MenuName LIKE '%改善%' 
        ORDER BY SortOrder
      `);
    });
    
    console.log('\n清理后的改善相关菜单项：');
    finalMenus.recordset.forEach((menu, index) => {
      console.log(`${index + 1}. ${menu.MenuCode} - ${menu.MenuName}`);
      console.log(`   路径: ${menu.Path}`);
      console.log(`   组件: ${menu.Component}`);
      console.log(`   排序: ${menu.SortOrder}`);
      console.log('   ---');
    });
    
    console.log('\n=== 清理完成 ===');
    console.log('✅ 重复的改善跟踪菜单项已清理');
    console.log('✅ 保留了"改善期跟踪"菜单项');
    console.log('✅ 路径已更新为标准路径: /admin/quality/assessment/improvement');
    
  } catch (err) {
    console.error('❌ 清理失败:', err.message);
    console.error('错误详情:', err);
    throw err;
  }
}

// 执行清理
cleanDuplicateImprovementMenus()
  .then(() => {
    console.log('\n🎉 菜单清理任务执行成功！');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 菜单清理任务执行失败:', error.message);
    process.exit(1);
  });