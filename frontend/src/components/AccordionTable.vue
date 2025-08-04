<template>
  <div class="accordion-table-container">
    <!-- 表格操作按钮区域 -->
    <div class="table-actions" v-if="showActions">
      <el-button 
        type="primary" 
        size="small" 
        @click="expandAll"
        :disabled="loading"
      >
        展开全部
      </el-button>
      <el-button 
        type="default" 
        size="small" 
        @click="collapseAll"
        :disabled="loading"
      >
        收起全部
      </el-button>
    </div>

    <!-- 树形表格组件 -->
    <el-table
      ref="tableRef"
      :data="tableData"
      :loading="loading"
      :row-key="rowKey"
      :tree-props="treeProps"
      :default-expand-all="defaultExpandAll"
      :expand-row-keys="expandedKeys"
      @expand-change="handleExpandChange"
      v-bind="$attrs"
      class="accordion-table"
    >
      <!-- 动态渲染表格列 -->
      <template v-for="column in columns" :key="column.prop || column.type">
        <!-- 普通列 -->
        <el-table-column
          v-if="!column.type"
          :prop="column.prop"
          :label="column.label"
          :width="column.width"
          :min-width="column.minWidth"
          :fixed="column.fixed"
          :align="column.align || 'left'"
          :show-overflow-tooltip="column.showOverflowTooltip !== false"
        >
          <!-- 自定义列内容插槽 -->
          <template #default="scope" v-if="column.slot">
            <slot :name="column.slot" :row="scope.row" :column="column" :$index="scope.$index">
              {{ scope.row[column.prop] }}
            </slot>
          </template>
        </el-table-column>

        <!-- 操作列 -->
        <el-table-column
          v-else-if="column.type === 'action'"
          :label="column.label || '操作'"
          :width="column.width || '200'"
          :fixed="column.fixed || 'right'"
          :align="column.align || 'center'"
        >
          <template #default="scope">
            <slot name="action" :row="scope.row" :$index="scope.$index">
              <el-button type="primary" size="small">编辑</el-button>
              <el-button type="danger" size="small">删除</el-button>
            </slot>
          </template>
        </el-table-column>

        <!-- 其他特殊列类型（如选择框、序号等） -->
        <el-table-column
          v-else
          :type="column.type"
          :label="column.label"
          :width="column.width"
          :fixed="column.fixed"
          :align="column.align"
        />
      </template>
    </el-table>
  </div>
</template>

<script setup>
import { ref, computed, watch, nextTick, onMounted } from 'vue'

/**
 * AccordionTable - 手风琴效果的树形表格组件
 * 
 * 功能特性：
 * 1. 支持树形数据展示
 * 2. 实现手风琴效果（展开一个节点时自动折叠同级其他节点）
 * 3. 支持展开全部/收起全部操作
 * 4. 可配置的表格列定义
 * 5. 支持自定义插槽内容
 * 6. 完全可复用的组件设计
 */

// 组件属性定义
const props = defineProps({
  /**
   * 表格数据源
   * @type {Array} 树形结构的数据数组
   */
  data: {
    type: Array,
    default: () => []
  },
  
  /**
   * 表格列配置
   * @type {Array} 列配置数组
   * 每个列对象可包含以下属性：
   * - prop: 字段名
   * - label: 列标题
   * - width: 列宽度
   * - minWidth: 最小宽度
   * - fixed: 固定列位置
   * - align: 对齐方式
   * - slot: 自定义插槽名称
   * - type: 特殊列类型（如 'selection', 'index', 'action'）
   * - showOverflowTooltip: 是否显示溢出提示
   */
  columns: {
    type: Array,
    default: () => []
  },
  
  /**
   * 行数据的唯一标识字段名
   * @type {String} 默认为 'id'
   */
  rowKey: {
    type: String,
    default: 'id'
  },
  
  /**
   * 树形结构配置
   * @type {Object} 包含 children 和 hasChildren 字段配置
   */
  treeProps: {
    type: Object,
    default: () => ({
      children: 'children',
      hasChildren: 'hasChildren'
    })
  },
  
  /**
   * 是否默认展开所有节点
   * @type {Boolean} 默认为 false
   */
  defaultExpandAll: {
    type: Boolean,
    default: false
  },
  
  /**
   * 是否启用手风琴效果
   * @type {Boolean} 默认为 true
   */
  accordion: {
    type: Boolean,
    default: true
  },
  
  /**
   * 是否显示操作按钮（展开全部/收起全部）
   * @type {Boolean} 默认为 true
   */
  showActions: {
    type: Boolean,
    default: true
  },
  
  /**
   * 表格加载状态
   * @type {Boolean} 默认为 false
   */
  loading: {
    type: Boolean,
    default: false
  },
  
  /**
   * 初始展开的节点keys
   * @type {Array} 默认为空数组
   */
  defaultExpandedKeys: {
    type: Array,
    default: () => []
  }
})

// 组件事件定义
const emit = defineEmits([
  'expand-change',  // 节点展开状态改变事件
  'row-click',      // 行点击事件
  'selection-change' // 选择改变事件
])

// 响应式数据
const tableRef = ref(null)  // 表格引用
const expandedKeys = ref([])  // 当前展开的节点keys
const isUpdatingExpansion = ref(false)  // 防止展开状态更新时的无限循环

// 计算属性：表格数据
const tableData = computed(() => props.data)

/**
 * 监听默认展开的keys变化
 */
watch(
  () => props.defaultExpandedKeys,
  (newKeys) => {
    expandedKeys.value = [...newKeys]
  },
  { immediate: true }
)

/**
 * 监听数据变化，设置初始展开状态
 */
watch(
  () => props.data,
  (newData) => {
    if (newData && newData.length > 0 && !props.defaultExpandAll) {
      // 如果没有指定默认展开的keys，则展开第一个顶级节点
      if (props.defaultExpandedKeys.length === 0) {
        setDefaultExpansion()
      }
    }
  },
  { immediate: true }
)

/**
 * 设置默认展开状态（展开第一个顶级节点）
 */
function setDefaultExpansion() {
  if (tableData.value && tableData.value.length > 0) {
    const firstItem = tableData.value[0]
    if (firstItem && firstItem[props.treeProps.children]?.length > 0) {
      expandedKeys.value = [firstItem[props.rowKey]]
    }
  }
}

/**
 * 处理节点展开状态变化
 * @param {Object} row - 当前操作的行数据
 * @param {Boolean} expanded - 是否展开
 */
function handleExpandChange(row, expanded) {
  // 防止在程序化更新展开状态时触发事件处理
  if (isUpdatingExpansion.value) {
    return
  }
  
  const rowKey = row[props.rowKey]
  
  // 设置更新标志
  isUpdatingExpansion.value = true
  
  if (expanded) {
    // 节点被展开
    let newExpandedKeys = [...expandedKeys.value]
    
    if (!newExpandedKeys.includes(rowKey)) {
      newExpandedKeys.push(rowKey)
    }
    
    // 如果启用手风琴效果，折叠同级其他节点
    if (props.accordion) {
      const siblings = getSiblings(row, tableData.value)
      siblings.forEach(sibling => {
        const siblingKey = sibling[props.rowKey]
        if (siblingKey !== rowKey) {
          const index = newExpandedKeys.indexOf(siblingKey)
          if (index > -1) {
            newExpandedKeys.splice(index, 1)
          }
        }
      })
    }
    
    // 更新展开状态
    expandedKeys.value = newExpandedKeys
  } else {
    // 节点被折叠
    const newExpandedKeys = expandedKeys.value.filter(key => key !== rowKey)
    expandedKeys.value = newExpandedKeys
  }
  
  // 重置更新标志
  nextTick(() => {
    isUpdatingExpansion.value = false
  })
  
  // 触发展开状态变化事件
  emit('expand-change', row, expanded)
}

/**
 * 获取指定节点的同级节点
 * @param {Object} targetRow - 目标行数据
 * @param {Array} data - 数据源
 * @param {Object|null} parent - 父节点
 * @returns {Array} 同级节点数组
 */
function getSiblings(targetRow, data, parent = null) {
  const targetKey = targetRow[props.rowKey]
  
  // 在当前层级查找
  for (const item of data) {
    if (item[props.rowKey] === targetKey) {
      // 找到目标节点，返回当前层级的所有节点
      return data
    }
    
    // 递归查找子节点
    if (item[props.treeProps.children]?.length > 0) {
      const siblings = getSiblings(targetRow, item[props.treeProps.children], item)
      if (siblings.length > 0 && siblings.some(s => s[props.rowKey] === targetKey)) {
        return siblings
      }
    }
  }
  
  return []
}

/**
 * 递归获取所有节点的keys
 * @param {Array} data - 数据源
 * @returns {Array} 所有节点的keys数组
 */
function getAllKeys(data) {
  const keys = []
  
  function traverse(items) {
    items.forEach(item => {
      keys.push(item[props.rowKey])
      if (item[props.treeProps.children]?.length > 0) {
        traverse(item[props.treeProps.children])
      }
    })
  }
  
  traverse(data)
  return keys
}

/**
 * 展开所有节点
 */
function expandAll() {
  isUpdatingExpansion.value = true
  expandedKeys.value = getAllKeys(tableData.value)
  nextTick(() => {
    isUpdatingExpansion.value = false
  })
}

/**
 * 收起所有节点
 */
function collapseAll() {
  isUpdatingExpansion.value = true
  expandedKeys.value = []
  nextTick(() => {
    isUpdatingExpansion.value = false
  })
}

/**
 * 展开指定节点
 * @param {String|Array} keys - 要展开的节点key或keys数组
 */
function expandNodes(keys) {
  const keysArray = Array.isArray(keys) ? keys : [keys]
  const newExpandedKeys = [...expandedKeys.value]
  
  keysArray.forEach(key => {
    if (!newExpandedKeys.includes(key)) {
      newExpandedKeys.push(key)
    }
  })
  
  isUpdatingExpansion.value = true
  expandedKeys.value = newExpandedKeys
  nextTick(() => {
    isUpdatingExpansion.value = false
  })
}

/**
 * 折叠指定节点
 * @param {String|Array} keys - 要折叠的节点key或keys数组
 */
function collapseNodes(keys) {
  const keysArray = Array.isArray(keys) ? keys : [keys]
  const newExpandedKeys = expandedKeys.value.filter(key => !keysArray.includes(key))
  
  isUpdatingExpansion.value = true
  expandedKeys.value = newExpandedKeys
  nextTick(() => {
    isUpdatingExpansion.value = false
  })
}

/**
 * 获取当前展开的节点keys
 * @returns {Array} 展开的节点keys数组
 */
function getExpandedKeys() {
  return [...expandedKeys.value]
}

/**
 * 设置展开的节点keys
 * @param {Array} keys - 要设置的节点keys数组
 */
function setExpandedKeys(keys) {
  isUpdatingExpansion.value = true
  expandedKeys.value = [...keys]
  nextTick(() => {
    isUpdatingExpansion.value = false
  })
}

// 组件挂载后的初始化
onMounted(() => {
  // 如果没有指定默认展开的keys且不是默认展开全部，则设置默认展开第一个节点
  if (props.defaultExpandedKeys.length === 0 && !props.defaultExpandAll) {
    nextTick(() => {
      setDefaultExpansion()
    })
  }
})

// 暴露给父组件的方法
defineExpose({
  expandAll,
  collapseAll,
  expandNodes,
  collapseNodes,
  getExpandedKeys,
  setExpandedKeys,
  tableRef
})
</script>

<style scoped>
.accordion-table-container {
  width: 100%;
}

.table-actions {
  margin-bottom: 16px;
  display: flex;
  gap: 8px;
}

.accordion-table {
  width: 100%;
}

/* 表格行悬停效果 */
.accordion-table :deep(.el-table__row:hover) {
  background-color: #f5f7fa;
}

/* 展开图标样式优化 */
.accordion-table :deep(.el-table__expand-icon) {
  transition: transform 0.2s ease-in-out;
}

/* 表格边框样式 */
.accordion-table :deep(.el-table) {
  border: 1px solid #ebeef5;
}

/* 表格头部样式 */
.accordion-table :deep(.el-table__header-wrapper) {
  background-color: #fafafa;
}
</style>