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
          <el-form-item label="状态" prop="status">
            <el-select v-model="formData.status" placeholder="请选择状态" style="width: 100%">
              <el-option label="待改善" value="pending" />
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
  improvementStartDate: [
    { required: true, message: '请选择改善期开始日期', trigger: 'change' }
  ],
  improvementEndDate: [
    { required: true, message: '请选择改善期结束日期', trigger: 'change' }
  ]
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