<template>
  <AppLayout>
    <div class="rework-analysis">
      <!-- 页面标题 -->
      <div class="page-header">
        <h1>
          <el-icon><Tools /></el-icon>
          生产不良返工分析
        </h1>
        <p class="page-subtitle">实时监控生产返工情况，分析不良原因，提升产品质量</p>
      </div>

      <!-- 时间筛选汇总信息 -->
      <el-card class="yearly-summary" shadow="never">
        <template #header>
          <div class="card-header">
            <span>
              <el-icon><TrendCharts /></el-icon>
              {{ getTimeRangeTitle() }}返工汇总
            </span>
            <div class="time-filter-group">
              <!-- 时间类型选择 -->
              <el-select v-model="timeType" @change="onTimeTypeChange" style="width: 100px; margin-right: 10px">
                <el-option label="年度" value="year" />
                <el-option label="季度" value="quarter" />
                <el-option label="月份" value="month" />
                <el-option label="周次" value="week" />
              </el-select>
              
              <!-- 年份选择 -->
              <el-select v-model="selectedYear" @change="onYearChange" style="width: 100px; margin-right: 10px">
                <el-option
                  v-for="year in availableYears"
                  :key="year"
                  :label="year + '年'"
                  :value="year"
                />
              </el-select>
              
              <!-- 季度选择 -->
              <el-select 
                v-if="timeType === 'quarter'" 
                v-model="selectedQuarter" 
                @change="loadTimeRangeData" 
                style="width: 100px; margin-right: 10px"
              >
                <el-option label="第一季度" :value="1" />
                <el-option label="第二季度" :value="2" />
                <el-option label="第三季度" :value="3" />
                <el-option label="第四季度" :value="4" />
              </el-select>
              
              <!-- 月份选择 -->
              <el-select 
                v-if="timeType === 'month'" 
                v-model="selectedMonth" 
                @change="loadTimeRangeData" 
                style="width: 100px; margin-right: 10px"
              >
                <el-option
                  v-for="month in availableMonths"
                  :key="month.value"
                  :label="month.label"
                  :value="month.value"
                />
              </el-select>
              
              <!-- 周次选择 -->
              <el-select 
                v-if="timeType === 'week'" 
                v-model="selectedWeek" 
                @change="loadTimeRangeData" 
                style="width: 120px"
              >
                <el-option
                  v-for="week in availableWeeks"
                  :key="week.value"
                  :label="week.label"
                  :value="week.value"
                />
              </el-select>
            </div>
          </div>
        </template>
        
        <el-row :gutter="20">
          <el-col :span="6">
            <div class="summary-item">
              <div class="summary-label">返工总次数</div>
              <div class="summary-value primary">{{ yearlyStats.totalCount || 0 }}</div>
            </div>
          </el-col>
          <el-col :span="6">
            <div class="summary-item">
              <div class="summary-label">不良总数</div>
              <div class="summary-value warning">{{ yearlyStats.totalDefectiveQty || 0 }}</div>
            </div>
          </el-col>
          <el-col :span="6">
            <div class="summary-item">
              <div class="summary-label">返工总成本</div>
              <div class="summary-value danger">¥{{ (yearlyStats.totalCost || 0).toFixed(2) }}</div>
            </div>
          </el-col>
          <el-col :span="6">
            <div class="summary-item">
              <div class="summary-label">平均不良率</div>
              <div class="summary-value info">{{ (yearlyStats.avgDefectiveRate || 0).toFixed(2) }}%</div>
            </div>
          </el-col>
        </el-row>
      </el-card>

      <!-- 图表分析区域 -->
      <el-row :gutter="20" class="charts-section">
        <!-- 返工趋势图 -->
        <el-col :span="12">
          <el-card class="chart-card" shadow="never">
            <template #header>
              <div class="card-header">
                <span>
                  <el-icon><TrendCharts /></el-icon>
                  返工趋势分析
                </span>
                <el-radio-group v-model="trendPeriod" @change="loadTrendData" size="small">
                  <el-radio-button label="day">日</el-radio-button>
                  <el-radio-button label="week">周</el-radio-button>
                  <el-radio-button label="month">月</el-radio-button>
                </el-radio-group>
              </div>
            </template>
            <div ref="trendChartRef" class="chart-container"></div>
          </el-card>
        </el-col>

        <!-- 部门分布图 -->
        <el-col :span="12">
          <el-card class="chart-card" shadow="never">
            <template #header>
              <div class="card-header">
                <span>
                  <el-icon><PieChart /></el-icon>
                  部门返工分布
                </span>
              </div>
            </template>
            <div ref="deptChartRef" class="chart-container"></div>
          </el-card>
        </el-col>
      </el-row>

      <el-row :gutter="20" class="charts-section">
        <!-- 类别分析图 -->
        <el-col :span="12">
          <el-card class="chart-card" shadow="never">
            <template #header>
              <div class="card-header">
                <span>
                  <el-icon><DataBoard /></el-icon>
                  不良类别分析
                </span>
              </div>
            </template>
            <div ref="categoryChartRef" class="chart-container"></div>
          </el-card>
        </el-col>

        <!-- 成本分析图 -->
        <el-col :span="12">
          <el-card class="chart-card" shadow="never">
            <template #header>
              <div class="card-header">
                <span>
                  <el-icon><TrendCharts /></el-icon>
                  返工成本分析
                </span>
              </div>
            </template>
            <div ref="costChartRef" class="chart-container"></div>
          </el-card>
        </el-col>
      </el-row>

      <!-- 数据表格 -->
      <el-card class="table-card" shadow="never">
        <template #header>
          <div class="card-header">
            <span>
              <el-icon><List /></el-icon>
              返工记录明细
            </span>
            <div class="header-actions">
              <el-input
                v-model="searchKeyword"
                placeholder="搜索工单号、产品名称"
                style="width: 200px; margin-right: 10px"
                @keyup.enter="loadTableData"
              >
                <template #prefix>
                  <el-icon><Search /></el-icon>
                </template>
              </el-input>
              <el-button type="primary" @click="loadTableData">
                <el-icon><Search /></el-icon>
                搜索
              </el-button>
              <el-button type="success" @click="exportTableData" :loading="exportLoading">
                <el-icon><Download /></el-icon>
                导出
              </el-button>
            </div>
          </div>
        </template>

        <el-table
          :data="tableData"
          v-loading="tableLoading"
          stripe
          border
          style="width: 100%"
        >
          <el-table-column prop="ReworkDate" label="返工日期" width="120" :formatter="(row) => formatDate(row.ReworkDate)" />
          <el-table-column prop="CustomerCode" label="客户编号" width="120" />
          <el-table-column prop="OrderNo" label="工单号" width="150" />
          <el-table-column prop="ProductName" label="产品名称" width="200" show-overflow-tooltip />
          <el-table-column prop="TotalQty" label="总数量" width="100" align="right" />
          <el-table-column prop="DefectiveQty" label="不良数量" width="100" align="right" />
          <el-table-column prop="DefectiveRate" label="不良率" width="100" align="right">
            <template #default="{ row }">
              <span :class="getDefectiveRateClass(row.DefectiveRate)">
                {{ row.DefectiveRate ? row.DefectiveRate.toFixed(2) + '%' : '-' }}
              </span>
            </template>
          </el-table-column>
          <el-table-column prop="ResponsiblePerson" label="责任人" width="120" />
          <el-table-column prop="ReworkPersonnel" label="返工人员" width="120" />
          <el-table-column prop="ReworkHours" label="返工工时" width="100" align="right">
            <template #default="{ row }">
              {{ row.ReworkHours ? row.ReworkHours + 'h' : '-' }}
            </template>
          </el-table-column>
          <el-table-column prop="TotalCost" label="总成本" width="120" align="right">
            <template #default="{ row }">
              <span class="cost-amount">
                {{ row.TotalCost ? '¥' + row.TotalCost.toFixed(2) : '-' }}
              </span>
            </template>
          </el-table-column>
          <el-table-column prop="ReworkStatus" label="状态" width="100">
            <template #default="{ row }">
              <el-tag :type="getStatusType(row.ReworkStatus)" size="small">
                {{ row.ReworkStatus }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="100" fixed="right">
            <template #default="{ row }">
              <el-button type="primary" size="small" @click="viewDetail(row)">
                <el-icon><View /></el-icon>
                详情
              </el-button>
            </template>
          </el-table-column>
        </el-table>

        <div class="pagination-wrapper">
          <el-pagination
            v-model:current-page="tablePagination.current"
            v-model:page-size="tablePagination.pageSize"
            :page-sizes="[10, 20, 50, 100]"
            :total="tablePagination.total"
            layout="total, sizes, prev, pager, next, jumper"
            @size-change="handleTableSizeChange"
            @current-change="handleTableCurrentChange"
          />
        </div>
      </el-card>
    </div>

    <!-- 详情弹窗 -->
    <el-dialog v-model="detailVisible" title="返工记录详情" width="800px">
      <div class="detail-content" v-if="currentRecord">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="返工日期">
            {{ formatDate(currentRecord.ReworkDate) }}
          </el-descriptions-item>
          <el-descriptions-item label="客户编号">
            {{ currentRecord.CustomerCode }}
          </el-descriptions-item>
          <el-descriptions-item label="工单号">
            {{ currentRecord.OrderNo }}
          </el-descriptions-item>
          <el-descriptions-item label="产品名称">
            {{ currentRecord.ProductName }}
          </el-descriptions-item>
          <el-descriptions-item label="总数量">
            {{ currentRecord.TotalQty }}
          </el-descriptions-item>
          <el-descriptions-item label="不良数量">
            {{ currentRecord.DefectiveQty }}
          </el-descriptions-item>
          <el-descriptions-item label="不良率">
            <span :class="getDefectiveRateClass(currentRecord.DefectiveRate)">
              {{ currentRecord.DefectiveRate ? currentRecord.DefectiveRate.toFixed(2) + '%' : '-' }}
            </span>
          </el-descriptions-item>
          <el-descriptions-item label="责任人">
            {{ currentRecord.ResponsiblePerson }}
          </el-descriptions-item>
          <el-descriptions-item label="不良原因" :span="2">
            {{ currentRecord.DefectiveReason }}
          </el-descriptions-item>
          <el-descriptions-item label="返工人员">
            {{ currentRecord.ReworkPersonnel }}
          </el-descriptions-item>
          <el-descriptions-item label="返工工时">
            {{ currentRecord.ReworkHours ? currentRecord.ReworkHours + 'h' : '-' }}
          </el-descriptions-item>
          <el-descriptions-item label="总成本">
            <span class="cost-amount">
              {{ currentRecord.TotalCost ? '¥' + currentRecord.TotalCost.toFixed(2) : '-' }}
            </span>
          </el-descriptions-item>
          <el-descriptions-item label="返工状态">
            <el-tag :type="getStatusType(currentRecord.ReworkStatus)">
              {{ currentRecord.ReworkStatus }}
            </el-tag>
          </el-descriptions-item>
        </el-descriptions>
      </div>
    </el-dialog>
  </AppLayout>
</template>

<script setup name="ReworkAnalysis">
import { ref, reactive, onMounted, computed, nextTick } from 'vue'
import { ElMessage } from 'element-plus'
import {
  Tools, TrendCharts, PieChart,
  DataBoard, List, Search, Download, View
} from '@element-plus/icons-vue'
import * as echarts from 'echarts'
import api from '@/services/api.js'
import AppLayout from '../components/common/AppLayout.vue'

// 响应式数据
const loading = ref(false)
const tableLoading = ref(false)
const exportLoading = ref(false)
const detailVisible = ref(false)
const currentRecord = ref(null)
const searchKeyword = ref('')
const trendPeriod = ref('month')
const selectedYear = ref(new Date().getFullYear())
const currentYear = ref(new Date().getFullYear())

// 时间筛选相关数据
const timeType = ref('year') // year, quarter, month, week
const selectedQuarter = ref(Math.ceil((new Date().getMonth() + 1) / 3)) // 当前季度
const selectedMonth = ref(new Date().getMonth() + 1) // 当前月份
const selectedWeek = ref(1) // 当前周次

// 图表引用
const trendChartRef = ref(null)
const deptChartRef = ref(null)
const categoryChartRef = ref(null)
const costChartRef = ref(null)

// 图表实例
let trendChart = null
let deptChart = null
let categoryChart = null
let costChart = null

// 统计数据
const yearlyStats = reactive({
  totalCount: 0,
  totalDefectiveQty: 0,
  totalCost: 0,
  avgDefectiveRate: 0
})

// 表格数据
const tableData = ref([])
const tablePagination = reactive({
  current: 1,
  pageSize: 20,
  total: 0
})

// 计算属性
const availableYears = computed(() => {
  const years = []
  for (let i = currentYear.value; i >= currentYear.value - 5; i--) {
    years.push(i)
  }
  return years
})

// 可选月份列表
const availableMonths = computed(() => {
  const months = []
  for (let i = 1; i <= 12; i++) {
    months.push({
      value: i,
      label: `${i}月`
    })
  }
  return months
})

// 可选周次列表（基于选择的年份）
const availableWeeks = computed(() => {
  const weeks = []
  const year = selectedYear.value
  // 计算该年的总周数
  const totalWeeks = getWeeksInYear(year)
  for (let i = 1; i <= totalWeeks; i++) {
    const weekRange = getWeekRange(year, i)
    weeks.push({
      value: i,
      label: `第${i}周 (${weekRange})`
    })
  }
  return weeks
})

// 生命周期
onMounted(() => {
  loadAllData()
  initCharts()
})

// 方法定义
const loadAllData = async () => {
  await Promise.all([
    loadSummaryData(),
    loadTrendData(),
    loadTableData()
  ])
}

/**
 * 加载汇总数据
 */
const loadSummaryData = async () => {
  try {
    const timeRange = getTimeRange()
    const response = await api.get('/rework/statistics/summary', {
      params: { 
        year: selectedYear.value,
        startDate: timeRange.startDate,
        endDate: timeRange.endDate,
        timeType: timeType.value
      }
    })
    
    if (response.data.success) {
      const data = response.data.data
      
      // 更新时间范围统计
      Object.assign(yearlyStats, {
        totalCount: data.yearly?.TotalReworkCount || 0,
        totalDefectiveQty: data.yearly?.TotalDefectiveQty || 0,
        totalCost: data.yearly?.TotalCost || 0,
        avgDefectiveRate: data.yearly?.AvgDefectiveRate || 0
      })
      
      // 更新图表数据
      updateDeptChart(data.byDepartment || [])
      updateCategoryChart(data.byCategory || [])
    }
  } catch (error) {
    console.error('加载汇总数据失败:', error)
    ElMessage.error('加载汇总数据失败')
  }
}

/**
 * 加载趋势数据
 */
const loadTrendData = async () => {
  try {
    const timeRange = getTimeRange()
    
    const response = await api.get('/rework/statistics/trend', {
      params: {
        startDate: timeRange.startDate,
        endDate: timeRange.endDate,
        groupBy: trendPeriod.value,
        timeType: timeType.value
      }
    })
    
    if (response.data.success) {
      updateTrendChart(response.data.data)
      updateCostChart(response.data.data)
    }
  } catch (error) {
    console.error('加载趋势数据失败:', error)
    ElMessage.error('加载趋势数据失败')
  }
}

/**
 * 加载表格数据
 */
const loadTableData = async () => {
  try {
    tableLoading.value = true
    const timeRange = getTimeRange()
    const response = await api.get('/rework/list', {
      params: {
        page: tablePagination.current,
        pageSize: tablePagination.pageSize,
        keyword: searchKeyword.value,
        year: selectedYear.value,
        startDate: timeRange.startDate,
        endDate: timeRange.endDate,
        timeType: timeType.value
      }
    })
    
    if (response.data.success) {
      tableData.value = response.data.data || []
      tablePagination.total = response.data.pagination?.total || 0
    }
  } catch (error) {
    console.error('加载表格数据失败:', error)
    ElMessage.error('加载表格数据失败')
  } finally {
    tableLoading.value = false
  }
}

/**
 * 时间类型变更处理
 */
const onTimeTypeChange = () => {
  // 重置时间选择为默认值
  switch (timeType.value) {
    case 'quarter':
      selectedQuarter.value = Math.ceil((new Date().getMonth() + 1) / 3)
      break
    case 'month':
      selectedMonth.value = new Date().getMonth() + 1
      break
    case 'week':
      selectedWeek.value = 1
      break
  }
  loadTimeRangeData()
}

/**
 * 年份变更处理
 */
const onYearChange = () => {
  // 如果是周次选择，需要重置周次为1（因为不同年份的周数可能不同）
  if (timeType.value === 'week') {
    selectedWeek.value = 1
  }
  loadTimeRangeData()
}

/**
 * 加载时间范围数据
 */
const loadTimeRangeData = async () => {
  await Promise.all([
    loadSummaryData(),
    loadTrendData(),
    loadTableData()
  ])
}

/**
 * 获取时间范围标题
 */
const getTimeRangeTitle = () => {
  switch (timeType.value) {
    case 'year':
      return `${selectedYear.value}年度`
    case 'quarter':
      return `${selectedYear.value}年第${selectedQuarter.value}季度`
    case 'month':
      return `${selectedYear.value}年${selectedMonth.value}月`
    case 'week':
      return `${selectedYear.value}年第${selectedWeek.value}周`
    default:
      return `${selectedYear.value}年度`
  }
}

/**
 * 计算指定年份的总周数
 */
const getWeeksInYear = (year) => {
  const lastDayOfYear = new Date(year, 11, 31)
  const firstDayOfYear = new Date(year, 0, 1)
  const dayOfWeek = firstDayOfYear.getDay()
  const daysInYear = Math.ceil((lastDayOfYear - firstDayOfYear) / (24 * 60 * 60 * 1000)) + 1
  return Math.ceil((daysInYear + dayOfWeek) / 7)
}

/**
 * 获取指定年份和周次的日期范围
 */
const getWeekRange = (year, week) => {
  const firstDayOfYear = new Date(year, 0, 1)
  const dayOfWeek = firstDayOfYear.getDay()
  const startOfWeek = new Date(year, 0, 1 + (week - 1) * 7 - dayOfWeek + 1)
  const endOfWeek = new Date(startOfWeek)
  endOfWeek.setDate(startOfWeek.getDate() + 6)
  
  const formatDateShort = (date) => {
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${month}-${day}`
  }
  
  return `${formatDateShort(startOfWeek)}-${formatDateShort(endOfWeek)}`
}

/**
 * 获取时间范围
 */
const getTimeRange = () => {
  const year = selectedYear.value
  let startDate, endDate
  
  switch (timeType.value) {
    case 'year':
      startDate = `${year}-01-01`
      endDate = `${year}-12-31`
      break
    case 'quarter':
      const quarter = selectedQuarter.value
      const startMonth = (quarter - 1) * 3 + 1
      const endMonth = quarter * 3
      startDate = `${year}-${String(startMonth).padStart(2, '0')}-01`
      endDate = new Date(year, endMonth, 0).toISOString().split('T')[0]
      break
    case 'month':
      const month = selectedMonth.value
      startDate = `${year}-${String(month).padStart(2, '0')}-01`
      endDate = new Date(year, month, 0).toISOString().split('T')[0]
      break
    case 'week':
      const week = selectedWeek.value
      const firstDayOfYear = new Date(year, 0, 1)
      const dayOfWeek = firstDayOfYear.getDay()
      const startOfWeek = new Date(year, 0, 1 + (week - 1) * 7 - dayOfWeek + 1)
      const endOfWeek = new Date(startOfWeek)
      endOfWeek.setDate(startOfWeek.getDate() + 6)
      startDate = startOfWeek.toISOString().split('T')[0]
      endDate = endOfWeek.toISOString().split('T')[0]
      break
    default:
      startDate = `${year}-01-01`
      endDate = `${year}-12-31`
  }
  
  return { startDate, endDate }
}

// 图表初始化
const initCharts = () => {
  nextTick(() => {
    if (trendChartRef.value) {
      trendChart = echarts.init(trendChartRef.value)
    }
    if (deptChartRef.value) {
      deptChart = echarts.init(deptChartRef.value)
    }
    if (categoryChartRef.value) {
      categoryChart = echarts.init(categoryChartRef.value)
    }
    if (costChartRef.value) {
      costChart = echarts.init(costChartRef.value)
    }
    
    // 监听窗口大小变化
    window.addEventListener('resize', () => {
      trendChart?.resize()
      deptChart?.resize()
      categoryChart?.resize()
      costChart?.resize()
    })
  })
}

// 图表更新方法
const updateTrendChart = (data) => {
  if (!trendChart) return
  
  const option = {
    title: {
      text: '返工趋势',
      left: 'center',
      textStyle: { fontSize: 14 }
    },
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'cross' }
    },
    legend: {
      data: ['返工次数', '不良数量', '不良率'],
      bottom: 0
    },
    xAxis: {
      type: 'category',
      data: data.map(item => item.DateLabel)
    },
    yAxis: [
      {
        type: 'value',
        name: '数量',
        position: 'left'
      },
      {
        type: 'value',
        name: '不良率(%)',
        position: 'right'
      }
    ],
    series: [
      {
        name: '返工次数',
        type: 'bar',
        data: data.map(item => {
          const count = item.ReworkCount
          return (count !== null && count !== undefined && !isNaN(count)) ? Number(count) : 0
        }),
        itemStyle: { color: '#409EFF' }
      },
      {
        name: '不良数量',
        type: 'bar',
        data: data.map(item => {
          const qty = item.TotalDefectiveQty
          return (qty !== null && qty !== undefined && !isNaN(qty)) ? Number(qty) : 0
        }),
        itemStyle: { color: '#E6A23C' }
      },
      {
        name: '不良率',
        type: 'line',
        yAxisIndex: 1,
        data: data.map(item => {
          const rate = item.AvgDefectiveRate
          if (rate !== null && rate !== undefined && !isNaN(rate)) {
            return Number(rate.toFixed(2))
          }
          return 0
        }),
        itemStyle: { color: '#F56C6C' }
      }
    ]
  }
  
  trendChart.setOption(option)
}

const updateDeptChart = (data) => {
  if (!deptChart) return
  
  const option = {
    title: {
      text: '部门返工分布',
      left: 'center',
      textStyle: { fontSize: 14 }
    },
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
        name: '返工次数',
        type: 'pie',
        radius: '50%',
        data: data.map(item => ({
          value: item.ReworkCount,
          name: item.ResponsibleDept
        })),
        emphasis: {
          itemStyle: {
            shadowBlur: 10,
            shadowOffsetX: 0,
            shadowColor: 'rgba(0, 0, 0, 0.5)'
          }
        }
      }
    ]
  }
  
  deptChart.setOption(option)
}

const updateCategoryChart = (data) => {
  if (!categoryChart) return
  
  const option = {
    title: {
      text: '不良类别分析',
      left: 'center',
      textStyle: { fontSize: 14 }
    },
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' }
    },
    xAxis: {
      type: 'category',
      data: data.map(item => item.DefectiveCategory),
      axisLabel: {
        rotate: 45
      }
    },
    yAxis: {
      type: 'value',
      name: '返工次数'
    },
    series: [
      {
        name: '返工次数',
        type: 'bar',
        data: data.map(item => item.ReworkCount),
        itemStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: '#409EFF' },
            { offset: 0.5, color: '#337ecc' },
            { offset: 1, color: '#337ecc' }
          ])
        }
      }
    ]
  }
  
  categoryChart.setOption(option)
}

const updateCostChart = (data) => {
  if (!costChart) return
  
  const option = {
    title: {
      text: '返工成本分析',
      left: 'center',
      textStyle: { fontSize: 14 }
    },
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'cross' }
    },
    legend: {
      data: ['总成本', '平均成本'],
      bottom: 0
    },
    xAxis: {
      type: 'category',
      data: data.map(item => item.DateLabel)
    },
    yAxis: {
      type: 'value',
      name: '成本(元)'
    },
    series: [
      {
        name: '总成本',
        type: 'bar',
        data: data.map(item => {
          const cost = item.TotalCost
          return (cost !== null && cost !== undefined && !isNaN(cost)) ? Number(cost.toFixed(2)) : 0
        }),
        itemStyle: { color: '#67C23A' }
      },
      {
        name: '平均成本',
        type: 'line',
        data: data.map(item => {
          const avgCost = item.AvgCost
          if (avgCost !== null && avgCost !== undefined && !isNaN(avgCost)) {
            return Number(avgCost.toFixed(2))
          }
          return 0
        }),
        itemStyle: { color: '#E6A23C' }
      }
    ]
  }
  
  costChart.setOption(option)
}

// 事件处理方法
const handleTableSizeChange = (size) => {
  tablePagination.pageSize = size
  tablePagination.current = 1
  loadTableData()
}

const handleTableCurrentChange = (page) => {
  tablePagination.current = page
  loadTableData()
}

const viewDetail = (row) => {
  currentRecord.value = row
  detailVisible.value = true
}

const exportTableData = async () => {
  try {
    exportLoading.value = true
    ElMessage.info('导出功能开发中')
  } catch (error) {
    console.error('导出失败:', error)
    ElMessage.error('导出失败')
  } finally {
    exportLoading.value = false
  }
}

// 工具方法
const formatDate = (date) => {
  if (!date) return '-'
  
  try {
    const dateObj = new Date(date)
    if (isNaN(dateObj.getTime())) return date
    
    // 使用本地时区的年月日，避免UTC转换，格式化为yyyy-mm-dd
    const year = dateObj.getFullYear()
    const month = String(dateObj.getMonth() + 1).padStart(2, '0')
    const day = String(dateObj.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  } catch (error) {
    return date
  }
}

const getDefectiveRateClass = (rate) => {
  if (!rate) return ''
  if (rate < 1) return 'rate-low'
  if (rate < 3) return 'rate-medium'
  return 'rate-high'
}

const getStatusType = (status) => {
  const statusMap = {
    '进行中': 'warning',
    '已完成': 'success',
    '已取消': 'info',
    '待审核': 'primary'
  }
  return statusMap[status] || 'info'
}
</script>

<style scoped>
.rework-analysis {
  padding: 20px;
}

.page-header {
  margin-bottom: 20px;
}

.page-header h1 {
  margin: 0;
  font-size: 24px;
  color: #303133;
  display: flex;
  align-items: center;
  gap: 8px;
}

.page-subtitle {
  margin: 8px 0 0 0;
  color: #909399;
  font-size: 14px;
}

.yearly-summary {
  margin-bottom: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-weight: 600;
}

.time-filter-group {
  display: flex;
  align-items: center;
}

.summary-item {
  text-align: center;
  padding: 20px;
}

.summary-label {
  font-size: 14px;
  color: #909399;
  margin-bottom: 8px;
}

.summary-value {
  font-size: 28px;
  font-weight: bold;
  margin-bottom: 4px;
}

.summary-value.primary {
  color: #409EFF;
}

.summary-value.warning {
  color: #E6A23C;
}

.summary-value.danger {
  color: #F56C6C;
}

.summary-value.info {
  color: #909399;
}

.charts-section {
  margin-bottom: 20px;
}

.chart-card {
  height: 400px;
}

.chart-container {
  height: 320px;
  width: 100%;
}

.table-card {
  margin-bottom: 20px;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.pagination-wrapper {
  display: flex;
  justify-content: center;
  margin-top: 20px;
}

.cost-amount {
  color: #67C23A;
  font-weight: bold;
}

.rate-low {
  color: #67C23A;
}

.rate-medium {
  color: #E6A23C;
}

.rate-high {
  color: #F56C6C;
}

.detail-content {
  max-height: 500px;
  overflow-y: auto;
}
</style>