<template>
  <div class="work-dashboard">
    <!-- 页面头部 -->
    <div class="dashboard-header">
      <div class="header-left">
        <h2 class="page-title">
          <el-icon><Monitor /></el-icon>
          工作台
        </h2>
        <p class="page-subtitle">工作概览、待办事项、进度统计</p>
      </div>
      <div class="header-right">
        <el-button type="primary" @click="refreshData">
          <el-icon><Refresh /></el-icon>
          刷新数据
        </el-button>
      </div>
    </div>

    <!-- 统计卡片 -->
    <div class="stats-cards">
      <el-row :gutter="20">
        <el-col :span="6">
          <div class="stat-card total-plans">
            <div class="stat-icon">
              <el-icon><List /></el-icon>
            </div>
            <div class="stat-content">
              <div class="stat-number">{{ dashboardData.planStats?.totalPlans || 0 }}</div>
              <div class="stat-label">总计划数</div>
            </div>
          </div>
        </el-col>
        <el-col :span="6">
          <div class="stat-card in-progress">
            <div class="stat-icon">
              <el-icon><Loading /></el-icon>
            </div>
            <div class="stat-content">
              <div class="stat-number">{{ dashboardData.planStats?.inProgressPlans || 0 }}</div>
              <div class="stat-label">进行中</div>
            </div>
          </div>
        </el-col>
        <el-col :span="6">
          <div class="stat-card completed">
            <div class="stat-icon">
              <el-icon><Check /></el-icon>
            </div>
            <div class="stat-content">
              <div class="stat-number">{{ dashboardData.planStats?.completedPlans || 0 }}</div>
              <div class="stat-label">已完成</div>
            </div>
          </div>
        </el-col>
        <el-col :span="6">
          <div class="stat-card overdue">
            <div class="stat-icon">
              <el-icon><Warning /></el-icon>
            </div>
            <div class="stat-content">
              <div class="stat-number">{{ dashboardData.planStats?.overduePlans || 0 }}</div>
              <div class="stat-label">已逾期</div>
            </div>
          </div>
        </el-col>
      </el-row>
    </div>

    <!-- 主要内容区域 -->
    <div class="dashboard-content">
      <el-row :gutter="20">
        <!-- 左侧：待办事项 -->
        <el-col :span="12">
          <div class="content-card">
            <div class="card-header">
              <h3 class="card-title">
                <el-icon><Clock /></el-icon>
                待办事项
              </h3>
              <el-button text type="primary" @click="viewAllTodos">
                查看全部
              </el-button>
            </div>
            <div class="card-content">
              <div v-if="loading.todos" class="loading-container">
                <el-skeleton :rows="3" animated />
              </div>
              <div v-else-if="todoList.length === 0" class="empty-state">
                <el-empty description="暂无待办事项" />
              </div>
              <div v-else class="todo-list">
                <div 
                  v-for="todo in todoList" 
                  :key="todo.ID" 
                  class="todo-item"
                  @click="viewPlanDetail(todo.ID)"
                >
                  <div class="todo-priority" :class="`priority-${todo.Priority}`"></div>
                  <div class="todo-content">
                    <div class="todo-title">{{ todo.Title }}</div>
                    <div class="todo-meta">
                      <span class="todo-type">{{ todo.WorkTypeName }}</span>
                      <span class="todo-deadline" :class="{ 'urgent': todo.DaysRemaining <= 3 }">
                        {{ formatDeadline(todo.EndDate, todo.DaysRemaining) }}
                      </span>
                    </div>
                  </div>
                  <div class="todo-progress">
                    <el-progress 
                      :percentage="todo.Progress" 
                      :stroke-width="6" 
                      :show-text="false"
                      :color="getProgressColor(todo.Progress)"
                    />
                    <span class="progress-text">{{ todo.Progress }}%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </el-col>

        <!-- 右侧：最近工作日志 -->
        <el-col :span="12">
          <div class="content-card">
            <div class="card-header">
              <h3 class="card-title">
                <el-icon><EditPen /></el-icon>
                最近工作日志
              </h3>
              <el-button text type="primary" @click="viewAllLogs">
                查看全部
              </el-button>
            </div>
            <div class="card-content">
              <div v-if="loading.logs" class="loading-container">
                <el-skeleton :rows="3" animated />
              </div>
              <div v-else-if="recentLogs.length === 0" class="empty-state">
                <el-empty description="暂无工作日志" />
              </div>
              <div v-else class="log-list">
                <div 
                  v-for="log in recentLogs" 
                  :key="log.ID" 
                  class="log-item"
                  @click="viewLogDetail(log.ID)"
                >
                  <div class="log-date">
                    <div class="date-day">{{ formatLogDate(log.LogDate).day }}</div>
                    <div class="date-month">{{ formatLogDate(log.LogDate).month }}</div>
                  </div>
                  <div class="log-content">
                    <div class="log-plan">{{ log.PlanTitle || '独立日志' }}</div>
                    <div class="log-summary">{{ truncateText(log.Content, 50) }}</div>
                    <div class="log-meta">
                      <span class="log-hours">{{ log.WorkHours }}小时</span>
                      <span v-if="log.Issues" class="log-issues">有问题</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </el-col>
      </el-row>
    </div>

    <!-- 进度统计图表 -->
    <div class="dashboard-charts">
      <el-row :gutter="20">
        <el-col :span="12">
          <div class="content-card">
            <div class="card-header">
              <h3 class="card-title">
                <el-icon><TrendCharts /></el-icon>
                计划完成率
              </h3>
            </div>
            <div class="card-content">
              <div class="progress-overview">
                <div class="progress-circle">
                  <el-progress 
                    type="circle" 
                    :percentage="overallProgress" 
                    :width="120"
                    :stroke-width="8"
                    :color="getProgressColor(overallProgress)"
                  >
                    <template #default="{ percentage }">
                      <span class="progress-percentage">{{ percentage }}%</span>
                    </template>
                  </el-progress>
                </div>
                <div class="progress-details">
                  <div class="detail-item">
                    <span class="detail-label">平均进度：</span>
                    <span class="detail-value">{{ dashboardData.planStats?.avgProgress?.toFixed(1) || 0 }}%</span>
                  </div>
                  <div class="detail-item">
                    <span class="detail-label">今日日志：</span>
                    <span class="detail-value">{{ dashboardData.todayLogs || 0 }}条</span>
                  </div>
                  <div class="detail-item">
                    <span class="detail-label">即将到期：</span>
                    <span class="detail-value">{{ dashboardData.upcomingPlans || 0 }}个</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </el-col>
        <el-col :span="12">
          <div class="content-card">
            <div class="card-header">
              <h3 class="card-title">
                <el-icon><DataAnalysis /></el-icon>
                工作提醒
              </h3>
            </div>
            <div class="card-content">
              <div v-if="dashboardData.unreadReminders > 0" class="reminder-alert">
                <el-alert
                  :title="`您有 ${dashboardData.unreadReminders} 条未读提醒`"
                  type="warning"
                  :closable="false"
                  show-icon
                >
                  <template #default>
                    <el-button size="small" type="primary" @click="viewReminders">
                      查看提醒
                    </el-button>
                  </template>
                </el-alert>
              </div>
              <div v-else class="no-reminders">
                <el-result
                  icon="success"
                  title="暂无提醒"
                  sub-title="当前没有未读的工作提醒"
                >
                </el-result>
              </div>
            </div>
          </div>
        </el-col>
      </el-row>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import {
  Monitor,
  Refresh,
  List,
  Loading,
  Check,
  Warning,
  Clock,
  EditPen,
  TrendCharts,
  DataAnalysis
} from '@element-plus/icons-vue'
import api from '@/utils/api'

// 路由实例
const router = useRouter()

// 响应式数据
const dashboardData = ref({})
const todoList = ref([])
const recentLogs = ref([])

// 加载状态
const loading = reactive({
  dashboard: false,
  todos: false,
  logs: false
})

// 计算属性：整体进度
const overallProgress = computed(() => {
  const stats = dashboardData.value.planStats
  if (!stats || !stats.totalPlans) return 0
  return Math.round((stats.completedPlans / stats.totalPlans) * 100)
})

/**
 * 获取工作台数据
 */
const getDashboardData = async () => {
  try {
    loading.dashboard = true
    const response = await api.get('/work-plan/dashboard')
    if (response.data.success) {
      dashboardData.value = response.data.data
    }
  } catch (error) {
    console.error('获取工作台数据失败:', error)
    ElMessage.error('获取工作台数据失败')
  } finally {
    loading.dashboard = false
  }
}

/**
 * 获取待办事项列表
 */
const getTodoList = async () => {
  try {
    loading.todos = true
    const response = await api.get('/work-plan/dashboard/todos', {
      params: { limit: 8 }
    })
    if (response.data.success) {
      todoList.value = response.data.data
    }
  } catch (error) {
    console.error('获取待办事项失败:', error)
    ElMessage.error('获取待办事项失败')
  } finally {
    loading.todos = false
  }
}

/**
 * 获取最近工作日志
 */
const getRecentLogs = async () => {
  try {
    loading.logs = true
    const response = await api.get('/work-plan/dashboard/recent-logs', {
      params: { limit: 6 }
    })
    if (response.data.success) {
      recentLogs.value = response.data.data
    }
  } catch (error) {
    console.error('获取最近工作日志失败:', error)
    ElMessage.error('获取最近工作日志失败')
  } finally {
    loading.logs = false
  }
}

/**
 * 刷新所有数据
 */
const refreshData = async () => {
  await Promise.all([
    getDashboardData(),
    getTodoList(),
    getRecentLogs()
  ])
  ElMessage.success('数据刷新成功')
}

/**
 * 格式化截止日期
 */
const formatDeadline = (endDate, daysRemaining) => {
  if (daysRemaining < 0) {
    return `已逾期 ${Math.abs(daysRemaining)} 天`
  } else if (daysRemaining === 0) {
    return '今天截止'
  } else if (daysRemaining <= 3) {
    return `${daysRemaining} 天后截止`
  } else {
    return new Date(endDate).toLocaleDateString()
  }
}

/**
 * 格式化日志日期
 */
const formatLogDate = (dateStr) => {
  const date = new Date(dateStr)
  return {
    day: date.getDate().toString().padStart(2, '0'),
    month: (date.getMonth() + 1).toString().padStart(2, '0') + '月'
  }
}

/**
 * 截断文本
 */
const truncateText = (text, maxLength) => {
  if (!text) return ''
  return text.length > maxLength ? text.substring(0, maxLength) + '...' : text
}

/**
 * 获取进度颜色
 */
const getProgressColor = (percentage) => {
  if (percentage >= 80) return '#67c23a'
  if (percentage >= 60) return '#e6a23c'
  if (percentage >= 40) return '#f56c6c'
  return '#909399'
}

/**
 * 查看计划详情
 */
const viewPlanDetail = (planId) => {
  router.push(`/admin/work-plan/plans/${planId}`)
}

/**
 * 查看日志详情
 */
const viewLogDetail = (logId) => {
  router.push(`/admin/work-plan/logs/${logId}`)
}

/**
 * 查看所有待办事项
 */
const viewAllTodos = () => {
  router.push('/admin/work-plan/plans?status=pending,in_progress')
}

/**
 * 查看所有工作日志
 */
const viewAllLogs = () => {
  router.push('/admin/work-plan/logs')
}

/**
 * 查看工作提醒
 */
const viewReminders = () => {
  router.push('/admin/work-plan/reminders')
}

// 组件挂载时获取数据
onMounted(() => {
  refreshData()
})
</script>

<style scoped>
.work-dashboard {
  padding: 20px;
  background-color: #f5f7fa;
  min-height: calc(100vh - 60px);
}

/* 页面头部样式 */
.dashboard-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding: 20px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.header-left .page-title {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0 0 8px 0;
  font-size: 24px;
  font-weight: 600;
  color: #303133;
}

.header-left .page-subtitle {
  margin: 0;
  color: #909399;
  font-size: 14px;
}

/* 统计卡片样式 */
.stats-cards {
  margin-bottom: 20px;
}

.stat-card {
  display: flex;
  align-items: center;
  padding: 20px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  transition: transform 0.2s;
}

.stat-card:hover {
  transform: translateY(-2px);
}

.stat-icon {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 16px;
  font-size: 24px;
  color: white;
}

.total-plans .stat-icon {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.in-progress .stat-icon {
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
}

.completed .stat-icon {
  background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
}

.overdue .stat-icon {
  background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%);
}

.stat-content .stat-number {
  font-size: 28px;
  font-weight: 700;
  color: #303133;
  line-height: 1;
}

.stat-content .stat-label {
  font-size: 14px;
  color: #909399;
  margin-top: 4px;
}

/* 内容卡片样式 */
.dashboard-content,
.dashboard-charts {
  margin-bottom: 20px;
}

.content-card {
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  border-bottom: 1px solid #ebeef5;
}

.card-title {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #303133;
}

.card-content {
  padding: 20px;
}

/* 待办事项样式 */
.todo-list {
  max-height: 400px;
  overflow-y: auto;
}

.todo-item {
  display: flex;
  align-items: center;
  padding: 12px;
  border-radius: 6px;
  margin-bottom: 8px;
  cursor: pointer;
  transition: background-color 0.2s;
  border: 1px solid #ebeef5;
}

.todo-item:hover {
  background-color: #f5f7fa;
}

.todo-priority {
  width: 4px;
  height: 40px;
  border-radius: 2px;
  margin-right: 12px;
}

.priority-high {
  background-color: #f56c6c;
}

.priority-medium {
  background-color: #e6a23c;
}

.priority-low {
  background-color: #67c23a;
}

.todo-content {
  flex: 1;
  min-width: 0;
}

.todo-title {
  font-weight: 500;
  color: #303133;
  margin-bottom: 4px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.todo-meta {
  display: flex;
  gap: 12px;
  font-size: 12px;
  color: #909399;
}

.todo-deadline.urgent {
  color: #f56c6c;
  font-weight: 500;
}

.todo-progress {
  width: 80px;
  text-align: center;
}

.progress-text {
  font-size: 12px;
  color: #909399;
  margin-top: 4px;
  display: block;
}

/* 工作日志样式 */
.log-list {
  max-height: 400px;
  overflow-y: auto;
}

.log-item {
  display: flex;
  align-items: center;
  padding: 12px;
  border-radius: 6px;
  margin-bottom: 8px;
  cursor: pointer;
  transition: background-color 0.2s;
  border: 1px solid #ebeef5;
}

.log-item:hover {
  background-color: #f5f7fa;
}

.log-date {
  width: 50px;
  text-align: center;
  margin-right: 12px;
}

.date-day {
  font-size: 18px;
  font-weight: 600;
  color: #303133;
  line-height: 1;
}

.date-month {
  font-size: 12px;
  color: #909399;
  margin-top: 2px;
}

.log-content {
  flex: 1;
  min-width: 0;
}

.log-plan {
  font-weight: 500;
  color: #303133;
  margin-bottom: 4px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.log-summary {
  font-size: 13px;
  color: #606266;
  margin-bottom: 4px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.log-meta {
  display: flex;
  gap: 12px;
  font-size: 12px;
  color: #909399;
}

.log-issues {
  color: #f56c6c;
  font-weight: 500;
}

/* 进度统计样式 */
.progress-overview {
  display: flex;
  align-items: center;
  gap: 30px;
}

.progress-circle {
  flex-shrink: 0;
}

.progress-percentage {
  font-size: 18px;
  font-weight: 600;
  color: #303133;
}

.progress-details {
  flex: 1;
}

.detail-item {
  display: flex;
  justify-content: space-between;
  margin-bottom: 12px;
  padding: 8px 0;
  border-bottom: 1px solid #f0f2f5;
}

.detail-item:last-child {
  border-bottom: none;
  margin-bottom: 0;
}

.detail-label {
  color: #909399;
  font-size: 14px;
}

.detail-value {
  color: #303133;
  font-weight: 500;
  font-size: 14px;
}

/* 提醒样式 */
.reminder-alert {
  margin-bottom: 16px;
}

.no-reminders {
  text-align: center;
  padding: 20px 0;
}

/* 加载和空状态样式 */
.loading-container {
  padding: 20px 0;
}

.empty-state {
  text-align: center;
  padding: 40px 0;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .work-dashboard {
    padding: 10px;
  }
  
  .dashboard-header {
    flex-direction: column;
    gap: 16px;
    text-align: center;
  }
  
  .stats-cards .el-col {
    margin-bottom: 16px;
  }
  
  .progress-overview {
    flex-direction: column;
    text-align: center;
    gap: 20px;
  }
}
</style>