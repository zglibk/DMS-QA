/**
 * 修复数据库中AttachmentFile字段的路径格式问题
 * 统一将所有路径转换为相对路径格式，并修复HTML实体编码问题
 * 版本2：处理HTTP URL格式和&amp;编码问题
 */

const { sql, getDynamicConfig } = require('../db');

// 统一的路径标准化函数
function standardizeAttachmentPath(pathValue) {
  if (!pathValue || typeof pathValue !== 'string') {
    return null;
  }

  let normalizedPath = pathValue.trim();

  // 修复HTML实体编码问题（&amp; -> &）
  normalizedPath = normalizedPath.replace(/&amp;/g, '&');

  // 移除URL编码的&符号
  normalizedPath = normalizedPath.replace(/%26/g, '&');

  // 处理HTTP URL格式（如：http://localhost:3001/shared-files/...）
  const httpUrlPattern = /^https?:\/\/[^\/]+\/shared-files\/(.+)$/;
  const httpMatch = normalizedPath.match(httpUrlPattern);
  if (httpMatch) {
    // 提取路径部分并解码
    let relativePath = decodeURIComponent(httpMatch[1]);
    // 将URL路径分隔符转换为Windows路径分隔符
    relativePath = relativePath.replace(/\//g, '\\');
    return relativePath;
  }

  // 处理file:///协议前缀
  if (normalizedPath.startsWith('file:///')) {
    normalizedPath = normalizedPath.substring(8);
  }

  // 统一路径分隔符为反斜杠
  normalizedPath = normalizedPath.replace(/\//g, '\\');

  // 处理Excel临时路径
  const excelTempPath = 'C:\\Users\\TJ\\AppData\\Roaming\\Microsoft\\Excel\\';
  if (normalizedPath.startsWith(excelTempPath)) {
    const relativePath = normalizedPath.substring(excelTempPath.length);
    return relativePath;
  }

  // 处理网络共享路径
  const networkSharePath = '\\\\tj_server\\工作\\品质部\\生产异常周报考核统计\\';
  if (normalizedPath.startsWith(networkSharePath)) {
    const relativePath = normalizedPath.substring(networkSharePath.length);
    return relativePath;
  }

  // 处理相对路径（../../TJ/AppData/...）
  if (normalizedPath.includes('TJ\\AppData\\Roaming\\Microsoft\\Excel\\')) {
    const excelIndex = normalizedPath.indexOf('TJ\\AppData\\Roaming\\Microsoft\\Excel\\');
    const afterExcelPath = normalizedPath.substring(excelIndex + 'TJ\\AppData\\Roaming\\Microsoft\\Excel\\'.length);
    return afterExcelPath;
  }

  // 如果已经是相对路径格式（不包含盘符和网络路径），直接返回
  if (!normalizedPath.includes(':\\') && !normalizedPath.startsWith('\\\\')) {
    return normalizedPath;
  }

  // 其他情况保持原样
  return normalizedPath;
}

async function fixAttachmentPaths() {
  let pool;
  
  try {
    console.log('开始修复AttachmentFile字段路径格式...');
    
    // 获取数据库连接
    const dbConfig = await getDynamicConfig();
    pool = await sql.connect(dbConfig);
    
    // 查询所有包含AttachmentFile的记录
    console.log('查询需要修复的记录...');
    const result = await pool.request().query(`
      SELECT ID, AttachmentFile 
      FROM ComplaintRegister 
      WHERE AttachmentFile IS NOT NULL 
        AND AttachmentFile != ''
      ORDER BY ID
    `);
    
    console.log(`找到 ${result.recordset.length} 条需要检查的记录`);
    
    let updatedCount = 0;
    let skippedCount = 0;
    
    // 逐条处理记录
    for (const record of result.recordset) {
      const { ID, AttachmentFile } = record;
      const originalPath = AttachmentFile;
      
      // 标准化路径
      const standardizedPath = standardizeAttachmentPath(originalPath);
      
      // 如果路径有变化，则更新数据库
      if (standardizedPath && standardizedPath !== originalPath) {
        try {
          await pool.request()
            .input('id', sql.Int, ID)
            .input('newPath', sql.NVarChar, standardizedPath)
            .query(`
              UPDATE ComplaintRegister 
              SET AttachmentFile = @newPath 
              WHERE ID = @id
            `);
          
          console.log(`ID ${ID}: 已更新`);
          console.log(`  原路径: ${originalPath}`);
          console.log(`  新路径: ${standardizedPath}`);
          console.log('');
          
          updatedCount++;
        } catch (updateErr) {
          console.error(`更新ID ${ID} 失败:`, updateErr.message);
        }
      } else {
        console.log(`ID ${ID}: 路径格式正确，跳过`);
        skippedCount++;
      }
    }
    
    console.log('修复完成！');
    console.log(`总记录数: ${result.recordset.length}`);
    console.log(`已更新: ${updatedCount}`);
    console.log(`跳过: ${skippedCount}`);
    
  } catch (error) {
    console.error('修复过程中发生错误:', error);
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
    .catch((error) => {
      console.error('脚本执行失败:', error);
      process.exit(1);
    });
}

module.exports = {
  fixAttachmentPaths,
  standardizeAttachmentPath
};
