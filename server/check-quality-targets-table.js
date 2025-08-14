/**
 * 检查QualityTargets表是否存在以及数据情况
 */

const { getConnection } = require('./db');
const sql = require('mssql');

async function checkQualityTargetsTable() {
  try {
    const pool = await getConnection();
    
    // 检查表是否存在
    const tableExistsQuery = `
      SELECT COUNT(*) as TableCount 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_NAME = 'QualityTargets'
    `;
    
    const tableResult = await pool.request().query(tableExistsQuery);
    const tableExists = tableResult.recordset[0].TableCount > 0;
    
    console.log('=== QualityTargets表检查结果 ===');
    console.log('表是否存在:', tableExists);
    
    if (tableExists) {
      // 检查表结构
      const columnsQuery = `
        SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_NAME = 'QualityTargets'
        ORDER BY ORDINAL_POSITION
      `;
      
      const columnsResult = await pool.request().query(columnsQuery);
      console.log('\n表结构:');
      columnsResult.recordset.forEach(col => {
        console.log(`- ${col.COLUMN_NAME}: ${col.DATA_TYPE} (${col.IS_NULLABLE === 'YES' ? '可空' : '不可空'})`);
      });
      
      // 检查数据数量
      const countQuery = 'SELECT COUNT(*) as RecordCount FROM QualityTargets';
      const countResult = await pool.request().query(countQuery);
      const recordCount = countResult.recordset[0].RecordCount;
      
      console.log('\n数据记录数:', recordCount);
      
      if (recordCount > 0) {
        // 显示前5条记录
        const sampleQuery = `
          SELECT TOP 5 
            ID, TargetCategory, AssessmentUnit, QualityTarget, 
            TargetValue, ResponsiblePerson, CreatedAt
          FROM QualityTargets
          ORDER BY CreatedAt DESC
        `;
        
        const sampleResult = await pool.request().query(sampleQuery);
        console.log('\n前5条记录:');
        sampleResult.recordset.forEach((record, index) => {
          console.log(`${index + 1}. ID: ${record.ID}, 目标: ${record.QualityTarget}, 分类: ${record.TargetCategory}`);
        });
      }
    } else {
      console.log('\n❌ QualityTargets表不存在！');
      console.log('需要创建该表才能正常使用质量目标功能。');
    }
    
  } catch (error) {
    console.error('检查失败:', error.message);
  }
}

checkQualityTargetsTable();