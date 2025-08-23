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
      endDate = ''
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
      SELECT * FROM (
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
      'ResponsiblePerson': '负责人',
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
      'InternalNotes': '内部备注',
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
      purchaseOrderNo,
      incomingDate,
      batchQuantity,
      inspectionDate,
      workOrderNo,
      sampleQuantity,
      attachedImages,
      iqcResult,
      complaintType,
      description,
      quantity,
      unitPrice,
      initiatedBy,
      urgencyLevel = 'medium',
      expectedSolution
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
      .input('purchaseOrderNo', sql.NVarChar(100), purchaseOrderNo || '')
      .input('incomingDate', sql.DateTime, incomingDate || null)
      .input('batchQuantity', sql.Decimal(18, 2), batchQuantity || 0)
      .input('inspectionDate', sql.DateTime, inspectionDate || null)
      .input('workOrderNo', sql.NVarChar(100), workOrderNo || '')
      .input('sampleQuantity', sql.Decimal(18, 2), sampleQuantity || 0)
      .input('attachedImages', sql.NText, attachedImages || '')
      .input('iqcResult', sql.NVarChar(50), iqcResult || '')
      .input('complaintType', sql.NVarChar(50), complaintType)
      .input('description', sql.NText, description)
      .input('quantity', sql.Decimal(18, 2), quantity || 0)
      .input('unitPrice', sql.Decimal(18, 2), unitPrice || 0)
      .input('totalAmount', sql.Decimal(18, 2), totalAmount)
      .input('urgencyLevel', sql.NVarChar(20), urgencyLevel)
      .input('expectedSolution', sql.NText, expectedSolution || '')
      .input('initiatedBy', sql.NVarChar(100), initiatedBy || '')
      .input('processStatus', sql.NVarChar(50), 'pending')
      .input('createdBy', sql.Int, req.user?.id || 1)
      .query(`
        INSERT INTO SupplierComplaints (
          ComplaintNo, ComplaintDate, SupplierName, MaterialName, MaterialCode,
          PurchaseOrderNo, IncomingDate, BatchQuantity, InspectionDate, WorkOrderNo,
          SampleQuantity, AttachedImages, IQCResult, ComplaintType,
          Description, Quantity, UnitPrice, TotalAmount, UrgencyLevel,
          ExpectedSolution, InitiatedBy, ProcessStatus, CreatedBy, CreatedAt
        ) VALUES (
          @complaintNo, @complaintDate, @supplierName, @materialName, @materialCode,
          @purchaseOrderNo, @incomingDate, @batchQuantity, @inspectionDate, @workOrderNo,
          @sampleQuantity, @attachedImages, @iqcResult, @complaintType,
          @description, @quantity, @unitPrice, @totalAmount, @urgencyLevel,
          @expectedSolution, @initiatedBy, @processStatus, @createdBy, GETDATE()
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
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params
    const {
      supplierName,
      materialName,
      materialCode,
      purchaseOrderNo,
      incomingDate,
      batchQuantity,
      inspectionDate,
      workOrderNo,
      sampleQuantity,
      attachedImages,
      iqcResult,
      complaintType,
      description,
      quantity,
      unitPrice,
      initiatedBy,
      urgencyLevel,
      expectedSolution,
      processStatus,
      processResult,
      solutionDescription,
      verificationResult
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
    
    // 计算总金额
    const totalAmount = quantity && unitPrice ? quantity * unitPrice : 0
    
    // 更新记录
    await pool.request()
      .input('id', sql.Int, parseInt(id))
      .input('supplierName', sql.NVarChar(200), supplierName)
      .input('materialName', sql.NVarChar(200), materialName)
      .input('materialCode', sql.NVarChar(100), materialCode || '')
      .input('purchaseOrderNo', sql.NVarChar(100), purchaseOrderNo || '')
      .input('incomingDate', sql.DateTime, incomingDate || null)
      .input('batchQuantity', sql.Decimal(18, 2), batchQuantity || 0)
      .input('inspectionDate', sql.DateTime, inspectionDate || null)
      .input('workOrderNo', sql.NVarChar(100), workOrderNo || '')
      .input('sampleQuantity', sql.Decimal(18, 2), sampleQuantity || 0)
      .input('attachedImages', sql.NText, attachedImages || '')
      .input('iqcResult', sql.NVarChar(50), iqcResult || '')
      .input('complaintType', sql.NVarChar(50), complaintType)
      .input('description', sql.NText, description)
      .input('quantity', sql.Decimal(18, 2), quantity || 0)
      .input('unitPrice', sql.Decimal(18, 2), unitPrice || 0)
      .input('totalAmount', sql.Decimal(18, 2), totalAmount)
      .input('urgencyLevel', sql.NVarChar(20), urgencyLevel)
      .input('expectedSolution', sql.NText, expectedSolution || '')
      .input('initiatedBy', sql.NVarChar(100), initiatedBy || '')
      .input('processStatus', sql.NVarChar(50), processStatus)
      .input('processResult', sql.NVarChar(50), processResult || '')
      .input('solutionDescription', sql.NText, solutionDescription || '')
      .input('verificationResult', sql.NText, verificationResult || '')
      .input('updatedBy', sql.Int, req.user?.id || 1)
      .query(`
        UPDATE SupplierComplaints SET
          SupplierName = @supplierName,
          MaterialName = @materialName,
          MaterialCode = @materialCode,
          PurchaseOrderNo = @purchaseOrderNo,
          IncomingDate = @incomingDate,
          BatchQuantity = @batchQuantity,
          InspectionDate = @inspectionDate,
          WorkOrderNo = @workOrderNo,
          SampleQuantity = @sampleQuantity,
          AttachedImages = @attachedImages,
          IQCResult = @iqcResult,
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
          SolutionDescription = @solutionDescription,
          VerificationResult = @verificationResult,
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
 * 功能：根据筛选条件和选择的字段导出完整数据
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
    
    res.json({
      success: true,
      data: dataResult.recordset
    })
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
 * 获取投诉统计数据
 * GET /api/supplier-complaints/statistics
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
        SUM(CASE WHEN ProcessStatus = 'pending' THEN 1 ELSE 0 END) as pendingCount,
        SUM(CASE WHEN ProcessStatus = 'processing' THEN 1 ELSE 0 END) as processingCount,
        SUM(CASE WHEN ProcessStatus = 'completed' THEN 1 ELSE 0 END) as completedCount,
        SUM(CASE WHEN ProcessStatus = 'closed' THEN 1 ELSE 0 END) as closedCount,
        SUM(TotalAmount) as totalAmount,
        AVG(TotalAmount) as avgAmount
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

module.exports = router