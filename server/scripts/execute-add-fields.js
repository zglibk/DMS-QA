/**
 * 执行添加供应商投诉新字段的脚本
 * 用于向SupplierComplaints表添加新的字段
 */

const sql = require('mssql');
const { getConnection } = require('../db');

/**
 * 执行添加字段的SQL语句
 */
async function addSupplierComplaintsFields() {
  let pool;
  
  try {
    console.log('正在连接数据库...');
    pool = await getConnection();
    console.log('数据库连接成功');

    // 开始事务
    const transaction = new sql.Transaction(pool);
    await transaction.begin();

    try {
      console.log('开始添加新字段...');
      
      // 添加材料编号字段
      console.log('添加MaterialCode字段...');
      await transaction.request().query(`
        IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[SupplierComplaints]') AND name = 'MaterialCode')
        BEGIN
          ALTER TABLE [dbo].[SupplierComplaints] ADD [MaterialCode] NVARCHAR(100) NULL;
          PRINT 'MaterialCode字段添加成功';
        END
        ELSE
        BEGIN
          PRINT 'MaterialCode字段已存在';
        END
      `);

      // 添加采购单号字段
      console.log('添加PurchaseOrderNo字段...');
      await transaction.request().query(`
        IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[SupplierComplaints]') AND name = 'PurchaseOrderNo')
        BEGIN
          ALTER TABLE [dbo].[SupplierComplaints] ADD [PurchaseOrderNo] NVARCHAR(100) NULL;
          PRINT 'PurchaseOrderNo字段添加成功';
        END
        ELSE
        BEGIN
          PRINT 'PurchaseOrderNo字段已存在';
        END
      `);

      // 添加来料日期字段
      console.log('添加IncomingDate字段...');
      await transaction.request().query(`
        IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[SupplierComplaints]') AND name = 'IncomingDate')
        BEGIN
          ALTER TABLE [dbo].[SupplierComplaints] ADD [IncomingDate] DATETIME NULL;
          PRINT 'IncomingDate字段添加成功';
        END
        ELSE
        BEGIN
          PRINT 'IncomingDate字段已存在';
        END
      `);

      // 添加批量数量字段
      console.log('添加BatchQuantity字段...');
      await transaction.request().query(`
        IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[SupplierComplaints]') AND name = 'BatchQuantity')
        BEGIN
          ALTER TABLE [dbo].[SupplierComplaints] ADD [BatchQuantity] DECIMAL(18,2) NULL;
          PRINT 'BatchQuantity字段添加成功';
        END
        ELSE
        BEGIN
          PRINT 'BatchQuantity字段已存在';
        END
      `);

      // 添加检验日期字段
      console.log('添加InspectionDate字段...');
      await transaction.request().query(`
        IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[SupplierComplaints]') AND name = 'InspectionDate')
        BEGIN
          ALTER TABLE [dbo].[SupplierComplaints] ADD [InspectionDate] DATETIME NULL;
          PRINT 'InspectionDate字段添加成功';
        END
        ELSE
        BEGIN
          PRINT 'InspectionDate字段已存在';
        END
      `);

      // 添加使用工单字段
      console.log('添加WorkOrderNo字段...');
      await transaction.request().query(`
        IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[SupplierComplaints]') AND name = 'WorkOrderNo')
        BEGIN
          ALTER TABLE [dbo].[SupplierComplaints] ADD [WorkOrderNo] NVARCHAR(100) NULL;
          PRINT 'WorkOrderNo字段添加成功';
        END
        ELSE
        BEGIN
          PRINT 'WorkOrderNo字段已存在';
        END
      `);

      // 添加抽检数量字段
      console.log('添加SampleQuantity字段...');
      await transaction.request().query(`
        IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[SupplierComplaints]') AND name = 'SampleQuantity')
        BEGIN
          ALTER TABLE [dbo].[SupplierComplaints] ADD [SampleQuantity] DECIMAL(18,2) NULL;
          PRINT 'SampleQuantity字段添加成功';
        END
        ELSE
        BEGIN
          PRINT 'SampleQuantity字段已存在';
        END
      `);

      // 添加附图字段
      console.log('添加AttachedImages字段...');
      await transaction.request().query(`
        IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[SupplierComplaints]') AND name = 'AttachedImages')
        BEGIN
          ALTER TABLE [dbo].[SupplierComplaints] ADD [AttachedImages] NTEXT NULL;
          PRINT 'AttachedImages字段添加成功';
        END
        ELSE
        BEGIN
          PRINT 'AttachedImages字段已存在';
        END
      `);

      // 添加IQC判定字段
      console.log('添加IQCResult字段...');
      await transaction.request().query(`
        IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[SupplierComplaints]') AND name = 'IQCResult')
        BEGIN
          ALTER TABLE [dbo].[SupplierComplaints] ADD [IQCResult] NVARCHAR(50) NULL;
          PRINT 'IQCResult字段添加成功';
        END
        ELSE
        BEGIN
          PRINT 'IQCResult字段已存在';
        END
      `);

      // 创建MaterialCode字段的索引
      console.log('创建MaterialCode索引...');
      await transaction.request().query(`
        IF NOT EXISTS (SELECT * FROM sys.indexes WHERE object_id = OBJECT_ID(N'[dbo].[SupplierComplaints]') AND name = 'IX_SupplierComplaints_MaterialCode')
        BEGIN
          CREATE INDEX IX_SupplierComplaints_MaterialCode ON [dbo].[SupplierComplaints] ([MaterialCode]);
          PRINT 'MaterialCode索引创建成功';
        END
        ELSE
        BEGIN
          PRINT 'MaterialCode索引已存在';
        END
      `);

      // 创建IQCResult字段的索引
      console.log('创建IQCResult索引...');
      await transaction.request().query(`
        IF NOT EXISTS (SELECT * FROM sys.indexes WHERE object_id = OBJECT_ID(N'[dbo].[SupplierComplaints]') AND name = 'IX_SupplierComplaints_IQCResult')
        BEGIN
          CREATE INDEX IX_SupplierComplaints_IQCResult ON [dbo].[SupplierComplaints] ([IQCResult]);
          PRINT 'IQCResult索引创建成功';
        END
        ELSE
        BEGIN
          PRINT 'IQCResult索引已存在';
        END
      `);

      // 提交事务
      await transaction.commit();
      console.log('\n所有字段添加完成！');
      console.log('已成功向SupplierComplaints表添加以下字段：');
      console.log('- MaterialCode (材料编号)');
      console.log('- PurchaseOrderNo (采购单号)');
      console.log('- IncomingDate (来料日期)');
      console.log('- BatchQuantity (批量数量)');
      console.log('- InspectionDate (检验日期)');
      console.log('- WorkOrderNo (使用工单)');
      console.log('- SampleQuantity (抽检数量)');
      console.log('- AttachedImages (附图)');
      console.log('- IQCResult (IQC判定)');
      console.log('\n已创建索引：');
      console.log('- IX_SupplierComplaints_MaterialCode');
      console.log('- IX_SupplierComplaints_IQCResult');
      
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
    
  } catch (error) {
    console.error('添加字段失败:', error);
    throw error;
  } finally {
    if (pool) {
      try {
        await pool.close();
        console.log('数据库连接已关闭');
      } catch (closeError) {
        console.error('关闭数据库连接失败:', closeError);
      }
    }
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  addSupplierComplaintsFields()
    .then(() => {
      console.log('脚本执行完成');
      process.exit(0);
    })
    .catch((error) => {
      console.error('脚本执行失败:', error);
      process.exit(1);
    });
}

module.exports = { addSupplierComplaintsFields };