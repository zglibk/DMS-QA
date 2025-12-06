<template>
  <div class="annual-plan-container">
    <!-- 页面头部：年度选择和操作按钮 -->
    <div class="page-header">
      <div class="header-left">
        <div class="year-selector">
          <span class="selector-label">计划年度</span>
          <el-date-picker
            v-model="selectedYear"
            type="year"
            placeholder="选择年度"
            style="width: 140px"
            @change="handleYearChange"
          />
          <el-button type="primary" @click="handleSearch" :loading="loading">
            <el-icon><Search /></el-icon>
            查询
          </el-button>
        </div>
      </div>
      <div class="header-right">
        <el-button type="success" @click="handleGeneratePlan" :loading="generateLoading">
          <el-icon><MagicStick /></el-icon>
          生成年度计划
        </el-button>
        <el-button type="primary" @click="handleAdd">
          <el-icon><Plus /></el-icon>
          新增计划
        </el-button>
        <el-button @click="handleExportPlan" :loading="exportLoading">
          <el-icon><Download /></el-icon>
          导出计划表
        </el-button>
        <el-button type="danger" @click="handleDeleteYearPlan" :loading="deleteYearLoading">
          <el-icon><Delete /></el-icon>
          删除本年度计划
        </el-button>
      </div>
    </div>

    <!-- 统计卡片区域 -->
    <div class="statistics-section" v-if="statistics">
      <div class="stat-card">
        <div class="stat-icon total">
          <el-icon><Document /></el-icon>
        </div>
        <div class="stat-info">
          <div class="stat-value">{{ statistics.totalInstruments }}</div>
          <div class="stat-label">需校准仪器</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon planned">
          <el-icon><Calendar /></el-icon>
        </div>
        <div class="stat-info">
          <div class="stat-value planned">{{ statistics.plannedCount }}</div>
          <div class="stat-label">已制定计划</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon completed">
          <el-icon><Search /></el-icon>
        </div>
        <div class="stat-info">
          <div class="stat-value completed">{{ statistics.completedCount }}</div>
          <div class="stat-label">已完成校准</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon overdue">
          <el-icon><MagicStick /></el-icon>
        </div>
        <div class="stat-info">
          <div class="stat-value overdue">{{ statistics.overdueCount }}</div>
          <div class="stat-label">逾期未校准</div>
        </div>
      </div>
    </div>

    <!-- 主内容区域 -->
    <div class="main-content">
      <el-card class="content-card" shadow="never">
        <template #header>
          <div class="card-header">
            <div class="card-title">
              <el-icon><Calendar /></el-icon>
              <span>{{ selectedYear ? new Date(selectedYear).getFullYear() : new Date().getFullYear() }}年度校准计划</span>
            </div>
            <div class="view-switch">
              <el-radio-group v-model="viewMode" size="small">
                <el-radio-button label="month">
                  <el-icon><Calendar /></el-icon>
                  按月查看
                </el-radio-button>
                <el-radio-button label="list">
                  <el-icon><Document /></el-icon>
                  列表查看
                </el-radio-button>
              </el-radio-group>
            </div>
          </div>
        </template>

        <!-- 按月查看模式 -->
        <div v-if="viewMode === 'month'" class="month-view">
          <div class="month-grid">
            <div 
              v-for="month in 12" 
              :key="month" 
              class="month-card"
              :class="{ 
                'has-plans': getMonthPlans(month).length > 0,
                'current-month': isCurrentMonth(month)
              }"
            >
              <div class="month-header">
                <span class="month-name">{{ month }}月</span>
                <el-badge 
                  :value="getMonthPlans(month).length" 
                  :hidden="getMonthPlans(month).length === 0"
                  type="primary"
                />
              </div>
              <div class="month-body">
                <template v-if="getMonthPlans(month).length === 0">
                  <div class="empty-month">暂无计划</div>
                </template>
                <template v-else>
                  <div 
                    v-for="plan in getMonthPlans(month).slice(0, 4)" 
                    :key="plan.PlanID"
                    class="plan-item"
                    @click="handleView(plan)"
                  >
                    <div class="plan-info">
                      <span class="plan-code">{{ plan.ManagementCode }}</span>
                      <span class="plan-name">{{ plan.InstrumentName }}</span>
                    </div>
                    <span class="plan-date">{{ formatShortDate(plan.PlannedDate) }}</span>
                  </div>
                  <div v-if="getMonthPlans(month).length > 4" class="more-link" @click="showMonthDetail(month)">
                    <el-icon><MoreFilled /></el-icon>
                    查看全部 {{ getMonthPlans(month).length }} 项
                  </div>
                </template>
              </div>
            </div>
          </div>
        </div>

        <!-- 列表查看模式 -->
        <div v-else class="list-view">
          <el-table 
            :data="planList" 
            v-loading="loading"
            stripe
            style="width: 100%"
            :header-cell-style="{ background: '#f5f7fa', color: '#606266', fontWeight: '600' }"
          >
            <el-table-column prop="ManagementCode" label="管理编号" width="120" />
            <el-table-column prop="InstrumentName" label="仪器名称" min-width="160" show-overflow-tooltip />
            <el-table-column prop="PlannedDate" label="计划日期" width="110" align="center">
              <template #default="{ row }">
                {{ formatDate(row.PlannedDate) }}
              </template>
            </el-table-column>
            <el-table-column prop="CalibrationCycle" label="校准周期" width="90" align="center">
              <template #default="{ row }">
                {{ row.CalibrationCycle ? row.CalibrationCycle + '月' : '-' }}
              </template>
            </el-table-column>
            <el-table-column prop="LastCalibrationDate" label="上次校准" width="110" align="center">
              <template #default="{ row }">
                {{ formatDate(row.LastCalibrationDate) || '-' }}
              </template>
            </el-table-column>
            <el-table-column prop="Priority" label="优先级" width="80" align="center">
              <template #default="{ row }">
                <el-tag :type="getPriorityType(row.Priority)" size="small" effect="light">
                  {{ row.Priority }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="Status" label="状态" width="90" align="center">
              <template #default="{ row }">
                <el-tag :type="getStatusType(row.Status)" size="small">
                  {{ getStatusText(row.Status) }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="EstimatedCost" label="预估费用" width="100" align="right">
              <template #default="{ row }">
                {{ row.EstimatedCost ? `¥${row.EstimatedCost}` : '-' }}
              </template>
            </el-table-column>
            <el-table-column label="操作" width="180" fixed="right" align="center">
              <template #default="{ row }">
                <el-button type="primary" size="small" link @click="handleView(row)">详情</el-button>
                <el-button type="primary" size="small" link @click="handleEdit(row)">编辑</el-button>
                <el-button 
                  v-if="row.Status === '计划中'" 
                  type="success" 
                  size="small" 
                  link 
                  @click="handleMarkCompleted(row)"
                >完成</el-button>
                <el-button type="danger" size="small" link @click="handleDelete(row)">删除</el-button>
              </template>
            </el-table-column>
          </el-table>

          <!-- 分页 -->
          <div class="pagination-wrapper">
            <el-pagination
              v-model:current-page="pagination.page"
              v-model:page-size="pagination.size"
              :page-sizes="[10, 20, 50, 100]"
              :total="pagination.total"
              layout="total, sizes, prev, pager, next, jumper"
              @size-change="handleSizeChange"
              @current-change="handleCurrentChange"
            />
          </div>
        </div>
      </el-card>
    </div>

    <!-- 新增/编辑对话框 -->
    <el-dialog 
      :title="dialogTitle" 
      v-model="dialogVisible" 
      width="680px"
      :close-on-click-modal="false"
      class="plan-dialog"
    >
      <el-form 
        :model="planForm" 
        :rules="formRules" 
        ref="formRef"
        label-width="100px"
        label-position="right"
      >
        <!-- 仪器选择 - 单独一行，突出重要性 -->
        <el-form-item label="选择仪器" prop="InstrumentID">
          <el-select 
            v-model="planForm.InstrumentID" 
            placeholder="请选择仪器"
            filterable
            style="width: 100%"
            @change="handleInstrumentChange"
          >
            <el-option 
              v-for="instrument in validInstruments" 
              :key="instrument.InstrumentID" 
              :label="getInstrumentLabel(instrument)" 
              :value="instrument.InstrumentID"
            />
          </el-select>
        </el-form-item>

        <!-- 年度和日期 -->
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="计划年度" prop="PlanYear">
              <el-date-picker
                v-model="planForm.PlanYear"
                type="year"
                placeholder="选择年度"
                style="width: 100%"
                format="YYYY"
                value-format="YYYY"
              />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="计划日期" prop="PlannedDate">
              <el-date-picker
                v-model="planForm.PlannedDate"
                type="date"
                placeholder="选择日期"
                format="YYYY-MM-DD"
                value-format="YYYY-MM-DD"
                style="width: 100%"
              />
            </el-form-item>
          </el-col>
        </el-row>

        <!-- 校准机构 - 单独一行 -->
        <el-form-item label="校准机构">
          <el-input 
            v-model="planForm.CalibrationAgency" 
            placeholder="请输入校准机构名称"
          />
        </el-form-item>

        <!-- 优先级和预估费用 -->
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="优先级" prop="Priority">
              <el-radio-group v-model="planForm.Priority">
                <el-radio-button label="高">高</el-radio-button>
                <el-radio-button label="中">中</el-radio-button>
                <el-radio-button label="低">低</el-radio-button>
              </el-radio-group>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="预估费用">
              <el-input-number 
                v-model="planForm.EstimatedCost" 
                :precision="2"
                :min="0"
                :controls="false"
                placeholder="输入金额"
                style="width: calc(100% - 30px)"
              />
              <span style="margin-left: 8px; color: #909399;">元</span>
            </el-form-item>
          </el-col>
        </el-row>

        <!-- 备注 -->
        <el-form-item label="备注">
          <el-input 
            v-model="planForm.Notes" 
            type="textarea" 
            :rows="3"
            placeholder="输入备注信息（可选）"
            maxlength="200"
            show-word-limit
          />
        </el-form-item>
      </el-form>
      
      <template #footer>
        <div class="dialog-footer">
          <el-button @click="dialogVisible = false">取 消</el-button>
          <el-button type="primary" @click="handleSubmit" :loading="submitLoading">
            {{ isEdit ? '保 存' : '创 建' }}
          </el-button>
        </div>
      </template>
    </el-dialog>

    <!-- 详情对话框 -->
    <el-dialog 
      title="计划详情" 
      v-model="detailDialogVisible" 
      width="600px"
    >
      <div class="plan-detail" v-if="currentPlan">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="管理编号">{{ currentPlan.ManagementCode }}</el-descriptions-item>
          <el-descriptions-item label="仪器名称">{{ currentPlan.InstrumentName }}</el-descriptions-item>
          <el-descriptions-item label="计划年度">{{ currentPlan.PlanYear }}年</el-descriptions-item>
          <el-descriptions-item label="计划日期">{{ formatDate(currentPlan.PlannedDate) }}</el-descriptions-item>
          <el-descriptions-item label="校准周期">{{ currentPlan.CalibrationCycle ? currentPlan.CalibrationCycle + '个月' : '未设置' }}</el-descriptions-item>
          <el-descriptions-item label="上次校准">{{ formatDate(currentPlan.LastCalibrationDate) || '无记录' }}</el-descriptions-item>
          <el-descriptions-item label="优先级">
            <el-tag :type="getPriorityType(currentPlan.Priority)">
              {{ currentPlan.Priority }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="状态">
            <el-tag :type="getStatusType(currentPlan.Status)">
              {{ getStatusText(currentPlan.Status) }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="校准机构">{{ currentPlan.CalibrationAgency || '未指定' }}</el-descriptions-item>
          <el-descriptions-item label="预估费用">{{ currentPlan.EstimatedCost ? `¥${currentPlan.EstimatedCost}` : '未填写' }}</el-descriptions-item>
          <el-descriptions-item label="实际日期">{{ formatDate(currentPlan.ActualDate) || '未完成' }}</el-descriptions-item>
          <el-descriptions-item label="实际费用">{{ currentPlan.ActualCost ? `¥${currentPlan.ActualCost}` : '未完成' }}</el-descriptions-item>
          <el-descriptions-item label="备注" :span="2">{{ currentPlan.Remarks || currentPlan.Notes || '无' }}</el-descriptions-item>
          <el-descriptions-item label="创建时间">{{ formatDateTime(currentPlan.CreatedAt) }}</el-descriptions-item>
          <el-descriptions-item label="更新时间">{{ formatDateTime(currentPlan.UpdatedAt) }}</el-descriptions-item>
        </el-descriptions>
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
/**
 * 年度校准计划组件
 * 
 * 功能说明：
 * 1. 年度校准计划制定和管理
 * 2. 支持按月查看和列表查看两种模式
 * 3. 自动生成年度计划功能
 * 4. 导出年度计划表和实施表
 * 5. 计划执行状态跟踪
 */

import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { 
  Search, 
  MagicStick, 
  Plus, 
  Download, 
  Document,
  Calendar,
  Delete,
  MoreFilled
} from '@element-plus/icons-vue'
import { instrumentApi } from '@/api/instruments'

// 响应式数据
const loading = ref(false)
const generateLoading = ref(false)
const exportLoading = ref(false)
const exportImplementationLoading = ref(false)
const submitLoading = ref(false)
const deleteYearLoading = ref(false)  // 删除年度计划加载状态
const dialogVisible = ref(false)
const detailDialogVisible = ref(false)
const isEdit = ref(false)
const formRef = ref()

// 年度选择和查看模式
const selectedYear = ref(new Date())
const viewMode = ref('list') // 默认使用列表视图 'list' 或 'month'

// 数据列表
const planList = ref([])
const allYearPlans = ref([]) // 全年计划数据，用于按月视图
const instruments = ref([])
const currentPlan = ref(null)
const statistics = ref(null)

// 计算属性：过滤有效的仪器列表
const validInstruments = computed(() => {
  if (!instruments.value || !Array.isArray(instruments.value)) {
    return []
  }
  return instruments.value.filter(item => item && item.InstrumentID)
})

// 分页数据
const pagination = reactive({
  page: 1,
  size: 5,  // 默认每页5条
  total: 0
})

// 计划表单
const planForm = reactive({
  PlanID: null,
  InstrumentID: '',
  PlanYear: String(new Date().getFullYear()),
  PlannedDate: '',
  CalibrationAgency: '',
  CalibrationCycle: 12,
  Priority: '中',
  EstimatedCost: null,
  Notes: ''
})

// 表单验证规则
const formRules = {
  InstrumentID: [
    { required: true, message: '请选择仪器', trigger: 'change' }
  ],
  PlanYear: [
    { required: true, message: '请选择计划年度', trigger: 'change' }
  ],
  PlannedDate: [
    { required: true, message: '请选择计划日期', trigger: 'change' }
  ],
  Priority: [
    { required: true, message: '请选择优先级', trigger: 'change' }
  ]
}

// 计算属性
const dialogTitle = computed(() => isEdit.value ? '编辑计划' : '新增计划')

/**
 * 获取状态标签类型
 * @param {string} status - 状态值
 * @returns {string} 标签类型
 */
function getStatusType(status) {
  const statusMap = {
    'planned': 'info',
    'in_progress': 'warning',
    'completed': 'success',
    'overdue': 'danger',
    '计划中': 'info',
    '进行中': 'warning',
    '已完成': 'success',
    '已逾期': 'danger'
  }
  return statusMap[status] || 'info'
}

/**
 * 获取状态文本
 * @param {string} status - 状态值
 * @returns {string} 状态文本
 */
function getStatusText(status) {
  const statusMap = {
    'planned': '计划中',
    'in_progress': '进行中',
    'completed': '已完成',
    'overdue': '已逾期',
    '计划中': '计划中',
    '进行中': '进行中',
    '已完成': '已完成',
    '已逾期': '已逾期'
  }
  return statusMap[status] || status || '未知'
}

/**
 * 获取优先级标签类型
 * @param {string} priority - 优先级
 * @returns {string} 标签类型
 */
function getPriorityType(priority) {
  const priorityMap = {
    '高': 'danger',
    '中': 'warning',
    '低': 'info'
  }
  return priorityMap[priority] || 'info'
}

/**
 * 格式化日期
 * @param {string} date - 日期字符串
 * @returns {string} 格式化后的日期
 */
function formatDate(date) {
  if (!date) return ''
  return new Date(date).toLocaleDateString('zh-CN')
}

/**
 * 格式化短日期（仅月-日）
 * @param {string} date - 日期字符串
 * @returns {string} 格式化后的日期
 */
function formatShortDate(date) {
  if (!date) return ''
  const d = new Date(date)
  return `${d.getMonth() + 1}-${d.getDate()}`
}

/**
 * 判断是否为当前月份
 * @param {number} month - 月份
 * @returns {boolean}
 */
function isCurrentMonth(month) {
  const now = new Date()
  const selectedYearValue = selectedYear.value ? new Date(selectedYear.value).getFullYear() : now.getFullYear()
  return selectedYearValue === now.getFullYear() && month === now.getMonth() + 1
}

/**
 * 格式化日期时间
 * @param {string} datetime - 日期时间字符串
 * @returns {string} 格式化后的日期时间
 */
function formatDateTime(datetime) {
  if (!datetime) return ''
  return new Date(datetime).toLocaleString('zh-CN')
}

/**
 * 获取指定月份的计划
 * @param {number} month - 月份
 * @returns {Array} 计划列表
 */
function getMonthPlans(month) {
  // 使用全年计划数据进行筛选
  if (!allYearPlans.value || !Array.isArray(allYearPlans.value)) {
    console.warn('allYearPlans.value is not an array:', allYearPlans.value)
    return []
  }
  
  return allYearPlans.value.filter(plan => {
    if (!plan || !plan.PlannedDate) {
      return false
    }
    const planDate = new Date(plan.PlannedDate)
    return planDate.getMonth() + 1 === month
  })
}

/**
 * 显示月份详情（切换到列表视图并筛选该月数据）
 */
function showMonthDetail(month) {
  // 切换到列表视图
  viewMode.value = 'list'
  // 提示用户
  ElMessage.info(`已切换到列表视图，显示${month}月的校准计划`)
}

/**
 * 获取年度计划列表
 */
async function getAnnualPlan() {
  try {
    loading.value = true
    const year = selectedYear.value ? new Date(selectedYear.value).getFullYear() : new Date().getFullYear()
    
    // 获取分页数据（用于列表视图）
    const params = {
      year,
      page: pagination.page,
      size: pagination.size
    }
    const response = await instrumentApi.getAnnualPlan(params)
    
    // 确保返回的数据是数组
    if (response.data && response.data.data && Array.isArray(response.data.data.list)) {
      planList.value = response.data.data.list.map(item => ({
        ...item,
        PlanID: item.ID  // 映射ID到PlanID
      }))
    } else {
      console.warn('获取年度计划返回的数据格式不正确:', response.data)
      planList.value = []
    }
    
    pagination.total = response.data?.data?.total || 0
    
    // 获取全年数据（用于按月视图）
    await getAllYearPlans(year)
    
    // 获取统计信息
    await getStatistics()
  } catch (error) {
    console.error('获取年度计划失败:', error)
    ElMessage.error('获取年度计划失败：' + error.message)
    planList.value = [] // 确保在错误情况下也有默认值
    allYearPlans.value = []
    pagination.total = 0
    statistics.value = {}
  } finally {
    loading.value = false
  }
}

/**
 * 获取全年计划数据（用于按月视图）
 */
async function getAllYearPlans(year) {
  try {
    const params = {
      year,
      page: 1,
      size: 1000  // 获取全部数据
    }
    const response = await instrumentApi.getAnnualPlan(params)
    
    if (response.data && response.data.data && Array.isArray(response.data.data.list)) {
      allYearPlans.value = response.data.data.list.map(item => ({
        ...item,
        PlanID: item.ID
      }))
    } else {
      allYearPlans.value = []
    }
  } catch (error) {
    console.error('获取全年计划失败:', error)
    allYearPlans.value = []
  }
}

/**
 * 获取统计信息
 */
async function getStatistics() {
  try {
    const year = selectedYear.value ? new Date(selectedYear.value).getFullYear() : new Date().getFullYear()
    const response = await instrumentApi.getAnnualPlanStatistics(year)
    if (response.data && response.data.data) {
      statistics.value = {
        totalInstruments: response.data.data.totalInstruments || 0,
        plannedCount: response.data.data.plannedCount || response.data.data.totalPlans || 0,
        completedCount: response.data.data.completedCount || 0,
        overdueCount: response.data.data.overdueCount || 0
      }
    }
  } catch (error) {
    console.error('获取统计信息失败:', error)
    statistics.value = {
      totalInstruments: 0,
      plannedCount: 0,
      completedCount: 0,
      overdueCount: 0
    }
  }
}

/**
 * 获取仪器列表
 */
async function getInstruments() {
  try {
    // 注意：后端API使用pageSize参数，不是size
    const response = await instrumentApi.getInstruments({ page: 1, pageSize: 1000 })
    // 确保返回的数据是数组，并过滤掉无效数据
    if (response.data && response.data.data && Array.isArray(response.data.data.list)) {
      instruments.value = response.data.data.list.filter(item => 
        item && item.ID && (item.InstrumentName || item.ManagementCode)
      ).map(item => ({
        ...item,
        // 统一使用ID作为InstrumentID，确保是数字类型
        InstrumentID: Number(item.ID),
        // 确保ManagementCode字段存在
        ManagementCode: item.ManagementCode || '',
        InstrumentName: item.InstrumentName || ''
      }))
      console.log('加载仪器列表:', instruments.value.length, '条', instruments.value.slice(0, 3))
    } else {
      console.warn('获取仪器列表返回的数据格式不正确:', response.data)
      instruments.value = []
    }
  } catch (error) {
    console.error('获取仪器列表失败:', error)
    ElMessage.error('获取仪器列表失败：' + error.message)
    instruments.value = [] // 确保在错误情况下也有默认值
  }
}

/**
 * 年度变化处理
 */
function handleYearChange() {
  pagination.page = 1
  getAnnualPlan()
}

/**
 * 搜索处理
 */
function handleSearch() {
  pagination.page = 1
  getAnnualPlan()
}

/**
 * 生成年度计划
 */
/**
 * 生成年度计划
 */
/**
 * 生成年度计划
 */
async function handleGeneratePlan() {
  try {
    // 验证是否选择了计划年度
    if (!selectedYear.value) {
      ElMessage.warning('请先选择计划年度')
      return
    }
    
    const year = new Date(selectedYear.value).getFullYear()
    
    await ElMessageBox.confirm(
      `确定要为 ${year} 年自动生成校准计划吗？\n\n系统将查询所有仪器，为"下次校准日期"在 ${year} 年内的仪器自动创建计划。`,
      '生成确认',
      {
        confirmButtonText: '确定生成',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    
    generateLoading.value = true
    const response = await instrumentApi.generateAnnualPlan({ year })
    const data = response.data?.data || {}
    
    let message = `年度计划生成完成！新建 ${data.createdCount || 0} 条`
    if (data.skippedCount > 0) {
      message += `，跳过 ${data.skippedCount} 条（已存在）`
    }
    if (data.notInYearCount > 0) {
      message += `，${data.notInYearCount} 条不在 ${year} 年校准范围内`
    }
    
    if (data.createdCount > 0) {
      ElMessage.success(message)
    } else if (data.skippedCount > 0) {
      ElMessage.info(message)
    } else {
      ElMessage.info(`${year} 年没有需要校准的仪器`)
    }
    
    getAnnualPlan()
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('生成计划失败：' + (error.response?.data?.message || error.message || '未知错误'))
    }
  } finally {
    generateLoading.value = false
  }
}

/**
 * 新增计划
 */
function handleAdd() {
  isEdit.value = false
  resetForm()
  dialogVisible.value = true
}

/**
 * 编辑计划
 * @param {Object} row - 计划数据
 */
function handleEdit(row) {
  isEdit.value = true
  
  // 确保InstrumentID类型一致
  const instrumentId = row.InstrumentID ? Number(row.InstrumentID) : ''
  console.log('编辑计划 - row.InstrumentID:', row.InstrumentID, '转换后:', instrumentId)
  console.log('当前仪器列表中的ID:', instruments.value.map(i => i.InstrumentID).slice(0, 5))
  
  Object.assign(planForm, {
    PlanID: row.ID || row.PlanID,
    InstrumentID: instrumentId,
    PlanYear: row.PlanYear ? String(row.PlanYear) : String(new Date().getFullYear()),
    PlannedDate: row.PlannedDate,
    CalibrationAgency: row.CalibrationAgency || '',
    CalibrationCycle: row.CalibrationCycle || 12,
    Priority: row.Priority || '中',
    EstimatedCost: row.EstimatedCost,
    Notes: row.Remarks || ''
  })
  dialogVisible.value = true
}

/**
 * 查看详情
 * @param {Object} row - 计划数据
 */
function handleView(row) {
  currentPlan.value = row
  detailDialogVisible.value = true
}

/**
 * 标记完成
 * @param {Object} row - 计划数据
 */
async function handleMarkCompleted(row) {
  try {
    await ElMessageBox.confirm(
      `确定要标记该计划为已完成吗？`,
      '完成确认',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'info'
      }
    )
    
    const planId = row.ID || row.PlanID
    await instrumentApi.updateAnnualPlanStatus(planId, { 
      status: '已完成',
      actualDate: new Date().toISOString().split('T')[0]
    })
    ElMessage.success('标记成功')
    getAnnualPlan()
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('操作失败：' + (error.message || '未知错误'))
    }
  }
}

/**
 * 删除计划
 * @param {Object} row - 计划数据
 */
async function handleDelete(row) {
  try {
    await ElMessageBox.confirm(
      `确定要删除该计划吗？`,
      '删除确认',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    
    const planId = row.ID || row.PlanID
    await instrumentApi.deleteAnnualPlan(planId)
    ElMessage.success('删除成功')
    getAnnualPlan()
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('删除失败：' + (error.message || '未知错误'))
    }
  }
}

/**
 * 导出计划表
 */
async function handleExportPlan() {
  try {
    // 先确认是否导出
    await ElMessageBox.confirm(
      '确定要导出年度校准计划表吗？',
      '导出确认',
      {
        confirmButtonText: '确定导出',
        cancelButtonText: '取消',
        type: 'info'
      }
    )
    
    exportLoading.value = true
    const year = selectedYear.value ? new Date(selectedYear.value).getFullYear() : new Date().getFullYear()
    
    // 获取token
    const token = localStorage.getItem('token')
    
    // 使用fetch请求下载文件
    const response = await fetch(`/api/instruments/export/annual-plan/${year}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
    
    if (!response.ok) {
      throw new Error('导出失败')
    }
    
    // 生成带时间戳的文件名
    const now = new Date()
    const timestamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`
    const filename = `年度校准计划_${year}年_${timestamp}.xlsx`
    
    // 下载文件
    const blob = await response.blob()
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)
    
    ElMessage.success('导出成功')
  } catch (error) {
    // 用户取消不提示错误
    if (error === 'cancel' || error.toString().includes('cancel')) {
      return
    }
    ElMessage.error('导出失败：' + (error.message || '未知错误'))
  } finally {
    exportLoading.value = false
  }
}

/**
 * 删除指定年度的所有校准计划
 */
async function handleDeleteYearPlan() {
  const year = selectedYear.value ? new Date(selectedYear.value).getFullYear() : new Date().getFullYear()
  
  try {
    // 二次确认
    await ElMessageBox.confirm(
      `确定要删除 ${year} 年度的所有校准计划吗？此操作不可恢复！`,
      '删除年度计划',
      {
        confirmButtonText: '确定删除',
        cancelButtonText: '取消',
        type: 'warning',
        confirmButtonClass: 'el-button--danger'
      }
    )
    
    // 再次确认
    await ElMessageBox.confirm(
      `请再次确认：将删除 ${year} 年度的全部 ${pagination.total} 条校准计划记录！`,
      '最终确认',
      {
        confirmButtonText: '确认删除',
        cancelButtonText: '取消',
        type: 'error'
      }
    )
    
    deleteYearLoading.value = true
    
    const response = await instrumentApi.deleteAnnualPlanByYear(year)
    
    if (response.data?.code === 200) {
      ElMessage.success(response.data.message || `成功删除 ${year} 年度计划`)
      // 刷新数据
      getAnnualPlan()
      getStatistics()
    } else {
      ElMessage.error(response.data?.message || '删除失败')
    }
  } catch (error) {
    if (error !== 'cancel' && !error.toString().includes('cancel')) {
      ElMessage.error('删除失败：' + (error.response?.data?.message || error.message || '未知错误'))
    }
  } finally {
    deleteYearLoading.value = false
  }
}

/**
 * 导出实施表
 */
async function handleExportImplementation() {
  try {
    exportImplementationLoading.value = true
    const year = selectedYear.value ? new Date(selectedYear.value).getFullYear() : new Date().getFullYear()
    await instrumentApi.exportImplementationTable({ year })
    ElMessage.success('导出成功')
  } catch (error) {
    ElMessage.error('导出失败：' + (error.message || '未知错误'))
  } finally {
    exportImplementationLoading.value = false
  }
}

/**
 * 获取仪器显示标签
 * @param {Object} instrument - 仪器对象
 * @returns {string} 显示标签
 */
function getInstrumentLabel(instrument) {
  if (!instrument) return ''
  
  // 优先使用管理编号，如果没有则使用出厂编号
  const code = instrument.ManagementCode || instrument.InstrumentCode || ''
  const name = instrument.InstrumentName || ''
  
  if (code && name) {
    return `${code} - ${name}`
  } else if (name) {
    return name
  } else if (code) {
    return code
  }
  return `仪器ID: ${instrument.InstrumentID}`
}

/**
 * 仪器选择变化处理
 * @param {number} instrumentId - 仪器ID
 */
function handleInstrumentChange(instrumentId) {
  const instrument = instruments.value.find(item => item.InstrumentID === instrumentId)
  if (instrument) {
    // 可以根据仪器信息自动填充一些字段
  }
}

/**
 * 提交表单
 */
async function handleSubmit() {
  try {
    await formRef.value.validate()
    submitLoading.value = true
    
    // 构建提交数据，映射字段名
    // planYear 可能是字符串"2026"或Date对象，统一处理
    let planYear
    if (typeof planForm.PlanYear === 'string') {
      planYear = parseInt(planForm.PlanYear)
    } else if (planForm.PlanYear instanceof Date) {
      planYear = planForm.PlanYear.getFullYear()
    } else {
      planYear = new Date().getFullYear()
    }
    
    const submitData = {
      instrumentID: planForm.InstrumentID,
      planYear: planYear,
      plannedDate: planForm.PlannedDate,
      calibrationAgency: planForm.CalibrationAgency || '',
      estimatedCost: planForm.EstimatedCost,
      priority: planForm.Priority,
      remarks: planForm.Notes
    }
    
    if (isEdit.value) {
      await instrumentApi.updateAnnualPlan(planForm.PlanID, submitData)
      ElMessage.success('更新成功')
    } else {
      await instrumentApi.createAnnualPlan(submitData)
      ElMessage.success('创建成功')
    }
    
    dialogVisible.value = false
    getAnnualPlan()
  } catch (error) {
    // 如果是业务错误（后端返回了明确的错误信息），只显示后端的信息
    // 避免与axios拦截器的全局错误提示重复
    if (error.response?.data?.message) {
      // 后端已返回明确错误信息，拦截器可能已显示，此处不再重复
      console.log('业务错误:', error.response.data.message)
    } else if (error.message && !error.response) {
      // 网络错误等非业务错误
      ElMessage.error('操作失败：' + error.message)
    }
  } finally {
    submitLoading.value = false
  }
}

/**
 * 重置表单
 */
function resetForm() {
  // 获取当前选择的年度，转换为字符串格式
  let defaultYear
  if (selectedYear.value) {
    if (selectedYear.value instanceof Date) {
      defaultYear = String(selectedYear.value.getFullYear())
    } else {
      defaultYear = String(selectedYear.value)
    }
  } else {
    defaultYear = String(new Date().getFullYear())
  }
  
  Object.assign(planForm, {
    PlanID: null,
    InstrumentID: '',
    PlanYear: defaultYear,
    PlannedDate: '',
    CalibrationAgency: '',
    CalibrationCycle: 12,
    Priority: '中',
    EstimatedCost: null,
    Notes: ''
  })
  formRef.value?.resetFields()
}

/**
 * 分页大小改变
 * @param {number} size - 页面大小
 */
function handleSizeChange(size) {
  pagination.size = size
  pagination.page = 1
  getAnnualPlan()
}

/**
 * 当前页改变
 * @param {number} page - 当前页
 */
function handleCurrentChange(page) {
  pagination.page = page
  getAnnualPlan()
}

/**
 * 刷新数据（供父组件调用）
 */
function refreshData() {
  getAnnualPlan()
  getStatistics()
  getInstruments()
}

// 暴露方法给父组件
defineExpose({
  refreshData
})

// 组件挂载时初始化数据
onMounted(() => {
  getAnnualPlan()
  getInstruments()
})
</script>

<style scoped>
.annual-plan-container {
  padding: 0;
  background: #f5f7fa;
  min-height: 100%;
}

/* ==================== 页面头部 ==================== */
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  background: #fff;
  border-radius: 8px;
  margin-bottom: 16px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.05);
}

.header-left {
  display: flex;
  align-items: center;
}

.year-selector {
  display: flex;
  align-items: center;
  gap: 12px;
}

.selector-label {
  font-size: 14px;
  color: #606266;
  font-weight: 500;
}

.header-right {
  display: flex;
  gap: 10px;
}

/* ==================== 统计卡片 ==================== */
.statistics-section {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  margin-bottom: 16px;
}

.stat-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px;
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.05);
  transition: all 0.3s ease;
}

.stat-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.stat-icon {
  width: 48px;
  height: 48px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
}

.stat-icon.total {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: #fff;
}

.stat-icon.planned {
  background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);
  color: #fff;
}

.stat-icon.completed {
  background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
  color: #fff;
}

.stat-icon.overdue {
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
  color: #fff;
}

.stat-info {
  flex: 1;
}

.stat-value {
  font-size: 28px;
  font-weight: 700;
  color: #303133;
  line-height: 1.2;
}

.stat-value.planned { color: #67c23a; }
.stat-value.completed { color: #409eff; }
.stat-value.overdue { color: #f56c6c; }

.stat-label {
  font-size: 13px;
  color: #909399;
  margin-top: 4px;
}

/* ==================== 主内容区域 ==================== */
.main-content {
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.05);
}

.content-card {
  border: none;
}

.content-card :deep(.el-card__header) {
  padding: 16px 20px;
  border-bottom: 1px solid #ebeef5;
}

.content-card :deep(.el-card__body) {
  padding: 20px;
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
  font-weight: 600;
  color: #303133;
}

.card-title .el-icon {
  color: #409eff;
}

.view-switch :deep(.el-radio-button__inner) {
  display: flex;
  align-items: center;
  gap: 4px;
}

/* ==================== 月份视图 ==================== */
.month-view {
  padding: 8px 0;
}

.month-grid {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 20px;
}

@media (max-width: 1400px) {
  .month-grid {
    grid-template-columns: repeat(4, 1fr);
  }
}

@media (max-width: 1000px) {
  .month-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}

.month-card {
  background: linear-gradient(135deg, #fafbfc 0%, #f5f7fa 100%);
  border: 1px solid #e4e7ed;
  border-radius: 12px;
  overflow: hidden;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  min-height: 160px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}

.month-card:hover {
  border-color: #c0c4cc;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
  transform: translateY(-4px);
}

.month-card.has-plans {
  border-color: #409eff;
  background: linear-gradient(135deg, #f0f7ff 0%, #e6f1fc 100%);
  box-shadow: 0 4px 12px rgba(64, 158, 255, 0.15);
}

.month-card.has-plans:hover {
  box-shadow: 0 8px 24px rgba(64, 158, 255, 0.25);
}

.month-card.current-month {
  border-color: #67c23a;
  background: linear-gradient(135deg, #f0f9eb 0%, #e8f5e0 100%);
  box-shadow: 0 4px 12px rgba(103, 194, 58, 0.15);
}

.month-card.current-month:hover {
  box-shadow: 0 8px 24px rgba(103, 194, 58, 0.25);
}

.month-card.current-month .month-name {
  color: #67c23a;
}

.month-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 14px 16px;
  background: rgba(255, 255, 255, 0.7);
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
  backdrop-filter: blur(8px);
}

.month-name {
  font-size: 16px;
  font-weight: 700;
  color: #303133;
  letter-spacing: 1px;
}

.month-header :deep(.el-badge__content) {
  font-weight: 600;
  border-radius: 10px;
  padding: 0 8px;
  height: 20px;
  line-height: 20px;
}

.month-body {
  padding: 12px 14px;
  min-height: 100px;
}

.empty-month {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 80px;
  color: #c0c4cc;
  font-size: 13px;
}

.empty-month::before {
  content: '📅';
  font-size: 24px;
  margin-bottom: 8px;
  opacity: 0.5;
}

.plan-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 12px;
  margin-bottom: 8px;
  background: rgba(255, 255, 255, 0.9);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.25s ease;
  border: 1px solid rgba(0, 0, 0, 0.05);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
}

.plan-item:hover {
  background: #ecf5ff;
  border-color: #b3d8ff;
  box-shadow: 0 2px 8px rgba(64, 158, 255, 0.15);
  transform: translateX(4px);
}

.plan-item:last-child {
  margin-bottom: 0;
}

.plan-info {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-width: 0;
  margin-right: 10px;
}

.plan-code {
  font-size: 11px;
  color: #909399;
  margin-bottom: 2px;
  font-family: 'Monaco', 'Consolas', monospace;
}

.plan-name {
  font-size: 13px;
  color: #303133;
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.plan-date {
  font-size: 11px;
  color: #909399;
  flex-shrink: 0;
  background: rgba(0, 0, 0, 0.04);
  padding: 2px 8px;
  border-radius: 10px;
  font-weight: 500;
}

.more-link {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  font-size: 12px;
  color: #409eff;
  padding: 8px 0 4px;
  cursor: pointer;
  font-weight: 500;
  transition: all 0.2s ease;
  border-top: 1px dashed rgba(64, 158, 255, 0.3);
  margin-top: 4px;
}

.more-link:hover {
  color: #337ecc;
  background: rgba(64, 158, 255, 0.08);
  border-radius: 4px;
}

/* ==================== 列表视图 ==================== */
.list-view {
  padding: 0;
}

.list-view :deep(.el-table) {
  border-radius: 4px;
}

.list-view :deep(.el-table th.el-table__cell) {
  background: #f5f7fa;
}

/* ==================== 分页 ==================== */
.pagination-wrapper {
  margin-top: 20px;
  padding-top: 16px;
  border-top: 1px solid #ebeef5;
  display: flex;
  justify-content: flex-end;
}

/* ==================== 对话框样式 ==================== */
.plan-dialog :deep(.el-dialog__body) {
  padding: 24px 28px 16px;
  min-height: 380px;
}

.plan-dialog :deep(.el-form-item) {
  margin-bottom: 22px;
}

.plan-dialog :deep(.el-form-item__label) {
  font-weight: 500;
  color: #606266;
}

.plan-dialog :deep(.el-radio-group) {
  width: 100%;
  display: flex;
}

.plan-dialog :deep(.el-radio-button) {
  flex: 1;
}

.plan-dialog :deep(.el-radio-button__inner) {
  width: 100%;
}

.plan-dialog :deep(.el-textarea__inner) {
  resize: none;
}

.dialog-footer {
  text-align: right;
  padding-top: 12px;
}

.dialog-footer .el-button {
  min-width: 88px;
}

.dialog-footer .el-button + .el-button {
  margin-left: 12px;
}

/* ==================== 详情对话框 ==================== */
.plan-detail {
  padding: 10px 0;
}

.plan-detail :deep(.el-descriptions__label) {
  width: 100px;
  font-weight: 500;
}
</style>