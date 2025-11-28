<template>
  <div class="doc-container doc-theme">
    <div class="doc-header">
      <h1>
        <el-icon><Document /></el-icon>
        投诉记录批量新增与数据表初始化使用说明
      </h1>
      <p class="doc-subtitle">路径：系统管理 > 质量异常数据导入；如有必要，使用"数据表初始化"</p>
      <el-alert type="success" :closable="false">
        <template #title>
          本文档可直接访问，无需登录和权限校验
        </template>
      </el-alert>
    </div>

    <el-card class="doc-section fancy" shadow="never">
      <template #header>
        <div class="card-header"><el-icon class="hd"><Document /></el-icon>一、准备Excel模板</div>
      </template>
      <ul class="bullet">
        <li>在"质量异常数据导入"页面，找到"下载模板"按钮，下载（complaint_template.xlsx）模板表，模板包含字段说明与示例。</li>
        <li>按模板列填充数据，建议保持列名与系统字段一致以便"智能映射"。</li>
        <li>图片附件路径可为空；如需导入图片，请填写服务端可访问的URL或上传目录路径。</li>
      </ul>
    </el-card>

    <el-card class="doc-section fancy" shadow="never">
      <template #header>
        <div class="card-header"><el-icon class="hd"><Collection /></el-icon>二、批量导入流程</div>
      </template>
      <ol class="doc-steps">
        <li v-for="(step, idx) in steps2" :key="idx">
          <div class="step-text">{{ step.text }}</div>
          <ul v-if="step.subBullets && step.subBullets.length" class="bullet">
            <li v-for="(b, i) in step.subBullets" :key="i">{{ b }}</li>
          </ul>
          <div class="step-actions" v-if="isAdmin">
            <el-button type="primary" size="small" plain @click="openAddImages(idx)">
              <el-icon class="mr-4"><Plus /></el-icon>
              添加图片
            </el-button>
          </div>
          <div class="step-images" v-if="getStepImageList(idx).length">
            <el-upload
              :file-list="getStepImageList(idx)"
              list-type="picture-card"
              :on-preview="(file) => handlePictureCardPreview(file, idx)"
              :before-remove="(file) => handleFileRemove(file, idx)"
              :class="{ 'display-only': !isAdmin }"
            >
            </el-upload>
          </div>
        </li>
      </ol>
    </el-card>

    <el-card class="doc-section fancy" shadow="never">
      <template #header>
        <div class="card-header"><el-icon class="hd"><CircleCheck /></el-icon>三、校验模式说明</div>
      </template>
      <ul class="bullet">
        <li>严格模式：对投诉记录所需信息进行全面校验，涵盖日期、客户/供应商、工单/产品、发生地点、数量与类别等关键项；任何缺失或格式不符将直接阻止导入。适用于正式上线或数据质量要求高的场景。</li>
        <li>宽松模式：仅校验最关键的必填信息（如投诉日期与客户信息），其余缺失项可先导入，后续在系统内逐步补齐。适用于数据不完整或需要分步导入的情况。</li>
        <li>通用规则：两种模式都会进行基础格式校验（日期、数值范围、不重复性等），并生成校验报告；若报告仍有问题，建议先在Excel修复后再导入。</li>
      </ul>
    </el-card>

    <el-card class="doc-section fancy" shadow="never">
      <template #header>
        <div class="card-header"><el-icon class="hd"><QuestionFilled /></el-icon>四、常见问题与处理</div>
      </template>
      <ul class="bullet">
        <li>导入失败：检查Excel格式、字段映射与校验报告中的错误信息；必要时切换为"宽松模式"。</li>
        <li>图片未显示：确保图片路径为HTTP可访问地址或受支持的上传目录（例如 uploads）。</li>
        <li>重复记录：请根据关键字段避免重复；系统不自动去重，必要时请先清理数据或使用初始化。</li>
      </ul>
    </el-card>

    <el-card class="doc-section fancy" shadow="never">
      <template #header>
        <div class="card-header"><el-icon class="hd"><Tools /></el-icon>五、数据表初始化（可选）</div>
      </template>
      <ul class="bullet">
        <li>切换到"数据表初始化"标签，选择投诉登记记录，阅读风险提示，勾选全部确认项并"确认初始化"。</li>
        <li>结果反馈：系统弹出初始化结果对话框，成功后再执行批量导入。</li>
      </ul>
    </el-card>

    <div class="doc-footer">
      <el-button type="primary" @click="goBack">返回文档首页</el-button>
    </div>
    <!-- 添加步骤图片弹窗（批量导入） -->
    <el-dialog
      v-model="addDialogVisible"
      title="添加步骤图片"
      width="560px"
      :close-on-click-modal="false"
    >
      <div class="add-dialog-body">
        <div class="file-choose-row">
          <el-upload
            ref="uploadRef"
            :auto-upload="false"
            :multiple="true"
            :on-change="onStepFilesSelected"
            :on-remove="handleDialogRemove"
            :before-upload="beforeUpload"
            :file-list="[]"
            accept="image/*"
            list-type="picture-card"
          >
            <el-icon><Plus /></el-icon>
            <div class="el-upload__text">
              点击上传图片<br>
              <span class="el-upload__tip">支持多选，单张 ≤ 5MB</span>
            </div>
          </el-upload>
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
import { useRouter } from 'vue-router'
import { Document, Collection, CircleCheck, QuestionFilled, Tools, Plus } from '@element-plus/icons-vue'
import { ref, computed, onMounted } from 'vue'
import { useUserStore } from '@/store/user'
import apiService from '@/services/apiService.js'
import { ElMessage, ElMessageBox } from 'element-plus'

const router = useRouter()

/**
 * 返回文档首页
 * 用途：当该页面作为独立路由访问时，返回到帮助中心首页
 * 注意：在帮助中心内联模式下，该按钮已被父容器隐藏
 */
const goBack = () => {
  router.push('/docs/help')
}

// 批量导入流程步骤（用于渲染步骤与图片区域）
const steps2 = [
  { text: '进入"后台 > 质量管理 > 质量异常数据导入"执行批量导入。' },
  { text: '上传Excel文件（支持 .xlsx/.xls，单文件，20MB以内），如存在多个工作表，请先选择目标工作表。' },
  {
    text: '配置字段映射：',
    subBullets: [
      '在"字段映射"步骤中选择要导入的字段，点击"智能映射"自动匹配列，或手动映射。',
      '目标表已固定为投诉登记记录。'
    ]
  },
  { text: '导入确认：选择校验模式（严格/宽松），执行"数据校验"，通过后点击"开始导入"。' }
]

// 管理员状态（仅管理员可添加/提交图片）
const userStore = useUserStore()
const isAdmin = computed(() => userStore.isAdmin)

// 步骤图片：选择、上传与刷新加载
const stepImages = ref({})
const addDialogVisible = ref(false)
const addStepIndex = ref(null)
const selectedFiles = ref([])
const uploading = ref(false)
const uploadRef = ref(null)

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
 * - 生产环境：Nginx 在8080端口提供 /files 静态文件服务
 */
const fileServerBase = computed(() => {
  if (isDev.value) {
    return ''
  }
  // 生产环境：Nginx 在8080端口提供 /files 静态文件服务
  const protocol = window.location.protocol;
  const hostname = window.location.hostname;
  return `${protocol}//${hostname}:8080`;
})

/**
 * 将内部图片数据转换为 el-upload 期望的格式
 * @param {number} idx - 步骤索引
 * @returns {Array} el-upload 格式的文件列表 { name, url, filePath }
 */
function getStepImageList(idx) {
  // 直接返回已加载并格式化好的图片列表
  return stepImages.value[idx] || []
}

/**
 * 上传前校验
 * @param {File} file - 待上传文件
 * @returns {boolean} 是否允许上传
 */
function beforeUpload(file) {
  // 校验文件类型
  if (!file.type || !file.type.startsWith('image/')) {
    ElMessage.error(`不支持的文件类型：${file.name}`)
    return false
  }
  // 校验文件大小（5MB）
  if (file.size > 5 * 1024 * 1024) {
    ElMessage.error(`图片过大（>5MB）：${file.name}`)
    return false
  }
  return true
}

/**
 * 弹窗内移除文件处理函数
 * 用途：同步 selectedFiles 列表
 */
function handleDialogRemove(removedFile, uploadFiles) {
  selectedFiles.value = uploadFiles.map(f => f.raw)
}

/**
 * 打开添加图片弹窗（批量导入步骤）
 * @param {number} idx - 当前步骤索引
 * 说明：仅管理员可见，打开前会清理旧的选择状态
 */
function openAddImages(idx) {
  if (!isAdmin.value) {
    ElMessage.error('仅管理员可添加图片')
    return
  }
  addStepIndex.value = idx
  selectedFiles.value = []
  if (uploadRef.value) {
    uploadRef.value.clearFiles()
  }
  addDialogVisible.value = true
}

/**
 * 关闭弹窗并清理临时预览资源
 */
function closeAddDialog() {
  addDialogVisible.value = false
  selectedFiles.value = []
  if (uploadRef.value) {
    uploadRef.value.clearFiles()
  }
}

/**
 * 步骤图片选择事件处理（el-upload on-change 回调）
 * 用途：同步待上传文件列表
 */
function onStepFilesSelected(changedFile, uploadFiles) {
  // 过滤掉不符合要求的文件
  const validFiles = uploadFiles.filter(f => {
    const file = f.raw
    if (!file.type || !file.type.startsWith('image/')) {
      return false
    }
    if (file.size > 5 * 1024 * 1024) {
      return false
    }
    return true
  })

  // 同步 selectedFiles 列表，供 submitStepImages 使用
  selectedFiles.value = validFiles.map(f => f.raw)
}

/**
 * 提交步骤图片到服务端（uploads/attachments 指定子路径）
 * 路径规则：help-center/topic-batch-import/<stepIndex>
 * 成功后：在当前步骤下方展示缩略图（ImagePreview）
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
    const customPath = `help-center/topic-batch-import/${addStepIndex.value}`

    // 并发上传所有图片
    const uploadPromises = selectedFiles.value.map(file => {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('customPath', customPath)
      
      return apiService.post('/upload/complaint-attachment', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      }).then(response => response.data)
    })
    
    const results = await Promise.all(uploadPromises)
    const failedUploads = results.filter(r => !r.success)
    if (failedUploads.length) {
      ElMessage.error(`${failedUploads.length} 张图片上传失败`)
    } else {
      // 上传成功后，调用刷新加载函数，而不是手动拼接
      await loadPersistedStepImages() 
      closeAddDialog()
    }
  } catch (e) {
    ElMessage.error(`提交失败：${e?.message || e}`)
  } finally {
    uploading.value = false
  }
}

/**
 * 构建批量导入页面的步骤图片存储路径
 * @param {number} idx - 步骤索引
 * @returns {string} 存储路径
 */
function buildCustomPath(idx) {
  return `help-center/topic-batch-import/${idx}`
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
 * 刷新加载：根据 steps2 的长度逐步加载已上传图片
 * 说明：在页面挂载后调用，解决刷新后图片丢失问题
 */
async function loadPersistedStepImages() {
  try {
    for (let i = 0; i < steps2.length; i++) {
      const customPath = buildCustomPath(i)
      try {
        const response = await apiService.get(`/upload/list-attachments?customPath=${encodeURIComponent(customPath)}`)
        const data = response.data
        if (data?.success) {
          const list = Array.isArray(data.data) ? data.data : []
          // 转换为 el-upload 标准格式，并兼容 url/relativePath
          const images = list.map(item => ({
            name: item.filename, // el-upload: name
            url: buildImageUrl(item), // el-upload: url
            status: 'success', // el-upload: status
            // 保留原始数据，用于预览和删除
            relativePath: item.relativePath,
            raw: item // 原始数据
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

onMounted(() => {
  loadPersistedStepImages()
})

/**
 * 图片预览处理函数
 * 用途：处理el-upload组件的图片预览功能，支持在同一步骤的所有图片间切换
 * @param {Object} file - 当前点击的文件对象
 * @param {number} stepIdx - 步骤索引
 */
function handlePictureCardPreview(file, stepIdx) {
  // 聚合所有步骤的图片，用于在预览时左右切换
  const allImages = Object.values(stepImages.value).flat()
  if (!allImages.length) return

  // 获取所有图片URL用于预览
  previewImageUrls.value = allImages.map(img => img.url)
  
  // 找到当前点击图片的索引
  const clickedUrl = file.url
  const clickedIndex = allImages.findIndex(img => img.url === clickedUrl)
  initialPreviewIndex.value = clickedIndex >= 0 ? clickedIndex : 0
  
  imageViewerVisible.value = true
}

/**
 * 文件删除处理函数
 * 用途：处理el-upload组件的文件删除确认，调用后端接口执行物理删除
 * @param {Object} file - 待删除的文件对象（el-upload格式）
 * @param {number} stepIdx - 步骤索引
 * @returns {Promise<boolean>} 是否允许删除
 */
async function handleFileRemove(file, stepIdx) {
  if (!isAdmin.value) {
    ElMessage.error('仅管理员可删除图片');
    return Promise.reject(false);
  }

  try {
    await ElMessageBox.confirm(
      '确定要删除这张图片吗？此操作将从服务器永久删除文件。',
      '确认删除',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning',
      }
    );

    // 从 file.raw.relativePath 中提取正确的相对路径
    // 后端需要的是 'attachments' 目录之后的部分
    const fullRelativePath = file.raw.relativePath || '';
    const pathParts = fullRelativePath.split(/[\\\/]/);
    const attachmentsIndex = pathParts.indexOf('attachments');
    const correctRelativePath = attachmentsIndex > -1 
      ? pathParts.slice(attachmentsIndex + 1).join('/') 
      : fullRelativePath;

    if (!correctRelativePath) {
        ElMessage.error('无法确定文件路径，删除失败');
        return Promise.reject(false);
    }

    const response = await apiService.delete('/upload/attachment', {
      data: { relativePath: correctRelativePath },
    });

    if (response.data?.success) {
      ElMessage.success('图片已成功删除');
      if (stepImages.value[stepIdx]) {
        const imageIndex = stepImages.value[stepIdx].findIndex(
          (img) => img.url === file.url
        );
        if (imageIndex !== -1) {
          stepImages.value[stepIdx].splice(imageIndex, 1);
        }
      }
      return true;
    } else {
      ElMessage.error(response.data?.message || '删除失败');
      return Promise.reject(false);
    }
  } catch (error) {
    if (error === 'cancel') {
      ElMessage.info('已取消删除');
    } else {
      ElMessage.error(`删除操作失败: ${error?.message || '未知错误'}`);
    }
    return Promise.reject(false);
  }
}
</script>

<style scoped>
/* 列表美化：为此页面的要点与步骤统一样式（如果存在） */
.doc-steps { list-style: none; padding-left: 0; counter-reset: step; }
.doc-steps li { position: relative; padding-left: 42px; margin: 8px 0; line-height: 1.7; background: #f9fbff; border: 1px solid #eef3ff; border-radius: 8px; padding: 10px 12px 10px 42px; }
.doc-steps li::before { counter-increment: step; content: counter(step); position: absolute; left: 12px; top: 50%; transform: translateY(-50%); width: 24px; height: 24px; border-radius: 50%; background: #409EFF; color: #fff; font-weight: 600; display: flex; align-items: center; justify-content: center; font-size: 13px; box-shadow: 0 2px 4px rgba(64,158,255,.3); }

.bullet { list-style: none; padding-left: 0; }
.bullet li { position: relative; padding-left: 22px; margin: 6px 0; line-height: 1.7; background: #fafafa; border: 1px solid #f0f0f0; border-radius: 8px; padding: 8px 10px 8px 22px; color: #333; }
.bullet li::before { content: ""; position: absolute; left: 10px; top: 50%; transform: translateY(-50%); width: 8px; height: 8px; border-radius: 50%; background: #a0c4ff; box-shadow: 0 2px 4px rgba(160,196,255,.4); }
/* 基础主题与卡片风格：与"内部投诉操作指南"保持一致 */
.doc-theme { max-width: 1000px; margin: 0 auto; }
.doc-header h1 { display: flex; align-items: center; gap: 8px; }
.fancy { border-radius: 10px; box-shadow: 0 6px 20px rgba(0,0,0,0.06); }
.card-header .hd { margin-right: 6px; }
.doc-section { margin: 8px 0; }
/* 列表美化补充：交互悬停效果与内部投诉页保持一致 */
.doc-steps li:hover, .bullet li:hover { border-color: #dbe7ff; background: #f5f9ff; }
/* 步骤内操作与图片区域样式（与内部投诉说明页保持一致） */
.step-text { font-size: 14px; color: #333; }
.step-actions { margin-top: 8px; }
.step-images { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 8px; }

/* 添加步骤图片弹窗样式 */
.add-dialog-body { display: flex; flex-direction: column; gap: 12px; }
.file-choose-row { display: flex; align-items: center; margin-bottom: 15px; }
.choose-tip { margin-left: 15px; color: #999; font-size: 13px; }
.selected-previews { display: flex; flex-wrap: wrap; gap: 8px; }
.preview-item { width: 120px; height: 90px; border-radius: 6px; box-shadow: 0 2px 8px rgba(0,0,0,0.06); }
/* 头部标题与图标颜色：强化主标题辨识度 */
.doc-header h1 { color: #303133; }
.doc-header h1 :deep(.el-icon) { color: #409EFF; }

/* 卡片头部标题与图标颜色 */
.card-header { color: #303133; }
.card-header .hd { color: #409EFF; }

/* 信息提示颜色微调：与主题色协调 */
.tip :deep(.el-alert__title) { color: #606266; }
</style>
