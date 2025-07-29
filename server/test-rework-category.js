const sql = require('mssql');
const { getConnection } = require('./db');

async function testReworkCategory() {
  try {
    console.log('连接数据库...');
    const pool = await getConnection();
    
    console.log('查询返工记录数据...');
    const result = await pool.request().query(`
      SELECT TOP 5 
        ID, 
        ReworkDate, 
        CustomerCode, 
        OrderNo, 
        ProductName, 
        ReworkCategory,
        ReworkPersonnel,
        ReworkStatus
      FROM ProductionReworkRegister 
      ORDER BY ID DESC
    `);
    
    console.log('查询结果:');
    console.log('记录数量:', result.recordset.length);
    
    result.recordset.forEach((record, index) => {
      console.log(`\n记录 ${index + 1}:`);
      console.log('ID:', record.ID);
      console.log('返工日期:', record.ReworkDate);
      console.log('客户编号:', record.CustomerCode);
      console.log('工单号:', record.OrderNo);
      console.log('产品名称:', record.ProductName);
      console.log('返工类别:', record.ReworkCategory);
      console.log('返工人员:', record.ReworkPersonnel);
      console.log('返工状态:', record.ReworkStatus);
    });
    
    // 检查ReworkCategory字段的数据分布
    const categoryResult = await pool.request().query(`
      SELECT 
        ReworkCategory, 
        COUNT(*) as count 
      FROM ProductionReworkRegister 
      WHERE ReworkCategory IS NOT NULL AND ReworkCategory != ''
      GROUP BY ReworkCategory
    `);
    
    console.log('\n返工类别数据分布:');
    categoryResult.recordset.forEach(row => {
      console.log(`${row.ReworkCategory}: ${row.count} 条记录`);
    });
    
    // 检查空值情况
    const nullResult = await pool.request().query(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN ReworkCategory IS NULL OR ReworkCategory = '' THEN 1 ELSE 0 END) as null_count
      FROM ProductionReworkRegister
    `);
    
    console.log('\n数据统计:');
    console.log('总记录数:', nullResult.recordset[0].total);
    console.log('ReworkCategory为空的记录数:', nullResult.recordset[0].null_count);
    
  } catch (error) {
    console.error('查询失败:', error);
  }
}

testReworkCategory();