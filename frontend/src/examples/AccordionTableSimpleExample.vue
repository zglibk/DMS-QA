<template>
  <div class="accordion-table-simple-example">
    <!-- 基本使用示例 -->>
    <div class="example-section">
      <h4>基本使用示例</h4>
      <p class="example-desc">展示手风琴表格的基本功能，包括树形数据展示和展开/折叠操作。</p>
      
      <AccordionTable
        :data="demoData"
        :columns="demoColumns"
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
    </div>

    <!-- 功能演示 -->
    <div class="demo-actions">
      <el-button @click="addNewItem" type="success" size="small">
        <el-icon><Plus /></el-icon>
        添加新项
      </el-button>
      <el-button @click="expandAll" size="small">
        <el-icon><ArrowDown /></el-icon>
        展开全部
      </el-button>
      <el-button @click="collapseAll" size="small">
        <el-icon><ArrowUp /></el-icon>
        收起全部
      </el-button>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import { Plus, ArrowDown, ArrowUp } from '@element-plus/icons-vue'
import AccordionTable from '@/components/AccordionTable.vue'

/**
 * AccordionTableSimpleExample - 手风琴表格简化示例
 * 
 * 功能特性：
 * - 展示基本的手风琴表格功能
 * - 包含状态显示和操作按钮
 * - 支持动态添加和删除数据
 * - 展开/收起控制
 */

// 演示数据
const demoData = ref([
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
      },
      {
        id: '1-3',
        name: '菜单管理',
        type: '功能',
        status: 0,
        description: '系统菜单配置管理'
      }
    ]
  },
  {
    id: '2',
    name: '质量管理',
    type: '模块',
    status: 1,
    description: '质量控制和管理功能模块',
    children: [
      {
        id: '2-1',
        name: '质量检测',
        type: '功能',
        status: 1,
        description: '产品质量检测功能'
      },
      {
        id: '2-2',
        name: '质量报告',
        type: '功能',
        status: 2,
        description: '质量分析报告生成'
      }
    ]
  },
  {
    id: '3',
    name: '数据分析',
    type: '模块',
    status: 2,
    description: '数据统计和分析功能模块',
    children: [
      {
        id: '3-1',
        name: '统计图表',
        type: '功能',
        status: 1,
        description: '数据可视化图表展示'
      }
    ]
  }
])

// 表格列配置
const demoColumns = [
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

/**
 * 获取状态类型
 * @param {number} status - 状态值
 * @returns {string} Element Plus tag类型
 */
function getStatusType(status) {
  const statusMap = {
    0: 'info',     // 禁用
    1: 'success',  // 正常
    2: 'warning'   // 开发中
  }
  return statusMap[status] || 'info'
}

/**
 * 获取状态文本
 * @param {number} status - 状态值
 * @returns {string} 状态文本
 */
function getStatusText(status) {
  const statusMap = {
    0: '禁用',
    1: '正常',
    2: '开发中'
  }
  return statusMap[status] || '未知'
}

/**
 * 处理编辑操作
 * @param {Object} row - 行数据
 */
function handleEdit(row) {
  ElMessage.info(`编辑项目：${row.name}`)
}

/**
 * 处理删除操作
 * @param {Object} row - 行数据
 */
function handleDelete(row) {
  ElMessage.warning(`删除项目：${row.name}`)
}

/**
 * 添加新项目
 */
function addNewItem() {
  const newId = Date.now().toString()
  const newItem = {
    id: newId,
    name: `新功能模块 ${newId.slice(-4)}`,
    type: '模块',
    status: 2,
    description: '这是一个新添加的功能模块',
    children: []
  }
  
  demoData.value.push(newItem)
  ElMessage.success('新项目添加成功')
}

/**
 * 展开全部节点
 */
function expandAll() {
  // 这里可以通过ref调用AccordionTable的方法
  ElMessage.info('展开全部节点')
}

/**
 * 收起全部节点
 */
function collapseAll() {
  // 这里可以通过ref调用AccordionTable的方法
  ElMessage.info('收起全部节点')
}
</script>

<style scoped>
.accordion-table-simple-example {
  padding: 0;
}

.example-section {
  margin-bottom: 20px;
}

.example-section h4 {
  margin: 0 0 8px 0;
  color: #303133;
  font-size: 16px;
  font-weight: 600;
}

.example-desc {
  margin: 0 0 16px 0;
  color: #606266;
  font-size: 14px;
  line-height: 1.5;
}

.demo-actions {
  margin-top: 16px;
  padding: 16px;
  background-color: #f8f9fa;
  border-radius: 6px;
  border: 1px solid #e9ecef;
}

.demo-actions .el-button {
  margin-right: 8px;
  margin-bottom: 8px;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .demo-actions {
    padding: 12px;
  }
  
  .demo-actions .el-button {
    margin-right: 6px;
    margin-bottom: 6px;
  }
}
</style>