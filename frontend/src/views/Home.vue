<!--
  DMS-QA Quality Management System
  Copyright (c) 2024-2025 David Lee (zglibk)

  Licensed under the Apache License, Version 2.0 (the "License");
  you may not use this file except in compliance with the License.
  You may obtain a copy of the License at

      http://www.apache.org/licenses/LICENSE-2.0

  Unless required by applicable law or agreed to in writing, software
  distributed under the License is distributed on an "AS IS" BASIS,
  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
  See the License for the specific language governing permissions and
  limitations under the License.
-->

<template>
  <div class="home-bg">
    <!-- 顶部导航栏 -->
    <div class="home-header">
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
    </div>

    <!-- 内容区 -->
    <div class="home-main">
        <!-- 上部统计卡片区 -->
      <div class="stat-row-flex">
        <!-- 今日投诉卡片 -->
        <div v-if="showTodayCount" class="stat-card card-today">
          <div class="stat-title">今日投诉</div>
          <div class="stat-value"><b>{{ todayCount }}</b></div>
        </div>

        <!-- 本月总投诉卡片 -->
        <div v-if="showMonthCount" class="stat-card card-month">
          <div class="stat-title">本月总投诉</div>
          <div class="stat-value"><b>{{ monthCount }}</b></div>
        </div>

        <!-- 各单位统计卡片 -->
        <div
          v-for="(item, idx) in statUnits"
          :key="item.unit + idx"
          :class="['stat-card', 'unit-card', getUnitCardClass(item.type, idx)]"
        >
          <div class="stat-title">
            {{ item.unit }}
            <el-tag
              size="small"
              :type="item.type === 'workshop' ? 'primary' : 'success'"
              style="margin-left: 4px; font-size: 10px;"
            >
              {{ item.type === 'workshop' ? '车间' : '部门' }}
            </el-tag>
          </div>
          <div class="stat-value" style="display: flex; justify-content: center; align-items: center; gap: 8px;">
            <span>内诉: <b>{{ item.inner }}</b></span>
            <span>|</span>
            <span>客诉: <b>{{ item.outer }}</b></span>
          </div>
        </div>
      </div>

      <!-- 中部左右结构 -->
      <div class="middle-row">
        <div class="table-container">
          <!-- 历史投诉记录表格卡片 -->
          <el-card class="table-card complaint-table-card">
            <template #header>
              <div class="table-header">
                <div class="table-title">
                  <el-icon><Document /></el-icon>
                  <span>历史投诉记录</span>
                </div>
                <div class="table-actions">
                  <el-input
                    v-model="searchKeyword"
                    placeholder="搜索客户、工单号、产品名称..."
                    clearable
                    style="width: 280px;"
                    @keyup.enter="handleSimpleSearch"
                    @clear="handleSimpleSearch"
                  >
                    <template #append>
                      <el-button :icon="Search" @click="handleSimpleSearch" />
                    </template>
                  </el-input>
                  <el-button type="primary" @click="router.push('/add')" style="margin-left: 12px;">
                    <el-icon><Plus /></el-icon>
                    新增投诉
                  </el-button>
                </div>
              </div>
            </template>

            <el-table
              :data="tableData"
              style="width: 100%;"
              stripe
              :loading="tableLoading"
              empty-text="暂无投诉记录"
            >
              <el-table-column label="#" type="index" width="60" :index="(index) => (page - 1) * pageSize + index + 1" />
              <el-table-column prop="Date" label="日期" width="110" sortable>
                <template #default="scope">
                  <el-tag type="info" size="small">
                    {{ scope.row.Date ? (scope.row.Date.length > 10 ? scope.row.Date.slice(0, 10) : scope.row.Date) : '' }}
                  </el-tag>
                </template>
              </el-table-column>
              <el-table-column prop="Customer" label="客户编号" width="120" show-overflow-tooltip />
              <el-table-column prop="OrderNo" label="工单号" width="130" show-overflow-tooltip />
              <el-table-column prop="ProductName" label="产品名称" width="140" show-overflow-tooltip />
              <el-table-column prop="Workshop" label="发生车间" width="110">
                <template #default="scope">
                  <el-tag size="small" :type="getWorkshopTagType(scope.row.Workshop)">
                    {{ scope.row.Workshop }}
                  </el-tag>
                </template>
              </el-table-column>
              <el-table-column prop="ComplaintCategory" label="投诉类别" width="110">
                <template #default="scope">
                  <el-tag size="small" :type="scope.row.ComplaintCategory === '客诉' ? 'danger' : 'warning'">
                    {{ scope.row.ComplaintCategory }}
                  </el-tag>
                </template>
              </el-table-column>
              <el-table-column prop="DefectiveCategory" label="不良类别" width="120" show-overflow-tooltip />
              <el-table-column prop="DefectiveItem" label="不良项" width="120" show-overflow-tooltip />
              <el-table-column prop="DefectiveDescription" label="不良描述" width="150" show-overflow-tooltip />
              <el-table-column prop="MainDept" label="主责部门" width="110" show-overflow-tooltip />
              <el-table-column prop="MainPerson" label="主责人" width="100" show-overflow-tooltip />
              <el-table-column label="操作" width="120" fixed="right">
                <template #default="scope">
                  <el-button type="primary" :icon="View" size="small" @click="viewDetail(scope.row)">
                    详情
                  </el-button>
                </template>
              </el-table-column>
            </el-table>

            <!-- 分页器 -->
            <div class="table-footer">
              <el-pagination
                background
                layout="total, sizes, prev, pager, next, jumper"
                :total="total"
                :page-size="pageSize"
                :current-page="page"
                :page-sizes="pageSizes"
                @size-change="handleSizeChange"
                @current-change="handlePageChange"
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
        </div>
        <!-- 右侧高级查询卡片 -->
        <div :span="4">
          <el-card class="query-card">
            <template #header>
              <div class="query-header">
                <el-icon><Search /></el-icon>
                <span>高级查询</span>
              </div>
            </template>

            <el-form :model="advancedQuery" label-width="70px" size="small" class="advanced-form">
              <!-- 客户查询 -->
              <el-form-item label="客户">
                <el-input
                  v-model="advancedQuery.customer"
                  placeholder="输入客户名称"
                  clearable
                />
              </el-form-item>

              <!-- 工单号查询 -->
              <el-form-item label="工单号">
                <el-input
                  v-model="advancedQuery.orderNo"
                  placeholder="输入工单号"
                  clearable
                />
              </el-form-item>

              <!-- 车间查询 -->
              <el-form-item label="车间">
                <el-select
                  v-model="advancedQuery.workshop"
                  placeholder="选择车间"
                  clearable
                  style="width: 100%"
                >
                  <el-option label="全部" value="" />
                  <el-option
                    v-for="workshop in workshopOptions"
                    :key="workshop"
                    :label="workshop"
                    :value="workshop"
                  />
                </el-select>
              </el-form-item>

              <!-- 投诉类别 -->
              <el-form-item label="类别">
                <el-select
                  v-model="advancedQuery.complaintCategory"
                  placeholder="选择类别"
                  clearable
                  style="width: 100%"
                >
                  <el-option label="全部" value="" />
                  <el-option label="内诉" value="内诉" />
                  <el-option label="客诉" value="客诉" />
                </el-select>
              </el-form-item>

              <!-- 日期范围 -->
              <el-form-item label="日期">
                <el-date-picker
                  v-model="advancedQuery.dateRange"
                  type="daterange"
                  range-separator="至"
                  start-placeholder="开始日期"
                  end-placeholder="结束日期"
                  format="YYYY-MM-DD"
                  value-format="YYYY-MM-DD"
                  style="width: 100%"
                  size="small"
                />
              </el-form-item>

              <!-- 不良率范围 -->
              <el-form-item label="不良率">
                <div class="rate-range">
                  <el-input-number
                    v-model="advancedQuery.defectiveRateMin"
                    :min="0"
                    :max="100"
                    :precision="2"
                    placeholder="最小值"
                    style="width: 70px"
                    size="small"
                  />
                  <span style="margin: 0 8px; color: #909399;">-</span>
                  <el-input-number
                    v-model="advancedQuery.defectiveRateMax"
                    :min="0"
                    :max="100"
                    :precision="2"
                    placeholder="最大值"
                    style="width: 70px"
                    size="small"
                  />
                  <span style="margin-left: 4px; color: #909399; font-size: 12px;">%</span>
                </div>
              </el-form-item>

              <!-- 操作按钮 -->
              <el-form-item>
                <div class="query-actions">
                  <el-button
                    type="primary"
                    size="small"
                    @click="handleAdvancedQuery"
                    :loading="loading"
                  >
                    <el-icon><Search /></el-icon>
                    查询
                  </el-button>
                  <el-button
                    size="small"
                    @click="resetAdvancedQuery"
                  >
                    <el-icon><RefreshLeft /></el-icon>
                    重置
                  </el-button>
                </div>
              </el-form-item>
            </el-form>
          </el-card>
        </div>
      </div>
    </div>

    <!-- 底部版权栏 -->
    <div class="home-footer">
      © 2024 质量数据管理系统 版权所有
    </div>

    <!-- 详情查看弹窗 -->
    <el-dialog
      v-model="showDetailDialog"
      title="投诉记录详情"
      width="85%"
      :close-on-click-modal="false"
      :modal="true"
      :lock-scroll="true"
      class="detail-dialog"
      top="5vh"
    >
      <div v-if="detailData" class="detail-content">
        <!-- 基本信息 -->
        <el-card class="detail-card" shadow="never">
          <template #header>
            <div class="detail-card-header">
              <el-icon><InfoFilled /></el-icon>
              <span>基本信息</span>
            </div>
          </template>
          <el-row :gutter="20">
            <el-col :span="8">
              <div class="detail-item">
                <label>记录ID：</label>
                <span>{{ detailData.ID }}</span>
              </div>
            </el-col>
            <el-col :span="8">
              <div class="detail-item">
                <label>投诉日期：</label>
                <span>{{ formatDate(detailData.Date) }}</span>
              </div>
            </el-col>
            <el-col :span="8">
              <div class="detail-item">
                <label>客户编号：</label>
                <span>{{ detailData.Customer }}</span>
              </div>
            </el-col>
            <el-col :span="8">
              <div class="detail-item">
                <label>工单号：</label>
                <span>{{ detailData.OrderNo }}</span>
              </div>
            </el-col>
            <el-col :span="8">
              <div class="detail-item">
                <label>产品名称：</label>
                <span>{{ detailData.ProductName }}</span>
              </div>
            </el-col>
            <el-col :span="8">
              <div class="detail-item">
                <label>规格：</label>
                <span>{{ detailData.Specification || '-' }}</span>
              </div>
            </el-col>
            <el-col :span="8">
              <div class="detail-item">
                <label>车间：</label>
                <span>{{ detailData.Workshop }}</span>
              </div>
            </el-col>
            <el-col :span="8">
              <div class="detail-item">
                <label>生产数量：</label>
                <span>{{ detailData.ProductionQty }}</span>
              </div>
            </el-col>
            <el-col :span="8">
              <div class="detail-item">
                <label>不良数量：</label>
                <span>{{ detailData.DefectiveQty }}</span>
              </div>
            </el-col>
          </el-row>
        </el-card>

        <!-- 投诉信息 -->
        <el-card class="detail-card" shadow="never">
          <template #header>
            <div class="detail-card-header">
              <el-icon><WarningFilled /></el-icon>
              <span>投诉信息</span>
            </div>
          </template>
          <el-row :gutter="20">
            <el-col :span="8">
              <div class="detail-item">
                <label>投诉类别：</label>
                <span>{{ detailData.ComplaintCategory }}</span>
              </div>
            </el-col>
            <el-col :span="8">
              <div class="detail-item">
                <label>客户投诉类型：</label>
                <span>{{ detailData.CustomerComplaintType || '-' }}</span>
              </div>
            </el-col>
            <el-col :span="8">
              <div class="detail-item">
                <label>不良率：</label>
                <span>{{ detailData.DefectiveRate }}%</span>
              </div>
            </el-col>
            <el-col :span="12">
              <div class="detail-item">
                <label>不良类别：</label>
                <span>{{ detailData.DefectiveCategory || '-' }}</span>
              </div>
            </el-col>
            <el-col :span="12">
              <div class="detail-item">
                <label>不良项目：</label>
                <span>{{ detailData.DefectiveItem }}</span>
              </div>
            </el-col>
            <el-col :span="24">
              <div class="detail-item">
                <label>不良描述：</label>
                <div class="detail-text">{{ detailData.DefectiveDescription }}</div>
              </div>
            </el-col>
            <el-col :span="24">
              <div class="detail-item">
                <label>不良原因：</label>
                <div class="detail-text">{{ detailData.DefectiveReason || '-' }}</div>
              </div>
            </el-col>
            <el-col :span="24">
              <div class="detail-item">
                <label>处置措施：</label>
                <div class="detail-text">{{ detailData.Disposition }}</div>
              </div>
            </el-col>
          </el-row>
        </el-card>

        <!-- 责任信息 -->
        <el-card class="detail-card" shadow="never">
          <template #header>
            <div class="detail-card-header">
              <el-icon><UserFilled /></el-icon>
              <span>责任信息</span>
            </div>
          </template>
          <el-row :gutter="20">
            <el-col :span="12">
              <div class="detail-item">
                <label>主责部门：</label>
                <span>{{ detailData.MainDept }}</span>
              </div>
            </el-col>
            <el-col :span="12">
              <div class="detail-item">
                <label>主责人：</label>
                <span>{{ detailData.MainPerson }}</span>
              </div>
            </el-col>
          </el-row>
        </el-card>

        <!-- 附件信息 -->
        <el-card v-if="detailData.AttachmentFile" class="detail-card" shadow="never">
          <template #header>
            <div class="detail-card-header">
              <el-icon><Paperclip /></el-icon>
              <span>附件信息</span>
            </div>
          </template>
          <div class="detail-item">
            <label>附件文件：</label>
            <span>{{ detailData.AttachmentFile }}</span>
          </div>
        </el-card>
      </div>

      <template #footer>
        <div class="dialog-footer">
          <el-button @click="showDetailDialog = false">关闭</el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted, computed, watch, nextTick } from 'vue'
import { ArrowDown, User, Document, Search, Plus, View, RefreshLeft, InfoFilled, WarningFilled, UserFilled, Paperclip } from '@element-plus/icons-vue'
import { useRouter } from 'vue-router'
import axios from 'axios'
import { ElPagination } from 'element-plus'
import { ElMessage } from 'element-plus'
import * as echarts from 'echarts'
import { useUserStore } from '../store/user'
import { storeToRefs } from 'pinia'

const router = useRouter()
const activeMenu = ref('home')
const tableData = ref([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(10)
const pageSizes = ref([5, 10, 20, 50, 100])
const gotoPage = ref(1)
const pageCount = computed(() => Math.ceil(total.value / pageSize.value))
const searchKeyword = ref('')
const tableLoading = ref(false)

// 详情弹窗相关
const showDetailDialog = ref(false)
const detailData = ref(null)
const detailLoading = ref(false)

// 高级查询数据
const advancedQuery = ref({
  customer: '',
  orderNo: '',
  workshop: '',
  complaintCategory: '',
  dateRange: null,
  defectiveRateMin: null,
  defectiveRateMax: null
})

// 车间选项数据
const workshopOptions = ref([])

// 是否使用高级查询
const isAdvancedQuery = ref(false)
const todayCount = ref(0)
const monthCount = ref(0)
const showTodayCount = ref(true)
const showMonthCount = ref(true)
const statUnits = ref([])

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
  tableLoading.value = true
  try {
    const token = localStorage.getItem('token')

    // 构建查询参数
    const params = {
      page: page.value,
      pageSize: pageSize.value
    }
    // console.log('发送请求参数:', params)

    // 如果使用高级查询，则使用高级查询参数，否则使用简单搜索
    if (isAdvancedQuery.value) {
      // 高级查询参数
      if (advancedQuery.value.customer) params.customer = advancedQuery.value.customer
      if (advancedQuery.value.orderNo) params.orderNo = advancedQuery.value.orderNo
      if (advancedQuery.value.workshop) params.workshop = advancedQuery.value.workshop
      if (advancedQuery.value.complaintCategory) params.complaintCategory = advancedQuery.value.complaintCategory
      if (advancedQuery.value.dateRange && advancedQuery.value.dateRange.length === 2) {
        params.startDate = advancedQuery.value.dateRange[0]
        params.endDate = advancedQuery.value.dateRange[1]
      }
      if (advancedQuery.value.defectiveRateMin !== null) params.defectiveRateMin = advancedQuery.value.defectiveRateMin
      if (advancedQuery.value.defectiveRateMax !== null) params.defectiveRateMax = advancedQuery.value.defectiveRateMax
    } else {
      // 简单搜索参数
      if (searchKeyword.value) params.search = searchKeyword.value
    }

    const res = await axios.get('/api/complaint/list', {
      params,
      headers: { Authorization: `Bearer ${token}` }
    })

    if (res.data.success) {
      // console.log('🔍 数据接收调试:')
      // console.log('- 接收到的数据条数:', res.data.data.length)
      // console.log('- 总记录数:', res.data.total)
      // console.log('- 页面大小:', res.data.pageSize)

      tableData.value = res.data.data
      total.value = res.data.total

      // console.log('- 设置后tableData长度:', tableData.value.length)
      // console.log('- tableData前3条:', res.data.data.slice(0, 3))
    }
  } catch (e) {
    tableData.value = []
    total.value = 0
  } finally {
    tableLoading.value = false
  }
}

const fetchStats = async () => {
  try {
    const token = localStorage.getItem('token')
    if (!token) {
      console.warn('未找到token，跳转到登录页')
      window.location.href = '/login'
      return
    }

    const res = await axios.get('/api/complaint/month-stats', {
      headers: { Authorization: `Bearer ${token}` }
    })

    if (res.data.success) {
      // 根据配置显示卡片
      showTodayCount.value = res.data.showTodayCount !== false
      showMonthCount.value = res.data.showMonthCount !== false
      todayCount.value = res.data.todayCount || 0
      monthCount.value = res.data.monthCount || 0
      statUnits.value = res.data.units || []
      // console.log('统计数据获取成功:', {
      //   todayCount: todayCount.value,
      //   monthCount: monthCount.value,
      //   unitsCount: statUnits.value.length
      // })
    } else {
      console.error('统计数据获取失败:', res.data.message)
    }
  } catch (e) {
    console.error('获取统计数据失败:', e)
    if (e.response && e.response.status === 401) {
      console.warn('认证失败，跳转到登录页')
      localStorage.removeItem('token')
      window.location.href = '/login'
    }
  }
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

const handleSizeChange = (val) => {
  // console.log('分页大小改变:', val)
  pageSize.value = val
  page.value = 1
  // console.log('当前pageSize:', pageSize.value)
  fetchTableData()
}

const jumpToPage = (val) => {
  if (val >= 1 && val <= pageCount.value) {
    page.value = val
    fetchTableData()
  }
}

// 简单搜索方法
const handleSimpleSearch = () => {
  isAdvancedQuery.value = false
  page.value = 1 // 重置到第一页
  fetchTableData()
}

// 高级查询方法
const handleAdvancedQuery = () => {
  isAdvancedQuery.value = true
  page.value = 1 // 重置到第一页
  fetchTableData()
}

// 重置高级查询
const resetAdvancedQuery = () => {
  advancedQuery.value = {
    customer: '',
    orderNo: '',
    workshop: '',
    complaintCategory: '',
    dateRange: null,
    defectiveRateMin: null,
    defectiveRateMax: null
  }
  isAdvancedQuery.value = false
  page.value = 1
  fetchTableData()
}

// 获取车间选项
const fetchWorkshopOptions = async () => {
  try {
    const token = localStorage.getItem('token')
    const res = await axios.get('/api/complaint/workshop-options', {
      headers: { Authorization: `Bearer ${token}` }
    })
    if (res.data.success) {
      workshopOptions.value = res.data.data
    }
  } catch (e) {
    console.error('获取车间选项失败:', e)
  }
}

// 获取车间标签类型
const getWorkshopTagType = (workshop) => {
  const typeMap = {
    '数码印刷': 'primary',
    '轮转机': 'success',
    '跟单': 'warning',
    '设计': 'info',
    '品检': 'danger'
  }
  return typeMap[workshop] || 'primary'
}

// 获取单位卡片样式类
const getUnitCardClass = (type, index) => {
  const baseClasses = ['card-unit']

  // 根据类型添加不同的样式
  if (type === 'workshop') {
    baseClasses.push('card-workshop')
  } else {
    baseClasses.push('card-department')
  }

  // 添加索引样式以保持颜色多样性
  baseClasses.push(`card-unit${index % 6}`)

  return baseClasses.join(' ')
}

// 查看详情
const viewDetail = async (row) => {
  try {
    detailLoading.value = true
    const token = localStorage.getItem('token')

    const response = await axios.get(`/api/complaint/detail/${row.ID}`, {
      headers: { Authorization: `Bearer ${token}` }
    })

    if (response.data.success) {
      detailData.value = response.data.data
      showDetailDialog.value = true
    } else {
      ElMessage.error(response.data.message || '获取详情失败')
    }
  } catch (error) {
    console.error('获取详情失败:', error)
    ElMessage.error('获取详情失败')
  } finally {
    detailLoading.value = false
  }
}

// 格式化日期
const formatDate = (dateStr) => {
  if (!dateStr) return '-'
  const date = new Date(dateStr)
  return date.toLocaleDateString('zh-CN')
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

// 监听配置更新事件
const handleConfigUpdate = (event) => {
  // console.log('收到配置更新事件:', event.detail)
  // 重新获取统计数据
  fetchStats()
}

onMounted(() => {
  fetchStats()
  fetchTableData()
  fetchChartOptions()
  fetchProfile()
  fetchWorkshopOptions() // 获取车间选项
  nextTick(() => {
    renderCharts()
    // 初始化查询卡片位置
    initQueryCardPosition()
  })

  // 添加配置更新监听器
  window.addEventListener('homeConfigUpdated', handleConfigUpdate)

  // 添加滚动监听，动态调整查询卡片位置
  window.addEventListener('scroll', handleScroll)

  // 添加窗口大小变化监听
  window.addEventListener('resize', handleResize)
})

// 滚动处理函数
const handleScroll = () => {
  // 在小屏幕下不执行固定定位
  if (window.innerWidth <= 1200) return

  const queryCard = document.querySelector('.query-card')
  const tableCard = document.querySelector('.table-card')
  const statsCards = document.querySelector('.stats-cards')

  if (!queryCard || !tableCard || !statsCards) return

  const statsCardsRect = statsCards.getBoundingClientRect()
  const tableCardRect = tableCard.getBoundingClientRect()
  const viewportHeight = window.innerHeight
  const cardHeight = queryCard.offsetHeight
  const headerHeight = 120 // 导航栏高度

  // 计算统计卡片区域的底部位置
  const statsBottom = statsCardsRect.bottom

  // 如果统计卡片还在视窗内，查询卡片应该与表格顶部对齐
  if (statsBottom > headerHeight && tableCardRect.top > headerHeight) {
    // 计算查询卡片应该的位置（与表格卡片顶部对齐，但不能超过导航栏）
    const targetTop = Math.max(headerHeight + 20, tableCardRect.top)
    queryCard.style.top = `${targetTop}px`
  } else {
    // 如果统计卡片已经滚动出视窗，让查询卡片居中显示
    const centerPosition = Math.max(
      headerHeight + 20,
      Math.min(
        (viewportHeight - cardHeight) / 2,
        viewportHeight - cardHeight - 20
      )
    )
    queryCard.style.top = `${centerPosition}px`
  }
}

// 完全重置查询卡片到初始状态
const resetQueryCardToInitialState = () => {
  const queryCard = document.querySelector('.query-card')
  const tableCard = document.querySelector('.table-card')

  if (!queryCard || !tableCard) return

  // 记录当前滚动位置
  const currentScrollTop = window.pageYOffset || document.documentElement.scrollTop

  // 临时滚动到顶部以获取表格的真实初始位置
  window.scrollTo(0, 0)

  // 等待滚动完成
  setTimeout(() => {
    // 完全重置样式
    queryCard.style.position = 'fixed'
    queryCard.style.right = '2.5rem'
    queryCard.style.width = '300px'
    queryCard.style.transform = 'none'

    // 获取表格在页面顶部时的位置
    const tableCardRect = tableCard.getBoundingClientRect()
    const headerHeight = 120

    // 计算正确的初始位置
    const initialTop = Math.max(headerHeight + 20, tableCardRect.top)
    queryCard.style.top = `${initialTop}px`

    // 恢复原来的滚动位置
    window.scrollTo(0, currentScrollTop)

    console.log('查询卡片重置完成:', {
      tableTop: tableCardRect.top,
      initialTop: initialTop,
      scrollRestored: currentScrollTop
    })
  }, 50)
}

// 初始化查询卡片位置
const initQueryCardPosition = () => {
  setTimeout(() => {
    // 在小屏幕下不执行固定定位
    if (window.innerWidth <= 1200) return

    resetQueryCardToInitialState()
  }, 100) // 延迟100ms确保DOM完全渲染
}

// 组件卸载时移除监听器
import { onUnmounted } from 'vue'

// 防抖函数
let resizeTimeout = null
// 窗口大小变化处理函数
const handleResize = () => {
  // 清除之前的定时器
  if (resizeTimeout) {
    clearTimeout(resizeTimeout)
  }

  // 设置新的定时器，防抖处理
  resizeTimeout = setTimeout(() => {
    const queryCard = document.querySelector('.query-card')
    if (!queryCard) return

    // 如果是小屏幕，重置查询卡片样式
    if (window.innerWidth <= 1200) {
      queryCard.style.position = 'relative'
      queryCard.style.top = 'auto'
      queryCard.style.right = 'auto'
      queryCard.style.width = '100%'
    } else {
      // 大屏幕时完全重置并重新初始化位置
      setTimeout(() => {
        // 使用新的重置函数
        resetQueryCardToInitialState()

        // 重新初始化滚动监听
        setTimeout(() => {
          initQueryCardPosition()
        }, 100)
      }, 100)
    }
  }, 200) // 防抖延迟200ms
}

onUnmounted(() => {
  window.removeEventListener('homeConfigUpdated', handleConfigUpdate)
  window.removeEventListener('scroll', handleScroll)
  window.removeEventListener('resize', handleResize)
})
</script>

<style>
html, body {
  margin: 0;
  padding: 0;
  overflow-x: hidden;
  overflow-y: auto; /* 明确允许垂直滚动 */
  height: auto; /* 确保高度可以自动增长 */
  /* 允许垂直滚动 */
}
/* 自定义滚动条样式 */
body::-webkit-scrollbar {
  width: 8px;
}
body::-webkit-scrollbar-track {
  background: #f1f1f1;
}
body::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 4px;
}
body::-webkit-scrollbar-thumb:hover {
  background: #a8a8a8;
}
</style>

<style scoped>
.home-bg {
  min-height: 100vh;
  background: #f5f6fa;
  display: flex;
  flex-direction: column;
  /* 确保页面内容超出视窗时显示滚动条 */
}
.home-header {
  background: #fff;
  box-shadow: 0 0.125rem 0.5rem 0 rgba(0,0,0,0.04);
  display: flex;
  align-items: center;
  height: 4rem;
  padding: 0 2.5rem;
  justify-content: space-between;
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  width: 100%;
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
  padding: 2rem 2.5rem 4rem 2.5rem; /* 增加底部边距避免被footer遮挡 */
  margin-top: 4rem; /* 为固定导航栏留出空间 */
  /* 移除overflow限制，让页面自然滚动 */
  overflow: visible; /* 确保内容可见 */
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
  position: relative;
}

.table-container {
  margin-right: 320px; /* 为固定定位的查询卡片留出空间 */
}
.table-card {
  background: #fff;
  border-radius: 0.5rem;
  box-shadow: 0 0.125rem 0.5rem 0 rgba(0,0,0,0.06);
  margin-bottom: 1.5rem;
  margin-top: 0 !important; /* 确保顶部对齐 */
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
  position: fixed; /* 使用fixed定位以便精确控制 */
  top: 140px; /* 初始位置，避免与导航栏重叠 */
  right: 2.5rem; /* 与页面右边距保持一致 */
  width: 300px; /* 固定宽度 */
  margin-top: 0 !important; /* 确保与左侧卡片顶部对齐 */
  z-index: 1000; /* 确保在其他元素之上 */
  transition: top 0.3s ease-out; /* 平滑过渡效果 */
}

.query-header {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.95rem;
  font-weight: bold;
  color: #409eff;
}

.advanced-form {
  padding: 0;
}

.advanced-form .el-form-item {
  margin-bottom: 16px;
}

.advanced-form .el-form-item:last-child {
  margin-bottom: 0;
}

.advanced-form .el-form-item__content {
  width: 100% !important;
}

.advanced-form .el-form-item__label {
  font-size: 12px;
  color: #606266;
  font-weight: 500;
}

.advanced-form .el-input,
.advanced-form .el-select {
  font-size: 12px;
}

.rate-range {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.query-actions {
  margin-top: 8px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;
}

.query-actions .el-button {
  font-size: 12px;
  border-radius: 4px;
  width: 100% !important;
  margin: 0 !important;
  flex: 1;
  box-sizing: border-box;
}

.query-actions .el-button--primary {
  background: linear-gradient(135deg, #409eff 0%, #66b3ff 100%);
  border: none;
  box-shadow: 0 2px 8px rgba(64, 158, 255, 0.3);
}

.query-actions .el-button--primary:hover {
  background: linear-gradient(135deg, #337ecc 0%, #5aa3e6 100%);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(64, 158, 255, 0.4);
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
/* 清爽型卡片颜色 - 使用渐变和柔和色调 */
.card-today {
  background: linear-gradient(135deg, #a8edea 0%, #fed6e3 100%) !important;
  color: #2c3e50 !important;
  border: none !important;
  box-shadow: 0 8px 32px rgba(168, 237, 234, 0.3) !important;
}

.card-month {
  background: linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%) !important;
  color: #2c3e50 !important;
  border: none !important;
  box-shadow: 0 8px 32px rgba(252, 182, 159, 0.3) !important;
}

.card-unit0 {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%) !important;
  color: #fff !important;
  border: none !important;
  box-shadow: 0 8px 32px rgba(102, 126, 234, 0.3) !important;
}

.card-unit1 {
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%) !important;
  color: #fff !important;
  border: none !important;
  box-shadow: 0 8px 32px rgba(240, 147, 251, 0.3) !important;
}

.card-unit2 {
  background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%) !important;
  color: #fff !important;
  border: none !important;
  box-shadow: 0 8px 32px rgba(79, 172, 254, 0.3) !important;
}

.card-unit3 {
  background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%) !important;
  color: #2c3e50 !important;
  border: none !important;
  box-shadow: 0 8px 32px rgba(67, 233, 123, 0.3) !important;
}

.card-unit4 {
  background: linear-gradient(135deg, #fa709a 0%, #fee140 100%) !important;
  color: #2c3e50 !important;
  border: none !important;
  box-shadow: 0 8px 32px rgba(250, 112, 154, 0.3) !important;
}

.card-unit5 {
  background: linear-gradient(135deg, #a8edea 0%, #fed6e3 100%) !important;
  color: #2c3e50 !important;
  border: none !important;
  box-shadow: 0 8px 32px rgba(168, 237, 234, 0.3) !important;
}

.card-unit6 {
  background: linear-gradient(135deg, #d299c2 0%, #fef9d7 100%) !important;
  color: #2c3e50 !important;
  border: none !important;
  box-shadow: 0 8px 32px rgba(210, 153, 194, 0.3) !important;
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
/* 表格头部样式 */
.table-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin: 0;
}

.table-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 16px;
  font-weight: 600;
  color: #303133;
}

.table-actions {
  display: flex;
  align-items: center;
}

/* 表格底部样式 */
.table-footer {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  margin-top: 20px;
  padding-top: 16px;
  border-top: 1px solid #ebeef5;
}

/* 投诉记录表格卡片样式 */
.complaint-table-card {
  margin-top: 24px;
  /* 移除高度限制，让表格自然展开 */
  display: flex;
  flex-direction: column;
}

/* 详情弹窗样式 */
.detail-dialog .el-dialog {
  margin: 0 !important;
  height: 90vh;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
}

.detail-dialog .el-dialog__header {
  flex-shrink: 0;
  padding: 20px 20px 10px 20px;
  border-bottom: 1px solid #ebeef5;
}

.detail-dialog .el-dialog__body {
  flex: 1;
  padding: 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.detail-dialog .detail-content {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
}

.detail-content .detail-card {
  margin-bottom: 20px;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.detail-content .detail-card:last-child {
  margin-bottom: 0;
}

.detail-content .detail-card-header {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
  color: #303133;
}

.detail-content .detail-card-header .el-icon {
  color: #409eff;
}

.detail-content .detail-item {
  margin-bottom: 16px;
}

.detail-content .detail-item:last-child {
  margin-bottom: 0;
}

.detail-content .detail-item label {
  font-weight: 600;
  color: #606266;
  margin-right: 8px;
  min-width: 100px;
  display: inline-block;
}

.detail-content .detail-item span {
  color: #303133;
}

.detail-content .detail-item .detail-text {
  margin-top: 8px;
  padding: 12px;
  background-color: #f5f7fa;
  border-radius: 4px;
  color: #303133;
  line-height: 1.6;
  min-height: 40px;
  white-space: pre-wrap;
  word-break: break-all;
}

.dialog-footer {
  text-align: center;
}

.complaint-table-card :deep(.el-card__body) {
  flex: 1;
  display: flex;
  flex-direction: column;
  /* 移除overflow: hidden，允许内容自然滚动 */
}

.complaint-table-card .el-table {
  flex: 1;
}

/* 移除表格高度限制，让页面自然滚动 */
/*
.complaint-table-card .el-table__body-wrapper {
  max-height: calc(100vh - 400px);
  overflow-y: auto;
}
*/

/* 卡片类型样式 */
.card-workshop {
  border-left: 4px solid #409eff;
}

.card-department {
  border-left: 4px solid #67c23a;
}

.admin-main, .main, .home-main {
  background: #fafbfc;
}
/* 大屏幕到中等屏幕的过渡 */
@media (max-width: 1200px) {
  .query-card {
    position: relative !important;
    top: auto !important;
    right: auto !important;
    width: 100% !important;
    margin-bottom: 1.5rem;
    transition: none !important;
  }

  .table-container {
    margin-right: 0 !important;
  }

  .middle-row {
    flex-direction: column;
  }
}

/* 平板设备 */
@media (max-width: 768px) {
  .home-header {
    padding: 0.5rem 1rem;
    flex-wrap: wrap;
    min-height: 100px; /* 给导航菜单换行留出空间 */
    align-items: flex-start;
  }

  /* 平板设备下隐藏logo文字以节省空间 */
  .logo-text {
    display: none; /* 隐藏logo文字 */
  }

  .header-left {
    flex-shrink: 0; /* 防止被压缩 */
    min-width: auto; /* 自动宽度，因为只显示图标 */
  }

  /* 确保右侧区域不挤压左侧logo */
  .header-right {
    flex-shrink: 0; /* 防止被压缩 */
    gap: 0.5rem; /* 稍微减少间距 */
  }

  .home-header .nav-menu {
    order: 3;
    width: 100%;
    margin-top: 0.5rem;
    justify-content: center;
    background: rgba(255, 255, 255, 0.9);
    border-radius: 0.5rem;
    padding: 0.25rem 0;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }

  .home-header .nav-menu .el-menu {
    background: transparent;
    border: none;
  }

  .home-header .nav-menu .el-menu-item {
    padding: 0 1rem;
    font-size: 0.875rem;
    height: 36px;
    line-height: 36px;
  }

  .home-main {
    margin-top: 1rem; /* 为导航菜单留出额外空间 */
    padding: 1rem 1rem 3rem 1rem; /* 增加底部边距避免被footer遮挡 */
  }

  .stats-cards {
    grid-template-columns: 1fr;
    gap: 1rem;
    margin-bottom: 1rem;
  }

  /* 平板设备下统计卡片调整 */
  .stat-row-flex .stat-card {
    height: 8rem; /* 增加平板设备高度 */
    padding: 1rem 0.5rem; /* 增加内边距 */
  }

  .stat-row-flex .stat-card .stat-title {
    font-size: 1rem;
    margin-bottom: 0.75rem; /* 增加标题下边距 */
  }

  .stat-row-flex .stat-card .stat-value {
    font-size: 1.1rem;
  }

  .table-header {
    flex-direction: column;
    gap: 1rem;
    align-items: stretch;
  }

  .table-actions {
    width: 100%;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 0.5rem;
  }

  .table-actions .el-input {
    flex: 1;
    min-width: 200px;
  }

  .chart-content-flex {
    flex-direction: column;
    gap: 1rem;
  }

  .chart-box {
    width: 100% !important;
    min-height: 250px;
  }

  /* 平板设备下分页器优化 */
  .table-footer {
    justify-content: center;
  }

  .table-footer .el-pagination {
    flex-wrap: wrap;
    justify-content: center;
  }
}

/* 手机设备 */
@media (max-width: 600px) {
  .home-header, .home-main {
    padding-left: 1rem;
    padding-right: 1rem;
  }

  .home-header {
    padding-top: 0.5rem;
    padding-bottom: 0.5rem;
    min-height: 90px; /* 手机设备稍微减少高度 */
  }

  /* 手机设备下隐藏logo文字以节省空间 */
  .logo-text {
    display: none; /* 隐藏logo文字 */
  }

  .header-left {
    flex-shrink: 0; /* 防止被压缩 */
    min-width: auto; /* 自动宽度，因为只显示图标 */
  }

  .logo {
    height: 2rem; /* 稍微缩小logo */
    margin-right: 0; /* 移除右边距，因为没有文字了 */
  }

  .home-header .nav-menu {
    margin-top: 0.25rem;
    padding: 0.125rem 0;
  }

  .home-header .nav-menu .el-menu-item {
    padding: 0 0.5rem;
    font-size: 0.8rem;
    height: 32px;
    line-height: 32px;
  }

  .home-main {
    margin-top: 0.5rem; /* 手机设备减少上边距 */
    padding: 1rem 1rem 3rem 1rem; /* 增加底部边距避免被footer遮挡 */
  }

  .stat-row-flex {
    flex-direction: column;
    gap: 0.75rem;
    margin-top: 1rem; /* 确保与导航菜单有足够间距 */
  }

  .stat-row-flex .stat-card {
    height: 9rem; /* 进一步增加小屏幕高度 */
    border-radius: 0.5rem;
    padding: 1.2rem 0.8rem; /* 增加内边距 */
  }

  /* 小屏幕下统计卡片文字调整 */
  .stat-row-flex .stat-card .stat-title {
    font-size: 0.9rem; /* 标题文字稍微缩小 */
    margin-bottom: 0.8rem; /* 增加标题下边距 */
    line-height: 1.2;
  }

  .stat-row-flex .stat-card .stat-value {
    font-size: 1rem; /* 数字稍微缩小 */
    font-weight: normal;
    line-height: 1.3;
  }

  .stat-row-flex .stat-card .stat-value b {
    font-size: 1.2rem; /* 加粗数字稍大一些 */
    font-weight: bold;
  }

  .home-footer {
    font-size: 0.8rem;
  }

  .query-card .el-form-item__label {
    width: 50px !important;
    font-size: 0.8rem;
  }

  .query-card .el-input,
  .query-card .el-select {
    font-size: 0.875rem;
  }

  .table-actions .el-input {
    min-width: 150px;
  }

  .table-actions .el-button {
    padding: 0.5rem 1rem;
    font-size: 0.875rem;
  }

  .table-footer {
    flex-direction: column;
    gap: 1rem;
    align-items: center;
    justify-content: center; /* 居中对齐 */
  }

  /* 小屏幕下分页器样式优化 */
  .table-footer .el-pagination {
    flex-wrap: wrap;
    justify-content: center;
    width: 100%;
  }

  /* 确保分页器组件在小屏幕下完整显示 */
  .table-footer .el-pagination .el-pagination__sizes {
    margin-right: 0.5rem;
    margin-bottom: 0.5rem;
  }

  .table-footer .el-pagination .el-pagination__total {
    margin-right: 0.5rem;
    margin-bottom: 0.5rem;
  }

  /* 分页器按钮组在小屏幕下的样式 */
  .table-footer .el-pagination .el-pager {
    margin: 0.25rem;
  }

  .table-footer .el-pagination .btn-prev,
  .table-footer .el-pagination .btn-next {
    margin: 0.25rem;
  }

  .chart-box {
    min-height: 200px;
  }
}
</style> 