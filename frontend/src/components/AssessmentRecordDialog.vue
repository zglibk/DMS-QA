<template>
  <el-dialog
    v-model="dialogVisible"
    :title="title"
    width="600px"
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
          <el-form-item label="员工姓名" prop="employeeName">
            <el-input v-model="formData.employeeName" disabled />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="部门" prop="department">
            <el-input v-model="formData.department" disabled />
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
          <el-form-item label="来源类型" prop="sourceType">
            <el-select v-model="formData.sourceType" placeholder="请选择来源类型" style="width: 100%" disabled>
              <el-option label="投诉记录" value="complaint" />
              <el-option label="返工记录" value="rework" />
              <el-option label="出版异常记录" value="exception" />
            </el-select>
          </el-form-item>
        </el-col>
      </el-row>

      <el-row :gutter="20">
        <el-col :span="12">
          <el-form-item label="工单号" prop="complaintNumber">
            <el-input v-model="formData.complaintNumber" disabled />
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
            <el-input v-model="formData.productName" disabled />
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
              <el-option label="待改善" value="pending" />
              <el-option label="改善中" value="improving" />
              <el-option label="已返还" value="returned" />
              <el-option label="已确认" value="confirmed" />
              <el-option label="免考核" value="exempt" />
            </el-select>
          </el-form-item>
        </el-col>
      </el-row>
      <el-row :gutter="20">
        <el-col :span="24">
          <el-form-item label="问题描述" prop="problemDescription">
            <el-input v-model="formData.problemDescription" placeholder="请输入问题描述" />
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
import { ref, watch } from 'vue'
import { ElMessage } from 'element-plus'

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
        if (props.formData.status === 'improving' && !value) {
          callback(new Error('改善中状态需要选择开始日期'))
        } else {
          callback()
        }
      }, 
      trigger: 'change' 
    }
  ],
  improvementEndDate: [
    { 
      validator: (rule, value, callback) => {
        if (props.formData.status === 'improving' && !value) {
          callback(new Error('改善中状态需要选择结束日期'))
        } else if (props.formData.status === 'improving' && value && props.formData.improvementStartDate && value <= props.formData.improvementStartDate) {
          callback(new Error('结束日期必须晚于开始日期'))
        } else {
          callback()
        }
      }, 
      trigger: 'change' 
    }
  ],
  returnDate: [
    { 
      validator: (rule, value, callback) => {
        if (props.formData.status === 'returned' && !value) {
          callback(new Error('已返还状态需要选择返还日期'))
        } else {
          callback()
        }
      }, 
      trigger: 'change' 
    }
  ],
  returnAmount: [
    { 
      validator: (rule, value, callback) => {
        if (props.formData.status === 'returned' && (!value || value <= 0)) {
          callback(new Error('已返还状态需要输入返还金额'))
        } else if (props.formData.status === 'returned' && value > props.formData.assessmentAmount) {
          callback(new Error('返还金额不能超过考核金额'))
        } else {
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
 * 监听对话框显示状态变化，同步到父组件
 * @param {boolean} newVal - 新的对话框显示状态
 */
watch(dialogVisible, (newVal) => {
  emit('update:modelValue', newVal)
})

/**
 * 监听formData变化，确保问题描述字段正确映射
 * 修复异常记录问题描述显示在备注字段的问题
 */
watch(() => props.formData, (newFormData) => {
  console.log('=== 前端对话框调试信息 ===');
  console.log('接收到的formData:', JSON.stringify(newFormData, null, 2));
  
  if (newFormData && Object.keys(newFormData).length > 0) {
    console.log('API返回的problemDescription:', newFormData.problemDescription);
    console.log('API返回的remarks:', newFormData.remarks || newFormData.Remarks);
    console.log('来源类型:', newFormData.SourceType || newFormData.sourceType);
    
    // 检查各种问题描述字段
    console.log('ComplaintProblemDescription:', newFormData.ComplaintProblemDescription);
    console.log('ReworkProblemDescription:', newFormData.ReworkProblemDescription);
    console.log('ExceptionProblemDescription:', newFormData.ExceptionProblemDescription);
    
    // 确保problemDescription字段有正确的值
    let finalProblemDescription = newFormData.problemDescription;
    
    // 如果API返回的problemDescription为空，根据来源类型获取对应字段
    if (!finalProblemDescription || finalProblemDescription === '') {
      console.log('API返回的problemDescription为空，尝试从其他字段获取...');
      
      const sourceType = newFormData.SourceType || newFormData.sourceType;
      
      if (sourceType === 'complaint' && newFormData.ComplaintProblemDescription) {
        finalProblemDescription = newFormData.ComplaintProblemDescription;
        console.log('使用ComplaintProblemDescription:', finalProblemDescription);
      } else if (sourceType === 'rework' && newFormData.ReworkProblemDescription) {
        finalProblemDescription = newFormData.ReworkProblemDescription;
        console.log('使用ReworkProblemDescription:', finalProblemDescription);
      } else if (sourceType === 'exception' && newFormData.ExceptionProblemDescription) {
        finalProblemDescription = newFormData.ExceptionProblemDescription;
        console.log('使用ExceptionProblemDescription:', finalProblemDescription);
      } else {
        // 按优先级选择可用的问题描述字段
        if (newFormData.ComplaintProblemDescription) {
          finalProblemDescription = newFormData.ComplaintProblemDescription;
          console.log('使用ComplaintProblemDescription作为备选:', finalProblemDescription);
        } else if (newFormData.ReworkProblemDescription) {
          finalProblemDescription = newFormData.ReworkProblemDescription;
          console.log('使用ReworkProblemDescription作为备选:', finalProblemDescription);
        } else if (newFormData.ExceptionProblemDescription) {
          finalProblemDescription = newFormData.ExceptionProblemDescription;
          console.log('使用ExceptionProblemDescription作为备选:', finalProblemDescription);
        }
      }
    }
    
    // 强制设置problemDescription字段，确保显示在正确的表单字段中
    if (finalProblemDescription) {
      newFormData.problemDescription = finalProblemDescription;
      console.log('强制设置problemDescription为:', finalProblemDescription);
    }
    
    // 确保备注字段不会被问题描述覆盖
    if (!newFormData.remarks && !newFormData.Remarks) {
      newFormData.remarks = '';
      console.log('初始化remarks字段为空字符串');
    } else if (newFormData.remarks) {
      // 优先使用后端处理后的remarks字段（小写）
      console.log('使用后端处理后的remarks字段值:', newFormData.remarks);
    } else if (newFormData.Remarks && !newFormData.remarks) {
      newFormData.remarks = newFormData.Remarks;
      console.log('使用Remarks字段值:', newFormData.Remarks);
    } else if (newFormData.AssessmentDescription && !newFormData.remarks && !newFormData.Remarks) {
      // 如果Remarks为空但AssessmentDescription有值，使用AssessmentDescription
      newFormData.remarks = newFormData.AssessmentDescription;
      console.log('使用AssessmentDescription字段值:', newFormData.AssessmentDescription);
    }
    
    console.log('最终problemDescription值:', newFormData.problemDescription);
    console.log('最终remarks值:', newFormData.remarks);
    console.log('AssessmentDescription值:', newFormData.AssessmentDescription);
  }
  console.log('========================');
}, { deep: true, immediate: true })

/**
 * 处理保存操作
 * 验证表单并触发保存事件
 */
const handleSave = async () => {
  try {
    await formRef.value.validate()
    emit('save', props.formData)
  } catch (error) {
    ElMessage.error('请检查表单输入')
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