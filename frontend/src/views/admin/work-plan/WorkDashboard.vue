<template>
    <el-card class="modern-dashboard">
      <!-- 页面标题和时间范围选择 -->
      <div class="page-header">
        <div class="header-content">
          <div class="header-left">
            <h1 class="page-title">
              <el-icon class="title-icon"><DataBoard /></el-icon>
              工作台
            </h1>
            <div class="welcome-message">
              <p class="welcome-line">
                <span class="greeting-section">
                  <span class="greeting-emoji">{{ getGreeting().split(' ')[1] || '👋' }}</span>
                  <span class="greeting-words">{{ getGreeting().split(' ')[0] }}，</span>
                  <span class="user-name">{{ getCurrentUser() }}</span>
                  <span class="exclamation">！</span>
                </span>
                <span class="date-section">
                  <el-icon class="calendar-icon"><Calendar /></el-icon>
                  现在是 {{ getCurrentDate() }}
                  <el-tag size="small" type="primary" class="weekday-tag">
                    {{ getCurrentWeekday() }}
                  </el-tag>
                </span>
              </p>
            </div>
          </div>
          <div class="header-right">
            <div class="time-filter">
              <span class="filter-label">时间范围：</span>
              <el-select v-model="selectedTimeRange" @change="handleTimeRangeChange" class="time-select">
                <el-option label="今天" value="today" />
                <el-option label="本周" value="week" />
                <el-option label="本月" value="month" />
                <el-option label="本季度" value="quarter" />
                <el-option label="本年" value="year" />
              </el-select>
            </div>
            <div class="quick-actions">
              <el-button type="primary" :disabled="!hasCreatePlanPermission" @click="createNewPlan" class="action-btn">
                <el-icon><Plus /></el-icon>
                新建计划
              </el-button>
              <el-button @click="refreshData" class="action-btn">
                <el-icon><Refresh /></el-icon>
                刷新
              </el-button>
            </div>
          </div>
        </div>
      </div>
    </el-card>
    <el-card class="dashboard-content">
      <el-row :gutter="20">
        <!-- 左卡片 -->
        <el-col :span="18">
          <!-- 上部分：统计图表卡片 -->
          <div class="charts-wrapper">
            <el-card class="charts-card">
              <el-row :gutter="20">
                <!-- 第一列：完成情况 -->
                <el-col :span="8">
                  <div class="chart-item completion-chart">
                    <div class="completion-grid">
                      <div class="completion-item">
                        <el-text class="progressbar-title" type="success">总体完成</el-text>
                        <div class="completion-progress">
                          <el-progress :percentage="overallProgress" :stroke-width="12" :show-text="false" color="#67C23A" />
                          <el-text class="progressbar-value" type="success">{{ overallProgress }}%</el-text>
                        </div>
                      </div>
                      <div class="completion-item">
                        <el-text class="progressbar-title" type="primary" >平均进度</el-text>
                        <div class="completion-progress">
                          <el-progress :percentage="dashboardData.planStats?.avgProgress || 0" :stroke-width="12" :show-text="false" color="#409EFF" />
                          <el-text class="progressbar-value" type="primary">{{ (dashboardData.planStats?.avgProgress || 0).toFixed(1) }}%</el-text>
                        </div>
                      </div>
                      <div class="completion-item">
                        <el-text class="progressbar-title" type="warning">{{ completionRateLabel }}</el-text>
                        <div class="completion-progress">
                          <el-progress :percentage="dashboardData.completionRate || 0" :stroke-width="12" :show-text="false" color="#e6a23c" />
                          <el-text class="progressbar-value" type="warning">{{ dashboardData.completionRate || 0 }}%</el-text>
                        </div>
                      </div>
                      <div class="completion-item">
                        <el-text class="progressbar-title" type="danger">任务效率</el-text>
                        <div class="completion-progress">
                          <el-progress :percentage="dashboardData.taskEfficiency || 0" :stroke-width="12" :show-text="false" color="#f56c6c" />
                          <el-tooltip 
                            content="基于按时完成情况评分，按时完成得100分，延期完成按延期天数扣分（每天扣10分，最低0分）" 
                            placement="top"
                            effect="dark"
                          >
                            <el-badge :value="'?'" class="item" type="warning">
                              <el-text class="progressbar-value" type="danger">{{ dashboardData.taskEfficiency || 0 }}&nbsp;分</el-text>
                            </el-badge>
                          </el-tooltip>
                        </div>
                      </div>
                    </div>
                  </div>
                </el-col>

                <!-- 第二列：计划统计和柱形图 -->
                <el-col :span="6">
                  <div class="chart-item bar-chart-item">
                    <div class="middle-content">
                      <!-- 上部：统计标签 -->
                      <el-row :gutter="4" justify="center" align="middle" class="stats-tags">
                        <el-col :span="12" class="text-center">
                           <!--<span class="stat-tag stat-tag-total">总计划 </span>-->
                          <el-tag class="ml-2" type="info">总计划</el-tag>
                          <el-text class="mx-1" type="info">{{ dashboardData.planStats?.totalPlans || 0 }}项</el-text>
                        </el-col>
                        <el-col :span="12" class="text-center">
                          <el-tag class="ml-2" type="success">已完成 </el-tag>
                          <el-text class="mx-1" type="success">{{ dashboardData.planStats?.completedPlans || 0 }}项</el-text>
                        </el-col>
                      </el-row>
                      <!-- 下部：ECharts柱形图 -->
                      <div class="bar-chart">
                        <div ref="barChartRef" class="echarts-container"></div>
                      </div>
                    </div>
                  </div>
                </el-col>

                <!-- 第三列：圆环图 -->
                <el-col :span="10">
                  <div class="chart-item pie-chart-item">
                    <div class="pie-charts">
                      <div class="pie-item">
                        <el-progress
                          type="circle"
                          :percentage="getPercentage('inProgress')"
                          :width="75"
                          :stroke-width="10"
                          color="#409eff"
                        >
                          <template #default="{ percentage }">
                            <div class="pie-center">
                              <el-text class="pie-value" type="primary">{{ percentage }}%</el-text>
                            </div>
                          </template>
                        </el-progress>
                        <el-text class="pie-label" type="primary">进行中</el-text>
                      </div>
                      <div class="pie-item">
                        <el-progress
                          type="circle"
                          :percentage="getPercentage('completed')"
                          :width="75"
                          :stroke-width="10"
                          color="#67c23a"
                        >
                          <template #default="{ percentage }">
                            <div class="pie-center">
                              <el-text class="pie-value" type="success">{{ percentage }}%</el-text>
                            </div>
                          </template>
                        </el-progress>
                        <el-text class="pie-label" type="success">已完成</el-text>
                      </div>
                      <div class="pie-item">
                        <el-progress
                          type="circle"
                          :percentage="getPercentage('overdue')"
                          :width="75"
                          :stroke-width="10"
                          color="#f56c6c"
                        >
                          <template #default="{ percentage }">
                            <div class="pie-center">
                              <el-text class="pie-value" type="danger">{{ percentage }}%</el-text>
                            </div>
                          </template>
                        </el-progress>
                        <el-text class="pie-label" type="danger">已逾期</el-text>
                      </div>
                    </div>
                  </div>
                </el-col>
              </el-row>
            </el-card>
          </div>

          <!-- 下部分：通知公告模块 -->

            <el-card class="notice-card">
              <el-row :gutter="8">
                <!-- 左侧标题区域 -->
                <el-col :span="3">
                  <div class="notice-header">
                    <h3 class="notice-title">
                      <el-icon><Bell /></el-icon>
                      <span>通知公告</span>
                    </h3>
                  </div>
                </el-col>
                <!-- 右侧滚动显示区域 -->
                <el-col :span="21">
                  <div class="notice-content">
                    <div class="notice-scroll" ref="noticeScrollRef">
                      <div 
                        class="notice-item" 
                        v-for="(notice, index) in noticeList" 
                        :key="index"
                        :class="{ 'unread': !notice.IsRead }"
                        @click="viewNoticeFromDashboard(notice)"
                      >
                        <div class="notice-dot" :class="{ 'unread': !notice.IsRead }"></div>
                        <div class="notice-info">
                          <div class="notice-header">
                            <div class="notice-text-wrapper">
                              <div class="notice-text" :class="{ 'unread': !notice.IsRead }">{{ notice.Title }}</div>
                              <el-tag v-if="notice.IsSticky" type="warning" size="small" class="sticky-tag">置顶</el-tag>
                              <el-tag :type="getNoticeTypeTag(notice.Type)" size="small" class="type-tag">{{ getNoticeTypeLabel(notice.Type) }}</el-tag>
                            </div>
                            <div class="notice-time">{{ formatNoticeTime(notice.PublishDate) }}</div>
                          </div>
                          <div class="notice-content">{{ notice.Content }}</div>
                        </div>
                      </div>
                    </div>
                  </div>
              </el-col>
            </el-row>
          </el-card>
        </el-col>

        <!-- 右卡片：日历组件 -->
        <el-col :span="6">
          <el-card class="calendar-card">
            <div class="calendar-content">
              <el-calendar v-model="currentDate" class="dashboard-calendar">
                <template #date-cell="{ data }">
                  <div class="calendar-day" :class="{ 'is-today': isToday(data.day) }">
                    {{ data.day.split('-').pop() }}
                  </div>
                </template>
              </el-calendar>
            </div>
          </el-card>
        </el-col>
      </el-row>
    </el-card>

    <!-- 主要内容区域 -->
    <el-card class="main-content-card">
      <div class="main-content">
        <div class="content-grid">
          <!-- 待办事项 -->
          <div class="content-section todo-section">
            <div class="section-header">
              <h3 class="section-title">
                <el-icon><Clock /></el-icon>
                待办事项
                <el-badge :value="todoList.length" class="todo-badge" />
              </h3>
              <div class="section-actions">
                <el-button text @click="viewAllTodos" class="view-all-btn">
                  查看全部
                  <el-icon class="el-icon--right"><ArrowRight /></el-icon>
                </el-button>
              </div>
            </div>
            <div class="todo-container">
              <div v-if="loading.todos" class="loading-state">
                <el-skeleton :rows="3" animated />
              </div>
              <div v-else-if="displayedTodos.length === 0" class="empty-state">
                <el-empty description="暂无待办事项">
                  <el-button type="primary" :disabled="!hasCreatePlanPermission" @click="createNewPlan">创建新计划</el-button>
                </el-empty>
              </div>
              <ul v-else v-infinite-scroll="loadMoreTodos" :infinite-scroll-disabled="todoLoading || !hasMoreTodos" class="todo-list">
                <li
                  v-for="todo in displayedTodos"
                  :key="todo.ID"
                  class="todo-item"
                  @click="viewPlanDetail(todo.ID)"
                >
                  <span class="todo-priority" :class="`priority-${todo.Priority}`"></span>
                  <div class="todo-main">
                    <div class="todo-header">
                      <el-badge :value="formatUrgency(todo.DaysRemaining)" :type="getUrgencyType(todo.DaysRemaining)" class="title-badge">
                        <h4 class="todo-title">{{ todo.Title }}</h4>
                      </el-badge>
                    </div>
                    <div class="todo-meta">
                      <div class="todo-meta-left">
                        <span class="todo-subtitle">
                          <el-icon><Folder /></el-icon>
                          {{ todo.WorkTypeName }}
                        </span>
                      </div>
                      <div class="todo-meta-center">
                        <span class="todo-deadline">
                          <el-icon><Calendar /></el-icon>
                          <el-text class="mx-1" :type="formatRemainingTime(todo.EndDate) === '已逾期' ? 'danger' : 'primary'">{{ formatRemainingTime(todo.EndDate) }}</el-text>
                        </span>
                      </div>
                      <div class="todo-meta-right">
                        <el-progress
                          :percentage="todo.Progress"
                          :text-inside="true"
                          :stroke-width="16"
                          :status="getProgressStatus(todo.Progress)"
                          class="todo-progress-bar"
                        />
                      </div>
                    </div>
                  </div>
                </li>
                <li v-if="todoLoading" class="loading-item">
                  <el-skeleton :rows="2" animated />
                </li>
                <li v-if="!hasMoreTodos && displayedTodos.length > 0" class="end-item">
                  <el-divider>已显示全部待办事项</el-divider>
                </li>
              </ul>
            </div>
          </div>
          
          <!-- 最近动态 -->
          <div class="content-section activity-section">
            <div class="section-header">
              <h3 class="section-title">
                <el-icon><Bell /></el-icon>
                最近动态
              </h3>
              <div class="section-actions">
                <el-button text @click="viewAllLogs" class="view-all-btn">
                  查看全部
                  <el-icon class="el-icon--right"><ArrowRight /></el-icon>
                </el-button>
              </div>
            </div>
            <div class="activity-container">
              <div v-if="loading.logs" class="loading-state">
                <el-skeleton :rows="3" animated />
              </div>
              <div v-else-if="recentLogs.length === 0" class="empty-state">
                <el-empty description="暂无工作记录">
                  <el-button type="primary" :disabled="!hasCreateLogPermission" @click="addWorkLog">添加工作记录</el-button>
                </el-empty>
              </div>
              <div v-else v-infinite-scroll="loadMoreLogs" :infinite-scroll-disabled="timelineLoading || !hasMoreLogs">
                <el-timeline>
                  <el-timeline-item
                    v-for="log in displayedLogs"
                    :key="log.ID"
                    :timestamp="formatLogTime(log.LogDate)"
                    :icon="getTimelineIcon(log)"
                    :type="getTimelineType(log)"
                    :color="getTimelineColor(log)"
                    :size="getTimelineSize(log)"
                    :hollow="getTimelineHollow(log)"
                  >
                    {{ log.PlanTitle || '独立工作记录' }} - {{ truncateText(log.Content, 120) }}
                  </el-timeline-item>
                </el-timeline>
                <div v-if="timelineLoading">
                  <el-skeleton :rows="2" animated />
                </div>
                <div v-if="!hasMoreLogs && displayedLogs.length > 0">
                  <el-divider>已显示全部记录</el-divider>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
  </el-card>
  
  <!-- 新增计划对话框 -->
  <CreatePlanDialog
    v-model="showCreatePlanDialog"
    @success="handlePlanCreateSuccess"
  />
</template>


<script setup>
import { ref, reactive, onMounted, onUnmounted, computed, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { useUserStore } from '@/store/user'
import {
  Sunny,
  Plus,
  EditPen,
  Refresh,
  DataBoard,
  ArrowDown,
  TrendCharts,
  Timer,
  Clock,
  ArrowRight,
  Folder,
  Calendar,
  Bell,
  Check,
  Loading,
  Warning,
  MoreFilled,
  Document,
  QuestionFilled
} from '@element-plus/icons-vue'
import * as echarts from 'echarts'
import api from '@/services/api'
import CreatePlanDialog from '@/components/work-plan/CreatePlanDialog.vue'

// 路由实例
const router = useRouter()

// 用户状态管理
const userStore = useUserStore()

// 权限检查 - 使用页面级权限，有查看权限即可使用新建功能
const hasCreatePlanPermission = computed(() => {
  // admin用户或有work-plan相关权限都可以
  if (userStore.user?.username === 'admin' || userStore.user?.Username === 'admin') return true
  return userStore.hasActionPermission('work-plan:plans:view') || 
         userStore.hasActionPermission('work-plan:dashboard:view') ||
         userStore.hasActionPermission('work-plan:plan:create')
})
const hasCreateLogPermission = computed(() => {
  // admin用户或有work-plan相关权限都可以
  if (userStore.user?.username === 'admin' || userStore.user?.Username === 'admin') return true
  return userStore.hasActionPermission('work-plan:logs:view') || 
         userStore.hasActionPermission('work-plan:dashboard:view') ||
         userStore.hasActionPermission('work-plan:log:create')
})

// 响应式数据
const dashboardData = ref({})
const todoList = ref([])
const displayedTodos = ref([]) // 待办事项显示的数据
const recentLogs = ref([])
const displayedLogs = ref([]) // 时间线显示的日志
const selectedTimeRange = ref('month') // 默认选择本月
const todayWorkHours = ref(8.5)
// const weeklyTargetRate = ref(85) // 移除硬编码，改为从API获取
const currentDateTime = ref('') // 当前日期时间

// 无限滚动相关状态
const timelineLoading = ref(false)
const hasMoreLogs = ref(true)
const currentPage = ref(1)
const pageSize = ref(10)

// 待办事项无限滚动相关状态
const todoLoading = ref(false)
const hasMoreTodos = ref(true)
const todoCurrentPage = ref(1)
const todoPageSize = ref(10)

// 待办事项标签页状态
const activeTab = ref('inProgress')

// 新增计划对话框状态
const showCreatePlanDialog = ref(false)

// 通知公告数据
const noticeList = ref([])

// ECharts相关引用
const barChartRef = ref(null)
let barChart = null

// 通知滚动相关引用
const noticeScrollRef = ref(null)
let noticeScrollTimer = null

// 时间更新定时器
let timeUpdateTimer = null

// 用于触发剩余时间更新的响应式变量
const timeUpdateTrigger = ref(0)

// 日历相关数据
const currentDate = ref(new Date())

// 加载状态
const loading = reactive({
  dashboard: false,
  todos: false,
  logs: false
})

// 模拟一周效率数据
const weeklyEfficiency = ref([
  { day: '周一', percentage: 85 },
  { day: '周二', percentage: 92 },
  { day: '周三', percentage: 78 },
  { day: '周四', percentage: 95 },
  { day: '周五', percentage: 88 },
  { day: '周六', percentage: 60 },
  { day: '周日', percentage: 45 }
])

// 计算属性：整体进度
const overallProgress = computed(() => {
  const stats = dashboardData.value.planStats
  if (!stats || !stats.totalPlans) return 0
  return Math.round((stats.completedPlans / stats.totalPlans) * 100)
})

// 计算属性：动态完成率标签文本
const completionRateLabel = computed(() => {
  switch (selectedTimeRange.value) {
    case 'today':
      return '今日完成'
    case 'week':
      return '本周完成'
    case 'month':
      return '本月完成'
    case 'quarter':
      return '本季完成'
    case 'year':
      return '本年完成'
    default:
      return '本周完成'
  }
})

/**
 * 获取问候语
 */
const getGreeting = () => {
  const hour = new Date().getHours()
  const greetings = {
    morning: ['早上好 🌅', '新的一天开始了 🌞'],
    afternoon: ['下午好 🌤️', '下午时光 🌻'],
    evening: ['晚上好 🌙', '夜幕降临 🌃']
  }
  
  let timeOfDay, messages
  if (hour >= 5 && hour < 12) {
    timeOfDay = 'morning'
    messages = greetings.morning
  } else if (hour >= 12 && hour < 18) {
    timeOfDay = 'afternoon' 
    messages = greetings.afternoon
  } else {
    timeOfDay = 'evening'
    messages = greetings.evening
  }
  
  // 根据日期选择不同的问候语，让每天都有新鲜感
  const dayIndex = new Date().getDate() % messages.length
  return messages[dayIndex]
}

/**
 * 获取当前用户名
 */
const getCurrentUser = () => {
  // 从用户状态管理中获取真实用户信息
  const user = userStore.user
  if (user && (user.realName || user.RealName)) {
    return user.realName || user.RealName
  }
  if (user && (user.username || user.Username)) {
    return user.username || user.Username
  }
  return '用户'
}

/**
 * 更新当前日期和时间（包含时分秒）
 */
const updateCurrentDateTime = () => {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  const hours = String(now.getHours()).padStart(2, '0')
  const minutes = String(now.getMinutes()).padStart(2, '0')
  const seconds = String(now.getSeconds()).padStart(2, '0')
  
  currentDateTime.value = `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`
}

/**
 * 获取当前日期和时间（包含时分秒）
 */
const getCurrentDate = () => {
  return currentDateTime.value
}

/**
 * 获取当前星期几
 */
const getCurrentWeekday = () => {
  const today = new Date()
  const options = { 
    weekday: 'long'
  }
  return today.toLocaleDateString('zh-CN', options)
}

/**
 * 获取工作台数据
 * @param {string} timeRange - 时间范围参数 (today, week, month, quarter, year)
 */
const getDashboardData = async (timeRange = null) => {
  try {
    loading.dashboard = true
    const params = {}
    if (timeRange) {
      params.timeRange = timeRange
    }
    const response = await api.get('/work-plan/dashboard', { params })
    if (response.data?.success) {
      dashboardData.value = response.data.data
    }
  } catch (error) {
    console.error('获取工作台数据失败:', error)
    // 使用模拟数据
    dashboardData.value = {
      planStats: {
        totalPlans: 15,
        inProgressPlans: 6,
        completedPlans: 8,
        overduePlans: 1,
        avgProgress: 78.5,
        weeklyNew: 3,
        upcomingDeadlines: 2
      }
    }
  } finally {
    loading.dashboard = false
  }
}

/**
 * 获取待办事项列表（初始加载）
 * @param {string} timeRange - 时间范围参数 (today, week, month, quarter, year)
 */
const getTodoList = async (timeRange = null) => {
  try {
    loading.todos = true
    todoCurrentPage.value = 1
    hasMoreTodos.value = true
    const params = {
      page: todoCurrentPage.value,
      limit: todoPageSize.value
    }
    if (timeRange) {
      params.timeRange = timeRange
    }
    const response = await api.get('/work-plan/dashboard/todos', { params })
    if (response.data?.success) {
      todoList.value = response.data.data || []
      displayedTodos.value = [...(response.data.data || [])]
      // 检查是否还有更多数据
      hasMoreTodos.value = (response.data.data || []).length === todoPageSize.value
    }
  } catch (error) {
    console.error('获取待办事项失败:', error)
    // 使用模拟数据
    const mockTodos = [
      {
        ID: 1,
        Title: '完成系统架构设计文档',
        Priority: 'high',
        WorkTypeName: '系统设计',
        EndDate: '2024-01-25',
        DaysRemaining: 2,
        Progress: 75
      },
      {
        ID: 2,
        Title: '用户界面原型设计',
        Priority: 'medium',
        WorkTypeName: 'UI设计',
        EndDate: '2024-01-28',
        DaysRemaining: 5,
        Progress: 45
      },
      {
        ID: 3,
        Title: '数据库性能优化',
        Priority: 'high',
        WorkTypeName: '数据库',
        EndDate: '2024-01-22',
        DaysRemaining: -1,
        Progress: 90
      },
      {
        ID: 4,
        Title: '前端组件开发',
        Priority: 'medium',
        WorkTypeName: '前端开发',
        EndDate: '2024-01-30',
        DaysRemaining: 7,
        Progress: 30
      },
      {
        ID: 5,
        Title: '接口文档编写',
        Priority: 'low',
        WorkTypeName: '文档',
        EndDate: '2024-02-01',
        DaysRemaining: 9,
        Progress: 15
      },
      {
        ID: 6,
        Title: '单元测试编写',
        Priority: 'high',
        WorkTypeName: '测试',
        EndDate: '2024-01-26',
        DaysRemaining: 3,
        Progress: 60
      },
      {
        ID: 7,
        Title: '代码审查',
        Priority: 'medium',
        WorkTypeName: '代码质量',
        EndDate: '2024-01-29',
        DaysRemaining: 6,
        Progress: 80
      },
      {
        ID: 8,
        Title: '部署脚本优化',
        Priority: 'low',
        WorkTypeName: '运维',
        EndDate: '2024-02-05',
        DaysRemaining: 13,
        Progress: 25
      }
    ]
    todoList.value = mockTodos
    displayedTodos.value = mockTodos.slice(0, todoPageSize.value)
    hasMoreTodos.value = mockTodos.length > todoPageSize.value
  } finally {
    loading.todos = false
  }
}

/**
 * 加载更多待办事项（无限滚动）
 */
const loadMoreTodos = async () => {
  if (todoLoading.value || !hasMoreTodos.value) return
  
  try {
    todoLoading.value = true
    todoCurrentPage.value++
    
    const params = {
      page: todoCurrentPage.value,
      limit: todoPageSize.value
    }
    
    const response = await api.get('/work-plan/dashboard/todos', { params })
    
    if (response.success) {
      const newTodos = response.data
      todoList.value = [...todoList.value, ...newTodos]
      displayedTodos.value = [...displayedTodos.value, ...newTodos]
      // 检查是否还有更多数据
      hasMoreTodos.value = newTodos.length === todoPageSize.value
    }
  } catch (error) {
    console.error('加载更多待办事项失败:', error)
    // 模拟加载更多数据
    const startIndex = (todoCurrentPage.value - 1) * todoPageSize.value
    const endIndex = startIndex + todoPageSize.value
    const allMockTodos = todoList.value
    
    if (startIndex < allMockTodos.length) {
      const newTodos = allMockTodos.slice(startIndex, endIndex)
      displayedTodos.value = [...displayedTodos.value, ...newTodos]
      hasMoreTodos.value = endIndex < allMockTodos.length
    } else {
      hasMoreTodos.value = false
    }
  } finally {
    todoLoading.value = false
  }
}

/**
 * 获取最近工作日志
 * @param {string} timeRange - 时间范围参数 (today, week, month, quarter, year)
 */
const getRecentLogs = async (timeRange = null) => {
  try {
    loading.logs = true
    currentPage.value = 1
    hasMoreLogs.value = true
    const params = {
      page: currentPage.value,
      limit: pageSize.value
    }
    if (timeRange) {
      params.timeRange = timeRange
    }
    const response = await api.get('/work-plan/dashboard/recent-logs', { params })
    if (response.success) {
      recentLogs.value = response.data.data || []
      displayedLogs.value = [...(response.data.data || [])]
      // 检查是否还有更多数据
      hasMoreLogs.value = (response.data.data || []).length === pageSize.value
    }
  } catch (error) {
    console.error('获取最近工作日志失败:', error)
    // 使用模拟数据
    const mockData = [
      {
        ID: 1,
        PlanTitle: '系统架构设计',
        Content: '完成了核心模块的架构设计，包括用户管理、权限控制和数据流设计',
        LogDate: '2024-01-20 14:30:00',
        WorkHours: 4,
        Progress: 75
      },
      {
        ID: 2,
        PlanTitle: 'UI界面设计',
        Content: '设计了主要页面的交互原型，包括登录页面、仪表盘和用户管理页面',
        LogDate: '2024-01-20 10:15:00',
        WorkHours: 3,
        Progress: 45
      },
      {
        ID: 3,
        PlanTitle: '数据库设计',
        Content: '完成了用户表、权限表和工作计划表的设计，建立了完整的数据关系',
        LogDate: '2024-01-19 16:20:00',
        WorkHours: 5,
        Progress: 90
      },
      {
        ID: 4,
        PlanTitle: '接口开发',
        Content: '开发了用户认证、权限验证和基础CRUD接口',
        LogDate: '2024-01-19 11:45:00',
        WorkHours: 6,
        Progress: 60
      },
      {
        ID: 5,
        PlanTitle: '前端组件开发',
        Content: '完成了通用表格组件、表单组件和弹窗组件的开发',
        LogDate: '2024-01-18 15:30:00',
        WorkHours: 4,
        Progress: 80
      }
    ]
    recentLogs.value = mockData
    displayedLogs.value = [...mockData]
    hasMoreLogs.value = false
  } finally {
    loading.logs = false
  }
}

/**
 * 获取通知公告列表
 * @param {string} timeRange - 时间范围参数 (today, week, month, quarter, year)
 */
const getNoticeList = async (timeRange = null) => {
  try {
    const params = {
      page: 1,
      size: 5, // 限制显示5条
      readStatus: '' // 显示所有通知
    }
    if (timeRange) {
      params.timeRange = timeRange
    }
    const response = await api.get('/notice', { params })
    if (response.success) {
      // 后端返回的数据结构是 { success: true, data: {...}, message: '...' }
      // 需要从 response.data.data 获取实际数据
      noticeList.value = response.data.data || []
    }
  } catch (error) {
    console.error('获取通知公告失败:', error)
    // 保持空数组，不使用模拟数据
    noticeList.value = []
  }
}

/**
 * 获取未读通知数量
 */
const getUnreadNoticeCount = async () => {
  try {
    const response = await api.get('/notice/unread/count')
    if (response.success) {
      // 这里可以用于更新全局未读数量状态
      return response.data || 0
    }
  } catch (error) {
    console.error('获取未读通知数量失败:', error)
    return 0
  }
}

/**
 * 查看通知详情（从工作台）
 * @param {Object} notice - 通知对象
 */
const viewNoticeFromDashboard = async (notice) => {
  try {
    // 如果是未读通知，先标记为已读
    if (!notice.IsRead) {
      await api.post(`/notice/${notice.ID}/read`)
      // 更新本地状态
      notice.IsRead = true
    }
    
    // 可以在这里添加显示通知详情的逻辑
    // 或者跳转到通知管理页面
    ElMessage({
      message: `查看通知：${notice.Title}`,
      type: 'info',
      duration: 2000
    })
  } catch (error) {
    console.error('查看通知失败:', error)
    ElMessage.error('查看通知失败')
  }
}

/**
 * 获取通知类型标签样式
 * @param {string} type - 通知类型
 * @returns {string} 标签类型
 */
const getNoticeTypeTag = (type) => {
  const typeMap = {
    'system': 'info',
    'announcement': 'success', 
    'urgent': 'danger',
    'maintenance': 'warning'
  }
  return typeMap[type] || 'info'
}

/**
 * 获取通知类型标签文本
 * @param {string} type - 通知类型
 * @returns {string} 标签文本
 */
const getNoticeTypeLabel = (type) => {
  const labelMap = {
    'system': '系统',
    'announcement': '公告',
    'urgent': '紧急',
    'maintenance': '维护'
  }
  return labelMap[type] || '通知'
}

/**
 * 格式化通知时间
 * @param {string} dateStr - 日期字符串
 * @returns {string} 格式化后的时间
 */
const formatNoticeTime = (dateStr) => {
  if (!dateStr) return ''
  
  const date = new Date(dateStr)
  const now = new Date()
  const diff = now - date
  
  // 小于1分钟
  if (diff < 60000) {
    return '刚刚'
  }
  // 小于1小时
  if (diff < 3600000) {
    return `${Math.floor(diff / 60000)}分钟前`
  }
  // 小于1天
  if (diff < 86400000) {
    return `${Math.floor(diff / 3600000)}小时前`
  }
  // 小于7天
  if (diff < 604800000) {
    return `${Math.floor(diff / 86400000)}天前`
  }
  // 超过7天显示具体日期
  return date.toLocaleDateString('zh-CN', {
    month: '2-digit',
    day: '2-digit'
  })
}

/**
 * 初始化ECharts柱状图
 */
const initBarChart = () => {
  if (!barChartRef.value) return
  
  // 销毁已存在的图表实例
  if (barChart) {
    barChart.dispose()
  }
  
  // 创建新的图表实例
  barChart = echarts.init(barChartRef.value)
  
  // 更新图表数据
  updateBarChart()
}

/**
 * 更新ECharts柱状图数据
 */
const updateBarChart = () => {
  // 严格的数据验证
  if (!barChart) {
    return   // barChart实例不存在，跳过更新
  }
  
  if (!dashboardData.value || !dashboardData.value.planStats) {
    return  // dashboardData.planStats不存在，跳过图表更新
  }
  
  const stats = dashboardData.value.planStats
  
  // 确保所有数值都是有效的数字
  const safeValue = (val) => {
    const num = Number(val)
    return isNaN(num) ? 0 : num
  }
  
  // 准备图表数据和配置
  const categories = ['进行中', '已完成', '已逾期']
  const values = [
    safeValue(stats.inProgressPlans),
    safeValue(stats.completedPlans), 
    safeValue(stats.overduePlans)
  ]
  
  // 定义每个柱子的颜色
  const colors = [
    new echarts.graphic.LinearGradient(0, 0, 1, 0, [
      { offset: 0, color: '#4A90E2' },
      { offset: 1, color: '#8EC1F7' }
    ]),
    new echarts.graphic.LinearGradient(0, 0, 1, 0, [
      { offset: 0, color: '#67C23A' },
      { offset: 1, color: '#95D475' }
    ]),
    new echarts.graphic.LinearGradient(0, 0, 1, 0, [
      { offset: 0, color: '#D0021B' },
      { offset: 1, color: '#F78B9B' }
    ])
  ]
  
  // 验证数据完整性
  const hasValidData = values.every(value => 
    typeof value === 'number' && !isNaN(value)
  )
  
  if (!hasValidData) {
    console.error('❌ ECharts数据验证失败，跳过更新')
    return
  }
  
  try {
    const option = {
      grid: {
        left: '0%',
        right: '0%',
        top: '20%',
        bottom: '25%'
      },
      xAxis: {
        type: 'category',
        data: categories,
        axisLine: {
          show: true,
          lineStyle: {
            color: '#e0e0e0'
          }
        },
        axisTick: {
          show: false
        },
        axisLabel: {
          color: '#666',
          fontSize: 12
        },
        splitLine: {
          show: true,
          lineStyle: {
            color: '#e0e0e0',
            type: 'dashed',
            width: 1
          }
        }
      },
      yAxis: {
        type: 'value',
        show: true,
        axisLine: {
          show: false
        },
        axisTick: {
          show: false
        },
        axisLabel: {
          show: false
        },
        splitLine: {
          show: false
        }
      },
      series: [{
        type: 'bar',
        data: values.map((value, index) => ({
          value: value,
          itemStyle: {
            color: colors[index]
          }
        })),
        barWidth: '40%',
        label: {
          show: true,
          position: 'top',
          formatter: '{c}项',
          color: '#333',
          fontFamily: 'Microsoft YaHei, Arial, sans-serif',
          fontSize: 12,
          fontWeight: 'normal'
        },
        emphasis: {
          itemStyle: {
            shadowBlur: 10,
            shadowColor: 'rgba(0, 0, 0, 0.3)'
          }
        }
      }]
    }
    
    barChart.setOption(option, true) // 使用notMerge=true确保完全替换
    console.log('✅ ECharts图表更新成功')
  } catch (error) {
    console.error('❌ ECharts setOption失败:', error)
  }
}

/**
 * 刷新所有数据
 */
const refreshData = async () => {
  // 获取当前选择的时间范围
  const timeRange = selectedTimeRange.value || null
  
  await Promise.all([
    getDashboardData(timeRange),
    getTodoList(timeRange),
    getRecentLogs(timeRange),
    getNoticeList(timeRange)
  ])
  
  // 数据更新后刷新图表
  await nextTick()
  updateBarChart()
}

/**
 * 处理时间范围变化
 */
const handleTimeRangeChange = (value) => {
  selectedTimeRange.value = value
  // 根据时间范围重新获取数据
  refreshDataByTimeRange()
}

/**
 * 根据时间范围刷新数据
 */
const refreshDataByTimeRange = async () => {
  try {
    loading.dashboard = true
    // 根据selectedTimeRange.value调用API并传递时间范围参数
    const timeRange = selectedTimeRange.value || null
    await Promise.all([
      getDashboardData(timeRange),
      getTodoList(timeRange),
      getRecentLogs(timeRange),
      getNoticeList(timeRange)
    ])
    
    // 数据更新后刷新图表
    await nextTick()
    updateBarChart()
  } catch (error) {
    console.error('刷新数据失败:', error)
  } finally {
    loading.dashboard = false
  }
}



/**
 * 计算圆环图百分比
 */
const getPercentage = (type) => {
  const stats = dashboardData.value.planStats
  if (!stats || !stats.totalPlans) return 0
  
  let value = 0
  switch (type) {
    case 'inProgress':
      value = stats.inProgressPlans || 0
      break
    case 'completed':
      value = stats.completedPlans || 0
      break
    case 'overdue':
      value = stats.overduePlans || 0
      break
  }
  
  return Math.round((value / stats.totalPlans) * 100)
}

/**
 * 获取进度条渐变色
 */
const getProgressColorGradient = (percentage) => {
  if (percentage >= 80) {
    return [{ color: '#67c23a', percentage: 100 }]
  } else if (percentage >= 60) {
    return [{ color: '#e6a23c', percentage: 100 }]
  } else if (percentage >= 40) {
    return [{ color: '#f56c6c', percentage: 100 }]
  } else {
    return [{ color: '#909399', percentage: 100 }]
  }
}

/**
 * 获取进度条状态
 * @param {number} percentage - 进度百分比
 * @returns {string} 进度条状态
 */
const getProgressStatus = (percentage) => {
  if (percentage === 100) {
    return 'success'
  } else if (percentage >= 80) {
    return 'warning'
  } else if (percentage >= 50) {
    return undefined // 默认状态
  } else {
    return 'exception'
  }
}

/**
 * 格式化紧急程度
 */
const formatUrgency = (daysRemaining) => {
  if (daysRemaining < 0) return '已逾期'
  if (daysRemaining === 0) return '今天到期'
  if (daysRemaining <= 3) return '紧急'
  if (daysRemaining <= 7) return '即将到期'
  return '正常'
}

/**
 * 获取紧急程度类型
 */
const getUrgencyType = (daysRemaining) => {
  if (daysRemaining < 0) return 'danger'
  if (daysRemaining <= 3) return 'warning'
  return 'info'
}

/**
 * 格式化日期
 */
const formatDate = (dateStr) => {
  const date = new Date(dateStr)
  return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })
}

/**
 * 计算并格式化剩余时间
 * @param {string} endDateStr - 结束日期字符串
 * @returns {string} 格式化的剩余时间字符串
 */
const formatRemainingTime = (endDateStr) => {
  // 依赖timeUpdateTrigger来触发重新计算
  timeUpdateTrigger.value
  
  if (!endDateStr) return '无截止时间'
  
  // 将date类型的截止日期设置为当天的23:59:59
  const endDate = new Date(endDateStr)
  endDate.setHours(23, 59, 59, 999)
  
  const now = new Date()
  const timeDiff = endDate.getTime() - now.getTime()
  
  // 如果已经过期
  if (timeDiff <= 0) {
    return '已逾期'
  }
  
  // 计算剩余的天、小时、分钟、秒
  const days = Math.floor(timeDiff / (1000 * 60 * 60 * 24))
  const hours = Math.floor((timeDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
  const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60))
  const seconds = Math.floor((timeDiff % (1000 * 60)) / 1000)
  
  // 格式化时间显示
  if (days > 0) {
    return `还剩余 ${days}天 ${hours.toString().padStart(2, '0')}时${minutes.toString().padStart(2, '0')}分${seconds.toString().padStart(2, '0')}秒`
  } else {
    return `还剩余 ${hours.toString().padStart(2, '0')}时${minutes.toString().padStart(2, '0')}分${seconds.toString().padStart(2, '0')}秒`
  }
}

/**
 * 格式化时间距离
 */
const formatTimeAgo = (dateStr) => {
  const date = new Date(dateStr)
  const now = new Date()
  const diff = now - date
  const hours = Math.floor(diff / (1000 * 60 * 60))
  const days = Math.floor(hours / 24)
  
  if (days > 0) return `${days}天前`
  if (hours > 0) return `${hours}小时前`
  return '刚刚'
}

/**
 * 判断是否为今天
 */
const isToday = (dateStr) => {
  const today = new Date()
  const date = new Date(dateStr)
  return today.toDateString() === date.toDateString()
}

/**
 * 获取活动类型
 */
const getActivityType = (log) => {
  if (log.Progress >= 100) return 'completed'
  if (log.Issues) return 'warning'
  return 'normal'
}

/**
 * 无限滚动加载更多日志
 */
const loadMoreLogs = async () => {
  if (timelineLoading.value || !hasMoreLogs.value) return
  
  try {
    timelineLoading.value = true
    currentPage.value++
    
    const params = {
      page: currentPage.value,
      limit: pageSize.value
    }
    
    // 添加时间范围参数
    const timeRange = selectedTimeRange.value || null
    if (timeRange) {
      params.timeRange = timeRange
    }
    
    const response = await api.get('/work-plan/dashboard/recent-logs', { params })
    
    if (response.success && response.data.length > 0) {
      displayedLogs.value.push(...response.data)
      hasMoreLogs.value = response.data.length === pageSize.value
    } else {
      hasMoreLogs.value = false
    }
  } catch (error) {
    console.error('加载更多日志失败:', error)
    hasMoreLogs.value = false
  } finally {
    timelineLoading.value = false
  }
}

/**
 * 格式化日志时间用于时间线显示
 */
const formatLogTime = (dateStr) => {
  const date = new Date(dateStr)
  const now = new Date()
  const diffTime = now - date
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))
  
  if (diffDays === 0) {
    return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
  } else if (diffDays === 1) {
    return '昨天 ' + date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
  } else if (diffDays < 7) {
    return `${diffDays}天前`
  } else {
    return date.toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' })
  }
}





/**
 * 获取进度标签类型
 */
const getProgressTagType = (progress) => {
  if (progress >= 100) return 'success'
  if (progress >= 80) return 'primary'
  if (progress >= 60) return 'warning'
  if (progress >= 40) return 'danger'
  return 'info'
}

/**
 * 获取进度样式类
 * @param {number} progress - 进度百分比
 * @returns {string} CSS类名
 */
const getProgressClass = (progress) => {
  if (progress >= 90) return 'progress-success'
  if (progress >= 70) return 'progress-warning'
  if (progress >= 50) return 'progress-info'
  return 'progress-danger'
}

/**
 * 获取进度颜色
 * @param {number} progress - 进度百分比
 * @returns {string} 颜色值
 */
const getProgressColor = (progress) => {
  if (progress >= 90) return '#67c23a'
  if (progress >= 70) return '#e6a23c'
  if (progress >= 50) return '#409eff'
  return '#f56c6c'
}

/**
 * 获取标签页计数
 * @param {string} tabName - 标签页名称
 * @returns {number} 该标签页的待办事项数量
 */
const getTabCount = (tabName) => {
  return getFilteredTodos(tabName).length
}

/**
 * 根据标签页过滤待办事项
 * @param {string} tabName - 标签页名称
 * @returns {Array} 过滤后的待办事项列表
 */
const getFilteredTodos = (tabName) => {
  switch (tabName) {
    case 'inProgress':
      return todoList.value.filter(todo => todo.Progress > 0 && todo.Progress < 100)
    case 'completed':
      return todoList.value.filter(todo => todo.Progress >= 100)
    case 'pending':
      return todoList.value.filter(todo => todo.Progress === 0)
    default:
      return todoList.value
  }
}

/**
 * 获取时间线图标
 * @param {Object} log - 工作日志对象
 * @returns {Component} 图标组件
 */
const getTimelineIcon = (log) => {
  // 根据工作时长或进度返回不同图标
  if (log.WorkHours >= 8) return MoreFilled
  if (log.Progress >= 80) return Check
  if (log.Progress >= 50) return Clock
  return Document
}

/**
 * 获取时间线类型
 * @param {Object} log - 工作日志对象
 * @returns {string} 时间线类型
 */
const getTimelineType = (log) => {
  if (log.Progress >= 80) return 'success'
  if (log.Progress >= 60) return 'warning'
  if (log.Progress >= 40) return 'primary'
  return 'info'
}

/**
 * 获取时间线颜色
 * @param {Object} log - 工作日志对象
 * @returns {string} 时间线节点颜色
 */
const getTimelineColor = (log) => {
  // 根据进度返回不同颜色
  if (log.Progress >= 100) return '#67c23a' // 绿色 - 已完成
  if (log.Progress >= 80) return '#409eff' // 蓝色 - 进展良好
  if (log.Progress >= 60) return '#e6a23c' // 橙色 - 进展中
  if (log.Progress >= 40) return '#f56c6c' // 红色 - 需关注
  if (log.WorkHours >= 8) return '#0bbd87' // 青色 - 高工时
  return '#909399' // 灰色 - 刚开始
}

/**
 * 获取时间线大小
 * @param {Object} log - 工作日志对象
 * @returns {string} 时间线节点大小
 */
const getTimelineSize = (log) => {
  // 重要记录使用大尺寸
  if (log.WorkHours >= 8 || log.Progress >= 80) return 'large'
  return 'normal'
}

/**
 * 获取时间线空心样式
 * @param {Object} log - 工作日志对象
 * @returns {boolean} 是否使用空心样式
 */
const getTimelineHollow = (log) => {
  // 进行中的任务使用空心样式
  return log.Progress > 0 && log.Progress < 100
}

/**
 * 截断文本
 */
const truncateText = (text, maxLength) => {
  if (!text) return ''
  return text.length > maxLength ? text.substring(0, maxLength) + '...' : text
}

/**
 * 创建新计划
 */
const createNewPlan = () => {
  showCreatePlanDialog.value = true
}

/**
 * 处理计划创建成功
 */
const handlePlanCreateSuccess = () => {
  // 刷新工作台数据
  refreshData()
  ElMessage.success('计划创建成功！')
}

/**
 * 添加工作记录
 */
const addWorkLog = () => {
  router.push('/admin/work-plan/logs/create')
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
 * 初始化通知自动滚动（水平向左滚动）
 */
const initNoticeAutoScroll = () => {
  if (!noticeScrollRef.value) return
  
  const scrollContainer = noticeScrollRef.value
  let scrollLeft = 0
  const scrollStep = 1 // 每次滚动的像素
  const scrollDelay = 30 // 滚动间隔（毫秒）
  const pauseTime = 1000 // 滚动到右端后的暂停时间（毫秒）
  
  const autoScroll = () => {
    if (!scrollContainer) return
    
    const maxScrollLeft = scrollContainer.scrollWidth - scrollContainer.clientWidth
    
    if (maxScrollLeft <= 0) {
      // 内容不足以滚动
      return
    }
    
    if (scrollLeft >= maxScrollLeft) {
      // 滚动到右端，短暂暂停后平滑重置到左端
      setTimeout(() => {
        scrollLeft = 0
        scrollContainer.scrollLeft = 0
      }, pauseTime)
    } else {
      scrollLeft += scrollStep
      scrollContainer.scrollLeft = scrollLeft
    }
  }
  
  // 启动自动滚动
  noticeScrollTimer = setInterval(autoScroll, scrollDelay)
  
  // 鼠标悬停时暂停滚动
  scrollContainer.addEventListener('mouseenter', () => {
    if (noticeScrollTimer) {
      clearInterval(noticeScrollTimer)
      noticeScrollTimer = null
    }
  })
  
  // 鼠标离开时恢复滚动
  scrollContainer.addEventListener('mouseleave', () => {
    if (!noticeScrollTimer) {
      noticeScrollTimer = setInterval(autoScroll, scrollDelay)
    }
  })
}

/**
 * 清理自动滚动定时器
 */
const clearNoticeAutoScroll = () => {
  if (noticeScrollTimer) {
    clearInterval(noticeScrollTimer)
    noticeScrollTimer = null
  }
}

/**
 * 窗口大小变化处理函数
 */
const handleResize = () => {
  if (barChart) {
    barChart.resize()
  }
}

// 组件挂载时获取数据
onMounted(async () => {
  // 获取用户信息
  try {
    await userStore.fetchProfile()
  } catch (error) {
    console.error('获取用户信息失败:', error)
  }
  
  // 初始化时间显示
  updateCurrentDateTime()
  // 启动时间更新定时器，每秒更新一次
  timeUpdateTimer = setInterval(() => {
    updateCurrentDateTime()
    // 更新剩余时间触发器，使待办事项的剩余时间实时更新
    timeUpdateTrigger.value++
  }, 1000)
  
  await refreshData()
  // 确保DOM渲染完成后初始化图表和自动滚动
  await nextTick()
  initBarChart()
  initNoticeAutoScroll()
  
  // 添加窗口大小变化监听器
  window.addEventListener('resize', handleResize)
})

// 组件卸载时清理定时器和监听器
onUnmounted(() => {
  clearNoticeAutoScroll()
  // 清理时间更新定时器
  if (timeUpdateTimer) {
    clearInterval(timeUpdateTimer)
    timeUpdateTimer = null
  }
  // 移除窗口大小变化监听器
  window.removeEventListener('resize', handleResize)
  // 销毁图表实例
  if (barChart) {
    barChart.dispose()
    barChart = null
  }
})
</script>

<style scoped>
* {
  margin: 0;
}

/* 仪表盘内容区域样式 */
.dashboard-content.el-card {
  background: #fff;
  margin-top: 8px;
  border: none;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
  border-radius: 12px;
}

/* 主要内容卡片样式 */
.main-content-card.el-card {
  margin-top: 24px;
  border: none;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
  border-radius: 12px;
}

/* 页面头部 */
.page-header {
  /* padding: 16px 24px; */
  color: #333;
  position: relative;
  overflow: hidden;
}

.page-header::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><pattern id="grain" width="100" height="100" patternUnits="userSpaceOnUse"><circle cx="50" cy="50" r="1" fill="%23ffffff" opacity="0.1"/></pattern></defs><rect width="100" height="100" fill="url(%23grain)"/></svg>') repeat;
  pointer-events: none;
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  position: relative;
  z-index: 1;
}

.header-left {
  flex: 1;
}

.page-title {
  display: flex;
  align-items: center;
  gap: 12px;
  margin: 0 0 6px 0;
  font-size: 24px;
  font-weight: 700;
  color: #333;
}

.title-icon {
  font-size: 28px;
  color: #f39c12;
}

/* 美化的欢迎词样式 */
.welcome-message {
  margin: 0;
  animation: fadeInUp 0.8s ease-out;
}
 
.welcome-line {
  margin: 0;
  display: flex;
  align-items: center;
  gap: 24px;
  font-size: 16px;
  font-weight: 500;
}

.greeting-section {
  display: flex;
  align-items: center;
  gap: 4px;
}

.greeting-emoji {
  font-size: 20px;
  animation: bounce 2s infinite;
  display: inline-block;
}

.greeting-words {
  color: #409eff;
  font-weight: normal;
  text-shadow: 0 1px 2px rgba(64, 158, 255, 0.1);
}

.user-name {
  color: #e6a23c;
  font-weight: normal;
  background: linear-gradient(45deg, #e6a23c, #f39c12);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.exclamation {
  color: #f56c6c;
  font-weight: normal;
  animation: pulse 1.5s ease-in-out infinite;
}

.date-section {
  color: #666;
  font-size: 13px;
  font-weight: 400;
  display: flex;
  align-items: center;
  gap: 6px;
  opacity: 0.9;
}

.calendar-icon {
  color: #909399;
  font-size: 14px;
}

.weekday-tag {
  margin-left: 8px;
  font-weight: 500;
  border-radius: 12px;
  animation: fadeInUp 0.6s ease-out;
}

/* 动画效果 */
@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes bounce {
  0%, 20%, 50%, 80%, 100% {
    transform: translateY(0);
  }
  40% {
    transform: translateY(-3px);
  }
  60% {
    transform: translateY(-2px);
  }
}

@keyframes pulse {
  0% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.1);
  }
  100% {
    transform: scale(1);
  }
}

.header-right {
  display: flex;
  align-items: center;
  gap: 24px;
}

.time-filter {
  display: flex;
  align-items: center;
  gap: 8px;
}

.filter-label {
  color: #666;
  font-size: 14px;
  font-weight: 500;
}

.time-select {
  width: 120px;
}

.quick-actions {
  display: flex;
  gap: 12px;
}

/* 图表容器样式 */
.charts-wrapper {
  margin-bottom: 10px;
}

.charts-card {
  height: 200px;
}

.chart-item {
  height: 100%;
  /*padding: 12px;*/
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
}

.bar-chart-item {
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: stretch;
  width: 100%;
}

.bar-chart-item .middle-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: space-around;
  gap: 2px;
  width: 100%;
  padding: 0;
}

.pie-chart-item {
  height: 100%;
  padding: 0;
  display: flex !important;
  flex-direction: row !important;
  justify-content: center;
  align-items: center;
}

.mx-1 {
  margin-left: 0.25rem;
}

/* 通知公告容器样式 */


/* 日历卡片样式 */
.calendar-card {
  height: 100%;
}

/* 保留原有的stat-card样式用于其他地方 */
.stat-card {
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  border-radius: 16px;
  padding: 16px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;
  max-height: 75px;
  display: flex;
  flex-direction: column;
}

.stat-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.15);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.card-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 18px;
  font-weight: 600;
  color: #2c3e50;
}

.card-icon {
  font-size: 20px;
  color: #667eea;
}

.filter-btn {
  color: #667eea;
  font-weight: 500;
}

/* 左卡片：完成情况 */
.left-card {
  width: 100%;
  overflow: hidden;
}

.completion-chart {
  height: 100%;
  padding: 12px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: stretch;
}

.completion-grid {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 1px;
  width: 100%;
  justify-content: space-around;
}

.completion-item {
  display: flex;
  align-items: center;
  gap: 10px;
  /* padding: 2px 0; */
  white-space: nowrap;
  overflow: visible;
}

.completion-progress {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
  min-width: 0;
}

.completion-progress .el-progress {
  flex: 1;
  min-width: 0;
}

.completion-progress {
  font-size: 14px;
  color: #2c3e50;
  font-weight: 600;
  min-width: 40px;
  flex-shrink: 0;
  white-space: nowrap;
}

/* 中部卡片：计划统计和柱形图 */
.middle-card {
  width: 100%;
  overflow: hidden;
  flex: 1;
  display: flex;
  flex-direction: column;
}

.middle-card .middle-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: space-around;
  gap: 6px;
  width: 100%;
  padding: 0 0 12px 0;
}

.stats-text {
  display: flex;
  justify-content: space-around;
  gap: 15px;
  white-space: nowrap;
}

.stats-tags {
  margin-bottom: 2px;
  white-space: nowrap;
  overflow: hidden;
  min-height: 24px;
}

.text-center {
  text-align: center;
}

.stat-text-item {
  text-align: center;
}

.stat-label {
  display: block;
  font-size: 12px;
  color: #7f8c8d;
  font-weight: 500;
  margin-bottom: 4px;
}

.stat-number {
  font-size: 24px;
  font-weight: 700;
  color: #2c3e50;
}

.stat-number.completed { color: #27ae60; }

.bar-chart {
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;
  overflow: hidden;
}

.echarts-container {
  width: 100%;
  height: 120px;
  min-width: 0;
}

/* 右卡片：圆环图 */
.right-card {
  width: 100%;
  overflow: hidden;
  flex: 1;
  display: flex;
  flex-direction: column;
}

.right-card .pie-charts {
  flex: 1;
  width: 100%;
  padding: 0;
  text-align: center;
  white-space: nowrap;
  overflow: hidden;
}

.pie-item {
  display: inline-block;
  vertical-align: top;
  margin: 0 8px;
  text-align: center;
}

.pie-center {
  text-align: center;
}

.pie-value {
  font-size: 12px;
  white-space: nowrap;  
}

.pie-label {
  font-size: 13px;
  text-align: center;
  display: block;
  max-width: 100%;
  margin-top: 5px;
}

/* 所有圆环进度条背景色设置 */
.pie-charts .pie-item :deep(.el-progress-circle__track) {
  stroke: #EBEEF5;
}



/* 主要内容区域 */
.content-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
}

.content-section {
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  border-radius: 16px;
  padding: 24px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding-bottom: 16px;
  border-bottom: 2px solid #ecf0f1;
}

.section-title {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: #2c3e50;
}

.todo-badge {
  margin-left: 8px;
}

.view-all-btn {
  color: #667eea;
  font-weight: 500;
}

/* 待办事项 */
.todo-container {
  overflow-y: auto;
}

/* 最近动态 */
.activity-container {
  overflow-y: auto;
}

.todo-list {
  list-style: none;
  margin: 0;
  padding: 0;
  height: 100%;
  overflow-y: auto;
  padding-right: 8px;
}

.todo-item {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 12px 0;
  border-bottom: 1px solid #ebeef5;
  cursor: pointer;
  transition: all 0.2s ease;
}

.todo-item:hover {
  background: #f5f7fa;
  padding-left: 8px;
  margin-left: -8px;
  margin-right: -8px;
}

.todo-item:last-child {
  border-bottom: none;
}

.todo-priority {
  width: 4px;
  height: 40px;
  border-radius: 2px;
  flex-shrink: 0;
  margin-top: 4px;
}

.loading-item,
.end-item {
  list-style: none;
  padding: 12px 0;
}

.priority-high { background: #e74c3c; }
.priority-medium { background: #f39c12; }
.priority-low { background: #27ae60; }

.todo-main {
  flex: 1;
  min-width: 0;
}

.todo-header {
  display: flex;
  justify-content: flex-start;
  align-items: flex-start;
  margin-bottom: 8px;
}

.title-badge {
  position: relative;
  display: inline-block;
}

/* 徽章文字样式 */
.title-badge :deep(.el-badge__content) {
  font-family: 'DengXian', '等线', sans-serif;
  font-size: 9px;
  line-height: 1;
}

.todo-title {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  color: #2c3e50;
  line-height: 1.4;
  padding-right: 8px;
}

/* 三栏响应式布局 */
.todo-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  font-size: 12px;
  color: #7f8c8d;
  gap: 8px;
}

.todo-meta-left {
  flex: 1;
  min-width: 0;
}

.todo-meta-center {
  flex: 1;
  text-align: left;
  min-width: 0;
}

.todo-meta-right {
  flex: 1;
  min-width: 0;
  text-align: right;
}

/* 进度条样式 */
.todo-progress-bar {
  width: 100%;
  max-width: 200px;
}

.todo-progress-bar :deep(.el-progress-bar__outer) {
  border-radius: 10px;
}

.todo-progress-bar :deep(.el-progress-bar__inner) {
  border-radius: 10px;
}

.todo-progress-bar :deep(.el-progress__text) {
  font-family: 'Arial', 'Helvetica', 'Times New Roman', sans-serif;
  font-size: 9px;
  font-weight: 600;
  color: white;
}

.todo-subtitle,
.todo-deadline {
  display: flex;
  align-items: center;
  gap: 4px;
}

.todo-meta-center .todo-deadline {
  justify-content: flex-start;
}

.todo-progress {
  display: flex;
  align-items: center;
  gap: 8px;
}

.progressbar-value{
  font-size: 12px;
  font-weight: 500;
  min-width: 35px;
}

/* 加载和空状态 */
.loading-state,
.empty-state {
  padding: 40px 20px;
  text-align: center;
}

/* 响应式设计 */
@media (max-width: 1200px) {
  .pie-item {
    margin: 0 8px;
  }
  
  .pie-item :deep(.el-progress-circle) {
    width: 65px !important;
    height: 65px !important;
  }
  
  .pie-label {
    font-size: 11px;
  }
}

@media (max-width: 1000px) {
  .pie-item {
    margin: 0 6px;
  }
  
  .pie-item :deep(.el-progress-circle) {
    width: 55px !important;
    height: 55px !important;
  }
  
  .pie-label {
    font-size: 10px;
  }
}

@media (max-width: 800px) {
  .pie-item {
    margin: 0 4px;
  }
  
  .pie-item :deep(.el-progress-circle) {
    width: 45px !important;
    height: 45px !important;
  }
  
  .pie-label {
    font-size: 9px;
  }
}

@media (max-width: 768px) {
  .modern-dashboard {
    padding: 10px;
  }
  
  .header-content {
    flex-direction: column;
    gap: 16px;
    text-align: center;
  }
  
  .header-right {
    flex-direction: column;
    gap: 16px;
  }
  
  .content-grid {
    display: flex;
    flex-direction: column;
  }
  
  .bars-container {
    height: 60px;
  }
  
  /* 待办事项响应式布局 */
  .todo-meta {
    flex-direction: column;
    gap: 4px;
    align-items: flex-start;
  }
  
  .todo-meta-center {
    text-align: left;
  }
  
  .todo-meta-center .todo-deadline {
    justify-content: flex-start;
  }
  
  .todo-meta-right {
    text-align: left;
    width: 100%;
  }
  
  .pie-charts {
    flex-direction: column;
    gap: 12px;
  }
  
  /* 移动端三栏布局调整 */
  .todo-meta {
    gap: 4px;
  }
  
  .todo-meta-left,
  .todo-meta-center,
  .todo-meta-right {
    font-size: 11px;
  }
  
  .todo-subtitle,
  .todo-deadline {
    gap: 2px;
  }
  
  .todo-progress-bar {
    width: 100%;
    min-width: 60px;
  }
}

@media (max-width: 480px) {
  .page-title {
    font-size: 24px;
  }
  
  .quick-actions {
    width: 100%;
    justify-content: center;
  }
  
  .stats-text {
    flex-direction: column;
    gap: 12px;
  }
  
  .bars-container {
    height: 50px;
  }
}

/* 滚动条样式 */
.todo-container::-webkit-scrollbar,
.activity-container::-webkit-scrollbar {
  width: 6px;
}

.todo-container::-webkit-scrollbar-track,
.activity-container::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 3px;
}

/* 日历卡片样式 */
.calendar-card {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.calendar-content {
  flex: 1;
  padding: 2px;
  overflow: hidden;
}

.dashboard-calendar {
  height: 100%;
}

.dashboard-calendar :deep(.el-calendar__header) {
  padding: 8px 0;
  border-bottom: 1px solid #ebeef5;
  text-align: center;
}

.dashboard-calendar :deep(.el-calendar__title) {
  font-size: 14px;
  font-weight: 600;
  color: #2c3e50;
  text-align: center;
  margin: 0 auto;
}

.dashboard-calendar :deep(.el-calendar__button-group) {
  display: none;
}

.dashboard-calendar :deep(.el-calendar__body) {
  padding: 4px 0;
}

.dashboard-calendar :deep(.el-calendar-table) {
  font-size: 14px;
}

.dashboard-calendar :deep(.el-calendar-table thead th) {
  padding: 0;
  font-weight: 600;
  color: white;
  background-color: #409EFF;
  border-bottom: 1px solid #ebeef5;
  width: 24px;
  height: 32px;
  text-align: center;
  vertical-align: middle;
  line-height: 24px;
}

.dashboard-calendar :deep(.el-calendar-table .el-calendar-day) {
  padding: 0;
  width: 24px;
  height: 28px;
  text-align: center;
  vertical-align: middle;
  display: flex;
  align-items: center;
  justify-content: center;
}

.dashboard-calendar :deep(.el-calendar-table td) {
  padding: 0;
  text-align: center;
  vertical-align: middle;
  border: none;
}

.calendar-day {
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 2px;
  font-size: 11px;
  transition: all 0.2s ease;
  margin: auto;
}

.calendar-day.is-today {
  background: #F56C6C;
  color: white;
  font-weight: 600;
}

/* 星期日的日期字体颜色为红色 */
.dashboard-calendar :deep(.el-calendar-table td:first-child .calendar-day) {
  color: #f56c6c;
  font-weight: 700;
}

.dashboard-calendar :deep(.el-calendar-table td:first-child .calendar-day.is-today) {
  background: #F56C6C;
  color: white;
}

/* 上下部分布局样式 */
.upper-section {
  margin-bottom: 20px;
}

/* 通知公告模块样式 */
.notice-card {
  display: flex;
  flex-direction: column;
}

.notice-card .el-col {
  height: 100%;
}

.notice-header {
  display: flex;
  align-items: center;
  justify-content: center;
  border-right: 1px solid #ebeef5;
  height: 100%;
}

.notice-title {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 8px;
  margin: 0;
  font-size: 15px;
  font-weight: 700;
  color: #1a1a1a;
  text-align: center;
  line-height: 1.3;
}

.notice-title .el-icon {
  color: #409eff;
  font-size: 24px;
}

.notice-title span {
  white-space: nowrap;
  color: #1a1a1a;
}

.notice-scroll {
  height: 100%;
  overflow-x: auto;
  overflow-y: hidden;
  white-space: nowrap;
  display: flex;
  align-items: center;
  scrollbar-width: none; /* Firefox */
  -ms-overflow-style: none; /* IE and Edge */
}

.notice-item {
  display: inline-flex;
  align-items: flex-start;
  gap: 12px;
  padding: 12px 20px;
  margin-right: 24px;
  background: transparent;
  transition: all 0.2s ease;
  flex-shrink: 0;
  min-width: 300px;
  cursor: pointer;
}

.notice-item:hover {
  background: rgba(64, 158, 255, 0.1);
  border-radius: 6px;
}

.notice-item.unread {
  background: rgba(255, 193, 7, 0.05);
  border-left: 3px solid #ffc107;
}

.notice-item.unread:hover {
  background: rgba(255, 193, 7, 0.15);
}

.notice-dot {
  width: 8px;
  height: 8px;
  background: #409eff;
  border-radius: 50%;
  flex-shrink: 0;
  margin-top: 6px;
}

.notice-dot.unread {
  background: #ffc107;
  box-shadow: 0 0 6px rgba(255, 193, 7, 0.5);
}

.notice-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.notice-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 4px;
}

.notice-text-wrapper {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
}

.notice-text {
  font-size: 15px;
  color: #2c3e50;
  line-height: 1.5;
  font-weight: 500;
}

.notice-text.unread {
  font-weight: 600;
  color: #1a1a1a;
}

.sticky-tag {
  margin-left: 4px;
}

.type-tag {
  margin-left: 4px;
}

.notice-content {
  font-size: 13px;
  color: #606266;
  line-height: 1.4;
 /* max-width: 250px;*/
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.notice-time {
  font-size: 12px;
  color: #909399;
  white-space: nowrap;
  margin-left: 20px;
  flex-shrink: 0;
}

/* 隐藏水平滚动条以获得更好的视觉效果 */
.notice-scroll::-webkit-scrollbar {
  display: none; /* Chrome, Safari and Opera */
}

.dashboard-calendar :deep(.el-calendar-table .el-calendar-day:hover .calendar-day) {
  background: #ecf5ff;
  color: #409eff;
}

.dashboard-calendar :deep(.el-calendar-table .el-calendar-day:hover .calendar-day.is-today) {
  background: #e85a5a;
  color: white;
}

.todo-container::-webkit-scrollbar-thumb,
.activity-container::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 3px;
}

.todo-container::-webkit-scrollbar-thumb:hover,
.activity-container::-webkit-scrollbar-thumb:hover {
  background: #a8a8a8;
}

/* 任务效率徽章样式 */
.item {
  display: inline-block;
  vertical-align: top;
  margin: -6px 0 0 4px;
  padding-top: 3px;
}
</style>