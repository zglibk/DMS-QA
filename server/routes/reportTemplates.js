const express = require('express')
const router = express.Router()
const path = require('path')
const fs = require('fs')
const multer = require('multer')
const { authenticateToken } = require('../middleware/auth')

const DATA_DIR = path.join(__dirname, '../data')
const UPLOAD_DIR = path.join(__dirname, '../uploads/report-templates')
const META_FILE = path.join(DATA_DIR, 'report-templates.json')

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true })
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true })
if (!fs.existsSync(META_FILE)) fs.writeFileSync(META_FILE, JSON.stringify([]))

function readMeta() {
  try { return JSON.parse(fs.readFileSync(META_FILE, 'utf-8')) } catch { return [] }
}

function writeMeta(list) {
  fs.writeFileSync(META_FILE, JSON.stringify(list, null, 2), 'utf-8')
}

/**
 * 解码中文文件名
 * multipart/form-data 中的文件名可能是 Latin-1 编码的 UTF-8 字节
 * 需要将其正确解码为中文
 */
function decodeFileName(filename) {
  if (!filename) return filename
  try {
    // 方法1: 尝试将 Latin-1 编码的字符串转换回 UTF-8
    const decoded = Buffer.from(filename, 'latin1').toString('utf8')
    // 检查解码后是否包含有效的中文字符
    if (/[\u4e00-\u9fa5]/.test(decoded)) {
      return decoded
    }
    // 方法2: 尝试 URI 解码（某些浏览器会进行 URL 编码）
    if (filename.includes('%')) {
      try {
        const uriDecoded = decodeURIComponent(filename)
        if (/[\u4e00-\u9fa5]/.test(uriDecoded)) {
          return uriDecoded
        }
      } catch (e) { /* ignore */ }
    }
    // 如果原始文件名已经是正确的 UTF-8，直接返回
    return filename
  } catch (e) {
    return filename
  }
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    // 解码文件名
    const decodedName = decodeFileName(file.originalname)
    const ext = path.extname(decodedName)
    const base = path.basename(decodedName, ext)
    // 生成安全的文件名：使用时间戳确保唯一性
    const unique = `${base}_${Date.now()}${ext}`
    // 将解码后的文件名存储到 file 对象上供后续使用
    file.decodedOriginalname = decodedName
    cb(null, unique)
  }
})

const upload = multer({ 
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB
  },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase()
    if (['.xlsx', '.xls'].includes(ext)) {
      cb(null, true)
    } else {
      cb(new Error('只支持 .xlsx 或 .xls 格式的文件'))
    }
  }
})

router.get('/', authenticateToken, (req, res) => {
  const list = readMeta()
  // 对历史数据的文件名进行解码处理
  const decodedList = list.map(item => ({
    ...item,
    fileName: decodeFileName(item.fileName)
  }))
  res.json({ code: 0, data: decodedList })
})

router.get('/:id', authenticateToken, (req, res) => {
  const id = Number(req.params.id)
  const list = readMeta()
  const curr = list.find(t => t.id === id)
  if (!curr) return res.status(404).json({ code: -1, message: '模板不存在' })
  // 解码文件名
  res.json({ code: 0, data: { ...curr, fileName: decodeFileName(curr.fileName) } })
})

router.post('/', authenticateToken, upload.single('file'), (req, res) => {
  try {
    const { customerId, customerName, templateName, description, enabled } = req.body
    const file = req.file
    if (!file) return res.status(400).json({ code: -1, message: '缺少模板文件' })
    
    // 使用解码后的文件名
    const originalName = file.decodedOriginalname || decodeFileName(file.originalname)
    
    const list = readMeta()
    const item = {
      id: Date.now(),
      customerId: customerId || '',
      customerName: customerName || '',
      templateName: templateName || '',
      description: description || '',
      enabled: String(enabled).toLowerCase() !== 'false',
      updateTime: new Date().toISOString().slice(0, 10),
      fileName: originalName,
      fileType: file.mimetype,
      filePath: file.filename,
      fileUrl: `/files/report-templates/${encodeURIComponent(file.filename)}`
    }
    list.push(item)
    writeMeta(list)
    res.json({ code: 0, data: item, message: '模板上传成功' })
  } catch (e) {
    res.status(500).json({ code: -1, message: e.message })
  }
})

router.put('/:id', authenticateToken, upload.single('file'), (req, res) => {
  try {
    const id = Number(req.params.id)
    const list = readMeta()
    const idx = list.findIndex(t => t.id === id)
    if (idx === -1) return res.status(404).json({ code: -1, message: '模板不存在' })
    const curr = list[idx]
    const { customerId, customerName, templateName, description, enabled } = req.body
    Object.assign(curr, {
      customerId: customerId ?? curr.customerId,
      customerName: customerName ?? curr.customerName,
      templateName: templateName ?? curr.templateName,
      description: description ?? curr.description,
      enabled: enabled !== undefined ? String(enabled).toLowerCase() !== 'false' : curr.enabled,
      updateTime: new Date().toISOString().slice(0, 10)
    })
    if (req.file) {
      try { fs.unlinkSync(path.join(UPLOAD_DIR, curr.filePath)) } catch {}
      // 使用解码后的文件名
      const originalName = req.file.decodedOriginalname || decodeFileName(req.file.originalname)
      curr.fileName = originalName
      curr.fileType = req.file.mimetype
      curr.filePath = req.file.filename
      curr.fileUrl = `/files/report-templates/${encodeURIComponent(req.file.filename)}`
    }
    list[idx] = curr
    writeMeta(list)
    res.json({ code: 0, data: curr, message: '模板更新成功' })
  } catch (e) {
    res.status(500).json({ code: -1, message: e.message })
  }
})

router.delete('/:id', authenticateToken, (req, res) => {
  try {
    const id = Number(req.params.id)
    const list = readMeta()
    const idx = list.findIndex(t => t.id === id)
    if (idx === -1) return res.status(404).json({ code: -1, message: '模板不存在' })
    const curr = list[idx]
    list.splice(idx, 1)
    writeMeta(list)
    try { fs.unlinkSync(path.join(UPLOAD_DIR, curr.filePath)) } catch {}
    res.json({ code: 0, message: '模板删除成功' })
  } catch (e) {
    res.status(500).json({ code: -1, message: e.message })
  }
})

router.get('/:id/download', authenticateToken, (req, res) => {
  const id = Number(req.params.id)
  const list = readMeta()
  const curr = list.find(t => t.id === id)
  if (!curr) return res.status(404).json({ code: -1, message: '模板不存在' })
  const fullPath = path.join(UPLOAD_DIR, curr.filePath)
  if (!fs.existsSync(fullPath)) return res.status(404).json({ code: -1, message: '文件不存在' })
  
  // 设置正确的 Content-Disposition 头，支持中文文件名
  const encodedFileName = encodeURIComponent(curr.fileName).replace(/'/g, "%27")
  res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodedFileName}`)
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
  
  const fileStream = fs.createReadStream(fullPath)
  fileStream.pipe(res)
})

/**
 * 解析模板，提取映射与HTML预览
 * 支持动态识别表头和处理合并单元格
 */
router.post('/:id/parse', authenticateToken, async (req, res) => {
  try {
    const id = Number(req.params.id)
    const list = readMeta()
    const tpl = list.find(t => t.id === id)
    if (!tpl) return res.status(404).json({ code: -1, message: '模板不存在' })
    const fullPath = path.join(UPLOAD_DIR, tpl.filePath)
    if (!fs.existsSync(fullPath)) return res.status(404).json({ code: -1, message: '文件不存在' })

    const buf = fs.readFileSync(fullPath)
    const XLSX = require('xlsx')
    const wb = XLSX.read(buf, { type: 'buffer' })
    const firstSheetName = wb.SheetNames[0]
    const ws = wb.Sheets[firstSheetName]

    // 使用 ExcelJS 获取更准确的列宽信息
    const ExcelJS = require('exceljs')
    const excelWorkbook = new ExcelJS.Workbook()
    await excelWorkbook.xlsx.load(buf)
    const excelWorksheet = excelWorkbook.worksheets[0]
    const excelJsCols = []
    if (excelWorksheet) {
      // 获取最大列数，至少覆盖 XLSX 检测到的范围
      const rangeRef = ws['!ref'] ? XLSX.utils.decode_range(ws['!ref']) : { e: { c: 20 } }
      const maxCol = Math.max(rangeRef.e.c + 1, excelWorksheet.columnCount, 30)
      for (let i = 1; i <= maxCol; i++) {
        try {
          const w = excelWorksheet.getColumn(i).width
          excelJsCols.push(typeof w === 'number' ? w : null)
        } catch (e) {
          excelJsCols.push(null)
        }
      }
    }

    if (!ws['!ref']) {
      return res.status(400).json({ code: -1, message: '工作表为空' })
    }

    const range = XLSX.utils.decode_range(ws['!ref'])
    const top = range.s.r, left = range.s.c, bottom = range.e.r, right = range.e.c
    const toA1 = (r0, c0) => XLSX.utils.encode_cell({ r: r0, c: c0 })
    const merges = ws['!merges'] || []

    // 常见标签字典（用于识别顶部字段）
    const labelDict = {
      '客户编码': 'CustomerID',
      '客户代码': 'CustomerID',
      '工单号': 'PNum',
      '工单编号': 'PNum',
      '订单号': 'OrderNum',
      '订单编号': 'OrderNum',
      '客户料号': 'CProductID',
      '产品编码': 'ProductID',
      '产品名称': 'Product',
      '品名': 'Product',
      '规格': 'Scale',
      '规格型号': 'Scale',
      '数量': 'Count',
      '出货数量': 'Count',
      'CPO': 'CPO',
      '报告编号': 'ReportNo',
      '报告号': 'ReportNo',
      '日期': 'ReportDate',
      '报告日期': 'ReportDate',
      '检验日期': 'InspectDate'
    }

    // 获取单元格文本值
    const getCellValue = (r0, c0) => {
      const cell = ws[XLSX.utils.encode_cell({ r: r0, c: c0 })]
      if (!cell) return null
      const v = cell.v
      if (v === null || v === undefined) return null
      return typeof v === 'string' ? v.trim() : String(v).trim()
    }

    // 查找包含指定单元格的合并区域
    const findMergeAt = (r0, c0) => {
      return merges.find(m => r0 >= m.s.r && r0 <= m.e.r && c0 >= m.s.c && c0 <= m.e.c) || null
    }

    // 获取合并区域的起始单元格值
    const getMergedValue = (r0, c0) => {
      const merge = findMergeAt(r0, c0)
      if (merge) {
        return getCellValue(merge.s.r, merge.s.c)
      }
      return getCellValue(r0, c0)
    }

    // 构建网格数据（处理合并单元格）
    const grid = []
    for (let r = top; r <= bottom; r++) {
      grid[r] = []
      for (let c = left; c <= right; c++) {
        grid[r][c] = getMergedValue(r, c)
      }
    }

    // 初始化映射结构
    const mapping = {
      fields: [],
      table: {
        sheetIndex: 0,
        headerRow: null,
        startRow: null,
        columns: []
      },
      placeholders: [],
      layout: {
        merges: merges.map(m => ({
          start: toA1(m.s.r, m.s.c),
          end: toA1(m.e.r, m.e.c),
          startRow: m.s.r + 1,
          endRow: m.e.r + 1,
          startCol: m.s.c + 1,
          endCol: m.e.c + 1
        })),
        colWidths: [],
        cols: excelJsCols.length > 0 ? excelJsCols : (ws['!cols'] || []).map(col => {
          if (!col) return null
          if (typeof col.wch === 'number') return col.wch
          if (typeof col.wpx === 'number') return Math.round(col.wpx / 7)
          return null
        }),
        topRange: { start: 1, end: 1 }
      }
    }

    // 记录已处理的合并单元格，避免重复
    const processedMerges = new Set()

    // 扫描顶部字段和占位符
    for (let r = top; r <= bottom; r++) {
      for (let c = left; c <= right; c++) {
        const val = grid[r][c]
        if (!val) continue

        // 检查占位符 {{Key}}
        const phMatch = val.match(/\{\{(\w+)\}\}/)
        if (phMatch) {
          const merge = findMergeAt(r, c)
          if (merge) {
            const mergeKey = `${merge.s.r}-${merge.s.c}`
            if (!processedMerges.has(mergeKey)) {
              processedMerges.add(mergeKey)
              mapping.placeholders.push({
                name: phMatch[1],
                cell: toA1(merge.s.r, merge.s.c),
                merge: {
                  startCol: merge.s.c + 1,
                  endCol: merge.e.c + 1,
                  startRow: merge.s.r + 1,
                  endRow: merge.e.r + 1
                }
              })
            }
          } else {
            mapping.placeholders.push({ name: phMatch[1], cell: toA1(r, c) })
          }
        }

        // 检查标签字典匹配
        const fieldName = labelDict[val]
        if (fieldName) {
          // 查找标签右侧或下方的值单元格
          const merge = findMergeAt(r, c)
          let valueCol = merge ? (merge.e.c + 1) : (c + 1)
          
          // 确保值列在范围内
          if (valueCol <= right) {
            const valueMerge = findMergeAt(r, valueCol)
            mapping.fields.push({
              label: val,
              name: fieldName,
              cell: toA1(r, valueCol),
              merge: valueMerge ? {
                startCol: valueMerge.s.c + 1,
                endCol: valueMerge.e.c + 1,
                startRow: valueMerge.s.r + 1,
                endRow: valueMerge.e.r + 1
              } : null
            })
          }
        }
      }
    }

    // 动态识别表格表头行
    // 策略：查找连续多个非空单元格的行，且该行下方有数据行
    let headerRowIndex = null
    let headerColumns = []

    // 表头识别的启发式规则
    const isLikelyHeaderRow = (rowIndex) => {
      let nonEmptyCells = 0
      let hasTypicalHeaders = false
      const typicalHeaders = ['序号', '№', 'No', '料号', '品名', '名称', '产品', '数量', '规格', '单位', '备注', '结果', '判定']
      
      for (let c = left; c <= right; c++) {
        const val = grid[rowIndex][c]
        if (val) {
          nonEmptyCells++
          if (typicalHeaders.some(h => val.includes(h))) {
            hasTypicalHeaders = true
          }
        }
      }
      
      // 至少3个非空单元格，或者包含典型表头关键字
      return nonEmptyCells >= 3 || hasTypicalHeaders
    }

    // 从上往下扫描，找到第一个像表头的行
    for (let r = top; r <= Math.min(bottom - 1, top + 30); r++) {
      if (isLikelyHeaderRow(r)) {
        // 验证下一行是否有数据（排除标题行被误识别）
        let nextRowHasData = false
        for (let c = left; c <= right; c++) {
          if (grid[r + 1] && grid[r + 1][c]) {
            nextRowHasData = true
            break
          }
        }
        
        if (nextRowHasData) {
          headerRowIndex = r
          break
        }
      }
    }

    // 如果找到表头行，提取列信息
    if (headerRowIndex !== null) {
      const processedHeaderCols = new Set()
      
      for (let c = left; c <= right; c++) {
        // 跳过已处理的合并列
        if (processedHeaderCols.has(c)) continue
        
        const headerText = grid[headerRowIndex][c]
        if (!headerText) continue

        const merge = findMergeAt(headerRowIndex, c)
        
        // 生成字段名（使用表头文本作为默认名称）
        const fieldName = labelDict[headerText] || headerText
        
        const colInfo = {
          header: headerText,
          name: fieldName,
          col: c + 1,  // 1-based 列号
          colLetter: XLSX.utils.encode_col(c)
        }

        // 如果是合并单元格，记录合并范围
        if (merge) {
          colInfo.merge = {
            startCol: merge.s.c + 1,
            endCol: merge.e.c + 1,
            startColLetter: XLSX.utils.encode_col(merge.s.c),
            endColLetter: XLSX.utils.encode_col(merge.e.c)
          }
          // 标记所有合并的列为已处理
          for (let mc = merge.s.c; mc <= merge.e.c; mc++) {
            processedHeaderCols.add(mc)
          }
        }

        headerColumns.push(colInfo)
      }

      mapping.table = {
        sheetIndex: 0,
        headerRow: headerRowIndex + 1,  // 1-based 行号
        startRow: headerRowIndex + 2,   // 数据起始行（1-based）
        columns: headerColumns
      }
      
      mapping.layout.topRange = {
        start: top + 1,
        end: headerRowIndex
      }
    }

    // 获取列宽信息
    if (ws['!cols']) {
      mapping.layout.colWidths = ws['!cols'].map((col, idx) => ({
        col: idx + 1,
        width: col ? col.wch || col.width || 10 : 10
      }))
    }

    // 生成带行列坐标的预览HTML
    const previewHtml = generatePreviewHtmlWithCoords(ws, range, merges)

    res.json({
      code: 0,
      data: {
        mapping,
        previewHtml,
        sheetInfo: {
          name: firstSheetName,
          rowCount: bottom - top + 1,
          colCount: right - left + 1
        }
      }
    })
  } catch (e) {
    console.error('解析模板失败:', e)
    res.status(500).json({ code: -1, message: e.message })
  }
})

/**
 * 生成带行列坐标的预览HTML
 */
function generatePreviewHtmlWithCoords(ws, range, merges) {
  const XLSX = require('xlsx')
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

  // 获取单元格值
  const getCellValue = (r, c) => {
    const addr = XLSX.utils.encode_cell({ r, c })
    const cell = ws[addr]
    if (!cell) return ''
    if (cell.v === null || cell.v === undefined) return ''
    return String(cell.v)
  }

  let html = '<table>'
  
  // 表头行：列字母
  html += '<thead><tr><th style="background:#e0e0e0;min-width:40px;"></th>'
  for (let c = left; c <= right; c++) {
    const colLetter = XLSX.utils.encode_col(c)
    html += `<th style="background:#e0e0e0;text-align:center;font-weight:bold;color:#666;">${colLetter}</th>`
  }
  html += '</tr></thead>'
  
  // 数据行
  html += '<tbody>'
  for (let r = top; r <= bottom; r++) {
    html += '<tr>'
    // 行号
    html += `<td style="background:#e0e0e0;text-align:center;font-weight:bold;color:#666;min-width:40px;">${r + 1}</td>`
    
    for (let c = left; c <= right; c++) {
      const mergeInfo = mergeMap.get(`${r}-${c}`)
      
      if (mergeInfo && !mergeInfo.isOrigin) {
        // 被合并的单元格，跳过
        continue
      }
      
      const value = getCellValue(r, c)
      const cellAddr = XLSX.utils.encode_cell({ r, c })
      
      let tdAttrs = `data-cell="${cellAddr}" data-row="${r + 1}" data-col="${c + 1}"`
      
      if (mergeInfo && mergeInfo.isOrigin) {
        if (mergeInfo.rowspan > 1) tdAttrs += ` rowspan="${mergeInfo.rowspan}"`
        if (mergeInfo.colspan > 1) tdAttrs += ` colspan="${mergeInfo.colspan}"`
      }
      
      // 转义HTML
      const safeValue = value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
      
      html += `<td ${tdAttrs}>${safeValue}</td>`
    }
    html += '</tr>'
  }
  html += '</tbody></table>'
  
  return html
}

/**
 * 保存映射
 */
router.post('/:id/mapping', authenticateToken, (req, res) => {
  try {
    const id = Number(req.params.id)
    const list = readMeta()
    const idx = list.findIndex(t => t.id === id)
    if (idx === -1) return res.status(404).json({ code: -1, message: '模板不存在' })
    list[idx].mapping = req.body && typeof req.body === 'object' ? req.body : null
    list[idx].updateTime = new Date().toISOString().slice(0, 10)
    writeMeta(list)
    res.json({ code: 0, message: '映射保存成功' })
  } catch (e) {
    res.status(500).json({ code: -1, message: e.message })
  }
})

/**
 * 获取映射
 */
router.get('/:id/mapping', authenticateToken, (req, res) => {
  try {
    const id = Number(req.params.id)
    const list = readMeta()
    const curr = list.find(t => t.id === id)
    if (!curr) return res.status(404).json({ code: -1, message: '模板不存在' })
    res.json({ code: 0, data: curr.mapping || null })
  } catch (e) {
    res.status(500).json({ code: -1, message: e.message })
  }
})

/**
 * 基于模板生成报告
 * 支持合并单元格的数据填充
 */
router.post('/:id/generate', authenticateToken, async (req, res) => {
  try {
    const id = Number(req.params.id)
    const list = readMeta()
    const tpl = list.find(t => t.id === id)
    if (!tpl) return res.status(404).json({ code: -1, message: '模板不存在' })
    
    const fullPath = path.join(UPLOAD_DIR, tpl.filePath)
    if (!fs.existsSync(fullPath)) return res.status(404).json({ code: -1, message: '模板文件不存在' })
    
    const { data, format = 'xlsx' } = req.body
    if (!data) return res.status(400).json({ code: -1, message: '缺少报告数据' })
    
    const ExcelJS = require('exceljs')
    const workbook = new ExcelJS.Workbook()
    await workbook.xlsx.readFile(fullPath)
    
    const worksheet = workbook.worksheets[0]
    const mapping = tpl.mapping || {}
    
    // 辅助函数：设置单元格值（处理合并单元格）
    const setCellValue = (cellRef, value) => {
      if (!cellRef || value === undefined || value === null) return
      try {
        const cell = worksheet.getCell(cellRef)
        cell.value = value
      } catch (e) {
        console.warn(`设置单元格 ${cellRef} 失败:`, e.message)
      }
    }
    
    // 填充顶部字段
    if (mapping.fields && Array.isArray(mapping.fields)) {
      mapping.fields.forEach(field => {
        if (field.cell && data[field.name] !== undefined) {
          setCellValue(field.cell, data[field.name])
        }
      })
    }
    
    // 填充占位符
    if (mapping.placeholders && Array.isArray(mapping.placeholders)) {
      mapping.placeholders.forEach(ph => {
        if (ph.cell && data[ph.name] !== undefined) {
          setCellValue(ph.cell, data[ph.name])
        }
      })
    }
    
    // 填充表格数据（支持合并单元格）
    if (mapping.table && data.tableData && Array.isArray(data.tableData)) {
      const { startRow, columns } = mapping.table
      
      data.tableData.forEach((rowData, rowIndex) => {
        const excelRowNum = startRow + rowIndex
        
        if (columns && Array.isArray(columns)) {
          columns.forEach(col => {
            const fieldValue = rowData[col.name] ?? rowData[col.header]
            if (fieldValue === undefined) return
            
            // 如果列有合并信息，只填充起始列
            const targetCol = col.merge ? col.merge.startCol : col.col
            if (targetCol) {
              try {
                const cell = worksheet.getCell(excelRowNum, targetCol)
                cell.value = fieldValue
              } catch (e) {
                console.warn(`填充表格单元格失败 (${excelRowNum}, ${targetCol}):`, e.message)
              }
            }
          })
        }
      })
    }
    
    // 生成文件
    const timestamp = Date.now()
    const outputFileName = `report_${timestamp}.xlsx`
    const outputPath = path.join(UPLOAD_DIR, outputFileName)
    
    await workbook.xlsx.writeFile(outputPath)
    
    // 返回下载链接
    res.json({
      code: 0,
      data: {
        fileName: outputFileName,
        fileUrl: `/files/report-templates/${outputFileName}`
      },
      message: '报告生成成功'
    })
  } catch (e) {
    console.error('生成报告失败:', e)
    res.status(500).json({ code: -1, message: e.message })
  }
})

module.exports = router
