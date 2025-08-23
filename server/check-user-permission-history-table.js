/**
 * 检查UserPermissionHistory表是否存在
 * 如果不存在则创建该表
 */

const { sql, getDynamicConfig } = require('./db');

async function checkUserPermissionHistoryTable() {
  try {
    console.log('正在检查UserPermissionHistory表...');
    
    const pool = await sql.connect(await getDynamicConfig());
    
    // 检查表是否存在
    const checkTableResult = await pool.request().query(`
      SELECT TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_NAME = 'UserPermissionHistory'
    `);
    
    if (checkTableResult.recordset.length === 0) {
      console.log('UserPermissionHistory表不存在，正在创建...');
      
      // 创建UserPermissionHistory表
      await pool.request().query(`
        CREATE TABLE [UserPermissionHistory] (
          [ID] INT IDENTITY(1,1) PRIMARY KEY,
          [UserPermissionID] INT NULL,             -- 用户权限ID（可为空，删除时为NULL）
          [UserID] INT NOT NULL,                   -- 用户ID
          [MenuID] INT NOT NULL,                   -- 菜单ID
          [PermissionType] NVARCHAR(20) NOT NULL,  -- 权限类型
          [PermissionLevel] NVARCHAR(20) NOT NULL, -- 权限级别
          [ActionCode] NVARCHAR(50) NULL,          -- 操作代码
          [Action] NVARCHAR(20) NOT NULL,          -- 历史操作：'create', 'update', 'delete'
          [OldValue] NVARCHAR(MAX) NULL,           -- 变更前的值（JSON格式）
          [NewValue] NVARCHAR(MAX) NULL,           -- 变更后的值（JSON格式）
          [OperatorID] INT NOT NULL,               -- 操作人ID
          [OperatedAt] DATETIME2 DEFAULT GETDATE(), -- 操作时间
          [Reason] NVARCHAR(500) NULL,             -- 操作原因
          
          -- 外键约束
          CONSTRAINT [FK_UserPermissionHistory_UserPermission] FOREIGN KEY ([UserPermissionID]) REFERENCES [UserPermissions]([ID]),
          CONSTRAINT [FK_UserPermissionHistory_User] FOREIGN KEY ([UserID]) REFERENCES [User]([ID]),
          CONSTRAINT [FK_UserPermissionHistory_Menu] FOREIGN KEY ([MenuID]) REFERENCES [Menus]([ID]),
          CONSTRAINT [FK_UserPermissionHistory_Operator] FOREIGN KEY ([OperatorID]) REFERENCES [User]([ID]),
          
          -- 检查约束
          CONSTRAINT [CK_UserPermissionHistory_Action] CHECK ([Action] IN ('create', 'update', 'delete'))
        )
      `);
      
      // 创建索引
      await pool.request().query(`
        CREATE INDEX [IX_UserPermissionHistory_UserID] ON [UserPermissionHistory] ([UserID]);
        CREATE INDEX [IX_UserPermissionHistory_OperatedAt] ON [UserPermissionHistory] ([OperatedAt]);
        CREATE INDEX [IX_UserPermissionHistory_OperatorID] ON [UserPermissionHistory] ([OperatorID]);
      `);
      
      console.log('UserPermissionHistory表创建成功！');
    } else {
      console.log('UserPermissionHistory表已存在');
      
      // 检查表结构
      const columnsResult = await pool.request().query(`
        SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_NAME = 'UserPermissionHistory'
        ORDER BY ORDINAL_POSITION
      `);
      
      console.log('UserPermissionHistory表结构:');
      columnsResult.recordset.forEach(column => {
        console.log(`${column.COLUMN_NAME} - ${column.DATA_TYPE} (${column.IS_NULLABLE})`);
      });
    }
    
    await pool.close();
    console.log('检查完成！');
    
  } catch (error) {
    console.error('检查UserPermissionHistory表时出错:', error.message);
    console.error('错误详情:', error);
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  checkUserPermissionHistoryTable();
}

module.exports = { checkUserPermissionHistoryTable };