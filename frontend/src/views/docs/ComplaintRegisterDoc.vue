<template>
  <AppLayout>
    <div class="doc-container doc-theme">
      <!-- 统一头部 -->
      <div class="doc-header">
        <h1>
          <el-icon><document /></el-icon>
          内部投诉单笔新增使用说明
        </h1>
        <p class="doc-subtitle">面向新手的分步指南，路径：质量管理 > 投诉管理 > 内部投诉</p>
      </div>

      <!-- 内容块：统一卡片样式 -->
      <el-card class="doc-section fancy" shadow="never">
        <template #header>
          <div class="card-header">
            <el-icon class="hd"><collection /></el-icon>
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
              <ImagePreview
                v-for="(img, i) in stepImages[idx]"
                :key="i"
                :filePath="img.filePath"
                :width="'180px'"
                :height="'120px'"
              />
            </div>
          </li>
        </ol>
      </el-card>

      <el-card class="doc-section fancy" shadow="never">
        <template #header>
          <div class="card-header"><el-icon class="hd"><edit /></el-icon>二、填写基本信息</div>
        </template>
        <ul class="bullet">
          <li>投诉日期：选择实际发生日期。</li>
          <li>客户编号：填写或选择客户编号。</li>
          <li>工单号：填写工单号。</li>
          <li>产品名称：填写产品名称，可选填规格型号。</li>
          <li>发生车间：从下拉列表选择发生车间。</li>
          <li>生产数量：填写生产数量。</li>
          <li>不良数量与不良率：可选填不良数量与不良率。</li>
          <li>投诉类别：选择“客诉/内部”等，如为“客诉”可选择客诉类型。</li>
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
          <div class="card-header"><el-icon class="hd"><picture /></el-icon>三、图片附件处理</div>
        </template>
        <ul class="bullet">
          <li>上传附件：点击“选择图片”，支持本地图片上传，上传成功后将生成文件路径。</li>
          <li>图片预览：系统会根据本地上传的预览URL或已保存的文件路径自动展示预览。</li>
          <li>清空附件：如无需附件，可清空附件；提交后后端会保存为空字符串。</li>
        </ul>
      </el-card>

      <el-card class="doc-section fancy" shadow="never">
        <template #header>
          <div class="card-header"><el-icon class="hd"><circle-check /></el-icon>四、提交与校验</div>
        </template>
        <ul class="bullet">
          <li>前端校验：提交前会校验表单必填项与数值格式（如不良率范围）。</li>
          <li>后端必填字段：投诉日期、客户编号、工单号、产品名称、发生车间、生产数量、投诉类别、不良类别、不良项、不良描述、处置措施。</li>
          <li>提交成功：后端返回新纪录编号并提示“投诉登记成功”，列表将显示该记录。</li>
          <li>编辑更新：编辑模式下提交会更新原有记录。</li>
        </ul>
      </el-card>

      <el-card class="doc-section fancy" shadow="never">
        <template #header>
          <div class="card-header"><el-icon class="hd"><question-filled /></el-icon>五、常见问题</div>
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
    </div>
  </AppLayout>
</template>

<script setup>
/**
 * 内部投诉说明页：为第一段步骤列表提供“每条记录图片添加、持久化与刷新加载”功能（仅管理员可见）
 */
import { ref, computed, onMounted } from 'vue'
import { useUserStore } from '@/store/user'
import apiService from '@/services/apiService.js'
import ImagePreview from '@/components/ImagePreview.vue'
import { ElMessage } from 'element-plus'
import { Document as document, Collection as collection, Edit as edit, Picture as picture, CircleCheck as circleCheck, QuestionFilled as questionFilled, Plus } from '@element-plus/icons-vue'

// 管理员状态
const userStore = useUserStore()
const isAdmin = computed(() => userStore.isAdmin)

// 第一段步骤内容
const steps1 = [
  '登录系统后，进入后台“质量管理 > 投诉管理 > 内部投诉”页面。',
  '点击页面右上或列表工具栏的“新增投诉”按钮，打开内部投诉登记对话框。',
  '未登录用户也可先在文档中心了解流程与字段要求。'
]

// 步骤图片：选择、上传与刷新加载（同 HelpCenter 逻辑）
const stepImages = ref({})
const addDialogVisible = ref(false)
const addStepIndex = ref(null)
const selectedFiles = ref([])
const selectedPreviewUrls = ref([])
const uploading = ref(false)
// 计算文件服务基础地址（用于拼接附件访问路径）
// 在生产环境中，Nginx 直接提供 /files 静态文件服务，不需要 API 路径
const fileServerBase = computed(() => {
  const base = apiService.baseURL || ''
  // 如果是开发环境（localhost 或 127.0.0.1），使用代理路径
  if (base.includes('localhost') || base.includes('127.0.0.1')) {
    return base.replace(/\/$/, '').replace(/\/api$/, '')
  }
  // 生产环境直接使用当前域名，去掉 /api 部分
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
 * 刷新加载：根据 steps1 的长度逐步加载已上传图片
 * 说明：在页面挂载后调用，解决刷新后图片丢失问题
 */
async function loadPersistedStepImages() {
  try {
    // 采用 apiService.baseURL 以兼容 vite 代理（通常为 /api）
    const base = apiService.baseURL || '/api'
    const token = localStorage.getItem('token') || ''
    for (let i = 0; i < steps1.length; i++) {
      const customPath = buildCustomPath(i)
      const url = `${base}/upload/list-attachments?customPath=${encodeURIComponent(customPath)}`
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } })
      const data = await res.json()
      if (!res.ok || !data?.success) {
        console.warn('加载步骤图片失败', i, data?.message)
        continue
      }
      const list = Array.isArray(data.data) ? data.data : []
      const images = list.map(it => ({
        filePath: `${fileServerBase.value}${it.url}`,
        filename: it.filename,
        relativePath: it.relativePath
      }))
      if (images.length) {
        stepImages.value[i] = images
      }
    }
  } catch (e) {
    console.warn('刷新加载步骤图片异常：', e)
  }
}

onMounted(() => {
  loadPersistedStepImages()
})

function openAddImages(idx) {
  if (!isAdmin.value) {
    ElMessage.error('仅管理员可添加图片')
    return
  }
  addStepIndex.value = idx
  selectedFiles.value = []
  selectedPreviewUrls.value.forEach(url => URL.revokeObjectURL(url))
  selectedPreviewUrls.value = []
  addDialogVisible.value = true
}

function closeAddDialog() {
  addDialogVisible.value = false
  selectedFiles.value = []
  selectedPreviewUrls.value.forEach(url => URL.revokeObjectURL(url))
  selectedPreviewUrls.value = []
}

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
  selectedPreviewUrls.value.forEach(url => URL.revokeObjectURL(url))
  selectedPreviewUrls.value = valid.map(f => URL.createObjectURL(f))
}

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
    const token = localStorage.getItem('token') || ''

    const results = await Promise.all(
      selectedFiles.value.map(async (file) => {
        const fd = new FormData()
        fd.append('file', file)
        fd.append('customPath', customPath)
        const res = await fetch(`${apiService.baseURL}/upload/complaint-attachment`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: fd
        })
        const data = await res.json()
        if (!res.ok || !data?.success) {
          throw new Error(data?.message || '上传失败')
        }
        const rel = (data.relativePath || data?.data?.relativePath || '').replace(/\\/g, '/')
        const relWithoutPrefix = rel.replace(/^attachments\//, '')
        const filePath = `${fileServerBase.value}/files/attachments/${relWithoutPrefix}`
        return { filePath, filename: data.filename, relativePath: rel }
      })
    )

    if (!stepImages.value[addStepIndex.value]) stepImages.value[addStepIndex.value] = []
    stepImages.value[addStepIndex.value].push(...results)

    ElMessage.success('图片已上传并添加到当前步骤')
    closeAddDialog()
  } catch (e) {
    ElMessage.error(`提交失败：${e?.message || e}`)
  } finally {
    uploading.value = false
  }
}
</script>

<style scoped>
/* 统一文档主题容器宽度：与“投诉批量导入指南”保持一致，避免页面宽度塌陷 */
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

/* 列表项数字圆标颜色已为主题蓝（#409EFF），无需调整；如需更改可在此覆盖 */
/* .doc-steps li::before { background: #409EFF; } */
.bullet { list-style: none; padding-left: 0; }
.bullet li { position: relative; padding-left: 22px; margin: 6px 0; line-height: 1.7; background: #fafafa; border: 1px solid #f0f0f0; border-radius: 8px; padding: 8px 10px 8px 22px; color: #333; }
.bullet li::before { content: ""; position: absolute; left: 10px; top: 50%; transform: translateY(-50%); width: 8px; height: 8px; border-radius: 50%; background: #a0c4ff; box-shadow: 0 2px 4px rgba(160,196,255,.4); }
.doc-steps li:hover, .bullet li:hover { border-color: #dbe7ff; background: #f5f9ff; }
</style>