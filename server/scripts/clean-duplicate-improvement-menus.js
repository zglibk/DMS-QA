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
    // 开始清理重复的改善跟踪菜单项
    
    // 1. 查询当前的改善相关菜单项
    // 查询当前改善相关菜单项
    const currentMenus = await executeQuery(async (pool) => {
      return await pool.request().query(`
        SELECT MenuCode, MenuName, Path, Component, ParentID, SortOrder
        FROM Menus 
        WHERE MenuName LIKE '%改善%' 
        ORDER BY MenuCode
      `);
    });
    
    // 当前改善相关菜单项
    currentMenus.recordset.forEach((menu, index) => {
      // 菜单项信息记录
    });
    
    // 2. 删除重复的 assessment-improvement 菜单项
    // 删除重复的改善跟踪菜单项 (assessment-improvement)
    const deleteResult = await executeQuery(async (pool) => {
      return await pool.request().query(`
        DELETE FROM Menus 
        WHERE MenuCode = 'assessment-improvement'
      `);
    });
    
    if (deleteResult.rowsAffected[0] > 0) {
      // 成功删除重复菜单项
    } else {
      // 未找到需要删除的菜单项
    }
    }
    
    // 3. 更新保留菜单项的路径为标准路径
    // 更新保留菜单项的路径为标准路径
    const updateResult = await executeQuery(async (pool) => {
      return await pool.request().query(`
        UPDATE Menus 
        SET Path = '/admin/quality/assessment/improvement',
            Component = 'quality/assessment/ImprovementTracking'
        WHERE MenuCode = 'improvement-tracking'
      `);
    });
    
    if (updateResult.rowsAffected[0] > 0) {
      // 成功更新菜单路径
    } else {
      // 未找到需要更新的菜单项
    }
    
    // 4. 验证清理结果
    // 验证清理结果
    const finalMenus = await executeQuery(async (pool) => {
      return await pool.request().query(`
        SELECT MenuCode, MenuName, Path, Component, ParentID, SortOrder
        FROM Menus 
        WHERE MenuName LIKE '%改善%' 
        ORDER BY SortOrder
      `);
    });
    
    // 清理后的改善相关菜单项
    finalMenus.recordset.forEach((menu, index) => {
      // 菜单项信息记录
    });
    
    // 清理完成
    // 重复的改善跟踪菜单项已清理
    // 保留了"改善期跟踪"菜单项
    // 路径已更新为标准路径: /admin/quality/assessment/improvement
    
  } catch (err) {
    console.error('❌ 清理失败:', err.message);
    console.error('错误详情:', err);
    throw err;
  }
}

// 执行清理
cleanDuplicateImprovementMenus()
  .then(() => {
    // 菜单清理任务执行成功
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 菜单清理任务执行失败:', error.message);
    process.exit(1);
  });