<template>
  <div class="plan-management">
    <!-- 页面头部 -->
    <div class="page-header">
      <div class="header-left">
        <h2 class="page-title">
          <el-icon><Document /></el-icon>
          计划管理
        </h2>
        <p class="page-subtitle">工作计划的创建、编辑、删除和查看</p>
      </div>
      <div class="header-right">
        <el-button type="primary" @click="showCreateDialog">
          <el-icon><Plus /></el-icon>
          新建计划
        </el-button>
      </div>
    </div>

    <!-- 搜索和筛选 -->
    <div class="search-filters">
      <el-card>
        <el-form :model="searchForm" inline>
          <el-form-item label="关键词">
            <el-input
              v-model="searchForm.keyword"
              placeholder="搜索计划标题或描述"
              clearable
              style="width: 200px"
              @keyup.enter="searchPlans"
            />
          </el-form-item>
          <el-form-item label="状态">
            <el-select v-model="searchForm.status" placeholder="选择状态" clearable style="width: 120px">
              <el-option label="待开始" value="pending" />
              <el-option label="进行中" value="in_progress" />
              <el-option label="已完成" value="completed" />
              <el-option label="已暂停" value="paused" />
              <el-option label="已取消" value="cancelled" />
            </el-select>
          </el-form-item>
          <el-form-item label="优先级">
            <el-select v-model="searchForm.priority" placeholder="选择优先级" clearable style="width: 120px">
              <el-option label="高" value="high" />
              <el-option label="中" value="medium" />
              <el-option label="低" value="low" />
            </el-select>
          </el-form-item>
          <el-form-item label="负责人">
            <el-select v-model="searchForm.assigneeId" placeholder="选择负责人" clearable style="width: 150px">
              <el-option
                v-for="user in assignableUsers"
                :key="user.ID"
                :label="user.RealName"
                :value="user.ID"
              />
            </el-select>
          </el-form-item>
          <el-form-item>
            <el-button type="primary" @click="searchPlans">
              <el-icon><Search /></el-icon>
              搜索
            </el-button>
            <el-button @click="resetSearch">
              <el-icon><Refresh /></el-icon>
              重置
            </el-button>
          </el-form-item>
        </el-form>
      </el-card>
    </div>

    <!-- 计划列表 -->
    <div class="plan-list">
      <el-card>
        <div class="table-header">
          <div class="table-title">计划列表</div>
          <div class="table-actions">
            <el-button
              type="danger"
              :disabled="selectedPlans.length === 0"
              @click="batchDeletePlans"
            >
              <el-icon><Delete /></el-icon>
              批量删除
            </el-button>
            <el-button @click="exportPlans">
              <el-icon><Download /></el-icon>
              导出
            </el-button>
          </div>
        </div>

        <el-table
          v-loading="loading"
          :data="planList"
          @selection-change="handleSelectionChange"
          stripe
          style="width: 100%"
        >
          <el-table-column type="selection" width="55" />
          <el-table-column prop="Title" label="计划标题" min-width="200">
            <template #default="{ row }">
              <div class="plan-title-cell">
                <div class="plan-title" @click="viewPlanDetail(row.ID)">{{ row.Title }}</div>
                <div class="plan-type">{{ getWorkTypeName(row.WorkTypeID) }}</div>
              </div>
            </template>
          </el-table-column>
          <el-table-column prop="Status" label="状态" width="100">
            <template #default="{ row }">
              <el-tag :type="getStatusTagType(row.Status)">{{ getStatusText(row.Status) }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="Priority" label="优先级" width="100">
            <template #default="{ row }">
              <el-tag :type="getPriorityTagType(row.Priority)">{{ getPriorityText(row.Priority) }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="Progress" label="进度" width="120">
            <template #default="{ row }">
              <div class="progress-cell">
                <el-progress
                  :percentage="row.Progress || 0"
                  :stroke-width="8"
                  :show-text="false"
                  :color="getProgressColor(row.Progress || 0)"
                />
                <span class="progress-text">{{ row.Progress || 0 }}%</span>
              </div>
            </template>
          </el-table-column>
          <el-table-column prop="AssigneeName" label="负责人" width="120" />
          <el-table-column prop="ExecuteDepartmentName" label="执行部门" width="120" />
          <el-table-column prop="ExecutorNames" label="执行人" width="150">
            <template #default="{ row }">
              <span v-if="row.ExecutorNames">{{ row.ExecutorNames }}</span>
              <span v-else class="text-muted">未分配</span>
            </template>
          </el-table-column>
          <el-table-column prop="StartDate" label="开始日期" width="120">
            <template #default="{ row }">
              {{ formatDate(row.StartDate) }}
            </template>
          </el-table-column>
          <el-table-column prop="EndDate" label="截止日期" width="120">
            <template #default="{ row }">
              <span :class="{ 'deadline-warning': isDeadlineWarning(row.EndDate, row.Status) }">
                {{ formatDate(row.EndDate) }}
              </span>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="200" fixed="right">
            <template #default="{ row }">
              <el-button type="primary" size="small" @click="viewPlanDetail(row.ID)">
                查看
              </el-button>
              <el-button type="warning" size="small" @click="editPlan(row)">
                编辑
              </el-button>
              <el-button type="danger" size="small" @click="deletePlan(row)">
                删除
              </el-button>
            </template>
          </el-table-column>
        </el-table>

        <!-- 分页 -->
        <div class="pagination-container">
          <el-pagination
            v-model:current-page="pagination.page"
            v-model:page-size="pagination.pageSize"
            :page-sizes="[10, 20, 50, 100]"
            :total="pagination.total"
            layout="total, sizes, prev, pager, next, jumper"
            @size-change="handleSizeChange"
            @current-change="handleCurrentChange"
          />
        </div>
      </el-card>
    </div>

    <!-- 创建/编辑计划对话框 -->
    <el-dialog
      v-model="dialogVisible"
      :title="dialogTitle"
      width="800px"
      :close-on-click-modal="false"
    >
      <el-form
        ref="planFormRef"
        :model="planForm"
        :rules="planFormRules"
        label-width="100px"
      >
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="计划标题" prop="Title">
              <el-input v-model="planForm.Title" placeholder="请输入计划标题" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="工作类型" prop="WorkTypeID">
              <el-select v-model="planForm.WorkTypeID" placeholder="选择工作类型" style="width: 100%">
                <el-option
                  v-for="type in workTypes"
                  :key="type.ID"
                  :label="type.TypeName"
                  :value="type.ID"
                />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="优先级" prop="Priority">
              <el-select v-model="planForm.Priority" placeholder="选择优先级" style="width: 100%">
                <el-option label="高" value="high" />
                <el-option label="中" value="medium" />
                <el-option label="低" value="low" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="负责人" prop="AssigneeID">
              <el-select v-model="planForm.AssigneeID" placeholder="选择负责人" style="width: 100%">
                <el-option
                  v-for="user in assignableUsers"
                  :key="user.ID"
                  :label="user.RealName"
                  :value="user.ID"
                />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="执行部门" prop="DepartmentID">
              <el-select v-model="planForm.DepartmentID" placeholder="请选择执行部门" style="width: 100%">
                <el-option
                  v-for="dept in departments"
                  :key="dept.ID"
                  :label="dept.Name"
                  :value="dept.ID"
                />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="执行人" prop="ExecutorIDs">
              <el-select v-model="planForm.ExecutorIDs" placeholder="请选择执行人" multiple style="width: 100%">
                <el-option
                  v-for="user in assignableUsers"
                  :key="user.ID"
                  :label="user.RealName"
                  :value="user.ID"
                />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="开始日期" prop="StartDate">
              <el-date-picker
                v-model="planForm.StartDate"
                type="date"
                placeholder="选择开始日期"
                style="width: 100%"
              />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="截止日期" prop="EndDate">
              <el-date-picker
                v-model="planForm.EndDate"
                type="date"
                placeholder="选择截止日期"
                style="width: 100%"
              />
            </el-form-item>
          </el-col>
        </el-row>
        <el-form-item label="计划描述" prop="Description">
          <el-input
            v-model="planForm.Description"
            type="textarea"
            :rows="4"
            placeholder="请输入计划描述"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="dialogVisible = false">取消</el-button>
          <el-button type="primary" @click="savePlan" :loading="saving">
            {{ isEdit ? '更新' : '创建' }}
          </el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  Document,
  Plus,
  Search,
  Refresh,
  Delete,
  Download
} from '@element-plus/icons-vue'
import api from '@/services/api'
import { useRouter } from 'vue-router'

const router = useRouter()

// 响应式数据
const loading = ref(false)
const saving = ref(false)
const planList = ref([])
const selectedPlans = ref([])
const workTypes = ref([])
const assignableUsers = ref([])
const departments = ref([])

// 搜索表单
const searchForm = reactive({
  keyword: '',
  status: '',
  priority: '',
  assigneeId: ''
})

// 分页数据
const pagination = reactive({
  page: 1,
  pageSize: 20,
  total: 0
})

// 对话框相关
const dialogVisible = ref(false)
const isEdit = ref(false)
const planFormRef = ref()

// 计划表单
const planForm = reactive({
  ID: null,
  Title: '',
  Description: '',
  WorkTypeID: '',
  Priority: 'medium',
  AssigneeID: '',
  DepartmentID: '',
  ExecutorIDs: [],
  StartDate: '',
  EndDate: ''
})

// 表单验证规则
const planFormRules = {
  Title: [{ required: true, message: '请输入计划标题', trigger: 'blur' }],
  WorkTypeID: [{ required: true, message: '请选择工作类型', trigger: 'change' }],
  Priority: [{ required: true, message: '请选择优先级', trigger: 'change' }],
  AssigneeID: [{ required: true, message: '请选择负责人', trigger: 'change' }],
  DepartmentID: [{ required: true, message: '请选择执行部门', trigger: 'change' }],
  ExecutorIDs: [{ required: true, message: '请选择执行人', trigger: 'change' }],
  StartDate: [{ required: true, message: '请选择开始日期', trigger: 'change' }],
  EndDate: [{ required: true, message: '请选择截止日期', trigger: 'change' }]
}

// 计算属性
const dialogTitle = computed(() => isEdit.value ? '编辑计划' : '新建计划')

/**
 * 获取计划列表
 */
const getPlanList = async () => {
  try {
    loading.value = true
    const params = {
      page: pagination.page,
      pageSize: pagination.pageSize,
      ...searchForm
    }
    const response = await api.get('/work-plan/plans', { params })
    if (response.data.success) {
      planList.value = response.data.data.list
      pagination.total = response.data.data.total
    }
  } catch (error) {
    console.error('获取计划列表失败:', error)
    ElMessage.error('获取计划列表失败')
  } finally {
    loading.value = false
  }
}

/**
 * 获取工作类型列表
 */
const getWorkTypes = async () => {
  try {
    const response = await api.get('/work-plan/work-types')
    if (response.data.success) {
      workTypes.value = response.data.data
    }
  } catch (error) {
    console.error('获取工作类型失败:', error)
  }
}

/**
 * 获取可分配用户列表
 */
const getAssignableUsers = async () => {
  try {
    const response = await api.get('/work-plan/assignable-users')
    if (response.data.success) {
      assignableUsers.value = response.data.data
    }
  } catch (error) {
    console.error('获取用户列表失败:', error)
  }
}

/**
 * 获取部门列表
 */
const getDepartments = async () => {
  try {
    const response = await api.get('/work-plan/departments')
    if (response.data.success) {
      departments.value = response.data.data
    }
  } catch (error) {
    console.error('获取部门列表失败:', error)
  }
}

/**
 * 搜索计划
 */
const searchPlans = () => {
  pagination.page = 1
  getPlanList()
}

/**
 * 重置搜索
 */
const resetSearch = () => {
  Object.assign(searchForm, {
    keyword: '',
    status: '',
    priority: '',
    assigneeId: ''
  })
  searchPlans()
}

/**
 * 显示创建对话框
 */
const showCreateDialog = () => {
  isEdit.value = false
  resetPlanForm()
  dialogVisible.value = true
}

/**
 * 编辑计划
 */
const editPlan = (plan) => {
  isEdit.value = true
  Object.assign(planForm, {
    ID: plan.ID,
    Title: plan.Title,
    Description: plan.Description,
    WorkTypeID: plan.WorkTypeID,
    Priority: plan.Priority,
    AssigneeID: plan.AssigneeID,
    DepartmentID: plan.DepartmentID,
    ExecutorIDs: plan.ExecutorIDs || [],
    StartDate: plan.StartDate ? new Date(plan.StartDate) : '',
    EndDate: plan.EndDate ? new Date(plan.EndDate) : ''
  })
  dialogVisible.value = true
}

/**
 * 保存计划
 */
const savePlan = async () => {
  try {
    await planFormRef.value.validate()
    saving.value = true
    
    const planData = {
      ...planForm,
      StartDate: planForm.StartDate ? new Date(planForm.StartDate).toISOString().split('T')[0] : '',
      EndDate: planForm.EndDate ? new Date(planForm.EndDate).toISOString().split('T')[0] : ''
    }
    
    let response
    if (isEdit.value) {
      response = await api.put(`/work-plan/plans/${planForm.ID}`, planData)
    } else {
      response = await api.post('/work-plan/plans', planData)
    }
    
    if (response.data.success) {
      ElMessage.success(isEdit.value ? '计划更新成功' : '计划创建成功')
      dialogVisible.value = false
      getPlanList()
    }
  } catch (error) {
    console.error('保存计划失败:', error)
    ElMessage.error('保存计划失败')
  } finally {
    saving.value = false
  }
}

/**
 * 删除计划
 */
const deletePlan = async (plan) => {
  try {
    await ElMessageBox.confirm(
      `确定要删除计划"${plan.Title}"吗？`,
      '确认删除',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    
    const response = await api.delete(`/work-plan/plans/${plan.ID}`)
    if (response.data.success) {
      ElMessage.success('计划删除成功')
      getPlanList()
    }
  } catch (error) {
    if (error !== 'cancel') {
      console.error('删除计划失败:', error)
      ElMessage.error('删除计划失败')
    }
  }
}

/**
 * 批量删除计划
 */
const batchDeletePlans = async () => {
  try {
    await ElMessageBox.confirm(
      `确定要删除选中的 ${selectedPlans.value.length} 个计划吗？`,
      '确认批量删除',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    
    const planIds = selectedPlans.value.map(plan => plan.ID)
    const response = await api.delete('/work-plan/plans/batch', { data: { planIds } })
    if (response.data.success) {
      ElMessage.success('批量删除成功')
      getPlanList()
    }
  } catch (error) {
    if (error !== 'cancel') {
      console.error('批量删除失败:', error)
      ElMessage.error('批量删除失败')
    }
  }
}

/**
 * 导出计划
 */
const exportPlans = async () => {
  try {
    const response = await api.get('/work-plan/plans/export', {
      params: searchForm,
      responseType: 'blob'
    })
    
    const blob = new Blob([response.data], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `工作计划_${new Date().toISOString().split('T')[0]}.xlsx`
    link.click()
    window.URL.revokeObjectURL(url)
    
    ElMessage.success('导出成功')
  } catch (error) {
    console.error('导出失败:', error)
    ElMessage.error('导出失败')
  }
}

/**
 * 查看计划详情
 */
const viewPlanDetail = (planId) => {
  router.push(`/admin/work-plan/plans/${planId}`)
}

/**
 * 重置计划表单
 */
const resetPlanForm = () => {
  Object.assign(planForm, {
    ID: null,
    Title: '',
    Description: '',
    WorkTypeID: '',
    Priority: 'medium',
    AssigneeID: '',
    DepartmentID: '',
    ExecutorIDs: [],
    StartDate: '',
    EndDate: ''
  })
  planFormRef.value?.clearValidate()
}

/**
 * 处理选择变化
 */
const handleSelectionChange = (selection) => {
  selectedPlans.value = selection
}

/**
 * 处理页面大小变化
 */
const handleSizeChange = (size) => {
  pagination.pageSize = size
  pagination.page = 1
  getPlanList()
}

/**
 * 处理当前页变化
 */
const handleCurrentChange = (page) => {
  pagination.page = page
  getPlanList()
}

/**
 * 获取工作类型名称
 */
const getWorkTypeName = (typeId) => {
  const type = workTypes.value.find(t => t.ID === typeId)
  return type ? type.TypeName : '未知类型'
}

/**
 * 获取状态标签类型
 */
const getStatusTagType = (status) => {
  const statusMap = {
    pending: '',
    in_progress: 'warning',
    completed: 'success',
    paused: 'info',
    cancelled: 'danger'
  }
  return statusMap[status] || ''
}

/**
 * 获取状态文本
 */
const getStatusText = (status) => {
  const statusMap = {
    pending: '待开始',
    in_progress: '进行中',
    completed: '已完成',
    paused: '已暂停',
    cancelled: '已取消'
  }
  return statusMap[status] || '未知状态'
}

/**
 * 获取优先级标签类型
 */
const getPriorityTagType = (priority) => {
  const priorityMap = {
    high: 'danger',
    medium: 'warning',
    low: 'info'
  }
  return priorityMap[priority] || ''
}

/**
 * 获取优先级文本
 */
const getPriorityText = (priority) => {
  const priorityMap = {
    high: '高',
    medium: '中',
    low: '低'
  }
  return priorityMap[priority] || '未知优先级'
}

/**
 * 获取进度颜色
 */
const getProgressColor = (percentage) => {
  if (percentage >= 80) return '#67c23a'
  if (percentage >= 60) return '#e6a23c'
  if (percentage >= 40) return '#f56c6c'
  return '#909399'
}

/**
 * 格式化日期
 */
const formatDate = (dateStr) => {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleDateString()
}

/**
 * 判断是否为截止日期警告
 */
const isDeadlineWarning = (endDate, status) => {
  if (!endDate || status === 'completed' || status === 'cancelled') return false
  const today = new Date()
  const deadline = new Date(endDate)
  const diffDays = Math.ceil((deadline - today) / (1000 * 60 * 60 * 24))
  return diffDays <= 3 && diffDays >= 0
}

// 组件挂载时获取数据
onMounted(() => {
  getPlanList()
  getWorkTypes()
  getAssignableUsers()
  getDepartments()
})
</script>

<style scoped>
.plan-management {
  padding: 20px;
  background-color: #f5f7fa;
  /* 参考用户管理页面的滚动条处理方式 */
  height: auto;
  overflow-x: hidden;
}

/* 页面头部样式 */
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding: 20px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.header-left .page-title {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0 0 8px 0;
  font-size: 24px;
  font-weight: 600;
  color: #303133;
}

.header-left .page-subtitle {
  margin: 0;
  color: #909399;
  font-size: 14px;
}

/* 搜索筛选样式 */
.search-filters {
  margin-bottom: 20px;
}

/* 计划列表样式 */
.plan-list {
  margin-bottom: 20px;
}

.table-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.table-title {
  font-size: 16px;
  font-weight: 600;
  color: #303133;
}

.table-actions {
  display: flex;
  gap: 8px;
}

/* 表格单元格样式 */
.plan-title-cell {
  cursor: pointer;
}

.plan-title {
  font-weight: 500;
  color: #409eff;
  margin-bottom: 4px;
}

.plan-title:hover {
  text-decoration: underline;
}

.plan-type {
  font-size: 12px;
  color: #909399;
}

.progress-cell {
  display: flex;
  align-items: center;
  gap: 8px;
}

.progress-text {
  font-size: 12px;
  color: #606266;
  min-width: 35px;
}

.deadline-warning {
  color: #f56c6c;
  font-weight: 500;
}

.text-muted {
  color: #c0c4cc;
  font-style: italic;
}

/* 分页样式 */
.pagination-container {
  display: flex;
  justify-content: center;
  margin-top: 20px;
}

/* 对话框样式 */
.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}
</style>