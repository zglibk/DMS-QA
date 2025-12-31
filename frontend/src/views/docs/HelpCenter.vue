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
              :default-expanded-keys="['topic-home']"
              :highlight-current="true"
              :accordion="true"
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
              <span>{{ activeTopic?.title || (activeViewComponent ? activeViewTitle : '帮助中心') }}</span>
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
                  <!-- 时间线布局：每个步骤 -->
                  <li v-for="(step, idx) in activeTopic.steps" :key="idx">
                    <div class="step-content-wrapper">
                      <div class="step-header">
                        <span class="step-label">步骤 {{ idx + 1 }}</span>
                      </div>
                      <div class="step-text">{{ step }}</div>
                      <div class="step-actions" v-if="isAdmin">
                        <el-button type="primary" size="small" plain @click="openAddImages(idx)">
                          <el-icon class="mr-4"><Plus /></el-icon>
                          添加图片
                        </el-button>
                      </div>
                      <!-- 已上传到当前步骤的图片缩略图：使用 el-upload 显示 -->
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
                    </div>
                  </li>
                </ol>
              </div>
            </div>

            <!-- 默认欢迎页面：首次进入时显示 -->
            <div v-else class="welcome-content">
              <div class="welcome-hero">
                <div class="welcome-icon">
                  <el-icon :size="36"><QuestionFilled /></el-icon>
                </div>
                <h2 class="welcome-title">欢迎使用帮助中心</h2>
                <p class="welcome-desc">在这里您可以找到系统各功能模块的详细操作指南</p>
              </div>
              
              <div class="quick-start-section">
                <h3 class="section-heading">
                  <el-icon><Compass /></el-icon>
                  <span>快速开始</span>
                </h3>
                <div class="feature-cards">
                  <div class="feature-card" @click="handleQuickNav('topic-quick-start')">
                    <div class="feature-icon" style="background: linear-gradient(135deg, #67c23a 0%, #95d475 100%);">
                      <el-icon><Guide /></el-icon>
                    </div>
                    <div class="feature-info">
                      <h4>快速入门</h4>
                      <p>了解系统基本操作流程</p>
                    </div>
                    <el-icon class="feature-arrow"><ArrowRight /></el-icon>
                  </div>
                  <div class="feature-card" @click="handleQuickNav('topic-internal')">
                    <div class="feature-icon" style="background: linear-gradient(135deg, #409eff 0%, #79bbff 100%);">
                      <el-icon><EditPen /></el-icon>
                    </div>
                    <div class="feature-info">
                      <h4>投诉登记</h4>
                      <p>学习如何登记质量投诉</p>
                    </div>
                    <el-icon class="feature-arrow"><ArrowRight /></el-icon>
                  </div>
                  <div class="feature-card" @click="handleQuickNav('topic-shipment-report')">
                    <div class="feature-icon" style="background: linear-gradient(135deg, #e6a23c 0%, #f0c78a 100%);">
                      <el-icon><Document /></el-icon>
                    </div>
                    <div class="feature-info">
                      <h4>出货报告</h4>
                      <p>生成产品出货检验报告</p>
                    </div>
                    <el-icon class="feature-arrow"><ArrowRight /></el-icon>
                  </div>
                  <div class="feature-card" @click="handleQuickNav('topic-instruments')">
                    <div class="feature-icon" style="background: linear-gradient(135deg, #909399 0%, #c0c4cc 100%);">
                      <el-icon><SetUp /></el-icon>
                    </div>
                    <div class="feature-info">
                      <h4>仪器管理</h4>
                      <p>管理计量器具和校准</p>
                    </div>
                    <el-icon class="feature-arrow"><ArrowRight /></el-icon>
                  </div>
                </div>
              </div>

              <div class="help-tips-section">
                <h3 class="section-heading">
                  <el-icon><InfoFilled /></el-icon>
                  <span>使用提示</span>
                </h3>
                <div class="tips-list">
                  <div class="tip-item">
                    <el-icon class="tip-icon"><Pointer /></el-icon>
                    <span>点击左侧菜单选择您需要查看的功能模块</span>
                  </div>
                  <div class="tip-item">
                    <el-icon class="tip-icon"><Picture /></el-icon>
                    <span>每个操作步骤都配有详细说明，部分步骤包含示例图片</span>
                  </div>
                  <div class="tip-item">
                    <el-icon class="tip-icon"><Search /></el-icon>
                    <span>如需查找特定功能，可展开左侧菜单分类浏览</span>
                  </div>
                </div>
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
                    ref="uploadRef"
                    action="#"
                    list-type="picture-card"
                    :on-preview="handleDialogPreview"
                    :on-remove="handleDialogRemove"
                    :on-change="onStepFilesSelected"
                    :before-upload="beforeUpload"
                    :auto-upload="false"
                    multiple
                  >
                    <el-icon><Plus /></el-icon>
                  </el-upload>
                  <span class="choose-tip">支持多选，单张不超过 5MB，仅图片类型</span>
                </div>
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
 * - 保留通用说明内容的同时，支持内嵌文档子页面的"内联展示"
 */
import { ref, computed, shallowRef, onMounted, onBeforeUnmount, watch } from 'vue'
import { useUserStore } from '@/store/user'
import apiService from '@/services/apiService.js'
import { ElMessage, ElMessageBox } from 'element-plus'
import AppLayout from '@/components/common/AppLayout.vue'
import { 
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
  Picture, 
  Plus,
  QuestionFilled,
  Compass,
  Guide,
  EditPen,
  SetUp,
  ArrowRight,
  InfoFilled,
  Pointer,
  Search,
  HomeFilled
} from '@element-plus/icons-vue'
import ComplaintBatchImportDoc from '@/views/docs/ComplaintBatchImportDoc.vue'

// 用户与管理员状态（响应式）
const userStore = useUserStore()
const isAdmin = computed(() => userStore.isAdmin)

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
 * 快速导航到指定主题
 * @param {string} topicId - 主题ID
 */
function handleQuickNav(topicId) {
  activeViewComponent.value = null
  activeTopic.value = topicContentMap[topicId] || null
  activeViewTitle.value = null
  activeTopicKey.value = topicId
  stepImages.value = {}
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
  Picture,
  HomeFilled
}

/**
 * 获取图标组件
 * @param {string} iconName - 图标名称字符串
 * @returns {Component} 图标组件，默认使用 Document
 */
function getIconComponent(iconName) {
  return iconMap[iconName] || Document
}

/**
 * 获取图标颜色
 * @param {string} iconName - 图标名称字符串
 * @returns {string} 颜色字符串
 */
function getIconColor(iconName) {
  const iconColorMap = {
    Collection: '#409EFF',
    Notebook: '#67C23A',
    Files: '#E6A23C',
    Histogram: '#909399',
    DataBoard: '#8D9AE8',
    Setting: '#909399',
    PriceTag: '#E6A23C',
    Box: '#8D9AE8',
    Document: '#909399',
    Picture: '#409EFF',
    HomeFilled: '#409EFF'
  }
  return iconColorMap[iconName] || '#909399'
}

/**
 * 左侧菜单树数据结构
 */
const topicTree = ref([
  {
    id: 'topic-home',
    label: '首页',
    icon: 'HomeFilled',
    isHome: true
  },
  {
    id: 'group-overview',
    label: '系统概述',
    icon: 'Document',
    children: [
      { id: 'topic-intro', label: '系统简介', icon: 'Document' },
      { id: 'topic-quick-start', label: '快速入门', icon: 'Notebook' },
      { id: 'topic-login', label: '系统登录', icon: 'Document' }
    ]
  },
  {
    id: 'group-complaint',
    label: '投诉管理',
    icon: 'Collection',
    children: [
      { id: 'topic-internal', label: '内部投诉操作指南', icon: 'Notebook' },
      { id: 'topic-customer-complaint', label: '客户投诉操作指南', icon: 'Notebook' },
      { id: 'topic-batch-import', label: '投诉批量导入指南', icon: 'Files' }
    ]
  },
  {
    id: 'group-quality',
    label: '质量管理',
    icon: 'Histogram',
    children: [
      { id: 'topic-quality-targets', label: '质量目标使用指引', icon: 'DataBoard' },
      { id: 'topic-rework', label: '返工登记操作指南', icon: 'Tools' },
      { id: 'topic-assessment', label: '考核记录管理', icon: 'Notebook' },
      { id: 'topic-defective', label: '不良类别管理', icon: 'Collection' }
    ]
  },
  {
    id: 'group-qualification',
    label: '人员资质管理',
    icon: 'Box',
    children: [
      { id: 'topic-personnel', label: '资质人员列表', icon: 'Document' },
      { id: 'topic-fm100', label: 'FM100色觉测试', icon: 'Picture' },
      { id: 'topic-qual-types', label: '资质类型配置', icon: 'Setting' }
    ]
  },
  {
    id: 'group-assets',
    label: '仪器管理',
    icon: 'Box',
    children: [
      { id: 'topic-instruments', label: '仪器台账使用指南', icon: 'Document' },
      { id: 'topic-calibration', label: '校准检定管理', icon: 'Tools' },
      { id: 'topic-annual-plan', label: '年度计划管理', icon: 'DataBoard' }
    ]
  },
  {
    id: 'group-shipment',
    label: '出货报告',
    icon: 'Files',
    children: [
      { id: 'topic-shipment-report', label: '出货报告生成', icon: 'Document' },
      { id: 'topic-shipment-template', label: '模板管理', icon: 'Files' },
      { id: 'topic-batch-query', label: '批量查询', icon: 'Collection' }
    ]
  },
  {
    id: 'group-system',
    label: '系统管理',
    icon: 'Setting',
    children: [
      { id: 'topic-user', label: '用户管理', icon: 'Document' },
      { id: 'topic-role', label: '角色管理', icon: 'Document' },
      { id: 'topic-department', label: '部门管理', icon: 'Document' },
      { id: 'topic-config', label: '系统配置快速指引', icon: 'Setting' }
    ]
  }
])

/**
 * 主题内容字典
 */
const topicContentMap = {
  // ========== 系统概述 ==========
  'topic-intro': {
    title: '系统简介',
    steps: [
      'DMS-QA（Document Management System - Quality Assurance）是一套专为印刷行业设计的综合质量管理系统。',
      '核心功能模块包括：质量管理（投诉、返工、目标）、人员资质管理（FM100色觉测试）、仪器管理（台账、校准）、出货报告等。',
      '系统采用 Vue.js + Node.js + SQL Server 技术架构，支持 Chrome、Firefox、Edge 等主流浏览器。',
      '如需了解具体功能，请在左侧菜单中选择相应模块查看详细操作指南。'
    ]
  },
  'topic-quick-start': {
    title: '快速入门',
    steps: [
      '访问系统地址 http://192.168.1.57，输入用户名和密码登录系统。',
      '登录后进入系统首页，点击右上角用户头像，选择"登录后台"进入管理界面。',
      '管理界面左侧为功能菜单，右侧为内容区域，顶部显示面包屑导航。',
      '根据您的工作职责，在左侧菜单中选择相应的功能模块开始使用。',
      '如需帮助，可随时点击页面右上角的"帮助"图标查看操作说明。'
    ]
  },
  'topic-login': {
    title: '系统登录',
    steps: [
      '打开浏览器，访问系统首页地址。',
      '在登录页面输入您的用户名和密码。',
      '可勾选"记住密码"方便下次登录（公共电脑请勿勾选）。',
      '点击"登录"按钮进入系统。',
      '首次登录建议修改初始密码：点击用户头像 > 个人设置 > 修改密码。',
      '如忘记密码，请联系系统管理员重置。'
    ]
  },
  // ========== 投诉管理 ==========
  'topic-internal': {
    title: '内部投诉操作指南',
    steps: [
      '登录账号，进入"首页"，或点击用户头像下三角后，在弹出对菜单中，依次点击"登录后台 > 质量管理 > 投诉管理 > 内部投诉"页面。',
      '点击页面上的"新增"按钮，打开登记表单。',
      '依次填写基础信息、问题描述、处置措施等内容。',
      '如需上传图片，点击"上传图片"并在右侧预览区查看。',
      '确认信息无误后点击"提交"，系统将提示提交结果。'
    ]
  },
  'topic-customer-complaint': {
    title: '客户投诉操作指南',
    steps: [
      '进入"质量管理 > 投诉管理 > 客户投诉"页面。',
      '点击"新增"按钮，填写客户信息：客户名称、联系人、联系方式等。',
      '填写投诉详情：投诉日期、产品信息、问题描述、严重程度等。',
      '投诉处理流程：接收投诉 → 确认问题 → 原因分析 → 制定措施 → 执行措施 → 客户确认 → 关闭。',
      '可关联内部投诉记录，便于追溯和统计分析。',
      '处理完成后更新状态，支持导出投诉数据和生成投诉报告。'
    ]
  },
  'topic-batch-import': {
    title: '投诉批量导入指南',
    steps: [
      '进入"系统管理 > 质量异常数据导入"。',
      '下载模板并逐条填入投诉记录按说明准备 Excel 文件。或直接使用现使用中的投诉记录表 Excel 文件进入导入。',
      '上传文件后，根据将进行字段映射与数据预览。',
      '选择校验模式（严格/宽松），确认无误后执行导入。',
      '查看导入结果与校验提示，必要时修正后重试。'
    ]
  },
  // ========== 质量管理 ==========
  'topic-quality-targets': {
    title: '质量目标使用指引',
    steps: [
      '进入"质量管理 > 质量目标管理"。',
      '点击"新增目标"设定质量指标：名称、类型（客户投诉率/内部不合格率/返工率/一次合格率/准时交付率）、目标值、统计周期。',
      '部分目标支持自动采集数据（如投诉率、返工率），无需手动录入。',
      '手动录入目标：点击"录入数据"填写当期实际值。',
      '选择目标项查看指标与统计数据，可在目标详情页面查看月度趋势与达成情况。',
      '支持导出月度/年度质量目标报告用于管理评审。'
    ]
  },
  'topic-rework': {
    title: '返工登记操作指南',
    steps: [
      '进入"质量管理 > 返工管理"页面。',
      '点击"新增"填写返工信息：工单号、产品编号、返工数量、返工原因、责任工序等。',
      '可关联投诉记录，便于追溯问题根源。',
      '填写返工成本信息（可选）：工时、材料损耗等。',
      '提交后可在列表页面查看与导出记录。',
      '支持返工统计分析：查看返工趋势图、原因分布、工序分布等。'
    ]
  },
  'topic-assessment': {
    title: '考核记录管理',
    steps: [
      '进入"质量管理 > 考核管理 > 考核记录"页面。',
      '点击"新增"创建考核记录：考核日期、考核类型、被考核部门/人员、考核原因、扣分/扣款等。',
      '对于需要改善的考核项，设置改善期限，系统自动进行跟踪提醒。',
      '在"改善期跟踪"页面监控各项改善进度，状态包括：待改善、改善中、已完成、已逾期、已取消。',
      '被考核方如有异议，可提交申诉，由管理员审核处理。',
      '查看"考核统计"了解各部门/人员考核情况汇总。'
    ]
  },
  'topic-defective': {
    title: '不良类别管理',
    steps: [
      '进入"质量管理 > 不良类别管理"页面。',
      '系统预置了印刷行业常用不良类别，可根据实际需要添加新类别。',
      '点击"新增"添加不良类别：编码、名称、上级类别（支持多级分类）、排序号。',
      '可关联工序或产品类型，实现精准分类统计。',
      '编辑或禁用不再使用的类别（禁用不影响历史数据）。',
      '不良类别用于投诉登记、返工登记等模块的下拉选择。'
    ]
  },
  // ========== 人员资质管理 ==========
  'topic-personnel': {
    title: '资质人员列表',
    steps: [
      '进入"质量管理 > 人员资质 > 资质人员"页面。',
      '点击"新增"添加人员：工号、姓名、部门、岗位、入职日期等基本信息。',
      '为人员添加资质：在人员详情页点击"添加资质"，选择资质类型、填写证书编号、有效期等。',
      '上传资质证书扫描件作为附件备查。',
      '系统自动监控资质有效期，到期前30天、7天分别提醒，过期后红色警示。',
      '使用筛选功能查询特定部门、岗位或资质状态的人员。'
    ]
  },
  'topic-fm100': {
    title: 'FM100色觉测试',
    steps: [
      '进入"质量管理 > 人员资质 > FM100色觉测试"页面。',
      'FM100（Farnsworth-Munsell 100 Hue Test）是印刷行业评估人员色彩辨别能力的标准测试方法。',
      '点击"新增测试"选择被测人员，录入四个托盘（共85个色块）的排列结果。',
      '系统自动计算总错误分数（TES）并评定等级：优秀(0-16)、良好(17-40)、一般(41-100)、较差(>100)。',
      '查看色相图分析，可识别色觉缺陷类型（红绿色弱、蓝黄色弱等）。',
      '测试环境要求：使用D65标准光源，照度1000-1500 Lux，避免阳光直射。'
    ]
  },
  'topic-qual-types': {
    title: '资质类型配置',
    steps: [
      '进入"质量管理 > 人员资质 > 资质类型配置"页面。',
      '系统预置了常用资质类型：特种设备操作证、电工证、叉车证、消防证、FM100色觉测试等。',
      '点击"新增"添加自定义资质类型：编码、名称、默认有效期（月）、提前提醒天数。',
      '配置关联岗位：指定哪些岗位需要具备此资质，便于岗位资质要求管理。',
      '资质类别分为：法规要求类、技能认证类、健康检查类、内部培训类。',
      '编辑或禁用不再使用的资质类型。'
    ]
  },
  // ========== 仪器管理 ==========
  'topic-instruments': {
    title: '仪器台账使用指南',
    steps: [
      '进入"仪器管理 > 仪器台账"页面。',
      '点击"新增"添加仪器：仪器编号、名称、型号规格、分类、存放位置、使用部门等。',
      '设置校准信息：校准周期（月）、上次校准日期、校准机构、校准证书号。',
      '上传附件：仪器说明书、校准证书扫描件等。',
      '使用搜索和筛选功能快速定位设备，支持按编号、名称、分类、状态等条件筛选。',
      '系统自动监控校准到期，提前30天提醒，便于安排校准计划。'
    ]
  },
  'topic-calibration': {
    title: '校准检定管理',
    steps: [
      '进入"仪器管理 > 校准检定"页面。',
      '点击"新增校准"选择待校准仪器，录入校准信息。',
      '填写：校准日期、校准类型（内部/外部）、校准机构、校准结论（合格/不合格/限用）、有效期至。',
      '上传校准证书扫描件作为记录附件。',
      '支持批量录入：多台仪器同时送检时，可批量录入校准结果。',
      '在仪器详情页可查看该仪器的完整校准历史记录。'
    ]
  },
  'topic-annual-plan': {
    title: '年度计划管理',
    steps: [
      '进入"仪器管理 > 年度计划"页面。',
      '点击"生成计划"选择年度，系统根据仪器校准周期和上次校准日期自动生成年度校准计划。',
      '计划以甘特图形式展示，可查看各仪器的计划校准月份。',
      '可手动调整计划月份，调整时建议填写调整原因。',
      '查看月度计划：点击某月份，查看该月需要校准的仪器清单。',
      '完成校准后在"校准检定"录入结果，系统自动更新年度计划执行状态。',
      '导出年度/月度校准计划表，用于安排送检和预算。'
    ]
  },
  // ========== 出货报告 ==========
  'topic-shipment-report': {
    title: '出货报告生成',
    steps: [
      '进入"出货报告"页面（首页快捷入口或管理后台 > 出货报告）。',
      '输入查询条件：工单号、产品编号、CPO（客户订单号）等，点击"查询"。',
      '在查询结果列表中选择产品，右侧显示产品详细信息预览。',
      '选择报告模板（如有多个），点击"生成报告"导出 Excel 格式报告。',
      '系统自动填充：产品信息、出货数量、检验结果等字段。',
      '抽检数量根据 GB/T 2828.1 标准自动计算（根据批量大小确定）。',
      '如需打印，点击"打印报告"生成 PDF 格式。'
    ]
  },
  'topic-shipment-template': {
    title: '模板管理',
    steps: [
      '在出货报告页面点击"模板管理"按钮。',
      '点击"上传模板"选择 Excel 模板文件，填写模板名称和说明。',
      '进入"编辑映射"配置字段映射：将系统数据字段对应到模板的单元格位置。',
      '单字段映射：用于固定位置字段（如客户名称、报告日期）。',
      '表格区域映射：设置数据起始行，配置各列对应的字段。',
      '点击"测试映射"验证配置是否正确，确认无误后保存。',
      '可为不同客户配置专用模板，生成报告时自动使用对应模板。'
    ]
  },
  'topic-batch-query': {
    title: '批量查询',
    steps: [
      '在出货报告页面切换到"批量查询"标签页。',
      '在文本框中输入多个查询条件，每行一个。支持格式：CPO,产品编号 或 仅CPO。',
      '可直接从 Excel 复制多行数据粘贴到文本框。',
      '点击"批量查询"执行，查看进度条和查询结果列表。',
      '结果显示查询状态（成功/失败）、产品信息、出货数量、抽检数量等。',
      '勾选成功的产品，点击"合并生成报告"生成包含多产品的单个报告。',
      '查询失败的项目可检查条件后单独重新查询。'
    ]
  },
  // ========== 系统管理 ==========
  'topic-user': {
    title: '用户管理',
    steps: [
      '进入"系统管理 > 用户管理"页面。',
      '点击"新增"创建用户账号：用户名、密码、姓名、工号、部门、岗位。',
      '为用户分配角色（可多选），角色决定用户的功能权限。',
      '设置用户状态：启用/禁用。禁用后用户无法登录系统。',
      '重置密码：点击用户行的"重置密码"，可设置新密码或自动生成。',
      '支持批量导入用户：下载模板、填写信息、上传导入。'
    ]
  },
  'topic-role': {
    title: '角色管理',
    steps: [
      '进入"系统管理 > 角色管理"页面。',
      '系统预置角色：系统管理员（全部权限）、质量管理员、仪器管理员、普通用户等。',
      '点击"新增"创建自定义角色：角色编码、名称、说明。',
      '点击"配置权限"为角色分配菜单权限（可访问的功能模块）和操作权限（增删改查导出等）。',
      '配置数据权限范围：全部数据、本部门数据、本部门及下级、仅本人数据。',
      '用户可拥有多个角色，最终权限为所有角色权限的并集。'
    ]
  },
  'topic-department': {
    title: '部门管理',
    steps: [
      '进入"系统管理 > 部门管理"页面。',
      '部门以树形结构展示公司组织架构。',
      '点击"新增"添加部门：部门名称、部门编码、上级部门、负责人、排序号。',
      '编辑部门：修改部门信息或调整上级部门。',
      '通过拖拽可快速调整部门层级关系。',
      '点击部门名称可查看该部门下的用户列表。',
      '注意：有子部门或有用户的部门不能直接删除。'
    ]
  },
  'topic-config': {
    title: '系统配置快速指引',
    steps: [
      '进入"系统管理 > 系统配置"页面。',
      '基础配置：系统名称、公司名称、Logo 等显示设置。',
      '安全配置：密码最小长度、登录失败锁定次数、锁定时间、Token 有效期。',
      '提醒配置：校准到期提醒天数、资质到期提醒天数、改善期到期提醒天数。',
      '功能开关：启用/禁用登录验证码、操作日志记录、数据导出功能等。',
      '修改配置后点击"保存"，部分配置需刷新页面或重新登录后生效。'
    ]
  }
}

// 树组件属性配置
const treeProps = { label: 'label', children: 'children' }

// 当前激活主题内容（通用说明型）
const activeTopic = ref(null)
// 当前右侧激活的"内联文档组件"（组件型视图）
const activeViewComponent = shallowRef(null)
// 右侧内联视图的动态标题
const activeViewTitle = ref(null)
// 记录当前激活主题的键（用于构建上传自定义路径）
const activeTopicKey = ref(null)

/**
 * 处理左侧菜单点击事件
 * @param {Object} data - 当前节点数据
 * @param {Object} node - 树节点对象
 */
function handleNodeClick(data, node) {
  // 首页：返回欢迎页面
  if (data.isHome) {
    goDocsHome()
    return
  }
  
  if (!data.children) {
    // 组件型视图（内联显示）
    if (data.id === 'topic-batch-import') {
      activeViewComponent.value = ComplaintBatchImportDoc
      activeTopic.value = null
      activeViewTitle.value = '投诉记录批量导入与数据表初始化使用说明'
      activeTopicKey.value = null
      return
    }
    // 说明型视图（包括内部投诉操作指南）
    activeViewComponent.value = null
    activeTopic.value = topicContentMap[data.id] || null
    activeViewTitle.value = null
    activeTopicKey.value = data.id || null
    // 切换主题时，重置步骤图片缓存
    stepImages.value = {}
  }
}

// 每个步骤下的图片列表（key 为步骤索引）
const stepImages = ref({})
// 弹窗可见性与上下文
const addDialogVisible = ref(false)
const addStepIndex = ref(null)
// 选择的待上传文件
const selectedFiles = ref([])
const uploading = ref(false)
const uploadRef = ref(null)

// 图片预览
const imageViewerVisible = ref(false)
const imageUrls = ref([])
const initialIndex = ref(0)

/**
 * 计算文件服务器基础地址
 * - 开发环境：使用空字符串，让 Vite 代理处理 /files 路径
 * - 生产环境：使用 8080 端口的文件服务器
 */
const fileServerBase = (() => {
  // 在生产环境中，根据主机名动态构建基础URL
  if (import.meta.env.PROD) {
    const protocol = window.location.protocol;
    const hostname = window.location.hostname;
    // 假设文件服务器与应用部署在同一服务器，但端口不同
    return `${protocol}//${hostname}:8080`;
  }
  // 在开发环境中，返回空字符串，依赖Vite的代理
  return '';
})();

/**
 * 将内部图片数据转换为 el-upload 期望的格式
 * @param {number} idx - 步骤索引
 * @returns {Array} el-upload 格式的文件列表
 */
function getStepImageList(idx) {
  const images = stepImages.value[idx] || []
  return images.map(img => ({
    name: img.name || img.filename,
    url: img.url || img.filePath,
    status: 'success',
    relativePath: img.relativePath
  }))
}

/**
 * 构建步骤图片的自定义存储路径
 * @param {string} topicKey - 主题键
 * @param {number} idx - 步骤索引
 * @returns {string} 自定义存储路径
 */
function buildCustomPath(topicKey, idx) {
  return `help-center/${topicKey}/${idx}`
}

/**
 * 构建图片访问URL
 * @param {Object} imageInfo - 图片信息对象，包含 url, relativePath 等字段
 * @returns {string} 完整的图片访问URL
 */
function buildImageUrl(imageInfo) {
  const imageUrl = imageInfo.url || imageInfo.relativePath || ''

  // 1. 如果已经是完整的 http/https URL，直接返回
  if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
    return imageUrl
  }

  // 2. 如果是 /files/ 开头的路径（通常是开发环境代理或生产环境 nginx 转发）
  if (imageUrl.startsWith('/files')) {
    return import.meta.env.PROD ? `${fileServerBase}${imageUrl}` : imageUrl
  }

  // 3. 处理相对路径（例如：complaints/xxx.png）
  // 移除可能的 attachments/ 前缀并统一斜杠
  const cleanPath = imageUrl.replace(/\\/g, '/').replace(/^attachments[\\\/]?/, '')
  const staticUrl = `/files/attachments/${cleanPath}`

  return import.meta.env.PROD ? `${fileServerBase}${staticUrl}` : staticUrl
}

/**
 * 刷新加载：为当前说明型主题加载已上传图片
 */
async function loadPersistedStepImagesForActiveTopic() {
  try {
    const key = activeTopicKey.value
    const topic = activeTopic.value
    if (!key || !topic || !Array.isArray(topic.steps)) return

    for (let i = 0; i < topic.steps.length; i++) {
      const customPath = buildCustomPath(key, i)
      try {
        const response = await apiService.get(`/upload/list-attachments?customPath=${encodeURIComponent(customPath)}`)
        const data = response.data
        
        if (data?.success) {
          const list = Array.isArray(data.data) ? data.data : []
          const images = list.map((it) => {
            // 构建图片访问路径
            const filePath = buildImageUrl(it)
            return {
              name: it.filename || (it.relativePath || '').split('/').pop(),
              url: filePath,
              status: 'success',
              relativePath: (it.relativePath || '').replace(/\\/g, '/').replace(/^attachments[\\\/]/, '')
            }
          })
          if (images.length) {
            stepImages.value = {
              ...stepImages.value,
              [i]: images
            }
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
  if (activeTopicKey.value && activeTopic.value && Array.isArray(activeTopic.value.steps)) {
    loadPersistedStepImagesForActiveTopic()
  }
})

onBeforeUnmount(() => {
  // 组件卸载时清理资源
  imageUrls.value = []
})

// 监听主题键变化：切换说明型主题时重置并加载对应步骤图片
watch(activeTopicKey, async (key) => {
  stepImages.value = {}
  if (!key || !activeTopic.value || !Array.isArray(activeTopic.value.steps)) return
  await loadPersistedStepImagesForActiveTopic()
})

/**
 * 上传前校验
 * @param {File} file - 待上传文件
 * @returns {boolean} 是否允许上传
 */
function beforeUpload(file) {
  if (!file.type || !file.type.startsWith('image/')) {
    ElMessage.error(`不支持的文件类型：${file.name}`)
    return false
  }
  if (file.size > 5 * 1024 * 1024) {
    ElMessage.error(`图片过大（>5MB）：${file.name}`)
    return false
  }
  return true
}

/**
 * 打开添加图片弹窗（步骤级别）
 * @param {number} idx - 当前步骤索引
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
 * 关闭添加图片弹窗
 */
function closeAddDialog() {
  addDialogVisible.value = false
  selectedFiles.value = []
  if (uploadRef.value) {
    uploadRef.value.clearFiles()
  }
}

/**
 * 处理图片预览（已上传的步骤图片）
 * @param {Object} file - 文件对象
 * @param {number} stepIdx - 步骤索引
 */
function handlePictureCardPreview(file, stepIdx) {
  const images = stepImages.value[stepIdx] || []
  if (!images.length) {
    imageUrls.value = [file.url]
    initialIndex.value = 0
  } else {
    imageUrls.value = images.map(img => img.url)
    const findIndex = images.findIndex(img => img.url === file.url)
    initialIndex.value = findIndex > -1 ? findIndex : 0
  }
  imageViewerVisible.value = true
}

/**
 * 处理弹窗内的图片预览
 * @param {Object} file - 文件对象
 */
function handleDialogPreview(file) {
  imageUrls.value = [file.url]
  initialIndex.value = 0
  imageViewerVisible.value = true
}

/**
 * 处理已上传文件的删除
 * @param {Object} file - 文件对象
 * @param {number} stepIndex - 步骤索引
 * @returns {Promise} 删除结果
 */
function handleFileRemove(file, stepIndex) {
  return new Promise((resolve, reject) => {
    const { relativePath } = file

    if (!isAdmin.value) {
      ElMessage.error('仅管理员可删除图片')
      return reject()
    }

    if (!relativePath) {
      ElMessage.error('无法确定文件路径，删除失败')
      return reject()
    }

    ElMessageBox.confirm('确定要删除该图片吗？', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    }).then(async () => {
      try {
        const response = await apiService.delete('/upload/attachment', {
          data: { relativePath }
        })

        if (response.data?.success) {
          ElMessage.success('图片删除成功')
          resolve()
        } else {
          ElMessage.error(response.data?.message || '图片删除失败')
          reject()
        }
      } catch (error) {
        ElMessage.error('请求删除接口时发生错误')
        console.error('删除图片失败:', error)
        reject()
      }
    }).catch(() => {
      ElMessage.info('已取消删除')
      reject()
    })
  })
}

/**
 * 处理弹窗内图片删除
 * @param {Object} removedFile - 被删除的文件
 * @param {Array} uploadFiles - 当前文件列表
 */
function handleDialogRemove(removedFile, uploadFiles) {
  selectedFiles.value = uploadFiles.map(f => f.raw)
}

/**
 * 步骤图片选择事件处理
 * @param {Object} changedFile - 变更的文件
 * @param {Array} uploadFiles - 当前文件列表
 */
function onStepFilesSelected(changedFile, uploadFiles) {
  // 过滤有效文件
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
  selectedFiles.value = validFiles.map(f => f.raw)
}

/**
 * 提交当前步骤的选中图片到后台
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
      ElMessage.success('所有图片上传成功')
      closeAddDialog()
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
   CSS 变量定义 - 组件级变量
   ============================================ */
.help-center {
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
  --content-gap: 10px;

  /* 阴影 */
  --shadow-sm: 0 2px 4px rgba(0, 0, 0, 0.06);
  --shadow-md: 0 2px 8px rgba(0, 0, 0, 0.08);
  --shadow-primary: 0 2px 4px rgba(64, 158, 255, 0.3);

  /* 主容器样式 */
  padding: var(--spacing-md) var(--spacing-xl) var(--spacing-xl);
  height: 100vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-sizing: border-box;
}

/* ============================================
   页面标题区域
   ============================================ */
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
   左右布局容器
   ============================================ */
.bottom-content {
  display: flex;
  gap: var(--content-gap);
  margin-top: var(--spacing-lg);
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

/* ============================================
   左侧面板
   ============================================ */
.left-panel {
  width: clamp(240px, 20vw, 320px);
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.menu-card {
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.menu-card :deep(.el-card__body) {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  padding: var(--spacing-sm);
}

.card-header {
  display: flex;
  align-items: center;
  font-weight: 600;
  color: var(--title-color);
}

.topic-tree :deep(.tree-node .node-icon) {
  margin-right: 5px;
}

/* 首页菜单项特殊样式 */
.topic-tree :deep(.el-tree-node:first-child > .el-tree-node__content) {
  background: linear-gradient(135deg, #e8f4ff 0%, #f5f9ff 100%);
  border-radius: 8px;
  margin-bottom: 8px;
}

.topic-tree :deep(.el-tree-node:first-child > .el-tree-node__content:hover) {
  background: linear-gradient(135deg, #d4e8ff 0%, #e8f4ff 100%);
}

.topic-tree :deep(.el-tree-node:first-child > .el-tree-node__content .node-label) {
  font-weight: 600;
  color: var(--primary-color);
}

/* ============================================
   右侧面板
   ============================================ */
.right-panel {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.content-card {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.content-card :deep(.el-card__body) {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  padding: 0;
}

/* ============================================
   固定标题栏
   ============================================ */
.content-sticky-header {
  position: sticky;
  top: 0;
  z-index: 100;
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
  box-shadow: 0 1px 4px rgba(0,0,0,0.04);
}

.content-sticky-header .el-icon {
  color: var(--primary-color) !important;
  margin-right: 8px;
  font-size: 18px;
}

/* ============================================
   内联文档视图
   ============================================ */
.doc-inline-wrapper {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 0 var(--spacing-lg) var(--spacing-lg);
  background: #fff;
  display: block;
}

.doc-inline-wrapper :deep(.doc-footer) {
  display: none;
}

.doc-inline-wrapper :deep(.doc-container) {
  padding-top: 0;
  margin-top: 0;
}

.doc-inline-wrapper :deep(.doc-section.fancy:first-of-type) {
  margin-top: 0;
}

.doc-inline-wrapper :deep(.doc-theme) {
  width: 100%;
  max-width: none;
  margin: 0;
  box-sizing: border-box;
}

.doc-inline-wrapper :deep(.doc-header) {
  display: none;
}

/* ============================================
   说明型视图
   ============================================ */
.topic-content {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 0 var(--spacing-lg) var(--spacing-lg);
  background: #fff;
  display: flow-root;
}

/* ============================================
   步骤列表样式 - 时间线布局
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
  position: relative;
}

/* 时间线主轴 */
.doc-steps::before {
  content: '';
  position: absolute;
  left: 13px;
  top: 28px;
  bottom: 28px;
  width: 2px;
  background: linear-gradient(180deg, 
    #409eff 0%, 
    #79bbff 25%, 
    #a0cfff 50%, 
    #79bbff 75%, 
    #409eff 100%
  );
  border-radius: 1px;
  box-shadow: 0 0 6px rgba(64, 158, 255, 0.2);
}

.doc-steps li {
  position: relative;
  padding: 0 0 0 44px;
  margin: 0 0 20px 0;
  line-height: 1.7;
  transition: all 0.3s ease;
}

.doc-steps li:last-child {
  margin-bottom: 0;
}

/* 时间线节点 - 步骤数字圆圈 */
.doc-steps li::before {
  counter-increment: step;
  content: counter(step);
  position: absolute;
  left: 0;
  top: 0;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: linear-gradient(145deg, #409eff 0%, #66b1ff 50%, #409eff 100%);
  color: #fff;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  box-shadow: 
    0 3px 10px rgba(64, 158, 255, 0.35),
    inset 0 1px 3px rgba(255, 255, 255, 0.3);
  z-index: 2;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  border: 2px solid #fff;
  text-shadow: 0 1px 1px rgba(0, 0, 0, 0.15);
}

/* 时间线节点外圈光晕 - 脉冲动画 */
.doc-steps li::after {
  content: '';
  position: absolute;
  left: -2px;
  top: -2px;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: transparent;
  border: 2px solid rgba(64, 158, 255, 0.2);
  z-index: 1;
  opacity: 0;
  transition: all 0.3s ease;
}

/* 步骤内容卡片 */
.doc-steps li .step-content-wrapper {
  background: #fff;
  border: 1px solid #e8f0f8;
  border-radius: 10px;
  padding: 14px 16px;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.03);
  transition: all 0.3s ease;
  position: relative;
}

/* 卡片左侧指向时间线的小三角 */
.doc-steps li .step-content-wrapper::before {
  content: '';
  position: absolute;
  left: -7px;
  top: 8px;
  width: 0;
  height: 0;
  border-top: 7px solid transparent;
  border-bottom: 7px solid transparent;
  border-right: 7px solid #e8f0f8;
}

.doc-steps li .step-content-wrapper::after {
  content: '';
  position: absolute;
  left: -5px;
  top: 9px;
  width: 0;
  height: 0;
  border-top: 6px solid transparent;
  border-bottom: 6px solid transparent;
  border-right: 6px solid #fff;
}

/* 悬停效果 */
.doc-steps li:hover::before {
  transform: scale(1.1);
  box-shadow: 
    0 4px 14px rgba(64, 158, 255, 0.45),
    inset 0 1px 3px rgba(255, 255, 255, 0.4);
  background: linear-gradient(145deg, #66b1ff 0%, #409eff 50%, #2d8cf0 100%);
}

.doc-steps li:hover::after {
  opacity: 1;
  animation: pulse-ring 1.5s ease-out infinite;
}

@keyframes pulse-ring {
  0% {
    transform: scale(1);
    opacity: 1;
  }
  100% {
    transform: scale(1.3);
    opacity: 0;
  }
}

.doc-steps li:hover .step-content-wrapper {
  border-color: var(--primary-color);
  box-shadow: 0 4px 12px rgba(64, 158, 255, 0.12);
  transform: translateX(3px);
}

/* 步骤标题 - 显示 "步骤 N" */
.step-header {
  display: flex;
  align-items: center;
  margin-bottom: 6px;
  font-size: 13px;
  color: var(--primary-color);
  font-weight: 600;
}

.step-header .step-label {
  background: linear-gradient(135deg, #e8f4ff 0%, #f0f7ff 100%);
  padding: 2px 8px;
  border-radius: 10px;
  font-size: 11px;
}

/* ============================================
   步骤内操作与图片区域
   ============================================ */
.step-text {
  font-size: 14px;
  color: #4a5568;
  word-break: break-word;
  line-height: 1.8;
}

.step-actions {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px dashed #e8f0f8;
}

.step-actions .el-button {
  border-radius: 8px;
}

.step-images {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px dashed #e8f0f8;
}

.step-images :deep(.el-upload-list--picture-card) {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.step-images :deep(.el-upload-list--picture-card .el-upload-list__item) {
  width: 120px;
  height: 90px;
  margin: 0;
  border-radius: 8px;
  overflow: hidden;
  border: 2px solid #e8f0f8;
  transition: all 0.3s ease;
}

.step-images :deep(.el-upload-list--picture-card .el-upload-list__item:hover) {
  border-color: var(--primary-color);
  box-shadow: 0 4px 12px rgba(64, 158, 255, 0.2);
}

.step-images :deep(.image-preview-wrapper) {
  display: inline-flex;
  width: 120px;
  height: 90px;
  margin: 0 !important;
}

/* 隐藏步骤图片区域的上传按钮（纯展示模式） */
.step-images .el-upload--picture-card {
  display: none;
}

/* ============================================
   添加步骤图片弹窗
   ============================================ */
.add-dialog-body {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
}

.add-dialog-body :deep(.el-upload--picture-card) {
  --el-upload-picture-card-size: 120px;
  width: var(--el-upload-picture-card-size);
  height: var(--el-upload-picture-card-size);
  margin-bottom: 8px;
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
  margin: 0;
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
    gap: var(--content-gap);
    margin-top: var(--spacing-lg);
    flex: 1;
    min-height: 0;
    overflow: hidden;
  }
  
  .left-panel {
    width: 100%;
    max-height: 300px;
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

/* ============================================
   欢迎页面样式
   ============================================ */
.welcome-content {
  flex: 1;
  overflow-y: auto;
  padding: 20px 32px;
  background: linear-gradient(180deg, #f8fafc 0%, #fff 100%);
}

.welcome-hero {
  text-align: center;
  padding: 16px 20px 20px;
  margin-bottom: 20px;
}

.welcome-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 72px;
  height: 72px;
  border-radius: 50%;
  background: linear-gradient(135deg, #e8f4ff 0%, #d4e8ff 100%);
  margin-bottom: 12px;
  animation: float 3s ease-in-out infinite;
}

.welcome-icon .el-icon {
  color: var(--primary-color);
  font-size: 36px !important;
}

@keyframes float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-6px); }
}

.welcome-title {
  font-size: 22px;
  font-weight: 600;
  color: #1a202c;
  margin: 0 0 8px 0;
}

.welcome-desc {
  font-size: 14px;
  color: #718096;
  margin: 0;
}

/* 快速开始区域 */
.quick-start-section {
  margin-bottom: 16px;
}

.section-heading {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 15px;
  font-weight: 600;
  color: #2d3748;
  margin: 0 0 12px 0;
  padding-bottom: 8px;
  border-bottom: 2px solid #e2e8f0;
}

.section-heading .el-icon {
  color: var(--primary-color);
  font-size: 18px;
}

.feature-cards {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 12px;
}

.feature-card {
  display: flex;
  align-items: center;
  padding: 12px 16px;
  background: #fff;
  border: 1px solid #e8f0f8;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.feature-card:hover {
  border-color: var(--primary-color);
  box-shadow: 0 4px 16px rgba(64, 158, 255, 0.15);
  transform: translateY(-2px);
}

.feature-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: 10px;
  flex-shrink: 0;
}

.feature-icon .el-icon {
  font-size: 20px;
  color: #fff;
}

.feature-info {
  flex: 1;
  margin-left: 12px;
}

.feature-info h4 {
  font-size: 14px;
  font-weight: 600;
  color: #2d3748;
  margin: 0 0 4px 0;
}

.feature-info p {
  font-size: 12px;
  color: #718096;
  margin: 0;
}

.feature-arrow {
  color: #cbd5e0;
  font-size: 16px;
  transition: all 0.3s ease;
}

.feature-card:hover .feature-arrow {
  color: var(--primary-color);
  transform: translateX(4px);
}

/* 使用提示区域 */
.help-tips-section {
  background: #fff;
  border: 1px solid #e8f0f8;
  border-radius: 10px;
  padding: 14px 18px;
}

.help-tips-section .section-heading {
  border-bottom: none;
  padding-bottom: 0;
  margin-bottom: 10px;
}

.tips-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.tip-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  background: #f8fafc;
  border-radius: 6px;
  font-size: 13px;
  color: #4a5568;
  transition: all 0.2s ease;
}

.tip-item:hover {
  background: #e8f4ff;
}

.tip-icon {
  color: var(--primary-color);
  font-size: 16px;
  flex-shrink: 0;
}

/* 响应式适配 */
@media (max-width: 768px) {
  .welcome-content {
    padding: 20px;
  }
  
  .welcome-hero {
    padding: 24px 16px;
  }
  
  .welcome-icon {
    width: 80px;
    height: 80px;
  }
  
  .welcome-icon .el-icon {
    font-size: 48px !important;
  }
  
  .welcome-title {
    font-size: 22px;
  }
  
  .feature-cards {
    grid-template-columns: 1fr;
  }
}
</style>
