<template>
  <el-dialog
    v-model="dialogVisible"
    title="发现重复记录"
    width="700px"
    :before-close="handleClose"
    :close-on-click-modal="false"
    custom-class="duplicate-records-dialog"
  >
    <!-- 对话框头部提示 -->
    <div class="dialog-header">
      <el-alert
        title="系统检测到以下人员在指定月份已存在考核记录"
        type="warning"
        :closable="false"
        show-icon
      />
    </div>

    <!-- 重复记录表格 -->
    <div class="records-container">
      <el-table
        :data="paginatedRecords"
        stripe
        border
        style="width: 100%"
        max-height="300"
        :header-cell-style="{ 
          background: '#f5f7fa', 
          color: '#606266',
          fontWeight: '600',
          textAlign: 'center'
        }"
      >
        <el-table-column
          prop="PersonName"
          label="人员姓名"
          width="150"
          align="center"
        />
        <el-table-column
          prop="AssessmentMonth"
          label="考核月份"
          width="120"
          align="center"
        />
        <el-table-column
          label="状态"
          width="100"
          align="center"
        >
          <template #default>
            <el-tag type="warning" size="small">已存在</el-tag>
          </template>
        </el-table-column>
        <el-table-column
          label="操作建议"
          align="center"
        >
          <template #default>
            <span class="suggestion-text">选择"覆盖记录"将删除现有记录并重新生成</span>
          </template>
        </el-table-column>
      </el-table>

      <!-- 分页组件 -->
      <div class="pagination-container" v-if="duplicateRecords.length > pageSize">
        <el-pagination
          v-model:current-page="currentPage"
          :page-size="pageSize"
          :total="duplicateRecords.length"
          layout="prev, pager, next, total"
          small
          @current-change="handlePageChange"
        />
      </div>
    </div>

    <!-- 统计信息 -->
    <div class="statistics-info">
      <el-descriptions :column="3" size="small" border>
        <el-descriptions-item label="重复记录总数">
          <el-tag type="danger">{{ duplicateRecords.length }} 条</el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="涉及人员">
          <el-tag type="warning">{{ uniquePersons.length }} 人</el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="涉及月份">
          <el-tag type="info">{{ uniqueMonths.length }} 个月</el-tag>
        </el-descriptions-item>
      </el-descriptions>
    </div>

    <!-- 操作提示 -->
    <div class="operation-tips">
      <el-alert
        type="info"
        :closable="false"
        show-icon
      >
        <template #default>
          <div class="tips-content">
            <p><strong>操作说明：</strong></p>
            <ul>
              <li><strong>覆盖记录：</strong>删除现有的重复记录，重新生成新的考核记录</li>
              <li><strong>取消操作：</strong>保留现有记录，不进行任何更改</li>
            </ul>
          </div>
        </template>
      </el-alert>
    </div>

    <!-- 对话框底部按钮 -->
    <template #footer>
      <div class="dialog-footer">
        <el-button @click="handleCancel" size="default">
          <el-icon><Close /></el-icon>
          取消操作
        </el-button>
        <el-button 
          type="danger" 
          @click="handleConfirm"
          :loading="loading"
          size="default"
        >
          <el-icon><RefreshRight /></el-icon>
          {{ loading ? '处理中...' : '覆盖记录' }}
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { Close, RefreshRight } from '@element-plus/icons-vue'

/**
 * 组件属性定义
 */
const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  },
  duplicateRecords: {
    type: Array,
    default: () => []
  },
  loading: {
    type: Boolean,
    default: false
  }
})

/**
 * 组件事件定义
 */
const emit = defineEmits(['update:visible', 'confirm', 'cancel'])

/**
 * 响应式数据
 */
const dialogVisible = ref(false)
const currentPage = ref(1)
const pageSize = ref(10)

/**
 * 监听visible属性变化，同步对话框显示状态
 * @param {boolean} newVal - 新的可见状态
 */
watch(() => props.visible, (newVal) => {
  dialogVisible.value = newVal
  if (newVal) {
    // 对话框打开时重置分页
    currentPage.value = 1
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
 * 计算属性：分页后的记录
 */
const paginatedRecords = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  const end = start + pageSize.value
  return props.duplicateRecords.slice(start, end)
})

/**
 * 计算属性：唯一人员数量
 */
const uniquePersons = computed(() => {
  const persons = new Set(props.duplicateRecords.map(record => record.PersonName))
  return Array.from(persons)
})

/**
 * 计算属性：唯一月份数量
 */
const uniqueMonths = computed(() => {
  const months = new Set(props.duplicateRecords.map(record => record.AssessmentMonth))
  return Array.from(months)
})

/**
 * 处理分页变化
 * @param {number} page - 新的页码
 */
const handlePageChange = (page) => {
  currentPage.value = page
}

/**
 * 处理对话框关闭事件
 * @param {Function} done - 关闭对话框的回调函数
 */
const handleClose = (done) => {
  if (props.loading) {
    return
  }
  done()
}

/**
 * 处理取消按钮点击事件
 */
const handleCancel = () => {
  if (props.loading) {
    return
  }
  emit('cancel')
  dialogVisible.value = false
}

/**
 * 处理确认按钮点击事件
 */
const handleConfirm = () => {
  emit('confirm')
}
</script>

<style scoped>
.dialog-header {
  margin-bottom: 20px;
}

.records-container {
  margin: 20px 0;
}

.pagination-container {
  margin-top: 15px;
  text-align: center;
}

.statistics-info {
  margin: 20px 0;
}

.operation-tips {
  margin: 20px 0;
}

.tips-content p {
  margin: 0 0 8px 0;
  font-weight: 600;
}

.tips-content ul {
  margin: 8px 0 0 0;
  padding-left: 20px;
}

.tips-content li {
  margin: 4px 0;
  line-height: 1.5;
}

.suggestion-text {
  color: #909399;
  font-size: 12px;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

/* 全局样式覆盖 */
:deep(.duplicate-records-dialog) {
  .el-dialog__header {
    background: linear-gradient(135deg, #ffeaa7 0%, #fab1a0 100%);
    color: #2d3436;
    border-radius: 8px 8px 0 0;
  }
  
  .el-dialog__title {
    font-weight: 600;
    font-size: 16px;
  }
  
  .el-dialog__body {
    padding: 20px 25px;
  }
  
  .el-dialog__footer {
    padding: 15px 25px 20px;
    background: #fafbfc;
    border-radius: 0 0 8px 8px;
  }
}

/* 表格样式优化 */
:deep(.el-table) {
  border-radius: 6px;
  overflow: hidden;
}

:deep(.el-table .el-table__cell) {
  padding: 6px 0;
}

:deep(.el-table .el-table__row:hover > td) {
  background-color: #f5f7fa !important;
}

/* 分页样式 */
:deep(.el-pagination) {
  justify-content: center;
}

:deep(.el-pagination .el-pager li) {
  min-width: 28px;
  height: 28px;
  line-height: 28px;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .records-container {
    margin: 15px 0;
  }
  
  .statistics-info {
    margin: 15px 0;
  }
  
  .operation-tips {
    margin: 15px 0;
  }
  
  :deep(.el-descriptions) {
    .el-descriptions__body .el-descriptions__table {
      font-size: 12px;
    }
  }
}
</style>