<template>
  <div class="doc-container doc-theme">
    <div class="doc-header">
      <h1>
        <el-icon><Document /></el-icon>
        投诉记录批量新增与数据表初始化使用说明
      </h1>
      <p class="doc-subtitle">路径：系统管理 > 质量异常数据导入；如有必要，使用“数据表初始化”</p>
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
        <li>在“质量异常数据导入”页面下载最新模板（complaint_template.xlsx），模板包含字段说明与示例。</li>
        <li>按模板列填充数据，建议保持列名与系统字段一致以便“智能映射”。</li>
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
          <div class="step-images" v-if="stepImages[idx] && stepImages[idx].length">
            <ImagePreview
              v-for="(img, i) in stepImages[idx]"
              :key="i"
              :filePath="img.filePath"
              :filename="img.filename"
              :relativePath="img.relativePath"
              :width="'180px'"
              :height="'120px'"
              :showDelete="isAdmin"
              @deleted="onImageDeleted(idx, i)"
            />
          </div>
        </li>
      </ol>
    </el-card>

    <el-card class="doc-section fancy" shadow="never">
      <template #header>
        <div class="card-header"><el-icon class="hd"><CircleCheck /></el-icon>三、校验模式说明</div>
      </template>      <ul class="bullet">
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
        <li>导入失败：检查Excel格式、字段映射与校验报告中的错误信息；必要时切换为“宽松模式”。</li>
        <li>图片未显示：确保图片路径为HTTP可访问地址或受支持的上传目录（例如 uploads）。</li>
        <li>重复记录：请根据关键字段避免重复；系统不自动去重，必要时请先清理数据或使用初始化。</li>
      </ul>
    </el-card>

    <el-card class="doc-section fancy" shadow="never">
      <template #header>
        <div class="card-header"><el-icon class="hd"><Tools /></el-icon>五、数据表初始化（可选）</div>
      </template>
      <ul class="bullet">
        <li>切换到“数据表初始化”标签，选择投诉登记记录，阅读风险提示，勾选全部确认项并“确认初始化”。</li>
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
</template>

<script setup>
import { useRouter } from 'vue-router'
import { Document, Collection, CircleCheck, QuestionFilled, Tools, Plus } from '@element-plus/icons-vue'
// 新增：批量导入步骤图片相关依赖（含刷新加载）
import { ref, computed, onMounted } from 'vue'
import { useUserStore } from '@/store/user'
import apiService from '@/services/apiService.js'
import ImagePreview from '@/components/ImagePreview.vue'
import { ElMessage } from 'element-plus'

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
  { text: '进入“系统管理 > 质量异常数据导入”。' },
  { text: '上传Excel文件（支持 .xlsx/.xls，单文件，20MB以内），如存在多个工作表，请先选择目标工作表。' },
  {
    text: '配置字段映射：',
    subBullets: [
      '在“字段映射”步骤中选择要导入的字段，点击“智能映射”自动匹配列，或手动映射。',
      '目标表已固定为投诉登记记录。'
    ]
  },
  { text: '导入确认：选择校验模式（严格/宽松），执行“数据校验”，通过后点击“开始导入”。' }
]

// 管理员状态（仅管理员可添加/提交图片）
const userStore = useUserStore()
const isAdmin = computed(() => userStore.isAdmin)

// 步骤图片：选择、上传与刷新加载
const stepImages = ref({})
const addDialogVisible = ref(false)
const addStepIndex = ref(null)
const selectedFiles = ref([])
const selectedPreviewUrls = ref([])
const uploading = ref(false)

// 计算文件服务基础地址（用于拼接附件访问路径）
const fileServerBase = computed(() => {
  const base = apiService.baseURL || ''
  return base.replace(/\/$/, '').replace(/\/api$/, '')
})

/**
 * 打开添加图片弹窗（批量导入步骤）
 * 参数：idx 当前步骤索引
 * 说明：仅管理员可见，打开前会清理旧的选择状态
 */
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

/**
 * 关闭弹窗并清理临时预览资源
 */
function closeAddDialog() {
  addDialogVisible.value = false
  selectedFiles.value = []
  selectedPreviewUrls.value.forEach(url => URL.revokeObjectURL(url))
  selectedPreviewUrls.value = []
}

/**
 * 选择步骤图片（生成本地预览）
 * 校验：仅图片类型，大小 ≤ 5MB
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
  selectedPreviewUrls.value.forEach(url => URL.revokeObjectURL(url))
  selectedPreviewUrls.value = valid.map(f => URL.createObjectURL(f))
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

/**
 * 构建批量导入页面的步骤图片存储路径 */
function buildCustomPath(idx) {
  return `help-center/topic-batch-import/${idx}`
}

/**
 * 刷新加载：根据 steps2 的长度逐步加载已上传图片
 * 说明：在页面挂载后调用，解决刷新后图片丢失问题
 */
async function loadPersistedStepImages() {
  try {
    // 采用 apiService.baseURL 以兼容 vite 代理（通常为 /api）
    const base = apiService.baseURL || '/api'
    const token = localStorage.getItem('token') || ''
    for (let i = 0; i < steps2.length; i++) {
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

/**
 * 删除回调：从当前步骤的图片列表中移除对应项（批量导入页）
 */
function onImageDeleted(stepIdx, imgIndex) {
  try {
    const arr = stepImages.value[stepIdx] || []
    if (!arr.length) return
    arr.splice(imgIndex, 1)
    stepImages.value[stepIdx] = [...arr]
    ElMessage.success('已从当前步骤移除图片')
  } catch (e) {
    ElMessage.error(`移除失败：${e?.message || e}`)
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
/* 基础主题与卡片风格：与“内部投诉操作指南”保持一致 */
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
.step-images { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 10px; margin-top: 8px; }

/* 添加步骤图片弹窗样式 */
.add-dialog-body { display: flex; flex-direction: column; gap: 12px; }
.file-choose-row { display: flex; align-items: center; gap: 12px; }
.choose-tip { font-size: 12px; color: #909399; }
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