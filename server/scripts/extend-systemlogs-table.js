/**
 * 扩展SystemLogs表结构
 * 添加新字段以支持完整的日志记录功能
 */

const { sql, getDynamicConfig } = require('../db');

/**
 * 扩展SystemLogs表结构
 * 添加日志分类、模块、资源类型等字段
 */
async function extendSystemLogsTable() {
  let pool;
  
  try {
    console.log('🔧 正在扩展SystemLogs表结构...');
    
    pool = await sql.connect(await getDynamicConfig());
    
    // 检查表是否存在
    const checkResult = await pool.request()
      .query(`
        SELECT COUNT(*) as count
        FROM INFORMATION_SCHEMA.TABLES 
        WHERE TABLE_NAME = 'SystemLogs'
      `);
    
    if (checkResult.recordset[0].count === 0) {
      console.log('❌ SystemLogs表不存在，请先创建基础表');
      return;
    }
    
    // 检查并添加新字段
    const fieldsToAdd = [
      {
        name: 'Category',
        definition: 'NVARCHAR(50)',
        description: '日志分类'
      },
      {
        name: 'Module',
        definition: 'NVARCHAR(50)',
        description: '所属模块'
      },
      {
        name: 'ResourceType',
        definition: 'NVARCHAR(50)',
        description: '资源类型'
      },
      {
        name: 'ResourceID',
        definition: 'NVARCHAR(100)',
        description: '资源ID'
      },
      {
        name: 'OperationType',
        definition: 'NVARCHAR(20)',
        description: '操作类型：CREATE/READ/UPDATE/DELETE'
      },
      {
        name: 'Severity',
        definition: 'NVARCHAR(20) DEFAULT \'INFO\'',
        description: '严重级别：DEBUG/INFO/WARN/ERROR/FATAL'
      },
      {
        name: 'Duration',
        definition: 'INT',
        description: '操作耗时（毫秒）'
      },
      {
        name: 'RequestData',
        definition: 'NVARCHAR(MAX)',
        description: '请求数据（JSON格式）'
      },
      {
        name: 'ResponseData',
        definition: 'NVARCHAR(MAX)',
        description: '响应数据（JSON格式）'
      },
      {
        name: 'SessionID',
        definition: 'NVARCHAR(100)',
        description: '会话ID'
      },
      {
        name: 'TraceID',
        definition: 'NVARCHAR(100)',
        description: '链路追踪ID'
      }
    ];
    
    for (const field of fieldsToAdd) {
      try {
        // 检查字段是否已存在
        const fieldCheck = await pool.request()
          .query(`
            SELECT COUNT(*) as count
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_NAME = 'SystemLogs' AND COLUMN_NAME = '${field.name}'
          `);
        
        if (fieldCheck.recordset[0].count === 0) {
          // 添加字段
          await pool.request()
            .query(`ALTER TABLE [dbo].[SystemLogs] ADD [${field.name}] ${field.definition}`);
          
          console.log(`✅ 已添加字段: ${field.name} - ${field.description}`);
        } else {
          console.log(`⚠️ 字段已存在: ${field.name}`);
        }
      } catch (error) {
        console.error(`❌ 添加字段 ${field.name} 失败:`, error.message);
      }
    }
    
    // 创建新的索引以提高查询性能
    const indexesToAdd = [
      {
        name: 'IX_SystemLogs_Category',
        definition: 'CREATE NONCLUSTERED INDEX [IX_SystemLogs_Category] ON [dbo].[SystemLogs] ([Category])'
      },
      {
        name: 'IX_SystemLogs_Module',
        definition: 'CREATE NONCLUSTERED INDEX [IX_SystemLogs_Module] ON [dbo].[SystemLogs] ([Module])'
      },
      {
        name: 'IX_SystemLogs_Severity',
        definition: 'CREATE NONCLUSTERED INDEX [IX_SystemLogs_Severity] ON [dbo].[SystemLogs] ([Severity])'
      },
      {
        name: 'IX_SystemLogs_OperationType',
        definition: 'CREATE NONCLUSTERED INDEX [IX_SystemLogs_OperationType] ON [dbo].[SystemLogs] ([OperationType])'
      },
      {
        name: 'IX_SystemLogs_ResourceType_ResourceID',
        definition: 'CREATE NONCLUSTERED INDEX [IX_SystemLogs_ResourceType_ResourceID] ON [dbo].[SystemLogs] ([ResourceType], [ResourceID])'
      },
      {
        name: 'IX_SystemLogs_SessionID',
        definition: 'CREATE NONCLUSTERED INDEX [IX_SystemLogs_SessionID] ON [dbo].[SystemLogs] ([SessionID])'
      }
    ];
    
    for (const index of indexesToAdd) {
      try {
        // 检查索引是否已存在
        const indexCheck = await pool.request()
          .query(`
            SELECT COUNT(*) as count
            FROM sys.indexes 
            WHERE name = '${index.name}'
          `);
        
        if (indexCheck.recordset[0].count === 0) {
          await pool.request().query(index.definition);
          console.log(`✅ 已创建索引: ${index.name}`);
        } else {
          console.log(`⚠️ 索引已存在: ${index.name}`);
        }
      } catch (error) {
        console.error(`❌ 创建索引 ${index.name} 失败:`, error.message);
      }
    }
    
    console.log('\n🎉 SystemLogs表结构扩展完成！');
    console.log('新增字段:');
    console.log('  - Category: 日志分类');
    console.log('  - Module: 所属模块');
    console.log('  - ResourceType: 资源类型');
    console.log('  - ResourceID: 资源ID');
    console.log('  - OperationType: 操作类型');
    console.log('  - Severity: 严重级别');
    console.log('  - Duration: 操作耗时');
    console.log('  - RequestData: 请求数据');
    console.log('  - ResponseData: 响应数据');
    console.log('  - SessionID: 会话ID');
    console.log('  - TraceID: 链路追踪ID');
    
  } catch (error) {
    console.error('❌ 扩展SystemLogs表时出错:', error.message);
    throw error;
  } finally {
    if (pool) {
      await pool.close();
      console.log('\n🔒 数据库连接已关闭');
    }
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  extendSystemLogsTable().catch(console.error);
}

module.exports = { extendSystemLogsTable };