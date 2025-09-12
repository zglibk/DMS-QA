<template>
  <div class="progress-tracking">
    <!-- 页面头部 -->
    <div class="page-header">
      <div class="header-left">
        <h2 class="page-title">
          <el-icon><TrendCharts /></el-icon>
          进度跟踪
        </h2>
        <p class="page-subtitle">进度可视化、里程碑管理、预警提醒</p>
      </div>
      <div class="header-right">
        <el-button-group>
          <el-button :type="viewMode === 'list' ? 'primary' : ''" @click="viewMode = 'list'">
            <el-icon><List /></el-icon>
            列表视图
          </el-button>
          <el-button :type="viewMode === 'gantt' ? 'primary' : ''" @click="viewMode = 'gantt'">
            <el-icon><Calendar /></el-icon>
            甘特图
          </el-button>
        </el-button-group>
      </div>
    </div>

    <!-- 筛选器 -->
    <div class="filters">
      <el-card>
        <el-form :model="filterForm" inline>
          <el-form-item label="状态">
            <el-select v-model="filterForm.status" placeholder="选择状态" clearable style="width: 120px">
              <el-option label="进行中" value="in_progress" />
              <el-option label="已延期" value="overdue" />
              <el-option label="即将到期" value="due_soon" />
              <el-option label="已完成" value="completed" />
            </el-select>
          </el-form-item>
          <el-form-item label="优先级">
            <el-select v-model="filterForm.priority" placeholder="选择优先级" clearable style="width: 120px">
              <el-option label="高" value="high" />
              <el-option label="中" value="medium" />
              <el-option label="低" value="low" />
            </el-select>
          </el-form-item>
          <el-form-item label="负责人">
            <el-select v-model="filterForm.assigneeId" placeholder="选择负责人" clearable style="width: 150px">
              <el-option
                v-for="user in assignableUsers"
                :key="user.ID"
                :label="user.RealName"
                :value="user.ID"
              />
            </el-select>
          </el-form-item>
          <el-form-item>
            <el-button type="primary" @click="applyFilters">
              <el-icon><Search /></el-icon>
              筛选
            </el-button>
            <el-button @click="resetFilters">
              <el-icon><Refresh /></el-icon>
              重置
            </el-button>
          </el-form-item>
        </el-form>
      </el-card>
    </div>

    <!-- 进度概览 -->
    <div class="progress-overview">
      <el-row :gutter="20">
        <el-col :span="6">
          <div class="overview-card total">
            <div class="card-icon">
              <el-icon><Files /></el-icon>
            </div>
            <div class="card-content">
              <div class="card-number">{{ overviewData.totalPlans || 0 }}</div>
              <div class="card-label">总计划数</div>
            </div>
          </div>
        </el-col>
        <el-col :span="6">
          <div class="overview-card in-progress">
            <div class="card-icon">
              <el-icon><Loading /></el-icon>
            </div>
            <div class="card-content">
              <div class="card-number">{{ overviewData.inProgressPlans || 0 }}</div>
              <div class="card-label">进行中</div>
            </div>
          </div>
        </el-col>
        <el-col :span="6">
          <div class="overview-card overdue">
            <div class="card-icon">
              <el-icon><Warning /></el-icon>
            </div>
            <div class="card-content">
              <div class="card-number">{{ overviewData.overduePlans || 0 }}</div>
              <div class="card-label">已延期</div>
            </div>
          </div>
        </el-col>
        <el-col :span="6">
          <div class="overview-card completed">
            <div class="card-icon">
              <el-icon><CircleCheck /></el-icon>
            </div>
            <div class="card-content">
              <div class="card-number">{{ overviewData.completedPlans || 0 }}</div>
              <div class="card-label">已完成</div>
            </div>
          </div>
        </el-col>
      </el-row>
    </div>

    <!-- 列表视图 -->
    <div v-if="viewMode === 'list'" class="list-view">
      <el-card class="list-card">
        <div class="table-header">
          <div class="table-title">计划进度列表</div>
          <div class="table-actions">
            <el-button @click="refreshData">
              <el-icon><Refresh /></el-icon>
              刷新
            </el-button>
          </div>
        </div>

        <div class="table-container">
          <el-table
            v-loading="loading"
            :data="planList"
            stripe
            border
            style="width: 100%"
            class="progress-table"
          >
          <el-table-column prop="Title" label="计划标题" min-width="100" max-width="150">
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
          <el-table-column prop="Progress" label="进度" width="200">
            <template #default="{ row }">
              <div class="progress-cell">
                <el-progress
                  :percentage="row.Progress || 0"
                  :stroke-width="12"
                  :color="getProgressColor(row.Progress || 0)"
                >
                  <template #default="{ percentage }">
                    <span class="progress-text">{{ percentage }}%</span>
                  </template>
                </el-progress>
              </div>
            </template>
          </el-table-column>
          <el-table-column prop="AssigneeName" label="负责人" width="120" />
          <el-table-column prop="EndDate" label="截止日期" width="120">
            <template #default="{ row }">
              <div class="deadline-cell">
                <div :class="getDeadlineClass(row.EndDate, row.Status)">
                  {{ formatDate(row.EndDate) }}
                </div>
                <div class="days-remaining">
                  {{ getDaysRemaining(row.EndDate, row.Status) }}
                </div>
              </div>
            </template>
          </el-table-column>
          <el-table-column label="里程碑" width="120">
            <template #default="{ row }">
              <div class="milestone-cell">
                <el-button
                  type="primary"
                  size="small"
                  text
                  @click="viewMilestones(row)"
                >
                  {{ row.MilestoneCount || 0 }} 个
                </el-button>
              </div>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="200" fixed="right">
            <template #default="{ row }">
              <el-button type="primary" size="small" @click="viewPlanDetail(row.ID)">
                详情
              </el-button>
              <el-button 
                type="warning" 
                size="small" 
                :disabled="!canEditProgress"
                @click="updateProgress(row)"
              >
                更新进度
              </el-button>
              <el-button type="success" size="small" @click="viewHistory(row)">
                历史
              </el-button>
            </template>
          </el-table-column>
          </el-table>
        </div>

        <!-- 分页 -->
        <div class="pagination-container">
          <el-pagination
            v-model:current-page="currentPage4"
            v-model:page-size="pageSize4"
            :page-sizes="[5, 10, 20, 50]"
            :small="small"
            :disabled="disabled"
            :background="background"
            layout="total, sizes, prev, pager, next, jumper"
            :total="pagination.total"

          />
        </div>
      </el-card>
    </div>

    <!-- 甘特图视图 -->
    <div v-if="viewMode === 'gantt'" class="gantt-view">
      <el-card>
        <div class="gantt-header">
          <div class="gantt-title">甘特图视图</div>
          <div class="gantt-controls">
            <el-button-group>
              <el-button :type="ganttScale === 'day' ? 'primary' : ''" @click="ganttScale = 'day'">
                日
              </el-button>
              <el-button :type="ganttScale === 'week' ? 'primary' : ''" @click="ganttScale = 'week'">
                周
              </el-button>
              <el-button :type="ganttScale === 'month' ? 'primary' : ''" @click="ganttScale = 'month'">
                月
              </el-button>
            </el-button-group>
          </div>
        </div>
        
        <div class="gantt-container">
          <div v-if="planList.length === 0" class="gantt-placeholder">
            <el-empty description="暂无计划数据" />
          </div>
          <div v-else class="gantt-chart">
            <!-- 甘特图时间轴 -->
            <div class="gantt-timeline">
              <div class="timeline-header">
                <div class="task-column">任务</div>
                <div class="dates-column">
                  <div 
                    v-for="date in timelineData" 
                    :key="date.key" 
                    class="date-cell"
                    :style="{ width: cellWidth + 'px' }"
                  >
                    <div class="date-label">{{ date.label }}</div>
                    <div v-if="ganttScale === 'day'" class="date-sub">{{ date.sub }}</div>
                  </div>
                </div>
              </div>
              
              <!-- 甘特图任务行 -->
              <div class="timeline-body">
                <div 
                  v-for="plan in filteredPlans" 
                  :key="plan.ID" 
                  class="task-row"
                >
                  <div class="task-info">
                    <div class="task-name">{{ plan.Title }}</div>
                    <div class="task-meta">
                      <el-tag :type="getStatusTagType(plan.Status)" size="small">
                        {{ getStatusText(plan.Status) }}
                      </el-tag>
                      <span class="progress-text">{{ plan.Progress || 0 }}%</span>
                    </div>
                  </div>
                  <div class="task-timeline">
                    <div 
                      class="task-bar"
                      :style="getTaskBarStyle(plan)"
                      :class="{
                        'status-pending': plan.Status === 'pending',
                        'status-in-progress': plan.Status === 'in_progress',
                        'status-completed': plan.Status === 'completed',
                        'status-overdue': isOverdue(plan)
                      }"
                    >
                      <div class="task-progress" :style="{ width: (plan.Progress || 0) + '%' }"></div>
                      <div class="task-label">{{ plan.Title }}</div>
                    </div>
                    <!-- 里程碑标记 -->
                    <div 
                      v-for="milestone in getMilestonesForPlan(plan.ID)" 
                      :key="milestone.ID"
                      class="milestone-marker"
                      :style="getMilestoneStyle(milestone)"
                      :title="milestone.Title"
                    >
                      <el-icon :class="{ completed: milestone.IsCompleted }">
                        <Flag v-if="!milestone.IsCompleted" />
                        <Check v-else />
                      </el-icon>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </el-card>
    </div>

    <!-- 更新进度对话框 -->
    <el-dialog
      v-model="progressDialogVisible"
      title="更新进度"
      width="500px"
      :close-on-click-modal="false"
    >
      <div v-if="currentPlan" class="progress-update">
        <div class="plan-info">
          <h4>{{ currentPlan.Title }}</h4>
          <p>当前进度: {{ currentPlan.Progress || 0 }}%</p>
        </div>
        
        <el-form :model="progressForm" label-width="100px">
          <el-form-item label="新进度">
            <el-slider
              v-model="progressForm.progress"
              :min="0"
              :max="100"
              :step="5"
              show-input
              :show-input-controls="false"
              style="width: 100%"
            />
          </el-form-item>
          <el-form-item label="进度说明">
            <el-input
              v-model="progressForm.description"
              type="textarea"
              :rows="3"
              placeholder="请描述本次进度更新的具体内容"
            />
          </el-form-item>
        </el-form>
      </div>
      
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="progressDialogVisible = false">取消</el-button>
          <el-button 
            type="primary" 
            :disabled="!canEditProgress"
            @click="saveProgress" 
            :loading="saving"
          >
            更新
          </el-button>
        </span>
      </template>
    </el-dialog>

    <!-- 里程碑对话框 -->
    <el-dialog
      v-model="milestoneDialogVisible"
      title="计划里程碑"
      width="700px"
    >
      <div v-if="currentPlan" class="milestone-content">
        <div class="milestone-header">
          <h4>{{ currentPlan.Title }}</h4>
          <el-button 
            type="primary" 
            size="small" 
            :disabled="!canAddMilestone"
            @click="showAddMilestoneDialog"
          >
            <el-icon><Plus /></el-icon>
            添加里程碑
          </el-button>
        </div>
        
        <div class="milestone-list">
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
                    <el-icon><Check /></el-icon>
                    完成
                  </el-button>
                  <el-button 
                    type="warning" 
                    size="small" 
                    :disabled="!canEditProgress"
                    @click="editMilestone(milestone)"
                  >
                    <el-icon><Edit /></el-icon>
                    编辑
                  </el-button>
                  <el-button 
                    type="danger" 
                    size="small" 
                    :disabled="!canDeleteMilestone"
                    @click="deleteMilestone(milestone)"
                  >
                    <el-icon><Delete /></el-icon>
                    删除
                  </el-button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </el-dialog>

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

    <!-- 进度历史对话框 -->
    <el-dialog
      v-model="historyDialogVisible"
      title="进度历史"
      width="600px"
    >
      <div v-if="currentPlan" class="history-content">
        <h4>{{ currentPlan.Title }}</h4>
        
        <div class="history-list">
          <div v-if="progressHistory.length === 0" class="empty-history">
            <el-empty description="暂无进度历史" />
          </div>
          <div v-else class="history-timeline">
            <div
              v-for="history in progressHistory"
              :key="history.ID"
              class="history-item"
            >
              <div class="history-date">{{ formatDateTime(history.UpdatedAt) }}</div>
              <div class="history-progress">
                <span class="progress-change">
                  {{ history.OldProgress || 0 }}% → {{ history.NewProgress }}%
                </span>
              </div>
              <div v-if="history.Description" class="history-desc">{{ history.Description }}</div>
              <div class="history-user">更新人: {{ history.UpdaterName }}</div>
            </div>
          </div>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, watch, computed, nextTick } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  TrendCharts,
  List,
  Calendar,
  Search,
  Refresh,
  Files,
  Loading,
  Warning,
  CircleCheck,
  Plus,
  Check,
  Flag,
  Edit,
  Delete
} from '@element-plus/icons-vue'
import api from '@/services/api'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/store/user'

const router = useRouter()
const userStore = useUserStore()

// 响应式数据
const loading = ref(false)
const saving = ref(false)
const viewMode = ref('list')
/**
 * 权限检查 - 基于数据库菜单权限系统进行权限验证
 * 不再依赖用户名硬编码，而是通过用户角色和菜单权限来判断
 */

// 检查进度编辑权限
const canEditProgress = computed(() => {
  // 检查用户是否有系统管理员角色
  const hasAdminRole = userStore.hasRole('admin') || userStore.hasRole('系统管理员')
  
  // 检查用户是否有进度编辑的操作权限
  const hasProgressEditPermission = userStore.hasActionPermission('work-plan:progress:edit')
  
  // 检查用户是否有工作计划编辑权限（兼容性）
  const hasPlanEditPermission = userStore.hasActionPermission('work-plan:plan:edit')
  
  return hasAdminRole || hasProgressEditPermission || hasPlanEditPermission
})

// 检查里程碑添加权限
const canAddMilestone = computed(() => {
  // 检查用户是否有系统管理员角色
  const hasAdminRole = userStore.hasRole('admin') || userStore.hasRole('系统管理员')
  
  // 检查用户是否有里程碑添加的操作权限
  const hasMilestoneAddPermission = userStore.hasActionPermission('work-plan:milestone:add')
  
  return hasAdminRole || hasMilestoneAddPermission
})

// 检查里程碑删除权限
const canDeleteMilestone = computed(() => {
  // 检查用户是否有系统管理员角色
  const hasAdminRole = userStore.hasRole('admin') || userStore.hasRole('系统管理员')
  
  // 检查用户是否有里程碑删除的操作权限
  const hasMilestoneDeletePermission = userStore.hasActionPermission('work-plan:milestone:delete')
  
  return hasAdminRole || hasMilestoneDeletePermission
})

// 检查里程碑编辑权限
const canEditMilestone = computed(() => {
  // 检查用户是否有系统管理员角色
  const hasAdminRole = userStore.hasRole('admin') || userStore.hasRole('系统管理员')
  
  // 检查用户是否有里程碑编辑的操作权限
  const hasMilestoneEditPermission = userStore.hasActionPermission('work-plan:milestone:edit')
  
  return hasAdminRole || hasMilestoneEditPermission
})

// 检查是否为管理员（基于角色权限，不再依赖用户名）
const isAdmin = computed(() => {
  // 检查用户是否有系统管理员角色
  const hasAdminRole = userStore.hasRole('admin') || userStore.hasRole('系统管理员')
  
  // 检查用户是否有工作计划管理相关的菜单权限
  const hasWorkPlanMenuPermission = userStore.hasMenuPermission('/admin/work-plan') ||
                                   userStore.hasMenuPermission('/admin/work-plan/progress')
  
  return hasAdminRole || hasWorkPlanMenuPermission
})
const ganttScale = ref('week')
const planList = ref([])
const overviewData = ref({})
const assignableUsers = ref([])
const workTypes = ref([])
const currentPlan = ref(null)
const milestones = ref([])
const progressHistory = ref([])
const allMilestones = ref([])
const cellWidth = ref(80)

// 筛选表单
const filterForm = reactive({
  status: '',
  priority: '',
  assigneeId: ''
})

// 分页数据
const pagination = reactive({
  page: 1,
  pageSize: 5, // 默认分页数5条/页
  total: 0
})

// 分页控制器变量
const currentPage4 = ref(1)
const pageSize4 = ref(5)
const small = ref(false)
const disabled = ref(false)
const background = ref(true)

// 对话框状态
const progressDialogVisible = ref(false)
const milestoneDialogVisible = ref(false)
const historyDialogVisible = ref(false)
const milestoneFormDialogVisible = ref(false)

// 进度更新表单
const progressForm = reactive({
  progress: 0,
  description: ''
})

// 里程碑表单相关
const milestoneFormMode = ref('add') // 'add' 或 'edit'
const milestoneFormSaving = ref(false)
const milestoneFormRef = ref(null)
const currentMilestone = ref(null)
const milestoneForm = reactive({
  title: '',
  description: '',
  targetDate: ''
})

// 里程碑表单验证规则
const milestoneFormRules = {
  title: [
    { required: true, message: '请输入里程碑标题', trigger: 'blur' },
    { min: 2, max: 100, message: '标题长度在 2 到 100 个字符', trigger: 'blur' }
  ],
  targetDate: [
    { required: true, message: '请选择目标日期', trigger: 'change' }
  ]
}

// 权限检查函数已移除，现在使用computed属性实现实时权限检查

/**
 * 获取进度概览数据
 */
const getOverviewData = async () => {
  try {
    const response = await api.get('/work-plan/statistics/overview')
    if (response.data.success) {
      overviewData.value = response.data.data
    }
  } catch (error) {
    console.error('获取概览数据失败:', error)
  }
}

/**
 * 获取计划列表
 */
const getPlanList = async () => {
  try {
    loading.value = true
    const params = {
      page: pagination.page,
      pageSize: pagination.pageSize,
      ...filterForm
    }
    const response = await api.get('/work-plan/plans', { params })
    if (response.data.success) {
      planList.value = response.data.data.list || []
      
      // 如果API没有返回total，使用列表长度作为总数
      if (response.data.data.total !== undefined) {
        pagination.total = response.data.data.total
      } else {
        pagination.total = planList.value.length
      }
    } else {
      planList.value = []
      pagination.total = 0
    }
  } catch (error) {
    console.error('获取计划列表失败:', error)
    ElMessage.error('获取计划列表失败')
    planList.value = []
    pagination.total = 0
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
 * 应用筛选
 */
const applyFilters = () => {
  pagination.page = 1
  getPlanList()
}

/**
 * 重置筛选
 */
const resetFilters = () => {
  Object.assign(filterForm, {
    status: '',
    priority: '',
    assigneeId: ''
  })
  applyFilters()
}

/**
 * 刷新数据
 */
const refreshData = async () => {
  await Promise.all([
    getOverviewData(),
    getPlanList()
  ])
}

/**
 * 查看计划详情
 */
const viewPlanDetail = (planId) => {
  router.push(`/admin/work-plan/plans/${planId}`)
}

/**
 * 更新进度
 */
const updateProgress = async (plan) => {
  // 检查权限
  if (!canEditProgress.value) {
    ElMessage.warning('您没有更新进度的权限')
    return
  }
  
  currentPlan.value = plan
  progressForm.progress = plan.Progress || 0
  progressForm.description = ''
  progressDialogVisible.value = true
}

/**
 * 保存进度
 */
const saveProgress = async () => {
  // 检查权限
  if (!canEditProgress.value) {
    ElMessage.warning('您没有更新进度的权限')
    return
  }
  
  try {
    saving.value = true
    const response = await api.patch(`/work-plan/plans/${currentPlan.value.ID}/progress`, {
      progress: progressForm.progress,
      description: progressForm.description
    })
    
    if (response.data.success) {
      ElMessage.success('进度更新成功')
      progressDialogVisible.value = false
      getPlanList()
      getOverviewData()
    }
  } catch (error) {
    console.error('更新进度失败:', error)
    ElMessage.error('更新进度失败')
  } finally {
    saving.value = false
  }
}

/**
 * 查看里程碑
 */
const viewMilestones = async (plan) => {
  try {
    currentPlan.value = plan
    
    // 调试信息：输出权限状态
    console.log('里程碑对话框权限状态:', {
      canEditProgress: canEditProgress.value,
      canAddMilestone: canAddMilestone.value,
      canDeleteMilestone: canDeleteMilestone.value,
      isAdmin: isAdmin.value
    })
    
    const response = await api.get(`/work-plan/plans/${plan.ID}/milestones`)
    if (response.data.success) {
      milestones.value = response.data.data
      milestoneDialogVisible.value = true
    }
  } catch (error) {
    console.error('获取里程碑失败:', error)
    ElMessage.error('获取里程碑失败')
  }
}

/**
 * 查看进度历史
 */
const viewHistory = async (plan) => {
  try {
    currentPlan.value = plan
    const response = await api.get(`/work-plan/plans/${plan.ID}/progress-history`)
    if (response.data.success) {
      progressHistory.value = response.data.data
      historyDialogVisible.value = true
    }
  } catch (error) {
    console.error('获取进度历史失败:', error)
    ElMessage.error('获取进度历史失败')
  }
}

/**
 * 显示添加里程碑对话框
 */
const showAddMilestoneDialog = () => {
  // 检查权限
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
  // 检查权限
  if (!canEditProgress.value) {
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
    // 表单验证
    const valid = await milestoneFormRef.value.validate()
    if (!valid) {
      return
    }
    
    milestoneFormSaving.value = true
    
    if (milestoneFormMode.value === 'add') {
      // 添加里程碑
      const response = await api.post(`/work-plan/plans/${currentPlan.value.ID}/milestones`, {
        title: milestoneForm.title,
        description: milestoneForm.description,
        targetDate: milestoneForm.targetDate
      })
      
      if (response.data.success) {
        ElMessage.success('里程碑添加成功')
        milestoneFormDialogVisible.value = false
        viewMilestones(currentPlan.value) // 刷新里程碑列表
        getPlanList() // 刷新计划列表以更新里程碑数量
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
        viewMilestones(currentPlan.value) // 刷新里程碑列表
        getPlanList() // 刷新计划列表以更新里程碑数量
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
  // 检查权限
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
      viewMilestones(currentPlan.value)
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
  // 检查权限
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
      viewMilestones(currentPlan.value)
    }
  } catch (error) {
    if (error !== 'cancel') {
      console.error('删除里程碑失败:', error)
      ElMessage.error('删除里程碑失败')
    }
  }
}

/**
 * 处理当前页更新事件
 */
const handleCurrentPageUpdate = (page) => {
  pagination.page = page
  currentPage4.value = page
  getPlanList()
}

/**
 * 处理页面大小更新事件
 */
const handlePageSizeUpdate = (size) => {
  pagination.pageSize = size
  pagination.page = 1 // 重置到第一页
  currentPage4.value = 1
  pageSize4.value = size
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
 * 获取截止日期样式类
 */
const getDeadlineClass = (endDate, status) => {
  if (!endDate || status === 'completed' || status === 'cancelled') return 'normal'
  
  const today = new Date()
  const deadline = new Date(endDate)
  const diffDays = Math.ceil((deadline - today) / (1000 * 60 * 60 * 24))
  
  if (diffDays < 0) return 'overdue'
  if (diffDays <= 3) return 'due-soon'
  return 'normal'
}

/**
 * 获取剩余天数文本
 */
const getDaysRemaining = (endDate, status) => {
  if (!endDate || status === 'completed' || status === 'cancelled') return ''
  
  const today = new Date()
  const deadline = new Date(endDate)
  const diffDays = Math.ceil((deadline - today) / (1000 * 60 * 60 * 24))
  
  if (diffDays < 0) return `已逾期 ${Math.abs(diffDays)} 天`
  if (diffDays === 0) return '今天截止'
  if (diffDays <= 7) return `还有 ${diffDays} 天`
  return ''
}

/**
 * 格式化日期
 */
const formatDate = (dateStr) => {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleDateString()
}

/**
 * 格式化日期时间
 */
const formatDateTime = (dateStr) => {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleString()
}

/**
 * 甘特图相关计算属性和方法
 */

// 过滤后的计划列表
const filteredPlans = computed(() => {
  return planList.value.filter(plan => {
    if (filterForm.status && plan.Status !== filterForm.status) return false
    if (filterForm.priority && plan.Priority !== filterForm.priority) return false
    if (filterForm.assigneeId && plan.AssignedTo !== parseInt(filterForm.assigneeId)) return false
    return true
  })
})

// 时间轴数据
const timelineData = computed(() => {
  if (filteredPlans.value.length === 0) return []
  
  // 获取所有计划的开始和结束日期
  const dates = []
  filteredPlans.value.forEach(plan => {
    if (plan.StartDate) dates.push(new Date(plan.StartDate))
    if (plan.EndDate) dates.push(new Date(plan.EndDate))
  })
  
  if (dates.length === 0) return []
  
  const minDate = new Date(Math.min(...dates))
  const maxDate = new Date(Math.max(...dates))
  
  // 根据时间刻度生成时间轴
  const timeline = []
  const current = new Date(minDate)
  
  // 调整开始日期到合适的边界
  if (ganttScale.value === 'day') {
    current.setDate(current.getDate() - 3) // 前后各留3天
    cellWidth.value = 60
  } else if (ganttScale.value === 'week') {
    current.setDate(current.getDate() - current.getDay()) // 调整到周一
    current.setDate(current.getDate() - 7) // 前留一周
    cellWidth.value = 80
  } else if (ganttScale.value === 'month') {
    current.setDate(1) // 调整到月初
    current.setMonth(current.getMonth() - 1) // 前留一个月
    cellWidth.value = 100
  }
  
  const endBoundary = new Date(maxDate)
  if (ganttScale.value === 'day') {
    endBoundary.setDate(endBoundary.getDate() + 3)
  } else if (ganttScale.value === 'week') {
    endBoundary.setDate(endBoundary.getDate() + 7)
  } else if (ganttScale.value === 'month') {
    endBoundary.setMonth(endBoundary.getMonth() + 1)
  }
  
  while (current <= endBoundary) {
    let label, sub, key
    
    if (ganttScale.value === 'day') {
      label = `${current.getMonth() + 1}/${current.getDate()}`
      sub = ['日', '一', '二', '三', '四', '五', '六'][current.getDay()]
      key = current.toISOString().split('T')[0]
      current.setDate(current.getDate() + 1)
    } else if (ganttScale.value === 'week') {
      const weekStart = new Date(current)
      const weekEnd = new Date(current)
      weekEnd.setDate(weekEnd.getDate() + 6)
      label = `${weekStart.getMonth() + 1}/${weekStart.getDate()}-${weekEnd.getMonth() + 1}/${weekEnd.getDate()}`
      key = weekStart.toISOString().split('T')[0]
      current.setDate(current.getDate() + 7)
    } else if (ganttScale.value === 'month') {
      label = `${current.getFullYear()}年${current.getMonth() + 1}月`
      key = `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, '0')}`
      current.setMonth(current.getMonth() + 1)
    }
    
    timeline.push({ label, sub, key })
  }
  
  return timeline
})

/**
 * 获取任务条样式
 */
const getTaskBarStyle = (plan) => {
  if (!plan.StartDate || !plan.EndDate || timelineData.value.length === 0) {
    return { display: 'none' }
  }
  
  const startDate = new Date(plan.StartDate)
  const endDate = new Date(plan.EndDate)
  const timelineStart = getTimelineStartDate()
  
  if (!timelineStart) return { display: 'none' }
  
  let startOffset, duration
  
  if (ganttScale.value === 'day') {
    startOffset = Math.max(0, Math.floor((startDate - timelineStart) / (1000 * 60 * 60 * 24)))
    duration = Math.max(1, Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)))
  } else if (ganttScale.value === 'week') {
    startOffset = Math.max(0, Math.floor((startDate - timelineStart) / (1000 * 60 * 60 * 24 * 7)))
    duration = Math.max(1, Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24 * 7)))
  } else if (ganttScale.value === 'month') {
    startOffset = Math.max(0, (startDate.getFullYear() - timelineStart.getFullYear()) * 12 + (startDate.getMonth() - timelineStart.getMonth()))
    duration = Math.max(1, (endDate.getFullYear() - startDate.getFullYear()) * 12 + (endDate.getMonth() - startDate.getMonth()) + 1)
  }
  
  return {
    left: startOffset * cellWidth.value + 'px',
    width: duration * cellWidth.value + 'px'
  }
}

/**
 * 获取时间轴开始日期
 */
const getTimelineStartDate = () => {
  if (timelineData.value.length === 0) return null
  
  const firstKey = timelineData.value[0].key
  if (ganttScale.value === 'day') {
    return new Date(firstKey)
  } else if (ganttScale.value === 'week') {
    return new Date(firstKey)
  } else if (ganttScale.value === 'month') {
    const [year, month] = firstKey.split('-')
    return new Date(parseInt(year), parseInt(month) - 1, 1)
  }
  return null
}

/**
 * 检查计划是否逾期
 */
const isOverdue = (plan) => {
  if (!plan.EndDate || plan.Status === 'completed') return false
  return new Date(plan.EndDate) < new Date()
}

/**
 * 获取计划的里程碑
 */
const getMilestonesForPlan = (planId) => {
  return allMilestones.value.filter(m => m.PlanID === planId)
}

/**
 * 获取里程碑样式
 */
const getMilestoneStyle = (milestone) => {
  if (!milestone.TargetDate || timelineData.value.length === 0) {
    return { display: 'none' }
  }
  
  const milestoneDate = new Date(milestone.TargetDate)
  const timelineStart = getTimelineStartDate()
  
  if (!timelineStart) return { display: 'none' }
  
  let offset
  
  if (ganttScale.value === 'day') {
    offset = Math.floor((milestoneDate - timelineStart) / (1000 * 60 * 60 * 24))
  } else if (ganttScale.value === 'week') {
    offset = Math.floor((milestoneDate - timelineStart) / (1000 * 60 * 60 * 24 * 7))
  } else if (ganttScale.value === 'month') {
    offset = (milestoneDate.getFullYear() - timelineStart.getFullYear()) * 12 + (milestoneDate.getMonth() - timelineStart.getMonth())
  }
  
  return {
    left: offset * cellWidth.value + cellWidth.value / 2 + 'px'
  }
}

/**
 * 获取所有里程碑数据
 */
const getAllMilestones = async () => {
  try {
    const response = await api.get('/work-plan/milestones')
    if (response.data.success) {
      allMilestones.value = response.data.data
    }
  } catch (error) {
    console.error('获取里程碑数据失败:', error)
  }
}

/**
 * 监听甘特图刻度变化
 */
watch(ganttScale, () => {
  // 刻度变化时重新计算
  nextTick(() => {
    // 触发重新计算
  })
})

// 组件挂载时获取数据
onMounted(async () => {
  // 初始化分页变量
  currentPage4.value = pagination.page
  pageSize4.value = pagination.pageSize
  
  getOverviewData()
  getPlanList()
  getWorkTypes()
  getAssignableUsers()
  getAllMilestones()
})

// 监听筛选条件变化，重新获取里程碑数据
watch([() => filterForm.status, () => filterForm.priority, () => filterForm.assigneeId], () => {
  getAllMilestones()
})
</script>

<style scoped>
.progress-tracking {
  padding: 20px;
  background-color: #f5f7fa;
  /* 参考用户管理页面的滚动条处理方式 */
  height: auto; /* 改为自动高度 */
  display: flex;
  flex-direction: column;
  overflow: visible; /* 改为可见，确保分页显示 */
  min-height: 0; /* 解决flex容器高度问题 */
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

/* 筛选器样式 */
.filters {
  margin-bottom: 20px;
  flex-shrink: 0;
}

/* 进度概览样式 */
.progress-overview {
  margin-bottom: 20px;
  flex-shrink: 0;
}

.overview-card {
  display: flex;
  align-items: center;
  padding: 20px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  transition: transform 0.2s;
}

.overview-card:hover {
  transform: translateY(-2px);
}

.card-icon {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 16px;
  font-size: 24px;
  color: white;
}

.total .card-icon {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.in-progress .card-icon {
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
}

.overdue .card-icon {
  background: linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%);
}

.completed .card-icon {
  background: linear-gradient(135deg, #a8edea 0%, #fed6e3 100%);
}

.card-content {
  flex: 1;
}

.card-number {
  font-size: 28px;
  font-weight: 600;
  color: #303133;
  line-height: 1;
  margin-bottom: 4px;
}

.card-label {
  font-size: 14px;
  color: #909399;
}

/* 列表视图样式 */
.list-view {
  flex: 1;
  height: auto; /* 确保高度自动适应内容 */
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
  padding: 0 8px;
}

.progress-text {
  font-size: 12px;
  font-weight: 500;
}

.deadline-cell {
  text-align: center;
}

.deadline-cell .normal {
  color: #303133;
}

.deadline-cell .due-soon {
  color: #e6a23c;
  font-weight: 500;
}

.deadline-cell .overdue {
  color: #f56c6c;
  font-weight: 500;
}

.days-remaining {
  font-size: 12px;
  color: #909399;
  margin-top: 2px;
}

.milestone-cell {
  text-align: center;
}

/* 甘特图视图样式 */
.gantt-view {
  margin-bottom: 20px;
}

.gantt-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.gantt-title {
  font-size: 16px;
  font-weight: 600;
  color: #303133;
}

.gantt-container {
  /* 取消固定高度，让甘特图内容自适应 */
  /* min-height: 400px; */
  overflow-x: auto;
  overflow-y: visible;
  height: auto;
  min-height: 0;
}
.gantt-placeholder {
  text-align: center;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 400px;
}

.gantt-chart {
  min-width: 100%;
}

.gantt-timeline {
  border: 1px solid #e4e7ed;
  border-radius: 4px;
  background: white;
}

.timeline-header {
  display: flex;
  border-bottom: 2px solid #e4e7ed;
  background: #f5f7fa;
}

.task-column {
  width: 200px;
  min-width: 200px;
  padding: 12px;
  font-weight: 600;
  color: #303133;
  border-right: 1px solid #e4e7ed;
  display: flex;
  align-items: center;
}

.dates-column {
  display: flex;
  flex: 1;
  min-width: 0;
}

.date-cell {
  border-right: 1px solid #e4e7ed;
  padding: 8px 4px;
  text-align: center;
  background: #f5f7fa;
}

.date-label {
  font-size: 12px;
  font-weight: 500;
  color: #303133;
  line-height: 1.2;
}

.date-sub {
  font-size: 10px;
  color: #909399;
  margin-top: 2px;
}

.timeline-body {
  /* 移除固定最大高度，让内容自适应 */
  /* max-height: 500px; */
  overflow-y: visible;
  height: auto;
}

.task-row {
  display: flex;
  border-bottom: 1px solid #e4e7ed;
  min-height: 40px;
  position: relative;
}

.task-row:hover {
  background: #f5f7fa;
}

.task-info {
  width: 200px;
  min-width: 200px;
  padding: 8px;
  border-right: 1px solid #e4e7ed;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.task-name {
  font-weight: 500;
  color: #303133;
  margin-bottom: 4px;
  font-size: 14px;
  line-height: 1.3;
}

.task-meta {
  display: flex;
  align-items: center;
  gap: 8px;
}

.task-meta .progress-text {
  font-size: 12px;
  color: #909399;
}

.task-timeline {
  flex: 1;
  position: relative;
  min-height: 40px;
  display: flex;
  align-items: center;
}

.task-bar {
  position: absolute;
  height: 24px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  cursor: pointer;
  transition: all 0.2s;
}

.task-bar:hover {
  transform: translateY(-1px);
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
}

.task-bar.status-pending {
  background: #e4e7ed;
  border: 1px solid #d3d4d6;
}

.task-bar.status-in-progress {
  background: #e6f7ff;
  border: 1px solid #91d5ff;
}

.task-bar.status-completed {
  background: #f6ffed;
  border: 1px solid #b7eb8f;
}

.task-bar.status-overdue {
  background: #fff2e8;
  border: 1px solid #ffbb96;
}

.task-progress {
  height: 100%;
  border-radius: 12px;
  transition: width 0.3s;
}

.status-pending .task-progress {
  background: #909399;
}

.status-in-progress .task-progress {
  background: #409eff;
}

.status-completed .task-progress {
  background: #67c23a;
}

.status-overdue .task-progress {
  background: #f56c6c;
}

.task-label {
  position: absolute;
  left: 8px;
  right: 8px;
  font-size: 12px;
  font-weight: 500;
  color: #303133;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  line-height: 24px;
  pointer-events: none;
}

.milestone-marker {
  position: absolute;
  top: 50%;
  transform: translateY(-50%) translateX(-50%);
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: white;
  border: 2px solid #f56c6c;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  z-index: 10;
  transition: all 0.2s;
}

.milestone-marker:hover {
  transform: translateY(-50%) translateX(-50%) scale(1.2);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}

.milestone-marker .el-icon {
  font-size: 12px;
  color: #f56c6c;
}

.milestone-marker .el-icon.completed {
  color: #67c23a;
}

.milestone-marker.completed {
  border-color: #67c23a;
  background: #f0f9ff;
}

/* 列表视图样式优化 */
.list-view {
  display: flex;
  flex-direction: column;
}

.list-card {
  height: auto; /* 改为自动高度 */
  display: flex;
  flex-direction: column;
}

.list-card :deep(.el-card__body) {
  height: auto; /* 改为自动高度 */
  display: flex;
  flex-direction: column;
  padding: 20px;
  overflow: visible; /* 改为可见，确保分页显示 */
}

.table-container {
  flex: 1;
  overflow: visible; /* 改为可见，确保分页显示 */
  min-height: 0; /* 解决flex子元素高度问题 */
  width: 100%;
  max-width: 100%;
  height: auto; /* 确保高度自适应 */
}

.progress-table {
  height: auto; /* 改为自动高度 */
  width: 100%;
  max-width: 100%;
}

/* 确保表格不产生不必要的滚动条 */
.progress-table :deep(.el-table) {
  height: auto;
  overflow: visible;
}

/* 解决表格内容溢出问题 */
.progress-table :deep(.el-table__body-wrapper) {
  overflow: visible;
  /* 移除固定高度限制，让表格高度自动适应内容 */
}

/* 表格头部样式 */
.progress-table :deep(.el-table__header-wrapper) {
  overflow: visible;
}

/* 表格行高度优化 */
.progress-table :deep(.el-table__row) {
  height: auto;
  min-height: 60px;
}

/* 分页样式 */
.pagination-container {
  display: flex;
  justify-content: center;
  margin-top: 20px;
  flex-shrink: 0; /* 防止分页被压缩 */
}

/* 对话框样式 */
.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

/* 进度更新样式 */
.progress-update .plan-info {
  margin-bottom: 20px;
  padding: 16px;
  background: #f8f9fa;
  border-radius: 6px;
}

.progress-update .plan-info h4 {
  margin: 0 0 8px 0;
  color: #303133;
}

.progress-update .plan-info p {
  margin: 0;
  color: #606266;
}

/* 里程碑样式 */
.milestone-content .milestone-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding-bottom: 12px;
  border-bottom: 1px solid #ebeef5;
}

.milestone-content h4 {
  margin: 0;
  color: #303133;
}

.milestone-timeline {
  position: relative;
}

.milestone-item {
  display: flex;
  margin-bottom: 20px;
}

.milestone-marker {
  position: relative;
  margin-right: 16px;
}

.marker-dot {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: #e4e7ed;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  color: white;
}

.marker-dot.completed {
  background: #67c23a;
}

.marker-line {
  position: absolute;
  left: 50%;
  top: 16px;
  width: 2px;
  height: 40px;
  background: #e4e7ed;
  transform: translateX(-50%);
}

.milestone-content {
  flex: 1;
}

.milestone-title {
  font-weight: 500;
  color: #303133;
  margin-bottom: 4px;
}

.milestone-date {
  font-size: 12px;
  color: #909399;
  margin-bottom: 8px;
}

.milestone-desc {
  font-size: 13px;
  color: #606266;
  margin-bottom: 8px;
}

.milestone-actions {
  display: flex;
  gap: 8px;
}

/* 进度历史样式 */
.history-content h4 {
  margin: 0 0 20px 0;
  color: #303133;
}

.history-timeline {
  /* 取消固定高度，让历史记录内容自适应 */
  /* max-height: 400px; */
  overflow-y: auto;
}

.history-item {
  padding: 12px;
  border-left: 3px solid #e4e7ed;
  margin-bottom: 12px;
  background: #f8f9fa;
  border-radius: 0 6px 6px 0;
}

.history-date {
  font-size: 12px;
  color: #909399;
  margin-bottom: 4px;
}

.history-progress {
  margin-bottom: 8px;
}

.progress-change {
  font-weight: 500;
  color: #409eff;
}

.history-desc {
  font-size: 13px;
  color: #606266;
  margin-bottom: 8px;
}

.history-user {
  font-size: 12px;
  color: #909399;
}

/* 表格样式优化 */
/* 标题行文字左右居中 */
:deep(.el-table__header-wrapper .el-table__header th) {
  text-align: center;
}

/* 表格记录文字左右居中（计划标题列除外） */
:deep(.el-table__body .el-table__row .el-table__cell) {
  text-align: center;
}

/* 计划标题列保持左对齐 */
:deep(.el-table__body .el-table__row .el-table__cell:first-child) {
  text-align: left;
}

/* 操作列按钮样式 - 禁止换行和省略号 */
:deep(.el-table__fixed-right .el-table__cell) {
  white-space: nowrap;
  overflow: visible;
}

:deep(.el-table__cell .cell) {
  white-space: nowrap;
  overflow: visible;
  text-overflow: unset;
}

/* 操作列按钮容器样式 */
:deep(.el-table__fixed-right .el-table__cell .cell) {
  display: flex;
  gap: 4px;
  justify-content: center;
  align-items: center;
}

/* 操作列按钮样式调整 */
:deep(.el-table__fixed-right .el-button) {
  flex-shrink: 0;
  min-width: auto;
  padding: 4px 8px;
  font-size: 12px;
}
</style>