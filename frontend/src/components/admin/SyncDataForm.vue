<template>
  <div class="sync-data-form">
    <el-dialog
      title="同步交检/交货数据"
      v-model="visible"
      width="700px"
      :before-close="handleClose"
      :close-on-click-modal="false"
    >
      <!-- 同步模式选择 -->
      <div class="sync-mode-selector">
        <el-radio-group v-model="syncMode" @change="handleSyncModeChange">
          <el-radio-button label="manual">手动录入</el-radio-button>
          <el-radio-button label="erp">ERP同步</el-radio-button>
          <el-radio-button label="batch">批量同步</el-radio-button>
        </el-radio-group>
      </div>

      <!-- 手动输入模式 -->
      <div v-if="syncMode === 'manual'">
        <el-form
          ref="formRef"
          :model="form"
          :rules="formRules"
          label-width="120px"
          class="sync-form"
        >
          <el-form-item label="统计年份" prop="StatYear">
            <el-date-picker
              v-model="form.StatYear"
              type="year"
              placeholder="选择年份"
              format="YYYY"
              value-format="YYYY"
              style="width: 100%"
            />
          </el-form-item>

          <el-form-item label="统计月份" prop="StatMonth">
            <el-select
              v-model="form.StatMonth"
              placeholder="选择月份"
              style="width: 100%"
            >
              <el-option
                v-for="month in months"
                :key="month.value"
                :label="month.label"
                :value="month.value"
              />
            </el-select>
          </el-form-item>

          <el-form-item label="交检批次数" prop="InspectionBatches">
            <el-input-number
              v-model="form.InspectionBatches"
              :min="0"
              :max="99999"
              placeholder="请输入交检批次数"
              style="width: 100%"
            />
          </el-form-item>

          <el-form-item label="交货批次数" prop="DeliveryBatches">
            <el-input-number
              v-model="form.DeliveryBatches"
              :min="0"
              :max="99999"
              placeholder="请输入交货批次数"
              style="width: 100%"
            />
          </el-form-item>

          <el-form-item label="备注" prop="Remarks">
            <el-input
              v-model="form.Remarks"
              type="textarea"
              :rows="3"
              placeholder="请输入备注信息（可选）"
              maxlength="500"
              show-word-limit
            />
          </el-form-item>
        </el-form>
      </div>

      <!-- ERP同步模式 -->
      <div v-else-if="syncMode === 'erp'">
        <el-form
          ref="erpFormRef"
          :model="erpFormData"
          :rules="erpFormRules"
          label-width="120px"
          class="sync-form"
        >
          <el-form-item label="统计年份" prop="year">
            <el-date-picker
              v-model="erpFormData.year"
              type="year"
              placeholder="选择年份"
              format="YYYY"
              value-format="YYYY"
              style="width: 100%"
            />
          </el-form-item>

          <el-form-item label="统计月份" prop="month">
            <el-select
              v-model="erpFormData.month"
              placeholder="选择月份"
              style="width: 100%"
            >
              <el-option
                v-for="month in months"
                :key="month.value"
                :label="month.label"
                :value="month.value"
              />
            </el-select>
          </el-form-item>

          <el-form-item label="备注" prop="remarks">
            <el-input
              v-model="erpFormData.remarks"
              type="textarea"
              :rows="3"
              placeholder="请输入备注信息（可选）"
              maxlength="500"
              show-word-limit
            />
          </el-form-item>

          <el-alert
            title="ERP同步说明"
            type="info"
            :closable="false"
            show-icon
          >
            <template #default>
              <p>• 系统将自动从ERP获取指定月份的成品入库和出库数据</p>
              <p>• 交检批次数基于入库数据的生产批次号统计</p>
              <p>• 交货批次数基于出库数据的生产批次号统计</p>
              <p>• 如果该月份数据已存在，将进行更新操作</p>
            </template>
          </el-alert>
        </el-form>
      </div>

      <!-- 批量同步模式 -->
      <div v-else-if="syncMode === 'batch'">
        <el-form
          ref="batchFormRef"
          :model="batchFormData"
          :rules="batchFormRules"
          label-width="120px"
          class="sync-form"
        >
          <el-form-item label="同步范围">
            <el-button 
              type="primary" 
              @click="loadSyncRange" 
              :loading="loadingRange"
              size="small"
            >
              获取需要同步的月份
            </el-button>
          </el-form-item>

          <el-form-item v-if="syncRange.length > 0" label="待同步月份">
            <div class="sync-range-list">
              <el-tag
                v-for="item in syncRange"
                :key="`${item.year}-${item.month}`"
                type="warning" plain
                class="range-tag"
              >
                {{ item.label }}
              </el-tag>
            </div>
            <p class="range-info" style="margin-left: 4px;">共 {{ syncRange.length }} 个月份需要同步</p>
          </el-form-item>

          <el-form-item v-if="syncRange.length === 0 && !loadingRange" label="同步状态">
            <el-alert
              title="暂无需要同步的数据"
              type="success"
              :closable="false"
              show-icon
            />
          </el-form-item>

          <el-form-item label="备注" prop="remarks">
            <el-input
              v-model="batchFormData.remarks"
              type="textarea"
              :rows="3"
              placeholder="请输入备注信息（可选）"
              maxlength="500"
              show-word-limit
            />
          </el-form-item>

          <el-alert
            v-if="syncRange.length > 0"
            title="批量同步说明"
            type="warning"
            :closable="false"
            show-icon
          >
            <template #default>
              <p>• 系统将批量同步所有待同步月份的ERP数据</p>
              <p>• 同步过程可能需要较长时间，请耐心等待</p>
              <p>• 如果某个月份同步失败，不会影响其他月份</p>
            </template>
          </el-alert>
        </el-form>
      </div>

      <template #footer>
        <div class="dialog-footer">
          <el-button @click="handleReset">重置</el-button>
          <el-button @click="handleClose">取消</el-button>
          <el-button 
            type="primary" 
            @click="handleSubmit" 
            :loading="loading"
            :disabled="syncMode === 'batch' && syncRange.length === 0"
          >
            {{ getSubmitButtonText() }}
          </el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
/**
 * 同步数据表单组件
 * 
 * 功能说明：
 * 1. 提供MonthlyBatchStats表数据录入表单
 * 2. 包含年份、月份、交检批次数、交货批次数、备注字段
 * 3. 支持表单验证和重置功能
 * 4. 提交数据到后端API保存
 * 5. 支持ERP同步和批量同步功能
 */

import { ref, reactive, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import api from '@/api'

// Props定义
const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  }
})

// Emits定义
const emit = defineEmits(['update:modelValue', 'success'])

// 响应式数据
const visible = ref(props.modelValue)
const loading = ref(false)
const loadingRange = ref(false)
const formRef = ref()
const erpFormRef = ref()
const batchFormRef = ref()
const syncMode = ref('manual') // manual, erp, batch
const syncRange = ref([])

// 手动输入表单数据
const form = reactive({
  StatYear: new Date().getFullYear().toString(),
  StatMonth: (new Date().getMonth() + 1).toString(),
  InspectionBatches: 0,
  DeliveryBatches: 0,
  Remarks: ''
})

// ERP同步表单数据
const erpFormData = reactive({
  year: new Date().getFullYear().toString(),
  month: (new Date().getMonth() + 1).toString(),
  remarks: ''
})

// 批量同步表单数据
const batchFormData = reactive({
  remarks: ''
})

// 月份选项
const months = [
  { value: '1', label: '1月' },
  { value: '2', label: '2月' },
  { value: '3', label: '3月' },
  { value: '4', label: '4月' },
  { value: '5', label: '5月' },
  { value: '6', label: '6月' },
  { value: '7', label: '7月' },
  { value: '8', label: '8月' },
  { value: '9', label: '9月' },
  { value: '10', label: '10月' },
  { value: '11', label: '11月' },
  { value: '12', label: '12月' }
]

// 手动输入表单验证规则
const formRules = {
  StatYear: [
    { required: true, message: '请选择统计年份', trigger: 'change' }
  ],
  StatMonth: [
    { required: true, message: '请选择统计月份', trigger: 'change' }
  ],
  InspectionBatches: [
    { required: true, message: '请输入交检批次数', trigger: 'blur' },
    { type: 'number', min: 0, message: '交检批次数不能小于0', trigger: 'blur' }
  ],
  DeliveryBatches: [
    { required: true, message: '请输入交货批次数', trigger: 'blur' },
    { type: 'number', min: 0, message: '交货批次数不能小于0', trigger: 'blur' }
  ]
}

// ERP同步表单验证规则
const erpFormRules = {
  year: [
    { required: true, message: '请选择统计年份', trigger: 'change' }
  ],
  month: [
    { required: true, message: '请选择统计月份', trigger: 'change' }
  ]
}

// 批量同步表单验证规则
const batchFormRules = {}

// 监听props变化
watch(() => props.modelValue, (newVal) => {
  visible.value = newVal
})

// 监听visible变化
watch(visible, (newVal) => {
  emit('update:modelValue', newVal)
})

/**
 * 获取提交按钮文本
 */
const getSubmitButtonText = () => {
  switch (syncMode.value) {
    case 'manual':
      return '确定'
    case 'erp':
      return 'ERP同步'
    case 'batch':
      return '批量同步'
    default:
      return '确定'
  }
}

/**
 * 同步模式变化处理
 */
const handleSyncModeChange = (mode) => {
  syncRange.value = []
  if (mode === 'batch') {
    loadSyncRange()
  }
}

// 监听同步模式变化
watch(syncMode, (newMode) => {
  if (newMode === 'batch') {
    loadSyncRange()
  }
})



/**
 * 加载同步范围
 */
const loadSyncRange = async () => {
  try {
    loadingRange.value = true
    const response = await api.get('/api/monthly-batch-stats/sync-range')
    
    if (response.data.success) {
      syncRange.value = response.data.data.monthsToSync || []
      
      if (syncRange.value.length > 0) {
        ElMessage.success(`找到 ${syncRange.value.length} 个月份需要同步`)
      } else {
        ElMessage.info('当前没有需要同步的月份数据')
      }
    } else {
      ElMessage.error(response.data.message || '获取同步范围失败')
    }
  } catch (error) {
    console.error('获取同步范围失败:', error)
    ElMessage.error('获取同步范围失败，请重试')
  } finally {
    loadingRange.value = false
  }
}

/**
 * 手动输入提交
 */
const handleManualSubmit = async () => {
  try {
    await formRef.value.validate()
    
    const response = await api.post('/api/monthly-batch-stats', {
      StatYear: parseInt(form.StatYear),
      StatMonth: parseInt(form.StatMonth),
      InspectionBatches: form.InspectionBatches,
      DeliveryBatches: form.DeliveryBatches,
      Remarks: form.Remarks
    })
    
    if (response.data.success) {
      ElMessage.success('数据保存成功')
      emit('success', response.data.data)
      handleClose()
    } else {
      ElMessage.error(response.data.message || '保存失败')
    }
  } catch (error) {
    console.error('手动提交失败:', error)
    ElMessage.error('保存失败，请重试')
  }
}

/**
 * ERP同步提交
 */
const handleErpSubmit = async () => {
  try {
    await erpFormRef.value.validate()
    
    // 显示同步开始提示
    ElMessage.info('正在从ERP系统同步数据，请耐心等待...')
    
    const response = await api.post('/api/monthly-batch-stats/sync-erp-data', {
      year: parseInt(erpFormData.year),
      month: parseInt(erpFormData.month),
      remarks: erpFormData.remarks
    })
    
    if (response.data.success) {
      const data = response.data.data
      ElMessage.success(`${data.year}年${data.month}月ERP数据同步成功！交检批次：${data.inspectionBatches}，交货批次：${data.deliveryBatches}`)
      emit('success', data)
      handleClose()
    } else {
      ElMessage.error(response.data.message || 'ERP同步失败')
    }
  } catch (error) {
    console.error('ERP同步失败:', error)
    
    // 处理不同类型的错误
    if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
      ElMessage.error('ERP同步超时，数据量较大时请耐心等待。如果持续超时，请联系管理员检查ERP服务状态')
    } else if (error.response?.status === 500) {
      ElMessage.error('ERP服务器错误，请联系管理员检查ERP服务状态')
    } else if (error.response?.status === 404) {
      ElMessage.error('ERP接口不存在，请联系管理员检查ERP配置')
    } else {
      ElMessage.error('ERP同步失败，请检查网络连接和ERP服务状态')
    }
  }
}

/**
 * 批量同步提交
 */
const handleBatchSubmit = async () => {
  try {
    if (syncRange.value.length === 0) {
      ElMessage.warning('暂无需要同步的数据')
      return
    }
    
    const confirmResult = await ElMessageBox.confirm(
      `确定要批量同步 ${syncRange.value.length} 个月份的ERP数据吗？\n同步过程可能需要较长时间，请耐心等待。`,
      '批量同步确认',
      {
        confirmButtonText: '确定同步',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    
    if (confirmResult !== 'confirm') return
    
    const months = syncRange.value.map(item => ({
      year: item.year,
      month: item.month
    }))
    
    const response = await api.post('/api/monthly-batch-stats/batch-sync-erp-data', {
      months,
      remarks: batchFormData.remarks
    })
    
    if (response.data.success) {
      const { successCount, errorCount, totalCount } = response.data.data
      ElMessage.success(`批量同步完成！成功：${successCount}个，失败：${errorCount}个，总计：${totalCount}个`)
      
      if (errorCount > 0) {
        console.warn('部分月份同步失败:', response.data.data.errors)
      }
      
      emit('success', response.data.data)
      handleClose()
    } else {
      ElMessage.error(response.data.message || '批量同步失败')
    }
  } catch (error) {
    if (error.message !== 'cancel') {
      console.error('批量同步失败:', error)
      
      // 处理不同类型的错误
      if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
        ElMessage.error('批量同步超时，数据量较大时请耐心等待。建议分批次进行同步')
      } else if (error.response?.status === 500) {
        ElMessage.error('ERP服务器错误，请联系管理员检查ERP服务状态')
      } else {
        ElMessage.error('批量同步失败，请重试')
      }
    }
  }
}

/**
 * 处理表单提交
 */
const handleSubmit = async () => {
  loading.value = true
  try {
    switch (syncMode.value) {
      case 'manual':
        await handleManualSubmit()
        break
      case 'erp':
        await handleErpSubmit()
        break
      case 'batch':
        await handleBatchSubmit()
        break
      default:
        ElMessage.error('未知的同步模式')
    }
  } finally {
    loading.value = false
  }
}

/**
 * 处理表单重置
 */
const handleReset = () => {
  // 重置手动输入表单
  formRef.value?.resetFields()
  form.StatYear = new Date().getFullYear().toString()
  form.StatMonth = (new Date().getMonth() + 1).toString()
  form.InspectionBatches = 0
  form.DeliveryBatches = 0
  form.Remarks = ''
  
  // 重置ERP同步表单
  erpFormRef.value?.resetFields()
  erpFormData.year = new Date().getFullYear().toString()
  erpFormData.month = (new Date().getMonth() + 1).toString()
  erpFormData.remarks = ''
  
  // 重置批量同步表单
  batchFormRef.value?.resetFields()
  batchFormData.remarks = ''
  syncRange.value = []
  
  // 重置同步模式
  syncMode.value = 'manual'
}

/**
 * 处理对话框关闭
 */
const handleClose = () => {
  visible.value = false
  // 延迟重置表单，避免关闭动画时看到表单重置
  setTimeout(() => {
    handleReset()
  }, 300)
}
</script>

<style scoped>
.sync-data-form {
  .sync-mode-selector {
    margin-bottom: 20px;
    text-align: center;
  }

  .sync-form {
    margin-top: 20px;
  }

  .sync-range-list {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px;
    margin-bottom: 10px;
  }

  .range-tag {
    margin: 0;
    height: 24px;
    line-height: 24px;
    padding: 0 8px;
    display: inline-block;
  }

  .range-info {
    margin: 0;
    font-size: 14px;
    color: #666;
  }

  .dialog-footer {
    text-align: right;
  }

  .el-alert {
    margin-top: 15px;
  }

  .el-alert p {
    margin: 5px 0;
    line-height: 1.4;
  }

  .el-form-item {
    margin-bottom: 20px;
  }

  .el-radio-group {
    .el-radio-button {
      margin-right: 0;
    }
  }
}
</style>

<style scoped>
.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

:deep(.el-form-item__label) {
  font-weight: 600;
}

:deep(.el-input-number) {
  width: 100%;
}

:deep(.el-input-number .el-input__inner) {
  text-align: left;
}
</style>