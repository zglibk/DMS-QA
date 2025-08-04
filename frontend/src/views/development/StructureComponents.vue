<template>
  <div class="structure-components-container">
    <!-- 上部分：页面标题和说明 -->
    <div class="header-section">
      <el-card class="header-card">
        <div class="page-header">
          <h2 class="page-title">
            <el-icon><Tools /></el-icon>
            结构组件
          </h2>
          <p class="page-description">
            这里展示了项目中可复用的结构组件，包括详细的使用说明和示例代码。
          </p>
        </div>
      </el-card>
    </div>

    <!-- 下部分：左右结构 -->
    <div class="content-section">
      <!-- 左侧：树形菜单 -->
      <div class="left-panel">
        <el-card class="menu-card">
          <template #header>
            <div class="card-header">
              <span>组件列表</span>
            </div>
          </template>
          <el-tree
            :data="componentTree"
            :props="treeProps"
            node-key="id"
            :default-expand-all="true"
            :highlight-current="true"
            @node-click="handleNodeClick"
            class="component-tree"
          >
            <template #default="{ node, data }">
              <span class="tree-node">
                <el-icon class="node-icon">
                  <component :is="getIconComponent(data.icon)" />
                </el-icon>
                <span class="node-label">{{ node.label }}</span>
              </span>
            </template>
          </el-tree>
        </el-card>
      </div>

      <!-- 右侧：组件详情 -->
      <div class="right-panel">
        <el-card class="detail-card">
          <template #header>
            <div class="card-header">
              <span>{{ currentComponent.name }}</span>
              <el-tag v-if="currentComponent.version" type="info" size="small">
                {{ currentComponent.version }}
              </el-tag>
            </div>
          </template>
          
          <!-- 组件说明 -->
          <div class="component-detail">
            <div class="description-section">
              <h3>组件说明</h3>
              <p>{{ currentComponent.description }}</p>
            </div>

            <!-- 特性列表 -->
            <div class="features-section" v-if="currentComponent.features">
              <h3>主要特性</h3>
              <ul class="features-list">
                <li v-for="feature in currentComponent.features" :key="feature">
                  <el-icon><Check /></el-icon>
                  {{ feature }}
                </li>
              </ul>
            </div>

            <!-- 使用示例 -->
            <div class="example-section" v-if="currentComponent.example">
              <h3>使用示例</h3>
              <el-tabs v-model="activeTab" class="example-tabs">
                <el-tab-pane label="预览" name="preview">
                  <div class="preview-container">
                    <component :is="currentComponent.component" v-if="currentComponent.component" />
                    <div v-else class="no-preview">
                      <el-empty description="暂无预览" />
                    </div>
                  </div>
                </el-tab-pane>
                <el-tab-pane label="代码" name="code">
                  <div class="code-container">
                    <CodeDisplay 
                      :code="currentComponent.example"
                      language="vue"
                      title="组件使用示例"
                    />
                  </div>
                </el-tab-pane>
              </el-tabs>
            </div>

            <!-- API文档链接 -->
            <div class="docs-section" v-if="currentComponent.docsPath">
              <h3>API文档</h3>
              <el-button type="primary" @click="openDocs">
                <el-icon><Document /></el-icon>
                查看详细文档
              </el-button>
            </div>
          </div>
        </el-card>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { 
  Tools, 
  Check, 
  Document, 
  Grid, 
  Menu as MenuIcon,
  List,
  Operation
} from '@element-plus/icons-vue'
import AccordionTableSimpleExample from '@/examples/AccordionTableSimpleExample.vue'
import CodeDisplay from '@/components/CodeDisplay.vue'

/**
 * 结构组件页面
 * 功能：展示项目中的可复用结构组件
 * 包含：组件列表、详细说明、使用示例、API文档
 */

// 响应式数据
const activeTab = ref('preview')
const currentComponentId = ref('accordion-table')

// 树形菜单配置
const treeProps = {
  children: 'children',
  label: 'label'
}

// 组件树数据
const componentTree = ref([
  {
    id: 'layout',
    label: '布局组件',
    icon: 'Grid',
    children: [
      {
        id: 'accordion-table',
        label: '手风琴表格',
        icon: 'List'
      }
    ]
  },
  {
    id: 'form',
    label: '表单组件',
    icon: 'Operation',
    children: [
      {
        id: 'dynamic-form',
        label: '动态表单',
        icon: 'MenuIcon'
      }
    ]
  }
])

// 组件详情数据
const componentDetails = reactive({
  'accordion-table': {
    name: 'AccordionTable 手风琴表格',
    version: 'v1.2.0',
    description: '基于Element Plus的可复用树形表格组件，实现了手风琴展开/折叠效果，支持树形数据展示、自定义插槽、操作按钮等功能。',
    features: [
      '🌳 树形数据展示 - 支持多层级嵌套数据结构',
      '🎵 手风琴效果 - 展开一个节点时自动折叠同级其他节点',
      '🎛️ 操作按钮 - 内置展开全部/收起全部操作',
      '📋 可配置列 - 灵活的表格列配置，支持自定义宽度和对齐',
      '🎨 自定义插槽 - 支持状态、操作等自定义内容插槽',
      '♻️ 完全可复用 - 独立的组件设计，易于在项目中复用'
    ],
    component: AccordionTableSimpleExample,
    example: `<template>
  <AccordionTable
    :data="tableData"
    :columns="columns"
    :accordion="true"
    :show-actions="true"
  >
    <!-- 状态列自定义插槽 -->
    <template #status="{ row }">
      <el-tag 
        :type="getStatusType(row.status)"
        size="small"
      >
        {{ getStatusText(row.status) }}
      </el-tag>
    </template>
    
    <!-- 操作列自定义插槽 -->
    <template #action="{ row }">
      <el-button 
        type="primary" 
        size="small" 
        @click="handleEdit(row)"
      >
        编辑
      </el-button>
      <el-button 
        type="danger" 
        size="small" 
        @click="handleDelete(row)"
      >
        删除
      </el-button>
    </template>
  </AccordionTable>
</template>

<script setup>
import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import AccordionTable from '@/components/AccordionTable.vue'

// 表格数据
const tableData = ref([
  {
    id: '1',
    name: '系统管理',
    type: '模块',
    status: 1,
    description: '系统核心管理功能模块',
    children: [
      {
        id: '1-1',
        name: '用户管理',
        type: '功能',
        status: 1,
        description: '用户账户管理功能'
      },
      {
        id: '1-2',
        name: '角色管理',
        type: '功能',
        status: 1,
        description: '系统角色权限管理'
      }
    ]
  }
])

// 表格列配置
const columns = [
  {
    prop: 'name',
    label: '名称',
    minWidth: '200'
  },
  {
    prop: 'type',
    label: '类型',
    width: '100'
  },
  {
    prop: 'status',
    label: '状态',
    width: '100',
    slot: 'status'
  },
  {
    prop: 'description',
    label: '描述',
    minWidth: '200'
  },
  {
    label: '操作',
    width: '150',
    slot: 'action'
  }
]

// 状态处理函数
function getStatusType(status) {
  const statusMap = {
    0: 'info',     // 禁用
    1: 'success',  // 正常
    2: 'warning'   // 开发中
  }
  return statusMap[status] || 'info'
}

function getStatusText(status) {
  const statusMap = {
    0: '禁用',
    1: '正常',
    2: '开发中'
  }
  return statusMap[status] || '未知'
}

// 操作处理函数
function handleEdit(row) {
  ElMessage.info('编辑项目：' + row.name)
}

function handleDelete(row) {
  ElMessage.warning('删除项目：' + row.name)
}
<\/script>`,
    docsPath: '/docs/AccordionTable.md'
  },
  'dynamic-form': {
    name: '动态表单组件',
    version: 'v1.0.0',
    description: '基于配置的动态表单组件，支持多种表单控件和验证规则。',
    features: [
      '基于JSON配置生成表单',
      '支持多种表单控件',
      '内置验证规则',
      '支持联动效果'
    ],
    component: null,
    example: '// 待开发',
    docsPath: null
  }
})

// 计算当前组件详情
const currentComponent = ref(componentDetails[currentComponentId.value])

/**
 * 获取图标组件
 * @param {string} iconName - 图标名称
 * @returns {Object} 图标组件
 */
function getIconComponent(iconName) {
  const iconMap = {
    'Grid': Grid,
    'List': List,
    'Operation': Operation,
    'MenuIcon': MenuIcon
  }
  return iconMap[iconName] || Grid
}

/**
 * 处理树节点点击事件
 * @param {Object} data - 节点数据
 */
function handleNodeClick(data) {
  if (data.children) {
    // 如果是父节点，不做处理
    return
  }
  
  currentComponentId.value = data.id
  currentComponent.value = componentDetails[data.id] || {
    name: '组件开发中',
    description: '该组件正在开发中，敬请期待。',
    features: [],
    component: null,
    example: '',
    docsPath: null
  }
  
  // 重置到预览标签
  activeTab.value = 'preview'
}

/**
 * 打开文档
 */
function openDocs() {
  if (currentComponent.value.docsPath) {
    // 这里可以实现打开文档的逻辑
    ElMessage.info('文档功能开发中')
  }
}

/**
 * 组件挂载时的初始化
 */
onMounted(() => {
  // 默认选中第一个组件
  currentComponent.value = componentDetails[currentComponentId.value]
})
</script>

<style scoped>
.structure-components-container {
  padding: 20px;
  height: calc(100vh - 160px);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.header-section {
  margin-bottom: 20px;
}

.header-card {
  border-radius: 8px;
}

.page-header {
  text-align: center;
}

.page-title {
  margin: 0 0 10px 0;
  color: #303133;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.page-description {
  margin: 0;
  color: #606266;
  font-size: 14px;
}

.content-section {
  flex: 1;
  display: flex;
  gap: 20px;
  min-height: 0;
}

.left-panel {
  width: 300px;
  height: 100%;
}

.right-panel {
  flex: 1;
  height: 100%;
}

.menu-card,
.detail-card {
  height: 100%;
  border-radius: 8px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.component-tree {
  height: calc(100% - 60px);
  overflow-y: auto;
}

.tree-node {
  display: flex;
  align-items: center;
  gap: 8px;
}

.node-icon {
  font-size: 16px;
  color: #409eff;
}

.node-label {
  font-size: 14px;
}

.component-detail {
  height: calc(100% - 60px);
  overflow-y: auto;
  padding-right: 8px;
}

.component-detail::-webkit-scrollbar {
  width: 6px;
}

.component-detail::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 3px;
}

.component-detail::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 3px;
}

.component-detail::-webkit-scrollbar-thumb:hover {
  background: #a8a8a8;
}

.description-section,
.features-section,
.example-section,
.docs-section {
  margin-bottom: 24px;
}

.description-section h3,
.features-section h3,
.example-section h3,
.docs-section h3 {
  margin: 0 0 12px 0;
  color: #303133;
  font-size: 16px;
  font-weight: 600;
}

.description-section p {
  margin: 0;
  color: #606266;
  line-height: 1.6;
}

.features-list {
  margin: 0;
  padding: 0;
  list-style: none;
}

.features-list li {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
  color: #606266;
  font-size: 14px;
}

.features-list li .el-icon {
  color: #67c23a;
  font-size: 16px;
}

.example-tabs {
  height: 400px;
}

.example-tabs .el-tab-pane {
  height: calc(100% - 40px);
  overflow-y: auto;
}

.preview-container {
  padding: 16px;
  border: 1px solid #ebeef5;
  border-radius: 4px;
  background-color: #fafafa;
  min-height: 300px;
  height: 100%;
  overflow-y: auto;
}

.no-preview {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
}

.code-container {
  height: 100%;
  overflow-y: auto;
}

/* 响应式设计 */
@media (max-width: 1200px) {
  .content-section {
    flex-direction: column;
  }
  
  .left-panel {
    width: 100%;
    height: 300px;
  }
  
  .right-panel {
    height: 500px;
  }
}
</style>