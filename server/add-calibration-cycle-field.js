const { getConnection, sql } = require('./config/database');

/**
 * 为CalibrationResults表添加校准周期字段
 * 校准周期字段用于记录仪器的校准间隔时间（以月为单位）
 */
async function addCalibrationCycleField() {
  try {
    console.log('正在连接数据库...');
    const pool = await getConnection();
    
    // 检查CalibrationCycle字段是否已存在
    const checkFieldQuery = `
      SELECT COUNT(*) as count
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'CalibrationResults' 
      AND COLUMN_NAME = 'CalibrationCycle'
    `;
    
    const checkResult = await pool.request().query(checkFieldQuery);
    
    if (checkResult.recordset[0].count > 0) {
      console.log('✅ CalibrationCycle字段已存在，无需添加');
      return;
    }
    
    // 添加CalibrationCycle字段
    const addFieldQuery = `
      ALTER TABLE CalibrationResults 
      ADD CalibrationCycle INT NULL
    `;
    
    console.log('正在添加CalibrationCycle字段...');
    await pool.request().query(addFieldQuery);
    console.log('✅ CalibrationCycle字段添加成功');
    
    // 添加字段注释
    const addCommentQuery = `
      EXEC sp_addextendedproperty 
      @name = N'MS_Description',
      @value = N'校准周期（月）',
      @level0type = N'SCHEMA',
      @level0name = N'dbo',
      @level1type = N'TABLE',
      @level1name = N'CalibrationResults',
      @level2type = N'COLUMN',
      @level2name = N'CalibrationCycle'
    `;
    
    try {
      await pool.request().query(addCommentQuery);
      console.log('✅ 字段注释添加成功');
    } catch (commentError) {
      console.log('⚠️ 字段注释添加失败（可忽略）:', commentError.message);
    }
    
    // 验证字段添加结果
    const verifyQuery = `
      SELECT 
        COLUMN_NAME, 
        DATA_TYPE, 
        IS_NULLABLE,
        COLUMN_DEFAULT
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'CalibrationResults' 
      AND COLUMN_NAME = 'CalibrationCycle'
    `;
    
    const verifyResult = await pool.request().query(verifyQuery);
    
    if (verifyResult.recordset.length > 0) {
      const field = verifyResult.recordset[0];
      console.log('\n📋 字段信息:');
      console.log(`字段名: ${field.COLUMN_NAME}`);
      console.log(`数据类型: ${field.DATA_TYPE}`);
      console.log(`允许空值: ${field.IS_NULLABLE}`);
      console.log(`默认值: ${field.COLUMN_DEFAULT || 'NULL'}`);
    }
    
    console.log('\n🎉 CalibrationCycle字段添加完成！');
    
  } catch (error) {
    console.error('❌ 添加CalibrationCycle字段失败:', error.message);
    console.error('错误详情:', error);
    throw error;
  }
}

// 执行脚本
if (require.main === module) {
  addCalibrationCycleField()
    .then(() => {
      console.log('脚本执行完成');
      process.exit(0);
    })
    .catch((error) => {
      console.error('脚本执行失败:', error);
      process.exit(1);
    });
}

module.exports = { addCalibrationCycleField };