const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const router = express.Router();

// 确保上传目录存在
const uploadDir = path.join(__dirname, '../uploads');
const siteImagesDir = path.join(uploadDir, 'site-images');

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

if (!fs.existsSync(siteImagesDir)) {
  fs.mkdirSync(siteImagesDir, { recursive: true });
}

// 配置multer存储
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

// 文件过滤器
const fileFilter = (req, file, cb) => {
  // 检查文件类型
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('只允许上传图片文件'), false);
  }
};

// 创建multer实例
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB限制
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

module.exports = router;
