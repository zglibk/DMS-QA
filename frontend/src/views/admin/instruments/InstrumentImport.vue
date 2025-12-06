<template>
  <div class="import-container">
    <!-- 页面头部 -->
    <div class="page-header">
      <div class="header-left">
        <h2 class="page-title">批量导入仪器</h2>
        <span class="page-desc">从Excel文件批量导入仪器台账和校准记录</span>
      </div>
      <div class="header-right">
        <el-button @click="handleDownloadTemplate">
          <el-icon><Download /></el-icon>
          下载导入模板
        </el-button>
        <el-button type="primary" @click="$router.push('/admin/instruments')">
          <el-icon><Back /></el-icon>
          返回台账列表
        </el-button>
      </div>
    </div>

    <!-- 导入步骤 -->
    <el-card class="steps-card" shadow="never">
      <el-steps :active="currentStep" finish-status="success" align-center>
        <el-step title="上传文件" description="选择Excel文件" />
        <el-step title="数据预览" description="确认导入数据" />
        <el-step title="导入完成" description="查看导入结果" />
      </el-steps>
    </el-card>

    <!-- 步骤1：上传文件 -->
    <el-card v-if="currentStep === 0" class="content-card" shadow="never">
      <div class="upload-area">
        <el-upload
          ref="uploadRef"
          class="upload-dragger"
          drag
          action="#"
          :auto-upload="false"
          :limit="1"
          :show-file-list="false"
          accept=".xlsx,.xls"
          :on-change="handleFileChange"
          :on-exceed="handleExceed"
        >
          <el-icon class="upload-icon"><Upload /></el-icon>
          <div class="upload-text">将Excel文件拖到此处，或<em>点击上传</em></div>
          <template #tip>
            <div class="upload-tip">
              支持 .xlsx、.xls 格式，文件大小不超过 20MB
            </div>
          </template>
        </el-upload>

        <div class="upload-actions" v-if="selectedFile">
          <div class="file-info">
            <el-icon><Document /></el-icon>
            <span class="file-name">{{ selectedFile.name }}</span>
            <span class="file-size">({{ formatFileSize(selectedFile.size) }})</span>
          </div>
          <el-button type="primary" @click="handlePreview" :loading="previewLoading">
            <el-icon><View /></el-icon>
            解析并预览
          </el-button>
        </div>
      </div>

      <!-- 导入说明 -->
      <div class="import-tips">
        <h4>导入说明</h4>
        <ul>
          <li>请先下载导入模板，按照模板格式填写数据</li>
          <li>管理编号和仪器/设备编号至少填写一项，仪器名称为必填项</li>
          <li>如果管理编号或仪器编号已存在，将更新该仪器信息</li>
          <li>如果填写了校准信息（校准机构、校准日期），将同时创建校准记录</li>
          <li>校准周期支持格式：1年、半年、6个月、12（纯数字表示月数）</li>
          <li>日期格式支持：YYYY-MM-DD 或 YYYYMMDD</li>
          <li>如果部门或人员不存在，系统将自动创建</li>
        </ul>
      </div>
    </el-card>

    <!-- 步骤2：数据预览 -->
    <el-card v-if="currentStep === 1" class="content-card preview-card" shadow="never">
      <!-- 统计信息 -->
      <div class="preview-stats">
        <div class="stat-item">
          <span class="stat-label">总记录数</span>
          <span class="stat-value">{{ previewStats.total }}</span>
        </div>
        <div class="stat-item new">
          <span class="stat-label">新增</span>
          <span class="stat-value">{{ previewStats.newCount }}</span>
        </div>
        <div class="stat-item update">
          <span class="stat-label">更新</span>
          <span class="stat-value">{{ previewStats.updateCount }}</span>
        </div>
        <div class="stat-item error">
          <span class="stat-label">错误</span>
          <span class="stat-value">{{ previewStats.errorCount }}</span>
        </div>
      </div>

      <!-- 预览表格 -->
      <el-table
        :data="previewData"
        style="width: 100%"
        max-height="450"
        :row-class-name="getRowClassName"
        size="small"
      >
        <el-table-column type="index" label="#" width="50" fixed />
        <el-table-column prop="status" label="状态" width="80" fixed>
          <template #default="{ row }">
            <el-tag :type="getStatusTagType(row.status)" size="small">
              {{ getStatusText(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="managementCode" label="管理编号" width="110" />
        <el-table-column prop="instrumentCode" label="仪器编号" width="130" show-overflow-tooltip />
        <el-table-column prop="instrumentName" label="仪器名称" width="140" show-overflow-tooltip />
        <el-table-column prop="model" label="型号" width="100" show-overflow-tooltip />
        <el-table-column prop="manufacturer" label="生产厂家" width="140" show-overflow-tooltip />
        <el-table-column prop="department" label="使用部门" width="100" />
        <el-table-column prop="responsiblePerson" label="管理人" width="80" />
        <el-table-column prop="calibrationCycle" label="校准周期" width="90" />
        <el-table-column prop="calibrationAgency" label="校准机构" width="160" show-overflow-tooltip />
        <el-table-column label="校准日期" width="100">
          <template #default="{ row }">
            {{ formatDate(row.calibrationDate) }}
          </template>
        </el-table-column>
        <el-table-column prop="certificateNumber" label="证书编号" width="130" show-overflow-tooltip />
        <el-table-column label="问题/警告" min-width="200">
          <template #default="{ row }">
            <div v-if="row.errors && row.errors.length > 0" class="error-text">
              <el-icon><CircleClose /></el-icon>
              {{ row.errors.join('; ') }}
            </div>
            <div v-if="row.warnings && row.warnings.length > 0" class="warning-text">
              <el-icon><Warning /></el-icon>
              {{ row.warnings.join('; ') }}
            </div>
          </template>
        </el-table-column>
      </el-table>

      <!-- 操作按钮 -->
      <div class="preview-actions">
        <el-button @click="handleBack">
          <el-icon><Back /></el-icon>
          重新选择文件
        </el-button>
        <el-button 
          type="primary" 
          @click="handleImport" 
          :loading="importLoading"
          :disabled="previewStats.total === 0 || previewStats.total === previewStats.errorCount"
        >
          <el-icon><Check /></el-icon>
          确认导入 ({{ previewStats.total - previewStats.errorCount }} 条)
        </el-button>
      </div>
    </el-card>

    <!-- 步骤3：导入结果 -->
    <el-card v-if="currentStep >= 2" class="content-card result-card" shadow="never">
      <div class="result-content">
        <el-result
          :icon="importResult.failed === 0 ? 'success' : 'warning'"
          :title="importResult.failed === 0 ? '导入成功' : '导入完成（部分失败）'"
        >
          <template #sub-title>
            <div class="result-stats">
              <p>新增：<span class="success">{{ importResult.success }}</span> 条</p>
              <p>更新：<span class="update">{{ importResult.updated }}</span> 条</p>
              <p v-if="importResult.failed > 0">失败：<span class="error">{{ importResult.failed }}</span> 条</p>
            </div>
          </template>
          <template #extra>
            <div class="result-actions">
              <el-button type="primary" @click="$router.push('/admin/instruments')">
                查看仪器台账
              </el-button>
              <el-button @click="handleReset">
                继续导入
              </el-button>
            </div>
          </template>
        </el-result>

        <!-- 失败详情 -->
        <div v-if="importResult.errors && importResult.errors.length > 0" class="error-details">
          <h4>失败详情</h4>
          <el-table :data="importResult.errors" size="small" max-height="200">
            <el-table-column prop="row" label="行号" width="80" />
            <el-table-column prop="managementCode" label="管理编号" width="120" />
            <el-table-column prop="error" label="错误原因" />
          </el-table>
        </div>
      </div>
    </el-card>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { 
  Upload, 
  Download, 
  Back, 
  Document, 
  View, 
  Check,
  CircleClose,
  Warning
} from '@element-plus/icons-vue'
import { instrumentApi } from '@/api/instruments'

// 当前步骤
const currentStep = ref(0)

// 文件相关
const uploadRef = ref()
const selectedFile = ref(null)
const previewLoading = ref(false)
const importLoading = ref(false)

// 预览数据
const previewData = ref([])
const previewStats = ref({
  total: 0,
  newCount: 0,
  updateCount: 0,
  errorCount: 0
})

// 导入结果
const importResult = ref({
  success: 0,
  updated: 0,
  failed: 0,
  errors: []
})

/**
 * 下载导入模板
 */
async function handleDownloadTemplate() {
  try {
    const response = await instrumentApi.downloadImportTemplate()
    const blob = new Blob([response.data], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = '仪器导入模板.xlsx'
    link.click()
    window.URL.revokeObjectURL(url)
    ElMessage.success('模板下载成功')
  } catch (error) {
    ElMessage.error('模板下载失败：' + (error.message || '未知错误'))
  }
}

/**
 * 文件选择变化
 */
function handleFileChange(file) {
  selectedFile.value = file.raw
}

/**
 * 文件超出限制
 */
function handleExceed() {
  ElMessage.warning('只能上传一个文件，请先移除已选文件')
}

/**
 * 解析并预览
 */
async function handlePreview() {
  if (!selectedFile.value) {
    ElMessage.warning('请先选择文件')
    return
  }

  try {
    previewLoading.value = true
    
    const formData = new FormData()
    formData.append('file', selectedFile.value)
    
    const response = await instrumentApi.previewImport(formData)
    
    if (response.data?.code === 200) {
      previewData.value = response.data.data.preview
      previewStats.value = response.data.data.stats
      currentStep.value = 1
    } else {
      ElMessage.error(response.data?.message || '解析失败')
    }
  } catch (error) {
    ElMessage.error('解析文件失败：' + (error.response?.data?.message || error.message || '未知错误'))
  } finally {
    previewLoading.value = false
  }
}

/**
 * 返回上一步
 */
function handleBack() {
  currentStep.value = 0
  previewData.value = []
  previewStats.value = { total: 0, newCount: 0, updateCount: 0, errorCount: 0 }
}

/**
 * 确认导入
 */
async function handleImport() {
  const validData = previewData.value.filter(item => item.status !== 'error')
  
  if (validData.length === 0) {
    ElMessage.warning('没有可导入的有效数据')
    return
  }

  try {
    await ElMessageBox.confirm(
      `确定要导入 ${validData.length} 条数据吗？`,
      '确认导入',
      {
        confirmButtonText: '确定导入',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )

    importLoading.value = true
    
    const response = await instrumentApi.executeImport(previewData.value)
    
    if (response.data?.code === 200) {
      importResult.value = response.data.data
      // 设为3使所有步骤都显示为完成状态
      currentStep.value = 3
      ElMessage.success(response.data.message)
    } else {
      ElMessage.error(response.data?.message || '导入失败')
    }
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('导入失败：' + (error.response?.data?.message || error.message || '未知错误'))
    }
  } finally {
    importLoading.value = false
  }
}

/**
 * 重置，继续导入
 */
function handleReset() {
  currentStep.value = 0
  selectedFile.value = null
  previewData.value = []
  previewStats.value = { total: 0, newCount: 0, updateCount: 0, errorCount: 0 }
  importResult.value = { success: 0, updated: 0, failed: 0, errors: [] }
  uploadRef.value?.clearFiles()
}

/**
 * 格式化文件大小
 */
function formatFileSize(bytes) {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / 1024 / 1024).toFixed(1) + ' MB'
}

/**
 * 格式化日期
 */
function formatDate(date) {
  if (!date) return ''
  const d = new Date(date)
  if (isNaN(d.getTime())) return ''
  return d.toLocaleDateString('zh-CN')
}

/**
 * 获取行样式类名
 */
function getRowClassName({ row }) {
  if (row.status === 'error') return 'row-error'
  if (row.status === 'update') return 'row-update'
  return ''
}

/**
 * 获取状态标签类型
 */
function getStatusTagType(status) {
  const types = {
    'new': 'success',
    'update': 'warning',
    'error': 'danger',
    'pending': 'info'
  }
  return types[status] || 'info'
}

/**
 * 获取状态文本
 */
function getStatusText(status) {
  const texts = {
    'new': '新增',
    'update': '更新',
    'error': '错误',
    'pending': '待处理'
  }
  return texts[status] || status
}
</script>

<style scoped>
.import-container {
  padding: 0;
  background: #f5f7fa;
  min-height: 100%;
}

/* 页面头部 */
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  background: #fff;
  border-radius: 8px;
  margin-bottom: 16px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.05);
}

.page-title {
  font-size: 18px;
  font-weight: 600;
  color: #303133;
  margin: 0;
}

.page-desc {
  font-size: 13px;
  color: #909399;
  margin-left: 12px;
}

.header-right {
  display: flex;
  gap: 10px;
}

/* 步骤条 */
.steps-card {
  margin-bottom: 16px;
  border: none;
}

.steps-card :deep(.el-card__body) {
  padding: 24px 40px;
}

/* 内容卡片 */
.content-card {
  border: none;
}

.content-card :deep(.el-card__body) {
  padding: 24px;
}

/* 上传区域 */
.upload-area {
  text-align: center;
  padding: 20px 0;
}

.upload-dragger {
  width: 100%;
  max-width: 600px;
  margin: 0 auto;
}

.upload-dragger :deep(.el-upload-dragger) {
  padding: 40px 20px;
  border-radius: 8px;
}

.upload-icon {
  font-size: 48px;
  color: #c0c4cc;
  margin-bottom: 16px;
}

.upload-text {
  font-size: 14px;
  color: #606266;
}

.upload-text em {
  color: #409eff;
  font-style: normal;
}

.upload-tip {
  font-size: 12px;
  color: #909399;
  margin-top: 8px;
}

.upload-actions {
  margin-top: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
}

.file-info {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #606266;
}

.file-name {
  font-weight: 500;
}

.file-size {
  color: #909399;
  font-size: 13px;
}

/* 导入说明 */
.import-tips {
  max-width: 600px;
  margin: 32px auto 0;
  padding: 20px;
  background: #f5f7fa;
  border-radius: 8px;
}

.import-tips h4 {
  margin: 0 0 12px;
  font-size: 14px;
  color: #303133;
}

.import-tips ul {
  margin: 0;
  padding-left: 20px;
}

.import-tips li {
  font-size: 13px;
  color: #606266;
  line-height: 1.8;
}

.import-tips .required {
  color: #f56c6c;
  font-weight: bold;
}

/* 预览统计 */
.preview-stats {
  display: flex;
  gap: 24px;
  padding: 16px 20px;
  background: #f5f7fa;
  border-radius: 8px;
  margin-bottom: 16px;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.stat-label {
  font-size: 13px;
  color: #909399;
}

.stat-value {
  font-size: 18px;
  font-weight: 600;
  color: #303133;
}

.stat-item.new .stat-value { color: #67c23a; }
.stat-item.update .stat-value { color: #e6a23c; }
.stat-item.error .stat-value { color: #f56c6c; }

/* 预览表格 */
.preview-card :deep(.el-table .row-error) {
  background-color: #fef0f0;
}

.preview-card :deep(.el-table .row-update) {
  background-color: #fdf6ec;
}

.error-text {
  color: #f56c6c;
  font-size: 12px;
  display: flex;
  align-items: flex-start;
  gap: 4px;
}

.warning-text {
  color: #e6a23c;
  font-size: 12px;
  display: flex;
  align-items: flex-start;
  gap: 4px;
  margin-top: 4px;
}

/* 预览操作按钮 */
.preview-actions {
  margin-top: 20px;
  padding-top: 16px;
  border-top: 1px solid #ebeef5;
  display: flex;
  justify-content: center;
  gap: 16px;
}

/* 结果页面 */
.result-content {
  padding: 20px 0;
}

.result-stats p {
  margin: 8px 0;
  font-size: 15px;
}

.result-stats .success { color: #67c23a; font-weight: 600; }
.result-stats .update { color: #e6a23c; font-weight: 600; }
.result-stats .error { color: #f56c6c; font-weight: 600; }

.result-actions {
  display: flex;
  gap: 12px;
}

.error-details {
  margin-top: 24px;
  padding: 16px;
  background: #fef0f0;
  border-radius: 8px;
}

.error-details h4 {
  margin: 0 0 12px;
  font-size: 14px;
  color: #f56c6c;
}
</style>
