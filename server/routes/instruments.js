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
      remarks
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
        CalibrationData, Issues, Recommendations, EnvironmentalConditions, CalibrationCycle, Remarks, CreatedBy, CreatedAt
      ) VALUES (
        @resultCode, @instrumentID, @instrumentCode, @managementCode, @calibrationDate, @calibrationAgency, @certificateNumber,
        @calibrationStandard, @calibrationResult, @expiryDate, @nextCalibrationDate, @calibrationCost,
        @calibrationData, @issues, @recommendations, @environmentalConditions, @calibrationCycle, @remarks, @createdBy, GETDATE()
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
        cr.NextCalibrationDate,
        cr.CalibrationCost,
        cr.CalibrationData,
        cr.Issues,
        cr.Recommendations,
        cr.Remarks,
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

    // 设置表头样式 - 只填充有标题的单元格
    const headerRow = worksheet.getRow(1);
    headerRow.height = 25;  // 标题行高度25
    headerRow.alignment = { horizontal: 'center', vertical: 'middle' };
    
    // 遍历标题行的每个单元格设置样式
    for (let col = 1; col <= columnCount; col++) {
      const cell = headerRow.getCell(col);
      cell.font = { bold: true, color: { argb: '000000' } };  // 黑色文字
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'D9D9D9' }  // 浅灰色背景
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
      dataRow.height = 22.5;  // 内容行高度22.5
      dataRow.alignment = { vertical: 'middle' };
      
      // 隔行填充浅灰色（偶数行，比标题行灰色稍浅）
      if (index % 2 === 1) {
        for (let col = 1; col <= columnCount; col++) {
          dataRow.getCell(col).fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'F2F2F2' }  // 更浅的灰色
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
          dataRow.getCell('latestExpiryDate').font = { color: { argb: 'FF0000' }, bold: true };
        } else if (daysUntilExpiry <= 30) {
          // 即将过期（30天内）- 橙色文字
          dataRow.getCell('latestExpiryDate').font = { color: { argb: 'FF8C00' }, bold: true };
        }
      }
    });

    // 添加边框
    worksheet.eachRow((row, rowNumber) => {
      for (let col = 1; col <= columnCount; col++) {
        const cell = row.getCell(col);
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        };
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

module.exports = router;