// 测试Excel超链接提取
const XLSX = require('xlsx');
const fs = require('fs');

// 创建一个测试Excel文件，包含超链接
function createTestExcelWithHyperlinks() {
  console.log('=== 创建测试Excel文件 ===');
  
  // 创建工作簿
  const wb = XLSX.utils.book_new();
  
  // 创建测试数据
  const testData = [
    ['附件文件', '描述'],
    ['图片1', '产品照片'],
    ['视频1', '操作视频'],
    ['文档1', '技术文档']
  ];
  
  // 创建工作表
  const ws = XLSX.utils.aoa_to_sheet(testData);
  
  // 尝试添加超链接（XLSX库的超链接支持）
  // 注意：这里我们先创建基本结构，然后看看如何处理超链接
  
  XLSX.utils.book_append_sheet(wb, ws, '测试数据');
  
  // 保存文件
  XLSX.writeFile(wb, 'test-hyperlinks.xlsx');
  console.log('测试文件已创建: test-hyperlinks.xlsx');
}

// 测试读取Excel文件并检查超链接信息
function testReadHyperlinks() {
  console.log('\n=== 测试读取超链接 ===');
  
  try {
    // 如果存在测试文件，读取它
    if (fs.existsSync('test-hyperlinks.xlsx')) {
      const workbook = XLSX.readFile('test-hyperlinks.xlsx');
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      
      console.log('工作表信息:');
      console.log('- 工作表名称:', sheetName);
      console.log('- 工作表范围:', worksheet['!ref']);
      
      // 检查每个单元格的详细信息
      console.log('\n单元格详细信息:');
      const range = XLSX.utils.decode_range(worksheet['!ref']);
      
      for (let R = range.s.r; R <= range.e.r; ++R) {
        for (let C = range.s.c; C <= range.e.c; ++C) {
          const cellAddress = XLSX.utils.encode_cell({r: R, c: C});
          const cell = worksheet[cellAddress];
          
          if (cell) {
            console.log(`${cellAddress}:`, {
              value: cell.v,
              type: cell.t,
              formula: cell.f,
              hyperlink: cell.l, // 超链接信息
              raw: cell.w,
              allProps: Object.keys(cell)
            });
          }
        }
      }
      
      // 检查是否有超链接信息
      if (worksheet['!links']) {
        console.log('\n超链接信息:', worksheet['!links']);
      } else {
        console.log('\n未发现超链接信息');
      }
      
    } else {
      console.log('测试文件不存在，请先创建');
    }
    
  } catch (error) {
    console.error('读取文件失败:', error.message);
  }
}

// 测试超链接提取函数
function extractHyperlinks(filePath) {
  console.log('\n=== 提取超链接函数测试 ===');
  
  try {
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    const hyperlinks = [];
    const range = XLSX.utils.decode_range(worksheet['!ref']);
    
    for (let R = range.s.r; R <= range.e.r; ++R) {
      for (let C = range.s.c; C <= range.e.c; ++C) {
        const cellAddress = XLSX.utils.encode_cell({r: R, c: C});
        const cell = worksheet[cellAddress];
        
        if (cell && cell.l) {
          // 找到超链接
          hyperlinks.push({
            cell: cellAddress,
            text: cell.v,
            hyperlink: cell.l.Target || cell.l.target,
            tooltip: cell.l.Tooltip || cell.l.tooltip
          });
        }
      }
    }
    
    return hyperlinks;
    
  } catch (error) {
    console.error('提取超链接失败:', error.message);
    return [];
  }
}

// 运行测试
console.log('开始测试Excel超链接处理...\n');

// 1. 创建测试文件
createTestExcelWithHyperlinks();

// 2. 读取并分析
testReadHyperlinks();

// 3. 测试提取函数
const hyperlinks = extractHyperlinks('test-hyperlinks.xlsx');
console.log('\n提取到的超链接:', hyperlinks);

console.log('\n=== 超链接处理建议 ===');
console.log('1. XLSX库可以读取Excel中的超链接信息');
console.log('2. 超链接信息存储在cell.l属性中');
console.log('3. 本地文件路径需要特殊处理');
console.log('4. 可能需要文件上传机制来处理本地文件');
