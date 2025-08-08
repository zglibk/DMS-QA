<template>
  <!-- 新增工作计划对话框 -->
  <el-dialog
    v-model="visible"
    title="新增工作计划"
    width="800px"
    :before-close="handleClose"
    class="create-plan-dialog"
  >
    <el-form
      ref="formRef"
      :model="form"
      :rules="rules"
      label-width="120px"
      class="plan-form"
    >
      <el-row :gutter="20">
        <!-- 基本信息 -->
        <el-col :span="24">
          <div class="form-section">
            <h4 class="section-title">基本信息</h4>
            
            <el-form-item label="计划标题" prop="title">
              <el-input
                v-model="form.title"
                placeholder="请输入计划标题"
                maxlength="100"
                show-word-limit
              />
            </el-form-item>
            
            <el-form-item label="计划描述" prop="description">
              <el-input
                v-model="form.description"
                type="textarea"
                :rows="3"
                placeholder="请输入计划描述"
                maxlength="500"
                show-word-limit
              />
            </el-form-item>
            
            <el-row :gutter="20">
              <el-col :span="12">
                <el-form-item label="工作类型" prop="workTypeId">
                  <el-select
                    v-model="form.workTypeId"
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
              <el-col :span="12">
                <el-form-item label="优先级" prop="priority">
                  <el-select
                    v-model="form.priority"
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
            </el-row>
          </div>
        </el-col>
        
        <!-- 分配信息 -->
        <el-col :span="24">
          <div class="form-section">
            <h4 class="section-title">分配信息</h4>
            
            <el-row :gutter="20">
              <el-col :span="12">
                <el-form-item label="负责人" prop="assigneeId">
                  <el-select
                    v-model="form.assigneeId"
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
              <el-col :span="12">
                <el-form-item label="负责部门" prop="departmentId">
                  <el-cascader
                    v-model="form.departmentId"
                    :options="departments"
                    :show-all-levels="false"
                    placeholder="请选择负责部门"
                    style="width: 100%"
                    clearable
                    filterable
                  />
                </el-form-item>
              </el-col>
            </el-row>
            
            <el-form-item label="执行人员">
              <el-select
                v-model="form.executorIds"
                placeholder="请选择执行人员（可多选）"
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
          </div>
        </el-col>
        
        <!-- 时间安排 -->
        <el-col :span="24">
          <div class="form-section">
            <h4 class="section-title">时间安排</h4>
            
            <el-row :gutter="20">
              <el-col :span="12">
                <el-form-item label="开始日期" prop="startDate">
                  <el-date-picker
                    v-model="form.startDate"
                    type="date"
                    placeholder="开始日期"
                    style="width: 100%"
                    format="YYYY-MM-DD"
                    value-format="YYYY-MM-DD"
                  />
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="结束日期" prop="endDate">
                  <el-date-picker
                    v-model="form.endDate"
                    type="date"
                    placeholder="结束日期"
                    style="width: 100%"
                    format="YYYY-MM-DD"
                    value-format="YYYY-MM-DD"
                  />
                </el-form-item>
              </el-col>
            </el-row>
            
            <el-form-item label="预估工时">
              <el-input-number
                v-model="form.estimatedHours"
                :min="0"
                :max="9999"
                :precision="1"
                placeholder="输入工时"
                style="max-width: 50%"
              />
              <span class="input-suffix">小时</span>
            </el-form-item>
          </div>
        </el-col>
        
        <!-- 里程碑设置 -->
        <el-col :span="24">
          <div class="form-section">
            <h4 class="section-title">
              里程碑设置
              <el-button
                type="primary"
                size="small"
                @click="addMilestone"
                style="margin-left: 10px"
              >
                添加里程碑
              </el-button>
            </h4>
            
            <div v-if="form.milestones.length === 0" class="empty-milestones">
              <el-empty description="暂无里程碑" :image-size="60" />
            </div>
            
            <div v-else class="milestones-list">
              <div
                v-for="(milestone, index) in form.milestones"
                :key="index"
                class="milestone-item"
              >
                <el-row :gutter="10" align="middle">
                  <el-col :span="8">
                    <el-input
                      v-model="milestone.title"
                      placeholder="里程碑标题"
                      size="small"
                    />
                  </el-col>
                  <el-col :span="6">
                    <el-date-picker
                      v-model="milestone.targetDate"
                      type="date"
                      placeholder="目标日期"
                      size="small"
                      style="width: 100%"
                      format="YYYY-MM-DD"
                      value-format="YYYY-MM-DD"
                    />
                  </el-col>
                  <el-col :span="8">
                    <el-input
                      v-model="milestone.description"
                      placeholder="描述（可选）"
                      size="small"
                    />
                  </el-col>
                  <el-col :span="2">
                    <el-button
                      type="danger"
                      size="small"
                      @click="removeMilestone(index)"
                      :icon="Delete"
                    />
                  </el-col>
                </el-row>
              </div>
            </div>
          </div>
        </el-col>
      </el-row>
    </el-form>
    
    <template #footer>
      <div class="dialog-footer">
        <el-button @click="handleClose">取消</el-button>
        <el-button type="primary" @click="handleSubmit" :loading="loading">
          创建计划
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, reactive, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { Delete } from '@element-plus/icons-vue'
import { workPlanApi } from '@/services/api'

/**
 * 组件属性定义
 */
const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  }
})

/**
 * 组件事件定义
 */
const emit = defineEmits(['update:modelValue', 'success'])

/**
 * 响应式数据
 */
const visible = ref(false)
const loading = ref(false)
const formRef = ref(null)

// 表单数据
const form = reactive({
  title: '',
  description: '',
  workTypeId: null,
  priority: 'medium',
  assigneeId: null,
  departmentId: null,
  executorIds: [],
  startDate: '',
  endDate: '',
  estimatedHours: null,
  milestones: []
})

// 下拉选项数据
const workTypes = ref([])
const assignableUsers = ref([])
const departments = ref([])

/**
 * 表单验证规则
 */
const rules = {
  title: [
    { required: true, message: '请输入计划标题', trigger: 'blur' },
    { min: 2, max: 100, message: '标题长度在 2 到 100 个字符', trigger: 'blur' }
  ],
  workTypeId: [
    { required: true, message: '请选择工作类型', trigger: 'change' }
  ],
  priority: [
    { required: true, message: '请选择优先级', trigger: 'change' }
  ],
  assigneeId: [
    { required: true, message: '请选择负责人', trigger: 'change' }
  ],
  startDate: [
    { required: true, message: '请选择开始日期', trigger: 'change' }
  ],
  endDate: [
    { required: true, message: '请选择结束日期', trigger: 'change' }
  ]
}

/**
 * 监听 modelValue 变化
 */
watch(
  () => props.modelValue,
  (newVal) => {
    visible.value = newVal
    if (newVal) {
      loadInitialData()
    }
  },
  { immediate: true }
)

/**
 * 监听 visible 变化
 */
watch(visible, (newVal) => {
  emit('update:modelValue', newVal)
})

/**
 * 加载初始数据
 */
const loadInitialData = async () => {
  try {
    // 并行加载所有下拉选项数据
    const [workTypesRes, usersRes, departmentsRes] = await Promise.all([
      workPlanApi.getWorkTypes(),
      workPlanApi.getAssignableUsers(),
      workPlanApi.getDepartments()
    ])
    
    if (workTypesRes.data.success) {
      workTypes.value = workTypesRes.data.data
    }
    
    if (usersRes.data.success) {
      assignableUsers.value = usersRes.data.data
    }
    
    if (departmentsRes.data.success) {
      departments.value = departmentsRes.data.data
    }
  } catch (error) {
    console.error('加载初始数据失败:', error)
    ElMessage.error('加载数据失败，请重试')
  }
}

/**
 * 添加里程碑
 */
const addMilestone = () => {
  form.milestones.push({
    title: '',
    targetDate: '',
    description: ''
  })
}

/**
 * 删除里程碑
 * @param {number} index - 里程碑索引
 */
const removeMilestone = (index) => {
  form.milestones.splice(index, 1)
}

/**
 * 重置表单
 */
const resetForm = () => {
  Object.assign(form, {
    title: '',
    description: '',
    workTypeId: null,
    priority: 'medium',
    assigneeId: null,
    departmentId: null,
    executorIds: [],
    startDate: '',
    endDate: '',
    estimatedHours: null,
    milestones: []
  })
  
  if (formRef.value) {
    formRef.value.resetFields()
  }
}

/**
 * 处理对话框关闭
 */
const handleClose = () => {
  resetForm()
  visible.value = false
}

/**
 * 处理表单提交
 */
const handleSubmit = async () => {
  try {
    // 表单验证
    const valid = await formRef.value.validate()
    if (!valid) {
      return
    }
    
    // 日期验证
    if (form.startDate && form.endDate && form.startDate > form.endDate) {
      ElMessage.error('开始日期不能晚于结束日期')
      return
    }
    
    // 里程碑验证
    for (let i = 0; i < form.milestones.length; i++) {
      const milestone = form.milestones[i]
      if (!milestone.title || !milestone.targetDate) {
        ElMessage.error(`第 ${i + 1} 个里程碑的标题和目标日期不能为空`)
        return
      }
    }
    
    loading.value = true
    
    // 处理级联选择器的数据格式
    const submitData = { ...form }
    // el-cascader返回数组，取最后一个值作为部门ID
    if (Array.isArray(submitData.departmentId)) {
      submitData.departmentId = submitData.departmentId[submitData.departmentId.length - 1]
    }
    
    // 提交数据
    const response = await workPlanApi.createPlan(submitData)
    
    if (response.data.success) {
      ElMessage.success('工作计划创建成功')
      emit('success')
      handleClose()
    } else {
      ElMessage.error(response.data.message || '创建失败')
    }
  } catch (error) {
    console.error('创建工作计划失败:', error)
    ElMessage.error('创建失败，请重试')
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.create-plan-dialog {
  overflow-x: hidden;
  
  .plan-form {
    max-height: 600px;
    overflow-y: auto;
    overflow-x: hidden;
  }
  
  .form-section {
    margin-bottom: 20px;
    padding: 15px;
    background-color: #f8f9fa;
    border-radius: 6px;
    
    .section-title {
      margin: 0 0 15px 0;
      font-size: 14px;
      font-weight: 600;
      color: #303133;
      display: flex;
      align-items: center;
    }
  }
  
  .input-suffix {
    margin-left: 8px;
    color: #909399;
    font-size: 12px;
  }
  
  .empty-milestones {
    text-align: center;
    padding: 20px;
  }
  
  .milestones-list {
    .milestone-item {
      margin-bottom: 10px;
      padding: 10px;
      background-color: #fff;
      border: 1px solid #e4e7ed;
      border-radius: 4px;
      
      &:last-child {
        margin-bottom: 0;
      }
    }
  }
  
  .dialog-footer {
    text-align: right;
  }
}
</style>