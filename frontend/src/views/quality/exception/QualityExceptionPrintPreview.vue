<template>
  <div class="preview-page">
    <div class="toolbar no-print">
      <div class="toolbar-title">品质异常联络单预览</div>
      <div class="toolbar-actions">
        <el-button type="primary" @click="handlePrint">打印</el-button>
        <el-button @click="handleClose">关闭</el-button>
      </div>
    </div>

    <div class="sheet-wrap" v-loading="loading">
      <div v-if="detail" class="sheet" id="printArea">
        <div class="doc-header">
          <div class="logo-box">
            <span>公司</span>
            <span>LOGO</span>
          </div>
          <div class="doc-title-wrap">
            <div class="company-name">[公司名称]</div>
            <div class="title">品质异常联络单</div>
          </div>
          <div class="doc-meta">
            <span>单号：{{ detail.ExceptionNumber || '-' }}</span>
          </div>
        </div>

        <table class="table">
          <colgroup>
            <col class="w-label">
            <col class="w-value">
            <col class="w-label">
            <col class="w-value">
            <col class="w-label">
            <col class="w-value">
          </colgroup>
          <tbody>
            <tr class="section-row">
              <td colspan="6">一、基本信息</td>
            </tr>
            <tr>
              <td class="label">客户编码</td>
              <td colspan="2">{{ detail.CustomerCode || '-' }}</td>
              <td class="label">产品名称</td>
              <td colspan="2">{{ detail.ProductName || '-' }}</td>
            </tr>
            <tr>
              <td class="label">工单号</td>
              <td>{{ detail.WorkOrderNum || '-' }}</td>
              <td class="label">物料编码</td>
              <td>{{ detail.MaterialCode || '-' }}</td>
              <td class="label">型号规格</td>
              <td>{{ detail.ModelSpec || '-' }}</td>
            </tr>
            <tr>
              <td class="label">生产数量</td>
              <td>{{ formatNumber(detail.ProductionQuantity) }}</td>
              <td class="label">异常数量</td>
              <td>{{ formatNumber(detail.ExceptionQuantity) }}</td>
              <td class="label">开单日期</td>
              <td>{{ formatDateDash(detail.ReportDate) }}</td>
            </tr>
            <tr class="section-row">
              <td colspan="6">二、异常说明</td>
            </tr>
            <tr>
              <td class="label">问题描述</td>
              <td colspan="5" class="multiline">{{ detail.Description || '-' }}</td>
            </tr>
            <tr>
              <td class="label">初步原因分析</td>
              <td colspan="5" class="multiline">{{ detail.PreliminaryCause || '-' }}</td>
            </tr>
            <tr>
              <td class="label">处理方式</td>
              <td colspan="5">
                <div class="method-row">
                  <div class="method-options">
                    <span v-for="item in handlingMethodOptions" :key="item.value" class="method-item">
                      <span class="box">{{ isMethodSelected(item.value) ? '☑' : '☐' }}</span>{{ item.label }}
                    </span>
                  </div>
                  <span>完成日期：{{ formatDateDash(detail.CompletionDeadline) }}</span>
                </div>
              </td>
            </tr>
            <tr>
              <td class="label">责任部门：{{ detail.ResponsibleDepartment || '-' }}</td>
              <td colspan="2">责任人：{{ detail.ResponsiblePerson || '-' }}</td>
              <td colspan="3">填报人：{{ detail.Reporter || '-' }}</td>
            </tr>
            <tr class="section-row">
              <td colspan="6">三、异常处理</td>
            </tr>
            <tr class="sub-header-row">
              <td></td>
              <td colspan="2">内容</td>
              <td>执行人</td>
              <td>完成日期</td>
              <td>验证结果</td>
            </tr>
            <tr>
              <td class="label">临时对策</td>
              <td colspan="2" class="multiline">{{ detail.TemporaryCountermeasure || '-' }}</td>
              <td>{{ detail.Executor || '-' }}</td>
              <td>{{ formatDateDash(detail.CompletionDeadline) }}</td>
              <td>{{ getVerificationResultLabel(detail.VerificationResult) }}</td>
            </tr>
            <tr>
              <td class="label">永久对策</td>
              <td colspan="2" class="multiline">{{ detail.PermanentCountermeasure || '-' }}</td>
              <td>{{ detail.Verifier || '-' }}</td>
              <td>{{ formatDateDash(auditDate) }}</td>
              <td>{{ getVerificationResultLabel(detail.VerificationResult) }}</td>
            </tr>
            <tr>
              <td class="label">备注</td>
              <td colspan="5" class="multiline">{{ detail.Remarks || '-' }}</td>
            </tr>
          </tbody>
        </table>

        <div class="image-block" v-if="imageList.length">
          <div class="image-title">附件图片</div>
          <div class="image-grid">
            <img v-for="(img, index) in imageList" :key="index" :src="img" class="image-item" />
          </div>
        </div>

        <div class="signature-bar">
          <div class="signature-item">制表/日期：{{ detail.Reporter || '-' }}/{{ formatDateDash(detail.ReportDate) }}</div>
          <div class="signature-item">审核/日期：{{ auditSigner }}/{{ formatDateDash(auditDate) }}</div>
        </div>

      </div>

      <el-empty v-else-if="!loading" description="未找到数据" />
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import apiService from '@/services/apiService'

const route = useRoute()
const loading = ref(false)
const detail = ref(null)

const imageList = computed(() => {
  if (!detail.value || !detail.value.Images) return []
  try {
    const parsed = JSON.parse(detail.value.Images)
    if (Array.isArray(parsed)) return parsed.filter(Boolean)
    if (typeof parsed === 'string' && parsed) return [parsed]
    return []
  } catch (e) {
    if (typeof detail.value.Images === 'string' && detail.value.Images.trim()) {
      return detail.value.Images.split(',').map(item => item.trim()).filter(Boolean)
    }
    return []
  }
})

const auditSigner = computed(() => {
  if (!detail.value) return '-'
  return detail.value.Verifier || detail.value.ResponsiblePerson || '-'
})

const auditDate = computed(() => {
  if (!detail.value) return null
  return detail.value.CloseDate || detail.value.UpdatedAt || null
})

const handlingMethodOptions = [
  { value: 'Rework', label: '返工' },
  { value: 'Repair', label: '返修' },
  { value: 'Scrap', label: '报废' },
  { value: 'Concession', label: '特采' },
  { value: 'Selection', label: '挑选' },
  { value: 'Return', label: '退货' },
  { value: 'Downgrade', label: '降级' },
  { value: 'ReLayout', label: '重拼版' }
]

const isMethodSelected = (value) => detail.value && detail.value.HandlingMethod === value

const formatDate = (dateStr) => {
  if (!dateStr) return '-'
  const date = new Date(dateStr)
  if (Number.isNaN(date.getTime())) return '-'
  return date.toLocaleDateString('zh-CN')
}

const formatDateDash = (dateStr) => {
  if (!dateStr) return '-'
  const date = new Date(dateStr)
  if (Number.isNaN(date.getTime())) return '-'
  const year = date.getFullYear()
  const month = date.getMonth() + 1
  const day = date.getDate()
  return `${year}-${month}-${day}`
}

const formatNumber = (value) => {
  if (value === null || value === undefined || value === '') return '-'
  return Number(value)
}

const getDiscoveryStageLabel = (stage) => {
  const map = {
    Incoming: '来料',
    Process: '制程',
    Finished: '成品',
    Shipment: '出货',
    Client: '客户端'
  }
  return map[stage] || stage || '-'
}

const getHandlingMethodLabel = (method) => {
  const map = {
    Rework: '返工',
    Repair: '返修',
    Scrap: '报废',
    Concession: '特采',
    Selection: '挑选',
    Return: '退货',
    Downgrade: '降级',
    ReLayout: '重拼版',
    RePlate: '重制版',
    PlateRepair: '修版',
    UpdateFile: '更新文件',
    Other: '其他'
  }
  return map[method] || method || '-'
}

const getVerificationResultLabel = (result) => {
  const map = {
    Pass: '合格',
    Fail: '不合格'
  }
  return map[result] || result || '-'
}

const getStatusLabel = (status) => {
  const map = {
    Open: '进行中',
    Closed: '已关闭'
  }
  return map[status] || status || '-'
}

const loadDetail = async () => {
  const id = route.params.id
  if (!id) return
  loading.value = true
  try {
    const res = await apiService.get(`/quality-exceptions/${id}`)
    if (res.data && res.data.success) {
      detail.value = res.data.data
      document.title = `品质异常联络单-${detail.value.ExceptionNumber || id}`
    } else {
      detail.value = null
      ElMessage.error('加载异常联络单失败')
    }
  } catch (error) {
    detail.value = null
    ElMessage.error('加载异常联络单失败')
  } finally {
    loading.value = false
  }
}

const handlePrint = () => {
  window.print()
}

const handleClose = () => {
  window.close()
}

onMounted(() => {
  loadDetail()
})
</script>

<style scoped>
.preview-page {
  min-height: 100vh;
  background: #f5f7fa;
}

.toolbar {
  position: sticky;
  top: 0;
  z-index: 10;
  height: 56px;
  padding: 0 20px;
  background: #fff;
  border-bottom: 1px solid #e4e7ed;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.toolbar-title {
  font-size: 16px;
  font-weight: 600;
}

.toolbar-actions {
  display: flex;
  gap: 8px;
}

.sheet-wrap {
  padding: 16px;
  display: flex;
  justify-content: center;
}

.sheet {
  width: 210mm;
  min-height: 297mm;
  background: #fff;
  padding: 12mm;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
}

.doc-header {
  display: grid;
  grid-template-columns: 82px 1fr auto;
  align-items: end;
  gap: 10px;
  margin-bottom: 6px;
}

.logo-box {
  width: 78px;
  height: 78px;
  border: 1px solid #111;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  line-height: 1.4;
  font-size: 13px;
}

.doc-title-wrap {
  text-align: center;
}

.company-name {
  font-size: 27px;
  font-weight: 700;
  letter-spacing: 2px;
  margin-bottom: 4px;
}

.title {
  text-align: center;
  font-size: 44px;
  font-weight: 700;
  margin-bottom: 0;
  letter-spacing: 2px;
}

.doc-meta {
  font-size: 34px;
  font-weight: 700;
  padding-right: 8px;
  white-space: nowrap;
}

.table {
  width: 100%;
  border-collapse: collapse;
  table-layout: fixed;
  font-size: 32px;
  margin-top: 4px;
}

.w-label {
  width: 12%;
}

.w-value {
  width: 21.33%;
}

.section-row td {
  background: #eef3ff;
  font-weight: 700;
  text-align: left;
  color: #111;
  padding: 8px 12px;
}

.table td {
  border: 1px solid #111;
  padding: 7px 10px;
  font-size: 32px;
  vertical-align: top;
  word-break: break-word;
  line-height: 1.35;
}

.table .label {
  background: #fff;
  font-weight: 600;
  text-align: center;
  vertical-align: middle;
}

.sub-header-row td {
  text-align: center;
  font-weight: 700;
  background: #fff;
}

.multiline {
  white-space: pre-wrap;
  line-height: 1.5;
  min-height: 112px;
}

.method-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.method-options {
  display: flex;
  flex-wrap: wrap;
  gap: 14px;
}

.method-item {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.box {
  min-width: 26px;
  display: inline-flex;
  justify-content: center;
}

.image-block {
  margin-top: 14px;
  page-break-inside: avoid;
}

.image-title {
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 10px;
}

.image-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

.image-item {
  width: 100%;
  border: 1px solid #dcdfe6;
  max-height: 160px;
  object-fit: contain;
  background: #fff;
}

.signature-bar {
  margin-top: 18px;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 40px;
  page-break-inside: avoid;
}

.signature-item {
  font-size: 36px;
  text-align: center;
  font-weight: 600;
}

@media print {
  .no-print {
    display: none !important;
  }

  .preview-page {
    background: #fff;
  }

  .sheet-wrap {
    padding: 0;
  }

  .sheet {
    width: 100%;
    min-height: auto;
    box-shadow: none;
    padding: 0;
  }

  .doc-meta {
    color: #333;
  }

  .table tr,
  .table td {
    page-break-inside: avoid;
  }

  .image-item {
    max-height: 120px;
  }

  .signature-bar {
    margin-top: 14px;
  }

  @page {
    size: A4;
    margin: 8mm;
  }
}
</style>
