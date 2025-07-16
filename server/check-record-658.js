/**
 * 检查投诉记录ID 658的具体情况
 */

const sql = require('mssql');

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

async function checkRecord658() {
  let pool = null;
  
  try {
    console.log('=== 检查投诉记录ID 658 ===');
    
    // 连接数据库
    console.log('🔄 正在连接数据库...');
    pool = await sql.connect(config);
    console.log('✅ 数据库连接成功！');
    
    // 1. 检查ID 658是否存在
    console.log('\n1. 检查ID 658是否存在...');
    const existsResult = await pool.request()
      .input('id', sql.Int, 658)
      .query('SELECT COUNT(*) as count FROM ComplaintRegister WHERE ID = @id');
    
    const recordExists = existsResult.recordset[0].count > 0;
    console.log(`记录存在性: ${recordExists ? '✅ 存在' : '❌ 不存在'}`);
    
    if (!recordExists) {
      console.log('\n❌ 记录ID 658不存在！');
      
      // 查询最近的几条记录
      console.log('\n查询最近的10条记录:');
      const recentResult = await pool.request()
        .query('SELECT TOP 10 ID, Customer, OrderNo, ProductName, AttachmentFile FROM ComplaintRegister ORDER BY ID DESC');
      
      console.log('最近记录:');
      recentResult.recordset.forEach(record => {
        console.log(`  ID: ${record.ID}, 客户: ${record.Customer}, 工单: ${record.OrderNo}, 附件: ${record.AttachmentFile ? '有' : '无'}`);
      });
      
      return;
    }
    
    // 2. 查询ID 658的详细信息
    console.log('\n2. 查询ID 658的详细信息...');
    const detailResult = await pool.request()
      .input('id', sql.Int, 658)
      .query(`SELECT 
        ID, Customer, OrderNo, ProductName, 
        AttachmentFile, Date, ComplaintCategory,
        Workshop, MainDept, MainPerson
        FROM ComplaintRegister WHERE ID = @id`);
    
    const record = detailResult.recordset[0];
    console.log('📋 记录详情:');
    console.log(`  ID: ${record.ID}`);
    console.log(`  客户: ${record.Customer}`);
    console.log(`  工单号: ${record.OrderNo}`);
    console.log(`  产品名称: ${record.ProductName}`);
    console.log(`  投诉类别: ${record.ComplaintCategory}`);
    console.log(`  车间: ${record.Workshop}`);
    console.log(`  主责部门: ${record.MainDept}`);
    console.log(`  主责人: ${record.MainPerson}`);
    console.log(`  日期: ${record.Date}`);
    console.log(`  附件文件: "${record.AttachmentFile}"`);
    console.log(`  附件字段类型: ${typeof record.AttachmentFile}`);
    console.log(`  附件字段长度: ${record.AttachmentFile ? record.AttachmentFile.length : 'null'}`);
    
    // 3. 检查附件文件字段
    if (!record.AttachmentFile) {
      console.log('\n❌ AttachmentFile字段为空！这就是404错误的原因。');
    } else {
      console.log('\n✅ AttachmentFile字段有值，继续检查文件路径...');
      
      // 使用与complaint.js相同的路径处理逻辑
      const attachmentFile = record.AttachmentFile;
      let normalizedPath = attachmentFile.trim();
      
      // 修复HTML实体编码问题
      normalizedPath = normalizedPath.replace(/&amp;/g, '&');
      
      let pathInfo = null;
      
      // 处理格式1：file:///\\tj_server\工作\...
      if (normalizedPath.startsWith('file:///\\\\tj_server\\工作\\')) {
        normalizedPath = normalizedPath.substring(8);
        pathInfo = {
          type: 'network_path',
          originalPath: attachmentFile,
          networkPath: normalizedPath,
          isAccessible: true,
          displayPath: normalizedPath.replace(/\\\\/g, '\\')
        };
      }
      // 处理格式2：相对路径
      else if (!normalizedPath.includes(':\\') && !normalizedPath.startsWith('\\\\')) {
        const fullNetworkPath = `\\\\tj_server\\工作\\品质部\\生产异常周报考核统计\\${normalizedPath}`;
        pathInfo = {
          type: 'relative_path',
          originalPath: attachmentFile,
          networkPath: fullNetworkPath,
          isAccessible: true,
          displayPath: fullNetworkPath
        };
      }
      // 其他格式
      else {
        pathInfo = {
          type: 'other',
          originalPath: attachmentFile,
          networkPath: normalizedPath,
          isAccessible: false,
          displayPath: normalizedPath
        };
      }
      
      console.log('\n📁 路径处理结果:');
      console.log(`  类型: ${pathInfo.type}`);
      console.log(`  原始路径: ${pathInfo.originalPath}`);
      console.log(`  网络路径: ${pathInfo.networkPath}`);
      console.log(`  是否可访问: ${pathInfo.isAccessible}`);
      console.log(`  显示路径: ${pathInfo.displayPath}`);
      
      if (!pathInfo.isAccessible) {
        console.log('\n❌ 路径被标记为不可访问！');
      } else {
        // 检查文件是否存在
        console.log('\n4. 检查文件是否存在...');
        const fs = require('fs');
        
        try {
          const exists = fs.existsSync(pathInfo.networkPath);
          console.log(`文件存在性: ${exists ? '✅ 存在' : '❌ 不存在'}`);
          
          if (exists) {
            const stat = fs.statSync(pathInfo.networkPath);
            console.log(`文件大小: ${stat.size} bytes`);
            console.log(`是否为目录: ${stat.isDirectory()}`);
            console.log(`修改时间: ${stat.mtime}`);
          }
        } catch (fsError) {
          console.log(`❌ 文件系统访问错误: ${fsError.message}`);
        }
      }
    }
    
  } catch (error) {
    console.error('❌ 检查失败:', error.message);
  } finally {
    if (pool) {
      try {
        await pool.close();
        console.log('\n🔒 数据库连接已关闭');
      } catch (closeError) {
        console.error('关闭连接时出错:', closeError.message);
      }
    }
  }
}

// 运行检查
checkRecord658().then(() => {
  console.log('\n=== 检查完成 ===');
  process.exit(0);
}).catch((error) => {
  console.error('检查脚本执行失败:', error);
  process.exit(1);
});
