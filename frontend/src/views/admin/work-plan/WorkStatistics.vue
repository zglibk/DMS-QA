<template>
  <div class="work-statistics">
    <!-- 页面头部 -->
    <div class="page-header">
      <div class="header-left">
        <h2 class="page-title">
          <el-icon><DataAnalysis /></el-icon>
          统计分析
        </h2>
        <p class="page-subtitle">工作计划数据分析、趋势统计、绩效报告</p>
      </div>
      <div class="header-right">
        <el-date-picker
          v-model="dateRange"
          type="daterange"
          range-separator="至"
          start-placeholder="开始日期"
          end-placeholder="结束日期"
          format="YYYY-MM-DD"
          value-format="YYYY-MM-DD"
          @change="onDateRangeChange"
        />
        <el-button type="primary" @click="refreshData">
          <el-icon><Refresh /></el-icon>
          刷新数据
        </el-button>
        <el-button @click="exportReport" :disabled="!hasExportPermission">
          <el-icon><Download /></el-icon>
          导出报告
        </el-button>
      </div>
    </div>

    <!-- 统计概览 -->
    <div class="statistics-overview">
      <el-row :gutter="20">
        <el-col :span="6">
          <div class="stat-card total">
            <div class="stat-icon">
              <el-icon><Files /></el-icon>
            </div>
            <div class="stat-content">
              <div class="stat-number">{{ overviewStats.totalPlans || 0 }}</div>
              <div class="stat-label">总计划数</div>
              <div class="stat-change" :class="getChangeClass(overviewStats.plansChange)">
                {{ formatChange(overviewStats.plansChange) }}
              </div>
            </div>
          </div>
        </el-col>
        <el-col :span="6">
          <div class="stat-card completion">
            <div class="stat-icon">
              <el-icon><CircleCheck /></el-icon>
            </div>
            <div class="stat-content">
              <div class="stat-number">{{ (overviewStats.completionRate || 0).toFixed(1) }}%</div>
              <div class="stat-label">完成率</div>
              <div class="stat-change" :class="getChangeClass(overviewStats.completionChange)">
                {{ formatChange(overviewStats.completionChange) }}
              </div>
            </div>
          </div>
        </el-col>
        <el-col :span="6">
          <div class="stat-card efficiency">
            <div class="stat-icon">
              <el-icon><TrendCharts /></el-icon>
            </div>
            <div class="stat-content">
              <div class="stat-number">{{ (overviewStats.avgProgress || 0).toFixed(1) }}%</div>
              <div class="stat-label">平均进度</div>
              <div class="stat-change" :class="getChangeClass(overviewStats.progressChange)">
                {{ formatChange(overviewStats.progressChange) }}
              </div>
            </div>
          </div>
        </el-col>
        <el-col :span="6">
          <div class="stat-card overdue">
            <div class="stat-icon">
              <el-icon><Warning /></el-icon>
            </div>
            <div class="stat-content">
              <div class="stat-number">{{ overviewStats.overduePlans || 0 }}</div>
              <div class="stat-label">逾期计划</div>
              <div class="stat-change" :class="getChangeClass(overviewStats.overdueChange)">
                {{ formatChange(overviewStats.overdueChange) }}
              </div>
            </div>
          </div>
        </el-col>
      </el-row>
    </div>

    <!-- 图表区域 -->
    <div class="charts-section">
      <el-row :gutter="20">
        <!-- 计划趋势图 -->
        <el-col :span="12">
          <el-card class="chart-card">
            <template #header>
              <div class="chart-header">
                <span class="chart-title">计划趋势分析</span>
                <el-button-group size="small">
                  <el-button :type="trendPeriod === 'week' ? 'primary' : ''" @click="changeTrendPeriod('week')">
                    周
                  </el-button>
                  <el-button :type="trendPeriod === 'month' ? 'primary' : ''" @click="changeTrendPeriod('month')">
                    月
                  </el-button>
                  <el-button :type="trendPeriod === 'quarter' ? 'primary' : ''" @click="changeTrendPeriod('quarter')">
                    季度
                  </el-button>
                </el-button-group>
              </div>
            </template>
            <div ref="trendChartRef" class="chart-container"></div>
          </el-card>
        </el-col>

        <!-- 状态分布图 -->
        <el-col :span="12">
          <el-card class="chart-card">
            <template #header>
              <span class="chart-title">状态分布</span>
            </template>
            <div ref="statusChartRef" class="chart-container"></div>
          </el-card>
        </el-col>
      </el-row>

      <el-row :gutter="20" style="margin-top: 20px">
        <!-- 工作类型分析 -->
        <el-col :span="12">
          <el-card class="chart-card">
            <template #header>
              <span class="chart-title">工作类型分析</span>
            </template>
            <div ref="typeChartRef" class="chart-container"></div>
          </el-card>
        </el-col>

        <!-- 部门绩效对比 -->
        <el-col :span="12">
          <el-card class="chart-card">
            <template #header>
              <span class="chart-title">部门绩效对比</span>
            </template>
            <div ref="departmentChartRef" class="chart-container"></div>
          </el-card>
        </el-col>
      </el-row>
    </div>

    <!-- 详细统计表格 -->
    <div class="statistics-tables">
      <el-row :gutter="20">
        <!-- 人员绩效统计 -->
        <el-col :span="12">
          <el-card>
            <template #header>
              <div class="table-header">
                <span class="table-title">人员绩效统计</span>
                <el-button size="small" @click="exportUserStats" :disabled="!hasExportPermission">
                  <el-icon><Download /></el-icon>
                  导出
                </el-button>
              </div>
            </template>
            
            <el-table
              :data="userStats"
              stripe
              size="small"
              max-height="400"
            >
              <el-table-column prop="UserName" label="姓名" width="100" />
              <el-table-column prop="DepartmentName" label="部门" width="120" />
              <el-table-column prop="TotalPlans" label="总计划" width="80" align="center" />
              <el-table-column prop="CompletedPlans" label="已完成" width="80" align="center" />
              <el-table-column prop="CompletionRate" label="完成率" width="80" align="center">
                <template #default="{ row }">
                  <span :class="getCompletionRateClass(row.CompletionRate)">
                    {{ (row.CompletionRate || 0).toFixed(1) }}%
                  </span>
                </template>
              </el-table-column>
              <el-table-column prop="AvgProgress" label="平均进度" width="90" align="center">
                <template #default="{ row }">
                  <el-progress
                    :percentage="row.AvgProgress || 0"
                    :stroke-width="6"
                    :show-text="false"
                    :color="getProgressColor(row.AvgProgress || 0)"
                  />
                  <span class="progress-text">{{ (row.AvgProgress || 0).toFixed(1) }}%</span>
                </template>
              </el-table-column>
              <el-table-column prop="OverduePlans" label="逾期" width="60" align="center">
                <template #default="{ row }">
                  <el-tag v-if="row.OverduePlans > 0" type="danger" size="small">
                    {{ row.OverduePlans }}
                  </el-tag>
                  <span v-else>0</span>
                </template>
              </el-table-column>
            </el-table>
          </el-card>
        </el-col>

        <!-- 工作类型统计 -->
        <el-col :span="12">
          <el-card>
            <template #header>
              <div class="table-header">
                <span class="table-title">工作类型统计</span>
                <el-button size="small" @click="exportTypeStats" :disabled="!hasExportPermission">
                  <el-icon><Download /></el-icon>
                  导出
                </el-button>
              </div>
            </template>
            
            <el-table
              :data="typeStats"
              stripe
              size="small"
              max-height="400"
            >
              <el-table-column prop="TypeName" label="工作类型" min-width="120" />
              <el-table-column prop="TotalPlans" label="总数" width="80" align="center" />
              <el-table-column prop="CompletedPlans" label="完成" width="80" align="center" />
              <el-table-column prop="InProgressPlans" label="进行中" width="80" align="center" />
              <el-table-column prop="OverduePlans" label="逾期" width="80" align="center">
                <template #default="{ row }">
                  <el-tag v-if="row.OverduePlans > 0" type="danger" size="small">
                    {{ row.OverduePlans }}
                  </el-tag>
                  <span v-else>0</span>
                </template>
              </el-table-column>
              <el-table-column prop="CompletionRate" label="完成率" width="80" align="center">
                <template #default="{ row }">
                  <span :class="getCompletionRateClass(row.CompletionRate)">
                    {{ row.CompletionRate }}%
                  </span>
                </template>
              </el-table-column>
              <el-table-column prop="AvgDuration" label="平均耗时" width="100" align="center">
                <template #default="{ row }">
                  {{ row.AvgDuration || 0 }} 天
                </template>
              </el-table-column>
            </el-table>
          </el-card>
        </el-col>
      </el-row>
    </div>

    <!-- 月度报告 -->
    <div class="monthly-report">
      <el-card>
        <template #header>
          <div class="report-header">
            <span class="report-title">月度工作报告</span>
            <div class="report-controls">
              <el-date-picker
                v-model="reportMonth"
                type="month"
                placeholder="选择月份"
                format="YYYY年MM月"
                value-format="YYYY-MM"
                @change="generateMonthlyReport"
              />
              <el-button type="primary" @click="generateMonthlyReport" :disabled="!hasExportPermission">
                <el-icon><Document /></el-icon>
                生成报告
              </el-button>
            </div>
          </div>
        </template>
        
        <div v-if="monthlyReport" class="report-content">
          <div class="report-summary">
            <h4>{{ reportMonth }} 工作总结</h4>
            <div class="summary-grid">
              <div class="summary-item">
                <span class="summary-label">计划总数:</span>
                <span class="summary-value">{{ monthlyReport.totalPlans }}</span>
              </div>
              <div class="summary-item">
                <span class="summary-label">完成计划:</span>
                <span class="summary-value completed">{{ monthlyReport.completedPlans }}</span>
              </div>
              <div class="summary-item">
                <span class="summary-label">进行中:</span>
                <span class="summary-value in-progress">{{ monthlyReport.inProgressPlans }}</span>
              </div>
              <div class="summary-item">
                <span class="summary-label">逾期计划:</span>
                <span class="summary-value overdue">{{ monthlyReport.overduePlans }}</span>
              </div>
              <div class="summary-item">
                <span class="summary-label">完成率:</span>
                <span class="summary-value">{{ (monthlyReport.completionRate || 0).toFixed(1) }}%</span>
              </div>
              <div class="summary-item">
                <span class="summary-label">平均进度:</span>
                <span class="summary-value">{{ (monthlyReport.avgProgress || 0).toFixed(1) }}%</span>
              </div>
            </div>
          </div>
          
          <div class="report-highlights">
            <h4>重点关注</h4>
            <ul>
              <li v-for="highlight in monthlyReport.highlights" :key="highlight">
                {{ highlight }}
              </li>
            </ul>
          </div>
          
          <div class="report-suggestions">
            <h4>改进建议</h4>
            <ul>
              <li v-for="suggestion in monthlyReport.suggestions" :key="suggestion">
                {{ suggestion }}
              </li>
            </ul>
          </div>
        </div>
        
        <div v-else class="report-placeholder">
          <el-empty description="请选择月份生成报告" />
        </div>
      </el-card>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, nextTick, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { useUserStore } from '@/store/user'
import {
  DataAnalysis,
  Refresh,
  Download,
  Files,
  CircleCheck,
  TrendCharts,
  Warning,
  Document
} from '@element-plus/icons-vue'
import * as echarts from 'echarts'
import api from '@/services/api'

// 用户状态管理
const userStore = useUserStore()
const hasExportPermission = computed(() => userStore.hasActionPermission('work-plan:statistics:export'))

// 响应式数据
const loading = ref(false)
const dateRange = ref([])
const trendPeriod = ref('month')
const reportMonth = ref('')
const overviewStats = ref({})
const userStats = ref([])
const typeStats = ref([])
const monthlyReport = ref(null)

// 图表引用
const trendChartRef = ref(null)
const statusChartRef = ref(null)
const typeChartRef = ref(null)
const departmentChartRef = ref(null)

// 图表实例
let trendChart = null
let statusChart = null
let typeChart = null
let departmentChart = null

/**
 * 获取统计概览数据
 */
const getOverviewStats = async () => {
  try {
    const params = {}
    if (dateRange.value && dateRange.value.length === 2) {
      params.startDate = dateRange.value[0]
      params.endDate = dateRange.value[1]
    }
    
    const response = await api.get('/work-plan/statistics/overview', { params })
    if (response.data.success) {
      overviewStats.value = response.data.data
    }
  } catch (error) {
    console.error('获取概览统计失败:', error)
    ElMessage.error('获取概览统计失败')
  }
}

/**
 * 获取人员绩效统计
 */
const getUserStats = async () => {
  try {
    const params = {}
    if (dateRange.value && dateRange.value.length === 2) {
      params.startDate = dateRange.value[0]
      params.endDate = dateRange.value[1]
    }
    
    const response = await api.get('/work-plan/statistics/users', { params })
    if (response.data.success) {
      userStats.value = response.data.data
    }
  } catch (error) {
    console.error('获取人员统计失败:', error)
    ElMessage.error('获取人员统计失败')
  }
}

/**
 * 获取工作类型统计
 */
const getTypeStats = async () => {
  try {
    const params = {}
    if (dateRange.value && dateRange.value.length === 2) {
      params.startDate = dateRange.value[0]
      params.endDate = dateRange.value[1]
    }
    
    const response = await api.get('/work-plan/statistics/types', { params })
    if (response.data.success) {
      typeStats.value = response.data.data
    }
  } catch (error) {
    console.error('获取类型统计失败:', error)
    ElMessage.error('获取类型统计失败')
  }
}

/**
 * 获取趋势数据并绘制图表
 */
const getTrendData = async () => {
  try {
    const params = { period: trendPeriod.value }
    if (dateRange.value && dateRange.value.length === 2) {
      params.startDate = dateRange.value[0]
      params.endDate = dateRange.value[1]
    }
    
    const response = await api.get('/work-plan/statistics/trend', { params })
    if (response.data.success) {
      drawTrendChart(response.data.data)
    }
  } catch (error) {
    console.error('获取趋势数据失败:', error)
  }
}

/**
 * 获取状态分布数据并绘制图表
 */
const getStatusData = async () => {
  try {
    const params = {}
    if (dateRange.value && dateRange.value.length === 2) {
      params.startDate = dateRange.value[0]
      params.endDate = dateRange.value[1]
    }
    
    const response = await api.get('/work-plan/statistics/status', { params })
    if (response.data.success) {
      drawStatusChart(response.data.data)
    }
  } catch (error) {
    console.error('获取状态数据失败:', error)
  }
}

/**
 * 获取部门数据并绘制图表
 */
const getDepartmentData = async () => {
  try {
    const params = {}
    if (dateRange.value && dateRange.value.length === 2) {
      params.startDate = dateRange.value[0]
      params.endDate = dateRange.value[1]
    }
    
    const response = await api.get('/work-plan/statistics/departments', { params })
    if (response.data.success) {
      drawDepartmentChart(response.data.data)
      drawTypeChart(typeStats.value)
    }
  } catch (error) {
    console.error('获取部门数据失败:', error)
  }
}

/**
 * 绘制趋势图表
 */
const drawTrendChart = (data) => {
  if (!trendChart) {
    trendChart = echarts.init(trendChartRef.value)
  } else {
    // 如果图表已存在，清空配置重新设置
    trendChart.clear()
  }
  
  const option = {
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'cross'
      }
    },
    legend: {
      data: ['新建计划', '完成计划', '逾期计划']
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      data: data.dates || []
    },
    yAxis: {
      type: 'value'
    },
    series: [
      {
        name: '新建计划',
        type: 'line',
        data: data.created || [],
        smooth: true,
        itemStyle: { color: '#409eff' }
      },
      {
        name: '完成计划',
        type: 'line',
        data: data.completed || [],
        smooth: true,
        itemStyle: { color: '#67c23a' }
      },
      {
        name: '逾期计划',
        type: 'line',
        data: data.overdue || [],
        smooth: true,
        itemStyle: { color: '#f56c6c' }
      }
    ]
  }
  
  trendChart.setOption(option)
}

/**
 * 绘制状态分布图表
 */
const drawStatusChart = (data) => {
  if (!statusChart) {
    statusChart = echarts.init(statusChartRef.value)
  } else {
    // 如果图表已存在，清空配置重新设置
    statusChart.clear()
  }
  
  const option = {
    tooltip: {
      trigger: 'item',
      formatter: '{a} <br/>{b}: {c} ({d}%)'
    },
    legend: {
      orient: 'vertical',
      left: 'left'
    },
    series: [
      {
        name: '计划状态',
        type: 'pie',
        radius: ['40%', '70%'],
        avoidLabelOverlap: false,
        label: {
          show: false,
          position: 'center'
        },
        emphasis: {
          label: {
            show: true,
            fontSize: '18',
            fontWeight: 'bold'
          }
        },
        labelLine: {
          show: false
        },
        data: data || []
      }
    ]
  }
  
  statusChart.setOption(option)
}

/**
 * 绘制类型分布图表
 */
const drawTypeChart = (data) => {
  if (!typeChart) {
    typeChart = echarts.init(typeChartRef.value)
  } else {
    // 如果图表已存在，清空配置重新设置
    typeChart.clear()
  }
  
  const option = {
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'shadow'
      }
    },
    legend: {
      data: ['总数', '完成', '进行中', '逾期']
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      data: data.map(item => item.TypeName) || []
    },
    yAxis: {
      type: 'value'
    },
    series: [
      {
        name: '总数',
        type: 'bar',
        data: data.map(item => item.TotalPlans) || [],
        itemStyle: { 
          color: '#909399',
          borderRadius: [10, 10, 0, 0]  // 顶部半圆形末端
        }
      },
      {
        name: '完成',
        type: 'bar',
        data: data.map(item => item.CompletedPlans) || [],
        itemStyle: { 
          color: '#67c23a',
          borderRadius: [10, 10, 0, 0]  // 顶部半圆形末端
        }
      },
      {
        name: '进行中',
        type: 'bar',
        data: data.map(item => item.InProgressPlans) || [],
        itemStyle: { 
          color: '#e6a23c',
          borderRadius: [10, 10, 0, 0]  // 顶部半圆形末端
        }
      },
      {
        name: '逾期',
        type: 'bar',
        data: data.map(item => item.OverduePlans) || [],
        itemStyle: { 
          color: '#f56c6c',
          borderRadius: [10, 10, 0, 0]  // 顶部半圆形末端
        }
      }
    ]
  }
  
  typeChart.setOption(option)
}

/**
 * 绘制部门统计图表
 */
const drawDepartmentChart = (data) => {
  if (!departmentChart) {
    departmentChart = echarts.init(departmentChartRef.value)
  } else {
    // 如果图表已存在，清空配置重新设置
    departmentChart.clear()
  }
  
  const option = {
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'shadow'
      }
    },
    legend: {
      data: ['完成率', '平均进度']
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      data: data.map(item => item.DepartmentName) || []
    },
    yAxis: {
      type: 'value',
      max: 100
    },
    series: [
      {
        name: '完成率',
        type: 'bar',
        data: data.map(item => item.CompletionRate) || [],
        itemStyle: { 
          color: '#409eff',
          borderRadius: [10, 10, 0, 0]  // 顶部半圆形末端
        },
        barMaxWidth: 60  // 设置柱形最大宽度为60px
      },
      {
        name: '平均进度',
        type: 'bar',
        data: data.map(item => item.AvgProgress) || [],
        itemStyle: { 
          color: '#67c23a',
          borderRadius: [10, 10, 0, 0]  // 顶部半圆形末端
        },
        barMaxWidth: 60  // 设置柱形最大宽度为60px
      }
    ]
  }
  
  departmentChart.setOption(option)
}

/**
 * 生成月度报告
 */
const generateMonthlyReport = async () => {
  if (!reportMonth.value) {
    ElMessage.warning('请选择月份')
    return
  }
  
  try {
    const response = await api.get('/work-plan/statistics/monthly-report', {
      params: { month: reportMonth.value }
    })
    if (response.data.success) {
      monthlyReport.value = response.data.data
    }
  } catch (error) {
    console.error('生成月度报告失败:', error)
    ElMessage.error('生成月度报告失败')
  }
}

/**
 * 日期范围变化处理
 */
const onDateRangeChange = () => {
  refreshData()
}

/**
 * 改变趋势周期
 */
const changeTrendPeriod = (period) => {
  trendPeriod.value = period
  getTrendData()
}

/**
 * 刷新所有数据
 */
const refreshData = async () => {
  loading.value = true
  try {
    await Promise.all([
      getOverviewStats(),
      getUserStats(),
      getTypeStats(),
      getTrendData(),
      getStatusData(),
      getDepartmentData()
    ])
  } catch (error) {
    console.error('刷新数据失败:', error)
    ElMessage.error('刷新数据失败')
  } finally {
    loading.value = false
  }
}

/**
 * 导出报告
 */
const exportReport = () => {
  ElMessage.info('导出功能开发中')
}

/**
 * 导出用户统计
 */
const exportUserStats = () => {
  ElMessage.info('导出功能开发中')
}

/**
 * 导出类型统计
 */
const exportTypeStats = () => {
  ElMessage.info('导出功能开发中')
}

/**
 * 获取变化趋势样式类
 */
const getChangeClass = (change) => {
  if (!change) return ''
  return change > 0 ? 'positive' : change < 0 ? 'negative' : ''
}

/**
 * 格式化变化值
 */
const formatChange = (change) => {
  if (!change) return ''
  const prefix = change > 0 ? '+' : ''
  return `${prefix}${change}%`
}

/**
 * 获取完成率样式类
 */
const getCompletionRateClass = (rate) => {
  if (rate >= 90) return 'excellent'
  if (rate >= 70) return 'good'
  if (rate >= 50) return 'average'
  return 'poor'
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
 * 初始化图表
 */
const initCharts = async () => {
  await nextTick()
  
  // 监听窗口大小变化
  window.addEventListener('resize', () => {
    trendChart?.resize()
    statusChart?.resize()
    typeChart?.resize()
    departmentChart?.resize()
  })
}

// 组件挂载时初始化
onMounted(async () => {
  // 设置默认日期范围为最近30天
  const endDate = new Date()
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - 30)
  dateRange.value = [
    startDate.toISOString().split('T')[0],
    endDate.toISOString().split('T')[0]
  ]
  
  // 设置默认报告月份为当前月
  reportMonth.value = new Date().toISOString().slice(0, 7)
  
  await initCharts()
  await refreshData()
})
</script>

<style scoped>
.work-statistics {
  padding: 20px;
  background-color: #f5f7fa;
  /* 参考用户管理页面的滚动条处理方式 */
  height: auto;
  overflow-x: hidden;
}

/* 页面头部样式 */
.page-header {
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

.header-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

/* 统计概览样式 */
.statistics-overview {
  margin-bottom: 20px;
}

.stat-card {
  display: flex;
  align-items: center;
  padding: 24px;
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

.total .stat-icon {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.completion .stat-icon {
  background: linear-gradient(135deg, #a8edea 0%, #fed6e3 100%);
}

.efficiency .stat-icon {
  background: linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%);
}

.overdue .stat-icon {
  background: linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%);
}

.stat-content {
  flex: 1;
}

.stat-number {
  font-size: 28px;
  font-weight: 600;
  color: #303133;
  line-height: 1;
  margin-bottom: 4px;
}

.stat-label {
  font-size: 14px;
  color: #909399;
  margin-bottom: 4px;
}

.stat-change {
  font-size: 12px;
  font-weight: 500;
}

.stat-change.positive {
  color: #67c23a;
}

.stat-change.negative {
  color: #f56c6c;
}

/* 图表区域样式 */
.charts-section {
  margin-bottom: 20px;
}

.chart-card {
  /* 取消固定高度，让图表内容自适应 */
  /* height: 400px; */
}

.chart-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.chart-title {
  font-size: 16px;
  font-weight: 600;
  color: #303133;
}

.chart-container {
  width: 100%;
  /* 调整图表容器高度，使其更加灵活 */
  height: 300px;
  min-height: 250px;
}

/* 统计表格样式 */
.statistics-tables {
  margin-bottom: 20px;
}

.table-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.table-title {
  font-size: 16px;
  font-weight: 600;
  color: #303133;
}

.progress-text {
  font-size: 12px;
  margin-left: 8px;
}

.excellent {
  color: #67c23a;
  font-weight: 500;
}

.good {
  color: #409eff;
  font-weight: 500;
}

.average {
  color: #e6a23c;
  font-weight: 500;
}

.poor {
  color: #f56c6c;
  font-weight: 500;
}

/* 月度报告样式 */
.monthly-report {
  margin-bottom: 20px;
}

.report-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.report-title {
  font-size: 16px;
  font-weight: 600;
  color: #303133;
}

.report-controls {
  display: flex;
  align-items: center;
  gap: 12px;
}

.report-content {
  padding: 20px 0;
}

.report-content h4 {
  margin: 0 0 16px 0;
  color: #303133;
  font-size: 16px;
  font-weight: 600;
  border-bottom: 2px solid #e4e7ed;
  padding-bottom: 8px;
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
  margin-bottom: 24px;
}

.summary-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px;
  background: #f8f9fa;
  border-radius: 6px;
}

.summary-label {
  color: #606266;
  font-size: 14px;
}

.summary-value {
  font-weight: 600;
  font-size: 16px;
  color: #303133;
}

.summary-value.completed {
  color: #67c23a;
}

.summary-value.in-progress {
  color: #e6a23c;
}

.summary-value.overdue {
  color: #f56c6c;
}

.report-highlights,
.report-suggestions {
  margin-bottom: 24px;
}

.report-highlights ul,
.report-suggestions ul {
  margin: 0;
  padding-left: 20px;
}

.report-highlights li,
.report-suggestions li {
  margin-bottom: 8px;
  color: #606266;
  line-height: 1.5;
}

.report-placeholder {
  text-align: center;
  padding: 40px 0;
}
</style>