/**
 * 供应商投诉书模板管理路由
 * 
 * 功能说明：
 * 1. 投诉书模板的上传、编辑、删除
 * 2. 模板解析与预览（支持合并单元格）
 * 3. 字段与单元格映射配置
 * 4. 基于模板生成投诉书
 * 
 * 版本：v1.0
 * 创建日期：2025-01-06
 */

const express = require('express')
const router = express.Router()
const path = require('path')
const fs = require('fs')
const multer = require('multer')
const { authenticateToken } = require('../middleware/auth')
const { getConnection } = require('../db')
const ExcelJS = require('exceljs')
const XLSX = require('xlsx')

// 数据目录和上传目录
const DATA_DIR = path.join(__dirname, '../data')
const UPLOAD_DIR = path.join(__dirname, '../uploads/supplier-complaint-templates')
const META_FILE = path.join(DATA_DIR, 'supplier-complaint-templates.json')

// 确保目录存在
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true })
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true })
if (!fs.existsSync(META_FILE)) fs.writeFileSync(META_FILE, JSON.stringify([]))

/**
 * 读取模板元数据
 */
function readMeta() {
  try {
    return JSON.parse(fs.readFileSync(META_FILE, 'utf-8'))
  } catch {
    return []
  }
}

/**
 * 写入模板元数据
 */
function writeMeta(list) {
  fs.writeFileSync(META_FILE, JSON.stringify(list, null, 2), 'utf-8')
}

/**
 * 解码中文文件名
 */
function decodeFileName(filename) {
  if (!filename) return filename
  try {
    const decoded = Buffer.from(filename, 'latin1').toString('utf8')
    if (/[\u4e00-\u9fa5]/.test(decoded)) {
      return decoded
    }
    if (filename.includes('%')) {
      try {
        const uriDecoded = decodeURIComponent(filename)
        if (/[\u4e00-\u9fa5]/.test(uriDecoded)) {
          return uriDecoded
        }
      } catch (e) { /* ignore */ }
    }
    return filename
  } catch (e) {
    return filename
  }
}

// 配置文件上传
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const decodedName = decodeFileName(file.originalname)
    const ext = path.extname(decodedName)
    const base = path.basename(decodedName, ext)
    const unique = `${base}_${Date.now()}${ext}`
    file.decodedOriginalname = decodedName
    cb(null, unique)
  }
})

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase()
    if (['.xlsx', '.xls'].includes(ext)) {
      cb(null, true)
    } else {
      cb(new Error('只支持 .xlsx 或 .xls 格式的文件'))
    }
  }
})

// =====================================================
// 可用字段定义
// =====================================================

/**
 * 供应商投诉书可用字段列表
 * 这些字段来自 SupplierComplaints 表
 */
const AVAILABLE_FIELDS = [
  // 基本信息
  { name: 'ComplaintNo', label: '投诉编号', type: 'string', category: '基本信息' },
  { name: 'ComplaintDate', label: '投诉日期', type: 'date', category: '基本信息' },
  { name: 'SupplierName', label: '供应商名称', type: 'string', category: '基本信息' },
  { name: 'SupplierCode', label: '供应商编码', type: 'string', category: '基本信息' },
  
  // 物料信息
  { name: 'MaterialName', label: '物料名称', type: 'string', category: '物料信息' },
  { name: 'MaterialCode', label: '物料编码', type: 'string', category: '物料信息' },
  { name: 'MaterialSpecification', label: '物料规格', type: 'string', category: '物料信息' },
  { name: 'PurchaseOrderNo', label: '采购单号', type: 'string', category: '物料信息' },
  { name: 'BatchNo', label: '批次号', type: 'string', category: '物料信息' },
  
  // 检验信息
  { name: 'IncomingDate', label: '来料日期', type: 'date', category: '检验信息' },
  { name: 'InspectionDate', label: '检验日期', type: 'date', category: '检验信息' },
  { name: 'BatchQuantity', label: '批量数量', type: 'number', category: '检验信息' },
  { name: 'SampleQuantity', label: '抽检数量', type: 'number', category: '检验信息' },
  { name: 'DefectQuantity', label: '不良数量', type: 'number', category: '检验信息' },
  { name: 'DefectRate', label: '不良率', type: 'percent', category: '检验信息' },
  { name: 'IQCResult', label: 'IQC判定', type: 'string', category: '检验信息' },
  
  // 不良信息
  { name: 'DefectCategory', label: '不良类别', type: 'string', category: '不良信息' },
  { name: 'DefectItem', label: '不良项目', type: 'string', category: '不良信息' },
  { name: 'Description', label: '问题描述', type: 'string', category: '不良信息' },
  { name: 'ComplaintType', label: '投诉类型', type: 'string', category: '不良信息' },
  { name: 'UrgencyLevel', label: '紧急程度', type: 'string', category: '不良信息' },
  { name: 'AttachedImages', label: '异常图片', type: 'image', category: '不良信息' },
  
  // 生产信息
  { name: 'WorkOrderNo', label: '工单号', type: 'string', category: '生产信息' },
  { name: 'CustomerCode', label: '客户编号', type: 'string', category: '生产信息' },
  { name: 'CustomerName', label: '客户名称', type: 'string', category: '生产信息' },
  { name: 'ProductName', label: '产品名称', type: 'string', category: '生产信息' },
  
  // 处理信息
  { name: 'ProcessStatus', label: '处理状态', type: 'string', category: '处理信息' },
  { name: 'ProcessResult', label: '处理结果', type: 'string', category: '处理信息' },
  { name: 'ImprovementRequirement', label: '改善要求', type: 'string', category: '处理信息' },
  { name: 'ImprovementDeadline', label: '改善期限', type: 'date', category: '处理信息' },
  { name: 'RootCauseAnalysis', label: '根本原因', type: 'string', category: '处理信息' },
  { name: 'CorrectiveAction', label: '纠正措施', type: 'string', category: '处理信息' },
  { name: 'PreventiveAction', label: '预防措施', type: 'string', category: '处理信息' },
  
  // 索赔信息
  { name: 'Quantity', label: '不合格数量', type: 'number', category: '索赔信息' },
  { name: 'UnitPrice', label: '单价', type: 'currency', category: '索赔信息' },
  { name: 'TotalAmount', label: '总金额', type: 'currency', category: '索赔信息' },
  { name: 'ClaimAmount', label: '索赔金额', type: 'currency', category: '索赔信息' },
  { name: 'ActualClaimAmount', label: '实际索赔', type: 'currency', category: '索赔信息' },
  
  // 人员信息
  { name: 'InitiatedBy', label: '发起人', type: 'string', category: '人员信息' },
  { name: 'InspectorName', label: '检验员', type: 'string', category: '人员信息' },
  { name: 'ApproverName', label: '审批人', type: 'string', category: '人员信息' },
  { name: 'CreatedBy', label: '创建人', type: 'string', category: '人员信息' },
  { name: 'CreatedAt', label: '创建时间', type: 'datetime', category: '人员信息' },
  
  // 供应商回复
  { name: 'ReplyDate', label: '回复日期', type: 'date', category: '供应商回复' },
  { name: 'ReplyContent', label: '回复内容', type: 'string', category: '供应商回复' },
  { name: 'SupplierAnalysis', label: '供应商分析', type: 'string', category: '供应商回复' },
  { name: 'SupplierAction', label: '供应商措施', type: 'string', category: '供应商回复' },
  
  // 系统字段
  { name: 'CurrentDate', label: '当前日期', type: 'date', category: '系统字段', isSystem: true },
  { name: 'CurrentTime', label: '当前时间', type: 'datetime', category: '系统字段', isSystem: true },
  { name: 'ReportNo', label: '报告编号', type: 'string', category: '系统字段', isSystem: true },
  
  // 电子印章
  { name: 'ElectronicSeal', label: '电子印章', type: 'seal', category: '电子印章', isSystem: true }
]

// =====================================================
// API 路由
// =====================================================

/**
 * 获取可用字段列表
 * GET /api/supplier-complaint-templates/fields
 */
router.get('/fields', authenticateToken, (req, res) => {
  // 按类别分组
  const grouped = {}
  AVAILABLE_FIELDS.forEach(field => {
    if (!grouped[field.category]) {
      grouped[field.category] = []
    }
    grouped[field.category].push(field)
  })
  
  res.json({
    code: 0,
    data: {
      fields: AVAILABLE_FIELDS,
      grouped
    }
  })
})

/**
 * 获取模板列表
 * GET /api/supplier-complaint-templates
 */
router.get('/', authenticateToken, (req, res) => {
  const list = readMeta()
  const decodedList = list.map(item => ({
    ...item,
    fileName: decodeFileName(item.fileName)
  }))
  res.json({ code: 0, data: decodedList })
})

/**
 * 获取单个模板详情
 * GET /api/supplier-complaint-templates/:id
 */
router.get('/:id', authenticateToken, (req, res) => {
  const id = Number(req.params.id)
  const list = readMeta()
  const curr = list.find(t => t.id === id)
  if (!curr) return res.status(404).json({ code: -1, message: '模板不存在' })
  res.json({ code: 0, data: { ...curr, fileName: decodeFileName(curr.fileName) } })
})

/**
 * 上传新模板
 * POST /api/supplier-complaint-templates
 */
router.post('/', authenticateToken, upload.single('file'), (req, res) => {
  try {
    const { templateName, description, isDefault } = req.body
    const file = req.file
    
    if (!file) {
      return res.status(400).json({ code: -1, message: '缺少模板文件' })
    }
    
    const originalName = file.decodedOriginalname || decodeFileName(file.originalname)
    const list = readMeta()
    
    // 如果设置为默认，取消其他模板的默认状态
    if (String(isDefault).toLowerCase() === 'true') {
      list.forEach(t => t.isDefault = false)
    }
    
    const item = {
      id: Date.now(),
      templateName: templateName || originalName,
      description: description || '',
      isDefault: String(isDefault).toLowerCase() === 'true',
      enabled: true,
      createTime: new Date().toISOString(),
      updateTime: new Date().toISOString(),
      fileName: originalName,
      fileType: file.mimetype,
      filePath: file.filename,
      fileUrl: `/files/supplier-complaint-templates/${encodeURIComponent(file.filename)}`,
      mapping: null
    }
    
    list.push(item)
    writeMeta(list)
    
    res.json({ code: 0, data: item, message: '模板上传成功' })
  } catch (e) {
    console.error('上传模板失败:', e)
    res.status(500).json({ code: -1, message: e.message })
  }
})

/**
 * 更新模板信息
 * PUT /api/supplier-complaint-templates/:id
 */
router.put('/:id', authenticateToken, upload.single('file'), (req, res) => {
  try {
    const id = Number(req.params.id)
    const list = readMeta()
    const idx = list.findIndex(t => t.id === id)
    
    if (idx === -1) {
      return res.status(404).json({ code: -1, message: '模板不存在' })
    }
    
    const curr = list[idx]
    const { templateName, description, isDefault, enabled } = req.body
    
    // 如果设置为默认，取消其他模板的默认状态
    if (String(isDefault).toLowerCase() === 'true') {
      list.forEach(t => t.isDefault = false)
    }
    
    Object.assign(curr, {
      templateName: templateName ?? curr.templateName,
      description: description ?? curr.description,
      isDefault: isDefault !== undefined ? String(isDefault).toLowerCase() === 'true' : curr.isDefault,
      enabled: enabled !== undefined ? String(enabled).toLowerCase() !== 'false' : curr.enabled,
      updateTime: new Date().toISOString()
    })
    
    // 如果上传了新文件
    if (req.file) {
      try {
        fs.unlinkSync(path.join(UPLOAD_DIR, curr.filePath))
      } catch { /* ignore */ }
      
      const originalName = req.file.decodedOriginalname || decodeFileName(req.file.originalname)
      curr.fileName = originalName
      curr.fileType = req.file.mimetype
      curr.filePath = req.file.filename
      curr.fileUrl = `/files/supplier-complaint-templates/${encodeURIComponent(req.file.filename)}`
      // 文件更新后清空映射
      curr.mapping = null
    }
    
    list[idx] = curr
    writeMeta(list)
    
    res.json({ code: 0, data: curr, message: '模板更新成功' })
  } catch (e) {
    console.error('更新模板失败:', e)
    res.status(500).json({ code: -1, message: e.message })
  }
})

/**
 * 删除模板
 * DELETE /api/supplier-complaint-templates/:id
 */
router.delete('/:id', authenticateToken, (req, res) => {
  try {
    const id = Number(req.params.id)
    const list = readMeta()
    const idx = list.findIndex(t => t.id === id)
    
    if (idx === -1) {
      return res.status(404).json({ code: -1, message: '模板不存在' })
    }
    
    const curr = list[idx]
    list.splice(idx, 1)
    writeMeta(list)
    
    // 删除文件
    try {
      fs.unlinkSync(path.join(UPLOAD_DIR, curr.filePath))
    } catch { /* ignore */ }
    
    res.json({ code: 0, message: '模板删除成功' })
  } catch (e) {
    console.error('删除模板失败:', e)
    res.status(500).json({ code: -1, message: e.message })
  }
})

/**
 * 下载模板文件
 * GET /api/supplier-complaint-templates/:id/download
 */
router.get('/:id/download', authenticateToken, (req, res) => {
  const id = Number(req.params.id)
  const list = readMeta()
  const curr = list.find(t => t.id === id)
  
  if (!curr) {
    return res.status(404).json({ code: -1, message: '模板不存在' })
  }
  
  const fullPath = path.join(UPLOAD_DIR, curr.filePath)
  if (!fs.existsSync(fullPath)) {
    return res.status(404).json({ code: -1, message: '文件不存在' })
  }
  
  const encodedFileName = encodeURIComponent(curr.fileName).replace(/'/g, "%27")
  res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodedFileName}`)
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
  
  const fileStream = fs.createReadStream(fullPath)
  fileStream.pipe(res)
})

/**
 * 解析模板结构
 * POST /api/supplier-complaint-templates/:id/parse
 */
router.post('/:id/parse', authenticateToken, async (req, res) => {
  try {
    const id = Number(req.params.id)
    const list = readMeta()
    const tpl = list.find(t => t.id === id)
    
    if (!tpl) {
      return res.status(404).json({ code: -1, message: '模板不存在' })
    }
    
    const fullPath = path.join(UPLOAD_DIR, tpl.filePath)
    if (!fs.existsSync(fullPath)) {
      return res.status(404).json({ code: -1, message: '模板文件不存在' })
    }
    
    // 使用ExcelJS读取文件（保留样式信息）
    const ExcelJS = require('exceljs')
    const workbook = new ExcelJS.Workbook()
    
    // 读取文件时确保加载所有样式
    await workbook.xlsx.readFile(fullPath)
    
    const worksheet = workbook.worksheets[0]
    
    if (!worksheet) {
      return res.status(400).json({ code: -1, message: '工作表为空' })
    }
    
    // 调试：打印前几行单元格的样式信息
    console.log('===== 模板样式调试信息 =====')
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber <= 5) {
        row.eachCell((cell, colNumber) => {
          if (cell.value) {
            console.log(`单元格 ${cell.address}:`, {
              value: cell.value,
              alignment: cell.alignment,
              font: cell.font ? { bold: cell.font.bold, size: cell.font.size } : null,
              type: cell.type
            })
          }
        })
      }
    })
    console.log('===== 调试信息结束 =====')
    
    // 获取工作表范围
    const rowCount = worksheet.rowCount
    const colCount = worksheet.columnCount
    
    // 收集合并单元格信息
    const merges = []
    worksheet.eachRow((row, rowNumber) => {
      // ExcelJS的合并单元格存储在worksheet._merges中
    })
    // 从worksheet获取合并单元格
    const mergeRanges = []
    if (worksheet.model && worksheet.model.merges) {
      worksheet.model.merges.forEach(mergeRange => {
        const decoded = ExcelJS.utils ? null : decodeExcelJSRange(mergeRange)
        if (decoded) mergeRanges.push(decoded)
      })
    }
    // 备用方法：遍历_merges
    if (worksheet._merges) {
      Object.keys(worksheet._merges).forEach(key => {
        const merge = worksheet._merges[key]
        if (merge && merge.model) {
          mergeRanges.push({
            s: { r: merge.model.top - 1, c: merge.model.left - 1 },
            e: { r: merge.model.bottom - 1, c: merge.model.right - 1 }
          })
        }
      })
    }
    
    // 生成预览HTML（带样式）
    const previewHtml = generatePreviewHtmlWithStyles(worksheet, rowCount, colCount, mergeRanges)
    
    // 获取现有映射或创建默认映射
    const existingMapping = tpl.mapping || {
      fields: [],
      layout: {
        sheetIndex: 0
      }
    }
    
    res.json({
      code: 0,
      data: {
        mapping: existingMapping,
        previewHtml,
        sheetInfo: {
          name: worksheet.name,
          rowCount,
          colCount,
          merges: mergeRanges.map(m => ({
            startRow: m.s.r + 1,
            startCol: m.s.c + 1,
            endRow: m.e.r + 1,
            endCol: m.e.c + 1,
            startCell: XLSX.utils.encode_cell({ r: m.s.r, c: m.s.c }),
            endCell: XLSX.utils.encode_cell({ r: m.e.r, c: m.e.c })
          }))
        },
        availableFields: AVAILABLE_FIELDS
      }
    })
  } catch (e) {
    console.error('解析模板失败:', e)
    res.status(500).json({ code: -1, message: e.message })
  }
})

/**
 * 解析ExcelJS合并单元格范围字符串
 */
function decodeExcelJSRange(rangeStr) {
  // 格式如 "A1:C3"
  const match = rangeStr.match(/([A-Z]+)(\d+):([A-Z]+)(\d+)/)
  if (!match) return null
  
  const colToNum = (col) => {
    let num = 0
    for (let i = 0; i < col.length; i++) {
      num = num * 26 + (col.charCodeAt(i) - 64)
    }
    return num - 1
  }
  
  return {
    s: { r: parseInt(match[2]) - 1, c: colToNum(match[1]) },
    e: { r: parseInt(match[4]) - 1, c: colToNum(match[3]) }
  }
}

/**
 * 生成带样式的预览HTML（使用ExcelJS）
 */
function generatePreviewHtmlWithStyles(worksheet, rowCount, colCount, merges) {
  // 找出有效范围
  const { validTop, validLeft, validBottom, validRight } = findValidRangeExcelJS(worksheet, rowCount, colCount)
  
  const top = validTop
  const left = validLeft
  const bottom = validBottom
  const right = validRight
  
  // 构建合并单元格查找表
  const mergeMap = new Map()
  merges.forEach(m => {
    for (let r = m.s.r; r <= m.e.r; r++) {
      for (let c = m.s.c; c <= m.e.c; c++) {
        if (r === m.s.r && c === m.s.c) {
          mergeMap.set(`${r}-${c}`, {
            isOrigin: true,
            rowspan: m.e.r - m.s.r + 1,
            colspan: m.e.c - m.s.c + 1
          })
        } else {
          mergeMap.set(`${r}-${c}`, { isOrigin: false })
        }
      }
    }
  })
  
  // 获取列宽（ExcelJS使用worksheet.columns）
  const colWidths = {}
  for (let c = left; c <= right; c++) {
    const col = worksheet.getColumn(c + 1)
    // ExcelJS列宽单位约为字符宽度，1个字符约7像素
    const width = col.width ? Math.round(col.width * 7) : 64
    colWidths[c] = Math.max(30, Math.min(width, 300)) // 限制30-300px
  }
  
  // 开始生成HTML
  let html = '<table class="template-preview-table" style="border-collapse: collapse; table-layout: fixed;">'
  
  // colgroup定义列宽
  html += '<colgroup>'
  html += '<col style="width: 35px;">' // 行号列
  for (let c = left; c <= right; c++) {
    html += `<col style="width: ${colWidths[c]}px;">`
  }
  html += '</colgroup>'
  
  // 表头行：列字母
  html += '<thead><tr>'
  html += '<th class="coord-header" style="width: 35px; min-width: 35px;"></th>'
  for (let c = left; c <= right; c++) {
    const colLetter = XLSX.utils.encode_col(c)
    html += `<th class="coord-header col-header" style="width: ${colWidths[c]}px;">${colLetter}</th>`
  }
  html += '</tr></thead>'
  
  // 数据行
  html += '<tbody>'
  for (let r = top; r <= bottom; r++) {
    const row = worksheet.getRow(r + 1)
    // 获取行高（ExcelJS行高单位为磅，1磅约1.33像素）
    let rowHeight = row.height ? Math.round(row.height * 1.33) : 20
    rowHeight = Math.max(18, Math.min(rowHeight, 100)) // 限制18-100px
    
    html += `<tr style="height: ${rowHeight}px;">`
    // 行号
    html += `<td class="coord-header row-header" style="height: ${rowHeight}px;">${r + 1}</td>`
    
    for (let c = left; c <= right; c++) {
      const mergeInfo = mergeMap.get(`${r}-${c}`)
      
      if (mergeInfo && !mergeInfo.isOrigin) {
        continue
      }
      
      const cell = worksheet.getCell(r + 1, c + 1)
      const value = cell.text || (cell.value !== null && cell.value !== undefined ? String(cell.value) : '')
      const cellAddr = XLSX.utils.encode_cell({ r, c })
      
      // 构建单元格样式
      const cellStyle = buildCellStyle(cell, rowHeight)
      
      let tdAttrs = `data-cell="${cellAddr}" data-row="${r + 1}" data-col="${c + 1}"`
      let tdClass = 'template-cell'
      
      if (mergeInfo && mergeInfo.isOrigin) {
        if (mergeInfo.rowspan > 1) tdAttrs += ` rowspan="${mergeInfo.rowspan}"`
        if (mergeInfo.colspan > 1) tdAttrs += ` colspan="${mergeInfo.colspan}"`
        tdClass += ' merged-cell'
      }
      
      // 转义HTML
      const safeValue = value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
      
      html += `<td class="${tdClass}" ${tdAttrs} style="${cellStyle}">${safeValue}</td>`
    }
    html += '</tr>'
  }
  html += '</tbody></table>'
  
  return html
}

/**
 * 构建单元格CSS样式
 */
function buildCellStyle(cell, defaultHeight) {
  const styles = []
  
  // ExcelJS 的样式可能在 cell.style 或直接在 cell 上
  const cellStyle = cell.style || {}
  
  // 字体样式 - 可能在 cell.font 或 cellStyle.font
  const font = cell.font || cellStyle.font
  if (font) {
    if (font.bold) styles.push('font-weight: bold')
    if (font.italic) styles.push('font-style: italic')
    if (font.underline) styles.push('text-decoration: underline')
    if (font.size) styles.push(`font-size: ${Math.min(font.size, 14)}px`)
    if (font.color && font.color.argb) {
      const color = '#' + font.color.argb.substring(2)
      styles.push(`color: ${color}`)
    }
    if (font.name) styles.push(`font-family: "${font.name}", sans-serif`)
  }
  
  // 获取对齐方式 - 可能在 cell.alignment 或 cellStyle.alignment
  const alignment = cell.alignment || cellStyle.alignment || {}
  
  // 判断单元格数据类型
  const cellType = cell.type
  const isNumeric = cellType === 2 || cellType === 4 || cellType === 6
  
  // 水平对齐
  const hAlign = alignment.horizontal
  if (hAlign) {
    switch (hAlign) {
      case 'center':
      case 'centerContinuous':
        styles.push('text-align: center')
        break
      case 'right':
        styles.push('text-align: right')
        break
      case 'left':
        styles.push('text-align: left')
        break
      case 'fill':
      case 'justify':
      case 'distributed':
        styles.push('text-align: justify')
        break
      case 'general':
        // general: 数字右对齐，文本左对齐
        if (isNumeric) {
          styles.push('text-align: right')
        }
        break
      default:
        if (isNumeric) {
          styles.push('text-align: right')
        }
        break
    }
  } else {
    // 没有设置对齐时，数字右对齐
    if (isNumeric) {
      styles.push('text-align: right')
    }
  }
  
  // 垂直对齐
  const vAlign = alignment.vertical
  if (vAlign) {
    switch (vAlign) {
      case 'middle':
        styles.push('vertical-align: middle')
        break
      case 'top':
        styles.push('vertical-align: top')
        break
      case 'bottom':
        styles.push('vertical-align: bottom')
        break
      default:
        styles.push('vertical-align: middle')
        break
    }
  } else {
    styles.push('vertical-align: middle')
  }
  
  // 文字换行
  if (alignment.wrapText) {
    styles.push('white-space: normal')
    styles.push('word-wrap: break-word')
  }
  
  // 缩进
  if (alignment.indent && alignment.indent > 0) {
    styles.push(`padding-left: ${alignment.indent * 8}px`)
  }
  
  // 背景色 - 可能在 cell.fill 或 cellStyle.fill
  const fill = cell.fill || cellStyle.fill
  if (fill && fill.type === 'pattern' && fill.fgColor) {
    let bgColor = null
    if (fill.fgColor.argb) {
      bgColor = '#' + fill.fgColor.argb.substring(2)
    } else if (fill.fgColor.theme !== undefined) {
      const themeColors = ['#FFFFFF', '#000000', '#E7E6E6', '#44546A', '#4472C4', '#ED7D31', '#A5A5A5', '#FFC000', '#5B9BD5', '#70AD47']
      bgColor = themeColors[fill.fgColor.theme] || null
    }
    if (bgColor && bgColor.toUpperCase() !== '#FFFFFF') {
      styles.push(`background-color: ${bgColor}`)
    }
  }
  
  // 边框 - 可能在 cell.border 或 cellStyle.border
  const border = cell.border || cellStyle.border
  if (border) {
    const borderStyle = '1px solid #000'
    if (border.top && border.top.style) styles.push(`border-top: ${borderStyle}`)
    if (border.bottom && border.bottom.style) styles.push(`border-bottom: ${borderStyle}`)
    if (border.left && border.left.style) styles.push(`border-left: ${borderStyle}`)
    if (border.right && border.right.style) styles.push(`border-right: ${borderStyle}`)
  }
  
  return styles.join('; ')
}

/**
 * 查找有效范围（ExcelJS版本）
 */
function findValidRangeExcelJS(worksheet, rowCount, colCount) {
  let validTop = 0, validLeft = 0, validBottom = rowCount - 1, validRight = colCount - 1
  
  // 检查单元格是否有内容
  const hasContent = (r, c) => {
    const cell = worksheet.getCell(r + 1, c + 1)
    return cell.value !== null && cell.value !== undefined && String(cell.value).trim() !== ''
  }
  
  // 找有效上边界
  for (let r = 0; r < rowCount; r++) {
    let hasRow = false
    for (let c = 0; c < colCount; c++) {
      if (hasContent(r, c)) { hasRow = true; break }
    }
    if (hasRow) { validTop = r; break }
  }
  
  // 找有效下边界
  for (let r = rowCount - 1; r >= validTop; r--) {
    let hasRow = false
    for (let c = 0; c < colCount; c++) {
      if (hasContent(r, c)) { hasRow = true; break }
    }
    if (hasRow) { validBottom = r; break }
  }
  
  // 找有效左边界
  for (let c = 0; c < colCount; c++) {
    let hasCol = false
    for (let r = validTop; r <= validBottom; r++) {
      if (hasContent(r, c)) { hasCol = true; break }
    }
    if (hasCol) { validLeft = c; break }
  }
  
  // 找有效右边界
  for (let c = colCount - 1; c >= validLeft; c--) {
    let hasCol = false
    for (let r = validTop; r <= validBottom; r++) {
      if (hasContent(r, c)) { hasCol = true; break }
    }
    if (hasCol) { validRight = c; break }
  }
  
  // 增加1行/列边距
  validTop = Math.max(0, validTop - 1)
  validLeft = Math.max(0, validLeft - 1)
  validBottom = Math.min(rowCount - 1, validBottom + 1)
  validRight = Math.min(colCount - 1, validRight + 1)
  
  return { validTop, validLeft, validBottom, validRight }
}

/**
 * 生成带坐标的预览HTML（裁剪空白行列）- 保留旧版本用于兼容
 */
function generatePreviewHtml(ws, range, merges) {
  // 先找出有效的行列范围（排除空白行列）
  const { validTop, validLeft, validBottom, validRight } = findValidRange(ws, range)
  
  // 如果没有有效内容，使用原始范围
  const top = validTop !== -1 ? validTop : range.s.r
  const left = validLeft !== -1 ? validLeft : range.s.c
  const bottom = validBottom !== -1 ? validBottom : range.e.r
  const right = validRight !== -1 ? validRight : range.e.c
  
  // 构建合并单元格查找表
  const mergeMap = new Map()
  merges.forEach(m => {
    for (let r = m.s.r; r <= m.e.r; r++) {
      for (let c = m.s.c; c <= m.e.c; c++) {
        if (r === m.s.r && c === m.s.c) {
          mergeMap.set(`${r}-${c}`, {
            isOrigin: true,
            rowspan: m.e.r - m.s.r + 1,
            colspan: m.e.c - m.s.c + 1
          })
        } else {
          mergeMap.set(`${r}-${c}`, { isOrigin: false })
        }
      }
    }
  })
  
  // 获取单元格值
  const getCellValue = (r, c) => {
    const addr = XLSX.utils.encode_cell({ r, c })
    const cell = ws[addr]
    if (!cell) return ''
    if (cell.v === null || cell.v === undefined) return ''
    return String(cell.v)
  }
  
  let html = '<table class="template-preview-table">'
  
  // 表头行：列字母
  html += '<thead><tr><th class="coord-header"></th>'
  for (let c = left; c <= right; c++) {
    const colLetter = XLSX.utils.encode_col(c)
    html += `<th class="coord-header col-header">${colLetter}</th>`
  }
  html += '</tr></thead>'
  
  // 数据行
  html += '<tbody>'
  for (let r = top; r <= bottom; r++) {
    html += '<tr>'
    // 行号
    html += `<td class="coord-header row-header">${r + 1}</td>`
    
    for (let c = left; c <= right; c++) {
      const mergeInfo = mergeMap.get(`${r}-${c}`)
      
      if (mergeInfo && !mergeInfo.isOrigin) {
        continue
      }
      
      const value = getCellValue(r, c)
      const cellAddr = XLSX.utils.encode_cell({ r, c })
      
      let tdAttrs = `data-cell="${cellAddr}" data-row="${r + 1}" data-col="${c + 1}"`
      let tdClass = 'template-cell'
      
      if (mergeInfo && mergeInfo.isOrigin) {
        if (mergeInfo.rowspan > 1) tdAttrs += ` rowspan="${mergeInfo.rowspan}"`
        if (mergeInfo.colspan > 1) tdAttrs += ` colspan="${mergeInfo.colspan}"`
        tdClass += ' merged-cell'
      }
      
      // 转义HTML
      const safeValue = value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
      
      html += `<td class="${tdClass}" ${tdAttrs}>${safeValue}</td>`
    }
    html += '</tr>'
  }
  html += '</tbody></table>'
  
  return html
}

/**
 * 查找有效的行列范围（排除连续空白行列）
 */
function findValidRange(ws, range) {
  const top = range.s.r, left = range.s.c, bottom = range.e.r, right = range.e.c
  
  // 检查单元格是否有值
  const hasValue = (r, c) => {
    const addr = XLSX.utils.encode_cell({ r, c })
    const cell = ws[addr]
    return cell && cell.v !== null && cell.v !== undefined && String(cell.v).trim() !== ''
  }
  
  // 检查行是否有内容
  const rowHasContent = (r) => {
    for (let c = left; c <= right; c++) {
      if (hasValue(r, c)) return true
    }
    return false
  }
  
  // 检查列是否有内容
  const colHasContent = (c) => {
    for (let r = top; r <= bottom; r++) {
      if (hasValue(r, c)) return true
    }
    return false
  }
  
  // 找有效的上边界
  let validTop = top
  for (let r = top; r <= bottom; r++) {
    if (rowHasContent(r)) { validTop = r; break }
  }
  
  // 找有效的下边界（从下往上找最后一行有内容的）
  let validBottom = bottom
  for (let r = bottom; r >= validTop; r--) {
    if (rowHasContent(r)) { validBottom = r; break }
  }
  
  // 找有效的左边界
  let validLeft = left
  for (let c = left; c <= right; c++) {
    if (colHasContent(c)) { validLeft = c; break }
  }
  
  // 找有效的右边界（从右往左找最后一列有内容的）
  let validRight = right
  for (let c = right; c >= validLeft; c--) {
    if (colHasContent(c)) { validRight = c; break }
  }
  
  // 额外扩展1-2行/列作为边距（如果原范围允许）
  const margin = 1
  validTop = Math.max(top, validTop - margin)
  validLeft = Math.max(left, validLeft - margin)
  validBottom = Math.min(bottom, validBottom + margin)
  validRight = Math.min(right, validRight + margin)
  
  return { validTop, validLeft, validBottom, validRight }
}

/**
 * 保存映射配置
 * POST /api/supplier-complaint-templates/:id/mapping
 */
router.post('/:id/mapping', authenticateToken, (req, res) => {
  try {
    const id = Number(req.params.id)
    const list = readMeta()
    const idx = list.findIndex(t => t.id === id)
    
    if (idx === -1) {
      return res.status(404).json({ code: -1, message: '模板不存在' })
    }
    
    list[idx].mapping = req.body && typeof req.body === 'object' ? req.body : null
    list[idx].updateTime = new Date().toISOString()
    writeMeta(list)
    
    res.json({ code: 0, message: '映射配置保存成功' })
  } catch (e) {
    console.error('保存映射失败:', e)
    res.status(500).json({ code: -1, message: e.message })
  }
})

/**
 * 获取映射配置
 * GET /api/supplier-complaint-templates/:id/mapping
 */
router.get('/:id/mapping', authenticateToken, (req, res) => {
  try {
    const id = Number(req.params.id)
    const list = readMeta()
    const curr = list.find(t => t.id === id)
    
    if (!curr) {
      return res.status(404).json({ code: -1, message: '模板不存在' })
    }
    
    res.json({ code: 0, data: curr.mapping || null })
  } catch (e) {
    res.status(500).json({ code: -1, message: e.message })
  }
})

/**
 * 获取默认模板
 * GET /api/supplier-complaint-templates/default
 */
router.get('/default/info', authenticateToken, (req, res) => {
  const list = readMeta()
  const defaultTpl = list.find(t => t.isDefault && t.enabled)
  
  if (!defaultTpl) {
    // 返回第一个启用的模板
    const firstEnabled = list.find(t => t.enabled)
    if (firstEnabled) {
      return res.json({ code: 0, data: firstEnabled })
    }
    return res.json({ code: 0, data: null, message: '暂无可用模板' })
  }
  
  res.json({ code: 0, data: defaultTpl })
})

/**
 * 基于模板生成投诉书
 * POST /api/supplier-complaint-templates/:id/generate
 */
router.post('/:id/generate', authenticateToken, async (req, res) => {
  try {
    const id = Number(req.params.id)
    const list = readMeta()
    const tpl = list.find(t => t.id === id)
    
    if (!tpl) {
      return res.status(404).json({ code: -1, message: '模板不存在' })
    }
    
    const fullPath = path.join(UPLOAD_DIR, tpl.filePath)
    if (!fs.existsSync(fullPath)) {
      return res.status(404).json({ code: -1, message: '模板文件不存在' })
    }
    
    const { data: recordsData, sealId, sealSize } = req.body
    if (!recordsData || !Array.isArray(recordsData) || recordsData.length === 0) {
      return res.status(400).json({ code: -1, message: '缺少投诉记录数据' })
    }
    
    const mapping = tpl.mapping
    if (!mapping || !mapping.fields || mapping.fields.length === 0) {
      return res.status(400).json({ code: -1, message: '模板尚未配置字段映射，请先配置' })
    }
    
    // 检查是否有电子印章字段映射
    const hasSealField = mapping.fields.some(f => f.fieldName === 'ElectronicSeal')
    
    // 如果有印章字段但未提供印章ID，返回错误
    if (hasSealField && !sealId) {
      return res.status(400).json({ code: -1, message: '模板包含电子印章字段，请选择印章' })
    }
    
    // 预先加载印章信息（如果需要）
    let sealInfo = null
    let sealSizeConfig = null // 印章尺寸配置
    if (hasSealField && sealId) {
      try {
        const pool = await getConnection()
        const sealResult = await pool.request()
          .input('sealId', sealId)
          .query('SELECT ID, SealName, ImageUrl FROM ElectronicSeals WHERE ID = @sealId AND IsActive = 1')
        
        if (sealResult.recordset.length > 0) {
          sealInfo = sealResult.recordset[0]
          // 保存尺寸配置
          sealSizeConfig = sealSize || { mode: 'original' }
        } else {
          return res.status(400).json({ code: -1, message: '所选印章不存在或已禁用' })
        }
      } catch (err) {
        console.error('查询印章失败:', err)
        return res.status(500).json({ code: -1, message: '查询印章失败' })
      }
    }
    
    // 创建输出工作簿
    const outputWorkbook = new ExcelJS.Workbook()
    
    // 生成时间戳
    const now = new Date()
    const timestamp = `${now.getFullYear().toString().slice(-2)}${(now.getMonth() + 1).toString().padStart(2, '0')}${now.getDate().toString().padStart(2, '0')}${now.getHours().toString().padStart(2, '0')}${now.getMinutes().toString().padStart(2, '0')}`
    
    // 为每条投诉记录生成一个工作表
    for (let i = 0; i < recordsData.length; i++) {
      const record = recordsData[i]
      
      // 读取模板
      const templateWorkbook = new ExcelJS.Workbook()
      await templateWorkbook.xlsx.readFile(fullPath)
      const templateWorksheet = templateWorkbook.worksheets[0]
      
      // 生成工作表名称
      const supplierShort = (record.SupplierName || '供应商').substring(0, 4)
      const materialShort = (record.MaterialName || '物料').substring(0, 6)
      let worksheetName = `${supplierShort}_${materialShort}_${timestamp}`
      
      // 确保工作表名称唯一
      if (recordsData.length > 1) {
        worksheetName += `_${i + 1}`
      }
      
      // 限制工作表名称长度（Excel限制31个字符）
      worksheetName = worksheetName.substring(0, 31)
      
      const worksheet = outputWorkbook.addWorksheet(worksheetName)
      
      // 关闭网格线，设置页面边距
      // ExcelJS 使用英寸(Inches)作为单位
      // 用户要求(cm): 上下0.4, 左1.0, 右0.5
      // 换算为英寸: 0.4/2.54≈0.157, 1.0/2.54≈0.394, 0.5/2.54≈0.197
      worksheet.views = [{ showGridLines: false }]
      worksheet.pageSetup = {
        margins: {
          left: 0.394,
          right: 0.197,
          top: 0.157,
          bottom: 0.157,
          header: 0.118,
          footer: 0.118
        }
      }
      
      // 复制模板内容（包含空单元格，确保边框样式被复制）
      // 使用双重循环遍历整个区域，而不仅仅是eachRow，以确保覆盖合并单元格的边缘
      const rowCount = templateWorksheet.rowCount
      const colCount = templateWorksheet.columnCount
      
      for (let r = 1; r <= rowCount; r++) {
        const row = templateWorksheet.getRow(r)
        const newRow = worksheet.getRow(r)
        
        // 复制行高
        if (row.height) {
          newRow.height = row.height
        }
        
        for (let c = 1; c <= colCount; c++) {
          const cell = row.getCell(c)
          const newCell = newRow.getCell(c)
          
          // 复制值
          newCell.value = cell.value
          
          // 复制样式
          if (cell.style) {
            try {
              newCell.style = JSON.parse(JSON.stringify(cell.style))
            } catch (e) {
              newCell.style = { ...cell.style }
            }
          }
        }
      }
      
    // 引入 sharp 用于图片处理
    const sharp = require('sharp')

    // 复制合并单元格
    const mergedCells = [] // 存储合并信息供后续查询
      if (templateWorksheet.model && templateWorksheet.model.merges) {
        templateWorksheet.model.merges.forEach(merge => {
          worksheet.mergeCells(merge)
          // 保存解码后的范围
          const range = decodeExcelJSRange(merge)
          if (range) mergedCells.push(range)
          
          // 修复合并单元格边框
          // 策略：结合模板主单元格的边框和边缘单元格的边框
          // const range = decodeExcelJSRange(merge) // 已经在上面解码了
          if (!range) return

          const masterTemplateCell = templateWorksheet.getCell(range.s.r + 1, range.s.c + 1)
          const masterBorder = (masterTemplateCell.style && masterTemplateCell.style.border) ? masterTemplateCell.style.border : {}

          // 辅助函数：应用边框
          const applyBorder = (targetCell, side, value) => {
            if (!value) return
            if (!targetCell.style) targetCell.style = {}
            if (!targetCell.style.border) targetCell.style.border = {}
            targetCell.style.border[side] = value
          }

          // 1. 顶部边框
          for (let c = range.s.c; c <= range.e.c; c++) {
            const templateCell = templateWorksheet.getCell(range.s.r + 1, c + 1)
            const borderStyle = (templateCell.style && templateCell.style.border && templateCell.style.border.top) 
              ? templateCell.style.border.top 
              : masterBorder.top
            
            if (borderStyle) {
              const cell = worksheet.getCell(range.s.r + 1, c + 1)
              applyBorder(cell, 'top', borderStyle)
            }
          }

          // 2. 底部边框
          for (let c = range.s.c; c <= range.e.c; c++) {
            const templateCell = templateWorksheet.getCell(range.e.r + 1, c + 1)
            const borderStyle = (templateCell.style && templateCell.style.border && templateCell.style.border.bottom) 
              ? templateCell.style.border.bottom 
              : masterBorder.bottom
            
            if (borderStyle) {
              const cell = worksheet.getCell(range.e.r + 1, c + 1)
              applyBorder(cell, 'bottom', borderStyle)
            }
          }

          // 3. 左侧边框
          for (let r = range.s.r; r <= range.e.r; r++) {
            const templateCell = templateWorksheet.getCell(r + 1, range.s.c + 1)
            const borderStyle = (templateCell.style && templateCell.style.border && templateCell.style.border.left) 
              ? templateCell.style.border.left 
              : masterBorder.left
            
            if (borderStyle) {
              const cell = worksheet.getCell(r + 1, range.s.c + 1)
              applyBorder(cell, 'left', borderStyle)
            }
          }

          // 4. 右侧边框
          for (let r = range.s.r; r <= range.e.r; r++) {
            const templateCell = templateWorksheet.getCell(r + 1, range.e.c + 1)
            const borderStyle = (templateCell.style && templateCell.style.border && templateCell.style.border.right) 
              ? templateCell.style.border.right 
              : masterBorder.right
            
            if (borderStyle) {
              const cell = worksheet.getCell(r + 1, range.e.c + 1)
              applyBorder(cell, 'right', borderStyle)
            }
          }
        })
      }
      
      // 复制列宽
      for (let i = 1; i <= colCount; i++) {
        const col = templateWorksheet.getColumn(i)
        if (col.width) {
          worksheet.getColumn(i).width = col.width
        }
      }

      // 插入公司 LOGO (从 SiteConfig 表获取)
      try {
        const pool = await getConnection()
        const logoResult = await pool.request()
          .query("SELECT ConfigValue FROM SiteConfig WHERE ConfigKey = 'logoBase64Img'")
        
        if (logoResult.recordset.length > 0 && logoResult.recordset[0].ConfigValue) {
          const base64Str = logoResult.recordset[0].ConfigValue
          // 格式通常是: data:image/png;base64,iVBORw0KGgo...
          // 有些情况下可能没有前缀，直接是base64字符串，这里做兼容处理
          let base64Data = base64Str
          let extension = 'png' // 默认扩展名
          
          if (base64Str.includes('base64,')) {
            const matches = base64Str.match(/^data:image\/([a-zA-Z]*);base64,(.+)$/)
            if (matches && matches.length === 3) {
              extension = matches[1]
              base64Data = matches[2]
            } else {
              // 简单的分割处理
              const parts = base64Str.split('base64,')
              base64Data = parts[1]
              // 尝试从头部获取扩展名
              const head = parts[0]
              if (head.includes('image/')) {
                extension = head.split('image/')[1].split(';')[0]
              }
            }
          }
          
          if (base64Data) {
            const buffer = Buffer.from(base64Data, 'base64')
            
            // 使用 sharp 获取 logo 尺寸
            let targetWidth = 84 // 默认宽度 (按35高度比例估算)
            let targetHeight = 35 // 默认高度 (适当缩小)
            
            try {
              const logoMeta = await sharp(buffer).metadata()
              // 设定目标高度为 35px (原50px -> 缩小30%)
              targetHeight = 35
              const scale = targetHeight / logoMeta.height
              targetWidth = logoMeta.width * scale
            } catch (metaErr) {
              console.warn('获取LOGO尺寸失败，使用默认尺寸', metaErr)
            }
            
            const logoId = outputWorkbook.addImage({
              buffer: buffer,
              extension: extension
            })
            
            worksheet.addImage(logoId, {
              tl: { col: 0.2, row: 0.2 }, // 左上角，留一点边距
              ext: { width: targetWidth, height: targetHeight },
              editAs: 'oneCell'
            })
          }
        }
      } catch (logoError) {
        console.error('插入LOGO失败:', logoError)
      }
      
      // 填充数据
      const fillCell = async (cellAddress, value, fieldType) => {
        if (!cellAddress) return
        
        try {
          const cell = worksheet.getCell(cellAddress)
          const originalStyle = cell.style
          
          // 处理图片
          if (fieldType === 'image' && value) {
            try {
              // value 可能是逗号分隔的路径或 JSON 数组
              let imagePaths = []
              if (Array.isArray(value)) {
                imagePaths = value
              } else if (typeof value === 'string') {
                if (value.startsWith('[')) {
                  try {
                    imagePaths = JSON.parse(value)
                  } catch (e) {
                    imagePaths = [value]
                  }
                } else {
                  imagePaths = value.split(',').filter(p => p.trim())
                }
              }

              // 只处理第一张图片
              if (imagePaths.length > 0) {
                let imagePath = imagePaths[0]
                // 处理路径: 如果是相对路径或 URL，需要转换为服务器上的绝对文件路径
                // 假设图片存储在 server/uploads 或 D:\DMSData\IMG-VIDEO
                // 这里需要根据实际情况调整
                
                // 尝试解析文件系统路径
                let fsPath = null
                let searchPaths = []
                
                // 提取相对路径或文件名
                let relativePath = imagePath
                let fileName = path.basename(imagePath)
                
                if (imagePath.startsWith('http') || imagePath.startsWith('/')) {
                   try {
                     const urlPath = imagePath.startsWith('http') ? new URL(imagePath).pathname : imagePath
                     relativePath = decodeURIComponent(urlPath).replace(/^\/files\//, '').replace(/^\//, '')
                     fileName = path.basename(relativePath)
                   } catch (e) {
                     // ignore url parse error
                   }
                }

                // 定义搜索路径列表
                searchPaths = [
                  // 1. 直接匹配 uploads 下的相对路径 (如 uploads/supplier-complaint/xxx.jpg)
                  path.join(__dirname, '../uploads', relativePath),
                  // 2. 尝试在 supplier-complaint 子目录下查找
                  path.join(__dirname, '../uploads/supplier-complaint', fileName),
                  // 3. 尝试在 customer-complaint 子目录下查找
                  path.join(__dirname, '../uploads/customer-complaint', fileName),
                  // 4. 尝试在 attachments 子目录下查找
                  path.join(__dirname, '../uploads/attachments', fileName),
                  // 5. 尝试在 site-images 子目录下查找
                  path.join(__dirname, '../uploads/site-images', fileName),
                  // 6. 尝试绝对路径或原始路径
                  imagePath,
                  // 7. 备用路径 (D盘)
                  path.join('D:\\DMSData\\IMG-VIDEO', relativePath)
                ]
                
                // 查找第一个存在的文件
                fsPath = searchPaths.find(p => {
                  try {
                    return fs.existsSync(p) && fs.statSync(p).isFile()
                  } catch (e) {
                    return false
                  }
                })

                if (fsPath) {
                  console.log(`找到图片文件: ${fsPath}`)
                  
                  try {
                    // 使用 sharp 获取图片尺寸
                    const imgMeta = await sharp(fsPath).metadata()
                    const imgW = imgMeta.width
                    const imgH = imgMeta.height
                    
                    // 计算单元格（或合并区域）尺寸
                    // cell.row 和 cell.col 是 1-based
                    const cellR = cell.row
                    const cellC = cell.col
                    
                    // 查找合并区域
                    // mergedCells 中的范围是 0-based
                    const merge = mergedCells.find(m => 
                      cellR - 1 >= m.s.r && cellR - 1 <= m.e.r && 
                      cellC - 1 >= m.s.c && cellC - 1 <= m.e.c
                    )
                    
                    let startRow = cellR, endRow = cellR, startCol = cellC, endCol = cellC
                    if (merge) {
                      startRow = merge.s.r + 1
                      endRow = merge.e.r + 1
                      startCol = merge.s.c + 1
                      endCol = merge.e.c + 1
                    }
                    
                    // 计算区域宽（像素）
                    let areaWidth = 0
                    for (let c = startCol; c <= endCol; c++) {
                      const col = worksheet.getColumn(c)
                      // 1 char width approx 7.5px (Excel默认字体)
                      const w = col.width ? col.width * 7.5 : 64
                      areaWidth += w
                    }
                    
                    // 计算区域高（像素）
                    let areaHeight = 0
                    for (let r = startRow; r <= endRow; r++) {
                      const row = worksheet.getRow(r)
                      // 1 point height approx 1.33px
                      const h = row.height ? row.height * 1.33 : 20
                      areaHeight += h
                    }
                    
                    // 计算缩放比例 (Fit Center, 留 2px 边距)
                    const padding = 4 // total padding
                    const availW = Math.max(1, areaWidth - padding)
                    const availH = Math.max(1, areaHeight - padding)
                    
                    const scaleX = availW / imgW
                    const scaleY = availH / imgH
                    const scale = Math.min(scaleX, scaleY)
                    
                    const finalW = imgW * scale
                    const finalH = imgH * scale
                    
                    // 计算居中偏移
                    const offsetX = (areaWidth - finalW) / 2
                    const offsetY = (areaHeight - finalH) / 2
                    
                    // 计算 tl 坐标
                    // 假设偏移量在第一个单元格内，如果不准确也没关系，tl支持小数
                    const firstCol = worksheet.getColumn(startCol)
                    const firstColW = firstCol.width ? firstCol.width * 7.5 : 64
                    const colOffset = offsetX / firstColW
                    
                    const firstRow = worksheet.getRow(startRow)
                    const firstRowH = firstRow.height ? firstRow.height * 1.33 : 20
                    const rowOffset = offsetY / firstRowH
                    
                    const ext = path.extname(fsPath).toLowerCase()
                    const imageId = outputWorkbook.addImage({
                      filename: fsPath,
                      extension: ext.replace('.', '')
                    })
                    
                    worksheet.addImage(imageId, {
                      tl: { col: startCol - 1 + colOffset, row: startRow - 1 + rowOffset },
                      ext: { width: finalW, height: finalH },
                      editAs: 'oneCell'
                    })
                    
                  } catch (imgError) {
                    console.error('处理图片尺寸失败:', imgError)
                    // 回退逻辑：强制拉伸填满
                    const ext = path.extname(fsPath).toLowerCase()
                    const imageId = outputWorkbook.addImage({
                      filename: fsPath,
                      extension: ext.replace('.', '')
                    })
                    worksheet.addImage(imageId, {
                      tl: { col: cell.col - 1 + 0.05, row: cell.row - 1 + 0.05 },
                      br: { col: cell.col - 0.05, row: cell.row - 0.05 },
                      editAs: 'oneCell' 
                    })
                  }
                  
                  // 清空单元格文本
                  cell.value = ''
                } else {
                   console.warn(`图片文件未找到: ${imagePath}, 尝试查找路径: ${JSON.stringify(searchPaths)}`)
                   cell.value = '图片未找到'
                }
              }
            } catch (err) {
              console.error('插入图片失败:', err)
              cell.value = '图片加载失败'
            }
            return
          }

          // 处理电子印章
          if (fieldType === 'seal') {
            try {
              // 使用前面预加载的印章信息
              if (!sealInfo) {
                console.log('未提供印章信息，跳过印章插入')
                cell.value = ''
                return
              }
              
              const sealImagePath = sealInfo.ImageUrl
              
              if (sealImagePath) {
                // 构建印章图片路径
                let fsPath = null
                const fileName = path.basename(sealImagePath)
                
                // 处理路径：/files/seals/xxx.png 或 /uploads/seals/xxx.png
                let relativePath = sealImagePath
                  .replace(/^\/files\//, '')
                  .replace(/^\/uploads\//, '')
                  .replace(/^\//, '')
                
                const searchPaths = [
                  path.join(__dirname, '../uploads', relativePath),
                  path.join(__dirname, '../uploads/seals', fileName),
                  path.join(__dirname, '..', sealImagePath.replace(/^\//, '')),
                ]
                
                fsPath = searchPaths.find(p => {
                  try {
                    return fs.existsSync(p) && fs.statSync(p).isFile()
                  } catch (e) {
                    return false
                  }
                })
                
                if (fsPath) {
                  console.log(`找到电子印章文件: ${fsPath}`)
                  
                  // 使用 sharp 获取图片原始尺寸
                  const imgMeta = await sharp(fsPath).metadata()
                  const imgW = imgMeta.width
                  const imgH = imgMeta.height
                  
                  // 获取目标单元格位置
                  const cellR = cell.row
                  const cellC = cell.col
                  
                  // 查找合并区域（用于确定起始位置）
                  const merge = mergedCells.find(m => 
                    cellR - 1 >= m.s.r && cellR - 1 <= m.e.r && 
                    cellC - 1 >= m.s.c && cellC - 1 <= m.e.c
                  )
                  
                  let startRow = cellR, startCol = cellC
                  if (merge) {
                    startRow = merge.s.r + 1
                    startCol = merge.s.c + 1
                  }
                  
                  // 计算最终尺寸
                  let finalW = imgW
                  let finalH = imgH
                  
                  if (sealSizeConfig && sealSizeConfig.mode === 'custom') {
                    // 自定义尺寸：cm 转换为像素 (1cm ≈ 37.8 像素 @ 96dpi)
                    const CM_TO_PX = 37.8
                    finalW = (sealSizeConfig.width || 3.8) * CM_TO_PX
                    finalH = (sealSizeConfig.height || 3.8) * CM_TO_PX
                    console.log(`印章使用自定义尺寸: ${sealSizeConfig.width}cm x ${sealSizeConfig.height}cm = ${finalW.toFixed(0)}px x ${finalH.toFixed(0)}px`)
                  } else {
                    console.log(`印章使用原始尺寸: ${imgW}px x ${imgH}px`)
                  }
                  
                  const ext = path.extname(fsPath).toLowerCase()
                  const imageId = outputWorkbook.addImage({
                    filename: fsPath,
                    extension: ext.replace('.', '') || 'png'
                  })
                  
                  // 插入到指定单元格左上角
                  worksheet.addImage(imageId, {
                    tl: { col: startCol - 1, row: startRow - 1 },
                    ext: { width: finalW, height: finalH },
                    editAs: 'oneCell'
                  })
                  
                  // 清空单元格文本
                  cell.value = ''
                  console.log(`电子印章 "${sealInfo.SealName}" 已插入到单元格 ${cellAddress}，原始尺寸: ${imgW}x${imgH}`)
                } else {
                  console.warn(`电子印章文件未找到: ${sealImagePath}, 尝试路径: ${JSON.stringify(searchPaths)}`)
                  cell.value = ''
                }
              }
            } catch (err) {
              console.error('插入电子印章失败:', err)
              cell.value = ''
            }
            return
          }

          // 设置值
          cell.value = value === undefined || value === null ? '' : value
          
          // 保留样式并调整字体
          if (originalStyle) {
            const newStyle = JSON.parse(JSON.stringify(originalStyle))
            if (!newStyle.font) newStyle.font = {}
            newStyle.font.size = newStyle.font.size || 10
            if (!newStyle.alignment) newStyle.alignment = {}
            newStyle.alignment.vertical = 'middle'
            newStyle.alignment.wrapText = true
            cell.style = newStyle
          }
        } catch (e) {
          console.warn(`填充单元格 ${cellAddress} 失败:`, e.message)
        }
      }
      
      // 添加系统字段
      record.CurrentDate = now.toLocaleDateString('zh-CN')
      record.CurrentTime = now.toLocaleString('zh-CN')
      record.ReportNo = `SCR-${timestamp}-${(i + 1).toString().padStart(3, '0')}`
      
      // 根据映射填充数据
      for (const field of mapping.fields) {
        if (!field.cell || !field.fieldName) continue
        
        // 兼容旧的字段名 MaterialSpec -> MaterialSpecification
        let fieldName = field.fieldName
        if (fieldName === 'MaterialSpec') fieldName = 'MaterialSpecification'
        
        // 兼容 InspectorName -> Inspector
        if (fieldName === 'InspectorName') {
          if (record.InspectorName) {
            // 如果已有 InspectorName (可能是前端传来的或查询出来的)，使用它
          } else if (record.Inspector) {
            // 如果没有 InspectorName 但有 Inspector，则使用 Inspector
            record.InspectorName = record.Inspector
          }
        }

        let value = record[fieldName]
        const fieldDef = AVAILABLE_FIELDS.find(f => f.name === fieldName)
        
        // 格式化值
        if (value !== undefined && value !== null) {
          // 特殊处理：将不合格类别转换为复选框形式
          if (fieldName === 'DefectCategory') {
            const defectCategories = ['外观', '卫生', '规格尺寸', '物理性能', '环保要求', '虫害防控', '其它']
            const currentCategory = value || ''
             value = defectCategories.map(cat => {
               const isChecked = currentCategory === cat ? '\u2611' : '\u2610'
               // 去掉复选框和文字之间的空格，使它们更紧凑
               return `${isChecked}${cat}`
             }).join('  ')
           }
           
           // 特殊处理：将IQC判定转换为复选框形式
           else if (fieldName === 'IQCResult') {
             const valStr = String(value || '')
             const isQualified = valStr.includes('合格') || valStr.toLowerCase().includes('qualified') || valStr.toLowerCase().includes('pass')
             const hasResult = !!value
             // 去掉复选框和文字之间的空格
             value = `${isQualified ? '\u2611' : '\u2610'}合格  ${!isQualified && hasResult ? '\u2611' : '\u2610'}不合格`
           }
          
          else if (fieldDef) {
            switch (fieldDef.type) {
              case 'date':
                if (value) {
                  value = new Date(value).toLocaleDateString('zh-CN')
                }
                break
              case 'datetime':
                if (value) {
                  value = new Date(value).toLocaleString('zh-CN')
                }
                break
              case 'currency':
                if (typeof value === 'number') {
                  value = value.toFixed(2)
                }
                break
              case 'percent':
                if (typeof value === 'number') {
                  value = `${(value * 100).toFixed(2)}%`
                }
                break
            }
          }
        }
        
        await fillCell(field.cell, value, fieldDef ? fieldDef.type : 'string')
      }
    }
    
    // 生成输出文件
    let outputFileName = `供应商投诉书_${timestamp}.xlsx`
    
    // 如果是单条记录，按照特定规则生成文件名
    // 规则：采购单号+" "+物料名称+"-"+不良项+" "+质量异常反馈单+" "+投诉编号
    if (recordsData.length === 1) {
      const r = recordsData[0]
      const po = (r.PurchaseOrderNo || '').trim()
      const material = (r.MaterialName || '').trim()
      const defect = (r.DefectItem || '').trim()
      const complaintNo = (r.ComplaintNo || '').trim()
      
      let name = `${po} ${material}-${defect} 质量异常反馈单 ${complaintNo}`
      
      // 清理非法文件名字符
      name = name.replace(/[\\/:*?"<>|]/g, '_').trim()
      // 确保文件名不为空
      if (name) {
        outputFileName = name + '.xlsx'
      }
    }

    const outputPath = path.join(UPLOAD_DIR, outputFileName)
    await outputWorkbook.xlsx.writeFile(outputPath)
    
    // 读取文件并返回
    const fileBuffer = fs.readFileSync(outputPath)
    
    // 删除临时文件
    try {
      fs.unlinkSync(outputPath)
    } catch { /* ignore */ }
    
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(outputFileName)}`)
    res.send(fileBuffer)
    
  } catch (e) {
    console.error('生成投诉书失败:', e)
    res.status(500).json({ code: -1, message: e.message })
  }
})

/**
 * 预览数据填充效果（返回HTML）
 * POST /api/supplier-complaint-templates/:id/preview
 */
router.post('/:id/preview', authenticateToken, async (req, res) => {
  try {
    const id = Number(req.params.id)
    const list = readMeta()
    const tpl = list.find(t => t.id === id)
    
    if (!tpl) {
      return res.status(404).json({ code: -1, message: '模板不存在' })
    }
    
    const fullPath = path.join(UPLOAD_DIR, tpl.filePath)
    if (!fs.existsSync(fullPath)) {
      return res.status(404).json({ code: -1, message: '模板文件不存在' })
    }
    
    const { testData } = req.body
    const mapping = tpl.mapping
    
    // 读取模板
    const buf = fs.readFileSync(fullPath)
    const wb = XLSX.read(buf, { type: 'buffer' })
    const ws = wb.Sheets[wb.SheetNames[0]]
    
    if (!ws['!ref']) {
      return res.status(400).json({ code: -1, message: '工作表为空' })
    }
    
    const range = XLSX.utils.decode_range(ws['!ref'])
    const merges = ws['!merges'] || []
    
    // 如果有映射和测试数据，创建填充后的预览
    const filledCells = new Map()
    if (mapping && mapping.fields && testData) {
      mapping.fields.forEach(field => {
        if (field.cell && field.fieldName && testData[field.fieldName] !== undefined) {
          filledCells.set(field.cell, {
            value: testData[field.fieldName],
            fieldName: field.fieldName
          })
        }
      })
    }
    
    // 生成预览HTML（带填充效果）
    const previewHtml = generatePreviewHtmlWithData(ws, range, merges, filledCells, mapping)
    
    res.json({
      code: 0,
      data: { previewHtml }
    })
  } catch (e) {
    console.error('预览失败:', e)
    res.status(500).json({ code: -1, message: e.message })
  }
})

/**
 * 生成带数据填充的预览HTML
 */
function generatePreviewHtmlWithData(ws, range, merges, filledCells, mapping) {
  const top = range.s.r, left = range.s.c, bottom = range.e.r, right = range.e.c
  
  // 构建合并单元格查找表
  const mergeMap = new Map()
  merges.forEach(m => {
    for (let r = m.s.r; r <= m.e.r; r++) {
      for (let c = m.s.c; c <= m.e.c; c++) {
        if (r === m.s.r && c === m.s.c) {
          mergeMap.set(`${r}-${c}`, {
            isOrigin: true,
            rowspan: m.e.r - m.s.r + 1,
            colspan: m.e.c - m.s.c + 1
          })
        } else {
          mergeMap.set(`${r}-${c}`, { isOrigin: false })
        }
      }
    }
  })
  
  // 构建已映射单元格集合
  const mappedCells = new Set()
  if (mapping && mapping.fields) {
    mapping.fields.forEach(field => {
      if (field.cell) {
        mappedCells.add(field.cell)
      }
    })
  }
  
  const getCellValue = (r, c) => {
    const addr = XLSX.utils.encode_cell({ r, c })
    const cell = ws[addr]
    if (!cell) return ''
    if (cell.v === null || cell.v === undefined) return ''
    return String(cell.v)
  }
  
  let html = '<table class="template-preview-table">'
  
  html += '<thead><tr><th class="coord-header"></th>'
  for (let c = left; c <= right; c++) {
    html += `<th class="coord-header col-header">${XLSX.utils.encode_col(c)}</th>`
  }
  html += '</tr></thead>'
  
  html += '<tbody>'
  for (let r = top; r <= bottom; r++) {
    html += '<tr>'
    html += `<td class="coord-header row-header">${r + 1}</td>`
    
    for (let c = left; c <= right; c++) {
      const mergeInfo = mergeMap.get(`${r}-${c}`)
      
      if (mergeInfo && !mergeInfo.isOrigin) {
        continue
      }
      
      const cellAddr = XLSX.utils.encode_cell({ r, c })
      let value = getCellValue(r, c)
      let tdAttrs = `data-cell="${cellAddr}" data-row="${r + 1}" data-col="${c + 1}"`
      let tdClass = 'template-cell'
      
      // 检查是否有填充数据
      if (filledCells.has(cellAddr)) {
        const fillInfo = filledCells.get(cellAddr)
        value = fillInfo.value
        tdClass += ' filled-cell'
        tdAttrs += ` data-field="${fillInfo.fieldName}"`
      } else if (mappedCells.has(cellAddr)) {
        // 已映射但无数据
        tdClass += ' mapped-cell'
      }
      
      if (mergeInfo && mergeInfo.isOrigin) {
        if (mergeInfo.rowspan > 1) tdAttrs += ` rowspan="${mergeInfo.rowspan}"`
        if (mergeInfo.colspan > 1) tdAttrs += ` colspan="${mergeInfo.colspan}"`
        tdClass += ' merged-cell'
      }
      
      const safeValue = String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
      
      html += `<td class="${tdClass}" ${tdAttrs}>${safeValue}</td>`
    }
    html += '</tr>'
  }
  html += '</tbody></table>'
  
  return html
}

module.exports = router
