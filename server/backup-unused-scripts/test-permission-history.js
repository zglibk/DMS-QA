/**
 * 测试用户权限历史接口
 */

const { sql, getDynamicConfig } = require('./db');

async function testPermissionHistory() {
  try {
    console.log('正在测试权限历史接口...');
    
    const pool = await sql.connect(await getDynamicConfig());
    
    // 测试查询用户ID为1的权限历史
    const userId = 1;
    const page = 1;
    const pageSize = 20;
    
    console.log(`查询用户ID: ${userId} 的权限历史`);
    
    // 查询总数
    const countResult = await pool.request()
      .input('UserID', sql.Int, userId)
      .query('SELECT COUNT(*) as total FROM [UserPermissionHistory] WHERE UserID = @UserID');
    
    const total = countResult.recordset[0].total;
    console.log(`总记录数: ${total}`);
    
    // 查询历史记录 - 使用ROW_NUMBER()分页（兼容SQL Server 2008）
    const startRow = (page - 1) * pageSize + 1;
    const endRow = page * pageSize;
    const result = await pool.request()
      .input('UserID', sql.Int, userId)
      .input('StartRow', sql.Int, startRow)
      .input('EndRow', sql.Int, endRow)
      .query(`
        SELECT * FROM (
          SELECT 
            h.ID,
            h.UserPermissionID,
            h.UserID,
            u.Username,
            u.RealName as UserRealName,
            h.MenuID,
            m.MenuName,
            m.MenuCode,
            h.PermissionType,
            h.PermissionLevel,
            h.ActionCode,
            h.Action,
            h.OldValue,
            h.NewValue,
            h.OperatedAt,
            h.Reason,
            op.RealName as OperatorName,
            ROW_NUMBER() OVER (ORDER BY h.OperatedAt DESC) as RowNum
          FROM [UserPermissionHistory] h
          INNER JOIN [User] u ON h.UserID = u.ID
          INNER JOIN [Menus] m ON h.MenuID = m.ID
          LEFT JOIN [User] op ON h.OperatorID = op.ID
          WHERE h.UserID = @UserID
        ) AS T
        WHERE T.RowNum BETWEEN @StartRow AND @EndRow
        ORDER BY T.RowNum
      `);
    
    console.log(`查询结果记录数: ${result.recordset.length}`);
    
    if (result.recordset.length > 0) {
      console.log('前3条记录:');
      result.recordset.slice(0, 3).forEach((record, index) => {
        console.log(`${index + 1}. ID: ${record.ID}, 用户: ${record.UserRealName}, 菜单: ${record.MenuName}, 操作: ${record.Action}`);
      });
    }
    
    await pool.close();
    console.log('测试完成！');
    
  } catch (error) {
    console.error('测试权限历史接口时出错:', error.message);
    console.error('错误详情:', error);
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  testPermissionHistory();
}

module.exports = { testPermissionHistory };