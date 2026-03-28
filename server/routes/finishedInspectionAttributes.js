const express = require('express')
const path = require('path')
const fs = require('fs')
const { authenticateToken, checkPermission } = require('../middleware/auth')

const router = express.Router()

const DATA_FILE = path.join(__dirname, '../data/finished-inspection-attributes.json')
const TEMPLATE_META_FILE = path.join(__dirname, '../data/report-templates.json')

const DEFAULT_TYPE_NAMES = ['特殊检测', '外观检测', '规格尺寸', '感官评价', '材质', '功能', '包装']

function isValidNumericValue(value) {
  if (value === undefined || value === null) return true
  const text = String(value).trim()
  if (!text) return true
  return /^\d+(\.\d+)?$/.test(text)
}

function ensureDataFile() {
  if (!fs.existsSync(DATA_FILE)) {
    const types = DEFAULT_TYPE_NAMES.map((name, index) => ({
      id: index + 1,
      name,
      sortOrder: index + 1,
      enabled: true
    }))
    fs.writeFileSync(DATA_FILE, JSON.stringify({
      nextTypeId: types.length + 1,
      nextItemId: 1,
      types,
      items: []
    }, null, 2), 'utf-8')
    return
  }

  try {
    const curr = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'))
    let changed = false
    if (!Array.isArray(curr.types)) {
      curr.types = DEFAULT_TYPE_NAMES.map((name, index) => ({
        id: index + 1,
        name,
        sortOrder: index + 1,
        enabled: true
      }))
      changed = true
    }
    if (!Array.isArray(curr.items)) {
      curr.items = []
      changed = true
    }
    if (typeof curr.nextTypeId !== 'number') {
      const maxId = curr.types.reduce((m, t) => Math.max(m, Number(t.id) || 0), 0)
      curr.nextTypeId = maxId + 1
      changed = true
    }
    if (typeof curr.nextItemId !== 'number') {
      const maxId = curr.items.reduce((m, t) => Math.max(m, Number(t.id) || 0), 0)
      curr.nextItemId = maxId + 1
      changed = true
    }
    if (changed) {
      fs.writeFileSync(DATA_FILE, JSON.stringify(curr, null, 2), 'utf-8')
    }
  } catch (e) {
    const types = DEFAULT_TYPE_NAMES.map((name, index) => ({
      id: index + 1,
      name,
      sortOrder: index + 1,
      enabled: true
    }))
    fs.writeFileSync(DATA_FILE, JSON.stringify({
      nextTypeId: types.length + 1,
      nextItemId: 1,
      types,
      items: []
    }, null, 2), 'utf-8')
  }
}

function readData() {
  ensureDataFile()
  return JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'))
}

function writeData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8')
}

function readTemplates() {
  if (!fs.existsSync(TEMPLATE_META_FILE)) return []
  try {
    const list = JSON.parse(fs.readFileSync(TEMPLATE_META_FILE, 'utf-8'))
    return (Array.isArray(list) ? list : [])
      .filter(t => t && t.enabled !== false)
      .map(t => ({
        id: Number(t.id),
        templateName: String(t.templateName || '').trim(),
        customerId: String(t.customerId || '').trim(),
        customerName: String(t.customerName || '').trim(),
        templateType: String(t.templateType || 'customer_specific').trim()
      }))
      .filter(t => t.id)
  } catch (e) {
    return []
  }
}

router.get('/init', authenticateToken, checkPermission('quality:finished-attributes:list'), (req, res) => {
  const data = readData()
  const templates = readTemplates()
  res.json({
    code: 0,
    data: {
      templates,
      types: data.types.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0)),
      items: data.items
    }
  })
})

router.get('/types', authenticateToken, checkPermission('quality:finished-attributes:list'), (req, res) => {
  const data = readData()
  res.json({
    code: 0,
    data: data.types.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0))
  })
})

router.post('/types', authenticateToken, checkPermission('quality:finished-attributes:type:add'), (req, res) => {
  const data = readData()
  const name = String(req.body?.name || '').trim()
  if (!name) return res.status(400).json({ code: -1, message: '检验类型不能为空' })
  if (data.types.some(t => String(t.name || '').trim() === name)) {
    return res.status(400).json({ code: -1, message: '检验类型已存在' })
  }
  const item = {
    id: data.nextTypeId++,
    name,
    sortOrder: Number(req.body?.sortOrder || (data.types.length + 1)),
    enabled: req.body?.enabled !== false
  }
  data.types.push(item)
  writeData(data)
  res.json({ code: 0, data: item, message: '新增成功' })
})

router.put('/types/:id', authenticateToken, checkPermission('quality:finished-attributes:type:edit'), (req, res) => {
  const data = readData()
  const id = Number(req.params.id)
  const idx = data.types.findIndex(t => Number(t.id) === id)
  if (idx === -1) return res.status(404).json({ code: -1, message: '检验类型不存在' })
  const name = String(req.body?.name || '').trim()
  if (!name) return res.status(400).json({ code: -1, message: '检验类型不能为空' })
  if (data.types.some(t => Number(t.id) !== id && String(t.name || '').trim() === name)) {
    return res.status(400).json({ code: -1, message: '检验类型已存在' })
  }
  data.types[idx] = {
    ...data.types[idx],
    name,
    sortOrder: Number(req.body?.sortOrder ?? data.types[idx].sortOrder ?? 0),
    enabled: req.body?.enabled !== undefined ? !!req.body.enabled : !!data.types[idx].enabled
  }
  data.items = data.items.map(it => Number(it.typeId) === id ? { ...it, typeName: name } : it)
  writeData(data)
  res.json({ code: 0, data: data.types[idx], message: '更新成功' })
})

router.delete('/types/:id', authenticateToken, checkPermission('quality:finished-attributes:type:delete'), (req, res) => {
  const data = readData()
  const id = Number(req.params.id)
  const idx = data.types.findIndex(t => Number(t.id) === id)
  if (idx === -1) return res.status(404).json({ code: -1, message: '检验类型不存在' })
  if (data.items.some(it => Number(it.typeId) === id)) {
    return res.status(400).json({ code: -1, message: '该检验类型已被检验项目使用，不能删除' })
  }
  data.types.splice(idx, 1)
  writeData(data)
  res.json({ code: 0, message: '删除成功' })
})

router.get('/items', authenticateToken, checkPermission('quality:finished-attributes:list'), (req, res) => {
  const data = readData()
  const templateNameQuery = String(req.query.templateName || '').trim()
  const keyword = String(req.query.keyword || '').trim().toLowerCase()
  
  const filteredItems = data.items.filter(it => {
    if (templateNameQuery && it.templateName !== templateNameQuery) return false
    return true
  })

  // 按 templateName (检验项目组) 进行聚合
  const groupMap = new Map()
  filteredItems.forEach(it => {
    const key = it.templateName || '未分组'
    if (!groupMap.has(key)) {
      groupMap.set(key, {
        templateId: it.templateId,
        templateName: key,
        description: it.description || '', // 从第一条记录提取组级别描述
        standard: it.groupStandard || '', // 从第一条记录提取组级别依据标准（注意：明细级为standard，组级由于前端绑定为itemForm.standard，传递时最好区分或后端统一）
        aql: it.aql,
        cr: it.cr,
        fu: it.fu,
        ma: it.ma,
        mi: it.mi,
        details: []
      })
    }
    // 如果有后来的记录带描述，也可以合并（通常组内记录描述一致）
    if (it.description && !groupMap.get(key).description) {
      groupMap.get(key).description = it.description
    }
    if (it.groupStandard && !groupMap.get(key).standard) {
      groupMap.get(key).standard = it.groupStandard
    }
    groupMap.get(key).details.push(it)
  })

  let list = Array.from(groupMap.values()).map((group, index) => {
    // 排序明细
    group.details.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0) || Number(a.id) - Number(b.id))
    
    // 取该组最早创建时间和最新的更新人信息（由于没有创建人字段，暂时简化）
    const firstItem = group.details[0] || {}
    const lastItem = group.details[group.details.length - 1] || {}
    
    return {
      id: `group_${index}_${group.templateId || group.templateName}`,
      templateId: group.templateId,
      templateName: group.templateName,
      aql: group.aql,
      cr: group.cr,
      fu: group.fu,
      ma: group.ma,
      mi: group.mi,
      description: group.description, // 直接使用保存的描述字段，不再自动拼接
      standard: group.standard, // 依据标准
      creator: 'admin', // 模拟数据
      createdAt: firstItem.updatedAt || new Date().toISOString(),
      updater: 'admin',
      updatedAt: lastItem.updatedAt || new Date().toISOString(),
      _isGroup: true,
      details: group.details
    }
  })
  
  if (keyword) {
    const searchTerms = keyword.split(/[\s,，;；|]+/).filter(Boolean)
    list = list.filter(g => {
      const text = `${g.templateName || ''} ${g.description || ''}`.toLowerCase()
      // 所有关键词都必须匹配到（AND关系），如果想要OR关系可以换成 some
      return searchTerms.every(term => text.includes(term))
    })
  }
  
  res.json({ code: 0, data: list })
})

router.post('/items', authenticateToken, checkPermission('quality:finished-attributes:item:add'), (req, res) => {
  const data = readData()
  const payload = req.body || {}
  const templateId = Number(payload.templateId || 0)
  const templateName = String(payload.templateName || '').trim()
  const description = String(payload.description || '').trim()
  const groupStandard = String(payload.standard || '').trim() // 新增：组级别的依据标准
  const aql = String(payload.aql || '').trim()
  const cr = String(payload.cr || '').trim()
  const fu = String(payload.fu || '').trim()
  const ma = String(payload.ma || '').trim()
  const mi = String(payload.mi || '').trim()
  const typeId = Number(payload.typeId || 0)
  const itemName = String(payload.itemName || '').trim()
  const itemStandard = String(payload.itemStandard || payload.standard || '').trim() // 修改：如果前端没有传itemStandard，默认回退到组级别的standard，但实际上前面应该是明细里的standard
  
  if (!templateName) return res.status(400).json({ code: -1, message: '检验项目组不能为空' })
  if (!isValidNumericValue(cr) || !isValidNumericValue(fu) || !isValidNumericValue(ma) || !isValidNumericValue(mi)) {
    return res.status(400).json({ code: -1, message: 'CR/FU/MA/MI 仅支持整数或小数，且只能包含一个小数点' })
  }
  if (!typeId) return res.status(400).json({ code: -1, message: '检验类型不能为空' })
  if (!itemName) return res.status(400).json({ code: -1, message: '检验项目不能为空' })
  if (!itemStandard) return res.status(400).json({ code: -1, message: '检验标准不能为空' })
  const type = data.types.find(t => Number(t.id) === typeId)
  if (!type) return res.status(400).json({ code: -1, message: '检验类型不存在' })
  const item = {
    id: data.nextItemId++,
    templateId,
    templateName,
    description,
    groupStandard,
    aql,
    cr,
    fu,
    ma,
    mi,
    typeId,
    typeName: String(type.name || ''),
    itemName,
    standard: itemStandard,
    sortOrder: Number(payload.sortOrder || (data.items.length + 1)),
    enabled: payload.enabled !== false,
    updatedAt: new Date().toISOString()
  }
  data.items.push(item)
  writeData(data)
  res.json({ code: 0, data: item, message: '新增成功' })
})

router.put('/items/:id', authenticateToken, checkPermission('quality:finished-attributes:item:edit'), (req, res) => {
  const data = readData()
  const id = Number(req.params.id)
  const idx = data.items.findIndex(it => Number(it.id) === id)
  if (idx === -1) return res.status(404).json({ code: -1, message: '检验项目不存在' })
  const payload = req.body || {}
  const templateId = Number(payload.templateId || 0)
  const templateName = String(payload.templateName || '').trim()
  const description = String(payload.description || '').trim()
  const aql = String(payload.aql || '').trim()
  const cr = String(payload.cr || '').trim()
  const fu = String(payload.fu || '').trim()
  const ma = String(payload.ma || '').trim()
  const mi = String(payload.mi || '').trim()
  const typeId = Number(payload.typeId || 0)
  const itemName = String(payload.itemName || '').trim()
  const standard = String(payload.standard || '').trim()
  if (!templateName) return res.status(400).json({ code: -1, message: '检验项目组不能为空' })
  if (!isValidNumericValue(cr) || !isValidNumericValue(fu) || !isValidNumericValue(ma) || !isValidNumericValue(mi)) {
    return res.status(400).json({ code: -1, message: 'CR/FU/MA/MI 仅支持整数或小数，且只能包含一个小数点' })
  }
  if (!typeId) return res.status(400).json({ code: -1, message: '检验类型不能为空' })
  if (!itemName) return res.status(400).json({ code: -1, message: '检验项目不能为空' })
  if (!standard) return res.status(400).json({ code: -1, message: '检验标准不能为空' })
  const type = data.types.find(t => Number(t.id) === typeId)
  if (!type) return res.status(400).json({ code: -1, message: '检验类型不存在' })
  data.items[idx] = {
    ...data.items[idx],
    templateId,
    templateName,
    description,
    aql,
    cr,
    fu,
    ma,
    mi,
    typeId,
    typeName: String(type.name || ''),
    itemName,
    standard,
    sortOrder: Number(payload.sortOrder ?? data.items[idx].sortOrder ?? 0),
    enabled: payload.enabled !== undefined ? !!payload.enabled : !!data.items[idx].enabled,
    updatedAt: new Date().toISOString()
  }
  writeData(data)
  res.json({ code: 0, data: data.items[idx], message: '更新成功' })
})

router.delete('/items/:id', authenticateToken, checkPermission('quality:finished-attributes:item:delete'), (req, res) => {
  const data = readData()
  const id = Number(req.params.id)
  const idx = data.items.findIndex(it => Number(it.id) === id)
  if (idx === -1) return res.status(404).json({ code: -1, message: '检验项目不存在' })
  data.items.splice(idx, 1)
  writeData(data)
  res.json({ code: 0, message: '删除成功' })
})

module.exports = router
