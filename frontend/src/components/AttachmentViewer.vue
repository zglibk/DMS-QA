<template>
  <div class="attachment-viewer">
    <!-- 附件显示区域 -->
    <div v-if="attachmentPath" class="attachment-container">
      <div class="attachment-info">
        <el-icon class="attachment-icon">
          <Folder v-if="isFolder" />
          <Picture v-else-if="isImageFile" />
          <Document v-else />
        </el-icon>
        <span class="attachment-name">{{ fileName || '文件夹' }}</span>
        <el-tag :type="isFolder ? 'warning' : 'info'" size="small" style="margin-left: 8px;">
          {{ isFolder ? '文件夹' : '文件' }}
        </el-tag>
      </div>

      <!-- 图片预览区域 -->
      <div v-if="isImageFile" class="image-preview-section">
        <ImagePreview
          :key="`attachment-viewer-${previewUrl || 'api'}-${props.recordId}-${attachmentViewerInstanceId}`"
          :file-path="previewUrl || attachmentPath"
          :record-id="previewUrl ? null : props.recordId"
          width="300px"
          height="200px"
        />
      </div>

      <!-- 操作按钮 -->
      <div class="attachment-actions">
        <el-button
          @click="copyPath"
          :disabled="!attachmentPath"
        >
          <el-icon><CopyDocument /></el-icon>
          复制路径
        </el-button>
      </div>
    </div>

    <!-- 无附件状态 -->
    <div v-else class="no-attachment">
      <el-text type="info">无附件</el-text>
    </div>

    <!-- 旧的图片预览对话框已删除，现在使用ImagePreview组件 -->
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { CopyDocument } from '@element-plus/icons-vue'
import apiService from '@/services/apiService'
import ImagePreview from './ImagePreview.vue'

const props = defineProps({
  recordId: {
    type: [Number, String],
    required: true
  },
  showPathInfo: {
    type: Boolean,
    default: false
  }
})

const loading = ref(false)
const attachmentPath = ref('')
const displayPath = ref('')
const isAccessible = ref(false)
const pathType = ref('')
const attachmentViewerInstanceId = ref(0) // 组件实例标识

// 获取API基础URL
const getApiBaseUrl = () => {
  const protocol = window.location.protocol
  const hostname = window.location.hostname
  const port = window.location.port

  // 检查是否为本地开发环境
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return `${protocol}//${hostname}:3000`
  }

  // 生产环境，使用当前域名和端口
  return port ? `${protocol}//${hostname}:${port}` : `${protocol}//${hostname}`
}

// 判断文件路径类型并生成正确的预览URL（参考编辑对话框的逻辑）
const getFilePreviewUrl = (filePath, recordId = null) => {
  if (!filePath || filePath === '' || filePath === null || filePath === undefined) {
    console.log('AttachmentViewer getFilePreviewUrl: 路径为空，返回null')
    return null
  }

  console.log('=== AttachmentViewer getFilePreviewUrl 调试信息 ===')
  console.log('输入路径:', filePath)
  console.log('记录ID:', recordId)
  console.log('路径类型:', typeof filePath)

  try {
    const pathStr = String(filePath).trim()

    // 检查是否为blob URL（本地预览）
    if (pathStr.startsWith('blob:')) {
      console.log('检测到blob URL，直接返回')
      console.log('================================================')
      return pathStr
    }

    // 检查是否为HTTP/HTTPS URL（完整URL）
    if (pathStr.startsWith('http://') || pathStr.startsWith('https://')) {
      console.log('检测到完整HTTP URL，直接返回')
      console.log('================================================')
      return pathStr
    }

    // 检查是否为服务器静态文件路径（/files/开头）
    if (pathStr.startsWith('/files/')) {
      console.log('检测到服务器静态文件路径，直接返回')
      console.log('================================================')
      return pathStr
    }

    // 检查是否为新上传的文件路径
    const hasFilePrefix = pathStr.includes('file:') || pathStr.includes('File:')
    const isUploadsPath = pathStr.includes('uploads') || pathStr.includes('attachments')

    if (hasFilePrefix || isUploadsPath) {
      // 新上传的文件，使用静态文件服务
      const backendUrl = getApiBaseUrl()
      const pathParts = pathStr.split(/[\/\\]/).filter(part => part.trim() !== '')
      const encodedPath = pathParts.map(part => encodeURIComponent(part)).join('/')
      const finalUrl = `${backendUrl}/files/attachments/${encodedPath}`
      console.log('生成服务器URL:', finalUrl)
      console.log('================================================')
      return finalUrl
    } else {
      // 现有的数据库记录文件，需要通过API访问
      // 这些文件可能是网络共享路径或相对路径，需要后端处理
      console.log('检测到现有数据库文件，返回null让ImagePreview组件通过API处理')
      console.log('================================================')
      return null // 返回null，让ImagePreview组件通过recordId和API获取
    }
  } catch (error) {
    console.error('AttachmentViewer getFilePreviewUrl 处理错误:', error)
    return null
  }
}

// 计算预览URL
const previewUrl = computed(() => {
  if (!attachmentPath.value) return null
  return getFilePreviewUrl(attachmentPath.value, props.recordId)
})

// 计算文件名
const fileName = computed(() => {
  if (!attachmentPath.value) return ''
  
  const path = attachmentPath.value.replace(/\\/g, '/')
  const parts = path.split('/')
  return parts[parts.length - 1] || '未知文件'
})

// 判断是否为图片文件
const isImageFile = computed(() => {
  const name = fileName.value
  if (!name || typeof name !== 'string') return false
  return /\.(jpg|jpeg|png|gif|bmp|webp|svg)$/i.test(name)
})

// 判断路径是否为文件（有文件扩展名）
const isFile = computed(() => {
  if (!attachmentPath.value) return false
  const name = fileName.value
  return /\.[a-zA-Z0-9]+$/.test(name)
})

// 判断路径是否为文件夹（无文件扩展名）
const isFolder = computed(() => {
  return !isFile.value && !!attachmentPath.value
})

// 旧的图片样式计算属性已删除

// 获取附件路径信息
const fetchAttachmentPath = async () => {
  if (!props.recordId) return

  loading.value = true
  // 递增实例ID，确保每次获取数据都创建新的ImagePreview组件
  attachmentViewerInstanceId.value++
  console.log(`AttachmentViewer实例ID: ${attachmentViewerInstanceId.value}`)

  try {
    const response = await apiService.get(`/complaint/attachment-path/${props.recordId}`)

    if (response.data.success) {
      attachmentPath.value = response.data.path || ''
      displayPath.value = response.data.displayPath || ''
      isAccessible.value = response.data.isAccessible || false
      pathType.value = response.data.type || ''

      console.log('附件路径信息:', {
        path: attachmentPath.value,
        displayPath: displayPath.value,
        isAccessible: isAccessible.value,
        type: pathType.value,
        previewUrl: previewUrl.value
      })

      console.log('ImagePreview参数（修复后）:', {
        filePath: previewUrl.value || attachmentPath.value,
        recordId: previewUrl.value ? null : props.recordId,
        key: `attachment-viewer-${previewUrl.value || 'api'}-${props.recordId}-${attachmentViewerInstanceId.value}`,
        explanation: previewUrl.value ? '使用previewUrl' : '使用attachmentPath让ImagePreview通过API获取'
      })
    } else {
      ElMessage.error(response.data.message || '获取附件信息失败')
    }
  } catch (error) {
    console.error('获取附件路径失败:', error)
    ElMessage.error('获取附件信息失败')
  } finally {
    loading.value = false
  }
}

// 打开附件文件
const openAttachment = async () => {
  if (!attachmentPath.value) {
    ElMessage.warning('无有效的附件路径')
    return
  }

  try {
    // 检查是否是图片文件
    const isImage = /\.(jpg|jpeg|png|gif|bmp|webp)$/i.test(attachmentPath.value)

    if (isImage) {
      // 对于图片，现在使用ImagePreview组件显示，这里提示用户查看上方预览
      ElMessage.info('图片预览已显示在上方，点击可查看大图')
    } else {
      // 对于非图片文件，使用API方式下载
      ElMessage.info('正在打开文件...')
      const fileServiceUrl = `/complaint/file/${props.recordId}`
      window.open(fileServiceUrl, '_blank')
      ElMessage.success('文件已在新窗口中打开')
    }

  } catch (error) {
    console.error('打开文件失败:', error)
    ElMessage.error('打开文件失败')

    // 回退方案：提示用户手动访问网络路径
    if (displayPath.value) {
      try {
        await navigator.clipboard.writeText(displayPath.value)
        ElMessage.warning(`无法自动打开文件，路径已复制到剪贴板：${displayPath.value}`)
      } catch (clipboardError) {
        ElMessage.error(`无法打开文件，请手动访问路径：${displayPath.value}`)
      }
    } else {
      ElMessage.error('无法获取文件路径信息')
    }
  }
}





// 复制路径到剪贴板
const copyPath = async () => {
  if (!attachmentPath.value) {
    ElMessage.warning('无有效的路径信息')
    return
  }

  try {
    // 构建完整的网络路径用于复制
    let pathToCopy = ''

    if (pathType.value === 'relative_path') {
      // 相对路径，构建完整网络路径
      pathToCopy = `\\\\tj_server\\工作\\品质部\\生产异常周报考核统计\\${attachmentPath.value}`
    } else {
      // 其他类型，直接使用原路径
      pathToCopy = attachmentPath.value
    }

    console.log('复制路径调试信息:', {
      attachmentPath: attachmentPath.value,
      pathType: pathType.value,
      pathToCopy: pathToCopy
    })

    await navigator.clipboard.writeText(pathToCopy)
    ElMessage.success('路径已复制到剪贴板')
    console.log('已复制路径:', pathToCopy)
  } catch (error) {
    console.error('复制路径失败:', error)

    // 如果clipboard API失败，尝试使用fallback方法
    try {
      const textArea = document.createElement('textarea')
      const pathToCopy = pathType.value === 'relative_path'
        ? `\\\\tj_server\\工作\\品质部\\生产异常周报考核统计\\${attachmentPath.value}`
        : attachmentPath.value

      textArea.value = pathToCopy
      document.body.appendChild(textArea)
      textArea.select()
      document.execCommand('copy')
      document.body.removeChild(textArea)

      ElMessage.success('路径已复制到剪贴板')
      console.log('使用fallback方法复制路径:', pathToCopy)
    } catch (fallbackError) {
      console.error('fallback复制方法也失败:', fallbackError)
      ElMessage.error('复制路径失败，请手动复制')
    }
  }
}

// 监听recordId变化
watch(() => props.recordId, fetchAttachmentPath, { immediate: true })
</script>

<style scoped>
.attachment-viewer {
  width: 100%;
}

.attachment-container {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.attachment-info {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: #f8f9fa;
  border-radius: 6px;
  border: 1px solid #e9ecef;
}

.attachment-icon {
  font-size: 18px;
  color: #409eff;
}

.attachment-name {
  font-weight: 500;
  color: #2c3e50;
  word-break: break-all;
}

.attachment-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.path-info {
  padding: 8px 12px;
  background: #f0f9ff;
  border-radius: 6px;
  border: 1px solid #bfdbfe;
}

.no-attachment {
  padding: 20px;
  text-align: center;
  color: #909399;
  background: #f8f9fa;
  border-radius: 6px;
  border: 1px dashed #e9ecef;
}

/* 图片预览区域样式 */
.image-preview-section {
  margin: 16px 0;
  padding: 16px;
  background: #f8f9fa;
  border-radius: 8px;
  border: 1px solid #e9ecef;
}

.image-preview-section :deep(.image-preview-wrapper) {
  width: 100%;
}

.image-preview-section :deep(.image-preview-container) {
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

/* 图片预览对话框样式 */
:deep(.image-preview-dialog .el-dialog) {
  height: 80vh !important;
  max-height: 80vh !important;
  display: flex !important;
  flex-direction: column !important;
  margin: 0 auto !important;
  top: 10vh !important;
  transform: translateY(0) !important;
  border-radius: 12px !important;
  overflow: hidden !important;
  background: #ffffff !important;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.15) !important;
}

:deep(.image-preview-dialog .el-dialog__header) {
  display: none !important;
}

:deep(.image-preview-dialog .el-dialog__body) {
  padding: 0 !important;
  flex: 1 !important;
  display: flex !important;
  flex-direction: column !important;
  overflow: hidden !important;
}

/* 全屏对话框样式 */
:deep(.fullscreen-dialog .el-dialog) {
  border-radius: 0 !important;
  height: 100vh !important;
  max-height: 100vh !important;
  top: 0 !important;
  margin: 0 !important;
  width: 100% !important;
}

/* 外部关闭按钮 */
.external-close-btn {
  position: fixed;
  top: calc(10vh - 30px); /* 调整到更合适的位置 */
  right: calc(20vw - 30px); /* 调整到更合适的位置 */
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: transparent;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  z-index: 3001;
  transition: all 0.3s ease;
  border: 2px solid white;
  backdrop-filter: blur(8px);
}

.external-close-btn:hover {
  background: rgba(255, 255, 255, 0.2);
  color: white;
  border-color: white;
  transform: scale(1.1);
}

/* 标题栏样式 */
.image-header {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 16px 20px;
  text-align: center;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  flex-shrink: 0;
}

.image-title {
  font-size: 16px;
  font-weight: 600;
  margin: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* 工具栏样式 */
.image-toolbar {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 12px 20px;
  background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
  border-bottom: 1px solid #dee2e6;
  min-height: 50px;
  flex-shrink: 0;
}

.toolbar-center {
  display: flex;
  align-items: center;
  gap: 20px;
}

/* 工具栏按钮颜色样式 */
.tool-btn.zoom-out-btn {
  border: 1px solid #409eff !important;
  color: #409eff !important;
}

.tool-btn.zoom-out-btn:hover {
  background: #409eff !important;
  color: white !important;
  border-color: #409eff !important;
}

.tool-btn.zoom-in-btn {
  border: 1px solid #67c23a !important;
  color: #67c23a !important;
}

.tool-btn.zoom-in-btn:hover {
  background: #67c23a !important;
  color: white !important;
  border-color: #67c23a !important;
}

.tool-btn.rotate-left-btn {
  border: 1px solid #e6a23c !important;
  color: #e6a23c !important;
}

.tool-btn.rotate-left-btn:hover {
  background: #e6a23c !important;
  color: white !important;
  border-color: #e6a23c !important;
}

.tool-btn.rotate-right-btn {
  border: 1px solid #f56c6c !important;
  color: #f56c6c !important;
}

.tool-btn.rotate-right-btn:hover {
  background: #f56c6c !important;
  color: white !important;
  border-color: #f56c6c !important;
}

.tool-btn.reset-btn {
  border: 1px solid #909399 !important;
  color: #909399 !important;
}

.tool-btn.reset-btn:hover {
  background: #909399 !important;
  color: white !important;
  border-color: #909399 !important;
}

.tool-btn.fullscreen-btn {
  border: 1px solid #722ed1 !important;
  color: #722ed1 !important;
}

.tool-btn.fullscreen-btn:hover {
  background: #722ed1 !important;
  color: white !important;
  border-color: #722ed1 !important;
}

/* 全屏模式下的关闭按钮样式 */
.close-btn-fullscreen {
  margin-left: 20px;
  background: #f56c6c !important;
  border-color: #f56c6c !important;
  color: white !important;
}

.close-btn-fullscreen:hover {
  background: #f78989 !important;
  border-color: #f78989 !important;
  color: white !important;
}

.tool-group {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: white;
  border-radius: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.tool-btn {
  background: transparent !important;
  transition: all 0.3s ease !important;
}

.tool-btn:hover {
  transform: scale(1.1) !important;
}

.tool-btn:disabled {
  opacity: 0.4 !important;
  cursor: not-allowed !important;
}

.zoom-display {
  font-size: 12px;
  font-weight: 600;
  color: #495057;
  min-width: 40px;
  text-align: center;
}

/* 图片容器样式 */
.image-preview-container {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f8f9fa;
  position: relative;
  overflow: hidden;
  /* 计算高度：对话框高度减去标题栏和工具栏的高度，再留出更多底部边距 */
  height: calc(80vh - 180px); /* 80vh是对话框高度，减去标题栏约70px、工具栏约70px，再减去底部边距40px */
  min-height: 260px; /* 设置最小高度确保图片可见 */
}

.fullscreen-container {
  background: #f8f9fa; /* 修复全屏模式背景色问题 */
  height: calc(100vh - 60px); /* 全屏时只减去工具栏高度 */
}

/* 图片包装器样式 */
.image-wrapper {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
}

/* 预览图片样式 */
.preview-image {
  max-width: 100%;
  max-height: 100%;
  width: auto;
  height: auto;
  object-fit: contain;
  user-select: none;
}

.image-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  color: #6c757d;
  font-size: 14px;
  padding: 60px;
}

.image-loading .el-icon {
  font-size: 24px;
}

.image-error {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  color: #dc3545;
  font-size: 14px;
  padding: 60px;
}

.image-error .el-icon {
  font-size: 24px;
}

.image-wrapper {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  position: relative;
}

.preview-image {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
  user-select: none;
  transform-origin: center center;
  transition: transform 0.3s ease;
  border-radius: 4px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
}

/* 响应式样式 */
@media (max-width: 768px) {
  .attachment-actions {
    flex-direction: column;
  }

  .attachment-actions .el-button {
    width: 100%;
  }

  .image-toolbar {
    padding: 8px 12px;
    min-height: 40px;
  }

  .toolbar-center {
    gap: 12px;
    flex-wrap: wrap;
    justify-content: center;
  }

  .tool-group {
    padding: 4px 8px;
  }

  .image-header {
    padding: 12px 16px;
  }

  .image-title {
    font-size: 14px;
  }

  .external-close-btn {
    top: 5px; /* 小屏幕下稍微向内一点 */
    right: 5px; /* 小屏幕下稍微向内一点 */
    width: 36px;
    height: 36px;
  }

  :deep(.image-preview-dialog .el-dialog) {
    margin: 10px !important;
    width: calc(100% - 20px) !important;
    height: calc(100% - 20px) !important;
  }
}

/* 全屏模式下的外部关闭按钮位置调整 */
@media (max-width: 768px) {
  .external-close-btn {
    top: 5px; /* 小屏幕下稍微向内一点 */
    right: 5px; /* 小屏幕下稍微向内一点 */
  }
}

@media (min-width: 769px) {
  .external-close-btn {
    top: calc(10vh - 30px); /* 保持与主样式一致 */
    right: calc(20vw - 30px); /* 保持与主样式一致 */
  }
}
</style>
