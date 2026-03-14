<template>
  <div class="expiry-container">
    <!-- 工具栏 -->
    <div class="toolbar">
      <div class="toolbar-left">
        <span class="toolbar-label">预警天数</span>
        <el-select v-model="warningDays" style="width: 120px" @change="handleWarningDaysChange">
          <el-option :value="7" label="7天" />
          <el-option :value="15" label="15天" />
          <el-option :value="30" label="30天" />
          <el-option :value="60" label="60天" />
        </el-select>
        <el-input
          v-model="searchKeyword"
          placeholder="搜索仪器名称/编号"
          :prefix-icon="Search"
          clearable
          style="width: 220px; margin-left: 12px"
        />
        <el-select v-model="filterLevel" placeholder="预警级别" clearable style="width: 130px; margin-left: 12px">
          <el-option value="expired" label="已过期" />
          <el-option value="critical" label="7天内到期" />
          <el-option value="warning" label="即将到期" />
        </el-select>
      </div>
      <div class="toolbar-right">
        <el-button type="primary" @click="handleExport(false)" :loading="exportLoading">
          <el-icon><Download /></el-icon>
          导出到期清单
        </el-button>
        <el-button type="warning" @click="handleExport(true)" :loading="exportExternalLoading">
          <el-icon><Download /></el-icon>
          导出第三方校准到期清单
        </el-button>
      </div>
    </div>

    <!-- 统计卡片区域 -->
    <div class="stats-grid">
      <div class="stat-card expired" :class="{ 'has-data': summary.expired > 0 }">
        <div class="stat-icon">
          <el-icon :size="26"><CircleCloseFilled /></el-icon>
        </div>
        <div class="stat-info">
          <span class="stat-value">{{ summary.expired }}</span>
          <span class="stat-label">已过期</span>
        </div>
      </div>
      <div class="stat-card critical" :class="{ 'has-data': summary.critical > 0 }">
        <div class="stat-icon">
          <el-icon :size="26"><WarningFilled /></el-icon>
        </div>
        <div class="stat-info">
          <span class="stat-value">{{ summary.critical }}</span>
          <span class="stat-label">7天内到期</span>
        </div>
      </div>
      <div class="stat-card warning" :class="{ 'has-data': summary.warning > 0 }">
        <div class="stat-icon">
          <el-icon :size="26"><Clock /></el-icon>
        </div>
        <div class="stat-info">
          <span class="stat-value">{{ summary.warning }}</span>
          <span class="stat-label">{{ warningDays }}天内到期</span>
        </div>
      </div>
      <div class="stat-card total">
        <div class="stat-icon">
          <el-icon :size="26"><DataAnalysis /></el-icon>
        </div>
        <div class="stat-info">
          <span class="stat-value">{{ summary.total }}</span>
          <span class="stat-label">预警总数</span>
        </div>
      </div>
    </div>

    <!-- 数据表格 -->
    <el-card class="table-card" shadow="never">
      <template #header>
        <div class="card-header">
          <div class="card-title">
            <el-icon><List /></el-icon>
            <span>到期预警明细</span>
            <el-tag v-if="filteredList.length !== warningList.length" size="small" type="info">
              已筛选 {{ filteredList.length }} / {{ warningList.length }}
            </el-tag>
          </div>
        </div>
      </template>

      <el-table 
        :data="pagedList" 
        v-loading="loading"
        stripe
        style="width: 100%"
        :header-cell-style="{ background: '#f5f7fa', color: '#606266', fontWeight: '600', textAlign: 'center' }"
        :row-class-name="getRowClassName"
      >
        <el-table-column type="index" label="序号" width="60" align="center"
          :index="(index) => (pagination.page - 1) * pagination.size + index + 1"
        />
        <el-table-column label="仪器名称" min-width="160" header-align="center">
          <template #default="{ row }">
            <span class="instrument-name">{{ row.InstrumentName || '-' }}</span>
          </template>
        </el-table-column>
        <el-table-column label="管理编号" width="110" align="center">
          <template #default="{ row }">
            <span class="code-text">{{ row.ManagementCode || row.InstrumentCode || '-' }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="Model" label="型号" width="100" align="center" show-overflow-tooltip>
          <template #default="{ row }">{{ row.Model || '-' }}</template>
        </el-table-column>
        <el-table-column label="部门" width="110" align="center" show-overflow-tooltip>
          <template #default="{ row }">{{ row.Department || '-' }}</template>
        </el-table-column>
        <el-table-column label="负责人" width="90" align="center">
          <template #default="{ row }">{{ row.ResponsiblePerson || '-' }}</template>
        </el-table-column>
        <el-table-column label="预警类型" width="95" align="center">
          <template #default="{ row }">
            <el-tag 
              :type="row.WarningSource === '计划校准' ? 'warning' : ''" 
              size="small"
              :effect="row.WarningSource === '计划校准' ? 'light' : 'plain'"
            >
              {{ row.WarningSource || '证书到期' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="上次校准" width="105" align="center">
          <template #default="{ row }">
            <span class="date-text">{{ formatDate(row.LastCalibrationDate) }}</span>
          </template>
        </el-table-column>
        <el-table-column label="预警日期" width="105" align="center">
          <template #default="{ row }">
            <span class="date-text">{{ formatDate(row.WarningDate || row.ExpiryDate) }}</span>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="100" align="center">
          <template #default="{ row }">
            <el-tag 
              :type="getWarningTagType(row.WarningLevel)" 
              size="small"
              effect="dark"
            >
              {{ getDaysRemainingText(row.DaysRemaining) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="校准机构" min-width="150" header-align="center" show-overflow-tooltip>
          <template #default="{ row }">
            <span>{{ row.CalibrationAgency || '-' }}</span>
          </template>
        </el-table-column>
        <el-table-column label="证书编号" width="130" align="center" show-overflow-tooltip>
          <template #default="{ row }">
            <span>{{ row.CertificateNumber || '-' }}</span>
          </template>
        </el-table-column>
      </el-table>

      <!-- 分页器 -->
      <div class="pagination-wrapper">
        <div class="pagination-left">
          <span class="pagination-info">
            <el-icon><InfoFilled /></el-icon>
            共 {{ filteredList.length }} 条预警记录，请及时处理
          </span>
        </div>
        <el-pagination
          v-model:current-page="pagination.page"
          v-model:page-size="pagination.size"
          :page-sizes="[10, 20, 50, 100]"
          :total="filteredList.length"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="handleSizeChange"
          @current-change="handleCurrentChange"
        />
      </div>
    </el-card>
  </div>
</template>

<script setup>
/**
 * 校准到期预警页面
 * 
 * 功能说明：
 * 1. 展示所有即将到期和已过期的仪器校准预警
 * 2. 支持按预警天数、关键字、预警级别筛选
 * 3. 前端分页（数据量不大，全量加载后前端分页），默认10条/页
 * 4. 导出到期清单（导出全部记录，不受当前分页限制）
 * 5. 导出第三方校准到期清单
 */

import { ref, computed, onMounted, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { 
  Search, Download, CircleCloseFilled, WarningFilled, 
  Clock, DataAnalysis, List, InfoFilled 
} from '@element-plus/icons-vue'
import { instrumentApi } from '@/api/instruments'

const loading = ref(false)
const exportLoading = ref(false)
const exportExternalLoading = ref(false)
const warningDays = ref(15)
const searchKeyword = ref('')
const filterLevel = ref('')
const warningList = ref([])
const summary = ref({ total: 0, expired: 0, critical: 0, warning: 0 })

// 分页
const pagination = ref({
  page: 1,
  size: 10
})

// 筛选后的列表（全量）
const filteredList = computed(() => {
  let list = warningList.value
  if (searchKeyword.value) {
    const kw = searchKeyword.value.toLowerCase()
    list = list.filter(item =>
      (item.InstrumentName && item.InstrumentName.toLowerCase().includes(kw)) ||
      (item.ManagementCode && item.ManagementCode.toLowerCase().includes(kw)) ||
      (item.InstrumentCode && item.InstrumentCode.toLowerCase().includes(kw))
    )
  }
  if (filterLevel.value) {
    list = list.filter(item => item.WarningLevel === filterLevel.value)
  }
  return list
})

// 当前页的数据
const pagedList = computed(() => {
  const start = (pagination.value.page - 1) * pagination.value.size
  return filteredList.value.slice(start, start + pagination.value.size)
})

// 筛选条件变化时重置到第一页
watch([searchKeyword, filterLevel], () => {
  pagination.value.page = 1
})

/**
 * 预警天数变化
 */
function handleWarningDaysChange() {
  pagination.value.page = 1
  fetchData()
}

/**
 * 获取预警数据
 */
async function fetchData() {
  try {
    loading.value = true
    const response = await instrumentApi.getCalibrationWarnings({ warningDays: warningDays.value })
    if (response.data && response.data.data) {
      warningList.value = response.data.data.list || []
      summary.value = response.data.data.summary || { total: 0, expired: 0, critical: 0, warning: 0 }
    }
  } catch (error) {
    console.error('获取校准预警失败:', error)
  } finally {
    loading.value = false
  }
}

/**
 * 导出到期清单（导出全部记录，由后端根据warningDays返回全量数据，不受前端分页限制）
 */
async function handleExport(externalOnly) {
  try {
    const label = externalOnly ? '第三方校准到期清单' : '到期清单'
    await ElMessageBox.confirm(
      `确定要导出${label}吗？将导出全部预警记录（预警天数：${warningDays.value}天）`,
      '导出确认',
      { confirmButtonText: '确定导出', cancelButtonText: '取消', type: 'info' }
    )

    if (externalOnly) {
      exportExternalLoading.value = true
    } else {
      exportLoading.value = true
    }

    const response = await instrumentApi.exportExpiryList({
      warningDays: warningDays.value,
      externalOnly
    })

    if (!response.ok) {
      throw new Error('导出失败')
    }

    const blob = await response.blob()
    const now = new Date()
    const ts = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`
    const filename = externalOnly
      ? `第三方校准到期清单_${ts}.xlsx`
      : `校准到期预警清单_${ts}.xlsx`
    
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)

    ElMessage.success('导出成功')
  } catch (error) {
    if (error === 'cancel' || error.toString().includes('cancel')) return
    ElMessage.error('导出失败：' + (error.message || '未知错误'))
  } finally {
    exportLoading.value = false
    exportExternalLoading.value = false
  }
}

function formatDate(date) {
  if (!date) return '-'
  const d = new Date(date)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function getDaysRemainingText(days) {
  if (days < 0) return `过期${Math.abs(days)}天`
  if (days === 0) return '今日到期'
  return `剩${days}天`
}

function getWarningTagType(level) {
  const types = { expired: 'danger', critical: 'warning', warning: 'info' }
  return types[level] || 'info'
}

function getRowClassName({ row }) {
  if (row.WarningLevel === 'expired') return 'row-expired'
  if (row.WarningLevel === 'critical') return 'row-critical'
  return ''
}

function handleSizeChange(size) {
  pagination.value.size = size
  pagination.value.page = 1
}

function handleCurrentChange(page) {
  pagination.value.page = page
}

/**
 * 刷新数据（供父组件调用）
 */
function refreshData() {
  fetchData()
}

defineExpose({ refreshData })

onMounted(() => {
  fetchData()
})
</script>

<style scoped>
.expiry-container {
  padding: 0;
  background: #f5f7fa;
  min-height: 100%;
}

/* 工具栏 */
.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  background: #fff;
  border-radius: 8px;
  margin-bottom: 16px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.05);
  flex-wrap: wrap;
  gap: 12px;
}

.toolbar-left {
  display: flex;
  align-items: center;
  gap: 0;
}

.toolbar-label {
  font-size: 14px;
  color: #606266;
  font-weight: 500;
  margin-right: 8px;
}

.toolbar-right {
  display: flex;
  gap: 10px;
}

/* 统计卡片 */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  margin-bottom: 16px;
}

.stat-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px;
  background: #fff;
  border-radius: 12px;
  border: 1px solid #e2e8f0;
  overflow: hidden;
  transition: all 0.3s ease;
}

.stat-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 20px -5px rgba(0, 0, 0, 0.1);
}

.stat-card.has-data { border-width: 2px; }

.stat-card.expired { border-color: #fecaca; background: linear-gradient(135deg, #fff 0%, #fef2f2 100%); }
.stat-card.expired.has-data { border-color: #f87171; }
.stat-card.expired .stat-icon { color: #ef4444; background: #fee2e2; }
.stat-card.expired .stat-value { color: #dc2626; }

.stat-card.critical { border-color: #fed7aa; background: linear-gradient(135deg, #fff 0%, #fffbeb 100%); }
.stat-card.critical.has-data { border-color: #fb923c; }
.stat-card.critical .stat-icon { color: #f97316; background: #ffedd5; }
.stat-card.critical .stat-value { color: #ea580c; }

.stat-card.warning { border-color: #bfdbfe; background: linear-gradient(135deg, #fff 0%, #eff6ff 100%); }
.stat-card.warning.has-data { border-color: #60a5fa; }
.stat-card.warning .stat-icon { color: #3b82f6; background: #dbeafe; }
.stat-card.warning .stat-value { color: #2563eb; }

.stat-card.total { border-color: #e2e8f0; background: linear-gradient(135deg, #fff 0%, #f8fafc 100%); }
.stat-card.total .stat-icon { color: #64748b; background: #f1f5f9; }
.stat-card.total .stat-value { color: #334155; }

.stat-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 50px;
  height: 50px;
  border-radius: 12px;
  flex-shrink: 0;
}

.stat-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.stat-value {
  font-size: 26px;
  font-weight: 700;
  line-height: 1;
}

.stat-label {
  font-size: 13px;
  color: #64748b;
  font-weight: 500;
}

/* 表格卡片 */
.table-card {
  border: none;
  border-radius: 8px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.05);
}

.table-card :deep(.el-card__header) {
  padding: 14px 20px;
  border-bottom: 1px solid #ebeef5;
}

.table-card :deep(.el-card__body) {
  padding: 16px 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.card-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 15px;
  font-weight: 600;
  color: #303133;
}

.card-title .el-icon {
  color: #409eff;
}

/* 表格内容样式 */
.instrument-name {
  font-weight: 600;
  color: #1e293b;
  line-height: 1.4;
}

.code-text {
  font-family: 'Monaco', 'Consolas', monospace;
  font-size: 12px;
  color: #64748b;
}

.date-text {
  font-size: 13px;
  color: #475569;
  font-variant-numeric: tabular-nums;
}

/* 行状态高亮 */
:deep(.row-expired) {
  background: linear-gradient(90deg, #fef2f2 0%, #fff 100%) !important;
}

:deep(.row-critical) {
  background: linear-gradient(90deg, #fffbeb 0%, #fff 100%) !important;
}

/* 分页器 - 左中右布局 */
.pagination-wrapper {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 20px;
  padding-top: 16px;
  border-top: 1px solid #ebeef5;
}

.pagination-left {
  flex-shrink: 0;
}

.pagination-info {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: #64748b;
}

.pagination-info .el-icon {
  color: #94a3b8;
}

@media (max-width: 1200px) {
  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>
