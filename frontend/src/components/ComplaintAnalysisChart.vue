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
              style="width: 140px"
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
              style="width: 140px"
            >
              <el-option label="近2个月" value="2months" />
              <el-option label="近3个月" value="3months" />
              <el-option label="近4个月" value="4months" />
              <el-option label="近5个月" value="5months" />
              <el-option label="近6个月" value="6months" />
              <el-option label="近1年" value="1year" />
              <el-option label="近2年" value="2years" />
            </el-select>

            <!-- 投诉类型筛选 -->
            <el-select
              v-model="selectedComplaintType"
              @change="loadData"
              style="width: 120px"
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
        <div class="summary-card total-card">
          <div class="card-left">
            <div class="card-icon total">
              <el-icon><DataBoard /></el-icon>
            </div>
          </div>
          <div class="card-right">
            <div class="card-title">总投诉数</div>
            <div class="card-value total-value">{{ summaryData.totalComplaints || 0 }}</div>
            <div class="card-subtitle">本期统计</div>
          </div>
        </div>

        <div class="summary-card inner-card">
          <div class="card-left">
            <div class="card-icon inner">
              <el-icon><Warning /></el-icon>
            </div>
          </div>
          <div class="card-right">
            <div class="card-title">内诉数量</div>
            <div class="card-value inner-value">{{ summaryData.innerComplaints || 0 }}</div>
            <div class="card-subtitle">内部投诉</div>
          </div>
        </div>

        <div class="summary-card outer-card">
          <div class="card-left">
            <div class="card-icon outer">
              <el-icon><CircleClose /></el-icon>
            </div>
          </div>
          <div class="card-right">
            <div class="card-title">客诉数量</div>
            <div class="card-value outer-value">{{ summaryData.outerComplaints || 0 }}</div>
            <div class="card-subtitle">客户投诉</div>
          </div>
        </div>

        <div class="summary-card rate-card">
          <div class="card-left">
            <div class="card-icon rate">
              <el-icon><DataAnalysis /></el-icon>
            </div>
          </div>
          <div class="card-right">
            <div class="card-title">一次交检合格率</div>
            <div class="card-value rate-value">{{ summaryData.firstPassRate || 0 }}%</div>
            <div class="card-subtitle">质量指标</div>
          </div>
        </div>

        <div class="summary-card customer-rate-card">
          <div class="card-left">
            <div class="card-icon customer-rate">
              <el-icon><Warning /></el-icon>
            </div>
          </div>
          <div class="card-right">
            <div class="card-title">客诉率</div>
            <div class="card-value customer-rate-value">{{ summaryData.customerComplaintRate || 0 }}%</div>
            <div class="card-subtitle">客诉指标</div>
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
      width="85%"
      top="3vh"
      :close-on-click-modal="false"
      :modal="true"
      :append-to-body="true"
      :lock-scroll="false"
      center
      class="complaint-detail-dialog enhanced-dialog"
    >
      <!-- 自定义标题 -->
      <template #header="{ close, titleId, titleClass }">
        <div class="enhanced-dialog-header">
          <div class="header-left">
            <div class="header-icon-wrapper">
              <el-icon class="header-icon" size="22">
                <Document />
              </el-icon>
            </div>
            <div class="header-text">
              <span :id="titleId" :class="titleClass" class="dialog-title">
                {{ detailDialogTitle }}
              </span>
              <span class="dialog-subtitle">共 {{ detailDialogData.length }} 条记录</span>
            </div>
          </div>
          <div class="header-right">
            <el-button
              type="text"
              @click="close"
              class="close-btn"
              size="large"
            >
              <el-icon size="18"><Close /></el-icon>
            </el-button>
          </div>
        </div>
      </template>

      <div class="enhanced-dialog-content">
        <el-table
          :data="detailDialogData"
          stripe
          border
          height="58vh"
          style="width: 100%"
          class="enhanced-detail-table"
          header-cell-class-name="enhanced-table-header"
          cell-class-name="enhanced-table-cell"
          :row-class-name="getRowClassName"
        >
          <el-table-column prop="ID" label="ID" width="70" align="center" fixed="left">
            <template #default="scope">
              <span class="id-badge">{{ scope.row.ID }}</span>
            </template>
          </el-table-column>
          <el-table-column prop="Date" label="投诉日期" width="100" align="center">
            <template #default="scope">
              <div class="date-cell">
                <el-icon class="date-icon" size="14"><Calendar /></el-icon>
                <span class="date-text">
                  {{ scope.row.Date ? new Date(scope.row.Date).toLocaleDateString('zh-CN', { year: '2-digit', month: '2-digit', day: '2-digit' }) : '' }}
                </span>
              </div>
            </template>
          </el-table-column>
          <el-table-column prop="Customer" label="客户代码" width="100" align="center" show-overflow-tooltip>
            <template #default="scope">
              <span class="customer-code">{{ scope.row.Customer }}</span>
            </template>
          </el-table-column>
          <el-table-column prop="OrderNo" label="工单号" width="130" align="center">
            <template #default="scope">
              <span class="order-no">{{ scope.row.OrderNo }}</span>
            </template>
          </el-table-column>
          <el-table-column prop="ProductName" label="产品名称" width="140" show-overflow-tooltip>
            <template #default="scope">
              <span class="product-name">{{ scope.row.ProductName }}</span>
            </template>
          </el-table-column>
          <el-table-column prop="ComplaintCategory" label="投诉类别" width="90" align="center">
            <template #default="scope">
              <el-tag
                size="small"
                :type="scope.row.ComplaintCategory === '客诉' ? 'danger' : 'primary'"
                class="category-tag"
              >
                {{ scope.row.ComplaintCategory }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="DefectiveCategory" label="不良类别" width="100" align="center">
            <template #default="scope">
              <el-tag size="small" type="warning" class="defective-tag">
                {{ scope.row.DefectiveCategory }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="Workshop" label="责任车间" width="90" align="center">
            <template #default="scope">
              <el-tag size="small" type="info" class="workshop-tag">
                {{ scope.row.Workshop }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="DefectiveDescription" label="不良描述" min-width="180" show-overflow-tooltip>
            <template #default="scope">
              <span class="description-text">{{ scope.row.DefectiveDescription }}</span>
            </template>
          </el-table-column>
          <el-table-column prop="DefectiveQty" label="不良数量" width="90" align="center">
            <template #default="scope">
              <span class="quantity-badge">{{ scope.row.DefectiveQty }}</span>
            </template>
          </el-table-column>
          <el-table-column prop="DefectiveRate" label="不良率" width="80" align="center">
            <template #default="scope">
              <span class="rate-badge" :class="getRateClass(scope.row.DefectiveRate)">
                {{ scope.row.DefectiveRate ? scope.row.DefectiveRate + '%' : '' }}
              </span>
            </template>
          </el-table-column>
          <el-table-column prop="MainDept" label="主责部门" width="100" align="center">
            <template #default="scope">
              <el-tag size="small" type="success" class="dept-tag">
                {{ scope.row.MainDept }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="MainPerson" label="主责人" width="90" align="center">
            <template #default="scope">
              <span class="person-name">{{ scope.row.MainPerson }}</span>
            </template>
          </el-table-column>
        </el-table>
      </div>

      <template #footer>
        <div class="enhanced-dialog-footer">
          <div class="footer-left">
            <el-text type="info" size="small" class="footer-tip">
              <el-icon><InfoFilled /></el-icon>
              双击表格行可查看更多详细信息
            </el-text>
          </div>
          <div class="footer-right">
            <el-button @click="detailDialogVisible = false" size="default" class="footer-btn">
              <el-icon><Close /></el-icon>
              关闭
            </el-button>
            <el-button type="primary" @click="exportDetailData" size="default" class="footer-btn primary-btn">
              <el-icon><Download /></el-icon>
              导出数据
            </el-button>
          </div>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted, nextTick, computed } from 'vue'
import { ElMessage } from 'element-plus'
import {
  Refresh, DataAnalysis, Grid, Warning, CircleClose, DataBoard, Download,
  Document, Close, Calendar, InfoFilled
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

// 饼图基础配置
const getPieBaseChartOption = () => ({
  tooltip: {
    trigger: 'item',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderColor: '#E4E7ED',
    borderWidth: 1,
    textStyle: { color: '#606266' },
    formatter: '{b}: {c} ({d}%)'
  },
  legend: {
    bottom: 10,
    left: 'center',
    textStyle: { fontSize: 12, color: '#606266' },
    itemGap: 20
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
    console.log('时间钻取参数:', row)
    // 使用现有的投诉列表API进行数据钻取
    const response = await axios.get('/api/complaint/list', {
      params: {
        page: 1,
        pageSize: 50,
        period: row.period,
        complaintCategory: selectedComplaintType.value === '内诉' ? '内诉' : selectedComplaintType.value === '客诉' ? '客诉' : '',
        timeRange: selectedTimeRange.value
      }
    })

    console.log('时间钻取响应:', response.data)
    if (response.data.success) {
      // 显示详细数据对话框
      const records = response.data.data?.records || response.data.data || []
      showDetailDialog(`${row.period} 时间段详细数据`, records)
    } else {
      ElMessage.error(response.data.message || '获取详细数据失败')
    }
  } catch (error) {
    console.error('获取时间详细数据失败:', error)
    ElMessage.error('获取时间详细数据失败')
  }
}

const drillDownToWorkshopDetail = async (row) => {
  try {
    console.log('车间钻取参数:', row)
    // 使用现有的投诉列表API进行数据钻取
    const response = await axios.get('/api/complaint/list', {
      params: {
        page: 1,
        pageSize: 50,
        workshop: row.workshop,
        timeRange: selectedTimeRange.value,
        complaintCategory: selectedComplaintType.value === '内诉' ? '内诉' : selectedComplaintType.value === '客诉' ? '客诉' : ''
      }
    })

    console.log('车间钻取响应:', response.data)
    if (response.data.success) {
      const records = response.data.data?.records || response.data.data || []
      showDetailDialog(`${row.workshop} 车间详细数据`, records)
    } else {
      ElMessage.error(response.data.message || '获取详细数据失败')
    }
  } catch (error) {
    console.error('获取车间详细数据失败:', error)
    ElMessage.error('获取车间详细数据失败')
  }
}

const drillDownToCategoryDetail = async (row) => {
  try {
    console.log('类别钻取参数:', row)
    // 使用现有的投诉列表API进行数据钻取
    const response = await axios.get('/api/complaint/list', {
      params: {
        page: 1,
        pageSize: 50,
        defectiveCategory: row.category,
        timeRange: selectedTimeRange.value,
        complaintCategory: selectedComplaintType.value === '内诉' ? '内诉' : selectedComplaintType.value === '客诉' ? '客诉' : ''
      }
    })

    console.log('类别钻取响应:', response.data)
    if (response.data.success) {
      const records = response.data.data?.records || response.data.data || []
      showDetailDialog(`${row.category} 类别详细数据`, records)
    } else {
      ElMessage.error(response.data.message || '获取详细数据失败')
    }
  } catch (error) {
    console.error('获取类别详细数据失败:', error)
    ElMessage.error('获取类别详细数据失败')
  }
}

const drillDownToCustomerDetail = async (row) => {
  try {
    console.log('客户钻取参数:', row)
    // 使用现有的投诉列表API进行数据钻取
    const response = await axios.get('/api/complaint/list', {
      params: {
        page: 1,
        pageSize: 50,
        customer: row.customer,
        timeRange: selectedTimeRange.value,
        complaintCategory: selectedComplaintType.value === '内诉' ? '内诉' : selectedComplaintType.value === '客诉' ? '客诉' : ''
      }
    })

    console.log('客户钻取响应:', response.data)
    if (response.data.success) {
      const records = response.data.data?.records || response.data.data || []
      showDetailDialog(`${row.customer} 客户详细数据`, records)
    } else {
      ElMessage.error(response.data.message || '获取详细数据失败')
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

// 表格行样式
const getRowClassName = ({ row, rowIndex }) => {
  if (row.ComplaintCategory === '客诉') {
    return 'customer-complaint-row'
  } else if (row.ComplaintCategory === '内诉') {
    return 'internal-complaint-row'
  }
  return ''
}

// 不良率样式
const getRateClass = (rate) => {
  if (!rate) return ''
  const numRate = parseFloat(rate)
  if (numRate >= 5) return 'rate-high'
  if (numRate >= 2) return 'rate-medium'
  return 'rate-low'
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
  const baseOption = getPieBaseChartOption()
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
        color: '#409EFF',
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
  if (chartRef.value && chartRef.value.offsetWidth > 0 && chartRef.value.offsetHeight > 0) {
    try {
      // 如果已经存在实例，先销毁
      if (chartInstance.value) {
        chartInstance.value.dispose()
      }

      chartInstance.value = echarts.init(chartRef.value)

      // 监听窗口大小变化 - 添加防抖优化
      let resizeTimer = null
      const handleResize = () => {
        if (resizeTimer) {
          clearTimeout(resizeTimer)
        }
        resizeTimer = setTimeout(() => {
          if (chartInstance.value) {
            console.log('窗口大小变化，重新调整图表尺寸')
            chartInstance.value.resize()
          }
        }, 100) // 100ms防抖
      }

      window.addEventListener('resize', handleResize)

      // 组件卸载时清理事件监听
      const cleanup = () => {
        window.removeEventListener('resize', handleResize)
        if (resizeTimer) {
          clearTimeout(resizeTimer)
        }
      }

      // 在组件卸载时清理
      window.addEventListener('beforeunload', cleanup)
    } catch (error) {
      console.error('图表初始化失败:', error)
    }
  } else {
    console.warn('图表容器DOM未准备好，延迟初始化')
    setTimeout(() => {
      initChart()
    }, 100)
  }
}

// 组件挂载
onMounted(async () => {
  try {
    await nextTick()
    // 延迟初始化，确保DOM完全渲染
    setTimeout(async () => {
      initChart()
      await loadData()
    }, 200)
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
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 20px;
  margin-bottom: 24px;
  padding: 0;
}

.summary-card {
  display: flex;
  align-items: center;
  padding: 20px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  border: 1px solid #f0f0f0;
  transition: all 0.3s ease;
  cursor: pointer;
  position: relative;
  overflow: hidden;
}

.summary-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: linear-gradient(90deg, #409EFF, #67C23A);
  transform: scaleX(0);
  transition: transform 0.3s ease;
}

.summary-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
}

.summary-card:hover::before {
  transform: scaleX(1);
}

.card-left {
  margin-right: 16px;
}

.card-icon {
  width: 56px;
  height: 56px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  transition: all 0.3s ease;
}

/* Element Plus 经典配色 */
.card-icon.total {
  background: linear-gradient(135deg, #409EFF20, #409EFF10);
  color: #409EFF;
  border: 2px solid #409EFF20;
}
.card-icon.inner {
  background: linear-gradient(135deg, #E6A23C20, #E6A23C10);
  color: #E6A23C;
  border: 2px solid #E6A23C20;
}
.card-icon.outer {
  background: linear-gradient(135deg, #F56C6C20, #F56C6C10);
  color: #F56C6C;
  border: 2px solid #F56C6C20;
}
.card-icon.rate {
  background: linear-gradient(135deg, #67C23A20, #67C23A10);
  color: #67C23A;
  border: 2px solid #67C23A20;
}
.card-icon.customer-rate {
  background: linear-gradient(135deg, #909399, #909399);
  color: #909399;
  border: 2px solid #90939920;
}

.summary-card:hover .card-icon {
  transform: scale(1.1);
}

.card-right {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.card-title {
  font-size: 13px;
  color: #909399;
  font-weight: 500;
  margin-bottom: 2px;
}

.card-value {
  font-size: 28px;
  font-weight: 700;
  margin-bottom: 2px;
  transition: all 0.3s ease;
}

.card-subtitle {
  font-size: 11px;
  color: #C0C4CC;
  font-weight: 400;
}

/* 不同卡片的数值颜色 */
.total-value { color: #409EFF; }
.inner-value { color: #E6A23C; }
.outer-value { color: #F56C6C; }
.rate-value { color: #67C23A; }
.customer-rate-value { color: #909399; }

/* 卡片入场动画 */
@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.summary-card {
  animation: fadeInUp 0.6s ease-out;
}

.summary-card:nth-child(1) { animation-delay: 0.1s; }
.summary-card:nth-child(2) { animation-delay: 0.2s; }
.summary-card:nth-child(3) { animation-delay: 0.3s; }
.summary-card:nth-child(4) { animation-delay: 0.4s; }
.summary-card:nth-child(5) { animation-delay: 0.5s; }

/* 数值动画效果 */
@keyframes countUp {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

.card-value {
  animation: countUp 0.8s ease-out;
  animation-delay: 0.3s;
  animation-fill-mode: both;
}

/* 图标脉冲动画 */
@keyframes pulse {
  0% { transform: scale(1); }
  50% { transform: scale(1.05); }
  100% { transform: scale(1); }
}

.summary-card:hover .card-icon {
  animation: pulse 1s ease-in-out infinite;
}

/* 图表和表格并排布局 */
.chart-and-table-container {
  display: flex;
  gap: 20px;
  margin: 20px 0;
  width: 100%;
  box-sizing: border-box;
}

.chart-container {
  flex: 0 0 50%; /* 固定占50%宽度 */
  width: 50%;
  min-width: 0; /* 防止内容溢出 */
  padding: 20px;
  background: linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%);
  border-radius: 8px;
  border: 1px solid #e9ecef;
  box-sizing: border-box;
}

.data-table {
  flex: 0 0 50%; /* 固定占50%宽度 */
  width: 50%;
  min-width: 0; /* 防止内容溢出 */
  padding: 20px;
  background: white;
  border-radius: 8px;
  border: 1px solid #e9ecef;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  box-sizing: border-box;
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

/* 响应式设计 - 动态布局 */
/* 超小屏幕 - 强制垂直布局 */
@media (max-width: 768px) {
  .chart-and-table-container {
    flex-direction: column;
    gap: 12px;
  }

  .chart-container,
  .data-table {
    flex: none;
    width: 100%;
    max-width: 100%;
    padding: 12px;
  }

  .chart {
    height: 300px !important;
  }
}

/* 小屏幕 - 根据内容动态决定布局 */
@media (min-width: 769px) and (max-width: 1024px) {
  .chart-and-table-container {
    flex-wrap: wrap;
    gap: 16px;
  }

  .chart-container,
  .data-table {
    flex: 1 1 calc(50% - 8px);
    min-width: 400px; /* 最小宽度，如果不够则换行 */
    padding: 16px;
  }

  .chart {
    height: 350px !important;
  }
}

/* 中等屏幕 - 优先保持一排，空间不足时换行 */
@media (min-width: 1025px) and (max-width: 1200px) {
  .chart-and-table-container {
    flex-wrap: wrap;
    gap: 18px;
  }

  .chart-container,
  .data-table {
    flex: 1 1 calc(50% - 9px);
    min-width: 450px; /* 最小宽度，如果不够则换行 */
    padding: 18px;
  }
}

/* 大屏幕 - 固定50%布局 */
@media (min-width: 1201px) and (max-width: 1600px) {
  .chart-and-table-container {
    gap: 20px;
    flex-wrap: nowrap; /* 强制一排显示 */
  }

  .chart-container,
  .data-table {
    flex: 0 0 calc(50% - 10px);
    width: calc(50% - 10px);
    padding: 20px;
  }
}

/* 超大屏幕 - 固定50%布局，增加间距 */
@media (min-width: 1601px) {
  .chart-and-table-container {
    gap: 24px;
    flex-wrap: nowrap; /* 强制一排显示 */
  }

  .chart-container,
  .data-table {
    flex: 0 0 calc(50% - 12px);
    width: calc(50% - 12px);
    padding: 24px;
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

/* 投诉详细数据对话框样式 */
.complaint-detail-dialog :deep(.el-dialog) {
  height: 85vh !important;
  max-height: 85vh !important;
  display: flex !important;
  flex-direction: column !important;
  margin: 0 auto !important;
  top: 5vh !important;
  transform: translateY(0) !important;
}

.complaint-detail-dialog :deep(.el-dialog__header) {
  flex-shrink: 0 !important;
  padding: 24px 24px 16px 24px !important;
  border-bottom: 1px solid #e5e7eb !important;
  background: linear-gradient(135deg, #f9fafb 0%, #ffffff 100%) !important;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1) !important;
}

.complaint-detail-dialog :deep(.el-dialog__title) {
  font-size: 18px !important;
  font-weight: 600 !important;
  color: #111827 !important;
  letter-spacing: 0.025em !important;
  position: relative !important;
  padding-left: 32px !important;
  line-height: 1.5 !important;
}

.complaint-detail-dialog :deep(.el-dialog__title::before) {
  content: '📊' !important;
  font-size: 18px !important;
  position: absolute !important;
  left: 0 !important;
  top: 50% !important;
  transform: translateY(-50%) !important;
  filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.1)) !important;
}

.complaint-detail-dialog :deep(.el-dialog__body) {
  flex: 1 !important;
  padding: 24px !important;
  overflow: hidden !important;
  display: flex !important;
  flex-direction: column !important;
  min-height: 0 !important;
}

.complaint-detail-dialog :deep(.el-dialog__footer) {
  flex-shrink: 0 !important;
  padding: 16px 24px 24px 24px !important;
  border-top: 1px solid #e5e7eb !important;
  background: #f9fafb !important;
}

.complaint-detail-dialog :deep(.el-table) {
  flex: 1 !important;
  height: 100% !important;
}

/* 增强对话框样式 */
.enhanced-dialog :deep(.el-dialog) {
  border-radius: 12px !important;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25) !important;
  overflow: hidden !important;
}

.enhanced-dialog-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border-radius: 12px 12px 0 0;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.header-icon-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 10px;
  backdrop-filter: blur(10px);
}

.header-icon {
  color: white !important;
}

.header-text {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.dialog-title {
  font-size: 18px !important;
  font-weight: 600 !important;
  color: white !important;
  margin: 0 !important;
}

.dialog-subtitle {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.8);
  font-weight: 400;
}

.header-right .close-btn {
  background: rgba(255, 255, 255, 0.1) !important;
  border: 1px solid rgba(255, 255, 255, 0.2) !important;
  color: white !important;
  border-radius: 8px !important;
  width: 36px !important;
  height: 36px !important;
  padding: 0 !important;
  transition: all 0.3s ease !important;
}

.header-right .close-btn:hover {
  background: rgba(255, 255, 255, 0.2) !important;
  transform: scale(1.05);
}

.enhanced-dialog-content {
  padding: 24px;
  background: #fafbfc;
}

.enhanced-detail-table {
  border-radius: 8px !important;
  overflow: hidden !important;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1) !important;
}

.enhanced-detail-table :deep(.enhanced-table-header) {
  background: #fafafa !important;
  color: #606266 !important;
  font-weight: 600 !important;
  font-size: 13px !important;
  border-bottom: 1px solid #ebeef5 !important;
}

.enhanced-detail-table :deep(.enhanced-table-cell) {
  padding: 12px 8px !important;
  border-bottom: 1px solid #f1f5f9 !important;
}

.enhanced-detail-table :deep(.customer-complaint-row) {
  background: rgba(254, 226, 226, 0.5) !important;
}

.enhanced-detail-table :deep(.internal-complaint-row) {
  background: rgba(219, 234, 254, 0.5) !important;
}

.id-badge {
  display: inline-block;
  padding: 4px 8px;
  background: linear-gradient(135deg, #3b82f6, #1d4ed8);
  color: white;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 600;
  min-width: 36px;
  text-align: center;
  white-space: nowrap;
}

.date-cell {
  display: flex;
  align-items: center;
  gap: 6px;
  justify-content: center;
}

.date-icon {
  color: #6b7280;
}

.date-text {
  font-size: 13px;
  color: #374151;
  font-weight: 500;
}

.customer-code {
  font-family: 'Courier New', monospace;
  font-size: 12px;
  font-weight: 600;
  color: #1f2937;
  background: #f3f4f6;
  padding: 4px 8px;
  border-radius: 4px;
}

.order-no {
  font-family: 'Courier New', monospace;
  font-size: 12px;
  font-weight: 600;
  color: #059669;
  background: #ecfdf5;
  padding: 4px 8px;
  border-radius: 4px;
}

.product-name {
  font-size: 13px;
  color: #374151;
  line-height: 1.4;
}

.category-tag, .defective-tag, .workshop-tag, .dept-tag {
  font-weight: 500 !important;
  border-radius: 6px !important;
}

.description-text {
  font-size: 13px;
  color: #4b5563;
  line-height: 1.4;
}

.quantity-badge {
  display: inline-block;
  padding: 4px 10px;
  background: #e0f2fe;
  color: #0f4c75;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 600;
}

.rate-badge {
  display: inline-block;
  padding: 4px 8px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 600;
}

.rate-low {
  background: #d1fae5;
  color: #065f46;
}

.rate-medium {
  background: #fef3c7;
  color: #92400e;
}

.rate-high {
  background: #fee2e2;
  color: #991b1b;
}

.person-name {
  font-size: 13px;
  color: #374151;
  font-weight: 500;
}

.enhanced-dialog-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  background: #f8fafc;
  border-top: 1px solid #e2e8f0;
}

.footer-left .footer-tip {
  display: flex;
  align-items: center;
  gap: 6px;
  color: #6b7280 !important;
  font-size: 13px !important;
}

.footer-right {
  display: flex;
  gap: 12px;
}

.footer-btn {
  border-radius: 8px !important;
  font-weight: 500 !important;
  padding: 10px 20px !important;
  transition: all 0.3s ease !important;
}

.footer-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.primary-btn {
  background: linear-gradient(135deg, #3b82f6, #1d4ed8) !important;
  border: none !important;
}

.primary-btn:hover {
  background: linear-gradient(135deg, #2563eb, #1e40af) !important;
}
</style>
