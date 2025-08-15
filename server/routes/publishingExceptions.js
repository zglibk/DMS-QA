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
 * 根据ID获取单个出版异常记录
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
 * 获取数据统计
 */
router.get('/statistics/summary', async (req, res) => {
  try {
    const { startDate, endDate, responsibleUnit } = req.query;
    
    let whereClause = 'WHERE isDeleted = 0';
    const params = [];
    
    if (startDate) {
      whereClause += ' AND registration_date >= @startDate';
      params.push({ name: 'startDate', type: sql.Date, value: startDate });
    }
    
    if (endDate) {
      whereClause += ' AND registration_date <= @endDate';
      params.push({ name: 'endDate', type: sql.Date, value: endDate });
    }
    
    if (responsibleUnit) {
      whereClause += ' AND responsible_unit = @responsibleUnit';
      params.push({ name: 'responsibleUnit', type: sql.NVarChar, value: responsibleUnit });
    }

    const pool = await getConnection();
    
    // 基础统计
    const summaryQuery = `
      SELECT 
        COUNT(*) as total_count,
        SUM(ISNULL(amount, 0)) as total_amount,
        SUM(ISNULL(area_cm2, 0)) as total_area,
        AVG(ISNULL(amount, 0)) as avg_amount
      FROM publishing_exceptions ${whereClause}
    `;
    
    let summaryRequest = pool.request();
    params.forEach(param => {
      summaryRequest.input(param.name, param.type, param.value);
    });
    const summaryResult = await summaryRequest.query(summaryQuery);
    
    // 按责任单位统计
    const unitQuery = `
      SELECT 
        responsible_unit,
        COUNT(*) as count,
        SUM(ISNULL(amount, 0)) as total_amount
      FROM publishing_exceptions ${whereClause}
      GROUP BY responsible_unit
      ORDER BY count DESC
    `;
    
    let unitRequest = pool.request();
    params.forEach(param => {
      unitRequest.input(param.name, param.type, param.value);
    });
    const unitResult = await unitRequest.query(unitQuery);
    
    // 按月份统计
    const monthlyQuery = `
      SELECT 
        FORMAT(registration_date, 'yyyy-MM') as month,
        COUNT(*) as count,
        SUM(ISNULL(amount, 0)) as total_amount
      FROM publishing_exceptions ${whereClause}
      GROUP BY FORMAT(registration_date, 'yyyy-MM')
      ORDER BY month DESC
    `;
    
    let monthlyRequest = pool.request();
    params.forEach(param => {
      monthlyRequest.input(param.name, param.type, param.value);
    });
    const monthlyResult = await monthlyRequest.query(monthlyQuery);

    res.json({
      success: true,
      data: {
        summary: summaryResult.recordset[0],
        byUnit: unitResult.recordset,
        byMonth: monthlyResult.recordset
      }
    });
  } catch (error) {
    console.error('获取统计数据失败:', error);
    res.status(500).json({ success: false, message: '获取统计数据失败', error: error.message });
  }
});

module.exports = router;