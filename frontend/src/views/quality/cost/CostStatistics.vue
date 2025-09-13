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
            @change="handleDateRangeChange"  style="width: 240px"
          />
        </el-form-item>
        <el-form-item label="成本类型">
          <el-select v-model="filterForm.costType" @change="handleCostTypeChange" style="width: 120px">
            <el-option label="全部" value="all" />
            <el-option label="外部成本" value="external" />
            <el-option label="内部成本" value="internal" />
          </el-select>
        </el-form-item>
        <el-form-item label="统计维度">
          <el-select v-model="filterForm.dimension" @change="handleDimensionChange" style="width: 120px">
            <el-option label="按月统计" value="month" />
            <el-option label="按季度统计" value="quarter" />
            <el-option label="按年统计" value="year" />
          </el-select>
        </el-form-item>
        <el-form-item label="客户">
          <el-select v-model="filterForm.customerId" clearable placeholder="全部客户" filterable  style="width: 120px">
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
            <!-- 内外部成本分解 -->
            <div class="cost-breakdown" v-if="filterForm.costType === 'all'">
              <div class="breakdown-item external">
                <el-tag type="danger" size="small" class="breakdown-label">外部</el-tag>
                <span class="breakdown-value">¥{{ formatCurrency(overviewData.externalCost || 0) }}</span>
              </div>
              <div class="breakdown-item internal">
                <el-tag type="success" size="small" class="breakdown-label">内部</el-tag>
                <span class="breakdown-value">¥{{ formatCurrency(overviewData.internalCost || 0) }}</span>
              </div>
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

    <!-- 内部成本详细卡片 (仅在显示内部成本或全部成本时显示) -->
    <div class="overview-cards internal-cards" v-loading="loading" v-if="filterForm.costType === 'internal' || filterForm.costType === 'all'">
      <el-card class="overview-card internal-complaint" shadow="hover">
        <div class="card-content">
          <div class="card-icon">
            <el-icon size="32"><ChatDotSquare /></el-icon>
          </div>
          <div class="card-info">
            <div class="card-value">¥{{ formatCurrency(overviewData.internalComplaintCost || 0) }}</div>
            <div class="card-label">内诉成本</div>
            <div class="card-ratio">{{ overviewData.totalCost > 0 ? ((overviewData.internalComplaintCost / overviewData.totalCost) * 100).toFixed(1) : '0.0' }}%</div>
          </div>
        </div>
      </el-card>

      <el-card class="overview-card publishing-exception" shadow="hover">
        <div class="card-content">
          <div class="card-icon">
            <el-icon size="32"><Document /></el-icon>
          </div>
          <div class="card-info">
            <div class="card-value">¥{{ formatCurrency(overviewData.publishingExceptionCost || 0) }}</div>
            <div class="card-label">出版异常成本</div>
            <div class="card-ratio">{{ overviewData.totalCost > 0 ? ((overviewData.publishingExceptionCost / overviewData.totalCost) * 100).toFixed(1) : '0.0' }}%</div>
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

import { ref, reactive, onMounted, onUnmounted, nextTick } from 'vue'
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
  ArrowDown,
  ChatDotSquare,
  Document
} from '@element-plus/icons-vue'
import * as echarts from 'echarts'
import apiService from '../../../services/apiService'

// 响应式数据
const loading = ref(false)

// 筛选表单
const filterForm = reactive({
  dateRange: [],
  dimension: 'month',
  customerId: null,
  costType: 'all'
})

// 客户选项
const customerOptions = ref([])

// 概览数据
const overviewData = reactive({
  totalCost: 0,
  penaltyCost: 0,
  compensationCost: 0,
  reworkCost: 0,
  totalTrend: 0,
  externalCost: 0,
  internalCost: 0,
  internalComplaintCost: 0,
  publishingExceptionCost: 0
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

// ResizeObserver实例
let resizeObserver = null

// 窗口resize处理函数
const handleResize = () => {
  trendChart?.resize()
  pieChart?.resize()
  customerChart?.resize()
}

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
      costType: filterForm.costType,
      page: pagination.currentPage,
      pageSize: pagination.pageSize
    }

    const response = await apiService.get('/customer-complaints/cost-statistics', { params })
    
    if (response.data.success) {
      const data = response.data.data
      
      // 更新概览数据
      Object.assign(overviewData, data.overview)
      
      // 更新内外部成本数据
      overviewData.externalCost = data.overview?.external?.totalCost || 0
      overviewData.internalCost = data.overview?.internal?.totalCost || 0
      overviewData.penaltyCost = data.overview?.external?.qualityPenalty || 0
      overviewData.compensationCost = data.overview?.external?.customerCompensation || 0
      overviewData.reworkCost = data.overview?.internal?.reworkCost || 0
      overviewData.internalComplaintCost = data.overview?.internal?.internalComplaintCost || 0
      overviewData.publishingExceptionCost = data.overview?.internal?.publishingExceptionCost || 0
      
      // 更新统计数据
      statisticsData.value = data.detailData || []
      pagination.total = data.pagination?.total || data.total || 0
      
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
  if (!trendChart || !trendData || trendData.length === 0) return
  
  // 对趋势数据进行去重和排序处理
  const periodMap = new Map()
  trendData.forEach(item => {
    const period = item.period
    if (!periodMap.has(period)) {
      periodMap.set(period, item)
    } else {
      // 如果存在重复period，合并数据
      const existing = periodMap.get(period)
      existing.externalCost = (existing.externalCost || 0) + (item.externalCost || 0)
      existing.internalCost = (existing.internalCost || 0) + (item.internalCost || 0)
      existing.totalCost = (existing.totalCost || 0) + (item.totalCost || 0)
      if (existing.external && item.external) {
        existing.external.qualityPenalty = (existing.external.qualityPenalty || 0) + (item.external.qualityPenalty || 0)
        existing.external.customerCompensation = (existing.external.customerCompensation || 0) + (item.external.customerCompensation || 0)
        existing.external.totalCost = (existing.external.totalCost || 0) + (item.external.totalCost || 0)
      }
      if (existing.internal && item.internal) {
        existing.internal.complaintCost = (existing.internal.complaintCost || 0) + (item.internal.complaintCost || 0)
        existing.internal.reworkCost = (existing.internal.reworkCost || 0) + (item.internal.reworkCost || 0)
        existing.internal.totalCost = (existing.internal.totalCost || 0) + (item.internal.totalCost || 0)
      }
    }
  })
  
  // 转换为数组并排序
  const processedTrendData = Array.from(periodMap.values()).sort((a, b) => a.period.localeCompare(b.period))
  
  // 根据成本类型构建图例和系列数据
  let legendData = []
  let seriesData = []
  
  if (filterForm.costType === 'all') {
    legendData = ['外部成本', '内部成本', '总成本']
    seriesData = [
      {
        name: '外部成本',
        type: 'line',
        smooth: true,
        smoothMonotone: 'x',
        lineStyle: {
          width: 2,
          color: '#DC3C37',
          shadowColor: 'rgba(220, 60, 55, 0.3)',
          shadowBlur: 10,
          shadowOffsetY: 3
        },
        itemStyle: {
          color: '#ffffff',
          borderWidth: 3,
          borderColor: '#DC3C37',
          shadowColor: 'rgba(220, 60, 55, 0.4)',
          shadowBlur: 8
        },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(220, 60, 55, 0.4)' },
              { offset: 1, color: 'rgba(220, 60, 55, 0.1)' }
            ]
          }
        },
        symbol: 'circle',
        symbolSize: 16,
        showSymbol: true,
        emphasis: {
          focus: 'series',
          lineStyle: {
            width: 3
          },
          itemStyle: {
            color: '#ffffff',
            borderWidth: 4,
            borderColor: '#DC3C37',
            shadowBlur: 15,
            shadowColor: 'rgba(220, 60, 55, 0.6)'
          }
        },
        data: processedTrendData.map(item => item.externalCost || 0)
      },
      {
        name: '内部成本',
        type: 'line',
        smooth: true,
        smoothMonotone: 'x',
        lineStyle: {
          width: 2,
          color: '#FFA753',
          shadowColor: 'rgba(255, 167, 83, 0.3)',
          shadowBlur: 10,
          shadowOffsetY: 3
        },
        itemStyle: {
          color: '#ffffff',
          borderWidth: 3,
          borderColor: '#FFA753',
          shadowColor: 'rgba(255, 167, 83, 0.4)',
          shadowBlur: 8
        },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(255, 167, 83, 0.4)' },
              { offset: 1, color: 'rgba(255, 167, 83, 0.1)' }
            ]
          }
        },
        symbol: 'circle',
        symbolSize: 16,
        showSymbol: true,
        emphasis: {
          focus: 'series',
          lineStyle: {
            width: 3
          },
          itemStyle: {
            color: '#ffffff',
            borderWidth: 4,
            borderColor: '#FFA753',
            shadowBlur: 15,
            shadowColor: 'rgba(255, 167, 83, 0.6)'
          }
        },
        data: processedTrendData.map(item => item.internalCost || 0)
      },
      {
        name: '总成本',
        type: 'line',
        smooth: true,
        smoothMonotone: 'x',
        // 默认隐藏总成本系列
        selected: false,
        lineStyle: {
          width: 3,
          color: '#409eff',
          shadowColor: 'rgba(64, 158, 255, 0.3)',
          shadowBlur: 10,
          shadowOffsetY: 3
        },
        itemStyle: {
          color: '#ffffff',
          borderWidth: 3,
          borderColor: '#409eff',
          shadowColor: 'rgba(64, 158, 255, 0.4)',
          shadowBlur: 8
        },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(64, 158, 255, 0.4)' },
              { offset: 1, color: 'rgba(64, 158, 255, 0.1)' }
            ]
          }
        },
        symbol: 'circle',
        symbolSize: 18,
        showSymbol: true,
        emphasis: {
          focus: 'series',
          lineStyle: {
            width: 4
          },
          itemStyle: {
            color: '#ffffff',
            borderWidth: 4,
            borderColor: '#409eff',
            shadowBlur: 15,
            shadowColor: 'rgba(64, 158, 255, 0.6)'
          }
        },
        data: processedTrendData.map(item => item.totalCost || 0)
      }
    ]
  } else if (filterForm.costType === 'external') {
    legendData = ['质量罚款', '客户赔偿', '外部总成本']
    seriesData = [
      {
        name: '质量罚款',
        type: 'line',
        smooth: true,
        smoothMonotone: 'x',
        lineStyle: {
          width: 4,
          color: '#DC3C37',
          shadowColor: 'rgba(220, 60, 55, 0.3)',
          shadowBlur: 10,
          shadowOffsetY: 3
        },
        itemStyle: {
          color: '#ffffff',
          borderWidth: 3,
          borderColor: '#DC3C37',
          shadowColor: 'rgba(220, 60, 55, 0.4)',
          shadowBlur: 8
        },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(220, 60, 55, 0.4)' },
              { offset: 1, color: 'rgba(220, 60, 55, 0.1)' }
            ]
          }
        },
        symbol: 'circle',
        symbolSize: 16,
        showSymbol: true,
        emphasis: {
          focus: 'series',
          lineStyle: {
            width: 5
          },
          itemStyle: {
            color: '#ffffff',
            borderWidth: 4,
            borderColor: '#DC3C37',
            shadowBlur: 15,
            shadowColor: 'rgba(220, 60, 55, 0.6)'
          }
        },
        data: processedTrendData.map(item => item.external?.qualityPenalty || 0)
      },
      {
        name: '客户赔偿',
        type: 'line',
        smooth: true,
        smoothMonotone: 'x',
        lineStyle: {
          width: 2,
          color: '#ff7875',
          shadowColor: 'rgba(255, 120, 117, 0.3)',
          shadowBlur: 10,
          shadowOffsetY: 3
        },
        itemStyle: {
          color: '#ffffff',
          borderWidth: 3,
          borderColor: '#ff7875',
          shadowColor: 'rgba(255, 120, 117, 0.4)',
          shadowBlur: 8
        },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(255, 120, 117, 0.4)' },
              { offset: 1, color: 'rgba(255, 120, 117, 0.1)' }
            ]
          }
        },
        symbol: 'circle',
        symbolSize: 16,
        showSymbol: true,
        emphasis: {
          focus: 'series',
          lineStyle: {
            width: 5
          },
          itemStyle: {
            color: '#ffffff',
            borderWidth: 4,
            borderColor: '#ff7875',
            shadowBlur: 15,
            shadowColor: 'rgba(255, 120, 117, 0.6)'
          }
        },
        data: processedTrendData.map(item => item.external?.customerCompensation || 0)
      },
      {
        name: '外部总成本',
        type: 'line',
        smooth: true,
        smoothMonotone: 'x',
        lineStyle: {
          width: 5,
          color: '#DC3C37',
          shadowColor: 'rgba(220, 60, 55, 0.3)',
          shadowBlur: 10,
          shadowOffsetY: 3
        },
        itemStyle: {
          color: '#ffffff',
          borderWidth: 3,
          borderColor: '#DC3C37',
          shadowColor: 'rgba(220, 60, 55, 0.4)',
          shadowBlur: 8
        },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(220, 60, 55, 0.4)' },
              { offset: 1, color: 'rgba(220, 60, 55, 0.1)' }
            ]
          }
        },
        symbol: 'circle',
        symbolSize: 18,
        showSymbol: true,
        emphasis: {
          focus: 'series',
          lineStyle: {
            width: 6
          },
          itemStyle: {
            color: '#ffffff',
            borderWidth: 4,
            borderColor: '#DC3C37',
            shadowBlur: 15,
            shadowColor: 'rgba(220, 60, 55, 0.6)'
          }
        },
        data: processedTrendData.map(item => item.externalCost || 0)
      }
    ]
  } else if (filterForm.costType === 'internal') {
    legendData = ['返工成本', '内诉成本', '出版异常成本', '内部总成本']
    seriesData = [
      {
        name: '返工成本',
        type: 'line',
        smooth: true,
        smoothMonotone: 'x',
        lineStyle: {
          width: 4,
          color: '#67c23a',
          shadowColor: 'rgba(103, 194, 58, 0.3)',
          shadowBlur: 10,
          shadowOffsetY: 3
        },
        itemStyle: {
          color: '#ffffff',
          borderWidth: 3,
          borderColor: '#67c23a',
          shadowColor: 'rgba(103, 194, 58, 0.4)',
          shadowBlur: 8
        },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(103, 194, 58, 0.4)' },
              { offset: 1, color: 'rgba(103, 194, 58, 0.1)' }
            ]
          }
        },
        symbol: 'circle',
        symbolSize: 16,
        showSymbol: true,
        emphasis: {
          focus: 'series',
          lineStyle: {
            width: 5
          },
          itemStyle: {
            color: '#ffffff',
            borderWidth: 4,
            borderColor: '#67c23a',
            shadowBlur: 15,
            shadowColor: 'rgba(103, 194, 58, 0.6)'
          }
        },
        data: processedTrendData.map(item => item.internal?.reworkCost || 0)
      },
      {
        name: '内诉成本',
        type: 'line',
        smooth: true,
        smoothMonotone: 'x',
        lineStyle: {
          width: 2,
          color: '#95de64',
          shadowColor: 'rgba(149, 222, 100, 0.3)',
          shadowBlur: 10,
          shadowOffsetY: 3
        },
        itemStyle: {
          color: '#ffffff',
          borderWidth: 3,
          borderColor: '#95de64',
          shadowColor: 'rgba(149, 222, 100, 0.4)',
          shadowBlur: 8
        },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(149, 222, 100, 0.4)' },
              { offset: 1, color: 'rgba(149, 222, 100, 0.1)' }
            ]
          }
        },
        symbol: 'circle',
        symbolSize: 16,
        showSymbol: true,
        emphasis: {
          focus: 'series',
          lineStyle: {
            width: 5
          },
          itemStyle: {
            color: '#ffffff',
            borderWidth: 4,
            borderColor: '#95de64',
            shadowBlur: 15,
            shadowColor: 'rgba(149, 222, 100, 0.6)'
          }
        },
        data: processedTrendData.map(item => item.internal?.complaintCost || 0)
      },
      {
        name: '出版异常成本',
        type: 'line',
        smooth: true,
        smoothMonotone: 'x',
        lineStyle: {
          width: 2,
          color: '#b7eb8f',
          shadowColor: 'rgba(183, 235, 143, 0.3)',
          shadowBlur: 10,
          shadowOffsetY: 3
        },
        itemStyle: {
          color: '#ffffff',
          borderWidth: 3,
          borderColor: '#b7eb8f',
          shadowColor: 'rgba(183, 235, 143, 0.4)',
          shadowBlur: 8
        },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(183, 235, 143, 0.4)' },
              { offset: 1, color: 'rgba(183, 235, 143, 0.1)' }
            ]
          }
        },
        symbol: 'circle',
        symbolSize: 16,
        showSymbol: true,
        emphasis: {
          focus: 'series',
          lineStyle: {
            width: 5
          },
          itemStyle: {
            color: '#ffffff',
            borderWidth: 4,
            borderColor: '#b7eb8f',
            shadowBlur: 15,
            shadowColor: 'rgba(183, 235, 143, 0.6)'
          }
        },
        data: processedTrendData.map(item => item.internal?.publishingCost || 0)
      },
      {
        name: '内部总成本',
        type: 'line',
        smooth: true,
        smoothMonotone: 'x',
        lineStyle: {
          width: 5,
          color: '#52c41a',
          shadowColor: 'rgba(82, 196, 26, 0.3)',
          shadowBlur: 10,
          shadowOffsetY: 3
        },
        itemStyle: {
          color: '#ffffff',
          borderWidth: 3,
          borderColor: '#52c41a',
          shadowColor: 'rgba(82, 196, 26, 0.4)',
          shadowBlur: 8
        },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(82, 196, 26, 0.4)' },
              { offset: 1, color: 'rgba(82, 196, 26, 0.1)' }
            ]
          }
        },
        symbol: 'circle',
        symbolSize: 18,
        showSymbol: true,
        emphasis: {
          focus: 'series',
          lineStyle: {
            width: 6
          },
          itemStyle: {
            color: '#ffffff',
            borderWidth: 4,
            borderColor: '#52c41a',
            shadowBlur: 15,
            shadowColor: 'rgba(82, 196, 26, 0.6)'
          }
        },
        data: processedTrendData.map(item => item.internalCost || 0)
      }
    ]
  }

  const option = {
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'cross',
        label: {
          backgroundColor: '#6a7985'
        }
      },
      formatter: function(params) {
        let result = params[0].name + '<br/>'
        params.forEach(param => {
          result += param.marker + param.seriesName + ': ¥' + param.value.toLocaleString() + '<br/>'
        })
        return result
      }
    },
    legend: {
      data: legendData,
      bottom: 10,
      left: 'center',
      orient: 'horizontal',
      // 设置图例的默认选中状态
      selected: filterForm.costType === 'all' ? {
        '外部成本': true,
        '内部成本': true,
        '总成本': false  // 默认隐藏总成本
      } : {}
    },
    toolbox: {
      feature: {
        saveAsImage: {}
      }
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '15%',
      top: '10%',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: processedTrendData.map(item => item.period)
    },
    yAxis: {
      type: 'value',
      axisLabel: {
        formatter: '¥{value}'
      }
    },
    series: seriesData
  }

  trendChart.setOption(option)
}

/**
 * 更新饼图
 * @param {Array} compositionData - 构成数据
 */
const updatePieChart = (compositionData) => {
  if (!pieChart) return
  
  // 根据成本类型筛选数据
  let chartData = []
  
  if (filterForm.costType === 'all') {
    // 显示内外部成本分类
    chartData = [
      { name: '外部成本', value: overviewData.externalCost, itemStyle: { color: '#DC3C37' } },
      { name: '内部成本', value: overviewData.internalCost, itemStyle: { color: '#FFA753' } }
    ]
  } else if (filterForm.costType === 'external') {
    // 显示外部成本详细构成
    chartData = [
      { name: '质量罚款', value: overviewData.penaltyCost, itemStyle: { color: '#DC3C37' } },
      { name: '客户赔偿', value: overviewData.compensationCost, itemStyle: { color: '#ff7875' } }
    ]
  } else if (filterForm.costType === 'internal') {
    // 显示内部成本详细构成
    chartData = [
      { name: '返工成本', value: overviewData.reworkCost, itemStyle: { color: '#FFA753' } },
      { name: '内诉成本', value: overviewData.internalComplaintCost, itemStyle: { color: '#95de64' } },
      { name: '出版异常成本', value: overviewData.publishingExceptionCost, itemStyle: { color: '#b7eb8f' } }
    ]
  }
  
  // 过滤掉值为0的项目
  chartData = chartData.filter(item => item.value > 0)
  
  const option = {
    tooltip: {
      trigger: 'item',
      formatter: '{a} <br/>{b}: ¥{c} ({d}%)'
    },
    legend: {
      orient: 'vertical',
      left: 'left',
      data: chartData.map(item => item.name)
    },
    series: [
      {
        name: '成本构成',
        type: 'pie',
        radius: ['40%', '70%'],  // 设置内外半径，形成圆环图
        center: ['50%', '50%'],  // 图表中心位置
        avoidLabelOverlap: false,
        data: chartData,
        itemStyle: {
          borderRadius: 8,        // 添加圆角样式
          borderColor: '#fff',    // 设置边框颜色为白色
          borderWidth: 8          // 设置边框宽度，形成间距效果
        },
        label: {
          show: false,  // 隐藏标签，保持简洁
          position: 'center'
        },
        emphasis: {
          label: {
            show: true,
            fontSize: '18',
            fontWeight: 'bold'
          },
          itemStyle: {
            shadowBlur: 10,
            shadowOffsetX: 0,
            shadowColor: 'rgba(0, 0, 0, 0.5)',
            borderRadius: 10,      // 悬停时增加圆角
            borderWidth: 12        // 悬停时增加边框宽度
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
  if (!customerChart || !customerData || customerData.length === 0) return

  // 根据成本类型构建系列数据
  let seriesData = []
  
  if (filterForm.costType === 'all') {
    // 显示内外部成本堆叠
    seriesData = [
      {
        name: '外部成本',
        type: 'bar',
        stack: 'total',
        data: customerData.map(item => item.external?.totalCost || 0),
        itemStyle: { 
          color: '#DC3C37',
          borderRadius: [0, 10, 10, 0]  // 右侧半圆形末端
        }
      },
      { 
         name: '内部成本',
         type: 'bar',
         stack: 'total',
         data: customerData.map(item => item.internal?.totalCost || 0),
         itemStyle: {
          color: '#FFA753',
          borderRadius: [10, 0, 0, 10]  // 左侧半圆形末端
          }
        }
    ]
  } else {
    // 显示单一类型成本
    seriesData = [
      {
        name: filterForm.costType === 'external' ? '外部成本' : '内部成本',
        type: 'bar',
        data: customerData.map(item => item.totalCost || 0),
        itemStyle: {
          color: filterForm.costType === 'external' ? 
            new echarts.graphic.LinearGradient(0, 0, 1, 0, [
              {offset: 0, color: '#FF6B6B'},
              {offset: 1, color: '#DC3C37'}
            ]) :
            new echarts.graphic.LinearGradient(0, 0, 1, 0, [
              {offset: 0, color: '#FFD19A'},
              {offset: 1, color: '#FFA753'}
            ]),
          borderRadius: [0, 10, 10, 0]  // 右侧半圆形末端
        }
      }
    ]
  }

  const option = {
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'shadow'
      },
      formatter: function(params) {
        let result = params[0].name + '<br/>'
        params.forEach(param => {
          result += param.marker + param.seriesName + ': ¥' + param.value.toLocaleString() + '<br/>'
        })
        if (filterForm.costType === 'all' && params.length > 1) {
          const total = params.reduce((sum, param) => sum + param.value, 0)
          result += '总计: ¥' + total.toLocaleString()
        }
        return result
      }
    },
    legend: {
      data: seriesData.map(item => item.name),
      bottom: 10,
      left: 'center',
      orient: 'horizontal'
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '15%',
      top: '10%',
      containLabel: true
    },
    xAxis: {
      type: 'value',
      boundaryGap: [0, 0.01],
      axisLabel: {
        formatter: (value) => `¥${formatCurrency(value)}`
      }
    },
    yAxis: {
      type: 'category',
      data: customerData.map(item => item.customerName),
      axisLabel: {
        interval: 0,
        rotate: 0
      }
    },
    series: seriesData
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
  window.addEventListener('resize', handleResize)
  
  // 使用ResizeObserver监听容器尺寸变化
  if (window.ResizeObserver) {
    resizeObserver = new ResizeObserver(() => {
      // 延迟执行resize，确保DOM更新完成
      setTimeout(handleResize, 100)
    })
    
    // 监听所有图表容器
    if (trendChartRef.value) resizeObserver.observe(trendChartRef.value)
    if (pieChartRef.value) resizeObserver.observe(pieChartRef.value)
    if (customerChartRef.value) resizeObserver.observe(customerChartRef.value)
  }
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
 * 处理成本类型变化
 */
const handleCostTypeChange = () => {
  loadStatistics()
}

/**
 * 重置筛选条件
 */
const resetFilter = () => {
  filterForm.dateRange = []
  filterForm.dimension = 'month'
  filterForm.customerId = null
  filterForm.costType = 'all'
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
      costType: filterForm.costType,
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
  // 设置默认日期范围（从当前年份1月1号到当前日期）
  const endDate = new Date()
  const startDate = new Date()
  startDate.setFullYear(startDate.getFullYear(), 0, 1) // 设置为当前年份的1月1号
  startDate.setHours(0, 0, 0, 0) // 设置为0点0分0秒
  
  // 使用本地时间格式化，避免时区问题
  const formatDate = (date) => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }
  
  filterForm.dateRange = [
    formatDate(startDate),
    formatDate(endDate)
  ]

  await loadCustomerOptions()
  await nextTick()
  initCharts()
  await loadStatistics()
})

// 组件卸载时清理
onUnmounted(() => {
  // 清理窗口resize监听器
  window.removeEventListener('resize', handleResize)
  
  // 清理ResizeObserver
  if (resizeObserver) {
    resizeObserver.disconnect()
    resizeObserver = null
  }
  
  // 销毁图表实例
  trendChart?.dispose()
  pieChart?.dispose()
  customerChart?.dispose()
})
</script>

<style scoped>
.cost-statistics-container {
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
  /* 西文数字字体样式 - 与后台主页数据概览保持一致 */
  font-family: 'Bahnschrift';
  font-variant-numeric: tabular-nums lining-nums;
  letter-spacing: -0.02em;
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
  color: #DC3C37;
}

.trend-down {
  color: #67c23a;
}

.card-ratio {
  font-size: 12px;
  color: #909399;
}

.cost-breakdown {
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px solid #f0f0f0;
}

.breakdown-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
  font-size: 12px;
}

.breakdown-label {
  color: #909399;
  font-weight: 500;
}

/* el-tag标签样式调整 */
.breakdown-item .el-tag.breakdown-label {
  margin-right: 8px;
  font-size: 11px;
  font-weight: 600;
  border: none;
}

.breakdown-value {
  color: #303133;
  font-weight: 600;
}

.breakdown-item.external .breakdown-value {
  color: #DC3C37;
}

.breakdown-item.internal .breakdown-value {
  color: #FFA753;
}

.internal-cards {
  margin-top: 20px;
}

.internal-complaint .card-icon {
  background: linear-gradient(135deg, #a8edea 0%, #fed6e3 100%);
  color: white;
}

.publishing-exception .card-icon {
  background: linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%);
  color: white;
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
  color: #DC3C37;
}

.pagination-section {
  display: flex;
  justify-content: center;
  margin-top: 20px;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .cost-statistics-container {
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