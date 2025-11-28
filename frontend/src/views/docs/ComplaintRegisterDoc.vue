<template>
    <div class="doc-container doc-theme">
      <!-- 统一头部 -->
      <div class="doc-header">
        <h1>
          <el-icon><Document /></el-icon>
          内部投诉单笔新增使用说明
        </h1>
        <p class="doc-subtitle">面向新手的分步指南，路径：质量管理 > 投诉管理 > 内部投诉</p>
      </div>

      <!-- 内容块：统一卡片样式 -->
      <el-card class="doc-section fancy" shadow="never">
        <template #header>
          <div class="card-header">
            <el-icon class="hd"><Collection /></el-icon>
            一、进入登记页面
          </div>
        </template>
        <ol class="doc-steps">
          <li v-for="(step, idx) in steps1" :key="idx">
            <div class="step-text">{{ step }}</div>
            <div class="step-actions" v-if="isAdmin">
              <el-button type="primary" size="small" plain @click="openAddImages(idx)">
                <el-icon class="mr-4"><Plus /></el-icon>
                添加图片
              </el-button>
            </div>
            <div class="step-images" v-if="stepImages[idx] && stepImages[idx].length">
              <div 
                v-for="(img, i) in stepImages[idx]" 
                :key="i" 
                class="image-wrapper"
              >
                <ImagePreview
                  :filePath="img.filePath"
                  :width="'180px'"
                  :height="'120px'"
                  @click="handleImagePreview(idx, i)"
                />
                <el-button
                  v-if="isAdmin"
                  type="danger"
                  size="small"
                  circle
                  class="delete-btn"
                  @click="handleImageDelete(idx, i)"
                >
                  <el-icon><Delete /></el-icon>
                </el-button>
              </div>
            </div>
          </li>
        </ol>
      </el-card>

      <el-card class="doc-section fancy" shadow="never">
        <template #header>
          <div class="card-header"><el-icon class="hd"><Edit /></el-icon>二、填写基本信息</div>
        </template>
        <ul class="bullet">
          <li>投诉日期：选择实际发生日期。</li>
          <li>客户编号：填写或选择客户编号。</li>
          <li>工单号：填写工单号。</li>
          <li>产品名称：填写产品名称，可选填规格型号。</li>
          <li>发生车间：从下拉列表选择发生车间。</li>
          <li>生产数量：填写生产数量。</li>
          <li>不良数量与不良率：可选填不良数量与不良率。</li>
          <li>投诉类别：选择"客诉/内部"等，如为"客诉"可选择客诉类型。</li>
          <li>不良类别与不良项：先选择不良类别，系统会联动加载对应不良项。</li>
          <li>不良描述：清晰描述问题。</li>
          <li>处置措施：填写处置措施，可选填不良原因。</li>
        </ul>
        <el-alert type="info" :closable="false" class="tip">
          <template #title>
            提示：清空附件后提交会将其置空，后端按空字符串保存。
          </template>
        </el-alert>
      </el-card>

      <el-card class="doc-section fancy" shadow="never">
        <template #header>
          <div class="card-header"><el-icon class="hd"><Picture /></el-icon>三、图片附件处理</div>
        </template>
        <ul class="bullet">
          <li>上传附件：点击"选择图片"，支持本地图片上传，上传成功后将生成文件路径。</li>
          <li>图片预览：系统会根据本地上传的预览URL或已保存的文件路径自动展示预览。</li>
          <li>清空附件：如无需附件，可清空附件；提交后后端会保存为空字符串。</li>
        </ul>
      </el-card>

      <el-card class="doc-section fancy" shadow="never">
        <template #header>
          <div class="card-header"><el-icon class="hd"><CircleCheck /></el-icon>四、提交与校验</div>
        </template>
        <ul class="bullet">
          <li>前端校验：提交前会校验表单必填项与数值格式（如不良率范围）。</li>
          <li>后端必填字段：投诉日期、客户编号、工单号、产品名称、发生车间、生产数量、投诉类别、不良类别、不良项、不良描述、处置措施。</li>
          <li>提交成功：后端返回新纪录编号并提示"投诉登记成功"，列表将显示该记录。</li>
          <li>编辑更新：编辑模式下提交会更新原有记录。</li>
        </ul>
      </el-card>

      <el-card class="doc-section fancy" shadow="never">
        <template #header>
          <div class="card-header"><el-icon class="hd"><QuestionFilled /></el-icon>五、常见问题</div>
        </template>
        <ul class="bullet">
          <li>图片无法预览：确认为本地预览URL或服务端可访问路径，系统会自动处理预览。</li>
          <li>上传失败：检查网络与登录状态，确保 Token 有效。</li>
        </ul>
      </el-card>

      <!-- 添加步骤图片弹窗 -->
      <el-dialog
        v-model="addDialogVisible"
        title="添加步骤图片"
        width="560px"
        :close-on-click-modal="false"
      >
        <div class="add-dialog-body">
          <div class="file-choose-row">
            <input type="file" multiple accept="image/*" @change="onStepFilesSelected" />
            <div class="choose-tip">可多选图片，大小建议 ≤ 5MB</div>
          </div>
          <div class="selected-previews">
            <el-image
              v-for="(url, i) in selectedPreviewUrls"
              :key="i"
              :src="url"
              fit="cover"
              class="preview-item"
            />
          </div>
        </div>
        <template #footer>
          <el-button @click="closeAddDialog">取消</el-button>
          <el-button type="primary" :loading="uploading" @click="submitStepImages">提交</el-button>
        </template>
      </el-dialog>

      <!-- Element Plus 图片查看器 -->
      <el-image-viewer
        v-if="imageViewerVisible"
        :url-list="previewImageUrls"
        :initial-index="initialPreviewIndex"
        @close="imageViewerVisible = false"
      />
    </div>
</template>

<script setup>
/**
 * 内部投诉说明页：为第一段步骤列表提供"每条记录图片添加、持久化与刷新加载"功能（仅管理员可见）
 */
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useUserStore } from '@/store/user'
import apiService from '@/services/apiService.js'
import ImagePreview from '@/components/ImagePreview.vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { 
  Document, 
  Collection, 
  Edit, 
  Picture, 
  CircleCheck, 
  QuestionFilled, 
  Plus,
  Delete 
} from '@element-plus/icons-vue'

// 管理员状态
const userStore = useUserStore()
const isAdmin = computed(() => userStore.isAdmin)

// 第一段步骤内容
const steps1 = [
  '登录系统后，进入后台"质量管理 > 投诉管理 > 内部投诉"页面。',
  '点击页面右上或列表工具栏的"新增投诉"按钮，打开内部投诉登记对话框。',
  '未登录用户也可先在文档中心了解流程与字段要求。'
]

// 步骤图片：选择、上传与刷新加载
const stepImages = ref({})
const addDialogVisible = ref(false)
const addStepIndex = ref(null)
const selectedFiles = ref([])
const selectedPreviewUrls = ref([])
const uploading = ref(false)

// 图片预览相关状态
const imageViewerVisible = ref(false)
const previewImageUrls = ref([])
const initialPreviewIndex = ref(0)

/**
 * 判断是否为开发环境
 */
const isDev = computed(() => {
  const base = apiService.baseURL || ''
  return base.includes('localhost') || base.includes('127.0.0.1')
})

/**
 * 计算文件服务基础地址（用于拼接附件访问路径）
 * - 开发环境：使用空字符串，让 Vite 代理处理 /files 路径
 * - 生产环境：Nginx 直接提供 /files 静态文件服务
 */
const fileServerBase = computed(() => {
  if (isDev.value) {
    return ''
  }
  return window.location.origin
})

/**
 * 构建步骤图片的自定义存储路径
 * 作用：与后端上传/列出接口保持一致，用于持久化与刷新加载
 * 规则：help-center/topic-internal/<stepIndex>
 */
function buildCustomPath(idx) {
  return `help-center/topic-internal/${idx}`
}

/**
 * 构建图片访问URL
 * @param {Object} imageInfo - 图片信息对象，包含 url, relativePath 等字段
 * @returns {string} 完整的图片访问URL
 */
function buildImageUrl(imageInfo) {
  // 1. 如果后端返回了完整的 url（以 /files 开头）
  if (imageInfo.url && imageInfo.url.startsWith('/files')) {
    return isDev.value ? imageInfo.url : `${fileServerBase.value}${imageInfo.url}`
  }
  
  // 2. 如果后端返回了完整的 http/https URL，直接使用
  if (imageInfo.url && (imageInfo.url.startsWith('http://') || imageInfo.url.startsWith('https://'))) {
    return imageInfo.url
  }
  
  // 3. 根据 relativePath 构建路径
  const rel = (imageInfo.relativePath || imageInfo.url || '').replace(/\\/g, '/')
  // 移除可能的 attachments/ 前缀
  const cleanPath = rel.replace(/^attachments[\\\/]?/, '')
  const staticUrl = `/files/attachments/${cleanPath}`
  
  return isDev.value ? staticUrl : `${fileServerBase.value}${staticUrl}`
}

/**
 * 刷新加载：根据 steps1 的长度逐步加载已上传图片
 * 说明：在页面挂载后调用，解决刷新后图片丢失问题
 */
async function loadPersistedStepImages() {
  try {
    for (let i = 0; i < steps1.length; i++) {
      const customPath = buildCustomPath(i)
      try {
        const response = await apiService.get(`/upload/list-attachments?customPath=${encodeURIComponent(customPath)}`)
        const data = response.data
        if (data?.success) {
          const list = Array.isArray(data.data) ? data.data : []
          const images = list.map(it => ({
            filePath: buildImageUrl(it),
            filename: it.filename,
            relativePath: it.relativePath
          }))
          if (images.length) {
            stepImages.value[i] = images
          }
        }
      } catch (e) {
        console.warn(`加载步骤 ${i} 图片失败`, e)
      }
    }
  } catch (e) {
    console.warn('刷新加载步骤图片异常：', e)
  }
}

/**
 * 清理所有预览URL，防止内存泄漏
 */
function cleanupPreviewUrls() {
  selectedPreviewUrls.value.forEach(url => URL.revokeObjectURL(url))
  selectedPreviewUrls.value = []
}

onMounted(() => {
  loadPersistedStepImages()
})

onBeforeUnmount(() => {
  // 组件卸载时清理预览URL
  cleanupPreviewUrls()
})

/**
 * 打开添加图片弹窗
 * @param {number} idx - 步骤索引
 */
function openAddImages(idx) {
  if (!isAdmin.value) {
    ElMessage.error('仅管理员可添加图片')
    return
  }
  addStepIndex.value = idx
  selectedFiles.value = []
  cleanupPreviewUrls()
  addDialogVisible.value = true
}

/**
 * 关闭弹窗并清理临时预览资源
 */
function closeAddDialog() {
  addDialogVisible.value = false
  selectedFiles.value = []
  cleanupPreviewUrls()
}

/**
 * 文件选择事件处理
 * @param {Event} event - 文件选择事件
 */
function onStepFilesSelected(event) {
  const files = Array.from(event.target.files || [])
  if (!files.length) return
  
  const valid = []
  for (const f of files) {
    if (!f.type || !f.type.startsWith('image/')) {
      ElMessage.error(`不支持的文件类型：${f.name}`)
      continue
    }
    if (f.size > 5 * 1024 * 1024) {
      ElMessage.error(`图片过大（>5MB）：${f.name}`)
      continue
    }
    valid.push(f)
  }
  
  selectedFiles.value = valid
  cleanupPreviewUrls()
  selectedPreviewUrls.value = valid.map(f => URL.createObjectURL(f))
}

/**
 * 提交步骤图片到服务端
 */
async function submitStepImages() {
  try {
    if (!isAdmin.value) {
      ElMessage.error('仅管理员可提交图片')
      return
    }
    if (addStepIndex.value == null) {
      ElMessage.error('未选择步骤')
      return
    }
    if (!selectedFiles.value.length) {
      ElMessage.warning('请先选择图片')
      return
    }
    
    uploading.value = true
    const customPath = buildCustomPath(addStepIndex.value)

    const uploadPromises = selectedFiles.value.map(file => {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('customPath', customPath)
      
      return apiService.post('/upload/complaint-attachment', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      }).then(response => {
        const data = response.data
        if (!data?.success) {
          throw new Error(data?.message || '上传失败')
        }
        const rel = (data.relativePath || data?.data?.relativePath || '').replace(/\\/g, '/')
        const filePath = buildImageUrl({ url: null, relativePath: rel })
        return { filePath, filename: data.filename, relativePath: rel }
      })
    })

    const results = await Promise.all(uploadPromises)

    // 使用展开运算符确保响应式更新
    const currentImages = stepImages.value[addStepIndex.value] || []
    stepImages.value = {
      ...stepImages.value,
      [addStepIndex.value]: [...currentImages, ...results]
    }

    ElMessage.success('图片已上传并添加到当前步骤')
    closeAddDialog()
  } catch (e) {
    ElMessage.error(`提交失败：${e?.message || e}`)
  } finally {
    uploading.value = false
  }
}

/**
 * 图片预览处理函数
 * @param {number} stepIdx - 步骤索引
 * @param {number} imgIdx - 图片索引
 */
function handleImagePreview(stepIdx, imgIdx) {
  const images = stepImages.value[stepIdx] || []
  if (!images.length) return

  previewImageUrls.value = images.map(img => img.filePath)
  initialPreviewIndex.value = imgIdx
  imageViewerVisible.value = true
}

/**
 * 图片删除处理函数
 * @param {number} stepIdx - 步骤索引
 * @param {number} imgIdx - 图片索引
 */
async function handleImageDelete(stepIdx, imgIdx) {
  if (!isAdmin.value) {
    ElMessage.error('仅管理员可删除图片')
    return
  }

  try {
    await ElMessageBox.confirm('确定要删除这张图片吗？此操作将从服务器永久删除文件。', '确认删除', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })

    const images = stepImages.value[stepIdx] || []
    const imageToDelete = images[imgIdx]

    if (!imageToDelete || !imageToDelete.relativePath) {
      ElMessage.error('无法获取图片信息，删除失败')
      return
    }

    // 调用后端API删除文件
    const response = await apiService.delete('/upload/delete-attachment', {
      data: {
        relativePath: imageToDelete.relativePath
      }
    })

    if (response.data?.success) {
      // 从前端数组中移除
      images.splice(imgIdx, 1)
      stepImages.value = {
        ...stepImages.value,
        [stepIdx]: [...images]
      }
      ElMessage.success('图片已成功删除')
    } else {
      ElMessage.error(response.data?.message || '删除失败')
    }
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error(`删除过程中发生错误：${error.message || '未知错误'}`)
    }
    // 用户取消删除，不做处理
  }
}
</script>

<style scoped>
/* 统一文档主题容器宽度：与"投诉批量导入指南"保持一致，避免页面宽度塌陷 */
.doc-theme { max-width: 1000px; margin: 0 auto; width: 100%; box-sizing: border-box; }

.doc-section { margin: 18px 0; }
.doc-steps { list-style: none; padding-left: 0; counter-reset: step; }
.doc-steps li { position: relative; padding-left: 42px; margin: 8px 0; line-height: 1.7; background: #f9fbff; border: 1px solid #eef3ff; border-radius: 8px; padding: 10px 12px 10px 42px; }
.doc-steps li::before { counter-increment: step; content: counter(step); position: absolute; left: 12px; top: 50%; transform: translateY(-50%); width: 24px; height: 24px; border-radius: 50%; background: #409EFF; color: #fff; font-weight: 600; display: flex; align-items: center; justify-content: center; font-size: 13px; box-shadow: 0 2px 4px rgba(64,158,255,.3); }

.bullet { list-style: none; padding-left: 0; }
.bullet li { position: relative; padding-left: 22px; margin: 6px 0; line-height: 1.7; background: #fafafa; border: 1px solid #f0f0f0; border-radius: 8px; padding: 8px 10px 8px 22px; color: #333; }
.bullet li::before { content: ""; position: absolute; left: 10px; top: 50%; transform: translateY(-50%); width: 8px; height: 8px; border-radius: 50%; background: #a0c4ff; box-shadow: 0 2px 4px rgba(160,196,255,.4); }

.doc-steps li:hover, .bullet li:hover { border-color: #dbe7ff; background: #f5f9ff; }

/* 头部标题与图标颜色：强化主标题辨识度 */
.doc-header h1 { color: #303133; }
.doc-header h1 :deep(.el-icon) { color: #409EFF; }

/* 卡片头部标题与图标颜色 */
.card-header { color: #303133; }
.card-header .hd { color: #409EFF; }

/* 信息提示颜色微调：与主题色协调 */
.tip :deep(.el-alert__title) { color: #606266; }

/* 步骤内操作与图片区域样式 */
.step-text { font-size: 14px; color: #333; }
.step-actions { margin-top: 8px; }
.step-images { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 8px; }

/* 图片包装器：用于定位删除按钮 */
.image-wrapper { position: relative; display: inline-block; }
.image-wrapper .delete-btn {
  position: absolute;
  top: -8px;
  right: -8px;
  z-index: 10;
  opacity: 0;
  transition: opacity 0.2s;
}
.image-wrapper:hover .delete-btn { opacity: 1; }

/* 添加步骤图片弹窗样式 */
.add-dialog-body { display: flex; flex-direction: column; gap: 12px; }
.file-choose-row { display: flex; align-items: center; gap: 12px; margin-bottom: 15px; }
.choose-tip { color: #999; font-size: 13px; }
.selected-previews { display: flex; flex-wrap: wrap; gap: 8px; }
.preview-item { width: 120px; height: 90px; border-radius: 6px; box-shadow: 0 2px 8px rgba(0,0,0,0.06); }
</style>
