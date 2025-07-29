const { getConnection } = require('./db');
const sql = require('mssql');

async function addReworkCategoryField() {
  try {
    console.log('开始添加返工类别字段和更新数据...');
    
    const pool = await getConnection();
    
    // 检查ReworkCategory字段是否存在
    const checkFieldResult = await pool.request().query(`
      SELECT * FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'ProductionReworkRegister' 
        AND COLUMN_NAME = 'ReworkCategory'
    `);
    
    if (checkFieldResult.recordset.length === 0) {
      // 添加ReworkCategory字段
      await pool.request().query(`
        ALTER TABLE [dbo].[ProductionReworkRegister] 
        ADD [ReworkCategory] NVARCHAR(50) NULL
      `);
      console.log('✓ ReworkCategory字段已添加到ProductionReworkRegister表');
    } else {
      console.log('✓ ReworkCategory字段已存在于ProductionReworkRegister表中');
    }
    
    // 清空并重新插入返工类别数据（先删除有外键约束的子表数据）
    await pool.request().query('DELETE FROM [dbo].[ReworkMethod]');
    await pool.request().query('DELETE FROM [dbo].[ReworkCategory]');
    await pool.request().query('DBCC CHECKIDENT (\'[dbo].[ReworkCategory]\', RESEED, 0)');
    await pool.request().query('DBCC CHECKIDENT (\'[dbo].[ReworkMethod]\', RESEED, 0)');
    
    // 插入新的返工类别数据
    const categories = [
      { name: '客退返工', description: '客户退货导致的返工处理' },
      { name: '来料返工', description: '原材料质量问题导致的返工' },
      { name: '制程返工', description: '生产制程中出现问题的返工' },
      { name: '印刷返工', description: '印刷过程中的质量问题返工' },
      { name: '裁切返工', description: '裁切工序的尺寸或质量问题返工' },
      { name: '包装返工', description: '包装工序的问题返工' },
      { name: '设备返工', description: '设备故障导致的返工' },
      { name: '人为返工', description: '操作失误导致的返工' },
      { name: '其他返工', description: '其他原因导致的返工' }
    ];
    
    for (const category of categories) {
      await pool.request()
        .input('name', sql.NVarChar, category.name)
        .input('description', sql.NVarChar, category.description)
        .query(`
          INSERT INTO [dbo].[ReworkCategory] ([Name], [Description]) 
          VALUES (@name, @description)
        `);
    }
    
    console.log('✓ 返工类别数据已更新完成');
    
    // 验证字段信息
    const fieldInfo = await pool.request().query(`
      SELECT 
        COLUMN_NAME,
        DATA_TYPE,
        CHARACTER_MAXIMUM_LENGTH,
        IS_NULLABLE
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'ProductionReworkRegister' 
        AND COLUMN_NAME = 'ReworkCategory'
    `);
    
    console.log('\n字段信息验证:');
    console.log(fieldInfo.recordset[0]);
    
    // 验证返工类别数据
    const categoriesResult = await pool.request().query(`
      SELECT * FROM [dbo].[ReworkCategory] ORDER BY ID
    `);
    
    console.log('\n返工类别数据:');
    categoriesResult.recordset.forEach(category => {
      console.log(`${category.ID}: ${category.Name} - ${category.Description}`);
    });
    
    console.log('\n返工类别字段添加和数据更新完成！');
    
  } catch (error) {
    console.error('操作失败:', error);
    process.exit(1);
  }
}

addReworkCategoryField().catch(console.error);