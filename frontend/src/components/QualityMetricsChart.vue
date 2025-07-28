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
      
      <!-- 统计概览卡片 -->
      <div class="summary-cards" v-if="summaryData">
        <div class="summary-card first-pass-card">
          <div class="card-left">
            <div class="card-icon first-pass">
              <el-icon><DataAnalysis /></el-icon>
            </div>
          </div>
          <div class="card-right">
            <div class="card-title">年度一次交检合格率</div>
            <div class="card-value first-pass-value">{{ summaryData.YearlyFirstPassRate }}%</div>
            <div class="card-subtitle">质量指标</div>
          </div>
        </div>

        <div class="summary-card delivery-pass-card">
          <div class="card-left">
            <div class="card-icon delivery-pass">
              <el-icon><Flag /></el-icon>
            </div>
          </div>
          <div class="card-right">
            <div class="card-title">年度交货批次合格率</div>
            <div class="card-value delivery-pass-value">{{ summaryData.YearlyDeliveryPassRate }}%</div>
            <div class="card-subtitle">交货指标</div>
          </div>
        </div>

        <div class="summary-card inspection-batch-card">
          <div class="card-left">
            <div class="card-icon inspection-batch">
              <el-icon><Document /></el-icon>
            </div>
          </div>
          <div class="card-right">
            <div class="card-title">年度交检批次</div>
            <div class="card-value inspection-batch-value">{{ summaryData.TotalInspectionBatches }}</div>
            <div class="card-subtitle">交检统计</div>
          </div>
        </div>

        <div class="summary-card delivery-batch-card">
          <div class="card-left">
            <div class="card-icon delivery-batch">
              <el-icon><Goods /></el-icon>
            </div>
          </div>
          <div class="card-right">
            <div class="card-title">年度发货批次</div>
            <div class="card-value delivery-batch-value">{{ summaryData.TotalDeliveryBatches }}</div>
            <div class="card-subtitle">发货统计</div>
          </div>
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
import { Refresh, DataAnalysis, Grid, CircleCheck, Document, Box, Flag, Goods } from '@element-plus/icons-vue'
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
      fontWeight: '600',
      color: '#2c3e50',
      fontFamily: 'Microsoft YaHei, Arial, sans-serif'
    },
    subtextStyle: {
      color: '#7f8c8d',
      fontSize: 13,
      fontFamily: 'Microsoft YaHei, Arial, sans-serif'
    }
  },
  tooltip: {
    trigger: 'axis',
    axisPointer: {
      type: 'cross',
      crossStyle: {
        color: '#bdc3c7',
        width: 2,
        type: 'solid',
        opacity: 0.6
      },
      lineStyle: {
        color: '#3498db',
        width: 2,
        type: 'solid',
        opacity: 0.8
      }
    },
    backgroundColor: 'rgba(255, 255, 255, 0.98)',
    borderColor: '#3498db',
    borderWidth: 2,
    borderRadius: 12,
    textStyle: {
      color: '#2c3e50',
      fontSize: 13,
      lineHeight: 22,
      fontFamily: 'Microsoft YaHei, Arial, sans-serif'
    },
    padding: [16, 20],
    shadowColor: 'rgba(52, 152, 219, 0.3)',
    shadowBlur: 20,
    shadowOffsetY: 8,
    formatter: function(params) {
      let result = `<div style="font-weight: 700; margin-bottom: 12px; color: #2c3e50; font-size: 15px; text-align: center; border-bottom: 2px solid #ecf0f1; padding-bottom: 8px;">${params[0].axisValue}</div>`
      params.forEach(param => {
        const unit = param.seriesName.includes('率') ? '%' : '批次'
        const value = param.seriesName.includes('率') ?
          parseFloat(param.value).toFixed(1) : param.value
        const colorStyle = param.seriesName.includes('率') ?
          'border-radius: 50%; box-shadow: 0 2px 8px rgba(0,0,0,0.15);' : 'border-radius: 4px; box-shadow: 0 2px 8px rgba(0,0,0,0.15);'
        const valueColor = param.seriesName.includes('率') ? '#e67e22' : '#3498db'
        result += `<div style="margin: 10px 0; display: flex; align-items: center; font-size: 13px; padding: 4px 0;">
          <span style="display: inline-block; width: 12px; height: 12px; background: ${param.color}; margin-right: 12px; ${colorStyle}"></span>
          <span style="flex: 1; color: #7f8c8d; font-weight: 500;">${param.seriesName}:</span>
          <span style="font-weight: 700; margin-left: 16px; color: ${valueColor}; font-size: 14px;">${value}${unit}</span>
        </div>`
      })
      return result
    }
  },
  legend: {
    data: [
      {
        name: '交检批次',
        icon: 'roundRect',
        itemStyle: { color: '#3498db' }
      },
      {
        name: '发货批次',
        icon: 'roundRect',
        itemStyle: { color: '#2ecc71' }
      },
      {
        name: '一次交检合格率',
        icon: 'circle',
        itemStyle: { color: '#e67e22' }
      },
      {
        name: '交货批次合格率',
        icon: 'circle',
        itemStyle: { color: '#e74c3c' }
      }
    ],
    selected: {
      '交检批次': false,
      '发货批次': false,
      '一次交检合格率': true,
      '交货批次合格率': true
    },
    bottom: 15,
    left: 'center',
    textStyle: {
      fontSize: 13,
      color: '#2c3e50',
      fontWeight: '600',
      fontFamily: 'Microsoft YaHei, Arial, sans-serif'
    },
    itemWidth: 20,
    itemHeight: 14,
    itemGap: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 8,
    padding: [6, 12],
    shadowColor: 'rgba(0, 0, 0, 0.08)',
    shadowBlur: 6,
    shadowOffsetY: 2
  },
  grid: {
    left: '6%',
    right: '12%',
    bottom: '20%',
    top: '15%',
    containLabel: true,
    backgroundColor: 'rgba(248, 249, 250, 0.5)',
    borderColor: 'rgba(189, 195, 199, 0.3)',
    borderWidth: 2,
    borderRadius: 8
  },
  xAxis: {
    type: 'category',
    boundaryGap: false,
    data: [],
    axisLine: {
      show: true,
      lineStyle: {
        color: '#bdc3c7',
        width: 2
      }
    },
    axisLabel: {
      fontSize: 13,
      color: '#2c3e50',
      fontWeight: '600',
      rotate: 0,
      margin: 15,
      fontFamily: 'Microsoft YaHei, Arial, sans-serif'
    },
    axisTick: {
      show: true,
      lineStyle: {
        color: '#bdc3c7',
        width: 2
      },
      length: 6
    },
    splitLine: {
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
          color: '#ecf0f1',
          type: 'solid',
          width: 2,
          opacity: 0.8
        }
      },
      nameTextStyle: {
        color: '#7f8c8d',
        fontSize: 13,
        fontWeight: '600',
        padding: [0, 0, 0, 15],
        fontFamily: 'Microsoft YaHei, Arial, sans-serif'
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
        color: '#7f8c8d',
        fontSize: 13,
        fontWeight: '600',
        padding: [0, 15, 0, 0],
        fontFamily: 'Microsoft YaHei, Arial, sans-serif'
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
      barWidth: '32%',
      itemStyle: {
        color: {
          type: 'linear',
          x: 0, y: 0, x2: 0, y2: 1,
          colorStops: [
            { offset: 0, color: '#3498db' },
            { offset: 1, color: '#5dade2' }
          ]
        },
        borderRadius: [6, 6, 0, 0],
        shadowColor: 'rgba(52, 152, 219, 0.4)',
        shadowBlur: 10,
        shadowOffsetY: 4
      },
      label: {
        show: true,
        position: 'top',
        fontSize: 12,
        fontWeight: '700',
        color: '#2c3e50',
        formatter: '{c}',
        fontFamily: 'Microsoft YaHei, Arial, sans-serif'
      },
      emphasis: {
        itemStyle: {
          color: {
            type: 'linear',
            x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: '#337ECC' },
              { offset: 1, color: '#66B2FF' }
            ]
          }
        }
      }
    },
    {
      name: '发货批次',
      type: 'bar',
      yAxisIndex: 0,
      data: [],
      barWidth: '32%',
      itemStyle: {
        color: {
          type: 'linear',
          x: 0, y: 0, x2: 0, y2: 1,
          colorStops: [
            { offset: 0, color: '#2ecc71' },
            { offset: 1, color: '#58d68d' }
          ]
        },
        borderRadius: [6, 6, 0, 0],
        shadowColor: 'rgba(46, 204, 113, 0.4)',
        shadowBlur: 10,
        shadowOffsetY: 4
      },
      label: {
        show: true,
        position: 'top',
        fontSize: 12,
        fontWeight: '700',
        color: '#2c3e50',
        formatter: '{c}',
        fontFamily: 'Microsoft YaHei, Arial, sans-serif'
      },
      emphasis: {
        itemStyle: {
          color: {
            type: 'linear',
            x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: '#529B2E' },
              { offset: 1, color: '#85CE61' }
            ]
          }
        }
      }
    },
    {
      name: '一次交检合格率',
      type: 'line',
      yAxisIndex: 1,
      data: [],
      smooth: true,
      symbol: 'circle',
      symbolSize: 10,
      lineStyle: {
        width: 4,
        color: '#e67e22',
        shadowColor: 'rgba(230, 126, 34, 0.4)',
        shadowBlur: 15,
        shadowOffsetY: 5
      },
      itemStyle: {
        color: '#e67e22',
        borderColor: '#FFFFFF',
        borderWidth: 3,
        shadowColor: 'rgba(230, 126, 34, 0.5)',
        shadowBlur: 12
      },
      areaStyle: {
        color: {
          type: 'linear',
          x: 0, y: 0, x2: 0, y2: 1,
          colorStops: [
            { offset: 0, color: 'rgba(230, 126, 34, 0.3)' },
            { offset: 1, color: 'rgba(230, 126, 34, 0.05)' }
          ]
        }
      },
      label: {
        show: true,
        position: 'top',
        formatter: '{c}%',
        fontSize: 12,
        color: '#2c3e50',
        fontWeight: '700',
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        padding: [4, 8],
        borderRadius: 6,
        fontFamily: 'Microsoft YaHei, Arial, sans-serif'
      },
      emphasis: {
        focus: 'series',
        lineStyle: {
          width: 4,
          color: '#CF9236'
        },
        itemStyle: {
          color: '#CF9236',
          borderWidth: 3,
          shadowBlur: 12
        }
      }
    },
    {
      name: '交货批次合格率',
      type: 'line',
      yAxisIndex: 1,
      data: [],
      smooth: true,
      symbol: 'circle',
      symbolSize: 10,
      lineStyle: {
        width: 4,
        color: '#e74c3c',
        shadowColor: 'rgba(231, 76, 60, 0.4)',
        shadowBlur: 15,
        shadowOffsetY: 5
      },
      itemStyle: {
        color: '#e74c3c',
        borderColor: '#FFFFFF',
        borderWidth: 2,
        shadowColor: 'rgba(245, 108, 108, 0.4)',
        shadowBlur: 8
      },
      areaStyle: {
        color: {
          type: 'linear',
          x: 0, y: 0, x2: 0, y2: 1,
          colorStops: [
            { offset: 0, color: 'rgba(231, 76, 60, 0.3)' },
            { offset: 1, color: 'rgba(231, 76, 60, 0.05)' }
          ]
        }
      },
      label: {
        show: true,
        position: 'top',
        formatter: '{c}%',
        fontSize: 11,
        color: '#F56C6C',
        fontWeight: '600',
        backgroundColor: 'rgba(255, 255, 255, 0.8)',
        padding: [2, 6],
        borderRadius: 4
      },
      emphasis: {
        focus: 'series',
        lineStyle: {
          width: 4,
          color: '#F78989'
        },
        itemStyle: {
          color: '#F78989',
          borderWidth: 3,
          shadowBlur: 12
        }
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
      updateChart() // 无论有无数据都要更新图表
    } else {
      chartData.value = []
      updateChart() // 清空图表
    }

    if (summaryResponse.data.success) {
      summaryData.value = summaryResponse.data.data
    } else {
      summaryData.value = null // 清空汇总数据
    }

  } catch (error) {
    ElMessage.error('加载质量指标数据失败')
  } finally {
    loading.value = false
  }
}

// 更新图表
const updateChart = () => {
  if (!chartInstance.value) {
    return
  }

  // 处理空数据的情况
  if (!chartData.value || !chartData.value.length) {
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
    return
  }

  const months = chartData.value.map(item => item.MonthLabel)
  const firstPassRates = chartData.value.map(item => item.FirstPassRate)
  const deliveryPassRates = chartData.value.map(item => item.DeliveryPassRate)
  const inspectionBatches = chartData.value.map(item => item.InspectionBatches)
  const deliveryBatches = chartData.value.map(item => item.DeliveryBatches)

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

  chartInstance.value.setOption(updateOption, false, true) // notMerge=false, lazyUpdate=true
}

// 刷新数据
const refreshData = () => {
  loadData()
}

// 初始化图表
const initChart = () => {
  if (chartRef.value) {
    chartInstance.value = echarts.init(chartRef.value)
    chartInstance.value.setOption(chartOption.value)

    // 监听窗口大小变化 - 添加防抖优化
    let resizeTimer = null
    const handleResize = () => {
      if (resizeTimer) {
        clearTimeout(resizeTimer)
      }
      resizeTimer = setTimeout(() => {
        if (chartInstance.value) {
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
.card-icon.first-pass {
  background: linear-gradient(135deg, #67C23A20, #67C23A10);
  color: #67C23A;
  border: 2px solid #67C23A20;
}
.card-icon.delivery-pass {
  background: linear-gradient(135deg, #409EFF20, #409EFF10);
  color: #409EFF;
  border: 2px solid #409EFF20;
}
.card-icon.inspection-batch {
  background: linear-gradient(135deg, #E6A23C20, #E6A23C10);
  color: #E6A23C;
  border: 2px solid #E6A23C20;
}
.card-icon.delivery-batch {
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
.first-pass-value { color: #67C23A; }
.delivery-pass-value { color: #409EFF; }
.inspection-batch-value { color: #E6A23C; }
.delivery-batch-value { color: #909399; }

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
</style>
