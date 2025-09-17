<template>
  <div class="assessment-statistics">
    <!-- 页面标题 -->
    <div class="page-header">
      <h2>考核统计分析</h2>
      <p class="page-description">质量考核数据统计分析，趋势图表和绩效指标展示</p>
    </div>

    <!-- 筛选条件 -->
    <div class="filter-section">
      <el-row :gutter="20">
        <el-col :span="6">
          <el-date-picker
            v-model="filterForm.dateRange"
            type="daterange"
            range-separator="至"
            start-placeholder="开始日期"
            end-placeholder="结束日期"
            format="YYYY-MM-DD"
            value-format="YYYY-MM-DD"
            style="width: 100%"
          />
        </el-col>
        <el-col :span="4">
          <el-select v-model="filterForm.department" placeholder="部门" clearable>
            <el-option label="全部部门" value="" />
            <el-option label="生产部" value="生产部" />
            <el-option label="质检部" value="质检部" />
            <el-option label="技术部" value="技术部" />
            <el-option label="采购部" value="采购部" />
          </el-select>
        </el-col>
        <el-col :span="4">
          <el-select v-model="filterForm.statisticsType" placeholder="统计类型">
            <el-option label="按月统计" value="monthly" />
            <el-option label="按季度统计" value="quarterly" />
            <el-option label="按年统计" value="yearly" />
          </el-select>
        </el-col>
        <el-col :span="6">
          <el-button type="primary" @click="handleFilter">
            <el-icon><Search /></el-icon>
            查询
          </el-button>
          <el-button @click="resetFilter">
            <el-icon><Refresh /></el-icon>
            重置
          </el-button>
          <el-button type="success" @click="handleExport">
            <el-icon><Download /></el-icon>
            导出报表
          </el-button>
        </el-col>
      </el-row>
    </div>

    <!-- 关键指标卡片 -->
    <div class="metrics-section">
      <el-row :gutter="20">
        <el-col :span="6">
          <el-card class="metric-card total">
            <div class="metric-content">
              <div class="metric-icon">
                <el-icon><DataAnalysis /></el-icon>
              </div>
              <div class="metric-info">
                <div class="metric-number">{{ metrics.totalAssessments }}</div>
                <div class="metric-label">总考核次数</div>
                <div class="metric-trend" :class="metrics.assessmentTrend.type">
                  <el-icon v-if="metrics.assessmentTrend.type === 'up'"><ArrowUp /></el-icon>
                  <el-icon v-else><ArrowDown /></el-icon>
                  {{ metrics.assessmentTrend.value }}%
                </div>
              </div>
            </div>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card class="metric-card amount">
            <div class="metric-content">
              <div class="metric-icon">
                <el-icon><Money /></el-icon>
              </div>
              <div class="metric-info">
                <div class="metric-number">¥{{ metrics.totalAmount }}</div>
                <div class="metric-label">总考核金额</div>
                <div class="metric-trend" :class="metrics.amountTrend.type">
                  <el-icon v-if="metrics.amountTrend.type === 'up'"><ArrowUp /></el-icon>
                  <el-icon v-else><ArrowDown /></el-icon>
                  {{ metrics.amountTrend.value }}%
                </div>
              </div>
            </div>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card class="metric-card returned">
            <div class="metric-content">
              <div class="metric-icon">
                <el-icon><Check /></el-icon>
              </div>
              <div class="metric-info">
                <div class="metric-number">¥{{ metrics.returnedAmount }}</div>
                <div class="metric-label">已返还金额</div>
                <div class="metric-trend" :class="metrics.returnTrend.type">
                  <el-icon v-if="metrics.returnTrend.type === 'up'"><ArrowUp /></el-icon>
                  <el-icon v-else><ArrowDown /></el-icon>
                  {{ metrics.returnTrend.value }}%
                </div>
              </div>
            </div>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card class="metric-card rate">
            <div class="metric-content">
              <div class="metric-icon">
                <el-icon><TrendCharts /></el-icon>
              </div>
              <div class="metric-info">
                <div class="metric-number">{{ metrics.returnRate }}%</div>
                <div class="metric-label">返还率</div>
                <div class="metric-trend" :class="metrics.rateTrend.type">
                  <el-icon v-if="metrics.rateTrend.type === 'up'"><ArrowUp /></el-icon>
                  <el-icon v-else><ArrowDown /></el-icon>
                  {{ metrics.rateTrend.value }}%
                </div>
              </div>
            </div>
          </el-card>
        </el-col>
      </el-row>
    </div>

    <!-- 图表区域 -->
    <div class="charts-section">
      <el-row :gutter="20">
        <!-- 考核趋势图 -->
        <el-col :span="12">
          <el-card class="chart-card">
            <template #header>
              <div class="chart-header">
                <span>考核趋势分析</span>
                <el-radio-group v-model="trendChartType" size="small">
                  <el-radio-button label="count">次数</el-radio-button>
                  <el-radio-button label="amount">金额</el-radio-button>
                </el-radio-group>
              </div>
            </template>
            <div ref="trendChartRef" class="chart-container"></div>
          </el-card>
        </el-col>
        
        <!-- 部门分布图 -->
        <el-col :span="12">
          <el-card class="chart-card">
            <template #header>
              <div class="chart-header">
                <span>部门考核分布</span>
                <el-radio-group v-model="deptChartType" size="small">
                  <el-radio-button label="pie">饼图</el-radio-button>
                  <el-radio-button label="bar">柱图</el-radio-button>
                </el-radio-group>
              </div>
            </template>
            <div ref="deptChartRef" class="chart-container"></div>
          </el-card>
        </el-col>
      </el-row>

      <el-row :gutter="20" style="margin-top: 20px;">
        <!-- 改善期状态分布 -->
        <el-col :span="12">
          <el-card class="chart-card">
            <template #header>
              <span>改善期状态分布</span>
            </template>
            <div ref="statusChartRef" class="chart-container"></div>
          </el-card>
        </el-col>
        
        <!-- 返还情况统计 -->
        <el-col :span="12">
          <el-card class="chart-card">
            <template #header>
              <span>返还情况统计</span>
            </template>
            <div ref="returnChartRef" class="chart-container"></div>
          </el-card>
        </el-col>
      </el-row>
    </div>

    <!-- 详细数据表格 -->
    <div class="detail-table">
      <el-card>
        <template #header>
          <div class="table-header">
            <span>详细统计数据</span>
            <el-button type="primary" size="small" @click="handleRefresh">
              <el-icon><Refresh /></el-icon>
              刷新
            </el-button>
          </div>
        </template>
        
        <el-table
          :data="statisticsData"
          v-loading="loading"
          stripe
          border
          style="width: 100%"
        >
          <el-table-column prop="period" label="统计期间" width="120" />
          <el-table-column prop="department" label="部门" width="100" />
          <el-table-column prop="assessmentCount" label="考核次数" width="100" align="center" />
          <el-table-column prop="assessmentAmount" label="考核金额" width="120" align="right">
            <template #default="{ row }">
              <span class="amount-text">¥{{ row.assessmentAmount }}</span>
            </template>
          </el-table-column>
          <el-table-column prop="returnedCount" label="返还次数" width="100" align="center" />
          <el-table-column prop="returnedAmount" label="返还金额" width="120" align="right">
            <template #default="{ row }">
              <span class="returned-text">¥{{ row.returnedAmount }}</span>
            </template>
          </el-table-column>
          <el-table-column prop="returnRate" label="返还率" width="100" align="center">
            <template #default="{ row }">
              <el-tag :type="getReturnRateTagType(row.returnRate)">
                {{ row.returnRate }}%
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="avgAssessmentAmount" label="平均考核金额" width="140" align="right">
            <template #default="{ row }">
              ¥{{ row.avgAssessmentAmount }}
            </template>
          </el-table-column>
          <el-table-column prop="improvingCount" label="改善中" width="80" align="center" />
          <el-table-column prop="pendingCount" label="待改善" width="80" align="center" />
        </el-table>

        <!-- 分页 -->
        <div class="pagination-section">
          <el-pagination
            v-model:current-page="pagination.currentPage"
            v-model:page-size="pagination.pageSize"
            :page-sizes="[10, 20, 50, 100]"
            :total="pagination.total"
            layout="total, sizes, prev, pager, next, jumper"
            @size-change="handleSizeChange"
            @current-change="handleCurrentChange"
          />
        </div>
      </el-card>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, nextTick } from 'vue'
import { ElMessage } from 'element-plus'
import * as echarts from 'echarts'
import {
  Search, Refresh, Download, DataAnalysis, Money, Check, TrendCharts,
  ArrowUp, ArrowDown
} from '@element-plus/icons-vue'

/**
 * 响应式数据定义
 */
// 筛选表单
const filterForm = reactive({
  dateRange: [],
  department: '',
  statisticsType: 'monthly'
})

// 关键指标
const metrics = reactive({
  totalAssessments: 0,
  totalAmount: 0,
  returnedAmount: 0,
  returnRate: 0,
  assessmentTrend: { type: 'up', value: 0 },
  amountTrend: { type: 'down', value: 0 },
  returnTrend: { type: 'up', value: 0 },
  rateTrend: { type: 'up', value: 0 }
})

// 图表相关
const trendChartRef = ref()
const deptChartRef = ref()
const statusChartRef = ref()
const returnChartRef = ref()
const trendChartType = ref('count')
const deptChartType = ref('pie')

let trendChart = null
let deptChart = null
let statusChart = null
let returnChart = null

// 表格数据
const statisticsData = ref([])
const loading = ref(false)

// 分页数据
const pagination = reactive({
  currentPage: 1,
  pageSize: 20,
  total: 0
})

/**
 * 生命周期钩子
 */
onMounted(() => {
  // 设置默认日期范围（最近3个月）
  const endDate = new Date()
  const startDate = new Date()
  startDate.setMonth(startDate.getMonth() - 3)
  
  filterForm.dateRange = [
    startDate.toISOString().split('T')[0],
    endDate.toISOString().split('T')[0]
  ]
  
  loadData()
  loadMetrics()
  
  nextTick(() => {
    initCharts()
  })
})

/**
 * 数据加载函数
 */
// 加载统计数据
const loadData = async () => {
  loading.value = true
  try {
    // TODO: 调用后端API获取统计数据
    // const response = await assessmentApi.getStatistics({
    //   ...filterForm,
    //   page: pagination.currentPage,
    //   pageSize: pagination.pageSize
    // })
    
    // 模拟数据
    const mockData = [
      {
        period: '2024-01',
        department: '生产部',
        assessmentCount: 15,
        assessmentAmount: 1500,
        returnedCount: 8,
        returnedAmount: 800,
        returnRate: 53.3,
        avgAssessmentAmount: 100,
        improvingCount: 5,
        pendingCount: 2
      },
      {
        period: '2024-01',
        department: '质检部',
        assessmentCount: 8,
        assessmentAmount: 800,
        returnedCount: 5,
        returnedAmount: 500,
        returnRate: 62.5,
        avgAssessmentAmount: 100,
        improvingCount: 2,
        pendingCount: 1
      },
      {
        period: '2024-02',
        department: '生产部',
        assessmentCount: 12,
        assessmentAmount: 1200,
        returnedCount: 6,
        returnedAmount: 600,
        returnRate: 50.0,
        avgAssessmentAmount: 100,
        improvingCount: 4,
        pendingCount: 2
      }
    ]
    
    statisticsData.value = mockData
    pagination.total = mockData.length
  } catch (error) {
    ElMessage.error('加载数据失败：' + error.message)
  } finally {
    loading.value = false
  }
}

// 加载关键指标
const loadMetrics = async () => {
  try {
    // TODO: 调用后端API获取关键指标
    // const response = await assessmentApi.getMetrics(filterForm)
    
    // 模拟指标数据
    Object.assign(metrics, {
      totalAssessments: 35,
      totalAmount: 3500,
      returnedAmount: 1900,
      returnRate: 54.3,
      assessmentTrend: { type: 'down', value: 12.5 },
      amountTrend: { type: 'down', value: 8.3 },
      returnTrend: { type: 'up', value: 15.2 },
      rateTrend: { type: 'up', value: 5.8 }
    })
  } catch (error) {
    console.error('加载指标数据失败：', error)
  }
}

/**
 * 图表初始化函数
 */
// 初始化所有图表
const initCharts = () => {
  initTrendChart()
  initDeptChart()
  initStatusChart()
  initReturnChart()
}

// 初始化趋势图表
const initTrendChart = () => {
  if (trendChart) {
    trendChart.dispose()
  }
  
  trendChart = echarts.init(trendChartRef.value)
  
  const option = {
    tooltip: {
      trigger: 'axis'
    },
    legend: {
      data: ['考核次数', '考核金额']
    },
    xAxis: {
      type: 'category',
      data: ['2024-01', '2024-02', '2024-03', '2024-04']
    },
    yAxis: [
      {
        type: 'value',
        name: '次数',
        position: 'left'
      },
      {
        type: 'value',
        name: '金额(元)',
        position: 'right'
      }
    ],
    series: [
      {
        name: '考核次数',
        type: 'line',
        data: [23, 18, 15, 12],
        smooth: true,
        itemStyle: { color: '#409EFF' }
      },
      {
        name: '考核金额',
        type: 'line',
        yAxisIndex: 1,
        data: [2300, 1800, 1500, 1200],
        smooth: true,
        itemStyle: { color: '#E6A23C' }
      }
    ]
  }
  
  trendChart.setOption(option)
}

// 初始化部门分布图表
const initDeptChart = () => {
  if (deptChart) {
    deptChart.dispose()
  }
  
  deptChart = echarts.init(deptChartRef.value)
  
  const pieOption = {
    tooltip: {
      trigger: 'item'
    },
    legend: {
      orient: 'vertical',
      left: 'left'
    },
    series: [
      {
        name: '考核分布',
        type: 'pie',
        radius: '50%',
        data: [
          { value: 1500, name: '生产部' },
          { value: 800, name: '质检部' },
          { value: 600, name: '技术部' },
          { value: 400, name: '采购部' }
        ],
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
  
  deptChart.setOption(pieOption)
}

// 初始化状态分布图表
const initStatusChart = () => {
  if (statusChart) {
    statusChart.dispose()
  }
  
  statusChart = echarts.init(statusChartRef.value)
  
  const option = {
    tooltip: {
      trigger: 'item'
    },
    series: [
      {
        name: '改善期状态',
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
            fontSize: '30',
            fontWeight: 'bold'
          }
        },
        labelLine: {
          show: false
        },
        data: [
          { value: 12, name: '改善中', itemStyle: { color: '#409EFF' } },
          { value: 5, name: '待改善', itemStyle: { color: '#E6A23C' } },
          { value: 8, name: '已返还', itemStyle: { color: '#67C23A' } },
          { value: 3, name: '已确认', itemStyle: { color: '#909399' } }
        ]
      }
    ]
  }
  
  statusChart.setOption(option)
}

// 初始化返还情况图表
const initReturnChart = () => {
  if (returnChart) {
    returnChart.dispose()
  }
  
  returnChart = echarts.init(returnChartRef.value)
  
  const option = {
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'shadow'
      }
    },
    legend: {
      data: ['考核金额', '返还金额']
    },
    xAxis: {
      type: 'category',
      data: ['生产部', '质检部', '技术部', '采购部']
    },
    yAxis: {
      type: 'value'
    },
    series: [
      {
        name: '考核金额',
        type: 'bar',
        data: [1500, 800, 600, 400],
        itemStyle: { color: '#E6A23C' }
      },
      {
        name: '返还金额',
        type: 'bar',
        data: [800, 500, 350, 250],
        itemStyle: { color: '#67C23A' }
      }
    ]
  }
  
  returnChart.setOption(option)
}

/**
 * 事件处理函数
 */
// 筛选
const handleFilter = () => {
  pagination.currentPage = 1
  loadData()
  loadMetrics()
  updateCharts()
}

// 重置筛选
const resetFilter = () => {
  const endDate = new Date()
  const startDate = new Date()
  startDate.setMonth(startDate.getMonth() - 3)
  
  Object.assign(filterForm, {
    dateRange: [
      startDate.toISOString().split('T')[0],
      endDate.toISOString().split('T')[0]
    ],
    department: '',
    statisticsType: 'monthly'
  })
  handleFilter()
}

// 导出报表
const handleExport = async () => {
  try {
    // TODO: 调用后端API导出报表
    // await assessmentApi.exportReport(filterForm)
    
    ElMessage.success('报表导出成功')
  } catch (error) {
    ElMessage.error('导出失败：' + error.message)
  }
}

// 刷新数据
const handleRefresh = () => {
  loadData()
  loadMetrics()
  updateCharts()
}

// 更新图表
const updateCharts = () => {
  nextTick(() => {
    initCharts()
  })
}

// 分页处理
const handleSizeChange = (size) => {
  pagination.pageSize = size
  loadData()
}

const handleCurrentChange = (page) => {
  pagination.currentPage = page
  loadData()
}

/**
 * 工具函数
 */
// 获取返还率标签类型
const getReturnRateTagType = (rate) => {
  if (rate >= 70) return 'success'
  if (rate >= 50) return 'warning'
  return 'danger'
}
</script>

<style scoped>
.assessment-statistics {
  padding: 20px;
}

.page-header {
  margin-bottom: 20px;
}

.page-header h2 {
  margin: 0 0 8px 0;
  color: #303133;
  font-size: 24px;
  font-weight: 600;
}

.page-description {
  margin: 0;
  color: #909399;
  font-size: 14px;
}

.filter-section {
  background: #fff;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  margin-bottom: 20px;
}

.metrics-section {
  margin-bottom: 20px;
}

.metric-card {
  border-radius: 8px;
  overflow: hidden;
}

.metric-content {
  display: flex;
  align-items: center;
  padding: 15px;
}

.metric-icon {
  width: 50px;
  height: 50px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 15px;
  font-size: 24px;
  color: white;
}

.metric-card.total .metric-icon {
  background: linear-gradient(135deg, #409EFF, #3788d8);
}

.metric-card.amount .metric-icon {
  background: linear-gradient(135deg, #E6A23C, #d48806);
}

.metric-card.returned .metric-icon {
  background: linear-gradient(135deg, #67C23A, #52c41a);
}

.metric-card.rate .metric-icon {
  background: linear-gradient(135deg, #F56C6C, #ff4d4f);
}

.metric-info {
  flex: 1;
}

.metric-number {
  font-size: 24px;
  font-weight: 600;
  color: #303133;
  line-height: 1;
}

.metric-label {
  font-size: 14px;
  color: #909399;
  margin: 4px 0;
}

.metric-trend {
  font-size: 12px;
  display: flex;
  align-items: center;
  gap: 2px;
}

.metric-trend.up {
  color: #67C23A;
}

.metric-trend.down {
  color: #F56C6C;
}

.charts-section {
  margin-bottom: 20px;
}

.chart-card {
  border-radius: 8px;
}

.chart-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.chart-container {
  height: 300px;
  width: 100%;
}

.detail-table {
  background: #fff;
  border-radius: 8px;
}

.table-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.amount-text {
  font-weight: 600;
  color: #E6A23C;
}

.returned-text {
  font-weight: 600;
  color: #67C23A;
}

.pagination-section {
  margin-top: 20px;
  text-align: right;
}
</style>