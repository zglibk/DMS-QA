<template>
  <div class="dashboard-main">
    <!-- 月份选择器 -->
    <div class="month-selector">
      <el-date-picker
        v-model="selectedMonth"
        type="month"
        placeholder="选择月份"
        format="YYYY年MM月"
        value-format="YYYY-MM"
        @change="handleMonthChange"
        style="width: 200px;"
      />
    </div>

    <!-- 统计卡片行 -->
    <div class="stat-card-row" v-loading="loading">
      <div class="stat-card" v-for="item in statList" :key="item.title">
        <div class="stat-card-title">{{ item.title }}</div>
        <div class="stat-card-value">{{ item.value }}</div>
        <div class="stat-card-trend" :class="getTrendClass(item.trend, item.trendType)">
          较上月
          <span>{{ item.trend > 0 ? '+' : '' }}{{ item.trend }}%</span>
          <svg v-if="item.trend > 0" class="trend-arrow trend-up-arrow" viewBox="0 0 1024 1024" width="20" height="20">
            <path d="M929.408 202.752l-205.27 24.661a8.235 8.235 0 0 0-4.863 13.995l61.141 60.928-232.96 232.32-104.875-104.533a16.47 16.47 0 0 0-23.296 0L87.765 760.875a8.235 8.235 0 0 0 0 11.605l46.336 46.464a8.277 8.277 0 0 0 11.648 0l285.184-284.288 104.79 104.533c6.485 6.358 16.896 6.358 23.296 0L838.74 360.405l61.099 60.971c4.821 4.821 13.227 1.963 14.037-4.821l24.747-204.8a8.107 8.107 0 0 0-9.216-9.003z" :fill="getArrowColor(item.trend, item.trendType)" :stroke="getArrowColor(item.trend, item.trendType)" stroke-width="20"></path>
          </svg>
          <svg v-else-if="item.trend < 0" class="trend-arrow trend-down-arrow" viewBox="0 0 1024 1024" width="20" height="20">
            <path d="M94.592 821.248l205.27-24.661a8.235 8.235 0 0 0 4.863-13.995l-61.141-60.928 232.96-232.32 104.875 104.533a16.47 16.47 0 0 0 23.296 0l331.52-330.752a8.235 8.235 0 0 0 0-11.605l-46.336-46.464a8.277 8.277 0 0 0-11.648 0L592.067 488.344l-104.79-104.533c-6.485-6.358-16.896-6.358-23.296 0L185.26 663.595l-61.099-60.971c-4.821-4.821-13.227-1.963-14.037 4.821l-24.747 204.8a8.107 8.107 0 0 0 9.216 9.003z" :fill="getArrowColor(item.trend, item.trendType)" :stroke="getArrowColor(item.trend, item.trendType)" stroke-width="20"></path>
          </svg>
        </div>
        <div class="stat-card-icon" :style="{ background: item.iconBg }">
          <el-icon :size="22" :style="{ color: item.iconColor }">
            <component :is="item.icon" />
          </el-icon>
        </div>
      </div>
    </div>

    <!-- 质量指标详情卡片 -->
    <div class="quality-cards-row" v-loading="loading">
      <div class="quality-card">
        <div class="quality-card-title">一次交检合格率</div>
        <div class="quality-card-value">{{ qualityStats.passRate }}%</div>
        <div class="quality-card-detail">
          交检批次: {{ qualityStats.totalInspections }} | 不合格: {{ qualityStats.failedInspections }}
        </div>
        <div class="quality-card-trend" :class="getTrendClass(passRateTrend, 'positive')">
          较上月
          <span>{{ passRateTrend > 0 ? '+' : '' }}{{ passRateTrend }}%</span>
          <svg v-if="passRateTrend > 0" class="trend-arrow trend-up-arrow" viewBox="0 0 1024 1024" width="20" height="20">
            <path d="M929.408 202.752l-205.27 24.661a8.235 8.235 0 0 0-4.863 13.995l61.141 60.928-232.96 232.32-104.875-104.533a16.47 16.47 0 0 0-23.296 0L87.765 760.875a8.235 8.235 0 0 0 0 11.605l46.336 46.464a8.277 8.277 0 0 0 11.648 0l285.184-284.288 104.79 104.533c6.485 6.358 16.896 6.358 23.296 0L838.74 360.405l61.099 60.971c4.821 4.821 13.227 1.963 14.037-4.821l24.747-204.8a8.107 8.107 0 0 0-9.216-9.003z" :fill="getArrowColor(passRateTrend, 'positive')" :stroke="getArrowColor(passRateTrend, 'positive')" stroke-width="20"></path>
          </svg>
          <svg v-else-if="passRateTrend < 0" class="trend-arrow trend-down-arrow" viewBox="0 0 1024 1024" width="20" height="20">
            <path d="M94.592 821.248l205.27-24.661a8.235 8.235 0 0 0 4.863-13.995l-61.141-60.928 232.96-232.32 104.875 104.533a16.47 16.47 0 0 0 23.296 0l331.52-330.752a8.235 8.235 0 0 0 0-11.605l-46.336-46.464a8.277 8.277 0 0 0-11.648 0L592.067 488.344l-104.79-104.533c-6.485-6.358-16.896-6.358-23.296 0L185.26 663.595l-61.099-60.971c-4.821-4.821-13.227-1.963-14.037 4.821l-24.747 204.8a8.107 8.107 0 0 0 9.216 9.003z" :fill="getArrowColor(passRateTrend, 'positive')" :stroke="getArrowColor(passRateTrend, 'positive')" stroke-width="20"></path>
          </svg>
        </div>
        <div class="quality-card-icon">
          <el-icon :size="24" color="#67c23a">
            <CircleCheck />
          </el-icon>
        </div>
      </div>

      <div class="quality-card">
        <div class="quality-card-title">客诉率</div>
        <div class="quality-card-value">{{ qualityStats.complaintRate }}%</div>
        <div class="quality-card-detail">
          交付批次: {{ qualityStats.totalDeliveries }} | 客诉: {{ qualityStats.complaintBatches }}
        </div>
        <div class="quality-card-trend" :class="getTrendClass(complaintRateTrend, 'negative')">
          较上月
          <span>{{ complaintRateTrend > 0 ? '+' : '' }}{{ complaintRateTrend }}%</span>
          <svg v-if="complaintRateTrend > 0" class="trend-arrow trend-up-arrow" viewBox="0 0 1024 1024" width="20" height="20">
            <path d="M929.408 202.752l-205.27 24.661a8.235 8.235 0 0 0-4.863 13.995l61.141 60.928-232.96 232.32-104.875-104.533a16.47 16.47 0 0 0-23.296 0L87.765 760.875a8.235 8.235 0 0 0 0 11.605l46.336 46.464a8.277 8.277 0 0 0 11.648 0l285.184-284.288 104.79 104.533c6.485 6.358 16.896 6.358 23.296 0L838.74 360.405l61.099 60.971c4.821 4.821 13.227 1.963 14.037-4.821l24.747-204.8a8.107 8.107 0 0 0-9.216-9.003z" :fill="getArrowColor(complaintRateTrend, 'negative')" :stroke="getArrowColor(complaintRateTrend, 'negative')" stroke-width="20"></path>
          </svg>
          <svg v-else-if="complaintRateTrend < 0" class="trend-arrow trend-down-arrow" viewBox="0 0 1024 1024" width="20" height="20">
            <path d="M94.592 821.248l205.27-24.661a8.235 8.235 0 0 0 4.863-13.995l-61.141-60.928 232.96-232.32 104.875 104.533a16.47 16.47 0 0 0 23.296 0l331.52-330.752a8.235 8.235 0 0 0 0-11.605l-46.336-46.464a8.277 8.277 0 0 0-11.648 0L592.067 488.344l-104.79-104.533c-6.485-6.358-16.896-6.358-23.296 0L185.26 663.595l-61.099-60.971c-4.821-4.821-13.227-1.963-14.037 4.821l-24.747 204.8a8.107 8.107 0 0 0 9.216 9.003z" :fill="getArrowColor(complaintRateTrend, 'negative')" :stroke="getArrowColor(complaintRateTrend, 'negative')" stroke-width="20"></path>
          </svg>
        </div>
        <div class="quality-card-icon">
          <el-icon :size="24" color="#f56c6c">
            <Warning />
          </el-icon>
        </div>
      </div>
    </div>

    <!-- 趋势图表区域 -->
    <div class="charts-section" v-loading="loading">
      <div class="chart-container">
        <div class="chart-title">
          <i class="el-icon-data-line" style="color: #409eff; margin-right: 8px;"></i>
          质量指标趋势
        </div>
        <div ref="qualityTrendChart" class="chart-content"></div>
      </div>

      <div class="chart-container">
        <div class="chart-title">
          <i class="el-icon-warning" style="color: #e6a23c; margin-right: 8px;"></i>
          投诉数量趋势
        </div>
        <div ref="complaintTrendChart" class="chart-content"></div>
      </div>
    </div>

    <!-- 各单位投诉统计横道图 -->
    <div class="unit-stats-section" v-loading="loading">
      <div class="section-title">
        <i class="el-icon-office-building" style="color: #909399; margin-right: 8px;"></i>
        各单位投诉统计
      </div>
      <div class="unit-stats-content">
        <div class="unit-chart-wrapper">
          <div ref="unitStatsChart" class="unit-chart-content"></div>
        </div>
        <div class="unit-data-list">
          <div class="unit-data-header">
            <div class="header-left">
              <span class="month-label">{{ selectedMonth }}月数据</span>
            </div>
            <div class="header-right">
              <el-date-picker
                v-model="bottomSelectedDate"
                type="month"
                placeholder="选择月份"
                format="YYYY-MM"
                value-format="YYYY-MM"
                size="small"
                @change="handleBottomMonthChange"
                style="width: 120px;"
              />
            </div>
          </div>
          <div class="unit-table-container">
            <el-table
              :data="unitStats"
              style="width: 100%"
              height="320"
              size="small"
              stripe
            >
              <el-table-column prop="unit" label="单位" width="80" />
              <el-table-column prop="inner" label="内诉" width="50" align="center">
                <template #default="scope">
                  <span class="inner-badge">{{ scope.row.inner }}</span>
                </template>
              </el-table-column>
              <el-table-column prop="outer" label="客诉" width="50" align="center">
                <template #default="scope">
                  <span class="outer-badge">{{ scope.row.outer }}</span>
                </template>
              </el-table-column>
              <el-table-column label="总计" width="50" align="center">
                <template #default="scope">
                  <span class="total-badge">{{ scope.row.inner + scope.row.outer }}</span>
                </template>
              </el-table-column>
            </el-table>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed, nextTick, onBeforeUnmount } from 'vue'
import { PieChart, WarningFilled, DataLine, RefreshRight, CircleCheck, Warning, ArrowUp, ArrowDown } from '@element-plus/icons-vue'
import api from '@/utils/api'
import { ElMessage } from 'element-plus'
import * as echarts from 'echarts'

// 响应式数据
const loading = ref(false)
const selectedMonth = ref(getCurrentMonth())
const monthStats = ref({
  todayCount: 0,
  monthCount: 0,
  monthInnerCount: 0,
  monthOuterCount: 0
})
const lastMonthStats = ref({
  monthCount: 0,
  monthInnerCount: 0,
  monthOuterCount: 0
})
const batchStats = ref({
  currentDeliveryBatches: 0,
  lastDeliveryBatches: 0
})
const qualityStats = ref({
  passRate: 0,
  totalInspections: 0,
  failedInspections: 0,
  complaintRate: 0,
  totalDeliveries: 0,
  complaintBatches: 0
})
const lastQualityStats = ref({
  passRate: 0,
  complaintRate: 0
})
const unitStats = ref([])
const bottomSelectedDate = ref(getCurrentMonth())

// 图表相关
const qualityTrendChart = ref(null)
const complaintTrendChart = ref(null)
const unitStatsChart = ref(null)
let qualityChartInstance = null
let complaintChartInstance = null
let unitStatsChartInstance = null
const trendData = ref({
  months: [],
  passRates: [],
  complaintRates: [],
  complaintCounts: []
})

// 获取当前月份
function getCurrentMonth() {
  const now = new Date()
  const year = now.getFullYear()
  const month = (now.getMonth() + 1).toString().padStart(2, '0')
  return `${year}-${month}`
}

// 获取上个月份
function getLastMonth(currentMonth) {
  const [year, month] = currentMonth.split('-').map(Number)
  let lastYear = year
  let lastMonth = month - 1

  if (lastMonth === 0) {
    lastYear = year - 1
    lastMonth = 12
  }

  return `${lastYear}-${lastMonth.toString().padStart(2, '0')}`
}

// 计算趋势百分比
function calculateTrend(current, previous) {
  if (!previous || previous === 0) return 0
  const trend = ((current - previous) / previous * 100)
  return parseFloat(trend.toFixed(1))
}

// 计算统计卡片数据
const statList = computed(() => {
  const currentTotal = monthStats.value.monthCount
  const lastTotal = lastMonthStats.value.monthCount
  const currentInner = monthStats.value.monthInnerCount
  const currentOuter = monthStats.value.monthOuterCount
  const currentDeliveries = batchStats.value.currentDeliveryBatches
  const lastDeliveries = batchStats.value.lastDeliveryBatches

  return [
    {
      title: '本月交付批次',
      value: currentDeliveries,
      trend: calculateTrend(currentDeliveries, lastDeliveries),
      trendType: 'positive', // 上升为好（绿色），下降为坏（红色）
      icon: PieChart,
      iconBg: '#f5f8ff',
      iconColor: '#6b8cff'
    },
    {
      title: '本月投诉总数',
      value: currentTotal,
      trend: calculateTrend(currentTotal, lastTotal),
      trendType: 'negative', // 上升为坏（红色），下降为好（绿色）
      icon: WarningFilled,
      iconBg: '#fff7f5',
      iconColor: '#f56c6c'
    },
    {
      title: '本月内诉数',
      value: currentInner,
      trend: calculateTrend(currentInner, lastMonthStats.value.monthInnerCount),
      trendType: 'negative', // 上升为坏（红色），下降为好（绿色）
      icon: DataLine,
      iconBg: '#fff7f5',
      iconColor: '#e6a23c'
    },
    {
      title: '本月客诉数',
      value: currentOuter,
      trend: calculateTrend(currentOuter, lastMonthStats.value.monthOuterCount),
      trendType: 'negative', // 上升为坏（红色），下降为好（绿色）
      icon: RefreshRight,
      iconBg: '#f5faff',
      iconColor: '#f56c6c'
    }
  ]
})

// 计算质量指标趋势
const passRateTrend = computed(() => {
  return calculateTrend(qualityStats.value.passRate, lastQualityStats.value.passRate)
})

const complaintRateTrend = computed(() => {
  return calculateTrend(qualityStats.value.complaintRate, lastQualityStats.value.complaintRate)
})

// 获取趋势CSS类
function getTrendClass(trend, trendType) {
  if (trend === 0) return ''

  if (trendType === 'positive') {
    // 对于正向指标（交付批次、一次交检合格率）：上升为好，下降为坏
    return trend > 0 ? 'trend-good' : 'trend-bad'
  } else {
    // 对于负向指标（投诉相关）：上升为坏，下降为好
    return trend > 0 ? 'trend-bad' : 'trend-good'
  }
}

// 获取箭头颜色
function getArrowColor(trend, trendType) {
  if (trend === 0) return '#909399'

  if (trendType === 'positive') {
    // 对于正向指标：上升绿色，下降红色
    return trend > 0 ? '#67c23a' : '#f56c6c'
  } else {
    // 对于负向指标：上升红色，下降绿色
    return trend > 0 ? '#f56c6c' : '#67c23a'
  }
}



// 获取仪表盘数据
async function fetchDashboardData() {
  try {
    console.log('=== 开始获取仪表盘数据 ===')
    loading.value = true
    const token = localStorage.getItem('token')

    if (!token) {
      ElMessage.error('请先登录')
      return
    }
    
    console.log('Token验证通过，开始获取数据...')

    // 并行获取当前月份和上月数据，以及批次统计数据
    const [currentRes, lastMonthRes, currentBatchRes, lastBatchRes] = await Promise.all([
      api.get('/complaint/month-stats', {
        params: { month: selectedMonth.value }
      }),
      api.get('/complaint/month-stats', {
        params: { month: getLastMonth(selectedMonth.value) }
      }),
      api.get('/quality-metrics/month-batch-stats', {
        params: { month: selectedMonth.value }
      }),
      api.get('/quality-metrics/month-batch-stats', {
        params: { month: getLastMonth(selectedMonth.value) }
      })
    ])

    if (currentRes.data.success) {
      monthStats.value = {
        todayCount: currentRes.data.todayCount || 0,
        monthCount: currentRes.data.monthCount || 0,
        monthInnerCount: currentRes.data.monthInnerCount || 0,
        monthOuterCount: currentRes.data.monthOuterCount || 0
      }
      unitStats.value = currentRes.data.units || []
    }

    if (lastMonthRes.data.success) {
      lastMonthStats.value = {
        monthCount: lastMonthRes.data.monthCount || 0,
        monthInnerCount: lastMonthRes.data.monthInnerCount || 0,
        monthOuterCount: lastMonthRes.data.monthOuterCount || 0
      }
    }

    // 处理批次统计数据
    if (currentBatchRes.data.success) {
      batchStats.value.currentDeliveryBatches = currentBatchRes.data.data.deliveryBatches || 0
    }

    if (lastBatchRes.data.success) {
      batchStats.value.lastDeliveryBatches = lastBatchRes.data.data.deliveryBatches || 0
    }

    // 获取质量统计数据和趋势数据
    await Promise.all([
      fetchQualityStats(token),
      fetchLastQualityStats(token),
      fetchTrendData(token)
    ])

    // 初始化图表
    console.log('=== 数据获取完成，准备初始化图表 ===')
    console.log('trendData.value:', trendData.value)
    await nextTick()
    initCharts()
    console.log('=== 图表初始化完成 ===')

  } catch (error) {
    ElMessage.error('获取仪表盘数据失败')
  } finally {
    loading.value = false
  }
}

// 获取质量统计数据
async function fetchQualityStats(token) {
  try {
    // 计算正确的月末日期
    const [year, month] = selectedMonth.value.split('-').map(Number)
    const lastDay = new Date(year, month, 0).getDate() // 获取该月的最后一天
    const startDate = `${selectedMonth.value}-01`
    const endDate = `${selectedMonth.value}-${lastDay.toString().padStart(2, '0')}`

    // 并行获取数据
    const [innerComplaintRes, outerComplaintRes, batchStatsRes] = await Promise.all([
      // 获取内诉数量（不合格数）
      api.get('/complaint/list', {
        params: {
          page: 1,
          pageSize: 1,
          complaintCategory: '内诉',
          startDate: startDate,
          endDate: endDate
        }
      }),
      // 获取客诉批次数量
      api.get('/complaint/list', {
        params: {
          page: 1,
          pageSize: 1,
          complaintCategory: '客诉',
          startDate: startDate,
          endDate: endDate
        }
      }),
      // 获取月度批次统计数据
      api.get('/quality-metrics/month-batch-stats', {
        params: {
          month: selectedMonth.value
        }
      })
    ])

    const failedInspections = innerComplaintRes.data.total || 0
    const complaintBatches = outerComplaintRes.data.total || 0

    // 从API获取真实的批次数据
    const batchData = batchStatsRes.data.success ? batchStatsRes.data.data : null
    const totalInspections = batchData ? batchData.inspectionBatches : 0
    const totalDeliveries = batchData ? batchData.deliveryBatches : 0

    // 计算合格率和客诉率
    const passRate = totalInspections > 0 ?
      ((totalInspections - failedInspections) / totalInspections * 100).toFixed(1) : 0
    const complaintRate = totalDeliveries > 0 ?
      (complaintBatches / totalDeliveries * 100).toFixed(1) : 0

    qualityStats.value = {
      passRate: parseFloat(passRate),
      totalInspections,
      failedInspections,
      complaintRate: parseFloat(complaintRate),
      totalDeliveries,
      complaintBatches
    }
  } catch (error) {
    // 设置默认值
    qualityStats.value = {
      passRate: 0,
      totalInspections: 0,
      failedInspections: 0,
      complaintRate: 0,
      totalDeliveries: 0,
      complaintBatches: 0
    }
  }
}

// 获取上月质量统计数据
async function fetchLastQualityStats(token) {
  try {
    const lastMonth = getLastMonth(selectedMonth.value)
    const [year, month] = lastMonth.split('-').map(Number)
    const lastDay = new Date(year, month, 0).getDate()
    const startDate = `${lastMonth}-01`
    const endDate = `${lastMonth}-${lastDay.toString().padStart(2, '0')}`

    // 并行获取上月数据
    const [innerComplaintRes, outerComplaintRes, batchStatsRes] = await Promise.all([
      // 获取上月内诉数量
      api.get('/complaint/list', {
        params: {
          page: 1,
          pageSize: 1,
          complaintCategory: '内诉',
          startDate: startDate,
          endDate: endDate
        }
      }),
      // 获取上月客诉数量
      api.get('/complaint/list', {
        params: {
          page: 1,
          pageSize: 1,
          complaintCategory: '客诉',
          startDate: startDate,
          endDate: endDate
        }
      }),
      // 获取上月批次统计数据
      api.get('/quality-metrics/month-batch-stats', {
        params: {
          month: lastMonth
        }
      })
    ])

    if (innerComplaintRes.data.success && outerComplaintRes.data.success && batchStatsRes.data.success) {
      const failedInspections = innerComplaintRes.data.total || 0
      const totalInspections = batchStatsRes.data.data.inspectionBatches || 0
      const passRate = totalInspections > 0 ? parseFloat(((totalInspections - failedInspections) / totalInspections * 100).toFixed(2)) : 0

      const complaintBatches = outerComplaintRes.data.total || 0
      const totalDeliveries = batchStatsRes.data.data.deliveryBatches || 0
      const complaintRate = totalDeliveries > 0 ? parseFloat((complaintBatches / totalDeliveries * 100).toFixed(2)) : 0

      lastQualityStats.value = {
        passRate,
        complaintRate
      }
    }
  } catch (error) {
    // 设置默认值
    lastQualityStats.value = {
      passRate: 0,
      complaintRate: 0
    }
  }
}

// 获取质量目标数据
/**
 * 根据年份和目标名称获取质量目标值
 * @param {string} token - 认证令牌
 * @param {number} year - 年份
 * @param {string} targetName - 目标名称
 * @returns {Promise<number>} 目标值
 */
async function fetchQualityTarget(token, year, targetName) {
  try {
    const response = await api.get('/quality-targets', {
      params: {
        year: year,
        keyword: targetName,
        page: 1,
        pageSize: 1
      }
    })
    
    if (response.data.success && response.data.data && response.data.data.records && response.data.data.records.length > 0) {
      const target = response.data.data.records[0]
      if (target.TargetValue) {
        // 解析目标值，处理特殊符号（如≥、%等）
        const targetValue = target.TargetValue.replace(/[≥%]/g, '').trim()
        const parsedValue = parseFloat(targetValue) || 98.5
        return parsedValue
      }
    }
    return 98.5
  } catch (error) {
    console.warn('获取质量目标失败:', error)
    return 0
  }
}

// 获取趋势数据
async function fetchTrendData(token) {
  try {
    // 从selectedMonth中提取年份
    const selectedYear = selectedMonth.value ? parseInt(selectedMonth.value.split('-')[0]) : new Date().getFullYear()
    
    // 并行获取趋势数据和质量目标数据
    const [trendResponse, qualityTargetValue] = await Promise.all([
      api.get('/quality-metrics/trends', {
        params: { year: selectedYear }
      }),
      fetchQualityTarget(token, selectedYear, '一次交检合格率')
    ])

    if (trendResponse.data.success && trendResponse.data.data && Array.isArray(trendResponse.data.data)) {
      const data = trendResponse.data.data
      trendData.value = {
        months: data.map(item => item && item.StatMonth ? `${item.StatMonth}月` : ''),
        passRates: data.map(item => item && item.FirstPassRate ? parseFloat(item.FirstPassRate) : 0),
        // 客诉率 = 客诉数量 / 发货批次 * 100
        complaintRates: data.map(item => {
          if (!item) return 0
          const deliveryBatches = parseInt(item.DeliveryBatches || 0)
          const customerComplaints = parseInt(item.CustomerComplaints || 0)
          return deliveryBatches > 0 ? parseFloat((customerComplaints / deliveryBatches * 100).toFixed(2)) : 0
        }),
        complaintCounts: data.map(item => item && item.CustomerComplaints ? parseInt(item.CustomerComplaints) : 0),
        // 添加质量目标值
        qualityTarget: qualityTargetValue
      }
    } else {
      // 如果没有数据，使用默认空数据
      trendData.value = {
        months: [],
        passRates: [],
        complaintRates: [],
        complaintCounts: [],
        qualityTarget: qualityTargetValue
      }
    }
  } catch (error) {
    // 趋势数据获取失败，使用默认数据
    const months = []
    for (let i = 1; i <= 12; i++) {
      months.push(`${i}月`)
    }
    trendData.value = {
      months,
      passRates: new Array(12).fill(0),
      complaintRates: new Array(12).fill(0),
      complaintCounts: new Array(12).fill(0),
      qualityTarget: 98.5
    }
  }
}

// 初始化图表
function initCharts() {
  // 确保数据已经初始化
  if (!trendData.value) {
    trendData.value = {
      months: [],
      passRates: [],
      complaintRates: [],
      complaintCounts: [],
      qualityTarget: 98.5
    }
  }

  if (!unitStats.value) {
    unitStats.value = []
  }

  initQualityTrendChart()
  initComplaintTrendChart()
  initUnitStatsChart()
}

// 初始化质量趋势图表
function initQualityTrendChart() {
  if (qualityTrendChart.value && trendData.value) {
    qualityChartInstance = echarts.init(qualityTrendChart.value)

    // 确保数据存在，避免 undefined 错误
    const months = trendData.value.months || []
    const passRates = trendData.value.passRates || []
    const complaintRates = trendData.value.complaintRates || []
    const qualityTarget = trendData.value.qualityTarget || 98.5
    const targetLineData = new Array(months.length).fill(qualityTarget)
    
    // 调试输出：图表加载时的关键信息
    console.log('=== 图表加载调试信息 ===')
    console.log('目标值 (qualityTarget):', qualityTarget)
    console.log('目标线数据 (targetLineData):', targetLineData)
    console.log('月份数据 (months):', months)
    console.log('合格率数据 (passRates):', passRates)
    console.log('客诉率数据 (complaintRates):', complaintRates)
    
    const option = {
      title: {
        text: '质量指标月度趋势',
        left: 'center',
        textStyle: {
          fontSize: 16,
          color: '#409eff',
          fontWeight: 'bold'
        }
      },
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'cross',
          crossStyle: {
            color: '#999'
          }
        },
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        borderColor: '#e4e7ed',
        borderWidth: 1,
        textStyle: {
          color: '#333'
        },
        formatter: function(params) {
          if (!params || params.length === 0) return ''
          let result = `<div style="font-weight: bold; margin-bottom: 5px;">${params[0].axisValue}</div>`
          params.forEach(param => {
            const color = param.color && param.color.borderColor ? param.color.borderColor : param.color
            result += `<div style="margin: 3px 0;">
              <span style="display: inline-block; width: 10px; height: 10px; border-radius: 50%; background-color: ${color}; margin-right: 8px;"></span>
              ${param.seriesName}: <strong>${param.value}${param.seriesName.includes('率') ? '%' : ''}</strong>
            </div>`
          })
          return result
        }
      },
      legend: {
        data: ['一次交检合格率', '客诉率', '目标线'],
        bottom: 10
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '15%',
        containLabel: true
      },
      xAxis: {
        type: 'category',
        data: months,
        axisLine: {
          show: false
        },
        axisTick: {
          show: false
        },
        axisLabel: {
          color: '#666',
          fontSize: 12,
          fontWeight: 'bold'
        }
      },
      yAxis: [
        {
          type: 'value',
          name: '合格率(%)',
          min: Math.min(95, qualityTarget - 2),
          max: Math.max(100, qualityTarget + 2),
          axisLine: {
            show: false
          },
          axisTick: {
            show: false
          },
          axisLabel: {
            color: '#666',
            fontSize: 12,
            fontWeight: 'bold'
          },
          splitLine: {
            show: false
          }
        },
        {
          type: 'value',
          name: '客诉率(%)',
          min: 0,
          max: 2,
          axisLine: {
            show: false
          },
          axisTick: {
            show: false
          },
          axisLabel: {
            color: '#666',
            fontSize: 12,
            fontWeight: 'bold'
          },
          splitLine: {
            show: false
          }
        }
      ],
      series: [
        {
          name: '一次交检合格率',
          type: 'line',
          yAxisIndex: 0,
          data: passRates,
          lineStyle: {
            color: '#67c23a',
            width: 3
          },
          itemStyle: {
            color: '#ffffff',
            borderColor: '#67c23a',
            borderWidth: 3
          },
          symbol: 'circle',
          symbolSize: 8,
          smooth: true,
          emphasis: {
            itemStyle: {
              shadowBlur: 10,
              shadowColor: 'rgba(103, 194, 58, 0.3)'
            }
          },
          areaStyle: {
            color: {
              type: 'linear',
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                {
                  offset: 0,
                  color: 'rgba(103, 194, 58, 0.3)'
                },
                {
                  offset: 1,
                  color: 'rgba(103, 194, 58, 0.1)'
                }
              ]
            }
          }
        },
        {
          name: '客诉率',
          type: 'line',
          yAxisIndex: 1,
          data: complaintRates,
          lineStyle: {
            color: '#f56c6c',
            width: 3
          },
          itemStyle: {
            color: '#ffffff',
            borderColor: '#f56c6c',
            borderWidth: 3
          },
          symbol: 'circle',
          symbolSize: 8,
          smooth: true,
          emphasis: {
            itemStyle: {
              shadowBlur: 10,
              shadowColor: 'rgba(245, 108, 108, 0.3)'
            }
          },
          areaStyle: {
            color: {
              type: 'linear',
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                {
                  offset: 0,
                  color: 'rgba(245, 108, 108, 0.3)'
                },
                {
                  offset: 1,
                  color: 'rgba(245, 108, 108, 0.1)'
                }
              ]
            }
          }
        },
        {
          name: '目标线',
          type: 'line',
          yAxisIndex: 0,
          data: targetLineData,
          lineStyle: {
            color: '#409eff',
            width: 2,
            type: 'dashed'
          },
          itemStyle: {
            color: '#409eff',
            borderColor: '#409eff',
            borderWidth: 2
          },
          symbol: 'circle',
          symbolSize: 4,
          smooth: false,
          showSymbol: true
        }
      ]
    }

    // 调试输出：系列配置信息
    console.log('=== 图表系列配置调试信息 ===')
    if (option.series && Array.isArray(option.series)) {
      option.series.forEach((series, index) => {
        if (series) {
          console.log(`系列 ${index + 1}:`)
          console.log('  - 系列名称:', series.name || '未定义')
          console.log('  - 系列类型:', series.type || '未定义')
          console.log('  - Y轴索引:', series.yAxisIndex || 0)
          console.log('  - 系列数据:', series.data || [])
          console.log('  - 数据长度:', series.data ? series.data.length : 0)
        } else {
          console.warn(`系列 ${index + 1}: 数据为空或undefined`)
        }
      })
    } else {
      console.warn('option.series 不存在或不是数组')
    }
    console.log('=========================')
    
    // 强制重新渲染图表
    qualityChartInstance.clear()
    qualityChartInstance.setOption(option, true)
    qualityChartInstance.resize()
  }
}

// 初始化投诉趋势图表
function initComplaintTrendChart() {
  if (complaintTrendChart.value && trendData.value) {
    complaintChartInstance = echarts.init(complaintTrendChart.value)

    // 确保数据存在，避免 undefined 错误
    const months = trendData.value.months || []
    const complaintCounts = trendData.value.complaintCounts || []

    const option = {
      title: {
        text: '投诉数量月度趋势',
        left: 'center',
        textStyle: {
          fontSize: 16,
          color: '#e6a23c',
          fontWeight: 'bold'
        }
      },
      tooltip: {
        trigger: 'axis',
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        borderColor: '#e4e7ed',
        borderWidth: 1,
        textStyle: {
          color: '#333'
        },
        formatter: function(params) {
          if (!params || params.length === 0) return ''
          let result = `<div style="font-weight: bold; margin-bottom: 5px;">${params[0].axisValue}</div>`
          params.forEach(param => {
            const color = param.color && param.color.borderColor ? param.color.borderColor : param.color
            result += `<div style="margin: 3px 0;">
              <span style="display: inline-block; width: 10px; height: 10px; border-radius: 50%; background-color: ${color}; margin-right: 8px;"></span>
              ${param.seriesName}: <strong>${param.value}</strong>
            </div>`
          })
          return result
        }
      },
      legend: {
        data: ['投诉总数'],
        bottom: 10
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '15%',
        containLabel: true
      },
      xAxis: {
        type: 'category',
        data: months,
        axisLine: {
          show: false
        },
        axisTick: {
          show: false
        },
        axisLabel: {
          color: '#666',
          fontSize: 12,
          fontWeight: 'bold'
        }
      },
      yAxis: {
        type: 'value',
        name: '投诉数量',
        axisLine: {
          show: false
        },
        axisTick: {
          show: false
        },
        axisLabel: {
          color: '#666',
          fontSize: 12,
          fontWeight: 'bold'
        },
        splitLine: {
          show: false
        }
      },
      series: [
        {
          name: '投诉总数',
          type: 'line',
          data: complaintCounts,
          lineStyle: {
            color: '#e6a23c',
            width: 3
          },
          itemStyle: {
            color: '#ffffff',
            borderColor: '#e6a23c',
            borderWidth: 3
          },
          symbol: 'circle',
          symbolSize: 8,
          smooth: true,
          emphasis: {
            itemStyle: {
              shadowBlur: 10,
              shadowColor: 'rgba(230, 162, 60, 0.3)'
            }
          },
          areaStyle: {
            color: {
              type: 'linear',
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                {
                  offset: 0,
                  color: 'rgba(230, 162, 60, 0.3)'
                },
                {
                  offset: 1,
                  color: 'rgba(230, 162, 60, 0.1)'
                }
              ]
            }
          }
        }
      ]
    }

    complaintChartInstance.setOption(option)
  }
}

// 初始化单位统计横道图
function initUnitStatsChart() {
  if (unitStatsChart.value && unitStats.value) {
    unitStatsChartInstance = echarts.init(unitStatsChart.value)

    // 确保数据存在，避免 undefined 错误
    const units = unitStats.value || []
    const unitNames = units.map(item => item && item.unit ? item.unit : '')
    const innerData = units.map(item => item && typeof item.inner !== 'undefined' ? item.inner : 0)
    const outerData = units.map(item => item && typeof item.outer !== 'undefined' ? item.outer : 0)

    const option = {
      title: {
        text: '各单位投诉统计',
        left: 'center',
        textStyle: {
          fontSize: 16,
          color: '#909399',
          fontWeight: 'bold'
        }
      },
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'shadow'
        },
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        borderColor: '#e4e7ed',
        borderWidth: 1,
        textStyle: {
          color: '#333'
        }
      },
      legend: {
        data: ['内诉', '客诉'],
        bottom: 10
      },
      grid: {
        left: '15%',
        right: '4%',
        bottom: '15%',
        top: '15%',
        containLabel: true
      },
      xAxis: {
        type: 'value',
        axisLine: {
          show: false
        },
        axisTick: {
          show: false
        },
        axisLabel: {
          color: '#666',
          fontSize: 12,
          fontWeight: 'bold'
        },
        splitLine: {
          show: false
        }
      },
      yAxis: {
        type: 'category',
        data: unitNames,
        axisLine: {
          show: false
        },
        axisTick: {
          show: false
        },
        axisLabel: {
          color: '#666',
          fontSize: 12,
          fontWeight: 'bold'
        }
      },
      series: [
        {
          name: '内诉',
          type: 'bar',
          stack: 'total',
          data: innerData,
          itemStyle: {
            color: '#67c23a'
          }
        },
        {
          name: '客诉',
          type: 'bar',
          stack: 'total',
          data: outerData,
          itemStyle: {
            color: '#f56c6c'
          }
        }
      ]
    }

    unitStatsChartInstance.setOption(option)
  }
}

// 月份变化处理
function handleMonthChange() {
  // 同步底部选择器
  bottomSelectedDate.value = selectedMonth.value
  nextTick(() => {
    fetchDashboardData()
  })
}

// 底部月份变化处理
function handleBottomMonthChange(value) {
  if (value && value !== selectedMonth.value) {
    selectedMonth.value = value
    nextTick(() => {
      fetchDashboardData()
    })
  }
}

// 组件挂载时获取数据
onMounted(() => {
  console.log('=== Dashboard页面开始加载 ===')
  console.log('当前时间:', new Date().toLocaleString())
  console.log('当前选择月份:', selectedMonth.value)
  
  fetchDashboardData()
  
  console.log('=== Dashboard页面加载完成 ===')
})

// 组件卸载时销毁图表
onBeforeUnmount(() => {
  if (qualityChartInstance) {
    qualityChartInstance.dispose()
  }
  if (complaintChartInstance) {
    complaintChartInstance.dispose()
  }
  if (unitStatsChartInstance) {
    unitStatsChartInstance.dispose()
  }
})
</script>

<style scoped>
.dashboard-main {
  /* 背景图片暂时注释，等待用户添加 bg.jpg 文件 */
  /* background: url('@/assets/images/bg.jpg') no-repeat center center fixed; */
  /* background-size: cover; */
  background: #f5f7fa;
  height: auto;
  position: relative;
}

/* 背景图片遮罩层暂时注释
.dashboard-main::before {
  content: '';
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(245, 247, 250, 0.85);
  z-index: -1;
  pointer-events: none;
}
*/

.month-selector {
  margin-bottom: 20px;
  display: flex;
  align-items: center;
  gap: 10px;
}

.stat-card-row {
  display: flex;
  gap: 20px;
  margin-bottom: 20px;
}

.stat-card {
  flex: 1;
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 2px 12px 0 rgba(0,0,0,0.06);
  padding: 20px;
  display: flex;
  flex-direction: column;
  position: relative;
  min-height: 120px;
  transition: all 0.3s ease;
}

.stat-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 20px 0 rgba(0,0,0,0.1);
}

.stat-card-title {
  font-size: 14px;
  color: #409eff;
  font-weight: 600;
  margin-bottom: 8px;
}

.stat-card-value {
  font-size: 36px;
  font-weight: bold;
  color: #303133;
  margin-bottom: 8px;
  line-height: 1;
}

.stat-card-trend {
  font-size: 12px;
  color: #999;
  margin-bottom: 0;
}

.stat-card-trend span {
  margin-left: 4px;
  font-weight: bold;
}

.trend-up span {
  color: #67c23a;
}

.trend-down span {
  color: #f56c6c;
}

/* 新的趋势颜色类 */
.trend-good span {
  color: #67c23a;
}

.trend-bad span {
  color: #f56c6c;
}

/* 趋势箭头样式 */
.trend-arrow {
  margin-left: 6px;
  vertical-align: middle;
  display: inline-block;
}

.trend-up-arrow {
  animation: bounce-up 1.5s ease-in-out infinite;
}

.trend-down-arrow {
  animation: bounce-down 1.5s ease-in-out infinite;
}

/* 箭头动画效果 */
@keyframes bounce-up {
  0%, 100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-2px);
  }
}

@keyframes bounce-down {
  0%, 100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(2px);
  }
}

.stat-card-icon {
  position: absolute;
  right: 20px;
  top: 20px;
  width: 40px;
  height: 40px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.quality-cards-row {
  display: flex;
  gap: 20px;
  margin-bottom: 20px;
}

.quality-card {
  flex: 1;
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 2px 12px 0 rgba(0,0,0,0.06);
  padding: 20px;
  position: relative;
  transition: all 0.3s ease;
}

.quality-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 20px 0 rgba(0,0,0,0.1);
}

.quality-card-title {
  font-size: 14px;
  color: #409eff;
  font-weight: 600;
  margin-bottom: 8px;
}

.quality-card-value {
  font-size: 36px;
  font-weight: bold;
  color: #303133;
  margin-bottom: 8px;
  line-height: 1;
}

.quality-card-detail {
  font-size: 12px;
  color: #606266;
  margin-bottom: 8px;
}

.quality-card-trend {
  font-size: 12px;
  color: #909399;
  display: flex;
  align-items: center;
  gap: 4px;
}

.quality-card-trend span {
  font-weight: bold;
}

.quality-card-trend.trend-up span {
  color: #67c23a;
}

.quality-card-trend.trend-down span {
  color: #f56c6c;
}

.quality-card-trend.trend-good span {
  color: #67c23a;
}

.quality-card-trend.trend-bad span {
  color: #f56c6c;
}

.quality-card-icon {
  position: absolute;
  right: 20px;
  top: 20px;
}

.charts-section {
  display: flex;
  gap: 20px;
  margin-bottom: 20px;
}

.chart-container {
  flex: 1;
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 2px 12px 0 rgba(0,0,0,0.06);
  padding: 20px;
}

.chart-title {
  font-size: 16px;
  font-weight: 600;
  color: #409eff;
  margin-bottom: 16px;
  text-align: left;
  display: flex;
  align-items: center;
}

.chart-content {
  width: 100%;
  height: 300px;
}

.unit-stats-section {
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 2px 12px 0 rgba(0,0,0,0.06);
  padding: 20px;
}

.section-title {
  font-size: 16px;
  font-weight: 600;
  color: #409eff;
  margin-bottom: 16px;
  padding-bottom: 8px;
  border-bottom: 2px solid #f0f0f0;
  display: flex;
  align-items: center;
}

.unit-stats-content {
  display: flex;
  gap: 20px;
}

.unit-chart-wrapper {
  flex: 2;
}

.unit-chart-content {
  width: 100%;
  height: 400px;
}

.unit-data-list {
  flex: 1;
  background: #f8f9fa;
  border-radius: 8px;
  padding: 16px;
}

.unit-data-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  padding-bottom: 8px;
  border-bottom: 2px solid #e4e7ed;
}

.header-left {
  flex: 1;
}

.header-right {
  flex-shrink: 0;
}

.month-label {
  font-size: 14px;
  font-weight: 600;
  color: #409eff;
}

.unit-table-container {
  height: 320px;
}

.inner-badge {
  display: inline-block;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 600;
  background: rgba(103, 194, 58, 0.1);
  color: #67c23a;
  border: 1px solid rgba(103, 194, 58, 0.3);
}

.outer-badge {
  display: inline-block;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 600;
  background: rgba(245, 108, 108, 0.1);
  color: #f56c6c;
  border: 1px solid rgba(245, 108, 108, 0.3);
}

.total-badge {
  display: inline-block;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 600;
  background: rgba(64, 158, 255, 0.1);
  color: #409eff;
  border: 1px solid rgba(64, 158, 255, 0.3);
}

.progress-container {
  display: flex;
  align-items: center;
  gap: 8px;
}

.percentage-text {
  font-size: 12px;
  color: #666;
  min-width: 35px;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .stat-card-row,
  .quality-cards-row,
  .charts-section {
    flex-direction: column;
  }

  .dashboard-main {
  }

  .stat-card,
  .quality-card,
  .chart-container {
    margin-bottom: 15px;
  }

  .chart-content {
    height: 250px;
  }

  .unit-stats-content {
    flex-direction: column;
  }

  .unit-chart-wrapper {
    flex: none;
  }

  .unit-data-list {
    flex: none;
    margin-top: 20px;
  }

  .unit-chart-content {
    height: 300px;
  }
}
</style>