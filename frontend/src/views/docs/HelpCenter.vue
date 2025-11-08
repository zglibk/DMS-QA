<template>
  <!-- 帮助中心：采用上下结构（上部为标题说明），下部为左右结构（左侧功能菜单，右侧内容与图片展示区） -->
  <AppLayout>
    <div class="help-center">
      <!-- 页面左右结构 -->
      <div class="bottom-content">
        <!-- 左侧：功能菜单（树形结构，便于扩展） -->
        <div class="left-panel">
          <el-card class="menu-card" shadow="hover">
            <template #header>
              <div class="card-header">
                <span>功能菜单</span>
              </div>
            </template>
            <el-tree
              :data="topicTree"
              :props="treeProps"
              node-key="id"
              :default-expand-all="true"
              :highlight-current="true"
              @node-click="handleNodeClick"
              class="topic-tree"
            >
              <template #default="{ node, data }">
                <span class="tree-node">
                  <el-icon class="node-icon" :style="{ color: getIconColor(data.icon) }">
                    <component :is="getIconComponent(data.icon)" />
                  </el-icon>
                  <span class="node-label" :title="node.label">{{ node.label }}</span>
                </span>
              </template>
            </el-tree>
          </el-card>
        </div>

        <!-- 右侧：内容与图片展示区 -->
        <div class="right-panel">
          <el-card class="content-card" shadow="never">
            <!-- 固定标题栏（置于卡片内部，避免占用左右列之间的整行区域） -->
            <div class="content-sticky-header">
              <el-icon><Document /></el-icon>
              <span>{{ activeTopic?.title || (activeViewComponent ? activeViewTitle : '请选择左侧菜单中的功能模块') }}</span>
            </div>
            <!-- 组件型视图：内联文档子页面（不跳转路由） -->
            <div v-if="activeViewComponent" class="doc-inline-wrapper">
              <component :is="activeViewComponent" />
              <div class="doc-footer">
                <el-button type="primary" @click="goDocsHome">返回帮助中心</el-button>
              </div>
            </div>

            <!-- 说明型视图：通用说明块 -->
            <div v-else-if="activeTopic" class="topic-content">
              <div class="doc-section">
                <h3 class="section-title" aria-hidden="true" style="display:none"></h3>
                <ol class="doc-steps">
                  <!-- 每条记录（步骤）下方增加 添加图片 按钮与缩略图显示 -->
                  <li v-for="(step, idx) in activeTopic.steps" :key="idx">
                    <div class="step-text">{{ step }}</div>
                    <div class="step-actions" v-if="isAdmin">
                      <el-button type="primary" size="small" plain @click="openAddImages(idx)">
                        <el-icon class="mr-4"><Plus /></el-icon>
                        添加图片
                      </el-button>
                    </div>
                    <!-- 已上传到当前步骤的图片缩略图：使用 el-upload 显示 -->
                    <div class="step-images" v-if="stepImages[idx] && stepImages[idx].length">
                      <el-upload
                        :file-list="stepImages[idx]"
                        list-type="picture-card"
                        :on-preview="handlePictureCardPreview"
                        :before-remove="(file) => handleFileRemove(file, idx)"
                        :class="{ 'display-only': !isAdmin }"
                      >
                      </el-upload>
                    </div>
                  </li>
                </ol>
              </div>
            </div>

            <!-- 添加步骤图片弹窗（仅管理员可见） -->
            <el-dialog
              v-if="isAdmin"
              v-model="addDialogVisible"
              title="添加步骤图片"
              width="600px"
              :close-on-click-modal="false"
              :destroy-on-close="true"
            >
              <div class="add-dialog-body">
                <div class="file-choose-row">
                  <el-upload
                    action="#"
                    list-type="picture-card"
                    :on-preview="handlePictureCardPreview"
                    :on-remove="handleRemove"
                    :on-change="onStepFilesSelected"
                    :auto-upload="false"
                    multiple
                  >
                    <el-icon><Plus /></el-icon>
                  </el-upload>
                  <span class="choose-tip">支持多选，单张不超过 5MB，仅图片类型</span>
                </div>
                <!-- el-upload list-type="picture-card" 已提供预览，移除自定义预览区 -->
              </div>
              <template #footer>
                <el-button @click="closeAddDialog">取消</el-button>
                <el-button type="primary" :loading="uploading" @click="submitStepImages">提交</el-button>
              </template>
            </el-dialog>

            <!-- 图片预览器 -->
            <el-image-viewer
              v-if="imageViewerVisible"
              :url-list="imageUrls"
              :initial-index="initialIndex"
              @close="imageViewerVisible = false"
            />

          </el-card>
        </div>
      </div>
    </div>
  </AppLayout>
</template>

<script setup>
/**
 * 帮助中心页面（公共路由）
 * 目标：
 * - 在同一路由内，左侧树点击后于右侧内容区切换显示，不再跳转到新页面
 * - 保留通用说明内容的同时，支持内嵌文档子页面的“内联展示”
 */
import { ref, computed, shallowRef, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/store/user'
import apiService from '@/services/apiService.js'
import { ElMessage, ElMessageBox, ElImageViewer } from 'element-plus'
import AppLayout from '@/components/common/AppLayout.vue'
import { Tools, Document, DataBoard, Setting, Notebook, Collection, Histogram, PriceTag, Box, Files, Picture, Plus } from '@element-plus/icons-vue'
// 新增：引入需要内联展示的文档子页面组件
import ComplaintRegisterDoc from '@/views/docs/ComplaintRegisterDoc.vue'
import ComplaintBatchImportDoc from '@/views/docs/ComplaintBatchImportDoc.vue'


// 路由实例
const router = useRouter()

// 用户与管理员状态（响应式）
const userStore = useUserStore()
const isAdmin = computed(() => userStore.isAdmin)

// 删除：上传地址与鉴权头部（兼容开发与生产环境）
// const uploadAction = computed(() => `${apiService.baseURL}/upload/notice-image`)
// const uploadHeaders = computed(() => ({ Authorization: `Bearer ${localStorage.getItem('token') || ''}` }))

// 删除：管理员图片上传前校验
// function beforeTopicImageUpload(file) {
//   if (!isAdmin.value) {
//     ElMessage.error('仅管理员可添加说明图片')
//     return false
//   }
//   if (!file.type || !file.type.startsWith('image/')) {
//     ElMessage.error('请上传图片文件（jpg/png/webp 等）')
//     return false
//   }
//   const limitMB = 5
//   if (file.size > limitMB * 1024 * 1024) {
//     ElMessage.error(`图片大小不能超过 ${limitMB}MB`)
//     return false
//   }
//   return true
// }

// 删除：管理员图片上传成功回调
// function handleTopicImageUploadSuccess(response, file) {
//   const url = response?.fileInfo?.fullUrl || response?.fileInfo?.accessUrl || response?.url
//   if (!url) {
//     ElMessage.error('上传成功但未返回图片地址')
//     return
//   }
//   if (!activeTopic.value) {
//     ElMessage.warning('当前无说明主题，图片未追加')
//     return
//   }
//   if (!Array.isArray(activeTopic.value.images)) {
//     activeTopic.value.images = []
//   }
//   activeTopic.value.images.push({ src: url, alt: activeTopic.value.title })
//   ElMessage.success('图片已添加到当前说明的示例区')
// }

/**
 * 返回帮助中心首页（同页切换）
 * 行为：清空右侧当前视图与主题，不进行路由跳转
 */
function goDocsHome() {
  activeViewComponent.value = null
  activeTopic.value = null
  activeViewTitle.value = null
}

/**
 * 图标组件映射
 * 用途：为左侧菜单树的每个节点渲染对应的图标
 */
const iconMap = {
  Tools,
  Document,
  DataBoard,
  Setting,
  Notebook,
  Collection,
  Histogram,
  PriceTag,
  Box,
  Files,
  Picture
}

/**
 * 获取图标组件
 * 参数：iconName - 图标名称字符串
 * 返回：图标组件，默认使用 Document
 */
function getIconComponent(iconName) {
  return iconMap[iconName] || Document
}

/**
 * 获取图标颜色
 * 用途：根据树节点的 icon 名称返回建议的主题色，增强侧边栏辨识度
 * 参数：iconName - 图标名称字符串（与 iconMap 的键一致）
 * 返回：颜色字符串（十六进制或 CSS 颜色值），默认回退为次要文字色
 */
function getIconColor(iconName) {
  const iconColorMap = {
    Collection: '#409EFF',     // 投诉管理：主题蓝
    Notebook: '#67C23A',       // 文档与说明：成功绿
    Files: '#E6A23C',          // 文件与导入：警示橙
    Histogram: '#909399',      // 质量与统计：中性灰
    DataBoard: '#8D9AE8',      // 数据看板：柔和紫
    Setting: '#909399',        // 系统设置：中性灰
    PriceTag: '#E6A23C',       // 价格标签：橙色
    Box: '#8D9AE8',            // 设备与资产：柔和紫
    Document: '#909399',       // 默认文档：中性灰
    Picture: '#409EFF'         // 图片与示例：主题蓝
  }
  return iconColorMap[iconName] || '#909399'
}

/**
 * 左侧菜单树数据结构
 * 说明：按功能模块分组，子节点为具体使用指南
 * 注意：不展示数据库真实字段名，仅描述操作行为
 */
/** 
 * 左侧菜单树数据结构 
 * 优化：统一图标配置，便于维护 
 */ 
 const topicTree = ref([ 
   { 
     id: 'group-complaint', 
     label: '投诉管理', 
     icon: 'Collection', 
     children: [ 
       { id: 'topic-internal', label: '内部投诉操作指南', icon: 'Notebook' }, 
       { id: 'topic-batch-import', label: '投诉批量导入指南', icon: 'Files' } 
     ] 
   }, 
   { 
     id: 'group-quality', 
     label: '质量管理', 
     icon: 'Histogram', 
     children: [ 
       { id: 'topic-quality-targets', label: '质量目标使用指引', icon: 'DataBoard' }, 
       { id: 'topic-rework', label: '返工登记操作指南', icon: 'Tools' } 
     ] 
   }, 
   { 
     id: 'group-assets', 
     label: '仪器与材料', 
     icon: 'Box', 
     children: [ 
       { id: 'topic-instruments', label: '仪器台账使用指南', icon: 'Document' }, 
       { id: 'topic-material-price', label: '材料价格管理指南', icon: 'PriceTag' } 
     ] 
   }, 
   { 
     id: 'group-system', 
     label: '系统管理', 
     icon: 'Setting', 
     children: [ 
       { id: 'topic-config', label: '系统配置快速指引', icon: 'Setting' } 
     ] 
   } 
 ]) 
 
 /** 
  * 主题内容字典 
  * ⚠️ 修复：删除重复定义 
  */ 
 const topicContentMap = { 
   'topic-internal': { 
     title: '内部投诉操作指南', 
     steps: [ 
       '进入"质量管理 > 投诉管理 > 内部投诉"页面。', 
       '点击页面上的"新增"按钮，打开登记表单。', 
       '依次填写基础信息、问题描述、处置措施等内容。', 
       '如需上传图片，点击"上传图片"并在右侧预览区查看。', 
       '确认信息无误后点击"提交"，系统将提示提交结果。' 
     ] 
   }, 
   'topic-batch-import': { 
     title: '投诉批量导入指南', 
     steps: [ 
       '进入"系统管理 > 质量异常数据导入"。', 
       '下载模板并按说明准备 Excel 文件。', 
       '上传文件后进行字段映射与数据预览。', 
       '选择校验模式（严格/宽松），确认无误后执行导入。', 
       '查看导入结果与校验提示，必要时修正后重试。' 
     ] 
   }, 
   'topic-instruments': { 
     title: '仪器台账使用指南', 
     steps: [ 
       '进入"仪器管理 > 仪器台账"。', 
       '使用搜索和筛选快速定位设备。', 
       '点击某条记录查看详情并进行维护或校准登记。' 
     ] 
   }, 
   'topic-material-price': { 
     title: '材料价格管理指南', 
     steps: [ 
       '进入"成本管理 > 材料价格管理"。', 
       '通过筛选条件查看材料与价格信息。', 
       '支持新增、编辑和导出价格数据以便分析。' 
     ] 
   }, 
   'topic-quality-targets': { 
     title: '质量目标使用指引', 
     steps: [ 
       '进入"质量管理 > 质量目标管理"。', 
       '选择目标项查看指标与统计数据。', 
       '可在目标详情页面查看月度趋势与达成情况。' 
     ] 
   }, 
   'topic-rework': { 
     title: '返工登记操作指南', 
     steps: [ 
       '进入"质量管理 > 返工登记"。', 
       '填写返工原因、数量和涉及批次。', 
       '提交后可在列表页面查看与导出记录。' 
     ] 
   }, 
   'topic-config': { 
     title: '系统配置快速指引', 
     steps: [ 
       '进入"系统管理 > 系统配置"。', 
       '根据业务需要调整参数与开关设置。', 
       '保存后刷新页面使配置生效。' 
     ] 
   } 
 } 
 
/**
 * 树组件属性配置
 * 用途：定义使用 label 与 children 字段
 */
const treeProps = { label: 'label', children: 'children' }

// 当前激活主题内容（通用说明型）
const activeTopic = ref(null)
// 新增：当前右侧激活的“内联文档组件”（组件型视图）
const activeViewComponent = shallowRef(null)
// 新增：右侧内联视图的动态标题
const activeViewTitle = ref(null)
// 新增：记录当前激活主题的键（用于构建上传自定义路径）
const activeTopicKey = ref(null)



/**
 * 处理左侧菜单点击事件
 * 参数：data - 当前节点数据；node - 树节点对象
 * 行为：在右侧内容区进行“同页切换显示”
 * - 对特定主题显示内联文档组件（组件型视图）
 * - 其余主题显示通用说明内容（说明型视图）
 */
function handleNodeClick(data, node) {
  if (!data.children) {
    // 组件型视图（内联显示）
    if (data.id === 'topic-internal') {
      activeViewComponent.value = ComplaintRegisterDoc
      activeTopic.value = null
      activeViewTitle.value = '内部投诉操作指南'
      activeTopicKey.value = null
      return
    }
    if (data.id === 'topic-batch-import') {
      activeViewComponent.value = ComplaintBatchImportDoc
      activeTopic.value = null
      activeViewTitle.value = '投诉记录批量导入与数据表初始化使用说明'
      activeTopicKey.value = null
      return
    }
    // 说明型视图
    activeViewComponent.value = null
    activeTopic.value = topicContentMap[data.id] || null
    activeViewTitle.value = null
    activeTopicKey.value = data.id || null
    // 切换主题时，重置步骤图片缓存
    stepImages.value = {}
  }
}

/**
 * 步骤图片：选择与上传
 * 说明：在每条步骤记录下添加图片，选择后在该 li 下方展示缩略图，点击放大镜进行放大预览，提交后保存到 uploads/attachments 的指定子路径
 */
// 每个步骤下的图片列表（key 为步骤索引）
const stepImages = ref({})
// 弹窗可见性与上下文
const addDialogVisible = ref(false)
const addStepIndex = ref(null)
// 选择的待上传文件与预览 URL
const selectedFiles = ref([])
const selectedPreviewUrls = ref([])
const uploading = ref(false)
// 计算文件服务器基础地址（去掉 /api，适配静态文件服务 /files/*）
const fileServerBase = computed(() => {
  const base = apiService.baseURL || ''
  return base.replace(/\/$/, '').replace(/\/api$/, '')
})

// 图片预览
const imageViewerVisible = ref(false)
const imageUrls = ref([])
const initialIndex = ref(0)

/**
 * 构建步骤图片的自定义存储路径
 * 作用：与后端上传/列出接口保持一致，用于持久化与刷新加载
 * 规则：help-center/<topicKey>/<stepIndex>
 * @param {string} topicKey 主题键，如 'topic-quality-targets'
 * @param {number} idx 步骤索引
 * @returns {string} 自定义存储路径
 */
function buildCustomPath(topicKey, idx) {
  return `help-center/${topicKey}/${idx}`
}

/**
 * 刷新加载：为当前说明型主题加载已上传图片
 * 场景：页面刷新或切换主题时调用，确保缩略图持久显示
 * 实现：遍历 activeTopic.steps，根据自定义路径调用 /upload/list-attachments
 * 成功后，将返回的 url/relativePath 组装为 ImagePreview 的入参写入 stepImages
 */
async function loadPersistedStepImagesForActiveTopic() {
  try {
    const key = activeTopicKey.value
    const topic = activeTopic.value
    if (!key || !topic || !Array.isArray(topic.steps)) return
    const base = apiService.baseURL || '/api'
    const token = localStorage.getItem('token') || ''
    for (let i = 0; i < topic.steps.length; i++) {
      const customPath = buildCustomPath(key, i)
      const url = `${base}/upload/list-attachments?customPath=${encodeURIComponent(customPath)}`
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } })
      const data = await res.json()
      if (!res.ok || !data?.success) {
        console.warn('加载步骤图片失败', i, data?.message)
        continue
      }
      const list = Array.isArray(data.data) ? data.data : []
      const images = list.map((it) => {
        // 后端可能返回 url 或 relativePath，均做兼容
        const rel = (it.relativePath || '').replace(/\\/g, '/')
        const relWithoutPrefix = rel.replace(/^attachments[\\\/]/, '')
        const staticUrl = `/files/attachments/${relWithoutPrefix}`
        const mergedUrl = it.url || staticUrl
        const filePath = `${fileServerBase.value}${mergedUrl}`
        return {
          name: it.filename || relWithoutPrefix.split('/').pop(),
          url: filePath,
          status: 'success',
          relativePath: relWithoutPrefix // 修正：使用移除前缀的路径
        }
      })
      if (images.length) {
        stepImages.value[i] = images
      }
    }
  } catch (e) {
    console.warn('刷新加载步骤图片异常：', e)
  }
}

/**
 * 生命周期：组件挂载后尝试加载（若未来实现主题持久化可直接生效）
 */
onMounted(() => {
  if (activeTopicKey.value && activeTopic.value && Array.isArray(activeTopic.value.steps)) {
    loadPersistedStepImagesForActiveTopic()
  }
})

/**
 * 监听主题键变化：切换说明型主题时重置并加载对应步骤图片
 */
watch(activeTopicKey, async (key) => {
  // 切换主题时，重置步骤图片缓存
  stepImages.value = {}
  if (!key || !activeTopic.value || !Array.isArray(activeTopic.value.steps)) return
  await loadPersistedStepImagesForActiveTopic()
})

/**
 * 打开添加图片弹窗（步骤级别）
 * 参数：idx - 当前步骤索引
 */
function openAddImages(idx) {
  if (!isAdmin.value) {
    ElMessage.error('仅管理员可添加图片')
    return
  }
  addStepIndex.value = idx
  selectedFiles.value = []
  // 释放已有预览 URL
  selectedPreviewUrls.value.forEach(url => URL.revokeObjectURL(url))
  selectedPreviewUrls.value = []
  addDialogVisible.value = true
}

/**
 * 关闭添加图片弹窗，并清理临时预览资源
 */
function closeAddDialog() {
  addDialogVisible.value = false
  selectedFiles.value = []
  selectedPreviewUrls.value.forEach(url => URL.revokeObjectURL(url))
  selectedPreviewUrls.value = []
}

// 新增：处理图片预览
const handlePictureCardPreview = (file) => {
  // 查找被点击图片所在的图片列表
  let currentImageList = [];
  let allImageUrls = [];

  // 场景一：预览已上传的步骤图片
  const stepIdx = Object.keys(stepImages.value).find(idx => 
    stepImages.value[idx].some(img => img.url === file.url)
  );

  if (stepIdx) {
    currentImageList = stepImages.value[stepIdx];
    allImageUrls = currentImageList.map(img => img.url);
  } else {
    // 场景二：预览在“添加图片”弹窗中新选择的图片
    // 此时 file.url 是 blob URL，直接使用
    // uploadFiles 是 el-upload 内部维护的列表
    // 但我们无法直接访问，所以退而求其次，只预览当前点击的图片
    allImageUrls = [file.url];
  }

  const findIndex = allImageUrls.findIndex(url => url === file.url);
  
  imageUrls.value = allImageUrls;
  initialIndex.value = findIndex > -1 ? findIndex : 0;
  imageViewerVisible.value = true;
};

// 新增：处理已上传文件的删除
const handleFileRemove = (file, stepIndex) => {
  return new Promise((resolve, reject) => {
    // 从 file 对象获取 relativePath，这是删除文件的关键标识
    const { relativePath } = file;

    if (!isAdmin.value) {
      ElMessage.error('仅管理员可删除图片');
      return reject(); // 阻止 el-upload 立即移除文件
    }

    if (!relativePath) {
      ElMessage.error('无法确定文件路径，删除失败');
      // 对于没有 relativePath 的文件，可能是本地新选但未上传的，
      // 或者数据结构有问题。阻止删除以防误操作。
      return reject();
    }

    ElMessageBox.confirm('确定要删除该图片吗？', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    }).then(async () => {
      // 用户确认后，执行删除
      try {
        const token = localStorage.getItem('token') || '';
        const base = apiService.baseURL || '/api';
        const url = `${base}/upload/attachment`;

        const response = await fetch(url, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ relativePath }),
        });

        const result = await response.json();

        if (result.success) {
          ElMessage.success('图片删除成功');
          resolve(); // 允许 el-upload 从 UI 移除文件
        } else {
          ElMessage.error(result.message || '图片删除失败');
          reject(); // 后端删除失败，阻止 el-upload 从 UI 移除文件
        }
      } catch (error) {
        ElMessage.error('请求删除接口时发生错误');
        console.error('删除图片失败:', error);
        reject(); // 网络等错误，同样阻止 UI 移除
      }
    }).catch(() => {
      // 用户点击了“取消”
      ElMessage.info('已取消删除');
      reject();
    });
  });
};

// 新增：处理图片删除
const handleRemove = (removedFile, uploadFiles) => {
  // 同步 selectedFiles 列表
  selectedFiles.value = uploadFiles.map(f => f.raw);
};

/**
 * 步骤图片选择事件处理（el-upload on-change 回调）
 * 用途：同步待上传文件列表
 */
function onStepFilesSelected(changedFile, uploadFiles) {
  // uploadFiles 是 el-upload 内部维护的完整文件列表
  const rawFiles = uploadFiles.map(f => f.raw);

  // 基础校验（可选，更适合在 before-upload 中做）
  for (const f of rawFiles) {
    if (!f.type || !f.type.startsWith('image/')) {
      ElMessage.error(`不支持的文件类型：${f.name}`);
      // 此处无法直接移除，仅提示
    }
    if (f.size > 5 * 1024 * 1024) {
      ElMessage.error(`图片过大（>5MB）：${f.name}`);
    }
  }

  // 同步 selectedFiles 列表，供 submitStepImages 使用
  selectedFiles.value = rawFiles;

  // el-upload 自带预览，不再需要手动管理 selectedPreviewUrls
  selectedPreviewUrls.value.forEach(url => URL.revokeObjectURL(url))
  selectedPreviewUrls.value = []
}

/**
 * 提交当前步骤的选中图片到后台
 * 目标：将图片存入 uploads/attachments/指定路径（自动创建），并在当前 li 下方展示缩略图（使用 ImagePreview）
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
    const topicKey = activeTopicKey.value || 'unknown-topic'
    const stepIdx = addStepIndex.value
    const customPath = `help-center/${topicKey}/${stepIdx}`
    const token = localStorage.getItem('token') || ''

    // 并发上传所有图片
    const uploadPromises = selectedFiles.value.map(file => {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('customPath', customPath)
      const url = `${apiService.baseURL}/upload/complaint-attachment`
      return fetch(url, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      }).then(res => res.json())
    })
    const results = await Promise.all(uploadPromises)
    const failedUploads = results.filter(r => !r.success)
    if (failedUploads.length) {
      ElMessage.error(`${failedUploads.length} 张图片上传失败`)
    } else {
      ElMessage.success('所有图片上传成功')
      closeAddDialog()
      // 刷新当前主题的图片
      await loadPersistedStepImagesForActiveTopic()
    }
  } catch (e) {
    ElMessage.error('图片提交异常')
    console.error('图片提交异常:', e)
  } finally {
    uploading.value = false
  }
}



</script>

<style scoped>
/* ============================================
   CSS 变量定义 - 统一管理主题色和尺寸
   ============================================ */
:root {
  --title-color: #303133;
  --subtitle-color: #606266;
  --border-color: #EBEEF5;
  --bg-light: #F9FBFF;
  --bg-border-light: #EEF3FF;
  --primary-color: #409EFF;
  --text-regular: #606266;
  --text-secondary: #909399;

  /* 间距系统 */
  --spacing-xs: 4px;
  --spacing-sm: 8px;
  --spacing-md: 12px;
  --spacing-lg: 16px;
  --spacing-xl: 24px;
  --spacing-xxl: 32px;
  --badge-size: 24px;
  --badge-size-sm: 20px;
  --image-col-min-desktop: 160px;
  --image-col-min-tablet: 140px;
  --image-col-min-mobile: 120px;
  --preview-item-width: 120px;
  --preview-item-height: 90px;
  --hover-bg: #f5f7fa;
  --focus-bg: #eef5ff;
  --radius-sm: 4px;
  --radius-md: 6px;
  --radius-lg: 8px;

  /* 阴影 */
  --shadow-sm: 0 2px 4px rgba(0, 0, 0, 0.06);
  --shadow-md: 0 2px 8px rgba(0, 0, 0, 0.08);
  --shadow-primary: 0 2px 4px rgba(64, 158, 255, 0.3);
}
/* ============================================
   主容器布局 - 修复高度计算
   ============================================ */
.help-center {
  --content-gap: 10px; /* 左侧面板与右侧内容区之间的统一间距变量，默认 20px */
  padding: var(--spacing-md) var(--spacing-xl) var(--spacing-xl);
  height: 100vh; /* 修改：使用视口高度 */
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-sizing: border-box;
}

/* 页面标题区域（如果需要） */
.page-title {
  font-size: 22px;
  margin: 0 0 6px 0;
  color: var(--title-color);
  font-weight: 600;
}

.page-subtitle {
  color: var(--subtitle-color);
  margin: 0 0 10px 0;
  font-size: 14px;
}

/* ============================================
   左右布局容器 - 优化滚动逻辑
   ============================================ */
.bottom-content {
  display: flex;
  gap: var(--content-gap); /* 使用统一变量控制两列间距 */
  margin-top: var(--spacing-lg);
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

/* ============================================
   左侧面板 - 固定宽度，独立滚动
   ============================================ */
.left-panel {
  width: clamp(240px, 20vw, 320px); /* 优化：调整宽度范围 */
  flex-shrink: 0; /* 不收缩 */
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.menu-card {
  height: 100%; /* 填满左侧面板 */
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.menu-card :deep(.el-card__body) {
  flex: 1;
  overflow-y: auto; /* 关键：内容滚动 */
  overflow-x: hidden;
  padding: var(--spacing-sm);
}

/* 菜单卡片头部 */
.card-header {
  display: flex;
  align-items: center;
  font-weight: 600;
  color: var(--title-color);
}

.topic-tree :deep(.tree-node .node-icon) {
  margin-right: 5px; /* 为图标和文字之间添加间距 */
}

/* ============================================
   右侧面板 - 内容区独立滚动
   ============================================ */
.right-panel {
  flex: 1; /* 占据剩余空间 */
  min-width: 0; /* 防止溢出 */
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.content-card {
  flex: 1; /* 优化：使用 flex: 1 替代 height: 100% */
  min-height: 0; /* 关键：确保 flex 子项可以正确缩小 */
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.content-card :deep(.el-card__body) {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden; /* 外层不滚动 */
  padding: 0;
}

/* ============================================
   固定标题栏 - 置顶不滚动
   ============================================ */
.content-sticky-header {
  position: sticky;
  top: 0;
  z-index: 100; /* 提高层级 */
  display: flex;
  align-items: center;
  min-height: 44px;
  padding: 18px 20px;
  background: #fff;
  border-bottom: 1px solid var(--border-color);
  font-weight: 600;
  font-size: 16px;
  color: var(--title-color);
  flex-shrink: 0;
  box-shadow: 0 1px 4px rgba(0,0,0,0.04); /* 添加轻微阴影 */
}

.content-sticky-header .el-icon {
  color: var(--primary-color) !important; /* 强制应用主题色 */
  margin-right: 8px;
  font-size: 18px; /* 调整图标大小 */
}

/* ============================================
   内联文档视图 - 滚动容器
   ============================================ */
.doc-inline-wrapper {
  flex: 1;
  overflow-y: auto; /* 关键：内容滚动 */
  overflow-x: hidden;
  padding: 0 var(--spacing-lg) var(--spacing-lg);
  background: #fff; /* 防止标题下方出现灰色空白（继承全局灰背景时） */
  display: block; /* 修改：使用 block 替代 flow-root */
}

/* 隐藏子页面的返回按钮 */
.doc-inline-wrapper :deep(.doc-footer) {
  display: none;
}

/* 移除子页面顶部空白 */
.doc-inline-wrapper :deep(.doc-container) {
  padding-top: 0;
  margin-top: 0;
}

.doc-inline-wrapper :deep(.doc-section.fancy:first-of-type) {
  margin-top: 0;
}

/* 强制子页面占满宽度 */
.doc-inline-wrapper :deep(.doc-theme) {
  width: 100%;
  max-width: none;
  margin: 0;
  box-sizing: border-box;
}
.gray-area {
  display: none;
}

/* 隐藏子页面的标题 */
.doc-inline-wrapper :deep(.doc-header) {
  display: none;
}

/* ============================================
   说明型视图 - 滚动容器
   ============================================ */
.topic-content {
  flex: 1;
  overflow-y: auto; /* 关键：内容滚动 */
  overflow-x: hidden;
  padding: 0 var(--spacing-lg) var(--spacing-lg);
  background: #fff; /* 防止标题下方出现灰色空白 */
  display: flow-root; /* 避免首个内容块的margin与父级折叠 */
}

/* ============================================
   步骤列表样式
   ============================================ */
.section-title {
  font-size: 16px;
  margin: 0 0 var(--spacing-sm) 0;
  color: var(--title-color);
  font-weight: 600;
}

.doc-steps {
  list-style: none;
  padding-left: 0;
  counter-reset: step;
  margin: 0;
}

.doc-steps li {
  position: relative;
  padding: 10px 12px 10px 42px;
  margin: var(--spacing-sm) 0;
  line-height: 1.7;
  background: var(--bg-light);
  border: 1px solid var(--bg-border-light);
  border-radius: var(--radius-lg);
  transition: all 0.2s ease;
}

.doc-steps li:hover {
  border-color: var(--primary-color);
  box-shadow: var(--shadow-sm);
}

.doc-steps li::before {
  counter-increment: step;
  content: counter(step);
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  width: var(--badge-size);
  height: var(--badge-size);
  border-radius: 50%;
  background: var(--primary-color);
  color: #fff;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  box-shadow: var(--shadow-primary);
  flex-shrink: 0; /* 防止序号被压缩 */
}

/* ============================================
   步骤内操作与图片区域
   ============================================ */
.step-text {
  font-size: 14px;
  color: #333;
  word-break: break-word; /* 防止长文本溢出 */
}

.step-actions {
  margin-top: var(--spacing-sm);
}

.step-images {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-md);
  margin-top: var(--spacing-sm);
}

.step-images :deep(.image-preview-wrapper) {
  display: inline-flex; /* 强制内联 flex 布局 */
  width: 180px; /* 固定宽度 */
  height: 120px; /* 固定高度 */
  margin: 0 8px 8px 0 !important; /* 统一外边距 */
}

/* ============================================
   添加步骤图片弹窗
   ============================================ */
.add-dialog-body {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
}

/* 新增：修复 el-upload 在 picture-card 模式下的布局问题 */
.add-dialog-body :deep(.el-upload--picture-card) {
  --el-upload-picture-card-size: 120px;
  width: var(--el-upload-picture-card-size);
  height: var(--el-upload-picture-card-size);
  margin-bottom: 8px; /* 与列表项保持一致 */
}

/* 新增：当 el-upload 用于纯展示（禁用状态）时，隐藏上传按钮 */
.step-images .el-upload--picture-card {
  display: none;
}


.add-dialog-body :deep(.el-upload-list--picture-card) {
  --el-upload-list-picture-card-size: 120px;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.add-dialog-body :deep(.el-upload-list--picture-card .el-upload-list__item) {
  width: var(--el-upload-list-picture-card-size);
  height: var(--el-upload-list-picture-card-size);
  margin: 0; /* 重置 margin */
}

.file-choose-row {
  display: flex;
  align-items: center;
  margin-bottom: 15px;
}

.choose-tip {
  margin-left: 15px;
  color: #999;
  font-size: 13px;
}

.selected-previews {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-sm);
}

.preview-item {
  width: var(--preview-item-width);
  height: var(--preview-item-height);
  object-fit: cover;
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-sm);
  transition: transform 0.2s ease;
}

.preview-item:hover {
  transform: scale(1.05);
  box-shadow: var(--shadow-md);
}

/* ============================================
   侧边栏菜单树样式
   ============================================ */
.topic-tree {
  background: transparent;
}

.topic-tree :deep(.el-tree-node__content) {
  height: 36px;
  padding: 4px 8px;
  border-radius: var(--radius-sm);
  transition: background-color 0.2s ease;
}

.topic-tree :deep(.el-tree-node__content):hover {
  background-color: #f5f7fa;
}

.topic-tree :deep(.el-tree-node__content):focus-visible {
  outline: 2px solid var(--primary-color);
  background-color: var(--focus-bg);
}
.tree-node {
  display: inline-flex;
  align-items: center;
  gap: var(--spacing-sm);
  line-height: 1.3;
  width: 100%;
  overflow: hidden;
}

.node-icon {
  font-size: 18px;
  flex-shrink: 0;
  transition: color 0.2s ease, transform 0.2s ease;
}

.node-label {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.topic-tree :deep(.el-tree-node__content):hover .node-icon {
  transform: translateY(-1px);
}

/* ============================================
   空状态
   ============================================ */
.empty-state {
  padding: var(--spacing-xl);
  text-align: center;
  color: var(--text-secondary);
}

/* ============================================
   响应式设计
   ============================================ */
@media (max-width: 1200px) {
  .left-panel {
    width: clamp(220px, 25vw, 280px);
  }
  
  .step-images {
    grid-template-columns: repeat(auto-fill, minmax(var(--image-col-min-mobile), 1fr));
  }
}

@media (max-width: 768px) {
  .help-center {
    padding: var(--spacing-sm) var(--spacing-md);
  }
  
  .bottom-content {
    flex-direction: column;
    gap: var(--content-gap); /* 使用统一变量控制两列间距 */
    margin-top: var(--spacing-lg);
    flex: 1;
    min-height: 0;
    overflow: hidden;
  }
  
  .left-panel {
    width: 100%;
    max-height: 300px; /* 限制移动端菜单高度 */
  }
  
  .right-panel {
    min-height: 400px;
  }
  
  .content-sticky-header {
    padding: var(--spacing-md);
    font-size: 15px;
  }
  
  .doc-steps li {
    padding-left: 38px;
  }
  
  .doc-steps li::before {
    width: var(--badge-size-sm);
    height: var(--badge-size-sm);
    font-size: 12px;
    left: 10px;
  }
  
  .step-images {
    grid-template-columns: repeat(auto-fill, minmax(var(--image-col-min-tablet), 1fr));
  }
}

/* ============================================
   打印样式优化
   ============================================ */
@media print {
  .left-panel,
  .step-actions,
  .content-sticky-header {
    display: none;
  }
  
  .right-panel {
    width: 100%;
  }
  
  .doc-steps li {
    page-break-inside: avoid;
  }
}

/* ============================================
   无障碍优化
   ============================================ */
.topic-tree :deep(.el-tree-node:focus > .el-tree-node__content) {
  outline: 2px solid var(--primary-color);
  outline-offset: 2px;
}

/* 高对比度模式支持 */
@media (prefers-contrast: high) {
  .doc-steps li {
    border-width: 2px;
  }
  
  .content-sticky-header {
    border-bottom-width: 2px;
  }
}

/* 减少动画（用户偏好） */
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
</style>
