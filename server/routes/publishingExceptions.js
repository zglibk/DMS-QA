const express = require('express');
const router = express.Router();
const { sql, getConnection } = require('../config/database');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// 配置文件上传
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadPath = path.join(__dirname, '../uploads/site-images');
    // 确保目录存在
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    // 生成唯一文件名
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'publishing-exception-' + uniqueSuffix + path.extname(file.originalname));
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

    res.json({
      success: true,
      message: '图片上传成功',
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
 * 获取出版异常列表
 * 支持分页、筛选和搜索
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
      responsibleUnit
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
 */
router.get('/export', async (req, res) => {
  const { executeQuery } = require('../db');
  const ExcelJS = require('exceljs');
  
  try {
    console.log('开始导出出版异常数据...');
    
    // 获取所有数据
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
          responsible_unit,
          responsible_person,
          length_cm,
          width_cm,
          piece_count,
          area_cm2,
          unit_price,
          amount,
          created_date,
          updated_date
        FROM publishing_exceptions 
        WHERE isDeleted = 0
        ORDER BY registration_date DESC, id DESC
      `;
      
      return await pool.request().query(query);
    });

    // 创建工作簿和工作表
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('出版异常数据');
    
    // 定义表头
    const headers = [
      '登记日期', '出版日期', '客户代码', '工单号', '产品名称', '版型', 
      '出版张数', '异常描述', '责任单位', '责任人', '长度(cm)', '宽度(cm)', 
      '件数', '面积(cm²)', '单价', '金额', '创建时间', '更新时间'
    ];
    
    // 设置表头
    worksheet.addRow(headers);
    
    // 设置表头样式
    const headerRow = worksheet.getRow(1);
    headerRow.height = 25;
    
    // 设置表头背景色填充范围为A到有内容的最大列
    for (let col = 1; col <= headers.length; col++) {
      const cell = worksheet.getCell(1, col);
      cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF339966' } };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
    }
    
    // 添加数据行
    result.recordset.forEach((row, index) => {
      const dataRow = [
        row.registration_date ? new Date(row.registration_date).toLocaleDateString('zh-CN') : '',
        row.publishing_date ? new Date(row.publishing_date).toLocaleDateString('zh-CN') : '',
        row.customer_code || '',
        row.work_order_number || '',
        row.product_name || '',
        row.plate_type || '',
        row.publishing_sheets || '',
        row.exception_description || '',
        row.responsible_unit || '',
        row.responsible_person || '',
        row.length_cm || '',
        row.width_cm || '',
        row.piece_count || '',
        row.area_cm2 || '',
        row.unit_price ? `¥${parseFloat(row.unit_price).toFixed(4)}` : '',
        row.amount ? `¥${parseFloat(row.amount).toFixed(2)}` : '¥0.00',
        row.created_date ? new Date(row.created_date).toLocaleString('zh-CN') : '',
        row.updated_date ? new Date(row.updated_date).toLocaleString('zh-CN') : ''
      ];
      
      const excelRow = worksheet.addRow(dataRow);
      
      // 设置数据行样式
      excelRow.font = { name: 'Arial', size: 10, color: { argb: 'FF737682' } }; // RGB(115, 118, 122)
      excelRow.alignment = { vertical: 'middle', horizontal: 'center' };
      excelRow.height = 18;
      
      // 设置产品名称列（第5列）左对齐
      const productNameCell = worksheet.getCell(index + 2, 5);
      productNameCell.alignment = { vertical: 'middle', horizontal: 'left' };
      
      // 设置异常描述列（第8列）左对齐
      const exceptionDescCell = worksheet.getCell(index + 2, 8);
      exceptionDescCell.alignment = { vertical: 'middle', horizontal: 'left' };
      
      // 隔行变色 - 只填充有内容的列范围
      if ((index + 1) % 2 === 0) {
        // 获取有内容的列数（表头列数）
        const maxCol = headers.length;
        for (let col = 1; col <= maxCol; col++) {
          const cell = worksheet.getCell(index + 2, col); // index+2因为表头占第1行，数据从第2行开始
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2F3D9' } };
        }
      }
    });
    
    // 设置列宽
    worksheet.columns.forEach((column, index) => {
      // 产品名称列（第5列，索引4）设置为30
      if (index === 4) {
        column.width = 30;
      }
      // 异常描述列（第8列，索引7）设置为35
      else if (index === 7) {
        column.width = 35;
      }
      // 责任单位列（第9列，索引8）设置为16.5
      else if (index === 8) {
        column.width = 16.5;
      }
      // 其他列使用自动列宽
      else {
        let maxLength = 0;
        
        // 检查表头长度
        if (headers[index]) {
          maxLength = Math.max(maxLength, headers[index].toString().length);
        }
        
        // 检查数据行长度
        column.eachCell({ includeEmpty: false }, (cell) => {
          const cellValue = cell.value ? cell.value.toString() : '';
          maxLength = Math.max(maxLength, cellValue.length);
        });
        
        // 设置列宽，最小8，最大50
        column.width = Math.min(Math.max(maxLength + 2, 8), 50);
      }
    });
    
    // 设置所有单元格边框
    worksheet.eachRow((row, rowNumber) => {
      row.eachCell((cell, colNumber) => {
        cell.border = {
          top: { style: 'thin', color: { argb: 'FF339966' } },
          left: { style: 'thin', color: { argb: 'FF339966' } },
          bottom: { style: 'thin', color: { argb: 'FF339966' } },
          right: { style: 'thin', color: { argb: 'FF339966' } }
        };
      });
    });

    // 关闭网格线视图
    worksheet.views = [{
      showGridLines: false
    }];

    // 设置响应头
    const filename = `出版异常数据_${new Date().toISOString().slice(0, 10)}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`); 

    // 生成Excel文件并发送
    await workbook.xlsx.write(res);
    
    console.log(`导出完成，共 ${result.recordset.length} 条记录`);

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
 */
router.post('/', upload.single('image'), async (req, res) => {
  try {
    console.log('=== 创建出版异常记录调试 ===');
    console.log('请求体数据:', req.body);
    console.log('上传文件:', req.file);
    
    const {
      registration_date,
      publishing_date,
      customer_code,
      work_order_number,
      product_name,
      plate_type,
      publishing_sheets,
      exception_description,
      responsible_unit,
      responsible_person,
      length_cm,
      width_cm,
      piece_count,
      area_cm2,
      unit_price,
      amount,
      created_by
    } = req.body;

    console.log('解析后的数据:', {
      registration_date,
      customer_code,
      work_order_number,
      product_name,
      responsible_unit,
      responsible_person,
      exception_description,
      created_by
    });

    const image_path = req.file ? req.file.filename : null;
    console.log('图片路径:', image_path);

    const pool = await getConnection();
    console.log('数据库连接获取成功');
    
    console.log('准备执行SQL插入操作...');
    const result = await pool.request()
      .input('registration_date', sql.Date, registration_date)
      .input('publishing_date', sql.Date, publishing_date || null)
      .input('customer_code', sql.NVarChar, customer_code)
      .input('work_order_number', sql.NVarChar, work_order_number)
      .input('product_name', sql.NVarChar, product_name)
      .input('plate_type', sql.NVarChar, plate_type)
      .input('publishing_sheets', sql.Int, publishing_sheets || null)
      .input('exception_description', sql.NVarChar, exception_description)
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
          image_path, responsible_unit, responsible_person, length_cm, width_cm,
          piece_count, area_cm2, unit_price, amount, created_by
        ) 
        OUTPUT INSERTED.id
        VALUES (
          @registration_date, @publishing_date, @customer_code, @work_order_number,
          @product_name, @plate_type, @publishing_sheets, @exception_description,
          @image_path, @responsible_unit, @responsible_person, @length_cm, @width_cm,
          @piece_count, @area_cm2, @unit_price, @amount, @created_by
        )
      `);

    console.log('SQL执行成功，插入结果:', result.recordset);
    
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
 * 导出出版异常数据到Excel
 */
router.get('/export', async (req, res) => {
  const { executeQuery } = require('../db');
  const XLSX = require('xlsx');
  
  try {
    console.log('开始导出出版异常数据...');
    
    // 获取所有数据
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
          responsible_unit,
          responsible_person,
          length_cm,
          width_cm,
          piece_count,
          area_cm2,
          unit_price,
          amount,
          created_date,
          updated_date
        FROM publishing_exceptions 
        WHERE isDeleted = 0
        ORDER BY registration_date DESC, id DESC
      `;
      
      return await pool.request().query(query);
    });

    // 创建工作簿
    const workbook = XLSX.utils.book_new();
    
    // 准备数据 - 格式化日期和数值
    const formattedData = result.recordset.map(row => ({
      '登记日期': row.registration_date ? new Date(row.registration_date).toLocaleDateString('zh-CN') : '',
      '出版日期': row.publishing_date ? new Date(row.publishing_date).toLocaleDateString('zh-CN') : '',
      '客户代码': row.customer_code || '',
      '工单号': row.work_order_number || '',
      '产品名称': row.product_name || '',
      '版型': row.plate_type || '',
      '出版张数': row.publishing_sheets || '',
      '异常描述': row.exception_description || '',
      '责任单位': row.responsible_unit || '',
      '责任人': row.responsible_person || '',
      '长度(cm)': row.length_cm || '',
      '宽度(cm)': row.width_cm || '',
      '件数': row.piece_count || '',
      '面积(cm²)': row.area_cm2 || '',
      '单价': row.unit_price ? `¥${parseFloat(row.unit_price).toFixed(4)}` : '',
      '金额': row.amount ? `¥${parseFloat(row.amount).toFixed(2)}` : '¥0.00',
      '创建时间': row.created_date ? new Date(row.created_date).toLocaleString('zh-CN') : '',
      '更新时间': row.updated_date ? new Date(row.updated_date).toLocaleString('zh-CN') : ''
    }));

    // 创建工作表
    const worksheet = XLSX.utils.json_to_sheet(formattedData);

    // 设置列宽
    const colWidths = [
      { wch: 12 }, // 登记日期
      { wch: 12 }, // 出版日期
      { wch: 15 }, // 客户代码
      { wch: 20 }, // 工单号
      { wch: 25 }, // 产品名称
      { wch: 12 }, // 版型
      { wch: 12 }, // 出版张数
      { wch: 40 }, // 异常描述
      { wch: 15 }, // 责任单位
      { wch: 12 }, // 责任人
      { wch: 12 }, // 长度
      { wch: 12 }, // 宽度
      { wch: 10 }, // 件数
      { wch: 15 }, // 面积
      { wch: 12 }, // 单价
      { wch: 12 }, // 金额
      { wch: 20 }, // 创建时间
      { wch: 20 }  // 更新时间
    ];
    worksheet['!cols'] = colWidths;

    // 添加工作表到工作簿
    XLSX.utils.book_append_sheet(workbook, worksheet, '出版异常数据');

    // 生成Excel文件
    const excelBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    // 设置响应头
    const filename = `出版异常数据_${new Date().toISOString().slice(0, 10)}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`); 

    console.log(`导出完成，共 ${result.recordset.length} 条记录`);
    res.send(excelBuffer);

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
 * 更新出版异常记录
 */
router.put('/:id', upload.single('image'), async (req, res) => {
  try {
    const { id } = req.params;
    const {
      registration_date,
      publishing_date,
      customer_code,
      work_order_number,
      product_name,
      plate_type,
      publishing_sheets,
      exception_description,
      responsible_unit,
      responsible_person,
      length_cm,
      width_cm,
      piece_count,
      area_cm2,
      unit_price,
      amount,
      updated_by
    } = req.body;

    const pool = await getConnection();
    
    // 检查记录是否存在
    const checkResult = await pool.request()
      .input('id', sql.Int, id)
      .query('SELECT image_path FROM publishing_exceptions WHERE id = @id AND isDeleted = 0');

    if (checkResult.recordset.length === 0) {
      return res.status(404).json({ success: false, message: '记录不存在' });
    }

    let image_path = checkResult.recordset[0].image_path;
    
    // 如果上传了新图片，删除旧图片
    if (req.file) {
      if (image_path) {
        const oldImagePath = path.join(__dirname, '../uploads/site-images', image_path);
        if (fs.existsSync(oldImagePath)) {
          fs.unlinkSync(oldImagePath);
        }
      }
      image_path = req.file.filename;
    }

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
      .input('image_path', sql.NVarChar, image_path)
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
 * 获取数据统计 - 本月新增和成本损失
 */
router.get('/statistics/summary', async (req, res) => {
  try {
    const pool = await getConnection();
    
    // 获取当前月份的开始和结束日期
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;
    const monthStart = `${currentYear}-${currentMonth.toString().padStart(2, '0')}-01`;
    const nextMonth = currentMonth === 12 ? 1 : currentMonth + 1;
    const nextYear = currentMonth === 12 ? currentYear + 1 : currentYear;
    const monthEnd = `${nextYear}-${nextMonth.toString().padStart(2, '0')}-01`;
    
    // 本月新增统计
    const monthlyNewQuery = `
      SELECT 
        COUNT(*) as monthly_new_count
      FROM publishing_exceptions 
      WHERE isDeleted = 0 
        AND registration_date >= @monthStart 
        AND registration_date < @monthEnd
    `;
    
    const monthlyNewRequest = pool.request()
      .input('monthStart', sql.Date, monthStart)
      .input('monthEnd', sql.Date, monthEnd);
    const monthlyNewResult = await monthlyNewRequest.query(monthlyNewQuery);
    
    // 成本损失统计（仅统计责任单位为非"供应商"的损失金额）
    const costLossQuery = `
      SELECT 
        SUM(ISNULL(amount, 0)) as cost_loss_amount
      FROM publishing_exceptions 
      WHERE isDeleted = 0 
        AND responsible_unit != '供应商'
        AND responsible_unit IS NOT NULL
    `;
    
    const costLossRequest = pool.request();
    const costLossResult = await costLossRequest.query(costLossQuery);

    res.json({
      success: true,
      data: {
        monthly_new: monthlyNewResult.recordset[0].monthly_new_count || 0,
        cost_loss: costLossResult.recordset[0].cost_loss_amount || 0
      }
    });
  } catch (error) {
    console.error('获取统计数据失败:', error);
    res.status(500).json({ success: false, message: '获取统计数据失败', error: error.message });
  }
});



module.exports = router;