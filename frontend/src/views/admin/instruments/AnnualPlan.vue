<template>
  <div class="annual-plan-container">
    <!-- 年度选择和操作区域 -->
    <div class="plan-header">
      <el-card>
        <div class="header-content">
          <div class="year-selector">
            <el-form inline>
              <el-form-item label="计划年度">
                <el-date-picker
                  v-model="selectedYear"
                  type="year"
                  placeholder="选择年度"
                  style="width: 150px"
                  @change="handleYearChange"
                />
              </el-form-item>
              <el-form-item>
                <el-button type="primary" @click="handleSearch" :loading="loading">
                  <el-icon><Search /></el-icon>
                  查询计划
                </el-button>
              </el-form-item>
            </el-form>
          </div>
          <div class="header-actions">
            <el-button type="success" @click="handleGeneratePlan" :loading="generateLoading">
              <el-icon><MagicStick /></el-icon>
              生成年度计划
            </el-button>
            <el-button type="primary" @click="handleAdd">
              <el-icon><Plus /></el-icon>
              新增计划
            </el-button>
            <el-button type="warning" @click="handleExportPlan" :loading="exportLoading">
              <el-icon><Download /></el-icon>
              导出计划表
            </el-button>
          </div>
        </div>
      </el-card>
    </div>

    <!-- 计划统计信息 -->
    <div class="plan-statistics" v-if="statistics">
      <el-row :gutter="20">
        <el-col :span="6">
          <el-card class="stat-card">
            <div class="stat-content">
              <div class="stat-value">{{ statistics.totalInstruments }}</div>
              <div class="stat-label">需校准仪器</div>
            </div>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card class="stat-card">
            <div class="stat-content">
              <div class="stat-value planned">{{ statistics.plannedCount }}</div>
              <div class="stat-label">已制定计划</div>
            </div>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card class="stat-card">
            <div class="stat-content">
              <div class="stat-value completed">{{ statistics.completedCount }}</div>
              <div class="stat-label">已完成校准</div>
            </div>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card class="stat-card">
            <div class="stat-content">
              <div class="stat-value overdue">{{ statistics.overdueCount }}</div>
              <div class="stat-label">逾期未校准</div>
            </div>
          </el-card>
        </el-col>
      </el-row>
    </div>

    <!-- 年度计划列表 -->
    <div class="plan-list">
      <el-card>
        <template #header>
          <div class="table-header">
            <span class="table-title">
              <el-icon><Calendar /></el-icon>
              {{ selectedYear ? new Date(selectedYear).getFullYear() : new Date().getFullYear() }}年度校准计划
            </span>
            <div class="table-actions">
              <el-button-group>
                <el-button 
                  :type="viewMode === 'month' ? 'primary' : ''"
                  @click="viewMode = 'month'"
                  size="small"
                >
                  按月查看
                </el-button>
                <el-button 
                  :type="viewMode === 'list' ? 'primary' : ''"
                  @click="viewMode = 'list'"
                  size="small"
                >
                  列表查看
                </el-button>
              </el-button-group>
            </div>
          </div>
        </template>

        <!-- 按月查看模式 -->
        <div v-if="viewMode === 'month'" class="month-view">
          <el-row :gutter="20">
            <el-col :span="4" v-for="month in 12" :key="month">
              <el-card class="month-card" :class="{ 'has-plans': getMonthPlans(month).length > 0 }">
                <template #header>
                  <div class="month-header">
                    <span class="month-title">{{ month }}月</span>
                    <el-badge :value="getMonthPlans(month).length" :hidden="getMonthPlans(month).length === 0" />
                  </div>
                </template>
                <div class="month-content">
                  <div v-if="getMonthPlans(month).length === 0" class="no-plans">
                    暂无计划
                  </div>
                  <div v-else class="plan-items">
                    <div 
                      v-for="plan in getMonthPlans(month).slice(0, 3)" 
                      :key="plan.PlanID"
                      class="plan-item"
                      @click="handleView(plan)"
                    >
                      <div class="plan-instrument">{{ plan.InstrumentName }}</div>
                      <div class="plan-date">{{ formatDate(plan.PlannedDate) }}</div>
                    </div>
                    <div v-if="getMonthPlans(month).length > 3" class="more-plans">
                      还有 {{ getMonthPlans(month).length - 3 }} 项...
                    </div>
                  </div>
                </div>
              </el-card>
            </el-col>
          </el-row>
        </div>

        <!-- 列表查看模式 -->
        <div v-else class="list-view">
          <el-table 
            :data="planList" 
            :loading="loading"
            stripe
            border
            style="width: 100%"
          >
            <el-table-column prop="ManagementCode" label="管理编号" width="120" />
            <el-table-column prop="InstrumentName" label="仪器名称" min-width="150" />
            <el-table-column prop="PlannedDate" label="计划日期" width="110">
              <template #default="{ row }">
                {{ formatDate(row.PlannedDate) }}
              </template>
            </el-table-column>
            <el-table-column prop="CalibrationCycle" label="校准周期" width="100">
              <template #default="{ row }">
                {{ row.CalibrationCycle }}个月
              </template>
            </el-table-column>
            <el-table-column prop="LastCalibrationDate" label="上次校准" width="110">
              <template #default="{ row }">
                {{ formatDate(row.LastCalibrationDate) }}
              </template>
            </el-table-column>
            <el-table-column prop="Status" label="状态" width="100">
              <template #default="{ row }">
                <el-tag 
                  :type="getStatusType(row.Status)"
                  size="small"
                >
                  {{ getStatusText(row.Status) }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="Priority" label="优先级" width="80">
              <template #default="{ row }">
                <el-tag 
                  :type="getPriorityType(row.Priority)"
                  size="small"
                >
                  {{ row.Priority }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="EstimatedCost" label="预估费用" width="100">
              <template #default="{ row }">
                {{ row.EstimatedCost ? `¥${row.EstimatedCost}` : '-' }}
              </template>
            </el-table-column>
            <el-table-column label="操作" width="200" fixed="right">
              <template #default="{ row }">
                <el-button 
                  type="primary" 
                  size="small" 
                  @click="handleEdit(row)"
                  link
                >
                  编辑
                </el-button>
                <el-button 
                  type="info" 
                  size="small" 
                  @click="handleView(row)"
                  link
                >
                  详情
                </el-button>
                <el-button 
                  type="success" 
                  size="small" 
                  @click="handleMarkCompleted(row)"
                  link
                  v-if="row.Status === 'planned'"
                >
                  标记完成
                </el-button>
                <el-button 
                  type="danger" 
                  size="small" 
                  @click="handleDelete(row)"
                  link
                >
                  删除
                </el-button>
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
      width="800px"
      :close-on-click-modal="false"
    >
      <el-form 
        :model="planForm" 
        :rules="formRules" 
        ref="formRef"
        label-width="120px"
      >
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="选择仪器" prop="InstrumentID">
              <el-select 
                v-model="planForm.InstrumentID" 
                placeholder="请选择仪器"
                filterable
                style="width: 100%"
                @change="handleInstrumentChange"
              >
                <el-option 
                  v-for="instrument in instruments" 
                  :key="instrument.InstrumentID" 
                  :label="`${instrument.ManagementCode || ''} - ${instrument.InstrumentName || ''}`" 
                  :value="instrument.InstrumentID"
                  v-if="instrument.InstrumentID"
                />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="计划年度" prop="PlanYear">
              <el-date-picker
                v-model="planForm.PlanYear"
                type="year"
                placeholder="请选择年度"
                style="width: 100%"
              />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="计划日期" prop="PlannedDate">
              <el-date-picker
                v-model="planForm.PlannedDate"
                type="date"
                placeholder="请选择计划日期"
                style="width: 100%"
              />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="校准周期" prop="CalibrationCycle">
              <el-input-number 
                v-model="planForm.CalibrationCycle" 
                :min="1"
                :max="60"
                placeholder="请输入校准周期（月）"
                style="width: 100%"
              />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="优先级" prop="Priority">
              <el-select v-model="planForm.Priority" placeholder="请选择优先级" style="width: 100%">
                <el-option label="高" value="高" />
                <el-option label="中" value="中" />
                <el-option label="低" value="低" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="预估费用" prop="EstimatedCost">
              <el-input-number 
                v-model="planForm.EstimatedCost" 
                :precision="2"
                :min="0"
                placeholder="请输入预估费用"
                style="width: 100%"
              />
            </el-form-item>
          </el-col>
        </el-row>
        <el-form-item label="备注" prop="Notes">
          <el-input 
            v-model="planForm.Notes" 
            type="textarea" 
            :rows="3"
            placeholder="请输入备注信息"
          />
        </el-form-item>
      </el-form>
      
      <template #footer>
        <div class="dialog-footer">
          <el-button @click="dialogVisible = false">取消</el-button>
          <el-button type="primary" @click="handleSubmit" :loading="submitLoading">
            确定
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
          <el-descriptions-item label="计划年度">{{ new Date(currentPlan.PlanYear).getFullYear() }}</el-descriptions-item>
          <el-descriptions-item label="计划日期">{{ formatDate(currentPlan.PlannedDate) }}</el-descriptions-item>
          <el-descriptions-item label="校准周期">{{ currentPlan.CalibrationCycle }}个月</el-descriptions-item>
          <el-descriptions-item label="上次校准">{{ formatDate(currentPlan.LastCalibrationDate) }}</el-descriptions-item>
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
          <el-descriptions-item label="预估费用">{{ currentPlan.EstimatedCost ? `¥${currentPlan.EstimatedCost}` : '未填写' }}</el-descriptions-item>
          <el-descriptions-item label="实际费用">{{ currentPlan.ActualCost ? `¥${currentPlan.ActualCost}` : '未完成' }}</el-descriptions-item>
          <el-descriptions-item label="备注" :span="2">{{ currentPlan.Notes || '无' }}</el-descriptions-item>
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
  Calendar
} from '@element-plus/icons-vue'
import { instrumentApi } from '@/api/instruments'

// 响应式数据
const loading = ref(false)
const generateLoading = ref(false)
const exportLoading = ref(false)
const exportImplementationLoading = ref(false)
const submitLoading = ref(false)
const dialogVisible = ref(false)
const detailDialogVisible = ref(false)
const isEdit = ref(false)
const formRef = ref()

// 年度选择和查看模式
const selectedYear = ref(new Date())
const viewMode = ref('month') // 'month' 或 'list'

// 数据列表
const planList = ref([])
const instruments = ref([])
const currentPlan = ref(null)
const statistics = ref(null)

// 分页数据
const pagination = reactive({
  page: 1,
  size: 20,
  total: 0
})

// 计划表单
const planForm = reactive({
  PlanID: null,
  InstrumentID: '',
  PlanYear: new Date(),
  PlannedDate: '',
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
  CalibrationCycle: [
    { required: true, message: '请输入校准周期', trigger: 'blur' }
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
    'overdue': 'danger'
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
    'overdue': '已逾期'
  }
  return statusMap[status] || '未知'
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
  // 确保planList.value存在且为数组
  if (!planList.value || !Array.isArray(planList.value)) {
    console.warn('planList.value is not an array:', planList.value)
    return []
  }
  
  return planList.value.filter(plan => {
    if (!plan || !plan.PlannedDate) {
      return false
    }
    const planDate = new Date(plan.PlannedDate)
    return planDate.getMonth() + 1 === month
  })
}

/**
 * 获取年度计划列表
 */
async function getAnnualPlan() {
  try {
    loading.value = true
    const year = selectedYear.value ? new Date(selectedYear.value).getFullYear() : new Date().getFullYear()
    const params = {
      year,
      page: pagination.page,
      size: pagination.size
    }
    const response = await instrumentApi.getAnnualPlan(params)
    
    // 确保返回的数据是数组
    if (response.data && response.data.data && Array.isArray(response.data.data.list)) {
      planList.value = response.data.data.list
    } else {
      console.warn('获取年度计划返回的数据格式不正确:', response.data)
      planList.value = []
    }
    
    pagination.total = response.data?.data?.total || 0
    statistics.value = response.data?.data?.statistics || {}
  } catch (error) {
    console.error('获取年度计划失败:', error)
    ElMessage.error('获取年度计划失败：' + error.message)
    planList.value = [] // 确保在错误情况下也有默认值
    pagination.total = 0
    statistics.value = {}
  } finally {
    loading.value = false
  }
}

/**
 * 获取仪器列表
 */
async function getInstruments() {
  try {
    const response = await instrumentApi.getInstruments({ page: 1, size: 1000 })
    // 确保返回的数据是数组，并过滤掉无效数据
    if (response.data && response.data.data && Array.isArray(response.data.data.list)) {
      instruments.value = response.data.data.list.filter(item => 
        item && item.InstrumentID && (item.InstrumentName || item.ManagementCode)
      )
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
async function handleGeneratePlan() {
  try {
    const year = selectedYear.value ? new Date(selectedYear.value).getFullYear() : new Date().getFullYear()
    await ElMessageBox.confirm(
      `确定要为${year}年自动生成校准计划吗？这将根据仪器的校准周期自动创建计划。`,
      '生成确认',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    
    generateLoading.value = true
    await instrumentApi.generateAnnualPlan({ year })
    ElMessage.success('年度计划生成成功')
    getAnnualPlan()
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('生成计划失败：' + error.message)
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
  Object.assign(planForm, row)
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
    
    await instrumentApi.markPlanCompleted(row.PlanID)
    ElMessage.success('标记成功')
    getAnnualPlan()
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('操作失败：' + error.message)
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
    
    await instrumentApi.deleteAnnualPlan(row.PlanID)
    ElMessage.success('删除成功')
    getAnnualPlan()
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('删除失败：' + error.message)
    }
  }
}

/**
 * 导出计划表
 */
async function handleExportPlan() {
  try {
    exportLoading.value = true
    const year = selectedYear.value ? new Date(selectedYear.value).getFullYear() : new Date().getFullYear()
    await instrumentApi.exportAnnualPlan({ year })
    ElMessage.success('导出成功')
  } catch (error) {
    ElMessage.error('导出失败：' + error.message)
  } finally {
    exportLoading.value = false
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
    ElMessage.error('导出失败：' + error.message)
  } finally {
    exportImplementationLoading.value = false
  }
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
    
    if (isEdit.value) {
      await instrumentApi.updateAnnualPlan(planForm.PlanID, planForm)
      ElMessage.success('更新成功')
    } else {
      await instrumentApi.createAnnualPlan(planForm)
      ElMessage.success('创建成功')
    }
    
    dialogVisible.value = false
    getAnnualPlan()
  } catch (error) {
    if (error.message) {
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
  Object.assign(planForm, {
    PlanID: null,
    InstrumentID: '',
    PlanYear: selectedYear.value || new Date(),
    PlannedDate: '',
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

// 组件挂载时初始化数据
onMounted(() => {
  getAnnualPlan()
  getInstruments()
})
</script>

<style scoped>
.annual-plan-container {
  padding: 0;
}

/* 头部样式 */
.plan-header {
  margin-bottom: 20px;
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 16px;
}

.year-selector {
  flex: 1;
}

.header-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

/* 统计卡片样式 */
.plan-statistics {
  margin-bottom: 20px;
}

.stat-card {
  text-align: center;
  cursor: pointer;
  transition: all 0.3s ease;
}

.stat-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.stat-content {
  padding: 10px 0;
}

.stat-value {
  font-size: 28px;
  font-weight: bold;
  color: #409eff;
  margin-bottom: 8px;
}

.stat-value.planned {
  color: #67c23a;
}

.stat-value.completed {
  color: #409eff;
}

.stat-value.overdue {
  color: #f56c6c;
}

.stat-label {
  font-size: 14px;
  color: #909399;
}

/* 表格样式 */
.table-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
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
  gap: 8px;
}

/* 月份视图样式 */
.month-view {
  padding: 10px 0;
}

.month-card {
  margin-bottom: 20px;
  cursor: pointer;
  transition: all 0.3s ease;
  min-height: 150px;
}

.month-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.month-card.has-plans {
  border-color: #409eff;
}

.month-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.month-title {
  font-weight: 600;
  color: #303133;
}

.month-content {
  padding: 10px 0;
}

.no-plans {
  text-align: center;
  color: #909399;
  font-size: 12px;
  padding: 20px 0;
}

.plan-items {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.plan-item {
  padding: 8px;
  background: #f8f9fa;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.plan-item:hover {
  background: #e3f2fd;
}

.plan-instrument {
  font-size: 12px;
  font-weight: 500;
  color: #303133;
  margin-bottom: 4px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.plan-date {
  font-size: 11px;
  color: #909399;
}

.more-plans {
  text-align: center;
  font-size: 11px;
  color: #409eff;
  padding: 4px 0;
}

/* 分页样式 */
.pagination-wrapper {
  margin-top: 20px;
  text-align: right;
  padding-top: 20px;
  border-top: 1px solid #ebeef5;
}

/* 对话框样式 */
.dialog-footer {
  text-align: right;
}

.dialog-footer .el-button {
  margin-left: 10px;
}

/* 详情样式 */
.plan-detail {
  padding: 10px 0;
}
</style>