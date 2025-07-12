// 文件拷贝配置
// 简化配置，仅保留文件拷贝相关设置

module.exports = {
  // 支持的文件类型
  supportedFileTypes: [
    '.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', // 图片
    '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', // 文档
    '.mp4', '.avi', '.mov', '.wmv', '.flv', // 视频
    '.mp3', '.wav', '.wma', '.aac', // 音频
    '.zip', '.rar', '.7z', '.tar', '.gz' // 压缩包
  ],

  // 路径映射配置
  pathMapping: {
    // Excel临时路径到实际网络路径的映射
    tempToNetworkMapping: [
      {
        // Excel临时路径模式 - 匹配2025年异常汇总下的文件，去掉中间的月份和不良图片目录
        tempPattern: /C:\\Users\\[^\\]+\\AppData\\Roaming\\Microsoft\\Excel\\2025年异常汇总\\[^\\]+\\不良图片\\(.+)/i,
        // 对应的网络共享路径 - 直接映射到不良图片&资料目录下
        networkPath: `\\\\${process.env.FILE_SERVER_IP || 'localhost'}\\工作\\品质部\\生产异常周报考核统计\\2025年异常汇总\\不良图片&资料\\$1`,
        description: 'Excel临时文件映射到tj_server共享盘的不良图片&资料目录'
      },
      {
        // Excel临时路径模式 - 匹配2025年异常汇总下的其他文件
        tempPattern: /C:\\Users\\[^\\]+\\AppData\\Roaming\\Microsoft\\Excel\\2025年异常汇总\\(.+)/i,
        // 对应的网络共享路径
        networkPath: `\\\\${process.env.FILE_SERVER_IP || 'localhost'}\\工作\\品质部\\生产异常周报考核统计\\2025年异常汇总\\不良图片&资料\\$1`,
        description: 'Excel临时文件映射到tj_server共享盘的不良图片&资料目录（通用）'
      },
      {
        // 通用Excel临时路径模式（备用）
        tempPattern: /C:\\Users\\[^\\]+\\AppData\\Roaming\\Microsoft\\Excel\\(.+)/i,
        // 对应的网络共享路径
        networkPath: `\\\\${process.env.FILE_SERVER_IP || 'localhost'}\\工作\\品质部\\生产异常周报考核统计\\$1`,
        description: 'Excel临时文件通用映射到tj_server共享盘'
      }
    ],

    // 网络路径映射
    networkPaths: [
      {
        pattern: new RegExp(`^\\\\\\\\${process.env.FILE_SERVER_IP || 'localhost'}\\\\工作\\\\(.+)`, 'i'),
        localMount: null, // 如果有本地挂载点可以配置
        description: '文件服务器共享盘访问'
      }
    ]
  },

  // 文件拷贝配置
  fileCopy: {
    enabled: true,
    description: '自动拷贝文件到服务器指定目录',
    maxFileSize: 50 * 1024 * 1024, // 50MB文件大小限制
    allowedExtensions: ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.mp4', '.avi', '.mov'],

    // 路径解析策略
    pathResolution: {
      // 是否尝试路径映射
      enablePathMapping: true,
      // 是否支持网络路径
      enableNetworkPaths: true,
      // 网络路径访问超时（毫秒）
      networkTimeout: 10000
    }
  }
};
