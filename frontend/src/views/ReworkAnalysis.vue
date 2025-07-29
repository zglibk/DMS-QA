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

    <!-- 统计卡片区域 -->
    <div class="stats-cards">
      <el-row :gutter="20">
        <el-col :xs="24" :sm="12" :md="6">
          <div class="stat-card">
            <div class="card-icon current-month">
              <el-icon><Calendar /></el-icon>
            </div>
            <div class="card-content">
              <div class="card-title">本月返工次数</div>
              <div class="card-value">{{ currentMonthStats.count || 0 }}</div>
              <div class="card-trend" :class="getTrendClass(currentMonthStats.countTrend)">
                <el-icon><component :is="getTrendIcon(currentMonthStats.countTrend)" /></el-icon>
                {{ Math.abs(currentMonthStats.countTrend || 0) }}%
              </div>
            </div>
          </div>
        </el-col>
        
        <el-col :xs="24" :sm="12" :md="6">
          <div class="stat-card">
            <div class="card-icon defective-qty">
              <el-icon><Warning /></el-icon>
            </div>
            <div class="card-content">
              <div class="card-title">本月不良数量</div>
              <div class="card-value">{{ currentMonthStats.defectiveQty || 0 }}</div>
              <div class="card-trend" :class="getTrendClass(currentMonthStats.defectiveQtyTrend)">
                <el-icon><component :is="getTrendIcon(currentMonthStats.defectiveQtyTrend)" /></el-icon>
                {{ Math.abs(currentMonthStats.defectiveQtyTrend || 0) }}%
              </div>
            </div>
          </div>
        </el-col>
        
        <el-col :xs="24" :sm="12" :md="6">
          <div class="stat-card">
            <div class="card-icon cost">
              <el-icon><Money /></el-icon>
            </div>
            <div class="card-content">
              <div class="card-title">本月返工成本</div>
              <div class="card-value">¥{{ (currentMonthStats.cost || 0).toFixed(2) }}</div>
              <div class="card-trend" :class="getTrendClass(currentMonthStats.costTrend)">
                <el-icon><component :is="getTrendIcon(currentMonthStats.costTrend)" /></el-icon>
                {{ Math.abs(currentMonthStats.costTrend || 0) }}%
              </div>
            </div>
          </div>
        </el-col>
        
        <el-col :xs="24" :sm="12" :md="6">
          <div class="stat-card">
            <div class="card-icon rate">
              <el-icon><DataAnalysis /></el-icon>
            </div>
            <div class="card-content">
              <div class="card-title">本月不良率</div>
              <div class="card-value">{{ (currentMonthStats.defectiveRate || 0).toFixed(2) }}%</div>
              <div class="card-trend" :class="getTrendClass(currentMonthStats.defectiveRateTrend)">
                <el-icon><component :is="getTrendIcon(currentMonthStats.defectiveRateTrend)" /></el-icon>
                {{ Math.abs(currentMonthStats.defectiveRateTrend || 0) }}%
              </div>
            </div>
          </div>
        </el-col>
      </el-row>
    </div>

    <!-- 年度汇总信息 -->
    <el-card class="yearly-summary" shadow="never">
      <template #header>
        <div class="card-header">
          <span>
            <el-icon><TrendCharts /></el-icon>
            {{ currentYear }}年度返工汇总
          </span>
          <el-select v-model="selectedYear" @change="loadYearlyData" style="width: 120px">
            <el-option
              v-for="year in availableYears"
              :key="year"
              :label="year + '年'"
              :value="year"
            />
          </el-select>
        </div>
      </template>
      
      <el-row :gutter="20">
        <el-col :span="6">
          <div class="summary-item">
            <div class="summary-label">年度返工总次数</div>
            <div class="summary-value primary">{{ yearlyStats.totalCount || 0 }}</div>
          </div>
        </el-col>
        <el-col :span="6">
          <div class="summary-item">
            <div class="summary-label">年度不良总数</div>
            <div class="summary-value warning">{{ yearlyStats.totalDefectiveQty || 0 }}</div>
          </div>
        </el-col>
        <el-col :span="6">
          <div class="summary-item">
            <div class="summary-label">年度返工总成本</div>
            <div class="summary-value danger">¥{{ (yearlyStats.totalCost || 0).toFixed(2) }}</div>
          </div>
        </el-col>
        <el-col :span="6">
          <div class="summary-item">
            <div class="summary-label">年度平均不良率</div>
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
                <el-radio-button label="month">按月</el-radio-button>
                <el-radio-button label="week">按周</el-radio-button>
                <el-radio-button label="day">按日</el-radio-button>
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
            <span>
              <el-icon><PieChart /></el-icon>
              部门返工分布
            </span>
          </template>
          <div ref="deptChartRef" class="chart-container"></div>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="20" class="charts-section">
      <!-- 不良类别分析 -->
      <el-col :span="12">
        <el-card class="chart-card" shadow="never">
          <template #header>
            <span>
              <el-icon><DataBoard /></el-icon>
              不良类别分析
            </span>
          </template>
          <div ref="categoryChartRef" class="chart-container"></div>
        </el-card>
      </el-col>
      
      <!-- 成本分析图 -->
      <el-col :span="12">
        <el-card class="chart-card" shadow="never">
          <template #header>
            <span>
              <el-icon><Money /></el-icon>
              返工成本分析
            </span>
          </template>
          <div ref="costChartRef" class="chart-container"></div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 详细数据表格 -->
    <el-card class="data-table" shadow="never">
      <template #header>
        <div class="card-header">
          <span>
            <el-icon><List /></el-icon>
            返工记录清单
          </span>
          <div class="header-actions">
            <el-input
              v-model="searchKeyword"
              placeholder="搜索工单号、产品名称等"
              style="width: 200px; margin-right: 10px"
              clearable
              @keyup.enter="loadTableData"
            >
              <template #prefix>
                <el-icon><Search /></el-icon>
              </template>
            </el-input>
            <el-button @click="loadTableData" :icon="Search">搜索</el-button>
            <el-button @click="exportTableData" :icon="Download" :loading="exportLoading">
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
        height="400"
      >
        <el-table-column prop="ReworkDate" label="返工日期" width="120" sortable>
          <template #default="{ row }">
            {{ formatDate(row.ReworkDate) }}
          </template>
        </el-table-column>
        <el-table-column prop="CustomerCode" label="客户编号" width="120" />
        <el-table-column prop="OrderNo" label="工单号" width="140" />
        <el-table-column prop="ProductName" label="产品名称" width="150" show-overflow-tooltip />
        <el-table-column prop="DefectiveQty" label="不良数" width="100" align="right" />
        <el-table-column prop="DefectiveRate" label="不良率" width="100" align="right">
          <template #default="{ row }">
            <span :class="getDefectiveRateClass(row.DefectiveRate)">
              {{ row.DefectiveRate ? row.DefectiveRate.toFixed(2) + '%' : '-' }}
            </span>
          </template>
        </el-table-column>
        <el-table-column prop="DefectiveReason" label="不良原因" width="150" show-overflow-tooltip />
        <el-table-column prop="ResponsiblePerson" label="责任人" width="100" />
        <el-table-column prop="TotalCost" label="返工成本" width="120" align="right">
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
        <el-table-column label="操作" width="120" fixed="right">
          <template #default="{ row }">
            <el-button
              type="primary"
              size="small"
              @click="viewDetail(row)"
              :icon="View"
            >
              查看
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

    <!-- 详情查看对话框 -->
    <el-dialog
      title="返工记录详情"
      v-model="detailVisible"
      width="70%"
    >
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
    </div>
  </AppLayout>
</template>

<script setup name="ReworkAnalysis">
import { ref, reactive, onMounted, computed, nextTick } from 'vue'
import { ElMessage } from 'element-plus'
import {
  Tools, Calendar, Warning, Money, DataAnalysis, TrendCharts, PieChart,
  DataBoard, List, Search, Download, View, ArrowUp, ArrowDown
} from '@element-plus/icons-vue'
import * as echarts from 'echarts'
import axios from 'axios'
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
const currentMonthStats = reactive({
  count: 0,
  defectiveQty: 0,
  cost: 0,
  defectiveRate: 0,
  countTrend: 0,
  defectiveQtyTrend: 0,
  costTrend: 0,
  defectiveRateTrend: 0
})

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
  const currentYear = new Date().getFullYear()
  const years = []
  for (let i = currentYear; i >= currentYear - 5; i--) {
    years.push(i)
  }
  return years
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
    loadYearlyData(),
    loadTrendData(),
    loadTableData()
  ])
}

const loadSummaryData = async () => {
  try {
    const response = await axios.get('/api/rework/statistics/summary', {
      params: { year: selectedYear.value }
    })
    
    if (response.data.success) {
      const data = response.data.data
      
      // 更新当月统计
      Object.assign(currentMonthStats, {
        count: data.currentMonth.CurrentMonthCount || 0,
        defectiveQty: data.currentMonth.CurrentMonthDefectiveQty || 0,
        cost: data.currentMonth.CurrentMonthCost || 0,
        defectiveRate: data.currentMonth.CurrentMonthDefectiveRate || 0
      })
      
      // 更新年度统计
      Object.assign(yearlyStats, {
        totalCount: data.yearly.TotalReworkCount || 0,
        totalDefectiveQty: data.yearly.TotalDefectiveQty || 0,
        totalCost: data.yearly.TotalCost || 0,
        avgDefectiveRate: data.yearly.AvgDefectiveRate || 0
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

const loadYearlyData = async () => {
  await loadSummaryData()
}

const loadTrendData = async () => {
  try {
    const startDate = new Date(selectedYear.value, 0, 1).toISOString().split('T')[0]
    const endDate = new Date(selectedYear.value, 11, 31).toISOString().split('T')[0]
    
    const response = await axios.get('/api/rework/statistics/trend', {
      params: {
        startDate,
        endDate,
        groupBy: trendPeriod.value
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

const loadTableData = async () => {
  try {
    tableLoading.value = true
    const response = await axios.get('/api/rework/list', {
      params: {
        page: tablePagination.current,
        pageSize: tablePagination.pageSize,
        keyword: searchKeyword.value
      }
    })
    
    if (response.data.success) {
      tableData.value = response.data.data
      tablePagination.total = response.data.pagination.total
    }
  } catch (error) {
    console.error('加载表格数据失败:', error)
    ElMessage.error('加载表格数据失败')
  } finally {
    tableLoading.value = false
  }
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
        data: data.map(item => item.ReworkCount),
        itemStyle: { color: '#409EFF' }
      },
      {
        name: '不良数量',
        type: 'bar',
        data: data.map(item => item.TotalDefectiveQty),
        itemStyle: { color: '#E6A23C' }
      },
      {
        name: '不良率',
        type: 'line',
        yAxisIndex: 1,
        data: data.map(item => item.AvgDefectiveRate?.toFixed(2) || 0),
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
            { offset: 0, color: '#83bff6' },
            { offset: 0.5, color: '#188df0' },
            { offset: 1, color: '#188df0' }
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
    xAxis: {
      type: 'category',
      data: data.map(item => item.DateLabel)
    },
    yAxis: {
      type: 'value',
      name: '成本(元)',
      axisLabel: {
        formatter: '¥{value}'
      }
    },
    series: [
      {
        name: '返工成本',
        type: 'line',
        data: data.map(item => item.TotalCost),
        smooth: true,
        itemStyle: { color: '#E6A23C' },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: 'rgba(230, 162, 60, 0.3)' },
            { offset: 1, color: 'rgba(230, 162, 60, 0.1)' }
          ])
        }
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

const getStatusType = (status) => {
  const statusMap = {
    '进行中': 'warning',
    '已完成': 'success',
    '已取消': 'danger'
  }
  return statusMap[status] || 'info'
}

const getDefectiveRateClass = (rate) => {
  if (!rate) return ''
  if (rate < 1) return 'rate-low'
  if (rate < 5) return 'rate-medium'
  return 'rate-high'
}

const getTrendClass = (trend) => {
  if (!trend) return ''
  return trend > 0 ? 'trend-up' : 'trend-down'
}

const getTrendIcon = (trend) => {
  if (!trend) return 'ArrowUp'
  return trend > 0 ? 'ArrowUp' : 'ArrowDown'
}
</script>

<style scoped>
.rework-analysis {
  padding: 20px;
  background-color: #f5f7fa;
  min-height: 100vh;
}

.page-header {
  text-align: center;
  margin-bottom: 30px;
}

.page-header h1 {
  margin: 0 0 10px 0;
  color: #303133;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  font-size: 28px;
}

.page-subtitle {
  margin: 0;
  color: #909399;
  font-size: 16px;
}

.stats-cards {
  margin-bottom: 30px;
}

.stat-card {
  background: white;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
  display: flex;
  align-items: center;
  gap: 15px;
  height: 100px;
}

.card-icon {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  color: white;
}

.card-icon.current-month {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.card-icon.defective-qty {
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
}

.card-icon.cost {
  background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
}

.card-icon.rate {
  background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%);
}

.card-content {
  flex: 1;
}

.card-title {
  font-size: 14px;
  color: #909399;
  margin-bottom: 8px;
}

.card-value {
  font-size: 24px;
  font-weight: bold;
  color: #303133;
  margin-bottom: 5px;
}

.card-trend {
  font-size: 12px;
  display: flex;
  align-items: center;
  gap: 4px;
}

.trend-up {
  color: #F56C6C;
}

.trend-down {
  color: #67C23A;
}

.yearly-summary {
  margin-bottom: 30px;
}

.summary-item {
  text-align: center;
  padding: 20px;
}

.summary-label {
  font-size: 14px;
  color: #909399;
  margin-bottom: 10px;
}

.summary-value {
  font-size: 28px;
  font-weight: bold;
  margin-bottom: 5px;
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
  margin-bottom: 30px;
}

.chart-card {
  height: 400px;
}

.chart-container {
  height: 320px;
  width: 100%;
}

.data-table {
  margin-bottom: 30px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-actions {
  display: flex;
  align-items: center;
}

.pagination-wrapper {
  display: flex;
  justify-content: center;
  margin-top: 20px;
}

.detail-content {
  max-height: 60vh;
  overflow-y: auto;
}

.cost-amount {
  font-weight: bold;
  color: #E6A23C;
}

.rate-low {
  color: #67C23A;
  font-weight: bold;
}

.rate-medium {
  color: #E6A23C;
  font-weight: bold;
}

.rate-high {
  color: #F56C6C;
  font-weight: bold;
}

:deep(.el-card__header) {
  padding: 15px 20px;
  border-bottom: 1px solid #EBEEF5;
}

:deep(.el-card__body) {
  padding: 20px;
}

:deep(.el-table .el-table__cell) {
  padding: 8px 0;
}
</style>