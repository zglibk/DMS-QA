const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const router = express.Router();

// 确保上传目录存在
const uploadDir = path.join(__dirname, '../uploads');
const siteImagesDir = path.join(uploadDir, 'site-images');
const attachmentDir = path.join(uploadDir, 'attachments');
const customerComplaintDir = path.join(uploadDir, 'customer-complaint');

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

if (!fs.existsSync(siteImagesDir)) {
  fs.mkdirSync(siteImagesDir, { recursive: true });
}

if (!fs.existsSync(attachmentDir)) {
  fs.mkdirSync(attachmentDir, { recursive: true });
}

if (!fs.existsSync(customerComplaintDir)) {
  fs.mkdirSync(customerComplaintDir, { recursive: true });
}

// 配置multer存储 - 网站图片
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // 根据文件类型确定存储目录
    const fileType = req.body.fileType || req.body.type || 'image';
    let targetDir = siteImagesDir;
    
    if (fileType === 'productDrawing' || fileType === 'drawing') {
      // 产品图纸存储到产品图纸目录
      targetDir = path.join(siteImagesDir, '产品图纸');
    } else if (fileType === 'colorCard' || fileType === 'sample') {
      // 样板图像存储到样板图像目录
      targetDir = path.join(siteImagesDir, '样板图像');
    }
    
    // 确保目标目录存在
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }
    
    cb(null, targetDir);
  },
  filename: function (req, file, cb) {
    // 生成唯一文件名
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    const type = req.body.type || 'image';
    cb(null, `${type}-${uniqueSuffix}${ext}`);
  }
});

// 配置multer存储 - 投诉附件
const attachmentStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    // 创建按年月分组的目录结构
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const dayDir = path.join(attachmentDir, `${year}年异常汇总`, `${month}月份`);

    // 确保目录存在
    if (!fs.existsSync(dayDir)) {
      fs.mkdirSync(dayDir, { recursive: true });
    }

    cb(null, dayDir);
  },
  filename: function (req, file, cb) {
    // 保持原始文件名，但添加时间戳避免冲突
    const timestamp = Date.now();
    const ext = path.extname(file.originalname);

    // 处理文件名，确保中文字符正确编码
    let baseName = path.basename(file.originalname, ext);

    // 如果文件名包含非ASCII字符，使用更安全的命名方式
    if (/[^\x00-\x7F]/.test(baseName)) {
      // 使用时间戳和随机字符串作为文件名
      const randomStr = Math.random().toString(36).substring(2, 8);
      baseName = `file_${timestamp}_${randomStr}`;
    }

    cb(null, `${baseName}${ext}`);
  }
});

// 配置multer存储 - 自定义路径投诉附件
// 配置multer存储 - 客诉图片专用
const customerComplaintStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    // 确保客诉图片目录存在
    if (!fs.existsSync(customerComplaintDir)) {
      fs.mkdirSync(customerComplaintDir, { recursive: true });
    }
    cb(null, customerComplaintDir);
  },
  filename: function (req, file, cb) {
    // 生成唯一文件名：时间戳-随机字符串.扩展名
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(2, 8);
    
    // 处理中文文件名编码问题
    let originalName;
    try {
      // 尝试解码文件名，处理中文字符
      originalName = Buffer.from(file.originalname, 'latin1').toString('utf8');
      originalName = path.parse(originalName).name;
    } catch (error) {
      // 如果解码失败，使用原始文件名
      originalName = path.parse(file.originalname).name;
    }
    
    // 为了确保文件名唯一性，始终添加时间戳和随机字符串
    let finalName;
    if (originalName === 'image' || /[^\x00-\x7F]/.test(originalName)) {
      // 对于默认的image文件名或包含非ASCII字符的文件名，使用时间戳和随机字符串
      finalName = `file_${timestamp}_${randomStr}`;
    } else {
      // 对于其他文件名，保留原名但添加时间戳确保唯一性
      finalName = `${originalName}_${timestamp}_${randomStr}`;
    }
    
    const extension = path.extname(file.originalname); // 获取扩展名
    cb(null, `${finalName}${extension}`);
  }
});

const customPathAttachmentStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    // 处理文件上传目标目录

    // 在multer的destination函数中，req.body可能还没有被完全解析
    // 我们先使用默认路径，稍后在路由处理中移动文件
    const defaultDir = path.join(attachmentDir, 'temp');

    // 确保临时目录存在
    if (!fs.existsSync(defaultDir)) {
      fs.mkdirSync(defaultDir, { recursive: true });
      // 创建临时目录
    }

    // 文件将保存到临时目录
    cb(null, defaultDir);
  },
  filename: function (req, file, cb) {
    // 处理文件名编码问题
    let filename = file.originalname;

    // 处理文件名编码

    try {
      // 检查是否包含中文字符的编码问题
      // 如果文件名看起来像是被错误编码的，尝试修复
      if (filename.includes('é') || filename.includes('\\x') || /[\u00C0-\u00FF]/.test(filename)) {
        // 检测到编码问题，尝试修复

        // 尝试多种编码修复方法
        const methods = [
          () => Buffer.from(filename, 'latin1').toString('utf8'),
          () => Buffer.from(filename, 'binary').toString('utf8'),
          () => decodeURIComponent(escape(filename))
        ];

        for (let i = 0; i < methods.length; i++) {
          try {
            const fixedName = methods[i]();
            // 尝试编码修复方法

            // 检查修复后的文件名是否合理（包含正常的中文字符）
            if (fixedName && fixedName !== filename && !/[\u00C0-\u00FF]/.test(fixedName)) {
              filename = fixedName;
              // 编码修复成功
              break;
            }
          } catch (e) {
            // 编码修复方法失败
          }
        }
      }
    } catch (error) {
      // 文件名编码修复失败
    }

    // 如果文件名仍然有问题，使用时间戳作为备用
    if (!filename || filename.includes('é') || filename.includes('\\x')) {
      // 使用备用文件名策略
      const timestamp = Date.now();
      const ext = path.extname(file.originalname) || '.jpg';
      filename = `file_${timestamp}${ext}`;
    }

    // 文件名处理完成
    cb(null, filename);
  }
});

// 文件过滤器 - 网站图片
const fileFilter = (req, file, cb) => {
  // 检查文件类型
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('只允许上传图片文件'), false);
  }
};

// 文件过滤器 - 投诉附件（允许所有文件类型）
const attachmentFileFilter = (req, file, cb) => {
  // 允许所有文件类型，但限制文件大小
  cb(null, true);
};

// 创建multer实例 - 网站图片
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB限制
  }
});

// 创建multer实例 - 投诉附件
const attachmentUpload = multer({
  storage: attachmentStorage,
  fileFilter: attachmentFileFilter,
  limits: {
    fileSize: 20 * 1024 * 1024, // 20MB限制
  }
});

// 创建multer实例 - 客诉图片专用
const customerComplaintUpload = multer({
  storage: customerComplaintStorage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB限制
  }
});

// 配置multer存储 - 通知图片专用
const noticeImageStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    // 通知图片存储目录
    const noticeImagesDir = path.join(uploadDir, 'notice-images');
    
    // 确保通知图片目录存在
    if (!fs.existsSync(noticeImagesDir)) {
      fs.mkdirSync(noticeImagesDir, { recursive: true });
    }
    
    cb(null, noticeImagesDir);
  },
  filename: function (req, file, cb) {
    // 生成唯一文件名：notice-时间戳-随机字符串.扩展名
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(2, 8);
    const extension = path.extname(file.originalname);
    
    cb(null, `notice-${timestamp}-${randomStr}${extension}`);
  }
});

// 创建multer实例 - 通知图片专用
const noticeImageUpload = multer({
  storage: noticeImageStorage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB限制
  }
});

// 创建multer实例 - 自定义路径投诉附件
const customPathAttachmentUpload = multer({
  storage: customPathAttachmentStorage,
  fileFilter: attachmentFileFilter,
  limits: {
    fileSize: 20 * 1024 * 1024, // 20MB限制
  }
});

// 网站图片上传接口 - 转换为BASE64存储
// 样品图片上传接口
router.post('/', upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: '没有上传文件'
      });
    }

    // 根据文件类型构建访问URL
    const fileType = req.body.fileType || req.body.type || 'image';
    let subDir = '';
    
    if (fileType === 'productDrawing' || fileType === 'drawing') {
      subDir = '/产品图纸';
    } else if (fileType === 'colorCard' || fileType === 'sample') {
      subDir = '/样板图像';
    }
    
    const fileUrl = `/files/site-images${subDir}/${req.file.filename}`;

    console.log('样品图片上传成功:', {
      originalName: req.file.originalname,
      filename: req.file.filename,
      size: req.file.size,
      path: req.file.path,
      url: fileUrl,
      fileType: fileType
    });

    res.json({
      success: true,
      message: '图片上传成功',
      url: fileUrl,
      data: {
        filename: req.file.filename,
        originalName: req.file.originalname,
        size: req.file.size,
        path: req.file.path,
        fileType: fileType
      }
    });

  } catch (error) {
    console.error('样品图片上传失败:', error);
    res.status(500).json({
      success: false,
      message: '图片上传失败: ' + error.message
    });
  }
});

// 添加/image路由，用于客诉图片上传
// 客诉图片上传路由 - 专用于客户投诉图片
router.post('/image', customerComplaintUpload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: '请选择要上传的图片'
      })
    }

    // 处理原始文件名的编码问题
    let correctedOriginalName;
    try {
      // 尝试解码文件名，处理中文字符编码问题
      correctedOriginalName = Buffer.from(req.file.originalname, 'latin1').toString('utf8');
      // 文件名编码修复成功
    } catch (error) {
      // 如果解码失败，使用原始文件名
      correctedOriginalName = req.file.originalname;
      // 文件名编码修复失败，使用原始文件名
    }

    // 构建完整的文件信息对象，参考出版异常的格式
    const fileInfo = {
      id: `file_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      originalName: correctedOriginalName,
      filename: req.file.filename,
      relativePath: `customer-complaint/${req.file.filename}`,
      // 客诉图片使用customer-complaint路径
      accessUrl: `/files/customer-complaint/${req.file.filename}`,
      fullUrl: `${req.protocol}://${req.get('host')}:8080/files/customer-complaint/${req.file.filename}`,
      fileSize: req.file.size,
      mimeType: req.file.mimetype,
      uploadTime: new Date().toISOString(),
      fileType: 'image',
      category: 'customer_complaint'
    };

    console.log('客诉图片上传成功:', fileInfo);

    res.json({
      success: true,
      message: '图片上传成功',
      fileInfo: fileInfo,
      // 保持向后兼容
      url: fileInfo.accessUrl,
      data: {
        filename: req.file.filename,
        originalname: req.file.originalname,
        path: req.file.path,
        size: req.file.size
      }
    })
  } catch (error) {
    console.error('客诉图片上传失败:', error)
    res.status(500).json({
      success: false,
      message: '图片上传失败'
    })
  }
});

router.post('/site-image', upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: '没有上传文件'
      });
    }

    const type = req.body.type || 'image';

    // 读取文件并转换为BASE64
    const imageBuffer = fs.readFileSync(req.file.path);
    const base64Image = imageBuffer.toString('base64');
    const mimeType = req.file.mimetype;
    const dataUrl = `data:${mimeType};base64,${base64Image}`;

    // 删除临时文件
    fs.unlinkSync(req.file.path);

    console.log(`网站${type}上传成功:`, {
      originalName: req.file.originalname,
      filename: req.file.filename,
      size: req.file.size,
      mimeType: mimeType,
      base64Length: base64Image.length
    });

    res.json({
      success: true,
      message: `${type === 'logo' ? 'LOGO' : '网站图标'}上传成功`,
      data: {
        url: dataUrl, // 返回BASE64数据URL
        filename: req.file.filename,
        originalName: req.file.originalname,
        size: req.file.size,
        type: type,
        mimeType: mimeType,
        base64: base64Image // 也返回纯BASE64字符串，以备需要
      }
    });

  } catch (error) {
    console.error('文件上传失败:', error);
    res.status(500).json({
      success: false,
      message: '文件上传失败: ' + error.message
    });
  }
});

// 删除网站图片接口
router.delete('/site-image/:filename', (req, res) => {
  try {
    const filename = req.params.filename;
    const filePath = path.join(siteImagesDir, filename);

    // 检查文件是否存在
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        message: '文件不存在'
      });
    }

    // 删除文件
    fs.unlinkSync(filePath);

    console.log('网站图片删除成功:', filename);

    res.json({
      success: true,
      message: '文件删除成功'
    });

  } catch (error) {
    console.error('文件删除失败:', error);
    res.status(500).json({
      success: false,
      message: '文件删除失败: ' + error.message
    });
  }
});

// 获取网站图片列表
router.get('/site-images', (req, res) => {
  try {
    const files = fs.readdirSync(siteImagesDir);
    const imageFiles = files.filter(file => {
      const ext = path.extname(file).toLowerCase();
      return ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.ico'].includes(ext);
    });

    const fileList = imageFiles.map(filename => {
      const filePath = path.join(siteImagesDir, filename);
      const stats = fs.statSync(filePath);
      
      return {
        filename: filename,
        url: `/files/site-images/${filename}`,
        size: stats.size,
        uploadTime: stats.mtime,
        type: filename.startsWith('logo-') ? 'logo' : 
              filename.startsWith('favicon-') ? 'favicon' : 'image'
      };
    });

    res.json({
      success: true,
      data: fileList,
      message: '获取图片列表成功'
    });

  } catch (error) {
    console.error('获取图片列表失败:', error);
    res.status(500).json({
      success: false,
      message: '获取图片列表失败: ' + error.message
    });
  }
});

// 错误处理中间件
router.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: '文件大小超过限制（最大5MB）'
      });
    }
  }
  
  res.status(500).json({
    success: false,
    message: error.message || '上传失败'
  });
});

// 投诉附件上传接口（支持自定义路径）
router.post('/complaint-attachment', customPathAttachmentUpload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: '没有上传文件'
      });
    }

    const file = req.file;
    const customPath = req.body.customPath;

    // 处理文件路径和自定义路径

    // 如果有自定义路径，将文件移动到正确位置
    if (customPath && customPath.trim()) {
      const targetDir = path.join(attachmentDir, customPath.trim());
      const targetPath = path.join(targetDir, file.filename);

      // 设置目标目录和路径

      // 确保目标目录存在
      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
        console.log(`创建目标目录: ${targetDir}`);
      }

      // 移动文件到正确位置
      fs.renameSync(file.path, targetPath);
      // 文件已移动到目标位置

      // 更新file对象的路径
      file.path = targetPath;
      file.destination = targetDir;
    }

    // 文件路径处理完成

    // 计算相对路径（相对于attachments目录）
    let relativePath = path.relative(attachmentDir, file.path);

    // 服务器完整路径
    const serverPath = file.path;

    // 计算文件相对路径

    // 保持Windows路径格式（用于数据库存储，匹配现有的路径格式）
    // 确保使用反斜杠作为路径分隔符
    const windowsPath = relativePath.replace(/\//g, '\\');

    // Windows路径格式转换完成

    // 投诉附件上传成功，准备返回结果
    res.json({
      success: true,
      message: '文件上传成功',
      filename: file.filename,
      originalName: file.originalname,
      size: file.size,
      relativePath: windowsPath,
      serverPath: serverPath,
      uploadTime: new Date()
    });

  } catch (error) {
    console.error('投诉附件上传失败:', error);

    // 如果有临时文件，删除它
    if (req.file && req.file.path) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (unlinkError) {
        console.error('删除临时文件失败:', unlinkError);
      }
    }

    res.status(500).json({
      success: false,
      message: error.message || '文件上传失败'
    });
  }
});

// 返工记录附件上传
router.post('/rework-attachment', customPathAttachmentUpload.single('file'), (req, res) => {
  try {
    console.log('=== 返工记录附件上传开始 ===');
    console.log('req.body:', req.body);
    console.log('req.file:', req.file);

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: '没有接收到文件'
      });
    }

    const file = req.file;
    const { customPath } = req.body;

    console.log('接收到的自定义路径:', customPath);

    // 如果提供了自定义路径，移动文件到指定位置
    let finalPath = file.path;
    let windowsPath = '';
    let serverPath = '';

    if (customPath) {
      // 构建完整的目标路径
      const targetDir = path.join(attachmentDir, customPath);
      const targetPath = path.join(targetDir, file.filename);

      console.log('目标目录:', targetDir);
      console.log('目标路径:', targetPath);

      // 确保目标目录存在
      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
        console.log(`创建目录: ${targetDir}`);
      }

      // 移动文件
      try {
        fs.renameSync(file.path, targetPath);
        finalPath = targetPath;
        console.log(`文件移动成功: ${file.path} -> ${targetPath}`);
      } catch (moveError) {
        console.error('文件移动失败:', moveError);
        // 如果移动失败，尝试复制然后删除原文件
        try {
          fs.copyFileSync(file.path, targetPath);
          fs.unlinkSync(file.path);
          finalPath = targetPath;
          console.log(`文件复制成功: ${file.path} -> ${targetPath}`);
        } catch (copyError) {
          console.error('文件复制也失败:', copyError);
          throw new Error('文件移动失败');
        }
      }

      // 生成相对路径（用于数据库存储）
      windowsPath = path.join('attachments', customPath, file.filename).replace(/\//g, '\\');
      serverPath = finalPath;
    } else {
      // 没有自定义路径，使用默认路径
      const relativePath = path.relative(path.join(__dirname, '../uploads'), finalPath);
      windowsPath = relativePath.replace(/\//g, '\\');
      serverPath = finalPath;
    }

    console.log('最终文件信息:', {
      filename: file.filename,
      originalName: file.originalname,
      size: file.size,
      relativePath: windowsPath,
      serverPath: serverPath,
      destination: file.destination,
      customPath: customPath
    });

    res.json({
      success: true,
      message: '返工记录附件上传成功',
      filename: file.filename,
      originalName: file.originalname,
      size: file.size,
      relativePath: windowsPath,
      serverPath: serverPath,
      uploadTime: new Date()
    });

  } catch (error) {
    console.error('返工记录附件上传失败:', error);

    // 如果有临时文件，删除它
    if (req.file && req.file.path) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (unlinkError) {
        console.error('删除临时文件失败:', unlinkError);
      }
    }

    res.status(500).json({
      success: false,
      message: error.message || '返工记录附件上传失败'
    });
  }
});

// 通知图片上传接口
router.post('/notice-image', noticeImageUpload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: '请选择要上传的图片'
      });
    }

    // 处理原始文件名的编码问题
    let correctedOriginalName;
    try {
      // 尝试解码文件名，处理中文字符编码问题
      correctedOriginalName = Buffer.from(req.file.originalname, 'latin1').toString('utf8');
    } catch (error) {
      // 如果解码失败，使用原始文件名
      correctedOriginalName = req.file.originalname;
    }

    // 构建完整的文件信息对象
    const fileInfo = {
      id: `notice_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      originalName: correctedOriginalName,
      filename: req.file.filename,
      relativePath: `notice-images/${req.file.filename}`,
      accessUrl: `/files/notice-images/${req.file.filename}`,
      fullUrl: `${req.protocol}://${req.get('host')}:8080/files/notice-images/${req.file.filename}`,
      fileSize: req.file.size,
      mimeType: req.file.mimetype,
      uploadTime: new Date().toISOString(),
      fileType: 'image',
      category: 'notice'
    };

    console.log('通知图片上传成功:', fileInfo);

    res.json({
      success: true,
      message: '通知图片上传成功',
      fileInfo: fileInfo,
      // 保持向后兼容
      url: fileInfo.accessUrl,
      data: {
        filename: req.file.filename,
        originalname: req.file.originalname,
        path: req.file.path,
        size: req.file.size
      }
    });
  } catch (error) {
    console.error('通知图片上传失败:', error);
    res.status(500).json({
      success: false,
      message: '通知图片上传失败'
    });
  }
});

module.exports = router;
