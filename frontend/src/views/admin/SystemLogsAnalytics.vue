<template>
  <div class="system-logs-analytics">
    <!-- 页面标题和导航 -->
    <div class="page-header">
      <div class="header-left">
        <el-button type="primary" @click="goBack" size="small">
          <el-icon><ArrowLeft /></el-icon>
          返回日志列表
        </el-button>
        <h2>系统日志统计分析</h2>
        <p>通过图表和数据分析系统日志，监控系统运行状态和用户行为</p>
      </div>
      <div class="header-actions">
        <el-button @click="refreshData" :loading="loading">
          <el-icon><Refresh /></el-icon>
          刷新数据
        </el-button>
        <el-button type="success" @click="exportAnalytics">
          <el-icon><Download /></el-icon>
          导出报告
        </el-button>
      </div>
    </div>

    <!-- 时间范围选择 -->
    <div class="filter-section">
      <el-card>
        <el-form :model="filterForm" inline class="filter-form">
          <el-form-item label="时间范围">
            <el-date-picker
              v-model="dateRange"
              type="datetimerange"
              range-separator="至"
              start-placeholder="开始时间"
              end-placeholder="结束时间"
              format="YYYY-MM-DD HH:mm:ss"
              value-format="YYYY-MM-DD HH:mm:ss"
              @change="handleDateRangeChange"
              style="width: 350px"
            />
          </el-form-item>
          <el-form-item label="日志分类">
            <el-select v-model="filterForm.category" placeholder="选择分类" clearable @change="fetchAnalyticsData">
              <el-option label="全部" value="" />
              <el-option
                v-for="category in categories"
                :key="category"
                :label="getCategoryLabel(category)"
                :value="category"
              />
            </el-select>
          </el-form-item>
          <el-form-item label="模块">
            <el-select v-model="filterForm.module" placeholder="选择模块" clearable @change="fetchAnalyticsData">
              <el-option label="全部" value="" />
              <el-option
                v-for="module in modules"
                :key="module"
                :label="getModuleLabel(module)"
                :value="module"
              />
            </el-select>
          </el-form-item>
        </el-form>
      </el-card>
    </div>

    <!-- 统计概览卡片 -->
    <div class="overview-section">
      <el-row :gutter="20">
        <el-col :span="6">
          <el-card class="stats-card">
            <div class="stats-item">
              <div class="stats-value">{{ overviewData.totalLogs }}</div>
              <div class="stats-label">总日志数</div>
            </div>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card class="stats-card">
            <div class="stats-item">
              <div class="stats-value error">{{ overviewData.errorLogs }}</div>
              <div class="stats-label">错误日志</div>
            </div>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card class="stats-card">
            <div class="stats-item">
              <div class="stats-value warning">{{ overviewData.warningLogs }}</div>
              <div class="stats-label">警告日志</div>
            </div>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card class="stats-card">
            <div class="stats-item">
              <div class="stats-value">{{ overviewData.uniqueUsers }}</div>
              <div class="stats-label">活跃用户</div>
            </div>
          </el-card>
        </el-col>
      </el-row>
    </div>

    <!-- 图表区域 -->
    <div class="charts-section">
      <el-row :gutter="20">
        <!-- 日志趋势图 -->
        <el-col :span="12">
          <el-card>
            <template #header>
              <div class="card-header">
                <span>日志趋势分析</span>
                <el-select v-model="trendPeriod" size="small" @change="fetchTrendData">
                  <el-option label="按小时" value="hour" />
                  <el-option label="按天" value="day" />
                  <el-option label="按周" value="week" />
                </el-select>
              </div>
            </template>
            <div ref="trendChartRef" class="chart-container"></div>
          </el-card>
        </el-col>

        <!-- 日志分类分布 -->
        <el-col :span="12">
          <el-card>
            <template #header>
              <span>日志分类分布</span>
            </template>
            <div ref="categoryChartRef" class="chart-container"></div>
          </el-card>
        </el-col>
      </el-row>

      <el-row :gutter="20" style="margin-top: 20px">
        <!-- 模块活跃度 -->
        <el-col :span="12">
          <el-card>
            <template #header>
              <span>模块活跃度统计</span>
            </template>
            <div ref="moduleChartRef" class="chart-container"></div>
          </el-card>
        </el-col>

        <!-- 用户活跃度 -->
        <el-col :span="12">
          <el-card>
            <template #header>
              <span>用户活跃度排行</span>
            </template>
            <div ref="userChartRef" class="chart-container"></div>
          </el-card>
        </el-col>
      </el-row>

      <el-row :gutter="20" style="margin-top: 20px">
        <!-- 错误统计 -->
        <el-col :span="24">
          <el-card>
            <template #header>
              <span>错误和警告统计</span>
            </template>
            <div ref="errorChartRef" class="chart-container-large"></div>
          </el-card>
        </el-col>
      </el-row>
    </div>

    <!-- 详细数据表格 -->
    <div class="table-section">
      <el-card>
        <template #header>
          <span>详细统计数据</span>
        </template>
        <el-tabs v-model="activeTab">
          <!-- 分类统计 -->
          <el-tab-pane label="分类统计" name="category">
            <el-table :data="categoryStats" stripe>
              <el-table-column prop="category" label="分类">
                <template #default="{ row }">
                  <el-tag :type="getCategoryTagType(row.category)">
                    {{ getCategoryLabel(row.category) }}
                  </el-tag>
                </template>
              </el-table-column>
              <el-table-column prop="count" label="日志数量" sortable />
              <el-table-column prop="percentage" label="占比">
                <template #default="{ row }">
                  {{ row.percentage }}%
                </template>
              </el-table-column>
              <el-table-column prop="errorCount" label="错误数" sortable />
              <el-table-column prop="warningCount" label="警告数" sortable />
            </el-table>
          </el-tab-pane>

          <!-- 模块统计 -->
          <el-tab-pane label="模块统计" name="module">
            <el-table :data="moduleStats" stripe>
              <el-table-column prop="module" label="模块">
                <template #default="{ row }">
                  <el-tag type="info">
                    {{ getModuleLabel(row.module) }}
                  </el-tag>
                </template>
              </el-table-column>
              <el-table-column prop="count" label="日志数量" sortable />
              <el-table-column prop="percentage" label="占比">
                <template #default="{ row }">
                  {{ row.percentage }}%
                </template>
              </el-table-column>
              <el-table-column prop="errorCount" label="错误数" sortable />
              <el-table-column prop="avgDuration" label="平均耗时(ms)" sortable />
            </el-table>
          </el-tab-pane>

          <!-- 用户统计 -->
          <el-tab-pane label="用户统计" name="user">
            <el-table :data="userStats" stripe>
              <el-table-column prop="username" label="用户名" />
              <el-table-column prop="count" label="操作次数" sortable />
              <el-table-column prop="lastActivity" label="最后活跃时间">
                <template #default="{ row }">
                  {{ formatDateTime(row.lastActivity) }}
                </template>
              </el-table-column>
              <el-table-column prop="errorCount" label="错误次数" sortable />
              <el-table-column prop="successRate" label="成功率">
                <template #default="{ row }">
                  <el-tag :type="row.successRate >= 95 ? 'success' : row.successRate >= 90 ? 'warning' : 'danger'">
                    {{ row.successRate }}%
                  </el-tag>
                </template>
              </el-table-column>
            </el-table>
          </el-tab-pane>
        </el-tabs>
      </el-card>
    </div>
  </div>
</template>

<script setup name="SystemLogsAnalytics">
import { ref, reactive, onMounted, onUnmounted, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { ArrowLeft, Refresh, Download } from '@element-plus/icons-vue'
import * as echarts from 'echarts'
import api from '@/utils/api'

// 路由
const router = useRouter()

// 响应式数据
const loading = ref(false)
const dateRange = ref([])
const trendPeriod = ref('day')
const activeTab = ref('category')

// 筛选表单
const filterForm = reactive({
  category: '',
  module: '',
  startDate: '',
  endDate: ''
})

// 配置选项
const categories = ref([])
const modules = ref([])

// 统计数据
const overviewData = reactive({
  totalLogs: 0,
  errorLogs: 0,
  warningLogs: 0,
  uniqueUsers: 0
})

const categoryStats = ref([])
const moduleStats = ref([])
const userStats = ref([])
const trendData = ref([])

// 图表实例
const trendChart = ref(null)
const categoryChart = ref(null)
const moduleChart = ref(null)
const userChart = ref(null)
const errorChart = ref(null)

// 图表DOM引用
const trendChartRef = ref(null)
const categoryChartRef = ref(null)
const moduleChartRef = ref(null)
const userChartRef = ref(null)
const errorChartRef = ref(null)

// 分类标签映射
const categoryLabels = {
  'AUTH': '认证授权',
  'USER_MGMT': '用户管理',
  'DATA_OP': '数据操作',
  'FILE_OP': '文件操作',
  'SYSTEM_CONFIG': '系统配置',
  'IMPORT_EXPORT': '导入导出',
  'QUERY_STATS': '查询统计',
  'SYSTEM_ERROR': '系统异常',
  'SECURITY': '安全相关',
  'PERFORMANCE': '性能监控'
}

// 模块标签映射
const moduleLabels = {
  'AUTH': '认证',
  'USER': '用户',
  'ROLE': '角色',
  'PERMISSION': '权限',
  'DEPARTMENT': '部门',
  'POSITION': '岗位',
  'WORK_PLAN': '工作计划',
  'COMPLAINT': '投诉',
  'NOTICE': '通知',
  'CONFIG': '配置',
  'FILE': '文件',
  'ERP': 'ERP',
  'MATERIAL': '材料',
  'SAMPLE': '样品',
  'MENU': '菜单'
}

/**
 * 获取分类标签
 * @param {string} category - 分类代码
 * @returns {string} 分类标签
 */
const getCategoryLabel = (category) => {
  return categoryLabels[category] || category
}

/**
 * 获取模块标签
 * @param {string} module - 模块代码
 * @returns {string} 模块标签
 */
const getModuleLabel = (module) => {
  return moduleLabels[module] || module
}

/**
 * 获取分类标签类型
 * @param {string} category - 分类代码
 * @returns {string} 标签类型
 */
const getCategoryTagType = (category) => {
  const typeMap = {
    'AUTH': 'primary',
    'USER_MGMT': 'success',
    'DATA_OP': 'info',
    'FILE_OP': 'warning',
    'SYSTEM_ERROR': 'danger',
    'SECURITY': 'danger'
  }
  return typeMap[category] || 'info'
}

/**
 * 格式化日期时间
 * @param {string} dateTime - 日期时间字符串
 * @returns {string} 格式化后的日期时间
 */
const formatDateTime = (dateTime) => {
  if (!dateTime) return '-'
  return new Date(dateTime).toLocaleString('zh-CN').replace(/\//g, '-')
}

/**
 * 返回日志列表页面
 */
const goBack = () => {
  router.push('/admin/system/logs')
}

/**
 * 处理日期范围变化
 * @param {Array} dates - 日期范围数组
 */
const handleDateRangeChange = (dates) => {
  if (dates && dates.length === 2) {
    filterForm.startDate = dates[0]
    filterForm.endDate = dates[1]
  } else {
    filterForm.startDate = ''
    filterForm.endDate = ''
  }
  fetchAnalyticsData()
}

/**
 * 获取配置选项
 */
const fetchConfigOptions = async () => {
  try {
    const response = await api.get('/system-logs/config/options')
    if (response.data.success) {
      categories.value = response.data.data.categories
      modules.value = response.data.data.modules
    }
  } catch (error) {
    console.error('获取配置选项失败:', error)
  }
}

/**
 * 获取统计分析数据
 */
const fetchAnalyticsData = async () => {
  loading.value = true
  console.log('🔍 [DEBUG] 开始获取统计分析数据')
  
  try {
    const params = {
      startDate: filterForm.startDate,
      endDate: filterForm.endDate,
      category: filterForm.category,
      module: filterForm.module
    }
    console.log('📋 [DEBUG] API调用参数:', params)

    // 获取概览数据
    console.log('📊 [DEBUG] 正在获取概览数据...')
    const overviewResponse = await api.get('/system-logs/analytics/overview', { params })
    console.log('📊 [DEBUG] 概览数据响应:', {
      status: overviewResponse.status,
      success: overviewResponse.data.success,
      data: overviewResponse.data.data
    })
    if (overviewResponse.data.success) {
      Object.assign(overviewData, overviewResponse.data.data)
      console.log('✅ [DEBUG] 概览数据已更新:', overviewData)
    } else {
      console.warn('⚠️ [DEBUG] 概览数据获取失败:', overviewResponse.data)
    }

    // 获取分类统计
    console.log('📈 [DEBUG] 正在获取分类统计...')
    const categoryResponse = await api.get('/system-logs/analytics/category', { params })
    console.log('📈 [DEBUG] 分类统计响应:', {
      status: categoryResponse.status,
      success: categoryResponse.data.success,
      dataLength: categoryResponse.data.data?.length
    })
    if (categoryResponse.data.success) {
      categoryStats.value = categoryResponse.data.data
      console.log('✅ [DEBUG] 分类统计已更新，数据条数:', categoryStats.value.length)
    } else {
      console.warn('⚠️ [DEBUG] 分类统计获取失败:', categoryResponse.data)
    }

    // 获取模块统计
    console.log('🔧 [DEBUG] 正在获取模块统计...')
    const moduleResponse = await api.get('/system-logs/analytics/module', { params })
    console.log('🔧 [DEBUG] 模块统计响应:', {
      status: moduleResponse.status,
      success: moduleResponse.data.success,
      dataLength: moduleResponse.data.data?.length
    })
    if (moduleResponse.data.success) {
      moduleStats.value = moduleResponse.data.data
      console.log('✅ [DEBUG] 模块统计已更新，数据条数:', moduleStats.value.length)
    } else {
      console.warn('⚠️ [DEBUG] 模块统计获取失败:', moduleResponse.data)
    }

    // 获取用户统计
    console.log('👤 [DEBUG] 正在获取用户统计...')
    const userResponse = await api.get('/system-logs/analytics/user', { params })
    console.log('👤 [DEBUG] 用户统计响应:', {
      status: userResponse.status,
      success: userResponse.data.success,
      dataLength: userResponse.data.data?.length
    })
    if (userResponse.data.success) {
      userStats.value = userResponse.data.data
      console.log('✅ [DEBUG] 用户统计已更新，数据条数:', userStats.value.length)
    } else {
      console.warn('⚠️ [DEBUG] 用户统计获取失败:', userResponse.data)
    }

    // 获取趋势数据
    console.log('📉 [DEBUG] 正在获取趋势数据...')
    await fetchTrendData()

    // 更新图表
    console.log('🎨 [DEBUG] 正在更新图表...')
    await nextTick()
    updateCharts()
    console.log('🎉 [DEBUG] 统计分析数据获取完成')

  } catch (error) {
    console.error('❌ [DEBUG] 获取统计数据失败:', error)
    console.error('❌ [DEBUG] 错误详情:', {
      message: error.message,
      response: error.response,
      status: error.response?.status,
      data: error.response?.data
    })
    ElMessage.error(`获取统计数据失败: ${error.message || '未知错误'}`)
  } finally {
    loading.value = false
    console.log('🏁 [DEBUG] fetchAnalyticsData 执行完成')
  }
}

/**
 * 获取趋势数据
 */
const fetchTrendData = async () => {
  console.log('📉 [DEBUG] fetchTrendData 开始执行')
  try {
    const params = {
      startDate: filterForm.startDate,
      endDate: filterForm.endDate,
      category: filterForm.category,
      module: filterForm.module,
      period: trendPeriod.value
    }
    console.log('📉 [DEBUG] 趋势数据API参数:', params)

    const response = await api.get('/system-logs/analytics/trend', { params })
    console.log('📉 [DEBUG] 趋势数据响应:', {
      status: response.status,
      success: response.data.success,
      dataLength: response.data.data?.length
    })
    if (response.data.success) {
      trendData.value = response.data.data
      console.log('✅ [DEBUG] 趋势数据已更新，数据条数:', trendData.value.length)
    } else {
      console.warn('⚠️ [DEBUG] 趋势数据获取失败:', response.data)
    }
  } catch (error) {
    console.error('❌ [DEBUG] 获取趋势数据失败:', error)
    console.error('❌ [DEBUG] 趋势数据错误详情:', {
      message: error.message,
      response: error.response,
      status: error.response?.status,
      data: error.response?.data
    })
    ElMessage.error('获取趋势数据失败')
  }
  console.log('🏁 [DEBUG] fetchTrendData 执行完成')
}

/**
 * 初始化图表
 */
const initCharts = () => {
  // 趋势图
  if (trendChartRef.value) {
    trendChart.value = echarts.init(trendChartRef.value)
  }

  // 分类分布图
  if (categoryChartRef.value) {
    categoryChart.value = echarts.init(categoryChartRef.value)
  }

  // 模块活跃度图
  if (moduleChartRef.value) {
    moduleChart.value = echarts.init(moduleChartRef.value)
  }

  // 用户活跃度图
  if (userChartRef.value) {
    userChart.value = echarts.init(userChartRef.value)
  }

  // 错误统计图
  if (errorChartRef.value) {
    errorChart.value = echarts.init(errorChartRef.value)
  }

  // 监听窗口大小变化
  window.addEventListener('resize', handleResize)
}

/**
 * 更新图表
 */
const updateCharts = () => {
  updateTrendChart()
  updateCategoryChart()
  updateModuleChart()
  updateUserChart()
  updateErrorChart()
}

/**
 * 更新趋势图
 */
const updateTrendChart = () => {
  if (!trendChart.value || !trendData.value.length) return

  const option = {
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      formatter: function(params) {
        let result = params[0].name + '<br/>';
        params.forEach(param => {
          if (param.value > 0) {
            result += param.seriesName + ': ' + param.value + '<br/>';
          }
        });
        return result;
      }
    },
    legend: {
      data: ['总数', '错误', '警告'],
      bottom: 0
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '15%',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      data: trendData.value.map(item => item.time)
    },
    yAxis: {
      type: 'value'
    },
    series: [
      {
        name: '总数',
        type: 'line',
        data: trendData.value.map(item => item.total),
        smooth: true,
        itemStyle: { color: '#409EFF' }
      },
      {
        name: '错误',
        type: 'line',
        data: trendData.value.map(item => item.error),
        smooth: true,
        itemStyle: { color: '#F56C6C' }
      },
      {
        name: '警告',
        type: 'line',
        data: trendData.value.map(item => item.warning),
        smooth: true,
        itemStyle: { color: '#E6A23C' }
      }
    ]
  }

  trendChart.value.setOption(option)
}

/**
 * 更新分类分布图
 */
const updateCategoryChart = () => {
  if (!categoryChart.value || !categoryStats.value.length) return

  // 定义饼图颜色配置
  const pieColors = ['#409EFF', '#67C23A', '#E6A23C', '#F56C6C', '#909399', '#C0C4CC']
  
  const option = {
    tooltip: {
      trigger: 'item',
      formatter: function(params) {
        return params.seriesName + '<br/>' + params.name + ': ' + params.value;
      },
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
      top: 'middle',
      itemWidth: 14,
      itemHeight: 14,
      textStyle: {
        fontSize: 12,
        color: '#606266'
      }
    },
    series: [
      {
        name: '分类分布',
        type: 'pie',
        radius: ['30%', '70%'],  // 设置为环形饼图
        center: ['60%', '50%'],  // 调整饼图位置，为图例留出空间
        avoidLabelOverlap: false,
        label: {
          show: true,
          position: 'outside',
          formatter: '{b}: {d}%',
          fontSize: 11,
          color: '#606266'
        },
        labelLine: {
          show: true,
          length: 15,
          length2: 10
        },
        data: categoryStats.value.map((item, index) => ({
          value: item.count,
          name: getCategoryLabel(item.category),
          itemStyle: {
            color: pieColors[index % pieColors.length],
            borderColor: '#fff',
            borderWidth: 2
          }
        })),
        emphasis: {
          itemStyle: {
            shadowBlur: 15,
            shadowOffsetX: 0,
            shadowColor: 'rgba(0, 0, 0, 0.3)',
            borderWidth: 3
          },
          label: {
            show: true,
            fontSize: 14,
            fontWeight: 'bold'
          }
        },
        animationType: 'scale',
        animationEasing: 'elasticOut',
        animationDelay: function (idx) {
          return Math.random() * 200;
        }
      }
    ]
  }

  categoryChart.value.setOption(option)
}

/**
 * 更新模块活跃度图
 */
const updateModuleChart = () => {
  if (!moduleChart.value || !moduleStats.value.length) return

  const option = {
    tooltip: {
      trigger: 'item',
      formatter: function(params) {
        return params.seriesName + ': ' + params.value;
      }
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      containLabel: true
    },
    xAxis: {
      type: 'value'
    },
    yAxis: {
      type: 'category',
      data: moduleStats.value.map(item => getModuleLabel(item.module))
    },
    series: [
      {
        name: '日志数量',
        type: 'bar',
        data: moduleStats.value.map(item => item.count),
        itemStyle: { color: '#67C23A' },
        barMaxWidth: 40  // 设置柱形最大宽度为40px
      }
    ]
  }

  moduleChart.value.setOption(option)
}

/**
 * 更新用户活跃度图
 */
const updateUserChart = () => {
  if (!userChart.value || !userStats.value.length) return

  const topUsers = userStats.value.slice(0, 10) // 只显示前10名

  const option = {
    tooltip: {
      trigger: 'item',
      formatter: function(params) {
        return params.seriesName + ': ' + params.value;
      }
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      containLabel: true
    },
    xAxis: {
      type: 'value'
    },
    yAxis: {
      type: 'category',
      data: topUsers.map(item => item.username || '匿名用户')
    },
    series: [
      {
        name: '操作次数',
        type: 'bar',
        data: topUsers.map(item => item.count),
        itemStyle: { color: '#909399' },
        barMaxWidth: 40  // 设置柱形最大宽度为40px
      }
    ]
  }

  userChart.value.setOption(option)
}

/**
 * 更新错误统计图
 */
const updateErrorChart = () => {
  if (!errorChart.value || !categoryStats.value.length) return

  const option = {
    tooltip: {
      trigger: 'item',
      formatter: function(params) {
        return params.seriesName + ': ' + params.value;
      }
    },
    legend: {
      data: ['错误数', '警告数'],
      bottom: 0
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '15%',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      data: categoryStats.value.map(item => getCategoryLabel(item.category))
    },
    yAxis: {
      type: 'value'
    },
    series: [
      {
        name: '错误数',
        type: 'bar',
        data: categoryStats.value.map(item => item.errorCount || 0),
        itemStyle: { color: '#F56C6C' },
        barMaxWidth: 35  // 设置柱形最大宽度为35px
      },
      {
        name: '警告数',
        type: 'bar',
        data: categoryStats.value.map(item => item.warningCount || 0),
        itemStyle: { color: '#E6A23C' },
        barMaxWidth: 35  // 设置柱形最大宽度为35px
      }
    ]
  }

  errorChart.value.setOption(option)
}

/**
 * 处理窗口大小变化
 */
const handleResize = () => {
  if (trendChart.value) trendChart.value.resize()
  if (categoryChart.value) categoryChart.value.resize()
  if (moduleChart.value) moduleChart.value.resize()
  if (userChart.value) userChart.value.resize()
  if (errorChart.value) errorChart.value.resize()
}

/**
 * 刷新数据
 */
const refreshData = () => {
  fetchAnalyticsData()
}

/**
 * 导出分析报告
 */
const exportAnalytics = async () => {
  try {
    const params = {
      startDate: filterForm.startDate,
      endDate: filterForm.endDate,
      category: filterForm.category,
      module: filterForm.module
    }

    const response = await api.get('/system-logs/analytics/export', {
      params,
      responseType: 'blob'
    })

    const blob = new Blob([response.data], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    })

    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    // 使用本地时间格式生成文件名，避免时区偏差
    const now = new Date()
    const localDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
    link.download = `系统日志分析报告_${localDate}.xlsx`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)

    ElMessage.success('导出成功')
  } catch (error) {
    console.error('导出失败:', error)
    ElMessage.error('导出失败')
  }
}

// 生命周期钩子
onMounted(async () => {
  // 设置默认时间范围（前一天同一时间到当前时间）
  const endDate = new Date()
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - 1) // 设置为前一天的同一时间
  
  // 使用本地时间格式，避免时区偏差
  const formatLocalDateTime = (date) => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const hours = String(date.getHours()).padStart(2, '0')
    const minutes = String(date.getMinutes()).padStart(2, '0')
    const seconds = String(date.getSeconds()).padStart(2, '0')
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`
  }
  
  dateRange.value = [
    formatLocalDateTime(startDate),
    formatLocalDateTime(endDate)
  ]
  
  filterForm.startDate = dateRange.value[0]
  filterForm.endDate = dateRange.value[1]

  // 获取配置选项
  await fetchConfigOptions()
  
  // 先初始化图表
  await nextTick()
  initCharts()
  
  // 然后获取统计数据并更新图表
  await fetchAnalyticsData()
})

onUnmounted(() => {
  // 销毁图表实例
  if (trendChart.value) {
    trendChart.value.dispose()
    trendChart.value = null
  }
  if (categoryChart.value) {
    categoryChart.value.dispose()
    categoryChart.value = null
  }
  if (moduleChart.value) {
    moduleChart.value.dispose()
    moduleChart.value = null
  }
  if (userChart.value) {
    userChart.value.dispose()
    userChart.value = null
  }
  if (errorChart.value) {
    errorChart.value.dispose()
    errorChart.value = null
  }
  
  // 移除事件监听
  window.removeEventListener('resize', handleResize)
})
</script>

<style scoped>
.system-logs-analytics {
  padding: 20px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 20px;
}

.header-left h2 {
  margin: 10px 0 8px 0;
  color: #303133;
}

.header-left p {
  margin: 0;
  color: #909399;
  font-size: 14px;
}

.header-actions {
  display: flex;
  gap: 10px;
}

.filter-section {
  margin-bottom: 20px;
}

.filter-form {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.overview-section {
  margin-bottom: 20px;
}

.stats-card {
  text-align: center;
}

.stats-item {
  padding: 10px;
}

.stats-value {
  font-size: 28px;
  font-weight: bold;
  color: #409EFF;
  margin-bottom: 5px;
}

.stats-value.error {
  color: #F56C6C;
}

.stats-value.warning {
  color: #E6A23C;
}

.stats-label {
  font-size: 14px;
  color: #909399;
}

.charts-section {
  margin-bottom: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.card-header span {
  font-weight: 600;
  font-size: 16px;
  color: #303133;
  min-width: 120px;
  flex-shrink: 0;
}

.card-header .el-select {
  width: 120px;
  min-width: 120px;
  flex-shrink: 0;
}

/* 筛选条件卡片中的选择器样式 */
.filter-form .el-select {
  min-width: 140px;
  width: 140px;
}

.chart-container {
  height: 300px;
  width: 100%;
}

.chart-container-large {
  height: 400px;
  width: 100%;
}

.table-section {
  margin-bottom: 20px;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .page-header {
    flex-direction: column;
    gap: 16px;
  }

  .header-actions {
    width: 100%;
    justify-content: flex-start;
  }

  .filter-form {
    flex-direction: column;
  }

  .filter-form .el-form-item {
    margin-right: 0;
    margin-bottom: 16px;
  }

  .chart-container,
  .chart-container-large {
    height: 250px;
  }
}

/* 图表容器样式 */
:deep(.el-card__body) {
  padding: 20px;
}

/* 表格样式 */
:deep(.el-table) {
  border-radius: 0;
}

:deep(.el-table th) {
  background: #fafafa;
  color: #606266;
  font-weight: 600;
}

:deep(.el-table td) {
  border-bottom: 1px solid #f0f0f0;
}

:deep(.el-table tr:hover > td) {
  background: #f5f7fa;
}
</style>