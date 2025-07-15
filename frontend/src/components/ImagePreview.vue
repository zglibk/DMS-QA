<template>
  <div class="image-preview-wrapper">
    <!-- 图片预览区域 -->
    <div class="image-preview-container" v-if="isImage">
      <div v-if="loading" class="image-loading">
        <el-icon class="is-loading"><Loading /></el-icon>
        <span>正在加载图片...</span>
      </div>
      <div v-else-if="error" class="image-error" @click="retryLoad">
        <el-icon><Warning /></el-icon>
        <span>图片加载失败，点击重试</span>
      </div>
      <div v-else-if="imageUrl" class="image-content" @click="showFullPreview">
        <img
          :src="imageUrl"
          :alt="fileName"
          class="preview-image"
          @load="onImageLoad"
          @error="onImageError"
        />
        <div class="image-overlay">
          <el-icon class="zoom-icon"><ZoomIn /></el-icon>
          <span class="zoom-text">点击查看大图</span>
        </div>
      </div>
      <div v-else class="image-placeholder">
        <el-icon class="placeholder-icon"><Picture /></el-icon>
        <span class="placeholder-text">暂无图片</span>
      </div>
    </div>
    
    <!-- 非图片文件显示 -->
    <div v-else class="file-info">
      <el-icon class="file-icon"><Document /></el-icon>
      <span class="file-name">{{ fileName || '附件文件' }}</span>
    </div>

    <!-- 全屏预览对话框 -->
    <el-dialog
      v-model="fullPreviewVisible"
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
        <div class="image-title">图片查看器</div>
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
                @click="closeFullPreview"
                class="tool-btn close-btn-fullscreen"
                type="danger"
              >
                <el-icon><Close /></el-icon>
              </el-button>
            </el-tooltip>
          </div>
        </div>
      </div>

      <div class="image-preview-container-full" :class="{ 'fullscreen-container': isFullscreen }">
        <div v-if="loading" class="image-loading">
          <el-icon class="is-loading"><Loading /></el-icon>
          <span>正在加载图片...</span>
        </div>
        <div v-else-if="error" class="image-error">
          <el-icon><Warning /></el-icon>
          <span>图片加载失败</span>
        </div>
        <div v-else-if="imageUrl" class="image-wrapper" @wheel="handleWheel">
          <img
            :src="imageUrl"
            class="preview-image-full"
            :style="imageStyle"
            @mousedown="startDrag"
            draggable="false"
          />
        </div>
      </div>
    </el-dialog>

    <!-- 外部关闭按钮 - 只在非全屏模式下显示 -->
    <teleport to="body">
      <div
        v-if="fullPreviewVisible && !isFullscreen"
        class="external-close-btn"
        @click="closeFullPreview"
      >
        <el-icon><Close /></el-icon>
      </div>
    </teleport>
  </div>
</template>

<script setup>
import { ref, computed, watch, onUnmounted } from 'vue'
import { ElMessage } from 'element-plus'
import {
  Document, Picture, Loading, Warning, ZoomIn, ZoomOut, 
  RefreshLeft, RefreshRight, Refresh, FullScreen, Aim, Close
} from '@element-plus/icons-vue'
import imagePreviewService from '@/services/imagePreviewService'

const props = defineProps({
  filePath: {
    type: String,
    default: ''
  },
  recordId: {
    type: [Number, String],
    default: null
  },
  width: {
    type: String,
    default: '200px'
  },
  height: {
    type: String,
    default: '150px'
  }
})

// 基本状态
const loading = ref(false)
const error = ref(false)
const imageUrl = ref('')

// 全屏预览状态
const fullPreviewVisible = ref(false)
const isFullscreen = ref(false)

// 图片变换状态
const scale = ref(1)
const rotation = ref(0)
const translateX = ref(0)
const translateY = ref(0)

// 拖拽状态
const isDragging = ref(false)
const dragStart = ref({ x: 0, y: 0 })

// 计算属性
const isImage = computed(() => imagePreviewService.isImageFile(props.filePath))
const fileName = computed(() => imagePreviewService.getFileName(props.filePath))

const imageStyle = computed(() => ({
  transform: `scale(${scale.value}) rotate(${rotation.value}deg) translate(${translateX.value}px, ${translateY.value}px)`,
  transition: isDragging.value ? 'none' : 'transform 0.3s ease',
  cursor: isDragging.value ? 'grabbing' : 'grab'
}))

// TODO: 修复历史投诉记录编辑模式下，选择新图片文件后缩略图加载失败的问题
// 问题描述：在编辑模式下上传新图片后，缩略图显示加载失败
// 可能原因：路径解析逻辑或组件刷新机制有问题
// 加载图片
const loadImage = async () => {
  console.log('=== ImagePreview loadImage 调试信息 ===')
  console.log('props.filePath:', props.filePath)
  console.log('isImage.value:', isImage.value)

  // 严格检查filePath
  if (!props.filePath || props.filePath === '' || props.filePath === null || props.filePath === undefined) {
    console.log('ImagePreview: filePath为空，不加载图片')
    loading.value = false
    error.value = false
    imageUrl.value = null
    return
  }

  if (!isImage.value) {
    console.log('ImagePreview: 不是图片文件，不加载')
    loading.value = false
    error.value = false
    imageUrl.value = null
    return
  }

  loading.value = true
  error.value = false

  try {
    const pathStr = String(props.filePath).trim()
    console.log('处理后的路径:', pathStr)

    if (!pathStr) {
      console.log('路径转换为字符串后为空')
      loading.value = false
      return
    }

    // 如果是blob URL（新上传的文件），直接使用
    if (pathStr.startsWith('blob:')) {
      console.log('使用blob URL:', pathStr)
      imageUrl.value = pathStr
      loading.value = false
      return
    }

    // 如果是HTTP URL，直接使用
    if (pathStr.startsWith('http://') || pathStr.startsWith('https://')) {
      console.log('使用HTTP URL:', pathStr)
      imageUrl.value = pathStr
      loading.value = false
      return
    }

    // 如果是data URL，直接使用
    if (pathStr.startsWith('data:')) {
      console.log('使用data URL:', pathStr)
      imageUrl.value = pathStr
      loading.value = false
      return
    }

    // 如果是静态文件URL（/files/attachments/），直接使用
    if (pathStr.startsWith('/files/attachments/')) {
      console.log('使用静态文件URL:', pathStr)
      imageUrl.value = pathStr
      loading.value = false
      return
    }

    // 其他情况通过服务获取
    console.log('通过服务获取图片:', pathStr)
    const url = await imagePreviewService.getImageUrlByPath(pathStr, props.recordId)
    console.log('服务返回的URL:', url)
    imageUrl.value = url
  } catch (err) {
    console.error('图片加载失败:', err)
    error.value = true
    ElMessage.error(err.message || '图片加载失败')
  } finally {
    loading.value = false
    console.log('=== ImagePreview loadImage 完成 ===')
  }
}

// 重试加载
const retryLoad = () => {
  loadImage()
}

// 图片加载事件
const onImageLoad = () => {
  loading.value = false
  error.value = false
  console.log('图片加载成功:', props.filePath)
}

// 图片加载错误事件
const onImageError = (e) => {
  loading.value = false
  error.value = true
  console.error('图片加载失败:', props.filePath)

  // 如果是静态文件URL，尝试打印完整URL以便调试
  if (props.filePath && props.filePath.startsWith('/files/attachments/')) {
    const fullUrl = window.location.origin + props.filePath
    console.error('完整URL:', fullUrl)

    // 尝试通过fetch检查文件是否存在
    fetch(props.filePath, { method: 'HEAD' })
      .then(response => {
        console.log('文件检查结果:', response.status, response.statusText)
      })
      .catch(err => {
        console.error('文件检查失败:', err)
      })
  }
}

// 显示全屏预览
const showFullPreview = () => {
  if (imageUrl.value) {
    fullPreviewVisible.value = true
    resetTransform()
  }
}

// 关闭全屏预览
const closeFullPreview = () => {
  fullPreviewVisible.value = false
  isFullscreen.value = false
}

// 图片变换控制
const zoomIn = () => {
  if (scale.value < 5) {
    scale.value = Math.min(5, scale.value + 0.2)
  }
}

const zoomOut = () => {
  if (scale.value > 0.1) {
    scale.value = Math.max(0.1, scale.value - 0.2)
  }
}

const rotateLeft = () => {
  rotation.value -= 90
}

const rotateRight = () => {
  rotation.value += 90
}

const resetTransform = () => {
  scale.value = 1
  rotation.value = 0
  translateX.value = 0
  translateY.value = 0
}

const toggleFullscreen = () => {
  isFullscreen.value = !isFullscreen.value
}

// 鼠标滚轮缩放
const handleWheel = (event) => {
  event.preventDefault()
  const delta = event.deltaY > 0 ? -0.1 : 0.1
  const newScale = Math.max(0.1, Math.min(5, scale.value + delta))
  scale.value = newScale
}

// 拖拽功能
const startDrag = (event) => {
  isDragging.value = true
  dragStart.value = {
    x: event.clientX - translateX.value,
    y: event.clientY - translateY.value
  }
  
  document.addEventListener('mousemove', onDrag)
  document.addEventListener('mouseup', stopDrag)
}

const onDrag = (event) => {
  if (isDragging.value) {
    translateX.value = event.clientX - dragStart.value.x
    translateY.value = event.clientY - dragStart.value.y
  }
}

const stopDrag = () => {
  isDragging.value = false
  document.removeEventListener('mousemove', onDrag)
  document.removeEventListener('mouseup', stopDrag)
}

// 监听属性变化
watch([() => props.filePath, () => props.recordId], loadImage, { immediate: true })

// 组件卸载时清理
onUnmounted(() => {
  if (imageUrl.value && imageUrl.value.startsWith('blob:')) {
    URL.revokeObjectURL(imageUrl.value)
  }
  document.removeEventListener('mousemove', onDrag)
  document.removeEventListener('mouseup', stopDrag)
})
</script>

<style scoped>
.image-preview-wrapper {
  width: 100%;
}

.image-preview-container {
  width: v-bind(width);
  height: v-bind(height);
  border: 1px solid #dcdfe6;
  border-radius: 6px;
  overflow: hidden;
  position: relative;
  background: #f8f9fa;
  display: flex;
  align-items: center;
  justify-content: center;
}

.image-content {
  width: 100%;
  height: 100%;
  position: relative;
  cursor: pointer;
}

.preview-image {
  width: 100%;
  height: 100%;
  object-fit: contain; /* 改为contain以显示完整图片，等比例缩放 */
  transition: transform 0.3s ease;
}

.image-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  color: white;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.3s ease;
}

.image-content:hover .image-overlay {
  opacity: 1;
}

.zoom-icon {
  font-size: 24px;
  margin-bottom: 8px;
}

.zoom-text {
  font-size: 14px;
}

.image-loading,
.image-error,
.image-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #909399;
  font-size: 14px;
  gap: 8px;
}

.image-error {
  cursor: pointer;
  color: #f56c6c;
}

.image-error:hover {
  color: #f78989;
}

.file-info {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: #f8f9fa;
  border-radius: 6px;
  border: 1px solid #e9ecef;
}

.file-icon {
  font-size: 18px;
  color: #409eff;
}

.file-name {
  font-weight: 500;
  color: #2c3e50;
  word-break: break-all;
}

/* 全屏预览对话框样式 */
:deep(.image-preview-dialog) {
  border-radius: 12px;
  overflow: hidden;
}

:deep(.image-preview-dialog .el-dialog__header) {
  display: none;
}

:deep(.image-preview-dialog .el-dialog__body) {
  padding: 0;
  display: flex;
  flex-direction: column;
  height: 100%;
}

:deep(.fullscreen-dialog) {
  border-radius: 0;
}

:deep(.fullscreen-dialog .el-dialog__body) {
  height: 100vh;
}

/* 外部关闭按钮 */
.external-close-btn {
  position: fixed;
  top: calc(10vh - 30px);
  right: calc(20vw - 30px);
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

.zoom-display {
  font-size: 12px;
  font-weight: 600;
  color: #495057;
  min-width: 40px;
  text-align: center;
}

/* 图片容器样式 */
.image-preview-container-full {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f8f9fa;
  position: relative;
  overflow: hidden;
  height: calc(80vh - 180px);
  min-height: 260px;
}

.fullscreen-container {
  height: calc(100vh - 120px);
  background: #000;
}

.image-wrapper {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.preview-image-full {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
  user-select: none;
}

/* 响应式样式 */
@media (max-width: 768px) {
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
    top: 5px;
    right: 5px;
    width: 36px;
    height: 36px;
  }
}
</style>
