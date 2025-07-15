/**
 * 修复数据库中AttachmentFile字段的路径格式
 * 统一将所有路径转换为相对路径格式，并修复&amp;编码问题
 */

const { sql, getDynamicConfig } = require('../db');

// 标准化路径处理函数
function normalizeAttachmentPath(pathValue) {
  if (!pathValue || typeof pathValue !== 'string') {
    return null;
  }

  let normalizedPath = pathValue.trim();

  // 修复HTML实体编码问题（&amp; -> &）
  normalizedPath = normalizedPath.replace(/&amp;/g, '&');

  // 处理格式1：file:///\\tj_server\工作\品质部\生产异常周报考核统计\2025年异常汇总\...
  if (normalizedPath.startsWith('file:///\\\\tj_server\\工作\\品质部\\生产异常周报考核统计\\')) {
    // 移除file:///\\tj_server\工作\品质部\生产异常周报考核统计\前缀，保留相对路径
    const prefix = 'file:///\\\\tj_server\\工作\\品质部\\生产异常周报考核统计\\';
    const relativePath = normalizedPath.substring(prefix.length);
    return relativePath;
  }

  // 处理格式2：\\tj_server\工作\品质部\生产异常周报考核统计\2025年异常汇总\...
  if (normalizedPath.startsWith('\\\\tj_server\\工作\\品质部\\生产异常周报考核统计\\')) {
    // 移除\\tj_server\工作\品质部\生产异常周报考核统计\前缀，保留相对路径
    const prefix = '\\\\tj_server\\工作\\品质部\\生产异常周报考核统计\\';
    const relativePath = normalizedPath.substring(prefix.length);
    return relativePath;
  }

  // 处理格式3：2025年异常汇总\3月份\不良图片\...（已经是相对路径）
  if (!normalizedPath.includes(':\\') && !normalizedPath.startsWith('\\\\')) {
    return normalizedPath;
  }

  // 其他格式保持不变
  return normalizedPath;
}

async function fixAttachmentPaths() {
  let pool;
  try {
    console.log('开始修复AttachmentFile路径格式...');
    
    // 连接数据库
    pool = await sql.connect(await getDynamicConfig());
    
    // 查询所有有AttachmentFile的记录
    const result = await pool.request()
      .query(`
        SELECT ID, AttachmentFile 
        FROM ComplaintRegister 
        WHERE AttachmentFile IS NOT NULL 
        AND AttachmentFile != ''
        ORDER BY ID
      `);
    
    console.log(`找到 ${result.recordset.length} 条需要处理的记录`);
    
    let updatedCount = 0;
    let skippedCount = 0;
    
    // 逐条处理记录
    for (const record of result.recordset) {
      const { ID, AttachmentFile } = record;
      const originalPath = AttachmentFile;
      
      // 标准化路径
      const normalizedPath = normalizeAttachmentPath(originalPath);
      
      // 如果路径有变化，则更新数据库
      if (normalizedPath && normalizedPath !== originalPath) {
        try {
          await pool.request()
            .input('id', sql.Int, ID)
            .input('newPath', sql.NVarChar, normalizedPath)
            .query(`
              UPDATE ComplaintRegister 
              SET AttachmentFile = @newPath 
              WHERE ID = @id
            `);
          
          console.log(`ID ${ID}: 已更新`);
          console.log(`  原路径: ${originalPath}`);
          console.log(`  新路径: ${normalizedPath}`);
          console.log('');
          
          updatedCount++;
        } catch (updateErr) {
          console.error(`更新ID ${ID} 失败:`, updateErr.message);
        }
      } else {
        console.log(`ID ${ID}: 跳过（路径格式正确）`);
        skippedCount++;
      }
    }
    
    console.log('修复完成！');
    console.log(`总记录数: ${result.recordset.length}`);
    console.log(`已更新: ${updatedCount}`);
    console.log(`已跳过: ${skippedCount}`);
    
  } catch (err) {
    console.error('修复过程中发生错误:', err);
  } finally {
    if (pool) {
      await pool.close();
    }
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  fixAttachmentPaths()
    .then(() => {
      console.log('脚本执行完成');
      process.exit(0);
    })
    .catch((err) => {
      console.error('脚本执行失败:', err);
      process.exit(1);
    });
}

module.exports = { fixAttachmentPaths, normalizeAttachmentPath };
