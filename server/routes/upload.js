const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const router = express.Router();

// 确保上传目录存在
const uploadDir = path.join(__dirname, '../uploads');
const siteImagesDir = path.join(uploadDir, 'site-images');
const attachmentDir = path.join(uploadDir, 'attachments');

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

if (!fs.existsSync(siteImagesDir)) {
  fs.mkdirSync(siteImagesDir, { recursive: true });
}

if (!fs.existsSync(attachmentDir)) {
  fs.mkdirSync(attachmentDir, { recursive: true });
}

// 配置multer存储 - 网站图片
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, siteImagesDir);
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
const customPathAttachmentStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    console.log('=== Multer destination 调试信息 ===');
    console.log('req.body:', req.body);
    console.log('req.headers:', req.headers);

    // 在multer的destination函数中，req.body可能还没有被完全解析
    // 我们先使用默认路径，稍后在路由处理中移动文件
    const defaultDir = path.join(attachmentDir, 'temp');

    // 确保临时目录存在
    if (!fs.existsSync(defaultDir)) {
      fs.mkdirSync(defaultDir, { recursive: true });
      console.log(`创建临时目录: ${defaultDir}`);
    }

    console.log(`文件将临时保存到: ${defaultDir}`);
    console.log('================================');
    cb(null, defaultDir);
  },
  filename: function (req, file, cb) {
    // 处理文件名编码问题
    let filename = file.originalname;

    console.log('=== 文件名编码处理 ===');
    console.log('原始文件名:', filename);
    console.log('文件名Buffer:', Buffer.from(filename));
    console.log('文件名编码检测:', filename.split('').map(char => char.charCodeAt(0)));

    try {
      // 检查是否包含中文字符的编码问题
      // 如果文件名看起来像是被错误编码的，尝试修复
      if (filename.includes('é') || filename.includes('\\x') || /[\u00C0-\u00FF]/.test(filename)) {
        console.log('检测到可能的编码问题，尝试修复...');

        // 尝试多种编码修复方法
        const methods = [
          () => Buffer.from(filename, 'latin1').toString('utf8'),
          () => Buffer.from(filename, 'binary').toString('utf8'),
          () => decodeURIComponent(escape(filename))
        ];

        for (let i = 0; i < methods.length; i++) {
          try {
            const fixedName = methods[i]();
            console.log(`方法${i + 1}修复结果:`, fixedName);

            // 检查修复后的文件名是否合理（包含正常的中文字符）
            if (fixedName && fixedName !== filename && !/[\u00C0-\u00FF]/.test(fixedName)) {
              filename = fixedName;
              console.log('编码修复成功:', filename);
              break;
            }
          } catch (e) {
            console.log(`方法${i + 1}失败:`, e.message);
          }
        }
      }
    } catch (error) {
      console.error('文件名编码修复失败:', error);
    }

    // 如果文件名仍然有问题，使用时间戳作为备用
    if (!filename || filename.includes('é') || filename.includes('\\x')) {
      console.log('使用备用文件名策略');
      const timestamp = Date.now();
      const ext = path.extname(file.originalname) || '.jpg';
      filename = `file_${timestamp}${ext}`;
    }

    console.log(`最终使用文件名: ${filename}`);
    console.log('====================');
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

// 创建multer实例 - 自定义路径投诉附件
const customPathAttachmentUpload = multer({
  storage: customPathAttachmentStorage,
  fileFilter: attachmentFileFilter,
  limits: {
    fileSize: 20 * 1024 * 1024, // 20MB限制
  }
});

// 网站图片上传接口 - 转换为BASE64存储
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

    console.log('=== 路由处理阶段调试 ===');
    console.log('file.path (当前位置):', file.path);
    console.log('customPath (来自请求):', customPath);

    // 如果有自定义路径，将文件移动到正确位置
    if (customPath && customPath.trim()) {
      const targetDir = path.join(attachmentDir, customPath.trim());
      const targetPath = path.join(targetDir, file.filename);

      console.log('目标目录:', targetDir);
      console.log('目标路径:', targetPath);

      // 确保目标目录存在
      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
        console.log(`创建目标目录: ${targetDir}`);
      }

      // 移动文件到正确位置
      fs.renameSync(file.path, targetPath);
      console.log(`文件已移动: ${file.path} -> ${targetPath}`);

      // 更新file对象的路径
      file.path = targetPath;
      file.destination = targetDir;
    }

    console.log('最终文件路径:', file.path);
    console.log('========================');

    // 计算相对路径（相对于attachments目录）
    let relativePath = path.relative(attachmentDir, file.path);

    // 服务器完整路径
    const serverPath = file.path;

    console.log('=== 详细路径计算调试 ===');
    console.log('attachmentDir:', attachmentDir);
    console.log('file.path:', file.path);
    console.log('file.destination:', file.destination);
    console.log('file.filename:', file.filename);
    console.log('customPath from request:', customPath);
    console.log('计算的relativePath:', relativePath);

    // 保持Windows路径格式（用于数据库存储，匹配现有的路径格式）
    // 确保使用反斜杠作为路径分隔符
    const windowsPath = relativePath.replace(/\//g, '\\');

    console.log('最终windowsPath:', windowsPath);
    console.log('========================');

    console.log(`投诉附件上传成功:`, {
      originalName: file.originalname,
      filename: file.filename,
      size: file.size,
      relativePath: windowsPath,
      serverPath: serverPath,
      destination: file.destination,
      customPath: customPath
    });

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

module.exports = router;
