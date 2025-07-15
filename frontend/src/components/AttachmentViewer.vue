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

      <div class="attachment-actions">
        <!-- 如果是文件，显示打开文件按钮 -->
        <el-button
          v-if="isFile"
          type="primary"
          @click="openAttachment"
          :loading="loading"
        >
          <el-icon><FolderOpened /></el-icon>
          打开文件
        </el-button>

        <!-- 如果是文件夹，显示打开文件夹按钮 -->
        <el-button
          v-if="isFolder"
          type="primary"
          @click="openFolderDirect"
          :loading="loading"
        >
          <el-icon><Folder /></el-icon>
          打开文件夹
        </el-button>

        <!-- 如果是文件，显示打开所在文件夹按钮 -->
        <el-button
          v-if="isFile"
          type="info"
          @click="openFolder"
          :loading="loading"
        >
          <el-icon><Folder /></el-icon>
          打开所在文件夹
        </el-button>

        <el-button
          type="success"
          @click="copyPath"
        >
          <el-icon><CopyDocument /></el-icon>
          复制路径
        </el-button>
      </div>

      <!-- 路径信息 -->
      <div class="path-info" v-if="showPathInfo">
        <el-text size="small" type="info">
          路径: {{ displayPath }}
        </el-text>
      </div>
    </div>

    <!-- 无附件状态 -->
    <div v-else class="no-attachment">
      <el-text type="info">无附件</el-text>
    </div>

    <!-- 图片预览对话框 -->
    <el-dialog
      v-model="imagePreviewVisible"
      :title="''"
      :width="isFullscreen ? '100%' : '60%'"
      :close-on-click-modal="true"
      :close-on-press-escape="true"
      :append-to-body="true"
      :lock-scroll="false"
      :fullscreen="isFullscreen"
      :show-close="false"
      center
      class="image-preview-dialog"
      :class="{ 'fullscreen-dialog': isFullscreen }"
      top="10vh"
      :style="{ height: isFullscreen ? '100vh' : '80vh' }"
    >
      <!-- 标题栏 -->
      <div class="image-header">
        <div class="image-title">{{ fileName }}</div>
      </div>

      <!-- 工具栏 -->
      <div class="image-toolbar">
        <div class="toolbar-center">
          <!-- 缩放控制 -->
          <div class="tool-group">
            <el-tooltip content="缩小" placement="top">
              <el-button
                size="small"
                circle
                @click="zoomOut"
                :disabled="scale <= 0.1"
                class="tool-btn zoom-out-btn"
              >
                <el-icon><ZoomOut /></el-icon>
              </el-button>
            </el-tooltip>
            <span class="zoom-display">{{ Math.round(scale * 100) }}%</span>
            <el-tooltip content="放大" placement="top">
              <el-button
                size="small"
                circle
                @click="zoomIn"
                :disabled="scale >= 5"
                class="tool-btn zoom-in-btn"
              >
                <el-icon><ZoomIn /></el-icon>
              </el-button>
            </el-tooltip>
          </div>

          <!-- 旋转控制 -->
          <div class="tool-group">
            <el-tooltip content="向左旋转" placement="top">
              <el-button size="small" circle @click="rotateLeft" class="tool-btn rotate-left-btn">
                <el-icon><RefreshLeft /></el-icon>
              </el-button>
            </el-tooltip>
            <el-tooltip content="向右旋转" placement="top">
              <el-button size="small" circle @click="rotateRight" class="tool-btn rotate-right-btn">
                <el-icon><RefreshRight /></el-icon>
              </el-button>
            </el-tooltip>
          </div>

          <!-- 功能按钮 -->
          <div class="tool-group">
            <el-tooltip content="重置" placement="top">
              <el-button size="small" circle @click="resetTransform" class="tool-btn reset-btn">
                <el-icon><Refresh /></el-icon>
              </el-button>
            </el-tooltip>
            <el-tooltip :content="isFullscreen ? '退出全屏' : '全屏'" placement="top">
              <el-button size="small" circle @click="toggleFullscreen" class="tool-btn fullscreen-btn">
                <el-icon><FullScreen v-if="!isFullscreen" /><Aim v-else /></el-icon>
              </el-button>
            </el-tooltip>
            <!-- 全屏模式下的关闭按钮 -->
            <el-tooltip content="关闭" placement="top" v-if="isFullscreen">
              <el-button
                size="small"
                circle
                @click="closePreview"
                class="tool-btn close-btn-fullscreen"
                type="danger"
              >
                <el-icon><Close /></el-icon>
              </el-button>
            </el-tooltip>
          </div>
        </div>
      </div>

      <div class="image-preview-container" :class="{ 'fullscreen-container': isFullscreen }">
        <div v-if="imageLoading" class="image-loading">
          <el-icon class="is-loading"><Loading /></el-icon>
          <span>正在加载图片...</span>
        </div>
        <div v-else-if="imageError" class="image-error">
          <el-icon><Warning /></el-icon>
          <span>图片加载失败，请检查文件是否存在</span>
        </div>
        <div v-else-if="imageUrl" class="image-wrapper" @wheel="handleWheel">
          <img
            :src="imageUrl"
            class="preview-image"
            :style="imageStyle"
            @load="onImageLoad"
            @error="onImageError"
            @mousedown="startDrag"
            draggable="false"
          />
        </div>
      </div>
    </el-dialog>

    <!-- 外部关闭按钮 - 只在非全屏模式下显示 -->
    <teleport to="body">
      <div
        v-if="imagePreviewVisible && !isFullscreen"
        class="external-close-btn"
        @click="closePreview"
      >
        <el-icon><Close /></el-icon>
      </div>
    </teleport>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { ElMessage } from 'element-plus'
import {
  Document, Picture, FolderOpened, Folder, CopyDocument, Loading, Warning,
  ZoomOut, ZoomIn, RefreshLeft, RefreshRight, Refresh, FullScreen, Aim, Close
} from '@element-plus/icons-vue'
import apiService from '@/services/apiService'

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

// 图片预览相关状态
const imagePreviewVisible = ref(false)
const imageUrl = ref('')
const imageLoading = ref(false)
const imageError = ref(false)

// 图片变换状态
const scale = ref(1)
const rotation = ref(0)
const translateX = ref(0)
const translateY = ref(0)
const isFullscreen = ref(false)

// 拖拽状态
const isDragging = ref(false)
const dragStartX = ref(0)
const dragStartY = ref(0)
const dragStartTranslateX = ref(0)
const dragStartTranslateY = ref(0)

// 计算文件名
const fileName = computed(() => {
  if (!attachmentPath.value) return ''
  
  const path = attachmentPath.value.replace(/\\/g, '/')
  const parts = path.split('/')
  return parts[parts.length - 1] || '未知文件'
})

// 判断是否为图片文件
const isImageFile = computed(() => {
  const name = fileName.value.toLowerCase()
  return /\.(jpg|jpeg|png|gif|bmp|webp|svg)$/.test(name)
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

// 图片样式计算属性
const imageStyle = computed(() => {
  return {
    transform: `scale(${scale.value}) rotate(${rotation.value}deg) translate(${translateX.value}px, ${translateY.value}px)`,
    transition: isDragging.value ? 'none' : 'transform 0.3s ease',
    cursor: isDragging.value ? 'grabbing' : 'grab'
  }
})

// 获取附件路径信息
const fetchAttachmentPath = async () => {
  if (!props.recordId) return

  loading.value = true
  try {
    const response = await apiService.get(`/api/complaint/attachment-path/${props.recordId}`)

    if (response.data.success) {
      attachmentPath.value = response.data.path || ''
      displayPath.value = response.data.displayPath || ''
      isAccessible.value = response.data.isAccessible || false
      pathType.value = response.data.type || ''
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
    // 方案1：尝试通过后端文件服务访问（推荐）
    const fileServiceUrl = `/api/complaint/file/${props.recordId}`

    // 检查是否是图片文件
    const isImage = /\.(jpg|jpeg|png|gif|bmp|webp)$/i.test(attachmentPath.value)

    if (isImage) {
      // 对于图片，在对话框中显示
      showImagePreview(fileServiceUrl)
    } else {
      // 对于非图片文件，直接下载或在新窗口打开
      ElMessage.info('正在打开文件...')
      window.open(fileServiceUrl, '_blank')
      ElMessage.success('文件已在新窗口中打开')
    }

  } catch (error) {
    console.error('打开文件失败:', error)
    ElMessage.error('打开文件失败')

    // 方案2：如果后端服务失败，回退到file://协议（可能不工作）
    try {
      const fullPath = pathType.value === 'relative_path'
        ? `\\\\tj_server\\工作\\品质部\\生产异常周报考核统计\\${attachmentPath.value}`
        : attachmentPath.value

      const fileUrl = `file:///${fullPath.replace(/\\/g, '/')}`
      window.open(fileUrl, '_blank')

      ElMessage.warning('已尝试使用本地协议打开文件，如果无法打开请手动访问路径')
    } catch (fallbackError) {
      console.error('回退方案也失败:', fallbackError)
      ElMessage.error('所有打开方式都失败，请手动复制路径访问文件')
    }
  }
}

// 显示图片预览对话框
const showImagePreview = async (fileServiceUrl) => {
  imagePreviewVisible.value = true
  imageLoading.value = true
  imageError.value = false
  imageUrl.value = ''

  // 重置变换状态
  resetTransform()

  try {
    const response = await apiService.get(fileServiceUrl, {
      responseType: 'blob'
    })

    const blob = response.data
    imageUrl.value = URL.createObjectURL(blob)

  } catch (error) {
    console.error('获取图片数据失败:', error)
    imageError.value = true
    ElMessage.error('图片加载失败')
  } finally {
    imageLoading.value = false
  }
}

// 图片加载成功事件
const onImageLoad = () => {
  imageLoading.value = false
  imageError.value = false
}

// 图片加载失败事件
const onImageError = () => {
  imageLoading.value = false
  imageError.value = true
}

// 缩放功能
const zoomIn = () => {
  scale.value = Math.min(scale.value * 1.2, 5)
}

const zoomOut = () => {
  scale.value = Math.max(scale.value / 1.2, 0.1)
}

const resetZoom = () => {
  scale.value = 1
}

// 旋转功能
const rotateLeft = () => {
  rotation.value -= 90
}

const rotateRight = () => {
  rotation.value += 90
}

// 重置所有变换
const resetTransform = () => {
  scale.value = 1
  rotation.value = 0
  translateX.value = 0
  translateY.value = 0
}

// 全屏切换
const toggleFullscreen = () => {
  isFullscreen.value = !isFullscreen.value
}

// 鼠标滚轮缩放
const handleWheel = (event) => {
  event.preventDefault()
  const delta = event.deltaY > 0 ? -1 : 1
  const zoomFactor = 1.1

  if (delta > 0) {
    scale.value = Math.min(scale.value * zoomFactor, 5)
  } else {
    scale.value = Math.max(scale.value / zoomFactor, 0.1)
  }
}

// 拖拽功能
const startDrag = (event) => {
  event.preventDefault()
  isDragging.value = true
  dragStartX.value = event.clientX
  dragStartY.value = event.clientY
  dragStartTranslateX.value = translateX.value
  dragStartTranslateY.value = translateY.value

  document.addEventListener('mousemove', onDrag)
  document.addEventListener('mouseup', stopDrag)
}

const onDrag = (event) => {
  if (!isDragging.value) return

  const deltaX = event.clientX - dragStartX.value
  const deltaY = event.clientY - dragStartY.value

  translateX.value = dragStartTranslateX.value + deltaX
  translateY.value = dragStartTranslateY.value + deltaY
}

const stopDrag = () => {
  isDragging.value = false
  document.removeEventListener('mousemove', onDrag)
  document.removeEventListener('mouseup', stopDrag)
}

// 关闭预览
const closePreview = () => {
  // 如果是全屏模式，先退出全屏
  if (isFullscreen.value) {
    isFullscreen.value = false
  }
  imagePreviewVisible.value = false
  // 清理blob URL
  if (imageUrl.value) {
    URL.revokeObjectURL(imageUrl.value)
    imageUrl.value = ''
  }
}

// 直接打开文件夹（当路径本身就是文件夹时）
const openFolderDirect = async () => {
  if (!attachmentPath.value) {
    ElMessage.warning('无有效的附件路径')
    return
  }

  try {
    // 构建完整的网络路径
    const fullPath = pathType.value === 'relative_path'
      ? `\\\\tj_server\\工作\\品质部\\生产异常周报考核统计\\${attachmentPath.value}`
      : attachmentPath.value

    // 使用file://协议打开文件夹
    const folderUrl = `file:///${fullPath.replace(/\\/g, '/')}`
    window.open(folderUrl, '_blank')

    ElMessage.success('正在打开文件夹...')
  } catch (error) {
    console.error('打开文件夹失败:', error)
    ElMessage.error('打开文件夹失败')
  }
}

// 打开文件所在文件夹
const openFolder = async () => {
  if (!attachmentPath.value) {
    ElMessage.warning('无有效的附件路径')
    return
  }

  try {
    ElMessage.info('正在尝试打开文件夹...')

    // 尝试通过后端API打开文件夹
    const response = await apiService.post('/api/complaint/open-folder', {
      recordId: props.recordId,
      openFile: false // 只打开文件夹，不选中文件
    })

    if (response.data.success) {
      ElMessage.success('文件夹已打开')
    } else {
      throw new Error(response.data.message || '打开文件夹失败')
    }
  } catch (error) {
    console.error('打开文件夹失败:', error)

    // 回退方案：复制路径并提示用户手动打开
    try {
      const fullPath = pathType.value === 'relative_path'
        ? `\\\\tj_server\\工作\\品质部\\生产异常周报考核统计\\${attachmentPath.value}`
        : attachmentPath.value

      const folderPath = fullPath.substring(0, fullPath.lastIndexOf('\\'))
      await navigator.clipboard.writeText(folderPath)

      ElMessage.warning('无法自动打开文件夹，文件夹路径已复制到剪贴板，请手动打开')
    } catch (clipboardError) {
      ElMessage.error('打开文件夹失败，请使用"复制路径"功能手动访问')
    }
  }
}

// 复制路径到剪贴板
const copyPath = async () => {
  if (!displayPath.value) {
    ElMessage.warning('无有效的路径信息')
    return
  }
  
  try {
    await navigator.clipboard.writeText(displayPath.value)
    ElMessage.success('路径已复制到剪贴板')
  } catch (error) {
    console.error('复制路径失败:', error)
    ElMessage.error('复制路径失败')
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
