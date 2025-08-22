const { executeQuery, sql } = require('./db');

/**
 * 测试数据库连接和基本查询
 */
async function testDatabase() {
  console.log('开始测试数据库连接...');
  
  try {
    // 测试简单查询
    const result = await executeQuery(async (pool) => {
      const request = pool.request();
      const queryResult = await request.query('SELECT 1 as test');
      return queryResult;
    });
    
    if (result) {
      console.log('✅ 数据库连接成功:', result.recordset);
    } else {
      console.log('❌ executeQuery返回null');
    }
    
    // 测试客户查询
    console.log('\n测试客户查询...');
    const customerResult = await executeQuery(async (pool) => {
      const request = pool.request();
      const query = `
        SELECT DISTINCT 
          CustomerCode as id,
          CustomerCode as name
        FROM CustomerComplaints 
        WHERE CustomerCode IS NOT NULL AND CustomerCode != ''
        ORDER BY CustomerCode
      `;
      
      const queryResult = await request.query(query);
      return queryResult;
    });
    
    if (customerResult) {
      console.log('✅ 客户查询成功，记录数:', customerResult.recordset.length);
    } else {
      console.log('❌ 客户查询失败');
    }
    
    // 测试岗位查询
    console.log('\n测试岗位查询...');
    const positionResult = await executeQuery(async (pool) => {
      const request = pool.request();
      const query = `
        SELECT COUNT(*) as total
        FROM Positions p
        LEFT JOIN Department d ON p.DepartmentID = d.ID
        WHERE p.Status = 1
      `;
      
      const queryResult = await request.query(query);
      return queryResult;
    });
    
    if (positionResult) {
      console.log('✅ 岗位查询成功，总数:', positionResult.recordset[0].total);
    } else {
      console.log('❌ 岗位查询失败');
    }
    
  } catch (error) {
    console.error('❌ 测试失败:', error.message);
  }
}

testDatabase();