/**
 * 供应商投诉管理路由
 * 功能：处理供应商投诉相关的API请求
 * 包括投诉记录、处理、改善验证、索赔、返工、退换货、退货等业务
 */

const express = require('express')
const router = express.Router()
const sql = require('mssql')
const { getConnection } = require('../db')
const { authenticateToken } = require('../middleware/auth')
const multer = require('multer')
const XLSX = require('xlsx')
const path = require('path')
const fs = require('fs')

// 配置multer用于文件上传
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, '../uploads/temp');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    cb(null, 'import-' + Date.now() + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB
});

/**
 * 获取供应商投诉列表
 * GET /api/supplier-complaints
 * 支持分页、搜索、筛选
 */
router.get('/', async (req, res) => {
  try {
    const {
      page = 1,
      size = 20,
      keyword = '',
      supplierName = '',
      complaintType = '',
      status = '',
      startDate = '',
      endDate = '',
      hasClaimAmount = '', // 是否有索赔金额
      hasActualClaim = '', // 是否有实际索赔
      // 新增筛选条件
      materialCode = '',
      purchaseOrderNo = '',
      defectCategory = '',
      defectItem = '',
      customerCode = '',
      workOrderNo = ''
    } = req.query
    
    const offset = (page - 1) * size
    const pool = await getConnection()
    
    // 构建查询条件
    let whereConditions = ['sc.Status != 0'] // 排除已删除的记录
    let queryParams = []
    
    if (keyword) {
      whereConditions.push('(sc.ComplaintNo LIKE @keyword OR sc.MaterialName LIKE @keyword OR sc.Description LIKE @keyword)')
      queryParams.push({ name: 'keyword', type: sql.NVarChar(100), value: `%${keyword}%` })
    }

    if (materialCode) {
      whereConditions.push('sc.MaterialCode LIKE @materialCode')
      queryParams.push({ name: 'materialCode', type: sql.NVarChar(100), value: `%${materialCode}%` })
    }

    if (purchaseOrderNo) {
      whereConditions.push('sc.PurchaseOrderNo LIKE @purchaseOrderNo')
      queryParams.push({ name: 'purchaseOrderNo', type: sql.NVarChar(100), value: `%${purchaseOrderNo}%` })
    }

    if (defectCategory) {
      whereConditions.push('sc.DefectCategory = @defectCategory')
      queryParams.push({ name: 'defectCategory', type: sql.NVarChar(100), value: defectCategory })
    }

    if (defectItem) {
      whereConditions.push('sc.DefectItem LIKE @defectItem')
      queryParams.push({ name: 'defectItem', type: sql.NVarChar(200), value: `%${defectItem}%` })
    }

    if (customerCode) {
      whereConditions.push('sc.CustomerCode LIKE @customerCode')
      queryParams.push({ name: 'customerCode', type: sql.NVarChar(50), value: `%${customerCode}%` })
    }

    if (workOrderNo) {
      whereConditions.push('sc.WorkOrderNo LIKE @workOrderNo')
      queryParams.push({ name: 'workOrderNo', type: sql.NVarChar(100), value: `%${workOrderNo}%` })
    }

    if (hasClaimAmount === 'true') {
      whereConditions.push('sc.ClaimAmount > 0')
    }

    if (hasActualClaim === 'true') {
      whereConditions.push('sc.ActualClaim > 0')
    }
    
    if (supplierName) {
      whereConditions.push('sc.SupplierName LIKE @supplierName')
      queryParams.push({ name: 'supplierName', type: sql.NVarChar(100), value: `%${supplierName}%` })
    }
    
    if (complaintType) {
      whereConditions.push('sc.ComplaintType = @complaintType')
      queryParams.push({ name: 'complaintType', type: sql.NVarChar(50), value: complaintType })
    }
    
    if (status) {
      whereConditions.push('sc.ProcessStatus = @status')
      queryParams.push({ name: 'status', type: sql.NVarChar(50), value: status })
    }
    
    if (startDate) {
      whereConditions.push('sc.ComplaintDate >= @startDate')
      queryParams.push({ name: 'startDate', type: sql.DateTime, value: new Date(startDate) })
    }
    
    if (endDate) {
      whereConditions.push('sc.ComplaintDate <= @endDate')
      queryParams.push({ name: 'endDate', type: sql.DateTime, value: new Date(endDate) })
    }
    
    const whereClause = whereConditions.join(' AND ')
    
    // 获取总数
    let countRequest = pool.request()
    queryParams.forEach(param => {
      countRequest.input(param.name, param.type, param.value)
    })
    
    const countResult = await countRequest.query(`
      SELECT COUNT(*) as total
      FROM SupplierComplaints sc
      WHERE ${whereClause}
    `)
    
    const total = countResult.recordset[0].total
    
    // 获取分页数据
    let dataRequest = pool.request()
    queryParams.forEach(param => {
      dataRequest.input(param.name, param.type, param.value)
    })
    dataRequest.input('offset', sql.Int, offset)
    dataRequest.input('size', sql.Int, parseInt(size))
    
    const dataResult = await dataRequest.query(`
      SELECT 
        ID,
        ComplaintNo,
        ComplaintDate,
        SupplierName,
        MaterialName,
        MaterialCode,
        MaterialSpecification,
        MaterialUnit,
        CustomerCode,
        ProductCode,
        CPO,
        ProductQuantity,
        ProductUnit,
        DefectQuantity,
        DefectCategory,
        DefectItem,
        DefectCauseAnalysis,
        FeedbackUnit,
        Inspector,
        AbnormalDisposal,
        ComplaintDocument,
        ReplyDate,
        ImprovementEffectEvaluation,
        ActualClaim,
        QA,
        Remarks,
        PurchaseOrderNo,
        IncomingDate,
        BatchQuantity,
        InspectionDate,
        WorkOrderNo,
        SampleQuantity,
        AttachedImages,
        IQCResult,
        ComplaintType,
        UrgencyLevel,
        Description,
        Quantity,
        UnitPrice,
        TotalAmount,
        ProcessStatus,
        ProcessResult,
        InitiatedBy,
        ExpectedSolution,
        SolutionDescription,
        VerificationResult,
        ClaimAmount,
        ActualLoss,
        CompensationAmount,
        ReworkCost,
        ReplacementCost,
        ReturnQuantity,
        ReturnAmount,
        FollowUpActions,
        PreventiveMeasures,
        SupplierResponse,
        CompletedDate,
        ClosedDate,
        CreatedBy,
        CreatedAt,
        UpdatedAt,
        RowNum
      FROM (
        SELECT 
          sc.ID,
          sc.ComplaintNo,
          sc.ComplaintDate,
          sc.SupplierName,
          sc.MaterialName,
          sc.MaterialCode,
          sc.MaterialSpecification,
          sc.MaterialUnit,
          sc.CustomerCode,
          sc.ProductCode,
          sc.CPO,
          sc.ProductQuantity,
          sc.ProductUnit,
          sc.DefectQuantity,
          sc.DefectCategory,
          sc.DefectItem,
          sc.DefectCauseAnalysis,
          sc.FeedbackUnit,
          sc.Inspector,
          sc.AbnormalDisposal,
          sc.ComplaintDocument,
          sc.ReplyDate,
          sc.ImprovementEffectEvaluation,
          sc.ActualClaim,
          sc.QA,
          sc.Remarks,
          sc.PurchaseOrderNo,
          sc.IncomingDate,
          sc.BatchQuantity,
          sc.InspectionDate,
          sc.WorkOrderNo,
          sc.SampleQuantity,
          sc.AttachedImages,
          sc.IQCResult,
          sc.ComplaintType,
          sc.UrgencyLevel,
          sc.Description,
          sc.Quantity,
          sc.UnitPrice,
          sc.TotalAmount,
          sc.ProcessStatus,
          sc.ProcessResult,
          sc.InitiatedBy,
          sc.ExpectedSolution,
          sc.SolutionDescription,
          sc.VerificationResult,
          sc.ClaimAmount,
          sc.ActualLoss,
          sc.CompensationAmount,
          sc.ReworkCost,
          sc.ReplacementCost,
          sc.ReturnQuantity,
          sc.ReturnAmount,
          sc.FollowUpActions,
          sc.PreventiveMeasures,
          sc.SupplierResponse,
          sc.CompletedDate,
          sc.ClosedDate,
          sc.CreatedBy,
          sc.CreatedAt,
          sc.UpdatedAt,
          ROW_NUMBER() OVER (ORDER BY sc.ComplaintDate DESC, sc.CreatedAt DESC) as RowNum
        FROM SupplierComplaints sc
        WHERE ${whereClause}
      ) AS PagedResults
      WHERE RowNum > @offset AND RowNum <= (@offset + @size)
    `)
    
    res.json({
      success: true,
      data: {
        list: dataResult.recordset,
        total,
        page: parseInt(page),
        size: parseInt(size),
        pages: Math.ceil(total / size)
      }
    })
  } catch (error) {
    console.error('获取供应商投诉列表失败:', error)
    res.status(500).json({
      success: false,
      message: '获取供应商投诉列表失败',
      error: error.message
    })
  }
})

/**
 * 预生成投诉编号
 * GET /api/supplier-complaints/generate-complaint-no
 */
router.get('/generate-complaint-no', async (req, res) => {
  try {
    const pool = await getConnection()
    
    // 生成投诉编号：MC-TJ + yymm + 000（流水号每月重置）
    const today = new Date()
    const year = today.getFullYear().toString().slice(-2) // 获取年份后两位
    const month = (today.getMonth() + 1).toString().padStart(2, '0') // 获取月份，补零
    const yearMonth = year + month // yymm格式
    
    // 获取当月的投诉序号（每月重置），确保流水号唯一性
    let sequence = 1
    let complaintNo = ''
    let isUnique = false
    
    // 循环查找可用的流水号，确保不重复
    while (!isUnique && sequence <= 999) {
      const seqStr = sequence.toString().padStart(3, '0')
      complaintNo = `MC-TJ${yearMonth}${seqStr}`
      
      // 检查该编号是否已存在
      const checkResult = await pool.request()
        .input('complaintNo', sql.NVarChar(50), complaintNo)
        .query(`
          SELECT COUNT(*) as count
          FROM SupplierComplaints
          WHERE ComplaintNo = @complaintNo
        `)
      
      if (checkResult.recordset[0].count === 0) {
        isUnique = true
      } else {
        sequence++
      }
    }
    
    // 如果所有流水号都被占用，返回错误
    if (!isUnique) {
      return res.status(500).json({
        success: false,
        message: '当月投诉编号已达上限（999），请联系管理员'
      })
    }
    
    res.json({
      success: true,
      data: { complaintNo }
    })
  } catch (error) {
    console.error('生成投诉编号失败:', error)
    res.status(500).json({
      success: false,
      message: '生成投诉编号失败',
      error: error.message
    })
  }
})

/**
 * 获取供应商列表（用于下拉选择）
 * GET /api/supplier-complaints/suppliers
 */
router.get('/suppliers', async (req, res) => {
  try {
    const pool = await getConnection()
    
    const result = await pool.request().query(`
      SELECT DISTINCT SupplierName
      FROM SupplierComplaints
      WHERE Status != 0 AND SupplierName IS NOT NULL AND SupplierName != ''
      ORDER BY SupplierName
    `)
    
    res.json({
      success: true,
      data: result.recordset.map(item => item.SupplierName)
    })
  } catch (error) {
    console.error('获取供应商列表失败:', error)
    res.status(500).json({
      success: false,
      message: '获取供应商列表失败',
      error: error.message
    })
  }
})

/**
 * 获取不重复的不良类别和不良项（包含级联关系）
 * GET /api/supplier-complaints/distinct-values
 */
router.get('/distinct-values', async (req, res) => {
  try {
    const pool = await getConnection()

    // 查询不良类别和不良项的组合，用于前端建立级联关系
    // 不再强制要求两者都非空，以确保能获取到所有存在的类别和不良项
    const relationResult = await pool.request().query(`
      SELECT DISTINCT DefectCategory, DefectItem
      FROM SupplierComplaints
      WHERE Status != 0 
      ORDER BY DefectCategory, DefectItem
    `)

    res.json({
      success: true,
      data: relationResult.recordset
    })
  } catch (error) {
    console.error('获取不重复值失败:', error)
    res.status(500).json({
      success: false,
      message: '获取不重复值失败',
      error: error.message
    })
  }
})

/**
 * 获取表字段信息
 * GET /api/supplier-complaints/table-fields
 */
router.get('/table-fields', async (req, res) => {
  try {
    const pool = await getConnection()
    
    // 查询表字段信息
    const result = await pool.request().query(`
      SELECT 
        COLUMN_NAME as fieldName,
        DATA_TYPE as dataType,
        IS_NULLABLE as isNullable,
        COLUMN_DEFAULT as defaultValue,
        CHARACTER_MAXIMUM_LENGTH as maxLength
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'SupplierComplaints'
        AND COLUMN_NAME NOT IN ('CreatedBy', 'CreatedAt', 'UpdatedBy', 'UpdatedAt', 'Status', 'ID')
      ORDER BY ORDINAL_POSITION
    `)
    
    // 字段中文名称映射
    const fieldLabels = {
      'ComplaintNo': '投诉编号',
      'ComplaintDate': '投诉日期',
      'SupplierName': '供应商名称',
      'MaterialName': '材料名称',
      'MaterialCode': '材料编号',
      'ComplaintType': '投诉类型',
      'Description': '问题描述',
      'Quantity': '问题数量',
      'UnitPrice': '单价',
      'TotalAmount': '总金额',
      'UrgencyLevel': '紧急程度',
      'ExpectedSolution': '期望解决方案',
      'ProcessStatus': '处理状态',
      'ProcessResult': '处理结果',
      'SolutionDescription': '解决方案描述',
      'VerificationResult': '验证结果',
      'ClaimAmount': '索赔金额',
      'ActualLoss': '实际损失',
      'CompensationAmount': '赔偿金额',
      'ReworkCost': '返工成本',
      'ReplacementCost': '更换成本',
      'ReturnQuantity': '退货数量',
      'ReturnAmount': '退货金额',
      'FollowUpActions': '后续行动',
      'PreventiveMeasures': '预防措施',
      'SupplierResponse': '供应商回复',
      'AttachmentPaths': '附件路径',
      'CompletedDate': '完成日期',
      'ClosedDate': '关闭日期',
      'PurchaseOrderNo': '采购单号',
      'IncomingDate': '来料日期',
      'BatchQuantity': '批量数量',
      'InspectionDate': '检验日期',
      'WorkOrderNo': '使用工单',
      'SampleQuantity': '抽检数量',
      'AttachedImages': '附图',
      'IQCResult': 'IQC判定',
      'InitiatedBy': '发起人'
    }
    
    // 格式化字段信息
    const fields = result.recordset.map(field => ({
      key: field.fieldName,
      label: fieldLabels[field.fieldName] || field.fieldName,
      dataType: field.dataType,
      isNullable: field.isNullable === 'YES',
      maxLength: field.maxLength
    }))
    
    res.json({
      success: true,
      data: fields
    })
  } catch (error) {
    console.error('获取表字段信息失败:', error)
    res.status(500).json({
      success: false,
      message: '获取表字段信息失败',
      error: error.message
    })
  }
})

/**
 * 获取投诉统计数据
 * GET /api/supplier-complaints/statistics
 * 注意：必须放在 /:id 路由之前，否则会被参数化路由拦截
 */
router.get('/statistics', async (req, res) => {
  try {
    const { startDate, endDate } = req.query
    const pool = await getConnection()
    
    let dateCondition = ''
    let queryParams = []
    
    if (startDate && endDate) {
      dateCondition = 'AND ComplaintDate BETWEEN @startDate AND @endDate'
      queryParams.push(
        { name: 'startDate', type: sql.DateTime, value: new Date(startDate) },
        { name: 'endDate', type: sql.DateTime, value: new Date(endDate) }
      )
    }
    
    let request = pool.request()
    queryParams.forEach(param => {
      request.input(param.name, param.type, param.value)
    })
    
    const result = await request.query(`
      SELECT 
        COUNT(*) as totalComplaints,
        SUM(CASE WHEN ProcessStatus = 'pending' OR ProcessStatus = '待处理' THEN 1 ELSE 0 END) as pendingCount,
        SUM(CASE WHEN ProcessStatus = 'processing' OR ProcessStatus = '处理中' THEN 1 ELSE 0 END) as processingCount,
        SUM(CASE WHEN ProcessStatus = 'completed' OR ProcessStatus = '已完成' THEN 1 ELSE 0 END) as completedCount,
        SUM(CASE WHEN ProcessStatus = 'closed' OR ProcessStatus = '已关闭' THEN 1 ELSE 0 END) as closedCount,
        ISNULL(SUM(TotalAmount), 0) as totalAmount,
        ISNULL(SUM(ClaimAmount), 0) as totalClaimAmount,
        ISNULL(SUM(ActualClaim), 0) as totalActualClaim,
        ISNULL(AVG(TotalAmount), 0) as avgAmount
      FROM SupplierComplaints
      WHERE Status != 0 ${dateCondition}
    `)
    
    res.json({
      success: true,
      data: result.recordset[0]
    })
  } catch (error) {
    console.error('获取投诉统计数据失败:', error)
    res.status(500).json({
      success: false,
      message: '获取投诉统计数据失败',
      error: error.message
    })
  }
})

/**
 * 获取人员列表（用于下拉选择）
 * GET /api/supplier-complaints/persons
 * 注意：必须放在 /:id 路由之前
 */
router.get('/persons', async (req, res) => {
  try {
    const pool = await getConnection()
    
    // 从Person表获取在职人员列表
    const result = await pool.request().query(`
      SELECT ID as id, Name as name, Department as department, Position as position
      FROM Person
      WHERE Status = 1
      ORDER BY Department, Name
    `)
    
    res.json({
      success: true,
      data: result.recordset
    })
  } catch (error) {
    console.error('获取人员列表失败:', error)
    // 如果Person表不存在或查询失败，返回空数组而不是错误
    res.json({
      success: true,
      data: []
    })
  }
})

/**
 * 获取单个供应商投诉详情
 * GET /api/supplier-complaints/:id
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params
    const pool = await getConnection()
    
    const result = await pool.request()
      .input('id', sql.Int, parseInt(id))
      .query(`
        SELECT 
          sc.*,
          u1.Username as CreatedByName,
          u2.Username as UpdatedByName
        FROM SupplierComplaints sc
        LEFT JOIN [User] u1 ON sc.CreatedBy = u1.ID
        LEFT JOIN [User] u2 ON sc.UpdatedBy = u2.ID
        WHERE sc.ID = @id AND sc.Status != 0
      `)
    
    if (result.recordset.length === 0) {
      return res.status(404).json({
        success: false,
        message: '投诉记录不存在'
      })
    }
    
    res.json({
      success: true,
      data: result.recordset[0]
    })
  } catch (error) {
    console.error('获取供应商投诉详情失败:', error)
    res.status(500).json({
      success: false,
      message: '获取供应商投诉详情失败',
      error: error.message
    })
  }
})

/**
 * 创建供应商投诉记录
 * POST /api/supplier-complaints
 */
router.post('/', async (req, res) => {
  try {
    const {
      supplierName,
      materialName,
      materialCode,
      materialSpecification,
      materialUnit,
      purchaseOrderNo,
      incomingDate,
      batchQuantity,
      inspectionDate,
      workOrderNo,
      customerCode,
      productCode,
      cpo,
      productQuantity,
      productUnit,
      sampleQuantity,
      defectQuantity,
      defectCategory,
      defectItem,
      defectCauseAnalysis,
      attachedImages,
      feedbackUnit,
      inspector,
      iqcResult,
      abnormalDisposal,
      complaintDocument,
      replyDate,
      improvementEffectEvaluation,
      claimAmount,
      actualClaim,
      qa,
      remarks,
      complaintType,
      description,
      quantity,
      unitPrice,
      initiatedBy,
      urgencyLevel = 'medium',
      expectedSolution,
      processResult,
      verificationResult
    } = req.body
    
    // 验证必填字段
    if (!supplierName || !materialName || !complaintType || !description) {
      return res.status(400).json({
        success: false,
        message: '请填写必填字段：供应商名称、材料名称、投诉类型、问题描述'
      })
    }
    
    const pool = await getConnection()
    
    // 生成投诉编号：MC-TJ + yymm + 000（流水号每月重置）
    const today = new Date()
    const year = today.getFullYear().toString().slice(-2) // 获取年份后两位
    const month = (today.getMonth() + 1).toString().padStart(2, '0') // 获取月份，补零
    const yearMonth = year + month // yymm格式
    
    // 获取当月的投诉序号（每月重置），确保流水号唯一性
    let sequence = 1
    let complaintNo = ''
    let isUnique = false
    
    // 循环查找可用的流水号，确保不重复
    while (!isUnique && sequence <= 999) {
      const seqStr = sequence.toString().padStart(3, '0')
      complaintNo = `MC-TJ${yearMonth}${seqStr}`
      
      // 检查该编号是否已存在
      const checkResult = await pool.request()
        .input('complaintNo', sql.NVarChar(50), complaintNo)
        .query(`
          SELECT COUNT(*) as count
          FROM SupplierComplaints
          WHERE ComplaintNo = @complaintNo
        `)
      
      if (checkResult.recordset[0].count === 0) {
        isUnique = true
      } else {
        sequence++
      }
    }
    
    // 如果所有流水号都被占用，抛出错误
    if (!isUnique) {
      return res.status(500).json({
        success: false,
        message: '当月投诉编号已达上限（999），请联系管理员'
      })
    }
    
    // 计算总金额
    const totalAmount = quantity && unitPrice ? quantity * unitPrice : 0
    
    // 插入投诉记录
    const result = await pool.request()
      .input('complaintNo', sql.NVarChar(50), complaintNo)
      .input('complaintDate', sql.DateTime, today)
      .input('supplierName', sql.NVarChar(200), supplierName)
      .input('materialName', sql.NVarChar(200), materialName)
      .input('materialCode', sql.NVarChar(100), materialCode || '')
      .input('materialSpecification', sql.NVarChar(200), materialSpecification || '')
      .input('materialUnit', sql.NVarChar(20), materialUnit || '')
      .input('purchaseOrderNo', sql.NVarChar(100), purchaseOrderNo || '')
      .input('incomingDate', sql.DateTime, incomingDate || null)
      .input('batchQuantity', sql.Decimal(18, 2), batchQuantity || 0)
      .input('inspectionDate', sql.DateTime, inspectionDate || null)
      .input('workOrderNo', sql.NVarChar(100), workOrderNo || '')
      .input('customerCode', sql.NVarChar(50), customerCode || '')
      .input('productCode', sql.NVarChar(100), productCode || '')
      .input('cpo', sql.NVarChar(100), cpo || '')
      .input('productQuantity', sql.Decimal(18, 2), productQuantity || 0)
      .input('productUnit', sql.NVarChar(20), productUnit || '')
      .input('sampleQuantity', sql.Decimal(18, 2), sampleQuantity || 0)
      .input('defectQuantity', sql.Decimal(18, 2), defectQuantity || 0)
      .input('defectCategory', sql.NVarChar(100), defectCategory || '')
      .input('defectItem', sql.NVarChar(200), defectItem || '')
      .input('defectCauseAnalysis', sql.NText, defectCauseAnalysis || '')
      .input('attachedImages', sql.NText, attachedImages || '')
      .input('feedbackUnit', sql.NVarChar(100), feedbackUnit || '')
      .input('inspector', sql.NVarChar(50), inspector || '')
      .input('iqcResult', sql.NVarChar(50), iqcResult || '')
      .input('abnormalDisposal', sql.NText, abnormalDisposal || '')
      .input('complaintDocument', sql.NText, complaintDocument || '')
      .input('replyDate', sql.DateTime, replyDate || null)
      .input('improvementEffectEvaluation', sql.NText, improvementEffectEvaluation || '')
      .input('claimAmount', sql.Decimal(18, 2), claimAmount || 0)
      .input('actualClaim', sql.Decimal(18, 2), actualClaim || 0)
      .input('qa', sql.NVarChar(50), qa || '')
      .input('remarks', sql.NText, remarks || '')
      .input('complaintType', sql.NVarChar(50), complaintType)
      .input('description', sql.NText, description)
      .input('quantity', sql.Decimal(18, 2), quantity || 0)
      .input('unitPrice', sql.Decimal(18, 2), unitPrice || 0)
      .input('totalAmount', sql.Decimal(18, 2), totalAmount)
      .input('urgencyLevel', sql.NVarChar(20), urgencyLevel)
      .input('expectedSolution', sql.NText, expectedSolution || '')
      .input('initiatedBy', sql.NVarChar(100), initiatedBy || '')
      .input('processStatus', sql.NVarChar(50), 'pending')
      .input('processResult', sql.NVarChar(50), processResult || '')
      .input('verificationResult', sql.NText, verificationResult || '')
      .input('createdBy', sql.Int, req.user?.id || 1)
      .query(`
        INSERT INTO SupplierComplaints (
          ComplaintNo, ComplaintDate, SupplierName, MaterialName, MaterialCode,
          MaterialSpecification, MaterialUnit, PurchaseOrderNo, IncomingDate, BatchQuantity,
          InspectionDate, WorkOrderNo, CustomerCode, ProductCode, CPO,
          ProductQuantity, ProductUnit, SampleQuantity, DefectQuantity, DefectCategory,
          DefectItem, DefectCauseAnalysis, AttachedImages, FeedbackUnit, Inspector,
          IQCResult, AbnormalDisposal, ComplaintDocument, ReplyDate, ImprovementEffectEvaluation,
          ClaimAmount, ActualClaim, QA, Remarks, ComplaintType,
          Description, Quantity, UnitPrice, TotalAmount, UrgencyLevel,
          ExpectedSolution, InitiatedBy, ProcessStatus, ProcessResult,
          VerificationResult, CreatedBy, CreatedAt
        ) VALUES (
          @complaintNo, @complaintDate, @supplierName, @materialName, @materialCode,
          @materialSpecification, @materialUnit, @purchaseOrderNo, @incomingDate, @batchQuantity,
          @inspectionDate, @workOrderNo, @customerCode, @productCode, @cpo,
          @productQuantity, @productUnit, @sampleQuantity, @defectQuantity, @defectCategory,
          @defectItem, @defectCauseAnalysis, @attachedImages, @feedbackUnit, @inspector,
          @iqcResult, @abnormalDisposal, @complaintDocument, @replyDate, @improvementEffectEvaluation,
          @claimAmount, @actualClaim, @qa, @remarks, @complaintType,
          @description, @quantity, @unitPrice, @totalAmount, @urgencyLevel,
          @expectedSolution, @initiatedBy, @processStatus, @processResult,
          @verificationResult, @createdBy, GETDATE()
        );
        SELECT SCOPE_IDENTITY() as ID;
      `)
    
    const newId = result.recordset[0].ID
    
    res.json({
      success: true,
      message: '供应商投诉记录创建成功',
      data: { id: newId, complaintNo }
    })
  } catch (error) {
    console.error('创建供应商投诉记录失败:', error)
    res.status(500).json({
      success: false,
      message: '创建供应商投诉记录失败',
      error: error.message
    })
  }
})

/**
 * 更新供应商投诉记录
 * PUT /api/supplier-complaints/:id
 */
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params
    const {
      // 前端字段名（大写开头）
      SupplierName,
      MaterialName,
      MaterialCode,
      MaterialSpecification,
      MaterialUnit,
      PurchaseOrderNo,
      IncomingDate,
      BatchQuantity,
      InspectionDate,
      WorkOrderNo,
      CustomerCode,
      ProductCode,
      CPO,
      ProductQuantity,
      ProductUnit,
      SampleQuantity,
      DefectQuantity,
      DefectCategory,
      DefectItem,
      DefectCauseAnalysis,
      AttachedImages,
      FeedbackUnit,
      Inspector,
      IQCResult,
      AbnormalDisposal,
      ComplaintDocument,
      ReplyDate,
      ImprovementEffectEvaluation,
      ClaimAmount,
      ActualClaim,
      QA,
      Remarks,
      ComplaintType,
      Description,
      Quantity,
      UnitPrice,
      InitiatedBy,
      UrgencyLevel,
      ExpectedSolution,
      ProcessStatus,
      ProcessResult,
      VerificationResult,
      SolutionDescription,
      CompensationAmount,
      ReworkCost,
      ReplacementCost,
      ReturnQuantity,
      ReturnAmount,
      FollowUpActions,
      PreventiveMeasures,
      SupplierResponse,
      CompletedDate,
      ClosedDate,
      ActualLoss,
      // 兼容小写开头的字段名
      supplierName,
      materialName,
      materialCode,
      materialSpecification,
      materialUnit,
      purchaseOrderNo,
      incomingDate,
      batchQuantity,
      inspectionDate,
      workOrderNo,
      customerCode,
      productCode,
      cpo,
      productQuantity,
      productUnit,
      sampleQuantity,
      defectQuantity,
      defectCategory,
      defectItem,
      defectCauseAnalysis,
      attachedImages,
      feedbackUnit,
      inspector,
      iqcResult,
      abnormalDisposal,
      complaintDocument,
      replyDate,
      improvementEffectEvaluation,
      claimAmount,
      actualClaim,
      qa,
      remarks,
      complaintType,
      description,
      quantity,
      unitPrice,
      initiatedBy,
      urgencyLevel,
      expectedSolution,
      processStatus,
      processResult,
      verificationResult,
      solutionDescription,
      compensationAmount,
      reworkCost,
      replacementCost,
      returnQuantity,
      returnAmount,
      followUpActions,
      preventiveMeasures,
      supplierResponse,
      completedDate,
      closedDate,
      actualLoss,
      // 兼容前端ResponsiblePerson字段（映射到InitiatedBy）
      ResponsiblePerson,
      responsiblePerson
    } = req.body

    const pool = await getConnection()

    // 检查记录是否存在
    const checkResult = await pool.request()
      .input('id', sql.Int, parseInt(id))
      .query('SELECT ID FROM SupplierComplaints WHERE ID = @id AND Status != 0')

    if (checkResult.recordset.length === 0) {
      return res.status(404).json({
        success: false,
        message: '投诉记录不存在'
      })
    }

    // 使用大写开头的字段名优先，如果没有则使用小写开头的字段名
    const finalSupplierName = SupplierName || supplierName || ''
    const finalMaterialName = MaterialName || materialName || ''
    const finalMaterialCode = MaterialCode || materialCode || ''
    const finalMaterialSpecification = MaterialSpecification || materialSpecification || ''
    const finalMaterialUnit = MaterialUnit || materialUnit || ''
    const finalPurchaseOrderNo = PurchaseOrderNo || purchaseOrderNo || ''
    const finalIncomingDate = IncomingDate || incomingDate || null
    const finalBatchQuantity = BatchQuantity || batchQuantity || 0
    const finalInspectionDate = InspectionDate || inspectionDate || null
    const finalWorkOrderNo = WorkOrderNo || workOrderNo || ''
    const finalCustomerCode = CustomerCode || customerCode || ''
    const finalProductCode = ProductCode || productCode || ''
    const finalCPO = CPO || cpo || ''
    const finalProductQuantity = ProductQuantity || productQuantity || 0
    const finalProductUnit = ProductUnit || productUnit || ''
    const finalSampleQuantity = SampleQuantity || sampleQuantity || 0
    const finalDefectQuantity = DefectQuantity || defectQuantity || 0
    const finalDefectCategory = DefectCategory || defectCategory || ''
    const finalDefectItem = DefectItem || defectItem || ''
    const finalDefectCauseAnalysis = DefectCauseAnalysis || defectCauseAnalysis || ''
    const finalAttachedImages = AttachedImages || attachedImages || ''
    const finalFeedbackUnit = FeedbackUnit || feedbackUnit || ''
    const finalInspector = Inspector || inspector || ''
    const finalIQCResult = IQCResult || iqcResult || ''
    const finalAbnormalDisposal = AbnormalDisposal || abnormalDisposal || ''
    const finalComplaintDocument = ComplaintDocument || complaintDocument || ''
    const finalReplyDate = ReplyDate || replyDate || null
    const finalImprovementEffectEvaluation = ImprovementEffectEvaluation || improvementEffectEvaluation || ''
    const finalClaimAmount = ClaimAmount || claimAmount || 0
    const finalActualClaim = ActualClaim || actualClaim || 0
    const finalQA = QA || qa || ''
    const finalRemarks = Remarks || remarks || ''
    const finalComplaintType = ComplaintType || complaintType || ''
    const finalDescription = Description || description || ''
    const finalQuantity = Quantity || quantity || 0
    const finalUnitPrice = UnitPrice || unitPrice || 0
    const finalInitiatedBy = InitiatedBy || initiatedBy || ResponsiblePerson || responsiblePerson || ''
    const finalUrgencyLevel = UrgencyLevel || urgencyLevel || ''
    const finalExpectedSolution = ExpectedSolution || expectedSolution || ''
    const finalProcessStatus = ProcessStatus || processStatus || ''
    const finalProcessResult = ProcessResult || processResult || ''
    const finalVerificationResult = VerificationResult || verificationResult || ''
    const finalSolutionDescription = SolutionDescription || solutionDescription || ''
    const finalCompensationAmount = CompensationAmount || compensationAmount || 0
    const finalReworkCost = ReworkCost || reworkCost || 0
    const finalReplacementCost = ReplacementCost || replacementCost || 0
    const finalReturnQuantity = ReturnQuantity || returnQuantity || 0
    const finalReturnAmount = ReturnAmount || returnAmount || 0
    const finalFollowUpActions = FollowUpActions || followUpActions || ''
    const finalPreventiveMeasures = PreventiveMeasures || preventiveMeasures || ''
    const finalSupplierResponse = SupplierResponse || supplierResponse || ''
    const finalCompletedDate = CompletedDate || completedDate || null
    const finalClosedDate = ClosedDate || closedDate || null
    const finalActualLoss = ActualLoss || actualLoss || 0

    // 计算总金额
    const totalAmount = finalQuantity && finalUnitPrice ? finalQuantity * finalUnitPrice : 0

    // 更新记录 - 更新所有字段
    await pool.request()
      .input('id', sql.Int, parseInt(id))
      .input('supplierName', sql.NVarChar(200), finalSupplierName)
      .input('materialName', sql.NVarChar(200), finalMaterialName)
      .input('materialCode', sql.NVarChar(100), finalMaterialCode)
      .input('materialSpecification', sql.NVarChar(200), finalMaterialSpecification)
      .input('materialUnit', sql.NVarChar(20), finalMaterialUnit)
      .input('purchaseOrderNo', sql.NVarChar(100), finalPurchaseOrderNo)
      .input('incomingDate', sql.DateTime, finalIncomingDate)
      .input('batchQuantity', sql.Decimal(18, 2), finalBatchQuantity)
      .input('inspectionDate', sql.DateTime, finalInspectionDate)
      .input('workOrderNo', sql.NVarChar(100), finalWorkOrderNo)
      .input('customerCode', sql.NVarChar(50), finalCustomerCode)
      .input('productCode', sql.NVarChar(100), finalProductCode)
      .input('cpo', sql.NVarChar(100), finalCPO)
      .input('productQuantity', sql.Decimal(18, 2), finalProductQuantity)
      .input('productUnit', sql.NVarChar(20), finalProductUnit)
      .input('sampleQuantity', sql.Decimal(18, 2), finalSampleQuantity)
      .input('defectQuantity', sql.Decimal(18, 2), finalDefectQuantity)
      .input('defectCategory', sql.NVarChar(100), finalDefectCategory)
      .input('defectItem', sql.NVarChar(200), finalDefectItem)
      .input('defectCauseAnalysis', sql.NText, finalDefectCauseAnalysis)
      .input('attachedImages', sql.NText, finalAttachedImages)
      .input('feedbackUnit', sql.NVarChar(100), finalFeedbackUnit)
      .input('inspector', sql.NVarChar(50), finalInspector)
      .input('iqcResult', sql.NVarChar(50), finalIQCResult)
      .input('abnormalDisposal', sql.NText, finalAbnormalDisposal)
      .input('complaintDocument', sql.NText, finalComplaintDocument)
      .input('replyDate', sql.DateTime, finalReplyDate)
      .input('improvementEffectEvaluation', sql.NText, finalImprovementEffectEvaluation)
      .input('claimAmount', sql.Decimal(18, 2), finalClaimAmount)
      .input('actualClaim', sql.Decimal(18, 2), finalActualClaim)
      .input('qa', sql.NVarChar(50), finalQA)
      .input('remarks', sql.NText, finalRemarks)
      .input('complaintType', sql.NVarChar(50), finalComplaintType)
      .input('description', sql.NText, finalDescription)
      .input('quantity', sql.Decimal(18, 2), finalQuantity)
      .input('unitPrice', sql.Decimal(18, 2), finalUnitPrice)
      .input('totalAmount', sql.Decimal(18, 2), totalAmount)
      .input('urgencyLevel', sql.NVarChar(20), finalUrgencyLevel)
      .input('expectedSolution', sql.NText, finalExpectedSolution)
      .input('initiatedBy', sql.NVarChar(100), finalInitiatedBy)
      .input('processStatus', sql.NVarChar(50), finalProcessStatus)
      .input('processResult', sql.NVarChar(50), finalProcessResult)
      .input('verificationResult', sql.NText, finalVerificationResult)
      .input('solutionDescription', sql.NText, finalSolutionDescription)
      .input('compensationAmount', sql.Decimal(18, 2), finalCompensationAmount)
      .input('reworkCost', sql.Decimal(18, 2), finalReworkCost)
      .input('replacementCost', sql.Decimal(18, 2), finalReplacementCost)
      .input('returnQuantity', sql.Decimal(18, 2), finalReturnQuantity)
      .input('returnAmount', sql.Decimal(18, 2), finalReturnAmount)
      .input('followUpActions', sql.NText, finalFollowUpActions)
      .input('preventiveMeasures', sql.NText, finalPreventiveMeasures)
      .input('supplierResponse', sql.NText, finalSupplierResponse)
      .input('completedDate', sql.DateTime, finalCompletedDate)
      .input('closedDate', sql.DateTime, finalClosedDate)
      .input('actualLoss', sql.Decimal(18, 2), finalActualLoss)
      .input('updatedBy', sql.Int, req.user?.id || 1)
      .query(`
        UPDATE SupplierComplaints SET
          SupplierName = @supplierName,
          MaterialName = @materialName,
          MaterialCode = @materialCode,
          MaterialSpecification = @materialSpecification,
          MaterialUnit = @materialUnit,
          PurchaseOrderNo = @purchaseOrderNo,
          IncomingDate = @incomingDate,
          BatchQuantity = @batchQuantity,
          InspectionDate = @inspectionDate,
          WorkOrderNo = @workOrderNo,
          CustomerCode = @customerCode,
          ProductCode = @productCode,
          CPO = @cpo,
          ProductQuantity = @productQuantity,
          ProductUnit = @productUnit,
          SampleQuantity = @sampleQuantity,
          DefectQuantity = @defectQuantity,
          DefectCategory = @defectCategory,
          DefectItem = @defectItem,
          DefectCauseAnalysis = @defectCauseAnalysis,
          AttachedImages = @attachedImages,
          FeedbackUnit = @feedbackUnit,
          Inspector = @inspector,
          IQCResult = @iqcResult,
          AbnormalDisposal = @abnormalDisposal,
          ComplaintDocument = @complaintDocument,
          ReplyDate = @replyDate,
          ImprovementEffectEvaluation = @improvementEffectEvaluation,
          ClaimAmount = @claimAmount,
          ActualClaim = @actualClaim,
          QA = @qa,
          Remarks = @remarks,
          ComplaintType = @complaintType,
          Description = @description,
          Quantity = @quantity,
          UnitPrice = @unitPrice,
          TotalAmount = @totalAmount,
          UrgencyLevel = @urgencyLevel,
          ExpectedSolution = @expectedSolution,
          InitiatedBy = @initiatedBy,
          ProcessStatus = @processStatus,
          ProcessResult = @processResult,
          VerificationResult = @verificationResult,
          SolutionDescription = @solutionDescription,
          CompensationAmount = @compensationAmount,
          ReworkCost = @reworkCost,
          ReplacementCost = @replacementCost,
          ReturnQuantity = @returnQuantity,
          ReturnAmount = @returnAmount,
          FollowUpActions = @followUpActions,
          PreventiveMeasures = @preventiveMeasures,
          SupplierResponse = @supplierResponse,
          CompletedDate = @completedDate,
          ClosedDate = @closedDate,
          ActualLoss = @actualLoss,
          UpdatedBy = @updatedBy,
          UpdatedAt = GETDATE()
        WHERE ID = @id
      `)
    
    res.json({
      success: true,
      message: '供应商投诉记录更新成功'
    })
  } catch (error) {
    console.error('更新供应商投诉记录失败:', error)
    res.status(500).json({
      success: false,
      message: '更新供应商投诉记录失败',
      error: error.message
    })
  }
})

/**
 * 批量删除供应商投诉记录
 * DELETE /api/supplier-complaints/batch
 */
router.delete('/batch', async (req, res) => {
  try {
    const { ids } = req.body
    
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({
        success: false,
        message: '请提供要删除的记录ID列表'
      })
    }
    
    const pool = await getConnection()
    
    // 构建批量删除的SQL语句
    const placeholders = ids.map((_, index) => `@id${index}`).join(',')
    let request = pool.request()
    
    // 添加参数
    ids.forEach((id, index) => {
      request.input(`id${index}`, sql.Int, id)
    })
    
    // 执行批量删除（软删除）
    const result = await request.query(`
      UPDATE SupplierComplaints 
      SET Status = 0, UpdatedAt = GETDATE()
      WHERE ID IN (${placeholders}) AND Status != 0
    `)
    
    res.json({
      success: true,
      message: `成功删除 ${result.rowsAffected[0]} 条记录`,
      data: {
        deletedCount: result.rowsAffected[0]
      }
    })
  } catch (error) {
    console.error('批量删除供应商投诉记录失败:', error)
    res.status(500).json({
      success: false,
      message: '批量删除供应商投诉记录失败',
      error: error.message
    })
  }
})

/**
 * 物理删除供应商投诉记录（支持批量）
 * DELETE /api/supplier-complaints/physical
 * 功能：物理删除记录，如果表被清空则重置自增ID
 */
router.delete('/physical', async (req, res) => {
  try {
    const { ids, deleteAll } = req.body
    
    const pool = await getConnection()
    let result
    
    if (deleteAll) {
      // 清空整张表
      await pool.request().query('TRUNCATE TABLE SupplierComplaints')
      // TRUNCATE 会自动重置自增ID，无需额外操作
      
      result = { rowsAffected: ['ALL'] }
    } else {
      if (!ids || !Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({
          success: false,
          message: '请提供要删除的记录ID列表'
        })
      }
      
      // 构建批量删除的SQL语句
      const placeholders = ids.map((_, index) => `@id${index}`).join(',')
      let request = pool.request()
      
      // 添加参数
      ids.forEach((id, index) => {
        request.input(`id${index}`, sql.Int, id)
      })
      
      // 执行物理删除
      result = await request.query(`
        DELETE FROM SupplierComplaints 
        WHERE ID IN (${placeholders})
      `)
      
      // 检查表是否为空，如果为空则重置自增ID
      const countResult = await pool.request().query('SELECT COUNT(*) as count FROM SupplierComplaints')
      if (countResult.recordset[0].count === 0) {
        await pool.request().query("DBCC CHECKIDENT ('SupplierComplaints', RESEED, 0)")
      }
    }
    
    res.json({
      success: true,
      message: deleteAll ? '已清空所有数据并重置自增ID' : `成功物理删除 ${result.rowsAffected[0]} 条记录`,
      data: {
        deletedCount: deleteAll ? 'ALL' : result.rowsAffected[0]
      }
    })
  } catch (error) {
    console.error('物理删除供应商投诉记录失败:', error)
    res.status(500).json({
      success: false,
      message: '物理删除供应商投诉记录失败',
      error: error.message
    })
  }
})

/**
 * 删除供应商投诉记录（软删除）
 * DELETE /api/supplier-complaints/:id
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params
    const pool = await getConnection()
    
    // 检查记录是否存在
    const checkResult = await pool.request()
      .input('id', sql.Int, parseInt(id))
      .query('SELECT ID FROM SupplierComplaints WHERE ID = @id AND Status != 0')
    
    if (checkResult.recordset.length === 0) {
      return res.status(404).json({
        success: false,
        message: '投诉记录不存在'
      })
    }
    
    // 软删除记录
    await pool.request()
      .input('id', sql.Int, parseInt(id))
      .input('updatedBy', sql.Int, req.user?.id || 1)
      .query(`
        UPDATE SupplierComplaints SET
          Status = 0,
          UpdatedBy = @updatedBy,
          UpdatedAt = GETDATE()
        WHERE ID = @id
      `)
    
    res.json({
      success: true,
      message: '供应商投诉记录删除成功'
    })
  } catch (error) {
    console.error('删除供应商投诉记录失败:', error)
    res.status(500).json({
      success: false,
      message: '删除供应商投诉记录失败',
      error: error.message
    })
  }
})

/**
 * 导出供应商投诉数据
 * POST /api/supplier-complaints/export
 * 功能：根据筛选条件和选择的字段导出完整数据为Excel文件，支持图片嵌入
 */
router.post('/export', async (req, res) => {
  try {
    const {
      fields = [], // 要导出的字段列表
      filters = {} // 筛选条件
    } = req.body
    
    if (fields.length === 0) {
      return res.status(400).json({
        success: false,
        message: '请选择要导出的字段'
      })
    }
    
    const pool = await getConnection()
    
    // 字段中文名称映射
    const fieldLabels = {
      'ComplaintNo': '投诉编号',
      'ComplaintDate': '投诉日期',
      'SupplierName': '供应商名称',
      'MaterialName': '材料名称',
      'MaterialCode': '材料编号',
      'MaterialSpecification': '材料规格',
      'MaterialUnit': '材料单位',
      'MaterialBrand': '材料品牌',
      'ComplaintType': '投诉类型',
      'Description': '问题描述',
      'Quantity': '问题数量',
      'UnitPrice': '单价',
      'TotalAmount': '总金额',
      'UrgencyLevel': '紧急程度',
      'ExpectedSolution': '期望解决方案',
      'ProcessStatus': '处理状态',
      'ProcessResult': '处理结果',
      'SolutionDescription': '解决方案描述',
      'VerificationResult': '验证结果',
      'ClaimAmount': '索赔金额',
      'ActualClaim': '实际索赔',
      'ActualLoss': '实际损失',
      'CompensationAmount': '赔偿金额',
      'ReworkCost': '返工成本',
      'ReplacementCost': '更换成本',
      'ReturnQuantity': '退货数量',
      'ReturnAmount': '退货金额',
      'FollowUpActions': '后续行动',
      'PreventiveMeasures': '预防措施',
      'SupplierResponse': '供应商回复',
      'AttachmentPaths': '附件路径',
      'CompletedDate': '完成日期',
      'ClosedDate': '关闭日期',
      'PurchaseOrderNo': '采购单号',
      'IncomingDate': '来料日期',
      'BatchQuantity': '批量数量',
      'InspectionDate': '检验日期',
      'WorkOrderNo': '使用工单',
      'SampleQuantity': '抽检数量',
      'AttachedImages': '异常图片',
      'IQCResult': 'IQC判定',
      'InitiatedBy': '发起人',
      'CustomerCode': '客户编号',
      'ProductCode': '产品编号',
      'CPO': 'CPO',
      'ProductQuantity': '产品数量',
      'ProductUnit': '产品单位',
      'DefectQuantity': '不合格数',
      'DefectCategory': '不良类别',
      'DefectItem': '不良项',
      'DefectCauseAnalysis': '不合格原因分析',
      'FeedbackUnit': '反馈单位',
      'Inspector': '检验员',
      'AbnormalDisposal': '异常处置',
      'ComplaintDocument': '投诉书',
      'ReplyDate': '回复日期',
      'ImprovementEffectEvaluation': '改善效果评估',
      'QA': 'QA',
      'Remarks': '备注'
    }

    // 构建字段选择语句
    const selectFields = fields.map(field => `sc.${field}`).join(', ')
    
    // 构建查询条件
    let whereConditions = ['sc.Status != 0'] // 排除已删除的记录
    let queryParams = []
    
    // 处理筛选条件
    if (filters.keyword) {
      whereConditions.push('(sc.ComplaintNo LIKE @keyword OR sc.MaterialName LIKE @keyword OR sc.Description LIKE @keyword)')
      queryParams.push({ name: 'keyword', type: sql.NVarChar(100), value: `%${filters.keyword}%` })
    }
    
    if (filters.supplierName) {
      whereConditions.push('sc.SupplierName LIKE @supplierName')
      queryParams.push({ name: 'supplierName', type: sql.NVarChar(100), value: `%${filters.supplierName}%` })
    }
    
    if (filters.complaintType) {
      whereConditions.push('sc.ComplaintType = @complaintType')
      queryParams.push({ name: 'complaintType', type: sql.NVarChar(50), value: filters.complaintType })
    }
    
    if (filters.status) {
      whereConditions.push('sc.ProcessStatus = @status')
      queryParams.push({ name: 'status', type: sql.NVarChar(50), value: filters.status })
    }
    
    if (filters.startDate) {
      whereConditions.push('sc.ComplaintDate >= @startDate')
      queryParams.push({ name: 'startDate', type: sql.DateTime, value: new Date(filters.startDate) })
    }
    
    if (filters.endDate) {
      whereConditions.push('sc.ComplaintDate <= @endDate')
      queryParams.push({ name: 'endDate', type: sql.DateTime, value: new Date(filters.endDate) })
    }
    
    const whereClause = whereConditions.join(' AND ')
    
    // 执行查询
    let dataRequest = pool.request()
    queryParams.forEach(param => {
      dataRequest.input(param.name, param.type, param.value)
    })
    
    const dataResult = await dataRequest.query(`
      SELECT ${selectFields}
      FROM SupplierComplaints sc
      WHERE ${whereClause}
      ORDER BY sc.ComplaintDate DESC, sc.CreatedAt DESC
    `)
    
    const rows = dataResult.recordset
    
    // 创建Excel工作簿
    const ExcelJS = require('exceljs')
    const workbook = new ExcelJS.Workbook()
    const worksheet = workbook.addWorksheet('供应商投诉数据')
    
    // 设置列头
    const columns = fields.map(field => ({
      header: fieldLabels[field] || field,
      key: field,
      width: field === 'AttachedImages' ? 15 : 20 // 图片列宽一点，其他默认20
    }))
    worksheet.columns = columns
    
    // 设置表头样式
    const headerRow = worksheet.getRow(1)
    headerRow.font = { bold: true }
    headerRow.alignment = { horizontal: 'center', vertical: 'middle' }
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' }
    }
    
    // 填充数据
    for (let i = 0; i < rows.length; i++) {
      const rowData = rows[i]
      const row = worksheet.addRow(rowData)
      const rowIndex = row.number // Excel行号，从1开始（表头是1，数据从2开始）
      
      // 设置行高（如果有图片列，设置高一点）
      if (fields.includes('AttachedImages')) {
        row.height = 60 // 图片行高
      } else {
        row.height = 25
      }
      
      // 处理图片
      if (fields.includes('AttachedImages') && rowData.AttachedImages) {
        try {
          // 获取图片路径
          // 数据库中存储的是URL路径，如 /files/supplier-complaint/filename.jpg
          // 我们需要转换为服务器本地物理路径
          const imageUrl = rowData.AttachedImages
          let imagePath = ''
          
          if (imageUrl.includes('/supplier-complaint/')) {
            const filename = path.basename(imageUrl)
            // 假设图片存储在 uploads/supplier-complaint 目录下
            imagePath = path.join(__dirname, '../uploads/supplier-complaint', filename)
          } else if (imageUrl.includes('/customer-complaint/')) {
             // 兼容可能混入的其他类型
             const filename = path.basename(imageUrl)
             imagePath = path.join(__dirname, '../uploads/customer-complaint', filename)
          } else {
             // 尝试直接作为文件名在supplier-complaint下查找
             const filename = path.basename(imageUrl)
             imagePath = path.join(__dirname, '../uploads/supplier-complaint', filename)
          }
          
          if (fs.existsSync(imagePath)) {
            // 读取图片
            const imageBuffer = fs.readFileSync(imagePath)
            const extension = path.extname(imagePath).substring(1).toLowerCase()
            
            // 添加图片到工作簿
            const imageId = workbook.addImage({
              buffer: imageBuffer,
              extension: extension === 'jpg' ? 'jpeg' : extension
            })
            
            // 计算图片列的索引
            const colIndex = fields.indexOf('AttachedImages')
            
            // 将图片嵌入单元格
            worksheet.addImage(imageId, {
              tl: { col: colIndex, row: rowIndex - 1 }, // top-left (0-based index)
              br: { col: colIndex + 1, row: rowIndex }, // bottom-right
              editAs: 'oneCell' // 图片随单元格大小变化
            })
            
            // 清空该单元格的文本内容（只显示图片）
            row.getCell(colIndex + 1).value = ''
          }
        } catch (imgErr) {
          console.error('处理图片失败:', imgErr)
          // 图片处理失败，保留文本路径
        }
      }
      
      // 格式化日期等字段
      row.eachCell((cell, colNumber) => {
        const fieldKey = fields[colNumber - 1]
        if (['ComplaintDate', 'IncomingDate', 'InspectionDate', 'ReplyDate', 'CompletedDate', 'ClosedDate'].includes(fieldKey)) {
           if (cell.value) {
             // 格式化日期
             const date = new Date(cell.value)
             cell.value = date.toLocaleDateString('zh-CN')
           }
        }
        // 设置居中
        cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }
      })
    }
    
    // 设置响应头
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    res.setHeader('Content-Disposition', 'attachment; filename=' + encodeURIComponent('供应商投诉数据.xlsx'))
    
    // 发送工作簿
    await workbook.xlsx.write(res)
    res.end()
    
  } catch (error) {
    console.error('导出供应商投诉数据失败:', error)
    res.status(500).json({
      success: false,
      message: '导出供应商投诉数据失败',
      error: error.message
    })
  }
})

/**
 * 获取投诉统计数据（兼容路由）
 * GET /api/supplier-complaints/statistics/overview
 * 兼容旧版API调用，直接复制/statistics的逻辑
 */
router.get('/statistics/overview', async (req, res) => {
  try {
    const { startDate, endDate } = req.query
    const pool = await getConnection()
    
    let dateCondition = ''
    let queryParams = []
    
    if (startDate && endDate) {
      dateCondition = 'AND ComplaintDate BETWEEN @startDate AND @endDate'
      queryParams.push(
        { name: 'startDate', type: sql.DateTime, value: new Date(startDate) },
        { name: 'endDate', type: sql.DateTime, value: new Date(endDate) }
      )
    }
    
    let request = pool.request()
    queryParams.forEach(param => {
      request.input(param.name, param.type, param.value)
    })
    
    const result = await request.query(`
      SELECT 
        COUNT(*) as totalComplaints,
        SUM(CASE WHEN ProcessStatus = 'pending' OR ProcessStatus = '待处理' THEN 1 ELSE 0 END) as pendingCount,
        SUM(CASE WHEN ProcessStatus = 'processing' OR ProcessStatus = '处理中' THEN 1 ELSE 0 END) as processingCount,
        SUM(CASE WHEN ProcessStatus = 'completed' OR ProcessStatus = '已完成' THEN 1 ELSE 0 END) as completedCount,
        SUM(CASE WHEN ProcessStatus = 'closed' OR ProcessStatus = '已关闭' THEN 1 ELSE 0 END) as closedCount,
        ISNULL(SUM(TotalAmount), 0) as totalAmount,
        ISNULL(SUM(ClaimAmount), 0) as totalClaimAmount,
        ISNULL(SUM(ActualClaim), 0) as totalActualClaim,
        ISNULL(AVG(TotalAmount), 0) as avgAmount
      FROM SupplierComplaints
      WHERE Status != 0 ${dateCondition}
    `)
    
    res.json({
      success: true,
      data: result.recordset[0]
    })
  } catch (error) {
    console.error('获取投诉统计数据失败:', error)
    res.status(500).json({
      success: false,
      message: '获取投诉统计数据失败',
      error: error.message
    })
  }
})

/**
 * 生成投诉书
 * POST /api/supplier-complaints/generate-report
 * 根据选中的投诉记录生成Excel投诉书
 */
router.post('/generate-report', async (req, res) => {
  try {
    const { ids } = req.body
    
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({
        success: false,
        message: '请选择要生成投诉书的记录'
      })
    }
    
    const pool = await getConnection()
    
    // 查询选中的投诉记录
    const placeholders = ids.map((_, index) => `@id${index}`).join(',')
    const request = pool.request()
    
    ids.forEach((id, index) => {
      request.input(`id${index}`, sql.Int, id)
    })
    
    const result = await request.query(`
      SELECT 
        sc.ID,
        sc.ComplaintNo,
        sc.ComplaintDate,
        sc.SupplierName,
        sc.MaterialName,
        sc.MaterialCode,
        sc.PurchaseOrderNo,
        sc.IncomingDate,
        sc.BatchQuantity,
        sc.InspectionDate,
        sc.WorkOrderNo,
        sc.SampleQuantity,
        sc.ComplaintType,
        sc.UrgencyLevel,
        sc.Description,
        sc.Quantity,
        sc.UnitPrice,
        sc.TotalAmount,
        sc.ProcessStatus,
        sc.ProcessResult,
        sc.InitiatedBy,
        sc.CreatedBy,
        sc.CreatedAt
      FROM SupplierComplaints sc
      WHERE sc.ID IN (${placeholders}) AND sc.Status != 0
      ORDER BY sc.ComplaintDate DESC
    `)
    
    if (result.recordset.length === 0) {
      return res.status(404).json({
        success: false,
        message: '未找到有效的投诉记录'
      })
    }
    
    // 导入ExcelJS库
    const ExcelJS = require('exceljs')
    const path = require('path')
    const fs = require('fs')
    
    // 模板文件路径
    const templatePath = path.join(__dirname, '../templates/complaint_template.xlsx')
    
    // 检查模板文件是否存在
    if (!fs.existsSync(templatePath)) {
      return res.status(500).json({
        success: false,
        message: '投诉书模板文件不存在，请联系管理员'
      })
    }
    
    // 创建工作簿
    const workbook = new ExcelJS.Workbook()
    
    // 生成时间戳：yymmddhhmm格式（提前生成，供工作表名称和文件名使用）
    const now = new Date()
    const year = now.getFullYear().toString().slice(-2) // 取年份后两位
    const month = (now.getMonth() + 1).toString().padStart(2, '0')
    const day = now.getDate().toString().padStart(2, '0')
    const hour = now.getHours().toString().padStart(2, '0')
    const minute = now.getMinutes().toString().padStart(2, '0')
    const timestamp = `${year}${month}${day}${hour}${minute}`
    
    // 生成文件名时间戳
    
    // 为每个投诉记录创建一个工作表
    for (let i = 0; i < result.recordset.length; i++) {
      const complaint = result.recordset[i]
      
      // 读取模板
      const templateWorkbook = new ExcelJS.Workbook()
      await templateWorkbook.xlsx.readFile(templatePath)
      const templateWorksheet = templateWorkbook.getWorksheet(1)
      
      // 复制模板到新工作簿
      // 生成工作表名称：使用与文件名相同的时间戳确保一致性
      const worksheetSupplierShort = (complaint.SupplierName || '未知供应商').substring(0, 4)
      const worksheetMaterialShort = (complaint.MaterialName || '未知材料').substring(0, 6)
      
      const worksheetName = `${worksheetSupplierShort}_${worksheetMaterialShort}_${timestamp}异常反馈单`
      const worksheet = workbook.addWorksheet(worksheetName)
      
      // 关闭视图网格线，使生成的Excel文件看起来更专业
      worksheet.views = [{
        showGridLines: false
      }]
      
      // 复制模板的完整内容和格式
      templateWorksheet.eachRow((row, rowNumber) => {
        const newRow = worksheet.getRow(rowNumber)
        row.eachCell((cell, colNumber) => {
          const newCell = newRow.getCell(colNumber)
          
          // 先复制值
          newCell.value = cell.value
          
          // 复制完整样式（包括边框）
          if (cell.style) {
            // 使用JSON深拷贝确保完整复制
            try {
              const fullStyle = JSON.parse(JSON.stringify(cell.style))
              newCell.style = fullStyle
            } catch (e) {
              // 如果JSON复制失败，使用手动深度复制
              const borderCopy = {}
              if (cell.style.border) {
                if (cell.style.border.top) borderCopy.top = { ...cell.style.border.top }
                if (cell.style.border.left) borderCopy.left = { ...cell.style.border.left }
                if (cell.style.border.bottom) borderCopy.bottom = { ...cell.style.border.bottom }
                if (cell.style.border.right) borderCopy.right = { ...cell.style.border.right }
                if (cell.style.border.diagonal) borderCopy.diagonal = { ...cell.style.border.diagonal }
              }
              
              newCell.style = {
                border: borderCopy,
                fill: cell.style.fill ? { ...cell.style.fill } : {},
                font: cell.style.font ? { ...cell.style.font } : {},
                alignment: cell.style.alignment ? { ...cell.style.alignment } : {},
                numFmt: cell.style.numFmt || '',
                protection: cell.style.protection ? { ...cell.style.protection } : {}
              }
            }
          }
        })
        newRow.height = row.height
      })
      
      // 复制合并单元格
      if (templateWorksheet.model && templateWorksheet.model.merges) {
        templateWorksheet.model.merges.forEach(merge => {
          worksheet.mergeCells(merge)
        })
      }
      
      // 复制列宽
      templateWorksheet.columns.forEach((column, index) => {
        if (column.width) {
          worksheet.getColumn(index + 1).width = column.width
        }
      })
      
      // 填充数据到指定单元格 - 按照用户要求的映射关系
      // 定义一个保留样式的数据填充函数
      const fillCellWithData = (cellAddress, value) => {
        const cell = worksheet.getCell(cellAddress)
        const originalStyle = cell.style
        cell.value = value
        
        // 深度保留原有样式，特别是边框，同时设置字体大小和垂直居中
        if (originalStyle) {
          try {
            // 使用JSON深拷贝确保完整保留样式
            const fullStyle = JSON.parse(JSON.stringify(originalStyle))
            
            // 设置字体大小为10
            if (!fullStyle.font) fullStyle.font = {}
            fullStyle.font.size = 10
            
            // 设置垂直居中对齐
            if (!fullStyle.alignment) fullStyle.alignment = {}
            fullStyle.alignment.vertical = 'middle'
            
            cell.style = fullStyle
          } catch (e) {
            // 如果JSON复制失败，使用手动深度复制
            const borderCopy = {}
            if (originalStyle.border) {
              if (originalStyle.border.top) borderCopy.top = { ...originalStyle.border.top }
              if (originalStyle.border.left) borderCopy.left = { ...originalStyle.border.left }
              if (originalStyle.border.bottom) borderCopy.bottom = { ...originalStyle.border.bottom }
              if (originalStyle.border.right) borderCopy.right = { ...originalStyle.border.right }
              if (originalStyle.border.diagonal) borderCopy.diagonal = { ...originalStyle.border.diagonal }
            }
            
            // 保留原有字体样式，但设置字体大小为10
            const fontCopy = originalStyle.font ? { ...originalStyle.font } : {}
            fontCopy.size = 10
            
            // 保留原有对齐样式，但设置垂直居中
            const alignmentCopy = originalStyle.alignment ? { ...originalStyle.alignment } : {}
            alignmentCopy.vertical = 'middle'
            
            cell.style = {
              border: borderCopy,
              fill: originalStyle.fill ? { ...originalStyle.fill } : {},
              font: fontCopy,
              alignment: alignmentCopy,
              numFmt: originalStyle.numFmt || '',
              protection: originalStyle.protection ? { ...originalStyle.protection } : {}
            }
          }
        } else {
          // 如果没有原有样式，设置基本的字体和对齐样式
          cell.style = {
            font: { size: 10 },
            alignment: { vertical: 'middle' }
          }
        }
      }
      
      try {
          // B4: 供应商名称
          fillCellWithData('B4', complaint.SupplierName || '')
          
          // J4: 报告编号
          fillCellWithData('J4', complaint.ComplaintNo || '')
        
        // C5: 物料名称
        fillCellWithData('C5', complaint.MaterialName || '')
        
        // I5: 物料编号
        fillCellWithData('I5', complaint.MaterialCode || '')
        
        // I6: 来料日期
        fillCellWithData('I6', complaint.IncomingDate ? new Date(complaint.IncomingDate).toLocaleDateString('zh-CN') : '')
        
        // C7: 批量数量
        fillCellWithData('C7', complaint.BatchQuantity || '')
        
        // I7: 检验日期
        fillCellWithData('I7', complaint.InspectionDate ? new Date(complaint.InspectionDate).toLocaleDateString('zh-CN') : '')
        
        // C8: 使用工单
        fillCellWithData('C8', complaint.WorkOrderNo || '')
        
        // F8: 抽检数量
        fillCellWithData('F8', complaint.SampleQuantity || '')
        
        // I8: 不合格数（使用Quantity字段作为不合格数）
        fillCellWithData('I8', complaint.Quantity || '')
        
        // I9: 问题描述
        fillCellWithData('I9', complaint.Description || '')
        
        // C22: IQC判定 - 映射为中文
        const processStatus = complaint.ProcessStatus || ''
        let statusValue = ''
        
        // 根据ProcessStatus的值映射为中文
        if (processStatus) {
          const statusLower = processStatus.toLowerCase()
          if (statusLower.includes('qualified') || statusLower.includes('pass') || statusLower.includes('合格') || statusLower === 'completed') {
            statusValue = '合格'
          } else if (statusLower.includes('unqualified') || statusLower.includes('fail') || statusLower.includes('不合格') || statusLower.includes('reject')) {
            statusValue = '不合格'
          } else if (statusLower.includes('pending') || statusLower.includes('待处理')) {
            statusValue = '待处理'
          } else {
            // 如果无法识别，保持原值但尝试转换
            statusValue = processStatus
          }
        }
        
        fillCellWithData('C22', statusValue)
        
        // G22: 发起人
        fillCellWithData('G22', complaint.InitiatedBy || complaint.CreatedBy || '')
        
        // C23: 改善要求（使用ProcessResult字段作为改善要求）
        fillCellWithData('C23', complaint.ProcessResult || '')
        
        // 为A5:K38区域添加全部表格线
        const borderStyle = {
          style: 'thin',
          color: { argb: '000000' }
        }
        
        // 遍历A5:K38区域的所有单元格
        for (let row = 5; row <= 38; row++) {
          for (let col = 1; col <= 11; col++) { // A=1, B=2, ..., K=11
            const cell = worksheet.getCell(row, col)
            
            // 保留原有样式，只添加边框，确保字体和对齐样式不被覆盖
            const currentStyle = cell.style || {}
            
            // 确保字体大小为10和垂直居中不被覆盖
            const preservedFont = currentStyle.font || {}
            preservedFont.size = 10
            
            const preservedAlignment = currentStyle.alignment || {}
            preservedAlignment.vertical = 'middle'
            
            cell.style = {
              ...currentStyle,
              font: preservedFont,
              alignment: preservedAlignment,
              border: {
                top: borderStyle,
                left: borderStyle,
                bottom: borderStyle,
                right: borderStyle
              }
            }
          }
        }
        
      } catch (fillError) {
        console.error(`填充第${i + 1}个投诉记录数据时出错:`, fillError)
        // 继续处理其他记录
      }
    }
    
    // 生成Excel文件
    const buffer = await workbook.xlsx.writeBuffer()
    
    // 设置响应头
    
    // 获取第一个投诉记录的信息用于文件名
    const firstComplaint = result.recordset[0] || {}
    const supplierName = firstComplaint.SupplierName || '未知供应商'
    const materialName = firstComplaint.MaterialName || '未知材料'
    
    // 截取供应商简称和材料名称，避免文件名过长
    const supplierShort = supplierName.substring(0, 4)
    const materialShort = materialName.substring(0, 6)
    
    const filename = `${supplierShort}_${materialShort}_${timestamp}异常反馈单.xlsx`
    
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`)
    res.setHeader('Content-Length', buffer.length)
    
    // 发送文件
    res.send(buffer)
    
  } catch (error) {
    console.error('生成投诉书失败:', error)
    res.status(500).json({
      success: false,
      message: '生成投诉书失败: ' + error.message
    })
  }
})

/**
 * 批量导入供应商投诉
 * POST /api/supplier-complaints/import
 */
router.post('/import', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: '请选择要上传的文件' })
    }

    const workbook = XLSX.readFile(req.file.path)
    const sheetName = workbook.SheetNames[0]
    const worksheet = workbook.Sheets[sheetName]
    // cellDates: true 会将Excel日期转换为JS Date对象
    // dateNF: 'yyyy-mm-dd' 设置日期格式字符串
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { 
      cellDates: true,
      raw: false // 使用raw: false以获取格式化后的值，避免日期序列号问题
    })

    if (jsonData.length === 0) {
      fs.unlinkSync(req.file.path)
      return res.status(400).json({ success: false, message: 'Excel文件内容为空' })
    }

    const pool = await getConnection()
    let successCount = 0
    let errorCount = 0
    const errors = []

    const colMap = {
      '投诉编号': 'ComplaintNo',
      '投诉日期': 'ComplaintDate',
      '物料编码': 'MaterialCode',
      '物料名称': 'MaterialName',
      '材料规格': 'MaterialSpecification',
      '材料数量': 'BatchQuantity',
      '材料单位': 'MaterialUnit',
      '材料品牌': 'MaterialBrand',
      '供应商': 'SupplierName',
      '采购单号': 'PurchaseOrderNo',
      '来料日期': 'IncomingDate',
      '客户编号': 'CustomerCode',
      '工单号': 'WorkOrderNo',
      '产品编号': 'ProductCode',
      'CPO': 'CPO',
      '产品数量': 'ProductQuantity',
      '产品单位': 'ProductUnit',
      '抽检数量': 'SampleQuantity',
      '不合格数': 'DefectQuantity',
      '投诉类型': 'ComplaintType',
      '不良类别': 'DefectCategory',
      '不良项': 'DefectItem',
      '不合格描述': 'Description',
      '不合格原因分析': 'DefectCauseAnalysis',
      '异常图片': 'AttachedImages',
      '反馈单位': 'FeedbackUnit',
      '检验日期': 'InspectionDate',
      '检验员': 'Inspector',
      '异常处置': 'AbnormalDisposal',
      '投诉书': 'ComplaintDocument',
      '发起人': 'InitiatedBy',
      '回复日期': 'ReplyDate',
      '改善效果评估': 'ImprovementEffectEvaluation',
      '索赔金额': 'ClaimAmount',
      '实际索赔': 'ActualClaim',
      'QA': 'QA',
      '备注': 'Remarks'
    }

    for (let i = 0; i < jsonData.length; i++) {
      const row = jsonData[i]
      try {
        const record = {}
        // 去除表头空格，增加容错
        const cleanRow = {}
        Object.keys(row).forEach(k => {
          cleanRow[k.trim()] = row[k]
        })

        for (const [cn, en] of Object.entries(colMap)) {
           // 尝试匹配去除空格后的表头
          const val = cleanRow[cn]
          if (val !== undefined) {
            let finalVal = val
            // 处理Excel日期格式（可能是数字或字符串）
            if (['ComplaintDate', 'IncomingDate', 'InspectionDate', 'ReplyDate'].includes(en)) {
              if (typeof finalVal === 'number') {
                // 如果是Excel序列号（例如 45938），转换为JS Date
                // Excel基准日期是 1899-12-30
                const excelBaseDate = new Date(1899, 11, 30)
                const dateVal = new Date(excelBaseDate.getTime() + finalVal * 24 * 60 * 60 * 1000)
                if (!isNaN(dateVal.getTime())) {
                   finalVal = dateVal
                }
              } else if (typeof finalVal === 'string') {
                 // 尝试解析字符串日期
                 const dateVal = new Date(finalVal)
                 if (!isNaN(dateVal.getTime())) {
                    finalVal = dateVal
                 }
              }
            }

            // 如果是日期对象，且是无效日期，设为null
            if (finalVal instanceof Date && isNaN(finalVal)) {
               finalVal = null
            }
            record[en] = finalVal
          }
        }
        
        // 校验必填项
        if (!record.SupplierName || !record.MaterialName || !record.ComplaintType) {
           throw new Error(`缺少必填字段(供应商/物料名称/投诉类型)。解析到的数据: ${JSON.stringify(record)}`)
        }

        // 校验/处理投诉编号
        let existingId = null
        if (record.ComplaintNo) {
           const check = await pool.request()
             .input('no', sql.NVarChar, record.ComplaintNo)
             .query('SELECT ID FROM SupplierComplaints WHERE ComplaintNo = @no')
           
           if (check.recordset.length > 0) {
             existingId = check.recordset[0].ID
           }
        } else {
             // 如果没有投诉编号，自动生成
             const today = new Date(record.ComplaintDate || new Date())
             const year = today.getFullYear().toString().slice(-2)
             const month = (today.getMonth() + 1).toString().padStart(2, '0')
             
             // 获取当月最大流水号
             const seqRes = await pool.request()
                .input('prefix', sql.NVarChar, `MC-TJ${year}${month}%`)
                .query(`
                  SELECT TOP 1 ComplaintNo 
                  FROM SupplierComplaints 
                  WHERE ComplaintNo LIKE @prefix
                  ORDER BY ComplaintNo DESC
                `)
             
             let seq = 1
             if (seqRes.recordset.length > 0) {
                const lastNo = seqRes.recordset[0].ComplaintNo
                const lastSeq = parseInt(lastNo.slice(-3))
                if (!isNaN(lastSeq)) seq = lastSeq + 1
             }
             
             record.ComplaintNo = `MC-TJ${year}${month}${seq.toString().padStart(3, '0')}`
        }

        const keys = Object.keys(record)
        const request = pool.request()
        keys.forEach(key => {
            let type = sql.NVarChar
            if (['BatchQuantity', 'ProductQuantity', 'SampleQuantity', 'DefectQuantity', 'Quantity'].includes(key)) type = sql.Decimal(18, 2)
            if (['ClaimAmount', 'ActualClaim', 'UnitPrice', 'TotalAmount', 'CompensationAmount', 'ReworkCost', 'ReplacementCost', 'ReturnQuantity', 'ReturnAmount', 'ActualLoss'].includes(key)) type = sql.Decimal(18, 2)
            if (['ComplaintDate', 'IncomingDate', 'InspectionDate', 'ReplyDate'].includes(key)) type = sql.DateTime
            
            // Handle null/undefined
            let val = record[key]
            if (val === undefined) val = null
            
            request.input(key, type, val)
        })
        
        request.input('Status', sql.Int, 1)
        
        if (existingId) {
            // 更新现有记录
            request.input('ID', sql.Int, existingId)
            request.input('UpdatedAt', sql.DateTime, new Date())
            // 默认 UpdatedBy 为系统或管理员 (假设ID 1)
            request.input('UpdatedBy', sql.Int, 1)

            const setClause = keys.map(k => `${k} = @${k}`).join(', ')
            await request.query(`UPDATE SupplierComplaints SET ${setClause}, Status = @Status, UpdatedAt = @UpdatedAt, UpdatedBy = @UpdatedBy WHERE ID = @ID`)
        } else {
            // 插入新记录
            request.input('CreatedAt', sql.DateTime, new Date())
            // 默认 CreatedBy 为系统或管理员 (假设ID 1)
            request.input('CreatedBy', sql.Int, 1) 
            
            const cols = [...keys, 'Status', 'CreatedAt', 'CreatedBy'].join(',')
            const params = [...keys.map(k => '@'+k), '@Status', '@CreatedAt', '@CreatedBy'].join(',')
            
            await request.query(`INSERT INTO SupplierComplaints (${cols}) VALUES (${params})`)
        }
        
        successCount++
        
      } catch (err) {
        errorCount++
        errors.push(`第 ${i + 2} 行: ${err.message}`) // i从0开始，第1行是表头，所以数据行是i+2
      }
    }

    fs.unlinkSync(req.file.path)
    
    res.json({
      success: true,
      data: {
        successCount,
        errorCount,
        errors
      }
    })

  } catch (error) {
    console.error('导入失败:', error)
    if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path)
    res.status(500).json({ success: false, message: '导入失败: ' + error.message })
  }
})

module.exports = router