<template>
  <div class="accordion-table-example">
    <h2>AccordionTable 组件使用示例</h2>
    
    <!-- 示例1：基本用法 -->
    <div class="example-section">
      <h3>示例1：基本用法</h3>
      <p>最简单的树形表格，使用默认配置</p>
      
      <AccordionTable
        :data="basicData"
        :columns="basicColumns"
        :loading="loading"
      />
    </div>

    <!-- 示例2：自定义列和插槽 -->
    <div class="example-section">
      <h3>示例2：自定义列和插槽</h3>
      <p>使用自定义插槽渲染特殊内容，包括状态标签和操作按钮</p>
      
      <AccordionTable
        :data="customData"
        :columns="customColumns"
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
            type="success" 
            size="small" 
            @click="handleAddChild(row)"
            v-if="row.level < 3"
          >
            添加子项
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
    </div>

    <!-- 示例3：禁用手风琴效果 -->
    <div class="example-section">
      <h3>示例3：禁用手风琴效果</h3>
      <p>允许同时展开多个同级节点</p>
      
      <AccordionTable
        :data="multiExpandData"
        :columns="multiExpandColumns"
        :accordion="false"
        :default-expanded-keys="['1', '2']"
      />
    </div>

    <!-- 示例4：带选择框的表格 -->
    <div class="example-section">
      <h3>示例4：带选择框的表格</h3>
      <p>支持行选择功能的树形表格</p>
      
      <AccordionTable
        :data="selectionData"
        :columns="selectionColumns"
        @selection-change="handleSelectionChange"
      />
      
      <div class="selection-info" v-if="selectedRows.length > 0">
        <p>已选择 {{ selectedRows.length }} 项：</p>
        <ul>
          <li v-for="row in selectedRows" :key="row.id">
            {{ row.name }}
          </li>
        </ul>
      </div>
    </div>

    <!-- 示例5：组件方法调用 -->
    <div class="example-section">
      <h3>示例5：组件方法调用</h3>
      <p>通过ref调用组件的公开方法</p>
      
      <div class="method-buttons">
        <el-button @click="expandSpecificNodes">展开指定节点</el-button>
        <el-button @click="collapseSpecificNodes">折叠指定节点</el-button>
        <el-button @click="getExpandedInfo">获取展开信息</el-button>
        <el-button @click="setCustomExpanded">设置自定义展开</el-button>
      </div>
      
      <AccordionTable
        ref="methodTableRef"
        :data="methodData"
        :columns="methodColumns"
        :show-actions="false"
      />
      
      <div class="method-info" v-if="methodInfo">
        <p>{{ methodInfo }}</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { ElMessage } from 'element-plus'
import AccordionTable from '@/components/AccordionTable.vue'

/**
 * AccordionTable 组件使用示例
 * 
 * 本文件展示了 AccordionTable 组件的各种使用方式：
 * 1. 基本用法
 * 2. 自定义列和插槽
 * 3. 禁用手风琴效果
 * 4. 带选择框的表格
 * 5. 组件方法调用
 */

// 响应式数据
const loading = ref(false)
const selectedRows = ref([])
const methodInfo = ref('')
const methodTableRef = ref(null)

// 示例1：基本数据和列配置
const basicData = ref([
  {
    id: '1',
    name: '系统管理',
    path: '/system',
    children: [
      {
        id: '1-1',
        name: '用户管理',
        path: '/system/user'
      },
      {
        id: '1-2',
        name: '角色管理',
        path: '/system/role'
      }
    ]
  },
  {
    id: '2',
    name: '内容管理',
    path: '/content',
    children: [
      {
        id: '2-1',
        name: '文章管理',
        path: '/content/article'
      }
    ]
  }
])

const basicColumns = [
  {
    prop: 'name',
    label: '名称',
    minWidth: '200'
  },
  {
    prop: 'path',
    label: '路径',
    minWidth: '150'
  }
]

// 示例2：自定义数据和列配置
const customData = ref([
  {
    id: '1',
    name: '产品分类A',
    status: 1,
    level: 1,
    sort: 1,
    children: [
      {
        id: '1-1',
        name: '子分类A1',
        status: 1,
        level: 2,
        sort: 1,
        children: [
          {
            id: '1-1-1',
            name: '子分类A1-1',
            status: 0,
            level: 3,
            sort: 1
          }
        ]
      },
      {
        id: '1-2',
        name: '子分类A2',
        status: 1,
        level: 2,
        sort: 2
      }
    ]
  },
  {
    id: '2',
    name: '产品分类B',
    status: 0,
    level: 1,
    sort: 2,
    children: [
      {
        id: '2-1',
        name: '子分类B1',
        status: 1,
        level: 2,
        sort: 1
      }
    ]
  }
])

const customColumns = [
  {
    prop: 'name',
    label: '分类名称',
    minWidth: '200'
  },
  {
    prop: 'status',
    label: '状态',
    width: '100',
    slot: 'status'
  },
  {
    prop: 'sort',
    label: '排序',
    width: '80',
    align: 'center'
  },
  {
    type: 'action',
    label: '操作',
    width: '250'
  }
]

// 示例3：多展开数据
const multiExpandData = ref([
  {
    id: '1',
    name: '部门A',
    manager: '张三',
    children: [
      { id: '1-1', name: '开发组', manager: '李四' },
      { id: '1-2', name: '测试组', manager: '王五' }
    ]
  },
  {
    id: '2',
    name: '部门B',
    manager: '赵六',
    children: [
      { id: '2-1', name: '设计组', manager: '钱七' },
      { id: '2-2', name: '运营组', manager: '孙八' }
    ]
  }
])

const multiExpandColumns = [
  {
    prop: 'name',
    label: '部门名称',
    minWidth: '200'
  },
  {
    prop: 'manager',
    label: '负责人',
    width: '120'
  }
]

// 示例4：带选择框的数据
const selectionData = ref([
  {
    id: '1',
    name: '项目A',
    type: '开发项目',
    children: [
      { id: '1-1', name: '模块A1', type: '前端模块' },
      { id: '1-2', name: '模块A2', type: '后端模块' }
    ]
  },
  {
    id: '2',
    name: '项目B',
    type: '测试项目',
    children: [
      { id: '2-1', name: '模块B1', type: '自动化测试' }
    ]
  }
])

const selectionColumns = [
  {
    type: 'selection',
    width: '55'
  },
  {
    prop: 'name',
    label: '项目名称',
    minWidth: '200'
  },
  {
    prop: 'type',
    label: '类型',
    width: '120'
  }
]

// 示例5：方法调用数据
const methodData = ref([
  {
    id: 'method-1',
    name: '功能模块1',
    description: '这是功能模块1的描述',
    children: [
      { id: 'method-1-1', name: '子功能1-1', description: '子功能描述' },
      { id: 'method-1-2', name: '子功能1-2', description: '子功能描述' }
    ]
  },
  {
    id: 'method-2',
    name: '功能模块2',
    description: '这是功能模块2的描述',
    children: [
      { id: 'method-2-1', name: '子功能2-1', description: '子功能描述' }
    ]
  }
])

const methodColumns = [
  {
    prop: 'name',
    label: '功能名称',
    minWidth: '200'
  },
  {
    prop: 'description',
    label: '描述',
    minWidth: '250'
  }
]

/**
 * 获取状态类型（用于el-tag的type属性）
 * @param {Number} status - 状态值
 * @returns {String} 状态类型
 */
function getStatusType(status) {
  return status === 1 ? 'success' : 'danger'
}

/**
 * 获取状态文本
 * @param {Number} status - 状态值
 * @returns {String} 状态文本
 */
function getStatusText(status) {
  return status === 1 ? '启用' : '禁用'
}

/**
 * 处理编辑操作
 * @param {Object} row - 行数据
 */
function handleEdit(row) {
  ElMessage.success(`编辑：${row.name}`)
}

/**
 * 处理添加子项操作
 * @param {Object} row - 行数据
 */
function handleAddChild(row) {
  ElMessage.success(`为 ${row.name} 添加子项`)
}

/**
 * 处理删除操作
 * @param {Object} row - 行数据
 */
function handleDelete(row) {
  ElMessage.warning(`删除：${row.name}`)
}

/**
 * 处理选择变化
 * @param {Array} selection - 选中的行数据
 */
function handleSelectionChange(selection) {
  selectedRows.value = selection
  ElMessage.info(`选择了 ${selection.length} 项`)
}

/**
 * 展开指定节点
 */
function expandSpecificNodes() {
  if (methodTableRef.value) {
    methodTableRef.value.expandNodes(['method-1', 'method-2'])
    methodInfo.value = '已展开节点：method-1, method-2'
  }
}

/**
 * 折叠指定节点
 */
function collapseSpecificNodes() {
  if (methodTableRef.value) {
    methodTableRef.value.collapseNodes(['method-1'])
    methodInfo.value = '已折叠节点：method-1'
  }
}

/**
 * 获取展开信息
 */
function getExpandedInfo() {
  if (methodTableRef.value) {
    const expandedKeys = methodTableRef.value.getExpandedKeys()
    methodInfo.value = `当前展开的节点：${expandedKeys.join(', ') || '无'}`
  }
}

/**
 * 设置自定义展开
 */
function setCustomExpanded() {
  if (methodTableRef.value) {
    methodTableRef.value.setExpandedKeys(['method-2'])
    methodInfo.value = '已设置展开节点：method-2'
  }
}
</script>

<style scoped>
.accordion-table-example {
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
}

.example-section {
  margin-bottom: 40px;
  padding: 20px;
  border: 1px solid #e4e7ed;
  border-radius: 8px;
  background-color: #fafafa;
}

.example-section h3 {
  margin-top: 0;
  color: #303133;
  font-size: 18px;
}

.example-section p {
  color: #606266;
  margin-bottom: 16px;
}

.selection-info {
  margin-top: 16px;
  padding: 12px;
  background-color: #f0f9ff;
  border: 1px solid #b3d8ff;
  border-radius: 4px;
}

.selection-info ul {
  margin: 8px 0 0 0;
  padding-left: 20px;
}

.method-buttons {
  margin-bottom: 16px;
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.method-info {
  margin-top: 16px;
  padding: 12px;
  background-color: #f0f9ff;
  border: 1px solid #b3d8ff;
  border-radius: 4px;
  color: #1f2937;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .accordion-table-example {
    padding: 10px;
  }
  
  .example-section {
    padding: 15px;
  }
  
  .method-buttons {
    flex-direction: column;
  }
  
  .method-buttons .el-button {
    width: 100%;
  }
}
</style>