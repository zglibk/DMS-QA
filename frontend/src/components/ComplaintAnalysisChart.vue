<template>
  <div class="complaint-analysis-chart">
    <el-card class="chart-card">
      <template #header>
        <div class="card-header">
          <span class="card-title">
            <el-icon><DataAnalysis /></el-icon>
            投诉数据分析
          </span>
          <div class="header-controls">
            <!-- 维度选择 -->
            <el-select 
              v-model="selectedDimension" 
              @change="handleDimensionChange"
              size="small"
              style="width: 120px"
            >
              <el-option label="时间趋势" value="time" />
              <el-option label="车间分析" value="workshop" />
              <el-option label="类别分析" value="category" />
              <el-option label="客户分析" value="customer" />
            </el-select>
            
            <!-- 时间范围选择 -->
            <el-select 
              v-model="selectedTimeRange" 
              @change="loadData"
              size="small"
              style="width: 120px"
            >
              <el-option label="近6个月" value="6months" />
              <el-option label="近1年" value="1year" />
              <el-option label="近2年" value="2years" />
            </el-select>
            
            <!-- 投诉类型筛选 -->
            <el-select 
              v-model="selectedComplaintType" 
              @change="loadData"
              size="small"
              style="width: 100px"
              clearable
              placeholder="类型"
            >
              <el-option label="全部" value="" />
              <el-option label="内诉" value="内诉" />
              <el-option label="客诉" value="客诉" />
            </el-select>
            
            <el-button 
              type="primary" 
              size="small" 
              @click="refreshData"
              :loading="loading"
            >
              <el-icon><Refresh /></el-icon>
              刷新
            </el-button>
          </div>
        </div>
      </template>
      
      <!-- 统计概览卡片 -->
      <div class="summary-cards" v-if="summaryData">
        <div class="summary-card">
          <div class="card-icon total">
            <el-icon><DataBoard /></el-icon>
          </div>
          <div class="card-content">
            <div class="card-value">{{ summaryData.totalComplaints || 0 }}</div>
            <div class="card-label">总投诉数</div>
          </div>
        </div>
        <div class="summary-card">
          <div class="card-icon inner">
            <el-icon><Warning /></el-icon>
          </div>
          <div class="card-content">
            <div class="card-value">{{ summaryData.innerComplaints || 0 }}</div>
            <div class="card-label">内诉数量</div>
          </div>
        </div>
        <div class="summary-card">
          <div class="card-icon outer">
            <el-icon><CircleClose /></el-icon>
          </div>
          <div class="card-content">
            <div class="card-value">{{ summaryData.outerComplaints || 0 }}</div>
            <div class="card-label">客诉数量</div>
          </div>
        </div>
        <div class="summary-card">
          <div class="card-icon rate">
            <el-icon><DataAnalysis /></el-icon>
          </div>
          <div class="card-content">
            <div class="card-value">{{ summaryData.firstPassRate || 0 }}%</div>
            <div class="card-label">一次交检合格率</div>
          </div>
        </div>
        <div class="summary-card">
          <div class="card-icon customer-rate">
            <el-icon><Warning /></el-icon>
          </div>
          <div class="card-content">
            <div class="card-value">{{ summaryData.customerComplaintRate || 0 }}%</div>
            <div class="card-label">客诉率</div>
          </div>
        </div>
      </div>
      
      <!-- 图表和数据表格并排显示 -->
      <div class="chart-and-table-container">
        <!-- 左侧图表容器 -->
        <div class="chart-container">
          <h4 class="section-title">
            <el-icon><DataAnalysis /></el-icon>
            {{ chartTitle }}
          </h4>
          <div ref="chartRef" class="chart" style="height: 450px;"></div>
        </div>

        <!-- 右侧数据表格 -->
        <div class="data-table" v-if="showTable">
          <h4 class="section-title">
            <el-icon><Grid /></el-icon>
            数据明细
          </h4>
          <el-table
            :data="tableData"
            size="small"
            stripe
            border
            height="450"
            @row-click="handleRowClick"
            style="cursor: pointer;"
          >
            <el-table-column 
              v-for="column in tableColumns" 
              :key="column.prop"
              :prop="column.prop" 
              :label="column.label" 
              :width="column.width"
              :align="column.align || 'center'"
            >
              <template #default="{ row }" v-if="column.formatter">
                <span v-html="column.formatter(row)"></span>
              </template>
            </el-table-column>
          </el-table>
        </div>
      </div>
      
      <!-- 底部控制 -->
      <div class="chart-footer">
        <el-button 
          type="text" 
          @click="showTable = !showTable"
          size="small"
        >
          <el-icon><Grid /></el-icon>
          {{ showTable ? '隐藏数据表' : '显示数据表' }}
        </el-button>
        
        <el-button 
          type="text" 
          @click="exportData"
          size="small"
        >
          <el-icon><Download /></el-icon>
          导出数据
        </el-button>
      </div>
    </el-card>

    <!-- 详细数据对话框 -->
    <el-dialog
      v-model="detailDialogVisible"
      :title="detailDialogTitle"
      width="80%"
      top="5vh"
      :close-on-click-modal="false"
    >
      <el-table
        :data="detailDialogData"
        stripe
        border
        height="60vh"
        style="width: 100%"
      >
        <el-table-column prop="ComplaintNo" label="投诉编号" width="120" />
        <el-table-column prop="ComplaintDate" label="投诉日期" width="100">
          <template #default="scope">
            {{ scope.row.ComplaintDate ? new Date(scope.row.ComplaintDate).toLocaleDateString() : '' }}
          </template>
        </el-table-column>
        <el-table-column prop="CustomerName" label="客户名称" width="150" />
        <el-table-column prop="WorkOrder" label="工单号" width="120" />
        <el-table-column prop="ComplaintCategory" label="投诉类别" width="80" />
        <el-table-column prop="DefectiveCategory" label="不良类别" width="100" />
        <el-table-column prop="Workshop" label="责任车间" width="100" />
        <el-table-column prop="ComplaintDescription" label="投诉描述" min-width="200" show-overflow-tooltip />
        <el-table-column prop="ProcessingStatus" label="处理状态" width="100">
          <template #default="scope">
            <el-tag :type="scope.row.ProcessingStatus === '已完成' ? 'success' : 'warning'">
              {{ scope.row.ProcessingStatus }}
            </el-tag>
          </template>
        </el-table-column>
      </el-table>

      <template #footer>
        <div class="dialog-footer">
          <el-button @click="detailDialogVisible = false">关闭</el-button>
          <el-button type="primary" @click="exportDetailData">
            <el-icon><Download /></el-icon>
            导出详细数据
          </el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted, nextTick, computed } from 'vue'
import { ElMessage } from 'element-plus'
import {
  Refresh, DataAnalysis, Grid, Warning, CircleClose, DataBoard, Download
} from '@element-plus/icons-vue'
import * as echarts from 'echarts'
import axios from 'axios'

// 响应式数据
const chartRef = ref(null)
const chartInstance = ref(null)
const loading = ref(false)
const showTable = ref(true)

// 控制参数
const selectedDimension = ref('time')
const selectedTimeRange = ref('6months')
const selectedComplaintType = ref('')

// 数据
const chartData = ref([])
const tableData = ref([])
const summaryData = ref({
  totalComplaints: 0,
  innerComplaints: 0,
  outerComplaints: 0,
  complaintRate: 0
})

// 计算属性
const chartTitle = computed(() => {
  const titles = {
    time: '投诉时间趋势分析',
    workshop: '车间投诉分布分析', 
    category: '投诉类别分布分析',
    customer: '客户投诉分析'
  }
  return titles[selectedDimension.value] || '投诉数据分析'
})

const tableColumns = computed(() => {
  const columnConfigs = {
    time: [
      { prop: 'period', label: '时间', width: 100 },
      { prop: 'totalCount', label: '总数', width: 80 },
      { prop: 'innerCount', label: '内诉', width: 80 },
      { prop: 'outerCount', label: '客诉', width: 80 },
      { prop: 'rate', label: '占比', width: 80, formatter: (row) => `${row.rate}%` }
    ],
    workshop: [
      { prop: 'workshop', label: '车间', width: 120 },
      { prop: 'totalCount', label: '总数', width: 80 },
      { prop: 'innerCount', label: '内诉', width: 80 },
      { prop: 'outerCount', label: '客诉', width: 80 },
      { prop: 'rate', label: '占比', width: 80, formatter: (row) => `${row.rate}%` }
    ],
    category: [
      { prop: 'category', label: '类别', width: 120 },
      { prop: 'count', label: '数量', width: 80 },
      { prop: 'rate', label: '占比', width: 80, formatter: (row) => `${row.rate}%` }
    ],
    customer: [
      { prop: 'customer', label: '客户', width: 150 },
      { prop: 'totalCount', label: '总数', width: 80 },
      { prop: 'innerCount', label: '内诉', width: 80 },
      { prop: 'outerCount', label: '客诉', width: 80 },
      { prop: 'rate', label: '占比', width: 80, formatter: (row) => `${row.rate}%` }
    ]
  }
  return columnConfigs[selectedDimension.value] || []
})

// 图表配置基础选项
const getBaseChartOption = () => ({
  tooltip: {
    trigger: 'axis',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderColor: '#E4E7ED',
    borderWidth: 1,
    textStyle: { color: '#606266' }
  },
  legend: {
    bottom: 10,
    left: 'center',
    textStyle: { fontSize: 12, color: '#606266' },
    itemGap: 20
  },
  grid: {
    left: '5%',
    right: '5%',
    bottom: '15%',
    top: '8%',
    containLabel: true
  }
})

// 空数据图表配置
const getEmptyChartOption = () => ({
  title: {
    text: '暂无数据',
    left: 'center',
    top: 'middle',
    textStyle: {
      color: '#909399',
      fontSize: 16
    }
  },
  xAxis: {
    type: 'category',
    data: [],
    show: false
  },
  yAxis: {
    type: 'value',
    show: false
  },
  series: []
})

// 数据加载
const loadData = async () => {
  loading.value = true
  try {
    const params = {
      dimension: selectedDimension.value,
      timeRange: selectedTimeRange.value,
      complaintType: selectedComplaintType.value
    }

    console.log('加载投诉分析数据:', params)

    const response = await axios.get('/api/complaint/analysis', { params })

    if (response.data.success) {
      chartData.value = Array.isArray(response.data.chartData) ? response.data.chartData : []
      tableData.value = Array.isArray(response.data.tableData) ? response.data.tableData : []
      summaryData.value = response.data.summaryData || {
        totalComplaints: 0,
        innerComplaints: 0,
        outerComplaints: 0,
        complaintRate: 0
      }

      console.log('投诉分析数据加载成功:', response.data)

      // 延迟更新图表，确保DOM已更新
      await nextTick()
      updateChart()
    } else {
      ElMessage.error(response.data.message || '数据加载失败')
    }
  } catch (error) {
    console.error('加载投诉分析数据失败:', error)
    ElMessage.error('数据加载失败')
  } finally {
    loading.value = false
  }
}

// 维度变化处理
const handleDimensionChange = () => {
  console.log('维度变化:', selectedDimension.value)
  loadData()
}

// 行点击处理（数据钻取）
const handleRowClick = (row) => {
  console.log('行点击事件:', row)
  // 实现数据钻取逻辑
  if (selectedDimension.value === 'time') {
    // 时间维度钻取到具体月份的详细数据
    drillDownToTimeDetail(row)
  } else if (selectedDimension.value === 'workshop') {
    // 车间维度钻取到具体车间的详细数据
    drillDownToWorkshopDetail(row)
  } else if (selectedDimension.value === 'category') {
    // 类别维度钻取到具体类别的详细数据
    drillDownToCategoryDetail(row)
  } else if (selectedDimension.value === 'customer') {
    // 客户维度钻取到具体客户的详细数据
    drillDownToCustomerDetail(row)
  }
}

// 数据钻取方法
const drillDownToTimeDetail = async (row) => {
  try {
    // 使用现有的投诉列表API进行数据钻取
    const response = await axios.get('/api/complaint/list', {
      params: {
        page: 1,
        pageSize: 50,
        period: row.period,
        complaintType: selectedComplaintType.value
      }
    })

    if (response.data.success) {
      // 显示详细数据对话框
      showDetailDialog(`${row.period} 时间段详细数据`, response.data.data.records)
    }
  } catch (error) {
    console.error('获取时间详细数据失败:', error)
    ElMessage.error('获取时间详细数据失败')
  }
}

const drillDownToWorkshopDetail = async (row) => {
  try {
    // 使用现有的投诉列表API进行数据钻取
    const response = await axios.get('/api/complaint/list', {
      params: {
        page: 1,
        pageSize: 50,
        workshop: row.workshop,
        timeRange: selectedTimeRange.value
      }
    })

    if (response.data.success) {
      showDetailDialog(`${row.workshop} 车间详细数据`, response.data.data.records)
    }
  } catch (error) {
    console.error('获取车间详细数据失败:', error)
    ElMessage.error('获取车间详细数据失败')
  }
}

const drillDownToCategoryDetail = async (row) => {
  try {
    // 使用现有的投诉列表API进行数据钻取
    const response = await axios.get('/api/complaint/list', {
      params: {
        page: 1,
        pageSize: 50,
        category: row.category,
        timeRange: selectedTimeRange.value
      }
    })

    if (response.data.success) {
      showDetailDialog(`${row.category} 类别详细数据`, response.data.data.records)
    }
  } catch (error) {
    console.error('获取类别详细数据失败:', error)
    ElMessage.error('获取类别详细数据失败')
  }
}

const drillDownToCustomerDetail = async (row) => {
  try {
    // 使用现有的投诉列表API进行数据钻取
    const response = await axios.get('/api/complaint/list', {
      params: {
        page: 1,
        pageSize: 50,
        customer: row.customer,
        timeRange: selectedTimeRange.value
      }
    })

    if (response.data.success) {
      showDetailDialog(`${row.customer} 客户详细数据`, response.data.data.records)
    }
  } catch (error) {
    console.error('获取客户详细数据失败:', error)
    ElMessage.error('获取客户详细数据失败')
  }
}

// 详细数据对话框相关
const detailDialogVisible = ref(false)
const detailDialogTitle = ref('')
const detailDialogData = ref([])

// 显示详细数据对话框
const showDetailDialog = (title, data) => {
  detailDialogTitle.value = title
  detailDialogData.value = data || []
  detailDialogVisible.value = true
  console.log(`${title}:`, data)
}

// 导出详细数据
const exportDetailData = () => {
  if (detailDialogData.value.length === 0) {
    ElMessage.warning('没有数据可导出')
    return
  }

  // 这里可以实现Excel导出功能
  ElMessage.info('导出功能开发中...')
}

// 更新图表
const updateChart = () => {
  if (!chartInstance.value) {
    return
  }

  try {
    let option = {}

    // 如果没有数据，显示空状态
    if (!chartData.value || !Array.isArray(chartData.value) || !chartData.value.length) {
      option = getEmptyChartOption()
    } else {
      switch (selectedDimension.value) {
        case 'time':
          option = getTimeChartOption()
          break
        case 'workshop':
          option = getWorkshopChartOption()
          break
        case 'category':
          option = getCategoryChartOption()
          break
        case 'customer':
          option = getCustomerChartOption()
          break
        default:
          console.warn('未知的图表维度:', selectedDimension.value)
          option = getEmptyChartOption()
      }
    }

    if (option && typeof option === 'object') {
      chartInstance.value.setOption(option, true)
    }
  } catch (error) {
    console.error('更新图表失败:', error)
    // 发生错误时显示空状态
    if (chartInstance.value) {
      chartInstance.value.setOption(getEmptyChartOption(), true)
    }
  }
}

// 时间趋势图表配置
const getTimeChartOption = () => {
  const baseOption = getBaseChartOption()
  const data = chartData.value || []
  const xData = data.map(item => item.period || '')
  const innerData = data.map(item => item.innerCount || 0)
  const outerData = data.map(item => item.outerCount || 0)

  return {
    ...baseOption,
    xAxis: {
      type: 'category',
      data: xData,
      axisLabel: { rotate: 0 }
    },
    yAxis: {
      type: 'value',
      name: '投诉数量',
      axisLabel: { show: false }
    },
    series: [
      {
        name: '内诉',
        type: 'line',
        data: innerData,
        smooth: true,
        symbol: 'circle',
        symbolSize: 8,
        lineStyle: {
          width: 3,
          shadowColor: 'rgba(245, 124, 0, 0.3)',
          shadowBlur: 10
        },
        itemStyle: {
          color: '#f57c00',
          borderWidth: 2,
          borderColor: '#fff',
          shadowColor: 'rgba(245, 124, 0, 0.5)',
          shadowBlur: 5
        },
        label: {
          show: true,
          position: 'top',
          fontSize: 12,
          fontWeight: 'bold',
          color: '#f57c00',
          backgroundColor: 'rgba(255, 255, 255, 0.8)',
          borderRadius: 4,
          padding: [2, 6]
        }
      },
      {
        name: '客诉',
        type: 'line',
        data: outerData,
        smooth: true,
        symbol: 'circle',
        symbolSize: 8,
        lineStyle: {
          width: 3,
          shadowColor: 'rgba(211, 47, 47, 0.3)',
          shadowBlur: 10
        },
        itemStyle: {
          color: '#d32f2f',
          borderWidth: 2,
          borderColor: '#fff',
          shadowColor: 'rgba(211, 47, 47, 0.5)',
          shadowBlur: 5
        },
        label: {
          show: true,
          position: 'top',
          fontSize: 12,
          fontWeight: 'bold',
          color: '#d32f2f',
          backgroundColor: 'rgba(255, 255, 255, 0.8)',
          borderRadius: 4,
          padding: [2, 6]
        }
      }
    ]
  }
}

// 车间分布图表配置
const getWorkshopChartOption = () => {
  const baseOption = getBaseChartOption()
  const data = chartData.value || []
  const xData = data.map(item => item.workshop || '')
  const innerData = data.map(item => item.innerCount || 0)
  const outerData = data.map(item => item.outerCount || 0)

  return {
    ...baseOption,
    xAxis: {
      type: 'category',
      data: xData,
      axisLabel: { rotate: 45 }
    },
    yAxis: {
      type: 'value',
      name: '投诉数量',
      axisLabel: { show: false }
    },
    series: [
      {
        name: '内诉',
        type: 'bar',
        data: innerData,
        stack: 'total',
        itemStyle: {
          color: '#f57c00',
          borderRadius: [0, 0, 4, 4],
          shadowColor: 'rgba(245, 124, 0, 0.3)',
          shadowBlur: 8
        },
        label: {
          show: true,
          position: 'inside',
          fontSize: 12,
          fontWeight: 'bold',
          color: '#fff'
        }
      },
      {
        name: '客诉',
        type: 'bar',
        data: outerData,
        stack: 'total',
        itemStyle: {
          color: '#d32f2f',
          borderRadius: [4, 4, 0, 0],
          shadowColor: 'rgba(211, 47, 47, 0.3)',
          shadowBlur: 8
        },
        label: {
          show: true,
          position: 'inside',
          fontSize: 12,
          fontWeight: 'bold',
          color: '#fff'
        }
      }
    ]
  }
}

// 类别分布图表配置（玫瑰图）
const getCategoryChartOption = () => {
  const baseOption = getBaseChartOption()
  const data = chartData.value || []
  const pieData = data.map(item => ({
    name: item.category || '',
    value: item.count || 0
  }))

  return {
    ...baseOption,
    series: [{
      name: '投诉类别',
      type: 'pie',
      radius: ['20%', '70%'],
      center: ['50%', '45%'],
      roseType: 'area',
      itemStyle: {
        borderRadius: 8,
        borderWidth: 2,
        borderColor: '#fff',
        shadowColor: 'rgba(0, 0, 0, 0.2)',
        shadowBlur: 10
      },
      data: pieData,
      label: {
        show: true,
        formatter: '{b}\n{c}\n{d}%',
        fontSize: 12,
        fontWeight: 'bold',
        color: '#333',
        backgroundColor: 'rgba(255, 255, 255, 0.8)',
        borderRadius: 4,
        padding: [4, 8],
        rich: {
          name: {
            fontSize: 12,
            fontWeight: 'bold'
          },
          value: {
            fontSize: 11,
            color: '#666'
          },
          percent: {
            fontSize: 11,
            color: '#999'
          }
        }
      },
      labelLine: {
        show: true,
        length: 15,
        length2: 10,
        lineStyle: {
          width: 2
        }
      },
      emphasis: {
        itemStyle: {
          shadowBlur: 20,
          shadowOffsetX: 0,
          shadowColor: 'rgba(0, 0, 0, 0.5)'
        },
        label: {
          fontSize: 14,
          fontWeight: 'bold'
        }
      }
    }]
  }
}

// 客户分析图表配置
const getCustomerChartOption = () => {
  const baseOption = getBaseChartOption()
  const data = chartData.value || []
  const xData = data.slice(0, 10).map(item => item.customer || '') // 只显示前10个客户
  const totalData = data.slice(0, 10).map(item => item.totalCount || 0)

  return {
    ...baseOption,
    xAxis: {
      type: 'category',
      data: xData,
      axisLabel: {
        rotate: 45,
        interval: 0,
        formatter: (value) => value.length > 8 ? value.substring(0, 8) + '...' : value
      }
    },
    yAxis: {
      type: 'value',
      name: '投诉数量',
      axisLabel: { show: false }
    },
    series: [{
      name: '投诉数量',
      type: 'bar',
      data: totalData,
      itemStyle: {
        color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
          { offset: 0, color: '#409EFF' },
          { offset: 1, color: '#79bbff' }
        ]),
        borderRadius: [4, 4, 0, 0],
        shadowColor: 'rgba(64, 158, 255, 0.3)',
        shadowBlur: 10
      },
      label: {
        show: true,
        position: 'top',
        fontSize: 12,
        fontWeight: 'bold',
        color: '#409EFF',
        backgroundColor: 'rgba(255, 255, 255, 0.8)',
        borderRadius: 4,
        padding: [2, 6]
      },
      emphasis: {
        itemStyle: {
          shadowBlur: 15,
          shadowColor: 'rgba(64, 158, 255, 0.5)'
        }
      }
    }]
  }
}

// 刷新数据
const refreshData = () => {
  loadData()
}

// 导出数据
const exportData = () => {
  if (!tableData.value.length) {
    ElMessage.warning('暂无数据可导出')
    return
  }

  // 这里可以实现数据导出功能
  console.log('导出数据:', tableData.value)
  ElMessage.info('数据导出功能开发中')
}

// 初始化图表
const initChart = () => {
  if (chartRef.value) {
    try {
      chartInstance.value = echarts.init(chartRef.value)

      // 监听窗口大小变化
      window.addEventListener('resize', () => {
        chartInstance.value?.resize()
      })
    } catch (error) {
      console.error('图表初始化失败:', error)
    }
  }
}

// 组件挂载
onMounted(async () => {
  try {
    await nextTick()
    initChart()
    await loadData()
  } catch (error) {
    console.error('组件初始化失败:', error)
  }
})
</script>

<style scoped>
.complaint-analysis-chart {
  width: 100%;
}

.chart-card {
  border-radius: 8px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.card-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 16px;
  font-weight: bold;
  color: #303133;
}

.card-title .el-icon {
  font-size: 18px;
  color: #409EFF;
}

.header-controls {
  display: flex;
  gap: 10px;
  align-items: center;
}

/* 统计概览卡片样式 */
.summary-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 16px;
  margin-bottom: 20px;
  padding: 16px;
  background: #f8f9fa;
  border-radius: 6px;
}

.summary-card {
  display: flex;
  align-items: center;
  padding: 16px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  gap: 12px;
}

.card-icon {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
}

.card-icon.total { background: #e3f2fd; color: #1976d2; }
.card-icon.inner { background: #fff3e0; color: #f57c00; }
.card-icon.outer { background: #ffebee; color: #d32f2f; }
.card-icon.rate { background: #e8f5e8; color: #388e3c; }
.card-icon.customer-rate { background: #fce4ec; color: #c2185b; }

.card-content {
  flex: 1;
}

.card-value {
  font-size: 24px;
  font-weight: bold;
  color: #303133;
  margin-bottom: 4px;
}

.card-label {
  font-size: 12px;
  color: #666;
}

/* 图表和表格并排布局 */
.chart-and-table-container {
  display: flex;
  gap: 20px;
  margin: 20px 0;
}

.chart-container {
  flex: 1;
  padding: 20px;
  background: linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%);
  border-radius: 8px;
  border: 1px solid #e9ecef;
}

.data-table {
  flex: 0 0 700px;
  padding: 20px;
  background: white;
  border-radius: 8px;
  border: 1px solid #e9ecef;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.section-title {
  margin: 0 0 16px 0;
  color: #303133;
  font-size: 16px;
  font-weight: 600;
  border-bottom: 2px solid #409EFF;
  padding-bottom: 8px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.section-title .el-icon {
  font-size: 18px;
  color: #409EFF;
}

/* 响应式设计 */
@media (max-width: 1200px) {
  .chart-and-table-container {
    flex-direction: column;
  }

  .data-table {
    flex: none;
  }
}

.chart-footer {
  text-align: center;
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid #ebeef5;
  display: flex;
  justify-content: center;
  gap: 20px;
}
</style>
