# AccordionTable 手风琴树形表格组件

## 快速开始

这是一个基于 Element Plus 的可复用树形表格组件，实现了手风琴展开/折叠效果。

### 📁 文件结构

```
components/
├── AccordionTable.vue          # 主组件文件
├── AccordionTable.md           # 详细API文档
└── README.md                   # 快速开始指南（本文件）

examples/
└── AccordionTableExample.vue   # 使用示例页面
```

### 🚀 快速使用

#### 1. 基本用法

```vue
<template>
  <AccordionTable
    :data="tableData"
    :columns="columns"
  />
</template>

<script setup>
import AccordionTable from '@/components/AccordionTable.vue'

const tableData = ref([
  {
    id: '1',
    name: '父节点',
    children: [
      { id: '1-1', name: '子节点1' },
      { id: '1-2', name: '子节点2' }
    ]
  }
])

const columns = [
  { prop: 'name', label: '名称', minWidth: '200' }
]
</script>
```

#### 2. 自定义操作列

```vue
<template>
  <AccordionTable
    :data="tableData"
    :columns="columns"
  >
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
const columns = [
  { prop: 'name', label: '名称', minWidth: '200' },
  { type: 'action', label: '操作', width: '200' }
]

function handleEdit(row) {
  console.log('编辑：', row)
}

function handleDelete(row) {
  console.log('删除：', row)
}
</script>
```

### 🎯 核心特性

- ✅ **手风琴效果**：展开节点时自动折叠同级其他节点
- ✅ **完全可配置**：支持自定义列、插槽、树形结构等
- ✅ **方法暴露**：提供展开/折叠控制方法
- ✅ **响应式设计**：适配移动端和桌面端
- ✅ **高性能**：基于 Vue 3 Composition API

### 📖 查看完整示例

1. **在线示例**：访问 `/admin/system/accordion-table-example` 查看完整的使用示例
2. **API文档**：查看 `AccordionTable.md` 了解详细的API说明
3. **示例代码**：参考 `examples/AccordionTableExample.vue` 文件

### 🔧 常用配置

| 属性 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| data | Array | `[]` | 树形数据源 |
| columns | Array | `[]` | 列配置 |
| accordion | Boolean | `true` | 是否启用手风琴效果 |
| showActions | Boolean | `true` | 是否显示操作按钮 |
| loading | Boolean | `false` | 加载状态 |

### 🎨 列配置示例

```javascript
const columns = [
  // 普通列
  { prop: 'name', label: '名称', minWidth: '200' },
  
  // 自定义插槽列
  { prop: 'status', label: '状态', width: '100', slot: 'status' },
  
  // 选择框列
  { type: 'selection', width: '55' },
  
  // 操作列
  { type: 'action', label: '操作', width: '200' }
]
```

### 🔗 相关链接

- [Element Plus Table 文档](https://element-plus.org/zh-CN/component/table.html)
- [Vue 3 Composition API](https://cn.vuejs.org/guide/extras/composition-api-faq.html)
- [项目菜单管理实现](../views/admin/MenuManagement.vue)

### 💡 使用建议

1. **数据结构**：确保每个节点都有唯一的 `id` 字段
2. **性能优化**：大量数据时考虑使用虚拟滚动或分页
3. **用户体验**：合理设置默认展开状态和加载提示
4. **样式定制**：通过 CSS 变量或类名进行样式定制

### 🐛 常见问题

**Q: 如何禁用手风琴效果？**
A: 设置 `:accordion="false"`

**Q: 如何设置默认展开的节点？**
A: 使用 `:default-expanded-keys="['1', '2']"`

**Q: 如何获取当前展开的节点？**
A: 通过 ref 调用 `getExpandedKeys()` 方法

---

📝 **更新时间**：2024年12月
👨‍💻 **维护者**：DMS-QA 开发团队