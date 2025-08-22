<template>
  <div class="cost-statistics-container">
    <!-- 页面标题 -->
    <div class="page-header">
      <h2 class="page-title">
        <el-icon class="title-icon"><Money /></el-icon>
        质量成本统计分析
      </h2>
      <p class="page-description">客户投诉质量成本损失汇总分析与统计报表</p>
    </div>

    <!-- 筛选条件 -->
    <el-card class="filter-card" shadow="never">
      <el-form :model="filterForm" :inline="true" class="filter-form">
        <el-form-item label="时间范围">
          <el-date-picker
            v-model="filterForm.dateRange"
            type="daterange"
            range-separator="至"
            start-placeholder="开始日期"
            end-placeholder="结束日期"
            format="YYYY-MM-DD"
            value-format="YYYY-MM-DD"
            @change="handleDateRangeChange"
          />
        </el-form-item>
        <el-form-item label="统计维度">
          <el-select v-model="filterForm.dimension" @change="handleDimensionChange">
            <el-option label="按月统计" value="month" />
            <el-option label="按季度统计" value="quarter" />
            <el-option label="按年统计" value="year" />
          </el-select>
        </el-form-item>
        <el-form-item label="客户">
          <el-select v-model="filterForm.customerId" clearable placeholder="全部客户" filterable>
            <el-option
              v-for="customer in customerOptions"
              :key="customer.id"
              :label="customer.name"
              :value="customer.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="loadStatistics" :loading="loading">
            <el-icon><Search /></el-icon>
            查询统计
          </el-button>
          <el-button @click="resetFilter">
            <el-icon><Refresh /></el-icon>
            重置
          </el-button>
          <el-button type="success" @click="exportData">
            <el-icon><Download /></el-icon>
            导出报表
          </el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 统计概览卡片 -->
    <div class="overview-cards" v-loading="loading">
      <el-card class="overview-card total-cost" shadow="hover">
        <div class="card-content">
          <div class="card-icon">
            <el-icon size="32"><Money /></el-icon>
          </div>
          <div class="card-info">
            <div class="card-value">¥{{ formatCurrency(overviewData.totalCost) }}</div>
            <div class="card-label">总质量成本</div>
            <div class="card-trend" :class="overviewData.totalTrend >= 0 ? 'trend-up' : 'trend-down'">
              <el-icon><component :is="overviewData.totalTrend >= 0 ? 'ArrowUp' : 'ArrowDown'" /></el-icon>
              {{ isNaN(overviewData.totalTrend) ? '0.0' : Math.abs(overviewData.totalTrend) }}%
            </div>
          </div>
        </div>
      </el-card>

      <el-card class="overview-card penalty-cost" shadow="hover">
        <div class="card-content">
          <div class="card-icon">
            <el-icon size="32"><Warning /></el-icon>
          </div>
          <div class="card-info">
            <div class="card-value">¥{{ formatCurrency(overviewData.penaltyCost) }}</div>
            <div class="card-label">质量罚款</div>
            <div class="card-ratio">{{ overviewData.totalCost > 0 ? ((overviewData.penaltyCost / overviewData.totalCost) * 100).toFixed(1) : '0.0' }}%</div>
          </div>
        </div>
      </el-card>

      <el-card class="overview-card compensation-cost" shadow="hover">
        <div class="card-content">
          <div class="card-icon">
            <el-icon size="32"><User /></el-icon>
          </div>
          <div class="card-info">
            <div class="card-value">¥{{ formatCurrency(overviewData.compensationCost) }}</div>
            <div class="card-label">客户赔偿</div>
            <div class="card-ratio">{{ overviewData.totalCost > 0 ? ((overviewData.compensationCost / overviewData.totalCost) * 100).toFixed(1) : '0.0' }}%</div>
          </div>
        </div>
      </el-card>

      <el-card class="overview-card rework-cost" shadow="hover">
        <div class="card-content">
          <div class="card-icon">
            <el-icon size="32"><Tools /></el-icon>
          </div>
          <div class="card-info">
            <div class="card-value">¥{{ formatCurrency(overviewData.reworkCost) }}</div>
            <div class="card-label">返工成本</div>
            <div class="card-ratio">{{ overviewData.totalCost > 0 ? ((overviewData.reworkCost / overviewData.totalCost) * 100).toFixed(1) : '0.0' }}%</div>
          </div>
        </div>
      </el-card>
    </div>

    <!-- 图表区域 -->
    <div class="charts-section">
      <el-row :gutter="20">
        <!-- 成本趋势图 -->
        <el-col :span="12">
          <el-card class="chart-card" shadow="never">
            <template #header>
              <div class="chart-header">
                <span class="chart-title">
                  <el-icon><TrendCharts /></el-icon>
                  质量成本趋势
                </span>
              </div>
            </template>
            <div ref="trendChartRef" class="chart-container"></div>
          </el-card>
        </el-col>

        <!-- 成本构成饼图 -->
        <el-col :span="12">
          <el-card class="chart-card" shadow="never">
            <template #header>
              <div class="chart-header">
                <span class="chart-title">
                  <el-icon><PieChart /></el-icon>
                  成本构成分析
                </span>
              </div>
            </template>
            <div ref="pieChartRef" class="chart-container"></div>
          </el-card>
        </el-col>
      </el-row>

      <el-row :gutter="20" style="margin-top: 20px;">
        <!-- 客户成本排行 -->
        <el-col :span="24">
          <el-card class="chart-card" shadow="never">
            <template #header>
              <div class="chart-header">
                <span class="chart-title">
                  <el-icon><Histogram /></el-icon>
                  客户质量成本排行
                </span>
              </div>
            </template>
            <div ref="customerChartRef" class="chart-container"></div>
          </el-card>
        </el-col>
      </el-row>
    </div>

    <!-- 详细数据表格 -->
    <el-card class="table-card" shadow="never">
      <template #header>
        <div class="table-header">
          <span class="table-title">
            <el-icon><Grid /></el-icon>
            详细统计数据
          </span>
        </div>
      </template>
      
      <el-table
        :data="statisticsData"
        v-loading="loading"
        stripe
        border
        style="width: 100%"
        :default-sort="{ prop: 'totalCost', order: 'descending' }"
      >
        <el-table-column prop="period" label="统计期间" width="120" sortable />
        <el-table-column prop="customerName" label="客户名称" width="150" />
        <el-table-column prop="complaintCount" label="投诉数量" width="100" align="center" sortable />
        <el-table-column prop="qualityPenalty" label="质量罚款" width="120" align="right" sortable>
          <template #default="scope">
            <span class="cost-value">¥{{ formatCurrency(scope.row.qualityPenalty) }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="reworkCost" label="返工成本" width="120" align="right" sortable>
          <template #default="scope">
            <span class="cost-value">¥{{ formatCurrency(scope.row.reworkCost) }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="customerCompensation" label="客户赔偿" width="120" align="right" sortable>
          <template #default="scope">
            <span class="cost-value">¥{{ formatCurrency(scope.row.customerCompensation) }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="qualityLossCost" label="质量损失" width="120" align="right" sortable>
          <template #default="scope">
            <span class="cost-value">¥{{ formatCurrency(scope.row.qualityLossCost) }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="inspectionCost" label="检验成本" width="120" align="right" sortable>
          <template #default="scope">
            <span class="cost-value">¥{{ formatCurrency(scope.row.inspectionCost) }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="transportationCost" label="运输成本" width="120" align="right" sortable>
          <template #default="scope">
            <span class="cost-value">¥{{ formatCurrency(scope.row.transportationCost) }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="preventionCost" label="预防成本" width="120" align="right" sortable>
          <template #default="scope">
            <span class="cost-value">¥{{ formatCurrency(scope.row.preventionCost) }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="totalCost" label="总成本" width="140" align="right" sortable>
          <template #default="scope">
            <el-tag type="danger" size="large">
              ¥{{ formatCurrency(scope.row.totalCost) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="120" fixed="right">
          <template #default="scope">
            <el-button type="primary" size="small" @click="viewDetails(scope.row)">
              查看详情
            </el-button>
          </template>
        </el-table-column>
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
</template>

<script setup>
/**
 * 质量成本统计分析页面
 * 
 * 功能说明：
 * 1. 提供质量成本的多维度统计分析
 * 2. 支持按时间范围、客户等条件筛选
 * 3. 展示成本趋势图、构成分析等可视化图表
 * 4. 提供详细的统计数据表格和导出功能
 */

import { ref, reactive, onMounted, nextTick } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  Money,
  Search,
  Refresh,
  Download,
  Warning,
  User,
  Tools,
  TrendCharts,
  PieChart,
  Histogram,
  Grid,
  ArrowUp,
  ArrowDown
} from '@element-plus/icons-vue'
import * as echarts from 'echarts'
import apiService from '../../../services/apiService'

// 响应式数据
const loading = ref(false)

// 筛选表单
const filterForm = reactive({
  dateRange: [],
  dimension: 'month',
  customerId: null
})

// 客户选项
const customerOptions = ref([])

// 概览数据
const overviewData = reactive({
  totalCost: 0,
  penaltyCost: 0,
  compensationCost: 0,
  reworkCost: 0,
  totalTrend: 0
})

// 统计数据
const statisticsData = ref([])

// 分页数据
const pagination = reactive({
  currentPage: 1,
  pageSize: 20,
  total: 0
})

// 图表引用
const trendChartRef = ref(null)
const pieChartRef = ref(null)
const customerChartRef = ref(null)

// 图表实例
let trendChart = null
let pieChart = null
let customerChart = null

/**
 * 格式化货币显示
 * @param {number} value - 金额值
 * @returns {string} 格式化后的金额字符串
 */
const formatCurrency = (value) => {
  if (!value || value === 0) return '0.00'
  return Number(value).toLocaleString('zh-CN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })
}

/**
 * 加载客户选项
 */
const loadCustomerOptions = async () => {
  try {
    const response = await apiService.get('/customer-complaints/customers')
    if (response.data.success) {
      customerOptions.value = response.data.data
    }
  } catch (error) {
    console.error('加载客户选项失败:', error)
  }
}

/**
 * 加载统计数据
 */
const loadStatistics = async () => {
  loading.value = true
  try {
    const params = {
      startDate: filterForm.dateRange?.[0],
      endDate: filterForm.dateRange?.[1],
      dimension: filterForm.dimension,
      customerId: filterForm.customerId,
      page: pagination.currentPage,
      pageSize: pagination.pageSize
    }

    const response = await apiService.get('/customer-complaints/cost-statistics', { params })
    if (response.data.success) {
      const data = response.data.data
      
      // 更新概览数据
      Object.assign(overviewData, data.overview)
      
      // 更新统计数据
      statisticsData.value = data.statistics
      pagination.total = data.total
      
      // 更新图表
      await nextTick()
      updateCharts(data)
    } else {
      ElMessage.error(response.data.message || '加载统计数据失败')
    }
  } catch (error) {
    console.error('加载统计数据失败:', error)
    ElMessage.error('加载统计数据失败')
  } finally {
    loading.value = false
  }
}

/**
 * 更新图表
 * @param {Object} data - 统计数据
 */
const updateCharts = (data) => {
  updateTrendChart(data.trendData)
  updatePieChart(data.costComposition)
  updateCustomerChart(data.customerRanking)
}

/**
 * 更新趋势图
 * @param {Array} trendData - 趋势数据
 */
const updateTrendChart = (trendData) => {
  if (!trendChart || !trendData) return

  const option = {
    tooltip: {
      trigger: 'axis',
      formatter: (params) => {
        let result = `${params[0].axisValue}<br/>`
        params.forEach(param => {
          result += `${param.seriesName}: ¥${formatCurrency(param.value)}<br/>`
        })
        return result
      }
    },
    legend: {
      data: ['质量罚款', '返工成本', '客户赔偿', '总成本']
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      data: trendData.map(item => item.period)
    },
    yAxis: {
      type: 'value',
      axisLabel: {
        formatter: (value) => `¥${formatCurrency(value)}`
      }
    },
    series: [
      {
        name: '质量罚款',
        type: 'line',
        data: trendData.map(item => item.qualityPenalty),
        itemStyle: { color: '#f56c6c' }
      },
      {
        name: '返工成本',
        type: 'line',
        data: trendData.map(item => item.reworkCost),
        itemStyle: { color: '#e6a23c' }
      },
      {
        name: '客户赔偿',
        type: 'line',
        data: trendData.map(item => item.customerCompensation),
        itemStyle: { color: '#909399' }
      },
      {
        name: '总成本',
        type: 'line',
        data: trendData.map(item => item.totalCost),
        itemStyle: { color: '#409eff' },
        lineStyle: { width: 3 }
      }
    ]
  }

  trendChart.setOption(option)
}

/**
 * 更新饼图
 * @param {Array} compositionData - 构成数据
 */
const updatePieChart = (compositionData) => {
  if (!pieChart || !compositionData) return

  const option = {
    tooltip: {
      trigger: 'item',
      formatter: '{a} <br/>{b}: ¥{c} ({d}%)'
    },
    legend: {
      orient: 'vertical',
      left: 'left'
    },
    series: [
      {
        name: '成本构成',
        type: 'pie',
        radius: '50%',
        data: compositionData,
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

  pieChart.setOption(option)
}

/**
 * 更新客户排行图
 * @param {Array} customerData - 客户数据
 */
const updateCustomerChart = (customerData) => {
  if (!customerChart || !customerData) return

  const option = {
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'shadow'
      },
      formatter: (params) => {
        const data = params[0]
        return `${data.axisValue}<br/>总成本: ¥${formatCurrency(data.value)}`
      }
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      containLabel: true
    },
    xAxis: {
      type: 'value',
      axisLabel: {
        formatter: (value) => `¥${formatCurrency(value)}`
      }
    },
    yAxis: {
      type: 'category',
      data: customerData.map(item => item.customerName)
    },
    series: [
      {
        name: '质量成本',
        type: 'bar',
        data: customerData.map(item => item.totalCost),
        itemStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 1, 0, [
            { offset: 0, color: '#83bff6' },
            { offset: 0.5, color: '#188df0' },
            { offset: 1, color: '#188df0' }
          ])
        }
      }
    ]
  }

  customerChart.setOption(option)
}

/**
 * 初始化图表
 */
const initCharts = () => {
  if (trendChartRef.value) {
    trendChart = echarts.init(trendChartRef.value)
  }
  if (pieChartRef.value) {
    pieChart = echarts.init(pieChartRef.value)
  }
  if (customerChartRef.value) {
    customerChart = echarts.init(customerChartRef.value)
  }

  // 监听窗口大小变化
  window.addEventListener('resize', () => {
    trendChart?.resize()
    pieChart?.resize()
    customerChart?.resize()
  })
}

/**
 * 处理日期范围变化
 */
const handleDateRangeChange = () => {
  loadStatistics()
}

/**
 * 处理统计维度变化
 */
const handleDimensionChange = () => {
  loadStatistics()
}

/**
 * 重置筛选条件
 */
const resetFilter = () => {
  filterForm.dateRange = []
  filterForm.dimension = 'month'
  filterForm.customerId = null
  loadStatistics()
}

/**
 * 导出数据
 */
const exportData = async () => {
  try {
    const params = {
      startDate: filterForm.dateRange?.[0],
      endDate: filterForm.dateRange?.[1],
      dimension: filterForm.dimension,
      customerId: filterForm.customerId,
      export: true
    }

    const response = await apiService.get('/customer-complaints/cost-statistics/export', {
      params,
      responseType: 'blob'
    })

    // 创建下载链接
    const blob = new Blob([response.data], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `质量成本统计_${new Date().toISOString().slice(0, 10)}.xlsx`
    link.click()
    window.URL.revokeObjectURL(url)

    ElMessage.success('导出成功')
  } catch (error) {
    console.error('导出失败:', error)
    ElMessage.error('导出失败')
  }
}

/**
 * 查看详情
 * @param {Object} row - 行数据
 */
const viewDetails = (row) => {
  ElMessageBox.alert(
    `统计期间：${row.period}\n客户名称：${row.customerName}\n投诉数量：${row.complaintCount}\n总成本：¥${formatCurrency(row.totalCost)}`,
    '详细信息',
    {
      confirmButtonText: '确定'
    }
  )
}

/**
 * 处理分页大小变化
 * @param {number} size - 页面大小
 */
const handleSizeChange = (size) => {
  pagination.pageSize = size
  pagination.currentPage = 1
  loadStatistics()
}

/**
 * 处理当前页变化
 * @param {number} page - 当前页
 */
const handleCurrentChange = (page) => {
  pagination.currentPage = page
  loadStatistics()
}

// 组件挂载时初始化
onMounted(async () => {
  // 设置默认日期范围（最近3个月）
  const endDate = new Date()
  const startDate = new Date()
  startDate.setMonth(startDate.getMonth() - 3)
  
  filterForm.dateRange = [
    startDate.toISOString().slice(0, 10),
    endDate.toISOString().slice(0, 10)
  ]

  await loadCustomerOptions()
  await nextTick()
  initCharts()
  await loadStatistics()
})
</script>

<style scoped>
.cost-statistics-container {
  padding: 20px;
  background-color: #f5f7fa;
  min-height: 100vh;
}

.page-header {
  margin-bottom: 20px;
}

.page-title {
  display: flex;
  align-items: center;
  font-size: 24px;
  font-weight: 600;
  color: #303133;
  margin: 0 0 8px 0;
}

.title-icon {
  margin-right: 12px;
  color: #409eff;
}

.page-description {
  color: #606266;
  font-size: 14px;
  margin: 0;
}

.filter-card {
  margin-bottom: 20px;
}

.filter-form {
  margin: 0;
}

.overview-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 20px;
  margin-bottom: 20px;
}

.overview-card {
  transition: all 0.3s ease;
}

.overview-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
}

.card-content {
  display: flex;
  align-items: center;
  padding: 10px;
}

.card-icon {
  width: 60px;
  height: 60px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 16px;
}

.total-cost .card-icon {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.penalty-cost .card-icon {
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
  color: white;
}

.compensation-cost .card-icon {
  background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
  color: white;
}

.rework-cost .card-icon {
  background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%);
  color: white;
}

.card-info {
  flex: 1;
}

.card-value {
  font-size: 24px;
  font-weight: 700;
  color: #303133;
  margin-bottom: 4px;
}

.card-label {
  font-size: 14px;
  color: #606266;
  margin-bottom: 4px;
}

.card-trend {
  display: flex;
  align-items: center;
  font-size: 12px;
  font-weight: 600;
}

.trend-up {
  color: #f56c6c;
}

.trend-down {
  color: #67c23a;
}

.card-ratio {
  font-size: 12px;
  color: #909399;
}

.charts-section {
  margin-bottom: 20px;
}

.chart-card {
  height: 400px;
}

.chart-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.chart-title {
  display: flex;
  align-items: center;
  font-size: 16px;
  font-weight: 600;
  color: #303133;
}

.chart-title .el-icon {
  margin-right: 8px;
  color: #409eff;
}

.chart-container {
  width: 100%;
  height: 320px;
}

.table-card {
  margin-bottom: 20px;
}

.table-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.table-title {
  display: flex;
  align-items: center;
  font-size: 16px;
  font-weight: 600;
  color: #303133;
}

.table-title .el-icon {
  margin-right: 8px;
  color: #409eff;
}

.cost-value {
  font-weight: 600;
  color: #f56c6c;
}

.pagination-section {
  display: flex;
  justify-content: center;
  margin-top: 20px;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .cost-statistics-container {
    padding: 10px;
  }
  
  .overview-cards {
    grid-template-columns: 1fr;
  }
  
  .chart-card {
    height: 300px;
  }
  
  .chart-container {
    height: 220px;
  }
}
</style>