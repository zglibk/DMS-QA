/**
 * 仪器管理模块路由
 * 
 * 功能说明：
 * 1. 仪器台账的增删改查操作
 * 2. 第三方校准检定结果登记
 * 3. 年度校准计划管理
 * 4. 年度检定计划和实施表导出
 * 5. 管理编号自动生成
 * 
 * 版本：v1.0
 * 创建日期：2025-09-29
 */

const express = require('express');
const router = express.Router();
const sql = require('mssql');
const { getConnection } = require('../db');
const { authenticateToken, checkPermission } = require('../middleware/auth');
const ExcelJS = require('exceljs');
const path = require('path');
const fs = require('fs');
const multer = require('multer');

// =====================================================
// 文件上传配置
// =====================================================

// 确保上传目录存在
const uploadDir = path.join(__dirname, '../uploads/certificates');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// 配置multer存储
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    // 解码文件名（处理中文编码问题）
    let originalName = file.originalname;
    try {
      originalName = Buffer.from(file.originalname, 'latin1').toString('utf8');
    } catch (e) {
      originalName = file.originalname;
    }
    
    // 保留原文件名，添加时间戳后缀
    const ext = path.extname(originalName);
    const baseName = path.basename(originalName, ext);
    const cleanBaseName = baseName.replace(/[^\u4e00-\u9fa5a-zA-Z0-9_\-]/g, '_');
    const timestamp = Date.now();
    const filename = `${cleanBaseName}_${timestamp}${ext}`;
    cb(null, filename);
  }
});

// 文件过滤器
const fileFilter = (req, file, cb) => {
  const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('只允许上传 PDF、JPG、PNG 格式的文件'), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB
});

// =====================================================
// 证书文件上传和预览接口
// =====================================================

/**
 * 上传校准证书文件
 * POST /api/instruments/calibration-results/upload-certificate
 */
router.post('/calibration-results/upload-certificate', authenticateToken, upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        code: 400,
        message: '请选择要上传的文件'
      });
    }

    res.json({
      code: 200,
      message: '文件上传成功',
      data: {
        filename: req.file.filename,
        originalName: req.file.originalname,
        size: req.file.size
      }
    });
  } catch (error) {
    console.error('文件上传失败:', error);
    res.status(500).json({
      code: 500,
      message: '文件上传失败',
      error: error.message
    });
  }
});

/**
 * 预览/获取证书文件
 * GET /api/instruments/files/certificate/:filename
 */
router.get('/files/certificate/:filename', authenticateToken, (req, res) => {
  try {
    const { filename } = req.params;
    const filePath = path.join(uploadDir, filename);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        code: 404,
        message: '文件不存在'
      });
    }

    // 获取文件扩展名
    const ext = path.extname(filename).toLowerCase();
    
    // 设置Content-Type
    let contentType = 'application/octet-stream';
    if (ext === '.pdf') {
      contentType = 'application/pdf';
    } else if (ext === '.jpg' || ext === '.jpeg') {
      contentType = 'image/jpeg';
    } else if (ext === '.png') {
      contentType = 'image/png';
    }

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(filename)}"`);
    
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);
  } catch (error) {
    console.error('获取文件失败:', error);
    res.status(500).json({
      code: 500,
      message: '获取文件失败',
      error: error.message
    });
  }
});

// =====================================================
// 管理编号生成功能
// =====================================================

/**
 * 生成仪器管理编号
 * @param {string} prefix - 前缀类型 ('WSJ' 或 'LAB')
 * @returns {string} 生成的管理编号
 */
async function generateManagementCode(prefix) {
  try {
    const pool = await getConnection();
    
    // 查询当前前缀的最大编号
    const query = `
      SELECT MAX(ManagementCode) as maxCode
      FROM Instruments 
      WHERE ManagementCode LIKE @prefix + '%'
    `;
    
    const request = pool.request();
    request.input('prefix', sql.NVarChar, prefix);
    const result = await request.query(query);
    
    let sequence = 1;
    if (result && result.recordset && result.recordset.length > 0 && result.recordset[0].maxCode) {
      const maxCode = result.recordset[0].maxCode;
      // 提取编号中的数字部分并加1
      const match = maxCode.match(new RegExp(`${prefix}-(\\d+)`));
      if (match) {
        sequence = parseInt(match[1]) + 1;
      }
    }
    
    // 生成流水号：格式化为2位数字
    const sequenceStr = sequence.toString().padStart(2, '0');
    
    // 返回格式：前缀-流水号
    return `${prefix}-${sequenceStr}`;
  } catch (error) {
    console.error('生成管理编号失败:', error);
    throw error;
  }
}

/**
 * 获取下一个管理编号预览
 * GET /api/instruments/next-management-code/:prefix
 * @param {string} prefix - 前缀类型 ('WSJ' 或 'LAB')
 */
router.get('/next-management-code/:prefix', authenticateToken, async (req, res) => {
  try {
    const { prefix } = req.params;
    
    // 验证前缀类型
    if (!['WSJ', 'LAB'].includes(prefix)) {
      return res.status(400).json({
        code: 400,
        message: '无效的前缀类型，只支持 WSJ 或 LAB'
      });
    }
    
    const nextCode = await generateManagementCode(prefix);
    
    res.json({
      code: 200,
      data: {
        managementCode: nextCode,
        prefix: prefix,
        description: prefix === 'WSJ' ? '温湿度计' : '常规仪器'
      }
    });
  } catch (error) {
    console.error('获取下一个管理编号失败:', error);
    res.status(500).json({
      code: 500,
      message: '获取管理编号失败',
      error: error.message
    });
  }
});

// =====================================================
// 仪器台账管理
// =====================================================

/**
 * 检查仪器编号是否重复
 * @route POST /api/instruments/check-duplicate
 * @description 检查出厂编号和管理编号是否已存在
 * @param {string} instrumentCode - 出厂编号（可选）
 * @param {string} managementCode - 管理编号（可选）
 * @param {number} excludeId - 排除的仪器ID（编辑时使用，可选）
 * @returns {Object} 检查结果
 */
router.post('/check-duplicate', authenticateToken, async (req, res) => {
  try {
    const { instrumentCode, managementCode, excludeId } = req.body;

    // 至少需要提供一个编号进行检查
    if (!instrumentCode && !managementCode) {
      return res.status(400).json({
        code: 400,
        message: '请提供要检查的编号'
      });
    }

    const pool = await getConnection();
    
    // 构建查询条件
    const checkConditions = [];
    const checkRequest = pool.request();
    
    if (instrumentCode) {
      checkConditions.push('InstrumentCode = @instrumentCode');
      checkRequest.input('instrumentCode', sql.NVarChar, instrumentCode);
    }
    
    if (managementCode) {
      checkConditions.push('ManagementCode = @managementCode');
      checkRequest.input('managementCode', sql.NVarChar, managementCode);
    }
    
    // 如果是编辑模式，排除当前记录
    let excludeCondition = '';
    if (excludeId) {
      excludeCondition = ' AND ID != @excludeId';
      checkRequest.input('excludeId', sql.Int, excludeId);
    }
    
    const checkQuery = `
      SELECT 
        InstrumentCode, 
        ManagementCode, 
        InstrumentName,
        ID
      FROM Instruments 
      WHERE IsActive = 1 
        AND (${checkConditions.join(' OR ')})
        ${excludeCondition}
    `;
    
    const checkResult = await checkRequest.query(checkQuery);
    
    if (checkResult.recordset.length > 0) {
      const duplicates = checkResult.recordset;
      const duplicateInfo = [];
      
      duplicates.forEach(record => {
        if (instrumentCode && record.InstrumentCode === instrumentCode) {
          duplicateInfo.push({
            type: 'instrumentCode',
            field: '出厂编号',
            value: instrumentCode,
            existingInstrument: record.InstrumentName,
            id: record.ID
          });
        }
        if (managementCode && record.ManagementCode === managementCode) {
          duplicateInfo.push({
            type: 'managementCode', 
            field: '管理编号',
            value: managementCode,
            existingInstrument: record.InstrumentName,
            id: record.ID
          });
        }
      });
      
      return res.json({
        code: 200,
        data: {
          isDuplicate: true,
          duplicates: duplicateInfo
        }
      });
    }
    
    return res.json({
      code: 200,
      data: {
        isDuplicate: false,
        duplicates: []
      }
    });
    
  } catch (error) {
    console.error('检查编号重复性失败:', error);
    res.status(500).json({
      code: 500,
      message: '检查编号重复性失败',
      error: error.message
    });
  }
});

/**
 * 获取仪器台账列表
 * GET /api/instruments
 * 支持分页、搜索、筛选
 */
router.get('/', authenticateToken, async (req, res) => {
  try {
    const {
      page = 1,
      pageSize = 10,
      instrumentCode,
      managementCode,
      instrumentName,
      category,
      status,
      departmentID,
      responsiblePerson
    } = req.query;

    const offset = (page - 1) * pageSize;
    const pool = await getConnection();

    // 构建查询条件
    let whereConditions = ['i.IsActive = 1'];
    const request = pool.request();

    if (instrumentCode) {
      whereConditions.push('i.InstrumentCode LIKE @instrumentCode');
      request.input('instrumentCode', sql.NVarChar, `%${instrumentCode}%`);
    }
    if (managementCode) {
      whereConditions.push('i.ManagementCode LIKE @managementCode');
      request.input('managementCode', sql.NVarChar, `%${managementCode}%`);
    }
    if (instrumentName) {
      whereConditions.push('i.InstrumentName LIKE @instrumentName');
      request.input('instrumentName', sql.NVarChar, `%${instrumentName}%`);
    }
    if (category) {
      whereConditions.push('i.Category = @category');
      request.input('category', sql.NVarChar, category);
    }
    if (status) {
      whereConditions.push('i.Status = @status');
      request.input('status', sql.NVarChar, status);
    }
    if (departmentID) {
      whereConditions.push('i.DepartmentID = @departmentID');
      request.input('departmentID', sql.Int, departmentID);
    }
    if (responsiblePerson) {
      whereConditions.push('i.ResponsiblePerson = @responsiblePerson');
      request.input('responsiblePerson', sql.Int, responsiblePerson);
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    // 查询总数
    const countQuery = `
      SELECT COUNT(*) as total
      FROM Instruments i
      ${whereClause}
    `;
    const countResult = await request.query(countQuery);
    const total = countResult.recordset[0].total;

    // 查询数据 - 使用ROW_NUMBER()兼容SQL Server 2008 R2
    request.input('startRow', sql.Int, offset + 1);
    request.input('endRow', sql.Int, offset + parseInt(pageSize));

    const dataQuery = `
      WITH PaginatedResults AS (
        SELECT 
          i.ID,
          i.InstrumentCode,
          i.ManagementCode,
          i.InstrumentName,
          i.Model,
          i.Manufacturer,
          i.SerialNumber,
          i.Category,
          ic.CategoryName,
          i.Specifications,
          i.PurchaseDate,
          i.PurchasePrice,
          i.Supplier,
          i.Location,
          p.Name as ResponsiblePersonName,
          d.Name as DepartmentName,
          i.Status,
          i.CalibrationCycle,
          i.WarrantyPeriod,
          i.WarrantyExpiry,
          i.UsageInstructions,
          i.SafetyNotes,
          i.Remarks,
          i.MeasurementRange,  -- 新增：量程字段
          i.Accuracy,          -- 新增：准确度字段
          i.CreatedAt,
          i.UpdatedAt,
          -- 获取最新校准信息
          cr.CalibrationDate as LastCalibrationDate,
          cr.ExpiryDate as NextCalibrationDate,
          cr.CalibrationResult as LastCalibrationResult,
          ROW_NUMBER() OVER (ORDER BY i.CreatedAt DESC) as RowNum
        FROM Instruments i
        LEFT JOIN Person p ON i.ResponsiblePerson = p.ID
        LEFT JOIN Department d ON i.DepartmentID = d.ID
        LEFT JOIN InstrumentCategories ic ON i.Category = ic.CategoryName OR i.Category = ic.CategoryCode
        LEFT JOIN (
          SELECT 
            InstrumentID,
            CalibrationDate,
            ExpiryDate,
            CalibrationResult,
            ROW_NUMBER() OVER (PARTITION BY InstrumentID ORDER BY CalibrationDate DESC) as rn
          FROM CalibrationResults
        ) cr ON i.ID = cr.InstrumentID AND cr.rn = 1
        ${whereClause}
      )
      SELECT * FROM PaginatedResults
      WHERE RowNum BETWEEN @startRow AND @endRow
      ORDER BY RowNum
    `;

    const dataResult = await request.query(dataQuery);

    res.json({
      code: 200,
      data: {
        list: dataResult.recordset,
        pagination: {
          current: parseInt(page),
          pageSize: parseInt(pageSize),
          total: total,
          pages: Math.ceil(total / pageSize)
        }
      },
      message: '获取仪器台账列表成功'
    });

  } catch (error) {
    console.error('获取仪器台账列表失败:', error);
    res.status(500).json({
      code: 500,
      message: '获取仪器台账列表失败',
      error: error.message
    });
  }
});

// =====================================================
// 校准结果管理
// =====================================================

/**
 * 生成校准结果编号
 * GET /api/instruments/generate-result-code
 */
router.get('/generate-result-code', authenticateToken, async (req, res) => {
  try {
    const pool = await getConnection();
    
    const currentYear = new Date().getFullYear();
    const currentMonth = String(new Date().getMonth() + 1).padStart(2, '0');
    
    // 查询当前年月的最大序号
    const maxCodeQuery = `
      SELECT TOP 1 ResultCode 
      FROM CalibrationResults 
      WHERE ResultCode LIKE 'CAL-${currentYear}${currentMonth}-%' 
      ORDER BY ResultCode DESC
    `;
    
    const maxCodeResult = await pool.request().query(maxCodeQuery);
    let nextSequence = 1;
    
    if (maxCodeResult.recordset.length > 0) {
      const lastCode = maxCodeResult.recordset[0].ResultCode;
      const lastSequence = parseInt(lastCode.split('-')[2]);
      nextSequence = lastSequence + 1;
    }
    
    const resultCode = `CAL-${currentYear}${currentMonth}-${String(nextSequence).padStart(3, '0')}`;
    
    res.json({
      code: 200,
      data: {
        resultCode: resultCode
      },
      message: '生成校准结果编号成功'
    });

  } catch (error) {
    console.error('生成校准结果编号失败:', error);
    res.status(500).json({
      code: 500,
      message: '生成校准结果编号失败',
      error: error.message
    });
  }
});

/**
 * 获取校准结果列表
 * GET /api/instruments/calibration-results
 * 支持分页、搜索、筛选
 */
// 旧的重复路由已删除，使用下方包含证书编号搜索功能的新路由

/**
 * 创建校准结果记录
 * POST /api/instruments/calibration-results
 */
router.post('/calibration-results', authenticateToken, async (req, res) => {
  try {
    const {
      instrumentID,
      resultCode,           // 添加检定结果编号字段
      calibrationDate,
      calibrationAgency,
      certificateNumber,
      calibrationStandard,
      calibrationResult,
      expiryDate,
      nextCalibrationDate,
      calibrationCost,
      calibrationData,      // 添加校准数据字段
      issues,               // 添加发现问题字段
      recommendations,      // 添加建议字段
      environmentalConditions,
      calibrationCycle,
      remarks,
      certificateFile       // 添加证书文件字段
    } = req.body;

    // 验证必填字段
    if (!instrumentID || !calibrationDate || !calibrationAgency || !certificateNumber || !calibrationStandard || !calibrationResult) {
      return res.status(400).json({
        code: 400,
        message: '请填写所有必填字段'
      });
    }

    const pool = await getConnection();

    // 检查仪器是否存在并获取相关信息
    const instrumentCheck = await pool.request()
      .input('instrumentID', sql.Int, instrumentID)
      .query('SELECT ID, InstrumentCode, ManagementCode FROM Instruments WHERE ID = @instrumentID');

    if (instrumentCheck.recordset.length === 0) {
      return res.status(404).json({
        code: 404,
        message: '仪器不存在'
      });
    }

    const instrument = instrumentCheck.recordset[0];

    // 如果没有提供检定结果编号，则自动生成
    let finalResultCode = resultCode;
    if (!finalResultCode) {
      const currentYear = new Date().getFullYear();
      const currentMonth = String(new Date().getMonth() + 1).padStart(2, '0');
      
      // 查询当前年月的最大序号
      const maxCodeQuery = `
        SELECT TOP 1 ResultCode 
        FROM CalibrationResults 
        WHERE ResultCode LIKE 'CAL-${currentYear}${currentMonth}-%' 
        ORDER BY ResultCode DESC
      `;
      
      const maxCodeResult = await pool.request().query(maxCodeQuery);
      let nextSequence = 1;
      
      if (maxCodeResult.recordset.length > 0) {
        const lastCode = maxCodeResult.recordset[0].ResultCode;
        const lastSequence = parseInt(lastCode.split('-')[2]);
        nextSequence = lastSequence + 1;
      }
      
      finalResultCode = `CAL-${currentYear}${currentMonth}-${String(nextSequence).padStart(3, '0')}`;
    }

    // 插入校准结果记录
    const insertQuery = `
      INSERT INTO CalibrationResults (
        ResultCode, InstrumentID, InstrumentCode, ManagementCode, CalibrationDate, CalibrationAgency, CertificateNumber,
        CalibrationStandard, CalibrationResult, ExpiryDate, NextCalibrationDate, CalibrationCost, 
        CalibrationData, Issues, Recommendations, EnvironmentalConditions, CalibrationCycle, Remarks, Attachments, CreatedBy, CreatedAt
      ) VALUES (
        @resultCode, @instrumentID, @instrumentCode, @managementCode, @calibrationDate, @calibrationAgency, @certificateNumber,
        @calibrationStandard, @calibrationResult, @expiryDate, @nextCalibrationDate, @calibrationCost,
        @calibrationData, @issues, @recommendations, @environmentalConditions, @calibrationCycle, @remarks, @attachments, @createdBy, GETDATE()
      );
      SELECT SCOPE_IDENTITY() as ID;
    `;

    const result = await pool.request()
      .input('resultCode', sql.NVarChar, finalResultCode)
      .input('instrumentID', sql.Int, instrumentID)
      .input('instrumentCode', sql.NVarChar, instrument.InstrumentCode)
      .input('managementCode', sql.NVarChar, instrument.ManagementCode)
      .input('calibrationDate', sql.DateTime, new Date(calibrationDate))
      .input('calibrationAgency', sql.NVarChar, calibrationAgency)
      .input('certificateNumber', sql.NVarChar, certificateNumber)
      .input('calibrationStandard', sql.NVarChar, calibrationStandard || null)
      .input('calibrationResult', sql.NVarChar, calibrationResult)
      .input('expiryDate', sql.DateTime, expiryDate ? new Date(expiryDate) : null)
      .input('nextCalibrationDate', sql.DateTime, nextCalibrationDate ? new Date(nextCalibrationDate) : null)
      .input('calibrationCost', sql.Decimal(10, 2), calibrationCost || null)
      .input('calibrationData', sql.NVarChar, calibrationData || null)
      .input('issues', sql.NVarChar, issues || null)
      .input('recommendations', sql.NVarChar, recommendations || null)
      .input('environmentalConditions', sql.NVarChar, environmentalConditions || null)
      .input('calibrationCycle', sql.Int, calibrationCycle || null)
      .input('remarks', sql.NVarChar, remarks || null)
      .input('attachments', sql.NVarChar, certificateFile || null)
      .input('createdBy', sql.Int, req.user.id)
      .query(insertQuery);

    const newRecordId = result.recordset[0].ID;

    res.status(201).json({
      code: 201,
      data: { id: newRecordId },
      message: '校准结果记录创建成功'
    });

  } catch (error) {
    console.error('创建校准结果记录失败:', error);
    res.status(500).json({
      code: 500,
      message: '创建校准结果记录失败',
      error: error.message
    });
  }
});

// =====================================================
// 年度校准计划管理
// =====================================================

/**
 * 获取年度校准计划列表
 * GET /api/instruments/annual-plans
 * 支持分页、搜索、筛选
 */
router.get('/annual-plans', authenticateToken, async (req, res) => {
  try {
    const {
      year = new Date().getFullYear(),
      page = 1,
      size = 20,
      instrumentName,
      managementCode,
      status,
      priority,
      calibrationAgency
    } = req.query;

    const offset = (page - 1) * size;
    const pool = await getConnection();

    // 构建查询条件
    let whereConditions = ['ap.PlanYear = @year'];
    const request = pool.request();
    request.input('year', sql.Int, parseInt(year));

    if (instrumentName) {
      whereConditions.push('i.InstrumentName LIKE @instrumentName');
      request.input('instrumentName', sql.NVarChar, `%${instrumentName}%`);
    }

    if (managementCode) {
      whereConditions.push('i.ManagementCode LIKE @managementCode');
      request.input('managementCode', sql.NVarChar, `%${managementCode}%`);
    }

    if (status) {
      whereConditions.push('ap.Status = @status');
      request.input('status', sql.NVarChar, status);
    }

    if (priority) {
      whereConditions.push('ap.Priority = @priority');
      request.input('priority', sql.NVarChar, priority);
    }

    if (calibrationAgency) {
      whereConditions.push('ap.CalibrationAgency LIKE @calibrationAgency');
      request.input('calibrationAgency', sql.NVarChar, `%${calibrationAgency}%`);
    }

    const whereClause = whereConditions.join(' AND ');

    // 查询总数
    const countQuery = `
      SELECT COUNT(*) as total
      FROM AnnualCalibrationPlan ap
      LEFT JOIN Instruments i ON ap.InstrumentID = i.ID
      WHERE ${whereClause}
    `;

    const countResult = await request.query(countQuery);
    const total = countResult.recordset[0].total;

    // 查询数据
    const dataQuery = `
      SELECT * FROM (
        SELECT 
          ap.ID,
          ap.PlanYear,
          ap.InstrumentID,
          i.InstrumentCode,
          i.ManagementCode,
          i.InstrumentName,
          i.Model,
          i.Manufacturer,
          i.Location,
          d.Name as DepartmentName,
          p.Name as ResponsiblePersonName,
          ap.PlannedDate,
          ap.LastCalibrationDate,
          ap.CalibrationCycle,
          ap.CalibrationAgency,
          ap.EstimatedCost,
          ap.Priority,
          ap.Status,
          ap.ActualDate,
          ap.ActualCost,
          ap.CalibrationResultID,
          cr.CertificateNumber,
          cr.CalibrationResult,
          cr.ExpiryDate,
          ap.Remarks,
          creator.RealName as CreatorName,
          ap.CreatedAt,
          ap.UpdatedAt,
          ROW_NUMBER() OVER (ORDER BY ap.PlannedDate ASC) as RowNum
        FROM AnnualCalibrationPlan ap
        LEFT JOIN Instruments i ON ap.InstrumentID = i.ID
        LEFT JOIN Department d ON i.DepartmentID = d.ID
        LEFT JOIN Person p ON i.ResponsiblePerson = p.ID
        LEFT JOIN CalibrationResults cr ON ap.CalibrationResultID = cr.ID
        LEFT JOIN [User] creator ON ap.CreatedBy = creator.ID
        WHERE ${whereClause}
      ) AS PagedResults
      WHERE RowNum BETWEEN @startRow AND @endRow
    `;

    request.input('startRow', sql.Int, offset + 1);
    request.input('endRow', sql.Int, offset + parseInt(size));

    const dataResult = await request.query(dataQuery);

    res.json({
      code: 200,
      data: {
        list: dataResult.recordset,
        total: total,
        page: parseInt(page),
        size: parseInt(size),
        totalPages: Math.ceil(total / size)
      },
      message: '获取年度校准计划列表成功'
    });

  } catch (error) {
    console.error('获取年度校准计划列表失败:', error);
    res.status(500).json({
      code: 500,
      message: '获取年度校准计划列表失败',
      error: error.message
    });
  }
});

/**
 * 创建年度校准计划
 * POST /api/instruments/annual-plans
 */
router.post('/annual-plans', authenticateToken, async (req, res) => {
  try {
    const {
      planYear,
      instrumentID,
      plannedDate,
      calibrationAgency,
      estimatedCost,
      priority = '中',
      remarks
    } = req.body;

    // 验证必填字段
    if (!planYear || !instrumentID || !plannedDate || !calibrationAgency) {
      return res.status(400).json({
        code: 400,
        message: '请填写所有必填字段'
      });
    }

    const pool = await getConnection();

    // 检查仪器是否存在
    const instrumentCheck = await pool.request()
      .input('instrumentID', sql.Int, instrumentID)
      .query('SELECT ID FROM Instruments WHERE ID = @instrumentID');

    if (instrumentCheck.recordset.length === 0) {
      return res.status(404).json({
        code: 404,
        message: '仪器不存在'
      });
    }

    // 检查是否已存在同年度同仪器的计划
    const existCheck = await pool.request()
      .input('planYear', sql.Int, planYear)
      .input('instrumentID', sql.Int, instrumentID)
      .query('SELECT ID FROM AnnualCalibrationPlan WHERE PlanYear = @planYear AND InstrumentID = @instrumentID');

    if (existCheck.recordset.length > 0) {
      return res.status(400).json({
        code: 400,
        message: '该仪器在此年度已存在校准计划'
      });
    }

    // 插入年度校准计划
    const insertQuery = `
      INSERT INTO AnnualCalibrationPlan (
        PlanYear, InstrumentID, PlannedDate, CalibrationAgency,
        EstimatedCost, Priority, Status, Remarks, CreatedBy, CreatedAt
      ) VALUES (
        @planYear, @instrumentID, @plannedDate, @calibrationAgency,
        @estimatedCost, @priority, '计划中', @remarks, @createdBy, GETDATE()
      );
      SELECT SCOPE_IDENTITY() as ID;
    `;

    const result = await pool.request()
      .input('planYear', sql.Int, planYear)
      .input('instrumentID', sql.Int, instrumentID)
      .input('plannedDate', sql.DateTime, new Date(plannedDate))
      .input('calibrationAgency', sql.NVarChar, calibrationAgency)
      .input('estimatedCost', sql.Decimal(10, 2), estimatedCost || null)
      .input('priority', sql.NVarChar, priority)
      .input('remarks', sql.NVarChar, remarks || null)
      .input('createdBy', sql.Int, req.user.id)
      .query(insertQuery);

    const newId = result.recordset[0].ID;

    res.status(201).json({
      code: 201,
      data: { id: newId },
      message: '年度校准计划创建成功'
    });

  } catch (error) {
    console.error('创建年度校准计划失败:', error);
    res.status(500).json({
      code: 500,
      message: '创建年度校准计划失败',
      error: error.message
    });
  }
});

/**
 * 获取仪器类别列表
 * GET /api/instruments/categories
 */
router.get('/categories', authenticateToken, async (req, res) => {
  try {
    const pool = await getConnection();

    const query = `
      SELECT 
        ID,
        CategoryCode,
        CategoryName,
        ParentID,
        Description,
        SortOrder
      FROM InstrumentCategories
      WHERE IsActive = 1
      ORDER BY SortOrder ASC, CategoryName ASC
    `;

    const result = await pool.request().query(query);

    res.json({
      code: 200,
      data: result.recordset,
      message: '获取仪器类别列表成功'
    });

  } catch (error) {
    console.error('获取仪器类别列表失败:', error);
    res.status(500).json({
      code: 500,
      message: '获取仪器类别列表失败',
      error: error.message
    });
  }
});

/**
 * 获取人员列表
 * GET /api/instruments/persons
 */
router.get('/persons', authenticateToken, async (req, res) => {
  try {
    const pool = await getConnection();

    const query = `
      SELECT 
        p.ID,
        p.Name,
        d.Name as DepartmentName
      FROM Person p
      LEFT JOIN Department d ON p.DepartmentID = d.ID
      WHERE p.IsActive = 1
      ORDER BY p.Name ASC
    `;

    const result = await pool.request().query(query);

    res.json({
      code: 200,
      data: result.recordset,
      message: '获取人员列表成功'
    });

  } catch (error) {
    console.error('获取人员列表失败:', error);
    res.status(500).json({
      code: 500,
      message: '获取人员列表失败',
      error: error.message
    });
  }
});

/**
 * 获取可用于校准的仪器列表（没有校准记录的仪器）
 * GET /api/instruments/available-for-calibration
 */
router.get('/available-for-calibration', authenticateToken, async (req, res) => {
  try {
    const pool = await getConnection();

    const query = `
      SELECT 
        i.ID,
        i.InstrumentCode,
        i.ManagementCode,
        i.InstrumentName,
        i.Model,
        i.Manufacturer,
        i.Category,
        d.Name as DepartmentName
      FROM Instruments i
      LEFT JOIN Department d ON i.DepartmentID = d.ID
      LEFT JOIN CalibrationResults cr ON i.ID = cr.InstrumentID
      WHERE i.IsActive = 1 
        AND cr.InstrumentID IS NULL
      ORDER BY i.ManagementCode ASC, i.InstrumentName ASC
    `;

    const result = await pool.request().query(query);

    res.json({
      code: 200,
      data: result.recordset,
      message: '获取可校准仪器列表成功'
    });

  } catch (error) {
    console.error('获取可校准仪器列表失败:', error);
    res.status(500).json({
      code: 500,
      message: '获取可校准仪器列表失败',
      error: error.message
    });
  }
});

// =====================================================
// 校准结果管理
// =====================================================

/**
 * 获取校准结果列表
 * GET /api/instruments/calibration-results
 * 支持分页、搜索、筛选
 */
router.get('/calibration-results', authenticateToken, async (req, res) => {
  try {
    const {
      page = 1,
      size = 20,
      instrumentName,
      managementCode,
      calibrationAgency,
      certificateNumber,
      calibrationResult,
      startDate,
      endDate
    } = req.query;

    // 调试日志：检查接收到的参数
    console.log('接收到的查询参数:', req.query);
    if (certificateNumber) {
      console.log('证书编号参数:', certificateNumber);
    }

    const offset = (page - 1) * size;
    const pool = await getConnection();
    
    // 构建基础查询
    // NextCalibrationDate = ExpiryDate - 7天（提前一周送检）
    let baseQuery = `
      SELECT 
        cr.ID,
        cr.ResultCode,
        cr.InstrumentID,
        i.InstrumentName,
        i.ManagementCode,
        i.InstrumentCode,
        cr.CalibrationDate,
        cr.CalibrationAgency,
        cr.CertificateNumber,
        cr.CalibrationStandard,
        cr.CalibrationResult,
        cr.ExpiryDate,
        DATEADD(DAY, -7, cr.ExpiryDate) as NextCalibrationDate,
        cr.CalibrationCost,
        cr.CalibrationData,
        cr.Issues,
        cr.Recommendations,
        cr.Remarks,
        cr.Attachments as CertificateFile,
        cr.CreatedAt,
        cr.UpdatedAt
      FROM CalibrationResults cr
      LEFT JOIN Instruments i ON cr.InstrumentID = i.ID
      WHERE 1=1
    `;

    const conditions = [];
    const parameters = [];

    // 添加搜索条件
    if (instrumentName) {
      conditions.push(`i.InstrumentName LIKE @instrumentName`);
      parameters.push({ name: 'instrumentName', type: sql.NVarChar, value: `%${instrumentName}%` });
    }

    if (managementCode) {
      conditions.push(`i.ManagementCode LIKE @managementCode`);
      parameters.push({ name: 'managementCode', type: sql.NVarChar, value: `%${managementCode}%` });
    }

    if (calibrationAgency) {
      conditions.push(`cr.CalibrationAgency LIKE @calibrationAgency`);
      parameters.push({ name: 'calibrationAgency', type: sql.NVarChar, value: `%${calibrationAgency}%` });
    }

    if (certificateNumber) {
      console.log('添加证书编号搜索条件:', certificateNumber);
      conditions.push(`cr.CertificateNumber LIKE @certificateNumber`);
      parameters.push({ name: 'certificateNumber', type: sql.NVarChar, value: `%${certificateNumber}%` });
    }

    if (calibrationResult) {
      conditions.push(`cr.CalibrationResult = @calibrationResult`);
      parameters.push({ name: 'calibrationResult', type: sql.NVarChar, value: calibrationResult });
    }

    if (startDate) {
      conditions.push(`cr.CalibrationDate >= @startDate`);
      parameters.push({ name: 'startDate', type: sql.DateTime, value: new Date(startDate) });
    }

    if (endDate) {
      conditions.push(`cr.CalibrationDate <= @endDate`);
      parameters.push({ name: 'endDate', type: sql.DateTime, value: new Date(endDate) });
    }

    // 添加条件到查询
    if (conditions.length > 0) {
      baseQuery += ` AND ${conditions.join(' AND ')}`;
    }

    console.log('构建的SQL查询:', baseQuery);
    console.log('查询参数:', parameters);

    // 获取总数
    const countQuery = `
      SELECT COUNT(*) as total
      FROM CalibrationResults cr
      LEFT JOIN Instruments i ON cr.InstrumentID = i.ID
      WHERE 1=1 ${conditions.length > 0 ? ` AND ${conditions.join(' AND ')}` : ''}
    `;

    const countRequest = pool.request();
    parameters.forEach(param => {
      countRequest.input(param.name, param.type, param.value);
    });

    const countResult = await countRequest.query(countQuery);
    const total = countResult.recordset[0].total;

    // 分页查询 - 使用兼容的分页方式
    let dataQuery;
    if (offset === 0) {
      // 第一页，使用TOP
      dataQuery = baseQuery.replace('SELECT', `SELECT TOP ${size}`) + ` ORDER BY cr.CreatedAt DESC`;
    } else {
      // 其他页，使用ROW_NUMBER()
      dataQuery = `
        WITH PaginatedResults AS (
          ${baseQuery.replace('SELECT', 'SELECT ROW_NUMBER() OVER (ORDER BY cr.CreatedAt DESC) as RowNum,')}
        )
        SELECT * FROM PaginatedResults 
        WHERE RowNum > @offset AND RowNum <= @offset + @size
        ORDER BY RowNum
      `;
    }

    const dataRequest = pool.request();
    parameters.forEach(param => {
      dataRequest.input(param.name, param.type, param.value);
    });
    // 添加分页参数
    dataRequest.input('offset', sql.Int, offset);
    dataRequest.input('size', sql.Int, size);

    const dataResult = await dataRequest.query(dataQuery);

    console.log('查询结果数量:', dataResult.recordset.length);
    console.log('总记录数:', total);

    res.json({
      code: 200,
      message: '获取成功',
      data: {
        list: dataResult.recordset,
        total,
        page: parseInt(page),
        size: parseInt(size),
        pages: Math.ceil(total / size)
      }
    });

  } catch (error) {
    console.error('获取校准结果列表失败:', error);
    res.status(500).json({
      code: 500,
      message: '获取校准结果列表失败',
      error: error.message
    });
  }
});

// =====================================================
// 校准到期预警API（必须放在 /:id 路由之前）
// =====================================================

/**
 * 获取校准预警信息
 * GET /api/instruments/calibration-warnings
 * 返回即将到期和已过期的校准仪器列表
 * 
 * 预警来源：
 * 1. 年度校准计划中 PlannedDate 即将到期的（计划校准日期）
 * 2. 校准结果中 ExpiryDate 即将到期的（证书有效期）
 */
router.get('/calibration-warnings', authenticateToken, async (req, res) => {
  try {
    const { warningDays = 30 } = req.query; // 默认提前30天预警
    const pool = await getConnection();
    
    // 查询即将到期的仪器（综合年度计划和校准结果）
    const result = await pool.request()
      .input('warningDays', sql.Int, parseInt(warningDays))
      .query(`
        -- 从年度校准计划获取即将到期的仪器
        SELECT 
          i.ID as InstrumentID,
          i.ManagementCode,
          i.InstrumentCode,
          i.InstrumentName,
          i.Model,
          d.Name as Department,
          p.Name as ResponsiblePerson,
          ap.PlannedDate as WarningDate,
          N'计划校准' as WarningSource,
          DATEDIFF(DAY, GETDATE(), ap.PlannedDate) as DaysRemaining,
          CASE 
            WHEN ap.PlannedDate < GETDATE() THEN 'expired'
            WHEN DATEDIFF(DAY, GETDATE(), ap.PlannedDate) <= 7 THEN 'critical'
            WHEN DATEDIFF(DAY, GETDATE(), ap.PlannedDate) <= @warningDays THEN 'warning'
            ELSE 'normal'
          END as WarningLevel,
          ap.CalibrationAgency,
          NULL as CertificateNumber
        FROM AnnualCalibrationPlan ap
        INNER JOIN Instruments i ON ap.InstrumentID = i.ID
        LEFT JOIN Department d ON i.DepartmentID = d.ID
        LEFT JOIN Person p ON i.ResponsiblePerson = p.ID
        WHERE i.IsActive = 1 
          AND ap.PlannedDate IS NOT NULL
          AND ap.Status IN (N'计划中', N'待校准', N'planned', 'planned')
          AND DATEDIFF(DAY, GETDATE(), ap.PlannedDate) <= @warningDays
        
        UNION
        
        -- 从校准结果获取证书即将到期的仪器
        SELECT 
          i.ID as InstrumentID,
          i.ManagementCode,
          i.InstrumentCode,
          i.InstrumentName,
          i.Model,
          d.Name as Department,
          p.Name as ResponsiblePerson,
          cr.ExpiryDate as WarningDate,
          N'证书到期' as WarningSource,
          DATEDIFF(DAY, GETDATE(), cr.ExpiryDate) as DaysRemaining,
          CASE 
            WHEN cr.ExpiryDate < GETDATE() THEN 'expired'
            WHEN DATEDIFF(DAY, GETDATE(), cr.ExpiryDate) <= 7 THEN 'critical'
            WHEN DATEDIFF(DAY, GETDATE(), cr.ExpiryDate) <= @warningDays THEN 'warning'
            ELSE 'normal'
          END as WarningLevel,
          cr.CalibrationAgency,
          cr.CertificateNumber
        FROM (
          SELECT 
            InstrumentID,
            ExpiryDate,
            CalibrationAgency,
            CertificateNumber,
            ROW_NUMBER() OVER (PARTITION BY InstrumentID ORDER BY CalibrationDate DESC) as rn
          FROM CalibrationResults
          WHERE ExpiryDate IS NOT NULL
        ) cr
        INNER JOIN Instruments i ON cr.InstrumentID = i.ID AND cr.rn = 1
        LEFT JOIN Department d ON i.DepartmentID = d.ID
        LEFT JOIN Person p ON i.ResponsiblePerson = p.ID
        WHERE i.IsActive = 1 
          AND DATEDIFF(DAY, GETDATE(), cr.ExpiryDate) <= @warningDays
        
        ORDER BY DaysRemaining ASC, WarningDate ASC
      `);
    
    // 统计各级别数量
    const warnings = result.recordset || [];
    const summary = {
      total: warnings.length,
      expired: warnings.filter(w => w.WarningLevel === 'expired').length,
      critical: warnings.filter(w => w.WarningLevel === 'critical').length,
      warning: warnings.filter(w => w.WarningLevel === 'warning').length
    };
    
    res.json({
      code: 200,
      data: {
        summary,
        list: warnings
      },
      message: '获取校准预警信息成功'
    });
  } catch (error) {
    console.error('获取校准预警信息失败:', error);
    // 返回空数据而不是500错误，避免阻塞页面加载
    res.json({
      code: 200,
      data: {
        summary: { total: 0, expired: 0, critical: 0, warning: 0 },
        list: []
      },
      message: '暂无预警数据'
    });
  }
});

/**
 * 自动生成校准到期预警通知
 * POST /api/instruments/generate-warning-notices
 * 将即将到期的仪器信息写入通知公告表
 */
router.post('/generate-warning-notices', authenticateToken, async (req, res) => {
  try {
    const { warningDays = 7 } = req.body || {}; // 默认提前7天生成通知
    const pool = await getConnection();
    
    // 获取用户ID，如果没有则使用默认值1
    const userId = req.user?.id || 1;
    
    // 先检查CalibrationResults表是否存在
    const checkTable = await pool.request().query(`
      SELECT COUNT(*) as cnt FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_NAME = 'CalibrationResults'
    `);
    
    if (checkTable.recordset[0].cnt === 0) {
      return res.json({
        code: 200,
        data: { created: 0 },
        message: '校准结果表不存在，无法生成预警'
      });
    }
    
    // 查询需要预警的仪器（综合年度计划和校准结果）
    const warningResult = await pool.request()
      .input('warningDays', sql.Int, parseInt(warningDays))
      .query(`
        -- 从年度校准计划获取即将到期的仪器
        SELECT 
          i.ID as InstrumentID,
          i.ManagementCode,
          i.InstrumentName,
          d.Name as Department,
          p.Name as ResponsiblePerson,
          ap.PlannedDate as WarningDate,
          N'计划校准' as WarningSource,
          DATEDIFF(DAY, GETDATE(), ap.PlannedDate) as DaysRemaining
        FROM AnnualCalibrationPlan ap
        INNER JOIN Instruments i ON ap.InstrumentID = i.ID
        LEFT JOIN Department d ON i.DepartmentID = d.ID
        LEFT JOIN Person p ON i.ResponsiblePerson = p.ID
        WHERE i.IsActive = 1 
          AND ap.PlannedDate IS NOT NULL
          AND ap.Status IN (N'计划中', N'待校准', N'planned', 'planned')
          AND DATEDIFF(DAY, GETDATE(), ap.PlannedDate) <= @warningDays
          AND DATEDIFF(DAY, GETDATE(), ap.PlannedDate) >= 0
        
        UNION
        
        -- 从校准结果获取证书即将到期的仪器
        SELECT 
          i.ID as InstrumentID,
          i.ManagementCode,
          i.InstrumentName,
          d.Name as Department,
          p.Name as ResponsiblePerson,
          cr.ExpiryDate as WarningDate,
          N'证书到期' as WarningSource,
          DATEDIFF(DAY, GETDATE(), cr.ExpiryDate) as DaysRemaining
        FROM (
          SELECT 
            InstrumentID,
            ExpiryDate,
            ROW_NUMBER() OVER (PARTITION BY InstrumentID ORDER BY CalibrationDate DESC) as rn
          FROM CalibrationResults
          WHERE ExpiryDate IS NOT NULL
        ) cr
        INNER JOIN Instruments i ON cr.InstrumentID = i.ID AND cr.rn = 1
        LEFT JOIN Department d ON i.DepartmentID = d.ID
        LEFT JOIN Person p ON i.ResponsiblePerson = p.ID
        WHERE i.IsActive = 1 
          AND DATEDIFF(DAY, GETDATE(), cr.ExpiryDate) <= @warningDays
          AND DATEDIFF(DAY, GETDATE(), cr.ExpiryDate) >= 0
        
        ORDER BY DaysRemaining ASC
      `);
    
    const warningList = warningResult.recordset || [];
    
    if (warningList.length === 0) {
      return res.json({
        code: 200,
        data: { created: 0 },
        message: '当前没有需要预警的仪器'
      });
    }
    
    // 构建通知内容
    const today = new Date().toISOString().split('T')[0];
    const title = `【校准预警】${warningList.length}项预警 - ${today}`;
    
    let content = '<div style="padding: 10px;">';
    content += '<p style="color: #E6A23C; font-weight: bold;">⚠️ 以下仪器需要关注，请及时安排处理：</p>';
    content += '<table style="width: 100%; border-collapse: collapse; margin-top: 10px;">';
    content += '<thead><tr style="background: #f5f7fa;">';
    content += '<th style="padding: 8px; border: 1px solid #ebeef5; text-align: left;">管理编号</th>';
    content += '<th style="padding: 8px; border: 1px solid #ebeef5; text-align: left;">仪器名称</th>';
    content += '<th style="padding: 8px; border: 1px solid #ebeef5; text-align: center;">预警类型</th>';
    content += '<th style="padding: 8px; border: 1px solid #ebeef5; text-align: left;">使用部门</th>';
    content += '<th style="padding: 8px; border: 1px solid #ebeef5; text-align: center;">预警日期</th>';
    content += '<th style="padding: 8px; border: 1px solid #ebeef5; text-align: center;">剩余天数</th>';
    content += '</tr></thead><tbody>';
    
    warningList.forEach(item => {
      const warningDate = item.WarningDate ? new Date(item.WarningDate).toLocaleDateString('zh-CN') : '-';
      const daysColor = item.DaysRemaining <= 3 ? '#F56C6C' : (item.DaysRemaining <= 7 ? '#E6A23C' : '#409EFF');
      const sourceColor = item.WarningSource === '计划校准' ? '#E6A23C' : '#409EFF';
      content += '<tr>';
      content += `<td style="padding: 8px; border: 1px solid #ebeef5;">${item.ManagementCode || '-'}</td>`;
      content += `<td style="padding: 8px; border: 1px solid #ebeef5;">${item.InstrumentName || '-'}</td>`;
      content += `<td style="padding: 8px; border: 1px solid #ebeef5; text-align: center;"><span style="background: ${sourceColor}; color: #fff; padding: 2px 8px; border-radius: 4px; font-size: 12px;">${item.WarningSource || '证书到期'}</span></td>`;
      content += `<td style="padding: 8px; border: 1px solid #ebeef5;">${item.Department || '-'}</td>`;
      content += `<td style="padding: 8px; border: 1px solid #ebeef5; text-align: center;">${warningDate}</td>`;
      content += `<td style="padding: 8px; border: 1px solid #ebeef5; text-align: center; color: ${daysColor}; font-weight: bold;">${item.DaysRemaining}天</td>`;
      content += '</tr>';
    });
    
    content += '</tbody></table>';
    content += '<p style="margin-top: 15px; color: #909399; font-size: 12px;">• 计划校准：年度计划中的校准日期即将到期<br/>• 证书到期：校准证书有效期即将到期<br/>请相关部门负责人及时安排仪器送检。</p>';
    content += '</div>';
    
    // 检查今天是否已经生成过相同标题的通知
    const existingNotice = await pool.request()
      .input('title', sql.NVarChar, title)
      .query(`SELECT ID FROM Notices WHERE Title = @title AND IsActive = 1`);
    
    if (existingNotice.recordset.length > 0) {
      return res.json({
        code: 200,
        data: { created: 0, existing: true },
        message: '今日已生成过校准预警通知'
      });
    }
    
    // 创建通知
    await pool.request()
      .input('title', sql.NVarChar, title)
      .input('content', sql.NVarChar, content)
      .input('type', sql.NVarChar, 'urgent')
      .input('priority', sql.NVarChar, 'high')
      .input('createdBy', sql.Int, userId)
      .query(`
        INSERT INTO Notices (Title, Content, Type, Priority, CreatedBy, PublishDate, CreatedAt)
        VALUES (@title, @content, @type, @priority, @createdBy, GETDATE(), GETDATE())
      `);
    
    res.json({
      code: 200,
      data: { 
        created: 1,
        instrumentCount: warningList.length
      },
      message: `成功生成校准预警通知，包含${warningList.length}台仪器`
    });
  } catch (error) {
    console.error('生成校准预警通知失败:', error);
    // 返回友好的错误信息
    res.json({
      code: 200,
      data: { created: 0 },
      message: '生成预警通知失败：' + (error.message || '未知错误')
    });
  }
});

/**
 * 获取单个仪器详情
 * GET /api/instruments/:id
 */
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    // 验证ID参数
    if (!id || isNaN(parseInt(id))) {
      return res.status(400).json({
        code: 400,
        message: '无效的仪器ID'
      });
    }

    const pool = await getConnection();

    const query = `
      SELECT 
        i.*,
        d.Name as DepartmentName,
        p.Name as ResponsiblePersonName,
        creator.Username as CreatorName,
        updater.Username as UpdaterName
      FROM Instruments i
      LEFT JOIN Department d ON i.DepartmentID = d.ID
      LEFT JOIN Person p ON i.ResponsiblePerson = p.ID
      LEFT JOIN [User] creator ON i.CreatedBy = creator.ID
      LEFT JOIN [User] updater ON i.UpdatedBy = updater.ID
      WHERE i.ID = @id AND i.IsActive = 1
    `;

    const result = await pool.request()
      .input('id', sql.Int, parseInt(id))
      .query(query);

    if (result.recordset.length === 0) {
      return res.status(404).json({
        code: 404,
        message: '仪器不存在'
      });
    }

    res.json({
      code: 200,
      data: result.recordset[0],
      message: '获取仪器详情成功'
    });

  } catch (error) {
    console.error('获取仪器详情失败:', error);
    res.status(500).json({
      code: 500,
      message: '获取仪器详情失败',
      error: error.message
    });
  }
});

// =====================================================
// 校准结果管理
// =====================================================

/**
 * 创建新仪器
 * POST /api/instruments
 */
router.post('/', authenticateToken, async (req, res) => {
  try {
    const {
      InstrumentCode: instrumentCode,  // 支持前端的大写字段名
      ManagementCode: managementCode,  // 支持前端的大写字段名
      InstrumentName: instrumentName,  // 支持前端的大写字段名
      Model: model,
      Manufacturer: manufacturer,
      SerialNumber: serialNumber,
      Category: category,
      Specifications: specifications,
      PurchaseDate: purchaseDate,
      PurchasePrice: purchasePrice,
      Supplier: supplier,
      Location: location,
      ResponsiblePerson: responsiblePerson,
      DepartmentID: departmentID,
      Status: status = 'normal',
      CalibrationCycle: calibrationCycle = 365,
      WarrantyPeriod: warrantyPeriod,
      WarrantyExpiry: warrantyExpiry,
      UsageInstructions: usageInstructions,
      SafetyNotes: safetyNotes,
      Remarks: remarks,
      MeasurementRange: measurementRange,  // 新增：量程字段
      Accuracy: accuracy          // 新增：准确度字段
    } = req.body;

    // 验证必填字段 - 修改验证逻辑：出厂编号和管理编号至少有其一
    if (!instrumentName) {
      return res.status(400).json({
        code: 400,
        message: '仪器名称为必填项'
      });
    }

    // 验证出厂编号和管理编号至少有其一
    if (!instrumentCode && !managementCode) {
      return res.status(400).json({
        code: 400,
        message: '出厂编号和管理编号至少需要填写其中一个'
      });
    }

    const pool = await getConnection();

    // 检查编号是否重复 - 修改查询逻辑，只检查非空的编号
    let checkQuery = `SELECT COUNT(*) as count FROM Instruments WHERE IsActive = 1 AND (`;
    const checkConditions = [];
    const checkRequest = pool.request();
    
    if (instrumentCode) {
      checkConditions.push('InstrumentCode = @instrumentCode');
      checkRequest.input('instrumentCode', sql.NVarChar, instrumentCode);
    }
    
    if (managementCode) {
      checkConditions.push('ManagementCode = @managementCode');
      checkRequest.input('managementCode', sql.NVarChar, managementCode);
    }
    
    checkQuery += checkConditions.join(' OR ') + ')';
    
    const checkResult = await checkRequest.query(checkQuery);

    if (checkResult.recordset[0].count > 0) {
      return res.status(400).json({
        code: 400,
        message: '仪器编号或管理编号已存在'
      });
    }

    // 插入新仪器
    const insertQuery = `
      INSERT INTO Instruments (
        InstrumentCode, ManagementCode, InstrumentName, Model, Manufacturer,
        SerialNumber, Category, Specifications, PurchaseDate, PurchasePrice,
        Supplier, Location, ResponsiblePerson, DepartmentID, Status,
        CalibrationCycle, WarrantyPeriod, WarrantyExpiry, UsageInstructions,
        SafetyNotes, Remarks, MeasurementRange, Accuracy, CreatedBy, CreatedAt, UpdatedAt
      ) VALUES (
        @instrumentCode, @managementCode, @instrumentName, @model, @manufacturer,
        @serialNumber, @category, @specifications, @purchaseDate, @purchasePrice,
        @supplier, @location, @responsiblePerson, @departmentID, @status,
        @calibrationCycle, @warrantyPeriod, @warrantyExpiry, @usageInstructions,
        @safetyNotes, @remarks, @measurementRange, @accuracy, @createdBy, GETDATE(), GETDATE()
      );
      SELECT SCOPE_IDENTITY() as id;
    `;

    const request = pool.request()
      .input('instrumentCode', sql.NVarChar, instrumentCode)
      .input('managementCode', sql.NVarChar, managementCode)
      .input('instrumentName', sql.NVarChar, instrumentName)
      .input('model', sql.NVarChar, model)
      .input('manufacturer', sql.NVarChar, manufacturer)
      .input('serialNumber', sql.NVarChar, serialNumber)
      .input('category', sql.NVarChar, category)
      .input('specifications', sql.NVarChar, specifications)
      .input('purchaseDate', sql.Date, purchaseDate)
      .input('purchasePrice', sql.Decimal(12, 2), purchasePrice)
      .input('supplier', sql.NVarChar, supplier)
      .input('location', sql.NVarChar, location)
      .input('responsiblePerson', sql.Int, responsiblePerson)
      .input('departmentID', sql.Int, departmentID)
      .input('status', sql.NVarChar, status)
      .input('calibrationCycle', sql.Int, calibrationCycle)
      .input('warrantyPeriod', sql.Int, warrantyPeriod)
      .input('warrantyExpiry', sql.Date, warrantyExpiry)
      .input('usageInstructions', sql.NVarChar, usageInstructions)
      .input('safetyNotes', sql.NVarChar, safetyNotes)
      .input('remarks', sql.NVarChar, remarks)
      .input('measurementRange', sql.NVarChar, measurementRange)  // 新增：量程参数
      .input('accuracy', sql.NVarChar, accuracy)                  // 新增：准确度参数
      .input('createdBy', sql.Int, req.user.id);

    const result = await request.query(insertQuery);
    const newId = result.recordset[0].id;

    res.json({
      code: 200,
      data: { id: newId },
      message: '创建仪器成功'
    });

  } catch (error) {
    console.error('创建仪器失败:', error);
    res.status(500).json({
      code: 500,
      message: '创建仪器失败',
      error: error.message
    });
  }
});

/**
 * 更新仪器信息
 * PUT /api/instruments/:id
 */
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      InstrumentCode: instrumentCode,  // 支持前端的大写字段名
      ManagementCode: managementCode,  // 支持前端的大写字段名
      InstrumentName: instrumentName,  // 支持前端的大写字段名
      Model: model,
      Manufacturer: manufacturer,
      SerialNumber: serialNumber,
      Category: category,
      Specifications: specifications,
      PurchaseDate: purchaseDate,
      PurchasePrice: purchasePrice,
      Supplier: supplier,
      Location: location,
      ResponsiblePerson: responsiblePerson,
      DepartmentID: departmentID,
      Status: status,
      CalibrationCycle: calibrationCycle,
      WarrantyPeriod: warrantyPeriod,
      WarrantyExpiry: warrantyExpiry,
      UsageInstructions: usageInstructions,
      SafetyNotes: safetyNotes,
      Remarks: remarks,
      MeasurementRange: measurementRange,  // 新增：量程字段
      Accuracy: accuracy          // 新增：准确度字段
    } = req.body;

    const pool = await getConnection();

    // 验证出厂编号和管理编号至少有其一
    if (!instrumentCode && !managementCode) {
      return res.status(400).json({
        code: 400,
        message: '出厂编号和管理编号至少需要填写其中一个'
      });
    }

    // 检查仪器是否存在
    const checkQuery = `SELECT ID FROM Instruments WHERE ID = @id AND IsActive = 1`;
    const checkResult = await pool.request()
      .input('id', sql.Int, id)
      .query(checkQuery);

    if (checkResult.recordset.length === 0) {
      return res.status(404).json({
        code: 404,
        message: '仪器不存在'
      });
    }

    // 检查编号是否重复（排除当前记录）- 修改查询逻辑，只检查非空的编号
    if (instrumentCode || managementCode) {
      const duplicateConditions = [];
      const duplicateRequest = pool.request().input('id', sql.Int, id);
      
      if (instrumentCode) {
        duplicateConditions.push('InstrumentCode = @instrumentCode');
        duplicateRequest.input('instrumentCode', sql.NVarChar, instrumentCode);
      }
      
      if (managementCode) {
        duplicateConditions.push('ManagementCode = @managementCode');
        duplicateRequest.input('managementCode', sql.NVarChar, managementCode);
      }
      
      // 只有在有条件时才构建查询
      if (duplicateConditions.length > 0) {
        const duplicateQuery = `SELECT COUNT(*) as count FROM Instruments WHERE ID != @id AND IsActive = 1 AND (${duplicateConditions.join(' OR ')})`;
        
        const duplicateResult = await duplicateRequest.query(duplicateQuery);

        if (duplicateResult.recordset[0].count > 0) {
          return res.status(400).json({
            code: 400,
            message: '仪器编号或管理编号已存在'
          });
        }
      }
    }

    // 更新仪器信息 - 动态构建SQL语句，只更新有值的字段
    const updateFields = [];
    const updateRequest = pool.request().input('id', sql.Int, id);
    
    if (instrumentCode !== undefined) {
      updateFields.push('InstrumentCode = @instrumentCode');
      updateRequest.input('instrumentCode', sql.NVarChar, instrumentCode || null);
    }
    
    if (managementCode !== undefined) {
      updateFields.push('ManagementCode = @managementCode');
      updateRequest.input('managementCode', sql.NVarChar, managementCode || null);
    }
    
    if (instrumentName !== undefined) {
      updateFields.push('InstrumentName = @instrumentName');
      updateRequest.input('instrumentName', sql.NVarChar, instrumentName);
    }
    
    if (model !== undefined) {
      updateFields.push('Model = @model');
      updateRequest.input('model', sql.NVarChar, model);
    }
    
    if (manufacturer !== undefined) {
      updateFields.push('Manufacturer = @manufacturer');
      updateRequest.input('manufacturer', sql.NVarChar, manufacturer);
    }
    
    if (serialNumber !== undefined) {
      updateFields.push('SerialNumber = @serialNumber');
      updateRequest.input('serialNumber', sql.NVarChar, serialNumber);
    }
    
    if (category !== undefined) {
      updateFields.push('Category = @category');
      updateRequest.input('category', sql.NVarChar, category);
    }
    
    if (specifications !== undefined) {
      updateFields.push('Specifications = @specifications');
      updateRequest.input('specifications', sql.NVarChar, specifications);
    }
    
    if (purchaseDate !== undefined) {
      updateFields.push('PurchaseDate = @purchaseDate');
      updateRequest.input('purchaseDate', sql.Date, purchaseDate);
    }
    
    if (purchasePrice !== undefined) {
      updateFields.push('PurchasePrice = @purchasePrice');
      updateRequest.input('purchasePrice', sql.Decimal(12, 2), purchasePrice);
    }
    
    if (supplier !== undefined) {
      updateFields.push('Supplier = @supplier');
      updateRequest.input('supplier', sql.NVarChar, supplier);
    }
    
    if (location !== undefined) {
      updateFields.push('Location = @location');
      updateRequest.input('location', sql.NVarChar, location);
    }
    
    if (responsiblePerson !== undefined) {
      updateFields.push('ResponsiblePerson = @responsiblePerson');
      updateRequest.input('responsiblePerson', sql.Int, responsiblePerson);
    }
    
    if (departmentID !== undefined) {
      updateFields.push('DepartmentID = @departmentID');
      updateRequest.input('departmentID', sql.Int, departmentID);
    }
    
    if (status !== undefined) {
      updateFields.push('Status = @status');
      updateRequest.input('status', sql.NVarChar, status);
    }
    
    if (calibrationCycle !== undefined) {
      updateFields.push('CalibrationCycle = @calibrationCycle');
      updateRequest.input('calibrationCycle', sql.Int, calibrationCycle);
    }
    
    if (warrantyPeriod !== undefined) {
      updateFields.push('WarrantyPeriod = @warrantyPeriod');
      updateRequest.input('warrantyPeriod', sql.Int, warrantyPeriod);
    }
    
    if (warrantyExpiry !== undefined) {
      updateFields.push('WarrantyExpiry = @warrantyExpiry');
      updateRequest.input('warrantyExpiry', sql.Date, warrantyExpiry);
    }
    
    if (usageInstructions !== undefined) {
      updateFields.push('UsageInstructions = @usageInstructions');
      updateRequest.input('usageInstructions', sql.NVarChar, usageInstructions);
    }
    
    if (safetyNotes !== undefined) {
      updateFields.push('SafetyNotes = @safetyNotes');
      updateRequest.input('safetyNotes', sql.NVarChar, safetyNotes);
    }
    
    if (remarks !== undefined) {
      updateFields.push('Remarks = @remarks');
      updateRequest.input('remarks', sql.NVarChar, remarks);
    }
    
    if (measurementRange !== undefined) {
      updateFields.push('MeasurementRange = @measurementRange');
      updateRequest.input('measurementRange', sql.NVarChar, measurementRange);
    }
    
    if (accuracy !== undefined) {
      updateFields.push('Accuracy = @accuracy');
      updateRequest.input('accuracy', sql.NVarChar, accuracy);
    }
    
    // 总是更新这些字段
    updateFields.push('UpdatedBy = @updatedBy');
    updateFields.push('UpdatedAt = GETDATE()');
    updateRequest.input('updatedBy', sql.Int, req.user.id);
    
    const updateQuery = `
      UPDATE Instruments SET
        ${updateFields.join(',\n        ')}
      WHERE ID = @id
    `;

    await updateRequest.query(updateQuery);

    res.json({
      code: 200,
      message: '更新仪器成功'
    });

  } catch (error) {
    console.error('更新仪器失败:', error);
    res.status(500).json({
      code: 500,
      message: '更新仪器失败',
      error: error.message
    });
  }
});

/**
 * 删除仪器（软删除）
 * DELETE /api/instruments/:id
 */
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const pool = await getConnection();

    // 检查仪器是否存在
    const checkQuery = `SELECT ID, ManagementCode, InstrumentCode FROM Instruments WHERE ID = @id`;
    const checkResult = await pool.request()
      .input('id', sql.Int, id)
      .query(checkQuery);

    if (checkResult.recordset.length === 0) {
      return res.status(404).json({
        code: 404,
        message: '仪器不存在'
      });
    }

    const instrument = checkResult.recordset[0];
    console.log(`物理删除仪器: ID=${id}, ManagementCode=${instrument.ManagementCode}, InstrumentCode=${instrument.InstrumentCode}`);

    // 先删除关联的年度校准计划
    await pool.request()
      .input('instrumentId', sql.Int, id)
      .query(`DELETE FROM AnnualCalibrationPlan WHERE InstrumentID = @instrumentId`);

    // 再删除关联的校准记录
    await pool.request()
      .input('instrumentId', sql.Int, id)
      .query(`DELETE FROM CalibrationResults WHERE InstrumentID = @instrumentId`);

    // 最后物理删除仪器记录
    await pool.request()
      .input('id', sql.Int, id)
      .query(`DELETE FROM Instruments WHERE ID = @id`);

    res.json({
      code: 200,
      message: '删除仪器成功'
    });

  } catch (error) {
    console.error('删除仪器失败:', error);
    res.status(500).json({
      code: 500,
      message: '删除仪器失败',
      error: error.message
    });
  }
});

// =====================================================
// 第三方校准检定结果登记
// =====================================================

// 删除重复的 calibration-results 路由定义 (原第1534行)
// 该路由已移动到 /:id 路由之前以解决路由冲突问题

// =====================================================
// 年度校准计划管理
// =====================================================



/**
 * 获取年度校准计划列表
 * GET /api/instruments/annual-plans
 * 支持分页、搜索、筛选
 */
router.get('/annual-plans', authenticateToken, async (req, res) => {
  try {
    const {
      year = new Date().getFullYear(),
      page = 1,
      size = 20,
      instrumentName,
      managementCode,
      status,
      priority,
      calibrationAgency
    } = req.query;

    const offset = (page - 1) * size;
    const pool = await getConnection();

    // 构建查询条件
    let whereConditions = ['ap.PlanYear = @year'];
    const request = pool.request();
    request.input('year', sql.Int, parseInt(year));

    if (instrumentName) {
      whereConditions.push('i.InstrumentName LIKE @instrumentName');
      request.input('instrumentName', sql.NVarChar, `%${instrumentName}%`);
    }

    if (managementCode) {
      whereConditions.push('i.ManagementCode LIKE @managementCode');
      request.input('managementCode', sql.NVarChar, `%${managementCode}%`);
    }

    if (status) {
      whereConditions.push('ap.Status = @status');
      request.input('status', sql.NVarChar, status);
    }

    if (priority) {
      whereConditions.push('ap.Priority = @priority');
      request.input('priority', sql.NVarChar, priority);
    }

    if (calibrationAgency) {
      whereConditions.push('ap.CalibrationAgency LIKE @calibrationAgency');
      request.input('calibrationAgency', sql.NVarChar, `%${calibrationAgency}%`);
    }

    const whereClause = whereConditions.join(' AND ');

    // 查询总数
    const countQuery = `
      SELECT COUNT(*) as total
      FROM AnnualCalibrationPlan ap
      LEFT JOIN Instruments i ON ap.InstrumentID = i.ID
      WHERE ${whereClause}
    `;

    const countResult = await request.query(countQuery);
    const total = countResult.recordset[0].total;

    // 查询数据
    const dataQuery = `
      SELECT * FROM (
        SELECT 
          ap.ID,
          ap.PlanYear,
          ap.InstrumentID,
          i.InstrumentCode,
          i.ManagementCode,
          i.InstrumentName,
          i.Model,
          i.Manufacturer,
          i.Location,
          d.Name as DepartmentName,
          p.Name as ResponsiblePersonName,
          ap.PlannedDate,
          ap.LastCalibrationDate,
          ap.CalibrationCycle,
          ap.CalibrationAgency,
          ap.EstimatedCost,
          ap.Priority,
          ap.Status,
          ap.ActualDate,
          ap.ActualCost,
          ap.CalibrationResultID,
          cr.CertificateNumber,
          cr.CalibrationResult,
          cr.ExpiryDate,
          ap.Remarks,
          creator.RealName as CreatorName,
          ap.CreatedAt,
          ap.UpdatedAt,
          ROW_NUMBER() OVER (ORDER BY ap.PlannedDate ASC) as RowNum
        FROM AnnualCalibrationPlan ap
        LEFT JOIN Instruments i ON ap.InstrumentID = i.ID
        LEFT JOIN Department d ON i.DepartmentID = d.ID
        LEFT JOIN Person p ON i.ResponsiblePerson = p.ID
        LEFT JOIN CalibrationResults cr ON ap.CalibrationResultID = cr.ID
        LEFT JOIN [User] creator ON ap.CreatedBy = creator.ID
        WHERE ${whereClause}
      ) AS PagedResults
      WHERE RowNum BETWEEN @startRow AND @endRow
    `;

    request.input('startRow', sql.Int, offset + 1);
    request.input('endRow', sql.Int, offset + parseInt(size));

    const dataResult = await request.query(dataQuery);

    res.json({
      code: 200,
      data: {
        list: dataResult.recordset,
        total: total,
        page: parseInt(page),
        size: parseInt(size),
        totalPages: Math.ceil(total / size)
      },
      message: '获取年度校准计划列表成功'
    });

  } catch (error) {
    console.error('获取年度校准计划列表失败:', error);
    res.status(500).json({
      code: 500,
      message: '获取年度校准计划列表失败',
      error: error.message
    });
  }
});

/**
 * 创建年度校准计划
 * POST /api/instruments/annual-plans
 */
router.post('/annual-plans', authenticateToken, async (req, res) => {
  try {
    const {
      planYear,
      instrumentID,
      plannedDate,
      calibrationAgency,
      estimatedCost,
      priority = '中',
      remarks
    } = req.body;

    // 验证必填字段
    if (!planYear || !instrumentID || !plannedDate || !calibrationAgency) {
      return res.status(400).json({
        code: 400,
        message: '请填写所有必填字段'
      });
    }

    const pool = await getConnection();

    // 检查是否已存在同年度同仪器的计划
    const checkQuery = `
      SELECT COUNT(*) as count 
      FROM AnnualCalibrationPlan 
      WHERE PlanYear = @planYear AND InstrumentID = @instrumentID
    `;
    const checkResult = await pool.request()
      .input('planYear', sql.Int, planYear)
      .input('instrumentID', sql.Int, instrumentID)
      .query(checkQuery);

    if (checkResult.recordset[0].count > 0) {
      return res.status(400).json({
        code: 400,
        message: '该仪器在此年度已存在校准计划'
      });
    }

    // 插入年度计划
    const insertQuery = `
      INSERT INTO AnnualCalibrationPlan (
        PlanYear, InstrumentID, PlannedDate, CalibrationAgency,
        EstimatedCost, Priority, Status, Remarks, CreatedBy, CreatedAt, UpdatedAt
      ) VALUES (
        @planYear, @instrumentID, @plannedDate, @calibrationAgency,
        @estimatedCost, @priority, '计划中', @remarks, @createdBy, GETDATE(), GETDATE()
      );
      SELECT SCOPE_IDENTITY() as id;
    `;

    const result = await pool.request()
      .input('planYear', sql.Int, planYear)
      .input('instrumentID', sql.Int, instrumentID)
      .input('plannedDate', sql.Date, plannedDate)
      .input('calibrationAgency', sql.NVarChar, calibrationAgency)
      .input('estimatedCost', sql.Decimal(10, 2), estimatedCost)
      .input('priority', sql.NVarChar, priority)
      .input('remarks', sql.NVarChar, remarks)
      .input('createdBy', sql.Int, req.user.id)
      .query(insertQuery);

    const newId = result.recordset[0].id;

    res.status(201).json({
      code: 201,
      data: { id: newId },
      message: '创建年度校准计划成功'
    });

  } catch (error) {
    console.error('创建年度校准计划失败:', error);
    res.status(500).json({
      code: 500,
      message: '创建年度校准计划失败',
      error: error.message
    });
  }
});

/**
 * 更新年度计划状态
 * PATCH /api/instruments/annual-plans/:id/status
 */
router.patch('/annual-plans/:id/status', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, actualDate, actualCost, calibrationResultID } = req.body;

    const pool = await getConnection();

    const updateQuery = `
      UPDATE AnnualCalibrationPlan SET
        Status = @status,
        ActualDate = @actualDate,
        ActualCost = @actualCost,
        CalibrationResultID = @calibrationResultID,
        UpdatedBy = @updatedBy,
        UpdatedAt = GETDATE()
      WHERE ID = @id
    `;

    await pool.request()
      .input('id', sql.Int, id)
      .input('status', sql.NVarChar, status)
      .input('actualDate', sql.Date, actualDate)
      .input('actualCost', sql.Decimal(10, 2), actualCost)
      .input('calibrationResultID', sql.Int, calibrationResultID)
      .input('updatedBy', sql.Int, req.user.id)
      .query(updateQuery);

    res.json({
      code: 200,
      message: '更新计划状态成功'
    });

  } catch (error) {
    console.error('更新计划状态失败:', error);
    res.status(500).json({
      code: 500,
      message: '更新计划状态失败',
      error: error.message
    });
  }
});

/**
 * 更新年度校准计划
 * PUT /api/instruments/annual-plans/:id
 */
router.put('/annual-plans/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      instrumentID,
      planYear,
      plannedDate,
      calibrationAgency,
      estimatedCost,
      priority,
      remarks
    } = req.body;

    const pool = await getConnection();

    // 检查计划是否存在
    const checkQuery = `SELECT ID FROM AnnualCalibrationPlan WHERE ID = @id`;
    const checkResult = await pool.request()
      .input('id', sql.Int, id)
      .query(checkQuery);

    if (checkResult.recordset.length === 0) {
      return res.status(404).json({
        code: 404,
        message: '计划不存在'
      });
    }

    // 更新计划
    const updateQuery = `
      UPDATE AnnualCalibrationPlan SET
        InstrumentID = @instrumentID,
        PlanYear = @planYear,
        PlannedDate = @plannedDate,
        CalibrationAgency = @calibrationAgency,
        EstimatedCost = @estimatedCost,
        Priority = @priority,
        Remarks = @remarks,
        UpdatedBy = @updatedBy,
        UpdatedAt = GETDATE()
      WHERE ID = @id
    `;

    await pool.request()
      .input('id', sql.Int, id)
      .input('instrumentID', sql.Int, instrumentID)
      .input('planYear', sql.Int, planYear)
      .input('plannedDate', sql.Date, plannedDate)
      .input('calibrationAgency', sql.NVarChar, calibrationAgency || null)
      .input('estimatedCost', sql.Decimal(10, 2), estimatedCost || null)
      .input('priority', sql.NVarChar, priority || '中')
      .input('remarks', sql.NVarChar, remarks || null)
      .input('updatedBy', sql.Int, req.user.id)
      .query(updateQuery);

    res.json({
      code: 200,
      message: '更新年度校准计划成功'
    });

  } catch (error) {
    console.error('更新年度校准计划失败:', error);
    res.status(500).json({
      code: 500,
      message: '更新年度校准计划失败',
      error: error.message
    });
  }
});

/**
 * 删除年度校准计划
 * DELETE /api/instruments/annual-plans/:id
 */
router.delete('/annual-plans/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const pool = await getConnection();

    // 检查计划是否存在
    const checkQuery = `SELECT ID, Status FROM AnnualCalibrationPlan WHERE ID = @id`;
    const checkResult = await pool.request()
      .input('id', sql.Int, id)
      .query(checkQuery);

    if (checkResult.recordset.length === 0) {
      return res.status(404).json({
        code: 404,
        message: '计划不存在'
      });
    }

    // 删除计划
    const deleteQuery = `DELETE FROM AnnualCalibrationPlan WHERE ID = @id`;
    await pool.request()
      .input('id', sql.Int, id)
      .query(deleteQuery);

    res.json({
      code: 200,
      message: '删除年度校准计划成功'
    });

  } catch (error) {
    console.error('删除年度校准计划失败:', error);
    res.status(500).json({
      code: 500,
      message: '删除年度校准计划失败',
      error: error.message
    });
  }
});

/**
 * 删除指定年度的所有校准计划
 * DELETE /api/instruments/annual-plans/year/:year
 */
router.delete('/annual-plans/year/:year', authenticateToken, async (req, res) => {
  try {
    const { year } = req.params;
    const pool = await getConnection();

    // 先查询该年度有多少条计划
    const countResult = await pool.request()
      .input('year', sql.Int, year)
      .query(`SELECT COUNT(*) as count FROM AnnualCalibrationPlan WHERE PlanYear = @year`);
    
    const count = countResult.recordset[0].count;
    
    if (count === 0) {
      return res.json({
        code: 200,
        data: { deletedCount: 0 },
        message: `${year}年度没有校准计划记录`
      });
    }

    // 删除该年度所有计划
    const deleteResult = await pool.request()
      .input('year', sql.Int, year)
      .query(`DELETE FROM AnnualCalibrationPlan WHERE PlanYear = @year`);

    res.json({
      code: 200,
      data: { deletedCount: count },
      message: `成功删除${year}年度的${count}条校准计划`
    });

  } catch (error) {
    console.error('删除年度校准计划失败:', error);
    res.status(500).json({
      code: 500,
      message: '删除年度校准计划失败',
      error: error.message
    });
  }
});

/**
 * 自动生成年度校准计划
 * POST /api/instruments/annual-plans/generate
 * POST /api/instruments/annual-plan/generate (兼容路由)
 * 
 * 业务逻辑：
 * 1. 查询所有正常状态的仪器
 * 2. 获取每个仪器的最新校准记录中的"下次校准日期"（ExpiryDate）
 * 3. 如果"下次校准日期"在目标年度内，则生成该仪器的校准计划
 * 4. 如果"下次校准日期"不在目标年度内，则不生成计划
 * 5. 如果仪器没有校准记录，均视为需要首次校准，生成计划
 */
const generateAnnualPlanHandler = async (req, res) => {
  try {
    const { year } = req.body;
    
    // 验证年度参数
    if (!year) {
      return res.status(400).json({
        code: 400,
        message: '请选择计划年度'
      });
    }
    
    const targetYear = parseInt(year);
    console.log('生成年度计划，目标年度:', targetYear);
    
    const pool = await getConnection();

    // 查询所有正常状态的仪器及其最新校准记录
    const instrumentsQuery = `
      SELECT 
        i.ID,
        i.InstrumentCode,
        i.ManagementCode,
        i.InstrumentName,
        i.CalibrationCycle,
        i.Status,
        cr.CalibrationDate as LastCalibrationDate,
        cr.ExpiryDate as NextCalibrationDate
      FROM Instruments i
      LEFT JOIN (
        SELECT cr1.InstrumentID, cr1.CalibrationDate, cr1.ExpiryDate
        FROM CalibrationResults cr1
        INNER JOIN (
          SELECT InstrumentID, MAX(CalibrationDate) as MaxDate
          FROM CalibrationResults
          GROUP BY InstrumentID
        ) cr2 ON cr1.InstrumentID = cr2.InstrumentID AND cr1.CalibrationDate = cr2.MaxDate
      ) cr ON i.ID = cr.InstrumentID
      WHERE i.IsActive = 1 
        AND (i.Status = 'normal' OR i.Status = '正常' OR i.Status IS NULL)
    `;

    const instrumentsResult = await pool.request().query(instrumentsQuery);
    const allInstruments = instrumentsResult.recordset;
    
    console.log('查询到的仪器总数:', allInstruments.length);

    let createdCount = 0;
    let skippedCount = 0;
    let notInYearCount = 0;

    for (const instrument of allInstruments) {
      // 判断该仪器是否需要在目标年度校准
      let needsCalibrationInTargetYear = false;
      let plannedDate = null;
      let lastCalibrationDate = instrument.LastCalibrationDate ? new Date(instrument.LastCalibrationDate) : null;
      
      // 获取校准周期（月），默认12个月
      const calibrationCycleMonths = instrument.CalibrationCycle || 12;
      
      if (instrument.NextCalibrationDate) {
        // 有下次校准日期，直接使用
        const nextCalDate = new Date(instrument.NextCalibrationDate);
        if (nextCalDate.getFullYear() === targetYear) {
          needsCalibrationInTargetYear = true;
          plannedDate = nextCalDate;
        }
      } else if (lastCalibrationDate) {
        // 有上次校准日期但没有下次校准日期，根据校准周期计算
        const calculatedNextDate = new Date(lastCalibrationDate);
        calculatedNextDate.setMonth(calculatedNextDate.getMonth() + calibrationCycleMonths);
        
        if (calculatedNextDate.getFullYear() === targetYear) {
          needsCalibrationInTargetYear = true;
          plannedDate = calculatedNextDate;
          console.log(`仪器 ${instrument.ManagementCode || instrument.InstrumentCode}: 根据上次校准日期(${lastCalibrationDate.toISOString().split('T')[0]}) + ${calibrationCycleMonths}个月 计算出下次校准日期: ${plannedDate.toISOString().split('T')[0]}`);
        }
      } else {
        // 没有任何校准记录，视为需要首次校准，生成计划
        needsCalibrationInTargetYear = true;
        plannedDate = new Date(targetYear, 2, 15); // 默认设为3月15日
        console.log(`仪器 ${instrument.ManagementCode || instrument.InstrumentCode}: 无校准记录，使用默认日期 ${targetYear}-03-15`);
      }
      
      // 如果不需要在目标年度校准，跳过
      if (!needsCalibrationInTargetYear) {
        notInYearCount++;
        continue;
      }

      // 检查该仪器在目标年度是否已有计划
      const existingCheck = await pool.request()
        .input('year', sql.Int, targetYear)
        .input('instrumentID', sql.Int, instrument.ID)
        .query(`
          SELECT COUNT(*) as count 
          FROM AnnualCalibrationPlan 
          WHERE PlanYear = @year AND InstrumentID = @instrumentID
        `);

      if (existingCheck.recordset[0].count > 0) {
        skippedCount++;
        continue;
      }

      // 创建计划（包含上次校准日期和校准周期）
      await pool.request()
        .input('planYear', sql.Int, targetYear)
        .input('instrumentID', sql.Int, instrument.ID)
        .input('plannedDate', sql.Date, plannedDate)
        .input('lastCalibrationDate', sql.Date, lastCalibrationDate)
        .input('calibrationCycle', sql.Int, calibrationCycleMonths)
        .input('priority', sql.NVarChar, '中')
        .input('status', sql.NVarChar, '计划中')
        .input('createdBy', sql.Int, req.user.id)
        .query(`
          INSERT INTO AnnualCalibrationPlan (
            PlanYear, InstrumentID, PlannedDate, LastCalibrationDate, CalibrationCycle, 
            Priority, Status, CreatedBy, CreatedAt, UpdatedAt
          ) VALUES (
            @planYear, @instrumentID, @plannedDate, @lastCalibrationDate, @calibrationCycle,
            @priority, @status, @createdBy, GETDATE(), GETDATE()
          )
        `);

      createdCount++;
    }

    console.log('生成结果 - 新建:', createdCount, '跳过(已存在):', skippedCount, '不在目标年度:', notInYearCount);

    res.json({
      code: 200,
      data: {
        createdCount,
        skippedCount,
        notInYearCount,
        totalInstruments: allInstruments.length
      },
      message: `年度计划生成完成，新建${createdCount}条，跳过${skippedCount}条（已存在），${notInYearCount}条不在${targetYear}年校准范围内`
    });

  } catch (error) {
    console.error('生成年度校准计划失败:', error);
    res.status(500).json({
      code: 500,
      message: '生成年度校准计划失败',
      error: error.message
    });
  }
};

// 注册生成年度计划路由（两个路径兼容）
router.post('/annual-plans/generate', authenticateToken, generateAnnualPlanHandler);
router.post('/annual-plan/generate', authenticateToken, generateAnnualPlanHandler);

/**
 * 获取年度计划统计信息
 * GET /api/instruments/annual-plans/statistics/:year
 * GET /api/instruments/annual-plan/statistics/:year (兼容路由)
 * 
 * 统计说明：
 * - 需校准仪器：下次校准日期在目标年度内的仪器数量
 * - 已制定计划：目标年度已创建的计划数量
 * - 已完成校准：目标年度已完成的计划数量
 * - 逾期未校准：计划日期已过但未完成的计划数量
 */
const getStatisticsHandler = async (req, res) => {
  try {
    const { year } = req.params;
    const targetYear = parseInt(year);
    const pool = await getConnection();

    // 统计需要校准的仪器数量（所有活跃且状态正常的仪器都需要定期校准）
    const needCalibrationQuery = `
      SELECT COUNT(*) as totalInstruments
      FROM Instruments i
      WHERE i.IsActive = 1 
        AND (i.Status = 'normal' OR i.Status = '正常' OR i.Status IS NULL)
    `;

    const needCalibrationResult = await pool.request()
      .query(needCalibrationQuery);

    // 统计已制定的计划数量
    const planStatsQuery = `
      SELECT 
        COUNT(*) as plannedCount,
        SUM(CASE WHEN Status = '已完成' THEN 1 ELSE 0 END) as completedCount,
        SUM(CASE WHEN Status != '已完成' AND PlannedDate < GETDATE() THEN 1 ELSE 0 END) as overdueCount,
        SUM(EstimatedCost) as totalEstimatedCost,
        SUM(ActualCost) as totalActualCost
      FROM AnnualCalibrationPlan
      WHERE PlanYear = @year
    `;

    const planStatsResult = await pool.request()
      .input('year', sql.Int, targetYear)
      .query(planStatsQuery);

    const stats = planStatsResult.recordset[0];

    res.json({
      code: 200,
      data: {
        totalInstruments: needCalibrationResult.recordset[0].totalInstruments || 0,
        plannedCount: stats.plannedCount || 0,
        completedCount: stats.completedCount || 0,
        overdueCount: stats.overdueCount || 0,
        totalEstimatedCost: stats.totalEstimatedCost || 0,
        totalActualCost: stats.totalActualCost || 0
      },
      message: '获取统计信息成功'
    });

  } catch (error) {
    console.error('获取年度计划统计失败:', error);
    res.status(500).json({
      code: 500,
      message: '获取年度计划统计失败',
      error: error.message
    });
  }
};

// 注册统计信息路由（两个路径兼容）
router.get('/annual-plans/statistics/:year', authenticateToken, getStatisticsHandler);
router.get('/annual-plan/statistics/:year', authenticateToken, getStatisticsHandler);

// =====================================================
// 导出功能
// =====================================================

/**
 * 导出年度检定计划和实施表
 * GET /api/instruments/export/annual-plan/:year
 */
router.get('/export/annual-plan/:year', authenticateToken, async (req, res) => {
  try {
    const { year } = req.params;
    const pool = await getConnection();

    // 查询年度计划数据
    const query = `
      SELECT 
        ap.ID,
        ap.PlanYear,
        i.InstrumentCode,
        i.ManagementCode,
        i.InstrumentName,
        i.Model,
        i.Manufacturer,
        i.Location,
        d.Name as DepartmentName,
        p.Name as ResponsiblePersonName,
        ap.PlannedDate,
        ap.CalibrationAgency,
        ap.EstimatedCost,
        ap.Priority,
        ap.Status,
        ap.ActualDate,
        ap.ActualCost,
        cr.CertificateNumber,
        cr.CalibrationResult,
        cr.ExpiryDate,
        ap.Remarks
      FROM AnnualCalibrationPlan ap
      LEFT JOIN Instruments i ON ap.InstrumentID = i.ID
      LEFT JOIN Department d ON i.DepartmentID = d.ID
      LEFT JOIN Person p ON i.ResponsiblePerson = p.ID
      LEFT JOIN CalibrationResults cr ON ap.CalibrationResultID = cr.ID
      WHERE ap.PlanYear = @year
      ORDER BY ap.PlannedDate ASC
    `;

    const result = await pool.request()
      .input('year', sql.Int, year)
      .query(query);

    // 创建Excel工作簿
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet(`${year}年度检定计划表`);

    // 设置表头
    worksheet.columns = [
      { header: '序号', key: 'index', width: 8 },
      { header: '仪器编号', key: 'instrumentCode', width: 15 },
      { header: '管理编号', key: 'managementCode', width: 15 },
      { header: '仪器名称', key: 'instrumentName', width: 20 },
      { header: '型号', key: 'model', width: 15 },
      { header: '制造商', key: 'manufacturer', width: 15 },
      { header: '存放位置', key: 'location', width: 15 },
      { header: '所属部门', key: 'departmentName', width: 12 },
      { header: '责任人', key: 'responsiblePersonName', width: 10 },
      { header: '计划日期', key: 'plannedDate', width: 12 },
      { header: '校准机构', key: 'calibrationAgency', width: 15 },
      { header: '预估费用', key: 'estimatedCost', width: 10 },
      { header: '优先级', key: 'priority', width: 8 },
      { header: '状态', key: 'status', width: 10 },
      { header: '实际日期', key: 'actualDate', width: 12 },
      { header: '实际费用', key: 'actualCost', width: 10 },
      { header: '证书编号', key: 'certificateNumber', width: 15 },
      { header: '校准结果', key: 'calibrationResult', width: 10 },
      { header: '有效期至', key: 'expiryDate', width: 12 },
      { header: '备注', key: 'remarks', width: 20 }
    ];

    // 表头列数
    const columnCount = worksheet.columns.length;

    // 默认字体样式
    const defaultFont = { name: 'Tahoma', size: 10 };

    // 设置表头样式
    const headerRow = worksheet.getRow(1);
    headerRow.height = 16.5;
    headerRow.alignment = { horizontal: 'center', vertical: 'middle' };
    
    // 遍历标题行的每个单元格设置样式
    for (let col = 1; col <= columnCount; col++) {
      const cell = headerRow.getCell(col);
      cell.font = { ...defaultFont, bold: true, color: { argb: '000000' } };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'F0F0F0' }  // 标题行背景色
      };
    }

    // 添加数据
    result.recordset.forEach((row, index) => {
      const dataRow = worksheet.addRow({
        index: index + 1,
        instrumentCode: row.InstrumentCode || '',
        managementCode: row.ManagementCode || '',
        instrumentName: row.InstrumentName || '',
        model: row.Model || '',
        manufacturer: row.Manufacturer || '',
        location: row.Location || '',
        departmentName: row.DepartmentName || '',
        responsiblePersonName: row.ResponsiblePersonName || '',
        plannedDate: row.PlannedDate ? new Date(row.PlannedDate).toISOString().split('T')[0] : '',
        calibrationAgency: row.CalibrationAgency || '',
        estimatedCost: row.EstimatedCost || '',
        priority: row.Priority || '',
        status: row.Status || '',
        actualDate: row.ActualDate ? new Date(row.ActualDate).toISOString().split('T')[0] : '',
        actualCost: row.ActualCost || '',
        certificateNumber: row.CertificateNumber || '',
        calibrationResult: row.CalibrationResult || '',
        expiryDate: row.ExpiryDate ? new Date(row.ExpiryDate).toISOString().split('T')[0] : '',
        remarks: row.Remarks || ''
      });

      // 设置数据行样式
      dataRow.height = 16.5;
      dataRow.alignment = { vertical: 'middle' };
      
      // 设置字体
      for (let col = 1; col <= columnCount; col++) {
        dataRow.getCell(col).font = defaultFont;
      }
      
      // 隔行填充
      if (index % 2 === 1) {
        for (let col = 1; col <= columnCount; col++) {
          dataRow.getCell(col).fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'F8F8F8' }  // 隔行变色
          };
        }
      }
      
      // 根据状态设置行颜色（状态颜色优先级高于隔行变色）
      if (row.Status === '已完成') {
        for (let col = 1; col <= columnCount; col++) {
          dataRow.getCell(col).fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'C6EFCE' }  // 浅绿色-已完成
          };
        }
      } else if (row.Status === '已逾期') {
        for (let col = 1; col <= columnCount; col++) {
          dataRow.getCell(col).fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFCCCC' }  // 浅红色-已逾期
          };
        }
      }
    });

    // 添加边框
    const borderStyle = {
      top: { style: 'thin', color: { argb: 'A0A0A0' } },
      left: { style: 'thin', color: { argb: 'A0A0A0' } },
      bottom: { style: 'thin', color: { argb: 'A0A0A0' } },
      right: { style: 'thin', color: { argb: 'A0A0A0' } }
    };
    worksheet.eachRow((row, rowNumber) => {
      for (let col = 1; col <= columnCount; col++) {
        const cell = row.getCell(col);
        cell.border = borderStyle;
      }
    });

    // 冻结首行，关闭网格线显示
    worksheet.views = [{ state: 'frozen', ySplit: 1, showGridLines: false }];

    // 设置响应头
    const filename = `${year}年度检定计划表_${new Date().toISOString().split('T')[0]}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);

    // 输出Excel文件
    await workbook.xlsx.write(res);
    res.end();

  } catch (error) {
    console.error('导出年度检定计划失败:', error);
    res.status(500).json({
      code: 500,
      message: '导出年度检定计划失败',
      error: error.message
    });
  }
});

/**
 * 导出仪器台账（含校准信息）
 * GET /api/instruments/export/ledger
 */
router.get('/export/ledger', authenticateToken, async (req, res) => {
  try {
    const pool = await getConnection();
    const { instrumentName, managementCode, category, status } = req.query;

    console.log('开始导出仪器台账, 参数:', { instrumentName, managementCode, category, status });

    // 查询仪器台账数据（含最新校准信息）
    let query = `
      SELECT 
        i.ID,
        i.InstrumentCode,
        i.ManagementCode,
        i.InstrumentName,
        i.Model,
        i.Specifications,
        i.Manufacturer,
        i.SerialNumber,
        i.PurchaseDate,
        i.PurchasePrice,
        i.Location,
        i.Status,
        i.MeasurementRange,
        i.Accuracy,
        i.CalibrationCycle,
        i.Remarks,
        i.Category,
        d.Name as DepartmentName,
        p.Name as ResponsiblePersonName,
        cr.ResultCode as LatestResultCode,
        cr.CalibrationDate as LatestCalibrationDate,
        cr.CalibrationAgency as LatestCalibrationAgency,
        cr.CertificateNumber as LatestCertificateNumber,
        cr.CalibrationResult as LatestCalibrationResult,
        cr.ExpiryDate as LatestExpiryDate,
        cr.NextCalibrationDate
      FROM Instruments i
      LEFT JOIN Department d ON i.DepartmentID = d.ID
      LEFT JOIN Person p ON i.ResponsiblePerson = p.ID
      LEFT JOIN (
        SELECT 
          InstrumentID,
          ResultCode,
          CalibrationDate,
          CalibrationAgency,
          CertificateNumber,
          CalibrationResult,
          ExpiryDate,
          NextCalibrationDate,
          ROW_NUMBER() OVER (PARTITION BY InstrumentID ORDER BY CalibrationDate DESC) as rn
        FROM CalibrationResults
      ) cr ON i.ID = cr.InstrumentID AND cr.rn = 1
      WHERE i.IsActive = 1
    `;

    const request = pool.request();

    // 添加筛选条件
    if (instrumentName) {
      query += ` AND i.InstrumentName LIKE @instrumentName`;
      request.input('instrumentName', sql.NVarChar, `%${instrumentName}%`);
    }
    if (managementCode) {
      query += ` AND i.ManagementCode LIKE @managementCode`;
      request.input('managementCode', sql.NVarChar, `%${managementCode}%`);
    }
    if (category) {
      query += ` AND i.Category = @category`;
      request.input('category', sql.NVarChar, category);
    }
    if (status) {
      query += ` AND i.Status = @status`;
      request.input('status', sql.NVarChar, status);
    }

    query += ` ORDER BY i.ManagementCode ASC, i.InstrumentCode ASC`;

    console.log('执行SQL查询...');
    const result = await request.query(query);
    console.log('查询结果数量:', result.recordset.length);

    // 创建Excel工作簿
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'DMS-QA System';
    workbook.created = new Date();

    // 创建仪器台账工作表
    const worksheet = workbook.addWorksheet('仪器台账', {
      properties: { tabColor: { argb: '4472C4' } }
    });

    // 设置表头（包含仪器基本信息和校准信息）
    worksheet.columns = [
      { header: '序号', key: 'index', width: 6 },
      { header: '管理编号', key: 'managementCode', width: 12 },
      { header: '出厂编号', key: 'instrumentCode', width: 15 },
      { header: '仪器名称', key: 'instrumentName', width: 20 },
      { header: '型号', key: 'model', width: 15 },
      { header: '规格', key: 'specifications', width: 15 },
      { header: '制造商', key: 'manufacturer', width: 18 },
      { header: '出厂序列号', key: 'serialNumber', width: 15 },
      { header: '仪器类别', key: 'categoryName', width: 12 },
      { header: '所属部门', key: 'departmentName', width: 12 },
      { header: '责任人', key: 'responsiblePersonName', width: 10 },
      { header: '存放位置', key: 'location', width: 15 },
      { header: '购置日期', key: 'purchaseDate', width: 12 },
      { header: '购置价格', key: 'price', width: 10 },
      { header: '测量范围', key: 'measurementRange', width: 15 },
      { header: '精度等级', key: 'accuracy', width: 10 },
      { header: '校准周期(月)', key: 'calibrationCycle', width: 12 },
      { header: '仪器状态', key: 'status', width: 10 },
      { header: '最近校准编号', key: 'latestResultCode', width: 15 },
      { header: '最近校准日期', key: 'latestCalibrationDate', width: 12 },
      { header: '校准机构', key: 'latestCalibrationAgency', width: 18 },
      { header: '证书编号', key: 'latestCertificateNumber', width: 18 },
      { header: '校准结论', key: 'latestCalibrationResult', width: 10 },
      { header: '证书有效期', key: 'latestExpiryDate', width: 12 },
      { header: '下次校准日期', key: 'nextCalibrationDate', width: 12 },
      { header: '备注', key: 'remarks', width: 25 }
    ];

    // 表头列数
    const columnCount = worksheet.columns.length;

    // 默认字体样式
    const defaultFont = { name: 'Tahoma', size: 10 };

    // 设置表头样式
    const headerRow = worksheet.getRow(1);
    headerRow.height = 16.5;
    headerRow.alignment = { horizontal: 'center', vertical: 'middle' };
    
    // 遍历标题行的每个单元格设置样式
    for (let col = 1; col <= columnCount; col++) {
      const cell = headerRow.getCell(col);
      cell.font = { ...defaultFont, bold: true, color: { argb: '000000' } };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'F0F0F0' }  // 标题行背景色
      };
    }

    // 状态映射
    const statusMap = {
      'normal': '正常',
      'maintenance': '维修中',
      'retired': '已报废'
    };

    // 添加数据
    result.recordset.forEach((row, index) => {
      const dataRow = worksheet.addRow({
        index: index + 1,
        managementCode: row.ManagementCode || '',
        instrumentCode: row.InstrumentCode || '',
        instrumentName: row.InstrumentName || '',
        model: row.Model || '',
        specifications: row.Specifications || '',
        manufacturer: row.Manufacturer || '',
        serialNumber: row.SerialNumber || '',
        categoryName: row.Category || '',
        departmentName: row.DepartmentName || '',
        responsiblePersonName: row.ResponsiblePersonName || '',
        location: row.Location || '',
        purchaseDate: row.PurchaseDate ? new Date(row.PurchaseDate).toISOString().split('T')[0] : '',
        price: row.PurchasePrice || '',
        measurementRange: row.MeasurementRange || '',
        accuracy: row.Accuracy || '',
        calibrationCycle: row.CalibrationCycle || '',
        status: statusMap[row.Status] || row.Status || '',
        latestResultCode: row.LatestResultCode || '',
        latestCalibrationDate: row.LatestCalibrationDate ? new Date(row.LatestCalibrationDate).toISOString().split('T')[0] : '',
        latestCalibrationAgency: row.LatestCalibrationAgency || '',
        latestCertificateNumber: row.LatestCertificateNumber || '',
        latestCalibrationResult: row.LatestCalibrationResult || '',
        latestExpiryDate: row.LatestExpiryDate ? new Date(row.LatestExpiryDate).toISOString().split('T')[0] : '',
        nextCalibrationDate: row.NextCalibrationDate ? new Date(row.NextCalibrationDate).toISOString().split('T')[0] : '',
        remarks: row.Remarks || ''
      });

      // 设置数据行样式
      dataRow.height = 16.5;
      dataRow.alignment = { vertical: 'middle' };
      
      // 设置字体
      for (let col = 1; col <= columnCount; col++) {
        dataRow.getCell(col).font = defaultFont;
      }
      
      // 隔行填充
      if (index % 2 === 1) {
        for (let col = 1; col <= columnCount; col++) {
          dataRow.getCell(col).fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'F8F8F8' }  // 隔行变色
          };
        }
      }
      
      // 根据状态设置行颜色（优先级高于隔行填充）
      if (row.Status === 'retired') {
        for (let col = 1; col <= columnCount; col++) {
          dataRow.getCell(col).fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFCCCC' }  // 浅红色-已报废
          };
        }
      } else if (row.Status === 'maintenance') {
        for (let col = 1; col <= columnCount; col++) {
          dataRow.getCell(col).fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFFFCC' }  // 浅黄色-维修中
          };
        }
      }

      // 检查校准是否过期，设置提醒颜色
      if (row.LatestExpiryDate) {
        const expiryDate = new Date(row.LatestExpiryDate);
        const today = new Date();
        const daysUntilExpiry = Math.ceil((expiryDate - today) / (1000 * 60 * 60 * 24));
        
        if (daysUntilExpiry < 0) {
          // 已过期 - 红色文字
          dataRow.getCell('latestExpiryDate').font = { ...defaultFont, color: { argb: 'FF0000' }, bold: true };
        } else if (daysUntilExpiry <= 30) {
          // 即将过期（30天内）- 橙色文字
          dataRow.getCell('latestExpiryDate').font = { ...defaultFont, color: { argb: 'FF8C00' }, bold: true };
        }
      }
    });

    // 添加边框
    const borderStyle = {
      top: { style: 'thin', color: { argb: 'A0A0A0' } },
      left: { style: 'thin', color: { argb: 'A0A0A0' } },
      bottom: { style: 'thin', color: { argb: 'A0A0A0' } },
      right: { style: 'thin', color: { argb: 'A0A0A0' } }
    };
    worksheet.eachRow((row, rowNumber) => {
      for (let col = 1; col <= columnCount; col++) {
        const cell = row.getCell(col);
        cell.border = borderStyle;
      }
    });

    // 冻结首行，关闭网格线显示
    worksheet.views = [{ state: 'frozen', ySplit: 1, showGridLines: false }];

    // 设置响应头
    const filename = `仪器台账_${new Date().toISOString().split('T')[0]}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);

    // 输出Excel文件
    await workbook.xlsx.write(res);
    res.end();

  } catch (error) {
    console.error('导出仪器台账失败:', error);
    res.status(500).json({
      code: 500,
      message: '导出仪器台账失败',
      error: error.message
    });
  }
});

// =====================================================
// 批量导入功能
// =====================================================

// Excel文件上传配置
const excelUploadDir = path.join(__dirname, '../uploads/imports');
if (!fs.existsSync(excelUploadDir)) {
  fs.mkdirSync(excelUploadDir, { recursive: true });
}

const excelStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, excelUploadDir);
  },
  filename: function (req, file, cb) {
    const timestamp = Date.now();
    const ext = path.extname(file.originalname);
    cb(null, `import_${timestamp}${ext}`);
  }
});

const excelFilter = (req, file, cb) => {
  const allowedTypes = [
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel'
  ];
  if (allowedTypes.includes(file.mimetype) || 
      file.originalname.endsWith('.xlsx') || 
      file.originalname.endsWith('.xls')) {
    cb(null, true);
  } else {
    cb(new Error('只允许上传 Excel 文件（.xlsx, .xls）'), false);
  }
};

const excelUpload = multer({
  storage: excelStorage,
  fileFilter: excelFilter,
  limits: { fileSize: 20 * 1024 * 1024 } // 20MB
});

/**
 * 下载导入模板
 * GET /api/instruments/import/template
 */
router.get('/import/template', authenticateToken, async (req, res) => {
  try {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('仪器导入模板');

    // 设置列（管理编号和仪器编号至少填一个）
    worksheet.columns = [
      { header: '管理编号', key: 'managementCode', width: 15 },
      { header: '仪器/设备编号', key: 'instrumentCode', width: 18 },
      { header: '仪器名称*', key: 'instrumentName', width: 20 },
      { header: '型号', key: 'model', width: 15 },
      { header: '量程/规格', key: 'measurementRange', width: 15 },
      { header: '精确度', key: 'accuracy', width: 12 },
      { header: '生产厂家', key: 'manufacturer', width: 20 },
      { header: '购入日期', key: 'purchaseDate', width: 12 },
      { header: '使用部门', key: 'department', width: 15 },
      { header: '管理人', key: 'responsiblePerson', width: 12 },
      { header: '校准周期', key: 'calibrationCycle', width: 12 },
      { header: '校准机构', key: 'calibrationAgency', width: 22 },
      { header: '校准日期', key: 'calibrationDate', width: 12 },
      { header: '下次校准日期', key: 'nextCalibrationDate', width: 14 },
      { header: '证书编号', key: 'certificateNumber', width: 18 },
      { header: '备注', key: 'remarks', width: 25 }
    ];

    // 设置表头样式
    const headerRow = worksheet.getRow(1);
    headerRow.height = 20;
    headerRow.eachCell((cell) => {
      cell.font = { bold: true, name: 'Tahoma', size: 10 };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'F0F0F0' }
      };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.border = {
        top: { style: 'thin', color: { argb: 'A0A0A0' } },
        left: { style: 'thin', color: { argb: 'A0A0A0' } },
        bottom: { style: 'thin', color: { argb: 'A0A0A0' } },
        right: { style: 'thin', color: { argb: 'A0A0A0' } }
      };
    });

    // 添加示例数据
    worksheet.addRow({
      managementCode: 'WSJ-01',
      instrumentCode: '23-001',
      instrumentName: '数显温湿度计',
      model: 'HG126D',
      measurementRange: '-10~50°C',
      accuracy: '±0.5°C',
      manufacturer: '某某仪器厂',
      purchaseDate: '2024-01-15',
      department: '检测室',
      responsiblePerson: '张三',
      calibrationCycle: '1年',
      calibrationAgency: '某某检测技术有限公司',
      calibrationDate: '2024-05-20',
      nextCalibrationDate: '2025-05-20',
      certificateNumber: 'KLR202400001',
      remarks: '示例数据，请删除'
    });

    // 添加说明行
    worksheet.addRow({});
    const noteRow = worksheet.addRow(['填写说明：']);
    noteRow.getCell(1).font = { bold: true, color: { argb: 'FF0000' } };
    worksheet.addRow(['1. 管理编号和仪器/设备编号至少填写一项，仪器名称为必填项']);
    worksheet.addRow(['2. 校准周期支持格式：1年、半年、6个月、12等']);
    worksheet.addRow(['3. 日期格式：YYYY-MM-DD 或 YYYYMMDD']);
    worksheet.addRow(['4. 如果管理编号或仪器编号已存在，将更新该仪器信息']);
    worksheet.addRow(['5. 如果有校准信息，将同时创建校准记录']);
    worksheet.addRow(['6. 部门和人员不存在时将自动创建']);

    // 冻结首行
    worksheet.views = [{ state: 'frozen', ySplit: 1 }];

    // 设置响应头
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="instrument_import_template.xlsx"');

    await workbook.xlsx.write(res);
    res.end();

  } catch (error) {
    console.error('生成导入模板失败:', error);
    res.status(500).json({
      code: 500,
      message: '生成导入模板失败',
      error: error.message
    });
  }
});

/**
 * 预览导入数据
 * POST /api/instruments/import/preview
 */
router.post('/import/preview', authenticateToken, excelUpload.single('file'), async (req, res) => {
  try {
    console.log('=== 开始预览导入数据 ===');
    
    if (!req.file) {
      return res.status(400).json({
        code: 400,
        message: '请选择要上传的Excel文件'
      });
    }

    console.log('上传文件:', req.file.path);

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(req.file.path);
    const worksheet = workbook.worksheets[0];

    if (!worksheet) {
      return res.status(400).json({
        code: 400,
        message: 'Excel文件中没有找到工作表'
      });
    }

    console.log('工作表行数:', worksheet.rowCount);

    // 智能检测列头，建立列名到列索引的映射
    const columnMap = {};
    const headerRow = worksheet.getRow(1);
    let actualHeaderRow = 1;
    
    // 检查第一行是否是标题行（如"2025年 腾佳印务检测仪器/设备校准检定计划"）
    const firstCellValue = getCellValue(headerRow.getCell(1));
    console.log('第一行第一列值:', firstCellValue);
    
    if (firstCellValue && (firstCellValue.includes('计划') || firstCellValue.includes('台账') || /^\d{4}年/.test(firstCellValue))) {
      // 第一行是标题，第二行是列头
      actualHeaderRow = 2;
      console.log('检测到标题行，列头在第2行');
    }
    
    // 读取列头行
    const headerRowData = worksheet.getRow(actualHeaderRow);
    console.log('列头行号:', actualHeaderRow);
    
    // 遍历并记录所有列头
    const allHeaders = [];
    headerRowData.eachCell((cell, colNumber) => {
      const headerName = getCellValue(cell);
      allHeaders.push({ col: colNumber, name: headerName });
      
      if (headerName) {
        // 标准化列名映射
        if (headerName.includes('管理编号')) columnMap['managementCode'] = colNumber;
        else if (headerName.includes('设备编号') || headerName.includes('仪器编号') || headerName.includes('仪器/设备编号')) columnMap['instrumentCode'] = colNumber;
        else if (headerName.includes('器具名称') || headerName.includes('仪器名称')) columnMap['instrumentName'] = colNumber;
        else if (headerName.includes('型号')) columnMap['model'] = colNumber;
        else if (headerName.includes('量程') || headerName.includes('规格')) columnMap['measurementRange'] = colNumber;
        else if (headerName.includes('精确度') || headerName.includes('精度')) columnMap['accuracy'] = colNumber;
        else if (headerName.includes('生产厂家') || headerName.includes('厂家')) columnMap['manufacturer'] = colNumber;
        else if (headerName.includes('购入日期') || headerName.includes('采购日期')) columnMap['purchaseDate'] = colNumber;
        else if (headerName.includes('使用部门') || headerName.includes('部门')) columnMap['department'] = colNumber;
        else if (headerName.includes('管理人') || headerName.includes('负责人') || headerName.includes('责任人')) columnMap['responsiblePerson'] = colNumber;
        else if (headerName.includes('校准周期') || headerName.includes('检定周期')) columnMap['calibrationCycle'] = colNumber;
        else if (headerName.includes('校准单位') || headerName.includes('检定单位') || headerName.includes('校准机构')) columnMap['calibrationAgency'] = colNumber;
        else if (headerName.includes('下次') && (headerName.includes('校准') || headerName.includes('检定'))) columnMap['nextCalibrationDate'] = colNumber;
        else if (headerName.includes('校准日期') || headerName.includes('检定日期')) columnMap['calibrationDate'] = colNumber;
        else if (headerName.includes('证书编号')) columnMap['certificateNumber'] = colNumber;
        else if (headerName.includes('备注')) columnMap['remarks'] = colNumber;
      }
    });

    console.log('所有列头:', allHeaders);
    console.log('检测到的列映射:', columnMap);

    const pool = await getConnection();

    // 获取已存在的管理编号
    let existingCodes = new Set();
    try {
      const existingResult = await pool.request().query(`
        SELECT ManagementCode FROM Instruments WHERE IsActive = 1
      `);
      existingCodes = new Set(existingResult.recordset.map(r => r.ManagementCode).filter(Boolean));
    } catch (dbErr) {
      console.warn('获取已存在管理编号失败，将视为全部新增:', dbErr.message);
    }

    // 获取已存在的仪器编号（用于管理编号为空时的匹配）
    let existingInstrumentCodes = new Set();
    try {
      const existingInstrResult = await pool.request().query(`
        SELECT InstrumentCode FROM Instruments WHERE IsActive = 1 AND InstrumentCode IS NOT NULL AND InstrumentCode != ''
      `);
      existingInstrumentCodes = new Set(existingInstrResult.recordset.map(r => r.InstrumentCode).filter(Boolean));
    } catch (dbErr) {
      console.warn('获取已存在仪器编号失败:', dbErr.message);
    }

    // 获取部门列表
    let departments = new Map();
    try {
      const deptResult = await pool.request().query(`
        SELECT ID, Name FROM Department WHERE Status = 1
      `);
      departments = new Map(deptResult.recordset.map(d => [d.Name, d.ID]));
    } catch (dbErr) {
      console.warn('获取部门列表失败:', dbErr.message);
    }

    // 获取人员列表
    let persons = new Map();
    try {
      const personResult = await pool.request().query(`
        SELECT ID, Name FROM Person WHERE IsActive = 1
      `);
      persons = new Map(personResult.recordset.map(p => [p.Name, p.ID]));
    } catch (dbErr) {
      console.warn('获取人员列表失败:', dbErr.message);
    }

    const previewData = [];
    const errors = [];
    let rowIndex = 0;

    // 验证必要列是否存在
    // 验证必要列是否存在：管理编号和仪器编号至少有一个
    if (!columnMap['managementCode'] && !columnMap['instrumentCode']) {
      // 清理临时文件
      fs.unlink(req.file.path, () => {});
      return res.status(400).json({
        code: 400,
        message: 'Excel文件缺少"管理编号"或"仪器编号"列，至少需要其中一列'
      });
    }
    if (!columnMap['instrumentName']) {
      // 清理临时文件
      fs.unlink(req.file.path, () => {});
      return res.status(400).json({
        code: 400,
        message: 'Excel文件缺少"仪器名称/器具名称"列，请检查文件格式'
      });
    }

    worksheet.eachRow((row, rowNumber) => {
      // 跳过标题行和列头行
      if (rowNumber <= actualHeaderRow) return;
      
      const rowData = {
        rowNumber,
        managementCode: columnMap['managementCode'] ? getCellValue(row.getCell(columnMap['managementCode'])) : '',
        instrumentCode: columnMap['instrumentCode'] ? getCellValue(row.getCell(columnMap['instrumentCode'])) : '',
        instrumentName: columnMap['instrumentName'] ? getCellValue(row.getCell(columnMap['instrumentName'])) : '',
        model: columnMap['model'] ? getCellValue(row.getCell(columnMap['model'])) : '',
        measurementRange: columnMap['measurementRange'] ? getCellValue(row.getCell(columnMap['measurementRange'])) : '',
        accuracy: columnMap['accuracy'] ? getCellValue(row.getCell(columnMap['accuracy'])) : '',
        manufacturer: columnMap['manufacturer'] ? getCellValue(row.getCell(columnMap['manufacturer'])) : '',
        purchaseDate: columnMap['purchaseDate'] ? parseDateValue(row.getCell(columnMap['purchaseDate'])) : null,
        department: columnMap['department'] ? getCellValue(row.getCell(columnMap['department'])) : '',
        responsiblePerson: columnMap['responsiblePerson'] ? getCellValue(row.getCell(columnMap['responsiblePerson'])) : '',
        calibrationCycle: columnMap['calibrationCycle'] ? getCellValue(row.getCell(columnMap['calibrationCycle'])) : '',
        calibrationAgency: columnMap['calibrationAgency'] ? getCellValue(row.getCell(columnMap['calibrationAgency'])) : '',
        calibrationDate: columnMap['calibrationDate'] ? parseDateValue(row.getCell(columnMap['calibrationDate'])) : null,
        nextCalibrationDate: columnMap['nextCalibrationDate'] ? parseDateValue(row.getCell(columnMap['nextCalibrationDate'])) : null,
        certificateNumber: columnMap['certificateNumber'] ? getCellValue(row.getCell(columnMap['certificateNumber'])) : '',
        remarks: columnMap['remarks'] ? getCellValue(row.getCell(columnMap['remarks'])) : '',
        status: 'pending',
        errors: [],
        warnings: []
      };

      // 跳过空行或说明行
      if (!rowData.managementCode && !rowData.instrumentCode && !rowData.instrumentName) {
        return;
      }
      if (rowData.managementCode && rowData.managementCode.includes('说明')) {
        return;
      }

      // 数据验证：管理编号和仪器编号二者有其一即可
      const hasIdentifier = rowData.managementCode || rowData.instrumentCode;
      if (!hasIdentifier) {
        rowData.errors.push('管理编号和仪器编号至少需要填写一项');
      }
      if (!rowData.instrumentName) {
        rowData.errors.push('仪器名称为必填项');
      }

      // 检查是否已存在（管理编号和仪器编号都要检查）
      const managementCodeExists = rowData.managementCode && existingCodes.has(rowData.managementCode);
      const instrumentCodeExists = rowData.instrumentCode && existingInstrumentCodes.has(rowData.instrumentCode);
      
      if (managementCodeExists || instrumentCodeExists) {
        rowData.status = 'update';
        if (managementCodeExists && instrumentCodeExists) {
          rowData.warnings.push('管理编号和仪器编号均已存在，将更新数据');
        } else if (managementCodeExists) {
          rowData.warnings.push('该管理编号已存在，将更新数据');
        } else {
          rowData.warnings.push('该仪器编号已存在，将更新数据');
        }
      } else {
        rowData.status = 'new';
      }

      // 校准周期转换
      rowData.calibrationCycleMonths = parseCalibrationCycle(rowData.calibrationCycle);

      // 部门匹配
      if (rowData.department) {
        rowData.departmentId = departments.get(rowData.department);
        if (!rowData.departmentId) {
          rowData.warnings.push(`部门"${rowData.department}"不存在，将自动创建`);
          rowData.newDepartment = true;
        }
      }

      // 责任人匹配
      if (rowData.responsiblePerson) {
        rowData.responsiblePersonId = persons.get(rowData.responsiblePerson);
        if (!rowData.responsiblePersonId) {
          rowData.warnings.push(`人员"${rowData.responsiblePerson}"不存在，将自动创建`);
          rowData.newPerson = true;
        }
      }

      // 有错误则标记为error
      if (rowData.errors.length > 0) {
        rowData.status = 'error';
      }

      // 调试日志：打印校准信息
      console.log(`预览行${rowData.rowNumber}: 管理编号=${rowData.managementCode}, 校准日期=${rowData.calibrationDate}, 校准机构="${rowData.calibrationAgency}"`);

      previewData.push(rowData);
      rowIndex++;
    });

    // 清理临时文件
    fs.unlink(req.file.path, () => {});

    // 统计
    const stats = {
      total: previewData.length,
      newCount: previewData.filter(r => r.status === 'new').length,
      updateCount: previewData.filter(r => r.status === 'update').length,
      errorCount: previewData.filter(r => r.status === 'error').length
    };

    res.json({
      code: 200,
      data: {
        preview: previewData,
        stats
      },
      message: '预览数据解析成功'
    });

  } catch (error) {
    console.error('预览导入数据失败:', error);
    console.error('错误堆栈:', error.stack);
    // 清理临时文件
    if (req.file) {
      fs.unlink(req.file.path, () => {});
    }
    res.status(500).json({
      code: 500,
      message: '预览导入数据失败',
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

/**
 * 执行批量导入
 * POST /api/instruments/import/execute
 */
router.post('/import/execute', authenticateToken, async (req, res) => {
  try {
    console.log('=== 开始执行批量导入 ===');
    const { data } = req.body;

    if (!data || !Array.isArray(data) || data.length === 0) {
      return res.status(400).json({
        code: 400,
        message: '没有要导入的数据'
      });
    }

    console.log('导入数据条数:', data.length);

    const pool = await getConnection();
    const results = {
      success: 0,
      failed: 0,
      updated: 0,
      errors: []
    };

    // 获取现有部门和人员
    const deptResult = await pool.request().query(`SELECT ID, Name FROM Department WHERE Status = 1`);
    const departments = new Map(deptResult.recordset.map(d => [d.Name, d.ID]));

    const personResult = await pool.request().query(`SELECT ID, Name FROM Person WHERE IsActive = 1`);
    const persons = new Map(personResult.recordset.map(p => [p.Name, p.ID]));

    // 辅助函数：安全解析日期
    const safeParseDate = (value) => {
      if (!value) return null;
      if (value instanceof Date) return value;
      const parsed = new Date(value);
      return isNaN(parsed.getTime()) ? null : parsed;
    };

    for (const item of data) {
      // 跳过有错误的行
      if (item.status === 'error') {
        results.failed++;
        results.errors.push({
          row: item.rowNumber,
          managementCode: item.managementCode || '',
          instrumentCode: item.instrumentCode || '',
          identifier: item.managementCode || item.instrumentCode || '无标识',
          error: item.errors.join('; ')
        });
        continue;
      }

      try {
        // 处理部门：如果不存在则创建
        let departmentId = null;
        if (item.department) {
          departmentId = departments.get(item.department);
          if (!departmentId) {
            const deptInsert = await pool.request()
              .input('name', sql.NVarChar, item.department)
              .query(`
                INSERT INTO Department (Name, Status, CreatedAt) 
                OUTPUT INSERTED.ID
                VALUES (@name, 1, GETDATE())
              `);
            departmentId = deptInsert.recordset[0].ID;
            departments.set(item.department, departmentId);
          }
        }

        // 处理责任人：如果不存在则创建
        let responsiblePersonId = null;
        if (item.responsiblePerson) {
          responsiblePersonId = persons.get(item.responsiblePerson);
          if (!responsiblePersonId) {
            const personInsert = await pool.request()
              .input('name', sql.NVarChar, item.responsiblePerson)
              .input('deptId', sql.Int, departmentId)
              .query(`
                INSERT INTO Person (Name, DepartmentID, IsActive) 
                OUTPUT INSERTED.ID
                VALUES (@name, @deptId, 1)
              `);
            responsiblePersonId = personInsert.recordset[0].ID;
            persons.set(item.responsiblePerson, responsiblePersonId);
          }
        }

        // 检查仪器是否已存在（同时检查管理编号和仪器编号）
        let existCheck = { recordset: [] };
        
        // 先用管理编号检查
        if (item.managementCode) {
          existCheck = await pool.request()
            .input('code', sql.NVarChar, item.managementCode)
            .query(`SELECT ID FROM Instruments WHERE ManagementCode = @code AND IsActive = 1`);
        }
        
        // 如果管理编号没找到，再用仪器编号检查
        if (existCheck.recordset.length === 0 && item.instrumentCode) {
          existCheck = await pool.request()
            .input('code', sql.NVarChar, item.instrumentCode)
            .query(`SELECT ID FROM Instruments WHERE InstrumentCode = @code AND IsActive = 1`);
        }

        let instrumentId;

        if (existCheck.recordset.length > 0) {
          // 更新现有仪器
          instrumentId = existCheck.recordset[0].ID;
          const purchaseDateValue = safeParseDate(item.purchaseDate);
          
          await pool.request()
            .input('id', sql.Int, instrumentId)
            .input('instrumentCode', sql.NVarChar, item.instrumentCode || null)
            .input('instrumentName', sql.NVarChar, item.instrumentName)
            .input('model', sql.NVarChar, item.model || null)
            .input('measurementRange', sql.NVarChar, item.measurementRange || null)
            .input('accuracy', sql.NVarChar, item.accuracy || null)
            .input('manufacturer', sql.NVarChar, item.manufacturer || null)
            .input('purchaseDate', sql.Date, purchaseDateValue)
            .input('departmentId', sql.Int, departmentId)
            .input('responsiblePerson', sql.Int, responsiblePersonId)
            .input('calibrationCycle', sql.Int, item.calibrationCycleMonths || null)
            .input('remarks', sql.NVarChar, item.remarks || null)
            .input('updatedBy', sql.Int, req.user.id)
            .query(`
              UPDATE Instruments SET
                InstrumentCode = @instrumentCode,
                InstrumentName = @instrumentName,
                Model = @model,
                MeasurementRange = @measurementRange,
                Accuracy = @accuracy,
                Manufacturer = @manufacturer,
                PurchaseDate = @purchaseDate,
                DepartmentID = @departmentId,
                ResponsiblePerson = @responsiblePerson,
                CalibrationCycle = @calibrationCycle,
                Remarks = @remarks,
                UpdatedAt = GETDATE(),
                UpdatedBy = @updatedBy
              WHERE ID = @id
            `);
          results.updated++;
        } else {
          // 新增仪器
          const purchaseDateValue = safeParseDate(item.purchaseDate);
          
          const insertResult = await pool.request()
            .input('managementCode', sql.NVarChar, item.managementCode || null)
            .input('instrumentCode', sql.NVarChar, item.instrumentCode || null)
            .input('instrumentName', sql.NVarChar, item.instrumentName)
            .input('model', sql.NVarChar, item.model || null)
            .input('measurementRange', sql.NVarChar, item.measurementRange || null)
            .input('accuracy', sql.NVarChar, item.accuracy || null)
            .input('manufacturer', sql.NVarChar, item.manufacturer || null)
            .input('purchaseDate', sql.Date, purchaseDateValue)
            .input('departmentId', sql.Int, departmentId)
            .input('responsiblePerson', sql.Int, responsiblePersonId)
            .input('calibrationCycle', sql.Int, item.calibrationCycleMonths || null)
            .input('remarks', sql.NVarChar, item.remarks || null)
            .input('status', sql.NVarChar, 'normal')
            .input('createdBy', sql.Int, req.user.id)
            .query(`
              INSERT INTO Instruments (
                ManagementCode, InstrumentCode, InstrumentName, Model,
                MeasurementRange, Accuracy, Manufacturer, PurchaseDate,
                DepartmentID, ResponsiblePerson, CalibrationCycle, Remarks,
                Status, IsActive, CreatedAt, CreatedBy
              ) 
              OUTPUT INSERTED.ID
              VALUES (
                @managementCode, @instrumentCode, @instrumentName, @model,
                @measurementRange, @accuracy, @manufacturer, @purchaseDate,
                @departmentId, @responsiblePerson, @calibrationCycle, @remarks,
                @status, 1, GETDATE(), @createdBy
              )
            `);
          instrumentId = insertResult.recordset[0].ID;
          results.success++;
        }

        // 获取校准周期（月），默认12个月
        const calibrationCycleMonths = item.calibrationCycleMonths || 12;
        let calibrationDateValue = null;
        let nextCalibrationDateValue = null;

        // 如果有校准信息，创建校准记录
        console.log(`检查校准信息: 管理编号=${item.managementCode}, 校准日期=${item.calibrationDate}, 校准机构=${item.calibrationAgency}`);
        if (item.calibrationDate && item.calibrationAgency) {
          console.log(`  -> 满足条件，创建校准记录`);
          calibrationDateValue = safeParseDate(item.calibrationDate);
          nextCalibrationDateValue = safeParseDate(item.nextCalibrationDate);
          
          // 如果下次校准日期为空，根据校准日期和校准周期自动计算
          if (!nextCalibrationDateValue && calibrationDateValue) {
            nextCalibrationDateValue = new Date(calibrationDateValue);
            nextCalibrationDateValue.setMonth(nextCalibrationDateValue.getMonth() + calibrationCycleMonths);
            console.log(`自动计算下次校准日期: ${calibrationDateValue.toISOString()} + ${calibrationCycleMonths}个月 = ${nextCalibrationDateValue.toISOString()}`);
          }
          
          // 生成校准记录编号
          const today = new Date();
          const datePrefix = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`;
          const countResult = await pool.request()
            .input('prefix', sql.NVarChar, `CR${datePrefix}%`)
            .query(`SELECT COUNT(*) as count FROM CalibrationResults WHERE ResultCode LIKE @prefix`);
          const seq = (countResult.recordset[0].count || 0) + 1;
          const resultCode = `CR${datePrefix}${String(seq).padStart(3, '0')}`;

          await pool.request()
            .input('resultCode', sql.NVarChar, resultCode)
            .input('instrumentId', sql.Int, instrumentId)
            .input('calibrationDate', sql.Date, calibrationDateValue)
            .input('expiryDate', sql.Date, nextCalibrationDateValue)
            .input('calibrationAgency', sql.NVarChar, item.calibrationAgency)
            .input('certificateNumber', sql.NVarChar, item.certificateNumber || null)
            .input('calibrationResult', sql.NVarChar, '合格')
            .input('createdBy', sql.Int, req.user.id)
            .query(`
              INSERT INTO CalibrationResults (
                ResultCode, InstrumentID, CalibrationDate, ExpiryDate,
                CalibrationAgency, CertificateNumber, CalibrationResult,
                CreatedAt, CreatedBy
              ) VALUES (
                @resultCode, @instrumentId, @calibrationDate, @expiryDate,
                @calibrationAgency, @certificateNumber, @calibrationResult,
                GETDATE(), @createdBy
              )
            `);
        }

        // 为所有仪器自动创建年度校准计划（无论是否有校准记录）
        // 确定计划日期：优先使用下次校准日期，其次使用默认日期（下一年3月15日）
        let planDate = nextCalibrationDateValue;
        if (!planDate) {
          // 没有下次校准日期，使用默认日期（下一年的3月15日）
          const nextYear = new Date().getFullYear() + 1;
          planDate = new Date(nextYear, 2, 15); // 月份从0开始，2表示3月
          console.log(`仪器 ${item.managementCode || item.instrumentCode}: 无校准记录，使用默认计划日期 ${planDate.toISOString().split('T')[0]}`);
        }
        
        const planYear = planDate.getFullYear();
        
        // 检查是否已存在同年度同仪器的计划
        const existingPlan = await pool.request()
          .input('planYear', sql.Int, planYear)
          .input('instrumentId', sql.Int, instrumentId)
          .query(`SELECT ID FROM AnnualCalibrationPlan WHERE PlanYear = @planYear AND InstrumentID = @instrumentId`);
        
        if (existingPlan.recordset.length === 0) {
          await pool.request()
            .input('planYear', sql.Int, planYear)
            .input('instrumentId', sql.Int, instrumentId)
            .input('plannedDate', sql.Date, planDate)
            .input('lastCalibrationDate', sql.Date, calibrationDateValue)
            .input('calibrationAgency', sql.NVarChar, item.calibrationAgency || null)
            .input('calibrationCycle', sql.Int, calibrationCycleMonths)
            .input('priority', sql.NVarChar, '中')
            .input('status', sql.NVarChar, '待校准')
            .input('createdBy', sql.Int, req.user.id)
            .query(`
              INSERT INTO AnnualCalibrationPlan (
                PlanYear, InstrumentID, PlannedDate, LastCalibrationDate,
                CalibrationAgency, CalibrationCycle, Priority, Status,
                CreatedAt, CreatedBy
              ) VALUES (
                @planYear, @instrumentId, @plannedDate, @lastCalibrationDate,
                @calibrationAgency, @calibrationCycle, @priority, @status,
                GETDATE(), @createdBy
              )
            `);
          
          console.log(`创建年度计划: 仪器ID=${instrumentId}, 年度=${planYear}, 计划日期=${planDate.toISOString().split('T')[0]}, 上次校准=${calibrationDateValue ? calibrationDateValue.toISOString().split('T')[0] : '无'}`);
        }

      } catch (itemError) {
        console.error(`导入第${item.rowNumber}行失败:`, itemError.message);
        results.failed++;
        results.errors.push({
          row: item.rowNumber,
          managementCode: item.managementCode || '',
          instrumentCode: item.instrumentCode || '',
          identifier: item.managementCode || item.instrumentCode || '无标识',
          error: itemError.message
        });
      }
    }

    console.log('导入完成:', results);

    res.json({
      code: 200,
      data: results,
      message: `导入完成：新增${results.success}条，更新${results.updated}条，失败${results.failed}条`
    });

  } catch (error) {
    console.error('执行批量导入失败:', error);
    console.error('错误堆栈:', error.stack);
    res.status(500).json({
      code: 500,
      message: '执行批量导入失败',
      error: error.message
    });
  }
});

/**
 * 获取单元格值的辅助函数
 */
function getCellValue(cell) {
  if (!cell || cell.value === null || cell.value === undefined) {
    return '';
  }
  
  // 处理富文本
  if (typeof cell.value === 'object' && cell.value.richText) {
    return cell.value.richText.map(rt => rt.text).join('');
  }
  
  // 处理公式
  if (typeof cell.value === 'object' && cell.value.result !== undefined) {
    return String(cell.value.result);
  }
  
  return String(cell.value).trim();
}

/**
 * 解析日期值的辅助函数
 */
function parseDateValue(cell) {
  if (!cell || cell.value === null || cell.value === undefined) {
    return null;
  }

  let value = cell.value;
  
  // 如果是Date对象，直接返回
  if (value instanceof Date) {
    return value;
  }

  // 转为字符串处理
  const str = String(value).trim();
  if (!str || str === 'NaN') {
    return null;
  }

  // 处理数字格式的日期 (如 20250519)
  if (/^\d{8}$/.test(str)) {
    const year = str.substring(0, 4);
    const month = str.substring(4, 6);
    const day = str.substring(6, 8);
    return new Date(`${year}-${month}-${day}`);
  }

  // 处理浮点数格式的日期 (如 20250519.0)
  if (/^\d{8}\.\d+$/.test(str)) {
    const intPart = str.split('.')[0];
    const year = intPart.substring(0, 4);
    const month = intPart.substring(4, 6);
    const day = intPart.substring(6, 8);
    return new Date(`${year}-${month}-${day}`);
  }

  // 处理标准日期格式
  const parsed = new Date(str);
  if (!isNaN(parsed.getTime())) {
    return parsed;
  }

  return null;
}

/**
 * 解析校准周期的辅助函数
 */
function parseCalibrationCycle(value) {
  if (!value) return null;
  
  const str = String(value).trim();
  
  // "1年" -> 12
  if (str.includes('年')) {
    const num = parseInt(str);
    return isNaN(num) ? 12 : num * 12;
  }
  
  // "半年" -> 6
  if (str === '半年') {
    return 6;
  }
  
  // "6个月" -> 6
  if (str.includes('个月') || str.includes('月')) {
    const num = parseInt(str);
    return isNaN(num) ? null : num;
  }
  
  // 纯数字
  const num = parseInt(str);
  return isNaN(num) ? null : num;
}

// =====================================================
// 辅助功能
// =====================================================

/**
 * 获取没有校准记录的仪器列表（用于校准结果登记）
 * GET /api/instruments/available-for-calibration
 */
/**
 * 获取部门列表
 * GET /api/instruments/departments
 */
router.get('/departments', authenticateToken, async (req, res) => {
  try {
    const pool = await getConnection();

    const query = `
      SELECT ID, Name
      FROM Department
      WHERE IsActive = 1
      ORDER BY Name ASC
    `;

    const result = await pool.request().query(query);

    res.json({
      code: 200,
      data: result.recordset,
      message: '获取部门列表成功'
    });

  } catch (error) {
    console.error('获取部门列表失败:', error);
    res.status(500).json({
      code: 500,
      message: '获取部门列表失败',
      error: error.message
    });
  }
});

/**
 * 获取仪器统计信息
 * GET /api/instruments/statistics
 */
router.get('/statistics', authenticateToken, async (req, res) => {
  try {
    const pool = await getConnection();

    const query = `
      SELECT 
        COUNT(*) as totalInstruments,
        COUNT(CASE WHEN Status = 'normal' OR Status = '正常' THEN 1 END) as normalCount,
        COUNT(CASE WHEN Status = 'calibration' OR Status = '校准中' OR Status = '维修中' THEN 1 END) as calibrationCount,
        COUNT(CASE WHEN Status = 'retired' OR Status = '已报废' THEN 1 END) as retiredCount,
        COUNT(CASE WHEN Status = 'damaged' OR Status = '损坏' THEN 1 END) as damagedCount,
        -- 即将到期的仪器数量（30天内）
        (SELECT COUNT(*) 
         FROM CalibrationResults cr
         INNER JOIN (
           SELECT InstrumentID, MAX(CalibrationDate) as LastCalibrationDate
           FROM CalibrationResults
           GROUP BY InstrumentID
         ) latest ON cr.InstrumentID = latest.InstrumentID AND cr.CalibrationDate = latest.LastCalibrationDate
         WHERE cr.ExpiryDate BETWEEN GETDATE() AND DATEADD(day, 30, GETDATE())
        ) as expiringSoonCount,
        -- 已过期的仪器数量
        (SELECT COUNT(*) 
         FROM CalibrationResults cr
         INNER JOIN (
           SELECT InstrumentID, MAX(CalibrationDate) as LastCalibrationDate
           FROM CalibrationResults
           GROUP BY InstrumentID
         ) latest ON cr.InstrumentID = latest.InstrumentID AND cr.CalibrationDate = latest.LastCalibrationDate
         WHERE cr.ExpiryDate < GETDATE()
        ) as expiredCount
      FROM Instruments
      WHERE IsActive = 1
    `;

    const result = await pool.request().query(query);

    res.json({
      code: 200,
      data: result.recordset[0],
      message: '获取仪器统计信息成功'
    });

  } catch (error) {
    console.error('获取仪器统计信息失败:', error);
    res.status(500).json({
      code: 500,
      message: '获取仪器统计信息失败',
      error: error.message
    });
  }
});

/**
 * 更新校准结果记录
 * PUT /api/instruments/calibration-results/:id
 */
router.put('/calibration-results/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      instrumentID,
      resultCode,           // 添加检定结果编号字段
      calibrationDate,
      calibrationAgency,
      certificateNumber,
      calibrationResult,
      expiryDate,
      nextCalibrationDate,  // 添加下次校准日期字段
      calibrationCost,
      calibrationStandard,
      calibrationData,      // 添加校准数据字段
      issues,               // 添加发现问题字段
      recommendations,      // 添加建议字段
      environmentalConditions,
      calibrationCycle,     // 添加校准周期字段
      remarks,
      certificateFile       // 添加证书文件字段
    } = req.body;

    // 验证必填字段
    if (!instrumentID || !calibrationDate || !calibrationAgency || !certificateNumber || !calibrationResult) {
      return res.status(400).json({
        code: 400,
        message: '请填写所有必填字段'
      });
    }

    const pool = await getConnection();

    // 检查校准结果是否存在
    const checkQuery = `SELECT ID FROM CalibrationResults WHERE ID = @id`;
    const checkResult = await pool.request()
      .input('id', sql.Int, id)
      .query(checkQuery);

    if (checkResult.recordset.length === 0) {
      return res.status(404).json({
        code: 404,
        message: '校准结果记录不存在'
      });
    }

    // 检查仪器是否存在并获取相关信息
    const instrumentCheck = await pool.request()
      .input('instrumentID', sql.Int, instrumentID)
      .query('SELECT ID, InstrumentCode, ManagementCode FROM Instruments WHERE ID = @instrumentID');

    if (instrumentCheck.recordset.length === 0) {
      return res.status(404).json({
        code: 404,
        message: '仪器不存在'
      });
    }

    const instrument = instrumentCheck.recordset[0];

    // 更新校准结果记录
    const updateQuery = `
      UPDATE CalibrationResults SET
        ResultCode = @resultCode,
        InstrumentID = @instrumentID,
        InstrumentCode = @instrumentCode,
        ManagementCode = @managementCode,
        CalibrationDate = @calibrationDate,
        CalibrationAgency = @calibrationAgency,
        CertificateNumber = @certificateNumber,
        CalibrationResult = @calibrationResult,
        ExpiryDate = @expiryDate,
        NextCalibrationDate = @nextCalibrationDate,
        CalibrationCost = @calibrationCost,
        CalibrationStandard = @calibrationStandard,
        CalibrationData = @calibrationData,
        Issues = @issues,
        Recommendations = @recommendations,
        EnvironmentalConditions = @environmentalConditions,
        CalibrationCycle = @calibrationCycle,
        Remarks = @remarks,
        Attachments = @attachments,
        UpdatedAt = GETDATE()
      WHERE ID = @id
    `;

    await pool.request()
      .input('id', sql.Int, id)
      .input('resultCode', sql.NVarChar, resultCode || null)
      .input('instrumentID', sql.Int, instrumentID)
      .input('instrumentCode', sql.NVarChar, instrument.InstrumentCode)
      .input('managementCode', sql.NVarChar, instrument.ManagementCode)
      .input('calibrationDate', sql.DateTime, new Date(calibrationDate))
      .input('calibrationAgency', sql.NVarChar, calibrationAgency)
      .input('certificateNumber', sql.NVarChar, certificateNumber)
      .input('calibrationResult', sql.NVarChar, calibrationResult)
      .input('expiryDate', sql.DateTime, expiryDate ? new Date(expiryDate) : null)
      .input('nextCalibrationDate', sql.DateTime, nextCalibrationDate ? new Date(nextCalibrationDate) : null)
      .input('calibrationCost', sql.Decimal(10, 2), calibrationCost || null)
      .input('calibrationStandard', sql.NVarChar, calibrationStandard || null)
      .input('calibrationData', sql.NVarChar, calibrationData || null)
      .input('issues', sql.NVarChar, issues || null)
      .input('recommendations', sql.NVarChar, recommendations || null)
      .input('environmentalConditions', sql.NVarChar, environmentalConditions || null)
      .input('calibrationCycle', sql.Int, calibrationCycle || null)
      .input('remarks', sql.NVarChar, remarks || null)
      .input('attachments', sql.NVarChar, certificateFile || null)
      .query(updateQuery);

    res.json({
      code: 200,
      message: '更新校准结果记录成功'
    });

  } catch (error) {
    console.error('更新校准结果记录失败:', error);
    res.status(500).json({
      code: 500,
      message: '更新校准结果记录失败',
      error: error.message
    });
  }
});

/**
 * 删除校准检定结果
 * DELETE /api/instruments/calibration-results/:id
 */
router.delete('/calibration-results/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const pool = await getConnection();

    // 检查校准检定结果是否存在
    const checkQuery = `SELECT ID FROM CalibrationResults WHERE ID = @id`;
    const checkResult = await pool.request()
      .input('id', sql.Int, id)
      .query(checkQuery);

    if (checkResult.recordset.length === 0) {
      return res.status(404).json({
        code: 404,
        message: '校准检定结果不存在'
      });
    }

    // 删除校准检定结果
    const deleteQuery = `DELETE FROM CalibrationResults WHERE ID = @id`;
    await pool.request()
      .input('id', sql.Int, id)
      .query(deleteQuery);

    res.json({
      code: 200,
      message: '删除校准检定结果成功'
    });

  } catch (error) {
    console.error('删除校准检定结果失败:', error);
    res.status(500).json({
      code: 500,
      message: '删除校准检定结果失败',
      error: error.message
    });
  }
});

// =====================================================
// 年度计划兼容路由（支持 annual-plan 单数形式）
// =====================================================

/**
 * 获取年度计划列表（兼容路由）
 * GET /api/instruments/annual-plan
 */
router.get('/annual-plan', authenticateToken, async (req, res) => {
  try {
    const {
      year = new Date().getFullYear(),
      page = 1,
      size = 20,
      instrumentName,
      managementCode,
      status,
      priority,
      calibrationAgency
    } = req.query;

    const offset = (page - 1) * size;
    const pool = await getConnection();

    let whereConditions = ['ap.PlanYear = @year'];
    const request = pool.request();
    request.input('year', sql.Int, parseInt(year));

    if (instrumentName) {
      whereConditions.push('i.InstrumentName LIKE @instrumentName');
      request.input('instrumentName', sql.NVarChar, `%${instrumentName}%`);
    }
    if (managementCode) {
      whereConditions.push('i.ManagementCode LIKE @managementCode');
      request.input('managementCode', sql.NVarChar, `%${managementCode}%`);
    }
    if (status) {
      whereConditions.push('ap.Status = @status');
      request.input('status', sql.NVarChar, status);
    }
    if (priority) {
      whereConditions.push('ap.Priority = @priority');
      request.input('priority', sql.NVarChar, priority);
    }
    if (calibrationAgency) {
      whereConditions.push('ap.CalibrationAgency LIKE @calibrationAgency');
      request.input('calibrationAgency', sql.NVarChar, `%${calibrationAgency}%`);
    }

    const whereClause = whereConditions.join(' AND ');

    const countQuery = `
      SELECT COUNT(*) as total FROM AnnualCalibrationPlan ap
      LEFT JOIN Instruments i ON ap.InstrumentID = i.ID
      WHERE ${whereClause}
    `;
    const countResult = await request.query(countQuery);
    const total = countResult.recordset[0].total;

    const dataQuery = `
      SELECT * FROM (
        SELECT 
          ap.ID, ap.PlanYear, ap.InstrumentID,
          i.InstrumentCode, i.ManagementCode, i.InstrumentName, i.Model,
          i.Manufacturer, i.Location, i.CalibrationCycle,
          d.Name as DepartmentName, p.Name as ResponsiblePersonName,
          ap.PlannedDate, ap.CalibrationAgency, ap.EstimatedCost, ap.Priority, ap.Status,
          ap.ActualDate, ap.ActualCost, ap.CalibrationResultID,
          cr.CertificateNumber, cr.CalibrationResult, cr.ExpiryDate,
          ap.Remarks, creator.RealName as CreatorName, ap.CreatedAt, ap.UpdatedAt,
          (SELECT TOP 1 CalibrationDate FROM CalibrationResults WHERE InstrumentID = i.ID ORDER BY CalibrationDate DESC) as LastCalibrationDate,
          ROW_NUMBER() OVER (ORDER BY ap.PlannedDate ASC) as RowNum
        FROM AnnualCalibrationPlan ap
        LEFT JOIN Instruments i ON ap.InstrumentID = i.ID
        LEFT JOIN Department d ON i.DepartmentID = d.ID
        LEFT JOIN Person p ON i.ResponsiblePerson = p.ID
        LEFT JOIN CalibrationResults cr ON ap.CalibrationResultID = cr.ID
        LEFT JOIN [User] creator ON ap.CreatedBy = creator.ID
        WHERE ${whereClause}
      ) AS PagedResults
      WHERE RowNum BETWEEN @startRow AND @endRow
    `;

    request.input('startRow', sql.Int, offset + 1);
    request.input('endRow', sql.Int, offset + parseInt(size));
    const dataResult = await request.query(dataQuery);

    res.json({
      code: 200,
      data: {
        list: dataResult.recordset,
        total: total,
        page: parseInt(page),
        size: parseInt(size),
        totalPages: Math.ceil(total / size)
      },
      message: '获取年度校准计划列表成功'
    });
  } catch (error) {
    console.error('获取年度校准计划列表失败:', error);
    res.status(500).json({ code: 500, message: '获取年度校准计划列表失败', error: error.message });
  }
});

/**
 * 创建年度计划（兼容路由）
 * POST /api/instruments/annual-plan
 */
router.post('/annual-plan', authenticateToken, async (req, res) => {
  try {
    const { planYear, instrumentID, plannedDate, calibrationAgency, estimatedCost, priority = '中', remarks } = req.body;
    if (!planYear || !instrumentID || !plannedDate) {
      return res.status(400).json({ code: 400, message: '请填写必填字段（年度、仪器、计划日期）' });
    }
    const pool = await getConnection();
    
    const checkResult = await pool.request()
      .input('planYear', sql.Int, planYear)
      .input('instrumentID', sql.Int, instrumentID)
      .query('SELECT COUNT(*) as count FROM AnnualCalibrationPlan WHERE PlanYear = @planYear AND InstrumentID = @instrumentID');
    if (checkResult.recordset[0].count > 0) {
      return res.status(400).json({ code: 400, message: '该仪器在此年度已存在校准计划' });
    }

    const result = await pool.request()
      .input('planYear', sql.Int, planYear)
      .input('instrumentID', sql.Int, instrumentID)
      .input('plannedDate', sql.Date, plannedDate)
      .input('calibrationAgency', sql.NVarChar, calibrationAgency || null)
      .input('estimatedCost', sql.Decimal(10, 2), estimatedCost || null)
      .input('priority', sql.NVarChar, priority)
      .input('remarks', sql.NVarChar, remarks || null)
      .input('createdBy', sql.Int, req.user.id)
      .query(`INSERT INTO AnnualCalibrationPlan (PlanYear, InstrumentID, PlannedDate, CalibrationAgency, EstimatedCost, Priority, Status, Remarks, CreatedBy, CreatedAt, UpdatedAt)
              VALUES (@planYear, @instrumentID, @plannedDate, @calibrationAgency, @estimatedCost, @priority, '计划中', @remarks, @createdBy, GETDATE(), GETDATE());
              SELECT SCOPE_IDENTITY() as id;`);

    res.status(201).json({ code: 201, data: { id: result.recordset[0].id }, message: '创建年度校准计划成功' });
  } catch (error) {
    console.error('创建年度校准计划失败:', error);
    res.status(500).json({ code: 500, message: '创建年度校准计划失败', error: error.message });
  }
});

/**
 * 更新年度计划（兼容路由）
 * PUT /api/instruments/annual-plan/:id
 */
router.put('/annual-plan/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { instrumentID, planYear, plannedDate, calibrationAgency, estimatedCost, priority, remarks } = req.body;
    const pool = await getConnection();

    await pool.request()
      .input('id', sql.Int, id)
      .input('instrumentID', sql.Int, instrumentID)
      .input('planYear', sql.Int, planYear)
      .input('plannedDate', sql.Date, plannedDate)
      .input('calibrationAgency', sql.NVarChar, calibrationAgency || null)
      .input('estimatedCost', sql.Decimal(10, 2), estimatedCost || null)
      .input('priority', sql.NVarChar, priority || '中')
      .input('remarks', sql.NVarChar, remarks || null)
      .input('updatedBy', sql.Int, req.user.id)
      .query(`UPDATE AnnualCalibrationPlan SET InstrumentID = @instrumentID, PlanYear = @planYear, PlannedDate = @plannedDate,
              CalibrationAgency = @calibrationAgency, EstimatedCost = @estimatedCost, Priority = @priority, Remarks = @remarks,
              UpdatedBy = @updatedBy, UpdatedAt = GETDATE() WHERE ID = @id`);

    res.json({ code: 200, message: '更新年度校准计划成功' });
  } catch (error) {
    console.error('更新年度校准计划失败:', error);
    res.status(500).json({ code: 500, message: '更新年度校准计划失败', error: error.message });
  }
});

/**
 * 删除年度计划（兼容路由）
 * DELETE /api/instruments/annual-plan/:id
 */
router.delete('/annual-plan/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const pool = await getConnection();
    await pool.request().input('id', sql.Int, id).query('DELETE FROM AnnualCalibrationPlan WHERE ID = @id');
    res.json({ code: 200, message: '删除年度校准计划成功' });
  } catch (error) {
    console.error('删除年度校准计划失败:', error);
    res.status(500).json({ code: 500, message: '删除年度校准计划失败', error: error.message });
  }
});

/**
 * 更新年度计划状态（兼容路由）
 * PATCH /api/instruments/annual-plan/:id/status
 */
router.patch('/annual-plan/:id/status', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, actualDate, actualCost, calibrationResultID } = req.body;
    const pool = await getConnection();

    await pool.request()
      .input('id', sql.Int, id)
      .input('status', sql.NVarChar, status)
      .input('actualDate', sql.Date, actualDate || null)
      .input('actualCost', sql.Decimal(10, 2), actualCost || null)
      .input('calibrationResultID', sql.Int, calibrationResultID || null)
      .input('updatedBy', sql.Int, req.user.id)
      .query(`UPDATE AnnualCalibrationPlan SET Status = @status, ActualDate = @actualDate, ActualCost = @actualCost,
              CalibrationResultID = @calibrationResultID, UpdatedBy = @updatedBy, UpdatedAt = GETDATE() WHERE ID = @id`);

    res.json({ code: 200, message: '更新计划状态成功' });
  } catch (error) {
    console.error('更新计划状态失败:', error);
    res.status(500).json({ code: 500, message: '更新计划状态失败', error: error.message });
  }
});

module.exports = router;