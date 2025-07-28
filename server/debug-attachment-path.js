const { sql, getDynamicConfig } = require('./db');
const path = require('path');
const fs = require('fs');

/**
 * 调试附件路径问题
 * 检查特定记录的附件文件是否存在于服务器上
 */
async function debugAttachmentPath() {
  try {
    console.log('=== 调试附件路径问题 ===');
    
    // 测试记录ID（从图片中看到的ID）
    const recordId = 814; // 根据图片中显示的记录ID
    console.log(`\n1. 测试记录ID: ${recordId}`);
    
    // 连接数据库
    let pool = await sql.connect(await getDynamicConfig());
    const result = await pool.request()
      .input('ID', sql.Int, recordId)
      .query('SELECT AttachmentFile FROM ComplaintRegister WHERE ID = @ID');

    if (result.recordset.length === 0) {
      console.log('❌ 记录不存在');
      return;
    }

    const attachmentFile = result.recordset[0].AttachmentFile;
    console.log(`\n2. 数据库中的附件路径: "${attachmentFile}"`);

    if (!attachmentFile) {
      console.log('❌ 无附件文件');
      return;
    }

    // 模拟后端的路径转换逻辑
    console.log(`\n3. 路径转换过程:`);
    
    // 假设这是相对路径
    const relativePath = attachmentFile;
    console.log(`   相对路径: ${relativePath}`);
    
    // 构建完整路径
    const uploadsDir = path.join(__dirname, 'uploads');
    const fullPath = path.join(uploadsDir, relativePath);
    console.log(`   uploads目录: ${uploadsDir}`);
    console.log(`   完整路径: ${fullPath}`);
    
    // 检查文件是否存在
    const isAccessible = fs.existsSync(fullPath);
    console.log(`   文件存在: ${isAccessible}`);
    
    // 构建显示路径
    let displayPath;
    if (isAccessible && fullPath) {
      // 提取相对于uploads目录的路径
      const relativeToUploads = path.relative(uploadsDir, fullPath);
      // 转换为URL路径格式，并进行URL编码
      const urlPath = relativeToUploads.split(path.sep).map(part => encodeURIComponent(part)).join('/');
      displayPath = `/files/${urlPath}`;
      console.log(`   生成HTTP访问路径: ${displayPath}`);
    } else {
      // 如果文件不存在，仍然显示原始的网络路径作为参考
      displayPath = `\\\\tj_server\\工作\\品质部\\生产异常周报考核统计\\${relativePath}`;
      console.log(`   文件不存在，使用网络路径: ${displayPath}`);
    }
    
    console.log(`\n4. 最终结果:`);
    console.log(`   完整路径: ${fullPath}`);
    console.log(`   文件存在: ${isAccessible}`);
    console.log(`   显示路径: ${displayPath}`);
    console.log(`   是否HTTP格式: ${displayPath.startsWith('/files/')}`);
    
    // 检查uploads目录结构
    console.log(`\n5. uploads目录结构检查:`);
    if (fs.existsSync(uploadsDir)) {
      console.log(`   uploads目录存在: ${uploadsDir}`);
      try {
        const files = fs.readdirSync(uploadsDir);
        console.log(`   uploads目录内容: ${files.length} 个项目`);
        files.slice(0, 10).forEach(file => {
          console.log(`     - ${file}`);
        });
        if (files.length > 10) {
          console.log(`     ... 还有 ${files.length - 10} 个项目`);
        }
      } catch (error) {
        console.log(`   无法读取uploads目录内容: ${error.message}`);
      }
    } else {
      console.log(`   ❌ uploads目录不存在: ${uploadsDir}`);
    }
    
    // 检查原始网络路径对应的本地路径
    console.log(`\n6. 网络路径映射检查:`);
    const networkPath = `\\\\tj_server\\工作\\品质部\\生产异常周报考核统计\\${relativePath}`;
    console.log(`   网络路径: ${networkPath}`);
    
    // 尝试不同的本地映射路径
    const possiblePaths = [
      path.join(__dirname, 'uploads', relativePath),
      path.join(__dirname, '..', 'uploads', relativePath),
      path.join('E:', 'WebProject', 'DMS-QA', 'server', 'uploads', relativePath)
    ];
    
    console.log(`   可能的本地路径:`);
    possiblePaths.forEach((testPath, index) => {
      const exists = fs.existsSync(testPath);
      console.log(`     ${index + 1}. ${testPath} - ${exists ? '✅ 存在' : '❌ 不存在'}`);
    });
    
    console.log('\n=== 调试完成 ===');
    console.log('\n💡 解决建议:');
    console.log('1. 确认文件是否已正确上传到server/uploads目录');
    console.log('2. 检查文件路径是否正确映射');
    console.log('3. 验证Nginx静态文件服务配置');
    console.log('4. 如果文件不存在，考虑重新上传或修复路径');
    
  } catch (error) {
    console.error('调试失败:', error);
  }
}

// 运行调试
debugAttachmentPath().catch(console.error);
