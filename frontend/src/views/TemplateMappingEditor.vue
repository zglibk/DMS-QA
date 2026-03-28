<template>
  <div class="template-mapping-page">
    <!-- 页面头部 -->
    <div class="page-header">
      <div class="header-left">
        <el-button :icon="ArrowLeft" @click="goBack">返回</el-button>
        <div class="title-section">
          <h1>模板映射编辑</h1>
          <p class="subtitle">{{ templateInfo.templateName || '未命名模板' }} - {{ templateInfo.customerName || '通用' }}</p>
        </div>
      </div>
      <div class="header-actions">
        <el-button @click="refreshPreview"><el-icon><Refresh /></el-icon>刷新预览</el-button>
        <el-button type="primary" @click="testPreviewMapping"><el-icon><View /></el-icon>测试填充</el-button>
        <el-button type="success" @click="saveCurrentMapping"><el-icon><Check /></el-icon>保存映射</el-button>
      </div>
    </div>

    <!-- 主内容区 -->
    <div class="main-content">
      <!-- 左侧：模板预览 -->
      <div class="preview-panel">
        <el-card shadow="never" class="full-height-card">
          <template #header>
            <div class="card-header">
              <el-icon><Document /></el-icon>
              <span>模板预览</span>
              <el-tag type="info" size="small" style="margin-left: 8px;">点击单元格绑定字段</el-tag>
              <div class="header-tip" v-if="currentBindFieldIndex !== -1">
                正在绑定顶部字段：<strong>{{ mappingData.fields[currentBindFieldIndex]?.name || '未命名' }}</strong>
              </div>
              <div class="header-tip" v-else-if="currentBindColumnIndex !== -1">
                正在绑定表格列：<strong>{{ mappingData.table.columns[currentBindColumnIndex]?.header || '未命名' }}</strong>
              </div>
            </div>
          </template>
          <div class="preview-wrapper">
            <div class="mapping-preview" v-html="mappingPreviewHtml" @click="handlePreviewClick"></div>
          </div>
        </el-card>
      </div>

      <!-- 右侧：映射配置 -->
      <div class="mapping-panel">
        <!-- 基本配置 -->
        <el-card shadow="never" class="config-card">
          <template #header>
            <div class="card-header">
              <el-icon><Setting /></el-icon>
              <span>基本配置</span>
            </div>
          </template>
          <el-form label-width="90px" size="small">
            <el-row :gutter="16">
              <el-col :span="12">
                <el-form-item label="工作表">
                  <el-input-number v-model="mappingData.table.sheetIndex" :min="0" style="width: 100%" />
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="表头行">
                  <el-input-number v-model="mappingData.table.headerRow" :min="1" style="width: 100%" />
                </el-form-item>
              </el-col>
            </el-row>
            <el-row :gutter="16">
              <el-col :span="12">
                <el-form-item label="数据起始行">
                  <el-input-number v-model="mappingData.table.startRow" :min="1" style="width: 100%" />
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="表头行数">
                  <el-input :model-value="headerRowsCount" disabled />
                </el-form-item>
              </el-col>
            </el-row>
            <el-row :gutter="16">
              <el-col :span="12">
                <el-form-item label="顶部起始">
                  <el-input-number v-model="mappingData.layout.topRange.start" :min="1" style="width: 100%" />
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="顶部结束">
                  <el-input-number v-model="mappingData.layout.topRange.end" :min="1" style="width: 100%" />
                </el-form-item>
              </el-col>
            </el-row>
          </el-form>
        </el-card>

        <!-- 顶部字段映射 -->
        <el-card shadow="never" class="config-card">
          <template #header>
            <div class="card-header">
              <el-icon><Grid /></el-icon>
              <span>顶部字段</span>
              <el-button size="small" type="primary" link style="margin-left: auto" @click="addField">
                <el-icon><Plus /></el-icon>添加
              </el-button>
            </div>
          </template>
          <div class="field-list">
            <div v-for="(f, idx) in mappingData.fields" :key="idx" class="field-item" :class="{ active: currentBindFieldIndex === idx }">
              <span class="field-zh-label">{{ getFieldZhLabel(f.name) }}</span>
              <el-select v-model="f.name" placeholder="选择或输入字段名" size="small" style="width: 130px" filterable allow-create>
                <el-option v-for="opt in AVAILABLE_FIELD_OPTIONS" :key="opt.value" :label="opt.value" :value="opt.value">
                  <span style="float: left">{{ opt.value }}</span>
                  <span style="float: right; color: #8492a6; font-size: 12px">{{ opt.label }}</span>
                </el-option>
              </el-select>
              <el-input v-model="f.cell" placeholder="单元格" size="small" style="width: 70px" @focus="setBindFieldIndex(idx)" />
              <el-button size="small" type="primary" :plain="currentBindFieldIndex !== idx" @click="setBindFieldIndex(idx)">
                {{ currentBindFieldIndex === idx ? '绑定中' : '绑定' }}
              </el-button>
              <el-button size="small" type="danger" link @click="removeField(idx)"><el-icon><Delete /></el-icon></el-button>
            </div>
            <el-empty v-if="!mappingData.fields.length" description="暂无字段" :image-size="40" />
          </div>
        </el-card>

        <!-- 表格列映射 -->
        <el-card shadow="never" class="config-card">
          <template #header>
            <div class="card-header">
              <el-icon><List /></el-icon>
              <span>表格列映射</span>
              <el-button size="small" type="primary" link style="margin-left: auto" @click="addColumn">
                <el-icon><Plus /></el-icon>添加
              </el-button>
            </div>
          </template>
          <div class="column-list">
            <div v-for="(col, idx) in mappingData.table.columns" :key="idx" class="column-item" :class="{ active: currentBindColumnIndex === idx }">
              <div class="column-row">
                <el-input v-model="col.header" placeholder="表头" size="small" style="width: 80px" />
                <el-select v-model="col.name" placeholder="选择或输入" size="small" style="width: 100px" filterable allow-create>
                  <el-option v-for="opt in AVAILABLE_TABLE_FIELD_OPTIONS" :key="opt.value" :label="opt.value" :value="opt.value">
                    <span style="float: left">{{ opt.value }}</span>
                    <span style="float: right; color: #8492a6; font-size: 12px">{{ opt.label }}</span>
                  </el-option>
                </el-select>
                <div class="col-number-wrapper">
                  <el-input-number v-model="col.col" :min="1" size="small" style="width: 70px" controls-position="right" @focus="setBindColumnIndex(idx)" />
                  <span class="col-letter">({{ getColLetter(col.col) }}列)</span>
                </div>
                <el-button size="small" type="primary" :plain="currentBindColumnIndex !== idx" @click="setBindColumnIndex(idx)">
                  {{ currentBindColumnIndex === idx ? '绑定中' : '绑定' }}
                </el-button>
                <el-button size="small" type="danger" link @click="removeColumn(idx)"><el-icon><Delete /></el-icon></el-button>
              </div>
            </div>
            <el-empty v-if="!mappingData.table.columns.length" description="暂无列映射" :image-size="40" />
          </div>
        </el-card>

        <!-- 列宽配置 -->
        <el-card shadow="never" class="config-card">
          <template #header>
            <div class="card-header">
              <el-icon><Grid /></el-icon>
              <span>列宽配置</span>
              <el-tooltip content="配置Excel列宽，确保生成报告与模板打印效果一致" placement="top">
                <el-icon style="margin-left: 4px; color: #909399;"><QuestionFilled /></el-icon>
              </el-tooltip>
              <el-button size="small" type="primary" link style="margin-left: auto" @click="parseColumnWidthsFromInput">
                解析
              </el-button>
            </div>
          </template>
          <div class="column-widths-config">
            <el-form-item label="列宽数据" label-width="70px">
              <el-input
                v-model="columnWidthsInput"
                type="textarea"
                :rows="3"
                placeholder="输入列宽数组，如：4.4, 6.9, 6.9, 5.5, 7.7, 8.9...&#10;或从Excel复制的列宽值（用逗号、空格或换行分隔）"
                @blur="parseColumnWidthsFromInput"
              />
            </el-form-item>
            <div class="column-widths-preview" v-if="mappingData.layout.columnWidths && mappingData.layout.columnWidths.length > 0">
              <el-tag 
                v-for="(w, idx) in mappingData.layout.columnWidths" 
                :key="idx" 
                size="small" 
                type="info"
                style="margin: 2px;"
              >
                {{ getColLetter(idx + 1) }}: {{ w }}
              </el-tag>
            </div>
            <div class="column-widths-tip" v-else>
              <el-text type="info" size="small">未配置列宽，将使用模板原始列宽</el-text>
            </div>
          </div>
        </el-card>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { ArrowLeft, Refresh, View, Check, Document, Setting, Grid, List, Plus, Delete, QuestionFilled } from '@element-plus/icons-vue'
import * as XLSX from 'xlsx'
import ExcelJS from 'exceljs'
import api from '@/utils/api'

const route = useRoute()
const router = useRouter()

// 模板信息
const templateId = ref(null)
const templateInfo = ref({})

// 映射数据
const mappingData = reactive({
  fields: [],
  placeholders: [],
  table: { sheetIndex: 0, headerRow: 1, startRow: 2, columns: [] },
  layout: { merges: [], colWidths: [], columnWidths: [], topRange: { start: 1, end: 1 } }
})

// 列宽输入框
const columnWidthsInput = ref('')

// 预览HTML
const mappingPreviewHtml = ref('')

// 当前绑定索引
const currentBindFieldIndex = ref(-1)
const currentBindColumnIndex = ref(-1)
const FIELD_ZH_MAP = {
  CustomerID: '客户编码',
  PNum: '工单号',
  CPO: 'CPO',
  OrderNum: '订单号',
  ProductID: '产品编码',
  CProductID: '客户料号',
  Product: '产品名称',
  CProduct: '工厂订单号',
  Customer: '客户名称',
  MaterialCode: '物料编码',
  MaterialName: '物料名称',
  BatchNo: '生产批次',
  DeliveryNoteNo: '送货单号',
  Standard: '依据标准',
  SpecialInspection: '特殊检测',
  Scale: '规格',
  MeasuredSize: '实测尺寸',
  Count: '出货数量',
  SampleCount: '抽检数量',
  ReportNo: '报告编号',
  ReportDate: '报告日期',
  Inspector: '检验员',
  InspectDate: '检验日期',
  InspectItem: '检验项目',
  InspectStandard: '检验标准',
  InspectRes: '检验结果',
  Remark: '备注'
}

// 可选字段的映射选项
const AVAILABLE_FIELD_OPTIONS = [
  { value: 'CustomerID', label: '客户编码(原客户名称)' },
  { value: 'PNum', label: '工单号' },
  { value: 'CPO', label: 'CPO' },
  { value: 'OrderNum', label: '订单号' },
  { value: 'ProductID', label: '产品编码' },
  { value: 'CProductID', label: '物料编码/客户料号' },
  { value: 'Product', label: '物料名称/产品名称' },
  { value: 'CProduct', label: '工厂订单号' },
  { value: 'BatchNo', label: '生产批次' },
  { value: 'DeliveryNoteNo', label: '送货单号' },
  { value: 'Standard', label: '依据标准' },
  { value: 'SpecialInspection', label: '特殊检测' },
  { value: 'Scale', label: '规格' },
  { value: 'MeasuredSize', label: '实测尺寸' },
  { value: 'Count', label: '出货数量' },
  { value: 'SampleCount', label: '抽检数量' },
  { value: 'ReportNo', label: '报告编号' },
  { value: 'ReportDate', label: '报告日期' },
  { value: 'Inspector', label: '检验员' },
  { value: 'InspectDate', label: '检验日期' }
]

// 表格可选字段选项
const AVAILABLE_TABLE_FIELD_OPTIONS = [
  { value: 'Index', label: '序号' },
  { value: 'InspectItem', label: '检验项目' },
  { value: 'InspectStandard', label: '检验标准' },
  { value: 'InspectRes', label: '检验结果' },
  { value: 'Remark', label: '备注' }
]

// 计算属性
const headerRowsCount = computed(() => Math.max(1, (mappingData.table.startRow || 1) - (mappingData.table.headerRow || 1)))
function getFieldZhLabel(name) {
  const key = String(name || '').trim()
  if (!key) return '中文名'
  if (/[\u4e00-\u9fa5]/.test(key)) return key
  return FIELD_ZH_MAP[key] || key
}
function dedupeTopFields(fields) {
  if (!Array.isArray(fields)) return []
  const seen = new Set()
  const result = []
  for (const item of fields) {
    if (!item || typeof item !== 'object') continue
    const name = String(item.name || '').trim()
    const cell = String(item.cell || '').trim().toUpperCase()
    const dedupeKey = `${name}@@${cell}`
    if (seen.has(dedupeKey)) continue
    seen.add(dedupeKey)
    result.push(item)
  }
  return result
}
function mergeTopFields(parsedFields, savedFields) {
  const parsed = dedupeTopFields(parsedFields)
  const saved = dedupeTopFields(savedFields)
  const buildKey = (item) => {
    const name = String(item?.name || '').trim().toUpperCase()
    if (name) return `NAME:${name}`
    const label = String(item?.label || '').trim().toUpperCase()
    if (label) return `LABEL:${label}`
    return `CELL:${String(item?.cell || '').trim().toUpperCase()}`
  }
  const merged = []
  const used = new Set()
  saved.forEach(item => {
    const key = buildKey(item)
    if (used.has(key)) return
    used.add(key)
    merged.push(item)
  })
  parsed.forEach(item => {
    const key = buildKey(item)
    if (used.has(key)) return
    used.add(key)
    merged.push(item)
  })
  return merged
}
function dedupeTableColumns(columns) {
  if (!Array.isArray(columns)) return []
  const seen = new Set()
  const result = []
  for (const item of columns) {
    if (!item || typeof item !== 'object') continue
    const name = String(item.name || '').trim().toUpperCase()
    const header = String(item.header || '').trim().toUpperCase()
    const col = Number(item.col || 0)
    const key = `${name}@@${header}@@${col}`
    if (seen.has(key)) continue
    seen.add(key)
    result.push(item)
  }
  return result
}
function mergeTableColumns(parsedColumns, savedColumns) {
  const parsed = dedupeTableColumns(parsedColumns)
  const saved = dedupeTableColumns(savedColumns)
  const rowKey = (item) => {
    const header = String(item?.header || '').trim().toUpperCase()
    const col = Number(item?.col || 0)
    return `${header}@@${col}`
  }
  const parsedByRow = new Map(parsed.map(item => [rowKey(item), item]))
  const merged = []
  const used = new Set()

  saved.forEach(item => {
    const key = rowKey(item)
    const parsedItem = parsedByRow.get(key)
    const savedName = String(item?.name || '').trim()
    const savedHeader = String(item?.header || '').trim()
    const parsedName = String(parsedItem?.name || '').trim()
    const parsedLooksLikeKey = /^[A-Za-z_][A-Za-z0-9_]*$/.test(parsedName)
    const shouldUpgradeName = !!parsedItem && (!savedName || savedName === savedHeader || (/[一-龥]/.test(savedName) && parsedLooksLikeKey))

    merged.push(shouldUpgradeName ? { ...item, name: parsedName } : item)
    used.add(key)
  })

  parsed.forEach(item => {
    const key = rowKey(item)
    if (used.has(key)) return
    used.add(key)
    merged.push(item)
  })

  return dedupeTableColumns(merged)
}

// 返回上一页
function goBack() {
  router.back()
}

// 加载模板信息和映射
async function loadTemplate() {
  try {
    const id = route.params.id || route.query.id
    if (!id) {
      ElMessage.error('缺少模板ID')
      return
    }
    templateId.value = id

    // 获取模板信息
    const infoResp = await api.get(`/shipment-report/templates/${id}`)
    templateInfo.value = infoResp?.data || infoResp || {}

    // 解析模板
    const parseResp = await api.post(`/shipment-report/templates/${id}/parse`)
    const parsed = parseResp?.data || parseResp || {}
    
    const parsedFields = parsed.mapping?.fields || []
    const parsedColumns = parsed.mapping?.table?.columns || []
    if (parsed.mapping) {
      Object.assign(mappingData, parsed.mapping)
      mappingData.fields = dedupeTopFields(mappingData.fields)
      if (mappingData.table) {
        mappingData.table.columns = dedupeTableColumns(mappingData.table.columns)
      }
    }
    mappingPreviewHtml.value = parsed.previewHtml || ''

    // 获取已保存的映射
    try {
      const savedResp = await api.get(`/shipment-report/templates/${id}/mapping`)
      const saved = savedResp?.data || savedResp
      if (saved && typeof saved === 'object' && Object.keys(saved).length > 0) {
        Object.assign(mappingData, saved)
        mappingData.fields = mergeTopFields(parsedFields, saved.fields)
        if (!mappingData.table) mappingData.table = {}
        mappingData.table.columns = mergeTableColumns(parsedColumns, saved.table?.columns)
        
        // 强制使用最新解析的列宽信息（因为这是由模板文件决定的，且后端解析逻辑已优化）
        if (parsed.mapping?.layout?.cols) {
          if (!mappingData.layout) mappingData.layout = {}
          mappingData.layout.cols = parsed.mapping.layout.cols
        }
      }
    } catch {}

    // 初始化列宽输入框
    initColumnWidthsInput()

  } catch (e) {
    ElMessage.error('加载模板失败：' + (e.message || '未知错误'))
  }
}

// 刷新预览
async function refreshPreview() {
  try {
    const parseResp = await api.post(`/shipment-report/templates/${templateId.value}/parse`)
    const parsed = parseResp?.data || parseResp || {}
    mappingPreviewHtml.value = parsed.previewHtml || ''
    ElMessage.success('预览已刷新')
  } catch (e) {
    ElMessage.error('刷新失败：' + (e.message || '未知错误'))
  }
}

// 测试预览填充
async function testPreviewMapping() {
  try {
    const resp = await api.get(`/shipment-report/templates/${templateId.value}/download`, { responseType: 'arraybuffer' })
    const wb = new ExcelJS.Workbook()
    await wb.xlsx.load(resp)
    
    // 构建测试数据
    const ctx = buildTestContext()
    applyMappingFill(wb, mappingData, ctx)
    
    const out = await wb.xlsx.writeBuffer()
    const x = XLSX.read(out, { type: 'array' })
    const ws = x.Sheets[x.SheetNames[0]]
    mappingPreviewHtml.value = generatePreviewHtmlWithCoords(ws)
    ElMessage.success('测试预览已更新')
  } catch (e) {
    ElMessage.error('测试预览失败：' + (e.message || '未知错误'))
  }
}

// 构建测试上下文数据
function buildTestContext() {
  return {
    // 英文键
    CustomerID: 'TEST001',
    PNum: 'WO-20241209-001',
    CPO: 'CPO-12345',
    OrderNum: 'ORD-67890',
    ProductID: 'PROD-001',
    CProductID: 'CPROD-001',
    Product: '测试产品名称',
    CProduct: '客户产品名称',
    Scale: '100x50x25mm',
    MeasuredSize: '100.1*50.2',
    Count: 1000,
    ReportNo: 'RPT-20241209-001',
    ReportDate: new Date().toISOString().slice(0, 10),
    
    // 中文键
    客户编码: 'TEST001',
    客户名称: 'TEST001', // 为了测试填充显示，可以给测试上下文中的客户名称也赋值为CustomerID
    工单号: 'WO-20241209-001',
    订单号: 'ORD-67890',
    产品编码: 'PROD-001',
    客户料号: 'CPROD-001',
    物料编码: 'CPROD-001', // 为了测试填充显示，将物料编码加上
    产品名称: '测试产品名称',
    物料名称: '测试产品名称', // 为了测试填充显示，将物料名称加上
    品名: '测试产品名称',
    规格: '100x50x25mm',
    实测尺寸: '100.1*50.2',
    实测: '100.1*50.2',
    数量: 1000,
    出货数量: 1000,
    报告编号: 'RPT-20241209-001',
    日期: new Date().toISOString().slice(0, 10),
    报告日期: new Date().toISOString().slice(0, 10),
    
    // 检验人员和日期（底部签名区）
    Inspector: '张三',
    检验人员: '张三',
    检验员: '张三',
    InspectDate: new Date().toISOString().slice(0, 10),
    检验日期: new Date().toISOString().slice(0, 10),
    
    tableData: [
      { Index: 1, 序号: 1, CProductID: 'CPROD-001', 客户料号: 'CPROD-001', Product: '测试产品A', 产品名称: '测试产品A', 品名: '测试产品A', Count: 500, 数量: 500, 出货数量: 500, Scale: '110*220mm', 规格: '110*220mm', MeasuredSize: '110.1*220.2', 实测尺寸: '110.1*220.2', 外观: 'OK', 颜色: 'OK', 图文: 'OK', 字体: 'OK', 啤切线: 'OK', 物料编号: 'OK', 模切方式: 'OK', 包装方式: 'OK', 材质: 'OK', 印刷内容: 'OK', 结果判定: '合格' },
      { Index: 2, 序号: 2, CProductID: 'CPROD-002', 客户料号: 'CPROD-002', Product: '测试产品B', 产品名称: '测试产品B', 品名: '测试产品B', Count: 300, 数量: 300, 出货数量: 300, Scale: '100*50mm', 规格: '100*50mm', MeasuredSize: '99.8*50.1', 实测尺寸: '99.8*50.1', 外观: 'OK', 颜色: 'OK', 图文: 'OK', 字体: 'OK', 啤切线: 'OK', 物料编号: 'OK', 模切方式: 'OK', 包装方式: 'OK', 材质: 'OK', 印刷内容: 'OK', 结果判定: '合格' },
      { Index: 3, 序号: 3, CProductID: 'CPROD-003', 客户料号: 'CPROD-003', Product: '测试产品C', 产品名称: '测试产品C', 品名: '测试产品C', Count: 200, 数量: 200, 出货数量: 200, Scale: '80*60mm', 规格: '80*60mm', MeasuredSize: '80.2*59.9', 实测尺寸: '80.2*59.9', 外观: 'OK', 颜色: 'OK', 图文: 'OK', 字体: 'OK', 啤切线: 'OK', 物料编号: 'OK', 模切方式: 'OK', 包装方式: 'OK', 材质: 'OK', 印刷内容: 'OK', 结果判定: '合格' }
    ]
  }
}

// 应用映射填充
function applyMappingFill(workbook, mapping, ctx) {
  if (!workbook || !mapping) return
  const worksheet = workbook.worksheets[mapping.table?.sheetIndex || 0]
  if (!worksheet) return

  // 填充顶部字段
  if (mapping.fields && Array.isArray(mapping.fields)) {
    mapping.fields.forEach(field => {
      if (!field.cell) return
      const value = ctx[field.name]
      if (value !== undefined && value !== null) {
        try {
          worksheet.getCell(field.cell).value = value
        } catch {}
      }
    })
  }

  // 填充占位符
  if (mapping.placeholders && Array.isArray(mapping.placeholders)) {
    mapping.placeholders.forEach(ph => {
      if (!ph.cell) return
      const value = ctx[ph.name]
      if (value !== undefined && value !== null) {
        try {
          worksheet.getCell(ph.cell).value = value
        } catch {}
      }
    })
  }

  // 填充表格数据
  if (mapping.table && ctx.tableData && Array.isArray(ctx.tableData)) {
    const { startRow, columns } = mapping.table
    if (!startRow || !columns) return

    ctx.tableData.forEach((rowData, rowIndex) => {
      const excelRowNum = startRow + rowIndex
      columns.forEach(col => {
        const value = rowData[col.name] ?? rowData[col.header]
        if (value === undefined || value === null) return
        const targetCol = col.merge ? col.merge.startCol : col.col
        if (targetCol) {
          try {
            worksheet.getCell(excelRowNum, targetCol).value = value
          } catch {}
        }
      })
    })
  }
}

// 将列号转换为列字母 (1->A, 2->B, etc.)
function getColLetter(colNum) {
  if (!colNum || colNum < 1) return '?'
  return XLSX.utils.encode_col(colNum - 1)
}

// 生成带坐标的预览HTML
function generatePreviewHtmlWithCoords(ws) {
  if (!ws || !ws['!ref']) return '<p>无数据</p>'
  
  const range = XLSX.utils.decode_range(ws['!ref'])
  const { s: { r: top, c: left }, e: { r: bottom, c: right } } = range
  const merges = ws['!merges'] || []
  
  const mergeMap = new Map()
  merges.forEach(m => {
    for (let r = m.s.r; r <= m.e.r; r++) {
      for (let c = m.s.c; c <= m.e.c; c++) {
        if (r === m.s.r && c === m.s.c) {
          mergeMap.set(`${r}-${c}`, { isOrigin: true, rowspan: m.e.r - m.s.r + 1, colspan: m.e.c - m.s.c + 1 })
        } else {
          mergeMap.set(`${r}-${c}`, { isOrigin: false })
        }
      }
    }
  })

  const getCellValue = (r, c) => {
    const cell = ws[XLSX.utils.encode_cell({ r, c })]
    return cell?.v != null ? String(cell.v) : ''
  }

  let html = '<table><thead><tr><th></th>'
  for (let c = left; c <= right; c++) {
    html += `<th>${XLSX.utils.encode_col(c)}</th>`
  }
  html += '</tr></thead><tbody>'

  for (let r = top; r <= bottom; r++) {
    html += `<tr><td class="row-header">${r + 1}</td>`
    for (let c = left; c <= right; c++) {
      const mi = mergeMap.get(`${r}-${c}`)
      if (mi && !mi.isOrigin) continue
      const val = getCellValue(r, c).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      let attrs = `data-cell="${XLSX.utils.encode_cell({ r, c })}" data-row="${r + 1}" data-col="${c + 1}"`
      if (mi?.isOrigin) {
        if (mi.rowspan > 1) attrs += ` rowspan="${mi.rowspan}"`
        if (mi.colspan > 1) attrs += ` colspan="${mi.colspan}"`
      }
      html += `<td ${attrs}>${val}</td>`
    }
    html += '</tr>'
  }
  html += '</tbody></table>'
  return html
}

// 保存映射
async function saveCurrentMapping() {
  try {
    mappingData.fields = dedupeTopFields(mappingData.fields)
    await api.post(`/shipment-report/templates/${templateId.value}/mapping`, mappingData)
    ElMessage.success('映射保存成功')
  } catch (e) {
    ElMessage.error('保存失败：' + (e.message || '未知错误'))
  }
}

// 处理预览点击
function handlePreviewClick(e) {
  const td = e.target.closest('td[data-cell]')
  if (!td) return
  
  const cell = td.dataset.cell
  const row = parseInt(td.dataset.row)
  const col = parseInt(td.dataset.col)
  const text = td.textContent?.trim() || ''

  if (currentBindFieldIndex.value !== -1) {
    // 绑定顶部字段 - 使用点击单元格右侧
    const targetCell = `${XLSX.utils.encode_col(col)}${row}`
    mappingData.fields[currentBindFieldIndex.value].cell = targetCell
    ElMessage.success(`已绑定单元格：${targetCell}`)
    currentBindFieldIndex.value = -1
  } else if (currentBindColumnIndex.value !== -1) {
    // 绑定表格列
    mappingData.table.columns[currentBindColumnIndex.value].col = col
    if (!mappingData.table.columns[currentBindColumnIndex.value].header && text) {
      mappingData.table.columns[currentBindColumnIndex.value].header = text
    }
    ElMessage.success(`已绑定列：第 ${col} 列 (${XLSX.utils.encode_col(col - 1)})`)
    currentBindColumnIndex.value = -1
  } else {
    ElMessage.info(`单元格 ${cell}，行 ${row}，列 ${col}`)
  }
}

// 设置绑定索引
function setBindFieldIndex(idx) {
  currentBindFieldIndex.value = idx
  currentBindColumnIndex.value = -1
}

function setBindColumnIndex(idx) {
  currentBindColumnIndex.value = idx
  currentBindFieldIndex.value = -1
}

// 添加/删除字段
function addField() {
  mappingData.fields.push({ name: '', cell: '' })
}

function removeField(idx) {
  mappingData.fields.splice(idx, 1)
  if (currentBindFieldIndex.value === idx) currentBindFieldIndex.value = -1
}

// 添加/删除列
function addColumn() {
  mappingData.table.columns.push({ header: '', name: '', col: 1 })
}

function removeColumn(idx) {
  mappingData.table.columns.splice(idx, 1)
  if (currentBindColumnIndex.value === idx) currentBindColumnIndex.value = -1
}

// 解析列宽输入
function parseColumnWidthsFromInput() {
  const input = columnWidthsInput.value.trim()
  if (!input) {
    mappingData.layout.columnWidths = []
    return
  }
  
  // 支持多种分隔符：逗号、空格、换行、制表符
  const parts = input.split(/[\s,\t\n]+/).filter(s => s.trim())
  const widths = []
  
  for (const part of parts) {
    const num = parseFloat(part.trim())
    if (!isNaN(num) && num > 0) {
      widths.push(Math.round(num * 100) / 100) // 保留2位小数
    }
  }
  
  if (widths.length > 0) {
    mappingData.layout.columnWidths = widths
    ElMessage.success(`已解析 ${widths.length} 列列宽配置`)
  } else {
    ElMessage.warning('未能解析出有效的列宽数据')
  }
}

// 初始化列宽输入框
function initColumnWidthsInput() {
  if (mappingData.layout.columnWidths && mappingData.layout.columnWidths.length > 0) {
    columnWidthsInput.value = mappingData.layout.columnWidths.join(', ')
  }
}

onMounted(() => {
  loadTemplate()
})
</script>

<style scoped>
.template-mapping-page {
  padding: 20px;
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: #f5f7fa;
  box-sizing: border-box;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: #fff;
  padding: 16px 24px;
  border-radius: 8px;
  margin-bottom: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.header-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.title-section h1 {
  margin: 0;
  font-size: 20px;
  color: #303133;
}

.title-section .subtitle {
  margin: 4px 0 0;
  font-size: 13px;
  color: #909399;
}

.header-actions {
  display: flex;
  gap: 12px;
}

.main-content {
  flex: 1;
  display: flex;
  gap: 16px;
  min-height: 0;
}

.preview-panel {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.mapping-panel {
  width: 420px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
  overflow-y: auto;
}

.full-height-card {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.full-height-card :deep(.el-card__body) {
  flex: 1;
  overflow: hidden;
  padding: 0;
}

.card-header {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
  color: #303133;
}

.card-header .el-icon {
  color: #409eff;
}

.header-tip {
  margin-left: auto;
  font-size: 12px;
  color: #e6a23c;
  font-weight: normal;
}

.header-tip strong {
  color: #409eff;
}

.preview-wrapper {
  height: 100%;
  overflow: auto;
  padding: 12px;
}

.mapping-preview {
  min-height: 100%;
}

.mapping-preview :deep(table) {
  border-collapse: collapse;
  font-size: 12px;
  width: max-content;
  min-width: max-content;
  margin: 0 auto;
}

.mapping-preview :deep(th),
.mapping-preview :deep(td) {
  border: 1px solid #dcdfe6;
  padding: 2px 4px;
  text-align: center;
  min-width: 0;
  white-space: nowrap;
}

.mapping-preview :deep(thead th) {
  background: #f0f2f5;
  font-weight: 600;
  color: #606266;
  text-align: center;
  position: sticky;
  top: 0;
  z-index: 2;
}

.mapping-preview :deep(tbody td.row-header),
.mapping-preview :deep(td:first-child) {
  background: #f0f2f5;
  font-weight: 600;
  color: #606266;
  text-align: center;
  position: sticky;
  left: 0;
  z-index: 1;
}

.mapping-preview :deep(tbody tr:hover td:not(.row-header):not(:first-child)) {
  background: #ecf5ff;
}

.mapping-preview :deep(td[data-cell]:hover) {
  background: #d9ecff !important;
  cursor: pointer;
  outline: 2px solid #409eff;
  outline-offset: -2px;
}

.config-card {
  flex-shrink: 0;
}

.config-card :deep(.el-card__header) {
  padding: 12px 16px;
  border-bottom: 1px solid #ebeef5;
}

.config-card :deep(.el-card__body) {
  padding: 12px 16px;
}

.field-list,
.column-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 200px;
  overflow-y: auto;
}

.field-item,
.column-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px;
  background: #fafafa;
  border-radius: 4px;
  border: 1px solid transparent;
  transition: all 0.2s;
}

.field-item.active,
.column-item.active {
  background: #ecf5ff;
  border-color: #409eff;
}

.column-item {
  flex-direction: column;
  align-items: stretch;
}

.column-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.column-merge {
  margin-top: 4px;
}

.col-number-wrapper {
  display: flex;
  align-items: center;
  gap: 4px;
}

.col-letter {
  font-size: 11px;
  color: #909399;
  white-space: nowrap;
}

.field-zh-label {
  min-width: 78px;
  color: #606266;
  font-size: 12px;
  text-align: right;
}

.column-widths-config {
  padding: 8px 0;
}

.column-widths-preview {
  margin-top: 8px;
  padding: 8px;
  background: #f5f7fa;
  border-radius: 4px;
  max-height: 120px;
  overflow-y: auto;
}

.column-widths-tip {
  margin-top: 8px;
  padding: 8px;
  background: #fafafa;
  border-radius: 4px;
  text-align: center;
}

:deep(.el-empty) {
  padding: 12px 0;
}

:deep(.el-empty__description) {
  margin-top: 8px;
}
</style>
