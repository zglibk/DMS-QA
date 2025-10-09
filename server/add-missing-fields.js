const { getConnection } = require('./config/database');

/**
 * 添加CalibrationResults表缺少的字段
 */
async function addMissingFields() {
  try {
    console.log('正在连接数据库...');
    
    // 等待一段时间确保数据库连接池已准备好
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const pool = await getConnection();
    console.log('数据库连接成功');
    
    // 需要添加的字段
    const fieldsToAdd = [
      { name: 'InstrumentCode', type: 'NVARCHAR(50)' },
      { name: 'ManagementCode', type: 'NVARCHAR(50)' },
      { name: 'EnvironmentalConditions', type: 'NVARCHAR(500)' },
      { name: 'NextCalibrationDate', type: 'DATETIME' }
    ];
    
    // 检查并添加每个字段
    for (const field of fieldsToAdd) {
      try {
        // 检查字段是否存在
        const checkResult = await pool.request().query(`
          SELECT COUNT(*) as count 
          FROM INFORMATION_SCHEMA.COLUMNS 
          WHERE TABLE_NAME = 'CalibrationResults' AND COLUMN_NAME = '${field.name}'
        `);
        
        if (checkResult.recordset[0].count === 0) {
          // 字段不存在，添加字段
          await pool.request().query(`
            ALTER TABLE CalibrationResults 
            ADD ${field.name} ${field.type} NULL
          `);
          console.log(`✓ 已添加字段: ${field.name}`);
        } else {
          console.log(`- 字段已存在: ${field.name}`);
        }
      } catch (error) {
        console.error(`✗ 添加字段 ${field.name} 失败:`, error.message);
      }
    }
    
    // 查询并显示表结构
    const result = await pool.request().query(`
      SELECT 
        COLUMN_NAME, 
        DATA_TYPE, 
        IS_NULLABLE,
        CHARACTER_MAXIMUM_LENGTH
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'CalibrationResults' 
      ORDER BY ORDINAL_POSITION
    `);
    
    console.log('\nCalibrationResults表当前结构:');
    console.log('='.repeat(80));
    console.log('字段名'.padEnd(25) + ' | ' + '数据类型'.padEnd(15) + ' | ' + '可空'.padEnd(8) + ' | ' + '最大长度');
    console.log('='.repeat(80));
    result.recordset.forEach(col => {
      console.log(`${col.COLUMN_NAME.padEnd(25)} | ${col.DATA_TYPE.padEnd(15)} | ${col.IS_NULLABLE.padEnd(8)} | ${col.CHARACTER_MAXIMUM_LENGTH || ''}`);
    });
    console.log('='.repeat(80));
    
    console.log('\n字段添加操作完成！');
    
  } catch (error) {
    console.error('操作失败:', error.message);
    console.error('错误详情:', error);
  }
}

// 执行函数
addMissingFields();