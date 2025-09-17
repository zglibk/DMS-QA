/**
 * 修复考核记录管理菜单路径配置脚本
 * 将数据库中的菜单路径更新为与前端路由匹配的路径
 */

const { getConnection } = require('../db');

/**
 * 主函数：修复考核记录管理菜单路径
 */
async function fixAssessmentMenuPaths() {
  try {
    console.log('=== 修复考核记录管理菜单路径配置 ===');
    
    // 获取数据库连接
    const pool = await getConnection();
    
    // 开始事务
    const transaction = pool.transaction();
    await transaction.begin();
    
    try {
      // 更新考核记录管理路径
      await transaction.request().query(`
        UPDATE [dbo].[Menus] 
        SET Path = '/admin/quality/assessment/records'
        WHERE MenuCode = 'assessment-management'
      `);
      console.log('✓ 已更新考核记录管理路径: /admin/quality/assessment/records');
      
      // 更新考核统计分析路径
      await transaction.request().query(`
        UPDATE [dbo].[Menus] 
        SET Path = '/admin/quality/assessment/statistics'
        WHERE MenuCode = 'assessment-statistics'
      `);
      console.log('✓ 已更新考核统计分析路径: /admin/quality/assessment/statistics');
      
      // 检查是否有改善跟踪菜单需要添加
      const improvementResult = await transaction.request().query(`
        SELECT COUNT(*) as count 
        FROM [dbo].[Menus] 
        WHERE MenuCode = 'assessment-improvement'
      `);
      
      if (improvementResult.recordset[0].count === 0) {
        // 添加改善跟踪菜单
        await transaction.request().query(`
          INSERT INTO [dbo].[Menus] (
            ParentID, MenuCode, MenuName, MenuType, Path, 
            Component, SortOrder, Visible, Status, Description
          ) VALUES (
            109, 'assessment-improvement', '改善跟踪', 'menu', 
            '/admin/quality/assessment/improvement',
            'quality/assessment/ImprovementTracking', 
            20, 1, 1, '考核改善跟踪管理'
          )
        `);
        console.log('✓ 已添加改善跟踪菜单: /admin/quality/assessment/improvement');
      }
      
      // 提交事务
      await transaction.commit();
      
      // 验证更新结果
      const result = await pool.request().query(`
        SELECT MenuCode, MenuName, Path 
        FROM [dbo].[Menus] 
        WHERE MenuCode LIKE '%assessment%' 
        ORDER BY SortOrder
      `);
      
      console.log('\n更新后的菜单配置：');
      console.table(result.recordset);
      
      console.log('\n=== 修复完成 ===');
      
    } catch (error) {
      // 回滚事务
      await transaction.rollback();
      throw error;
    }
    
  } catch (error) {
    console.error('修复失败:', error.message);
  }
}

// 执行修复
fixAssessmentMenuPaths();