// 测试路径转换功能
const pathMappingConfig = require('./config/path-mapping');

// 模拟路径转换函数（从import.js复制）
function convertToNetworkPath(localPath) {
  if (!localPath) return localPath;

  let networkPath = localPath;
  let originalPath = localPath;

  // 移除file:///前缀
  if (networkPath.startsWith('file:///')) {
    networkPath = networkPath.substring(8);
  }

  // 使用配置文件中的路径映射规则
  const { pathMappings, accessMethods, conversionOptions } = pathMappingConfig;

  // 应用路径映射规则
  for (const mapping of pathMappings) {
    if (mapping.local.test(networkPath)) {
      networkPath = networkPath.replace(mapping.local, mapping.network);
      console.log(`应用映射规则 "${mapping.name}": ${originalPath} -> ${networkPath}`);
      break;
    }
  }

  // 路径标准化处理
  if (conversionOptions.normalizeSeparators) {
    // 统一使用正斜杠
    networkPath = networkPath.replace(/\\/g, '/');
  }

  // URL编码处理（处理中文文件名等特殊字符）
  if (conversionOptions.urlEncode) {
    // 分割路径，只对文件名部分进行编码
    const pathParts = networkPath.split('/');
    const fileName = pathParts[pathParts.length - 1];
    if (fileName && fileName.includes('%') === false) {
      // 只有当文件名包含特殊字符且未编码时才进行编码
      try {
        const encodedFileName = encodeURIComponent(fileName);
        if (encodedFileName !== fileName) {
          pathParts[pathParts.length - 1] = encodedFileName;
          networkPath = pathParts.join('/');
          console.log(`文件名编码: ${fileName} -> ${encodedFileName}`);
        }
      } catch (error) {
        console.warn('文件名编码失败:', error.message);
      }
    }
  }

  // 如果启用了HTTP访问方式，转换为HTTP URL
  if (accessMethods.http.enabled) {
    // 提取相对路径部分
    const relativePath = networkPath.replace(/^\/\/[^\/]+\//, '');
    const httpUrl = `${accessMethods.http.baseUrl}/${relativePath}`;
    console.log(`HTTP访问路径: ${networkPath} -> ${httpUrl}`);
    return httpUrl;
  }

  console.log(`路径转换完成: ${originalPath} -> ${networkPath}`);
  return networkPath;
}

// 测试用例
const testPaths = [
  'C:\\Users\\Documents\\图片\\产品缺陷.jpg',
  'D:\\共享文件\\质量报告\\2024年度报告.pdf',
  'E:\\工厂照片\\车间现场\\设备故障.png',
  'file:///C:/Users/Admin/Desktop/测试文件.docx',
  '\\\\192.168.1.100\\shared\\images\\defect.jpg',
  './相对路径/文件.txt',
  '../上级目录/另一个文件.xlsx'
];

console.log('=== 路径转换测试 ===\n');

testPaths.forEach((testPath, index) => {
  console.log(`测试 ${index + 1}: ${testPath}`);
  const result = convertToNetworkPath(testPath);
  console.log(`结果: ${result}`);
  console.log('---');
});

console.log('\n=== 配置信息 ===');
console.log('服务器IP:', pathMappingConfig.serverIP);
console.log('HTTP访问基础URL:', pathMappingConfig.accessMethods.http.baseUrl);
console.log('支持的文件类型:', pathMappingConfig.supportedFileTypes.join(', '));

console.log('\n=== 路径映射规则 ===');
pathMappingConfig.pathMappings.forEach((mapping, index) => {
  console.log(`${index + 1}. ${mapping.name}`);
  console.log(`   描述: ${mapping.description}`);
  console.log(`   规则: ${mapping.local}`);
  console.log(`   目标: ${mapping.network}`);
});

console.log('\n=== 局域网访问说明 ===');
console.log('✅ 优势:');
console.log('  - HTTP URL可以在任何局域网设备上访问');
console.log('  - 支持中文文件名自动编码');
console.log('  - 统一的访问方式，无需考虑操作系统差异');
console.log('  - 可以通过浏览器直接预览图片和文档');

console.log('\n⚠️  注意事项:');
console.log('  - 需要在数据库服务器(192.168.1.57)上配置HTTP文件服务器');
console.log('  - 确保共享文件夹权限正确设置');
console.log('  - 建议使用Nginx或Apache作为文件服务器');

console.log('\n🔧 部署建议:');
console.log('  1. 在192.168.1.57上安装Nginx');
console.log('  2. 配置文件服务器指向共享目录');
console.log('  3. 设置适当的CORS和安全策略');
console.log('  4. 测试局域网内其他设备的访问');
