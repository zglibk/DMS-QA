<template>
  <div class="menu-management">
    <!-- 页面标题 -->
    <div class="page-header">
      <h2>菜单管理</h2>
      <p>管理系统中的菜单信息，支持树形结构</p>
    </div>

    <!-- 操作工具栏 -->
    <el-card class="toolbar-card" shadow="never">
      <div class="toolbar">
        <div class="action-section">
          <el-button type="primary" @click="showAddDialog" :icon="Plus">
            新增菜单
          </el-button>
          <el-button @click="expandAll" :icon="Expand">
            展开全部
          </el-button>
          <el-button @click="collapseAll" :icon="Fold">
            收起全部
          </el-button>
          <el-button @click="refreshData" :icon="Refresh">
            刷新
          </el-button>
        </div>
      </div>
    </el-card>

    <!-- 菜单树表格 -->
    <el-card class="table-card" shadow="never">
      <el-table
        ref="tableRef"
        :data="menuTree"
        style="width: 100%"
        row-key="ID"
        :tree-props="{ children: 'children', hasChildren: 'hasChildren' }"
        v-loading="loading"
        stripe
        border
        resizable
        :header-cell-style="{ background: '#f8f9fa', color: '#606266' }"
      >
      <el-table-column prop="Name" label="菜单名称" min-width="200" resizable show-overflow-tooltip>
        <template #default="{ row }">
          <el-icon v-if="row.Icon" class="menu-icon">
            <component :is="row.Icon" />
          </el-icon>
          <el-icon v-else class="menu-icon"><Menu /></el-icon>
          {{ row.Name }}
        </template>
      </el-table-column>
      <el-table-column prop="Path" label="路由路径" min-width="180" resizable show-overflow-tooltip />
      <el-table-column prop="Component" label="组件路径" min-width="180" resizable show-overflow-tooltip />
      <el-table-column prop="Type" label="菜单类型" width="100" resizable>
        <template #default="{ row }">
          <el-tag :type="getTypeTagType(row.Type)" size="small">
            {{ getTypeText(row.Type) }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="Permission" label="权限标识" min-width="150" resizable show-overflow-tooltip />
      <el-table-column prop="Visible" label="是否显示" width="100" resizable>
        <template #default="{ row }">
          <el-tag :type="row.Visible ? 'success' : 'info'" size="small">
            {{ row.Visible ? '显示' : '隐藏' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="Status" label="状态" width="80" resizable>
        <template #default="{ row }">
          <el-tag :type="row.Status ? 'success' : 'danger'" size="small">
            {{ row.Status ? '启用' : '禁用' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="SortOrder" label="排序" width="80" resizable />
      <el-table-column label="操作" width="260" fixed="right">
        <template #default="{ row }">
          <div class="action-buttons">
            <el-button size="small" @click="showEditDialog(row)" :icon="Edit">
              编辑
            </el-button>
            <el-button size="small" type="success" @click="showAddDialog(row)" :icon="Plus">
              新增子菜单
            </el-button>
            <el-button 
              size="small" 
              type="danger" 
              @click="deleteMenu(row)"
              :icon="Delete"
              :disabled="row.children && row.children.length > 0"
            >
              删除
            </el-button>
          </div>
        </template>
      </el-table-column>
      </el-table>
    </el-card>

    <!-- 新增/编辑菜单对话框 -->
    <el-dialog
      :title="dialogTitle"
      v-model="dialogVisible"
      width="700px"
      :before-close="handleDialogClose"
      :append-to-body="true"
      :lock-scroll="false"
    >
      <el-form
        ref="formRef"
        :model="formData"
        :rules="formRules"
        label-width="100px"
      >
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="菜单名称" prop="Name">
              <el-input v-model="formData.Name" placeholder="请输入菜单名称" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="菜单编码" prop="Code">
              <el-input v-model="formData.Code" placeholder="请输入菜单编码" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="菜单类型" prop="Type">
              <el-select v-model="formData.Type" placeholder="请选择菜单类型" @change="handleTypeChange">
                <el-option label="目录" value="catalog" />
                <el-option label="菜单" value="menu" />
                <el-option label="按钮" value="button" />
                <el-option label="接口" value="api" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="上级菜单" prop="ParentID">
              <el-tree-select
                v-model="formData.ParentID"
                :data="menuOptions"
                :props="{ value: 'ID', label: 'Name', children: 'children' }"
                placeholder="请选择上级菜单"
                check-strictly
                clearable
              />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="菜单图标" prop="Icon">
              <el-input v-model="formData.Icon" placeholder="请输入图标名称" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="20" v-if="formData.Type !== 'button' && formData.Type !== 'api'">
          <el-col :span="12">
            <el-form-item label="路由路径" prop="Path">
              <el-input v-model="formData.Path" placeholder="请输入路由路径" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="组件路径" prop="Component">
              <el-input v-model="formData.Component" placeholder="请输入组件路径" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-form-item label="权限标识" prop="Permission">
          <el-input v-model="formData.Permission" placeholder="请输入权限标识，如：user:list" />
        </el-form-item>
        <el-form-item label="菜单描述" prop="Description">
          <el-input
            v-model="formData.Description"
            type="textarea"
            :rows="2"
            placeholder="请输入菜单描述"
          />
        </el-form-item>
        <el-row :gutter="20">
          <el-col :span="8">
            <el-form-item label="排序" prop="SortOrder">
              <el-input-number v-model="formData.SortOrder" :min="0" :max="9999" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="是否显示" prop="Visible">
              <el-switch
                v-model="formData.Visible"
                active-text="显示"
                inactive-text="隐藏"
              />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="状态" prop="Status">
              <el-switch
                v-model="formData.Status"
                active-text="启用"
                inactive-text="禁用"
              />
            </el-form-item>
          </el-col>
        </el-row>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="handleDialogClose">取消</el-button>
          <el-button type="primary" @click="submitForm" :loading="submitting">
            确定
          </el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  Plus,
  Edit,
  Delete,
  Refresh,
  Expand,
  Fold,
  Menu
} from '@element-plus/icons-vue'
import axios from 'axios'

// 响应式数据
const loading = ref(false)
const submitting = ref(false)
const dialogVisible = ref(false)
const tableRef = ref()
const formRef = ref()
const menuList = ref([])
const isEdit = ref(false)
const currentEditId = ref(null)

// 表单数据
const formData = reactive({
  Name: '',
  Code: '',
  Type: 'menu',
  ParentID: null,
  Icon: '',
  Path: '',
  Component: '',
  Permission: '',
  Description: '',
  SortOrder: 0,
  Visible: true,
  Status: true
})

// 表单验证规则
const formRules = {
  Name: [
    { required: true, message: '请输入菜单名称', trigger: 'blur' },
    { min: 2, max: 50, message: '菜单名称长度在 2 到 50 个字符', trigger: 'blur' }
  ],
  Code: [
    { required: true, message: '请输入菜单编码', trigger: 'blur' },
    { min: 2, max: 50, message: '菜单编码长度在 2 到 50 个字符', trigger: 'blur' },
    { pattern: /^[a-zA-Z][a-zA-Z0-9_-]*$/, message: '菜单编码只能包含字母、数字、下划线和连字符，且必须以字母开头', trigger: 'blur' }
  ],
  Type: [
    { required: true, message: '请选择菜单类型', trigger: 'change' }
  ],
  Path: [
    { 
      validator: (rule, value, callback) => {
        if (formData.Type === 'button' || formData.Type === 'api') {
          callback()
          return
        }
        if (!value) {
          callback(new Error('请输入路由路径'))
          return
        }
        if (!value.startsWith('/')) {
          callback(new Error('路由路径必须以 / 开头'))
          return
        }
        callback()
      },
      trigger: 'blur'
    }
  ],
  Permission: [
    { pattern: /^[a-zA-Z][a-zA-Z0-9_:]*$/, message: '权限标识格式不正确', trigger: 'blur' }
  ]
}

// 计算属性
const dialogTitle = computed(() => {
  return isEdit.value ? '编辑菜单' : '新增菜单'
})

// 构建树形结构
const menuTree = computed(() => {
  return buildTree(menuList.value)
})

// 菜单选项（用于上级菜单选择）
const menuOptions = computed(() => {
  return buildTree(menuList.value.filter(menu => menu.ID !== currentEditId.value))
})

// 构建树形结构的函数
function buildTree(list, parentId = null) {
  const tree = []
  for (const item of list) {
    if (item.ParentID === parentId) {
      const children = buildTree(list, item.ID)
      if (children.length > 0) {
        item.children = children
      }
      tree.push(item)
    }
  }
  return tree
}

// 工具函数
function getTypeTagType(type) {
  const typeMap = {
    catalog: 'info',
    menu: 'primary',
    button: 'success',
    api: 'warning'
  }
  return typeMap[type] || ''
}

function getTypeText(type) {
  const textMap = {
    catalog: '目录',
    menu: '菜单',
    button: '按钮',
    api: '接口'
  }
  return textMap[type] || type
}

// 获取菜单列表
const fetchMenus = async () => {
  try {
    loading.value = true
    const response = await axios.get('/api/menus')
    // 修复：从分页数据结构中提取list数组
    const data = response.data.data || {}
    menuList.value = data.list || []
  } catch (error) {
    console.error('获取菜单列表失败:', error)
    ElMessage.error('获取菜单列表失败')
  } finally {
    loading.value = false
  }
}

// 显示新增对话框
const showAddDialog = (parentMenu = null) => {
  isEdit.value = false
  currentEditId.value = null
  resetForm()
  if (parentMenu) {
    formData.ParentID = parentMenu.ID
    // 根据父菜单类型设置默认类型
    if (parentMenu.Type === 'catalog') {
      formData.Type = 'menu'
    } else if (parentMenu.Type === 'menu') {
      formData.Type = 'button'
    }
  }
  dialogVisible.value = true
}

// 显示编辑对话框
const showEditDialog = (menu) => {
  isEdit.value = true
  currentEditId.value = menu.ID
  Object.assign(formData, {
    Name: menu.Name,
    Code: menu.Code || '',
    Type: menu.Type || 'menu',
    ParentID: menu.ParentID,
    Icon: menu.Icon || '',
    Path: menu.Path || '',
    Component: menu.Component || '',
    Permission: menu.Permission || '',
    Description: menu.Description || '',
    SortOrder: menu.SortOrder || 0,
    Visible: menu.Visible !== false,
    Status: menu.Status !== false
  })
  dialogVisible.value = true
}

// 处理菜单类型变化
const handleTypeChange = (type) => {
  if (type === 'button' || type === 'api') {
    formData.Path = ''
    formData.Component = ''
    formData.Visible = false
  } else {
    formData.Visible = true
  }
}

// 重置表单
const resetForm = () => {
  Object.assign(formData, {
    Name: '',
    Code: '',
    Type: 'menu',
    ParentID: null,
    Icon: '',
    Path: '',
    Component: '',
    Permission: '',
    Description: '',
    SortOrder: 0,
    Visible: true,
    Status: true
  })
  if (formRef.value) {
    formRef.value.clearValidate()
  }
}

// 提交表单
const submitForm = async () => {
  if (!formRef.value) return
  
  try {
    await formRef.value.validate()
    submitting.value = true
    
    const url = isEdit.value ? `/api/menus/${currentEditId.value}` : '/api/menus'
    const method = isEdit.value ? 'put' : 'post'
    
    await axios[method](url, formData)
    
    ElMessage.success(isEdit.value ? '更新成功' : '创建成功')
    dialogVisible.value = false
    await fetchMenus()
  } catch (error) {
    console.error('提交失败:', error)
    ElMessage.error(error.response?.data?.message || '操作失败')
  } finally {
    submitting.value = false
  }
}

// 删除菜单
const deleteMenu = async (menu) => {
  try {
    await ElMessageBox.confirm(
      `确定要删除菜单 "${menu.Name}" 吗？`,
      '确认删除',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning',
        appendTo: 'body',
        lockScroll: false
      }
    )
    
    await axios.delete(`/api/menus/${menu.ID}`)
    ElMessage.success('删除成功')
    await fetchMenus()
  } catch (error) {
    if (error !== 'cancel') {
      console.error('删除失败:', error)
      ElMessage.error(error.response?.data?.message || '删除失败')
    }
  }
}

// 展开全部
const expandAll = () => {
  if (tableRef.value) {
    menuList.value.forEach(menu => {
      tableRef.value.toggleRowExpansion(menu, true)
    })
  }
}

// 收起全部
const collapseAll = () => {
  if (tableRef.value) {
    menuList.value.forEach(menu => {
      tableRef.value.toggleRowExpansion(menu, false)
    })
  }
}

// 刷新数据
const refreshData = () => {
  fetchMenus()
}

// 关闭对话框
const handleDialogClose = () => {
  dialogVisible.value = false
  resetForm()
}

// 组件挂载时获取数据
onMounted(() => {
  fetchMenus()
})
</script>

<style scoped>
.menu-management {
  padding: 20px;
  background: #f5f7fa;
  height: auto;
}

.page-header {
  margin-bottom: 20px;
}

.page-header h2 {
  margin: 0 0 8px 0;
  color: #303133;
  font-size: 24px;
  font-weight: 600;
}

.page-header p {
  margin: 0;
  color: #909399;
  font-size: 14px;
}

.toolbar-card {
  margin-bottom: 20px;
  border-radius: 8px;
  border: 1px solid #e4e7ed;
}

.toolbar {
  display: flex;
  justify-content: flex-start;
  align-items: center;
}

.action-section {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.table-card {
  border-radius: 8px;
  border: 1px solid #e4e7ed;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
}

.menu-icon {
  margin-right: 8px;
  color: #409EFF;
}

.dialog-footer {
  text-align: right;
}

:deep(.el-table .el-table__cell) {
  padding: 12px 0;
}

:deep(.el-form-item) {
  margin-bottom: 18px;
}

:deep(.el-button) {
  border-radius: 6px;
}

:deep(.el-input__wrapper) {
  border-radius: 6px;
}

:deep(.el-card__body) {
  padding: 20px;
}

:deep(.el-dialog) {
  border-radius: 8px;
}

/* 操作按钮样式 */
.action-buttons {
  display: flex;
  gap: 4px;
  flex-wrap: nowrap;
  white-space: nowrap;
}

.action-buttons .el-button {
  margin: 0;
  min-width: auto;
  padding: 5px 8px;
}

@media (max-width: 768px) {
  .menu-management {
    padding: 10px;
  }
  
  .action-section {
    justify-content: flex-start;
  }
  
  .page-header h2 {
    font-size: 20px;
  }
}
</style>