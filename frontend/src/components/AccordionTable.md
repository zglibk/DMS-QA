# AccordionTable 手风琴树形表格组件

## 概述

AccordionTable 是一个基于 Element Plus 的 el-table 组件封装的可复用树形表格组件，实现了手风琴展开/折叠效果。当展开一个节点时，会自动折叠其同级的其他节点，提供更好的用户体验。

## 特性

- ✅ **手风琴效果**：展开节点时自动折叠同级其他节点
- ✅ **完全可配置**：支持自定义列配置、树形结构配置等
- ✅ **插槽支持**：支持自定义列内容和操作按钮
- ✅ **方法暴露**：提供丰富的公开方法供外部调用
- ✅ **响应式设计**：支持移动端和桌面端
- ✅ **TypeScript 友好**：完整的类型定义
- ✅ **高性能**：基于 Vue 3 Composition API

## 安装和引入

### 全局注册

```javascript
// main.js
import { createApp } from 'vue'
import AccordionTable from '@/components/AccordionTable.vue'

const app = createApp(App)
app.component('AccordionTable', AccordionTable)
```

### 局部引入

```vue
<script setup>
import AccordionTable from '@/components/AccordionTable.vue'
</script>
```

## 基本用法

```vue
<template>
  <AccordionTable
    :data="tableData"
    :columns="columns"
  />
</template>

<script setup>
import { ref } from 'vue'
import AccordionTable from '@/components/AccordionTable.vue'

const tableData = ref([
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
  }
])

const columns = [
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
</script>
```

## API 文档

### Props 属性

| 属性名 | 类型 | 默认值 | 说明 |
|--------|------|--------|------|
| data | Array | `[]` | 树形结构的数据源 |
| columns | Array | `[]` | 表格列配置数组 |
| rowKey | String | `'id'` | 行数据的唯一标识字段名 |
| treeProps | Object | `{ children: 'children', hasChildren: 'hasChildren' }` | 树形结构配置 |
| defaultExpandAll | Boolean | `false` | 是否默认展开所有节点 |
| accordion | Boolean | `true` | 是否启用手风琴效果 |
| showActions | Boolean | `true` | 是否显示操作按钮（展开全部/收起全部） |
| loading | Boolean | `false` | 表格加载状态 |
| defaultExpandedKeys | Array | `[]` | 初始展开的节点keys |

### Columns 列配置

每个列对象支持以下属性：

| 属性名 | 类型 | 说明 |
|--------|------|------|
| prop | String | 对应数据字段名 |
| label | String | 列标题 |
| width | String/Number | 列宽度 |
| minWidth | String/Number | 最小宽度 |
| fixed | String | 固定列位置（'left' 或 'right'） |
| align | String | 对齐方式（'left'、'center'、'right'） |
| slot | String | 自定义插槽名称 |
| type | String | 特殊列类型（'selection'、'index'、'action'） |
| showOverflowTooltip | Boolean | 是否显示溢出提示，默认 true |

### Events 事件

| 事件名 | 参数 | 说明 |
|--------|------|------|
| expand-change | (row, expanded) | 节点展开状态改变时触发 |
| row-click | (row, column, event) | 行点击事件 |
| selection-change | (selection) | 选择改变事件 |

### Slots 插槽

| 插槽名 | 参数 | 说明 |
|--------|------|------|
| [column.slot] | { row, column, $index } | 自定义列内容插槽 |
| action | { row, $index } | 操作列插槽 |

### Methods 方法

通过 ref 可以调用以下方法：

| 方法名 | 参数 | 返回值 | 说明 |
|--------|------|--------|------|
| expandAll | - | - | 展开所有节点 |
| collapseAll | - | - | 收起所有节点 |
| expandNodes | keys: String\|Array | - | 展开指定节点 |
| collapseNodes | keys: String\|Array | - | 折叠指定节点 |
| getExpandedKeys | - | Array | 获取当前展开的节点keys |
| setExpandedKeys | keys: Array | - | 设置展开的节点keys |

## 使用示例

### 1. 基本用法

```vue
<template>
  <AccordionTable
    :data="basicData"
    :columns="basicColumns"
  />
</template>
```

### 2. 自定义插槽

```vue
<template>
  <AccordionTable
    :data="customData"
    :columns="customColumns"
  >
    <!-- 状态列自定义插槽 -->
    <template #status="{ row }">
      <el-tag :type="row.status === 1 ? 'success' : 'danger'">
        {{ row.status === 1 ? '启用' : '禁用' }}
      </el-tag>
    </template>
    
    <!-- 操作列自定义插槽 -->
    <template #action="{ row }">
      <el-button type="primary" size="small" @click="handleEdit(row)">
        编辑
      </el-button>
      <el-button type="danger" size="small" @click="handleDelete(row)">
        删除
      </el-button>
    </template>
  </AccordionTable>
</template>

<script setup>
const customColumns = [
  { prop: 'name', label: '名称', minWidth: '200' },
  { prop: 'status', label: '状态', width: '100', slot: 'status' },
  { type: 'action', label: '操作', width: '200' }
]
</script>
```

### 3. 禁用手风琴效果

```vue
<template>
  <AccordionTable
    :data="data"
    :columns="columns"
    :accordion="false"
    :default-expanded-keys="['1', '2']"
  />
</template>
```

### 4. 带选择框的表格

```vue
<template>
  <AccordionTable
    :data="data"
    :columns="selectionColumns"
    @selection-change="handleSelectionChange"
  />
</template>

<script setup>
const selectionColumns = [
  { type: 'selection', width: '55' },
  { prop: 'name', label: '名称', minWidth: '200' },
  { prop: 'type', label: '类型', width: '120' }
]

function handleSelectionChange(selection) {
  console.log('选中的行：', selection)
}
</script>
```

### 5. 方法调用

```vue
<template>
  <div>
    <div class="actions">
      <el-button @click="expandSpecific">展开指定节点</el-button>
      <el-button @click="getExpanded">获取展开状态</el-button>
    </div>
    
    <AccordionTable
      ref="tableRef"
      :data="data"
      :columns="columns"
    />
  </div>
</template>

<script setup>
import { ref } from 'vue'

const tableRef = ref(null)

function expandSpecific() {
  tableRef.value.expandNodes(['1', '2'])
}

function getExpanded() {
  const keys = tableRef.value.getExpandedKeys()
  console.log('当前展开的节点：', keys)
}
</script>
```

## 数据结构要求

### 基本数据结构

```javascript
const data = [
  {
    id: '1',                    // 唯一标识（必需）
    name: '父节点',             // 业务数据
    children: [                 // 子节点数组（可选）
      {
        id: '1-1',
        name: '子节点1'
      },
      {
        id: '1-2',
        name: '子节点2',
        children: [             // 支持多级嵌套
          {
            id: '1-2-1',
            name: '孙节点1'
          }
        ]
      }
    ]
  }
]
```

### 自定义字段名

如果你的数据结构使用不同的字段名，可以通过 `rowKey` 和 `treeProps` 进行配置：

```vue
<template>
  <AccordionTable
    :data="data"
    :columns="columns"
    row-key="uuid"
    :tree-props="{ children: 'subItems', hasChildren: 'hasSubItems' }"
  />
</template>

<script setup>
const data = [
  {
    uuid: 'abc123',           // 自定义唯一标识字段
    title: '父节点',
    hasSubItems: true,        // 自定义是否有子节点字段
    subItems: [               // 自定义子节点字段
      {
        uuid: 'def456',
        title: '子节点'
      }
    ]
  }
]
</script>
```

## 样式定制

### CSS 变量

组件支持通过 CSS 变量进行样式定制：

```css
.accordion-table {
  --table-border-color: #ebeef5;
  --table-header-bg: #fafafa;
  --table-hover-bg: #f5f7fa;
  --expand-icon-transition: transform 0.2s ease-in-out;
}
```

### 自定义样式类

```vue
<template>
  <AccordionTable
    :data="data"
    :columns="columns"
    class="custom-accordion-table"
  />
</template>

<style>
.custom-accordion-table {
  /* 自定义样式 */
}

.custom-accordion-table :deep(.el-table__row) {
  /* 自定义行样式 */
}
</style>
```

## 最佳实践

### 1. 性能优化

- 对于大量数据，建议使用虚拟滚动或分页
- 避免在 columns 配置中使用复杂的计算逻辑
- 合理使用 `showOverflowTooltip` 属性

### 2. 用户体验

- 为重要操作添加确认对话框
- 使用 loading 状态提升用户体验
- 合理设置默认展开状态

### 3. 数据管理

- 保持数据结构的一致性
- 使用唯一且稳定的 rowKey
- 避免频繁修改树形结构

## 常见问题

### Q: 如何实现懒加载？

A: 可以结合 Element Plus 的 `lazy` 和 `load` 属性：

```vue
<template>
  <AccordionTable
    :data="data"
    :columns="columns"
    lazy
    :load="loadNode"
  />
</template>

<script setup>
function loadNode(row, treeNode, resolve) {
  // 异步加载子节点数据
  setTimeout(() => {
    resolve([
      { id: `${row.id}-1`, name: '动态子节点1' },
      { id: `${row.id}-2`, name: '动态子节点2' }
    ])
  }, 1000)
}
</script>
```

### Q: 如何实现多选功能？

A: 在 columns 中添加 selection 类型的列：

```javascript
const columns = [
  { type: 'selection', width: '55' },
  { prop: 'name', label: '名称' }
]
```

### Q: 如何自定义展开图标？

A: 可以通过 CSS 覆盖默认样式：

```css
.accordion-table :deep(.el-table__expand-icon) {
  /* 自定义展开图标样式 */
}
```

## 更新日志

### v1.0.0
- 初始版本发布
- 支持基本的手风琴效果
- 支持自定义列配置
- 支持插槽自定义
- 提供完整的方法 API

## 贡献指南

欢迎提交 Issue 和 Pull Request 来帮助改进这个组件。

### 开发环境

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 运行测试
npm run test
```

## 许可证

MIT License