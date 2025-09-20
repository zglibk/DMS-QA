<template>
  <el-dialog
    v-model="dialogVisible"
    title="考核记录历史"
    width="900px"
    :before-close="handleClose"
    :close-on-click-modal="false"
  >
    <!-- 考核记录基本信息 -->
    <div class="record-info" v-if="recordInfo">
      <el-card class="info-card" shadow="never">
        <template #header>
          <div class="card-header">
            <span>考核记录信息</span>
          </div>
        </template>
        <el-row :gutter="20">
          <el-col :span="6">
            <div class="info-item">
              <label>员工姓名：</label>
              <span>{{ recordInfo.PersonName }}</span>
            </div>
          </el-col>
          <el-col :span="6">
            <div class="info-item">
              <label>投诉编号：</label>
              <span>{{ recordInfo.ComplaintNumber }}</span>
            </div>
          </el-col>
          <el-col :span="6">
            <div class="info-item">
              <label>考核金额：</label>
              <span class="amount">¥{{ recordInfo.AssessmentAmount }}</span>
            </div>
          </el-col>
          <el-col :span="6">
            <div class="info-item">
              <label>考核日期：</label>
              <span>{{ formatDate(recordInfo.AssessmentDate) }}</span>
            </div>
          </el-col>
        </el-row>
      </el-card>
    </div>

    <!-- 历史记录列表 -->
    <div class="history-section">
      <h4>历史变更记录</h4>
      <div v-loading="loading" class="history-content">
        <div v-if="historyList.length === 0 && !loading" class="no-data">
          <el-empty description="暂无历史记录" />
        </div>
        <el-timeline v-else>
          <el-timeline-item
            v-for="item in historyList"
            :key="item.id"
            :timestamp="formatDateTime(item.operationTime)"
            :type="getTimelineType(item.action)"
            placement="top"
          >
            <el-card class="history-item" shadow="hover">
              <div class="history-header">
                <el-tag :type="getActionTagType(item.action)" size="small">
                  {{ getActionLabel(item.action) }}
                </el-tag>
                <span class="operator" v-if="item.operatorName">
                  操作人：{{ item.operatorName }}
                </span>
              </div>
              
              <!-- 变更内容 -->
              <div class="history-content" v-if="item.oldValue || item.newValue">
                <div class="change-item" v-if="item.action === 'UPDATE'">
                  <div class="change-row" v-if="item.oldValue && item.newValue">
                    <div class="change-label">变更前：</div>
                    <div class="change-value old-value">
                      {{ formatChangeValue(item.oldValue) }}
                    </div>
                  </div>
                  <div class="change-row" v-if="item.newValue">
                    <div class="change-label">变更后：</div>
                    <div class="change-value new-value">
                      {{ formatChangeValue(item.newValue) }}
                    </div>
                  </div>
                </div>
                <div class="change-item" v-else-if="item.action === 'CREATE'">
                  <div class="change-row">
                    <div class="change-label">创建内容：</div>
                    <div class="change-value">
                      {{ formatChangeValue(item.newValue) }}
                    </div>
                  </div>
                </div>
                <div class="change-item" v-else-if="item.action === 'RETURN'">
                  <div class="change-row">
                    <div class="change-label">返还信息：</div>
                    <div class="change-value return-value">
                      {{ formatChangeValue(item.newValue) }}
                    </div>
                  </div>
                </div>
              </div>
              
              <!-- 备注信息 -->
              <div class="remarks" v-if="item.remarks">
                <div class="remarks-label">备注：</div>
                <div class="remarks-content">{{ item.remarks }}</div>
              </div>
            </el-card>
          </el-timeline-item>
        </el-timeline>
      </div>
    </div>

    <!-- 对话框底部 -->
    <template #footer>
      <div class="dialog-footer">
        <el-button @click="handleClose">关闭</el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, reactive, computed, watch } from 'vue'
import { ElMessage } from 'element-plus'
import * as assessmentApi from '@/services/assessmentApi'

// 组件属性定义
const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  },
  recordId: {
    type: [Number, String],
    default: null
  }
})

// 事件定义
const emit = defineEmits(['update:visible'])

// 响应式数据
const loading = ref(false)
const recordInfo = ref(null)
const historyList = ref([])

// 计算属性
const dialogVisible = computed({
  get: () => props.visible,
  set: (value) => emit('update:visible', value)
})

// 监听对话框显示状态
watch(() => props.visible, (newVal) => {
  if (newVal && props.recordId) {
    loadHistoryData()
  }
})

/**
 * 加载历史数据
 * 根据考核记录ID获取历史记录信息
 */
const loadHistoryData = async () => {
  if (!props.recordId) {
    ElMessage.error('缺少考核记录ID')
    return
  }

  try {
    loading.value = true
    console.log('正在获取历史记录，ID:', props.recordId)
    
    const response = await assessmentApi.getAssessmentHistory(props.recordId)
    console.log('API响应:', response)
    
    // 检查响应数据结构
    if (response && response.data) {
      if (response.data.success !== false) {
        // 直接使用response.data，因为axios会自动解析JSON
        recordInfo.value = response.data.recordInfo
        historyList.value = response.data.history || []
        console.log('历史记录加载成功:', historyList.value.length, '条记录')
      } else {
        ElMessage.error(response.data.message || '获取历史记录失败')
      }
    } else if (response && response.success) {
      // 兼容直接返回success字段的情况
      recordInfo.value = response.data.recordInfo
      historyList.value = response.data.history || []
      console.log('历史记录加载成功:', historyList.value.length, '条记录')
    } else {
      console.error('响应数据格式异常:', response)
      ElMessage.error('响应数据格式异常')
    }
  } catch (error) {
    console.error('获取历史记录失败:', error)
    console.error('错误详情:', error.response?.data || error.message)
    
    // 显示更详细的错误信息
    if (error.response?.data?.message) {
      ElMessage.error(error.response.data.message)
    } else if (error.response?.status) {
      ElMessage.error(`请求失败 (${error.response.status}): ${error.response.statusText}`)
    } else {
      ElMessage.error('网络连接失败，请检查网络或联系管理员')
    }
  } finally {
    loading.value = false
  }
}

/**
 * 获取操作类型对应的标签类型
 * @param {string} action - 操作类型
 * @returns {string} 标签类型
 */
const getActionTagType = (action) => {
  const typeMap = {
    'CREATE': 'success',
    'UPDATE': 'warning',
    'RETURN': 'info',
    'CANCEL': 'danger'
  }
  return typeMap[action] || 'info'
}

/**
 * 获取操作类型对应的时间线类型
 * @param {string} action - 操作类型
 * @returns {string} 时间线类型
 */
const getTimelineType = (action) => {
  const typeMap = {
    'CREATE': 'success',
    'UPDATE': 'warning',
    'RETURN': 'primary',
    'CANCEL': 'danger'
  }
  return typeMap[action] || 'info'
}

/**
 * 获取操作类型对应的中文标签
 * @param {string} action - 操作类型
 * @returns {string} 中文标签
 */
const getActionLabel = (action) => {
  const labelMap = {
    'CREATE': '创建记录',
    'UPDATE': '更新记录',
    'RETURN': '处理返还',
    'CANCEL': '取消记录'
  }
  return labelMap[action] || action
}

/**
 * 格式化变更值
 * @param {any} value - 变更值
 * @returns {string} 格式化后的字符串
 */
const formatChangeValue = (value) => {
  if (value === null || value === undefined) {
    return '无'
  }
  
  if (typeof value === 'object') {
    // 如果是对象，尝试格式化显示
    try {
      const entries = Object.entries(value)
      return entries.map(([key, val]) => `${key}: ${val}`).join(', ')
    } catch (e) {
      return JSON.stringify(value)
    }
  }
  
  return String(value)
}

/**
 * 格式化日期
 * @param {string|Date} date - 日期
 * @returns {string} 格式化后的日期字符串
 */
const formatDate = (date) => {
  if (!date) return ''
  const d = new Date(date)
  return d.toLocaleDateString('zh-CN')
}

/**
 * 格式化日期时间
 * @param {string|Date} datetime - 日期时间
 * @returns {string} 格式化后的日期时间字符串
 */
const formatDateTime = (datetime) => {
  if (!datetime) return ''
  const d = new Date(datetime)
  return d.toLocaleString('zh-CN')
}

/**
 * 处理对话框关闭
 */
const handleClose = () => {
  dialogVisible.value = false
  // 清空数据
  recordInfo.value = null
  historyList.value = []
}
</script>

<style scoped>
.record-info {
  margin-bottom: 20px;
}

.info-card {
  border: 1px solid #e4e7ed;
}

.card-header {
  font-weight: 600;
  color: #303133;
}

.info-item {
  margin-bottom: 10px;
}

.info-item label {
  font-weight: 500;
  color: #606266;
  margin-right: 8px;
}

.info-item .amount {
  color: #f56c6c;
  font-weight: 600;
}

.history-section h4 {
  margin: 0 0 16px 0;
  color: #303133;
  font-weight: 600;
}

.history-content {
  min-height: 200px;
}

.no-data {
  text-align: center;
  padding: 40px 0;
}

.history-item {
  margin-bottom: 8px;
}

.history-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.operator {
  font-size: 12px;
  color: #909399;
}

.change-item {
  margin-bottom: 12px;
}

.change-row {
  display: flex;
  margin-bottom: 8px;
  align-items: flex-start;
}

.change-label {
  min-width: 80px;
  font-weight: 500;
  color: #606266;
  margin-right: 12px;
}

.change-value {
  flex: 1;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 13px;
}

.old-value {
  background-color: #fef0f0;
  color: #f56c6c;
  border: 1px solid #fbc4c4;
}

.new-value {
  background-color: #f0f9ff;
  color: #409eff;
  border: 1px solid #b3d8ff;
}

.return-value {
  background-color: #f0f9f0;
  color: #67c23a;
  border: 1px solid #c2e7b0;
}

.remarks {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid #ebeef5;
}

.remarks-label {
  font-weight: 500;
  color: #606266;
  margin-bottom: 4px;
}

.remarks-content {
  color: #909399;
  font-size: 13px;
  line-height: 1.5;
}

.dialog-footer {
  text-align: right;
}

:deep(.el-timeline-item__timestamp) {
  font-size: 12px;
  color: #909399;
}

:deep(.el-card__body) {
  padding: 16px;
}
</style>