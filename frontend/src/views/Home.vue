<template>
  <div class="home-bg">
    <!-- 顶部导航栏 -->
    <el-header class="home-header">
      <!-- 左侧logo及系统名 -->
      <div class="header-left">
        <img src="/logo.png" alt="logo" class="logo" />
        <span class="logo-text">质量数据管理系统</span>
      </div>
      <!-- 中间菜单栏 -->
      <div class="header-center">
        <div class="nav-menu-wrap">
          <el-menu mode="horizontal" :default-active="activeMenu" @select="handleMenuSelect" class="nav-menu" :ellipsis="false">
            <el-menu-item index="home">首页</el-menu-item>
            <el-menu-item index="complaint">投诉管理</el-menu-item>
            <el-menu-item index="stats">统计分析</el-menu-item>
          </el-menu>
        </div>
      </div>
      <!-- 右侧用户区 -->
      <div class="header-right">
        <el-button type="primary" size="small" class="admin-btn" @click="goAdmin">登录后台</el-button>
        <el-avatar :size="32" :src="user.Avatar" class="avatar-icon" @click="goProfile">
          <template v-if="!user.Avatar">
            <el-icon><User /></el-icon>
          </template>
        </el-avatar>
        <span class="username" @click="goProfile">{{ user.Username }}</span>
        <el-dropdown>
          <span class="el-dropdown-link">
            <el-icon><arrow-down /></el-icon>
          </span>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item @click="goProfile">个人中心</el-dropdown-item>
              <el-dropdown-item divided @click="logout">退出登录</el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
      </div>
    </el-header>

    <!-- 内容区 -->
    <el-main class="home-main">
      <!-- 上部统计卡片区 -->
      <div class="stat-row-flex">
        <div class="stat-card card-today">
          <div class="stat-title">今日投诉</div>
          <div class="stat-value"><b>{{ todayCount }}</b></div>
        </div>
        <div class="stat-card card-month">
          <div class="stat-title">本月总投诉</div>
          <div class="stat-value"><b>{{ monthCount }}</b></div>
        </div>
        <!-- 各单位统计卡片 -->
        <div v-for="(item, idx) in statUnits" :key="item.unit + idx" :class="['stat-card', 'unit-card', 'card-unit' + idx]">
          <div class="stat-title">{{ item.unit }}</div>
          <div class="stat-value" style="display: flex; justify-content: center; align-items: center; gap: 8px;">
            <span>内诉: <b>{{ item.inner }}</b></span>
            <span>|</span>
            <span>客诉: <b>{{ item.outer }}</b></span>
          </div>
        </div>
      </div>

      <!-- 中部左右结构 -->
      <el-row :gutter="20" class="middle-row">
        <el-col :span="21">
          <!-- 历史投诉记录表格卡片 -->
          <el-card class="table-card">
            <div class="table-title">历史投诉记录</div>
            <el-table :data="tableData" style="width: 100%">
              <!-- 各字段列 -->
              <el-table-column prop="Date" label="日期" width="120">
                <template #default="scope">
                  {{ scope.row.Date ? (scope.row.Date.length > 10 ? scope.row.Date.slice(0, 10) : scope.row.Date) : '' }}
                </template>
              </el-table-column>
              <el-table-column prop="Customer" label="客户编号" width="120" />
              <el-table-column prop="OrderNo" label="工单号" width="120" />
              <el-table-column prop="ProductName" label="产品名称" width="120" />
              <el-table-column prop="Workshop" label="发生车间" width="120" />
              <el-table-column prop="ComplaintCategory" label="投诉类别" width="120" />
              <el-table-column prop="DefectiveCategory" label="不良类别" width="120" />
              <el-table-column prop="DefectiveItem" label="不良项" width="120" />
              <el-table-column prop="DefectiveDescription" label="不良描述" width="180" />
              <el-table-column prop="MainDept" label="主责部门" width="120" />
              <el-table-column prop="MainPerson" label="主责人" width="120" />
              <el-table-column label="操作" width="100">
                <template #default>
                  <el-button type="text" size="small">详情</el-button>
                </template>
              </el-table-column>
            </el-table>
            <!-- 分页控件 -->
            <div style="margin: 16px 0 0; display: flex; align-items: center; justify-content: flex-end;">
              <el-pagination
                background
                layout="prev, pager, next, jumper"
                :total="total"
                :page-size="pageSize"
                :current-page="page"
                @current-change="handlePageChange"
                @update:current-page="handlePageChange"
                style="margin-right: 16px;"
              />
            </div>
          </el-card>
          <!-- 统计分析图表卡片 -->
          <el-card class="chart-card">
            <div class="chart-title">统计分析图表</div>
            <!-- 图表筛选条件区 -->
            <div class="chart-filter-row">
              <el-form :inline="true" size="small" @submit.prevent>
                <el-form-item label="部门">
                  <el-select v-model="chartFilter.department" placeholder="请选择部门" style="width:120px" @change="fetchChartData">
                    <el-option v-for="item in chartOptions.departments" :key="item" :label="item" :value="item" />
                  </el-select>
                </el-form-item>
                <el-form-item label="车间">
                  <el-select v-model="chartFilter.workshop" placeholder="请选择车间" style="width:120px" @change="fetchChartData">
                    <el-option v-for="item in chartOptions.workshops" :key="item" :label="item" :value="item" />
                  </el-select>
                </el-form-item>
                <el-form-item label="不良项">
                  <el-select v-model="chartFilter.defectiveItem" placeholder="请选择不良项" style="width:120px" @change="fetchChartData">
                    <el-option v-for="item in chartOptions.defectiveItems" :key="item" :label="item" :value="item" />
                  </el-select>
                </el-form-item>
                <el-form-item label="日期">
                  <el-date-picker v-model="chartFilter.dateRange" type="daterange" range-separator="至" start-placeholder="开始日期" end-placeholder="结束日期" style="width:220px" @change="fetchChartData" />
                </el-form-item>
              </el-form>
            </div>
            <!-- 图表区 -->
            <div class="chart-content-flex">
              <div class="chart-box"><div class="chart-label">{{ getChartTitle('柱形图') }}</div><div class="chart-ec" id="barChart"></div></div>
              <div class="chart-box"><div class="chart-label">{{ getChartTitle('趋势图') }}</div><div class="chart-ec" id="lineChart"></div></div>
              <div class="chart-box"><div class="chart-label">{{ getChartTitle('占比分析图') }}</div><div class="chart-ec" id="roseChart"></div></div>
            </div>
          </el-card>
        </el-col>
        <!-- 右侧高级查询卡片 -->
        <el-col :span="3">
          <el-card class="query-card">
            <div class="query-title">高级查询</div>
            <el-form label-width="60px">
              <el-form-item label="客户">
                <el-input size="small" />
              </el-form-item>
              <el-form-item label="状态">
                <el-select size="small">
                  <el-option label="全部" value="" />
                  <el-option label="待处理" value="待处理" />
                  <el-option label="已完成" value="已完成" />
                </el-select>
              </el-form-item>
              <el-form-item>
                <el-button type="primary" size="small">查询</el-button>
              </el-form-item>
            </el-form>
          </el-card>
        </el-col>
      </el-row>
    </el-main>

    <!-- 底部版权栏 -->
    <el-footer class="home-footer">
      © 2024 质量数据管理系统 版权所有
    </el-footer>
  </div>
</template>

<script setup>
import { ref, onMounted, computed, watch } from 'vue'
import { ArrowDown, User } from '@element-plus/icons-vue'
import { useRouter } from 'vue-router'
import axios from 'axios'
import { ElPagination } from 'element-plus'
import * as echarts from 'echarts'
import { nextTick } from 'vue'
import { useUserStore } from '../store/user'
import { storeToRefs } from 'pinia'
import { ElMessage } from 'element-plus'

const router = useRouter()
const activeMenu = ref('home')
const tableData = ref([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(10)
const gotoPage = ref(1)
const pageCount = computed(() => Math.ceil(total.value / pageSize.value))
const todayCount = ref(0)
const monthCount = ref(0)
const statUnits = ref([
  { unit: '数码印刷', inner: 0, outer: 0 },
  { unit: '轮转机', inner: 0, outer: 0 },
  { unit: '跟单', inner: 0, outer: 0 },
  { unit: '设计', inner: 0, outer: 0 },
  { unit: '品检', inner: 0, outer: 0 }
])

const chartFilter = ref({
  department: '',
  workshop: '',
  defectiveItem: '',
  dateRange: [],
  chartType: 'bar'
})
const chartOptions = ref({
  departments: [],
  workshops: [],
  defectiveItems: []
})

const userStore = useUserStore()
const { user } = storeToRefs(userStore)

const fetchProfile = async () => {
  const token = localStorage.getItem('token')
  const res = await axios.get('/api/auth/profile', {
    headers: { Authorization: `Bearer ${token}` }
  })
  if (res.data.success) {
    user.value = res.data.data
  }
}

const handleMenuSelect = (index) => {
  activeMenu.value = index
  if (index === 'complaint') {
    router.push('/add')
  }
}
const goProfile = () => {
  router.push('/profile')
}
const logout = () => {
  // 清除token并跳转登录
  localStorage.removeItem('token')
  window.location.href = '/login'
}
const goAdmin = () => {
  // 权限校验：仅admin或有后台权限的用户可进入
  if (user.value.Role === 'admin') {
    router.push('/admin/dashboard')
  } else {
    ElMessage.error('无后台权限')
  }
}

const fetchTableData = async () => {
  try {
    const token = localStorage.getItem('token')
    const res = await axios.get('/api/complaint/list', {
      params: { page: page.value, pageSize: pageSize.value },
      headers: { Authorization: `Bearer ${token}` }
    })
    if (res.data.success) {
      tableData.value = res.data.data
      total.value = res.data.total
    }
  } catch (e) {
    tableData.value = []
    total.value = 0
  }
}

const fetchStats = async () => {
  try {
    const token = localStorage.getItem('token')
    const res = await axios.get('/api/complaint/month-stats', {
      headers: { Authorization: `Bearer ${token}` }
    })
    if (res.data.success) {
      todayCount.value = res.data.todayCount
      monthCount.value = res.data.monthCount
      statUnits.value = res.data.units
    }
  } catch (e) {}
}

const fetchChartOptions = async () => {
  try {
    const token = localStorage.getItem('token')
    const res = await axios.get('/api/complaint/options', {
      headers: { Authorization: `Bearer ${token}` }
    })
    chartOptions.value.departments = res.data.departments || []
    chartOptions.value.workshops = res.data.workshops || []
    chartOptions.value.defectiveItems = res.data.defectiveItems || []
  } catch (e) {}
}

const demoBarData = {
  x: ['数码印刷', '轮转机', '跟单', '设计', '品检', '品检2', '品检3'],
  y: [12, 20, 15, 8, 18, 10, 7]
}
const demoLineData = {
  x: ['一月', '二月', '三月', '四月', '五月', '六月'],
  y: [5, 8, 6, 12, 10, 15]
}
const demoRoseData = [
  { value: 10, name: '印刷不良' },
  { value: 15, name: '裁切不良' },
  { value: 8, name: '装订不良' },
  { value: 20, name: '表面不良' },
  { value: 12, name: '其它不良' }
]
const renderCharts = () => {
  // 柱形图
  const barChart = echarts.init(document.getElementById('barChart'))
  barChart.setOption({
    tooltip: {},
    xAxis: { type: 'category', data: demoBarData.x, axisLine: { show: true }, axisTick: { show: true }, splitLine: { show: false } },
    yAxis: { type: 'value', axisLine: { show: true }, axisTick: { show: true }, splitLine: { show: false } },
    grid: { show: false, left: 30, right: 20, top: 30, bottom: 30 },
    series: [{ type: 'bar', data: demoBarData.y, itemStyle: { color: '#409EFF' } }]
  })
  // 折线图
  const lineChart = echarts.init(document.getElementById('lineChart'))
  lineChart.setOption({
    tooltip: {},
    xAxis: { type: 'category', data: demoLineData.x, axisLine: { show: true }, axisTick: { show: true }, splitLine: { show: false } },
    yAxis: { type: 'value', axisLine: { show: true }, axisTick: { show: true }, splitLine: { show: false } },
    grid: { show: false, left: 30, right: 20, top: 30, bottom: 30 },
    series: [{ type: 'line', data: demoLineData.y, smooth: true, lineStyle: { color: '#67C23A' } }]
  })
  // 玫瑰图
  const roseChart = echarts.init(document.getElementById('roseChart'))
  roseChart.setOption({
    tooltip: {},
    legend: { show: false },
    series: [{
      name: '不良项',
      type: 'pie',
      radius: ['30%', '70%'],
      roseType: 'radius',
      data: demoRoseData,
      label: { show: true, fontWeight: 'bold' }
    }]
  })
}
const fetchChartData = () => {
  // 预留：根据chartFilter自动刷新3个图表
  nextTick(() => renderCharts())
}

const handlePageChange = (val) => {
  page.value = val
  gotoPage.value = val
  fetchTableData()
}
const jumpToPage = (val) => {
  if (val >= 1 && val <= pageCount.value) {
    page.value = val
    fetchTableData()
  }
}

watch(pageCount, (val) => {
  if (val === 0) {
    gotoPage.value = 1
  } else if (gotoPage.value > val) {
    gotoPage.value = val
  }
})

function getChartTitle(type) {
  let year = ''
  let month = ''
  if (chartFilter.value.dateRange && chartFilter.value.dateRange.length === 2) {
    const start = chartFilter.value.dateRange[0]
    const end = chartFilter.value.dateRange[1]
    if (start && end && start !== end) {
      year = `${new Date(start).getFullYear()}-${(new Date(start).getMonth()+1).toString().padStart(2,'0')}`
      month = `${new Date(end).getFullYear()}-${(new Date(end).getMonth()+1).toString().padStart(2,'0')}`
      return `${year} 至 ${month} 投诉${type}`
    }
  }
  const now = new Date()
  year = now.getFullYear()
  month = (now.getMonth()+1).toString().padStart(2,'0')
  return `${year}年${month}月投诉${type}`
}

onMounted(() => {
  fetchStats()
  fetchTableData()
  fetchChartOptions()
  fetchProfile()
  nextTick(() => renderCharts())
})
</script>

<style>
html, body {
  margin: 0;
  padding: 0;
  overflow-x: hidden;
  overflow-y: hidden;
}
body::-webkit-scrollbar {
  display: none;
}
</style>

<style scoped>
.home-bg {
  min-height: 100vh;
  background: #f5f6fa;
  display: flex;
  flex-direction: column;
}
.home-header {
  background: #fff;
  box-shadow: 0 0.125rem 0.5rem 0 rgba(0,0,0,0.04);
  display: flex;
  align-items: center;
  height: 4rem;
  padding: 0 2.5rem;
  justify-content: space-between;
  position: sticky;
  top: 0;
  z-index: 100;
}
.header-left {
  display: flex;
  align-items: center;
}
.logo {
  height: 2.25rem;
  margin-right: 0.625rem;
}
.logo-text {
  font-size: 1.25rem;
  font-weight: bold;
  color: #b0b4ba;
}
.header-center {
  flex: 1;
  display: flex;
  justify-content: center;
  align-items: center;
  min-width: 0;
}
.nav-menu-wrap {
  display: flex;
  justify-content: center;
  align-items: center;
}
.nav-menu {
  background: transparent;
  border-bottom: none;
  display: inline-block;
  min-width: 0;
  flex-shrink: 0;
}
.nav-menu :deep(.el-menu-item) {
  background: transparent !important;
  position: relative;
}
.nav-menu :deep(.el-menu-item)::after {
  content: '';
  display: block;
  position: absolute;
  left: 50%;
  bottom: 0;
  width: 0;
  height: 2.5px;
  background: #409EFF;
  border-radius: 2px;
  transition: width 0.2s, left 0.2s;
}
.nav-menu :deep(.el-menu-item:hover)::after,
.nav-menu :deep(.el-menu-item.is-active)::after {
  width: 60%;
  left: 20%;
}
.nav-menu :deep(.el-menu-item:hover),
.nav-menu :deep(.el-menu-item.is-active) {
  background: transparent !important;
  color: #409EFF !important;
  box-shadow: none !important;
  border-bottom: none !important;
}
.header-right {
  display: flex;
  align-items: center;
  gap: 0.625rem;
}
.admin-btn {
  margin-right: 0.625rem;
}
.avatar-icon {
  background: #e6e6e6;
  color: #409EFF;
  cursor: pointer;
}
.username {
  margin: 0 0.5rem;
  font-weight: 500;
  cursor: pointer;
}
.home-main {
  flex: 1;
  padding: 2rem 2.5rem 0 2.5rem;
  overflow: visible;
}
.stat-row-flex {
  display: flex;
  flex-wrap: nowrap;
  gap: 1.25rem;
  margin-bottom: 1.5rem;
}
.stat-row-flex .stat-card {
  flex: 1 1 0;
  min-width: 0;
  margin: 0;
  height: 6.875rem;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  border-radius: 1rem;
  box-shadow: 0 0 0.625rem #ddd;
  text-align: center;
  border: none;
}
.stat-title {
  font-size: 1.25rem;
  font-weight: bold;
  margin-bottom: 0.5rem;
  text-align: center;
}
.stat-value {
  font-size: 1rem;
  font-weight: normal;
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 0.5rem;
  text-align: center;
}
.stat-value b {
  font-size: 1.75rem;
  font-weight: bold;
  color: #fff !important;
  margin: 0 0.125rem;
  text-shadow: 0 0 0.625rem #ddd;
}
.middle-row {
  margin-bottom: 1.5rem;
}
.table-card {
  background: #fff;
  border-radius: 0.5rem;
  box-shadow: 0 0.125rem 0.5rem 0 rgba(0,0,0,0.06);
  margin-bottom: 1.5rem;
}
.table-title {
  font-size: 1rem;
  font-weight: bold;
  margin-bottom: 0.625rem;
}
.query-card {
  background: #fff;
  border-radius: 0.5rem;
  box-shadow: 0 0.125rem 0.5rem 0 rgba(0,0,0,0.06);
  height: auto;
  min-height: unset;
  display: block;
}
.query-title {
  font-size: 0.95rem;
  font-weight: bold;
  margin-bottom: 0.625rem;
}
.chart-card {
  background: #fff;
  border-radius: 0.5rem;
  box-shadow: 0 0.125rem 0.5rem 0 rgba(0,0,0,0.06);
}
.chart-title {
  font-size: 1rem;
  font-weight: bold;
  margin-bottom: 0.625rem;
}
.home-footer {
  background: #fff;
  color: #888;
  text-align: center;
  padding: 1rem 0 0.5rem 0;
  font-size: 0.9rem;
  letter-spacing: 1px;
  box-shadow: 0 -0.0625rem 0.375rem 0 rgba(0,0,0,0.03);
}
.unit-card {
  /* 只保留阴影和无边框，不设置background，避免覆盖子类 */
  box-shadow: 0 0 10px #ddd !important;
  border: none !important;
}
.card-today {
  background: #67C23A !important; /* el-success 主色 */
  color: #fff !important;
  border: none !important;
}
.card-month {
  background: #E6A23C !important; /* el-warning 主色 */
  color: #fff !important;
  border: none !important;
}
.card-unit0 {
  background: #409EFF !important;
  color: #fff !important;
  border: none !important;
}
.card-unit1 {
  background: #F56C6C !important;
  color: #fff !important;
  border: none !important;
}
.card-unit2 {
  background: #909399 !important;
  color: #fff !important;
  border: none !important;
}
.card-unit3 {
  background: #F4D06F !important;
  color: #fff !important;
  border: none !important;
}
.card-unit4 {
  background: #5A78D5 !important;
  color: #fff !important;
  border: none !important;
}
.card-unit5 {
  background: #E6A23C !important;
  color: #fff !important;
  border: none !important;
}
.card-unit6 {
  background: #5470C6 !important;
  color: #fff !important;
  border: none !important;
}
.stat-label {
  font-size: 13px;
  color: #409EFF;
  margin-left: 2px;
}
.el-dropdown-link:focus,
.el-dropdown-link:focus-visible,
.el-dropdown-link:active {
  outline: none !important;
  box-shadow: none !important;
  border: none !important;
}
.chart-filter-row {
  margin-bottom: 10px;
  padding: 0 10px;
}
.chart-content-flex {
  display: flex;
  justify-content: center;
  align-items: stretch;
  gap: 15px;
  margin-top: 8px;
  padding: 0 15px;
  box-sizing: border-box;
}
.chart-box {
  flex: 1 1 0;
  min-width: 0;
  background: #fafbfc;
  border-radius: 8px;
  min-height: 240px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  box-shadow: 0 4px 16px 0 rgba(64,158,255,0.10);
  border: 1.5px solid #e0e3ea;
  padding: 8px 0 0 0;
  box-sizing: border-box;
}
.chart-label {
  font-size: 15px;
  font-weight: bold;
  margin-bottom: 4px;
  color: #409EFF;
}
.chart-ec {
  width: 100%;
  height: 200px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #bbb;
}
.admin-main, .main, .home-main {
  background: #fafbfc;
}
@media (max-width: 600px) {
  .home-header, .home-main { padding-left: 1rem; padding-right: 1rem; }
  .stat-row-flex { flex-direction: column; gap: 0.75rem; }
  .stat-row-flex .stat-card { height: 5rem; border-radius: 0.5rem; }
  .home-footer { font-size: 0.8rem; }
}
</style> 