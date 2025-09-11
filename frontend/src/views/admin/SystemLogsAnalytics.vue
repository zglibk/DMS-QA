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
          <el-form-item>
            <el-button type="danger" plain @click="resetFilters" :icon="RefreshRight" >
              重置查询
            </el-button>
          </el-form-item>
        </el-form>
      </el-card>
    </div>

    <!-- 统计概览卡片 -->
    <div class="overview-section">
      <el-row :gutter="20">
        <el-col :span="6">
          <el-card class="stats-card stats-card-primary">
            <div class="stats-item">
              <div class="stats-icon">
                <el-icon><Document /></el-icon>
              </div>
              <div class="stats-content">
                <div class="stats-value">{{ overviewData.totalLogs }}</div>
                <div class="stats-label">总日志数</div>
              </div>
            </div>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card class="stats-card stats-card-danger">
            <div class="stats-item">
              <div class="stats-icon">
                <el-icon><Warning /></el-icon>
              </div>
              <div class="stats-content">
                <div class="stats-value">{{ overviewData.errorLogs }}</div>
                <div class="stats-label">错误日志</div>
              </div>
            </div>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card class="stats-card stats-card-warning">
            <div class="stats-item">
              <div class="stats-icon">
                <el-icon><InfoFilled /></el-icon>
              </div>
              <div class="stats-content">
                <div class="stats-value">{{ overviewData.warningLogs }}</div>
                <div class="stats-label">警告日志</div>
              </div>
            </div>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card class="stats-card stats-card-success">
            <div class="stats-item">
              <div class="stats-icon">
                <el-icon><User /></el-icon>
              </div>
              <div class="stats-content">
                <div class="stats-value">{{ overviewData.uniqueUsers }}</div>
                <div class="stats-label">活跃用户</div>
              </div>
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
import { ArrowLeft, Refresh, Download, Document, Warning, InfoFilled, User, RefreshRight } from '@element-plus/icons-vue'
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
  'PERFORMANCE': '性能监控',
  'BUSINESS': '业务操作',
  'SYSTEM': '系统操作'
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
  'MENU': '菜单',
  'SYSTEM_LOG': '系统日志',
  'MONTHLY_BATCH_STATS': '月度批次统计',
  'LOG_EXPORT': '日志导出',
  'UNKNOWN': '未知模块'
}

// 严重级别标签映射
const severityLabels = {
  'INFO': '信息',
  'WARN': '警告',
  'ERROR': '错误',
  'DEBUG': '调试'
}

/**
     * 获取分类标签
     * @param {string} category - 分类代码
     * @returns {string} 分类标签
     */
    const getCategoryLabel = (category) => {
      // 只在真正为空值时才返回"未知分类"
      if (category === null || category === undefined || category === '') {
        return '未知分类'
      }
      return categoryLabels[category] || category
    }

/**
     * 获取模块标签
     * @param {string} module - 模块代码
     * @returns {string} 模块标签
     */
    const getModuleLabel = (module) => {
      // 只在真正为空值时才返回"未知模块"
      if (module === null || module === undefined || module === '') {
        return '未知模块'
      }
      return moduleLabels[module] || module
    }

/**
     * 获取严重级别标签
     * @param {string} severity - 严重级别代码
     * @returns {string} 严重级别标签
     */
    const getSeverityLabel = (severity) => {
      // 只在真正为空值时才返回"未知级别"
      if (severity === null || severity === undefined || severity === '') {
        return '未知级别'
      }
      return severityLabels[severity] || severity
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
 * 重置筛选条件
 */
const resetFilters = () => {
  // 重置筛选表单
  filterForm.category = ''
  filterForm.module = ''
  filterForm.startDate = ''
  filterForm.endDate = ''
  
  // 重置日期范围选择器
  dateRange.value = []
  
  // 重新获取数据
  fetchAnalyticsData()
  
  ElMessage.success('筛选条件已重置')
}

/**
 * 获取配置选项
 */
const fetchConfigOptions = async () => {
  try {
    const configResponse = await api.get('/system-logs/config/options')
    
    if (configResponse.success) {
      const data = configResponse.data
      categories.value = data.categories || []
      modules.value = data.modules || []
    } else {
      console.error('配置选项获取失败:', configResponse.message)
    }
  } catch (error) {
    console.error('获取配置选项失败:', error)
  }
}

/**
 * 获取统计分析数据 - 使用与系统日志管理页面相同的数据源
 */
const fetchAnalyticsData = async () => {
  loading.value = true
  
  try {
    const params = {
      startDate: filterForm.startDate,
      endDate: filterForm.endDate,
      category: filterForm.category,
      module: filterForm.module
    }
    
    // 过滤掉空值参数
    Object.keys(params).forEach(key => {
      if (!params[key]) {
        delete params[key]
      }
    })

    // 获取统计数据 - 使用与管理页面相同的接口
    const statisticsResponse = await api.get('/system-logs/statistics', { params })
    
    if (statisticsResponse.success) {
      const data = statisticsResponse.data
      
      // 设置概览数据
      const totalStats = data.totalStats || {}
      Object.assign(overviewData, {
        totalLogs: totalStats.totalLogs || 0,
        errorLogs: totalStats.totalErrors || 0,
        warningLogs: totalStats.totalWarnings || 0,
        uniqueUsers: totalStats.uniqueUsers || 0
      })
      
      // 获取各类统计数据
      await fetchCategoryStatistics(params)
      await fetchModuleStatistics(params)
      await fetchUserStatistics(params)
      
    } else {
      ElMessage.error('统计数据获取失败')
    }

    // 获取趋势数据
    await fetchTrendData()

    // 更新图表
    await nextTick()
    updateCharts()

  } catch (error) {
    console.error('❌ [ERROR] 统计数据获取失败 - 完整错误信息:', error)
    console.error('❌ [ERROR] 错误类型:', error.constructor.name)
    console.error('❌ [ERROR] 错误消息:', error.message)
    console.error('❌ [ERROR] 错误堆栈:', error.stack)
    console.error('❌ [ERROR] 响应状态:', error.response?.status)
    console.error('❌ [ERROR] 响应数据:', error.response?.data)
    console.error('❌ [ERROR] 响应头:', error.response?.headers)
    console.error('❌ [ERROR] 请求配置:', error.config)
    
    const errorMsg = error.response?.data?.message || error.message || '网络连接失败'
    ElMessage.error(`获取统计数据失败: ${errorMsg}`)
  } finally {
    loading.value = false
  }
}

/**
 * 获取分类统计数据 - 通过分组查询获取各分类的日志数量
 */
const fetchCategoryStatistics = async (baseParams) => {
  try {
    const categoryResponse = await api.get('/system-logs/statistics', {
      params: { ...baseParams, groupBy: 'category' }
    });
    
    if (categoryResponse.success) {
      const statistics = categoryResponse.data.statistics || [];
      categoryStats.value = statistics.map(item => ({
        category: item.groupKey,
        count: item.count,
        errorCount: item.errorCount || 0,
        warningCount: item.warnCount || 0,
        percentage: ((item.count / overviewData.totalLogs) * 100).toFixed(1)
      }));
    }
  } catch (error) {
    console.error('获取分类统计失败:', error);
  }
};

/**
 * 获取模块统计数据 - 通过分组查询获取各模块的日志数量
 */
const fetchModuleStatistics = async (baseParams) => {
  try {
    const moduleResponse = await api.get('/system-logs/statistics', {
      params: { ...baseParams, groupBy: 'module' }
    });
    
    if (moduleResponse.success) {
      const statistics = moduleResponse.data.statistics || [];
      moduleStats.value = statistics.map(item => ({
        module: item.groupKey,
        count: item.count,
        errorCount: item.errorCount || 0,
        percentage: ((item.count / overviewData.totalLogs) * 100).toFixed(1),
        avgDuration: item.avgDuration || 0
      }));
    }
  } catch (error) {
    console.error('获取模块统计失败:', error);
  }
};

/**
 * 获取用户统计数据 - 通过日志列表查询获取用户活动统计
 */
const fetchUserStatistics = async (baseParams) => {
  try {
    // 获取用户日志数据，按用户分组统计
    const userResponse = await api.get('/system-logs/list', {
      params: { ...baseParams, pageSize: 1000 } // 获取足够多的数据用于统计
    });
    
    if (userResponse.success) {
      const logs = userResponse.data.list || [];
      const userStatsMap = {};
      
      // 统计每个用户的日志数量
      logs.forEach(log => {
        if (log.UserID) {
          const userId = log.UserID;
          const username = log.Username || `用户${userId}`;
          
          if (!userStatsMap[userId]) {
            userStatsMap[userId] = {
              username: username,
              count: 0,
              errorCount: 0,
              lastActivity: log.CreatedAt,
              successRate: 0
            };
          }
          
          userStatsMap[userId].count++;
          
          if (log.Severity === 'ERROR') {
            userStatsMap[userId].errorCount++;
          }
          
          // 更新最后活跃时间
          if (new Date(log.CreatedAt) > new Date(userStatsMap[userId].lastActivity)) {
            userStatsMap[userId].lastActivity = log.CreatedAt;
          }
        }
      });
      
      // 计算成功率并转换为数组
      userStats.value = Object.values(userStatsMap)
        .map(user => ({
          ...user,
          successRate: user.count > 0 ? (((user.count - user.errorCount) / user.count) * 100).toFixed(1) : 0
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10); // 只取前10个用户
    }
  } catch (error) {
    console.error('获取用户统计失败:', error);
  }
};

/**
 * 获取趋势数据 - 使用与系统日志管理页面相同的数据源
 */
const fetchTrendData = async () => {
  try {
    // 构建查询参数
     const params = {
       startDate: filterForm.startDate,
       endDate: filterForm.endDate,
       category: filterForm.category,
       module: filterForm.module,
       severity: filterForm.severity,
       userID: filterForm.userID,
       keyword: filterForm.keyword,
       groupBy: trendPeriod.value || 'day' // 按时间周期分组获取趋势数据
     }
    
    // 过滤掉空值参数
    Object.keys(params).forEach(key => {
      if (!params[key]) {
        delete params[key]
      }
    })
    
    // 获取趋势数据 - 使用统计接口按时间分组
    const trendResponse = await api.get('/system-logs/statistics', { params })
    
    if (trendResponse.success) {
       const statistics = trendResponse.data.statistics || []
       
       // 转换数据格式以适配图表
       trendData.value = statistics.map(item => ({
         date: item.timeGroup,
         total: item.count,
         error: item.errorCount || 0,
         warning: item.warnCount || 0,
         info: item.infoCount || 0,
         avgDuration: item.avgDuration || 0
       }))
       
       // 更新趋势图表
       await nextTick()
       updateTrendChart()
     } else {
       console.error('❌ [ERROR] 趋势数据获取失败:', trendResponse.message)
       ElMessage.error('趋势数据获取失败')
     }
  } catch (error) {
    console.error('❌ [ERROR] 趋势数据获取失败 - 完整错误信息:', error)
    console.error('❌ [ERROR] 错误类型:', error.constructor.name)
    console.error('❌ [ERROR] 错误消息:', error.message)
    console.error('❌ [ERROR] 错误堆栈:', error.stack)
    console.error('❌ [ERROR] 响应状态:', error.response?.status)
    console.error('❌ [ERROR] 响应数据:', error.response?.data)
    console.error('❌ [ERROR] 响应头:', error.response?.headers)
    console.error('❌ [ERROR] 请求URL:', error.config?.url)
    console.error('❌ [ERROR] 请求方法:', error.config?.method)
    console.error('❌ [ERROR] 请求参数:', error.config?.params)
    
    const errorMsg = error.response?.data?.message || error.message || '网络连接失败'
    ElMessage.error(`获取趋势数据失败: ${errorMsg}`)
  }
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
  if (!trendChart.value || !trendData.value.length) {
    return
  }

  const option = {
    tooltip: {
      trigger: 'item',
      triggerOn: 'mousemove',
      showDelay: 0,
      hideDelay: 100,
      enterable: true,
      backgroundColor: 'rgba(255, 255, 255, 0.95)',
      borderColor: '#ddd',
      borderWidth: 1,
      borderRadius: 6,
      textStyle: {
        color: '#333',
        fontSize: 12
      },
      padding: [8, 12],
      formatter: function(params) {
        return `<div style="font-weight: 600; margin-bottom: 4px;">${params.name}</div><div style="margin: 2px 0;"><span style="display: inline-block; width: 10px; height: 10px; border-radius: 50%; background-color: ${params.color}; margin-right: 6px;"></span>${params.seriesName}: <span style="font-weight: 600;">${params.value || 0}</span></div>`;
      }
    },
    legend: {
      data: ['总数', '错误', '警告'],
      bottom: 8,
      left: 'center',
      itemGap: 20,
      textStyle: {
        fontSize: 12,
        color: '#666'
      },
      icon: 'circle'
    },
    grid: {
      left: '3%',
      right: '8%',
      bottom: '18%',
      top: '12%',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      data: trendData.value.map(item => item?.time || ''),
      axisLine: {
        lineStyle: {
          color: '#e8e8e8',
          width: 1
        }
      },
      axisTick: {
        show: false
      },
      axisLabel: {
        color: '#666',
        fontSize: 11,
        margin: 8
      }
    },
    yAxis: [
      {
        type: 'value',
        name: '{primary|总数}',
        nameTextStyle: {
          rich: {
            primary: {
              backgroundColor: '#409eff',
              color: '#fff',
              borderRadius: 4,
              padding: [4, 8],
              fontSize: 12,
              fontWeight: 'normal'
            }
          }
        },
        position: 'left',
        axisLine: {
          show: false
        },
        axisTick: {
          show: false
        },
        axisLabel: {
          color: '#666',
          fontSize: 11,
          margin: 8
        },
        splitLine: {
          lineStyle: {
            color: '#f5f5f5',
            width: 1,
            type: 'solid'
          }
        }
      },
      {
        type: 'value',
        name: '{danger|错误/警告}',
        nameTextStyle: {
          rich: {
            danger: {
              backgroundColor: '#f56c6c',
              color: '#fff',
              borderRadius: 4,
              padding: [4, 8],
              fontSize: 12,
              fontWeight: 'normal'
            }
          }
        },
        position: 'right',
        axisLine: {
          show: false
        },
        axisTick: {
          show: false
        },
        axisLabel: {
          color: '#666',
          fontSize: 11,
          margin: 8
        },
        splitLine: {
          show: false
        }
      }
    ],
    series: [
      {
        name: '总数',
        type: 'line',
        data: trendData.value.map(item => item?.total || 0),
        smooth: true,
        smoothMonotone: 'x',
        lineStyle: {
          width: 4,
          color: '#5470c6',
          shadowColor: 'rgba(84, 112, 198, 0.3)',
          shadowBlur: 10,
          shadowOffsetY: 3
        },
        itemStyle: {
          color: '#ffffff',
          borderWidth: 3,
          borderColor: '#5470c6',
          shadowColor: 'rgba(84, 112, 198, 0.4)',
          shadowBlur: 8
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
            borderColor: '#5470c6',
            shadowBlur: 15,
            shadowColor: 'rgba(84, 112, 198, 0.6)'
          }
        }
      },
      {
        name: '错误',
        type: 'line',
        yAxisIndex: 1,
        data: trendData.value.map(item => item?.error || 0),
        smooth: true,
        smoothMonotone: 'x',
        lineStyle: {
          width: 4,
          color: '#ee6666',
          shadowColor: 'rgba(238, 102, 102, 0.3)',
          shadowBlur: 10,
          shadowOffsetY: 3
        },
        itemStyle: {
          color: '#ffffff',
          borderWidth: 3,
          borderColor: '#ee6666',
          shadowColor: 'rgba(238, 102, 102, 0.4)',
          shadowBlur: 8
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
            borderColor: '#ee6666',
            shadowBlur: 15,
            shadowColor: 'rgba(238, 102, 102, 0.6)'
          }
        }
      },
      {
        name: '警告',
        type: 'line',
        yAxisIndex: 1,
        data: trendData.value.map(item => item?.warning || 0),
        smooth: true,
        smoothMonotone: 'x',
        lineStyle: {
          width: 4,
          color: '#fac858',
          shadowColor: 'rgba(250, 200, 88, 0.3)',
          shadowBlur: 10,
          shadowOffsetY: 3
        },
        itemStyle: {
          color: '#ffffff',
          borderWidth: 3,
          borderColor: '#fac858',
          shadowColor: 'rgba(250, 200, 88, 0.4)',
          shadowBlur: 8
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
            borderColor: '#fac858',
            shadowBlur: 15,
            shadowColor: 'rgba(250, 200, 88, 0.6)'
          }
        }
      }
    ]
  }

  trendChart.value.setOption(option)
}

/**
 * 更新分类分布图
 */
const updateCategoryChart = () => {
  if (!categoryChart.value || !categoryStats.value.length) {
    return
  }

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
          value: item?.count || 0,
          name: getCategoryLabel(item?.category || ''),
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
      right: '12%',
      bottom: '3%',
      containLabel: true
    },
    xAxis: {
      type: 'value',
      name: '{success|日志数量}',
      nameTextStyle: {
        rich: {
          success: {
            backgroundColor: '#67c23a',
            color: '#fff',
            borderRadius: 4,
            padding: [4, 8],
            fontSize: 12,
            fontWeight: 'normal'
          }
        }
      }
    },
    yAxis: {
      type: 'category',
      name: '{info|模块名称}',
      nameTextStyle: {
        rich: {
          info: {
            backgroundColor: '#909399',
            color: '#fff',
            borderRadius: 4,
            padding: [4, 8],
            fontSize: 12,
            fontWeight: 'normal'
          }
        }
      },
      data: moduleStats.value.map(item => getModuleLabel(item?.module || ''))
    },
    series: [
      {
        name: '日志数量',
        type: 'bar',
        data: moduleStats.value.map(item => item?.count || 0),
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
      right: '12%',
      bottom: '3%',
      containLabel: true
    },
    xAxis: {
      type: 'value',
      name: '{warning|操作次数}',
      nameTextStyle: {
        rich: {
          warning: {
            backgroundColor: '#e6a23c',
            color: '#fff',
            borderRadius: 4,
            padding: [4, 8],
            fontSize: 12,
            fontWeight: 'normal'
          }
        }
      }
    },
    yAxis: {
      type: 'category',
      name: '{info|用户名称}',
      nameTextStyle: {
        rich: {
          info: {
            backgroundColor: '#909399',
            color: '#fff',
            borderRadius: 4,
            padding: [4, 8],
            fontSize: 12,
            fontWeight: 'normal'
          }
        }
      },
      data: topUsers.map(item => item?.username || '匿名用户')
    },
    series: [
      {
        name: '操作次数',
        type: 'bar',
        data: topUsers.map(item => item?.count || 0),
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
      data: categoryStats.value.map(item => getCategoryLabel(item?.category || ''))
    },
    yAxis: {
      type: 'value'
    },
    series: [
      {
        name: '错误数',
        type: 'bar',
        data: categoryStats.value.map(item => item?.errorCount || 0),
        itemStyle: { color: '#F56C6C' },
        barMaxWidth: 35  // 设置柱形最大宽度为35px
      },
      {
        name: '警告数',
        type: 'bar',
        data: categoryStats.value.map(item => item?.warningCount || 0),
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
    
    // 验证响应数据
    if (!response.data) {
      throw new Error('服务器返回的数据为空')
    }
    
    if (response.data.size === 0) {
      throw new Error('服务器返回的文件为空')
    }
    
    if (response.data.size < 1000) {
      // 尝试读取文件内容查看是否为错误信息
      const text = await response.data.text()
      if (text.includes('error') || text.includes('Error')) {
        throw new Error('服务器返回错误: ' + text)
      }
    }

    const blob = new Blob([response.data], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    })
    
    // 验证Blob对象
    if (blob.size === 0) {
      throw new Error('创建的Blob对象为空')
    }

    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    // 使用本地时间格式生成文件名，避免时区偏差
    const now = new Date()
    const localDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
    const fileName = `系统日志分析报告_${localDate}.xlsx`
    link.download = fileName
    
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)

    ElMessage.success('导出成功')
  } catch (error) {
    ElMessage.error('导出失败: ' + error.message)
  }
}

// 生命周期钩子
onMounted(async () => {
  // 设置默认时间范围（前7天到当前时间）
  const endDate = new Date()
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - 7) // 设置为前7天的同一时间
  
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

/* 统计卡片基础样式 */
.stats-card {
  border-radius: 12px;
  border: none;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
  transition: all 0.3s ease;
  overflow: hidden;
  position: relative;
}

.stats-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.1);
}

.stats-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 4px;
  background: linear-gradient(90deg, #409EFF, #67C23A);
}

/* 不同类型卡片的渐变背景 */
.stats-card-primary::before {
  background: linear-gradient(90deg, #409EFF, #79bbff);
}

.stats-card-danger::before {
  background: linear-gradient(90deg, #F56C6C, #f78989);
}

.stats-card-warning::before {
  background: linear-gradient(90deg, #E6A23C, #ebb563);
}

.stats-card-success::before {
  background: linear-gradient(90deg, #67C23A, #85ce61);
}

.stats-item {
  padding: 24px 20px;
  display: flex;
  align-items: center;
  gap: 16px;
}

.stats-icon {
  width: 60px;
  height: 60px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  flex-shrink: 0;
}

.stats-card-primary .stats-icon {
  background: linear-gradient(135deg, #409EFF, #79bbff);
  color: white;
}

.stats-card-danger .stats-icon {
  background: linear-gradient(135deg, #F56C6C, #f78989);
  color: white;
}

.stats-card-warning .stats-icon {
  background: linear-gradient(135deg, #E6A23C, #ebb563);
  color: white;
}

.stats-card-success .stats-icon {
  background: linear-gradient(135deg, #67C23A, #85ce61);
  color: white;
}

.stats-content {
  flex: 1;
  text-align: left;
}

.stats-value {
  font-size: 32px;
  font-weight: 700;
  color: #303133;
  margin-bottom: 4px;
  line-height: 1;
  font-family: 'Helvetica Neue', Arial, sans-serif;
}

.stats-label {
  font-size: 14px;
  color: #909399;
  font-weight: 500;
  margin: 0;
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

  /* 移动端统计卡片样式调整 */
  .stats-item {
    padding: 20px 16px;
    gap: 12px;
  }

  .stats-icon {
    width: 50px;
    height: 50px;
    font-size: 20px;
  }

  .stats-value {
    font-size: 28px;
  }

  .stats-label {
    font-size: 13px;
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