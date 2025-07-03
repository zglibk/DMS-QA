// 检查数据库表结构脚本
const { getConnection } = require('./db');

async function checkDatabaseSchema() {
  console.log('🔍 检查数据库表结构...\n');
  
  try {
    const pool = await getConnection();
    
    // 获取所有表名
    const tablesResult = await pool.request().query(`
      SELECT TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_TYPE = 'BASE TABLE' 
      ORDER BY TABLE_NAME
    `);
    
    console.log('📋 数据库中的表：');
    tablesResult.recordset.forEach((table, index) => {
      console.log(`${index + 1}. ${table.TABLE_NAME}`);
    });
    
    console.log('\n📊 详细表结构：');
    console.log('='.repeat(80));
    
    // 检查每个表的结构
    for (const table of tablesResult.recordset) {
      const tableName = table.TABLE_NAME;
      console.log(`\n🔸 表: ${tableName}`);
      
      // 获取表的列信息
      const columnsResult = await pool.request().query(`
        SELECT 
          COLUMN_NAME,
          DATA_TYPE,
          CHARACTER_MAXIMUM_LENGTH,
          IS_NULLABLE,
          COLUMN_DEFAULT,
          COLUMNPROPERTY(OBJECT_ID(TABLE_SCHEMA + '.' + TABLE_NAME), COLUMN_NAME, 'IsIdentity') as IS_IDENTITY
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_NAME = '${tableName}'
        ORDER BY ORDINAL_POSITION
      `);
      
      columnsResult.recordset.forEach((col, index) => {
        const identity = col.IS_IDENTITY ? ' [IDENTITY]' : '';
        const nullable = col.IS_NULLABLE === 'YES' ? ' NULL' : ' NOT NULL';
        const length = col.CHARACTER_MAXIMUM_LENGTH ? `(${col.CHARACTER_MAXIMUM_LENGTH})` : '';
        const defaultVal = col.COLUMN_DEFAULT ? ` DEFAULT ${col.COLUMN_DEFAULT}` : '';
        
        console.log(`  ${index + 1}. ${col.COLUMN_NAME} - ${col.DATA_TYPE}${length}${nullable}${identity}${defaultVal}`);
      });
      
      // 获取主键信息
      const pkResult = await pool.request().query(`
        SELECT COLUMN_NAME
        FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
        WHERE TABLE_NAME = '${tableName}' 
        AND CONSTRAINT_NAME LIKE 'PK_%'
      `);
      
      if (pkResult.recordset.length > 0) {
        const pkColumns = pkResult.recordset.map(pk => pk.COLUMN_NAME).join(', ');
        console.log(`  🔑 主键: ${pkColumns}`);
      }
      
      // 获取外键信息
      const fkResult = await pool.request().query(`
        SELECT 
          fk.COLUMN_NAME,
          pk.TABLE_NAME as REFERENCED_TABLE,
          pk.COLUMN_NAME as REFERENCED_COLUMN
        FROM INFORMATION_SCHEMA.REFERENTIAL_CONSTRAINTS rc
        JOIN INFORMATION_SCHEMA.KEY_COLUMN_USAGE fk ON rc.CONSTRAINT_NAME = fk.CONSTRAINT_NAME
        JOIN INFORMATION_SCHEMA.KEY_COLUMN_USAGE pk ON rc.UNIQUE_CONSTRAINT_NAME = pk.CONSTRAINT_NAME
        WHERE fk.TABLE_NAME = '${tableName}'
      `);
      
      if (fkResult.recordset.length > 0) {
        console.log(`  🔗 外键:`);
        fkResult.recordset.forEach(fk => {
          console.log(`    ${fk.COLUMN_NAME} -> ${fk.REFERENCED_TABLE}.${fk.REFERENCED_COLUMN}`);
        });
      }
    }
    
    console.log('\n' + '='.repeat(80));
    console.log('✅ 数据库表结构检查完成');
    
    await pool.close();
    
  } catch (error) {
    console.error('❌ 检查数据库表结构失败:', error.message);
  }
}

// 检查特定表的记录数
async function checkTableRecords() {
  console.log('\n📈 检查表记录数...\n');
  
  try {
    const pool = await getConnection();
    
    const tables = [
      'ComplaintRegister', 'MaterialPrice', 'User', 'Workshop', 
      'Department', 'Person', 'ComplaintCategory', 'CustomerComplaintType',
      'DefectiveCategory', 'DefectiveItem', 'UserTokens', 'DbConfig', 'PathMappingConfig'
    ];
    
    for (const tableName of tables) {
      try {
        const result = await pool.request().query(`SELECT COUNT(*) as count FROM [${tableName}]`);
        const count = result.recordset[0].count;
        console.log(`📊 ${tableName}: ${count} 条记录`);
      } catch (error) {
        console.log(`❌ ${tableName}: 表不存在或查询失败`);
      }
    }
    
    await pool.close();
    
  } catch (error) {
    console.error('❌ 检查表记录数失败:', error.message);
  }
}

// 主函数
async function main() {
  console.log('🚀 DMS-QA 数据库结构检查工具');
  console.log('='.repeat(50));
  
  await checkDatabaseSchema();
  await checkTableRecords();
  
  console.log('\n🎉 检查完成！');
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { checkDatabaseSchema, checkTableRecords };
