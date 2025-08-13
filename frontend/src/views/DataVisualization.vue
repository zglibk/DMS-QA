<template>
  <AppLayout>
    <div class="data-visualization-content">
      <!-- 页面标题 -->
      <div class="page-header">
      <h1 class="page-title">数据可视化大屏</h1>
      <div class="header-actions">
        <el-button type="primary" :icon="RefreshLeft" @click="refreshData">刷新数据</el-button>
        <el-button type="success" :icon="Download" @click="exportData">导出数据</el-button>
      </div>
    </div>

    <!-- 筛选条件区 -->
    <div class="filter-section">
      <el-form :inline="true" :model="filterForm" class="filter-form">
        <el-form-item label="时间范围">
          <el-date-picker
            v-model="filterForm.dateRange"
            type="daterange"
            range-separator="至"
            start-placeholder="开始日期"
            end-placeholder="结束日期"
            format="YYYY-MM-DD"
            value-format="YYYY-MM-DD"
            @change="handleFilterChange"
          />
        </el-form-item>
        <el-form-item label="部门">
          <el-select v-model="filterForm.department" placeholder="请选择部门" @change="handleFilterChange">
            <el-option label="全部" value="" />
            <el-option v-for="dept in departments" :key="dept" :label="dept" :value="dept" />
          </el-select>
        </el-form-item>
        <el-form-item label="车间">
          <el-select v-model="filterForm.workshop" placeholder="请选择车间" @change="handleFilterChange">
            <el-option label="全部" value="" />
            <el-option v-for="workshop in workshops" :key="workshop" :label="workshop" :value="workshop" />
          </el-select>
        </el-form-item>
        <el-form-item label="不良类别">
          <el-select v-model="filterForm.defectiveCategory" placeholder="请选择不良类别" @change="handleFilterChange">
            <el-option label="全部" value="" />
            <el-option v-for="category in defectiveCategories" :key="category.ID" :label="category.Name" :value="category.Name" />
          </el-select>
        </el-form-item>
      </el-form>
    </div>

    <!-- Tab标签页 -->
    <div class="tabs-section">
      <el-tabs v-model="activeTab" @tab-change="handleTabChange">
        <el-tab-pane label="总体概览" name="overview">
          <!-- 总计和小计卡片区 -->
          <div class="stats-cards">
            <div class="stat-card total-card">
              <div class="card-header">
                <h3>总投诉数</h3>
                <el-icon class="card-icon"><Document /></el-icon>
              </div>
              <div class="card-value">{{ statsData.totalComplaints }}</div>
              <div class="card-trend">
                <span :class="statsData.totalTrend >= 0 ? 'trend-up' : 'trend-down'">
                  {{ statsData.totalTrend >= 0 ? '↑' : '↓' }} {{ Math.abs(statsData.totalTrend) }}%
                </span>
              </div>
            </div>
            
            <div class="stat-card">
              <div class="card-header">
                <h3>内诉数量</h3>
                <el-icon class="card-icon"><WarningFilled /></el-icon>
              </div>
              <div class="card-value">{{ statsData.innerComplaints }}</div>
              <div class="card-trend">
                <span :class="statsData.innerTrend >= 0 ? 'trend-up' : 'trend-down'">
                  {{ statsData.innerTrend >= 0 ? '↑' : '↓' }} {{ Math.abs(statsData.innerTrend) }}%
                </span>
              </div>
            </div>

            <div class="stat-card">
              <div class="card-header">
                <h3>客诉数量</h3>
                <el-icon class="card-icon"><User /></el-icon>
              </div>
              <div class="card-value">{{ statsData.outerComplaints }}</div>
              <div class="card-trend">
                <span :class="statsData.outerTrend >= 0 ? 'trend-up' : 'trend-down'">
                  {{ statsData.outerTrend >= 0 ? '↑' : '↓' }} {{ Math.abs(statsData.outerTrend) }}%
                </span>
              </div>
            </div>

            <div class="stat-card">
              <div class="card-header">
                <h3>平均不良率</h3>
                <el-icon class="card-icon"><InfoFilled /></el-icon>
              </div>
              <div class="card-value">{{ statsData.avgDefectiveRate }}%</div>
              <div class="card-trend">
                <span :class="statsData.rateTrend >= 0 ? 'trend-up' : 'trend-down'">
                  {{ statsData.rateTrend >= 0 ? '↑' : '↓' }} {{ Math.abs(statsData.rateTrend) }}%
                </span>
              </div>
            </div>
          </div>

          <!-- 图表区域 -->
          <div class="charts-section">
            <div class="chart-container">
              <div class="chart-title">投诉趋势分析</div>
              <div class="chart-content" id="trendChart"></div>
            </div>
            <div class="chart-container">
              <div class="chart-title">车间对比分析</div>
              <div class="chart-content" id="workshopChart"></div>
            </div>
            <div class="chart-container">
              <div class="chart-title">不良类别分布</div>
              <div class="chart-content" id="categoryChart"></div>
            </div>
          </div>
        </el-tab-pane>

        <el-tab-pane label="趋势分析" name="trend">
          <div class="trend-analysis">
            <div class="chart-container full-width">
              <div class="chart-title">详细趋势分析</div>
              <div class="chart-content" id="detailTrendChart"></div>
            </div>
          </div>
        </el-tab-pane>

        <el-tab-pane label="对比分析" name="comparison">
          <div class="comparison-analysis">
            <div class="chart-container full-width">
              <div class="chart-title">多维度对比分析</div>
              <div class="chart-content" id="comparisonChart"></div>
            </div>
          </div>
        </el-tab-pane>

        <el-tab-pane label="分布分析" name="distribution">
          <div class="distribution-analysis">
            <div class="chart-container full-width">
              <div class="chart-title">数据分布分析</div>
              <div class="chart-content" id="distributionChart"></div>
            </div>
          </div>
        </el-tab-pane>

        <el-tab-pane label="明细数据" name="details">
          <!-- 清单滚动区域 -->
          <div class="details-section">
            <div class="details-header">
              <h3>最新投诉记录</h3>
              <el-button size="small" @click="refreshDetails">刷新</el-button>
            </div>
            <div class="scrolling-list">
              <div v-for="item in recentComplaints" :key="item.ID" class="list-item">
                <div class="item-date">{{ formatDate(item.Date) }}</div>
                <div class="item-content">
                  <span class="customer">{{ item.Customer }}</span>
                  <span class="product">{{ item.ProductName }}</span>
                  <span class="category">{{ item.ComplaintCategory }}</span>
                </div>
                <div class="item-status" :class="item.ComplaintCategory === '客诉' ? 'status-outer' : 'status-inner'">
                  {{ item.ComplaintCategory }}
                </div>
              </div>
            </div>
          </div>
        </el-tab-pane>
      </el-tabs>
    </div>
    </div>
  </AppLayout>
</template>

<script setup>
import { ref, onMounted, nextTick } from 'vue'
import { RefreshLeft, Download, Document, WarningFilled, InfoFilled } from '@element-plus/icons-vue'
import * as echarts from 'echarts'
import axios from 'axios'
import { ElMessage } from 'element-plus'
import AppLayout from '@/components/common/AppLayout.vue'

// 导航相关方法已移至 AppHeader 组件

// 响应式数据
const activeTab = ref('overview')
const filterForm = ref({
  dateRange: [],
  department: '',
  workshop: '',
  defectiveCategory: ''
})

// 基础数据
const departments = ref([])
const workshops = ref([])
const defectiveCategories = ref([])

// 统计数据
const statsData = ref({
  totalComplaints: 0,
  innerComplaints: 0,
  outerComplaints: 0,
  avgDefectiveRate: 0,
  totalTrend: 0,
  innerTrend: 0,
  outerTrend: 0,
  rateTrend: 0
})

// 最新投诉记录
const recentComplaints = ref([])

// 图表实例
let trendChart = null
let workshopChart = null
let categoryChart = null
let detailTrendChart = null
let comparisonChart = null
let distributionChart = null

// 方法
const refreshData = () => {
  ElMessage.success('数据刷新中...')
  fetchAllData()
}

const exportData = () => {
  ElMessage.info('导出功能开发中...')
}

const handleFilterChange = () => {
  fetchAllData()
}

const handleTabChange = (tabName) => {
  nextTick(() => {
    initCharts()
  })
}

const refreshDetails = () => {
  fetchRecentComplaints()
}

// 安全的日期格式化函数，避免时区转换问题
const formatDate = (dateStr) => {
  if (!dateStr) return ''
  
  // 如果已经是YYYY-MM-DD格式，直接返回
  if (typeof dateStr === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return dateStr
  }
  
  // 如果是其他格式，尝试解析并格式化
  try {
    const date = new Date(dateStr)
    if (isNaN(date.getTime())) return dateStr
    
    // 使用本地时区的年月日，避免UTC转换
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  } catch (error) {
    return dateStr
  }
}

// 导航相关方法已移至 AppHeader 组件

// 获取基础数据
const fetchBasicData = async () => {
  try {
    const token = localStorage.getItem('token')
    const res = await axios.get('/complaint/options', {
      headers: { Authorization: `Bearer ${token}` }
    })

    // 转换数据格式：从 [{Name: "xxx"}] 转换为 ["xxx"]，参考ComplaintForm的处理方式
    const data = res.data
    workshops.value = data.workshops?.map(item => item.Name) || []
    departments.value = data.departments?.map(item => item.Name) || []
    // 不良类别保持对象格式，因为需要ID和Name
    defectiveCategories.value = data.defectiveCategories || []


  } catch (error) {
    // 设置默认空数组
    workshops.value = []
    departments.value = []
    defectiveCategories.value = []
  }
}

// 获取统计数据
const fetchStatsData = async () => {
  try {
    const token = localStorage.getItem('token')
    // 这里先用模拟数据，后续需要创建专门的统计接口
    statsData.value = {
      totalComplaints: 156,
      innerComplaints: 89,
      outerComplaints: 67,
      avgDefectiveRate: 2.3,
      totalTrend: -5.2,
      innerTrend: -8.1,
      outerTrend: -2.3,
      rateTrend: -1.2
    }
  } catch (error) {
    // 获取统计数据失败，使用默认值
  }
}

// 获取最新投诉记录
const fetchRecentComplaints = async () => {
  try {
    const token = localStorage.getItem('token')
    const res = await axios.get('/complaint/list', {
      headers: { Authorization: `Bearer ${token}` },
      params: { page: 1, pageSize: 10 }
    })
    
    recentComplaints.value = res.data.data || []
  } catch (error) {
    // 获取最新投诉记录失败，使用空数组
  }
}

// 获取所有数据
const fetchAllData = async () => {
  await Promise.all([
    fetchBasicData(),
    fetchStatsData(),
    fetchRecentComplaints()
  ])
  
  nextTick(() => {
    initCharts()
  })
}

// 初始化图表
const initCharts = () => {
  // 根据当前标签页初始化对应图表
  if (activeTab.value === 'overview') {
    initOverviewCharts()
  } else if (activeTab.value === 'trend') {
    initTrendChart()
  } else if (activeTab.value === 'comparison') {
    initComparisonChart()
  } else if (activeTab.value === 'distribution') {
    initDistributionChart()
  }
}

// 初始化概览图表
const initOverviewCharts = () => {
  // 趋势图
  const trendEl = document.getElementById('trendChart')
  if (trendEl) {
    trendChart = echarts.init(trendEl)
    trendChart.setOption({
      tooltip: { trigger: 'axis' },
      legend: { data: ['内诉', '客诉'] },
      xAxis: { type: 'category', data: ['1月', '2月', '3月', '4月', '5月', '6月'] },
      yAxis: { type: 'value' },
      series: [
        { name: '内诉', type: 'line', data: [12, 19, 15, 17, 16, 25], smooth: true },
        { name: '客诉', type: 'line', data: [8, 12, 10, 14, 13, 18], smooth: true }
      ]
    })
  }

  // 车间对比图
  const workshopEl = document.getElementById('workshopChart')
  if (workshopEl) {
    workshopChart = echarts.init(workshopEl)
    workshopChart.setOption({
      tooltip: { trigger: 'axis' },
      xAxis: { type: 'category', data: ['数码印刷', '轮转机', '跟单', '设计', '品检'] },
      yAxis: { type: 'value' },
      series: [{
        type: 'bar',
        data: [23, 18, 15, 12, 8],
        itemStyle: { color: '#409EFF' }
      }]
    })
  }

  // 不良类别分布图
  const categoryEl = document.getElementById('categoryChart')
  if (categoryEl) {
    categoryChart = echarts.init(categoryEl)
    categoryChart.setOption({
      tooltip: { trigger: 'item' },
      series: [{
        type: 'pie',
        roseType: 'area',
        data: [
          { value: 25, name: '印刷不良' },
          { value: 20, name: '裁切不良' },
          { value: 18, name: '装订不良' },
          { value: 15, name: '表面不良' },
          { value: 12, name: '其他不良' }
        ]
      }]
    })
  }
}

// 其他图表初始化方法（占位）
const initTrendChart = () => {
  // 初始化趋势分析图表
}

const initComparisonChart = () => {
  // 初始化对比分析图表
}

const initDistributionChart = () => {
  // 初始化分布分析图表
}

// 生命周期
onMounted(() => {
  fetchAllData()
})
</script>

<style scoped>
.data-visualization-content {
  width: 100% !important;
  max-width: none !important;
  margin: 0 !important;
  padding: 0 !important;
  box-sizing: border-box !important;
}

/* 页面标题 */
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding: 20px;
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

.page-title {
  font-size: 24px;
  font-weight: bold;
  color: #303133;
  margin: 0;
}

.header-actions {
  display: flex;
  gap: 12px;
}

/* 筛选条件区 */
.filter-section {
  margin-bottom: 20px;
  padding: 20px;
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

.filter-form {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
}

/* Tab标签页 */
.tabs-section {
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  padding: 20px;
}

/* 统计卡片 */
.stats-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 20px;
  margin-bottom: 30px;
}

.stat-card {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 24px;
  border-radius: 12px;
  box-shadow: 0 4px 16px rgba(0,0,0,0.1);
  transition: transform 0.3s ease;
}

.stat-card:hover {
  transform: translateY(-4px);
}

.total-card {
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.card-header h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 500;
}

.card-icon {
  font-size: 24px;
  opacity: 0.8;
}

.card-value {
  font-size: 36px;
  font-weight: bold;
  margin-bottom: 8px;
}

.card-trend {
  font-size: 14px;
  opacity: 0.9;
}

.trend-up {
  color: #67c23a;
}

.trend-down {
  color: #f56c6c;
}

/* 图表区域 */
.charts-section {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
  gap: 20px;
}

.chart-container {
  background: #fff;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.05);
  border: 1px solid #e4e7ed;
}

.chart-container.full-width {
  grid-column: 1 / -1;
}

.chart-title {
  font-size: 16px;
  font-weight: bold;
  color: #303133;
  margin-bottom: 16px;
  padding-bottom: 8px;
  border-bottom: 2px solid #409eff;
}

.chart-content {
  height: 300px;
  width: 100%;
}

/* 明细数据区域 */
.details-section {
  background: #fff;
  border-radius: 8px;
  padding: 20px;
}

.details-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding-bottom: 12px;
  border-bottom: 1px solid #e4e7ed;
}

.details-header h3 {
  margin: 0;
  font-size: 18px;
  color: #303133;
}

.scrolling-list {
  max-height: 400px;
  overflow-y: auto;
}

.list-item {
  display: flex;
  align-items: center;
  padding: 12px 0;
  border-bottom: 1px solid #f0f2f5;
  transition: background-color 0.3s ease;
}

.list-item:hover {
  background-color: #f8f9fa;
}

.item-date {
  width: 100px;
  font-size: 12px;
  color: #909399;
}

.item-content {
  flex: 1;
  display: flex;
  gap: 16px;
}

.customer {
  font-weight: bold;
  color: #303133;
}

.product {
  color: #606266;
}

.category {
  color: #909399;
}

.item-status {
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: bold;
}

.status-inner {
  background: #e1f3d8;
  color: #67c23a;
}

.status-outer {
  background: #fde2e2;
  color: #f56c6c;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .data-visualization {
    padding: 10px;
  }

  .page-header {
    flex-direction: column;
    gap: 16px;
    text-align: center;
  }

  .filter-form {
    flex-direction: column;
  }

  .stats-cards {
    grid-template-columns: 1fr;
  }

  .charts-section {
    grid-template-columns: 1fr;
  }

  .item-content {
    flex-direction: column;
    gap: 4px;
  }
}
</style>
