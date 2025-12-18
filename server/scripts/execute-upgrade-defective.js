/**
 * 执行不良类别表结构升级脚本
 * 
 * 功能：
 * 1. 升级 DefectiveCategory 和 DefectiveItem 表结构
 * 2. 创建多对多关联表 DefectiveItemCategory
 * 3. 迁移现有数据
 * 4. 添加菜单和权限配置
 * 
 * 使用方法：
 * cd server
 * node scripts/execute-upgrade-defective.js
 */

const fs = require('fs');
const path = require('path');
const { getConnection, sql } = require('../db');

async function executeSqlScript() {
  console.log('======================================');
  console.log('开始执行不良类别表结构升级...');
  console.log('======================================\n');

  let pool = null;

  try {
    // 获取数据库连接
    pool = await getConnection();
    console.log('✅ 数据库连接成功\n');

    // 读取SQL脚本
    const sqlFilePath = path.join(__dirname, 'upgrade-defective-tables.sql');
    
    if (!fs.existsSync(sqlFilePath)) {
      throw new Error(`SQL脚本文件不存在: ${sqlFilePath}`);
    }
    
    let sqlScript = fs.readFileSync(sqlFilePath, 'utf8');
    console.log('✅ SQL脚本文件读取成功\n');

    // 移除 USE 语句（因为连接时已指定数据库）
    sqlScript = sqlScript.replace(/USE\s+\[.*?\];?\s*/gi, '');

    // 按 GO 分割脚本
    const batches = sqlScript.split(/\bGO\b/i);
    
    console.log(`共 ${batches.length} 个批次需要执行\n`);

    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i].trim();
      
      // 跳过空批次
      if (!batch || batch.length === 0) {
        continue;
      }
      
      // 跳过纯注释和PRINT语句
      const cleanedBatch = batch
        .replace(/--.*$/gm, '')  // 移除单行注释
        .replace(/\/\*[\s\S]*?\*\//g, '')  // 移除多行注释
        .trim();
      
      if (!cleanedBatch || cleanedBatch.length === 0) {
        continue;
      }

      try {
        console.log(`执行批次 ${i + 1}...`);
        await pool.request().query(batch);
        successCount++;
        
        // 提取PRINT消息用于显示
        const printMatches = batch.match(/PRINT\s+[N]?'([^']+)'/gi);
        if (printMatches) {
          printMatches.forEach(match => {
            const message = match.replace(/PRINT\s+[N]?'/i, '').replace(/'$/, '');
            console.log(`   ${message}`);
          });
        }
      } catch (error) {
        errorCount++;
        // 忽略某些常见的非致命错误
        if (error.message.includes('已存在') || 
            error.message.includes('already exists') ||
            error.message.includes('duplicate')) {
          console.log(`   ⚠️ 跳过（已存在）: ${error.message.substring(0, 100)}`);
        } else {
          console.error(`   ❌ 批次 ${i + 1} 执行失败:`, error.message);
        }
      }
    }

    console.log('\n======================================');
    console.log('执行完成！');
    console.log(`成功: ${successCount} 个批次`);
    if (errorCount > 0) {
      console.log(`跳过/失败: ${errorCount} 个批次`);
    }
    console.log('======================================\n');

    // 验证表结构
    console.log('验证表结构...\n');
    
    // 检查 DefectiveCategory 表字段
    const categoryColumns = await pool.request().query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'DefectiveCategory'
      ORDER BY ORDINAL_POSITION
    `);
    console.log('DefectiveCategory 表字段:');
    categoryColumns.recordset.forEach(col => console.log(`  - ${col.COLUMN_NAME}`));
    
    // 检查 DefectiveItem 表字段
    const itemColumns = await pool.request().query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'DefectiveItem'
      ORDER BY ORDINAL_POSITION
    `);
    console.log('\nDefectiveItem 表字段:');
    itemColumns.recordset.forEach(col => console.log(`  - ${col.COLUMN_NAME}`));
    
    // 检查 DefectiveItemCategory 关联表
    const relationTable = await pool.request().query(`
      SELECT COUNT(*) AS count 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_NAME = 'DefectiveItemCategory'
    `);
    console.log(`\nDefectiveItemCategory 关联表: ${relationTable.recordset[0].count > 0 ? '✅ 已创建' : '❌ 未创建'}`);
    
    // 检查菜单是否已添加
    const menuCheck = await pool.request().query(`
      SELECT MenuCode, MenuName, Permission 
      FROM Menus 
      WHERE MenuCode LIKE 'defective%'
    `);
    console.log('\n已添加的菜单项:');
    if (menuCheck.recordset.length > 0) {
      menuCheck.recordset.forEach(menu => {
        console.log(`  - ${menu.MenuCode}: ${menu.MenuName} (${menu.Permission || '-'})`);
      });
    } else {
      console.log('  ⚠️ 未找到不良类别管理相关菜单');
    }
    
    console.log('\n✅ 升级脚本执行完成！');
    
  } catch (error) {
    console.error('\n❌ 执行失败:', error);
    process.exit(1);
  }
}

// 执行脚本
executeSqlScript().then(() => {
  console.log('\n脚本执行结束，按 Ctrl+C 退出');
}).catch(error => {
  console.error('脚本执行出错:', error);
  process.exit(1);
});
