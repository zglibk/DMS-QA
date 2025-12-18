<template>
  <div class="menu-management">
    <!-- 页面标题 -->
    <div class="page-header">
      <h2>菜单管理</h2>
      <p>管理系统中的菜单信息，支持树形结构</p>
    </div>

    <!-- 操作工具栏和搜索筛选栏 -->
    <el-card class="toolbar-search-card" shadow="never">
      <el-row :gutter="20" class="toolbar-search-row">
        <!-- 左侧：操作按钮 -->
        <el-col :xs="24" :sm="24" :md="12" :lg="12" :xl="12" class="action-section">
          <div class="action-buttons">
            <el-button type="primary" @click="showAddDialog" :icon="Plus" :disabled="!userStore.hasPermission('sys:menu:add')">
              新增菜单
            </el-button>
            <el-button @click="expandAll" :icon="Expand">
              展开全部
            </el-button>
            <el-button @click="collapseAll" :icon="Fold">
              收起全部
            </el-button>
            <el-button @click="refreshData" :icon="Refresh" :disabled="!userStore.hasPermission('sys:menu:view')">
              刷新
            </el-button>
          </div>
        </el-col>
        
        <!-- 右侧：搜索和筛选 -->
         <el-col :xs="24" :sm="24" :md="12" :lg="12" :xl="12" class="search-section">
           <div class="search-filters">
             <el-row :gutter="10" class="search-row">
               <el-col :xs="24" :sm="8" :md="8" :lg="8" :xl="8">
                 <el-input
                   v-model="searchForm.keyword"
                   placeholder="搜索菜单名称或编码"
                   clearable
                   @clear="handleSearch"
                   @keyup.enter="handleSearch"
                   size="default"
                   class="search-input"
                 >
                   <template #prefix>
                     <el-icon><Search /></el-icon>
                   </template>
                 </el-input>
               </el-col>
               <el-col :xs="12" :sm="4" :md="4" :lg="4" :xl="4">
                 <el-select
                   v-model="searchForm.type"
                   placeholder="类型"
                   clearable
                   @change="handleSearch"
                   size="default"
                   style="width: 100%"
                 >
                   <el-option label="目录" value="catalog" />
                   <el-option label="菜单" value="menu" />
                   <el-option label="按钮" value="button" />
                   <el-option label="接口" value="api" />
                 </el-select>
               </el-col>
               <el-col :xs="12" :sm="4" :md="4" :lg="4" :xl="4">
                 <el-select
                   v-model="searchForm.status"
                   placeholder="状态"
                   clearable
                   @change="handleSearch"
                   @clear="handleSearch"
                   size="default"
                   style="width: 100%"
                 >
                   <el-option label="启用" :value="true" />
                   <el-option label="禁用" :value="false" />
                 </el-select>
               </el-col>
               <el-col :xs="12" :sm="4" :md="4" :lg="4" :xl="4">
                  <el-button type="primary" @click="handleSearch" :icon="Search" size="default" style="width: 100%" :disabled="!userStore.hasPermission('sys:menu:view')">
                    搜索
                  </el-button>
                </el-col>
                <el-col :xs="12" :sm="4" :md="4" :lg="4" :xl="4">
                  <el-button @click="handleReset" :icon="Refresh" size="default" style="width: 100%" :disabled="!userStore.hasPermission('sys:menu:view')">
                    重置
                  </el-button>
                </el-col>
             </el-row>
           </div>
         </el-col>
      </el-row>
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
        @expand-change="handleExpandChange"
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
            <el-button size="small" @click="showEditDialog(row)" :icon="Edit" :disabled="!userStore.hasPermission('sys:menu:edit')">
              编辑
            </el-button>
            <el-button size="small" type="success" @click="showAddDialog(row)" :icon="Plus" :disabled="!userStore.hasPermission('sys:menu:add')">
              新增子菜单
            </el-button>
            <el-button 
              size="small" 
              type="danger" 
              @click="deleteMenu(row)"
              :icon="Delete"
              :disabled="row.children && row.children.length > 0 || !userStore.hasPermission('sys:menu:delete')"
            >
              删除
            </el-button>
          </div>
        </template>
      </el-table-column>
      </el-table>
      
      <!-- 分页组件 -->
      <div class="pagination-wrapper">
        <el-pagination
           v-model:current-page="pagination.page"
           v-model:page-size="pagination.size"
           :page-sizes="[5, 10, 20, 50]"
           :total="pagination.total"
           layout="total, sizes, prev, pager, next, jumper"
           @size-change="handleSizeChange"
           @current-change="handleCurrentChange"
         />
      </div>
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
import { ref, reactive, onMounted, computed, nextTick } from 'vue'
import { useUserStore } from '@/store/user'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  Plus,
  Edit,
  Delete,
  Refresh,
  Expand,
  Fold,
  Menu,
  Search
} from '@element-plus/icons-vue'
import api from '@/utils/api'

const userStore = useUserStore()

// 响应式数据
const loading = ref(false)
const submitting = ref(false)
const dialogVisible = ref(false)
const tableRef = ref()
const formRef = ref()
const menuList = ref([])
const filteredMenuList = ref([])
const isEdit = ref(false)
const currentEditId = ref(null)

// 搜索表单
const searchForm = reactive({
  keyword: '',
  type: '',
  status: ''
})

// 分页数据
const pagination = reactive({
  page: 1,
  size: 5,
  total: 0
})

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
  return buildTree(filteredMenuList.value)
})

// 菜单选项（用于上级菜单选择）
const menuOptions = computed(() => {
  return buildTree(menuList.value.filter(menu => menu.ID !== currentEditId.value))
})

/**
 * 构建树形结构的函数
 * 在当前页数据范围内构建树形结构
 */
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

/**
 * 获取菜单列表数据
 * 支持分页、搜索和筛选
 */
const fetchMenus = async () => {
  loading.value = true
  try {
    // 构建查询参数
    const params = {
      page: pagination.page,
      size: pagination.size,
      keyword: searchForm.keyword,
      type: searchForm.type,
      status: searchForm.status
    }
    
    // 移除空值参数
    Object.keys(params).forEach(key => {
      if (params[key] === '' || params[key] === null || params[key] === undefined) {
        delete params[key]
      }
    })
    
    // 获取菜单列表数据
    const response = await api.get('/menus', { params })
    
    // 检查响应是否成功
    if (!response.success) {
      throw new Error(response.message || '获取菜单列表失败')
    }
    
    const allMenus = response.data.list || []
    
    // 构建树形结构
    const buildMenuTree = (menuList) => {
      const menuMap = new Map()
      const rootMenus = []
      
      // 先创建所有菜单的映射
      menuList.forEach(menu => {
        menu.children = []
        menuMap.set(menu.ID, menu)
      })
      
      // 构建父子关系
      menuList.forEach(menu => {
        if (menu.ParentID && menuMap.has(menu.ParentID)) {
          menuMap.get(menu.ParentID).children.push(menu)
        } else {
          rootMenus.push(menu)
        }
      })
      
      return rootMenus
    }
    
    const flatMenus = allMenus
    const menuTreeData = buildMenuTree([...allMenus])
    
    // 获取顶级菜单（用于分页计算）
    let topLevelMenus = menuTreeData
    
    // 后端已经处理了搜索和筛选，前端直接使用返回的数据
    
    // 设置数据（后端已处理分页）
    menuList.value = flatMenus // 保存完整列表用于其他操作
    filteredMenuList.value = topLevelMenus // 用于树形显示的数据
    pagination.total = response.data.total || topLevelMenus.length
    
    // 数据加载完成后，设置默认展开状态
    nextTick(() => {
      setDefaultExpansion()
    })
    
  } catch (error) {
    console.error('获取菜单列表失败:', error)
    ElMessage.error('获取菜单列表失败')
  } finally {
    loading.value = false
  }
}



// 搜索处理
const handleSearch = () => {
  pagination.page = 1
  fetchMenus()
}

// 重置搜索
const handleReset = () => {
  Object.assign(searchForm, {
    keyword: '',
    type: '',
    status: ''
  })
  pagination.page = 1
  fetchMenus()
}

// 分页大小变化
const handleSizeChange = (size) => {
  pagination.size = size
  pagination.page = 1
  fetchMenus()
}

// 当前页变化
const handleCurrentChange = (page) => {
  pagination.page = page
  fetchMenus()
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
    
    const url = isEdit.value ? `/menus/${currentEditId.value}` : '/menus'
    const method = isEdit.value ? 'put' : 'post'
    
    await api[method](url, formData)
    
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
    
    await api.delete(`/menus/${menu.ID}`)
    ElMessage.success('删除成功')
    await fetchMenus()
  } catch (error) {
    if (error !== 'cancel') {
      console.error('删除失败:', error)
      ElMessage.error(error.response?.data?.message || '删除失败')
    }
  }
}

/**
 * 处理表格展开变化事件
 * 实现手风琴效果：展开一个节点时自动折叠其他同级节点
 * @param {Object} row - 当前操作的行数据
 * @param {Boolean} expanded - 是否展开状态
 */
const handleExpandChange = (row, expanded) => {
  // 如果当前行被展开
  if (expanded) {
    // 找到同级的其他节点并折叠它们
    const siblings = getSiblings(row)
    siblings.forEach(sibling => {
      if (sibling.ID !== row.ID) {
        tableRef.value.toggleRowExpansion(sibling, false)
      }
    })
  }
}

/**
 * 获取同级节点
 */
const getSiblings = (row) => {
  // 如果是顶级菜单，返回所有顶级菜单
  if (!row.ParentID) {
    return menuTree.value
  }
  
  // 如果是子菜单，找到父菜单的所有子菜单
  const parent = findMenuById(row.ParentID)
  return parent ? parent.children || [] : []
}

/**
 * 根据ID查找菜单项
 */
const findMenuById = (id) => {
  const findInList = (list) => {
    for (const item of list) {
      if (item.ID === id) {
        return item
      }
      if (item.children) {
        const found = findInList(item.children)
        if (found) return found
      }
    }
    return null
  }
  return findInList(menuTree.value)
}

/**
 * 设置默认展开状态
 * 只展开第一个顶级菜单
 */
const setDefaultExpansion = () => {
  if (tableRef.value && menuTree.value.length > 0) {
    // 先折叠所有菜单
    menuList.value.forEach(menu => {
      tableRef.value.toggleRowExpansion(menu, false)
    })
    
    // 只展开第一个顶级菜单
    const firstTopMenu = menuTree.value[0]
    if (firstTopMenu) {
      tableRef.value.toggleRowExpansion(firstTopMenu, true)
    }
  }
}

/**
 * 展开全部菜单
 */
const expandAll = () => {
  if (tableRef.value) {
    menuList.value.forEach(menu => {
      tableRef.value.toggleRowExpansion(menu, true)
    })
  }
}

/**
 * 收起全部菜单并重置为默认状态
 * 折叠全部后只展开第一个顶级菜单
 */
const collapseAll = () => {
  if (tableRef.value) {
    // 先折叠所有菜单
    menuList.value.forEach(menu => {
      tableRef.value.toggleRowExpansion(menu, false)
    })
    
    // 延迟一下再设置默认展开，确保折叠操作完成
    setTimeout(() => {
      setDefaultExpansion()
    }, 100)
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

.search-card {
  margin-bottom: 20px;
  border-radius: 8px;
  border: 1px solid #e4e7ed;
}

.toolbar-card {
  margin-bottom: 20px;
  border-radius: 8px;
  border: 1px solid #e4e7ed;
}

.pagination-wrapper {
  margin-top: 20px;
  display: flex;
  justify-content: center;
}

.toolbar {
  display: flex;
  justify-content: flex-start;
  align-items: center;
}

/* 工具栏和搜索卡片样式 */
.toolbar-search-card {
  border-radius: 8px;
  border: 1px solid #e4e7ed;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
  margin-bottom: 20px;
}

.toolbar-search-row {
  align-items: flex-start;
}

/* 操作按钮区域 */
.action-section {
  display: flex;
  align-items: center;
  margin-bottom: 10px;
}

.action-buttons {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

/* 搜索区域 */
.search-section {
  display: flex;
  flex-direction: column;
}

.search-filters {
  width: 100%;
}

.search-row {
  align-items: center;
}

.search-input {
  max-width: 420px;
}

/* 在小屏幕下搜索输入框占满宽度 */
@media (max-width: 576px) {
  .search-input {
    max-width: 100%;
  }
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

/* 表格标题行文字居中 */
:deep(.el-table .el-table__header-wrapper .el-table__header .el-table__cell) {
  text-align: center;
}

/* 操作列按钮不换行 */
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
  font-size: 12px;
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

/* 响应式布局 */
@media (max-width: 768px) {
  .menu-management {
    padding: 10px;
  }
  
  .page-header h2 {
    font-size: 20px;
  }
  
  /* 小屏幕下操作按钮区域 */
  .action-section {
    margin-bottom: 20px;
  }
  
  .action-buttons {
    gap: 6px;
  }
  
  .action-buttons .el-button {
    font-size: 12px;
    padding: 6px 10px;
  }
  
  /* 小屏幕下搜索区域 */
   .search-section {
     margin-top: 15px;
   }
   
   .search-row .el-col {
     margin-bottom: 8px;
   }
}

@media (max-width: 576px) {
  /* 超小屏幕优化 */
  .action-buttons {
    flex-direction: column;
    gap: 8px;
    width: 100%;
  }
  
  .action-buttons .el-button {
    width: 100%;
    justify-content: center;
  }
  
  .filter-row .el-col {
    span: 24;
    margin-bottom: 10px;
  }
}
</style>