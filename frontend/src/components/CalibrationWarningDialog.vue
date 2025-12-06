<template>
  <el-dialog
    v-model="visible"
    :show-close="false"
    width="960px"
    :close-on-click-modal="false"
    class="warning-dialog"
    @close="handleClose"
  >
    <!-- 自定义头部 -->
    <template #header>
      <div class="dialog-header">
        <div class="header-left">
          <div class="header-icon-wrapper">
            <div class="icon-bg">
              <el-icon :size="32"><WarningFilled /></el-icon>
            </div>
            <div class="icon-pulse"></div>
          </div>
          <div class="header-text">
            <h3 class="title">
              <span>校准到期预警</span>
              <el-tag v-if="summary.total > 0" type="danger" size="small" effect="dark" round>
                {{ summary.total }}项待处理
              </el-tag>
            </h3>
            <p class="subtitle">以下仪器校准计划即将到期或证书即将失效，请及时安排送检</p>
          </div>
        </div>
        <el-button class="close-btn" :icon="Close" circle @click="handleClose" />
      </div>
    </template>

    <!-- 统计卡片区域 -->
    <div class="stats-section">
      <div class="stats-grid">
        <div class="stat-card expired" :class="{ 'has-data': summary.expired > 0 }">
          <div class="stat-icon">
            <el-icon :size="28"><CircleCloseFilled /></el-icon>
          </div>
          <div class="stat-info">
            <span class="stat-value">{{ summary.expired }}</span>
            <span class="stat-label">已过期</span>
          </div>
          <div class="stat-decoration"></div>
        </div>
        
        <div class="stat-card critical" :class="{ 'has-data': summary.critical > 0 }">
          <div class="stat-icon">
            <el-icon :size="28"><WarningFilled /></el-icon>
          </div>
          <div class="stat-info">
            <span class="stat-value">{{ summary.critical }}</span>
            <span class="stat-label">7天内到期</span>
          </div>
          <div class="stat-decoration"></div>
        </div>
        
        <div class="stat-card warning" :class="{ 'has-data': summary.warning > 0 }">
          <div class="stat-icon">
            <el-icon :size="28"><Clock /></el-icon>
          </div>
          <div class="stat-info">
            <span class="stat-value">{{ summary.warning }}</span>
            <span class="stat-label">30天内到期</span>
          </div>
          <div class="stat-decoration"></div>
        </div>
        
        <div class="stat-card total">
          <div class="stat-icon">
            <el-icon :size="28"><DataAnalysis /></el-icon>
          </div>
          <div class="stat-info">
            <span class="stat-value">{{ summary.total }}</span>
            <span class="stat-label">预警总数</span>
          </div>
          <div class="stat-decoration"></div>
        </div>
      </div>
    </div>

    <!-- 预警列表区域 -->
    <div class="list-section">
      <div class="list-header">
        <div class="list-title">
          <el-icon><List /></el-icon>
          <span>预警明细</span>
        </div>
        <div class="list-actions">
          <el-input
            v-model="searchKeyword"
            placeholder="搜索仪器名称/编号"
            :prefix-icon="Search"
            clearable
            size="small"
            style="width: 200px"
          />
        </div>
      </div>
      
      <div class="table-wrapper">
        <el-table 
          :data="filteredWarningList" 
          v-loading="loading"
          :max-height="320"
          :row-class-name="getRowClassName"
          :header-cell-style="{ background: '#f8fafc', color: '#475569', fontWeight: '600' }"
          empty-text="暂无预警数据"
        >
          <el-table-column label="仪器信息" min-width="200">
            <template #default="{ row }">
              <div class="instrument-info">
                <div class="instrument-name">{{ row.InstrumentName || '-' }}</div>
                <div class="instrument-code">
                  <el-icon :size="12"><Ticket /></el-icon>
                  {{ row.ManagementCode || row.InstrumentCode || '-' }}
                </div>
              </div>
            </template>
          </el-table-column>
          
          <el-table-column label="部门/负责人" width="140">
            <template #default="{ row }">
              <div class="dept-info">
                <div class="dept-name">{{ row.Department || '-' }}</div>
                <div class="person-name">
                  <el-icon :size="12"><User /></el-icon>
                  {{ row.ResponsiblePerson || '-' }}
                </div>
              </div>
            </template>
          </el-table-column>
          
          <el-table-column label="预警类型" width="100" align="center">
            <template #default="{ row }">
              <el-tag 
                :type="row.WarningSource === '计划校准' ? 'warning' : ''" 
                size="small"
                :effect="row.WarningSource === '计划校准' ? 'light' : 'plain'"
                class="source-tag"
              >
                <el-icon :size="12" style="margin-right: 2px">
                  <component :is="row.WarningSource === '计划校准' ? Calendar : Document" />
                </el-icon>
                {{ row.WarningSource || '证书到期' }}
              </el-tag>
            </template>
          </el-table-column>
          
          <el-table-column label="预警日期" width="110" align="center">
            <template #default="{ row }">
              <span class="date-text">{{ formatDate(row.WarningDate || row.ExpiryDate) }}</span>
            </template>
          </el-table-column>
          
          <el-table-column label="状态" width="110" align="center">
            <template #default="{ row }">
              <div class="status-wrapper">
                <el-tag 
                  :type="getWarningTagType(row.WarningLevel)" 
                  size="small"
                  effect="dark"
                  class="status-tag"
                >
                  <span class="status-dot"></span>
                  {{ getDaysRemainingText(row.DaysRemaining) }}
                </el-tag>
              </div>
            </template>
          </el-table-column>
          
          <el-table-column prop="CalibrationAgency" label="校准机构" min-width="140" show-overflow-tooltip>
            <template #default="{ row }">
              <span class="agency-text">{{ row.CalibrationAgency || '-' }}</span>
            </template>
          </el-table-column>
        </el-table>
      </div>
      
      <!-- 列表底部信息 -->
      <div class="list-footer" v-if="warningList.length > 0">
        <span class="footer-info">
          <el-icon><InfoFilled /></el-icon>
          共 {{ warningList.length }} 条预警记录，请及时处理以确保仪器在有效期内使用
        </span>
      </div>
    </div>

    <!-- 底部操作栏 -->
    <template #footer>
      <div class="dialog-footer">
        <div class="footer-left">
          <el-checkbox v-model="dontShowToday">
            <span class="checkbox-text">今日不再提醒</span>
          </el-checkbox>
        </div>
        <div class="footer-right">
          <el-button @click="handleClose" class="btn-close">
            关闭
          </el-button>
          <el-button 
            type="warning" 
            @click="handleGenerateNotice" 
            :loading="generateLoading"
            class="btn-generate"
          >
            <el-icon><Bell /></el-icon>
            生成预警通知
          </el-button>
          <el-button type="primary" @click="handleGoToCalibration" class="btn-primary">
            <el-icon><Operation /></el-icon>
            前往校准管理
          </el-button>
        </div>
      </div>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { useRouter } from 'vue-router'
import { 
  WarningFilled, 
  CircleCloseFilled, 
  InfoFilled, 
  DataAnalysis,
  Bell,
  Operation,
  Close,
  Clock,
  List,
  Search,
  Ticket,
  User,
  Calendar,
  Document
} from '@element-plus/icons-vue'
import { instrumentApi } from '@/api/instruments'
import { useUserStore } from '@/store/user'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['update:modelValue', 'close'])

const router = useRouter()
const userStore = useUserStore()
const visible = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
})

const loading = ref(false)
const generateLoading = ref(false)
const warningList = ref([])
const searchKeyword = ref('')
const summary = ref({
  total: 0,
  expired: 0,
  critical: 0,
  warning: 0
})
const dontShowToday = ref(false)

// 过滤后的预警列表
const filteredWarningList = computed(() => {
  if (!searchKeyword.value) return warningList.value
  const keyword = searchKeyword.value.toLowerCase()
  return warningList.value.filter(item => 
    (item.InstrumentName && item.InstrumentName.toLowerCase().includes(keyword)) ||
    (item.ManagementCode && item.ManagementCode.toLowerCase().includes(keyword)) ||
    (item.InstrumentCode && item.InstrumentCode.toLowerCase().includes(keyword))
  )
})

/**
 * 获取预警数据
 */
async function fetchWarnings() {
  try {
    loading.value = true
    const response = await instrumentApi.getCalibrationWarnings({ warningDays: 30 })
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
 * 格式化日期
 */
function formatDate(date) {
  if (!date) return '-'
  const d = new Date(date)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/**
 * 获取剩余天数文本
 */
function getDaysRemainingText(days) {
  if (days < 0) return `过期${Math.abs(days)}天`
  if (days === 0) return '今日到期'
  return `剩${days}天`
}

/**
 * 获取预警标签类型
 */
function getWarningTagType(level) {
  const types = {
    expired: 'danger',
    critical: 'warning',
    warning: 'info'
  }
  return types[level] || 'info'
}

/**
 * 获取行样式
 */
function getRowClassName({ row }) {
  if (row.WarningLevel === 'expired') return 'row-expired'
  if (row.WarningLevel === 'critical') return 'row-critical'
  return ''
}

/**
 * 生成预警通知
 */
async function handleGenerateNotice() {
  try {
    generateLoading.value = true
    const response = await instrumentApi.generateWarningNotices({ warningDays: 7 })
    if (response.data && response.data.code === 200) {
      if (response.data.data.existing) {
        ElMessage.info('今日已生成过校准预警通知')
      } else if (response.data.data.created > 0) {
        ElMessage.success(`成功生成预警通知，包含${response.data.data.instrumentCount}项预警`)
        await userStore.fetchUnreadNoticeCount()
      } else {
        ElMessage.info('当前没有需要预警的仪器')
      }
    }
  } catch (error) {
    console.error('生成预警通知失败:', error)
    ElMessage.error('生成预警通知失败')
  } finally {
    generateLoading.value = false
  }
}

/**
 * 前往校准管理
 */
function handleGoToCalibration() {
  router.push('/admin/instruments')
  handleClose()
}

/**
 * 关闭弹窗
 */
function handleClose() {
  if (dontShowToday.value) {
    const today = new Date().toDateString()
    localStorage.setItem('calibrationWarningDismissed', today)
  }
  visible.value = false
  emit('close')
}

// 监听弹窗打开
watch(() => props.modelValue, (val) => {
  if (val) {
    searchKeyword.value = ''
    fetchWarnings()
  }
})

// 检查是否需要显示预警
onMounted(() => {
  if (props.modelValue) {
    fetchWarnings()
  }
})

// 暴露方法供外部调用
defineExpose({
  fetchWarnings,
  checkAndShow: async () => {
    const dismissed = localStorage.getItem('calibrationWarningDismissed')
    const today = new Date().toDateString()
    if (dismissed === today) {
      return false
    }
    await fetchWarnings()
    if (summary.value.total > 0) {
      visible.value = true
      return true
    }
    return false
  }
})
</script>

<style scoped>
/* 对话框整体样式 */
.warning-dialog :deep(.el-dialog) {
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
}

.warning-dialog :deep(.el-dialog__header) {
  padding: 0;
  margin: 0;
}

.warning-dialog :deep(.el-dialog__body) {
  padding: 0;
}

.warning-dialog :deep(.el-dialog__footer) {
  padding: 0;
}

/* 头部样式 */
.dialog-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24px 28px;
  background: linear-gradient(135deg, #FEF3E2 0%, #FDE8C8 50%, #FCE0B0 100%);
  border-bottom: 1px solid rgba(230, 162, 60, 0.2);
}

.header-left {
  display: flex;
  align-items: center;
  gap: 20px;
}

.header-icon-wrapper {
  position: relative;
}

.icon-bg {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 60px;
  height: 60px;
  background: linear-gradient(135deg, #E6A23C 0%, #F5BA4D 100%);
  border-radius: 16px;
  color: white;
  box-shadow: 0 8px 16px rgba(230, 162, 60, 0.3);
}

.icon-pulse {
  position: absolute;
  top: -4px;
  right: -4px;
  width: 16px;
  height: 16px;
  background: #F56C6C;
  border-radius: 50%;
  border: 3px solid #FEF3E2;
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%, 100% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.2); opacity: 0.8; }
}

.header-text {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.header-text .title {
  display: flex;
  align-items: center;
  gap: 12px;
  margin: 0;
  font-size: 22px;
  font-weight: 700;
  color: #1e293b;
}

.header-text .subtitle {
  margin: 0;
  font-size: 14px;
  color: #64748b;
}

.close-btn {
  border: none;
  background: rgba(255, 255, 255, 0.6);
  color: #64748b;
  transition: all 0.2s;
}

.close-btn:hover {
  background: rgba(255, 255, 255, 0.9);
  color: #1e293b;
}

/* 统计卡片区域 */
.stats-section {
  padding: 24px 28px;
  background: #f8fafc;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
}

.stat-card {
  position: relative;
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px;
  background: white;
  border-radius: 14px;
  border: 1px solid #e2e8f0;
  overflow: hidden;
  transition: all 0.3s ease;
}

.stat-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1);
}

.stat-card.has-data {
  border-width: 2px;
}

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
  width: 52px;
  height: 52px;
  border-radius: 12px;
  flex-shrink: 0;
}

.stat-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.stat-value {
  font-size: 28px;
  font-weight: 700;
  line-height: 1;
}

.stat-label {
  font-size: 13px;
  color: #64748b;
  font-weight: 500;
}

.stat-decoration {
  position: absolute;
  top: -20px;
  right: -20px;
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background: currentColor;
  opacity: 0.03;
}

/* 列表区域 */
.list-section {
  padding: 0 28px 24px;
}

.list-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.list-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 16px;
  font-weight: 600;
  color: #1e293b;
}

.list-title .el-icon {
  color: #64748b;
}

.table-wrapper {
  border-radius: 12px;
  border: 1px solid #e2e8f0;
  overflow: hidden;
}

.table-wrapper :deep(.el-table) {
  font-size: 13px;
}

.table-wrapper :deep(.el-table__header-wrapper) {
  border-radius: 12px 12px 0 0;
}

.table-wrapper :deep(.row-expired) {
  background: linear-gradient(90deg, #fef2f2 0%, #fff 100%) !important;
}

.table-wrapper :deep(.row-critical) {
  background: linear-gradient(90deg, #fffbeb 0%, #fff 100%) !important;
}

.table-wrapper :deep(.el-table__empty-block) {
  min-height: 200px;
}

/* 表格单元格内容样式 */
.instrument-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.instrument-name {
  font-weight: 600;
  color: #1e293b;
  line-height: 1.4;
}

.instrument-code {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: #64748b;
}

.dept-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.dept-name {
  font-weight: 500;
  color: #334155;
}

.person-name {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: #64748b;
}

.source-tag {
  font-size: 12px;
}

.date-text {
  font-size: 13px;
  color: #475569;
  font-variant-numeric: tabular-nums;
}

.status-wrapper {
  display: flex;
  justify-content: center;
}

.status-tag {
  display: flex;
  align-items: center;
  gap: 6px;
  font-weight: 600;
}

.status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: currentColor;
  animation: blink 1.5s infinite;
}

@keyframes blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}

.agency-text {
  color: #64748b;
  font-size: 13px;
}

/* 列表底部 */
.list-footer {
  margin-top: 16px;
  padding: 12px 16px;
  background: #f8fafc;
  border-radius: 8px;
  border: 1px dashed #e2e8f0;
}

.footer-info {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: #64748b;
}

.footer-info .el-icon {
  color: #94a3b8;
}

/* 底部操作栏 */
.dialog-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 28px;
  background: #f8fafc;
  border-top: 1px solid #e2e8f0;
}

.footer-left {
  display: flex;
  align-items: center;
}

.checkbox-text {
  font-size: 13px;
  color: #64748b;
}

.footer-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.btn-close {
  padding: 10px 20px;
  border-radius: 8px;
}

.btn-generate {
  padding: 10px 20px;
  border-radius: 8px;
  font-weight: 500;
}

.btn-primary {
  padding: 10px 20px;
  border-radius: 8px;
  font-weight: 500;
  background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
  border: none;
}

.btn-primary:hover {
  background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
}
</style>
