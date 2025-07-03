// 简单测试超链接检测
console.log('=== 测试超链接检测逻辑 ===');

// 模拟Excel单元格数据
const mockCell = {
  v: '图片文件.jpg',
  l: {
    Target: 'file:///C:/Users/T1/AppData/Roaming/Microsoft/Excel/2025年异常汇总/不良图片/图片文件.jpg'
  }
};

console.log('模拟单元格数据:', JSON.stringify(mockCell, null, 2));

// 测试路径检测逻辑
const hyperlink = mockCell.l.Target;
console.log('超链接路径:', hyperlink);

// 检查是否是本地文件路径
const isLocalPath = hyperlink.startsWith('file:///') ||
                   hyperlink.match(/^[A-Za-z]:\\/) ||
                   hyperlink.startsWith('./') ||
                   hyperlink.startsWith('../');

console.log('是否为本地路径:', isLocalPath);
console.log('路径检测详情:', {
  startsWithFile: hyperlink.startsWith('file:///'),
  matchesDrive: !!hyperlink.match(/^[A-Za-z]:\\/),
  startsWithDot: hyperlink.startsWith('./') || hyperlink.startsWith('../')
});

// 测试文件拷贝配置
const pathMappingConfig = require('./config/path-mapping');
console.log('\n文件拷贝配置:', {
  enabled: pathMappingConfig.fileCopy?.enabled,
  maxFileSize: pathMappingConfig.fileCopy?.maxFileSize,
  allowedExtensions: pathMappingConfig.fileCopy?.allowedExtensions?.slice(0, 5) // 只显示前5个
});

// 测试文件扩展名检查
const fileName = 'test.jpg';
const fileExt = fileName.toLowerCase().substring(fileName.lastIndexOf('.'));
const isAllowedType = pathMappingConfig.fileCopy?.allowedExtensions?.includes(fileExt);
console.log('\n文件类型检查:', {
  fileName: fileName,
  extension: fileExt,
  isAllowed: isAllowedType
});

console.log('\n=== 测试完成 ===');
