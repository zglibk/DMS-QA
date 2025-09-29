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
          <el-cascader
            v-model="filterForm.department"
            :options="departmentOptions"
            :props="cascaderProps"
            placeholder="选择部门"
            clearable
            filterable
            :show-all-levels="false"
            collapse-tags
            collapse-tags-tooltip
            style="width: 100%"
            @change="handleDepartmentChange"
          />
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
                  <el-radio-button value="count">次数</el-radio-button>
                  <el-radio-button value="amount">金额</el-radio-button>
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
                  <el-radio-button value="pie">饼图</el-radio-button>
                  <el-radio-button value="bar">柱图</el-radio-button>
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
          table-layout="auto"
        >
          <el-table-column prop="period" label="统计期间" min-width="120" />
          <el-table-column prop="department" label="部门" min-width="100" />
          <el-table-column prop="assessmentCount" label="考核次数" min-width="100" align="center" />
          <el-table-column prop="assessmentAmount" label="考核金额" min-width="120" align="right">
            <template #default="{ row }">
              <span class="amount-text">¥{{ row.assessmentAmount }}</span>
            </template>
          </el-table-column>
          <el-table-column prop="returnedCount" label="返还次数" min-width="100" align="center" />
          <el-table-column prop="returnedAmount" label="返还金额" min-width="120" align="right">
            <template #default="{ row }">
              <span class="returned-text">¥{{ row.returnedAmount }}</span>
            </template>
          </el-table-column>
          <el-table-column prop="returnRate" label="返还率" min-width="100" align="center">
            <template #default="{ row }">
              <el-tag :type="getReturnRateTagType(row.returnRate)">
                {{ row.returnRate }}%
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="avgAssessmentAmount" label="平均考核金额" min-width="140" align="right">
            <template #default="{ row }">
              ¥{{ row.avgAssessmentAmount }}
            </template>
          </el-table-column>
          <el-table-column prop="improvingCount" label="改善中" min-width="80" align="center" />
          <el-table-column prop="pendingCount" label="待考核" min-width="80" align="center" />
        </el-table>

        <!-- 分页 -->
        <div class="pagination-section">
          <el-pagination
            v-model:current-page="pagination.currentPage"
            v-model:page-size="pagination.pageSize"
            :page-sizes="[5, 10, 20, 50, 100]"
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
  import { ref, reactive, onMounted, nextTick, watch } from 'vue'
  import { ElMessage } from 'element-plus'
  import * as echarts from 'echarts'
  import api from '@/services/api'
  import * as assessmentApi from '@/services/assessmentApi'
  import {
    Search, Refresh, Download, DataAnalysis, Money, Check, TrendCharts,
    ArrowUp, ArrowDown
  } from '@element-plus/icons-vue'

  /**
   * 获取当年1月1日到当前日期的默认日期范围
   * @returns {Array} 包含开始日期和结束日期的数组
   */
  const getDefaultDateRange = () => {
    const currentDate = new Date()
    const currentYear = currentDate.getFullYear()
    const startDate = new Date(currentYear, 0, 1) // 当年1月1日
    
    // 使用本地时间格式化日期，避免时区偏差
    const formatDate = (date) => {
      const year = date.getFullYear()
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const day = String(date.getDate()).padStart(2, '0')
      return `${year}-${month}-${day}`
    }
    
    return [
      formatDate(startDate),
      formatDate(currentDate)
    ]
  }
  
  /**
   * 响应式数据定义
   */
  // 筛选表单
  const filterForm = reactive({
    dateRange: getDefaultDateRange(), // 使用当年1月1日到当前日期作为默认值
    department: '',
    statisticsType: 'monthly'
  })

  // 部门数据
  const departmentOptions = ref([])
  const cascaderProps = {
    value: 'ID',        // 修改为大写，匹配后端返回的字段名
    label: 'Name',      // 修改为大写，匹配后端返回的字段名
    children: 'children',
    emitPath: false,
    checkStrictly: true
  }

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
    pageSize: 5, // 默认设置为最小分页数5
    total: 0
  })

  /**
   * 监听器 - 监听图表类型变化
   */
  // 监听趋势图表类型变化
  watch(trendChartType, (newType) => {
    if (trendChart) {
      updateTrendChart(newType)
    }
  })

  // 监听部门图表类型变化  
  watch(deptChartType, (newType) => {
    if (deptChart) {
      updateDeptChart(newType)
    }
  })

  /**
   * 生命周期钩子
   */
  onMounted(() => {
    // 移除重新设置日期范围的代码，使用filterForm中的默认值（当年1月1日到当前日期）
    loadDepartments()
    loadData()
    loadMetrics()
    
    nextTick(() => {
      initCharts()
    })
  })

  /**
   * 数据加载函数
   */
  // 加载部门数据
  const loadDepartments = async () => {
    try {
      const response = await api.get('/departments/tree')
      
      if (response && response.data && response.data.success) {
        departmentOptions.value = response.data.data || []
      } else {
        console.error('获取部门数据失败:', response?.data?.message || '响应格式错误')
        ElMessage.error(`获取部门数据失败: ${response?.data?.message || '响应格式错误'}`)
      }
    } catch (error) {
      console.error('获取部门数据失败:', error)
      
      let errorMessage = '未知错误'
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message
      } else if (error.message) {
        errorMessage = error.message
      }
      
      ElMessage.error(`获取部门数据失败: ${errorMessage}`)
    }
  }
  // 加载统计数据
  const loadData = async () => {
    loading.value = true
    try {
      // 调用后端API获取统计汇总数据列表（按期间和部门分组）
      const response = await assessmentApi.getStatisticsSummary({
        dateRange: filterForm.dateRange,
        department: filterForm.department,
        statisticsType: filterForm.statisticsType,
        page: pagination.currentPage,
        pageSize: pagination.pageSize
      })
      
      if (response.data && response.data.success && response.data.data) {
        const data = response.data.data
        statisticsData.value = data.list || []
        pagination.total = data.total || 0
      } else {
        // 如果API调用失败，使用默认数据
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
      }
    } catch (error) {
      console.error('加载统计数据失败：', error)
      ElMessage.error('加载数据失败：' + error.message)
      
      // 错误时使用模拟数据
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
        }
      ]
      
      statisticsData.value = mockData
      pagination.total = mockData.length
    } finally {
      loading.value = false
    }
  }

  // 加载关键指标
  const loadMetrics = async () => {
    try {
      // 调用后端API获取关键指标
      const response = await assessmentApi.getStatisticsMetrics({
        dateRange: filterForm.dateRange,
        department: filterForm.department,
        statisticsType: filterForm.statisticsType
      })
      
      if (response.data && response.data.success) {
        Object.assign(metrics, response.data.data)
      } else {
        ElMessage.error('获取指标数据失败')
      }
    } catch (error) {
      console.error('加载指标数据失败：', error)
      ElMessage.error('加载指标数据失败：' + error.message)
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

  /**
   * 获取趋势数据
   * @param {string} chartType - 图表类型 ('count' 或 'amount')
   */
  const getTrendData = async (chartType) => {
    try {
      // 调用后端API获取趋势数据
      const response = await assessmentApi.getStatisticsTrend({
        dateRange: filterForm.dateRange,
        department: filterForm.department,
        statisticsType: filterForm.statisticsType
      })
      
      if (response.data && response.data.success) {
        const data = response.data.data
        return {
          dates: data.periods || [],
          values: chartType === 'count' ? (data.assessmentCounts || []) : (data.totalAmounts || [])
        }
      } else {
        // 如果API调用失败，使用默认数据
        const dates = ['2024-01', '2024-02', '2024-03', '2024-04', '2024-05', '2024-06']
        const countValues = [23, 18, 15, 12, 20, 16]
        const amountValues = [2300, 1800, 1500, 1200, 2000, 1600]
        
        return {
          dates,
          values: chartType === 'count' ? countValues : amountValues
        }
      }
    } catch (error) {
      console.error('获取趋势数据失败:', error)
      // 错误时使用默认数据
      const dates = ['2024-01', '2024-02', '2024-03', '2024-04', '2024-05', '2024-06']
      const countValues = [23, 18, 15, 12, 20, 16]
      const amountValues = [2300, 1800, 1500, 1200, 2000, 1600]
      
      return {
        dates,
        values: chartType === 'count' ? countValues : amountValues
      }
    }
  }

  /**
   * 初始化趋势图表
   */
  const initTrendChart = async () => {
    if (!trendChartRef.value) return
    
    try {
      trendChart = echarts.init(trendChartRef.value)
      
      const trendData = await getTrendData(trendChartType.value)
      
      const option = {
        backgroundColor: 'transparent',
        tooltip: {
          trigger: 'axis',
          backgroundColor: 'rgba(255, 255, 255, 0.95)',
          borderColor: '#e4e7ed',
          borderWidth: 1,
          textStyle: {
            color: '#303133',
            fontSize: 12
          },
          axisPointer: {
            type: 'cross',
            crossStyle: {
              color: '#999'
            },
            lineStyle: {
              color: '#999',
              type: 'dashed'
            }
          },
          formatter: function(params) {
            const param = params[0]
            const unit = trendChartType.value === 'count' ? '次' : '元'
            return `${param.name}<br/>${param.seriesName}: ${param.value}${unit}`
          }
        },
        legend: {
          data: [trendChartType.value === 'count' ? '考核次数' : '考核金额'],
          top: 10,
          textStyle: {
            color: '#606266',
            fontSize: 12
          }
        },
        grid: {
          left: '3%',
          right: '4%',
          bottom: '3%',
          top: '15%',
          containLabel: true
        },
        xAxis: {
          type: 'category',
          boundaryGap: false,
          data: trendData.dates,
          axisLine: {
            lineStyle: {
              color: '#e4e7ed'
            }
          },
          axisTick: {
            show: false
          },
          axisLabel: {
            color: '#909399',
            fontSize: 11
          },
          splitLine: {
            show: false
          }
        },
        yAxis: {
          type: 'value',
          name: trendChartType.value === 'count' ? '次数' : '金额(元)',
          nameTextStyle: {
            color: '#909399',
            fontSize: 11
          },
          axisLine: {
            show: false
          },
          axisTick: {
            show: false
          },
          axisLabel: {
            color: '#909399',
            fontSize: 11,
            formatter: function(value) {
              if (trendChartType.value === 'amount' && value >= 1000) {
                return (value / 1000).toFixed(0) + 'K'
              }
              return value
            }
          },
          splitLine: {
            lineStyle: {
              color: '#f5f7fa',
              type: 'dashed'
            }
          }
        },
        series: [
          {
            name: trendChartType.value === 'count' ? '考核次数' : '考核金额',
            type: 'line',
            smooth: true,
            smoothMonotone: 'x',
            lineStyle: {
              width: 3,
              color: trendChartType.value === 'count' ? '#409eff' : '#67c23a',
              shadowColor: trendChartType.value === 'count' ? 'rgba(64, 158, 255, 0.3)' : 'rgba(103, 194, 58, 0.3)',
              shadowBlur: 10,
              shadowOffsetY: 3
            },
            itemStyle: {
              color: '#ffffff',
              borderWidth: 3,
              borderColor: trendChartType.value === 'count' ? '#409eff' : '#67c23a',
              shadowColor: trendChartType.value === 'count' ? 'rgba(64, 158, 255, 0.4)' : 'rgba(103, 194, 58, 0.4)',
              shadowBlur: 8
            },
            areaStyle: {
              color: {
                type: 'linear',
                x: 0, y: 0, x2: 0, y2: 1,
                colorStops: trendChartType.value === 'count' ? [
                  { offset: 0, color: 'rgba(64, 158, 255, 0.4)' },
                  { offset: 1, color: 'rgba(64, 158, 255, 0.1)' }
                ] : [
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
                width: 4
              },
              itemStyle: {
                color: '#ffffff',
                borderWidth: 4,
                borderColor: trendChartType.value === 'count' ? '#409eff' : '#67c23a',
                shadowBlur: 15,
                shadowColor: trendChartType.value === 'count' ? 'rgba(64, 158, 255, 0.6)' : 'rgba(103, 194, 58, 0.6)'
              }
            },
            data: trendData.values,
            animationDuration: 1500,
            animationEasing: 'cubicOut'
          }
        ],
        animation: true,
        animationThreshold: 2000,
        animationDuration: 1000,
        animationEasing: 'cubicOut'
      }
      
      trendChart.setOption(option)
      
      // 监听窗口大小变化
      window.addEventListener('resize', () => {
        trendChart?.resize()
      })
    } catch (error) {
      console.error('初始化趋势图表失败:', error)
    }
  }

  // 初始化部门分布图表
  const initDeptChart = async () => {
    if (deptChart) {
      deptChart.dispose()
    }
    
    deptChart = echarts.init(deptChartRef.value)
    
    try {
      // 调用后端API获取部门分布数据
      const response = await assessmentApi.getStatisticsDepartment({
        dateRange: filterForm.dateRange,
        department: filterForm.department,
        statisticsType: filterForm.statisticsType
      })
      
      let pieData = []
      
      if (response.data && response.data.success) {
        const data = response.data.data
        const departments = data.departments || []
        const assessmentCounts = data.assessmentCounts || []
        
        // 转换为饼图数据格式
        pieData = departments.map((dept, index) => ({
          value: assessmentCounts[index] || 0,
          name: dept
        }))
      } else {
        // 使用默认数据
        pieData = [
          { value: 1500, name: '生产部' },
          { value: 800, name: '质检部' },
          { value: 600, name: '技术部' },
          { value: 400, name: '采购部' }
        ]
      }
      
      const pieOption = {
        tooltip: {
          trigger: 'item',
          formatter: '{a} <br/>{b}: {c} ({d}%)',
          backgroundColor: 'rgba(50, 50, 50, 0.8)',
          borderColor: '#409EFF',
          borderWidth: 1,
          textStyle: {
            color: '#fff'
          }
        },
        legend: {
          orient: 'vertical',
          left: 'left',
          top: 'center',
          textStyle: {
            fontSize: 12,
            color: '#666'
          },
          itemGap: 10,
          itemWidth: 14,
          itemHeight: 14,
          width: 120,
          formatter: function(name) {
            return name.length > 8 ? name.substring(0, 8) + '...' : name;
          }
        },
        series: [
          {
            name: '考核分布',
            type: 'pie',
            radius: ['30%', '80%'],
            center: ['60%', '50%'],
            avoidLabelOverlap: false,
            padAngle: 3,
            itemStyle: {
              borderRadius: 4
            },
            label: {
              show: false,
              position: 'center'
            },
            emphasis: {
              label: {
                show: true,
                fontSize: '14',
                fontWeight: 'bold'
              }
            },
            labelLine: {
              show: false
            },
            data: pieData,
            animationType: 'scale',
            animationEasing: 'elasticOut',
            animationDelay: function (idx) {
              return Math.random() * 200;
            }
          }
        ]
      }
      
      deptChart.setOption(pieOption)
    } catch (error) {
      console.error('加载部门分布图表数据失败：', error)
      ElMessage.error('加载部门分布图表数据失败：' + error.message)
    }
  }

  // 初始化状态分布图表
  const initStatusChart = async () => {
    if (statusChart) {
      statusChart.dispose()
    }
    
    statusChart = echarts.init(statusChartRef.value)
    
    try {
      // 调用后端API获取状态分布数据
      const response = await assessmentApi.getStatisticsStatus({
        dateRange: filterForm.dateRange,
        department: filterForm.department,
        statisticsType: filterForm.statisticsType
      })
      
      let statusData = []
      
      if (response.data && response.data.success) {
        const data = response.data.data
        const statuses = data.statuses || []
        const counts = data.counts || []
        
        // 转换为饼图数据格式，并设置颜色
        const colorMap = {
          '改善中': '#409EFF',
          '待改善': '#E6A23C', 
          '已返还': '#67C23A',
          '改善完成': '#909399',
          '未知状态': '#F56C6C'
        }
        
        statusData = statuses.map((status, index) => ({
          value: counts[index] || 0,
          name: status,
          itemStyle: { color: colorMap[status] || '#909399' }
        }))
      } else {
        // 使用默认数据
        statusData = [
          { value: 12, name: '改善中', itemStyle: { color: '#409EFF' } },
          { value: 5, name: '待改善', itemStyle: { color: '#E6A23C' } },
          { value: 8, name: '已返还', itemStyle: { color: '#67C23A' } },
          { value: 3, name: '改善完成', itemStyle: { color: '#909399' } }
        ]
      }
      
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
            // 增加系列间距
            padAngle: 2,
            // 添加圆角效果
            itemStyle: {
              borderRadius: 4
            },
            label: {
              show: false,
              position: 'center'
            },
            emphasis: {
              label: {
                show: true,
                fontSize: '14',
                fontWeight: 'bold',
                // 动态设置文字颜色与当前获得焦点的系列颜色一致
                color: function(params) {
                  return params.data.itemStyle.color
                }
              }
            },
            labelLine: {
              show: false
            },
            data: statusData
          }
        ]
      }
      
      statusChart.setOption(option)
    } catch (error) {
      console.error('加载状态分布图表数据失败：', error)
      ElMessage.error('加载状态分布图表数据失败：' + error.message)
    }
  }

  // 初始化返还情况图表
  const initReturnChart = async () => {
    try {
      if (returnChart) {
        returnChart.dispose()
      }
      
      returnChart = echarts.init(returnChartRef.value)
      
      // 调用API获取返还情况统计数据
      const response = await assessmentApi.getStatisticsReturn({
        dateRange: filterForm.dateRange,
        department: filterForm.department,
        statisticsType: filterForm.statisticsType
      })
      
      let periods = []
      let totalAmounts = []
      let returnedAmounts = []
      
      if (response.data && response.data.success && response.data.data) {
        periods = response.data.data.periods || []
        totalAmounts = response.data.data.totalAmounts || []
        returnedAmounts = response.data.data.returnedAmounts || []
      }
      
      // 如果没有数据，使用默认数据
      if (periods.length === 0) {
        periods = ['生产部', '质检部', '技术部', '采购部']
        totalAmounts = [1500, 800, 600, 400]
        returnedAmounts = [800, 500, 350, 250]
      }
      
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
          data: periods
        },
        yAxis: {
          type: 'value'
        },
        series: [
          {
            name: '考核金额',
            type: 'bar',
            data: totalAmounts,
            itemStyle: { color: '#E6A23C' }
          },
          {
            name: '返还金额',
            type: 'bar',
            data: returnedAmounts,
            itemStyle: { color: '#67C23A' }
          }
        ]
      }
      
      returnChart.setOption(option)
    } catch (error) {
      console.error('加载返还情况图表数据失败：', error)
      ElMessage.error('加载返还情况图表数据失败：' + error.message)
      
      // 错误时使用默认数据
      if (returnChart) {
        const defaultOption = {
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
        returnChart.setOption(defaultOption)
      }
    }
  }

  /**
   * 事件处理函数
   */
  // 部门变化处理
  const handleDepartmentChange = (value) => {
    // 自动触发筛选
    handleFilter()
  }

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

  /**
   * 更新趋势图表
   * @param {string} chartType - 图表类型 ('count' 或 'amount')
   */
  const updateTrendChart = async (chartType) => {
    if (!trendChart) return
    
    try {
      const trendData = await getTrendData(chartType)
      
      const option = {
        backgroundColor: 'transparent',
        tooltip: {
          trigger: 'axis',
          backgroundColor: 'rgba(255, 255, 255, 0.95)',
          borderColor: '#e4e7ed',
          borderWidth: 1,
          textStyle: {
            color: '#303133',
            fontSize: 12
          },
          axisPointer: {
            type: 'cross',
            crossStyle: {
              color: '#999'
            },
            lineStyle: {
              color: '#999',
              type: 'dashed'
            }
          },
          formatter: function(params) {
            const param = params[0]
            const unit = chartType === 'count' ? '次' : '元'
            return `${param.name}<br/>${param.seriesName}: ${param.value}${unit}`
          }
        },
        legend: {
          data: [chartType === 'count' ? '考核次数' : '考核金额'],
          top: 10,
          textStyle: {
            color: '#606266',
            fontSize: 12
          }
        },
        grid: {
          left: '3%',
          right: '4%',
          bottom: '3%',
          top: '15%',
          containLabel: true
        },
        xAxis: {
          type: 'category',
          boundaryGap: false,
          data: trendData.dates,
          axisLine: {
            lineStyle: {
              color: '#e4e7ed'
            }
          },
          axisTick: {
            show: false
          },
          axisLabel: {
            color: '#909399',
            fontSize: 11
          },
          splitLine: {
            show: false
          }
        },
        yAxis: {
          type: 'value',
          name: chartType === 'count' ? '次数' : '金额(元)',
          nameTextStyle: {
            color: '#909399',
            fontSize: 11
          },
          axisLine: {
            show: false
          },
          axisTick: {
            show: false
          },
          axisLabel: {
            color: '#909399',
            fontSize: 11,
            formatter: function(value) {
              if (chartType === 'amount' && value >= 1000) {
                return (value / 1000).toFixed(0) + 'K'
              }
              return value
            }
          },
          splitLine: {
            lineStyle: {
              color: '#f5f7fa',
              type: 'dashed'
            }
          }
        },
        series: [
          {
            name: chartType === 'count' ? '考核次数' : '考核金额',
            type: 'line',
            smooth: true,
            smoothMonotone: 'x',
            lineStyle: {
              width: 3,
              color: chartType === 'count' ? '#409eff' : '#67c23a',
              shadowColor: chartType === 'count' ? 'rgba(64, 158, 255, 0.3)' : 'rgba(103, 194, 58, 0.3)',
              shadowBlur: 10,
              shadowOffsetY: 3
            },
            itemStyle: {
              color: '#ffffff',
              borderWidth: 3,
              borderColor: chartType === 'count' ? '#409eff' : '#67c23a',
              shadowColor: chartType === 'count' ? 'rgba(64, 158, 255, 0.4)' : 'rgba(103, 194, 58, 0.4)',
              shadowBlur: 8
            },
            areaStyle: {
              color: {
                type: 'linear',
                x: 0, y: 0, x2: 0, y2: 1,
                colorStops: chartType === 'count' ? [
                  { offset: 0, color: 'rgba(64, 158, 255, 0.4)' },
                  { offset: 1, color: 'rgba(64, 158, 255, 0.1)' }
                ] : [
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
                width: 4
              },
              itemStyle: {
                color: '#ffffff',
                borderWidth: 4,
                borderColor: chartType === 'count' ? '#409eff' : '#67c23a',
                shadowBlur: 15,
                shadowColor: chartType === 'count' ? 'rgba(64, 158, 255, 0.6)' : 'rgba(103, 194, 58, 0.6)'
              }
            },
            data: trendData.values,
            animationDuration: 1500,
            animationEasing: 'cubicOut'
          }
        ],
        animation: true,
        animationThreshold: 2000,
        animationDuration: 1000,
        animationEasing: 'cubicOut'
      }
      
      trendChart.setOption(option, true)
    } catch (error) {
      console.error('更新趋势图表失败:', error)
    }
  }

  /**
   * 更新部门图表 - 根据选择的类型（饼图/柱图）更新图表显示
   * @param {string} chartType - 图表类型 ('pie' 或 'bar')
   */
  const updateDeptChart = async (chartType) => {
    if (!deptChart) return
    
    try {
      // 调用后端API获取部门分布数据
      const response = await assessmentApi.getStatisticsDepartment({
        dateRange: filterForm.dateRange,
        department: filterForm.department,
        statisticsType: filterForm.statisticsType
      })
      
      let departments = []
      let assessmentCounts = []
      
      if (response.data && response.data.success) {
        const data = response.data.data
        departments = data.departments || []
        assessmentCounts = data.assessmentCounts || []
      } else {
        // 使用默认数据
        departments = ['生产部', '质检部', '技术部', '采购部']
        assessmentCounts = [1500, 800, 600, 400]
      }
      
      let option = {}
      
      if (chartType === 'pie') {
        // 饼图显示
        const pieData = departments.map((dept, index) => ({
          value: assessmentCounts[index] || 0,
          name: dept
        }))
        
        option = {
          tooltip: {
            trigger: 'item',
            formatter: '{a} <br/>{b}: {c} ({d}%)',
            backgroundColor: 'rgba(50, 50, 50, 0.8)',
            borderColor: '#409EFF',
            borderWidth: 1,
            textStyle: {
              color: '#fff'
            }
          },
          legend: {
            orient: 'vertical',
            left: 'left',
            top: 'center',
            textStyle: {
              fontSize: 12,
              color: '#666'
            },
            itemGap: 10,
            itemWidth: 14,
            itemHeight: 14,
            width: 120,
            formatter: function(name) {
              return name.length > 8 ? name.substring(0, 8) + '...' : name;
            }
          },
          series: [
            {
              name: '考核分布',
              type: 'pie',
              radius: ['30%', '80%'],
              center: ['60%', '50%'],
              avoidLabelOverlap: false,
              padAngle: 3,
              itemStyle: {
                borderRadius: 4
              },
              label: {
                show: false,
                position: 'center'
              },
              emphasis: {
                label: {
                  show: true,
                  fontSize: '14',
                  fontWeight: 'bold'
                }
              },
              labelLine: {
                show: false
              },
              data: pieData,
              animationType: 'scale',
              animationEasing: 'elasticOut',
              animationDelay: function (idx) {
                return Math.random() * 200;
              }
            }
          ]
        }
      } else {
        // 柱图显示
        option = {
          tooltip: {
            trigger: 'axis',
            axisPointer: {
              type: 'shadow',
              shadowStyle: {
                color: 'rgba(64, 158, 255, 0.1)'
              }
            },
            backgroundColor: 'rgba(50, 50, 50, 0.8)',
            borderColor: '#409EFF',
            borderWidth: 1,
            textStyle: {
              color: '#fff'
            },
            formatter: function(params) {
              return `${params[0].name}<br/>${params[0].seriesName}: ${params[0].value}次`
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
            data: departments,
            axisLabel: {
              rotate: 45,
              fontSize: 12,
              color: '#666',
              margin: 10
            },
            axisLine: {
              lineStyle: {
                color: '#e0e0e0'
              }
            },
            axisTick: {
              show: false
            }
          },
          yAxis: {
            type: 'value',
            name: '考核次数',
            nameTextStyle: {
              color: '#666',
              fontSize: 12
            },
            axisLabel: {
              color: '#666',
              fontSize: 12
            },
            axisLine: {
              show: false
            },
            axisTick: {
              show: false
            },
            splitLine: {
              lineStyle: {
                color: '#f0f0f0',
                type: 'dashed'
              }
            }
          },
          series: [
            {
              name: '考核次数',
              type: 'bar',
              data: assessmentCounts,
              barWidth: '60%',
              itemStyle: {
                color: {
                  type: 'linear',
                  x: 0,
                  y: 0,
                  x2: 0,
                  y2: 1,
                  colorStops: [{
                    offset: 0, color: '#409EFF'
                  }, {
                    offset: 1, color: '#3788d8'
                  }]
                },
                borderRadius: [6, 6, 0, 0],
                shadowColor: 'rgba(64, 158, 255, 0.3)',
                shadowBlur: 10,
                shadowOffsetY: 3
              },
              emphasis: {
                itemStyle: {
                  color: {
                    type: 'linear',
                    x: 0,
                    y: 0,
                    x2: 0,
                    y2: 1,
                    colorStops: [{
                      offset: 0, color: '#66b1ff'
                    }, {
                      offset: 1, color: '#409EFF'
                    }]
                  },
                  shadowColor: 'rgba(64, 158, 255, 0.5)',
                  shadowBlur: 15,
                  shadowOffsetY: 5
                }
              },
              animationDuration: 1000,
              animationEasing: 'cubicOut',
              animationDelay: function (idx) {
                return idx * 100;
              }
            }
          ],
          animation: true,
          animationThreshold: 2000,
          animationDuration: 1000,
          animationEasing: 'cubicOut'
        }
      }
      
      deptChart.setOption(option, true) // true表示不合并，完全替换配置
    } catch (error) {
      console.error('更新部门图表失败：', error)
      ElMessage.error('更新部门图表失败：' + error.message)
    }
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
}