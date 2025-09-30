/**
 * 仪器管理模块路由
 * 
 * 功能说明：
 * 1. 仪器台账的增删改查操作
 * 2. 第三方校准检定结果登记
 * 3. 年度校准计划管理
 * 4. 年度检定计划和实施表导出
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

// =====================================================
// 仪器台账管理
// =====================================================

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
      calibrationResult,
      calibrationAgency,
      startDate,
      endDate
    } = req.query;

    const offset = (page - 1) * size;
    const pool = await getConnection();

    // 构建查询条件
    let whereConditions = ['1=1'];
    const request = pool.request();

    if (instrumentName) {
      whereConditions.push('i.InstrumentName LIKE @instrumentName');
      request.input('instrumentName', sql.NVarChar, `%${instrumentName}%`);
    }

    if (managementCode) {
      whereConditions.push('i.ManagementCode LIKE @managementCode');
      request.input('managementCode', sql.NVarChar, `%${managementCode}%`);
    }

    if (calibrationResult) {
      whereConditions.push('cr.CalibrationResult = @calibrationResult');
      request.input('calibrationResult', sql.NVarChar, calibrationResult);
    }

    if (calibrationAgency) {
      whereConditions.push('cr.CalibrationAgency LIKE @calibrationAgency');
      request.input('calibrationAgency', sql.NVarChar, `%${calibrationAgency}%`);
    }

    if (startDate) {
      whereConditions.push('cr.CalibrationDate >= @startDate');
      request.input('startDate', sql.DateTime, new Date(startDate));
    }

    if (endDate) {
      whereConditions.push('cr.CalibrationDate <= @endDate');
      request.input('endDate', sql.DateTime, new Date(endDate));
    }

    const whereClause = whereConditions.join(' AND ');

    // 查询总数
    const countQuery = `
      SELECT COUNT(*) as total
      FROM CalibrationResults cr
      LEFT JOIN Instruments i ON cr.InstrumentID = i.ID
      WHERE ${whereClause}
    `;

    const countResult = await request.query(countQuery);
    const total = countResult.recordset[0].total;

    // 查询数据
    const dataQuery = `
      SELECT * FROM (
        SELECT 
          cr.ID,
          cr.ResultCode,
          cr.InstrumentID,
          i.InstrumentCode,
          i.ManagementCode,
          i.InstrumentName,
          i.Model,
          i.Manufacturer,
          cr.CalibrationDate,
          cr.CalibrationAgency,
          cr.CertificateNumber,
          cr.CalibrationResult,
          cr.ExpiryDate,
          cr.CalibrationCost,
          cr.CalibrationStandard,
          cr.CalibrationData,
          cr.Issues,
          cr.Recommendations,
          cr.Attachments,
          cr.Remarks,
          creator.RealName as CreatorName,
          cr.CreatedAt,
          cr.UpdatedAt,
          ROW_NUMBER() OVER (ORDER BY cr.CalibrationDate DESC) as RowNum
        FROM CalibrationResults cr
        LEFT JOIN Instruments i ON cr.InstrumentID = i.ID
        LEFT JOIN [User] creator ON cr.CreatedBy = creator.ID
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
      message: '获取校准结果列表成功'
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

/**
 * 创建校准结果记录
 * POST /api/instruments/calibration-results
 */
router.post('/calibration-results', authenticateToken, async (req, res) => {
  try {
    const {
      instrumentID,
      calibrationDate,
      calibrationAgency,
      certificateNumber,
      calibrationResult,
      expiryDate,
      calibrationCost,
      calibrationStandard,
      environmentalConditions,
      remarks
    } = req.body;

    // 验证必填字段
    if (!instrumentID || !calibrationDate || !calibrationAgency || !certificateNumber || !calibrationResult) {
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

    // 插入校准结果记录
    const insertQuery = `
      INSERT INTO CalibrationResults (
        InstrumentID, CalibrationDate, CalibrationAgency, CertificateNumber,
        CalibrationResult, ExpiryDate, CalibrationCost, CalibrationStandard,
        EnvironmentalConditions, Remarks, CreatedBy, CreatedAt
      ) VALUES (
        @instrumentID, @calibrationDate, @calibrationAgency, @certificateNumber,
        @calibrationResult, @expiryDate, @calibrationCost, @calibrationStandard,
        @environmentalConditions, @remarks, @createdBy, GETDATE()
      );
      SELECT SCOPE_IDENTITY() as ID;
    `;

    const result = await pool.request()
      .input('instrumentID', sql.Int, instrumentID)
      .input('calibrationDate', sql.DateTime, new Date(calibrationDate))
      .input('calibrationAgency', sql.NVarChar, calibrationAgency)
      .input('certificateNumber', sql.NVarChar, certificateNumber)
      .input('calibrationResult', sql.NVarChar, calibrationResult)
      .input('expiryDate', sql.DateTime, expiryDate ? new Date(expiryDate) : null)
      .input('calibrationCost', sql.Decimal(10, 2), calibrationCost || null)
      .input('calibrationStandard', sql.NVarChar, calibrationStandard || null)
      .input('environmentalConditions', sql.NVarChar, environmentalConditions || null)
      .input('remarks', sql.NVarChar, remarks || null)
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
      updateRequest.input('instrumentCode', sql.NVarChar, instrumentCode);
    }
    
    if (managementCode !== undefined) {
      updateFields.push('ManagementCode = @managementCode');
      updateRequest.input('managementCode', sql.NVarChar, managementCode);
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

    // 软删除仪器
    const deleteQuery = `
      UPDATE Instruments SET 
        IsActive = 0,
        UpdatedBy = @updatedBy,
        UpdatedAt = GETDATE()
      WHERE ID = @id
    `;

    await pool.request()
      .input('id', sql.Int, id)
      .input('updatedBy', sql.Int, req.user.id)
      .query(deleteQuery);

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
      calibrationResult,
      startDate,
      endDate
    } = req.query;

    const offset = (page - 1) * size;
    const pool = await getConnection();

    // 构建查询条件
    let whereConditions = ['1=1'];
    const request = pool.request();

    if (instrumentName) {
      whereConditions.push('i.InstrumentName LIKE @instrumentName');
      request.input('instrumentName', sql.NVarChar, `%${instrumentName}%`);
    }

    if (managementCode) {
      whereConditions.push('i.ManagementCode LIKE @managementCode');
      request.input('managementCode', sql.NVarChar, `%${managementCode}%`);
    }

    if (calibrationResult) {
      whereConditions.push('cr.CalibrationResult = @calibrationResult');
      request.input('calibrationResult', sql.NVarChar, calibrationResult);
    }

    if (startDate) {
      whereConditions.push('cr.CalibrationDate >= @startDate');
      request.input('startDate', sql.Date, startDate);
    }

    if (endDate) {
      whereConditions.push('cr.CalibrationDate <= @endDate');
      request.input('endDate', sql.Date, endDate);
    }

    const whereClause = whereConditions.join(' AND ');

    // 查询总数
    const countQuery = `
      SELECT COUNT(*) as total
      FROM CalibrationResults cr
      LEFT JOIN Instruments i ON cr.InstrumentID = i.ID
      WHERE ${whereClause}
    `;

    const countResult = await request.query(countQuery);
    const total = countResult.recordset[0].total;

    // 查询数据
    const dataQuery = `
      SELECT * FROM (
        SELECT 
          cr.ID,
          cr.ResultCode,
          cr.InstrumentID,
          i.InstrumentCode,
          i.ManagementCode,
          i.InstrumentName,
          i.Model,
          i.Manufacturer,
          cr.CalibrationDate,
          cr.CalibrationAgency,
          cr.CertificateNumber,
          cr.CalibrationResult,
          cr.ExpiryDate,
          cr.CalibrationCost,
          cr.CalibrationStandard,
          cr.CalibrationData,
          cr.Issues,
          cr.Recommendations,
          cr.Attachments,
          cr.Remarks,
          creator.RealName as CreatorName,
          cr.CreatedAt,
          cr.UpdatedAt,
          ROW_NUMBER() OVER (ORDER BY cr.CalibrationDate DESC) as RowNum
        FROM CalibrationResults cr
        LEFT JOIN Instruments i ON cr.InstrumentID = i.ID
        LEFT JOIN [User] creator ON cr.CreatedBy = creator.ID
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
      message: '获取校准结果列表成功'
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

/**
 * 创建校准结果记录
 * POST /api/instruments/calibration-results
 */
router.post('/calibration-results', authenticateToken, async (req, res) => {
  try {
    const {
      instrumentID,
      calibrationDate,
      calibrationAgency,
      certificateNumber,
      calibrationResult,
      expiryDate,
      calibrationCost,
      calibrationStandard,
      environmentalConditions,
      remarks
    } = req.body;

    // 验证必填字段
    if (!instrumentID || !calibrationDate || !calibrationAgency) {
      return res.status(400).json({
        code: 400,
        message: '仪器、校准日期和校准机构为必填项'
      });
    }

    const pool = await getConnection();

    // 计算到期日期（如果没有提供expiryDate的话）
    let calculatedExpiryDate = expiryDate;
    if (!calculatedExpiryDate && calibrationDate) {
      calculatedExpiryDate = new Date(calibrationDate);
      calculatedExpiryDate.setDate(calculatedExpiryDate.getDate() + (validityPeriod || 365));
    }

    // 插入校准结果
    const insertQuery = `
      INSERT INTO CalibrationResults (
        InstrumentID, CalibrationDate, CalibrationAgency,
        CertificateNumber, CalibrationStandard, CalibrationResult, ValidityPeriod,
        ExpiryDate, CalibrationCost, CalibrationData, Issues, Recommendations,
        Attachments, Remarks, CreatedBy, CreatedAt, UpdatedAt
      ) VALUES (
        @instrumentID, @calibrationDate, @calibrationAgency,
        @certificateNumber, @calibrationStandard, @calibrationResult, @validityPeriod,
        @expiryDate, @calibrationCost, @calibrationData, @issues, @recommendations,
        @attachments, @remarks, @createdBy, GETDATE(), GETDATE()
      );
      SELECT SCOPE_IDENTITY() as id;
    `;

    const result = await pool.request()
      .input('instrumentID', sql.Int, instrumentID)
      .input('calibrationDate', sql.Date, calibrationDate)
      .input('calibrationAgency', sql.NVarChar, calibrationAgency)
      .input('certificateNumber', sql.NVarChar, certificateNumber)
      .input('calibrationStandard', sql.NVarChar, calibrationStandard)
      .input('calibrationResult', sql.NVarChar, calibrationResult)
      .input('validityPeriod', sql.Int, validityPeriod)
      .input('expiryDate', sql.Date, calculatedExpiryDate)
      .input('calibrationCost', sql.Decimal(10, 2), calibrationCost)
      .input('calibrationData', sql.NVarChar, calibrationData)
      .input('issues', sql.NVarChar, issues)
      .input('recommendations', sql.NVarChar, recommendations)
      .input('attachments', sql.NVarChar, attachments)
      .input('remarks', sql.NVarChar, remarks)
      .input('createdBy', sql.Int, req.user.id)
      .query(insertQuery);

    const newId = result.recordset[0].id;

    res.json({
      code: 200,
      data: { id: newId },
      message: '创建校准结果记录成功'
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

    // 设置表头样式
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' }
    };

    // 添加数据
    result.recordset.forEach((row, index) => {
      worksheet.addRow({
        index: index + 1,
        instrumentCode: row.InstrumentCode,
        managementCode: row.ManagementCode,
        instrumentName: row.InstrumentName,
        model: row.Model,
        manufacturer: row.Manufacturer,
        location: row.Location,
        departmentName: row.DepartmentName,
        responsiblePersonName: row.ResponsiblePersonName,
        plannedDate: row.PlannedDate ? row.PlannedDate.toISOString().split('T')[0] : '',
        calibrationAgency: row.CalibrationAgency,
        estimatedCost: row.EstimatedCost,
        priority: row.Priority,
        status: row.Status,
        actualDate: row.ActualDate ? row.ActualDate.toISOString().split('T')[0] : '',
        actualCost: row.ActualCost,
        certificateNumber: row.CertificateNumber,
        calibrationResult: row.CalibrationResult,
        expiryDate: row.ExpiryDate ? row.ExpiryDate.toISOString().split('T')[0] : '',
        remarks: row.Remarks
      });
    });

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

// =====================================================
// 辅助功能
// =====================================================

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
        COUNT(CASE WHEN Status = 'normal' THEN 1 END) as normalCount,
        COUNT(CASE WHEN Status = 'calibration' THEN 1 END) as calibrationCount,
        COUNT(CASE WHEN Status = 'retired' THEN 1 END) as retiredCount,
        COUNT(CASE WHEN Status = 'damaged' THEN 1 END) as damagedCount,
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

module.exports = router;