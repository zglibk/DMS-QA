<template>
  <div class="quality-metrics-chart">
    <el-card class="chart-card">
      <template #header>
        <div class="card-header">
          <span class="card-title">
            <el-icon><DataAnalysis /></el-icon>
            质量指标趋势分析
          </span>
          <div class="header-controls">
            <el-select 
              v-model="selectedYear" 
              @change="loadData"
              size="small"
              style="width: 120px"
            >
              <el-option
                v-for="year in availableYears"
                :key="year"
                :label="`${year}年`"
                :value="year"
              />
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
      
      <!-- 指标卡片 -->
      <div class="metrics-summary" v-if="summaryData">
        <div class="metric-card">
          <div class="metric-value">{{ summaryData.YearlyFirstPassRate }}%</div>
          <div class="metric-label">年度一次交检合格率</div>
        </div>
        <div class="metric-card">
          <div class="metric-value">{{ summaryData.YearlyDeliveryPassRate }}%</div>
          <div class="metric-label">年度交货批次合格率</div>
        </div>
        <div class="metric-card">
          <div class="metric-value">{{ summaryData.TotalInspectionBatches }}</div>
          <div class="metric-label">年度交检批次</div>
        </div>
        <div class="metric-card">
          <div class="metric-value">{{ summaryData.TotalDeliveryBatches }}</div>
          <div class="metric-label">年度发货批次</div>
        </div>
      </div>
      
      <!-- 图表和数据表格并排显示 -->
      <div class="chart-and-table-container">
        <!-- 左侧图表容器 -->
        <div class="chart-container">
          <h4 class="section-title">
            <el-icon><DataAnalysis /></el-icon>
            质量指标趋势分析
          </h4>
          <div ref="chartRef" class="chart" style="height: 450px;"></div>
        </div>

        <!-- 右侧数据表格 -->
        <div class="data-table" v-if="showTable">
          <h4 class="section-title">
            <el-icon><Grid /></el-icon>
            数据清单
          </h4>
          <el-table
            :data="chartData"
            size="small"
            stripe
            border
            height="450"
          >
            <el-table-column prop="MonthLabel" label="月份" width="90" align="center" />
            <el-table-column prop="InspectionBatches" label="交检批次" width="85" align="center" />
            <el-table-column prop="InternalComplaints" label="内诉批次" width="85" align="center" />
            <el-table-column prop="FirstPassRate" label="一次交检合格率" width="130" align="center">
              <template #default="{ row }">
                <span :class="getFirstPassRateClass(row.FirstPassRate)">
                  {{ row.FirstPassRate }}%
                </span>
              </template>
            </el-table-column>
            <el-table-column prop="DeliveryBatches" label="发货批次" width="85" align="center" />
            <el-table-column prop="CustomerComplaints" label="客诉批次" width="85" align="center" />
            <el-table-column prop="DeliveryPassRate" label="交货批次合格率" width="130" align="center">
              <template #default="{ row }">
                <span :class="getDeliveryPassRateClass(row.DeliveryPassRate)">
                  {{ row.DeliveryPassRate }}%
                </span>
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
      </div>
    </el-card>
  </div>
</template>

<script setup>
import { ref, onMounted, nextTick } from 'vue'
import { ElMessage } from 'element-plus'
import { Refresh, DataAnalysis, Grid } from '@element-plus/icons-vue'
import * as echarts from 'echarts'
import axios from 'axios'

// 响应式数据
const chartRef = ref(null)
const chartInstance = ref(null)
const loading = ref(false)
const showTable = ref(true)
const selectedYear = ref(new Date().getFullYear())
const availableYears = ref([2023, 2024, 2025])
const chartData = ref([])
const summaryData = ref(null)

// 图表配置
const chartOption = ref({
  title: {
    text: '质量指标趋势分析',
    left: 'center',
    top: '2%',
    textStyle: {
      fontSize: 18,
      fontWeight: 'bold',
      color: '#303133'
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
    borderColor: '#E4E7ED',
    borderWidth: 1,
    textStyle: {
      color: '#606266'
    },
    formatter: function(params) {
      let result = `<div style="font-weight: bold; margin-bottom: 8px; color: #303133;">${params[0].axisValue}</div>`
      params.forEach(param => {
        const unit = param.seriesName.includes('率') ? '%' : '批次'
        const value = param.seriesName.includes('率') ?
          parseFloat(param.value).toFixed(2) : param.value
        result += `<div style="margin: 4px 0; display: flex; align-items: center;">
          <span style="display: inline-block; width: 10px; height: 10px; background: ${param.color}; margin-right: 8px; border-radius: 2px;"></span>
          <span style="flex: 1;">${param.seriesName}:</span>
          <span style="font-weight: bold; margin-left: 8px;">${value}${unit}</span>
        </div>`
      })
      return result
    }
  },
  legend: {
    data: ['交检批次', '发货批次', '一次交检合格率', '交货批次合格率'],
    bottom: 10,
    left: 'center',
    textStyle: {
      fontSize: 12,
      color: '#606266'
    },
    itemGap: 20
  },
  grid: {
    left: '5%',
    right: '12%',
    bottom: '15%',
    top: '12%',
    containLabel: true
  },
  xAxis: {
    type: 'category',
    boundaryGap: false,
    data: [],
    axisLine: {
      show: false
    },
    axisLabel: {
      fontSize: 11,
      color: '#606266',
      rotate: 0
    },
    axisTick: {
      show: false
    }
  },
  yAxis: [
    {
      type: 'value',
      name: '批次数量',
      position: 'left',
      axisLabel: {
        show: false
      },
      axisLine: {
        show: false
      },
      splitLine: {
        lineStyle: {
          color: '#F5F7FA',
          type: 'dashed'
        }
      },
      nameTextStyle: {
        color: '#909399',
        fontSize: 12
      }
    },
    {
      type: 'value',
      name: '合格率 (%)',
      position: 'right',
      axisLabel: {
        show: false
      },
      axisLine: {
        show: false
      },
      splitLine: {
        show: false
      },
      nameTextStyle: {
        color: '#909399',
        fontSize: 12
      },
      min: 98,
      max: 100
    }
  ],
  series: [
    {
      name: '交检批次',
      type: 'bar',
      yAxisIndex: 0,
      data: [],
      barWidth: '30%',
      itemStyle: {
        color: '#5470c6'
      },
      label: {
        show: true,
        position: 'top',
        fontSize: 12,
        fontWeight: 'bold',
        color: '#333'
      }
    },
    {
      name: '发货批次',
      type: 'bar',
      yAxisIndex: 0,
      data: [],
      barWidth: '30%',
      itemStyle: {
        color: '#91cc75'
      },
      label: {
        show: true,
        position: 'top',
        fontSize: 12,
        fontWeight: 'bold',
        color: '#333'
      }
    },
    {
      name: '一次交检合格率',
      type: 'line',
      yAxisIndex: 1,
      data: [],
      smooth: true,
      symbol: 'circle',
      symbolSize: 12,
      lineStyle: {
        width: 4,
        color: '#fac858'
      },
      itemStyle: {
        color: '#fff',
        borderColor: '#fac858',
        borderWidth: 3
      },
      label: {
        show: true,
        position: 'top',
        formatter: '{c}%',
        fontSize: 11,
        color: '#fac858',
        fontWeight: 'bold'
      },
      emphasis: {
        focus: 'series'
      }
    },
    {
      name: '交货批次合格率',
      type: 'line',
      yAxisIndex: 1,
      data: [],
      smooth: true,
      symbol: 'circle',
      symbolSize: 12,
      lineStyle: {
        width: 4,
        color: '#ee6666'
      },
      itemStyle: {
        color: '#fff',
        borderColor: '#ee6666',
        borderWidth: 3
      },
      label: {
        show: true,
        position: 'top',
        formatter: '{c}%',
        fontSize: 11,
        color: '#ee6666',
        fontWeight: 'bold'
      },
      emphasis: {
        focus: 'series'
      }
    }
  ]
})

// 获取一次交检合格率样式类
const getFirstPassRateClass = (rate) => {
  if (rate >= 95) return 'rate-excellent'
  if (rate >= 90) return 'rate-good'
  if (rate >= 85) return 'rate-normal'
  return 'rate-poor'
}

// 获取交货批次合格率样式类
const getDeliveryPassRateClass = (rate) => {
  if (rate >= 98) return 'rate-excellent'
  if (rate >= 95) return 'rate-good'
  if (rate >= 90) return 'rate-normal'
  return 'rate-poor'
}

// 加载数据
const loadData = async () => {
  loading.value = true
  try {
    console.log(`加载质量指标数据 - 年份: ${selectedYear.value}`)

    // 获取趋势数据
    const trendsResponse = await axios.get('/api/quality-metrics/trends', {
      params: { year: selectedYear.value }
    })

    // 获取汇总数据
    const summaryResponse = await axios.get('/api/quality-metrics/summary', {
      params: { year: selectedYear.value }
    })

    if (trendsResponse.data.success) {
      chartData.value = trendsResponse.data.data || []
      console.log('趋势数据更新成功:', chartData.value.length, '条记录')
      updateChart() // 无论有无数据都要更新图表
    } else {
      console.error('趋势数据获取失败:', trendsResponse.data.message)
      chartData.value = []
      updateChart() // 清空图表
    }

    if (summaryResponse.data.success) {
      summaryData.value = summaryResponse.data.data
      console.log('汇总数据更新成功:', summaryData.value)
    } else {
      console.error('汇总数据获取失败:', summaryResponse.data.message)
      summaryData.value = null // 清空汇总数据
    }

  } catch (error) {
    console.error('加载质量指标数据失败:', error)
    ElMessage.error('加载质量指标数据失败')
  } finally {
    loading.value = false
  }
}

// 更新图表
const updateChart = () => {
  console.log('updateChart 被调用')
  console.log('chartInstance.value:', !!chartInstance.value)
  console.log('chartData.value.length:', chartData.value.length)

  if (!chartInstance.value) {
    console.error('图表实例不存在')
    return
  }

  // 处理空数据的情况
  if (!chartData.value || !chartData.value.length) {
    console.log('图表数据为空，清空图表显示')
    const emptyOption = {
      xAxis: {
        data: []
      },
      series: [
        { data: [] },    // 交检批次
        { data: [] },    // 发货批次
        { data: [] },    // 一次交检合格率
        { data: [] }     // 交货批次合格率
      ]
    }
    chartInstance.value.setOption(emptyOption, false, true)
    console.log('图表已清空')
    return
  }

  const months = chartData.value.map(item => item.MonthLabel)
  const firstPassRates = chartData.value.map(item => item.FirstPassRate)
  const deliveryPassRates = chartData.value.map(item => item.DeliveryPassRate)
  const inspectionBatches = chartData.value.map(item => item.InspectionBatches)
  const deliveryBatches = chartData.value.map(item => item.DeliveryBatches)

  console.log('图表数据:', {
    months,
    firstPassRates,
    deliveryPassRates,
    inspectionBatches,
    deliveryBatches
  })

  // 更新图表数据
  const updateOption = {
    xAxis: {
      data: months
    },
    series: [
      { data: inspectionBatches },    // 交检批次
      { data: deliveryBatches },      // 发货批次
      { data: firstPassRates },       // 一次交检合格率
      { data: deliveryPassRates }     // 交货批次合格率
    ]
  }

  console.log('设置图表选项:', updateOption)
  chartInstance.value.setOption(updateOption, false, true) // notMerge=false, lazyUpdate=true
  console.log('图表更新完成')
}

// 刷新数据
const refreshData = () => {
  loadData()
}

// 初始化图表
const initChart = () => {
  console.log('initChart 被调用')
  console.log('chartRef.value:', !!chartRef.value)

  if (chartRef.value) {
    console.log('开始初始化图表实例')
    chartInstance.value = echarts.init(chartRef.value)
    console.log('图表实例创建成功:', !!chartInstance.value)

    chartInstance.value.setOption(chartOption.value)
    console.log('初始图表选项设置完成')

    // 监听窗口大小变化
    window.addEventListener('resize', () => {
      chartInstance.value?.resize()
    })
  } else {
    console.error('chartRef.value 不存在，无法初始化图表')
  }
}

// 组件挂载
onMounted(async () => {
  await nextTick()
  initChart()
  loadData()
})
</script>

<style scoped>
.quality-metrics-chart {
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

.metrics-summary {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
  margin-bottom: 20px;
  padding: 16px;
  background: #f8f9fa;
  border-radius: 6px;
}

.metric-card {
  text-align: center;
  padding: 12px;
  background: white;
  border-radius: 6px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.1);
}

.metric-value {
  font-size: 24px;
  font-weight: bold;
  color: #409EFF;
  margin-bottom: 4px;
}

.metric-label {
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
  flex: 0 0 700px; /* 增加固定宽度 */
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
}

/* 指标颜色样式 */
.rate-excellent {
  color: #67C23A;
  font-weight: bold;
}

.rate-good {
  color: #409EFF;
  font-weight: bold;
}

.rate-normal {
  color: #E6A23C;
  font-weight: bold;
}

.rate-poor {
  color: #F56C6C;
  font-weight: bold;
}
</style>
