<template>
  <div class="todo-center">
    <!-- 顶部统计卡片 -->
    <el-row :gutter="16" class="stats-row">
      <el-col :xs="12" :sm="6">
        <div class="stat-card-wrapper stat-pending" :class="{ active: filterStatus === 'pending' && filterIsRead === '' }">
          <div class="rotating-border"></div>
          <el-card class="stat-card" shadow="hover" @click="filterByStatus('pending')">
            <div class="stat-content">
              <div class="stat-icon icon-pending">
                <el-icon><Clock /></el-icon>
              </div>
              <div class="stat-info">
                <div class="stat-value">{{ stats.pending || 0 }}</div>
                <div class="stat-label">待处理</div>
              </div>
            </div>
          </el-card>
        </div>
      </el-col>
      <el-col :xs="12" :sm="6">
        <div class="stat-card-wrapper stat-unread" :class="{ active: filterIsRead === 'false' }">
          <div class="rotating-border"></div>
          <el-card class="stat-card" shadow="hover" @click="filterByUnread">
            <div class="stat-content">
              <div class="stat-icon icon-unread">
                <el-icon><Bell /></el-icon>
              </div>
              <div class="stat-info">
                <div class="stat-value">{{ stats.unread || 0 }}</div>
                <div class="stat-label">未读</div>
              </div>
            </div>
          </el-card>
        </div>
      </el-col>
      <el-col :xs="12" :sm="6">
        <div class="stat-card-wrapper stat-completed" :class="{ active: filterStatus === 'completed' && filterIsRead === '' }">
          <div class="rotating-border"></div>
          <el-card class="stat-card" shadow="hover" @click="filterByStatus('completed')">
            <div class="stat-content">
              <div class="stat-icon icon-completed">
                <el-icon><CircleCheck /></el-icon>
              </div>
              <div class="stat-info">
                <div class="stat-value">{{ stats.completed || 0 }}</div>
                <div class="stat-label">已完成</div>
              </div>
            </div>
          </el-card>
        </div>
      </el-col>
      <el-col :xs="12" :sm="6">
        <div class="stat-card-wrapper stat-total" :class="{ active: filterStatus === '' && filterIsRead === '' }">
          <div class="rotating-border"></div>
          <el-card class="stat-card" shadow="hover" @click="filterByStatus('')">
            <div class="stat-content">
              <div class="stat-icon icon-total">
                <el-icon><Document /></el-icon>
              </div>
              <div class="stat-info">
                <div class="stat-value">{{ stats.total || 0 }}</div>
                <div class="stat-label">全部</div>
              </div>
            </div>
          </el-card>
        </div>
      </el-col>
    </el-row>

    <!-- 主内容区 -->
    <el-card class="main-card" shadow="never">
      <!-- 工具栏 -->
      <div class="toolbar">
        <div class="toolbar-left">
          <el-radio-group v-model="currentTab" size="default" @change="handleTabChange">
            <el-radio-button label="all">
              <el-icon><List /></el-icon> 全部待办
            </el-radio-button>
            <el-radio-button label="supplier_complaint_audit">
              <el-icon><Warning /></el-icon> 供应商投诉
            </el-radio-button>
            <el-radio-button label="incoming_inspection_audit">
              <el-icon><Box /></el-icon> 来料检验
            </el-radio-button>
            <el-radio-button label="performance_audit">
              <el-icon><DataAnalysis /></el-icon> 性能实验
            </el-radio-button>
            <el-radio-button label="shipment_audit">
              <el-icon><Van /></el-icon> 出货检验
            </el-radio-button>
          </el-radio-group>
        </div>
        <div class="toolbar-right">
          <el-select v-model="filterStatus" placeholder="状态筛选" clearable style="width: 120px; margin-right: 10px;" @change="handleStatusFilterChange">
            <el-option label="待处理" value="pending" />
            <el-option label="已完成" value="completed" />
            <el-option label="已取消" value="cancelled" />
          </el-select>
          <el-button type="primary" :icon="Refresh" @click="loadData">刷新</el-button>
          <el-button :icon="Check" @click="handleBatchRead" :disabled="!selectedItems.length">
            批量已读 ({{ selectedItems.length }})
          </el-button>
        </div>
      </div>

      <!-- 待办列表 -->
      <el-table
        ref="tableRef"
        v-loading="loading"
        :data="todoList"
        @selection-change="handleSelectionChange"
        row-key="ID"
        style="width: 100%"
        border
        resizable
        :header-cell-style="{ background: '#f5f7fa', color: '#606266', fontWeight: 'bold' }"
        :row-class-name="getRowClassName"
      >
        <el-table-column type="selection" width="50" align="center" />
        <el-table-column label="状态" width="90" align="center" resizable>
          <template #default="{ row }">
            <el-tag :type="getStatusType(row.Status)" size="small" effect="dark">
              {{ getStatusLabel(row.Status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="优先级" width="80" align="center" resizable>
          <template #default="{ row }">
            <el-tag :type="getPriorityType(row.Priority)" size="small">
              {{ getPriorityLabel(row.Priority) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="待办类型" width="120" align="center" resizable>
          <template #default="{ row }">
            <span class="todo-type">
              <el-icon :class="getTodoTypeIcon(row.TodoType).class">
                <component :is="getTodoTypeIcon(row.TodoType).icon" />
              </el-icon>
              {{ getTodoTypeLabel(row.TodoType) }}
            </span>
          </template>
        </el-table-column>
        <el-table-column prop="Title" label="待办标题" min-width="200" show-overflow-tooltip resizable>
          <template #default="{ row }">
            <div class="title-cell" :class="{ unread: !row.IsRead }">
              <el-badge v-if="!row.IsRead" is-dot class="unread-dot" />
              <span class="title-text" @click="handleViewDetail(row)">{{ row.Title }}</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="BusinessNo" label="业务编号" width="160" align="center" resizable>
          <template #default="{ row }">
            <el-link type="primary" @click="handleViewBusiness(row)">{{ row.BusinessNo }}</el-link>
          </template>
        </el-table-column>
        <el-table-column prop="CreatedByName" label="发起人" width="100" align="center" resizable />
        <el-table-column prop="CreatedAt" label="发起时间" width="160" align="center" resizable>
          <template #default="{ row }">
            {{ formatDateTime(row.CreatedAt) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="180" fixed="right" align="center">
          <template #default="{ row }">
            <el-button 
              v-if="row.Status === 'pending'"
              type="primary" 
              link 
              size="small" 
              @click="handleProcess(row)"
            >处理</el-button>
            <el-button 
              type="primary" 
              link 
              size="small" 
              @click="handleViewBusiness(row)"
            >查看</el-button>
            <el-button 
              v-if="!row.IsRead"
              type="success" 
              link 
              size="small" 
              @click="handleMarkRead(row)"
            >已读</el-button>
            <el-tag v-else size="small" type="info" effect="plain">已读</el-tag>
          </template>
        </el-table-column>
      </el-table>

      <!-- 分页 -->
      <div class="pagination-container">
        <el-pagination
          v-model:current-page="pagination.page"
          v-model:page-size="pagination.pageSize"
          :page-sizes="[10, 20, 50, 100]"
          :total="pagination.total"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="loadData"
          @current-change="loadData"
        />
      </div>
    </el-card>

    <!-- 审核日志抽屉 -->
    <el-drawer
      v-model="logDrawerVisible"
      title="审核日志"
      size="500px"
    >
      <el-timeline>
        <el-timeline-item
          v-for="log in auditLogs"
          :key="log.ID"
          :timestamp="formatDateTime(log.CreatedAt)"
          :type="getLogType(log.Action)"
          placement="top"
        >
          <el-card shadow="never" class="log-card">
            <div class="log-header">
              <span class="log-action">{{ getLogActionText(log.Action) }}</span>
              <el-tag :type="getLogType(log.Action)" size="small">
                {{ log.FromStatus ? `${getAuditStatusText(log.FromStatus)} → ` : '' }}{{ getAuditStatusText(log.ToStatus) }}
              </el-tag>
            </div>
            <div class="log-operator">
              <el-icon><User /></el-icon>
              {{ log.OperatorName }}
            </div>
            <div v-if="log.Remark" class="log-remark">
              <el-icon><ChatDotRound /></el-icon>
              {{ log.Remark }}
            </div>
          </el-card>
        </el-timeline-item>
      </el-timeline>
      <el-empty v-if="!auditLogs.length" description="暂无审核日志" />
    </el-drawer>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  Clock, Bell, CircleCheck, Document, List, Warning, Box,
  DataAnalysis, Van, Refresh, Check, Edit, View, User, ChatDotRound
} from '@element-plus/icons-vue'
import api from '@/services/api'

const router = useRouter()

// 状态
const loading = ref(false)
const todoList = ref([])
const selectedItems = ref([])
const currentTab = ref('all')
const filterStatus = ref('pending')
const logDrawerVisible = ref(false)
const auditLogs = ref([])

// 统计数据
const stats = reactive({
  total: 0,
  pending: 0,
  completed: 0,
  unread: 0
})

// 筛选条件
const filterIsRead = ref('')  // '' | 'true' | 'false'

// 分页
const pagination = reactive({
  page: 1,
  pageSize: 20,
  total: 0
})

// 待办类型配置
const todoTypeConfig = {
  supplier_complaint_audit: { label: '供应商投诉', icon: Warning, class: 'type-warning' },
  incoming_inspection_audit: { label: '来料检验', icon: Box, class: 'type-primary' },
  performance_audit: { label: '性能实验', icon: DataAnalysis, class: 'type-success' },
  shipment_audit: { label: '出货检验', icon: Van, class: 'type-info' }
}

// 加载数据
const loadData = async () => {
  loading.value = true
  try {
    const params = {
      page: pagination.page,
      pageSize: pagination.pageSize
    }
    if (filterStatus.value) {
      params.status = filterStatus.value
    }
    if (currentTab.value !== 'all') {
      params.todoType = currentTab.value
    }
    if (filterIsRead.value !== '') {
      params.isRead = filterIsRead.value
    }
    
    const res = await api.get('/todo-items', { params })
    console.log('待办列表响应:', res)
    // 处理不同的响应格式
    const data = res.data || res
    if (data.success !== false) {
      todoList.value = data.data || []
      pagination.total = data.total || 0
    }
    
    // 加载统计
    await loadStats()
  } catch (error) {
    console.error('加载待办列表失败:', error)
    ElMessage.error('加载待办列表失败')
  } finally {
    loading.value = false
  }
}

// 加载统计数据
const loadStats = async () => {
  try {
    const res = await api.get('/todo-items/count')
    console.log('统计数据响应:', res)
    // 处理不同的响应格式
    const data = res.data || res
    if (data.success !== false) {
      const statsData = data.data || data
      stats.total = statsData.total || 0
      stats.pending = statsData.pending || 0
      stats.unread = statsData.unread || 0
      // 直接使用后端返回的completed值，不要用 total - pending 计算
      stats.completed = statsData.completed || 0
    }
  } catch (error) {
    console.error('加载统计失败:', error)
  }
}

// 处理待办
const handleProcess = (row) => {
  // 根据待办类型跳转到对应页面
  const routes = {
    supplier_complaint_audit: `/admin/supplier/complaints?id=${row.BusinessID}`,
    incoming_inspection_audit: `/admin/inspection/incoming?id=${row.BusinessID}`,
    performance_audit: `/admin/inspection/performance?id=${row.BusinessID}`,
    shipment_audit: `/admin/inspection/shipment?id=${row.BusinessID}`
  }
  const targetRoute = routes[row.TodoType]
  if (targetRoute) {
    // 先标记为已读
    handleMarkRead(row, false)
    router.push(targetRoute)
  } else {
    ElMessage.warning('未知的待办类型')
  }
}

// 查看业务详情
const handleViewBusiness = (row) => {
  handleProcess(row)
}

// 查看详情
const handleViewDetail = async (row) => {
  if (!row.IsRead) {
    await handleMarkRead(row, false)
  }
  // 显示审核日志
  await loadAuditLogs(row)
  logDrawerVisible.value = true
}

// 加载审核日志
const loadAuditLogs = async (row) => {
  try {
    const apiMap = {
      supplier_complaint_audit: `/supplier-complaints/${row.BusinessID}/audit-logs`
    }
    const apiUrl = apiMap[row.TodoType]
    if (apiUrl) {
      const res = await api.get(apiUrl)
      if (res.success) {
        auditLogs.value = res.data
      }
    }
  } catch (error) {
    console.error('加载审核日志失败:', error)
  }
}

// 标记已读
const handleMarkRead = async (row, showMessage = true) => {
  try {
    await api.put(`/todo-items/${row.ID}/read`)
    row.IsRead = true
    stats.unread = Math.max(0, stats.unread - 1)
    if (showMessage) {
      ElMessage.success('已标记为已读')
    }
  } catch (error) {
    console.error('标记已读失败:', error)
  }
}

// 批量已读
const handleBatchRead = async () => {
  if (!selectedItems.value.length) return
  
  try {
    const ids = selectedItems.value.map(item => item.ID)
    await api.put('/todo-items/batch-read', { ids })
    ElMessage.success('批量标记成功')
    loadData()
  } catch (error) {
    console.error('批量标记失败:', error)
    ElMessage.error('批量标记失败')
  }
}

// 选择变化
const handleSelectionChange = (selection) => {
  selectedItems.value = selection
}

// Tab切换
const handleTabChange = () => {
  pagination.page = 1
  loadData()
}

// 状态下拉框变化
const handleStatusFilterChange = () => {
  filterIsRead.value = ''  // 清除已读筛选
  pagination.page = 1
  loadData()
}

// 按状态筛选（点击统计卡片）
const filterByStatus = (status) => {
  filterStatus.value = status
  filterIsRead.value = ''  // 清除已读筛选
  pagination.page = 1
  loadData()
}

// 按未读筛选（点击未读卡片）
const filterByUnread = () => {
  filterStatus.value = ''  // 清除状态筛选
  filterIsRead.value = 'false'  // 只显示未读
  pagination.page = 1
  loadData()
}

// 获取状态类型
const getStatusType = (status) => {
  if (!status) return 'info'
  const s = status.toLowerCase()
  if (s === 'pending') return 'warning'
  if (['completed', 'approved', 'passed', '已审核', '已通过', '已完成'].includes(status)) return 'success'
  if (s === 'cancelled') return 'info'
  return 'info'
}

// 获取状态标签
const getStatusLabel = (status) => {
  if (!status) return '未知'
  const s = status.toLowerCase()
  if (s === 'pending') return '待处理'
  if (['completed', 'approved', 'passed'].includes(s) || ['已审核', '已通过', '已完成'].includes(status)) return '已完成'
  if (s === 'cancelled') return '已取消'
  return status // 返回原始值
}

// 获取优先级类型
const getPriorityType = (priority) => {
  const map = { high: 'danger', medium: 'warning', low: 'info' }
  return map[priority] || 'info'
}

// 获取优先级标签
const getPriorityLabel = (priority) => {
  const map = { high: '高', medium: '中', low: '低' }
  return map[priority] || '普通'
}

// 获取待办类型图标
const getTodoTypeIcon = (type) => {
  return todoTypeConfig[type] || { icon: Document, class: 'type-default' }
}

// 获取待办类型标签
const getTodoTypeLabel = (type) => {
  return todoTypeConfig[type]?.label || '其他'
}

// 获取行样式
const getRowClassName = ({ row }) => {
  if (!row.IsRead) return 'unread-row'
  if (row.Status === 'completed') return 'completed-row'
  return ''
}

// 格式化日期时间
const formatDateTime = (dateStr) => {
  if (!dateStr) return '-'
  const date = new Date(dateStr)
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

// 审核日志相关
const getLogType = (action) => {
  const map = { submit: 'primary', approve: 'success', reject: 'danger', revoke: 'warning' }
  return map[action] || 'info'
}

const getLogActionText = (action) => {
  const map = { submit: '提交审核', approve: '审核通过', reject: '审核驳回', revoke: '撤回审核' }
  return map[action] || action
}

const getAuditStatusText = (status) => {
  const map = { draft: '草稿', pending: '待审核', approved: '已通过', rejected: '已驳回' }
  return map[status] || status
}

// 初始化
onMounted(() => {
  loadData()
})
</script>

<style scoped>
.todo-center {
  padding: 20px;
  background: #f5f7fa;
  min-height: calc(100vh - 84px);
}

.stats-row {
  margin-bottom: 20px;
}

/* 卡片容器 */
.stat-card-wrapper {
  position: relative;
  border-radius: 16px;
  overflow: hidden;
  transition: transform 0.3s;
}

.stat-card-wrapper:hover {
  transform: translateY(-4px);
}

.stat-card-wrapper:hover .stat-card {
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
}

/* 旋转边框层 - 默认隐藏 */
.rotating-border {
  display: none;
  position: absolute;
  top: 50%;
  left: 50%;
  width: 150%; 
  height: 150%; 
  background: conic-gradient(
    transparent 0deg,
    transparent 270deg,
    var(--glow-color) 360deg
  );
  animation: rotate-border 4s linear infinite;
  z-index: 0;
  will-change: transform;
  pointer-events: none;
  filter: blur(6px);
}

/* 激活时显示旋转边框 */
.stat-card-wrapper.active .rotating-border {
  display: block;
}

.stat-card-wrapper.active {
  transform: translateY(-4px);
}

@keyframes rotate-border {
  0% {
    transform: translate(-50%, -50%) rotate(0deg);
  }
  100% {
    transform: translate(-50%, -50%) rotate(360deg);
  }
}

/* 卡片本身 */
.stat-card {
  cursor: pointer;
  transition: all 0.3s;
  border-radius: 10px;
  position: relative;
  background: white;
  z-index: 1;
  margin: 6px;
}

/* 不同卡片的颜色变量 */
.stat-card-wrapper.stat-pending {
  --glow-color: #faad14;
  --glow-color-light: #ffd666;
}

.stat-card-wrapper.stat-unread {
  --glow-color: #ff4d4f;
  --glow-color-light: #ff7875;
}

.stat-card-wrapper.stat-completed {
  --glow-color: #52c41a;
  --glow-color-light: #95de64;
}

.stat-card-wrapper.stat-total {
  --glow-color: #1890ff;
  --glow-color-light: #69c0ff;
}

.stat-content {
  display: flex;
  align-items: center;
  padding: 10px 0;
}

.stat-icon {
  width: 60px;
  height: 60px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 16px;
}

.stat-icon .el-icon {
  font-size: 28px;
  color: white;
}

.icon-pending {
  background: linear-gradient(135deg, #faad14 0%, #fa8c16 100%);
}

.icon-unread {
  background: linear-gradient(135deg, #ff4d4f 0%, #f5222d 100%);
}

.icon-completed {
  background: linear-gradient(135deg, #52c41a 0%, #389e0d 100%);
}

.icon-total {
  background: linear-gradient(135deg, #1890ff 0%, #096dd9 100%);
}

.stat-info {
  flex: 1;
}

.stat-value {
  font-size: 28px;
  font-weight: 700;
  color: #303133;
  line-height: 1.2;
}

.stat-label {
  font-size: 14px;
  color: #909399;
  margin-top: 4px;
}

.main-card {
  border-radius: 12px;
}

.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  flex-wrap: wrap;
  gap: 12px;
}

.toolbar-left {
  display: flex;
  align-items: center;
}

.toolbar-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.todo-type {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 13px;
}

.type-warning {
  color: #e6a23c;
}

.type-primary {
  color: #409eff;
}

.type-success {
  color: #67c23a;
}

.type-info {
  color: #909399;
}

.title-cell {
  display: flex;
  align-items: center;
  gap: 8px;
}

.title-cell.unread .title-text {
  font-weight: 600;
  color: #303133;
}

.title-text {
  cursor: pointer;
  color: #606266;
}

.title-text:hover {
  color: #409eff;
}

.unread-dot {
  margin-right: 4px;
}

.action-buttons {
  display: flex;
  justify-content: center;
  gap: 4px;
}

.pagination-container {
  margin-top: 16px;
  display: flex;
  justify-content: center;
}

/* 行样式 */
:deep(.unread-row) {
  background-color: #fef0f0 !important;
}

:deep(.completed-row) {
  color: #909399;
}

/* 审核日志样式 */
.log-card {
  margin-bottom: 0;
}

.log-card :deep(.el-card__body) {
  padding: 12px;
}

.log-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.log-action {
  font-weight: 600;
  color: #303133;
}

.log-operator {
  display: flex;
  align-items: center;
  gap: 4px;
  color: #606266;
  font-size: 13px;
  margin-bottom: 4px;
}

.log-remark {
  display: flex;
  align-items: flex-start;
  gap: 4px;
  color: #909399;
  font-size: 13px;
  background: #f5f7fa;
  padding: 8px;
  border-radius: 4px;
  margin-top: 8px;
}

/* 响应式 */
@media (max-width: 768px) {
  .toolbar {
    flex-direction: column;
    align-items: stretch;
  }
  
  .toolbar-left,
  .toolbar-right {
    width: 100%;
    justify-content: flex-start;
  }
  
  .stat-value {
    font-size: 22px;
  }
  
  .stat-icon {
    width: 48px;
    height: 48px;
  }
  
  .stat-icon .el-icon {
    font-size: 22px;
  }
}

/* 表格样式 */
:deep(.el-table) {
  border-radius: 8px;
}

:deep(.el-table th.el-table__cell) {
  background-color: #f5f7fa !important;
  color: #606266;
  font-weight: bold;
}

:deep(.el-table .el-table__row--striped td.el-table__cell) {
  background-color: #fafafa;
}

/* 可调节列宽光标 */
:deep(.el-table th.el-table__cell .cell) {
  cursor: col-resize;
}
</style>
