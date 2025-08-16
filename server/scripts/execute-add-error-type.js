/**
 * 执行添加错误类型字段的数据库脚本
 * 
 * 功能说明：
 * 1. 连接到SQL Server数据库
 * 2. 执行SQL脚本添加error_type字段
 * 3. 为新字段创建索引
 * 4. 输出执行结果
 */

const fs = require('fs');
const path = require('path');
const { executeQuery } = require('../db');

/**
 * 执行添加错误类型字段的SQL脚本
 */
async function addErrorTypeField() {
  try {
    console.log('开始执行添加错误类型字段的数据库脚本...');
    
    // 读取SQL脚本文件
    const sqlFilePath = path.join(__dirname, 'add-error-type-field.sql');
    const sqlScript = fs.readFileSync(sqlFilePath, 'utf8');
    
    // 分割SQL脚本（按GO分割）
    const sqlCommands = sqlScript.split(/\bGO\b/i).filter(cmd => cmd.trim());
    
    // 逐个执行SQL命令
    for (let i = 0; i < sqlCommands.length; i++) {
      const command = sqlCommands[i].trim();
      if (command) {
        console.log(`执行SQL命令 ${i + 1}/${sqlCommands.length}...`);
        await executeQuery(async (pool) => {
          return await pool.request().query(command);
        });
      }
    }
    
    console.log('✅ 数据库表结构更新成功！');
    console.log('已添加error_type字段到publishing_exceptions表');
    
  } catch (error) {
    console.error('❌ 数据库表结构更新失败:', error.message);
    throw error;
  }
}

/**
 * 验证字段是否添加成功
 */
async function verifyErrorTypeField() {
  try {
    console.log('验证error_type字段是否添加成功...');
    
    const result = await executeQuery(async (pool) => {
      return await pool.request().query(`
        SELECT 
          COLUMN_NAME,
          DATA_TYPE,
          CHARACTER_MAXIMUM_LENGTH,
          IS_NULLABLE
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_NAME = 'publishing_exceptions' 
        AND COLUMN_NAME = 'error_type'
      `);
    });
    
    if (result.recordset.length > 0) {
      const column = result.recordset[0];
      console.log('✅ error_type字段验证成功:');
      console.log(`   - 字段名: ${column.COLUMN_NAME}`);
      console.log(`   - 数据类型: ${column.DATA_TYPE}`);
      console.log(`   - 最大长度: ${column.CHARACTER_MAXIMUM_LENGTH}`);
      console.log(`   - 允许空值: ${column.IS_NULLABLE}`);
    } else {
      console.log('❌ error_type字段未找到');
    }
    
  } catch (error) {
    console.error('验证字段失败:', error.message);
  }
}

// 主执行函数
async function main() {
  try {
    await addErrorTypeField();
    await verifyErrorTypeField();
    console.log('\n🎉 所有操作完成！');
    process.exit(0);
  } catch (error) {
    console.error('\n💥 执行失败:', error.message);
    process.exit(1);
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  main();
}

module.exports = {
  addErrorTypeField,
  verifyErrorTypeField
};