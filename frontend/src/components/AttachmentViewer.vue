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
          size="small"
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
          size="small"
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
          size="small"
          @click="openFolder"
          :loading="loading"
        >
          <el-icon><Folder /></el-icon>
          打开所在文件夹
        </el-button>

        <el-button
          type="success"
          size="small"
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
      title="图片预览"
      width="60%"
      :close-on-click-modal="true"
      :close-on-press-escape="true"
      :append-to-body="true"
      :lock-scroll="false"
      center
      class="image-preview-dialog"
    >
      <div class="image-preview-container">
        <div class="image-filename">{{ fileName }}</div>
        <div v-if="imageLoading" class="image-loading">
          <el-icon class="is-loading"><Loading /></el-icon>
          正在加载图片...
        </div>
        <div v-else-if="imageError" class="image-error">
          <el-icon><Warning /></el-icon>
          图片加载失败，请检查文件是否存在
        </div>
        <img
          v-else-if="imageUrl"
          :src="imageUrl"
          class="preview-image"
          @load="onImageLoad"
          @error="onImageError"
        />
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { Document, Picture, FolderOpened, Folder, CopyDocument, Loading, Warning } from '@element-plus/icons-vue'
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
:deep(.image-preview-dialog) {
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
}

:deep(.image-preview-dialog .el-dialog) {
  margin: 0 !important;
  max-height: 90vh !important;
  display: flex !important;
  flex-direction: column !important;
}

:deep(.image-preview-dialog .el-dialog__body) {
  padding: 10px 20px 20px !important;
  flex: 1 !important;
  overflow: hidden !important;
}

.image-preview-container {
  text-align: center;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.image-filename {
  margin-bottom: 15px;
  font-weight: bold;
  color: #333;
  word-break: break-all;
  font-size: 14px;
  flex-shrink: 0;
}

.image-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: #666;
  font-size: 14px;
  padding: 40px;
}

.image-error {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: #f56c6c;
  font-size: 14px;
  padding: 40px;
}

.preview-image {
  max-width: 100%;
  max-height: 65vh;
  object-fit: contain;
  border: 1px solid #ddd;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  flex-shrink: 1;
}

@media (max-width: 768px) {
  .attachment-actions {
    flex-direction: column;
  }

  .attachment-actions .el-button {
    width: 100%;
  }

  .preview-image {
    max-height: 60vh;
  }
}
</style>
