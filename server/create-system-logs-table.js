/**
 * 创建SystemLogs表
 * 用于记录系统操作日志，包括权限刷新等操作
 */

const { sql, getDynamicConfig } = require('./db');

async function createSystemLogsTable() {
  let pool;
  
  try {
    console.log('🔧 正在创建SystemLogs表...');
    
    pool = await sql.connect(await getDynamicConfig());
    
    // 检查表是否已存在
    const checkResult = await pool.request()
      .query(`
        SELECT COUNT(*) as count
        FROM INFORMATION_SCHEMA.TABLES 
        WHERE TABLE_NAME = 'SystemLogs'
      `);
    
    if (checkResult.recordset[0].count > 0) {
      console.log('✅ SystemLogs表已存在，无需创建');
      return;
    }
    
    // 创建SystemLogs表
    await pool.request()
      .query(`
        CREATE TABLE [dbo].[SystemLogs] (
          [ID] INT IDENTITY(1,1) PRIMARY KEY,           -- 主键，自增ID
          [UserID] INT NOT NULL,                        -- 操作用户ID
          [Action] NVARCHAR(100) NOT NULL,              -- 操作类型
          [Details] NVARCHAR(1000),                     -- 操作详情
          [IPAddress] NVARCHAR(50),                     -- 操作IP地址
          [UserAgent] NVARCHAR(500),                    -- 用户代理
          [CreatedAt] DATETIME DEFAULT GETDATE(),       -- 创建时间
          [Status] NVARCHAR(20) DEFAULT 'SUCCESS',      -- 操作状态
          [ErrorMessage] NVARCHAR(1000),                -- 错误信息
          
          -- 外键约束
          CONSTRAINT FK_SystemLogs_User 
            FOREIGN KEY (UserID) REFERENCES [dbo].[User](ID)
        )
      `);
    
    console.log('✅ SystemLogs表创建成功');
    
    // 创建索引以提高查询性能
    await pool.request()
      .query(`
        CREATE NONCLUSTERED INDEX [IX_SystemLogs_UserID] 
        ON [dbo].[SystemLogs] ([UserID])
      `);
    
    await pool.request()
      .query(`
        CREATE NONCLUSTERED INDEX [IX_SystemLogs_CreatedAt] 
        ON [dbo].[SystemLogs] ([CreatedAt] DESC)
      `);
    
    await pool.request()
      .query(`
        CREATE NONCLUSTERED INDEX [IX_SystemLogs_Action] 
        ON [dbo].[SystemLogs] ([Action])
      `);
    
    console.log('✅ SystemLogs表索引创建成功');
    
    // 插入一条测试记录
    await pool.request()
      .query(`
        INSERT INTO [dbo].[SystemLogs] (UserID, Action, Details)
        VALUES (1, 'SYSTEM_INIT', 'SystemLogs表初始化完成')
      `);
    
    console.log('✅ 测试记录插入成功');
    
    console.log('\n🎉 SystemLogs表创建完成！');
    console.log('表结构包含以下字段:');
    console.log('  - ID: 主键，自增');
    console.log('  - UserID: 操作用户ID');
    console.log('  - Action: 操作类型');
    console.log('  - Details: 操作详情');
    console.log('  - IPAddress: 操作IP地址');
    console.log('  - UserAgent: 用户代理');
    console.log('  - CreatedAt: 创建时间');
    console.log('  - Status: 操作状态');
    console.log('  - ErrorMessage: 错误信息');
    
  } catch (error) {
    console.error('❌ 创建SystemLogs表时出错:', error.message);
    throw error;
  } finally {
    if (pool) {
      await pool.close();
      console.log('\n🔒 数据库连接已关闭');
    }
  }
}

// 运行创建脚本
createSystemLogsTable();