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

module.exports = router