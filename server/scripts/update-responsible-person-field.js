/**
 * 将供应商投诉表中的"负责人"字段修改为"发起人"的Node.js脚本
 * 功能：将ResponsiblePerson字段重命名为InitiatedBy
 */

const { getConnection, sql } = require('../config/database')

/**
 * 执行数据库字段修改
 */
async function updateResponsiblePersonField() {
  let pool
  
  try {
    console.log('开始连接数据库...')
    pool = await getConnection()
    console.log('数据库连接成功')
    
    // 检查表是否存在
    const tableCheck = await pool.request().query(`
      SELECT * FROM sysobjects WHERE name='SupplierComplaints' AND xtype='U'
    `)
    
    if (tableCheck.recordset.length === 0) {
      console.log('❌ SupplierComplaints 表不存在')
      return
    }
    
    console.log('✓ SupplierComplaints 表存在')
    
    // 检查ResponsiblePerson字段是否存在
    const responsiblePersonCheck = await pool.request().query(`
      SELECT * FROM sys.columns 
      WHERE object_id = OBJECT_ID('SupplierComplaints') AND name = 'ResponsiblePerson'
    `)
    
    // 检查InitiatedBy字段是否存在
    const initiatedByCheck = await pool.request().query(`
      SELECT * FROM sys.columns 
      WHERE object_id = OBJECT_ID('SupplierComplaints') AND name = 'InitiatedBy'
    `)
    
    if (responsiblePersonCheck.recordset.length > 0) {
      console.log('✓ 找到 ResponsiblePerson 字段，开始迁移...')
      
      if (initiatedByCheck.recordset.length === 0) {
        // 添加新的InitiatedBy字段
        await pool.request().query(`
          ALTER TABLE [dbo].[SupplierComplaints] ADD [InitiatedBy] NVARCHAR(100) NULL
        `)
        console.log('✓ 发起人字段 InitiatedBy 添加成功')
        
        // 将ResponsiblePerson的数据复制到InitiatedBy
        await pool.request().query(`
          UPDATE [dbo].[SupplierComplaints] SET [InitiatedBy] = [ResponsiblePerson]
        `)
        console.log('✓ 数据迁移完成')
        
        // 删除旧的ResponsiblePerson字段
        await pool.request().query(`
          ALTER TABLE [dbo].[SupplierComplaints] DROP COLUMN [ResponsiblePerson]
        `)
        console.log('✓ 旧字段 ResponsiblePerson 删除成功')
      } else {
        console.log('- 发起人字段 InitiatedBy 已存在，只删除旧字段')
        
        // 如果InitiatedBy为空，则复制ResponsiblePerson的数据
        await pool.request().query(`
          UPDATE [dbo].[SupplierComplaints] 
          SET [InitiatedBy] = [ResponsiblePerson] 
          WHERE [InitiatedBy] IS NULL AND [ResponsiblePerson] IS NOT NULL
        `)
        console.log('✓ 数据迁移完成')
        
        // 删除旧的ResponsiblePerson字段
        await pool.request().query(`
          ALTER TABLE [dbo].[SupplierComplaints] DROP COLUMN [ResponsiblePerson]
        `)
        console.log('✓ 旧字段 ResponsiblePerson 删除成功')
      }
    } else {
      console.log('- ResponsiblePerson 字段不存在，可能已经修改过')
      
      // 如果InitiatedBy字段不存在，则创建它
      if (initiatedByCheck.recordset.length === 0) {
        await pool.request().query(`
          ALTER TABLE [dbo].[SupplierComplaints] ADD [InitiatedBy] NVARCHAR(100) NULL
        `)
        console.log('✓ 发起人字段 InitiatedBy 添加成功')
      } else {
        console.log('- 发起人字段 InitiatedBy 已存在')
      }
    }
    
    console.log('\n🎉 字段名称修改完成！')
    
  } catch (error) {
    console.error('❌ 执行失败:', error.message)
    console.error(error)
  } finally {
    if (pool) {
      await pool.close()
      console.log('数据库连接已关闭')
    }
  }
}

// 执行脚本
if (require.main === module) {
  updateResponsiblePersonField()
    .then(() => {
      console.log('脚本执行完成')
      process.exit(0)
    })
    .catch((error) => {
      console.error('脚本执行失败:', error)
      process.exit(1)
    })
}

module.exports = { updateResponsiblePersonField }