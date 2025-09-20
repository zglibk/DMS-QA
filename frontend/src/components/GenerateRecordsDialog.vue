<template>
  <el-dialog
    v-model="dialogVisible"
    title="生成考核记录"
    width="500px"
    :before-close="handleClose"
    :close-on-click-modal="false"
  >
    <div class="dialog-content">
      <!-- 日期范围选择 -->
      <!-- 注意：新版本存储过程已优化，不再需要日期参数，此选项已禁用 -->
      <div class="form-item">
        <label class="form-label">日期范围（已优化，无需选择）</label>
        <el-date-picker
          v-model="dateRange"
          type="daterange"
          range-separator="至"
          start-placeholder="开始日期"
          end-placeholder="结束日期"
          format="YYYY-MM-DD"
          value-format="YYYY-MM-DD"
          :disabled="true"
          style="width: 100%"
        />
        <el-text type="info" size="small" style="margin-top: 5px; display: block;">
          新版本存储过程会自动处理所有未生成的考核记录，无需指定日期范围
        </el-text>
      </div>

      <!-- 重置记录控制 -->
      <div class="form-item">
        <label class="form-label">重置记录控制：</label>
        <div class="switch-container">
          <el-switch
            v-model="resetRecords"
            active-text="是"
            inactive-text="否"
            active-color="#13ce66"
            inactive-color="#ff4949"
          />
          <el-tooltip
            content="开启后将删除现有考核记录并重新生成，关闭时仅生成不存在的记录"
            placement="top"
          >
            <el-icon class="info-icon"><InfoFilled /></el-icon>
          </el-tooltip>
        </div>
      </div>

      <!-- 初始化开关 -->
      <div class="form-item">
        <label class="form-label">初始化数据表自增ID：</label>
        <div class="switch-container">
          <el-switch
            v-model="resetAutoIncrement"
            :disabled="!resetRecords"
            active-text="是"
            inactive-text="否"
            active-color="#13ce66"
            inactive-color="#ff4949"
          />
          <el-tooltip
            content="开启后将重置AssessmentRecords表的自增ID，仅在重置记录时可用"
            placement="top"
          >
            <el-icon class="info-icon"><InfoFilled /></el-icon>
          </el-tooltip>
        </div>
      </div>

      <!-- 提示信息 -->
      <div class="tips">
        <el-alert
          title="提示"
          type="info"
          :closable="false"
          show-icon
        >
          <template #default>
            <p>• 系统将自动生成所有未处理的考核记录（投诉、返工、异常）</p>
            <p>• 重置记录控制：开启时删除现有记录重新生成，关闭时仅生成不存在的记录</p>
            <p>• 初始化自增ID：仅在重置记录时可用，会重置表的ID计数器</p>
            <p>• 新版本已优化：无需指定日期范围，自动处理所有数据源</p>
          </template>
        </el-alert>
      </div>
    </div>

    <!-- 对话框底部按钮 -->
    <template #footer>
      <span class="dialog-footer">
        <el-button @click="handleCancel">取消</el-button>
        <el-button 
          type="primary" 
          @click="handleConfirm"
          :loading="loading"
        >
          {{ loading ? '生成中...' : '确认生成' }}
        </el-button>
      </span>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { InfoFilled } from '@element-plus/icons-vue'

/**
 * 组件属性定义
 */
const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  }
})

/**
 * 组件事件定义
 */
const emit = defineEmits(['update:visible', 'confirm'])

/**
 * 响应式数据
 */
const dialogVisible = ref(false)
const dateRange = ref([])
const resetRecords = ref(false)
const resetAutoIncrement = ref(false)
const loading = ref(false)

/**
 * 监听visible属性变化，同步对话框显示状态
 * @param {boolean} newVal - 新的可见状态
 */
watch(() => props.visible, (newVal) => {
  dialogVisible.value = newVal
  if (newVal) {
    // 对话框打开时初始化数据
    initializeData()
  }
})

/**
 * 监听重置记录控制变化，联动自增ID控制
 * @param {boolean} newVal - 新的重置记录状态
 */
watch(resetRecords, (newVal) => {
  if (!newVal) {
    // 关闭重置记录时，同时关闭自增ID重置
    resetAutoIncrement.value = false
  }
})

/**
 * 监听对话框显示状态变化，同步到父组件
 * @param {boolean} newVal - 新的对话框显示状态
 */
watch(dialogVisible, (newVal) => {
  emit('update:visible', newVal)
})

/**
 * 初始化对话框数据
 * 设置默认的日期范围为当前年份
 */
function initializeData() {
  const currentYear = new Date().getFullYear()
  dateRange.value = [
    `${currentYear}-01-01`,
    `${currentYear}-12-31`
  ]
  resetRecords.value = false
  resetAutoIncrement.value = false
  loading.value = false
}

/**
 * 处理对话框关闭事件
 * @param {Function} done - 关闭对话框的回调函数
 */
function handleClose(done) {
  if (loading.value) {
    ElMessage.warning('正在生成考核记录，请稍候...')
    return
  }
  done()
}

/**
 * 处理取消按钮点击事件
 * 关闭对话框并重置数据
 */
function handleCancel() {
  if (loading.value) {
    ElMessage.warning('正在生成考核记录，请稍候...')
    return
  }
  dialogVisible.value = false
}

/**
 * 处理确认按钮点击事件
 * 验证数据并触发生成考核记录
 * 新版本：存储过程已优化，不再需要日期参数，自动处理所有未生成的记录
 */
function handleConfirm() {
  // 构建参数对象（新版本只需要重置选项）
  const params = {
    resetRecords: resetRecords.value,
    resetAutoIncrement: resetAutoIncrement.value
  }

  // 设置加载状态
  loading.value = true

  // 触发确认事件，传递参数给父组件
  emit('confirm', params)
}

/**
 * 重置加载状态
 * 供父组件调用，用于在生成完成后重置状态
 */
function resetLoading() {
  loading.value = false
}

/**
 * 关闭对话框
 * 供父组件调用，用于在生成完成后关闭对话框
 */
function closeDialog() {
  dialogVisible.value = false
}

// 暴露方法给父组件
defineExpose({
  resetLoading,
  closeDialog
})
</script>

<style scoped>
.dialog-content {
  padding: 10px 0;
}

.form-item {
  margin-bottom: 20px;
}

.form-label {
  display: block;
  margin-bottom: 8px;
  font-weight: 500;
  color: #606266;
}

.switch-container {
  display: flex;
  align-items: center;
  gap: 8px;
}

.info-icon {
  color: #909399;
  cursor: pointer;
  font-size: 16px;
}

.info-icon:hover {
  color: #409eff;
}

.tips {
  margin-top: 20px;
}

.tips :deep(.el-alert__content) {
  padding-left: 8px;
}

.tips p {
  margin: 4px 0;
  font-size: 13px;
  line-height: 1.4;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .dialog-content {
    padding: 5px 0;
  }
  
  .form-item {
    margin-bottom: 15px;
  }
}
</style>