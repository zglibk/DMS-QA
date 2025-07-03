// 测试Excel日期转换的脚本
// 简化版本，不依赖xlsx模块

console.log('=== Excel日期数字对应关系 ===');
console.log('根据用户Excel文件，这些数字对应的实际日期：');
console.log('45566 -> 2024-10-01');
console.log('45567 -> 2024-10-02');
console.log('45568 -> 2024-10-03');
console.log('45570 -> 2024-10-05');

console.log('\n=== 空日期处理测试 ===');
console.log('测试空值处理：');
testEmptyDateHandling();

console.log('\n=== 空工单号处理测试 ===');
console.log('测试空工单号处理：');
testEmptyOrderNoHandling();

console.log('\n=== 超链接处理测试 ===');
console.log('测试附件文件超链接处理：');
testHyperlinkHandling();

// 测试日期转换函数
function testExcelDateConversion() {
  console.log('\n=== 测试Excel日期转换 ===');

  const testValues = [45566, 45567, 45568, 45570];

  testValues.forEach(value => {
    // Excel日期系统：1900年1月1日是第1天，但Excel错误地认为1900年是闰年
    // 所以1900年2月29日（不存在）被算作第60天
    // 正确的转换方式：
    const excelEpoch = new Date(1899, 11, 30); // 1899年12月30日作为第0天
    const date = new Date(excelEpoch.getTime() + value * 24 * 60 * 60 * 1000);
    const formatted = date.toISOString().split('T')[0];

    console.log(`Excel数字 ${value} -> ${formatted}`);
  });

  console.log('\n=== 验证特定日期 ===');
  // 根据用户确认：45566 = 2024-10-01
  // 计算正确的Excel epoch
  const knownDate = new Date('2024-10-01');
  const knownExcelNumber = 45566;

  // 反推Excel epoch
  const calculatedEpoch = new Date(knownDate.getTime() - knownExcelNumber * 24 * 60 * 60 * 1000);
  console.log(`根据45566=2024-10-01反推的Excel epoch: ${calculatedEpoch.toISOString().split('T')[0]}`);

  // 验证其他日期
  console.log('\n=== 使用修正后的算法验证 ===');
  [45566, 45567, 45568, 45570].forEach(value => {
    // 使用与后端相同的算法
    const knownDate = new Date('2024-10-01');
    const knownExcelNumber = 45566;
    const excelEpoch = new Date(knownDate.getTime() - knownExcelNumber * 24 * 60 * 60 * 1000);
    const date = new Date(excelEpoch.getTime() + value * 24 * 60 * 60 * 1000);
    console.log(`Excel数字 ${value} -> ${date.toISOString().split('T')[0]}`);
  });
}

testExcelDateConversion();

// 测试空日期处理函数
function testEmptyDateHandling() {
  console.log('测试空值处理逻辑：');

  const testValues = [null, undefined, '', 0, false];

  testValues.forEach(value => {
    // 模拟后端的空值处理逻辑
    let result;
    if (!value || value === '' || value === null || value === undefined) {
      result = '1900-01-01';
    } else {
      result = '正常处理';
    }

    console.log(`值: ${value} (${typeof value}) -> ${result}`);
  });
}

// 测试空工单号处理函数
function testEmptyOrderNoHandling() {
  console.log('测试空工单号处理逻辑：');

  const testValues = [null, undefined, '', 0, false, 'WO001'];

  testValues.forEach(value => {
    // 模拟后端的空工单号处理逻辑
    let result;
    if (!value || value === '' || value === null || value === undefined) {
      const now = new Date();
      const year = now.getFullYear().toString().slice(-2);
      result = `GD${year}000000`;
    } else {
      result = String(value).trim();
    }

    console.log(`工单号: ${value} (${typeof value}) -> ${result}`);
  });
}

// 测试超链接处理函数
function testHyperlinkHandling() {
  console.log('测试超链接处理逻辑：');

  const testPaths = [
    'C:\\Users\\Documents\\image.jpg',
    'file:///C:/Users/Documents/video.mp4',
    './local/file.pdf',
    '../images/photo.png',
    'http://example.com/file.jpg',
    'https://example.com/video.mp4'
  ];

  testPaths.forEach(path => {
    // 模拟后端的超链接处理逻辑
    const isLocalPath = path.startsWith('file:///') ||
                       path.match(/^[A-Za-z]:\\/) ||
                       path.startsWith('./') ||
                       path.startsWith('../');

    let result;
    if (isLocalPath) {
      // 生成blob URL
      const uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
      });
      result = `blob:http://localhost:5173/${uuid}`;
    } else {
      result = path; // 保持原路径
    }

    console.log(`路径: ${path}`);
    console.log(`  -> 是否本地路径: ${isLocalPath}`);
    console.log(`  -> 转换结果: ${result}`);
    console.log('');
  });
}
