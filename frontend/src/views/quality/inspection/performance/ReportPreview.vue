<template>
  <div class="report-preview">
      <div class="print-actions">
          <el-button type="primary" @click="print">打印</el-button>
          <el-button @click="$emit('close')">关闭</el-button>
      </div>
      
      <div class="report-paper" id="print-area">
          <img v-if="siteConfig.logoBase64Img" :src="siteConfig.logoBase64Img" class="company-logo" alt="logo" />
          <div class="report-header">
              <h2 class="company-name">{{ siteConfig.companyName || '广东东美新材料有限公司' }}</h2>
              <h1 class="title">{{ reportTitle }}</h1>
          </div>
          
          <table class="info-table">
              <tr v-for="(row, rIdx) in headerRows" :key="rIdx">
                  <template v-for="(field, cIdx) in row" :key="cIdx">
                      <td class="label">{{ field.label }}</td>
                      <td class="value-cell">{{ formatValue(report[field.key], field.type) }}</td>
                  </template>
              </tr>
          </table>
          
          <div v-for="(item, index) in items" :key="index" class="test-item-section">
              <div class="item-details">
                  
                  <!-- Adhesion -->
                  <div v-if="item.TestType === 'Adhesion'">
                      <table class="sub-info-table">
                          <tr>
                              <td class="sub-label">试验项目</td><td style="width: 21.33%">{{ item.Conditions?.SpecificTestName }}</td>
                              <td class="sub-label">实验类型</td><td style="width: 21.33%">{{ formatArray(item.Conditions?.ExperimentType) }}</td>
                              <td class="sub-label">测试仪器</td><td>{{ getInstrumentName(item.InstrumentID) }}</td>
                          </tr>
                          <tr>
                              <td class="sub-label">实验目的</td><td colspan="5">{{ item.Conditions?.Purpose }}</td>
                          </tr>
                          <tr>
                              <td class="sub-label">实验条件</td><td colspan="5">{{ item.Conditions?.Condition }}</td>
                          </tr>
                          <tr>
                              <td class="sub-label">测试方法</td><td colspan="5">{{ item.Method }}</td>
                          </tr>
                      </table>

                      <table class="data-table" style="margin-top: 10px;">
                          <tr>
                              <td style="width: 12%; font-weight: bold; background: #f9f9f9;">组别</td>
                              <th v-for="i in 10" :key="i">#{{ i }}</th>
                              <td style="width: 12%; font-weight: bold; background: #f9f9f9;">综合判定</td>
                          </tr>
                          <tr>
                              <td style="font-weight: bold; background: #f9f9f9;">持粘时间(h)</td>
                              <td v-for="(s, idx) in (item.ResultData?.samples || [])" :key="idx">{{ s.result || s.value }}</td>
                              <td>{{ item.Conclusion }}</td>
                          </tr>
                      </table>
                      
                      <!-- Images Table (Unified Footer) -->
                      <table class="data-table" style="margin-top: -1px; border-top: none;" v-if="hasImages(item)">
                          <tr>
                              <td style="width: 12%; font-weight: bold; background: #f9f9f9; text-align: center;">测试图片</td>
                              <td class="image-cell">
                                  <div class="images-container">
                                      <template v-if="item.Images && item.Images.length > 0">
                                          <img v-for="(img, idx) in item.Images" :key="'img-'+idx" :src="img.url || img" class="report-img" />
                                      </template>
                                      <template v-else-if="item.ResultData?.images && item.ResultData.images.length > 0">
                                          <img v-for="(img, idx) in item.ResultData.images" :key="'res-img-'+idx" :src="img.url || img" class="report-img" />
                                      </template>
                                  </div>
                              </td>
                          </tr>
                      </table>
                  </div>
                  
                  <!-- Peel -->
                  <div v-else-if="item.TestType === 'Peel'">
                      <table class="sub-info-table">
                          <tr>
                              <td class="sub-label">试验项目</td><td style="width: 21.33%">{{ item.Conditions?.SpecificTestName }}</td>
                              <td class="sub-label">单位</td><td style="width: 21.33%">{{ item.Conditions?.Unit }}</td>
                              <td class="sub-label">测试仪器</td><td>{{ getInstrumentName(item.InstrumentID) }}</td>
                          </tr>
                          <tr>
                              <td class="sub-label">试验人员</td><td>{{ item.Conditions?.Tester }}</td>
                              <td class="sub-label">试验标准</td><td>{{ item.Standard }}</td>
                              <td class="sub-label">试验规格</td><td>{{ item.Conditions?.Spec }}</td>
                          </tr>
                          <tr>
                              <td class="sub-label">试验速度</td><td>{{ item.Conditions?.Speed }}</td>
                              <td class="sub-label">实验时间</td><td>{{ item.Conditions?.Time }}</td>
                              <td class="sub-label">采购单号</td><td>{{ item.Conditions?.PurchaseNo }}</td>
                          </tr>
                          <tr>
                              <td class="sub-label">参考标准</td><td>{{ item.Conditions?.RefStandard }}</td>
                              <td class="sub-label">实际测试</td><td>{{ item.Conditions?.ActualTest }}</td>
                              <td class="sub-label">判定</td><td>{{ item.Conclusion }}</td>
                          </tr>
                      </table>

                      <table class="data-table" style="margin-top: 10px;">
                          <thead>
                              <tr>
                              <th style="width: 12%">组别</th>
                              <th style="width: 29.33%">最大{{ item.Conditions?.SpecificTestName || '剥离力' }}({{ item.Conditions?.Unit || 'N' }})</th>
                              <th style="width: 29.33%">最小{{ item.Conditions?.SpecificTestName || '剥离力' }}({{ item.Conditions?.Unit || 'N' }})</th>
                              <th style="width: 29.33%">平均{{ item.Conditions?.SpecificTestName || '剥离力' }}({{ item.Conditions?.Unit || 'N' }})</th>
                          </tr>
                          </thead>
                          <tbody>
                              <tr v-for="(g, idx) in (item.ResultData?.groups || [])" :key="idx">
                                  <td>{{ idx + 1 }}</td>
                                  <td>{{ g.max }}</td>
                                  <td>{{ g.min }}</td>
                                  <td>{{ g.avg }}</td>
                              </tr>
                              <!-- Summary Rows -->
                              <template v-if="item.ResultData?.groups && item.ResultData.groups.length > 0">
                                  <tr class="summary-row">
                                      <td>最大值</td>
                                      <td>{{ calculateStats(item.ResultData.groups).max.max }}</td>
                                      <td>{{ calculateStats(item.ResultData.groups).min.max }}</td>
                                      <td>{{ calculateStats(item.ResultData.groups).avg.max }}</td>
                                  </tr>
                                  <tr class="summary-row">
                                      <td>最小值</td>
                                      <td>{{ calculateStats(item.ResultData.groups).max.min }}</td>
                                      <td>{{ calculateStats(item.ResultData.groups).min.min }}</td>
                                      <td>{{ calculateStats(item.ResultData.groups).avg.min }}</td>
                                  </tr>
                                  <tr class="summary-row">
                                      <td>平均值</td>
                                      <td>{{ calculateStats(item.ResultData.groups).max.avg }}</td>
                                      <td>{{ calculateStats(item.ResultData.groups).min.avg }}</td>
                                      <td>{{ calculateStats(item.ResultData.groups).avg.avg }}</td>
                                  </tr>
                                  <tr class="summary-row">
                                      <td>X-4.5σ</td>
                                      <td>{{ calculateStats(item.ResultData.groups).max.sigma }}</td>
                                      <td>{{ calculateStats(item.ResultData.groups).min.sigma }}</td>
                                      <td>{{ calculateStats(item.ResultData.groups).avg.sigma }}</td>
                                  </tr>
                              </template>
                          </tbody>
                      </table>

                      <!-- Images Table -->
                      <table class="data-table" style="margin-top: -1px; border-top: none;" v-if="hasImages(item)">
                          <tr>
                              <td style="width: 12%; font-weight: bold; background: #f9f9f9; text-align: center;">测试图片</td>
                              <td colspan="3" class="image-cell">
                                  <div class="images-container">
                                      <template v-if="item.Images && item.Images.length > 0">
                                          <img v-for="(img, idx) in item.Images" :key="'img-'+idx" :src="img.url || img" class="report-img" />
                                      </template>
                                      <template v-else-if="item.ResultData?.images && item.ResultData.images.length > 0">
                                          <img v-for="(img, idx) in item.ResultData.images" :key="'res-img-'+idx" :src="img.url || img" class="report-img" />
                                      </template>
                                  </div>
                              </td>
                          </tr>
                      </table>
                  </div>
                  
                  <!-- Abrasion -->
                  <div v-else-if="item.TestType === 'Abrasion'">
                      <table class="sub-info-table">
                           <tr>
                              <td class="sub-label">标准</td><td style="width: 21.33%">{{ item.Standard }}</td>
                              <td class="sub-label">方法</td><td style="width: 21.33%">{{ item.Method }}</td>
                              <td class="sub-label">仪器</td><td>{{ getInstrumentName(item.InstrumentID) }}</td>
                          </tr>
                          <tr>
                              <td class="sub-label">荷重</td><td>{{ item.Conditions?.Load }}</td>
                              <td class="sub-label">速度</td><td>{{ item.Conditions?.Speed }}</td>
                              <td class="sub-label"></td><td></td>
                          </tr>
                          <tr>
                              <td class="sub-label">结果判定</td><td colspan="5">{{ item.Conditions?.Result }}</td>
                          </tr>
                      </table>
                      
                      <!-- Result Description & Images Table (Unified Footer) -->
                      <table class="data-table" style="margin-top: -1px; border-top: none;">
                          <tr>
                              <td style="width: 12%; font-weight: bold; background: #f9f9f9; text-align: center;">结果描述</td>
                              <td style="text-align: left; padding-left: 10px;">{{ item.Conclusion }}</td>
                          </tr>
                          <tr v-if="hasImages(item)">
                              <td style="width: 12%; font-weight: bold; background: #f9f9f9; text-align: center;">测试图片</td>
                              <td class="image-cell">
                                  <div class="images-container">
                                      <template v-if="item.Images && item.Images.length > 0">
                                          <img v-for="(img, idx) in item.Images" :key="'img-'+idx" :src="img.url || img" class="report-img" />
                                      </template>
                                      <template v-else-if="item.ResultData?.images && item.ResultData.images.length > 0">
                                          <img v-for="(img, idx) in item.ResultData.images" :key="'res-img-'+idx" :src="img.url || img" class="report-img" />
                                      </template>
                                  </div>
                              </td>
                          </tr>
                      </table>
                  </div>

                  <!-- Alcohol -->
                  <div v-else-if="item.TestType === 'Alcohol'">
                      <table class="sub-info-table">
                           <tr>
                              <td class="sub-label">标准</td><td style="width: 21.33%">{{ item.Standard }}</td>
                              <td class="sub-label">方法</td><td style="width: 21.33%">{{ item.Method }}</td>
                              <td class="sub-label">仪器</td><td>{{ getInstrumentName(item.InstrumentID) }}</td>
                          </tr>
                          <tr>
                              <td class="sub-label">溶剂</td><td>{{ item.Conditions?.Solvent }}</td>
                              <td class="sub-label">酒精度</td><td>{{ item.Conditions?.AlcoholContent }}</td>
                              <td class="sub-label"></td><td></td>
                          </tr>
                          <tr>
                              <td class="sub-label">结果判定</td><td colspan="5">{{ item.Conditions?.Result }}</td>
                          </tr>
                      </table>
                      
                      <!-- Result Description & Images Table (Unified Footer) -->
                      <table class="data-table" style="margin-top: -1px; border-top: none;">
                          <tr>
                              <td style="width: 12%; font-weight: bold; background: #f9f9f9; text-align: center;">结果描述</td>
                              <td style="text-align: left; padding-left: 10px;">{{ item.Conclusion }}</td>
                          </tr>
                          <tr v-if="hasImages(item)">
                              <td style="width: 12%; font-weight: bold; background: #f9f9f9; text-align: center;">测试图片</td>
                              <td class="image-cell">
                                  <div class="images-container">
                                      <template v-if="item.Images && item.Images.length > 0">
                                          <img v-for="(img, idx) in item.Images" :key="'img-'+idx" :src="img.url || img" class="report-img" />
                                      </template>
                                      <template v-else-if="item.ResultData?.images && item.ResultData.images.length > 0">
                                          <img v-for="(img, idx) in item.ResultData.images" :key="'res-img-'+idx" :src="img.url || img" class="report-img" />
                                      </template>
                                  </div>
                              </td>
                          </tr>
                      </table>
                  </div>

                  <!-- Dynamic Test & Others -->
                  <div v-else>
                      <table class="sub-info-table">
                           <tr>
                              <td class="sub-label">标准</td><td style="width: 21.33%">{{ item.Standard }}</td>
                              <td class="sub-label">方法</td><td style="width: 21.33%">{{ item.Method }}</td>
                              <td class="sub-label">仪器</td><td>{{ getInstrumentName(item.InstrumentID) }}</td>
                          </tr>
                          <tr>
                              <td class="sub-label">测试条件</td><td colspan="5">{{ item.Conditions?.Condition || '-' }}</td>
                          </tr>
                      </table>
                      
                      <!-- Result Description & Images Table (Unified Footer) -->
                      <table class="data-table" style="margin-top: -1px; border-top: none;">
                          <tr>
                              <td style="width: 12%; font-weight: bold; background: #f9f9f9; text-align: center;">结果描述</td>
                              <td style="text-align: left; padding-left: 10px;">{{ item.Conclusion }}</td>
                          </tr>
                          <tr v-if="hasImages(item)">
                              <td style="width: 12%; font-weight: bold; background: #f9f9f9; text-align: center;">测试图片</td>
                              <td class="image-cell">
                                  <div class="images-container">
                                      <template v-if="item.Images && item.Images.length > 0">
                                          <img v-for="(img, idx) in item.Images" :key="'img-'+idx" :src="img.url || img" class="report-img" />
                                      </template>
                                      <template v-else-if="item.ResultData?.images && item.ResultData.images.length > 0">
                                          <img v-for="(img, idx) in item.ResultData.images" :key="'res-img-'+idx" :src="img.url || img" class="report-img" />
                                      </template>
                                  </div>
                              </td>
                          </tr>
                      </table>
                  </div>
              </div>
          </div>
          
          <div class="report-footer">
              <div class="footer-label">编制/日期:</div>
              <div class="footer-value">{{ report.CreatorName || report.CreatedBy }} / {{ formatDate(report.TestDate || new Date()) }}</div>
              <div class="footer-label" style="text-align: right;">审核/日期:</div>
              <div class="footer-value">{{ (report.AuditorName || report.Auditor || report.AuditedBy) ? (report.AuditorName || report.Auditor || report.AuditedBy) + ' / ' + (report.AuditDate ? formatDate(report.AuditDate) : '') : '' }}</div>
          </div>
          
          <slot></slot>
      </div>
  </div>
</template>

<script setup>
import dayjs from 'dayjs'
import { ref, computed, onMounted, reactive } from 'vue'
import { getAllConfigs } from '@/api/performance'
import api from '@/utils/api'

const props = defineProps({
    report: Object,
    items: Array,
    instruments: Array
})

const siteConfig = reactive({
  logoBase64Img: '',
  companyName: ''
})

const reportTitle = computed(() => {
    if (props.items && props.items.length > 0) {
        // Collect all unique specific test names from items
        const specificNames = props.items
            .map(item => item.Conditions?.SpecificTestName)
            .filter(name => name) // Filter out undefined/null/empty
        
        // Remove duplicates
        const uniqueNames = [...new Set(specificNames)]
        
        if (uniqueNames.length > 0) {
            return `${uniqueNames.join('、')}性能实验报告`
        }

        // Fallback to TestType if SpecificTestName is missing
        const firstType = getTypeName(props.items[0].TestType)
        // Clean up the type name (remove "测试" suffix if present to avoid redundancy)
        const cleanType = firstType.replace('测试', '')
        return `${cleanType}性能实验报告`
    }
    return '性能实验报告'
})

const headerConfig = ref([])

const defaultFields = [
    { key: 'ReportNo', label: '报告编号', type: 'text', visible: true, readonly: true, sort: 1 },
    { key: 'TestDate', label: '测试日期', type: 'date', visible: true, readonly: false, sort: 2 },
    { key: 'CustomerCode', label: '客户编号', type: 'text', visible: true, readonly: false, sort: 3 },
    { key: 'SampleName', label: '样品名称', type: 'text', visible: true, readonly: false, sort: 4 },
    { key: 'SampleModel', label: '样品型号', type: 'text', visible: true, readonly: false, sort: 5 },
    { key: 'BatchNo', label: '批次/工单', type: 'text', visible: true, readonly: false, sort: 6 },
    { key: 'Supplier', label: '供应商', type: 'text', visible: true, readonly: false, sort: 7 },
    { key: 'Specification', label: '规格', type: 'text', visible: true, readonly: false, sort: 8 },
    { key: 'Tester', label: '检验员', type: 'text', visible: true, readonly: false, sort: 9 }
]

const loadSiteConfig = async () => {
  try {
    const res = await api.get('/config/site-config')
    if (res.success && res.data) {
      if (res.data.logoBase64Img) {
        siteConfig.logoBase64Img = res.data.logoBase64Img
      }
      if (res.data.companyName) {
        siteConfig.companyName = res.data.companyName
      }
    }
  } catch (e) {
    console.error('Failed to load site config', e)
  }
}

onMounted(async () => {
    loadSiteConfig()
    try {
        const res = await getAllConfigs()
        const configItem = res.data.find(item => item.ItemCode === 'ReportHeader')
        if (configItem && configItem.FormConfig) {
            let parsed = JSON.parse(configItem.FormConfig)
            // Handle double-stringification
            if (typeof parsed === 'string') {
                try {
                    parsed = JSON.parse(parsed)
                } catch (e) {
                    console.warn('Failed to second-pass parse config', e)
                }
            }

            // Use config from DB if it is a valid array, even if empty
            if (Array.isArray(parsed)) {
                // Ensure default fields are merged in if missing, but respect DB config for order/visibility
                // Actually, if we want full dynamic, we should just use what's in DB.
                // But for safety, if DB config is missing some keys that are in 'report' object, we might want to show them?
                // For now, trust the config completely as it's the source of truth for "what to show".
                headerConfig.value = parsed
            } else {
                headerConfig.value = defaultFields
            }
        } else {
            headerConfig.value = defaultFields
        }
    } catch (e) {
        console.error('Failed to load header config', e)
        headerConfig.value = defaultFields
    }
})

const headerRows = computed(() => {
    const visibleFields = headerConfig.value.filter(f => f.visible)
    const rows = []
    let chunk = []
    visibleFields.forEach(field => {
        chunk.push(field)
        if (chunk.length === 3) {
            rows.push(chunk)
            chunk = []
        }
    })
    if (chunk.length > 0) {
        while (chunk.length < 3) {
            chunk.push({ isPlaceholder: true, label: '', key: '' })
        }
        rows.push(chunk)
    }
    return rows
})

const formatValue = (val, type) => {
    if (!val) return ''
    if (type === 'date') return formatDate(val)
    return val
}

const formatDate = (date) => {   if (!date) return ''
    return dayjs(date).format('YYYY-MM-DD')
}

const getTypeName = (type) => {
    const map = {
        'Adhesion': '初粘性/持粘力测试',
        'Peel': '剥离力/离型力测试',
        'Abrasion': '耐磨测试',
        'Alcohol': '耐醇性测试'
    }
    return map[type] || type
}

const getInstrumentName = (id) => {
    if (!id || !props.instruments) return ''
    const inst = props.instruments.find(i => i.ID === id)
    return inst ? inst.InstrumentName : ''
}

const formatArray = (arr) => {
    if (!arr) return ''
    if (Array.isArray(arr)) return arr.join(', ')
    return arr
}

const print = () => {
    window.print()
}

const calculateStats = (groups) => {
    if (!groups || groups.length === 0) return { max: {}, min: {}, avg: {} }
    
    const keys = ['max', 'min', 'avg']
    const result = { max: {}, min: {}, avg: {} }
    
    keys.forEach(k => {
        result[k] = { max: '-', min: '-', avg: '-', sigma: '-' }
    })
    
    keys.forEach(key => {
        const values = groups
            .map(g => parseFloat(g[key]))
            .filter(n => !isNaN(n))
        
        if (values.length > 0) {
            const max = Math.max(...values)
            const min = Math.min(...values)
            const sum = values.reduce((a, b) => a + b, 0)
            const avg = sum / values.length
            
            result[key].max = max.toFixed(3)
            result[key].min = min.toFixed(3)
            result[key].avg = avg.toFixed(3)
            
            if (values.length > 1) {
                const variance = values.reduce((a, b) => a + Math.pow(b - avg, 2), 0) / (values.length - 1)
                const sd = Math.sqrt(variance)
                const sigmaVal = avg - 4.5 * sd
                result[key].sigma = sigmaVal.toFixed(3)
            }
        }
    })
    
    return result
}

const hasImages = (item) => {
    if (item.Images && item.Images.length > 0) return true
    if (item.ResultData?.images && item.ResultData.images.length > 0) return true
    return false
}
</script>

<style>
@media print {
    body * {
        visibility: hidden;
    }
    #print-area, #print-area * {
        visibility: visible;
    }
    #print-area {
        position: relative; /* Change from fixed to relative/static for better flow control */
        left: 0;
        top: 0;
        width: 210mm !important; /* Explicitly set A4 width */
        height: auto !important;
        margin: 0;
        padding: 10mm 10mm 5mm 10mm !important; /* Increased top padding to 10mm, reduced bottom to 5mm */
        background: white !important;
    box-shadow: none !important;
    box-sizing: border-box !important; /* Ensure padding doesn't add to width */
    z-index: 9999;
    overflow: visible !important;
    display: flex !important;
    flex-direction: column !important;
    min-height: 297mm !important;
}
    
    @page {
        size: A4;
        margin: 0; /* Remove browser default margins so we control it with padding */
    }
    tr {
        page-break-inside: avoid;
    }
}
</style>

<style scoped>
.report-preview {
    background: #525659;
    padding: 20px;
    height: 100vh;
    display: flex;
    flex-direction: column;
    align-items: center;
    overflow-y: auto; /* Enable scrolling */
}
.print-actions {
    margin-bottom: 20px;
    flex-shrink: 0; /* Prevent shrinking */
}
.report-paper {
        background: white;
        width: 210mm;
        min-height: 297mm;
        padding: 10mm 10mm 5mm 10mm; /* Increased top padding to 10mm, reduced bottom to 5mm */
        box-shadow: 0 0 10px rgba(0,0,0,0.5);
        flex-shrink: 0; /* Prevent shrinking */
        margin-bottom: 20px;
        position: relative; /* Make this the positioning context for absolute children like logo */
        box-sizing: border-box; /* Ensure width includes padding */
        display: flex;
        flex-direction: column;
    }

/* Flex Header Layout Removed */

.report-header {
    text-align: center;
    margin-bottom: 20px;
    position: relative;
    z-index: 1;
}

.company-logo {
    position: absolute;
    left: 10mm; /* Match report-paper padding-left */
    top: 10mm;  /* Match report-paper padding-top */
    width: 60px;
    height: 60px;
    object-fit: contain;
    z-index: 2;
}

.title {
  font-family: "Microsoft YaHei", "微软雅黑", sans-serif;
  font-size: 24px; /* Reduced from 30px */
  font-weight: bold;
  letter-spacing: 2px; /* Reduced from 5px */
  margin: 5px 0;
}

.company-name {
  font-family: "SimSun", "Songti SC", serif;
  font-size: 18px;
  font-weight: normal;
  margin: 0;
  letter-spacing: 2px;
  color: #000;
}

.report-meta {
    display: flex;
    justify-content: space-between;
    margin-top: 10px;
}
.info-table {
    width: 100%;
    border-collapse: collapse;
    margin-bottom: 20px;
    font-size: 14px;
}
.info-table td {
    border: 1px solid #ccc;
    padding: 5px;
}
.info-table .label {
    background: #f0f0f0;
    font-weight: bold;
    width: 12%;
    text-align: center;
}
.info-table .value-cell {
    width: 21.33%;
}
.test-item-section {
    margin-bottom: 0; /* Changed from 20px to 0 */
    border: none;
    padding: 0;
}
.item-title {
    font-size: 16px;
    font-weight: bold;
    background: #eee;
    padding: 5px;
    margin-bottom: 10px;
}
.sub-info-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 14px;
}
.sub-info-table td {
    border: 1px solid #ccc;
    padding: 5px;
}
.sub-info-table .sub-label {
    background: #f9f9f9;
    font-weight: bold;
    width: 12%; /* Match info-table .label width */
    text-align: center;
    padding-right: 8px;
}
.data-table {
    width: 100%;
    border-collapse: collapse;
    margin-bottom: 0; /* Changed from 10px to 0 */
    font-size: 14px;
}
.data-table th, .data-table td {
    border: 1px solid #ccc;
    padding: 5px;
    text-align: center;
}
.summary-row td {
    background-color: #fafafa;
    font-weight: bold;
}
.item-images {
    margin-top: 10px;
}
.images-container {
    display: flex;
    flex-wrap: wrap;
    gap: 20px;
    justify-content: center;
    width: 100%;
    align-items: center;
    min-height: 200px;
}
.report-img {
    max-width: 95%;
    max-height: 400px;
    border: none;
    object-fit: contain;
    width: auto;
    height: auto;
    flex-shrink: 0;
}
.section-title {
    font-weight: bold;
    margin-bottom: 5px;
    font-size: 14px;
}
.report-footer {
    margin-top: auto;
    display: grid;
    grid-template-columns: auto 1fr auto 1fr;
    gap: 10px;
    padding: 30px 30px 30px 0;
    font-size: 14px;
}
.footer-label {
    font-weight: bold;
}
.footer-value {
    padding-left: 5px;
}

@media print {
    .report-preview {
        background: white;
        padding: 0;
    }
    .print-actions {
        display: none;
    }
    .report-paper {
        box-shadow: none;
        width: 100%;
        padding: 0;
        min-height: 290mm !important; /* Slightly reduce to fit margin handling if needed, or keep 297mm */
    }
}
</style>
