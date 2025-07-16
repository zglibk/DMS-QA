/**
 * 测试投诉记录ID 658的文件访问问题
 */

const sql = require('mssql');
const fs = require('fs');
const path = require('path');

// 数据库配置
const config = {
  user: 'sa',
  password: 'Qa369*',
  server: '192.168.1.57',
  database: 'DMS-QA',
  options: {
    encrypt: false,
    trustServerCertificate: true,
    enableArithAbort: true,
    useUTC: false,
    requestTimeout: 30000,
    connectionTimeout: 30000,
    parseJSON: true
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000
  }
};

// 标准化路径处理函数（从complaint.js复制）
function normalizeAttachmentPath(pathValue) {
  if (!pathValue || typeof pathValue !== 'string') {
    return null;
  }

  let normalizedPath = pathValue.trim();

  // 修复HTML实体编码问题（&amp; -> &）
  normalizedPath = normalizedPath.replace(/&amp;/g, '&');

  // 处理格式1：file:///\\tj_server\工作\品质部\生产异常周报考核统计\2025年异常汇总\...
  if (normalizedPath.startsWith('file:///\\\\tj_server\\工作\\')) {
    // 移除file:///前缀，保留网络路径
    normalizedPath = normalizedPath.substring(8); // 移除'file:///'
    return {
      type: 'network_path',
      originalPath: pathValue,
      networkPath: normalizedPath,
      isAccessible: true,
      displayPath: normalizedPath.replace(/\\\\/g, '\\')
    };
  }

  // 处理格式2：2025年异常汇总\3月份\不良图片\...（相对路径）
  if (!normalizedPath.includes(':\\') && !normalizedPath.startsWith('\\\\')) {
    // 构建完整的网络路径
    const fullNetworkPath = `\\\\tj_server\\工作\\品质部\\生产异常周报考核统计\\${normalizedPath}`;
    return {
      type: 'relative_path',
      originalPath: pathValue,
      networkPath: fullNetworkPath,
      isAccessible: true,
      displayPath: fullNetworkPath
    };
  }

  // 处理其他格式（本地路径等）
  return {
    type: 'other',
    originalPath: pathValue,
    networkPath: normalizedPath,
    isAccessible: false,
    displayPath: normalizedPath
  };
}

async function testComplaint658() {
  let pool = null;
  
  try {
    console.log('=== 测试投诉记录ID 658 ===');
    
    // 连接数据库
    console.log('🔄 正在连接数据库...');
    pool = await sql.connect(config);
    console.log('✅ 数据库连接成功！');
    
    // 查询记录
    console.log('🔄 查询投诉记录ID 658...');
    const result = await pool.request()
      .input('id', sql.Int, 658)
      .query('SELECT ID, Customer, OrderNo, ProductName, AttachmentFile FROM ComplaintRegister WHERE ID = @id');
    
    console.log('查询结果:', result.recordset);
    
    if (result.recordset.length === 0) {
      console.log('❌ 记录不存在: ID=658');
      return;
    }
    
    const record = result.recordset[0];
    const attachmentFile = record.AttachmentFile;
    
    console.log('📋 记录信息:');
    console.log(`  ID: ${record.ID}`);
    console.log(`  客户: ${record.Customer}`);
    console.log(`  工单号: ${record.OrderNo}`);
    console.log(`  产品名称: ${record.ProductName}`);
    console.log(`  附件文件: "${attachmentFile}"`);
    console.log(`  字段类型: ${typeof attachmentFile}`);
    console.log(`  字段长度: ${attachmentFile ? attachmentFile.length : 'null'}`);
    
    if (!attachmentFile) {
      console.log('❌ 该记录无附件文件');
      return;
    }
    
    // 使用标准化路径处理函数
    console.log('🔄 处理附件路径...');
    const pathInfo = normalizeAttachmentPath(attachmentFile);
    
    if (!pathInfo) {
      console.log('❌ 路径处理失败');
      return;
    }
    
    console.log('📁 路径信息:');
    console.log(`  类型: ${pathInfo.type}`);
    console.log(`  原始路径: ${pathInfo.originalPath}`);
    console.log(`  网络路径: ${pathInfo.networkPath}`);
    console.log(`  是否可访问: ${pathInfo.isAccessible}`);
    console.log(`  显示路径: ${pathInfo.displayPath}`);
    
    if (!pathInfo.isAccessible) {
      console.log('❌ 路径标记为不可访问');
      return;
    }
    
    // 检查文件是否存在
    console.log('🔄 检查文件是否存在...');
    const networkPath = pathInfo.networkPath;
    
    try {
      const exists = fs.existsSync(networkPath);
      console.log(`文件存在性检查: ${exists ? '✅ 存在' : '❌ 不存在'}`);
      
      if (exists) {
        const stat = fs.statSync(networkPath);
        console.log('📊 文件信息:');
        console.log(`  大小: ${stat.size} bytes`);
        console.log(`  是否为目录: ${stat.isDirectory()}`);
        console.log(`  修改时间: ${stat.mtime}`);
        
        if (stat.isDirectory()) {
          console.log('❌ 路径指向的是文件夹，不是文件');
        } else {
          console.log('✅ 文件可以正常访问');
        }
      } else {
        console.log('❌ 文件不存在，可能的原因:');
        console.log('  1. 网络路径无法访问');
        console.log('  2. 文件已被移动或删除');
        console.log('  3. 权限不足');
        console.log('  4. 路径格式错误');
      }
    } catch (fsError) {
      console.log('❌ 文件系统访问错误:', fsError.message);
    }
    
  } catch (error) {
    console.error('❌ 测试失败:', error.message);
  } finally {
    if (pool) {
      try {
        await pool.close();
        console.log('🔒 数据库连接已关闭');
      } catch (closeError) {
        console.error('关闭连接时出错:', closeError.message);
      }
    }
  }
}

// 运行测试
testComplaint658().then(() => {
  console.log('=== 测试完成 ===');
  process.exit(0);
}).catch((error) => {
  console.error('测试脚本执行失败:', error);
  process.exit(1);
});
