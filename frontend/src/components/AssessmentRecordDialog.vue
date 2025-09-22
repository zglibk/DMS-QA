<template>
  <el-dialog
    v-model="dialogVisible"
    :title="title"
    width="800px"
    :close-on-click-modal="false"
    :close-on-press-escape="false"
  >
    <el-form
      ref="formRef"
      :model="formData"
      :rules="formRules"
      label-width="120px"
      label-position="right"
    >
      <el-row :gutter="20">
          <el-col :span="12">
          <el-form-item label="来源类型" prop="sourceType">
            <el-select v-model="formData.sourceType" placeholder="请选择来源类型" style="width: 100%" disabled>
              <el-option label="投诉记录" value="complaint" />
              <el-option label="返工记录" value="rework" />
              <el-option label="出版异常记录" value="exception" />
            </el-select>
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="工单号" prop="complaintNumber">
            <el-input v-model="formData.complaintNumber" disabled />
          </el-form-item>
        </el-col>
      </el-row>
      <el-row :gutter="20">
        <el-col :span="12">
          <el-form-item label="责任部门" prop="department">
            <el-cascader
              v-model="formData.departmentPath"
              :options="departmentOptions"
              :props="cascaderProps"
              placeholder="请选择责任部门"
              style="width: 100%"
              @change="handleDepartmentChange"
              clearable
              filterable
              :show-all-levels="false"
            />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="员工姓名" prop="employeeName">
            <el-select 
              v-model="formData.employeeName" 
              placeholder="请选择员工姓名" 
              style="width: 100%"
              :disabled="!formData.department"
              clearable
            >
              <el-option 
                v-for="person in filteredPersons" 
                :key="person.ID || person.id" 
                :label="person.Name || person.RealName || person.name" 
                :value="person.Name || person.RealName || person.name" 
              />
            </el-select>
          </el-form-item>
        </el-col>
      </el-row>

      <el-row :gutter="20">
        <el-col :span="12">
          <el-form-item label="责任类型" prop="responsibilityType">
            <el-select v-model="formData.responsibilityType" placeholder="请选择责任类型" style="width: 100%">
              <el-option label="直接责任" value="direct" />
              <el-option 
                v-if="formData.sourceType === 'complaint'" 
                label="管理责任" 
                value="management" 
              />
              <el-option 
                v-if="formData.sourceType === 'complaint'" 
                label="连带责任" 
                value="joint" 
              />
            </el-select>
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="客户代码" prop="customerCode">
            <el-input v-model="formData.customerCode" disabled />
          </el-form-item>
        </el-col>
      </el-row>
      <el-row :gutter="20">
        <el-col :span="24">
          <el-form-item label="产品名称" prop="productName">
            <el-input 
              v-model="formData.productName" 
              type="textarea" 
              :rows="2"
              resize="vertical"
              disabled 
            />
          </el-form-item>
        </el-col>
      </el-row>
 
      <el-row :gutter="20">
        <el-col :span="24">
          <el-form-item label="问题描述" prop="problemDescription">
            <el-input 
              v-model="formData.problemDescription" 
              type="textarea" 
              :rows="3"
              resize="vertical"
              placeholder="请输入问题描述" 
            />
          </el-form-item>
        </el-col>
      </el-row>

      <el-row :gutter="20">
        <el-col :span="12">
          <el-form-item label="考核金额" prop="assessmentAmount">
            <el-input-number
              v-model="formData.assessmentAmount"
              :min="0"
              :precision="2"
              style="width: 100%"
              placeholder="请输入考核金额"
            />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="考核日期" prop="assessmentDate">
            <el-date-picker
              v-model="formData.assessmentDate"
              type="date"
              placeholder="选择考核日期"
              style="width: 100%"
              format="YYYY-MM-DD"
              value-format="YYYY-MM-DD"
            />
          </el-form-item>
        </el-col>
      </el-row>

      <el-row :gutter="20">
        <el-col :span="12">
          <el-form-item label="状态" prop="status">
            <el-select v-model="formData.status" placeholder="请选择状态" style="width: 100%" @change="handleStatusChange">
              <el-option label="待考核" value="pending" />
              <el-option label="改善中" value="improving" />
              <el-option label="已返还" value="returned" />
              <el-option label="已确认" value="confirmed" />
              <el-option label="免考核" value="exempt" />
            </el-select>
          </el-form-item>
        </el-col>
      </el-row>

      <el-row :gutter="20" v-if="formData.status === 'improving'">
        <el-col :span="12">
          <el-form-item label="改善期开始" prop="improvementStartDate">
            <el-date-picker
              v-model="formData.improvementStartDate"
              type="date"
              placeholder="选择开始日期"
              style="width: 100%"
              format="YYYY-MM-DD"
              value-format="YYYY-MM-DD"
            />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="改善期结束" prop="improvementEndDate">
            <el-date-picker
              v-model="formData.improvementEndDate"
              type="date"
              placeholder="选择结束日期"
              style="width: 100%"
              format="YYYY-MM-DD"
              value-format="YYYY-MM-DD"
            />
          </el-form-item>
        </el-col>
      </el-row>

      <el-row :gutter="20" v-if="formData.status === 'returned'">
        <el-col :span="12">
          <el-form-item label="返还日期" prop="returnDate">
            <el-date-picker
              v-model="formData.returnDate"
              type="date"
              placeholder="选择返还日期"
              style="width: 100%"
              format="YYYY-MM-DD"
              value-format="YYYY-MM-DD"
            />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="返还金额" prop="returnAmount">
            <el-input-number
              v-model="formData.returnAmount"
              :min="0"
              :max="formData.assessmentAmount"
              :precision="2"
              style="width: 100%"
              placeholder="请输入返还金额"
            />
          </el-form-item>
        </el-col>
      </el-row>

      <el-form-item label="备注">
        <el-input
          v-model="formData.remarks"
          type="textarea"
          :rows="3"
          placeholder="请输入备注信息"
        />
      </el-form-item>
    </el-form>

    <template #footer>
      <span class="dialog-footer">
        <el-button @click="handleCancel">取消</el-button>
        <el-button type="primary" @click="handleSave" :loading="loading">
          确定
        </el-button>
      </span>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { ElMessage } from 'element-plus'
import api from '@/services/api'

/**
 * 组件属性定义
 */
const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  },
  title: {
    type: String,
    default: '编辑考核记录'
  },
  formData: {
    type: Object,
    default: () => ({})
  },
  loading: {
    type: Boolean,
    default: false
  }
})

/**
 * 组件事件定义
 */
const emit = defineEmits(['update:modelValue', 'save', 'cancel'])

/**
 * 响应式数据
 */
const dialogVisible = ref(false)
const formRef = ref()
const departments = ref([])
const departmentOptions = ref([]) // 级联选择器的部门选项
const persons = ref([])

/**
 * 级联选择器配置
 */
const cascaderProps = {
  value: 'ID',
  label: 'Name',
  children: 'children',
  emitPath: false, // 只返回最后一级的值
  checkStrictly: true // 允许选择任意一级
}

/**
 * 根据选择的部门过滤人员列表
 * @returns {Array} 过滤后的人员数组
 */
const filteredPersons = computed(() => {
  if (!props.formData.department) {
    return []
  }
  
  // 根据部门名称过滤人员，使用更灵活的匹配逻辑
  const filtered = persons.value.filter(person => {
    // 检查多个可能的部门字段
    const departmentFields = [
      person.DepartmentName,
      person.department,
      person.Department
    ]
    
    // 使用严格匹配和去除空格的匹配
    const selectedDept = props.formData.department?.trim()
    
    const match = departmentFields.some(field => {
      if (!field) return false
      const fieldValue = String(field).trim()
      return fieldValue === selectedDept
    })
    
    return match
  })
  
  return filtered
})

/**
 * 加载部门列表
 */
const loadDepartments = async () => {
  try {
    // 同时加载平铺和树形结构的部门数据
    const [flatResponse, treeResponse] = await Promise.all([
      api.get('/departments'), // 平铺结构，用于人员过滤
      api.get('/departments/tree') // 树形结构，用于级联选择器
    ])
    
    if (flatResponse.data && flatResponse.data.success) {
      departments.value = flatResponse.data.data || []
    } else {
      console.error('获取平铺部门列表失败:', flatResponse.data?.message)
      departments.value = []
    }
    
    if (treeResponse.data && treeResponse.data.success) {
      departmentOptions.value = treeResponse.data.data || []
    } else {
      console.error('获取树形部门列表失败:', treeResponse.data?.message)
      departmentOptions.value = []
    }
  } catch (error) {
    console.error('获取部门列表出错:', error)
    console.error('错误详情:', error.response?.data)
    departments.value = []
    departmentOptions.value = []
  }
}

/**
 * 加载人员列表
 * 从后端获取所有在职人员信息
 */
const loadPersons = async () => {
  try {
    // 修改API调用：使用/person/list而不是/person，这样查询的是Person表而不是User表
    const response = await api.get('/person/list', {
      params: {
        page: 1,
        pageSize: 1000, // 获取所有人员
        includeInactive: false // 只获取在职人员
      }
    });
    
    if (response.data.success) {
      persons.value = response.data.data || [];
    } else {
      console.error('加载人员失败:', response.data.message);
      persons.value = [];
    }
  } catch (error) {
    console.error('加载人员失败:', error);
    persons.value = [];
  }
};

/**
 * 处理部门选择变化
 */
const handleDepartmentChange = (value) => {
  // 根据选择的部门ID找到对应的部门名称
  if (value) {
    const selectedDept = findDepartmentById(departmentOptions.value, value)
    if (selectedDept) {
      // 更新formData中的department字段为部门名称，用于人员过滤
      props.formData.department = selectedDept.Name
    } else {
      console.warn('未找到对应的部门信息，ID:', value)
      props.formData.department = ''
    }
  } else {
    props.formData.department = ''
  }
  
  // 清空员工选择
  props.formData.employeeName = ''
  
  // 触发表单验证
  if (formRef.value) {
    formRef.value.clearValidate(['employeeName'])
  }
}

/**
 * 递归查找部门ID对应的部门信息
 * @param {Array} departments - 部门树形数据
 * @param {Number} targetId - 目标部门ID
 * @returns {Object|null} 找到的部门信息或null
 */
const findDepartmentById = (departments, targetId) => {
  for (const dept of departments) {
    if (dept.ID === targetId) {
      return dept
    }
    if (dept.children && dept.children.length > 0) {
      const found = findDepartmentById(dept.children, targetId)
      if (found) {
        return found
      }
    }
  }
  return null
}

/**
 * 组件挂载时加载数据
 */
onMounted(() => {
  loadDepartments()
  loadPersons()
})

/**
 * 表单验证规则
 */
const formRules = {
  assessmentAmount: [
    { required: true, message: '请输入考核金额', trigger: 'blur' },
    { type: 'number', min: 0, message: '考核金额不能小于0', trigger: 'blur' }
  ],
  status: [
    { required: true, message: '请选择状态', trigger: 'change' }
  ],
  responsibilityType: [
    { required: true, message: '请选择责任类型', trigger: 'change' }
  ],
  assessmentDate: [
    { required: true, message: '请选择考核日期', trigger: 'change' }
  ],
  improvementStartDate: [
    { 
      validator: (rule, value, callback) => {
        try {
          if (props.formData.status === 'improving' && !value) {
            callback(new Error('改善中状态需要选择开始日期'))
          } else {
            callback()
          }
        } catch (error) {
          console.error('改善开始日期验证错误:', error)
          callback()
        }
      }, 
      trigger: 'change' 
    }
  ],
  improvementEndDate: [
    { 
      validator: (rule, value, callback) => {
        try {
          if (props.formData.status === 'improving' && !value) {
            callback(new Error('改善中状态需要选择结束日期'))
          } else if (props.formData.status === 'improving' && value && props.formData.improvementStartDate && value <= props.formData.improvementStartDate) {
            callback(new Error('结束日期必须晚于开始日期'))
          } else {
            callback()
          }
        } catch (error) {
          console.error('改善结束日期验证错误:', error)
          callback()
        }
      }, 
      trigger: 'change' 
    }
  ],
  returnDate: [
    { 
      validator: (rule, value, callback) => {
        try {
          if (props.formData.status === 'returned' && !value) {
            callback(new Error('已返还状态需要选择返还日期'))
          } else {
            callback()
          }
        } catch (error) {
          console.error('返还日期验证错误:', error)
          callback()
        }
      }, 
      trigger: 'change' 
    }
  ],
  returnAmount: [
    { 
      validator: (rule, value, callback) => {
        try {
          if (props.formData.status === 'returned' && (!value || value <= 0)) {
            callback(new Error('已返还状态需要输入返还金额'))
          } else if (props.formData.status === 'returned' && value > props.formData.assessmentAmount) {
            callback(new Error('返还金额不能超过考核金额'))
          } else {
            callback()
          }
        } catch (error) {
          console.error('返还金额验证错误:', error)
          callback()
        }
      }, 
      trigger: 'blur' 
    }
  ]
}

/**
 * 处理状态变化
 * 当状态改变时清空相关字段
 * @param {string} newStatus - 新的状态值
 */
const handleStatusChange = (newStatus) => {
  // 清空改善期相关字段
  if (newStatus !== 'improving') {
    props.formData.improvementStartDate = ''
    props.formData.improvementEndDate = ''
  }
  
  // 清空返还相关字段
  if (newStatus !== 'returned') {
    props.formData.returnDate = ''
    props.formData.returnAmount = null
  }
  
  // 重新验证表单
  if (formRef.value) {
    formRef.value.clearValidate()
  }
}

/**
 * 监听modelValue变化，同步对话框显示状态
 * @param {boolean} newVal - 新的可见状态
 */
watch(() => props.modelValue, (newVal) => {
  dialogVisible.value = newVal
})

/**
 * 监听对话框显示状态变化
 */
watch(() => props.visible, (newValue, oldValue) => {
  // 对话框状态变化处理逻辑可以在这里添加
}, { immediate: true })

// 监听props.visible变化
watch(() => props.visible, (newVal, oldVal) => {
  if (newVal) {
    dialogVisible.value = true
    // 确保数据已加载
    if (departments.value.length === 0) {
      loadDepartments()
    }
    if (persons.value.length === 0) {
      loadPersons()
    }
  } else {
    dialogVisible.value = false
  }
}, { immediate: true })

// 监听dialogVisible内部状态变化
watch(dialogVisible, (newVal, oldVal) => {
  if (!newVal && props.visible) {
    emit('update:visible', false)
  }
})

/**
 * 监听formData变化，确保问题描述字段正确映射
 * 修复异常记录问题描述显示在备注字段的问题
 */
watch(() => props.formData, (newFormData) => {
  if (newFormData && Object.keys(newFormData).length > 0) {
    // 初始化级联选择器的departmentPath字段
    if (newFormData.department && departmentOptions.value.length > 0) {
      const departmentId = findDepartmentIdByName(departmentOptions.value, newFormData.department)
      if (departmentId) {
        newFormData.departmentPath = departmentId
      }
    }
    
    // 确保problemDescription字段有正确的值
    let finalProblemDescription = newFormData.problemDescription;
    
    // 如果API返回的problemDescription为空，根据来源类型获取对应字段
    if (!finalProblemDescription || finalProblemDescription === '') {
      const sourceType = newFormData.SourceType || newFormData.sourceType;
      
      if (sourceType === 'complaint' && newFormData.ComplaintProblemDescription) {
        finalProblemDescription = newFormData.ComplaintProblemDescription;
      } else if (sourceType === 'rework' && newFormData.ReworkProblemDescription) {
        finalProblemDescription = newFormData.ReworkProblemDescription;
      } else if (sourceType === 'exception' && newFormData.ExceptionProblemDescription) {
        finalProblemDescription = newFormData.ExceptionProblemDescription;
      } else {
        // 按优先级选择可用的问题描述字段
        if (newFormData.ComplaintProblemDescription) {
          finalProblemDescription = newFormData.ComplaintProblemDescription;
        } else if (newFormData.ReworkProblemDescription) {
          finalProblemDescription = newFormData.ReworkProblemDescription;
        } else if (newFormData.ExceptionProblemDescription) {
          finalProblemDescription = newFormData.ExceptionProblemDescription;
        }
      }
    }
    
    // 强制设置problemDescription字段，确保显示在正确的表单字段中
    if (finalProblemDescription) {
      newFormData.problemDescription = finalProblemDescription;
    }
    
    // 确保备注字段不会被问题描述覆盖
    if (!newFormData.remarks && !newFormData.Remarks) {
      newFormData.remarks = '';
    } else if (newFormData.remarks) {
      // 优先使用后端处理后的remarks字段（小写）
    } else if (newFormData.Remarks && !newFormData.remarks) {
      newFormData.remarks = newFormData.Remarks;
    } else if (newFormData.AssessmentDescription && !newFormData.remarks && !newFormData.Remarks) {
      // 如果Remarks为空但AssessmentDescription有值，使用AssessmentDescription
      newFormData.remarks = newFormData.AssessmentDescription;
    }
  }
}, { deep: true, immediate: true })

/**
 * 递归查找部门名称对应的部门ID
 * @param {Array} departments - 部门树形数据
 * @param {String} targetName - 目标部门名称
 * @returns {Number|null} 找到的部门ID或null
 */
const findDepartmentIdByName = (departments, targetName) => {
  for (const dept of departments) {
    if (dept.Name === targetName) {
      return dept.ID
    }
    if (dept.children && dept.children.length > 0) {
      const found = findDepartmentIdByName(dept.children, targetName)
      if (found) {
        return found
      }
    }
  }
  return null
}

/**
 * 处理保存操作
 * 验证表单并触发保存事件
 */
const handleSave = async () => {
  try {
    // 清除之前的验证错误
    formRef.value.clearValidate()
    
    // 执行表单验证
    const isValid = await formRef.value.validate().catch(() => false)
    
    if (isValid) {
      emit('save', props.formData)
    } else {
      ElMessage.error('请检查表单输入')
    }
  } catch (error) {
    console.error('表单验证错误:', error)
    ElMessage.error('表单验证失败，请检查输入')
  }
}

/**
 * 处理取消操作
 * 关闭对话框并触发取消事件
 */
const handleCancel = () => {
  dialogVisible.value = false
  emit('cancel')
}
</script>

<style scoped>
.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

.el-form-item {
  margin-bottom: 20px;
}

.el-input-number {
  width: 100%;
}
</style>