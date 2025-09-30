<template>
  <div class="quality-target-statistics">
    <!-- 页面头部 -->
    <div class="page-header">
      <div class="header-left">
        <el-button 
          type="primary" 
          @click="goBack"
          
        >
          <el-icon margin-right="5px"><ArrowLeft /></el-icon>
          返回
        </el-button>
        <h2 class="page-title">{{ targetInfo.QualityTarget }} - 统计数据</h2>
      </div>
      <div class="header-right">
        <el-button 
          type="primary" 
          @click="showAddDialog"
          
        >
          <el-icon><Plus /></el-icon>
          添加统计数据
        </el-button>
      </div>
    </div>

    <!-- 统计概览卡片 -->
    <div class="overview-cards">
      <el-row :gutter="20">
        <el-col :span="6">
          <div class="overview-card total-targets" @click="filterByStatus('')">
            <div class="card-icon">
              <el-icon><Aim /></el-icon>
            </div>
            <div class="card-content">
              <div class="card-value">{{ overviewData.totalTargets }}</div>
              <div class="card-label">质量目标总数</div>
            </div>
          </div>
        </el-col>
        <el-col :span="6">
          <div class="overview-card achievement-rate" @click="filterByStatus('')">
            <div class="card-icon">
              <el-icon><TrendCharts /></el-icon>
            </div>
            <div class="card-content">
              <div class="card-value">{{ overviewData.achievementRate }}%</div>
              <div class="card-label">总体达成率</div>
            </div>
          </div>
        </el-col>
        <el-col :span="6">
          <div class="overview-card achieved-targets" @click="filterByStatus('达成')">
            <div class="card-icon">
              <el-icon><SuccessFilled /></el-icon>
            </div>
            <div class="card-content">
              <div class="card-value">{{ overviewData.achievedTargets }}</div>
              <div class="card-label">已达成目标</div>
            </div>
          </div>
        </el-col>
        <el-col :span="6">
          <div class="overview-card pending-targets" @click="filterByStatus('未达成')">
            <div class="card-icon">
              <el-icon><WarningFilled /></el-icon>
            </div>
            <div class="card-content">
              <div class="card-value">{{ overviewData.pendingTargets }}</div>
              <div class="card-label">待改进目标</div>
            </div>
          </div>
        </el-col>
      </el-row>
    </div>

    <!-- 筛选条件 -->
    <el-card class="filter-card" shadow="never">
      <div class="filter-form">
        <el-form :inline="true" :model="filterForm" >
          <el-form-item label="年度">
            <el-date-picker
              v-model="filterForm.year"
              type="year"
              placeholder="选择年度"
              @change="loadStatistics"
              style="width: 120px;"
              format="YYYY年"
              value-format="YYYY"
            />
          </el-form-item>
          <el-form-item label="目标分类">
            <el-select v-model="filterForm.category" placeholder="选择分类" clearable @change="loadStatistics" style="width: 150px;">
              <el-option
                v-for="category in categoryOptions"
                :key="category"
                :label="category"
                :value="category"
              />
            </el-select>
          </el-form-item>
          <el-form-item label="考核单位">
            <el-select v-model="filterForm.assessmentUnit" placeholder="选择单位" clearable @change="loadStatistics" style="width: 150px;">
              <el-option
                v-for="unit in unitOptions"
                :key="unit"
                :label="unit"
                :value="unit"
              />
            </el-select>
          </el-form-item>
          <el-form-item label="责任人">
            <el-select v-model="filterForm.responsiblePerson" placeholder="选择责任人" clearable @change="loadStatistics" style="width: 150px;">
              <el-option
                v-for="person in personOptions"
                :key="person"
                :label="person"
                :value="person"
              />
            </el-select>
          </el-form-item>
          <el-form-item label="达成状态">
            <el-select v-model="filterForm.achievementStatus" placeholder="选择状态" clearable @change="loadStatistics" style="width: 150px;">
              <el-option label="已达成" value="达成" />
              <el-option label="接近达成" value="接近" />
              <el-option label="未达成" value="未达成" />
              <el-option label="无数据" value="无数据" />
            </el-select>
          </el-form-item>
          <el-form-item>
            <el-button type="primary" @click="loadStatistics">查询</el-button>
            <el-button @click="resetFilter">重置</el-button>
          </el-form-item>
        </el-form>
      </div>
    </el-card>

    <!-- 统计数据展示 -->
    <el-card class="data-display-card" shadow="never">
      <el-tabs v-model="activeTab" type="border-card">
        <!-- 图表可视化标签页 -->
        <el-tab-pane label="统计图表" name="chart">
          <div class="chart-header">
            <h3 :class="chartTitleClass">{{ chartTitle }}</h3>
            <el-radio-group v-model="chartType"  @change="updateChart">
              <el-radio-button value="trend">趋势分析</el-radio-button>
            <el-radio-button value="achievement">达成率分析</el-radio-button>
            </el-radio-group>
          </div>
          <div class="chart-container">
            <div ref="chartRef" class="chart"></div>
          </div>
        </el-tab-pane>
        
        <!-- 分类统计标签页 -->
        <el-tab-pane label="目标分类统计" name="category">
          <div class="category-stats-container">
            <!-- 图表展示区域 -->
            <el-row :gutter="20">
              <!-- 目标分类统计柱状图 -->
              <el-col :span="24">
                <el-card class="chart-card">
                  <template #header>
                    <div class="chart-header-with-filter">
                      <!-- 部门筛选控制面板 -->
                      <div class="filter-row-compact" v-loading="chartOptionsLoading">
                        <div class="filter-label-compact">
                          <span>部门筛选：</span>
                          <el-button 
                            link 
                            @click="toggleSelectAll"
                            :disabled="chartOptionsLoading"
                            size="small"
                          >
                            {{ isAllSelected ? '取消全选' : '全选' }}
                          </el-button>
                        </div>
                        <div class="unit-checkboxes-compact">
                          <el-checkbox 
                            v-model="selectedUnits.company"
                            @change="onUnitSelectionChange"
                            class="company-checkbox"
                          >
                            公司
                          </el-checkbox>
                          <el-checkbox-group 
                            v-model="selectedUnits.departments"
                            @change="onUnitSelectionChange"
                            class="department-checkboxes-compact"
                          >
                            <el-checkbox 
                              v-for="unit in availableUnits"
                              :key="unit"
                              :label="unit"
                              class="department-checkbox"
                            >
                              {{ unit }}
                            </el-checkbox>
                          </el-checkbox-group>
                        </div>
                      </div>
                      <!-- 右侧标签 -->
                      <el-tag v-if="selectedUnitsText" type="info" size="small">
                        {{ selectedUnitsText }}
                      </el-tag>
                    </div>
                  </template>
                  <div ref="categoryChart" class="chart-container-large" v-loading="categoryChartLoading"></div>
                </el-card>
              </el-col>
            </el-row>

            <!-- 达成情况统计 -->
            <el-row :gutter="20" style="margin-top: 20px;">
              <el-col :span="12">
                <el-card class="chart-card">
                  <template #header>
                    <div class="card-header">
                      <span>达成情况统计</span>
                    </div>
                  </template>
                  <div ref="achievementChart" class="chart-container"></div>
                </el-card>
              </el-col>
              
              <!-- 统计数据摘要 -->
              <el-col :span="12">
                <el-card class="chart-card">
                  <template #header>
                    <div class="card-header">
                      <span>数据摘要</span>
                    </div>
                  </template>
                  <div class="summary-content">
                    <div class="summary-item">
                      <span class="summary-label">选中年份：</span>
                      <span class="summary-value">{{ filterForm.year || new Date().getFullYear() }}年</span>
                    </div>
                    <div class="summary-item">
                      <span class="summary-label">目标总数：</span>
                      <span class="summary-value">{{ categoryStatsSummary.totalTargets }}</span>
                    </div>
                    <div class="summary-item">
                      <span class="summary-label">涉及部门：</span>
                      <span class="summary-value">{{ categoryStatsSummary.totalUnits }}</span>
                    </div>
                    <div class="summary-item">
                      <span class="summary-label">最新更新：</span>
                      <span class="summary-value">{{ categoryStatsSummary.lastUpdate }}</span>
                    </div>
                  </div>
                </el-card>
              </el-col>
            </el-row>
          </div>
        </el-tab-pane>
        
        <!-- 数据列表标签页 -->
        <el-tab-pane label="数据列表" name="table">
          <div class="table-container">
      <el-table 
        :data="statisticsData" 
        v-loading="loading"
        stripe
        border
        style="width: 100%"
      >
        <el-table-column prop="QualityTarget" label="质量目标" min-width="200" show-overflow-tooltip />
        <el-table-column prop="TargetCategory" label="目标分类" min-width="120" align="center">
          <template #default="{ row }">
            <el-tag :type="getCategoryTagType(row.TargetCategory)">{{ row.TargetCategory }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="AssessmentUnit" label="考核单位" min-width="150" align="center" />
        <el-table-column prop="ResponsiblePerson" label="责任人" min-width="100" align="center" />
        <el-table-column prop="TargetValue" label="目标值" min-width="100" align="center" />
        <el-table-column prop="ActualValue" label="实际值" min-width="100" align="center">
          <template #default="{ row }">
            <span v-if="row.ActualValue !== null">{{ row.ActualValue }}</span>
            <span v-else class="no-data">-</span>
          </template>
        </el-table-column>
        <el-table-column prop="AchievementRate" label="达成率" min-width="100" align="center">
          <template #default="{ row }">
            <span v-if="row.AchievementRate !== null" :class="getAchievementClass(row.AchievementRate)">
              {{ row.AchievementRate }}%
            </span>
            <span v-else class="no-data">-</span>
          </template>
        </el-table-column>
        <el-table-column prop="AchievementStatus" label="达成状态" min-width="120" align="center">
          <template #default="{ row }">
            <el-tag :type="getStatusType(row.AchievementStatus)" size="small">
              {{ row.AchievementStatus || '无数据' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="StatisticsFrequency" label="统计频率" min-width="100" align="center" />
        <el-table-column label="操作" min-width="180" align="center" fixed="right">
          <template #default="{ row }">
            <el-button 
              type="info" 
              size="small" 
              @click="viewTargetDetail(row)"
            >
              <el-icon><View /></el-icon>
              详情
            </el-button>
            <el-button 
              type="primary" 
              size="small" 
              @click="addTargetStatistics(row)"
            >
              <el-icon><EditPen /></el-icon>
              录入数据
            </el-button>
          </template>
        </el-table-column>
      </el-table>

            <!-- 分页 -->
            <div class="pagination-wrapper">
              <el-pagination
                @size-change="handleSizeChange"
                @current-change="handleCurrentChange"
                v-model:current-page="pagination.page"
                :page-sizes="[5, 10, 20, 50, 100]"
                v-model:page-size="pagination.pageSize"
                layout="total, sizes, prev, pager, next, jumper"
                :total="pagination.total"
              />
            </div>
          </div>
        </el-tab-pane>
      </el-tabs>
    </el-card>

    <!-- 添加/编辑统计数据对话框 -->
    <el-dialog 
      :title="dialogTitle" 
      v-model="dialogVisible" 
      width="600px"
      @close="resetForm"
    >
      <!-- 目标信息显示区域 -->
      <div class="target-info-section" v-if="targetInfo.QualityTarget">
        <el-alert
          type="info"
          :closable="false"
          show-icon
        >
          <template #title>
            <span style="font-size: 13px; color: #606266; font-weight: normal;">
              正在为以下质量目标录入统计数据：
            </span>
          </template>
          <template #default>
            <div class="target-details">
              <div style="display: flex; align-items: center; gap: 20px; flex-wrap: wrap;">
                <el-tag type="warning" effect="light" size="large" style="font-weight: 700;">
                  {{ targetInfo.QualityTarget }}
                </el-tag>
                <el-tag type="danger" effect="light" style="font-weight: 500;">
                  目标值：{{ targetInfo.TargetValue }}
                </el-tag>
                <el-tag type="success" effect="light" style="font-weight: 500;" v-if="statisticsForm.actualValue !== null && statisticsForm.actualValue !== undefined">
                  产品合格率：{{ statisticsForm.actualValue }}{{ statisticsForm.valueType === 'percentage' ? '%' : '' }}
                </el-tag>
              </div>
            </div>
          </template>
        </el-alert>
      </div>
      
      <el-form 
        :model="statisticsForm" 
        :rules="formRules" 
        ref="statisticsForm" 
        label-width="100px"
        style="margin-top: 20px;"
      >
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="年度" prop="year">
              <el-date-picker
                v-model="statisticsForm.year"
                type="year"
                placeholder="选择年度"
                style="width: 100%"
                format="YYYY年"
                value-format="YYYY"
              />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="统计周期" prop="period">
              <el-radio-group v-model="statisticsForm.periodType">
                <el-radio value="quarter">季度</el-radio>
              <el-radio value="month">月份</el-radio>
              </el-radio-group>
            </el-form-item>
          </el-col>
        </el-row>
        
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item v-if="statisticsForm.periodType === 'quarter'" label="季度" prop="quarter">
              <el-select v-model="statisticsForm.quarter" placeholder="选择季度" style="width: 100%">
                <el-option label="第1季度" :value="1" />
                <el-option label="第2季度" :value="2" />
                <el-option label="第3季度" :value="3" />
                <el-option label="第4季度" :value="4" />
              </el-select>
            </el-form-item>
            <el-form-item v-if="statisticsForm.periodType === 'month'" label="月份" prop="month">
              <el-select v-model="statisticsForm.month" placeholder="选择月份" style="width: 100%">
                <el-option
                  v-for="month in 12"
                  :key="month"
                  :label="month + '月'"
                  :value="month"
                />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="实际值" prop="actualValue">
              <el-input-number
                v-model="statisticsForm.actualValue"
                :precision="2"
                :min="0"
                style="width: 100%"
                placeholder="请输入实际值"
              />
            </el-form-item>
          </el-col>
        </el-row>
        
        <el-row :gutter="20">
          <el-col :span="12">
            <!-- 预留空间，保持布局平衡 -->
          </el-col>
          <el-col :span="12">
            <el-form-item label="值类型" prop="valueType">
              <el-radio-group v-model="statisticsForm.valueType">
                <el-radio value="percentage">百分比</el-radio>
              <el-radio value="count">次数</el-radio>
              </el-radio-group>
            </el-form-item>
          </el-col>
        </el-row>
        
        <el-row>
          <el-col :span="24">
            <el-form-item label="备注" prop="remarks">
              <el-input
                v-model="statisticsForm.remarks"
                type="textarea"
                :rows="3"
                placeholder="请输入备注信息"
              />
            </el-form-item>
          </el-col>
        </el-row>
      </el-form>
      <template #footer>
        <div class="dialog-footer">
          <el-button @click="dialogVisible = false">取消</el-button>
          <el-button type="primary" @click="submitForm" :loading="submitting">
            {{ isEdit ? '更新' : '添加' }}
          </el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script>
import { 
  getTargetStatistics, 
  addQualityTargetStatistics, 
  updateQualityTargetStatistics,
  deleteQualityTargetStatistics,
  getQualityTargetOptions,
  getQualityTargetCategoryStats,
  getQualityTargetAchievementStats,
  getQualityTargetById,
  getQualityTargetChartOptions,
  getQualityTargetCategoryByTargets
} from '@/services/qualityTargetsApi'
import * as echarts from 'echarts'
import { ArrowLeft, Plus, Aim, TrendCharts, SuccessFilled, WarningFilled, View, EditPen } from '@element-plus/icons-vue'

export default {
  name: 'QualityTargetStatistics',
  components: {
    ArrowLeft,
    Plus,
    View,
    EditPen
  },
  data() {
    return {
      // 标签页控制
      activeTab: 'table',
      // 目标信息
      targetInfo: {
        ID: null,
        QualityTarget: '',
        TargetValue: 0
      },
      // 统计概览数据
      overviewData: {
        totalTargets: 0,
        achievementRate: 0,
        achievedTargets: 0,
        pendingTargets: 0
      },
      // 统计数据
      statisticsData: [],
      loading: false,
      // 筛选条件
      filterForm: {
        year: new Date().getFullYear().toString(),
        category: '',
        assessmentUnit: '',
        responsiblePerson: '',
        achievementStatus: ''
      },
      currentYear: new Date().getFullYear(),
      categoryOptions: [],
      unitOptions: [],
      personOptions: [],
      // 分页
      pagination: {
        page: 1,
        pageSize: 5,
        total: 0,
        totalPages: 0
      },
      // 对话框
      dialogVisible: false,
      isEdit: false,
      submitting: false,
      // 表单数据
      statisticsForm: {
        id: null,
        targetId: null,
        year: null,
        periodType: 'month',
        quarter: null,
        month: null,
        actualValue: null,
        valueType: 'percentage', // 默认选择百分比
        remarks: ''
      },
      // 表单验证规则
      formRules: {
        year: [
          { required: true, message: '请选择年度', trigger: 'change' }
        ],
        quarter: [
          { required: true, message: '请选择季度', trigger: 'change' }
        ],
        month: [
          { required: true, message: '请选择月份', trigger: 'change' }
        ],
        actualValue: [
          { required: true, message: '请输入实际值', trigger: 'blur' },
          { type: 'number', message: '实际值必须为数字', trigger: 'blur' }
        ]
      },
      // 图表相关
      chartType: 'trend',
      chartInstance: null,
      // 分类统计相关
      categoryChartInstance: null,
      achievementChartInstance: null,
      categoryData: [],
      achievementData: [],
      // 新的图表选项和筛选功能
      chartOptionsLoading: false,
      categoryChartLoading: false,
      availableTargets: [], // 可用的目标名称列表
      availableUnits: [], // 可用的部门列表
      selectedUnits: {
        company: true, // 是否选择公司
        departments: [] // 选择的部门列表
      },
      categoryByTargetsData: [], // 按目标名称分组的分类数据
      categoryStatsSummary: {
        totalTargets: 0,
        totalUnits: 0,
        lastUpdate: '暂无数据'
      }
    }
  },
  computed: {
    /**
     * 对话框标题
     */
    dialogTitle() {
      return this.isEdit ? '编辑统计数据' : '添加统计数据'
    },
    /**
     * 动态图表标题
     */
    chartTitle() {
      const year = this.filterForm.year || new Date().getFullYear()
      const baseName = this.chartType === 'trend' ? '质量目标趋势分析' : '达成率统计分析'
      return `${year}年 ${baseName}`
    },
    /**
     * 动态标题样式类
     */
    chartTitleClass() {
      return this.chartType === 'trend' ? 'trend-title' : 'achievement-title'
    },
    /**
     * 是否全选状态
     */
    isAllSelected() {
      return this.selectedUnits.company && this.selectedUnits.departments.length === this.availableUnits.length
    },
    /**
     * 选中的部门文本显示
     */
    selectedUnitsText() {
      const selected = []
      if (this.selectedUnits.company) {
        selected.push('公司')
      }
      if (this.selectedUnits.departments.length > 0) {
        if (this.selectedUnits.departments.length === this.availableUnits.length) {
          selected.push('全部部门')
        } else {
          selected.push(`${this.selectedUnits.departments.length}个部门`)
        }
      }
      return selected.length > 0 ? `筛选: ${selected.join(', ')}` : ''
    }
  },
  created() {
    this.getFilterOptions()
    this.loadStatistics()
  },
  async mounted() {
    // 从路由参数获取目标ID
    const targetId = this.$route.params.targetId
    if (targetId) {
      this.targetInfo.ID = parseInt(targetId)
      
      // 获取目标详情信息
      try {
        const response = await getQualityTargetById(targetId)
        if (response.data.success) {
          this.targetInfo = {
            ID: response.data.data.ID,
            QualityTarget: response.data.data.QualityTarget,
            TargetValue: response.data.data.TargetValue
          }
        }
      } catch (error) {
        console.error('获取目标详情失败:', error)
        this.$message.error('获取目标详情失败')
      }
    }
    this.initChart()
  },
  watch: {
    /**
     * 监听标签页切换
     */
    activeTab(newTab) {
      if (newTab === 'chart') {
        this.$nextTick(() => {
          if (this.chartInstance) {
            setTimeout(() => {
              this.chartInstance.resize()
              this.updateChart()
            }, 150)
          } else {
            // 如果图表实例不存在，重新初始化
            setTimeout(() => {
              this.initChart()
            }, 150)
          }
        })
      } else if (newTab === 'category') {
        this.$nextTick(() => {
          setTimeout(() => {
            // 加载新的图表选项和数据
            this.loadChartOptions()
            // 保留原有的达成情况图表
            this.initCategoryCharts()
          }, 150)
        })
      }
    }
  },
  beforeUnmount() {
    if (this.chartInstance) {
      this.chartInstance.dispose()
    }
    if (this.categoryChartInstance) {
      this.categoryChartInstance.dispose()
    }
    if (this.achievementChartInstance) {
      this.achievementChartInstance.dispose()
    }
    // 清理窗口大小变化监听器
    window.removeEventListener('resize', this.handleResize)
  },
  methods: {
    /**
     * 解析字符串中的数字值
     * @param {string|number} value - 要解析的值，可能包含符号和百分号
     * @returns {number} 解析出的数字值
     */
    parseNumericValue(value) {
      if (typeof value === 'number') {
        return value
      }
      if (!value || typeof value !== 'string') {
        return 0
      }
      
      // 移除符号（≥、≤、>、<、=）和百分号，提取数字
      const numericMatch = value.replace(/[≥≤><=%]/g, '').trim()
      const parsed = parseFloat(numericMatch)
      
      return isNaN(parsed) ? 0 : parsed
    },

    /**
     * 加载图表选项数据（目标名称和部门列表）
     */
    async loadChartOptions() {
      this.chartOptionsLoading = true
      try {
        const params = {
          year: this.filterForm.year || new Date().getFullYear()
        }
        const response = await getQualityTargetChartOptions(params)
        if (response.data.success) {
          const { targets, units } = response.data.data
          this.availableTargets = targets || []
          this.availableUnits = units || []
          
          // 默认选择所有部门
          this.selectedUnits.departments = [...this.availableUnits]
          
          // 加载分类统计数据
          this.loadCategoryByTargetsData()
        }
      } catch (error) {
        console.error('获取图表选项失败:', error)
        this.$message.error('获取图表选项失败')
      } finally {
        this.chartOptionsLoading = false
      }
    },

    /**
     * 加载按目标名称分组的分类统计数据
     */
    async loadCategoryByTargetsData() {
      this.categoryChartLoading = true
      try {
        const selectedUnits = []
        if (this.selectedUnits.company) {
          selectedUnits.push('公司')
        }
        selectedUnits.push(...this.selectedUnits.departments)
        
        const params = {
          year: this.filterForm.year || new Date().getFullYear(),
          selectedUnits: selectedUnits.join(',')
        }
        
        const response = await getQualityTargetCategoryByTargets(params)
        if (response.data.success) {
          this.categoryByTargetsData = response.data.data || []
          this.updateCategoryStatsSummary()
          this.$nextTick(() => {
            this.renderCategoryByTargetsChart()
          })
        }
      } catch (error) {
        console.error('获取目标分类统计数据失败:', error)
        this.$message.error('获取目标分类统计数据失败')
      } finally {
        this.categoryChartLoading = false
      }
    },

    /**
     * 更新分类统计摘要信息
     */
    updateCategoryStatsSummary() {
      const uniqueTargets = new Set(this.categoryByTargetsData.map(item => item.QualityTarget))
      const uniqueUnits = new Set(this.categoryByTargetsData.map(item => item.AssessmentUnit))
      
      this.categoryStatsSummary = {
        totalTargets: uniqueTargets.size,
        totalUnits: uniqueUnits.size,
        lastUpdate: new Date().toLocaleString('zh-CN')
      }
    },

    /**
     * 渲染按目标名称分组的分类统计图表
     */
    renderCategoryByTargetsChart() {
      if (!this.$refs.categoryChart) return
      
      if (this.categoryChartInstance) {
        this.categoryChartInstance.dispose()
      }
      
      this.categoryChartInstance = echarts.init(this.$refs.categoryChart)
      
      if (!this.categoryByTargetsData || this.categoryByTargetsData.length === 0) {
        this.categoryChartInstance.setOption({
          title: {
            text: '暂无数据',
            left: 'center',
            top: 'middle',
            textStyle: {
              color: '#c0c4cc',
              fontSize: 14
            }
          }
        })
        return
      }
      
      // 处理数据：按目标名称分组，按部门分系列，实现温度计式显示
      const targetNames = [...new Set(this.categoryByTargetsData.map(item => item.QualityTarget))]
      const unitNames = [...new Set(this.categoryByTargetsData.map(item => item.AssessmentUnit))]
      
      // 构建系列数据：每个部门需要两个系列（目标值背景 + 实际值前景）
      const series = []
      
      unitNames.forEach((unit, unitIndex) => {
        // 目标值系列（背景）
        const targetData = targetNames.map(target => {
          const item = this.categoryByTargetsData.find(d => d.QualityTarget === target && d.AssessmentUnit === unit)
          return item ? this.parseNumericValue(item.targetValue) : 0
        })
        
        // 实际值系列（前景）
        const actualData = targetNames.map(target => {
          const item = this.categoryByTargetsData.find(d => d.QualityTarget === target && d.AssessmentUnit === unit)
          return item ? this.parseNumericValue(item.actualValue) : 0
        })
        
        // 添加目标值系列（背景）
        series.push({
          name: `${unit} - 目标值`,
          type: 'bar',
          data: targetData,
          barWidth: 45, // 固定像素宽度，作为背景
          z: 1, // 背景层级
          itemStyle: {
            color: function(params) {
              const colors = [
                'rgba(64, 158, 255, 0.4)', 'rgba(103, 194, 58, 0.4)', 'rgba(230, 162, 60, 0.4)', 'rgba(245, 108, 108, 0.4)',
                'rgba(144, 147, 153, 0.4)', 'rgba(196, 86, 86, 0.4)', 'rgba(154, 96, 180, 0.4)', 'rgba(234, 124, 204, 0.4)'
              ]
              return colors[unitIndex % colors.length]
            },
            borderColor: function(params) {
              const colors = [
                '#409EFF', '#67C23A', '#E6A23C', '#F56C6C',
                '#909399', '#C45656', '#9A60B4', '#EA7CCC'
              ]
              return colors[unitIndex % colors.length]
            },
            borderWidth: 1
          }
        })
        
        // 添加实际值系列（前景）
        series.push({
          name: `${unit} - 实际值`,
          type: 'bar',
          data: actualData,
          barWidth: 30, // 固定像素宽度，比背景窄
          barGap: '-100%', // 完全重叠
          z: 2, // 前景层级
          itemStyle: {
            color: function(params) {
              const colors = [
                '#409EFF', '#67C23A', '#E6A23C', '#F56C6C', 
                '#909399', '#C45656', '#9A60B4', '#EA7CCC'
              ]
              return colors[unitIndex % colors.length]
            }
          }
        })
      })
      
      const option = {
        title: {
          text: `${this.filterForm.year || new Date().getFullYear()}年 目标分类统计`,
          left: 'center',
          textStyle: {
            fontSize: 16,
            color: '#303133'
          }
        },
        tooltip: {
          trigger: 'axis',
          axisPointer: {
            type: 'shadow'
          },
          formatter: function(params) {
            let result = `<div style="font-weight: 600; margin-bottom: 8px;">${params[0].name}</div>`
            
            // 按部门分组显示目标值和实际值
            const unitGroups = {}
            params.forEach(param => {
              const unitName = param.seriesName.split(' - ')[0]
              const valueType = param.seriesName.split(' - ')[1]
              
              if (!unitGroups[unitName]) {
                unitGroups[unitName] = {}
              }
              unitGroups[unitName][valueType] = param.value
            })
            
            Object.keys(unitGroups).forEach(unitName => {
              const group = unitGroups[unitName]
              result += `<div style="margin: 8px 0; padding: 4px; border-left: 3px solid #409EFF;">`
              result += `<div style="font-weight: 600; color: #303133;">${unitName}</div>`
              if (group['目标值'] !== undefined) {
                result += `<div style="margin: 2px 0;"><span style="color: #409EFF; font-size: 12px;">●</span> 目标值: <span style="font-weight: 600;">${group['目标值']}</span></div>`
              }
              if (group['实际值'] !== undefined) {
                result += `<div style="margin: 2px 0;"><span style="color: #67C23A; font-size: 12px;">●</span> 实际值: <span style="font-weight: 600;">${group['实际值']}</span></div>`
              }
              if (group['目标值'] !== undefined && group['实际值'] !== undefined) {
                const diff = group['实际值'] - group['目标值']
                const diffColor = diff >= 0 ? '#67C23A' : '#F56C6C'
                result += `<div style="margin: 2px 0;"><span style="color: ${diffColor}; font-size: 12px;">●</span> 差异: <span style="font-weight: 600; color: ${diffColor};">${diff > 0 ? '+' : ''}${diff}</span></div>`
              }
              result += `</div>`
            })
            
            return result
          }
        },
        legend: {
          data: series.map(s => s.name),
          orient: 'vertical',
          right: 10,
          top: 'middle',
          type: 'scroll',
          selectedMode: 'multiple',
          selector: false,
          itemWidth: 14,
          itemHeight: 14,
          textStyle: {
            fontSize: 12,
            color: '#606266'
          },
          tooltip: {
            show: true
          }
        },
        grid: {
          left: '3%',
          right: '15%',
          bottom: '20%',
          top: '15%',
          containLabel: true
        },
        xAxis: {
          type: 'category',
          data: targetNames,
          axisLabel: {
            interval: 0,
            rotate: targetNames.length > 5 ? 45 : 0,
            color: '#606266',
            fontSize: 12
          },
          axisLine: {
            lineStyle: {
              color: '#e4e7ed'
            }
          }
        },
        yAxis: {
          type: 'value',
          name: '数量',
          nameTextStyle: {
            color: '#909399',
            fontSize: 12
          },
          axisLabel: {
            color: '#606266',
            fontSize: 12
          },
          axisLine: {
            lineStyle: {
              color: '#e4e7ed'
            }
          },
          splitLine: {
            lineStyle: {
              color: '#f5f7fa'
            }
          }
        },
        series: series,
        // 确保柱形完全重叠对齐
        barCategoryGap: '20%'
      }
      
      this.categoryChartInstance.setOption(option)
      
      // 监听窗口大小变化
      window.addEventListener('resize', () => {
        if (this.categoryChartInstance) {
          this.categoryChartInstance.resize()
        }
      })
    },

    /**
     * 切换全选状态
     */
    toggleSelectAll() {
      if (this.isAllSelected) {
        // 取消全选
        this.selectedUnits.company = false
        this.selectedUnits.departments = []
      } else {
        // 全选
        this.selectedUnits.company = true
        this.selectedUnits.departments = [...this.availableUnits]
      }
      this.onUnitSelectionChange()
    },

    /**
     * 部门选择变化处理
     */
    onUnitSelectionChange() {
      // 防抖处理，避免频繁请求
      if (this.selectionChangeTimer) {
        clearTimeout(this.selectionChangeTimer)
      }
      this.selectionChangeTimer = setTimeout(() => {
        this.loadCategoryByTargetsData()
      }, 300)
    },

    /**
     * 获取筛选选项数据
     */
    async getFilterOptions() {
      try {
        const response = await getQualityTargetOptions()
        if (response.data.success) {
          const { categories, units, persons } = response.data.data
          this.categoryOptions = categories || []
          this.unitOptions = units || []
          this.personOptions = persons || []
        }
      } catch (error) {
        console.error('获取筛选选项失败:', error)
      }
    },

    /**
     * 加载统计数据
     */
    async loadStatistics() {
      this.loading = true
      try {
        // 构建查询参数
        const params = {
          year: this.filterForm.year ? parseInt(this.filterForm.year) : null,
          category: this.filterForm.category,
          assessmentUnit: this.filterForm.assessmentUnit,
          responsiblePerson: this.filterForm.responsiblePerson,
          achievementStatus: this.filterForm.achievementStatus,
          page: this.pagination.page,
          pageSize: this.pagination.pageSize
        }
        
        // 获取达成情况统计数据
        const response = await getQualityTargetAchievementStats(params)
        
        if (response.data.success) {
          const { records, summary, pagination } = response.data.data
          this.statisticsData = records || []
          
          // 正确设置分页信息
          if (pagination) {
            this.pagination.total = pagination.total
            this.pagination.totalPages = pagination.totalPages
          } else {
            // 兼容旧版本API，如果没有分页信息则使用记录数
            this.pagination.total = records ? records.length : 0
          }
          
          // 更新概览数据
          this.overviewData = {
            totalTargets: summary?.total || 0,
            achievementRate: parseFloat(summary?.achievementRate || 0),
            achievedTargets: summary?.achieved || 0,
            pendingTargets: (summary?.approaching || 0) + (summary?.notAchieved || 0)
          }
          
          // 更新图表
          this.$nextTick(() => {
            this.updateChart()
          })
          
          // 更新分类统计图表数据
          this.loadCategoryByTargetsData()
        } else {
          this.$message.error(response.data.message || '加载统计数据失败')
        }
      } catch (error) {
        console.error('加载统计数据失败:', error)
        this.$message.error('加载统计数据失败')
      } finally {
        this.loading = false
      }
    },

    /**
     * 重置筛选条件
     */
    resetFilter() {
      this.filterForm = {
        year: new Date().getFullYear().toString(),
        category: '',
        assessmentUnit: '',
        responsiblePerson: '',
        achievementStatus: ''
      }
      this.pagination.page = 1
      this.loadStatistics()
      // 重置分类统计图表数据
      this.loadCategoryByTargetsData()
    },

    /**
     * 查看目标详情
     * 跳转到质量目标管理页面查看详情
     */
    viewTargetDetail(row) {
      // 跳转到质量目标管理页面
      this.$router.push({
        path: '/admin/quality/targets',
        query: { 
          targetId: row.ID,
          action: 'view'
        }
      })
    },

    /**
     * 为目标添加统计数据
     */
    async addTargetStatistics(row) {
      const targetId = this.targetInfo.ID || (row && row.ID)
      
      // 如果目标信息不完整，先获取目标详情
      if (targetId && (!this.targetInfo.QualityTarget || !this.targetInfo.TargetValue)) {
        try {
          const response = await getQualityTargetById(targetId)
          if (response.data.success) {
            this.targetInfo = {
              ID: response.data.data.ID,
              QualityTarget: response.data.data.QualityTarget,
              TargetValue: response.data.data.TargetValue
            }
          }
        } catch (error) {
          console.error('获取目标详情失败:', error)
          this.$message.error('获取目标详情失败')
          return
        }
      }
      
      this.statisticsForm = {
        id: null,
        targetId: targetId,
        year: this.filterForm.year,
        periodType: 'month',
        quarter: null,
        month: null,
        actualValue: null,
        valueType: 'percentage', // 默认选择百分比
        remarks: ''
      }
      this.isEdit = false
      this.dialogVisible = true
    },

    /**
     * 根据达成状态筛选数据
     */
    filterByStatus(status) {
      this.filterForm.achievementStatus = status
      this.pagination.page = 1
      this.loadStatistics()
      
      // 切换到数据列表标签页
      this.activeTab = 'table'
    },

    /**
     * 分页大小改变
     */
    handleSizeChange(val) {
      this.pagination.pageSize = val
      this.pagination.page = 1
      this.loadStatistics()
    },

    /**
     * 当前页改变
     */
    handleCurrentChange(val) {
      this.pagination.page = val
      this.loadStatistics()
    },

    /**
     * 显示添加对话框
     */
    showAddDialog() {
      this.isEdit = false
      this.resetForm()
      this.dialogVisible = true
    },

    /**
     * 编辑统计数据
     */
    editStatistics(row) {
      this.isEdit = true
      this.statisticsForm = {
        id: row.ID,
        year: row.Year,
        quarter: row.Quarter,
        month: row.Month,
        actualValue: row.ActualValue,
        remarks: row.Remarks || ''
      }
      this.dialogVisible = true
    },

    /**
     * 删除统计数据
     */
    deleteStatistics(row) {
      this.$confirm('确定要删除这条统计数据吗？', '提示', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }).then(async () => {
        try {
          const response = await deleteQualityTargetStatistics(row.ID)
          if (response.data.success) {
            this.$message.success('删除成功')
            this.loadStatistics()
          } else {
            this.$message.error(response.data.message || '删除失败')
          }
        } catch (error) {
          console.error('删除统计数据失败:', error)
          this.$message.error('删除失败')
        }
      })
    },

    /**
     * 提交表单
     */
    submitForm() {
      this.$refs.statisticsForm.validate(async (valid) => {
        if (!valid) return
        
        this.submitting = true
        try {
          // 根据值类型为实际值添加单位符号
          let actualValueWithUnit = this.statisticsForm.actualValue
          if (actualValueWithUnit && !isNaN(actualValueWithUnit)) {
            if (this.statisticsForm.valueType === 'percentage') {
              actualValueWithUnit = actualValueWithUnit + '%'
            } else if (this.statisticsForm.valueType === 'count') {
              actualValueWithUnit = actualValueWithUnit + '次'
            }
          }
          
          const formData = {
          targetId: this.targetInfo.ID,
          year: parseInt(this.statisticsForm.year),
          quarter: this.statisticsForm.quarter,
          month: this.statisticsForm.month,
          actualValue: actualValueWithUnit,
          remarks: this.statisticsForm.remarks
        }
          
          let response
          if (this.isEdit) {
            response = await updateQualityTargetStatistics(this.statisticsForm.id, formData)
          } else {
            response = await addQualityTargetStatistics(formData)
          }
          
          if (response.data.success) {
            this.$message.success(this.isEdit ? '更新成功' : '添加成功')
            this.dialogVisible = false
            this.loadStatistics()
          } else {
            this.$message.error(response.data.message || (this.isEdit ? '更新失败' : '添加失败'))
          }
        } catch (error) {
          console.error('提交统计数据失败:', error)
          this.$message.error(this.isEdit ? '更新失败' : '添加失败')
        } finally {
          this.submitting = false
        }
      })
    },

    /**
     * 重置表单
     */
    resetForm() {
      if (this.$refs.statisticsForm) {
        this.$refs.statisticsForm.resetFields()
      }
      this.statisticsForm = {
        id: null,
        year: new Date().getFullYear().toString(),
        periodType: 'month',
        quarter: null,
        month: null,
        actualValue: null,
        valueType: 'percentage', // 默认选择百分比
        remarks: ''
      }
    },

    /**
     * 返回上一页
     */
    goBack() {
      this.$router.go(-1)
    },

    /**
     * 格式化日期
     */
    formatDate(date) {
      if (!date) return ''
      return new Date(date).toLocaleDateString('zh-CN', {
        year: 'numeric',
        month: '2-digit'
      })
    },

    /**
     * 格式化日期时间
     */
    formatDateTime(datetime) {
      if (!datetime) return ''
      return new Date(datetime).toLocaleString('zh-CN')
    },

    /**
     * 格式化统计周期
     */
    formatStatisticsPeriod(row) {
      if (!row.Year) return ''
      
      let period = `${row.Year}年`
      
      if (row.Quarter) {
        period += `第${row.Quarter}季度`
      } else if (row.Month) {
        period += `${row.Month}月`
      }
      
      return period
    },

    /**
     * 获取达成率样式类
     */
    getAchievementClass(rate) {
      if (rate >= 100) return 'achievement-excellent'
      if (rate >= 80) return 'achievement-good'
      return 'achievement-poor'
    },

    /**
     * 获取状态标签类型
     */
    getStatusType(status) {
      switch (status) {
        case '达成': return 'success'
        case '接近': return 'warning'
        case '未达成': return 'danger'
        default: return 'info'
      }
    },

    /**
     * 获取目标分类标签类型
     */
    getCategoryTagType(category) {
      const categoryMap = {
        '公司': 'primary',
        '部门': 'success',
        '车间': 'warning',
        '班组': 'info'
      }
      return categoryMap[category] || 'default'
    },

    /**
     * 初始化图表
     */
    initChart() {
      this.$nextTick(() => {
        if (this.$refs.chartRef) {
          // 确保容器有正确的尺寸
          const container = this.$refs.chartRef
          if (container.offsetWidth === 0 || container.offsetHeight === 0) {
            // 如果容器尺寸为0，延迟初始化
            setTimeout(() => {
              this.initChart()
            }, 100)
            return
          }
          
          this.chartInstance = echarts.init(this.$refs.chartRef)
          this.updateChart()
          
          // 监听窗口大小变化
          window.addEventListener('resize', this.handleResize)
        }
      })
    },

    /**
     * 处理窗口大小变化
     */
    handleResize() {
      if (this.chartInstance) {
        this.chartInstance.resize()
      }
    },

    /**
     * 更新图表
     */
    updateChart() {
      if (!this.chartInstance) return
      
      // 即使没有数据也要渲染空图表
      if (this.chartType === 'trend') {
        this.renderTrendChart()
      } else if (this.chartType === 'achievement') {
        this.renderAchievementChart()
      }
    },

    /**
     * 渲染趋势图
     */
    renderTrendChart() {
      const data = this.statisticsData.slice().reverse() // 按时间正序排列
      
      // 处理空数据情况
      if (data.length === 0) {
        const option = {
          graphic: {
            type: 'text',
            left: 'center',
            top: 'middle',
            style: {
              text: '暂无数据',
              fontSize: 16,
              fill: '#999'
            }
          }
        }
        this.chartInstance.setOption(option)
        return
      }
      
      const xAxisData = data.map(item => this.formatStatisticsPeriod(item))
      // 确保数据有效性，处理null/undefined值
      const actualValues = data.map(item => {
        const value = parseFloat(item.ActualValue)
        return isNaN(value) ? 0 : value
      })
      const targetValues = data.map(item => {
        const value = this.parseTargetValue(item.TargetValue)
        return isNaN(value) ? 0 : value
      })
      
      // 确保至少有一个有效数据点
      if (actualValues.length === 0 || targetValues.length === 0) {
        const option = {
          graphic: {
            type: 'text',
            left: 'center',
            top: 'middle',
            style: {
              text: '暂无数据',
              fontSize: 16,
              fill: '#999'
            }
          }
        }
        this.chartInstance.setOption(option)
        return
      }
      
      const option = {
        backgroundColor: 'transparent',
        tooltip: {
          trigger: 'axis',
          axisPointer: {
            type: 'cross',
            crossStyle: {
              color: '#999'
            }
          },
          backgroundColor: 'rgba(255, 255, 255, 0.95)',
          borderColor: '#e4e7ed',
          borderWidth: 1,
          textStyle: {
            color: '#303133'
          },
          formatter: function(params) {
            let result = `<div style="font-weight: 600; margin-bottom: 6px;">${params[0].name}</div>`
            params.forEach(param => {
              const value = param.value
              const color = param.color
              result += `<div style="margin: 4px 0;"><span style="color:${color}; font-size: 12px;">●</span> ${param.seriesName}: <span style="font-weight: 600;">${value}</span></div>`
            })
            if (params.length >= 2) {
              const actual = params[0].value
              const target = params[1].value
              const rate = target > 0 ? ((actual / target) * 100).toFixed(2) : 0
              const rateColor = rate >= 100 ? '#67C23A' : rate >= 80 ? '#E6A23C' : '#F56C6C'
              result += `<div style="margin-top: 8px; padding-top: 6px; border-top: 1px solid #e4e7ed;"><span style="color: ${rateColor}; font-weight: 600;">达成率: ${rate}%</span></div>`
            }
            return result
          }
        },
        legend: {
          data: ['实际值', '目标值'],
          orient: 'vertical',
          right: 10,
          top: 'middle',
          selectedMode: 'multiple'
        },
        grid: {
          left: '3%',
          right: '15%',
          bottom: '8%',
          top: '12%',
          containLabel: true
        },
        xAxis: {
          type: 'category',
          boundaryGap: false,
          data: xAxisData,
          axisLine: {
            lineStyle: {
              color: '#e4e7ed'
            }
          },
          axisTick: {
            show: false
          },
          axisLabel: {
            color: '#606266',
            fontSize: 12
          }
        },
        yAxis: {
          type: 'value',
          name: '数值',
          nameTextStyle: {
            color: '#909399',
            fontSize: 12
          },
          axisLine: {
            show: true,
            lineStyle: {
              color: '#e4e7ed'
            }
          },
          axisTick: {
            show: true,
            lineStyle: {
              color: '#e4e7ed'
            }
          },
          axisLabel: {
            color: '#606266',
            fontSize: 12
          },
          splitLine: {
            lineStyle: {
              color: '#f5f7fa',
              type: 'solid'
            }
          }
        },
        animation: true,
        animationDuration: 1000,
        animationEasing: 'cubicOut',
        series: [
          {
            name: '实际值',
            type: 'line',
            data: actualValues,
            smooth: true,
            symbol: 'circle',
            symbolSize: 8,
            lineStyle: {
              color: '#409EFF',
              width: 3,
              shadowColor: 'rgba(64, 158, 255, 0.3)',
              shadowBlur: 10,
              shadowOffsetY: 3
            },
            itemStyle: {
              color: '#409EFF',
              borderColor: '#fff',
              borderWidth: 3,
              shadowColor: 'rgba(64, 158, 255, 0.4)',
              shadowBlur: 8
            },
            areaStyle: {
              color: {
                type: 'linear',
                x: 0,
                y: 0,
                x2: 0,
                y2: 1,
                colorStops: [
                  { offset: 0, color: 'rgba(64, 158, 255, 0.4)' },
                  { offset: 0.5, color: 'rgba(64, 158, 255, 0.2)' },
                  { offset: 1, color: 'rgba(64, 158, 255, 0.05)' }
                ]
              }
            },
            emphasis: {
              focus: 'series',
              lineStyle: {
                width: 4
              }
            }
          },
          {
            name: '目标值',
            type: 'line',
            data: targetValues,
            symbol: 'diamond',
            symbolSize: 8,
            lineStyle: {
              color: '#E6A23C',
              type: 'dashed',
              width: 1.5,
              shadowColor: 'rgba(230, 162, 60, 0.3)',
              shadowBlur: 8,
              shadowOffsetY: 2
            },
            itemStyle: {
              color: '#E6A23C',
              borderColor: '#fff',
              borderWidth: 3,
              shadowColor: 'rgba(230, 162, 60, 0.4)',
              shadowBlur: 6
            },
            emphasis: {
              focus: 'series',
              lineStyle: {
                width: 4
              }
            }
          }
        ]
      }
      
      this.chartInstance.setOption(option)
    },

    /**
     * 渲染达成率分析图
     */
    renderAchievementChart() {
      const data = this.statisticsData.slice().reverse() // 按时间正序排列
      
      // 处理空数据情况
      if (data.length === 0) {
        const option = {
          graphic: {
            type: 'text',
            left: 'center',
            top: 'middle',
            style: {
              text: '暂无数据',
              fontSize: 16,
              fill: '#999'
            }
          }
        }
        this.chartInstance.setOption(option)
        return
      }
      
      const xAxisData = data.map(item => this.formatStatisticsPeriod(item))
      const achievementRates = data.map(item => parseFloat(item.AchievementRate))
      
      const option = {
        backgroundColor: 'transparent',
        tooltip: {
          trigger: 'axis',
          backgroundColor: 'rgba(255, 255, 255, 0.95)',
          borderColor: '#e4e7ed',
          borderWidth: 1,
          textStyle: {
            color: '#303133'
          },
          formatter: function(params) {
            const param = params[0]
            const rate = param.value
            let status = '未达成'
            let color = '#F56C6C'
            let statusIcon = '✗'
            if (rate >= 100) {
              status = '达成'
              color = '#67C23A'
              statusIcon = '✓'
            } else if (rate >= 80) {
              status = '接近'
              color = '#E6A23C'
              statusIcon = '⚠'
            }
            return `<div style="font-weight: 600; margin-bottom: 8px;">${param.name}</div>
                    <div style="margin: 4px 0;"><span style="color:${color}; font-size: 12px;">●</span> 达成率: <span style="font-weight: 600;">${rate}%</span></div>
                    <div style="margin-top: 8px; padding-top: 6px; border-top: 1px solid #e4e7ed;">
                      <span style="color:${color}; font-weight: 600;">${statusIcon} ${status}</span>
                    </div>`
          }
        },
        legend: {
          show: false
        },
        grid: {
          left: '3%',
          right: '4%',
          bottom: '8%',
          top: '12%',
          containLabel: true
        },
        xAxis: {
          type: 'category',
          data: xAxisData,
          axisLine: {
            lineStyle: {
              color: '#e4e7ed'
            }
          },
          axisTick: {
            show: false
          },
          axisLabel: {
            color: '#606266',
            fontSize: 12
          }
        },
        yAxis: {
          type: 'value',
          name: '达成率(%)',
          nameTextStyle: {
            color: '#909399',
            fontSize: 12
          },
          min: 0,
          max: 100, // 限制达成率坐标轴最大值为100%
          axisLine: {
            show: true,
            lineStyle: {
              color: '#e4e7ed'
            }
          },
          axisTick: {
            show: true,
            lineStyle: {
              color: '#e4e7ed'
            }
          },
          axisLabel: {
            formatter: '{value}%',
            color: '#606266',
            fontSize: 12
          },
          splitLine: {
            lineStyle: {
              color: '#f5f7fa',
              type: 'solid'
            }
          }
        },
        animation: true,
        animationDuration: 1200,
        animationEasing: 'elasticOut',
        series: [
          {
            name: '达成率',
            type: 'bar',
            barMaxWidth: 50,
            data: achievementRates.map(rate => {
              let color = '#F56C6C' // 未达成 - 红色
              let shadowColor = 'rgba(245, 108, 108, 0.4)'
              if (rate >= 100) {
                color = '#67C23A' // 达成 - 绿色
                shadowColor = 'rgba(103, 194, 58, 0.4)'
              } else if (rate >= 80) {
                color = '#E6A23C' // 接近 - 橙色
                shadowColor = 'rgba(230, 162, 60, 0.4)'
              }
              return {
                value: rate,
                itemStyle: { 
                  color: {
                    type: 'linear',
                    x: 0,
                    y: 0,
                    x2: 0,
                    y2: 1,
                    colorStops: [
                      { offset: 0, color: color },
                      { offset: 1, color: color + 'CC' }
                    ]
                  },
                  borderRadius: [6, 6, 0, 0],
                  shadowColor: shadowColor,
                  shadowBlur: 8,
                  shadowOffsetY: 3
                }
              }
            }),
            markLine: {
              silent: true,
              symbol: 'none',
              data: [
                {
                  yAxis: 100,
                  lineStyle: {
                    color: '#67C23A',
                    type: 'dashed',
                    width: 1.5,
                    opacity: 0.8
                  },
                  label: {
                    formatter: '目标线 (100%)',
                    position: 'end',
                    color: '#67C23A',
                    fontWeight: 'bold',
                    fontSize: 12
                  }
                },
                {
                  yAxis: 80,
                  lineStyle: {
                    color: '#E6A23C',
                    type: 'dashed',
                    width: 1.5,
                    opacity: 0.8
                  },
                  label: {
                    formatter: '警戒线 (80%)',
                    position: 'end',
                    color: '#E6A23C',
                    fontWeight: 'bold',
                    fontSize: 12
                  }
                }
              ]
            }
          }
        ]
      }
      
      this.chartInstance.setOption(option)
    },

    /**
     * 解析目标值，提取数值部分
     * @param {string} targetValue - 目标值字符串，如"≤95.00"、"≥98%"等
     * @returns {number} 解析后的数值
     */
    parseTargetValue(targetValue) {
      if (!targetValue) return 0
      
      // 移除比较符号和单位，提取数值
      const numericValue = targetValue.toString()
        .replace(/[≤≥<>%次]/g, '') // 移除比较符号、百分号、次数单位
        .replace(/[^0-9.-]/g, '') // 只保留数字、小数点和负号
      
      const parsed = parseFloat(numericValue)
      return isNaN(parsed) ? 0 : parsed
    },

    /**
     * 初始化分类统计图表
     */
    initCategoryCharts() {
      this.$nextTick(() => {
        if (this.$refs.categoryChart) {
          this.categoryChartInstance = echarts.init(this.$refs.categoryChart)
        }
        if (this.$refs.achievementChart) {
          this.achievementChartInstance = echarts.init(this.$refs.achievementChart)
        }
        this.loadCategoryData()
        this.loadAchievementData()
      })
    },

    /**
     * 加载分类统计数据
     */
    async loadCategoryData() {
      try {
        const response = await getQualityTargetCategoryStats(this.filterForm)
        if (response.data.success) {
          // 处理后端返回的数据格式：{TargetCategory, count, percentage}
          const data = response.data.data
          if (Array.isArray(data)) {
            // 将后端格式转换为图表需要的格式
            this.categoryData = data.map(item => ({
              name: item.TargetCategory || item.name,
              value: item.count || item.value,
              percentage: item.percentage
            }))
          } else if (data && typeof data === 'object') {
            // 如果返回的是对象，尝试转换为数组格式
            this.categoryData = Object.keys(data).map(key => ({
              name: key,
              value: data[key]
            }))
          } else {
            this.categoryData = []
          }
          this.renderCategoryChart()
        }
      } catch (error) {
        console.error('加载分类统计数据失败:', error)
        this.categoryData = [] // 确保出错时也是数组
      }
    },

    /**
     * 加载达成情况数据
     */
    async loadAchievementData() {
      try {
        const response = await getQualityTargetAchievementStats(this.filterForm)
        if (response.data.success) {
          // 处理后端返回的数据格式：{records, summary, pagination}
          const data = response.data.data
          if (data && data.summary) {
            // 将summary数据转换为图表需要的格式
            this.achievementData = [
              { name: '达成', value: data.summary.achieved || 0 },
              { name: '接近', value: data.summary.approaching || 0 },
              { name: '未达成', value: data.summary.notAchieved || 0 },
              { name: '无数据', value: data.summary.noData || 0 }
            ].filter(item => item.value > 0) // 过滤掉值为0的项
          } else if (Array.isArray(data)) {
            this.achievementData = data
          } else if (data && typeof data === 'object') {
            // 如果返回的是对象，尝试转换为数组格式
            this.achievementData = Object.keys(data).map(key => ({
              name: key,
              value: data[key]
            }))
          } else {
            this.achievementData = []
          }
          this.renderAchievementChart()
        }
      } catch (error) {
        console.error('加载达成情况数据失败:', error)
        this.achievementData = [] // 确保出错时也是数组
      }
    },

    /**
     * 渲染分类统计饼图
     */
    renderCategoryChart() {
      if (!this.categoryChartInstance) return
      
      // 确保数据存在且为数组
      if (!Array.isArray(this.categoryData) || this.categoryData.length === 0) {
        this.categoryChartInstance.setOption({
          title: {
            text: '暂无数据',
            left: 'center',
            top: 'center'
          }
        })
        return
      }
      
      const option = {
        tooltip: {
          trigger: 'item',
          backgroundColor: 'rgba(255, 255, 255, 0.95)',
          borderColor: '#e4e7ed',
          borderWidth: 1,
          borderRadius: 8,
          padding: [12, 16],
          textStyle: {
            color: '#303133',
            fontSize: 13
          },
          extraCssText: 'box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);',
          formatter: function(params) {
            const percentage = params.percent.toFixed(1)
            return `<div style="font-weight: 600; margin-bottom: 8px; color: #409EFF; font-size: 14px;">${params.seriesName}</div>
                    <div style="display: flex; align-items: center; justify-content: space-between;">
                      <span><span style="color:${params.color}; font-size: 14px; margin-right: 8px;">●</span>${params.name}:</span>
                      <span style="font-weight: 600; margin-left: 20px;">${params.value}</span>
                    </div>
                    <div style="margin-top: 8px; padding-top: 6px; border-top: 1px solid #e4e7ed; color: #67C23A; font-weight: 600;">占比: ${percentage}%</div>`
          }
        },
        legend: {
          orient: 'vertical',
          right: 10,
          top: 'middle',
          selectedMode: 'multiple'
        },
        series: [
          {
            name: '目标分类',
            type: 'pie',
            radius: ['30%', '70%'],
            center: ['40%', '50%'],
            data: this.categoryData.map((item, index) => {
              const colors = ['#409EFF', '#67C23A', '#E6A23C', '#F56C6C', '#909399', '#C45656', '#9A60B4', '#EA7CCC']
              return {
                ...item,
                itemStyle: {
                  color: {
                    type: 'linear',
                    x: 0, y: 0, x2: 1, y2: 1,
                    colorStops: [
                      { offset: 0, color: colors[index % colors.length] },
                      { offset: 1, color: colors[index % colors.length] + '80' }
                    ]
                  }
                }
              }
            }),
            emphasis: {
              itemStyle: {
                shadowBlur: 15,
                shadowOffsetX: 0,
                shadowColor: 'rgba(0, 0, 0, 0.3)'
              },
              scaleSize: 5
            },
            animationType: 'scale',
            animationEasing: 'elasticOut',
            animationDelay: function (idx) {
              return Math.random() * 200
            },
            label: {
              show: true,
              position: 'outside',
              formatter: '{b}: {c}\n({d}%)',
              fontSize: 12,
              color: '#606266'
            },
            labelLine: {
              show: true,
              length: 15,
              length2: 10
            }
          }
        ]
      }
      
      this.categoryChartInstance.setOption(option)
    },

    /**
     * 渲染达成情况柱状图
     */
    renderAchievementChart() {
      if (!this.achievementChartInstance) return
      
      // 确保数据存在且为数组
      if (!Array.isArray(this.achievementData) || this.achievementData.length === 0) {
        this.achievementChartInstance.setOption({
          title: {
            text: '暂无数据',
            left: 'center',
            top: 'center'
          }
        })
        return
      }
      
      const option = {
        tooltip: {
          trigger: 'axis',
          axisPointer: {
            type: 'shadow',
            shadowStyle: {
              color: 'rgba(150, 150, 150, 0.1)'
            }
          },
          backgroundColor: 'rgba(255, 255, 255, 0.95)',
          borderColor: '#e4e7ed',
          borderWidth: 1,
          borderRadius: 8,
          padding: [12, 16],
          textStyle: {
            color: '#303133',
            fontSize: 13
          },
          extraCssText: 'box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);',
          formatter: function(params) {
            const param = params[0]
            const colors = {
              '达成': '#67C23A',
              '接近': '#E6A23C', 
              '未达成': '#F56C6C',
              '无数据': '#909399'
            }
            const color = colors[param.name] || '#409EFF'
            return `<div style="font-weight: 600; margin-bottom: 10px; color: #409EFF; font-size: 14px;">达成情况统计</div>
                    <div style="display: flex; align-items: center; justify-content: space-between;">
                      <span><span style="color:${color}; font-size: 14px; margin-right: 8px;">●</span>${param.name}:</span>
                      <span style="font-weight: 600; margin-left: 20px;">${param.value}</span>
                    </div>`
          }
        },
        grid: {
          left: '3%',
          right: '4%',
          bottom: '3%',
          containLabel: true
        },
        xAxis: {
          type: 'category',
          data: this.achievementData.map(item => item.name)
        },
        yAxis: {
          type: 'value'
        },
        series: [
          {
            name: '达成情况',
            type: 'bar',
            data: this.achievementData.map((item, index) => {
              const colors = {
                '达成': { start: '#67C23A', end: '#85CE61' },
                '接近': { start: '#E6A23C', end: '#EEBC5B' },
                '未达成': { start: '#F56C6C', end: '#F78989' },
                '无数据': { start: '#909399', end: '#B3B6BC' }
              }
              const colorConfig = colors[item.name] || { start: '#409EFF', end: '#66B1FF' }
              return {
                value: item.value,
                itemStyle: {
                  color: {
                    type: 'linear',
                    x: 0, y: 0, x2: 0, y2: 1,
                    colorStops: [
                      { offset: 0, color: colorConfig.start },
                      { offset: 1, color: colorConfig.end }
                    ]
                  },
                  borderRadius: [4, 4, 0, 0],
                  shadowBlur: 3,
                  shadowColor: 'rgba(0, 0, 0, 0.1)',
                  shadowOffsetY: 2
                }
              }
            }),
            emphasis: {
              itemStyle: {
                shadowBlur: 8,
                shadowColor: 'rgba(0, 0, 0, 0.2)',
                shadowOffsetY: 4
              }
            },
            animationDelay: function (idx) {
              return idx * 100
            },
            animationEasing: 'elasticOut'
          }
        ]
      }
      
      this.achievementChartInstance.setOption(option)
    }
  }
}
</script>

<style scoped>
.quality-target-statistics {
  padding: 16px;
  height: 100%; /* 确保容器高度适应父容器 */
  overflow: hidden; /* 防止内容溢出产生滚动条 */
  box-sizing: border-box; /* 包含padding在内的盒模型 */
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 15px;
}

.page-title {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: #303133;
}

.overview-cards {
  margin-bottom: 16px;
}

.overview-card {
  background: white;
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  gap: 16px;
  height: 100px;
  cursor: pointer;
}

.overview-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
}

.overview-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
}

.overview-card .card-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  color: white;
}

.total-targets .card-icon {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.achievement-rate .card-icon {
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
}

.achieved-targets .card-icon {
  background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
}

.pending-targets .card-icon {
  background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%);
}

.overview-card .card-content {
  flex: 1;
}

.overview-card .card-value {
  font-size: 28px;
  font-weight: 700;
  color: #1f2937;
  line-height: 1;
  margin-bottom: 4px;
}

.overview-card .card-label {
  font-size: 14px;
  color: #6b7280;
  font-weight: 500;
}

.filter-card {
  margin-bottom: 16px;
}

.filter-form {
  margin: 0;
}

.data-display-card {
  margin-bottom: 16px;
}

.table-container {
  padding: 0;
}

.pagination-wrapper {
  margin-top: 20px;
  text-align: right;
}

.dialog-footer {
  text-align: right;
}

/* 达成率样式 */
.achievement-excellent {
  color: #67c23a;
  font-weight: 600;
}

.achievement-good {
  color: #e6a23c;
  font-weight: 600;
}

.achievement-poor {
  color: #f56c6c;
  font-weight: 600;
}

.no-data {
  color: #c0c4cc;
  font-style: italic;
}

/* 图表样式 */
.chart-header {
  display: flex;
  justify-content: center;
  align-items: center;
  position: relative;
}

.chart-header h3 {
  margin: 0;
  font-size: 14px;
  font-weight: normal;
  color: #606266;
  transition: color 0.3s ease;
}

/* 趋势分析标题颜色 - 蓝色系 */
.chart-header h3.trend-title {
  color: #409EFF;
  font-weight: 500;
}

/* 达成率分析标题颜色 - 绿色系 */
.chart-header h3.achievement-title {
  color: #67C23A;
  font-weight: 500;
}

.chart-header .el-radio-group {
  position: absolute;
  right: 0;
}

.chart-container {
  width: 100%;
  height: 350px;
  min-height: 280px;
  max-height: 400px;
}

.chart {
  width: 100%;
  height: 100%;
}

/* 标签页样式 */
.el-tabs--border-card {
  border: 1px solid #dcdfe6;
  border-radius: 4px;
}

.el-tabs--border-card .el-tabs__content {
  padding: 16px;
}

/* 年度选择器样式修复 */
.filter-form .el-select {
  min-width: 120px;
}

/* 表格容器样式优化 */
.table-container {
  overflow-x: auto;
  max-width: 100%;
}

/* 确保表格在小屏幕上的响应式 */
.el-table {
  min-width: 800px;
}

/* 目标信息显示区域样式 */
.target-info-section {
  margin-bottom: 20px;
}

.target-details {
  margin-top: 8px;
}

.target-value {
  font-weight: 500;
  color: #409eff;
  font-size: 14px;
}

/* 禁止表格内容换行 */
.el-table .el-table__cell {
  white-space: nowrap;
}

/* 操作列按钮不换行 */
.el-table .el-table__cell .el-button {
  white-space: nowrap;
  margin-right: 8px;
}

.el-table .el-table__cell .el-button:last-child {
  margin-right: 0;
}

/* 新增：目标分类统计页面样式 */
.company-checkbox {
  font-weight: 500;
  color: #409eff;
  margin-right: 20px;
}

.department-checkbox {
  margin-right: 0;
}

/* 新增：一行布局样式 */
.filter-row {
  display: flex;
  align-items: center;
  gap: 20px;
  flex-wrap: wrap;
  padding: 15px 20px;
  background-color: #f8f9fa;
  border-radius: 6px;
  margin-bottom: 15px;
  border: 1px solid #e4e7ed;
}

.filter-label {
  display: flex;
  align-items: center;
  gap: 8px;
  white-space: nowrap;
  font-weight: 500;
  color: #303133;
}

.unit-checkboxes-inline {
  display: flex;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
  flex: 1;
}

.department-checkboxes-inline {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.department-checkboxes-inline .el-checkbox {
  margin-right: 0;
}

.chart-container-large {
  width: 100%;
  height: 450px;
  min-height: 400px;
}

.summary-content {
  padding: 16px;
}

.summary-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  padding: 8px 0;
  border-bottom: 1px solid #f5f7fa;
}

.summary-item:last-child {
  border-bottom: none;
  margin-bottom: 0;
}

.summary-label {
  color: #909399;
  font-size: 14px;
}

.summary-value {
  color: #303133;
  font-weight: 500;
  font-size: 14px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 6px 8px;
  min-height: 32px;
}

/* Element Plus card header 样式覆盖 */
:deep(.el-card__header) {
  padding: 6px 8px !important;
  min-height: 32px;
}

.card-header .el-tag {
  margin-left: 8px;
}

/* 图表header中的筛选组件样式 */
.chart-header-with-filter {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  min-height: 36px;
}

.filter-row-compact {
  display: flex;
  align-items: center;
  gap: 15px;
  flex-wrap: wrap;
  flex: 1;
}

.filter-label-compact {
  display: flex;
  align-items: center;
  gap: 6px;
  white-space: nowrap;
  font-weight: 500;
  color: #303133;
  font-size: 14px;
}

.unit-checkboxes-compact {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  flex: 1;
}

.department-checkboxes-compact {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.department-checkboxes-compact .el-checkbox {
  margin-right: 0;
}

/* 响应式调整 */
@media (max-width: 1200px) {
  .filter-row-compact {
    gap: 10px;
  }
  
  .unit-checkboxes-compact {
    gap: 8px;
  }
  
  .department-checkboxes-compact {
    gap: 6px;
  }
}
</style>