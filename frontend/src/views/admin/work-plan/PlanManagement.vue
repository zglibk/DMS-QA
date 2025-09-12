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
        <el-button 
          v-if="hasCreatePermission" 
          type="primary" 
          @click="showCreateDialog"
        >
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
              v-if="hasDeletePermission"
              type="danger"
              :disabled="selectedPlans.length === 0 || !canBatchDelete"
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
                <!-- <div class="plan-type">{{ getWorkTypeName(row.WorkTypeID) }}</div> -->
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
              <el-button 
                v-if="canEditPlan(row)" 
                type="warning" 
                size="small" 
                @click="editPlan(row)"
              >
                编辑
              </el-button>
              <el-button 
                v-if="canDeletePlan(row)" 
                type="danger" 
                size="small" 
                @click="deletePlan(row)"
              >
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
      class="plan-dialog"
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
            <el-form-item label="状态" prop="Status">
              <el-select v-model="planForm.Status" placeholder="选择状态" style="width: 100%">
                <el-option
                  v-for="option in statusOptions"
                  :key="option.value"
                  :label="option.label"
                  :value="option.value"
                />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="20">
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
              <el-cascader
                v-model="planForm.DepartmentID"
                :options="departments"
                :props="{ checkStrictly: true, emitPath: false }"
                :show-all-levels="false"
                placeholder="请选择执行部门"
                style="width: 100%"
                clearable
                filterable
              />
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
        
        <!-- 阶段信息展示已隐藏，只保留数据加载到阶段配置中 -->
        
        <!-- 阶段配置 -->
        <el-form-item label="阶段配置">
          <div class="milestone-section">
            <div class="milestone-header">
              <span class="milestone-title">工作阶段</span>
              <el-button type="primary" size="small" @click="addMilestone">
                <el-icon><Plus /></el-icon>
                添加阶段
              </el-button>
            </div>
            
            <div v-if="planForm.milestones.length === 0" class="empty-milestones">
              <el-empty description="暂无阶段配置" :image-size="80" />
            </div>
            
            <div v-else class="milestones-list">
              <div v-for="(milestone, index) in planForm.milestones" :key="index" class="milestone-item">
                <div class="milestone-header">
                  <span class="milestone-number">阶段 {{ index + 1 }}</span>
                  <el-button
                    type="danger"
                    size="small"
                    text
                    @click="removeMilestone(index)"
                  >
                    <el-icon><Delete /></el-icon>
                  </el-button>
                </div>
                <el-row :gutter="10">
                  <el-col :span="8">
                    <el-input
                      v-model="milestone.name"
                      placeholder="阶段名称"
                      size="small"
                    />
                  </el-col>
                  <el-col :span="10">
                    <el-input
                      v-model="milestone.description"
                      placeholder="阶段描述"
                      size="small"
                    />
                  </el-col>
                  <el-col :span="6">
                    <el-input-number
                      v-model="milestone.estimatedDays"
                      :min="1"
                      :max="100"
                      placeholder="预计天数"
                      size="small"
                      style="width: 100%"
                    />
                  </el-col>
                </el-row>
              </div>
            </div>
          </div>
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
import { ref, reactive, onMounted, computed, nextTick, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  Document,
  Plus,
  Search,
  Refresh,
  Delete,
  Download
} from '@element-plus/icons-vue'
import api, { workPlanApi } from '@/services/api'
import { useRouter, useRoute } from 'vue-router'
import { useUserStore } from '@/store/user'

const router = useRouter()
const route = useRoute()
const userStore = useUserStore()

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

// 表单数据
const planForm = reactive({
  ID: null,
  Title: '',
  Description: '',
  WorkTypeID: null,
  Priority: 'medium',
  Status: 'pending', // 添加状态字段
  AssigneeID: null,
  DepartmentID: null,
  ExecutorIDs: [],
  StartDate: '',
  EndDate: '',
  phases: [], // 添加阶段信息字段
  milestones: [] // 添加里程碑字段
})

// 权限检查
const hasAdminRole = computed(() => userStore.hasRole('admin') || userStore.hasRole('系统管理员'))
const hasCreatePermission = computed(() => userStore.hasActionPermission('work-plan:plan:create'))
const hasEditPermission = computed(() => userStore.hasActionPermission('work-plan:plan:edit'))
const hasDeletePermission = computed(() => userStore.hasActionPermission('work-plan:plan:delete'))
const currentUserId = computed(() => userStore.user?.ID)

/**
 * 检查是否可以编辑指定计划
 * @param {Object} plan - 计划对象
 * @returns {boolean} 是否可以编辑
 */
const canEditPlan = (plan) => {
  if (!hasEditPermission.value) return false
  if (hasAdminRole.value) return true
  return plan.CreatedBy === currentUserId.value || plan.AssigneeID === currentUserId.value
}

/**
 * 检查是否可以删除指定计划
 * @param {Object} plan - 计划对象
 * @returns {boolean} 是否可以删除
 */
const canDeletePlan = (plan) => {
  if (!hasDeletePermission.value) return false
  if (hasAdminRole.value) return true
  return plan.CreatedBy === currentUserId.value
}

/**
 * 检查是否可以批量删除选中的计划
 * @returns {boolean} 是否可以批量删除
 */
const canBatchDelete = computed(() => {
  if (selectedPlans.value.length === 0) return false
  if (hasAdminRole.value) return true
  return selectedPlans.value.every(plan => plan.CreatedBy === currentUserId.value)
})

// 状态选项
const statusOptions = [
  { label: '待开始', value: 'pending' },
  { label: '进行中', value: 'in_progress' },
  { label: '已完成', value: 'completed' },
  { label: '已暂停', value: 'paused' },
  { label: '已取消', value: 'cancelled' }
]

// 表单验证规则
const planFormRules = {
  Title: [{ required: true, message: '请输入计划标题', trigger: 'blur' }],
  WorkTypeID: [{ required: true, message: '请选择工作类型', trigger: 'change' }],
  Priority: [{ required: true, message: '请选择优先级', trigger: 'change' }],
  Status: [{ required: true, message: '请选择状态', trigger: 'change' }],
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
 * 显示新建计划对话框
 */
const showCreateDialog = () => {
  isEdit.value = false
  resetPlanForm()
  // 默认添加一个空的阶段配置
  planForm.milestones = [{
    name: '阶段1',
    description: '',
    estimatedDays: 1
  }]
  dialogVisible.value = true
}

/**
 * 编辑计划
 */
const editPlan = async (plan) => {
  try {
    isEdit.value = true
    
    // 获取完整的计划详情，包括里程碑数据
    const response = await workPlanApi.getPlanById(plan.ID)
    if (response.data.success) {
      const planDetail = response.data.data
      
      // 填充基本信息
      Object.assign(planForm, {
        ID: planDetail.ID,
        Title: planDetail.Title,
        Description: planDetail.Description,
        WorkTypeID: planDetail.WorkTypeID,
        Priority: planDetail.Priority,
        Status: planDetail.Status || 'pending', // 添加状态字段赋值
        AssigneeID: planDetail.AssignedTo,
        DepartmentID: planDetail.DepartmentID,
        ExecutorIDs: planDetail.executors ? planDetail.executors.map(executor => executor.ExecutorID) : [],
        StartDate: planDetail.StartDate ? new Date(planDetail.StartDate) : '',
        EndDate: planDetail.EndDate ? new Date(planDetail.EndDate) : ''
      })
      
      // 填充阶段配置数据（里程碑数据）
      if (planDetail.milestones && planDetail.milestones.length > 0) {
        planForm.milestones = planDetail.milestones.map(milestone => ({
          name: milestone.MilestoneName || '',
          description: milestone.Description || '',
          estimatedDays: milestone.TargetDate ? 
            Math.ceil((new Date(milestone.TargetDate) - new Date(planDetail.StartDate)) / (1000 * 60 * 60 * 24)) : 1
        }))
      } else {
        planForm.milestones = []
      }
      
      dialogVisible.value = true
    }
  } catch (error) {
    console.error('获取计划详情失败:', error)
    ElMessage.error('获取计划详情失败')
  }
}

/**
 * 保存计划
 */
const savePlan = async () => {
  try {
    await planFormRef.value.validate()
    saving.value = true
    
    // 准备计划数据
    const planData = {
      title: planForm.Title,
      description: planForm.Description,
      workTypeId: planForm.WorkTypeID,
      priority: planForm.Priority,
      status: planForm.Status, // 添加状态字段
      assigneeId: planForm.AssigneeID,
      departmentId: planForm.DepartmentID,
      executorIds: planForm.ExecutorIDs,
      startDate: planForm.StartDate ? new Date(planForm.StartDate).toISOString().split('T')[0] : '',
      endDate: planForm.EndDate ? new Date(planForm.EndDate).toISOString().split('T')[0] : ''
    }
    
    // 处理阶段配置数据
    const milestones = []
    
    // 如果有模板阶段信息，转换为里程碑格式
    if (planForm.phases && planForm.phases.length > 0) {
      const phaseMilestones = planForm.phases.map((phase, index) => {
        // 计算里程碑的目标日期（基于开始日期和阶段的预估天数）
        let targetDate = new Date(planForm.StartDate)
        if (index > 0) {
          // 累加前面阶段的天数
          const previousDays = planForm.phases.slice(0, index).reduce((sum, p) => sum + (p.estimatedDays || p.days || 1), 0)
          targetDate.setDate(targetDate.getDate() + previousDays)
        }
        
        return {
          title: phase.name,
          description: phase.description || '',
          targetDate: targetDate.toISOString().split('T')[0]
        }
      })
      milestones.push(...phaseMilestones)
    }
    
    // 添加用户手动配置的阶段
    if (planForm.milestones && planForm.milestones.length > 0) {
      const userMilestones = planForm.milestones
        .filter(milestone => milestone.name && milestone.estimatedDays)
        .map((milestone, index) => {
          // 计算里程碑的目标日期（基于开始日期和阶段的预估天数）
          let targetDate = new Date(planForm.StartDate)
          if (index > 0) {
            // 累加前面阶段的天数
            const previousDays = planForm.milestones.slice(0, index).reduce((sum, p) => sum + (p.estimatedDays || 1), 0)
            targetDate.setDate(targetDate.getDate() + previousDays)
          }
          
          return {
            title: milestone.name,
            description: milestone.description || '',
            targetDate: targetDate.toISOString().split('T')[0]
          }
        })
      milestones.push(...userMilestones)
    }
    
    // 如果有阶段配置数据，添加到计划数据中
    if (milestones.length > 0) {
      planData.milestones = milestones
    }
    
    let response
    if (isEdit.value) {
      response = await workPlanApi.updatePlan(planForm.ID, planData)
    } else {
      response = await workPlanApi.createPlan(planData)
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
    Status: 'pending', // 重置状态为待开始
    AssigneeID: '',
    DepartmentID: '',
    ExecutorIDs: [],
    StartDate: '',
    EndDate: '',
    phases: [], // 重置阶段信息
    milestones: [] // 重置阶段配置信息
  })
  planFormRef.value?.clearValidate()
}

/**
 * 添加阶段
 */
const addMilestone = () => {
  planForm.milestones.push({
    name: '',
    description: '',
    estimatedDays: 1
  })
}

/**
 * 删除阶段
 * @param {number} index - 要删除的阶段索引
 */
const removeMilestone = (index) => {
  planForm.milestones.splice(index, 1)
}

/**
 * 根据模板ID加载模板数据并填充表单
 */
const loadTemplateData = async (templateId) => {
  try {
    const response = await api.get(`/work-plan/templates/${templateId}`)
    const template = response.data.data
    
    // 解析模板数据中的阶段信息
    let phases = []
    let milestones = []
    
    // 优先使用直接的phases字段，如果没有则尝试从TemplateData中获取
    if (template.phases && template.phases.length > 0) {
      phases = template.phases
    } else if (template.TemplateData && template.TemplateData.phases) {
      phases = template.TemplateData.phases
    } else if (template.templateData && template.templateData.phases) {
      phases = template.templateData.phases
    }
    
    // 将phases数据转换为milestones格式，供阶段配置表单使用
    if (phases.length > 0) {
      milestones = phases.map(phase => ({
        name: phase.name || '',
        description: phase.description || '',
        estimatedDays: phase.estimatedDays || phase.days || 1
      }))
    }
    
    // 根据模板的分类（category）找到对应的工作类型ID
    let workTypeID = template.WorkTypeID || template.workTypeID || ''
    if (!workTypeID && (template.Category || template.category)) {
      // 如果没有WorkTypeID但有Category，则根据Category名称查找对应的工作类型ID
      const categoryName = template.Category || template.category
      const matchedWorkType = workTypes.value.find(type => type.TypeName === categoryName)
      if (matchedWorkType) {
        workTypeID = matchedWorkType.ID
      }
    }
    
    // 填充表单数据，支持多种字段名格式
    Object.assign(planForm, {
      ID: null, // 新建计划，ID为null
      Title: template.TemplateName || template.templateName || template.name || '',
      Description: template.Description || template.description || '',
      WorkTypeID: workTypeID,
      Priority: template.Priority || template.priority || 'medium',
      AssigneeID: '', // 需要用户选择
      DepartmentID: template.DepartmentID || template.departmentID || template.departmentId || '',
      ExecutorIDs: [], // 需要用户选择
      StartDate: '', // 需要用户选择
      EndDate: '', // 需要用户选择
      phases: phases, // 加载模板的阶段信息（已隐藏展示）
      milestones: milestones // 加载模板的阶段信息（用于编辑）
    })
    
    // 显示新建对话框
    isEdit.value = false
    dialogVisible.value = true
    
    ElMessage.success('模板数据已加载，请完善计划信息')
  } catch (error) {
    console.error('加载模板数据失败:', error)
    ElMessage.error('加载模板数据失败')
  }
}

/**
 * 处理选择变化
 */
const handleSelectionChange = (selection) => {
  selectedPlans.value = selection
}

// 注意：handleSizeChange 和 handleCurrentChange 已被 watch 监听器替代
// 使用 v-model 双向绑定时，不需要手动处理这些事件

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

// 监听分页变化
watch([() => pagination.page, () => pagination.pageSize], ([newPage, newPageSize], [oldPage, oldPageSize]) => {
  // 如果页面大小改变，重置到第一页
  if (newPageSize !== oldPageSize) {
    pagination.page = 1
  }
  getPlanList()
})

// 组件挂载时获取数据
onMounted(async () => {
  // 先获取基础数据
  await Promise.all([
    getPlanList(),
    getWorkTypes(),
    getAssignableUsers(),
    getDepartments()
  ])
  
  // 检查是否有模板ID参数
  const templateId = route.query.templateId
  if (templateId) {
    // 如果有模板ID，加载模板数据
    await loadTemplateData(templateId)
    
    // 清除URL中的templateId参数，避免刷新时重复加载
    router.replace({ path: '/admin/work-plan/plans' })
  }
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

/* 阶段信息展示样式 */
.phases-display {
  border: 1px solid #e4e7ed;
  border-radius: 4px;
  padding: 12px;
  background-color: #fafafa;
}

.phase-item {
  margin-bottom: 12px;
  padding: 8px;
  background-color: white;
  border-radius: 4px;
  border-left: 3px solid #409eff;
}

.phase-item:last-child {
  margin-bottom: 0;
}

.phase-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
}

.phase-name {
  font-weight: 600;
  color: #303133;
}

.phase-description {
  color: #606266;
  font-size: 13px;
  line-height: 1.4;
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

/* 阶段配置样式 */
.milestone-section {
  width: 100%;
  border: 1px solid #e4e7ed;
  border-radius: 6px;
  padding: 16px;
  background-color: #fafafa;
}

.milestone-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.milestone-title {
  font-weight: 600;
  color: #303133;
  font-size: 14px;
}

.empty-milestones {
  text-align: center;
  padding: 20px;
}

.milestones-list {
  max-height: 300px;
  overflow-y: auto;
}

.milestone-item {
  margin-bottom: 16px;
  padding: 12px;
  background-color: white;
  border-radius: 4px;
  border-left: 3px solid #409eff;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.milestone-item:last-child {
  margin-bottom: 0;
}

.milestone-item .milestone-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.milestone-number {
  font-weight: 600;
  color: #303133;
  font-size: 14px;
}

/* 对话框内容区域滚动条样式 */
.milestones-list::-webkit-scrollbar {
  width: 6px;
}

.milestones-list::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 3px;
}

.milestones-list::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 3px;
}

.milestones-list::-webkit-scrollbar-thumb:hover {
  background: #a8a8a8;
}

/* 新建计划对话框固定高度样式 */
.el-dialog.plan-dialog {
  height: 600px !important;
  max-height: 600px !important;
  display: flex !important;
  flex-direction: column !important;
  margin: auto !important;
  top: 50% !important;
  transform: translateY(-50%) !important;
}

.el-dialog.plan-dialog .el-dialog__header {
  flex-shrink: 0 !important;
}

.el-dialog.plan-dialog .el-dialog__body {
  flex: 1 !important;
  overflow-y: auto !important;
  padding: 20px !important;
  max-height: calc(600px - 120px) !important;
}

.el-dialog.plan-dialog .el-dialog__footer {
  flex-shrink: 0 !important;
  padding: 10px 20px !important;
  border-top: 1px solid #ebeef5 !important;
}

/* 附件内容区域垂直滚动条样式 */
.el-dialog.plan-dialog .el-dialog__body::-webkit-scrollbar {
  width: 8px;
}

.el-dialog.plan-dialog .el-dialog__body::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 4px;
}

.el-dialog.plan-dialog .el-dialog__body::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 4px;
}

.el-dialog.plan-dialog .el-dialog__body::-webkit-scrollbar-thumb:hover {
  background: #a8a8a8;
}
</style>