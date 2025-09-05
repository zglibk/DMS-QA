const express = require('express');
const router = express.Router();
const { sql, getConnection } = require('../config/database');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// 配置文件上传
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadPath = path.join(__dirname, '../uploads/site-images/publishing-exception');
    // 确保目录存在
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
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
    // 特别处理Ctrl+V上传的图片（通常文件名为image.png）
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

const upload = multer({ 
  storage: storage,
  fileFilter: function (req, file, cb) {
    // 只允许图片文件
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('只允许上传图片文件'), false);
    }
  },
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB限制
  }
});

// 出版异常专用图片上传路由
router.post('/upload-image', upload.single('file'), async (req, res) => {
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
      console.log('文件名编码修复:', {
        original: req.file.originalname,
        corrected: correctedOriginalName
      });
    } catch (error) {
      // 如果解码失败，使用原始文件名
      correctedOriginalName = req.file.originalname;
      console.log('文件名编码修复失败，使用原始文件名:', req.file.originalname);
    }

    // 构建完整的文件信息对象
    const fileInfo = {
      id: `file_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      originalName: correctedOriginalName,
      filename: req.file.filename,
      relativePath: `site-images/publishing-exception/${req.file.filename}`,
      // 新上传的文件使用静态路径，因为还没有保存到数据库
      accessUrl: `/files/site-images/publishing-exception/${req.file.filename}`,
      fullUrl: `${req.protocol}://${req.get('host')}:8080/files/site-images/publishing-exception/${req.file.filename}`,
      fileSize: req.file.size,
      mimeType: req.file.mimetype,
      uploadTime: new Date().toISOString(),
      fileType: 'image',
      category: 'exception_evidence'
    };

    console.log('出版异常图片上传成功:', fileInfo);

    res.json({
      success: true,
      message: '图片上传成功',
      fileInfo: fileInfo,
      // 保持向后兼容
      data: {
        filename: req.file.filename,
        originalname: req.file.originalname,
        path: req.file.path,
        size: req.file.size
      }
    })
  } catch (error) {
    console.error('图片上传失败:', error)
    res.status(500).json({
      success: false,
      message: '图片上传失败'
    })
  }
})

/**
 * 获取去重的产品名称列表
 * 功能：从出版异常记录表中获取所有不重复的产品名称，用于前端下拉选择器
 */
router.get('/product-names', async (req, res) => {
  try {
    const pool = await getConnection();
    
    // 查询去重的产品名称，排除空值和null值
    const query = `
      SELECT DISTINCT product_name
      FROM publishing_exceptions
      WHERE product_name IS NOT NULL 
        AND product_name != ''
        AND LTRIM(RTRIM(product_name)) != ''
      ORDER BY product_name ASC
    `;
    
    const request = pool.request();
    const result = await request.query(query);
    
    // 提取产品名称数组
    const productNames = result.recordset.map(row => row.product_name.trim());
    
    res.json({
      success: true,
      data: productNames
    });
  } catch (error) {
    console.error('获取产品名称列表失败:', error);
    res.status(500).json({ 
      success: false, 
      message: '获取产品名称列表失败', 
      error: error.message 
    });
  }
});

/**
 * 获取出版异常列表
 * 支持分页、筛选和排序
 * 包含错误类型(errorType)筛选功能
 */
router.get('/', async (req, res) => {
  try {
    const { 
      page = 1, 
      pageSize = 10, 
      customerCode, 
      workOrderNumber, 
      productName,
      startDate,
      endDate,
      responsibleUnit,
      errorType  // 错误类型筛选参数
    } = req.query;

    const offset = (page - 1) * pageSize;
    
    let whereClause = 'WHERE isDeleted = 0';
    const params = [];
    
    // 构建筛选条件
    if (customerCode) {
      whereClause += ' AND customer_code LIKE @customerCode';
      params.push({ name: 'customerCode', type: sql.NVarChar, value: `%${customerCode}%` });
    }
    
    if (workOrderNumber) {
      whereClause += ' AND work_order_number LIKE @workOrderNumber';
      params.push({ name: 'workOrderNumber', type: sql.NVarChar, value: `%${workOrderNumber}%` });
    }
    
    if (productName) {
      whereClause += ' AND product_name LIKE @productName';
      params.push({ name: 'productName', type: sql.NVarChar, value: `%${productName}%` });
    }
    
    if (responsibleUnit) {
      whereClause += ' AND responsible_unit LIKE @responsibleUnit';
      params.push({ name: 'responsibleUnit', type: sql.NVarChar, value: `%${responsibleUnit}%` });
    }
    
    if (startDate) {
      whereClause += ' AND registration_date >= @startDate';
      params.push({ name: 'startDate', type: sql.Date, value: startDate });
    }
    
    if (endDate) {
      whereClause += ' AND registration_date <= @endDate';
      params.push({ name: 'endDate', type: sql.Date, value: endDate });
    }
    
    // 错误类型筛选条件
    if (errorType) {
      whereClause += ' AND error_type LIKE @errorType';
      params.push({ name: 'errorType', type: sql.NVarChar, value: `%${errorType}%` });
    }

    const pool = await getConnection();
    
    // 获取总数
    const countQuery = `SELECT COUNT(*) as total FROM publishing_exceptions ${whereClause}`;
    let countRequest = pool.request();
    params.forEach(param => {
      countRequest.input(param.name, param.type, param.value);
    });
    const countResult = await countRequest.query(countQuery);
    const total = countResult.recordset[0].total;

    // 获取数据 - 使用兼容的分页方式
    const dataQuery = `
      SELECT TOP (@pageSize) * FROM (
        SELECT *, ROW_NUMBER() OVER (ORDER BY registration_date DESC, id DESC) as rn
        FROM publishing_exceptions 
        ${whereClause}
      ) t WHERE rn > @offset
    `;
    
    let dataRequest = pool.request();
    params.forEach(param => {
      dataRequest.input(param.name, param.type, param.value);
    });
    dataRequest.input('offset', sql.Int, offset);
    dataRequest.input('pageSize', sql.Int, parseInt(pageSize));
    
    const dataResult = await dataRequest.query(dataQuery);

    res.json({
      success: true,
      data: dataResult.recordset,
      pagination: {
        current: parseInt(page),
        pageSize: parseInt(pageSize),
        total: total,
        pages: Math.ceil(total / pageSize)
      }
    });
  } catch (error) {
    console.error('获取出版异常列表失败:', error);
    res.status(500).json({ success: false, message: '获取数据失败', error: error.message });
  }
});

/**
 * 导出出版异常数据到Excel
 * 包含所有字段，包括错误类型(error_type)
 * 支持includeImages参数，当为true时包含图片信息
 */
router.get('/export', async (req, res) => {
  const { executeQuery } = require('../db');
  const xl = require('excel4node');
  
  try {
    // 获取includeImages参数
    const includeImages = req.query.includeImages === 'true';
    
    // 获取recordIds参数
    const recordIds = req.query.recordIds;
    
    // 构建WHERE条件
    let whereCondition = 'WHERE isDeleted = 0';
    if (recordIds) {
      const ids = recordIds.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id));
      if (ids.length > 0) {
        whereCondition += ` AND id IN (${ids.join(',')})`;;
      }
    }
    
    // 获取数据
    const result = await executeQuery(async (pool) => {
      const query = `
        SELECT 
          id,
          registration_date,
          publishing_date,
          customer_code,
          work_order_number,
          product_name,
          plate_type,
          publishing_sheets,
          exception_description,
          error_type,  -- 错误类型字段，用于分类管理
          responsible_unit,
          responsible_person,
          length_cm,
          width_cm,
          piece_count,
          area_cm2,
          unit_price,
          amount,
          ${includeImages ? 'image_path,' : ''}
          created_date,
          updated_date
        FROM publishing_exceptions 
        ${whereCondition}
        ORDER BY registration_date ASC, id ASC
      `;
      
      console.log('执行SQL查询:', query);
      return await pool.request().query(query);
    });

    // 创建工作簿和工作表
    const workbook = new xl.Workbook();
    const worksheet = workbook.addWorksheet('出版异常数据');
    
    // 定义表头 - 根据是否包含图片动态调整
    const headers = [
      '登记日期', '出版日期', '客户代码', '工单号', '产品名称', '版型', 
      '出版张数', '异常描述', '错误类型', '责任单位', '责任人', '长度(cm)', '宽度(cm)', 
      '件数', '面积(cm²)', '单价', '金额'
    ];
    
    // 如果包含图片，在金额后添加图片列
    if (includeImages) {
      headers.push('图片信息');
    }
    
    headers.push('创建时间', '更新时间');
    
    // 创建表头样式
    const headerStyle = workbook.createStyle({
      font: {
        name: 'Arial',
        size: 10,
        bold: true,
        color: '#FFFFFF'
      },
      fill: {
        type: 'pattern',
        patternType: 'solid',
        fgColor: '#339966'
      },
      alignment: {
        vertical: 'center',
        horizontal: 'center'
      },
      border: {
        left: { style: 'thin', color: '#339966' },
        right: { style: 'thin', color: '#339966' },
        top: { style: 'thin', color: '#339966' },
        bottom: { style: 'thin', color: '#339966' }
      }
    });
    
    // 设置表头
    headers.forEach((header, index) => {
      worksheet.cell(1, index + 1)
        .string(header)
        .style(headerStyle);
    });
    
    // 设置表头行高
    worksheet.row(1).setHeight(25);
    
    // 创建数据行样式
    const dataStyle = workbook.createStyle({
      font: {
        name: 'Arial',
        size: 10,
        color: '#737682'
      },
      alignment: {
        vertical: 'center',
        horizontal: 'center'
      },
      border: {
        left: { style: 'thin', color: '#339966' },
        right: { style: 'thin', color: '#339966' },
        top: { style: 'thin', color: '#339966' },
        bottom: { style: 'thin', color: '#339966' }
      }
    });
    
    // 创建左对齐样式
    const leftAlignStyle = workbook.createStyle({
      font: {
        name: 'Arial',
        size: 10,
        color: '#737682'
      },
      alignment: {
        vertical: 'center',
        horizontal: 'left'
      },
      border: {
        left: { style: 'thin', color: '#339966' },
        right: { style: 'thin', color: '#339966' },
        top: { style: 'thin', color: '#339966' },
        bottom: { style: 'thin', color: '#339966' }
      }
    });
    
    // 创建隔行变色样式
    const alternateRowStyle = workbook.createStyle({
      font: {
        name: 'Arial',
        size: 10,
        color: '#737682'
      },
      alignment: {
        vertical: 'center',
        horizontal: 'center'
      },
      fill: {
        type: 'pattern',
        patternType: 'solid',
        fgColor: '#E2F3D9'
      },
      border: {
        left: { style: 'thin', color: '#339966' },
        right: { style: 'thin', color: '#339966' },
        top: { style: 'thin', color: '#339966' },
        bottom: { style: 'thin', color: '#339966' }
      }
    });
    
    // 创建隔行变色左对齐样式
    const alternateLeftAlignStyle = workbook.createStyle({
      font: {
        name: 'Arial',
        size: 10,
        color: '#737682'
      },
      alignment: {
        vertical: 'center',
        horizontal: 'left'
      },
      fill: {
        type: 'pattern',
        patternType: 'solid',
        fgColor: '#E2F3D9'
      },
      border: {
        left: { style: 'thin', color: '#339966' },
        right: { style: 'thin', color: '#339966' },
        top: { style: 'thin', color: '#339966' },
        bottom: { style: 'thin', color: '#339966' }
      }
    });

    // 添加数据行
    for (let index = 0; index < result.recordset.length; index++) {
      const row = result.recordset[index];
      const rowIndex = index + 2; // 数据从第2行开始
      const isAlternateRow = (index + 1) % 2 === 0;
      
      const dataRow = [
        row.registration_date ? new Date(row.registration_date).toLocaleDateString('zh-CN') : '',
        row.publishing_date ? new Date(row.publishing_date).toLocaleDateString('zh-CN') : '',
        row.customer_code || '',
        row.work_order_number || '',
        row.product_name || '',
        row.plate_type || '',
        row.publishing_sheets || '',
        row.exception_description || '',
        row.error_type || '',
        row.responsible_unit || '',
        row.responsible_person || '',
        row.length_cm || '',
        row.width_cm || '',
        row.piece_count || '',
        row.area_cm2 || '',
        row.unit_price ? parseFloat(row.unit_price) : '',
        row.amount ? parseFloat(row.amount) : 0
      ];
      
      // 如果包含图片，添加图片信息列
      if (includeImages) {
        console.log(`[图片处理] 处理记录 ID: ${row.id}, image_path:`, row.image_path);
        // 处理图片路径信息，将图片插入到Excel中
        let imageInfo = '无图片';
        if (row.image_path) {
          try {
            const imagePaths = JSON.parse(row.image_path);
            console.log(`[图片处理] 解析图片路径成功，图片数量: ${imagePaths.length}`);
            if (Array.isArray(imagePaths) && imagePaths.length > 0) {
              let insertedCount = 0;
              const failedImages = [];
              
              // 用于记录每张图片的实际宽度，以便正确计算后续图片的位置
              const imageWidths = [];
              
              // 定义异步图片处理函数
              const processImage = async (image, imgIndex) => {
                const imagePath = path.join(__dirname, '../uploads/site-images/publishing-exception', image.filename);
                console.log(`[图片处理] 处理第 ${imgIndex + 1} 张图片:`, image.filename, '路径:', imagePath);
                
                if (!fs.existsSync(imagePath)) {
                  console.warn(`[图片处理] 图片文件不存在: ${imagePath}`);
                  return { success: false, error: image.originalName || image.name || '未知文件' };
                }
                
                try {
                  // 获取图片原始尺寸并计算等比缩放后的尺寸
                  const sharp = require('sharp');
                  
                  // 设置统一的图片显示尺寸（像素）- 单行排列
                  const fixedImageHeight = 50; // 统一高度
                  const margin = 3; // 图片间距
                  
                  let finalWidth = 55; // 默认宽度
                  let finalHeight = fixedImageHeight; // 统一高度
                  
                  // 使用sharp库获取图片原始尺寸并计算等比缩放宽度
                  try {
                    const metadata = await sharp(imagePath).metadata();
                    const originalWidth = metadata.width;
                    const originalHeight = metadata.height;
                    
                    if (originalWidth && originalHeight) {
                      // 根据固定高度计算等比缩放后的宽度
                      const scale = fixedImageHeight / originalHeight;
                      finalWidth = Math.floor(originalWidth * scale);
                      
                      // 限制最大宽度，避免图片过宽
                      const maxImageWidth = 80;
                      if (finalWidth > maxImageWidth) {
                        finalWidth = maxImageWidth;
                      }
                    }
                  } catch (sharpError) {
                    console.warn('无法获取图片尺寸，使用默认尺寸:', sharpError.message);
                  }
                  
                  // 记录当前图片的宽度
                  imageWidths[imgIndex] = finalWidth;
                  
                  // 单行布局：所有图片排在同一行，从左到右排列
                  // 计算当前图片在单行中的水平位置
                  const leftMargin = 5; // 第一个图片的左边距
                  const topMargin = 3; // 第一个图片的上边距
                  
                  let startX = leftMargin; // 从左边距开始
                  for (let i = 0; i < imgIndex; i++) {
                    // 累加前面图片的实际宽度和间距
                    startX += (imageWidths[i] || 55) + margin;
                  }
                  
                  const startY = topMargin; // 添加上边距
                  const endX = startX + finalWidth;
                  const endY = startY + finalHeight;
                  
                  // 转换为EMU单位（1像素 = 9525 EMU）
                  const emuPerPixel = 9525;
                  const imageColIndex = 18; // 图片列索引
                  
                  // 使用twoCellAnchor方式添加图片
                  const imageObj = worksheet.addImage({
                    path: imagePath,
                    type: 'picture',
                    position: {
                      type: 'twoCellAnchor',
                      from: {
                        col: imageColIndex,
                        colOff: Math.round(startX * emuPerPixel),
                        row: rowIndex,
                        rowOff: Math.round(startY * emuPerPixel)
                      },
                      to: {
                        col: imageColIndex,
                        colOff: Math.round(endX * emuPerPixel),
                        row: rowIndex,
                        rowOff: Math.round(endY * emuPerPixel)
                      }
                    }
                  });
                  
                  return { success: true, width: finalWidth };
                } catch (imageError) {
                  console.error(`[图片处理] 插入图片失败 ${image.filename}:`, imageError.message);
                  return { success: false, error: image.originalName || image.name || '未知文件' };
                }
              };
              
              // 处理所有图片，但限制在单元格内合理排列
              for (let imgIndex = 0; imgIndex < Math.min(imagePaths.length, 4); imgIndex++) {
                const image = imagePaths[imgIndex];
                const result = await processImage(image, imgIndex);
                
                if (result.success) {
                  insertedCount++;
                } else {
                  failedImages.push(result.error);
                }
              }
              // 不在单元格中添加文字描述，只显示图片
              imageInfo = '';
            }
          } catch (e) {
            console.error(`[图片处理] 解析图片路径失败:`, e.message);
            // 如果不是JSON格式，直接显示路径
            imageInfo = row.image_path;
          }
        }
        dataRow.push(imageInfo);
      }
      
      // 添加创建时间和更新时间
      dataRow.push(
        row.created_date ? new Date(row.created_date).toLocaleString('zh-CN') : '',
        row.updated_date ? new Date(row.updated_date).toLocaleString('zh-CN') : ''
      );
      
      // 将数据写入单元格并应用样式
      dataRow.forEach((cellValue, colIndex) => {
        const cell = worksheet.cell(rowIndex, colIndex + 1);
        
        // 根据列类型设置不同的样式
        let cellStyle;
        if (colIndex === 4 || colIndex === 7 || colIndex === 8 || (includeImages && colIndex === 17)) {
          // 产品名称、异常描述、错误类型、图片信息列使用左对齐
          cellStyle = isAlternateRow ? alternateLeftAlignStyle : leftAlignStyle;
        } else {
          // 其他列使用居中对齐
          cellStyle = isAlternateRow ? alternateRowStyle : dataStyle;
        }
        
        if (typeof cellValue === 'string') {
          cell.string(cellValue).style(cellStyle);
        } else if (typeof cellValue === 'number') {
          cell.number(cellValue).style(cellStyle);
        } else {
          cell.string(cellValue ? cellValue.toString() : '').style(cellStyle);
        }
      });
      
      // 设置行高
      if (includeImages && row.image_path) {
        try {
          const imagePaths = JSON.parse(row.image_path);
          if (Array.isArray(imagePaths) && imagePaths.length > 0) {
            // 单行布局：所有图片都在同一行，行高根据图片高度设置
            // Excel行高单位换算：1个Excel行高单位约等于1.33像素
            // 图片高度50像素 + 适当边距 = 55像素
            // 55像素 ÷ 1.33 ≈ 41个Excel行高单位（适当减小）
            worksheet.row(rowIndex).setHeight(41);
          } else {
            worksheet.row(rowIndex).setHeight(18);
          }
        } catch (e) {
          worksheet.row(rowIndex).setHeight(18);
        }
      } else {
        worksheet.row(rowIndex).setHeight(18);
      }
    }
    
    // 添加合计行
    const totalRowIndex = result.recordset.length + 2; // 数据行数 + 表头行 + 1
    
    // 计算件数和金额的合计
    let totalPieceCount = 0;
    let totalAmount = 0;
    
    result.recordset.forEach(row => {
      if (row.piece_count) {
        totalPieceCount += parseInt(row.piece_count) || 0;
      }
      if (row.amount) {
        totalAmount += parseFloat(row.amount) || 0;
      }
    });
    
    // 创建合计行样式
    const totalRowStyle = workbook.createStyle({
      font: {
        name: 'Arial',
        size: 10,
        bold: true,
        color: '#FFFFFF'
      },
      fill: {
        type: 'pattern',
        patternType: 'solid',
        fgColor: '#339966'
      },
      alignment: {
        vertical: 'center',
        horizontal: 'center'
      },
      border: {
        left: { style: 'thin', color: '#339966' },
        right: { style: 'thin', color: '#339966' },
        top: { style: 'thin', color: '#339966' },
        bottom: { style: 'thin', color: '#339966' }
      }
    });
    
    // 写入合计行数据
    const totalRowData = new Array(headers.length).fill('');
    totalRowData[0] = '合计'; // 在第一列显示"合计"
    totalRowData[13] = totalPieceCount; // 件数列（第14列，索引13）
    totalRowData[16] = totalAmount; // 金额列（第17列，索引16）
    
    // 如果包含图片，需要调整金额列的索引
    if (includeImages) {
      totalRowData[16] = totalAmount; // 金额列在包含图片时仍是第17列
    }
    
    // 将合计行数据写入Excel
    totalRowData.forEach((cellValue, colIndex) => {
      const cell = worksheet.cell(totalRowIndex, colIndex + 1);
      if (cellValue !== '') {
        if (typeof cellValue === 'number') {
          cell.number(cellValue).style(totalRowStyle);
        } else {
          cell.string(cellValue.toString()).style(totalRowStyle);
        }
      } else {
        cell.string('').style(totalRowStyle);
      }
    });
    
    // 设置合计行高度
    worksheet.row(totalRowIndex).setHeight(25);
    
    // 计算每列的最大内容长度用于自动调整列宽
    const columnMaxLengths = new Array(headers.length).fill(0);
    
    // 计算表头长度
    headers.forEach((header, index) => {
      columnMaxLengths[index] = Math.max(columnMaxLengths[index], header.toString().length);
    });
    
    // 计算数据内容的最大长度
    result.recordset.forEach((row) => {
      const dataRow = [
        row.registration_date ? new Date(row.registration_date).toLocaleDateString('zh-CN') : '',
        row.publishing_date ? new Date(row.publishing_date).toLocaleDateString('zh-CN') : '',
        row.customer_code || '',
        row.work_order_number || '',
        row.product_name || '',
        row.plate_type || '',
        row.publishing_sheets || '',
        row.exception_description || '',
        row.error_type || '',
        row.responsible_unit || '',
        row.responsible_person || '',
        row.length_cm || '',
        row.width_cm || '',
        row.piece_count || '',
        row.area_cm2 || '',
        row.unit_price ? parseFloat(row.unit_price) : '',
        row.amount ? parseFloat(row.amount) : 0
      ];
      
      // 如果包含图片，添加图片信息列
      if (includeImages) {
        // 图片信息列不添加文字描述，只保留空字符串
        let imageInfo = '';
        dataRow.push(imageInfo);
      }
      
      // 添加创建时间和更新时间
      dataRow.push(
        row.created_date ? new Date(row.created_date).toLocaleString('zh-CN') : '',
        row.updated_date ? new Date(row.updated_date).toLocaleString('zh-CN') : ''
      );
      
      // 计算每列内容的长度
      dataRow.forEach((cellValue, index) => {
        if (index < columnMaxLengths.length) {
          const cellLength = cellValue ? cellValue.toString().length : 0;
          columnMaxLengths[index] = Math.max(columnMaxLengths[index], cellLength);
        }
      });
    });
    
    // 设置列宽
    headers.forEach((header, index) => {
      const colIndex = index + 1;
      let width;
      
      // 产品名称列（第5列）：根据内容自动调整，最小20，最大40
      if (index === 4) {
        width = Math.min(Math.max(columnMaxLengths[index] * 1.2, 20), 40);
      }
      // 异常描述列（第8列）：根据内容自动调整，最小25，最大50
      else if (index === 7) {
        width = Math.min(Math.max(columnMaxLengths[index] * 1.1, 25), 50);
      }
      // 责任单位列（第10列）：根据内容自动调整，最小12，最大25
      else if (index === 9) {
        width = Math.min(Math.max(columnMaxLengths[index] * 1.3, 12), 25);
      }
      // 图片信息列（当包含图片时）设置为动态宽度以显示图片
      else if (includeImages && index === 17) {
        // Excel列宽单位换算：1个Excel列宽单位约等于7像素
        // 4张图片(55px each) + 间距(3px each) + 边距(10px) = 240px
        // 240px ÷ 7 ≈ 34个Excel列宽单位
        width = 34;
      }
      // 其他列根据内容自动调整
      else {
        // 根据内容长度动态计算宽度，中文字符按1.5倍计算
        const contentLength = columnMaxLengths[index];
        width = Math.min(Math.max(contentLength * 1.2 + 2, 8), 35);
      }
      
      worksheet.column(colIndex).setWidth(width);
    });

    // 设置响应头 - 生成带时间戳的文件名防止重名
    const now = new Date();
    const timestamp = now.toISOString().replace(/[:.]/g, '-').slice(0, 19); // 格式: YYYY-MM-DDTHH-MM-SS
    const filename = `出版失误登记表${includeImages ? '_含图片' : ''}_${timestamp}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`); 

    // 生成Excel文件并发送
    workbook.write(filename, res);
    
    // 导出完成

  } catch (error) {
    console.error('导出失败:', error);
    res.status(500).json({
      success: false,
      message: '导出失败',
      error: error.message
    });
  }
});

/**
 * 获取单个出版异常记录详情
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const pool = await getConnection();
    
    const result = await pool.request()
      .input('id', sql.Int, id)
      .query('SELECT * FROM publishing_exceptions WHERE id = @id AND isDeleted = 0');

    if (result.recordset.length === 0) {
      return res.status(404).json({ success: false, message: '记录不存在' });
    }

    res.json({ success: true, data: result.recordset[0] });
  } catch (error) {
    console.error('获取出版异常详情失败:', error);
    res.status(500).json({ success: false, message: '获取数据失败', error: error.message });
  }
});

/**
 * 创建新的出版异常记录
 * 支持所有字段包括错误类型(error_type)
 * 接收已上传的图片路径
 */
router.post('/', async (req, res) => {
  try {
    // 从请求体中解构所有字段，包括新增的error_type字段和image_path
    const {
      registration_date,
      publishing_date,
      customer_code,
      work_order_number,
      product_name,
      plate_type,
      publishing_sheets,
      exception_description,
      error_type,  // 错误类型字段，用于分类管理异常类型
      responsible_unit,
      responsible_person,
      length_cm,
      width_cm,
      piece_count,
      area_cm2,
      unit_price,
      amount,
      created_by,
      image_path  // 接收前端传递的已上传图片路径
    } = req.body;

    // 处理接收到的数据

    // 获取数据库连接
    const pool = await getConnection();
    
    // 执行SQL插入操作，包含error_type字段
    const result = await pool.request()
      .input('registration_date', sql.Date, registration_date)
      .input('publishing_date', sql.Date, publishing_date || null)
      .input('customer_code', sql.NVarChar, customer_code)
      .input('work_order_number', sql.NVarChar, work_order_number)
      .input('product_name', sql.NVarChar, product_name)
      .input('plate_type', sql.NVarChar, plate_type)
      .input('publishing_sheets', sql.Int, publishing_sheets || null)
      .input('exception_description', sql.NVarChar, exception_description)
      .input('error_type', sql.NVarChar, error_type)
      .input('image_path', sql.NVarChar, image_path)
      .input('responsible_unit', sql.NVarChar, responsible_unit)
      .input('responsible_person', sql.NVarChar, responsible_person)
      .input('length_cm', sql.Decimal(10,2), length_cm || null)
      .input('width_cm', sql.Decimal(10,2), width_cm || null)
      .input('piece_count', sql.Int, piece_count || null)
      .input('area_cm2', sql.Decimal(15,2), area_cm2 || null)
      .input('unit_price', sql.Decimal(10,4), unit_price || null)
      .input('amount', sql.Decimal(15,2), amount || null)
      .input('created_by', sql.NVarChar, created_by)
      .query(`
        INSERT INTO publishing_exceptions (
          registration_date, publishing_date, customer_code, work_order_number,
          product_name, plate_type, publishing_sheets, exception_description,
          error_type, image_path, responsible_unit, responsible_person, length_cm, width_cm,
          piece_count, area_cm2, unit_price, amount, created_by
        ) 
        OUTPUT INSERTED.id
        VALUES (
          @registration_date, @publishing_date, @customer_code, @work_order_number,
          @product_name, @plate_type, @publishing_sheets, @exception_description,
          @error_type, @image_path, @responsible_unit, @responsible_person, @length_cm, @width_cm,
          @piece_count, @area_cm2, @unit_price, @amount, @created_by
        )
      `);

    // SQL执行成功
    
    res.json({ 
      success: true, 
      message: '创建成功', 
      data: { id: result.recordset[0].id }
    });
  } catch (error) {
    console.error('=== 创建出版异常记录失败 ===');
    console.error('错误详情:', error);
    console.error('错误消息:', error.message);
    console.error('错误堆栈:', error.stack);
    res.status(500).json({ success: false, message: '创建失败', error: error.message });
  }
});



/**
 * 更新出版异常记录
 */
/**
 * 更新出版异常记录
 * 支持更新所有字段包括错误类型(error_type)
 * 接收已上传的图片路径
 */
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // 从请求体中解构所有字段，包括新增的error_type字段和image_path
    const {
      registration_date,
      publishing_date,
      customer_code,
      work_order_number,
      product_name,
      plate_type,
      publishing_sheets,
      exception_description,
      error_type,  // 错误类型字段，支持分类管理异常
      responsible_unit,
      responsible_person,
      length_cm,
      width_cm,
      piece_count,
      area_cm2,
      unit_price,
      amount,
      updated_by,
      image_path,  // 接收前端传递的已上传图片路径
      removedFiles  // 接收前端传递的被删除文件列表
    } = req.body;

    console.log('更新接收到的数据:', req.body);
    console.log('更新图片路径:', image_path);
    console.log('被删除的文件:', removedFiles);

    const pool = await getConnection();
    
    // 检查记录是否存在
    const checkResult = await pool.request()
      .input('id', sql.Int, id)
      .query('SELECT image_path FROM publishing_exceptions WHERE id = @id AND isDeleted = 0');

    if (checkResult.recordset.length === 0) {
      return res.status(404).json({ success: false, message: '记录不存在' });
    }

    // 处理被删除的文件 - 删除物理文件
    // 只在编辑模式下且确实有文件需要删除时才执行删除操作
    if (removedFiles && Array.isArray(removedFiles) && removedFiles.length > 0) {
      console.log('开始删除被标记的文件:', removedFiles.length, '个文件');
      
      for (const removedFile of removedFiles) {
        try {
          // 确保removedFile有filename属性且不为空
          if (!removedFile.filename) {
            continue;
          }
          
          // 构建文件的完整路径
          const filePath = path.join(__dirname, '../uploads/site-images/publishing-exception', removedFile.filename);
          
          // 检查文件是否存在
          if (fs.existsSync(filePath)) {
            // 删除物理文件
            fs.unlinkSync(filePath);
          }
        } catch (deleteError) {
          console.error('删除文件失败:', removedFile.filename, deleteError.message);
          // 继续处理其他文件，不中断整个更新流程
        }
      }
    }

    // 使用前端传递的image_path，如果为空则保持原有值
    const finalImagePath = image_path !== undefined ? image_path : checkResult.recordset[0].image_path;

    const result = await pool.request()
      .input('id', sql.Int, id)
      .input('registration_date', sql.Date, registration_date)
      .input('publishing_date', sql.Date, publishing_date || null)
      .input('customer_code', sql.NVarChar, customer_code)
      .input('work_order_number', sql.NVarChar, work_order_number)
      .input('product_name', sql.NVarChar, product_name)
      .input('plate_type', sql.NVarChar, plate_type)
      .input('publishing_sheets', sql.Int, publishing_sheets || null)
      .input('exception_description', sql.NVarChar, exception_description)
      .input('error_type', sql.NVarChar, error_type)
      .input('image_path', sql.NVarChar, finalImagePath)
      .input('responsible_unit', sql.NVarChar, responsible_unit)
      .input('responsible_person', sql.NVarChar, responsible_person)
      .input('length_cm', sql.Decimal(10,2), length_cm || null)
      .input('width_cm', sql.Decimal(10,2), width_cm || null)
      .input('piece_count', sql.Int, piece_count || null)
      .input('area_cm2', sql.Decimal(15,2), area_cm2 || null)
      .input('unit_price', sql.Decimal(10,4), unit_price || null)
      .input('amount', sql.Decimal(15,2), amount || null)
      .input('updated_by', sql.NVarChar, updated_by)
      .query(`
        UPDATE publishing_exceptions SET
          registration_date = @registration_date,
          publishing_date = @publishing_date,
          customer_code = @customer_code,
          work_order_number = @work_order_number,
          product_name = @product_name,
          plate_type = @plate_type,
          publishing_sheets = @publishing_sheets,
          exception_description = @exception_description,
          error_type = @error_type,
          image_path = @image_path,
          responsible_unit = @responsible_unit,
          responsible_person = @responsible_person,
          length_cm = @length_cm,
          width_cm = @width_cm,
          piece_count = @piece_count,
          area_cm2 = @area_cm2,
          unit_price = @unit_price,
          amount = @amount,
          updated_by = @updated_by,
          updated_date = GETDATE()
        WHERE id = @id AND isDeleted = 0
      `);

    res.json({ success: true, message: '更新成功' });
  } catch (error) {
    console.error('更新出版异常记录失败:', error);
    res.status(500).json({ success: false, message: '更新失败', error: error.message });
  }
});

/**
 * 删除出版异常记录（软删除）
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { deleted_by } = req.body;

    const pool = await sql.connect();
    
    const result = await pool.request()
      .input('id', sql.Int, id)
      .input('deleted_by', sql.NVarChar, deleted_by)
      .query(`
        UPDATE publishing_exceptions SET
          isDeleted = 1,
          updated_by = @deleted_by,
          updated_date = GETDATE()
        WHERE id = @id AND isDeleted = 0
      `);

    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({ success: false, message: '记录不存在' });
    }

    res.json({ success: true, message: '删除成功' });
  } catch (error) {
    console.error('删除出版异常记录失败:', error);
    res.status(500).json({ success: false, message: '删除失败', error: error.message });
  }
});

/**
 * 获取数据统计 - 本月新增、成本损失、按错误类型统计、成本趋势
 */
router.get('/statistics/summary', async (req, res) => {
  try {
    const pool = await getConnection();
    const { startDate, endDate, responsibleUnit, errorType, customerCode, workOrderNumber, productName } = req.query;
    
    // 获取当前月份的开始和结束日期
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;
    const monthStart = `${currentYear}-${currentMonth.toString().padStart(2, '0')}-01`;
    const nextMonth = currentMonth === 12 ? 1 : currentMonth + 1;
    const nextYear = currentMonth === 12 ? currentYear + 1 : currentYear;
    const monthEnd = `${nextYear}-${nextMonth.toString().padStart(2, '0')}-01`;
    
    // 构建筛选条件
    let whereConditions = ['isDeleted = 0'];
    let filterParams = [];
    
    if (startDate && endDate) {
      whereConditions.push('registration_date >= @startDate AND registration_date <= @endDate');
      filterParams.push(
        { name: 'startDate', type: sql.Date, value: startDate },
        { name: 'endDate', type: sql.Date, value: endDate }
      );
    }
    
    if (customerCode) {
      whereConditions.push('customer_code LIKE @customerCode');
      filterParams.push({ name: 'customerCode', type: sql.NVarChar, value: `%${customerCode}%` });
    }
    
    if (workOrderNumber) {
      whereConditions.push('work_order_number LIKE @workOrderNumber');
      filterParams.push({ name: 'workOrderNumber', type: sql.NVarChar, value: `%${workOrderNumber}%` });
    }
    
    if (productName) {
      whereConditions.push('product_name LIKE @productName');
      filterParams.push({ name: 'productName', type: sql.NVarChar, value: `%${productName}%` });
    }
    
    if (responsibleUnit) {
      whereConditions.push('responsible_unit = @responsibleUnit');
      filterParams.push({ name: 'responsibleUnit', type: sql.NVarChar, value: responsibleUnit });
    }
    
    if (errorType) {
      whereConditions.push('error_type = @errorType');
      filterParams.push({ name: 'errorType', type: sql.NVarChar, value: errorType });
    }
    
    const whereClause = whereConditions.join(' AND ');
    
    // 本月新增统计（始终只统计当前月份的数据，不受筛选条件影响）
    let monthlyNewWhereConditions = ['isDeleted = 0'];
    let monthlyNewParams = [];
    
    // 始终只统计当前月份的数据
    monthlyNewWhereConditions.push('registration_date >= @monthStart AND registration_date < @monthEnd');
    monthlyNewParams.push(
      { name: 'monthStart', type: sql.Date, value: monthStart },
      { name: 'monthEnd', type: sql.Date, value: monthEnd }
    );
    
    // 检查是否有任何筛选条件（用于成本损失统计）
    const hasFilters = startDate || endDate || customerCode || workOrderNumber || productName || responsibleUnit || errorType;
    
    const monthlyNewQuery = `
      SELECT 
        COUNT(*) as monthly_new_count
      FROM publishing_exceptions 
      WHERE ${monthlyNewWhereConditions.join(' AND ')}
    `;
    
    const monthlyNewRequest = pool.request();
    monthlyNewParams.forEach(param => {
      monthlyNewRequest.input(param.name, param.type, param.value);
    });
    const monthlyNewResult = await monthlyNewRequest.query(monthlyNewQuery);
    
    // 成本损失统计（仅统计责任单位为非"供应商"的损失金额）
    // 如果没有筛选条件，默认统计当前月份；如果有筛选条件，则按筛选结果统计
    let costLossWhereConditions = ['isDeleted = 0', 'responsible_unit != \'供应商\'', 'responsible_unit IS NOT NULL'];
    let costLossParams = [];
    
    if (hasFilters) {
      // 有筛选条件时，按筛选结果统计
      if (startDate && endDate) {
        costLossWhereConditions.push('registration_date >= @costStartDate AND registration_date <= @costEndDate');
        costLossParams.push(
          { name: 'costStartDate', type: sql.Date, value: startDate },
          { name: 'costEndDate', type: sql.Date, value: endDate }
        );
      }
      
      if (customerCode) {
        costLossWhereConditions.push('customer_code LIKE @costCustomerCode');
        costLossParams.push({ name: 'costCustomerCode', type: sql.NVarChar, value: `%${customerCode}%` });
      }
      
      if (workOrderNumber) {
        costLossWhereConditions.push('work_order_number LIKE @costWorkOrderNumber');
        costLossParams.push({ name: 'costWorkOrderNumber', type: sql.NVarChar, value: `%${workOrderNumber}%` });
      }
      
      if (productName) {
        costLossWhereConditions.push('product_name LIKE @costProductName');
        costLossParams.push({ name: 'costProductName', type: sql.NVarChar, value: `%${productName}%` });
      }
      
      if (responsibleUnit) {
        costLossWhereConditions.push('responsible_unit = @costResponsibleUnit');
        costLossParams.push({ name: 'costResponsibleUnit', type: sql.NVarChar, value: responsibleUnit });
      }
      
      if (errorType) {
        costLossWhereConditions.push('error_type = @costErrorType');
        costLossParams.push({ name: 'costErrorType', type: sql.NVarChar, value: errorType });
      }
    } else {
      // 没有筛选条件时，默认统计当前月份
      costLossWhereConditions.push('registration_date >= @costMonthStart AND registration_date < @costMonthEnd');
      costLossParams.push(
        { name: 'costMonthStart', type: sql.Date, value: monthStart },
        { name: 'costMonthEnd', type: sql.Date, value: monthEnd }
      );
    }
    
    const costLossQuery = `
      SELECT 
        SUM(ISNULL(amount, 0)) as cost_loss_amount
      FROM publishing_exceptions 
      WHERE ${costLossWhereConditions.join(' AND ')}
    `;
    
    const costLossRequest = pool.request();
    costLossParams.forEach(param => {
      costLossRequest.input(param.name, param.type, param.value);
    });
    const costLossResult = await costLossRequest.query(costLossQuery);
    
    // 按错误类型统计（基于筛选条件）
    const errorTypeQuery = `
      SELECT 
        ISNULL(error_type, '未分类') as error_type,
        COUNT(*) as count
      FROM publishing_exceptions 
      WHERE ${whereClause}
      GROUP BY error_type
      ORDER BY count DESC
    `;
    
    const errorTypeRequest = pool.request();
    filterParams.forEach(param => {
      errorTypeRequest.input(param.name, param.type, param.value);
    });
    const errorTypeResult = await errorTypeRequest.query(errorTypeQuery);
    
    // 获取筛选条件所在年度的成本损失趋势
    let trendYear = currentYear;
    if (startDate) {
      trendYear = new Date(startDate).getFullYear();
    }
    
    const costTrendQuery = `
      SELECT 
        CONVERT(VARCHAR(7), registration_date, 120) as month,
        SUM(ISNULL(amount, 0)) as cost_loss
      FROM publishing_exceptions 
      WHERE isDeleted = 0 
        AND YEAR(registration_date) = @trendYear
        AND responsible_unit != '供应商'
        AND responsible_unit IS NOT NULL
      GROUP BY CONVERT(VARCHAR(7), registration_date, 120)
      ORDER BY month
    `;
    
    const costTrendRequest = pool.request()
      .input('trendYear', sql.Int, trendYear);
    const costTrendResult = await costTrendRequest.query(costTrendQuery);

    // 总记录数统计（基于筛选条件）
    const totalRecordsQuery = `
      SELECT COUNT(*) as total_records
      FROM publishing_exceptions 
      WHERE ${whereClause}
    `;
    
    const totalRecordsRequest = pool.request();
    filterParams.forEach(param => {
      totalRecordsRequest.input(param.name, param.type, param.value);
    });
    const totalRecordsResult = await totalRecordsRequest.query(totalRecordsQuery);
    
    // 总损失金额统计（基于筛选条件）
    const totalAmountQuery = `
      SELECT SUM(ISNULL(amount, 0)) as total_amount
      FROM publishing_exceptions 
      WHERE ${whereClause}
    `;
    
    const totalAmountRequest = pool.request();
    filterParams.forEach(param => {
      totalAmountRequest.input(param.name, param.type, param.value);
    });
    const totalAmountResult = await totalAmountRequest.query(totalAmountQuery);
    
    // 本月损失金额统计（始终只统计当前月份）
    const currentMonthAmountQuery = `
      SELECT SUM(ISNULL(amount, 0)) as current_month_amount
      FROM publishing_exceptions 
      WHERE ${monthlyNewWhereConditions.join(' AND ')}
    `;
    
    const currentMonthAmountRequest = pool.request();
    monthlyNewParams.forEach(param => {
      currentMonthAmountRequest.input(param.name, param.type, param.value);
    });
    const currentMonthAmountResult = await currentMonthAmountRequest.query(currentMonthAmountQuery);

    res.json({
      success: true,
      data: {
        totalRecords: totalRecordsResult.recordset[0].total_records || 0,
        totalAmount: totalAmountResult.recordset[0].total_amount || 0,
        currentMonthAmount: currentMonthAmountResult.recordset[0].current_month_amount || 0,
        monthly_new: monthlyNewResult.recordset[0].monthly_new_count || 0,
        cost_loss: costLossResult.recordset[0].cost_loss_amount || 0,
        byErrorType: errorTypeResult.recordset || [],
        costTrend: costTrendResult.recordset || []
      }
    });
  } catch (error) {
    console.error('获取统计数据失败:', error);
    res.status(500).json({ success: false, message: '获取统计数据失败', error: error.message });
  }
});

/**
 * 获取出版异常图片文件
 * GET /api/publishing-exceptions/image/:id
 * 功能：根据记录ID获取对应的图片文件，支持图片预览
 */
router.get('/image/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!id || isNaN(id)) {
      return res.status(400).json({ success: false, message: '无效的记录ID' });
    }
    
    const pool = await getConnection();
    
    // 查询记录的图片路径
    const result = await pool.request()
      .input('id', sql.Int, parseInt(id))
      .query('SELECT image_path FROM publishing_exceptions WHERE id = @id AND isDeleted = 0');
    
    if (result.recordset.length === 0) {
      return res.status(404).json({ success: false, message: '记录不存在' });
    }
    
    const imagePath = result.recordset[0].image_path;
    
    if (!imagePath) {
      return res.status(404).json({ success: false, message: '该记录没有图片' });
    }
    
    // 解析图片路径，支持多种格式
    let imageFiles = [];
    try {
      // 如果是JSON格式的多图片路径
      if (imagePath.startsWith('[') || imagePath.startsWith('{')) {
        const parsedPath = JSON.parse(imagePath);
        if (Array.isArray(parsedPath)) {
          imageFiles = parsedPath;
        } else if (parsedPath.filename) {
          imageFiles = [parsedPath];
        }
      } else {
        // 如果是单个文件名字符串
        imageFiles = [{ filename: imagePath }];
      }
    } catch (error) {
      // 如果解析失败，当作单个文件名处理
      imageFiles = [{ filename: imagePath }];
    }
    
    // 获取第一个图片文件（如果有多个图片，返回第一个）
    const firstImage = imageFiles[0];
    if (!firstImage || !firstImage.filename) {
      return res.status(404).json({ success: false, message: '图片文件信息无效' });
    }
    
    // 构建图片文件的完整路径
    const fullImagePath = path.join(__dirname, '../uploads/site-images/publishing-exception', firstImage.filename);
    
    console.log(`查找图片文件: ${fullImagePath}`);
    
    // 检查文件是否存在
    if (!fs.existsSync(fullImagePath)) {
      console.log(`图片文件不存在: ${fullImagePath}`);
      return res.status(404).json({ success: false, message: '图片文件不存在' });
    }
    
    // 获取文件信息
    const stat = fs.statSync(fullImagePath);
    const fileName = path.basename(fullImagePath);
    const ext = path.extname(fileName).toLowerCase();
    
    // 设置响应头
    res.setHeader('Content-Length', stat.size);
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(fileName)}"`);
    
    // 根据文件扩展名设置Content-Type
    const mimeTypes = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.bmp': 'image/bmp',
      '.webp': 'image/webp'
    };
    
    const contentType = mimeTypes[ext] || 'image/jpeg';
    res.setHeader('Content-Type', contentType);
    
    // 返回图片文件
    
    // 创建文件流并发送
    const fileStream = fs.createReadStream(fullImagePath);
    fileStream.pipe(res);
    
    fileStream.on('error', (error) => {
      console.error('图片文件流错误:', error);
      if (!res.headersSent) {
        res.status(500).json({ success: false, message: '图片读取失败' });
      }
    });
    
  } catch (error) {
    console.error('获取出版异常图片失败:', error);
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        message: '获取图片失败: ' + error.message
      });
    }
  }
});

module.exports = router;