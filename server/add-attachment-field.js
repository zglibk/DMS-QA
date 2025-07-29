const sql = require('mssql');
const { getConnection } = require('./db');

async function addAttachmentField() {
  try {
    console.log('开始检查和添加AttachmentFiles字段...');
    
    const pool = await getConnection();
    
    // 检查字段是否存在
    const checkQuery = `
      SELECT COUNT(*) as count
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'ProductionReworkRegister' 
        AND COLUMN_NAME = 'AttachmentFiles'
    `;
    
    const checkResult = await pool.request().query(checkQuery);
    const fieldExists = checkResult.recordset[0].count > 0;
    
    if (fieldExists) {
      console.log('✓ AttachmentFiles字段已存在于ProductionReworkRegister表中');
    } else {
      console.log('× AttachmentFiles字段不存在，正在添加...');
      
      // 添加字段
      const addFieldQuery = `
        ALTER TABLE [dbo].[ProductionReworkRegister] 
        ADD [AttachmentFiles] NVARCHAR(1000) NULL
      `;
      
      await pool.request().query(addFieldQuery);
      console.log('✓ 已成功添加AttachmentFiles字段到ProductionReworkRegister表');
    }
    
    // 验证字段信息
    const verifyQuery = `
      SELECT 
        COLUMN_NAME,
        DATA_TYPE,
        CHARACTER_MAXIMUM_LENGTH,
        IS_NULLABLE
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'ProductionReworkRegister' 
        AND COLUMN_NAME = 'AttachmentFiles'
    `;
    
    const verifyResult = await pool.request().query(verifyQuery);
    if (verifyResult.recordset.length > 0) {
      console.log('\n字段信息验证:');
      console.log(verifyResult.recordset[0]);
    }
    
    console.log('\n字段检查和添加完成！');
    
  } catch (error) {
    console.error('添加AttachmentFiles字段失败:', error);
    process.exit(1);
  }
}

// 执行函数
addAttachmentField();