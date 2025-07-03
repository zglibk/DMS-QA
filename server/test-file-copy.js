// 测试文件拷贝功能
const fileCopyService = require('./services/fileCopyService');
const fs = require('fs');
const path = require('path');

async function testFileCopy() {
  console.log('=== 文件拷贝服务测试 ===\n');

  // 创建一个测试文件
  const testDir = path.join(__dirname, 'test-files');
  if (!fs.existsSync(testDir)) {
    fs.mkdirSync(testDir, { recursive: true });
  }

  const testFilePath = path.join(testDir, '测试图片.jpg');
  
  // 创建一个简单的测试文件（模拟图片）
  const testContent = 'This is a test image file content for testing file copy service.';
  fs.writeFileSync(testFilePath, testContent);

  console.log('1. 创建测试文件:', testFilePath);

  // 测试文件拷贝
  console.log('\n2. 测试文件拷贝功能:');
  const result = await fileCopyService.copyFileToServer(testFilePath);
  
  console.log('拷贝结果:', JSON.stringify(result, null, 2));

  if (result.success) {
    console.log('\n✅ 文件拷贝成功!');
    console.log('原始路径:', result.originalPath);
    console.log('目标路径:', result.targetPath);
    console.log('访问URL:', result.accessUrl);
    console.log('文件大小:', result.fileSize, 'bytes');
    
    // 验证文件是否真的被拷贝了
    if (fs.existsSync(result.targetPath)) {
      const copiedContent = fs.readFileSync(result.targetPath, 'utf8');
      if (copiedContent === testContent) {
        console.log('✅ 文件内容验证通过');
      } else {
        console.log('❌ 文件内容验证失败');
      }
    } else {
      console.log('❌ 目标文件不存在');
    }
  } else {
    console.log('\n❌ 文件拷贝失败:', result.error);
  }

  // 测试不存在的文件
  console.log('\n3. 测试不存在的文件:');
  const nonExistentResult = await fileCopyService.copyFileToServer('C:\\不存在的文件.jpg');
  console.log('结果:', nonExistentResult.success ? '成功' : '失败 - ' + nonExistentResult.error);

  // 测试不支持的文件类型
  console.log('\n4. 测试不支持的文件类型:');
  const unsupportedResult = await fileCopyService.copyFileToServer('C:\\Windows\\System32\\notepad.exe');
  console.log('结果:', unsupportedResult.success ? '成功' : '失败 - ' + unsupportedResult.error);

  // 测试批量拷贝
  console.log('\n5. 测试批量拷贝:');
  const testFiles = [
    testFilePath,
    'C:\\不存在的文件.jpg',
    'C:\\Windows\\System32\\notepad.exe'
  ];
  
  const batchResult = await fileCopyService.copyMultipleFiles(testFiles);
  console.log('批量拷贝结果:', JSON.stringify(batchResult, null, 2));

  // 清理测试文件
  console.log('\n6. 清理测试文件:');
  try {
    fs.unlinkSync(testFilePath);
    fs.rmdirSync(testDir);
    console.log('✅ 测试文件清理完成');
  } catch (error) {
    console.log('⚠️ 清理测试文件失败:', error.message);
  }

  console.log('\n=== 测试完成 ===');
}

// 运行测试
testFileCopy().catch(console.error);
