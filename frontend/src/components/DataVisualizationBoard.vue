<template>
  <div :class="['dashboard-screen', currentTheme === 'dark' ? 'dark-theme' : 'light-theme']">
    <!-- 顶部 Header -->
    <header class="screen-header">
      <!-- 左侧装饰线与时间 -->
      <div class="header-left-deco">
        <div class="deco-lines left-lines">
          <span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span>
        </div>
        <div class="deco-line-main"></div>
      </div>
      <div class="header-filters">
        <el-select v-model="queryMode" size="small" class="filter-mode" :popper-class="filterPopperClass" @change="handleQueryModeChange">
          <el-option v-for="item in queryModeOptions" :key="item.value" :label="item.label" :value="item.value" />
        </el-select>
        <el-date-picker
          v-if="queryMode === 'dateRange'"
          v-model="queryDateRange"
          type="daterange"
          size="small"
          class="filter-range"
          :popper-class="filterPopperClass"
          value-format="YYYY-MM-DD"
          range-separator="至"
          start-placeholder="开始日期"
          end-placeholder="结束日期"
          @change="applyDashboardQuery"
        />
        <el-date-picker
          v-else
          v-model="queryYearMonth"
          type="month"
          size="small"
          class="filter-month"
          :popper-class="filterPopperClass"
          value-format="YYYY-MM"
          placeholder="选择年月"
          @change="applyDashboardQuery"
        />
      </div>
      
      <!-- 中心标题 -->
      <div class="header-title-wrapper">
        <div class="company-title">{{ companyName }}</div>
        <h1 class="header-title">质量数据可视化看板</h1>
        <div class="title-bottom-glow"></div>
      </div>
      
      <!-- 右侧装饰线 -->
      <div class="header-right-deco">
        <div class="deco-line-main"></div>
        <div class="deco-lines right-lines">
          <span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span>
        </div>
      </div>
      <div class="time-container">
        <div class="time-text">{{ currentTimeOnly }}</div>
        <div class="date-row">
          <div class="header-action">
            <el-button class="header-btn" size="small" :icon="RefreshLeft" @click="refreshData" circle plain></el-button>
            <el-button class="header-btn" size="small" :icon="currentTheme === 'dark' ? Sunny : MoonNight" @click="toggleTheme" circle plain></el-button>
            <el-button class="header-btn" size="small" :icon="FullScreen" :title="isFullscreen ? '退出全屏' : '全屏'" @click="toggleFullscreen" circle plain></el-button>
          </div>
          <div class="date-text">{{ currentDateOnly }}</div>
        </div>
      </div>
    </header>

      <!-- 主体内容 -->
      <main class="screen-main">
        <!-- 顶部核心指标卡片 -->
        <section class="top-cards">
          <div class="kpi-card" v-for="(kpi, index) in kpiData" :key="index">
            <div class="card-corner top-left"></div>
            <div class="card-corner top-right"></div>
            <div class="card-corner bottom-left"></div>
            <div class="card-corner bottom-right"></div>
            <div class="kpi-title">
              <span>{{ kpi.title }}</span>
              <span class="kpi-period">{{ queryPeriodText }}</span>
              <el-tooltip :content="kpi.formula" placement="top" :effect="currentTheme === 'dark' ? 'dark' : 'light'">
                <span class="kpi-help-badge">?</span>
              </el-tooltip>
            </div>
            <div class="kpi-value" :style="{ color: kpi.color }"><span class="kpi-number">{{ kpi.value }}</span><span class="kpi-unit">{{ kpi.unit }}</span></div>
            <div class="kpi-trend" v-if="kpi.trend">
              同比上月
              <span :class="kpi.trend > 0 ? 'trend-up' : 'trend-down'">
                {{ kpi.trend > 0 ? '↑' : '↓' }} {{ Math.abs(kpi.trend) }}%
              </span>
            </div>
          </div>
        </section>

        <!-- 下方三列图表区 -->
        <section class="chart-layout">
          <!-- 左侧 -->
          <div class="chart-column left-column">
            <div class="chart-box">
              <div class="card-corner top-left"></div>
              <div class="card-corner top-right"></div>
              <div class="card-corner bottom-left"></div>
              <div class="card-corner bottom-right"></div>
              <div class="box-title">
                <el-icon class="title-icon"><PieChart /></el-icon>
                客户投诉类别占比
                <span class="box-period">{{ queryPeriodText }}</span>
              </div>
              <div class="chart-content" id="complaintCategoryChart"></div>
            </div>
            <div class="chart-box">
              <div class="card-corner top-left"></div>
              <div class="card-corner top-right"></div>
              <div class="card-corner bottom-left"></div>
              <div class="card-corner bottom-right"></div>
              <div class="box-title">
                <el-icon class="title-icon"><Histogram /></el-icon>
                内外部投诉趋势(%)
                <span class="box-period">{{ queryPeriodText }}</span>
                <div class="stage-switch">
                  <span :class="['stage-switch-btn', complaintTrendType === 'internal' ? 'active' : '']" @click="switchComplaintTrend('internal')">内诉</span>
                  <span :class="['stage-switch-btn', complaintTrendType === 'external' ? 'active' : '']" @click="switchComplaintTrend('external')">客诉</span>
                </div>
              </div>
              <div class="chart-content" id="discoveryStageChart"></div>
            </div>
            <div class="chart-box">
              <div class="card-corner top-left"></div>
              <div class="card-corner top-right"></div>
              <div class="card-corner bottom-left"></div>
              <div class="card-corner bottom-right"></div>
              <div class="box-title">
                <el-icon class="title-icon"><Warning /></el-icon>
                客户质量预警 TOP5
                <span class="box-period">{{ queryPeriodText }}</span>
              </div>
              <div class="chart-content" id="customerWarningChart"></div>
            </div>
          </div>

          <!-- 中间主图 -->
          <div class="chart-column center-column">
            <div class="chart-box main-chart-box metrics-chart-box">
              <div class="card-corner top-left"></div>
              <div class="card-corner top-right"></div>
              <div class="card-corner bottom-left"></div>
              <div class="card-corner bottom-right"></div>
              <div class="box-title">
                <el-icon class="title-icon"><TrendCharts /></el-icon>
                质量指标趋势分析
                <span class="box-period">{{ queryPeriodText }}</span>
              </div>
              <div class="chart-content" id="qualityMetricsTrendChart"></div>
            </div>
            <div class="chart-box metrics-table-box">
              <div class="card-corner top-left"></div>
              <div class="card-corner top-right"></div>
              <div class="card-corner bottom-left"></div>
              <div class="card-corner bottom-right"></div>
              <div class="box-title">
                <el-icon class="title-icon"><Histogram /></el-icon>
                数据清单
                <span class="box-period">{{ queryPeriodText }}</span>
              </div>
              <div class="chart-content metrics-table-wrap" ref="metricsTableWrapRef" @mouseenter="isMetricsHovering = true" @mouseleave="isMetricsHovering = false">
                <table class="metrics-table">
                  <thead>
                    <tr>
                      <th>月份</th>
                      <th>交检批次</th>
                      <th>发货批次</th>
                      <th>一次交检合格率</th>
                      <th>交货批次合格率</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="(item, index) in qualityMetricsData" :key="index">
                      <td>{{ item.MonthLabel }}</td>
                      <td>{{ item.InspectionBatches }}</td>
                      <td>{{ item.DeliveryBatches }}</td>
                      <td>{{ item.FirstPassRate }}%</td>
                      <td>{{ item.DeliveryPassRate }}%</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <!-- 右侧 -->
          <div class="chart-column right-column">
            <div class="chart-box">
              <div class="card-corner top-left"></div>
              <div class="card-corner top-right"></div>
              <div class="card-corner bottom-left"></div>
              <div class="card-corner bottom-right"></div>
              <div class="box-title">
                <el-icon class="title-icon"><DataLine /></el-icon>
                生产不良原因 Top 5
                <span class="box-period">{{ queryPeriodText }}</span>
              </div>
              <div class="chart-content" id="defectReasonChart"></div>
            </div>
            <div class="chart-box">
              <div class="card-corner top-left"></div>
              <div class="card-corner top-right"></div>
              <div class="card-corner bottom-left"></div>
              <div class="card-corner bottom-right"></div>
              <div class="box-title">
                <div style="display: flex; align-items: center; gap: 4px;">
                  <el-icon class="title-icon"><Connection /></el-icon>
                  部门质量责任分布
                  <span class="box-period">{{ queryPeriodText }}</span>
                  <el-tooltip
                    :effect="currentTheme === 'dark' ? 'dark' : 'light'"
                    placement="top-start"
                  >
                    <template #content>
                      <div style="max-width: 300px; line-height: 1.5; white-space: normal; word-break: break-all;">
                        {{ radarAnalysisText }}
                      </div>
                    </template>
                    <el-icon class="help-icon"><QuestionFilled /></el-icon>
                  </el-tooltip>
                </div>
                <div class="stage-switch">
                  <span :class="['stage-switch-btn', deptResponsibilityType === 'main' ? 'active' : '']" @click="switchDeptResponsibility('main')">部门</span>
                  <span :class="['stage-switch-btn', deptResponsibilityType === 'workshop' ? 'active' : '']" @click="switchDeptResponsibility('workshop')">车间</span>
                </div>
              </div>
              <div class="chart-content" id="deptResponsibilityChart"></div>
            </div>
            <div class="chart-box">
              <div class="card-corner top-left"></div>
              <div class="card-corner top-right"></div>
              <div class="card-corner bottom-left"></div>
              <div class="card-corner bottom-right"></div>
              <div class="box-title">
                <el-icon class="title-icon"><Bell /></el-icon>
                实时质量异常播报
                <span class="box-period">{{ queryPeriodText }}</span>
              </div>
              <div class="chart-content list-content">
                <!-- 表头 -->
                <div class="list-header">
                  <span class="col-time">日期</span>
                  <span class="col-desc">异常描述</span>
                  <span class="col-dept">责任车间</span>
                  <span class="col-status">责任人</span>
                </div>
                <div class="seamless-warp" ref="realtimeListRef" @mouseenter="isRealtimeHovering = true" @mouseleave="isRealtimeHovering = false">
                  <div class="list-item" v-for="(item, index) in realtimeRenderList" :key="`${index}-${item.date}-${item.dept}`">
                    <span class="col-time">{{ item.date }}</span>
                    <span class="col-desc text-ellipsis" :title="item.desc">{{ item.desc }}</span>
                    <span class="col-dept">{{ item.dept }}</span>
                    <span class="col-status">{{ item.status }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
import { RefreshLeft, PieChart, Histogram, Warning, TrendCharts, DataLine, Connection, Bell, MoonNight, Sunny, FullScreen } from '@element-plus/icons-vue'
import * as echarts from 'echarts'
import api from '@/services/api'

// --- 状态数据 ---
const currentTimeOnly = ref('')
const currentDateOnly = ref('')
const currentTheme = ref(localStorage.getItem('dataVisualizationTheme') === 'light' ? 'light' : 'dark')
const isFullscreen = ref(false)
const companyName = ref('')
const now = new Date()
const getCurrentYearRange = () => {
  const today = new Date()
  const year = today.getFullYear()
  const month = String(today.getMonth() + 1).padStart(2, '0')
  const day = String(today.getDate()).padStart(2, '0')
  return [`${year}-01-01`, `${year}-${month}-${day}`]
}
const queryMode = ref('yearMonth')
const queryModeOptions = [
  { label: '年月查询', value: 'yearMonth' },
  { label: '日期范围', value: 'dateRange' }
]
const filterPopperClass = computed(() => `dashboard-filter-popper dashboard-filter-popper-${currentTheme.value}`)
const queryDateRange = ref(getCurrentYearRange())
const queryYearMonth = ref(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`)
let timeTimer = null

// 顶部核心指标
const KPI_FORMULA = {
  qualityTargetAchievementRate: '计算逻辑 = (当月交检批次 - 当月内诉数) / 当月交检批次 × 100%',
  monthlyQualityLossAmount: '计算逻辑 = 当月 ComplaintRegister.TotalCost 汇总',
  incomingInspectionPassRate: '计算逻辑 = (当月交检批次 - 当月内诉数) / 当月交检批次 × 100%',
  pendingIssueCount: '计算逻辑 = 当月 ComplaintRegister 中 Disposition 为空的记录数'
}
const getKpiColors = () => currentTheme.value === 'dark'
  ? ['#22d3ee', '#f87171', '#4ade80', '#fbbf24']
  : ['#0284c7', '#dc2626', '#15803d', '#b45309']

const kpiData = ref([
  { title: '质量目标达成率', value: '98.5', unit: '%', color: getKpiColors()[0], trend: 1.2, formula: KPI_FORMULA.qualityTargetAchievementRate },
  { title: '质量损失总额', value: '25,430', unit: '¥', color: getKpiColors()[1], trend: -5.4, formula: KPI_FORMULA.monthlyQualityLossAmount },
  { title: '一次交检合格率', value: '99.2', unit: '%', color: getKpiColors()[2], trend: 0.8, formula: KPI_FORMULA.incomingInspectionPassRate },
  { title: '待处理异常/客诉', value: '12', unit: '件', color: getKpiColors()[3], trend: 0, formula: KPI_FORMULA.pendingIssueCount }
])

// 滚动列表数据
// 注意：该数据已由下方的 loadRealtimeIssues 方法从后端API动态获取，这里仅作为初始占位或结构说明，
// 后续若接口无数据也会由下方代码进行兜底填充。
// const abnormalList = ref([])
const qualityMetricsData = ref([])
const complaintTrendData = ref([])
const dashboardStats = ref(null)
const queryPeriodText = computed(() => {
  const period = dashboardStats.value?.period
  if (period?.startDate && period?.endDate) {
    return `${period.startDate}~${period.endDate}`
  }
  if (period?.year && period?.month) {
    return `${period.year}-${String(period.month).padStart(2, '0')}`
  }
  if (queryMode.value === 'dateRange' && Array.isArray(queryDateRange.value) && queryDateRange.value.length === 2) {
    return `${queryDateRange.value[0]}~${queryDateRange.value[1]}`
  }
  return queryYearMonth.value || ''
})
const UNIFIED_BAR_WIDTH = 16
const complaintTrendType = ref('internal')
const deptResponsibilityType = ref('workshop')
const radarAnalysisText = ref('正在分析数据...')
const realtimeListRef = ref(null)
const isRealtimeHovering = ref(false)
let realtimeScrollTimer = null
const metricsTableWrapRef = ref(null)
const isMetricsHovering = ref(false)
let metricsTableScrollTimer = null
const realtimeRenderList = computed(() => abnormalList.value.length > 1 ? [...abnormalList.value, ...abnormalList.value] : abnormalList.value)

// --- 图表实例与初始化 ---
const charts = {}
const getChartTooltip = (extra = {}) => ({
  backgroundColor: currentTheme.value === 'dark' ? 'rgba(15, 23, 42, 0.94)' : 'rgba(248, 250, 252, 0.96)',
  borderColor: currentTheme.value === 'dark' ? 'rgba(6, 182, 212, 0.45)' : 'rgba(37, 99, 235, 0.28)',
  borderWidth: 1,
  textStyle: {
    color: currentTheme.value === 'dark' ? '#e2e8f0' : '#0f172a'
  },
  ...extra
})
const getChartPalette = () => currentTheme.value === 'dark'
  ? {
      axisText: '#94a3b8',
      axisName: '#cbd5e1',
      legendText: '#e2e8f0',
      axisLine: '#334155',
      splitLine: 'rgba(148, 163, 184, 0.18)',
      splitLineLight: 'rgba(148, 163, 184, 0.16)'
    }
  : {
      axisText: '#334155',
      axisName: '#1e293b',
      legendText: '#0f172a',
      axisLine: '#94a3b8',
      splitLine: 'rgba(100, 116, 139, 0.22)',
      splitLineLight: 'rgba(100, 116, 139, 0.16)'
    }
const getSeriesPalette = () => currentTheme.value === 'dark'
  ? {
      radarLine: '#eab308',
      radarArea: 'rgba(234, 179, 8, 0.3)',
      radarSplit: ['rgba(238, 197, 102, 0.1)', 'rgba(238, 197, 102, 0.2)', 'rgba(238, 197, 102, 0.4)', 'rgba(238, 197, 102, 0.6)'],
      radarAxis: 'rgba(238, 197, 102, 0.5)',
      trendInternal: '#22d3ee',
      trendExternal: '#fb7185',
      trendAreaInternal: 'rgba(34, 211, 238, 0.22)',
      trendAreaExternal: 'rgba(251, 113, 133, 0.22)',
      trendAreaEnd: 'rgba(6, 182, 212, 0.02)',
      pointFill: 'rgba(34, 211, 238, 0.4)',
      pieColors: ['#3ba272', '#fc8452', '#9a60b4', '#ea7ccc', '#5470c6', '#73c0de', '#fac858', '#ee6666', '#91cc75'],
      customerBarStart: '#fb7185',
      customerBarEnd: 'rgba(251, 113, 133, 0.2)',
      metricBatchInspect: '#3b82f6',
      metricBatchDelivery: '#f97316',
      metricFirstPass: '#f59e0b',
      metricDeliveryPass: '#ef4444',
      metricFirstPassAreaStart: 'rgba(245, 158, 11, 0.14)',
      metricFirstPassAreaEnd: 'rgba(245, 158, 11, 0.02)',
      metricDeliveryPassAreaStart: 'rgba(239, 68, 68, 0.12)',
      metricDeliveryPassAreaEnd: 'rgba(239, 68, 68, 0.02)',
      defectBar: '#73d13d'
    }
  : {
      radarLine: '#2563eb',
      radarArea: 'rgba(37, 99, 235, 0.22)',
      radarSplit: ['rgba(37, 99, 235, 0.08)', 'rgba(37, 99, 235, 0.15)', 'rgba(37, 99, 235, 0.22)', 'rgba(37, 99, 235, 0.3)'],
      radarAxis: 'rgba(37, 99, 235, 0.35)',
      trendInternal: '#0284c7',
      trendExternal: '#e11d48',
      trendAreaInternal: 'rgba(2, 132, 199, 0.24)',
      trendAreaExternal: 'rgba(225, 29, 72, 0.22)',
      trendAreaEnd: 'rgba(37, 99, 235, 0.01)',
      pointFill: 'rgba(59, 130, 246, 0.25)',
      pieColors: ['#4f46e5', '#0891b2', '#16a34a', '#ea580c', '#db2777', '#0284c7', '#ca8a04', '#dc2626', '#0ea5e9'],
      customerBarStart: '#f43f5e',
      customerBarEnd: 'rgba(244, 63, 94, 0.16)',
      metricBatchInspect: '#2563eb',
      metricBatchDelivery: '#ea580c',
      metricFirstPass: '#ca8a04',
      metricDeliveryPass: '#dc2626',
      metricFirstPassAreaStart: 'rgba(202, 138, 4, 0.12)',
      metricFirstPassAreaEnd: 'rgba(202, 138, 4, 0.02)',
      metricDeliveryPassAreaStart: 'rgba(220, 38, 38, 0.1)',
      metricDeliveryPassAreaEnd: 'rgba(220, 38, 38, 0.02)',
      defectBar: '#16a34a'
    }

const renderDeptResponsibilityChart = () => {
  const palette = getChartPalette()
  const seriesPalette = getSeriesPalette()
  let deptRows = deptResponsibilityType.value === 'main'
    ? (dashboardStats.value?.departmentResponsibility?.main || [])
    : (dashboardStats.value?.departmentResponsibility?.workshop || [])
  
  if (!deptRows.length) {
    deptRows = [
      { Department: '生产一部', IssueCount: 60 },
      { Department: '生产二部', IssueCount: 45 },
      { Department: '包装部', IssueCount: 80 },
      { Department: '采购部', IssueCount: 30 },
      { Department: '仓储部', IssueCount: 20 },
      { Department: '研发部', IssueCount: 15 }
    ]
  }

  // 限制最多显示8个部门/车间，防止雷达图太拥挤
  const displayDeptRows = deptRows.slice(0, 8)

  // 动态生成雷达图解读文本
  if (displayDeptRows.length > 0) {
    // 数据已在后端按 IssueCount 降序排列，所以第一项即为最多
    const topDept = displayDeptRows[0]
    const totalIssues = displayDeptRows.reduce((sum, item) => sum + (item.IssueCount || 0), 0)
    const topRatio = totalIssues > 0 ? ((topDept.IssueCount / totalIssues) * 100).toFixed(1) : 0
    const typeName = deptResponsibilityType.value === 'main' ? '部门' : '车间'
    
    if (displayDeptRows.length >= 2) {
      const secondDept = displayDeptRows[1]
      radarAnalysisText.value = `本年度当前异常主要集中在【${topDept.Department}】，发生 ${topDept.IssueCount} 批次，占已统计${typeName}总异常的 ${topRatio}%；其次是【${secondDept.Department}】(${secondDept.IssueCount} 批次)。重点关注【${topDept.Department}】的质量管控。`
    } else {
      radarAnalysisText.value = `本年度当前所有异常均集中在【${topDept.Department}】，共计 ${topDept.IssueCount} 批次，请重点关注。`
    }
  } else {
    radarAnalysisText.value = '暂无部门责任数据分布'
  }

  const maxIssueCount = Math.max(...displayDeptRows.map(item => item.IssueCount || 0))
  const radarMax = maxIssueCount > 0 ? Math.ceil(maxIssueCount * 1.2) : 100

  const deptEl = document.getElementById('deptResponsibilityChart')
  if (deptEl) {
    if (!charts.dept) charts.dept = echarts.init(deptEl)
    charts.dept.setOption({
      tooltip: getChartTooltip({ trigger: 'item' }),
      radar: {
        indicator: displayDeptRows.map(item => ({
          name: item.Department || '未知',
          max: radarMax
        })),
        radius: '65%',
        splitNumber: 4,
        axisName: { color: palette.axisName },
        splitLine: { lineStyle: { color: seriesPalette.radarSplit } },
        splitArea: { show: false },
        axisLine: { lineStyle: { color: seriesPalette.radarAxis } }
      },
      series: [{
        name: '责任分布',
        type: 'radar',
        lineStyle: { color: seriesPalette.radarLine },
        data: [{ 
          value: displayDeptRows.map(item => item.IssueCount || 0), 
          name: '异常批次' 
        }],
        areaStyle: { color: seriesPalette.radarArea }
      }]
    }, true)
  }
}

const switchDeptResponsibility = (type) => {
  if (deptResponsibilityType.value === type) return
  deptResponsibilityType.value = type
  renderDeptResponsibilityChart()
}

const getComplaintTrendValue = (item, type) => {
  const numerator = type === 'internal' ? Number(item.InternalComplaints) || 0 : Number(item.CustomerComplaints) || 0
  const denominator = type === 'internal' ? Number(item.InspectionBatches) || 0 : Number(item.DeliveryBatches) || 0
  if (!denominator) return 0
  return Number(((numerator / denominator) * 100).toFixed(2))
}

const getRowMonth = (item) => {
  const monthByField = Number(item.StatMonth)
  if (!Number.isNaN(monthByField) && monthByField > 0) return monthByField
  const labelMatch = String(item.MonthLabel || '').match(/(\d{1,2})月/)
  if (labelMatch) return Number(labelMatch[1])
  return null
}

const renderComplaintTrendChart = (rows) => {
  const palette = getChartPalette()
  const seriesPalette = getSeriesPalette()
  const stageEl = document.getElementById('discoveryStageChart')
  if (!stageEl) return
  if (!charts.stage) charts.stage = echarts.init(stageEl)
  const isFewMonths = rows.length <= 3
  const months = rows.map(item => item.MonthLabel)
  const values = rows.map(item => getComplaintTrendValue(item, complaintTrendType.value))
  const seriesName = complaintTrendType.value === 'internal' ? '内诉趋势' : '客诉趋势'
  const seriesColor = complaintTrendType.value === 'internal' ? seriesPalette.trendInternal : seriesPalette.trendExternal
  charts.stage.setOption({
    tooltip: getChartTooltip({
      trigger: 'axis',
      formatter: (params) => `${params[0].axisValue}<br/>${seriesName}: ${params[0].value}%`
    }),
    grid: { left: isFewMonths ? '6%' : '4%', right: isFewMonths ? '6%' : '4%', bottom: '4%', top: '12%', containLabel: true },
    xAxis: { type: 'category', boundaryGap: true, data: months, axisLabel: { color: palette.axisText }, axisLine: { lineStyle: { color: palette.axisLine } } },
    yAxis: { type: 'value', name: '%', min: 0, axisLabel: { color: palette.axisText }, splitLine: { lineStyle: { color: palette.splitLine, type: 'dashed' } } },
    series: [{
      name: seriesName,
      type: 'line',
      smooth: true,
      showSymbol: true,
      symbol: 'circle',
      symbolSize: 9,
      lineStyle: { width: 3, color: seriesColor },
      itemStyle: { color: seriesColor, borderColor: seriesColor, borderWidth: 2 },
      areaStyle: { color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [{ offset: 0, color: complaintTrendType.value === 'internal' ? seriesPalette.trendAreaInternal : seriesPalette.trendAreaExternal }, { offset: 1, color: seriesPalette.trendAreaEnd }]) },
      data: values
    }]
  }, true)
}

const switchComplaintTrend = (type) => {
  if (complaintTrendType.value === type) return
  complaintTrendType.value = type
  renderComplaintTrendChart(complaintTrendData.value || [])
}

const initCharts = async () => {
  const palette = getChartPalette()
  const seriesPalette = getSeriesPalette()
  const now = new Date()
  const requestYear = dashboardStats.value?.period?.year || now.getFullYear()
  const defectiveData = dashboardStats.value?.defectiveCategories || { internal: [], external: [] }

  // 1. 客户投诉类别占比 (南丁格尔玫瑰图)
  let extPieData = defectiveData.external || []
  if (!extPieData.length) {
    extPieData = [
      { value: 1048, name: '外观不良' },
      { value: 735, name: '尺寸偏差' },
      { value: 580, name: '性能故障' },
      { value: 484, name: '包装错误' },
      { value: 300, name: '其他' }
    ]
  }

  const categoryEl = document.getElementById('complaintCategoryChart')
  if (categoryEl) {
    charts.category = echarts.init(categoryEl)
    
    // 当类别过多时，保留前8项，其余归为"其他"
    let displayPieData = [...extPieData]
    if (displayPieData.length > 8) {
      const top8 = displayPieData.slice(0, 8)
      const others = displayPieData.slice(8)
      const othersValue = others.reduce((sum, item) => sum + item.value, 0)
      if (othersValue > 0) {
        top8.push({ name: '其他', value: othersValue })
      }
      displayPieData = top8
    }

    charts.category.setOption({
      tooltip: getChartTooltip({ 
        trigger: 'item',
        formatter: '{b}: {c} ({d}%)'
      }),
      legend: {
        type: 'scroll',
        orient: 'vertical',
        right: 10,
        top: 20,
        bottom: 20,
        textStyle: { color: palette.axisText, fontSize: 11 },
        pageTextStyle: { color: palette.axisText },
        pageIconColor: '#06b6d4',
        pageIconInactiveColor: '#334155'
      },
      color: seriesPalette.pieColors,
      series: [{
        type: 'pie',
        roseType: 'area',
        radius: [25, '85%'], // 放大半径
        center: ['35%', '55%'],
        avoidLabelOverlap: true,
        itemStyle: {
          borderRadius: 4,
          borderColor: currentTheme.value === 'dark' ? '#1e293b' : 'transparent',
          borderWidth: currentTheme.value === 'dark' ? 2 : 0
        },
        label: { 
          show: true, 
          color: palette.legendText,
          formatter: '{d}%', // 仅显示百分比
          fontSize: 10, // 稍微缩小字号以防互相遮挡
          distanceToLabelLine: 2 // 让文字更贴近牵引线
        },
        labelLine: { 
          show: true,
          lineStyle: { color: palette.axisText },
          length: 5,
          length2: 5 // 进一步缩短牵引线，腾出更多空间给图形
        },
        data: displayPieData
      }]
    })
  }

  // 2. 客户质量预警 TOP5 (横向柱状图)
  let customerTop5Rows = dashboardStats.value?.customerWarningTop5 || []
  // 如果没有数据，使用兜底数据保持视觉不空
  if (!customerTop5Rows.length) {
    customerTop5Rows = [
      { Customer: '客户A', ComplaintCount: 12 },
      { Customer: '客户B', ComplaintCount: 8 },
      { Customer: '客户C', ComplaintCount: 6 },
      { Customer: '客户D', ComplaintCount: 4 },
      { Customer: '客户E', ComplaintCount: 2 }
    ]
  }
  // 横向柱状图从下到上绘制，需要反转数据数组
  const reversedTop5 = [...customerTop5Rows].reverse()

  const customerWarningEl = document.getElementById('customerWarningChart')
  if (customerWarningEl) {
    charts.customerWarning = echarts.init(customerWarningEl)
    charts.customerWarning.setOption({
      tooltip: getChartTooltip({ trigger: 'axis' }),
      grid: { left: '3%', right: '10%', bottom: '3%', top: '10%', containLabel: true },
      xAxis: { type: 'value', show: false },
      yAxis: { type: 'category', data: reversedTop5.map(item => item.Customer || '未知客户'), axisLabel: { color: palette.axisText }, axisLine: { show: false }, axisTick: { show: false } },
      series: [{
        type: 'bar',
        barWidth: UNIFIED_BAR_WIDTH,
        barMaxWidth: UNIFIED_BAR_WIDTH,
        label: { show: true, position: 'right', color: seriesPalette.customerBarStart },
        itemStyle: { 
          borderRadius: [0, 8, 8, 0],
          color: new echarts.graphic.LinearGradient(1, 0, 0, 0, [
            { offset: 0, color: seriesPalette.customerBarStart },
            { offset: 1, color: seriesPalette.customerBarEnd }
          ])
        },
        data: reversedTop5.map(item => item.ComplaintCount || 0)
      }]
    })
  }

  const periodInfo = dashboardStats.value?.period || {}
  const isDateRangeMode = periodInfo.queryMode === 'dateRange'
  const currentMonth = periodInfo.month || (new Date().getMonth() + 1)
  let trendRows = dashboardStats.value?.trendRows || []
  let complaintRows = dashboardStats.value?.monthlyComplaints || []
  if (!trendRows.length) {
    trendRows = [
      { MonthLabel: '1月', InspectionBatches: 120, DeliveryBatches: 110, InternalComplaints: 5, CustomerComplaints: 2, FirstPassRate: 96.2, DeliveryPassRate: 98.1 },
      { MonthLabel: '2月', InspectionBatches: 128, DeliveryBatches: 118, InternalComplaints: 6, CustomerComplaints: 3, FirstPassRate: 95.8, DeliveryPassRate: 97.6 },
      { MonthLabel: '3月', InspectionBatches: 132, DeliveryBatches: 123, InternalComplaints: 4, CustomerComplaints: 2, FirstPassRate: 97.1, DeliveryPassRate: 98.4 },
      { MonthLabel: '4月', InspectionBatches: 125, DeliveryBatches: 119, InternalComplaints: 5, CustomerComplaints: 3, FirstPassRate: 96.4, DeliveryPassRate: 97.9 },
      { MonthLabel: '5月', InspectionBatches: 138, DeliveryBatches: 129, InternalComplaints: 3, CustomerComplaints: 2, FirstPassRate: 97.6, DeliveryPassRate: 98.7 },
      { MonthLabel: '6月', InspectionBatches: 142, DeliveryBatches: 133, InternalComplaints: 3, CustomerComplaints: 1, FirstPassRate: 98.0, DeliveryPassRate: 99.0 }
    ]
  }
  const complaintMap = new Map(
    complaintRows.map(item => {
      const month = getRowMonth(item)
      const year = Number(item.StatYear) || requestYear
      return [`${year}-${month}`, item]
    })
  )
  const mergedTrendRows = trendRows.map(item => {
    const month = getRowMonth(item)
    const year = Number(item.StatYear) || requestYear
    const key = `${year}-${month}`
    const complaintItem = complaintMap.get(key)
    return {
      ...item,
      StatYear: year,
      StatMonth: month,
      InternalComplaints: complaintItem ? Number(complaintItem.InternalComplaints) || 0 : Number(item.InternalComplaints) || 0,
      CustomerComplaints: complaintItem ? Number(complaintItem.CustomerComplaints) || 0 : Number(item.CustomerComplaints) || 0
    }
  })
  const trendMap = new Map(
    mergedTrendRows.map(item => [`${item.StatYear}-${item.StatMonth}`, item])
  )
  const monthlyComplaintRows = complaintRows
    .map(item => {
      const month = getRowMonth(item)
      const year = Number(item.StatYear) || requestYear
      const trendItem = trendMap.get(`${year}-${month}`) || {}
      return {
        StatYear: year,
        StatMonth: month,
        MonthLabel: isDateRangeMode ? `${String(year).slice(-2)}-${String(month).padStart(2, '0')}` : `${month}月`,
        InspectionBatches: Number(trendItem.InspectionBatches) || 0,
        DeliveryBatches: Number(trendItem.DeliveryBatches) || 0,
        InternalComplaints: Number(item.InternalComplaints) || 0,
        CustomerComplaints: Number(item.CustomerComplaints) || 0
      }
    })
    .filter(item => item.StatMonth && (isDateRangeMode || (item.StatYear === requestYear && item.StatMonth <= currentMonth)))
    .sort((a, b) => (a.StatYear - b.StatYear) || (a.StatMonth - b.StatMonth))
  complaintTrendData.value = monthlyComplaintRows
  const hasMonthInfo = mergedTrendRows.some(item => item.StatMonth !== null && item.StatMonth !== undefined)
  const finalTrendRows = hasMonthInfo
    ? mergedTrendRows
      .filter(item => isDateRangeMode || Number(item.StatMonth) <= currentMonth)
      .map(item => ({
        ...item,
        MonthLabel: isDateRangeMode
          ? `${String(item.StatYear).slice(-2)}-${String(item.StatMonth).padStart(2, '0')}`
          : (item.MonthLabel || `${item.StatMonth}月`)
      }))
      .sort((a, b) => (Number(a.StatYear) - Number(b.StatYear)) || (Number(a.StatMonth) - Number(b.StatMonth)))
    : mergedTrendRows.slice(0, currentMonth)
  qualityMetricsData.value = finalTrendRows
  nextTick(() => {
    restartMetricsTableScroll()
  })
  renderComplaintTrendChart(monthlyComplaintRows)
  const metricsEl = document.getElementById('qualityMetricsTrendChart')
  if (metricsEl) {
    charts.metricsTrend = echarts.init(metricsEl)
    const isFewMonths = finalTrendRows.length <= 3
    const updateMetricsGridByLegend = (selected = {}) => {
      const hasBatch = selected['交检批次'] !== false || selected['发货批次'] !== false
      const hasRate = selected['一次交检合格率'] !== false || selected['交货批次合格率'] !== false
      charts.metricsTrend.setOption({
        yAxis: [
          { splitLine: { show: hasBatch, lineStyle: { color: palette.splitLine, type: 'dashed' } } },
          { splitLine: { show: !hasBatch && hasRate, lineStyle: { color: palette.splitLineLight, type: 'dashed' } } }
        ]
      })
    }
    charts.metricsTrend.setOption({
      tooltip: getChartTooltip({ trigger: 'axis', axisPointer: { type: 'cross' } }),
      legend: { data: ['交检批次', '发货批次', '一次交检合格率', '交货批次合格率'], textStyle: { color: palette.legendText }, top: 0 },
      grid: { left: isFewMonths ? '6%' : '4%', right: isFewMonths ? '6%' : '4%', bottom: '5%', top: '15%', containLabel: true },
      xAxis: [{ type: 'category', boundaryGap: true, data: finalTrendRows.map(item => item.MonthLabel), axisLabel: { color: palette.axisText } }],
      yAxis: [
        { type: 'value', name: '批次', axisLabel: { color: palette.axisText }, splitLine: { show: true, lineStyle: { color: palette.splitLine, type: 'dashed' } } },
        { type: 'value', name: '合格率(%)', min: 80, max: 100, axisLabel: { color: palette.axisText }, splitLine: { show: false, lineStyle: { color: palette.splitLineLight, type: 'dashed' } } }
      ],
      series: [
        { name: '交检批次', type: 'bar', barWidth: UNIFIED_BAR_WIDTH + 6, barMaxWidth: UNIFIED_BAR_WIDTH + 6, barCategoryGap: '52%', z: 2, itemStyle: { color: seriesPalette.metricBatchInspect, borderRadius: [9, 9, 0, 0] }, data: finalTrendRows.map(item => Number(item.InspectionBatches) || 0) },
        { name: '发货批次', type: 'bar', barWidth: Math.max(UNIFIED_BAR_WIDTH - 4, 10), barMaxWidth: Math.max(UNIFIED_BAR_WIDTH - 4, 10), barCategoryGap: '52%', barGap: '-100%', z: 3, itemStyle: { color: seriesPalette.metricBatchDelivery, borderColor: seriesPalette.metricBatchDelivery, borderWidth: 1, borderRadius: [7, 7, 0, 0], opacity: 0.95 }, data: finalTrendRows.map(item => Number(item.DeliveryBatches) || 0) },
        { name: '一次交检合格率', type: 'line', yAxisIndex: 1, smooth: true, showSymbol: true, symbol: 'circle', symbolSize: 11, lineStyle: { width: 3, color: seriesPalette.metricFirstPass }, itemStyle: { color: seriesPalette.metricFirstPass, borderColor: seriesPalette.metricFirstPass, borderWidth: 2 }, areaStyle: { color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [{ offset: 0, color: seriesPalette.metricFirstPassAreaStart }, { offset: 1, color: seriesPalette.metricFirstPassAreaEnd }]) }, data: finalTrendRows.map(item => Number(item.FirstPassRate) || 0) },
        { name: '交货批次合格率', type: 'line', yAxisIndex: 1, smooth: true, showSymbol: true, symbol: 'circle', symbolSize: 11, lineStyle: { width: 3, color: seriesPalette.metricDeliveryPass }, itemStyle: { color: seriesPalette.metricDeliveryPass, borderColor: seriesPalette.metricDeliveryPass, borderWidth: 2 }, areaStyle: { color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [{ offset: 0, color: seriesPalette.metricDeliveryPassAreaStart }, { offset: 1, color: seriesPalette.metricDeliveryPassAreaEnd }]) }, data: finalTrendRows.map(item => Number(item.DeliveryPassRate) || 0) }
      ]
    })
    charts.metricsTrend.off('legendselectchanged')
    charts.metricsTrend.on('legendselectchanged', (params) => {
      updateMetricsGridByLegend(params.selected || {})
    })
    updateMetricsGridByLegend()
  }

  // 5. 生产不良原因 Top 5 (帕累托图/柱状图) - 取内诉占比前5名
  let internalDefects = defectiveData.internal || []
  if (!internalDefects.length) {
    internalDefects = [
      { name: '机器故障', value: 150 },
      { name: '操作不当', value: 120 },
      { name: '物料不良', value: 85 },
      { name: '参数设置', value: 45 },
      { name: '环境因素', value: 20 }
    ]
  }
  const top5Internal = internalDefects.slice(0, 5)

  const defectEl = document.getElementById('defectReasonChart')
  if (defectEl) {
    charts.defect = echarts.init(defectEl)
    charts.defect.setOption({
      tooltip: getChartTooltip({ trigger: 'axis' }),
      grid: { left: '3%', right: '4%', bottom: '3%', top: '15%', containLabel: true },
      xAxis: { type: 'category', data: top5Internal.map(item => item.name || '未知原因'), axisLabel: { color: palette.axisText, interval: 0, rotate: 30 } },
      yAxis: { type: 'value', splitLine: { lineStyle: { color: palette.splitLine, type: 'dashed' } }, axisLabel: { color: palette.axisText } },
      series: [{
        type: 'bar',
        barWidth: UNIFIED_BAR_WIDTH,
        barMaxWidth: UNIFIED_BAR_WIDTH,
        itemStyle: { color: seriesPalette.defectBar, borderRadius: [8, 8, 0, 0] },
        data: top5Internal.map(item => item.value || 0)
      }]
    })
  }

  // 6. 部门质量责任分布 (雷达图)
  renderDeptResponsibilityChart()
}

const resizeCharts = () => {
  Object.values(charts).forEach(chart => {
    if (chart) chart.resize()
  })
}

// --- 业务逻辑 ---
const updateTime = () => {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const date = String(now.getDate()).padStart(2, '0')
  const hours = String(now.getHours()).padStart(2, '0')
  const minutes = String(now.getMinutes()).padStart(2, '0')
  const seconds = String(now.getSeconds()).padStart(2, '0')
  
  currentDateOnly.value = `${year}/${month}/${date}`
  currentTimeOnly.value = `${hours}:${minutes}:${seconds}`
}

const refreshData = () => {
  loadDashboardStatistics()
}

const toggleTheme = () => {
  currentTheme.value = currentTheme.value === 'dark' ? 'light' : 'dark'
}

const applyDashboardQuery = () => {
  loadDashboardStatistics()
}

const handleQueryModeChange = (mode) => {
  if (mode === 'dateRange') {
    queryDateRange.value = getCurrentYearRange()
    queryYearMonth.value = ''
  } else {
    if (!queryYearMonth.value) {
      const d = new Date()
      queryYearMonth.value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    }
    queryDateRange.value = []
  }
  applyDashboardQuery()
}

const toggleFullscreen = async () => {
  try {
    if (!document.fullscreenElement) {
      await document.documentElement.requestFullscreen()
    } else {
      await document.exitFullscreen()
    }
  } catch (error) {
    console.error('全屏切换失败', error)
  }
}

const syncFullscreenState = () => {
  isFullscreen.value = Boolean(document.fullscreenElement)
  nextTick(() => {
    resizeCharts()
  })
}

const formatAmount = (val) => {
  const n = Number(val) || 0
  return n.toLocaleString('zh-CN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })
}

const loadKpiCards = async () => {
  const kpiColors = getKpiColors()
  const kpi = dashboardStats.value?.kpi
  if (!kpi) return
  kpiData.value = [
    {
      title: '质量目标达成率',
      value: Number(kpi.qualityTargetAchievementRate || 0).toFixed(2),
      unit: '%',
      color: kpiColors[0],
      trend: Number(kpi.qualityTargetAchievementTrend || 0),
      formula: KPI_FORMULA.qualityTargetAchievementRate
    },
    {
      title: '质量损失总额',
      value: formatAmount(kpi.monthlyQualityLossAmount),
      unit: '¥',
      color: kpiColors[1],
      trend: Number(kpi.monthlyQualityLossTrend || 0),
      formula: KPI_FORMULA.monthlyQualityLossAmount
    },
    {
      title: '一次交检合格率',
      value: Number(kpi.incomingInspectionPassRate || 0).toFixed(2),
      unit: '%',
      color: kpiColors[2],
      trend: Number(kpi.incomingInspectionPassTrend || 0),
      formula: KPI_FORMULA.incomingInspectionPassRate
    },
    {
      title: '待处理异常/客诉',
      value: String(Number(kpi.pendingIssueCount || 0)),
      unit: '件',
      color: kpiColors[3],
      trend: Number(kpi.pendingIssueTrend || 0),
      formula: KPI_FORMULA.pendingIssueCount
    }
  ]
}

const loadCompanyName = async () => {
  companyName.value = dashboardStats.value?.siteConfig?.companyName || 'DMS质量管理系统'
}

// 实时异常播报数据
const abnormalList = ref([])

const loadRealtimeIssues = async () => {
  const rows = dashboardStats.value?.realtimeIssues || []
  if (rows.length > 0) {
    abnormalList.value = rows.map(item => {
      const d = new Date(item.Date)
      const dateStr = `${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
      return {
        date: dateStr,
        desc: item.DefectiveDescription || '未填写异常描述',
        dept: item.Workshop || '未填写车间',
        status: item.MainPerson || '未填写责任人'
      }
    })
    nextTick(() => {
      restartRealtimeScroll()
    })
    return
  }

  abnormalList.value = [
    { date: '10-24', desc: '印刷偏色，批次判退', dept: '数码印刷', status: '张三' },
    { date: '10-24', desc: '模切尺寸超差', dept: '模切', status: '李四' },
    { date: '10-23', desc: '外箱破损导致退货', dept: '包装', status: '王五' },
    { date: '10-23', desc: '标签错贴', dept: '轮转机', status: '赵六' },
    { date: '10-22', desc: '来料纸张克重异常', dept: '工程', status: '钱七' }
  ]
  nextTick(() => {
    restartRealtimeScroll()
  })
}

const loadDashboardStatistics = async () => {
  try {
    const params = { queryMode: queryMode.value }
    if (queryMode.value === 'dateRange') {
      const fallbackRange = getCurrentYearRange()
      const [startDate, endDate] = Array.isArray(queryDateRange.value) && queryDateRange.value.length === 2 ? queryDateRange.value : fallbackRange
      const end = new Date(endDate)
      params.startDate = startDate
      params.endDate = endDate
      params.year = end.getFullYear()
      params.month = end.getMonth() + 1
    } else {
      const [yearMonthYear, yearMonthMonth] = (queryYearMonth.value || '').split('-')
      const selectedYear = Number(yearMonthYear) || new Date().getFullYear()
      const selectedMonth = Number(yearMonthMonth) || (new Date().getMonth() + 1)
      params.year = selectedYear
      params.month = selectedMonth
      params.yearMonth = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}`
    }
    const res = await api.get('/dashboard/statistics', {
      params
    })
    if (res.data.success && res.data.data) {
      dashboardStats.value = res.data.data
    } else {
      dashboardStats.value = null
    }
  } catch (error) {
    console.error('获取看板聚合统计失败', error)
    dashboardStats.value = null
  }
  loadCompanyName()
  loadKpiCards()
  loadRealtimeIssues()
  initCharts()
}

const restartRealtimeScroll = () => {
  if (realtimeScrollTimer) {
    clearInterval(realtimeScrollTimer)
    realtimeScrollTimer = null
  }
  const el = realtimeListRef.value
  if (!el) return
  el.scrollTop = 0
  if (abnormalList.value.length <= 1) return
  realtimeScrollTimer = setInterval(() => {
    if (isRealtimeHovering.value) return
    if (!realtimeListRef.value) return
    const halfHeight = realtimeListRef.value.scrollHeight / 2
    if (halfHeight <= 0) return
    if (realtimeListRef.value.scrollTop >= halfHeight) {
      realtimeListRef.value.scrollTop = 0
    } else {
      realtimeListRef.value.scrollTop += 1
    }
  }, 35)
}

const restartMetricsTableScroll = () => {
  if (metricsTableScrollTimer) {
    clearInterval(metricsTableScrollTimer)
    metricsTableScrollTimer = null
  }
  const el = metricsTableWrapRef.value
  if (!el) return
  el.scrollTop = 0
  if (el.scrollHeight <= el.clientHeight + 2) return
  metricsTableScrollTimer = setInterval(() => {
    if (isMetricsHovering.value) return
    const wrap = metricsTableWrapRef.value
    if (!wrap) return
    const maxScrollTop = wrap.scrollHeight - wrap.clientHeight
    if (maxScrollTop <= 0) return
    if (wrap.scrollTop >= maxScrollTop) {
      wrap.scrollTop = 0
    } else {
      wrap.scrollTop += 1
    }
  }, 45)
}

// 生命周期
onMounted(() => {
  updateTime()
  timeTimer = setInterval(updateTime, 1000)

  nextTick(() => {
    loadDashboardStatistics()
    window.addEventListener('resize', resizeCharts)
    document.addEventListener('fullscreenchange', syncFullscreenState)
  })
})

watch(currentTheme, () => {
  localStorage.setItem('dataVisualizationTheme', currentTheme.value)
  loadKpiCards()
  nextTick(() => {
    initCharts()
  })
})

watch(queryDateRange, (newRange, oldRange) => {
  if (queryMode.value !== 'dateRange') return
  if (!Array.isArray(newRange) || newRange.length !== 2) return
  if (Array.isArray(oldRange) && oldRange[0] === newRange[0] && oldRange[1] === newRange[1]) return
  loadDashboardStatistics()
})

onUnmounted(() => {
  clearInterval(timeTimer)
  clearInterval(realtimeScrollTimer)
  clearInterval(metricsTableScrollTimer)
  window.removeEventListener('resize', resizeCharts)
  document.removeEventListener('fullscreenchange', syncFullscreenState)

  // 销毁图表
  Object.values(charts).forEach(chart => {
    if (chart) chart.dispose()
  })
})
</script>

<style scoped>
/* 科技深色主题变量 */
.dark-theme {
  --bg-dark: #0f172a;
  --bg-card: #1e293b;
  --text-main: #f8fafc;
  --text-sub: #94a3b8;
  --border-color: #334155;
  --brand-blue: #3b82f6;
  --brand-cyan: #06b6d4;
  --card-bg: rgba(30, 41, 59, 0.6);
  --card-glow-1: rgba(34, 211, 238, 0.28);
  --card-glow-2: rgba(6, 182, 212, 0.32);
  --card-glow-3: rgba(6, 182, 212, 0.2);
  --card-glow-4: rgba(6, 182, 212, 0.14);
  --card-glow-5: rgba(6, 182, 212, 0.1);
  --header-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);
  --time-main: #ffffff;
  --time-sub: #e2e8f0;
  --time-shadow: 0 0 10px rgba(255, 255, 255, 0.8);
  --title-gradient-start: #ffffff;
  --title-gradient-end: #a5f3fc;
  --title-shadow: 0 0 10px rgba(203, 213, 225, 0.55), 0 0 20px rgba(203, 213, 225, 0.3);
  --title-sub-shadow: 0 0 8px rgba(203, 213, 225, 0.35);
  --period-text: #cbd5e1;
  --switch-border: rgba(34, 211, 238, 0.35);
  --switch-text: #94a3b8;
  --switch-active-bg: rgba(34, 211, 238, 0.9);
  --switch-active-text: #0f172a;
  --list-header-bg: rgba(255, 255, 255, 0.05);
  --list-row-border: rgba(255, 255, 255, 0.05);
  --table-row-odd: rgba(30, 41, 59, 0.35);
  --table-row-hover: rgba(59, 130, 246, 0.12);
  --table-head-bg: rgba(51, 65, 85, 0.65);
  --table-head-text: #cbd5e1;
  --list-item-hover: rgba(59, 130, 246, 0.1);
  --help-badge-border: rgba(148, 163, 184, 0.8);
  --help-badge-text: #cbd5e1;
  --deco-grad-start: #00f2fe;
  --deco-grad-end: #4facfe;
  --deco-glow: rgba(0, 242, 254, 0.6);
  --line-glow-1: rgba(6, 182, 212, 0.28);
  --line-glow-2: rgba(6, 182, 212, 0.14);
  --line-glow-3: rgba(6, 182, 212, 0.1);
  --line-tip-glow: rgba(6, 182, 212, 0.55);
  --title-bottom-core: rgba(226, 232, 240, 0.72);
  --title-bottom-accent: var(--brand-blue);
  --title-bottom-shadow: rgba(203, 213, 225, 0.5);
  --corner-width: 4px;
  --corner-color: var(--brand-cyan);
  --kpi-cyan: #22d3ee;
  --kpi-red: #f87171;
  --kpi-green: #4ade80;
  --kpi-amber: #fbbf24;
  --trend-up: #f87171;
  --trend-down: #4ade80;
  --header-btn-bg: rgba(15, 23, 42, 0.72);
  --header-btn-border: rgba(34, 211, 238, 0.45);
  --header-btn-color: #67e8f9;
  --header-btn-hover-bg: rgba(6, 182, 212, 0.22);
  --header-btn-hover-border: rgba(34, 211, 238, 0.8);
  --filter-bg: rgba(15, 23, 42, 0.88);
  --filter-border: rgba(34, 211, 238, 0.42);
  --filter-border-hover: rgba(34, 211, 238, 0.78);
  --filter-text: #e2e8f0;
  --filter-placeholder: #94a3b8;
}

.light-theme {
  --bg-dark: #edf3fb;
  --bg-card: #ffffff;
  --text-main: #10233f;
  --text-sub: #40597d;
  --border-color: #d6dde8;
  --brand-blue: #2563eb;
  --brand-cyan: #0284c7;
  --card-bg: rgba(255, 255, 255, 0.98);
  --card-glow-1: rgba(148, 163, 184, 0.22);
  --card-glow-2: rgba(148, 163, 184, 0.14);
  --card-glow-3: rgba(148, 163, 184, 0.1);
  --card-glow-4: rgba(148, 163, 184, 0.08);
  --card-glow-5: rgba(148, 163, 184, 0.06);
  --header-shadow: none;
  --time-main: #0f172a;
  --time-sub: #334155;
  --time-shadow: 0 0 8px rgba(37, 99, 235, 0.22);
  --title-gradient-start: #334155;
  --title-gradient-end: #1e293b;
  --title-shadow: 0 0 8px rgba(148, 163, 184, 0.35);
  --title-sub-shadow: 0 0 6px rgba(148, 163, 184, 0.28);
  --period-text: #334155;
  --switch-border: rgba(37, 99, 235, 0.35);
  --switch-text: #1e3a5f;
  --switch-active-bg: rgba(37, 99, 235, 0.9);
  --switch-active-text: #ffffff;
  --list-header-bg: rgba(148, 163, 184, 0.15);
  --list-row-border: rgba(148, 163, 184, 0.3);
  --table-row-odd: rgba(191, 219, 254, 0.28);
  --table-row-hover: rgba(147, 197, 253, 0.32);
  --table-head-bg: rgba(148, 163, 184, 0.32);
  --table-head-text: #1e293b;
  --list-item-hover: rgba(191, 219, 254, 0.35);
  --help-badge-border: rgba(64, 89, 125, 0.65);
  --help-badge-text: #334155;
  --deco-grad-start: #60a5fa;
  --deco-grad-end: #22d3ee;
  --deco-glow: rgba(59, 130, 246, 0.35);
  --line-glow-1: rgba(148, 163, 184, 0);
  --line-glow-2: rgba(148, 163, 184, 0);
  --line-glow-3: rgba(148, 163, 184, 0);
  --line-tip-glow: rgba(148, 163, 184, 0);
  --title-bottom-core: rgba(148, 163, 184, 0.45);
  --title-bottom-accent: #94a3b8;
  --title-bottom-shadow: rgba(148, 163, 184, 0);
  --corner-width: 3px;
  --corner-color: #38bdf8;
  --kpi-cyan: #0284c7;
  --kpi-red: #dc2626;
  --kpi-green: #15803d;
  --kpi-amber: #b45309;
  --trend-up: #dc2626;
  --trend-down: #15803d;
  --header-btn-bg: rgba(255, 255, 255, 0.92);
  --header-btn-border: rgba(148, 163, 184, 0.55);
  --header-btn-color: #334155;
  --header-btn-hover-bg: rgba(191, 219, 254, 0.35);
  --header-btn-hover-border: rgba(96, 165, 250, 0.75);
  --filter-bg: rgba(255, 255, 255, 0.94);
  --filter-border: rgba(148, 163, 184, 0.62);
  --filter-border-hover: rgba(96, 165, 250, 0.85);
  --filter-text: #1e293b;
  --filter-placeholder: #64748b;
}

.dashboard-screen {
  width: 100%;
  height: 100vh;
  background-color: var(--bg-dark);
  color: var(--text-main);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
}

/* --- Header --- */
.screen-header {
  height: 80px; /* 增加头部高度以容纳新时钟 */
  display: flex;
  justify-content: space-between;
  align-items: center;
  position: relative;
  z-index: 10;
  background-color: var(--bg-dark);
  box-shadow: var(--header-shadow);
  padding: 0;
}

.header-left-deco,
.header-right-deco {
  flex: 1;
  height: 100%;
  display: flex;
  align-items: center;
  position: relative;
}

.header-left-deco {
  justify-content: flex-end;
  padding: 0 !important;
}

.header-right-deco {
  justify-content: flex-start;
  padding: 0 !important;
}

.header-filters {
  position: absolute;
  left: 8px;
  top: auto;
  bottom: 6px;
  z-index: 12;
  display: flex;
  align-items: center;
  gap: 6px;
}

.filter-mode {
  width: 94px;
}

.filter-range {
  width: 226px;
}

.filter-month {
  width: 92px;
}

.header-filters :deep(.filter-range.el-date-editor) {
  width: 226px !important;
  min-width: 226px !important;
}

.header-filters :deep(.filter-month.el-date-editor) {
  width: 92px !important;
  min-width: 92px !important;
}

.header-filters :deep(.el-select .el-select__wrapper),
.header-filters :deep(.el-date-editor .el-input__wrapper),
.header-filters :deep(.el-date-editor.el-input__wrapper),
.header-filters :deep(.el-range-editor.el-input__wrapper) {
  background: var(--filter-bg) !important;
  box-shadow: 0 0 0 1px var(--filter-border) inset !important;
}

.header-filters :deep(.el-select .el-select__wrapper:hover),
.header-filters :deep(.el-date-editor .el-input__wrapper:hover),
.header-filters :deep(.el-date-editor.el-input__wrapper:hover),
.header-filters :deep(.el-range-editor.el-input__wrapper:hover),
.header-filters :deep(.el-select .el-select__wrapper.is-focused),
.header-filters :deep(.el-date-editor .el-input__wrapper.is-focus),
.header-filters :deep(.el-date-editor.el-input__wrapper.is-focus),
.header-filters :deep(.el-range-editor.el-input__wrapper.is-focus) {
  box-shadow: 0 0 0 1px var(--filter-border-hover) inset !important;
}

.header-filters :deep(.el-select .el-select__selected-item),
.header-filters :deep(.el-date-editor .el-range-input),
.header-filters :deep(.el-date-editor .el-input__inner),
.header-filters :deep(.el-date-editor .el-range-separator),
.header-filters :deep(.el-date-editor .el-input__icon),
.header-filters :deep(.el-select .el-select__caret) {
  color: var(--filter-text);
}

.header-filters :deep(.el-date-editor .el-range-input) {
  -webkit-text-fill-color: var(--filter-text);
}

.header-filters :deep(.el-date-editor .el-input__inner) {
  -webkit-text-fill-color: var(--filter-text);
}

.header-filters :deep(.el-date-editor .el-range-input::placeholder),
.header-filters :deep(.el-date-editor .el-input__inner::placeholder) {
  color: var(--filter-placeholder);
}

:global(.dashboard-filter-popper-dark.el-popper),
:global(.dashboard-filter-popper-dark .el-picker-panel),
:global(.dashboard-filter-popper-dark .el-select-dropdown) {
  background: #0f172a !important;
  border-color: rgba(34, 211, 238, 0.42) !important;
  color: #dbeafe !important;
  box-shadow: 0 8px 22px rgba(2, 8, 23, 0.72) !important;
}

:global(.dashboard-filter-popper-dark.el-popper) {
  --el-bg-color-overlay: #0f172a;
  --el-fill-color-blank: #0f172a;
  --el-border-color-light: rgba(34, 211, 238, 0.42);
  --el-text-color-primary: #dbeafe;
  --el-text-color-regular: #cbd5e1;
}

:global(.dashboard-filter-popper-dark .el-select-dropdown__item) {
  color: #dbeafe !important;
}

:global(.dashboard-filter-popper-dark .el-select-dropdown__item.is-hovering),
:global(.dashboard-filter-popper-dark .el-select-dropdown__item:hover) {
  background: rgba(14, 116, 144, 0.28) !important;
}

:global(.dashboard-filter-popper-dark .el-select-dropdown__item.is-selected) {
  color: #67e8f9 !important;
  font-weight: 700;
}

:global(.dashboard-filter-popper-dark .el-date-picker__header-label),
:global(.dashboard-filter-popper-dark .el-date-picker__header-label:hover),
:global(.dashboard-filter-popper-dark .el-picker-panel__icon-btn),
:global(.dashboard-filter-popper-dark .el-date-table th),
:global(.dashboard-filter-popper-dark .el-month-table td .cell),
:global(.dashboard-filter-popper-dark .el-year-table td .cell) {
  color: #dbeafe !important;
}

:global(.dashboard-filter-popper-dark .el-month-table td .cell:hover),
:global(.dashboard-filter-popper-dark .el-year-table td .cell:hover),
:global(.dashboard-filter-popper-dark .el-date-table td.available:hover) {
  color: #67e8f9 !important;
  background: rgba(14, 116, 144, 0.22) !important;
}

:global(.dashboard-filter-popper-dark .el-month-table td.current:not(.disabled) .cell),
:global(.dashboard-filter-popper-dark .el-year-table td.current:not(.disabled) .cell),
:global(.dashboard-filter-popper-dark .el-date-table td.current:not(.disabled) .el-date-table-cell__text),
:global(.dashboard-filter-popper-dark .el-date-table td.end-date .el-date-table-cell__text),
:global(.dashboard-filter-popper-dark .el-date-table td.start-date .el-date-table-cell__text) {
  background: #0284c7 !important;
  color: #e0f2fe !important;
}

:global(.dashboard-filter-popper-dark .el-date-table td.in-range .el-date-table-cell) {
  background: rgba(2, 132, 199, 0.2) !important;
}

/* 装饰线条 */
.deco-line-main {
  height: 2px;
  width: 100%;
  background: var(--brand-cyan);
  box-shadow:
    0 0 5px var(--line-glow-1),
    0 8px 14px var(--line-glow-2),
    0 14px 22px var(--line-glow-3);
  position: relative;
}

.header-left-deco .deco-line-main::after {
  content: '';
  position: absolute;
  left: 100%;
  top: 0;
  width: 42px;
  height: 2px;
  background: var(--brand-cyan);
  box-shadow: 0 0 5px var(--line-tip-glow);
  transform-origin: left center;
  transform: rotate(35deg);
}

.header-right-deco .deco-line-main::before {
  content: '';
  position: absolute;
  right: 100%;
  top: 0;
  width: 42px;
  height: 2px;
  background: var(--brand-cyan);
  box-shadow: 0 0 5px var(--line-tip-glow);
  transform-origin: right center;
  transform: rotate(-35deg);
}

.deco-lines {
  display: flex;
  align-items: flex-end;
  gap: 6px;
  margin: 0;
  position: absolute;
  top: auto;
  bottom: calc(50% - 1px);
}

.deco-lines span {
  display: inline-block;
  width: 7.5px;
  height: 8px;
  background: linear-gradient(to right, var(--deco-grad-start), var(--deco-grad-end));
  box-shadow: 0 0 8px var(--deco-glow);
}

.left-lines span {
  transform: skewX(45deg); /* 左侧反向 */
}

.right-lines span {
  transform: skewX(-45deg); /* 右侧反向 */
}

.left-lines span:nth-child(1) { height: 7px; }
.left-lines span:nth-child(2) { height: 8px; }
.left-lines span:nth-child(3) { height: 9px; }
.left-lines span:nth-child(4) { height: 10px; }
.left-lines span:nth-child(5) { height: 11px; }
.left-lines span:nth-child(6) { height: 12px; }
.left-lines span:nth-child(7) { height: 13px; }
.left-lines span:nth-child(8) { height: 14px; }
.left-lines span:nth-child(9) { height: 15px; }
.left-lines span:nth-child(10) { height: 16px; }
.left-lines span:nth-child(11) { height: 17px; }
.left-lines span:nth-child(12) { height: 18px; }
.left-lines span:nth-child(13) { height: 19px; }
.left-lines span:nth-child(14) { height: 20px; }

.right-lines span:nth-child(1) { height: 20px; }
.right-lines span:nth-child(2) { height: 19px; }
.right-lines span:nth-child(3) { height: 18px; }
.right-lines span:nth-child(4) { height: 17px; }
.right-lines span:nth-child(5) { height: 16px; }
.right-lines span:nth-child(6) { height: 15px; }
.right-lines span:nth-child(7) { height: 14px; }
.right-lines span:nth-child(8) { height: 13px; }
.right-lines span:nth-child(9) { height: 12px; }
.right-lines span:nth-child(10) { height: 11px; }
.right-lines span:nth-child(11) { height: 10px; }
.right-lines span:nth-child(12) { height: 9px; }
.right-lines span:nth-child(13) { height: 8px; }
.right-lines span:nth-child(14) { height: 7px; }

/* 菱形阵列光影：深色两侧更暗，浅色两侧更亮 */
.dark-theme .left-lines span:nth-child(1) { opacity: 0.3; }
.dark-theme .left-lines span:nth-child(2) { opacity: 0.36; }
.dark-theme .left-lines span:nth-child(3) { opacity: 0.42; }
.dark-theme .left-lines span:nth-child(4) { opacity: 0.5; }
.dark-theme .left-lines span:nth-child(5) { opacity: 0.58; }
.dark-theme .left-lines span:nth-child(6) { opacity: 0.66; }
.dark-theme .left-lines span:nth-child(7) { opacity: 0.74; }
.dark-theme .left-lines span:nth-child(8) { opacity: 0.8; }
.dark-theme .left-lines span:nth-child(9) { opacity: 0.86; }
.dark-theme .left-lines span:nth-child(10) { opacity: 0.9; }
.dark-theme .left-lines span:nth-child(11) { opacity: 0.94; }
.dark-theme .left-lines span:nth-child(12) { opacity: 0.97; }
.dark-theme .left-lines span:nth-child(13) { opacity: 0.99; }
.dark-theme .left-lines span:nth-child(14) { opacity: 1; }

.dark-theme .right-lines span:nth-child(1) { opacity: 1; }
.dark-theme .right-lines span:nth-child(2) { opacity: 0.99; }
.dark-theme .right-lines span:nth-child(3) { opacity: 0.97; }
.dark-theme .right-lines span:nth-child(4) { opacity: 0.94; }
.dark-theme .right-lines span:nth-child(5) { opacity: 0.9; }
.dark-theme .right-lines span:nth-child(6) { opacity: 0.86; }
.dark-theme .right-lines span:nth-child(7) { opacity: 0.8; }
.dark-theme .right-lines span:nth-child(8) { opacity: 0.74; }
.dark-theme .right-lines span:nth-child(9) { opacity: 0.66; }
.dark-theme .right-lines span:nth-child(10) { opacity: 0.58; }
.dark-theme .right-lines span:nth-child(11) { opacity: 0.5; }
.dark-theme .right-lines span:nth-child(12) { opacity: 0.42; }
.dark-theme .right-lines span:nth-child(13) { opacity: 0.36; }
.dark-theme .right-lines span:nth-child(14) { opacity: 0.3; }

.light-theme .left-lines span:nth-child(1) { opacity: 1; }
.light-theme .left-lines span:nth-child(2) { opacity: 0.97; }
.light-theme .left-lines span:nth-child(3) { opacity: 0.94; }
.light-theme .left-lines span:nth-child(4) { opacity: 0.9; }
.light-theme .left-lines span:nth-child(5) { opacity: 0.86; }
.light-theme .left-lines span:nth-child(6) { opacity: 0.8; }
.light-theme .left-lines span:nth-child(7) { opacity: 0.74; }
.light-theme .left-lines span:nth-child(8) { opacity: 0.66; }
.light-theme .left-lines span:nth-child(9) { opacity: 0.58; }
.light-theme .left-lines span:nth-child(10) { opacity: 0.5; }
.light-theme .left-lines span:nth-child(11) { opacity: 0.42; }
.light-theme .left-lines span:nth-child(12) { opacity: 0.36; }
.light-theme .left-lines span:nth-child(13) { opacity: 0.32; }
.light-theme .left-lines span:nth-child(14) { opacity: 0.3; }

.light-theme .right-lines span:nth-child(1) { opacity: 0.3; }
.light-theme .right-lines span:nth-child(2) { opacity: 0.32; }
.light-theme .right-lines span:nth-child(3) { opacity: 0.36; }
.light-theme .right-lines span:nth-child(4) { opacity: 0.42; }
.light-theme .right-lines span:nth-child(5) { opacity: 0.5; }
.light-theme .right-lines span:nth-child(6) { opacity: 0.58; }
.light-theme .right-lines span:nth-child(7) { opacity: 0.66; }
.light-theme .right-lines span:nth-child(8) { opacity: 0.74; }
.light-theme .right-lines span:nth-child(9) { opacity: 0.8; }
.light-theme .right-lines span:nth-child(10) { opacity: 0.86; }
.light-theme .right-lines span:nth-child(11) { opacity: 0.9; }
.light-theme .right-lines span:nth-child(12) { opacity: 0.94; }
.light-theme .right-lines span:nth-child(13) { opacity: 0.97; }
.light-theme .right-lines span:nth-child(14) { opacity: 1; }

.header-left-deco .deco-lines {
  left: 0;
}

.header-right-deco .deco-lines {
  right: 0;
}

/* 中心标题 */
.header-title-wrapper {
  position: relative;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 0;
  min-width: 400px;
  z-index: 2;
}

.header-title {
  margin: 0;
  font-size: 28px;
  font-weight: bold;
  letter-spacing: 4px;
  color: var(--text-main);
  text-shadow: var(--title-shadow);
  background: linear-gradient(to bottom, var(--title-gradient-start), var(--title-gradient-end));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  z-index: 2;
}

.company-title {
  margin: 0 0 2px 0;
  font-size: 16px;
  font-weight: bold;
  letter-spacing: 2px;
  color: var(--text-main);
  text-shadow: var(--title-shadow);
  background: linear-gradient(to bottom, var(--title-gradient-start), var(--title-gradient-end));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  z-index: 2;
}

.period-title {
  margin: 2px 0 0 0;
  font-size: 10px;
  color: var(--period-text);
  letter-spacing: 1px;
  opacity: 0.9;
  text-shadow: var(--title-sub-shadow);
  white-space: nowrap;
}

/* 标题下方横向贯穿的发光效果 */
.title-bottom-glow {
  position: absolute;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 120%;
  height: 2px;
  background: radial-gradient(circle at center, var(--title-bottom-core) 0%, var(--title-bottom-accent) 40%, transparent 100%);
  box-shadow: 0 0 20px 2px var(--title-bottom-shadow);
}

/* 时间容器 */
.time-container {
  position: absolute;
  right: 34px;
  top: 42px;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 3px;
  z-index: 11;
}

.date-row {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
}

.time-text {
  font-size: 26px;
  color: var(--time-main);
  font-family: 'Courier New', Courier, monospace;
  font-weight: 900;
  line-height: 1;
  text-shadow: var(--time-shadow);
}

.date-text {
  font-size: 14px;
  color: var(--time-sub);
  font-family: 'Courier New', Courier, monospace;
  font-weight: bold;
  line-height: 1;
}

/* 操作按钮 */
.header-action {
  display: flex;
  align-items: center;
  gap: 6px;
}

.header-action :deep(.header-btn.el-button.is-circle) {
  background: var(--header-btn-bg);
  border-color: var(--header-btn-border);
  color: var(--header-btn-color);
}

.header-action :deep(.header-btn.el-button.is-circle:hover) {
  background: var(--header-btn-hover-bg);
  border-color: var(--header-btn-hover-border);
  color: var(--header-btn-color);
}

.header-action :deep(.header-btn.el-button.is-circle:focus-visible) {
  outline: 1px solid var(--header-btn-hover-border);
  outline-offset: 1px;
}

/* --- 主体内容 --- */
.screen-main {
  flex: 1;
  padding: 18px;
  display: flex;
  flex-direction: column;
  gap: 24px;
  overflow: hidden;
}

/* --- 顶部核心指标 --- */
.top-cards {
  display: flex;
  gap: 28px;
  height: 86px;
}

.kpi-card {
  flex: 1;
  background: var(--card-bg);
  border: 1px solid var(--border-color);
  border-radius: 4px;
  padding: 14px 16px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  position: relative;
  overflow: visible;
  box-shadow:
    inset 0 0 0 1px var(--card-glow-1),
    inset 0 0 10px var(--card-glow-2),
    inset 0 0 20px var(--card-glow-3),
    inset 0 8px 14px var(--card-glow-4),
    inset 0 -6px 12px var(--card-glow-5);
}

.chart-box {
  flex: 1;
  background: var(--card-bg);
  border: 1px solid var(--border-color);
  border-radius: 4px;
  display: flex;
  flex-direction: column;
  padding: 10px;
  position: relative;
  min-height: 0;
  overflow: visible;
  box-shadow:
    inset 0 0 0 1px var(--card-glow-1),
    inset 0 0 10px var(--card-glow-2),
    inset 0 0 20px var(--card-glow-3),
    inset 0 8px 14px var(--card-glow-4),
    inset 0 -6px 12px var(--card-glow-5);
}

.light-theme .kpi-card,
.light-theme .chart-box {
  border: none;
  box-shadow:
    10px 12px 22px rgba(37, 99, 235, 0.14),
    2px 4px 8px rgba(148, 163, 184, 0.2);
}

.light-theme .card-corner {
  display: none;
}

/* 科技感边角装饰 */
.card-corner {
  position: absolute;
  width: 22px;
  height: 22px;
  border: var(--corner-width) solid var(--corner-color);
  z-index: 6;
}

.card-corner.top-left {
  top: -6px;
  left: -6px;
  border-right: none;
  border-bottom: none;
}

.card-corner.top-right {
  top: -6px;
  right: -6px;
  border-left: none;
  border-bottom: none;
}

.card-corner.bottom-left {
  bottom: -6px;
  left: -6px;
  border-right: none;
  border-top: none;
}

.card-corner.bottom-right {
  bottom: -6px;
  right: -6px;
  border-left: none;
  border-top: none;
}

/* 取消之前的左侧蓝条 */
.kpi-card::before {
  display: none;
}

.kpi-title {
  font-size: 14px;
  color: var(--text-sub);
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.kpi-period {
  font-size: 10px;
  color: var(--text-sub);
  opacity: 0.9;
}

.kpi-help-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  border: 1px solid var(--help-badge-border);
  color: var(--help-badge-text);
  font-size: 10px;
  line-height: 1;
  cursor: help;
}

.kpi-value {
  font-size: 32px;
  font-weight: bold;
  line-height: 1;
}

.kpi-number {
  font-family: 'Bahnschrift Light', 'Bahnschrift', 'Segoe UI', sans-serif;
}

.kpi-unit {
  font-size: 14px;
  margin-left: 4px;
  font-weight: normal;
}

.kpi-trend {
  position: absolute;
  right: 20px;
  bottom: 16px;
  font-size: 12px;
  color: var(--text-sub);
}

.trend-up { color: var(--trend-up); font-weight: bold; }
.trend-down { color: var(--trend-down); font-weight: bold; }

/* --- 图表三列布局 --- */
.chart-layout {
  flex: 1;
  display: flex;
  gap: 28px;
  min-height: 0; /* 关键：允许子元素在 flex 容器中收缩 */
  height: calc(100% - 110px); /* 86px(top-cards) + 24px(gap) */
}

.chart-column {
  display: flex;
  flex-direction: column;
  gap: 28px;
  height: 100%;
}

.left-column, .right-column {
  width: 27%;
}

.center-column {
  width: 42%;
}

.box-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--text-main);
  margin-bottom: 8px;
  min-height: 20px;
  line-height: 20px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.box-period {
  font-size: 10px;
  color: var(--text-sub);
  opacity: 0.9;
  font-weight: 500;
}

.stage-switch {
  margin-left: auto;
  display: flex;
  gap: 6px;
}

.stage-switch-btn {
  padding: 0 8px;
  border: 1px solid var(--switch-border);
  border-radius: 10px;
  color: var(--switch-text);
  font-size: 11px;
  line-height: 18px;
  cursor: pointer;
  user-select: none;
}

.stage-switch-btn.active {
  color: var(--switch-active-text);
  background: var(--switch-active-bg);
  border-color: var(--switch-active-bg);
}

.title-icon {
  color: var(--brand-cyan);
  font-size: 18px;
}

.chart-content {
  flex: 1;
  width: 100%;
  min-height: 0; /* 确保图表在 flex 中正确缩放 */
}

/* 中间主图特殊处理 */
.main-chart-box {
  flex: 1;
}

.metrics-chart-box {
  flex: 1.2;
}

.metrics-table-box {
  flex: 0.9;
  min-height: 0;
}

.metrics-table-wrap {
  overflow-y: auto;
  overflow-x: hidden;
  scrollbar-width: none;
}

.metrics-table-wrap::-webkit-scrollbar {
  display: none;
}

.metrics-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 12px;
  color: var(--text-main);
}

.metrics-table th,
.metrics-table td {
  border: 1px solid rgba(148, 163, 184, 0.25);
  padding: 6px 8px;
  text-align: center;
  white-space: nowrap;
}

.metrics-table th {
  background: var(--bg-card);
  color: var(--table-head-text);
  position: sticky;
  top: 0;
  z-index: 2;
}

.metrics-table tbody tr:nth-child(odd) {
  background: var(--table-row-odd);
}

.metrics-table tbody tr:hover {
  background: var(--table-row-hover);
}

/* --- 滚动列表样式 --- */
.list-content {
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.list-header {
  display: flex;
  padding: 8px 10px;
  background: var(--list-header-bg);
  color: var(--text-sub);
  font-size: 13px;
  font-weight: bold;
  border-radius: 4px;
  margin-bottom: 8px;
}

.seamless-warp {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  scrollbar-width: none;
}

.seamless-warp::-webkit-scrollbar {
  display: none;
}

.list-item {
  display: flex;
  padding: 10px;
  font-size: 13px;
  border-bottom: 1px solid var(--list-row-border);
  align-items: center;
}

.help-icon {
  font-size: 14px;
  color: var(--text-sub);
  cursor: help;
}

.list-item:hover {
  background: var(--list-item-hover);
}

.col-time { width: 85px; color: var(--text-sub); }
.col-desc { flex: 1; margin: 0 10px; }
.col-dept { width: 70px; color: var(--brand-cyan); }
.col-status { width: 72px; text-align: right; }

.text-ellipsis {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

@media (max-width: 1024px) {
  .screen-header {
    height: 72px;
  }

  .header-title-wrapper {
    min-width: auto;
    width: 54%;
    padding: 0;
  }

  .header-filters {
    left: 6px;
    top: auto;
    bottom: 6px;
    gap: 4px;
  }

  .filter-mode {
    width: 82px;
  }

  .filter-range {
    width: 206px;
  }

  .filter-month {
    width: 84px;
  }

  .header-filters :deep(.filter-range.el-date-editor) {
    width: 206px !important;
    min-width: 206px !important;
  }

  .header-filters :deep(.filter-month.el-date-editor) {
    width: 84px !important;
    min-width: 84px !important;
  }

  .header-title {
    font-size: 22px;
    letter-spacing: 2px;
  }

  .company-title {
    font-size: 12px;
    letter-spacing: 1px;
  }

  .period-title {
    font-size: 9px;
    max-width: 100%;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .time-container {
    right: 30px;
    top: 38px;
  }

  .time-text {
    font-size: 22px;
  }

  .date-text {
    font-size: 12px;
  }

  .top-cards {
    height: auto;
    flex-wrap: wrap;
    flex: none;
  }

  .kpi-card {
    flex: 1 1 calc(50% - 8px);
    min-width: 0;
    height: 96px;
  }

  .chart-layout {
    height: auto;
    flex-direction: column;
    flex: none;
  }

  .chart-column {
    height: auto;
  }

  .left-column,
  .center-column,
  .right-column {
    width: 100%;
    height: auto;
  }

  .chart-box {
    flex: none;
    min-height: 240px;
  }

  .main-chart-box {
    min-height: 300px;
  }

  .metrics-chart-box {
    min-height: 280px;
  }

  .metrics-table-box {
    min-height: 220px;
  }
}

@media (max-width: 768px) {
  .dashboard-screen {
    min-height: 100vh;
    height: 100vh;
    overflow: hidden;
  }

  .screen-header {
    height: 64px;
    justify-content: center;
    padding: 0 8px;
  }

  .header-left-deco,
  .header-right-deco {
    display: none;
  }

  .header-filters {
    display: none;
  }

  .deco-lines {
    display: none;
  }

  .deco-line-main {
    width: 100%;
  }

  .header-left-deco .deco-line-main::after,
  .header-right-deco .deco-line-main::before {
    width: 16px;
  }

  .header-title-wrapper {
    min-width: 0;
    width: auto;
    max-width: calc(100% - 120px);
    padding: 0;
  }

  .header-title {
    font-size: 18px;
    letter-spacing: 0.5px;
    line-height: 1.2;
    text-align: center;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .company-title {
    display: none;
  }

  .period-title {
    font-size: 8px;
    max-width: 100%;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .time-container {
    right: 8px;
    top: 6px;
    gap: 2px;
  }

  .time-text {
    font-size: 14px;
  }

  .date-text {
    display: none;
  }

  .date-row {
    gap: 2px;
  }

  .header-action :deep(.header-btn.el-button.is-circle) {
    width: 20px;
    height: 20px;
    min-height: 20px;
    padding: 0;
  }

  .title-bottom-glow {
    display: none;
  }

  .screen-main {
    flex: 1;
    min-height: 0;
    padding: 10px;
    gap: 10px;
    overflow-y: auto;
    overflow-x: hidden;
    -webkit-overflow-scrolling: touch;
  }

  .top-cards {
    gap: 10px;
    flex: none;
  }

  .kpi-card {
    flex: 1 1 calc(50% - 5px);
    height: 86px;
    padding: 10px 12px;
  }

  .kpi-title {
    font-size: 12px;
  }

  .kpi-value {
    font-size: 22px;
  }

  .kpi-unit {
    font-size: 12px;
  }

  .kpi-trend {
    right: 10px;
    bottom: 8px;
    font-size: 10px;
  }

  .chart-layout,
  .chart-column {
    gap: 10px;
  }

  .chart-layout {
    flex: none;
  }

  .chart-column {
    height: auto;
  }

  .chart-box {
    flex: none;
    min-height: 220px;
    padding: 10px;
  }

  .main-chart-box {
    min-height: 280px;
  }

  .metrics-chart-box {
    min-height: 260px;
  }

  .metrics-table-box {
    min-height: 210px;
  }

  .box-title {
    font-size: 13px;
    gap: 6px;
    margin-bottom: 6px;
  }

  .title-icon {
    font-size: 16px;
  }

  .list-header,
  .list-item {
    font-size: 11px;
    padding: 6px;
  }

  .metrics-table {
    font-size: 11px;
  }

  .metrics-table th,
  .metrics-table td {
    padding: 5px 6px;
  }

  .col-time {
    width: 62px;
  }

  .col-dept {
    width: 52px;
  }

  .col-status {
    width: 46px;
  }
}

@media (max-width: 420px) {
  .kpi-card {
    flex-basis: 100%;
    height: 78px;
  }

  .header-title {
    font-size: 14px;
  }

  .company-title {
    font-size: 8px;
  }

  .period-title {
    font-size: 7px;
  }
}
</style>
