<template>
  <div class="plan-detail">
    <!-- 页面头部 -->
    <div class="page-header">
      <div class="header-left">
        <el-button 
          type="text" 
          @click="goBack"
          class="back-button"
        >
          <el-icon><ArrowLeft /></el-icon>
          返回
        </el-button>
        <h2 class="page-title">
          <el-icon><Document /></el-icon>
          计划详情
        </h2>
      </div>
      <div class="header-right">
        <!-- 移除顶部标题栏中的编辑计划按钮 -->
      </div>
    </div>

    <!-- 计划详情管理 -->
    <el-card class="plan-detail-card" v-loading="loading">
      <template #header>
        <div class="card-header">
          <span>计划详情管理</span>
          <el-tag :type="getStatusType(planDetail.Status)">{{ getStatusText(planDetail.Status) }}</el-tag>
        </div>
      </template>
      
      <!-- 标签页切换 -->
      <el-tabs v-model="activeTab" class="plan-detail-tabs">
        <!-- 基本信息标签页 -->
        <el-tab-pane label="基本信息" name="basic">
          <template #label>
            <span class="tab-label">
              <el-icon><Document /></el-icon>
              基本信息
            </span>
          </template>
          
          <div class="tab-content">
            <div class="tab-header">
              <el-button 
                v-if="canEditPlan" 
                type="primary" 
                size="small"
                @click="editPlan"
              >
                <el-icon><Edit /></el-icon>
                编辑计划
              </el-button>
            </div>
            
            <el-descriptions :column="2" border>
              <el-descriptions-item label="计划标题">{{ planDetail.Title }}</el-descriptions-item>
              <el-descriptions-item label="工作类型">{{ planDetail.WorkTypeName }}</el-descriptions-item>
              <el-descriptions-item label="优先级">
                <el-tag :type="getPriorityType(planDetail.Priority)">{{ getPriorityText(planDetail.Priority) }}</el-tag>
              </el-descriptions-item>
              <el-descriptions-item label="负责人">{{ planDetail.AssigneeName }}</el-descriptions-item>
              <el-descriptions-item label="所属部门">{{ planDetail.DepartmentName }}</el-descriptions-item>
              <el-descriptions-item label="进度">{{ planDetail.Progress }}%</el-descriptions-item>
              <el-descriptions-item label="开始日期">{{ formatDate(planDetail.StartDate) }}</el-descriptions-item>
              <el-descriptions-item label="结束日期">{{ formatDate(planDetail.EndDate) }}</el-descriptions-item>
              <el-descriptions-item label="创建时间">{{ formatDateTime(planDetail.CreatedAt) }}</el-descriptions-item>
              <el-descriptions-item label="更新时间">{{ formatDateTime(planDetail.UpdatedAt) }}</el-descriptions-item>
              <el-descriptions-item label="描述" :span="2">
                <div class="description-content">{{ planDetail.Description || '暂无描述' }}</div>
              </el-descriptions-item>
            </el-descriptions>
          </div>
        </el-tab-pane>
        
        <!-- 里程碑标签页 -->
        <el-tab-pane label="里程碑" name="milestones">
          <template #label>
            <span class="tab-label">
              <el-icon><Flag /></el-icon>
              里程碑 ({{ milestones.length }})
            </span>
          </template>
          
          <div class="tab-content">
            <div class="tab-header">
              <el-button 
                v-if="canAddMilestone" 
                type="primary" 
                size="small"
                @click="showAddMilestoneDialog"
              >
                <el-icon><Plus /></el-icon>
                添加里程碑
              </el-button>
            </div>
            
            <div v-if="milestones.length === 0" class="empty-milestones">
              <el-empty description="暂无里程碑" />
            </div>
            <div v-else class="milestone-timeline">
              <div
                v-for="(milestone, index) in milestones"
                :key="milestone.ID"
                class="milestone-item"
                :class="{ completed: milestone.IsCompleted }"
              >
                <div class="milestone-marker">
                  <div class="marker-dot" :class="{ completed: milestone.IsCompleted }">
                    <el-icon v-if="milestone.IsCompleted"><Check /></el-icon>
                  </div>
                  <div v-if="index < milestones.length - 1" class="marker-line"></div>
                </div>
                <div class="milestone-content">
                  <div class="milestone-title">{{ milestone.Title }}</div>
                  <div class="milestone-date">{{ formatDate(milestone.TargetDate) }}</div>
                  <div v-if="milestone.Description" class="milestone-desc">{{ milestone.Description }}</div>
                  <div class="milestone-actions">
                    <el-button
                      v-if="!milestone.IsCompleted"
                      type="success"
                      size="small"
                      :disabled="!canEditProgress"
                      @click="completeMilestone(milestone)"
                    >
                      完成
                    </el-button>
                    <el-button 
                      type="warning" 
                      size="small" 
                      :disabled="!canEditMilestone"
                      @click="editMilestone(milestone)"
                    >
                      编辑
                    </el-button>
                    <el-button 
                      type="danger" 
                      size="small" 
                      :disabled="!canDeleteMilestone"
                      @click="deleteMilestone(milestone)"
                    >
                      删除
                    </el-button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </el-tab-pane>
        
        <!-- 进度历史标签页 -->
        <el-tab-pane label="进度历史" name="progress">
          <template #label>
            <span class="tab-label">
              <el-icon><TrendCharts /></el-icon>
              进度历史
            </span>
          </template>
          
          <div class="tab-content">
            <div class="tab-header">
              <el-button 
                v-if="canEditProgress" 
                type="primary" 
                size="small"
                @click="showUpdateProgressDialog"
              >
                <el-icon><Edit /></el-icon>
                更新进度
              </el-button>
            </div>
            
            <div v-if="progressHistory.length === 0" class="empty-history">
              <el-empty description="暂无进度记录" />
            </div>
            <el-timeline v-else>
              <el-timeline-item
                v-for="history in progressHistory"
                :key="history.ID"
                :timestamp="formatDateTime(history.UpdatedAt)"
                placement="top"
              >
                <div class="history-item">
                  <div class="history-progress">
                    进度更新至 <strong>{{ history.Progress }}%</strong>
                  </div>
                  <div v-if="history.Description" class="history-description">
                    {{ history.Description }}
                  </div>
                  <div class="history-operator">
                    操作人：{{ history.OperatorName }}
                  </div>
                </div>
              </el-timeline-item>
            </el-timeline>
          </div>
        </el-tab-pane>
      </el-tabs>
    </el-card>

    <!-- 添加/编辑里程碑对话框 -->
    <el-dialog
      v-model="milestoneFormDialogVisible"
      :title="milestoneFormMode === 'add' ? '添加里程碑' : '编辑里程碑'"
      width="500px"
      :close-on-click-modal="false"
    >
      <el-form
        ref="milestoneFormRef"
        :model="milestoneForm"
        :rules="milestoneFormRules"
        label-width="100px"
      >
        <el-form-item label="里程碑标题" prop="title">
          <el-input
            v-model="milestoneForm.title"
            placeholder="请输入里程碑标题"
            maxlength="100"
            show-word-limit
          />
        </el-form-item>
        <el-form-item label="目标日期" prop="targetDate">
          <el-date-picker
            v-model="milestoneForm.targetDate"
            type="date"
            placeholder="选择目标日期"
            style="width: 100%"
            format="YYYY-MM-DD"
            value-format="YYYY-MM-DD"
          />
        </el-form-item>
        <el-form-item label="描述" prop="description">
          <el-input
            v-model="milestoneForm.description"
            type="textarea"
            :rows="3"
            placeholder="请输入里程碑描述"
            maxlength="500"
            show-word-limit
          />
        </el-form-item>
      </el-form>
      
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="milestoneFormDialogVisible = false">取消</el-button>
          <el-button 
            type="primary" 
            @click="saveMilestone" 
            :loading="milestoneFormSaving"
          >
            {{ milestoneFormMode === 'add' ? '添加' : '保存' }}
          </el-button>
        </span>
      </template>
    </el-dialog>

    <!-- 更新进度对话框 -->
    <el-dialog
      v-model="progressDialogVisible"
      title="更新进度"
      width="500px"
      :close-on-click-modal="false"
    >
      <el-form
        ref="progressFormRef"
        :model="progressForm"
        :rules="progressFormRules"
        label-width="100px"
      >
        <el-form-item label="当前进度" prop="progress">
          <el-slider
            v-model="progressForm.progress"
            :min="0"
            :max="100"
            show-input
            :format-tooltip="(val) => `${val}%`"
          />
        </el-form-item>
        <el-form-item label="进度说明" prop="description">
          <el-input
            v-model="progressForm.description"
            type="textarea"
            :rows="3"
            placeholder="请输入进度更新说明"
            maxlength="500"
            show-word-limit
          />
        </el-form-item>
      </el-form>
      
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="progressDialogVisible = false">取消</el-button>
          <el-button 
            type="primary" 
            @click="saveProgress" 
            :loading="saving"
          >
            保存
          </el-button>
        </span>
      </template>
    </el-dialog>

    <!-- 编辑计划对话框 -->
    <el-dialog
      v-model="editPlanDialogVisible"
      title="编辑计划"
      width="800px"
      :close-on-click-modal="false"
    >
      <el-form
        ref="editPlanFormRef"
        :model="editPlanForm"
        :rules="editPlanFormRules"
        label-width="120px"
      >
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="计划标题" prop="title">
              <el-input
                v-model="editPlanForm.title"
                placeholder="请输入计划标题"
                maxlength="100"
                show-word-limit
              />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="工作类型" prop="workTypeId">
              <el-select
                v-model="editPlanForm.workTypeId"
                placeholder="请选择工作类型"
                style="width: 100%"
              >
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
            <el-form-item label="优先级" prop="priority">
              <el-select
                v-model="editPlanForm.priority"
                placeholder="请选择优先级"
                style="width: 100%"
              >
                <el-option label="低" value="low" />
                <el-option label="中" value="medium" />
                <el-option label="高" value="high" />
                <el-option label="紧急" value="urgent" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="负责人" prop="assigneeId">
              <el-select
                v-model="editPlanForm.assigneeId"
                placeholder="请选择负责人"
                style="width: 100%"
                filterable
              >
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
            <el-form-item label="所属部门" prop="departmentId">
              <el-select
                v-model="editPlanForm.departmentId"
                placeholder="请选择部门"
                style="width: 100%"
              >
                <el-option
                  v-for="dept in departments"
                  :key="dept.value || dept.ID"
                  :label="dept.label || dept.DepartmentName || dept.Name"
                  :value="dept.value || dept.ID"
                />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="执行人" prop="executorIds">
              <el-select
                v-model="editPlanForm.executorIds"
                placeholder="请选择执行人"
                style="width: 100%"
                multiple
                filterable
              >
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
            <el-form-item label="开始日期" prop="startDate">
              <el-date-picker
                v-model="editPlanForm.startDate"
                type="date"
                placeholder="选择开始日期"
                style="width: 100%"
                format="YYYY-MM-DD"
                value-format="YYYY-MM-DD"
              />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="结束日期" prop="endDate">
              <el-date-picker
                v-model="editPlanForm.endDate"
                type="date"
                placeholder="选择结束日期"
                style="width: 100%"
                format="YYYY-MM-DD"
                value-format="YYYY-MM-DD"
              />
            </el-form-item>
          </el-col>
        </el-row>
        
        <el-form-item label="计划描述" prop="description">
          <el-input
            v-model="editPlanForm.description"
            type="textarea"
            :rows="4"
            placeholder="请输入计划描述"
            maxlength="1000"
            show-word-limit
          />
        </el-form-item>
      </el-form>
      
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="editPlanDialogVisible = false">取消</el-button>
          <el-button 
            type="primary" 
            @click="saveEditPlan" 
            :loading="editPlanSaving"
          >
            保存
          </el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { 
  ArrowLeft, 
  Document, 
  Edit, 
  Plus, 
  Check,
  Flag,
  TrendCharts
} from '@element-plus/icons-vue'
import api from '@/utils/api'
import { useUserStore } from '@/store/user'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()

// 响应式数据
const loading = ref(false)
const planDetail = ref({})
const milestones = ref([])
const progressHistory = ref([])
const activeTab = ref('basic') // 默认显示基本信息标签页

// 对话框状态
const milestoneFormDialogVisible = ref(false)
const progressDialogVisible = ref(false)
const editPlanDialogVisible = ref(false)
const saving = ref(false)
const editPlanSaving = ref(false)

// 里程碑表单相关
const milestoneFormMode = ref('add')
const milestoneFormSaving = ref(false)
const milestoneFormRef = ref()
const currentMilestone = ref(null)

const milestoneForm = reactive({
  title: '',
  description: '',
  targetDate: ''
})

const milestoneFormRules = {
  title: [{ required: true, message: '请输入里程碑标题', trigger: 'blur' }],
  targetDate: [{ required: true, message: '请选择目标日期', trigger: 'change' }]
}

// 进度表单相关
const progressFormRef = ref()
const progressForm = reactive({
  progress: 0,
  description: ''
})

const progressFormRules = {
  progress: [{ required: true, message: '请设置进度', trigger: 'change' }]
}

// 编辑计划表单相关
const editPlanFormRef = ref()
const editPlanForm = reactive({
  title: '',
  description: '',
  workTypeId: '',
  priority: '',
  assigneeId: '',
  departmentId: '',
  executorIds: [],
  startDate: '',
  endDate: ''
})

const editPlanFormRules = {
  title: [{ required: true, message: '请输入计划标题', trigger: 'blur' }],
  workTypeId: [{ required: true, message: '请选择工作类型', trigger: 'change' }],
  priority: [{ required: true, message: '请选择优先级', trigger: 'change' }],
  assigneeId: [{ required: true, message: '请选择负责人', trigger: 'change' }],
  departmentId: [{ required: true, message: '请选择部门', trigger: 'change' }],
  executorIds: [{ required: true, message: '请选择执行人', trigger: 'change' }],
  startDate: [{ required: true, message: '请选择开始日期', trigger: 'change' }],
  endDate: [{ required: true, message: '请选择结束日期', trigger: 'change' }]
}

// 基础数据
const workTypes = ref([])
const departments = ref([])
const assignableUsers = ref([])

// 权限检查 - 基于角色权限管理系统
const canEditPlan = computed(() => {
  // 检查用户是否有系统管理员角色
  const hasAdminRole = userStore.hasRole('admin') || userStore.hasRole('系统管理员')
  
  // 检查用户是否有计划编辑的操作权限
  const hasPlanEditPermission = userStore.hasActionPermission('work-plan:plan:edit')
  
  return hasAdminRole || hasPlanEditPermission
})

const canEditProgress = computed(() => {
  // 检查用户是否有系统管理员角色
  const hasAdminRole = userStore.hasRole('admin') || userStore.hasRole('系统管理员')
  
  // 检查用户是否有进度编辑的操作权限
  const hasProgressEditPermission = userStore.hasActionPermission('work-plan:progress:edit')
  
  return hasAdminRole || hasProgressEditPermission
})

const canAddMilestone = computed(() => {
  // 检查用户是否有系统管理员角色
  const hasAdminRole = userStore.hasRole('admin') || userStore.hasRole('系统管理员')
  
  // 检查用户是否有里程碑添加的操作权限
  const hasMilestoneAddPermission = userStore.hasActionPermission('work-plan:milestone:add')
  
  return hasAdminRole || hasMilestoneAddPermission
})

const canDeleteMilestone = computed(() => {
  // 检查用户是否有系统管理员角色
  const hasAdminRole = userStore.hasRole('admin') || userStore.hasRole('系统管理员')
  
  // 检查用户是否有里程碑删除的操作权限
  const hasMilestoneDeletePermission = userStore.hasActionPermission('work-plan:milestone:delete')
  
  return hasAdminRole || hasMilestoneDeletePermission
})

const canEditMilestone = computed(() => {
  // 检查用户是否有系统管理员角色
  const hasAdminRole = userStore.hasRole('admin') || userStore.hasRole('系统管理员')
  
  // 检查用户是否有里程碑编辑的操作权限
  const hasMilestoneEditPermission = userStore.hasActionPermission('work-plan:milestone:edit')
  
  return hasAdminRole || hasMilestoneEditPermission
})

/**
 * 获取计划详情
 */
const getPlanDetail = async () => {
  try {
    loading.value = true
    const planId = route.params.id
    
    const response = await api.get(`/work-plan/plans/${planId}`)
    if (response.data.success) {
      planDetail.value = response.data.data
    }
  } catch (error) {
    console.error('获取计划详情失败:', error)
    ElMessage.error('获取计划详情失败')
  } finally {
    loading.value = false
  }
}

/**
 * 获取里程碑列表
 */
const getMilestones = async () => {
  try {
    const planId = route.params.id
    const response = await api.get(`/work-plan/plans/${planId}/milestones`)
    if (response.data.success) {
      milestones.value = response.data.data
    }
  } catch (error) {
    console.error('获取里程碑失败:', error)
    ElMessage.error('获取里程碑失败')
  }
}

/**
 * 获取进度历史
 */
const getProgressHistory = async () => {
  try {
    const planId = route.params.id
    const response = await api.get(`/work-plan/plans/${planId}/progress-history`)
    if (response.data.success) {
      progressHistory.value = response.data.data
    }
  } catch (error) {
    console.error('获取进度历史失败:', error)
    ElMessage.error('获取进度历史失败')
  }
}

/**
 * 返回上一页
 */
const goBack = () => {
  router.go(-1)
}

/**
 * 编辑计划 - 显示编辑对话框
 */
const editPlan = async () => {
  try {
    // 加载基础数据
    await loadBasicData()
    
    // 填充表单数据
    Object.assign(editPlanForm, {
      title: planDetail.value.Title || '',
      description: planDetail.value.Description || '',
      workTypeId: planDetail.value.WorkTypeID || '',
      priority: planDetail.value.Priority || '',
      assigneeId: planDetail.value.AssignedTo || '',
      departmentId: planDetail.value.DepartmentID || '',
      executorIds: planDetail.value.executors ? planDetail.value.executors.map(executor => executor.ExecutorID) : [],
      startDate: planDetail.value.StartDate ? planDetail.value.StartDate.split('T')[0] : '',
      endDate: planDetail.value.EndDate ? planDetail.value.EndDate.split('T')[0] : ''
    })
    
    editPlanDialogVisible.value = true
  } catch (error) {
    console.error('加载编辑数据失败:', error)
    ElMessage.error('加载编辑数据失败')
  }
}

/**
 * 将树形结构的部门数据扁平化为适合下拉选择的格式
 * @param {Array} tree - 树形结构的部门数据
 * @param {string} prefix - 层级前缀
 * @returns {Array} 扁平化的部门数据
 */
const flattenDepartmentTree = (tree, prefix = '') => {
  const result = []
  
  for (const node of tree) {
    // 添加当前节点
    result.push({
      value: node.value || node.ID,
      label: prefix + (node.label || node.DepartmentName || node.Name),
      ID: node.value || node.ID,
      Name: node.label || node.DepartmentName || node.Name,
      DepartmentName: node.label || node.DepartmentName || node.Name
    })
    
    // 递归处理子节点
    if (node.children && node.children.length > 0) {
      const childNodes = flattenDepartmentTree(node.children, prefix + (node.label || node.DepartmentName || node.Name) + ' / ')
      result.push(...childNodes)
    }
  }
  
  return result
}

/**
 * 加载基础数据（工作类型、部门、用户等）
 */
const loadBasicData = async () => {
  try {
    console.log('开始加载基础数据...')
    
    // 检查token是否存在
    const token = localStorage.getItem('token')
    console.log('Token存在:', !!token)
    
    // 分别加载基础数据，便于调试
    console.log('正在加载可分配用户...')
    const assignableUsersRes = await api.get('/work-plan/assignable-users')
    console.log('可分配用户响应:', assignableUsersRes.data)
    
    console.log('正在加载部门列表...')
    const departmentsRes = await api.get('/departments')
    console.log('部门列表响应:', departmentsRes.data)
    
    // 处理可分配用户数据
    if (assignableUsersRes.data.success) {
      assignableUsers.value = assignableUsersRes.data.data || []
      console.log('可分配用户数据:', assignableUsers.value)
    } else {
      console.error('获取可分配用户失败:', assignableUsersRes.data.message)
    }
    
    // 处理部门数据
     if (departmentsRes.data.success) {
       const departmentTree = departmentsRes.data.data || []
       // 将树形结构扁平化为适合下拉选择的格式
       departments.value = flattenDepartmentTree(departmentTree)
       console.log('部门数据:', departments.value)
     } else {
       console.error('获取部门列表失败:', departmentsRes.data.message)
     }
    
    // 尝试获取工作类型
    try {
      console.log('正在加载工作类型...')
      const workTypeResponse = await api.get('/work-plan/work-types')
      console.log('工作类型响应:', workTypeResponse.data)
      if (workTypeResponse.data.success) {
        workTypes.value = workTypeResponse.data.data || []
        console.log('工作类型数据:', workTypes.value)
      } else {
        console.error('获取工作类型失败:', workTypeResponse.data.message)
        workTypes.value = []
      }
    } catch (workTypeError) {
      console.error('获取工作类型异常:', workTypeError)
      // 如果工作类型获取失败，使用默认值
      workTypes.value = [
        { ID: 1, Name: '日常工作' },
        { ID: 2, Name: '项目任务' },
        { ID: 3, Name: '临时任务' }
      ]
    }
    
    console.log('基础数据加载完成')
  } catch (error) {
    console.error('加载基础数据失败:', error)
    console.error('错误详情:', error.response?.data || error.message)
    throw error
  }
}

/**
 * 保存编辑的计划
 */
const saveEditPlan = async () => {
  try {
    const valid = await editPlanFormRef.value.validate()
    if (!valid) {
      return
    }
    
    editPlanSaving.value = true
    
    // 准备更新数据
    const updateData = {
      title: editPlanForm.title,
      description: editPlanForm.description,
      workTypeId: editPlanForm.workTypeId,
      priority: editPlanForm.priority,
      assigneeId: editPlanForm.assigneeId,
      departmentId: editPlanForm.departmentId,
      executorIds: editPlanForm.executorIds,
      startDate: editPlanForm.startDate,
      endDate: editPlanForm.endDate
    }
    
    const response = await api.put(`/work-plan/plans/${planDetail.value.ID}`, updateData)
    
    if (response.data.success) {
      ElMessage.success('计划更新成功')
      editPlanDialogVisible.value = false
      // 重新加载计划详情
      await getPlanDetail()
    }
  } catch (error) {
    console.error('保存计划失败:', error)
    ElMessage.error('保存计划失败')
  } finally {
    editPlanSaving.value = false
  }
}

/**
 * 显示添加里程碑对话框
 */
const showAddMilestoneDialog = () => {
  if (!canAddMilestone.value) {
    ElMessage.warning('您没有添加里程碑的权限')
    return
  }
  
  milestoneFormMode.value = 'add'
  currentMilestone.value = null
  resetMilestoneForm()
  milestoneFormDialogVisible.value = true
}

/**
 * 编辑里程碑
 */
const editMilestone = async (milestone) => {
  if (!canEditMilestone.value) {
    ElMessage.warning('您没有编辑里程碑的权限')
    return
  }
  
  milestoneFormMode.value = 'edit'
  currentMilestone.value = milestone
  
  // 填充表单数据
  milestoneForm.title = milestone.Title
  milestoneForm.description = milestone.Description || ''
  milestoneForm.targetDate = milestone.TargetDate ? milestone.TargetDate.split('T')[0] : ''
  
  milestoneFormDialogVisible.value = true
}

/**
 * 重置里程碑表单
 */
const resetMilestoneForm = () => {
  Object.assign(milestoneForm, {
    title: '',
    description: '',
    targetDate: ''
  })
  
  if (milestoneFormRef.value) {
    milestoneFormRef.value.resetFields()
  }
}

/**
 * 保存里程碑
 */
const saveMilestone = async () => {
  try {
    const valid = await milestoneFormRef.value.validate()
    if (!valid) {
      return
    }
    
    milestoneFormSaving.value = true
    
    if (milestoneFormMode.value === 'add') {
      // 添加里程碑
      const response = await api.post(`/work-plan/plans/${planDetail.value.ID}/milestones`, {
        title: milestoneForm.title,
        description: milestoneForm.description,
        targetDate: milestoneForm.targetDate
      })
      
      if (response.data.success) {
        ElMessage.success('里程碑添加成功')
        milestoneFormDialogVisible.value = false
        getMilestones()
      }
    } else {
      // 编辑里程碑
      const response = await api.put(`/work-plan/milestones/${currentMilestone.value.ID}`, {
        title: milestoneForm.title,
        description: milestoneForm.description,
        targetDate: milestoneForm.targetDate
      })
      
      if (response.data.success) {
        ElMessage.success('里程碑更新成功')
        milestoneFormDialogVisible.value = false
        getMilestones()
      }
    }
    
  } catch (error) {
    console.error('保存里程碑失败:', error)
    ElMessage.error('保存里程碑失败')
  } finally {
    milestoneFormSaving.value = false
  }
}

/**
 * 完成里程碑
 */
const completeMilestone = async (milestone) => {
  if (!canEditProgress.value) {
    ElMessage.warning('您没有完成里程碑的权限')
    return
  }
  
  try {
    await ElMessageBox.confirm(
      `确定要标记里程碑"${milestone.Title}"为已完成吗？`,
      '确认完成',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'success'
      }
    )
    
    const response = await api.patch(`/work-plan/milestones/${milestone.ID}/status`, {
      isCompleted: true
    })
    if (response.data.success) {
      ElMessage.success('里程碑已完成')
      getMilestones()
    }
  } catch (error) {
    if (error !== 'cancel') {
      console.error('完成里程碑失败:', error)
      ElMessage.error('完成里程碑失败')
    }
  }
}

/**
 * 删除里程碑
 */
const deleteMilestone = async (milestone) => {
  if (!canDeleteMilestone.value) {
    ElMessage.warning('您没有删除里程碑的权限')
    return
  }
  
  try {
    await ElMessageBox.confirm(
      `确定要删除里程碑"${milestone.Title}"吗？`,
      '确认删除',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    
    const response = await api.delete(`/work-plan/milestones/${milestone.ID}`)
    if (response.data.success) {
      ElMessage.success('里程碑删除成功')
      getMilestones()
    }
  } catch (error) {
    if (error !== 'cancel') {
      console.error('删除里程碑失败:', error)
      ElMessage.error('删除里程碑失败')
    }
  }
}

/**
 * 显示更新进度对话框
 */
const showUpdateProgressDialog = () => {
  if (!canEditProgress.value) {
    ElMessage.warning('您没有更新进度的权限')
    return
  }
  
  progressForm.progress = planDetail.value.Progress || 0
  progressForm.description = ''
  progressDialogVisible.value = true
}

/**
 * 保存进度
 */
const saveProgress = async () => {
  try {
    const valid = await progressFormRef.value.validate()
    if (!valid) {
      return
    }
    
    saving.value = true
    
    const response = await api.patch(`/work-plan/plans/${planDetail.value.ID}/progress`, {
      progress: progressForm.progress,
      description: progressForm.description
    })
    
    if (response.data.success) {
      ElMessage.success('进度更新成功')
      progressDialogVisible.value = false
      getPlanDetail()
      getProgressHistory()
    }
  } catch (error) {
    console.error('更新进度失败:', error)
    ElMessage.error('更新进度失败')
  } finally {
    saving.value = false
  }
}

/**
 * 获取状态类型
 */
const getStatusType = (status) => {
  const typeMap = {
    pending: 'info',
    in_progress: 'warning',
    completed: 'success',
    paused: 'warning',
    cancelled: 'danger'
  }
  return typeMap[status] || 'info'
}

/**
 * 获取状态文本
 */
const getStatusText = (status) => {
  const textMap = {
    pending: '待开始',
    in_progress: '进行中',
    completed: '已完成',
    paused: '已暂停',
    cancelled: '已取消'
  }
  return textMap[status] || '未知'
}

/**
 * 获取优先级类型
 */
const getPriorityType = (priority) => {
  const typeMap = {
    low: '',
    medium: 'warning',
    high: 'danger',
    urgent: 'danger'
  }
  return typeMap[priority] || ''
}

/**
 * 获取优先级文本
 */
const getPriorityText = (priority) => {
  const textMap = {
    low: '低',
    medium: '中',
    high: '高',
    urgent: '紧急'
  }
  return textMap[priority] || '未知'
}

/**
 * 格式化日期
 */
const formatDate = (date) => {
  if (!date) return '-'
  return new Date(date).toLocaleDateString('zh-CN')
}

/**
 * 格式化日期时间
 */
const formatDateTime = (date) => {
  if (!date) return '-'
  return new Date(date).toLocaleString('zh-CN')
}

// 页面初始化
onMounted(() => {
  getPlanDetail()
  getMilestones()
  getProgressHistory()
})
</script>

<style scoped>
/* 页面头部样式 */
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding: 20px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 8px;
  color: white;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.back-button {
  color: white !important;
  padding: 8px;
}

.back-button:hover {
  background-color: rgba(255, 255, 255, 0.1);
}

.page-title {
  margin: 0;
  font-size: 24px;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 8px;
}

.header-right {
  display: flex;
  gap: 12px;
}

/* 卡片样式 */
.plan-detail-card {
  margin-bottom: 20px;
}

/* 标签页样式 */
.plan-detail-tabs {
  margin-top: 16px;
}

.tab-label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-weight: 500;
}

.tab-content {
  padding: 20px 0;
}

.tab-header {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 20px;
  padding-bottom: 12px;
  border-bottom: 1px solid #ebeef5;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

/* 描述内容样式 */
.description-content {
  line-height: 1.6;
  color: #606266;
}

/* 里程碑时间线样式 */
.empty-milestones,
.empty-history {
  text-align: center;
  padding: 40px 0;
}

.milestone-timeline {
  position: relative;
  padding: 20px 0;
}

.milestone-item {
  display: flex;
  margin-bottom: 30px;
  position: relative;
}

.milestone-item:last-child {
  margin-bottom: 0;
}

.milestone-marker {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-right: 20px;
  position: relative;
}

.marker-dot {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background-color: #e4e7ed;
  border: 2px solid #e4e7ed;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2;
  position: relative;
}

.marker-dot.completed {
  background-color: #67c23a;
  border-color: #67c23a;
  color: white;
}

.marker-line {
  width: 2px;
  height: 60px;
  background-color: #e4e7ed;
  margin-top: 4px;
}

.milestone-content {
  flex: 1;
  padding: 8px 16px;
  background-color: #f8f9fa;
  border-radius: 8px;
  border-left: 3px solid #409eff;
}

.milestone-item.completed .milestone-content {
  border-left-color: #67c23a;
}

.milestone-title {
  font-weight: 600;
  color: #303133;
  margin-bottom: 4px;
}

.milestone-date {
  color: #909399;
  font-size: 13px;
  margin-bottom: 8px;
}

.milestone-desc {
  color: #606266;
  font-size: 14px;
  line-height: 1.5;
  margin-bottom: 12px;
}

.milestone-actions {
  display: flex;
  gap: 8px;
}

/* 进度历史样式 */
.history-item {
  background-color: #f8f9fa;
  padding: 12px;
  border-radius: 6px;
  border-left: 3px solid #409eff;
}

.history-progress {
  font-size: 14px;
  color: #303133;
  margin-bottom: 8px;
}

.history-description {
  color: #606266;
  font-size: 13px;
  line-height: 1.5;
  margin-bottom: 8px;
}

.history-operator {
  color: #909399;
  font-size: 12px;
}

/* 对话框样式 */
.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}
</style>