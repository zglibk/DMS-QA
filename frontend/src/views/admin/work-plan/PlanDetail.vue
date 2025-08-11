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
        <el-button 
          v-if="canEditPlan" 
          type="primary" 
          @click="editPlan"
        >
          <el-icon><Edit /></el-icon>
          编辑计划
        </el-button>
      </div>
    </div>

    <!-- 计划基本信息 -->
    <el-card class="plan-info-card" v-loading="loading">
      <template #header>
        <div class="card-header">
          <span>基本信息</span>
          <el-tag :type="getStatusType(planDetail.Status)">{{ getStatusText(planDetail.Status) }}</el-tag>
        </div>
      </template>
      
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
    </el-card>

    <!-- 里程碑信息 -->
    <el-card class="milestones-card">
      <template #header>
        <div class="card-header">
          <span>里程碑 ({{ milestones.length }})</span>
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
      </template>
      
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
    </el-card>

    <!-- 进度历史 -->
    <el-card class="history-card">
      <template #header>
        <div class="card-header">
          <span>进度历史</span>
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
      </template>
      
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
  Check 
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

// 对话框状态
const milestoneFormDialogVisible = ref(false)
const progressDialogVisible = ref(false)
const saving = ref(false)

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
 * 编辑计划
 */
const editPlan = () => {
  router.push(`/admin/work-plan/management?edit=${planDetail.value.ID}`)
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
.plan-info-card,
.milestones-card,
.history-card {
  margin-bottom: 20px;
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