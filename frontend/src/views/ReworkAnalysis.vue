<template>
  <AppLayout>
    <ContentWrapper>
      <div class="rework-analysis">
        <!-- 时间筛选汇总信息 -->
      <el-card class="yearly-summary" shadow="never">
        <template #header>
          <div class="card-header">
            <span>
              <el-icon><TrendCharts /></el-icon>
              {{ getTimeRangeTitle() }}返工汇总
            </span>
            <div class="time-filter-group">
              <!-- 时间类型选择 -->
              <el-select v-model="timeType" @change="onTimeTypeChange" size="small" style="width: 100px; margin-right: 10px">
                <el-option label="年度" value="year" />
                <el-option label="季度" value="quarter" />
                <el-option label="月份" value="month" />
                <el-option label="周次" value="week" />
              </el-select>
              
              <!-- 年份选择 -->
              <el-select v-model="selectedYear" @change="onYearChange" size="small" style="width: 100px; margin-right: 10px">
                <el-option
                  v-for="year in availableYears"
                  :key="year"
                  :label="year + '年'"
                  :value="year"
                />
              </el-select>
              
              <!-- 季度选择 -->
              <el-select 
                v-if="timeType === 'quarter'" 
                v-model="selectedQuarter" 
                @change="loadTimeRangeData" 
                size="small"
                style="width: 100px; margin-right: 10px"
              >
                <el-option label="第一季度" :value="1" />
                <el-option label="第二季度" :value="2" />
                <el-option label="第三季度" :value="3" />
                <el-option label="第四季度" :value="4" />
              </el-select>
              
              <!-- 月份选择 -->
              <el-select 
                v-if="timeType === 'month'" 
                v-model="selectedMonth" 
                @change="loadTimeRangeData" 
                size="small"
                style="width: 100px; margin-right: 10px"
              >
                <el-option
                  v-for="month in availableMonths"
                  :key="month.value"
                  :label="month.label"
                  :value="month.value"
                />
              </el-select>
              
              <!-- 周次选择 -->
              <el-select 
                v-if="timeType === 'week'" 
                v-model="selectedWeek" 
                @change="loadTimeRangeData" 
                size="small"
                style="width: 120px; margin-right: 10px"
              >
                <el-option
                  v-for="week in availableWeeks"
                  :key="week.value"
                  :label="week.label"
                  :value="week.value"
                />
              </el-select>
              <!-- 责任部门筛选 -->
              <el-select 
                v-model="selectedDepartment" 
                placeholder="请选择责任部门" 
                clearable
                @change="loadTimeRangeData"
                size="small"
                style="width: 120px; margin-right: 10px"
              >
                <el-option
                  v-for="dept in filterOptions.departments"
                  :key="dept"
                  :label="dept"
                  :value="dept"
                />
              </el-select>
              
              <!-- 车间筛选 -->
              <el-select 
                v-model="selectedWorkshop" 
                placeholder="请选择车间" 
                clearable
                @change="loadTimeRangeData"
                size="small"
                style="width: 120px; margin-right: 10px"
              >
                <el-option
                  v-for="workshop in filterOptions.workshops"
                  :key="workshop"
                  :label="workshop"
                  :value="workshop"
                />
              </el-select>
              
              <!-- 责任人筛选 -->
              <el-select 
                v-model="selectedResponsiblePerson" 
                placeholder="请选择责任人" 
                clearable
                filterable
                @change="loadTimeRangeData"
                size="small"
                style="width: 120px; margin-right: 10px"
              >
                <el-option
                  v-for="person in filterOptions.persons"
                  :key="person.Name"
                  :label="person.Name"
                  :value="person.Name"
                />
              </el-select>

              <!-- 重置条件按钮 -->
              <el-button type="primary" size="small" @click="resetToCurrentMonth">
                <el-icon><Refresh /></el-icon>
                重置
              </el-button>
            </div>
          </div>
        </template>
        
        <el-row :gutter="20" class="summary-cards-row">
          <el-col :xs="24" :sm="6" :md="6" :lg="6" :xl="6">
            <div class="summary-item summary-item-primary">
              <div class="summary-icon">
                <el-icon><Tools /></el-icon>
              </div>
              <div class="summary-content">
                <div class="summary-label">返工总批次</div>
                <div class="summary-value primary">{{ yearlyStats.totalCount || 0 }}</div>
              </div>
            </div>
          </el-col>
          <el-col :xs="24" :sm="6" :md="6" :lg="6" :xl="6">
            <div class="summary-item summary-item-warning">
              <div class="summary-icon">
                <el-icon><Warning /></el-icon>
              </div>
              <div class="summary-content">
                <div class="summary-label">返工批量数</div>
                <div class="summary-value warning">{{ yearlyStats.totalDefectiveQty || 0 }}</div>
              </div>
            </div>
          </el-col>
          <el-col :xs="24" :sm="6" :md="6" :lg="6" :xl="6">
            <div class="summary-item summary-item-danger">
              <div class="summary-icon">
                <el-icon><Money /></el-icon>
              </div>
              <div class="summary-content">
                <div class="summary-label">返工工时费</div>
                <div class="summary-value danger">¥{{ (yearlyStats.totalCost || 0).toFixed(1) }}</div>
              </div>
            </div>
          </el-col>
          <el-col :xs="24" :sm="6" :md="6" :lg="6" :xl="6">
            <div class="summary-item summary-item-info">
              <div class="summary-icon">
                <el-icon><TrendCharts /></el-icon>
              </div>
              <div class="summary-content">
                <div class="summary-label">平均不良率</div>
                <div class="summary-value info">{{ (yearlyStats.avgDefectiveRate || 0).toFixed(1) }}%</div>
              </div>
            </div>
          </el-col>
        </el-row>
      </el-card>


      <!-- 数据分析卡片 -->
      <el-card class="data-analysis-card" shadow="never">
        <template #header>
          <div class="card-header">
            <span>
              <el-icon><List /></el-icon>
              数据分析
            </span>
          </div>
        </template>

        <el-tabs v-model="activeTab" @tab-click="handleTabClick">
          <el-tab-pane label="返工记录明细" name="details">
            <div class="tab-header">
              <div class="header-actions">
                <el-input
                  v-model="searchKeyword"
                  placeholder="搜索工单号、产品名称"
                  style="width: 200px; margin-right: 10px"
                  @keyup.enter="loadTableData"
                >
                  <template #prefix>
                    <el-icon><Search /></el-icon>
                  </template>
                </el-input>
                <el-button type="primary" @click="loadTableData">
                  <el-icon><Search /></el-icon>
                  搜索
                </el-button>
                <el-button type="success" @click="exportTableData" :loading="exportLoading">
                  <el-icon><Download /></el-icon>
                  导出
                </el-button>
              </div>
            </div>

            <el-table
              :data="tableData"
              v-loading="tableLoading"
              stripe
              border
              style="width: 100%"
              table-layout="auto"
            >
              <el-table-column prop="ReworkDate" label="返工日期" min-width="120" :formatter="(row) => formatDate(row.ReworkDate)" />
              <el-table-column prop="CustomerCode" label="客户编号" min-width="120" />
              <el-table-column prop="OrderNo" label="工单号" min-width="150" show-overflow-tooltip />
              <el-table-column prop="ProductName" label="产品名称" min-width="200" show-overflow-tooltip />
              <el-table-column prop="TotalQty" label="总数量" width="100" align="right" />
              <el-table-column prop="DefectiveQty" label="不良数量" width="100" align="right" />
              <el-table-column prop="DefectiveRate" label="不良率" width="100" align="right">
                <template #default="{ row }">
                  <span :class="getDefectiveRateClass(row.DefectiveRate)">
                    {{ row.DefectiveRate ? row.DefectiveRate.toFixed(2) + '%' : '-' }}
                  </span>
                </template>
              </el-table-column>
              <el-table-column prop="ResponsiblePerson" label="责任人" min-width="120" show-overflow-tooltip />
              <el-table-column prop="ReworkPersonnel" label="返工人员" min-width="120" show-overflow-tooltip />
              <el-table-column prop="ReworkHours" label="返工工时" width="100" align="right">
                <template #default="{ row }">
                  {{ row.ReworkHours ? row.ReworkHours + 'h' : '-' }}
                </template>
              </el-table-column>
              <el-table-column prop="TotalCost" label="总成本" width="120" align="right">
                <template #default="{ row }">
                  <span class="cost-amount">
                    {{ row.TotalCost ? '¥' + row.TotalCost.toFixed(2) : '-' }}
                  </span>
                </template>
              </el-table-column>
              <el-table-column prop="ReworkStatus" label="状态" width="100">
                <template #default="{ row }">
                  <el-tag :type="getStatusType(row.ReworkStatus)" size="small">
                    {{ row.ReworkStatus }}
                  </el-tag>
                </template>
              </el-table-column>
              <el-table-column label="操作" width="100" fixed="right">
                <template #default="{ row }">
                  <el-button type="primary" size="small" @click="viewDetail(row)">
                    <el-icon><View /></el-icon>
                    详情
                  </el-button>
                </template>
              </el-table-column>
            </el-table>

            <div class="pagination-wrapper">
              <el-pagination
                v-model:current-page="tablePagination.current"
                v-model:page-size="tablePagination.pageSize"
                :page-sizes="[5, 10, 20, 50, 100]"
                :total="tablePagination.total"
                layout="total, sizes, prev, pager, next, jumper"
                @size-change="handleTableSizeChange"
                @current-change="handleTableCurrentChange"
              />
            </div>
          </el-tab-pane>

          <el-tab-pane label="工时损耗统计" name="statistics">
            <el-row :gutter="20">
              <!-- 统计表格 -->
              <el-col :span="12">
                <div class="statistics-table">
                  <el-table
                    :data="statisticsData"
                    v-loading="statisticsLoading"
                    stripe
                    border
                    max-height="400"
                    style="width: 100%; margin-bottom: 20px"
                  >
                    <el-table-column prop="name" label="名称" max-width="80" align="center" />
                    <el-table-column prop="type" label="类型" max-width="80" align="center">
                      <template #default="{ row }">
                        <el-tag :type="getTypeTagType(row.type)" size="small">
                          {{ row.type }}
                        </el-tag>
                      </template>
                    </el-table-column>
                    <el-table-column prop="totalHours" label="总工时" max-width="60" align="center">
                      <template #default="{ row }">
                        {{ row.totalHours ? row.totalHours.toFixed(1) + 'h' : '-' }}
                      </template>
                    </el-table-column>
                    <el-table-column prop="totalCost" label="损耗金额" max-width="50" align="center">
                      <template #default="{ row }">
                        <span class="cost-amount">
                          {{ row.totalCost ? '¥' + row.totalCost.toFixed(2) : '-' }}
                        </span>
                      </template>
                    </el-table-column>
                    <el-table-column prop="avgHourlyRate" label="工时单价" max-width="60" align="center">

                      <template #default="{ row }">
                        {{ row.avgHourlyRate ? '¥' + row.avgHourlyRate.toFixed(2) + '/h' : '-' }}
                      </template>
                    </el-table-column>
                    <el-table-column prop="percentage" label="占比" max-width="60" align="center">
                      <template #default="{ row }">
                        <span :class="getPercentageClass(row.percentage)">
                          {{ row.percentage ? row.percentage.toFixed(1) + '%' : '-' }}
                        </span>
                      </template>
                    </el-table-column>
                  </el-table>
                </div>
              </el-col>

              <!-- 横道图 -->
              <el-col :span="12">
                <div class="gantt-chart">
                  <!-- 横道图切换按钮 -->
                  <div class="chart-header">
                    <span class="chart-title">工时损耗横道图</span>
                    <el-radio-group v-model="ganttDisplayMode" size="small" @change="updateGanttChart">
                      <el-radio-button value="hours">工时</el-radio-button>
            <el-radio-button value="cost">金额</el-radio-button>
                    </el-radio-group>
                  </div>
                  <div ref="ganttChartRef" class="chart-container"></div>
                </div>
              </el-col>
            </el-row>
          </el-tab-pane>
        </el-tabs>
      </el-card>
      <!-- 图表分析区域 -->
      <el-card class="charts-analysis-card" shadow="never">
        <template #header>
          <div class="card-header">
            <span>
              <el-icon><DataBoard /></el-icon>
              图表分析
            </span>
          </div>
        </template>
        
        <el-tabs v-model="activeChartTab" class="chart-tabs">
          <!-- 返工趋势分析 -->
          <el-tab-pane label="返工趋势分析" name="trend">
            <el-row :gutter="20">
              <el-col :span="12">
                <div class="chart-data-panel">
                  <h4 class="data-panel-title">
                    <el-icon><List /></el-icon>
                    趋势数据列表
                  </h4>
                  <el-table :data="trendData" stripe border size="small" max-height="400" table-layout="auto">
                    <el-table-column prop="DateLabel" label="时间" min-width="120" />
                    <el-table-column prop="ReworkCount" label="返工次数" min-width="100" align="center" />
                    <el-table-column prop="TotalDefectiveQty" label="不良数量" min-width="100" align="center" />
                    <el-table-column prop="AvgDefectiveRate" label="不良率" min-width="100" align="center">
                      <template #default="{ row }">
                        {{ row.AvgDefectiveRate ? row.AvgDefectiveRate.toFixed(2) + '%' : '-' }}
                      </template>
                    </el-table-column>
                  </el-table>
                </div>
              </el-col>
              <el-col :span="12">
                <div class="chart-panel">
                  <div ref="trendChartRef" class="chart-container"></div>
                </div>
              </el-col>
            </el-row>
          </el-tab-pane>
          
          <!-- 部门返工分布 -->
          <el-tab-pane label="部门返工分布" name="department">
            <el-row :gutter="20">
              <el-col :span="12">
                <div class="chart-data-panel">
                  <h4 class="data-panel-title">
                    <el-icon><List /></el-icon>
                    部门数据列表
                  </h4>
                  <el-table :data="deptData" stripe border size="small" max-height="400" table-layout="auto">
                    <el-table-column prop="ResponsibleDept" label="部门" min-width="150" />
                    <el-table-column prop="ReworkCount" label="返工次数" min-width="100" align="center" />
                    <el-table-column prop="TotalDefectiveQty" label="不良数量" min-width="100" align="center" />
                    <el-table-column prop="Percentage" label="占比" min-width="100" align="center">
                      <template #default="{ row }">
                        {{ row.Percentage ? row.Percentage.toFixed(1) + '%' : '-' }}
                      </template>
                    </el-table-column>
                  </el-table>
                </div>
              </el-col>
              <el-col :span="12">
                <div class="chart-panel">
                  <div ref="deptChartRef" class="chart-container"></div>
                </div>
              </el-col>
            </el-row>
          </el-tab-pane>
          
          <!-- 不良类别分析 -->
          <el-tab-pane label="不良类别分析" name="category">
            <el-row :gutter="20">
              <el-col :span="12">
                <div class="chart-data-panel">
                  <h4 class="data-panel-title">
                    <el-icon><List /></el-icon>
                    类别数据列表
                  </h4>
                  <el-table :data="categoryData" stripe border size="small" max-height="400" table-layout="auto">
                    <el-table-column prop="DefectiveCategory" label="不良类别" min-width="150" />
                    <el-table-column prop="ReworkCount" label="返工次数" min-width="100" align="center" />
                    <el-table-column prop="TotalDefectiveQty" label="不良数量" min-width="100" align="center" />
                    <el-table-column prop="Percentage" label="占比" min-width="100" align="center">
                      <template #default="{ row }">
                        {{ row.Percentage ? row.Percentage.toFixed(1) + '%' : '-' }}
                      </template>
                    </el-table-column>
                  </el-table>
                </div>
              </el-col>
              <el-col :span="12">
                <div class="chart-panel">
                  <div ref="categoryChartRef" class="chart-container"></div>
                </div>
              </el-col>
            </el-row>
          </el-tab-pane>
          
          <!-- 返工成本分析 -->
          <el-tab-pane label="返工成本分析" name="cost">
            <el-row :gutter="20">
              <el-col :span="12">
                <div class="chart-data-panel">
                  <h4 class="data-panel-title">
                    <el-icon><List /></el-icon>
                    成本数据列表
                  </h4>
                  <el-table :data="costData" stripe border size="small" max-height="400" table-layout="auto">
                    <el-table-column prop="DateLabel" label="时间" min-width="120" />
                    <el-table-column prop="TotalCost" label="总成本" min-width="120" align="center">
                      <template #default="{ row }">
                        ¥{{ row.TotalCost ? row.TotalCost.toFixed(2) : '0.00' }}
                      </template>
                    </el-table-column>
                    <el-table-column prop="AvgCost" label="平均成本" min-width="120" align="center">
                      <template #default="{ row }">
                        ¥{{ row.AvgCost ? row.AvgCost.toFixed(2) : '0.00' }}
                      </template>
                    </el-table-column>
                  </el-table>
                </div>
              </el-col>
              <el-col :span="12">
                <div class="chart-panel">
                  <div ref="costChartRef" class="chart-container"></div>
                </div>
              </el-col>
            </el-row>
          </el-tab-pane>
        </el-tabs>
      </el-card>
  </div>
  </ContentWrapper>
    <!-- 详情弹窗 -->
    <el-dialog v-model="detailVisible" title="返工记录详情" width="800px">
      <div class="detail-content" v-if="currentRecord">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="返工日期">
            {{ formatDate(currentRecord.ReworkDate) }}
          </el-descriptions-item>
          <el-descriptions-item label="客户编号">
            {{ currentRecord.CustomerCode }}
          </el-descriptions-item>
          <el-descriptions-item label="工单号">
            {{ currentRecord.OrderNo }}
          </el-descriptions-item>
          <el-descriptions-item label="产品名称">
            {{ currentRecord.ProductName }}
          </el-descriptions-item>
          <el-descriptions-item label="总数量">
            {{ currentRecord.TotalQty }}
          </el-descriptions-item>
          <el-descriptions-item label="不良数量">
            {{ currentRecord.DefectiveQty }}
          </el-descriptions-item>
          <el-descriptions-item label="不良率">
            <span :class="getDefectiveRateClass(currentRecord.DefectiveRate)">
              {{ currentRecord.DefectiveRate ? currentRecord.DefectiveRate.toFixed(2) + '%' : '-' }}
            </span>
          </el-descriptions-item>
          <el-descriptions-item label="责任人">
            {{ currentRecord.ResponsiblePerson }}
          </el-descriptions-item>
          <el-descriptions-item label="不良原因" :span="2">
            {{ currentRecord.DefectiveReason }}
          </el-descriptions-item>
          <el-descriptions-item label="返工人员">
            {{ currentRecord.ReworkPersonnel }}
          </el-descriptions-item>
          <el-descriptions-item label="返工工时">
            {{ currentRecord.ReworkHours ? currentRecord.ReworkHours + 'h' : '-' }}
          </el-descriptions-item>
          <el-descriptions-item label="总成本">
            <span class="cost-amount">
              {{ currentRecord.TotalCost ? '¥' + currentRecord.TotalCost.toFixed(2) : '-' }}
            </span>
          </el-descriptions-item>
          <el-descriptions-item label="返工状态">
            <el-tag :type="getStatusType(currentRecord.ReworkStatus)">
              {{ currentRecord.ReworkStatus }}
            </el-tag>
          </el-descriptions-item>
        </el-descriptions>
      </div>
    </el-dialog>
  </AppLayout>
</template>

<script setup name="ReworkAnalysis">
import { ref, reactive, onMounted, computed, nextTick, watch } from 'vue'
import { ElMessage } from 'element-plus'
import {
  Tools, TrendCharts, PieChart,
  DataBoard, List, Search, Download, View, Refresh,
  Warning, Money
} from '@element-plus/icons-vue'
import * as echarts from 'echarts'
import api from '@/services/api.js'
import AppLayout from '../components/common/AppLayout.vue'
import ContentWrapper from '../components/common/ContentWrapper.vue'

// 响应式数据
const loading = ref(false)
const tableLoading = ref(false)
const exportLoading = ref(false)
const detailVisible = ref(false)
const currentRecord = ref(null)
const searchKeyword = ref('')

// 标签页相关
const activeTab = ref('statistics') // 默认显示工时损耗统计标签页
const activeChartTab = ref('trend') // 图表标签页
const statisticsData = ref([])
const statisticsLoading = ref(false)
const ganttChartRef = ref(null)
let ganttChart = null
// 横道图显示模式：hours(工时) 或 cost(金额)
const ganttDisplayMode = ref('hours')

// 图表数据源
const trendData = ref([])
const deptData = ref([])
const categoryData = ref([])
const costData = ref([])
// 计算当前年份
const now = new Date()
const currentYear = ref(now.getFullYear())
const selectedYear = ref(currentYear.value)

// 时间筛选相关数据
const timeType = ref('year') // 默认设置为年度，显示当前年份所有月份的趋势数据
const selectedQuarter = ref(Math.ceil((now.getMonth() + 1) / 3)) // 当前季度
const selectedMonth = ref(now.getMonth() + 1) // 当前月份
const selectedWeek = ref(1) // 当前周次

// 筛选条件相关
const selectedDepartment = ref('')
const selectedWorkshop = ref('')
const selectedResponsiblePerson = ref('')
const filterOptions = ref({
  departments: [],
  workshops: [],
  persons: []
})

// 图表引用
const trendChartRef = ref(null)
const deptChartRef = ref(null)
const categoryChartRef = ref(null)
const costChartRef = ref(null)

// 图表实例
let trendChart = null
let deptChart = null
let categoryChart = null
let costChart = null

// 统计数据
const yearlyStats = reactive({
  totalCount: 0,
  totalDefectiveQty: 0,
  totalCost: 0,
  avgDefectiveRate: 0
})

// 表格数据
const tableData = ref([])
const tablePagination = reactive({
  current: 1,
  pageSize: 5,  // 默认分页数设为5条/页
  total: 0
})

// 计算属性
const availableYears = computed(() => {
  const years = []
  for (let i = currentYear.value; i >= currentYear.value - 5; i--) {
    years.push(i)
  }
  return years
})

// 可选月份列表
const availableMonths = computed(() => {
  const months = []
  for (let i = 1; i <= 12; i++) {
    months.push({
      value: i,
      label: `${i}月`
    })
  }
  return months
})

// 可选周次列表（基于选择的年份）
const availableWeeks = computed(() => {
  const weeks = []
  const year = selectedYear.value
  // 计算该年的总周数
  const totalWeeks = getWeeksInYear(year)
  for (let i = 1; i <= totalWeeks; i++) {
    const weekRange = getWeekRange(year, i)
    weeks.push({
      value: i,
      label: `第${i}周 (${weekRange})`
    })
  }
  return weeks
})

// 生命周期
onMounted(() => {
  // 初始化加载数据（已设置为上个月）
  loadAllData()
  initCharts()
  loadFilterOptions()
  // 由于默认显示统计标签页，需要初始化加载统计数据
  loadStatisticsData()
})

// 监听筛选条件变化
watch([selectedYear, selectedMonth, selectedWeek, selectedDepartment, selectedWorkshop, selectedResponsiblePerson, timeType], () => {
  loadAllData()
  // 如果当前在统计页面，也需要重新加载统计数据
  if (activeTab.value === 'statistics') {
    loadStatisticsData()
  }
})

// 监听标签页切换
watch(activeTab, (newTab) => {
  if (newTab === 'statistics') {
    loadStatisticsData()
  }
})

// 监听图表标签页切换
watch(activeChartTab, (newTab) => {
  nextTick(() => {
    // 根据切换的标签页重新初始化对应的图表
    switch (newTab) {
      case 'trend':
        if (trendChartRef.value && !trendChart) {
          trendChart = echarts.init(trendChartRef.value, null, {
            width: 'auto',
            height: 'auto'
          })
          if (trendData.value.length > 0) {
            updateTrendChart(trendData.value)
          }
        }
        // 强制调用resize确保图表适应容器
        if (trendChart) {
          setTimeout(() => {
            trendChart.resize()
          }, 100)
        }
        break
      case 'department':
        if (deptChartRef.value && !deptChart) {
          deptChart = echarts.init(deptChartRef.value, null, {
            width: 'auto',
            height: 'auto'
          })
          if (deptData.value.length > 0) {
            updateDeptChart(deptData.value)
          }
        }
        // 强制调用resize确保图表适应容器
        if (deptChart) {
          setTimeout(() => {
            deptChart.resize()
          }, 100)
        }
        break
      case 'category':
        if (categoryChartRef.value && !categoryChart) {
          categoryChart = echarts.init(categoryChartRef.value, null, {
            width: 'auto',
            height: 'auto'
          })
          if (categoryData.value.length > 0) {
            updateCategoryChart(categoryData.value)
          }
        }
        // 强制调用resize确保图表适应容器
        if (categoryChart) {
          setTimeout(() => {
            categoryChart.resize()
          }, 100)
        }
        break
      case 'cost':
        if (costChartRef.value && !costChart) {
          costChart = echarts.init(costChartRef.value, null, {
            width: 'auto',
            height: 'auto'
          })
          if (costData.value.length > 0) {
            updateCostChart(costData.value)
          }
        }
        // 强制调用resize确保图表适应容器
        if (costChart) {
          setTimeout(() => {
            costChart.resize()
          }, 100)
        }
        break
    }
  })
})

// 方法定义
const loadAllData = async () => {
  await Promise.all([
    loadSummaryData(),
    loadTableData()
  ])
}

/**
 * 处理Tab标签页点击事件
 * @param {Object} tab - 标签页对象
 */
const handleTabClick = (tab) => {
  const tabName = tab.props.name
  
  // 如果切换到统计页面，加载统计数据
  if (tabName === 'statistics') {
    loadStatisticsData()
  }
}

/**
   * 加载筛选选项
   */
  const loadFilterOptions = async () => {
    try {
      const response = await api.get('/rework/options')
      if (response.data.success) {
        filterOptions.value = response.data.data
      }
    } catch (error) {
      console.error('加载筛选选项失败:', error)
    }
  }

/**
 * 加载汇总数据
 */
const loadSummaryData = async () => {
  try {
    const timeRange = getTimeRange()
    const response = await api.get('/rework/statistics/summary', {
      params: { 
        year: selectedYear.value,
        startDate: timeRange.startDate,
        endDate: timeRange.endDate,
        timeType: timeType.value,
        department: selectedDepartment.value,
        workshop: selectedWorkshop.value,
        responsiblePerson: selectedResponsiblePerson.value
      }
    })
    
    if (response.data.success) {
      const data = response.data.data
      
      // 更新时间范围统计
      Object.assign(yearlyStats, {
        totalCount: data.yearly?.TotalReworkCount || 0,
        totalDefectiveQty: data.yearly?.TotalDefectiveQty || 0,
        totalCost: data.yearly?.TotalCost || 0,
        avgDefectiveRate: data.yearly?.AvgDefectiveRate || 0
      })
      
      // 更新图表数据和数据源
      const deptChartData = data.byDepartment || []
      const categoryChartData = data.byCategory || []
      
      updateDeptChart(deptChartData)
      updateCategoryChart(categoryChartData)
      
      // 更新数据源
      deptData.value = deptChartData
      categoryData.value = categoryChartData
      
      // 同时加载趋势数据
      await loadTrendData()
    }
  } catch (error) {
    console.error('加载汇总数据失败:', error)
    ElMessage.error('加载汇总数据失败')
  }
}

/**
 * 加载趋势数据
 */
const loadTrendData = async () => {
  try {
    const timeRange = getTimeRange()
    
    const response = await api.get('/rework/statistics/trend', {
      params: {
        startDate: timeRange.startDate,
        endDate: timeRange.endDate,
        groupBy: timeType.value === 'year' ? 'month' : timeType.value, // 年度数据按月份分组显示趋势
        timeType: timeType.value,
        department: selectedDepartment.value,
        workshop: selectedWorkshop.value,
        responsiblePerson: selectedResponsiblePerson.value
      }
    })
    
    if (response.data.success) {
      const chartData = response.data.data || []
      updateTrendChart(chartData)
      updateCostChart(chartData)
      
      // 更新数据源
      trendData.value = chartData
      costData.value = chartData
    }
  } catch (error) {
    console.error('加载趋势数据失败:', error)
    ElMessage.error('加载趋势数据失败')
  }
}

/**
 * 加载表格数据
 */
const loadTableData = async () => {
  try {
    tableLoading.value = true
    const timeRange = getTimeRange()
    const response = await api.get('/rework/list', {
      params: {
        page: tablePagination.current,
        pageSize: tablePagination.pageSize,
        keyword: searchKeyword.value,
        year: selectedYear.value,
        startDate: timeRange.startDate,
        endDate: timeRange.endDate,
        timeType: timeType.value,
        department: selectedDepartment.value,
        workshop: selectedWorkshop.value,
        responsiblePerson: selectedResponsiblePerson.value
      }
    })
    
    if (response.data.success) {
      tableData.value = response.data.data || []
      tablePagination.total = response.data.pagination?.total || 0
    }
  } catch (error) {
    console.error('加载表格数据失败:', error)
    ElMessage.error('加载表格数据失败')
  } finally {
    tableLoading.value = false
  }
}

/**
 * 时间类型变更处理
 */
const onTimeTypeChange = () => {
  // 重置时间选择为默认值
  switch (timeType.value) {
    case 'quarter':
      selectedQuarter.value = Math.ceil((new Date().getMonth() + 1) / 3)
      break
    case 'month':
      selectedMonth.value = new Date().getMonth() + 1
      break
    case 'week':
      selectedWeek.value = 1
      break
  }
  loadTimeRangeData()
}

/**
 * 年份变更处理
 */
const onYearChange = () => {
  // 如果是周次选择，需要重置周次为1（因为不同年份的周数可能不同）
  if (timeType.value === 'week') {
    selectedWeek.value = 1
  }
  loadTimeRangeData()
}

/**
 * 加载时间范围数据
 */
const loadTimeRangeData = async () => {
  await Promise.all([
    loadSummaryData(),
    loadTableData()
  ])
}

/**
 * 重置筛选条件为当前年份的上个月
 */
const resetToCurrentMonth = () => {
  const now = new Date()
  const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1)
  
  timeType.value = 'month'
  selectedYear.value = lastMonth.getFullYear()
  selectedMonth.value = lastMonth.getMonth() + 1
  
  // 清空筛选条件
  selectedDepartment.value = ''
  selectedWorkshop.value = ''
  selectedResponsiblePerson.value = ''
  
  // 重新加载数据
  loadTimeRangeData()
}

/**
 * 获取时间范围标题
 */
const getTimeRangeTitle = () => {
  switch (timeType.value) {
    case 'year':
      return `${selectedYear.value}年度`
    case 'quarter':
      return `${selectedYear.value}年第${selectedQuarter.value}季度`
    case 'month':
      return `${selectedYear.value}年${selectedMonth.value}月`
    case 'week':
      return `${selectedYear.value}年第${selectedWeek.value}周`
    default:
      return `${selectedYear.value}年度`
  }
}

/**
 * 计算指定年份的总周数
 */
const getWeeksInYear = (year) => {
  const lastDayOfYear = new Date(year, 11, 31)
  const firstDayOfYear = new Date(year, 0, 1)
  const dayOfWeek = firstDayOfYear.getDay()
  const daysInYear = Math.ceil((lastDayOfYear - firstDayOfYear) / (24 * 60 * 60 * 1000)) + 1
  return Math.ceil((daysInYear + dayOfWeek) / 7)
}

/**
 * 获取指定年份和周次的日期范围
 */
const getWeekRange = (year, week) => {
  const firstDayOfYear = new Date(year, 0, 1)
  const dayOfWeek = firstDayOfYear.getDay()
  const startOfWeek = new Date(year, 0, 1 + (week - 1) * 7 - dayOfWeek + 1)
  const endOfWeek = new Date(startOfWeek)
  endOfWeek.setDate(startOfWeek.getDate() + 6)
  
  const formatDateShort = (date) => {
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${month}-${day}`
  }
  
  return `${formatDateShort(startOfWeek)}-${formatDateShort(endOfWeek)}`
}

/**
 * 获取时间范围
 */
const getTimeRange = () => {
  const year = selectedYear.value
  let startDate, endDate
  
  switch (timeType.value) {
    case 'year':
      startDate = `${year}-01-01`
      endDate = `${year}-12-31`
      break
    case 'quarter':
      const quarter = selectedQuarter.value
      const startMonth = (quarter - 1) * 3 + 1
      const endMonth = quarter * 3
      startDate = `${year}-${String(startMonth).padStart(2, '0')}-01`
      endDate = new Date(year, endMonth, 0).toISOString().split('T')[0]
      break
    case 'month':
      const month = selectedMonth.value
      startDate = `${year}-${String(month).padStart(2, '0')}-01`
      endDate = new Date(year, month, 0).toISOString().split('T')[0]
      break
    case 'week':
      const week = selectedWeek.value
      const firstDayOfYear = new Date(year, 0, 1)
      const dayOfWeek = firstDayOfYear.getDay()
      const startOfWeek = new Date(year, 0, 1 + (week - 1) * 7 - dayOfWeek + 1)
      const endOfWeek = new Date(startOfWeek)
      endOfWeek.setDate(startOfWeek.getDate() + 6)
      startDate = startOfWeek.toISOString().split('T')[0]
      endDate = endOfWeek.toISOString().split('T')[0]
      break
    default:
      startDate = `${year}-01-01`
      endDate = `${year}-12-31`
  }
  
  return { startDate, endDate }
}

// 图表初始化
const initCharts = () => {
  nextTick(() => {
    // 只初始化当前可见的图表容器
    if (trendChartRef.value && !trendChart) {
      trendChart = echarts.init(trendChartRef.value, null, {
        width: 'auto',
        height: 'auto'
      })
    }
    if (ganttChartRef.value && !ganttChart) {
      ganttChart = echarts.init(ganttChartRef.value, null, {
        width: 'auto',
        height: 'auto'
      })
    }
    
    // 监听窗口大小变化
    window.addEventListener('resize', () => {
      trendChart?.resize()
      deptChart?.resize()
      categoryChart?.resize()
      costChart?.resize()
      ganttChart?.resize()
    })
  })
}

// 图表更新方法
const updateTrendChart = (data) => {
  if (!trendChart && trendChartRef.value) {
    trendChart = echarts.init(trendChartRef.value, null, {
      width: 'auto',
      height: 'auto'
    })
  }
  if (!trendChart) return
  
  const option = {
    title: {
      text: `返工趋势 (${selectedYear.value}年)`,
      left: 'center',
      textStyle: { fontSize: 14 }
    },
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'cross' }
    },
    legend: {
      data: ['返工次数', '不良数量', '不良率'],
      bottom: 10,
      itemGap: 15
    },
    grid: {
      left: '2%',
      right: '1%',
      top: '15%',
      bottom: '15%',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      data: data.map(item => item.DateLabel),
      splitLine: { show: false }
    },
    yAxis: [
      {
        type: 'value',
        name: '返工次数',
        position: 'left',
        splitLine: { show: false },
        axisLabel: {
          formatter: '{value}次'
        }
      },
      {
        type: 'value',
        name: '不良数量',
        position: 'right',
        splitLine: { show: false },
        axisLabel: {
          formatter: '{value}个'
        }
      },
      {
        type: 'value',
        name: '不良率(%)',
        position: 'right',
        offset: 60,
        splitLine: { show: false },
        axisLabel: {
          formatter: '{value}%'
        }
      }
    ],
    series: [
      {
        name: '返工次数',
        type: 'bar',
        yAxisIndex: 0,
        barMaxWidth: 25,
        data: data.map(item => {
          const count = item.ReworkCount
          return (count !== null && count !== undefined && !isNaN(count)) ? Number(count) : 0
        }),
        itemStyle: { color: '#409EFF' }
      },
      {
        name: '不良数量',
        type: 'bar',
        yAxisIndex: 1,
        barMaxWidth: 25,
        data: data.map(item => {
          const qty = item.TotalDefectiveQty
          return (qty !== null && qty !== undefined && !isNaN(qty)) ? Number(qty) : 0
        }),
        itemStyle: { color: '#E6A23C' }
      },
      {
        name: '不良率',
        type: 'line',
        yAxisIndex: 2,
        symbolSize: 10,
        lineStyle: {
          width: 3
        },
        data: data.map(item => {
          const rate = item.AvgDefectiveRate
          if (rate !== null && rate !== undefined && !isNaN(rate)) {
            return Number(rate.toFixed(2))
          }
          return 0
        }),
        itemStyle: { color: '#F56C6C' }
      }
    ]
  }
  
  trendChart.setOption(option)
  // 强制调用resize确保图表适应容器
  setTimeout(() => {
    trendChart.resize()
  }, 100)
}

const updateDeptChart = (data) => {
  if (!deptChart && deptChartRef.value) {
    deptChart = echarts.init(deptChartRef.value, null, {
      width: 'auto',
      height: 'auto'
    })
  }
  if (!deptChart) return
  
  const option = {
    title: {
      text: '部门返工分布',
      left: 'center',
      textStyle: { fontSize: 14 }
    },
    tooltip: {
      trigger: 'item',
      formatter: '{a} <br/>{b}: {c} ({d}%)'
    },
    legend: {
      orient: 'vertical',
      left: 'left',
      top: 'middle',
      itemGap: 8
    },
    series: [
      {
        name: '返工次数',
        type: 'pie',
        radius: ['20%', '70%'],
        roseType: 'area',
        data: data.map(item => ({
          value: item.ReworkCount,
          name: item.ResponsibleDept
        })),
        emphasis: {
          itemStyle: {
            shadowBlur: 10,
            shadowOffsetX: 0,
            shadowColor: 'rgba(0, 0, 0, 0.5)'
          }
        }
      }
    ]
  }
  
  deptChart.setOption(option)
  // 强制调用resize确保图表适应容器
  setTimeout(() => {
    deptChart.resize()
  }, 100)
}

const updateCategoryChart = (data) => {
  if (!categoryChart && categoryChartRef.value) {
    categoryChart = echarts.init(categoryChartRef.value, null, {
      width: 'auto',
      height: 'auto'
    })
  }
  if (!categoryChart) return
  
  const option = {
    title: {
      text: '不良类别分析',
      left: 'center',
      textStyle: { fontSize: 14 }
    },
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' }
    },
    xAxis: {
      type: 'category',
      data: data.map(item => item.DefectiveCategory),
      axisLabel: {
        rotate: 45
      },
      splitLine: { show: false }
    },
    yAxis: {
      type: 'value',
      name: '返工次数',
      splitLine: { show: false }
    },
    series: [
      {
        name: '返工次数',
        type: 'bar',
        barMaxWidth: 50,
        data: data.map(item => item.ReworkCount),
        itemStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: '#409EFF' },
            { offset: 0.5, color: '#337ecc' },
            { offset: 1, color: '#337ecc' }
          ]),
          borderRadius: [10, 10, 0, 0]  // 顶部半圆形末端
        }
      }
    ]
  }
  
  categoryChart.setOption(option)
  // 强制调用resize确保图表适应容器
  setTimeout(() => {
    categoryChart.resize()
  }, 100)
}

const updateCostChart = (data) => {
  if (!costChart && costChartRef.value) {
    costChart = echarts.init(costChartRef.value, null, {
      width: 'auto',
      height: 'auto'
    })
  }
  if (!costChart) return
  
  const option = {
    title: {
      text: `返工成本分析 (${selectedYear.value}年)`,
      left: 'center',
      textStyle: { fontSize: 14 }
    },
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'cross' }
    },
    legend: {
      data: ['总成本', '平均成本'],
      bottom: 10,
      itemGap: 15
    },
    xAxis: {
      type: 'category',
      data: data.map(item => item.DateLabel),
      splitLine: { show: false }
    },
    yAxis: {
      type: 'value',
      name: '成本(元)',
      splitLine: { show: false }
    },
    series: [
      {
        name: '总成本',
        type: 'bar',
        barMaxWidth: 50,
        data: data.map(item => {
          const cost = item.TotalCost
          return (cost !== null && cost !== undefined && !isNaN(cost)) ? Number(cost.toFixed(2)) : 0
        }),
        itemStyle: { color: '#67C23A' }
      },
      {
        name: '平均成本',
        type: 'line',
        data: data.map(item => {
          const avgCost = item.AvgCost
          if (avgCost !== null && avgCost !== undefined && !isNaN(avgCost)) {
            return Number(avgCost.toFixed(2))
          }
          return 0
        }),
        itemStyle: { color: '#E6A23C' }
      }
    ]
  }
  
  costChart.setOption(option)
  // 强制调用resize确保图表适应容器
  setTimeout(() => {
    costChart.resize()
  }, 100)
}

// 事件处理方法
const handleTableSizeChange = (size) => {
  tablePagination.pageSize = size
  tablePagination.current = 1
  loadTableData()
}

const handleTableCurrentChange = (page) => {
  tablePagination.current = page
  loadTableData()
}

const viewDetail = (row) => {
  currentRecord.value = row
  detailVisible.value = true
}

const exportTableData = async () => {
  try {
    exportLoading.value = true
    ElMessage.info('导出功能开发中')
  } catch (error) {
    console.error('导出失败:', error)
    ElMessage.error('导出失败')
  } finally {
    exportLoading.value = false
  }
}

// 工具方法
const formatDate = (date) => {
  if (!date) return '-'
  
  try {
    const dateObj = new Date(date)
    if (isNaN(dateObj.getTime())) return date
    
    // 使用本地时区的年月日，避免UTC转换，格式化为yyyy-mm-dd
    const year = dateObj.getFullYear()
    const month = String(dateObj.getMonth() + 1).padStart(2, '0')
    const day = String(dateObj.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  } catch (error) {
    return date
  }
}

const getDefectiveRateClass = (rate) => {
  if (!rate) return ''
  if (rate < 1) return 'rate-low'
  if (rate < 3) return 'rate-medium'
  return 'rate-high'
}

const getStatusType = (status) => {
  const statusMap = {
    '进行中': 'warning',
    '已完成': 'success',
    '已取消': 'info',
    '待审核': 'primary'
  }
  return statusMap[status] || 'info'
}

// 获取类型标签类型
const getTypeTagType = (type) => {
  const typeMap = {
    '部门': 'primary',
    '车间': 'success',
    '人员': 'warning'
  }
  return typeMap[type] || 'info'
}

// 获取占比样式类
const getPercentageClass = (percentage) => {
  if (percentage >= 30) return 'high-percentage'
  if (percentage >= 15) return 'medium-percentage'
  return 'low-percentage'
}

// 加载统计数据
const loadStatisticsData = async () => {
  try {
    statisticsLoading.value = true
    const timeRange = getTimeRange()
    const response = await api.get('/rework/statistics/hours', {
      params: {
        startDate: timeRange.startDate,
        endDate: timeRange.endDate,
        timeType: timeType.value,
        department: selectedDepartment.value,
        workshop: selectedWorkshop.value,
        responsiblePerson: selectedResponsiblePerson.value
      }
    })
    
    if (response.data.success) {
      statisticsData.value = response.data.data || []
      // 渲染横道图
      renderGanttChart(statisticsData.value)
    }
  } catch (error) {
    console.error('加载统计数据失败:', error)
    ElMessage.error('加载统计数据失败')
  } finally {
    statisticsLoading.value = false
  }
}

// 渲染横道图
const renderGanttChart = (data) => {
  if (!ganttChartRef.value) return
  
  if (!ganttChart) {
    ganttChart = echarts.init(ganttChartRef.value, null, {
      width: 'auto',
      height: 'auto'
    })
  }
  
  // 根据显示模式确定数据和配置
  const isHoursMode = ganttDisplayMode.value === 'hours'
  const chartTitle = isHoursMode ? '工时损耗横道图' : '金额损耗横道图'
  const xAxisName = isHoursMode ? '工时(h)' : '金额(¥)'
  const seriesName = isHoursMode ? '工时损耗' : '金额损耗'
  
  const option = {
    // title: {
    //   text: chartTitle,
    //   left: 'center',
    //   textStyle: { fontSize: 14 }
    // },
    grid: {
      top: 20,
      bottom: 40,
      left: 80,
      right: 80,
      containLabel: false
    },
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      formatter: function(params) {
        const data = params[0]
        if (isHoursMode) {
          return `${data.name}<br/>工时: ${data.value}h<br/>占比: ${data.data.percentage}%`
        } else {
          return `${data.name}<br/>金额: ¥${data.value.toFixed(2)}<br/>占比: ${data.data.percentage}%`
        }
      }
    },
    xAxis: {
      type: 'value',
      name: xAxisName,
      splitLine: {
        show: false
      }
    },
    yAxis: {
      type: 'category',
      data: data.map(item => item.name),
      axisLabel: {
        width: 100,
        overflow: 'truncate'
      }
    },
    series: [
      {
        name: seriesName,
        type: 'bar',
        data: data.map(item => ({
          value: isHoursMode ? (item.totalHours || 0) : (item.totalCost || 0),
          percentage: (item.percentage || 0).toFixed(1),
          itemStyle: {
            color: item.percentage >= 30 ? '#F56C6C' : 
                   item.percentage >= 15 ? '#E6A23C' : '#67C23A',
            borderRadius: [0, 10, 10, 0]  // 右侧半圆形末端
          }
        })),
        label: {
          show: true,
          position: 'right',
          formatter: isHoursMode ? '{c}h' : '¥{c}'
        },
        backgroundStyle: {
          color: 'rgba(255, 205, 205,0.2)'
        },
        showBackground: true
      }
    ]
  }
  
  ganttChart.setOption(option)
  // 强制调用resize确保图表适应容器
  setTimeout(() => {
    ganttChart.resize()
  }, 100)
}

/**
 * 更新横道图显示模式
 */
const updateGanttChart = () => {
  if (statisticsData.value && statisticsData.value.length > 0) {
    renderGanttChart(statisticsData.value)
    // 强制调用resize确保图表适应容器
    setTimeout(() => {
      if (ganttChart) {
        ganttChart.resize()
      }
    }, 100)
  }
}
</script>

<style scoped>
/* 年度统计卡片整体样式 */
.yearly-summary {
  margin-bottom: 24px;
  background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
  border-radius: 20px;
  box-shadow: 0 6px 30px rgba(0, 0, 0, 0.08);
  border: 1px solid #e1f5fe;
  overflow: hidden;
  position: relative;
}

.yearly-summary::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 6px;
  background: linear-gradient(90deg, #409eff 0%, #67c23a 50%, #e6a23c 75%, #f56c6c 100%);
}

.yearly-summary .el-card__header {
  background: linear-gradient(135deg, #f8fafc 0%, #e3f2fd 100%);
  border-bottom: 2px solid #e1f5fe;
  padding: 20px 24px;
}

.yearly-summary .el-card__body {
  padding: 32px 24px;
  background: transparent;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-weight: 600;
}

/* 选择器组件字体样式重置 */
.card-header .time-filter-group .el-select {
  font-weight: normal;
}

.card-header .time-filter-group .el-select .el-input__inner {
  font-weight: normal;
}

.card-header .time-filter-group .el-select .el-input__wrapper {
  font-weight: normal;
}

/* 统计卡片美化样式 */
.summary-item {
  display: flex;
  align-items: center;
  padding: 24px 20px;
  background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
  border-radius: 16px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  border: 1px solid #e1f5fe;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  cursor: pointer;
  position: relative;
  overflow: hidden;
}

.summary-item::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 4px;
  background: linear-gradient(90deg, #409eff 0%, #67c23a 100%);
  transform: scaleX(0);
  transition: transform 0.3s ease;
}

.summary-item:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.12);
}

.summary-item:hover::before {
  transform: scaleX(1);
}

/* 不同类型卡片的特定样式 */
.summary-item-primary {
  background: linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%);
  border-color: #409eff;
}

.summary-item-warning {
  background: linear-gradient(135deg, #fff8e1 0%, #ffecb3 100%);
  border-color: #e6a23c;
}

.summary-item-danger {
  background: linear-gradient(135deg, #ffebee 0%, #ffcdd2 100%);
  border-color: #f56c6c;
}

.summary-item-info {
  background: linear-gradient(135deg, #f3e5f5 0%, #e1bee7 100%);
  border-color: #909399;
}

.summary-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 56px;
  height: 56px;
  border-radius: 50%;
  margin-right: 16px;
  font-size: 24px;
  transition: all 0.3s ease;
}

.summary-item-primary .summary-icon {
  background: linear-gradient(135deg, #409eff 0%, #66b3ff 100%);
  color: white;
  box-shadow: 0 4px 12px rgba(64, 158, 255, 0.3);
}

.summary-item-warning .summary-icon {
  background: linear-gradient(135deg, #e6a23c 0%, #f0b90b 100%);
  color: white;
  box-shadow: 0 4px 12px rgba(230, 162, 60, 0.3);
}

.summary-item-danger .summary-icon {
  background: linear-gradient(135deg, #f56c6c 0%, #ff8a95 100%);
  color: white;
  box-shadow: 0 4px 12px rgba(245, 108, 108, 0.3);
}

.summary-item-info .summary-icon {
  background: linear-gradient(135deg, #909399 0%, #a6a9ad 100%);
  color: white;
  box-shadow: 0 4px 12px rgba(144, 147, 153, 0.3);
}

.summary-item:hover .summary-icon {
  transform: scale(1.1) rotate(5deg);
}

.summary-content {
  flex: 1;
  text-align: left;
}

.summary-label {
  font-size: 14px;
  color: #606266;
  margin-bottom: 8px;
  font-weight: 500;
  letter-spacing: 0.5px;
  font-family: 'Segoe UI', 'Roboto', 'Helvetica Neue', Arial, sans-serif;
}

.summary-value {
  font-size: 32px;
  font-weight: normal;
  margin-bottom: 4px;
  line-height: 1.2;
  background: linear-gradient(135deg, #303133 0%, #606266 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  font-family: 'Segoe UI', 'Roboto', 'Helvetica Neue', Arial, sans-serif;
}

/* 不同类型卡片的数字渐变效果 */
.summary-item-primary .summary-value {
  background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 50%, #1e40af 100%) !important;
  -webkit-background-clip: text !important;
  -webkit-text-fill-color: transparent !important;
  background-clip: text !important;
  background-size: 200% 100% !important;
  animation: shimmer 3s ease-in-out infinite !important;
}

.summary-item-warning .summary-value {
  background: linear-gradient(135deg, #92400e 0%, #f59e0b 50%, #b45309 100%) !important;
  -webkit-background-clip: text !important;
  -webkit-text-fill-color: transparent !important;
  background-clip: text !important;
  background-size: 200% 100% !important;
  animation: shimmer 3s ease-in-out infinite !important;
}

.summary-item-danger .summary-value {
  background: linear-gradient(135deg, #991b1b 0%, #ef4444 50%, #b91c1c 100%) !important;
  -webkit-background-clip: text !important;
  -webkit-text-fill-color: transparent !important;
  background-clip: text !important;
  background-size: 200% 100% !important;
  animation: shimmer 3s ease-in-out infinite !important;
}

.summary-item-info .summary-value {
  background: linear-gradient(135deg, #374151 0%, #6b7280 50%, #4b5563 100%) !important;
  -webkit-background-clip: text !important;
  -webkit-text-fill-color: transparent !important;
  background-clip: text !important;
  background-size: 200% 100% !important;
  animation: shimmer 3s ease-in-out infinite !important;
}

.charts-section {
  margin-bottom: 20px;
}

.chart-card {
  height: 400px;
}

.chart-container {
  height: 320px;
  width: 100%;
  max-width: 100%;
}

.table-card {
  margin-bottom: 20px;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.pagination-wrapper {
  display: flex;
  justify-content: center;
  margin-top: 20px;
}

.cost-amount {
  color: #67C23A;
  font-weight: bold;
}

.rate-low {
  color: #67C23A;
}

.rate-medium {
  color: #E6A23C;
}

.rate-high {
  color: #F56C6C;
}

.detail-content {
  max-height: 500px;
  overflow-y: auto;
}

.tab-header {
  /* margin-bottom: 20px; */
  padding-bottom: 10px;
  border-bottom: 1px solid #EBEEF5;
}

.statistics-content {
  padding: 0;
}

.statistics-table {
  margin-bottom: 10px;
}

#pane-statistics {
  max-height: 430px !important;
  margin-bottom: 20px;
}

.gantt-chart {
  background: #fff;
  border: 1px solid #EBEEF5;
  border-radius: 4px;
}

.chart-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid #f0f0f0;
}

.chart-title {
  font-size: 16px;
  font-weight: 400;
  color: #303133;
  margin: 2px 0;
}

.high-percentage {
  color: #F56C6C;
  font-weight: bold;
}

.medium-percentage {
  color: #E6A23C;
  font-weight: bold;
}

.low-percentage {
  color: #67C23A;
  font-weight: bold;
}

/* 图表分析卡片样式 */
.charts-analysis-card {
  margin-bottom: 20px;
  max-height: 500px;
  background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
  border-radius: 12px;
  box-shadow: 0 2px 12px rgba(64, 158, 255, 0.08);
  overflow: hidden;
  border: 1px solid #e1f5fe;
}

/* 响应式设计 - 修复图标挤扁和字体大小问题 */
/* 加强图标等比缩放保护 */
.summary-icon {
  min-width: 56px !important;
  min-height: 56px !important;
  max-width: 56px !important;
  max-height: 56px !important;
  flex-shrink: 0 !important;
  flex-grow: 0 !important;
  aspect-ratio: 1 / 1 !important;
  object-fit: contain !important;
}

/* 统计数字响应式字体 - 增强响应式版本 */
.summary-value {
  font-size: clamp(16px, 5vw, 36px) !important;
  font-weight: 800 !important;
  white-space: nowrap !important;
  letter-spacing: -0.5px !important;
  line-height: 1.1 !important;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1) !important;
  /* 增强渐变文字效果 */
  background: linear-gradient(135deg, #2c3e50 0%, #3498db 50%, #2c3e50 100%) !important;
  -webkit-background-clip: text !important;
  -webkit-text-fill-color: transparent !important;
  background-clip: text !important;
  background-size: 200% 100% !important;
  animation: shimmer 3s ease-in-out infinite !important;
}

/* 数字闪烁动画 */
@keyframes shimmer {
  0% { background-position: -200% 0; }
  50% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

.summary-label {
  font-size: clamp(9px, 2.8vw, 15px) !important;
  font-weight: 600 !important;
  letter-spacing: 0.3px !important;
}

/* 额外的响应式断点确保字体缩放 */
@media (max-width: 480px) {
  .summary-value {
    font-size: clamp(14px, 6vw, 20px) !important;
  }
  
  .summary-label {
    font-size: clamp(8px, 3vw, 12px) !important;
  }
}

@media (max-width: 320px) {
  .summary-value {
    font-size: clamp(12px, 7vw, 16px) !important;
  }
  
  .summary-label {
    font-size: clamp(7px, 3.5vw, 10px) !important;
  }
}

@media (max-width: 1200px) {
  .summary-item {
    padding: 20px 16px;
  }
  
  .summary-icon {
    min-width: 48px !important;
    min-height: 48px !important;
    max-width: 48px !important;
    max-height: 48px !important;
    font-size: 20px !important;
    margin-right: 12px;
  }
}

@media (max-width: 992px) {
  .summary-item {
    padding: 16px 12px;
  }
  
  .summary-icon {
    min-width: 40px !important;
    min-height: 40px !important;
    max-width: 40px !important;
    max-height: 40px !important;
    font-size: 18px !important;
    margin-right: 10px;
  }
}

@media (max-width: 768px) {
  .summary-item {
    padding: 12px 8px;
    flex-direction: column;
    text-align: center;
  }
  
  .summary-icon {
    min-width: 36px !important;
    min-height: 36px !important;
    max-width: 36px !important;
    max-height: 36px !important;
    font-size: 16px !important;
    margin-right: 0;
    margin-bottom: 8px;
  }
  
  .summary-content {
    text-align: center;
  }
}

@media (max-width: 576px) {
  .summary-item {
    padding: 10px 6px;
  }
  
  .summary-icon {
    min-width: 32px !important;
    min-height: 32px !important;
    max-width: 32px !important;
    max-height: 32px !important;
    font-size: 14px !important;
  }
}

/* 容器级别的响应式保护 */
.yearly-summary .el-row {
  flex-wrap: wrap !important;
}

.yearly-summary .el-col {
  min-width: 0 !important;
  flex-basis: auto !important;
}

/* 统计卡片行布局优化 */
.summary-cards-row {
  display: flex !important;
  justify-content: center !important;
  align-items: stretch !important;
  flex-wrap: wrap !important;
  margin: 0 auto !important;
}

/* 小屏幕下4个卡片布局优化 */
@media (min-width: 576px) {
  .summary-cards-row {
    justify-content: space-between !important;
  }
  
  .summary-cards-row .el-col {
    flex: 1 !important;
    max-width: calc(25% - 15px) !important;
    min-width: 200px !important;
  }
}

/* 中等屏幕下的布局优化 */
@media (min-width: 768px) {
  .summary-cards-row .el-col {
    min-width: 220px !important;
  }
}

/* 大屏幕下的居中对齐和平均分布 */
@media (min-width: 1200px) {
  .summary-cards-row {
    max-width: 1400px !important;
    margin: 0 auto !important;
    justify-content: space-between !important;
    gap: 20px !important;
  }
  
  .summary-cards-row .el-col {
    flex: 1 !important;
    max-width: calc(25% - 15px) !important;
    min-width: 240px !important;
  }
}

@media (min-width: 1400px) {
  .summary-cards-row {
    max-width: 1600px !important;
    justify-content: space-between !important;
    gap: 25px !important;
  }
  
  .summary-cards-row .el-col {
    flex: 1 !important;
    max-width: calc(25% - 20px) !important;
    min-width: 260px !important;
  }
}

@media (min-width: 1600px) {
  .summary-cards-row {
    max-width: 1800px !important;
    justify-content: space-between !important;
    gap: 30px !important;
  }
  
  .summary-cards-row .el-col {
    flex: 1 !important;
    max-width: calc(25% - 25px) !important;
    min-width: 280px !important;
  }
}

.chart-tabs {
  min-height: 500px;
}

/* Element Plus 标签页美化 */
.charts-analysis-card .el-tabs__header {
  background: linear-gradient(90deg, #f0f9ff 0%, #e0f2fe 100%);
  margin: 0;
  padding: 0 20px;
  border-bottom: 2px solid #e1f5fe;
}

.charts-analysis-card .el-tabs__nav-wrap {
  padding: 8px 0;
}

.charts-analysis-card .el-tabs__item {
  color: #606266;
  font-weight: 500;
  transition: all 0.3s ease;
  border-radius: 6px 6px 0 0;
  margin-right: 4px;
}

.charts-analysis-card .el-tabs__item:hover {
  color: #409eff;
  background: rgba(64, 158, 255, 0.1);
}

.charts-analysis-card .el-tabs__item.is-active {
  color: #409eff;
  background: rgba(64, 158, 255, 0.15);
  font-weight: 600;
}

.charts-analysis-card .el-tabs__active-bar {
  background: linear-gradient(90deg, #409eff 0%, #67c23a 100%);
  height: 3px;
  border-radius: 2px;
}

.charts-analysis-card .el-tabs__content {
  padding: 20px;
  background: rgba(255, 255, 255, 0.5);
}

.chart-data-panel {
  background: #f8f9fa;
  border: 1px solid #e9ecef;
  border-radius: 6px;
  padding: 16px;
  overflow: hidden;
}

.data-panel-title {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0 0 16px 0;
  font-size: 14px;
  font-weight: 600;
  color: #303133;
  border-bottom: 1px solid #e4e7ed;
  padding-bottom: 8px;
}

.chart-panel {
  background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 50%, #f8fafc 100%);
  border: 1px solid #e1f5fe;
  border-radius: 12px;
  padding: 20px;
  height: calc(100% - 32px);
  box-sizing: border-box;
  overflow: hidden;
  box-shadow: 0 4px 12px rgba(64, 158, 255, 0.1);
  transition: all 0.3s ease;
  position: relative;
}

.chart-panel::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: linear-gradient(90deg, #409eff 0%, #67c23a 50%, #409eff 100%);
  border-radius: 12px 12px 0 0;
}

.chart-panel:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(64, 158, 255, 0.15);
}

.chart-panel .chart-container {
  width: 100% !important;
  min-width: 100% !important;
  height: 100% !important;
  min-height: 300px !important;
  max-height: 380px !important;
  box-sizing: border-box !important;
  overflow: hidden !important;
  background: rgba(255, 255, 255, 0.8);
  border-radius: 8px;
  padding: 12px;
  backdrop-filter: blur(10px);
  border: 1px solid rgba(64, 158, 255, 0.1);
}

/* 强制所有图表容器及其内部元素宽度 */
.chart-panel .chart-container > div {
  width: 100% !important;
  min-width: 100% !important;
  max-width: 100% !important;
  box-sizing: border-box !important;
}

/* 确保ECharts canvas元素宽度 */
.chart-panel canvas {
  width: 100% !important;
  max-width: 100% !important;
}

/* 确保ECharts SVG元素宽度 */
.chart-panel svg {
  width: 100% !important;
  max-width: 100% !important;
  min-width: 100% !important;
}

/* 针对所有可能的ECharts内部容器 */
.chart-panel [style*="width"] {
  width: 100% !important;
  max-width: 100% !important;
}

/* 数据分析卡片样式 */
.data-analysis-card {
  margin-bottom: 20px;
  width: 100% !important;
  max-width: 100% !important;
  box-sizing: border-box !important;
}

.data-analysis-card .el-card__body {
  padding: 0 !important;
  margin: 0 !important;
  width: 100% !important;
  max-width: 100% !important;
  box-sizing: border-box !important;
}

/* Tab内容区域样式 */
.el-tab-pane {
  width: 100% !important;
  margin: 0 !important;
  padding: 20px 20px 10px 20px !important;
  box-sizing: border-box !important;
  min-height: 400px;
}

/* 确保表格和图表占满宽度 */
.el-tab-pane .el-table {
  width: 100% !important;
  margin: 0 !important;
}

.gantt-chart {
  width: 100% !important;
  margin: 0 !important;
  box-sizing: border-box !important;
}

/* 强制覆盖所有可能的Element Plus标签页样式 */
.el-tabs {
  margin: 0 !important;
  width: 100% !important;
}

.el-tabs__content {
  margin: 0 !important;
  padding: 0 !important;
  width: 100% !important;
}

.el-tabs__nav-wrap {
  margin: 0 !important;
  width: 100% !important;
}

.el-tabs__header {
  margin: 0 !important;
  width: 100% !important;
}

/* 特别针对工时损耗统计标签页的样式 */
.statistics-content {
  width: 100% !important;
  margin: 0 !important;
  padding: 20px !important;
  box-sizing: border-box !important;
}

.statistics-table {
  width: 100% !important;
  margin: 0 !important;
  box-sizing: border-box !important;
}

.statistics-table .el-table {
  width: 100% !important;
  margin: 0 !important;
}

/* 确保横道图容器也不会收缩 */
.gantt-chart {
  width: 100% !important;
  min-width: 100% !important;
  max-width: 100% !important;
  margin: 0 !important;
  padding: 0 !important;
  box-sizing: border-box !important;
  overflow: hidden !important;
}

.gantt-chart .chart-container {
  width: 100% !important;
  min-width: 100% !important;
  max-width: 100% !important;
  box-sizing: border-box !important;
  margin: 0 !important;
  padding: 0 !important;
}

/* 强制ECharts图表容器宽度 */
.gantt-chart .chart-container > div {
  width: 100% !important;
  min-width: 100% !important;
  max-width: 100% !important;
}

/* 确保ECharts canvas元素宽度 */
.gantt-chart canvas {
  width: 100% !important;
  max-width: 100% !important;
}

/* 确保统计表格容器稳定 */
.statistics-table {
  width: 100% !important;
  margin: 0 0 20px 0 !important;
  box-sizing: border-box !important;
}

/* 大屏下损耗统计表与横道图左右布局 */
.statistics-layout {
  width: 100% !important;
  max-width: 100% !important;
  display: flex;
  flex-direction: column;
  gap: 20px;
  box-sizing: border-box !important;
  margin: 0 !important;
  padding: 0 !important;
}

/* 统计表格和图表容器基础样式 */
.statistics-table,
.gantt-chart {
  width: 100% !important;
  max-width: 100% !important;
  box-sizing: border-box !important;
  margin: 0 !important;
}

/* 统计表格最大高度限制 */
.statistics-table {
  max-height: 400px !important;
  overflow-y: auto !important;
}

/* 图表容器高度设置 */
.gantt-chart .chart-container {
  height: 350px !important;
  max-height: 350px !important;
  overflow: hidden !important;
}

/* 大屏幕下的优化 */
@media (min-width: 1400px) {
  .statistics-table {
    max-height: 500px !important;
  }
  
  .gantt-chart .chart-container {
    height: 500px !important;
    max-height: 500px !important;
  }
}

/* 超大屏幕优化 */
@media (min-width: 1920px) {
  .statistics-table {
    max-height: 400px !important;
  }
  
  .gantt-chart .chart-container {
    height: 400px !important;
    max-height: 400px !important;
  }
}

/* 工时损耗统计表格表头样式 */
.statistics-table :deep(.el-table .el-table__header-wrapper .el-table__header .el-table__cell) {
  background-color: #f5f7fa !important;
  color: #606266 !important;
  font-weight: 600 !important;
  border-bottom: 1px solid #e4e7ed !important;
  text-align: center !important;
}

/* 强制所有ECharts相关元素宽度 - 最高优先级 */
.gantt-chart * {
  max-width: 100% !important;
  box-sizing: border-box !important;
}

.gantt-chart svg {
  width: 100% !important;
  max-width: 100% !important;
  min-width: 100% !important;
}

.gantt-chart .echarts-for-react {
  width: 100% !important;
  max-width: 100% !important;
  min-width: 100% !important;
}

/* 针对可能的ECharts内部容器 */
.gantt-chart [style*="width"] {
  width: 100% !important;
  max-width: 100% !important;
}

/* 确保图表容器内的所有div元素 */
.gantt-chart div[style] {
  max-width: 100% !important;
}


</style>