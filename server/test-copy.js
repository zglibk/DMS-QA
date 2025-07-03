// 测试文件拷贝功能
const fileCopyService = require('./services/fileCopyService');

async function testFileCopy() {
  console.log('=== 测试文件拷贝功能 ===');
  
  // 测试一个存在的文件
  const testPath = 'C:\\Windows\\System32\\notepad.exe';
  
  try {
    console.log('测试文件路径:', testPath);
    const result = await fileCopyService.copyFileToServer(testPath);
    console.log('拷贝结果:', JSON.stringify(result, null, 2));
  } catch (error) {
    console.error('测试失败:', error.message);
  }
}

testFileCopy();
