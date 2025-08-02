<template>
  <div class="role-management">
    <!-- 页面标题 -->
    <div class="page-header">
      <h2>角色管理</h2>
      <p>管理系统中的角色信息和权限分配</p>
    </div>

    <!-- 搜索和操作工具栏 -->
    <el-card class="toolbar-card" shadow="never">
      <div class="toolbar">
        <div class="search-section">
          <el-input
            v-model="searchForm.keyword"
            placeholder="搜索角色名称或编码"
            style="width: 300px; margin-right: 10px"
            clearable
            @keyup.enter="handleSearch"
          >
            <template #prefix>
              <el-icon><Search /></el-icon>
            </template>
          </el-input>
          <el-select
            v-model="searchForm.status"
            placeholder="状态"
            style="width: 120px; margin-right: 10px"
            clearable
          >
            <el-option label="启用" :value="true" />
            <el-option label="禁用" :value="false" />
          </el-select>
          <el-button type="primary" @click="handleSearch" :icon="Search">
            搜索
          </el-button>
          <el-button @click="resetSearch" :icon="Refresh">
            重置
          </el-button>
        </div>
        <div class="action-section">
          <el-button type="primary" @click="showAddDialog" :icon="Plus">
            新增角色
          </el-button>
          <el-button @click="refreshData" :icon="Refresh">
            刷新
          </el-button>
        </div>
      </div>
    </el-card>

    <!-- 角色列表表格 -->
    <el-card class="table-card" shadow="never">
      <template #header>
        <div class="table-header">
          <div class="table-title">
            <el-icon class="title-icon"><UserFilled /></el-icon>
            <span>角色列表</span>
          </div>
          <div class="table-info">
            <span class="total-count">共 {{ total }} 条记录</span>
          </div>
        </div>
      </template>
      <el-table
        :data="roleList"
        style="width: 100%"
        v-loading="loading"
        stripe
        border
        resizable
        :header-cell-style="{ background: '#f8f9fa', color: '#606266' }"
      >
      <el-table-column label="#" type="index" width="60" fixed="left" />
      <el-table-column prop="Name" label="角色名称" min-width="120" resizable show-overflow-tooltip />
      <el-table-column prop="Code" label="角色编码" min-width="120" resizable show-overflow-tooltip />
      <el-table-column prop="Description" label="角色描述" min-width="200" resizable show-overflow-tooltip />
      <el-table-column prop="Status" label="状态" width="80" resizable>
        <template #default="{ row }">
          <el-tag :type="row.Status ? 'success' : 'danger'" size="small">
            {{ row.Status ? '启用' : '禁用' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="SortOrder" label="排序" width="80" resizable />
      <el-table-column prop="CreatedAt" label="创建时间" min-width="160" resizable>
        <template #default="{ row }">
          {{ formatDate(row.CreatedAt) }}
        </template>
      </el-table-column>
      <el-table-column label="操作" width="240" fixed="right">
        <template #default="{ row }">
          <div class="action-buttons">
            <el-button size="small" @click="showEditDialog(row)" :icon="Edit">
              编辑
            </el-button>
            <el-button size="small" type="success" @click="showPermissionDialog(row)" :icon="Setting">
              权限
            </el-button>
            <el-button size="small" type="warning" @click="showDepartmentDialog(row)" :icon="OfficeBuilding">
              部门
            </el-button>
            <el-button 
              size="small" 
              type="danger" 
              @click="deleteRole(row)"
              :icon="Delete"
            >
              删除
            </el-button>
          </div>
        </template>
      </el-table-column>
      </el-table>
      
      <!-- 分页 -->
      <div class="pagination-wrapper">
        <el-pagination
          :current-page="pagination.page"
          :page-size="pagination.size"
          :page-sizes="[10, 20, 50, 100]"
          :total="pagination.total"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="handleSizeChange"
          @current-change="handleCurrentChange"
        />
      </div>
    </el-card>

    <!-- 新增/编辑角色对话框 -->
    <el-dialog
      :title="dialogTitle"
      v-model="dialogVisible"
      width="600px"
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
            <el-form-item label="角色名称" prop="Name">
              <el-input v-model="formData.Name" placeholder="请输入角色名称" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="角色编码" prop="Code">
              <el-input v-model="formData.Code" placeholder="请输入角色编码" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-form-item label="角色描述" prop="Description">
          <el-input
            v-model="formData.Description"
            type="textarea"
            :rows="3"
            placeholder="请输入角色描述"
          />
        </el-form-item>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="排序" prop="SortOrder">
              <el-input-number v-model="formData.SortOrder" :min="0" :max="9999" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
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

    <!-- 权限分配对话框 -->
    <el-dialog
      title="权限分配"
      v-model="permissionDialogVisible"
      width="800px"
      :before-close="handlePermissionDialogClose"
      :append-to-body="true"
      :lock-scroll="false"
    >
      <div class="permission-header">
        <h4>为角色 "{{ currentRole?.Name }}" 分配菜单权限</h4>
        <div class="permission-actions">
          <el-button size="small" @click="expandAllMenus">展开全部</el-button>
          <el-button size="small" @click="collapseAllMenus">收起全部</el-button>
          <el-button size="small" @click="checkAllMenus">全选</el-button>
          <el-button size="small" @click="uncheckAllMenus">取消全选</el-button>
        </div>
      </div>
      <el-tree
        ref="menuTreeRef"
        :data="menuTree"
        :props="{ children: 'children', label: 'Name' }"
        node-key="ID"
        show-checkbox
        :default-checked-keys="selectedMenuIds"
        @check="handleMenuCheck"
        class="menu-tree"
      >
        <template #default="{ data }">
          <div class="menu-node">
            <el-icon v-if="data.Icon" class="menu-icon">
              <component :is="data.Icon" />
            </el-icon>
            <span>{{ data.Name }}</span>
            <el-tag v-if="data.Type" size="small" class="menu-type-tag">
              {{ getMenuTypeText(data.Type) }}
            </el-tag>
          </div>
        </template>
      </el-tree>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="handlePermissionDialogClose">取消</el-button>
          <el-button type="primary" @click="savePermissions" :loading="permissionSubmitting">
            保存权限
          </el-button>
        </span>
      </template>
    </el-dialog>

    <!-- 部门分配对话框 -->
    <el-dialog
      title="部门分配"
      v-model="departmentDialogVisible"
      width="600px"
      :before-close="handleDepartmentDialogClose"
      :append-to-body="true"
      :lock-scroll="false"
    >
      <div class="department-header">
        <h4>为角色 "{{ currentRole?.Name }}" 分配部门权限</h4>
        <div class="department-actions">
          <el-button size="small" @click="expandAllDepartments">展开全部</el-button>
          <el-button size="small" @click="collapseAllDepartments">收起全部</el-button>
          <el-button size="small" @click="checkAllDepartments">全选</el-button>
          <el-button size="small" @click="uncheckAllDepartments">取消全选</el-button>
        </div>
      </div>
      <el-tree
        ref="departmentTreeRef"
        :data="departmentTree"
        :props="{ children: 'children', label: 'Name' }"
        node-key="ID"
        show-checkbox
        check-strictly
        :default-checked-keys="selectedDepartmentIds"
        class="department-tree"
      >
        <template #default="{ data }">
          <div class="department-node">
            <el-icon class="department-icon">
              <OfficeBuilding v-if="data.DeptType === 'company'" />
              <Grid v-else />
            </el-icon>
            <span>{{ data.Name }}</span>
            <el-tag :type="data.DeptType === 'company' ? 'danger' : 'primary'" size="small">
              {{ data.DeptType === 'company' ? '公司' : '部门' }}
            </el-tag>
          </div>
        </template>
      </el-tree>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="handleDepartmentDialogClose">取消</el-button>
          <el-button type="primary" @click="saveDepartments" :loading="departmentSubmitting">
            保存部门
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
  Search,
  Key,
  OfficeBuilding,
  Grid,
  UserFilled
} from '@element-plus/icons-vue'
import axios from 'axios'

// 响应式数据
const loading = ref(false)
const submitting = ref(false)
const permissionSubmitting = ref(false)
const departmentSubmitting = ref(false)
const dialogVisible = ref(false)
const permissionDialogVisible = ref(false)
const departmentDialogVisible = ref(false)
const formRef = ref()
const menuTreeRef = ref()
const departmentTreeRef = ref()
const roleList = ref([])
const menuList = ref([])
const departmentList = ref([])
const isEdit = ref(false)
const currentEditId = ref(null)
const currentRole = ref(null)
const selectedMenuIds = ref([])
const selectedDepartmentIds = ref([])

// 搜索表单
const searchForm = reactive({
  keyword: '',
  status: null
})

// 分页数据
const pagination = reactive({
  page: 1,
  size: 20,
  total: 0
})

// 计算属性
const total = computed(() => pagination.total)

// 表单数据
const formData = reactive({
  Name: '',
  Code: '',
  Description: '',
  SortOrder: 0,
  Status: true
})

// 表单验证规则
const formRules = {
  Name: [
    { required: true, message: '请输入角色名称', trigger: 'blur' },
    { min: 2, max: 50, message: '角色名称长度在 2 到 50 个字符', trigger: 'blur' }
  ],
  Code: [
    { required: true, message: '请输入角色编码', trigger: 'blur' },
    { min: 2, max: 20, message: '角色编码长度在 2 到 20 个字符', trigger: 'blur' }
  ]
}

// 计算属性
const dialogTitle = computed(() => {
  return isEdit.value ? '编辑角色' : '新增角色'
})

// 菜单树
const menuTree = computed(() => {
  return buildTree(menuList.value)
})

// 部门树
const departmentTree = computed(() => {
  return buildTree(departmentList.value)
})

// 工具函数
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

function formatDate(dateString) {
  if (!dateString) return ''
  return new Date(dateString).toLocaleString('zh-CN')
}

function getMenuTypeText(type) {
  const typeMap = {
    menu: '菜单',
    button: '按钮',
    api: '接口'
  }
  return typeMap[type] || type
}

// 获取角色列表
const fetchRoles = async () => {
  try {
    loading.value = true
    const params = {
      page: pagination.page,
      size: pagination.size,
      ...searchForm
    }
    const response = await axios.get('/api/roles', { params })
    const data = response.data.data || {}
    roleList.value = data.list || []
    pagination.total = data.total || 0
  } catch (error) {
    console.error('获取角色列表失败:', error)
    ElMessage.error('获取角色列表失败')
  } finally {
    loading.value = false
  }
}

// 获取菜单列表
const fetchMenus = async () => {
  try {
    const response = await axios.get('/api/menus')
    // 修复：从分页数据结构中提取list数组
    const data = response.data.data || {}
    menuList.value = data.list || []
  } catch (error) {
    console.error('获取菜单列表失败:', error)
  }
}

// 获取部门列表
const fetchDepartments = async () => {
  try {
    const response = await axios.get('/api/departments')
    departmentList.value = response.data.data || []
  } catch (error) {
    console.error('获取部门列表失败:', error)
  }
}

// 搜索
const handleSearch = () => {
  pagination.page = 1
  fetchRoles()
}

// 重置搜索
const resetSearch = () => {
  Object.assign(searchForm, {
    keyword: '',
    status: null
  })
  handleSearch()
}

// 分页处理
const handleSizeChange = (size) => {
  pagination.size = size
  pagination.page = 1
  fetchRoles()
}

const handleCurrentChange = (page) => {
  pagination.page = page
  fetchRoles()
}

// 显示新增对话框
const showAddDialog = () => {
  isEdit.value = false
  currentEditId.value = null
  resetForm()
  dialogVisible.value = true
}

// 显示编辑对话框
const showEditDialog = (role) => {
  isEdit.value = true
  currentEditId.value = role.ID
  Object.assign(formData, {
    Name: role.Name,
    Code: role.Code,
    Description: role.Description || '',
    SortOrder: role.SortOrder || 0,
    Status: role.Status !== false
  })
  dialogVisible.value = true
}

// 显示权限分配对话框
const showPermissionDialog = async (role) => {
  currentRole.value = role
  try {
    const response = await axios.get(`/api/roles/${role.ID}/menus`)
    selectedMenuIds.value = response.data.data || []
  } catch (error) {
    console.error('获取角色权限失败:', error)
    selectedMenuIds.value = []
  }
  permissionDialogVisible.value = true
}

// 显示部门分配对话框
const showDepartmentDialog = async (role) => {
  currentRole.value = role
  try {
    const response = await axios.get(`/api/roles/${role.ID}/departments`)
    selectedDepartmentIds.value = response.data.data || []
  } catch (error) {
    console.error('获取角色部门失败:', error)
    selectedDepartmentIds.value = []
  }
  departmentDialogVisible.value = true
}

// 重置表单
const resetForm = () => {
  Object.assign(formData, {
    Name: '',
    Code: '',
    Description: '',
    SortOrder: 0,
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
    
    const url = isEdit.value ? `/api/roles/${currentEditId.value}` : '/api/roles'
    const method = isEdit.value ? 'put' : 'post'
    
    await axios[method](url, formData)
    
    ElMessage.success(isEdit.value ? '更新成功' : '创建成功')
    dialogVisible.value = false
    await fetchRoles()
  } catch (error) {
    console.error('提交失败:', error)
    ElMessage.error(error.response?.data?.message || '操作失败')
  } finally {
    submitting.value = false
  }
}

// 保存权限
// 处理菜单选择事件
const handleMenuCheck = (data, checked) => {
  // 移除check-strictly后，Element Plus会自动处理父子节点关联
  // 这里可以添加额外的业务逻辑，比如记录操作日志等
}

const savePermissions = async () => {
  if (!currentRole.value || !menuTreeRef.value) return
  
  try {
    permissionSubmitting.value = true
    // 获取完全选中的节点和半选中的节点
    const checkedKeys = menuTreeRef.value.getCheckedKeys()
    const halfCheckedKeys = menuTreeRef.value.getHalfCheckedKeys()
    
    // 合并完全选中和半选中的节点ID
    const allSelectedKeys = [...checkedKeys, ...halfCheckedKeys]
    
    await axios.post(`/api/roles/${currentRole.value.ID}/menus`, {
      menuIds: allSelectedKeys
    })
    
    ElMessage.success('权限保存成功')
    permissionDialogVisible.value = false
  } catch (error) {
    console.error('保存权限失败:', error)
    ElMessage.error(error.response?.data?.message || '保存权限失败')
  } finally {
    permissionSubmitting.value = false
  }
}

// 保存部门
const saveDepartments = async () => {
  if (!currentRole.value || !departmentTreeRef.value) return
  
  try {
    departmentSubmitting.value = true
    const checkedKeys = departmentTreeRef.value.getCheckedKeys()
    
    await axios.post(`/api/roles/${currentRole.value.ID}/departments`, {
      departmentIds: checkedKeys
    })
    
    ElMessage.success('部门保存成功')
    departmentDialogVisible.value = false
  } catch (error) {
    console.error('保存部门失败:', error)
    ElMessage.error(error.response?.data?.message || '保存部门失败')
  } finally {
    departmentSubmitting.value = false
  }
}

// 删除角色
const deleteRole = async (role) => {
  try {
    await ElMessageBox.confirm(
      `确定要删除角色 "${role.Name}" 吗？`,
      '确认删除',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning',
        appendTo: 'body',
        lockScroll: false
      }
    )
    
    await axios.delete(`/api/roles/${role.ID}`)
    ElMessage.success('删除成功')
    await fetchRoles()
  } catch (error) {
    if (error !== 'cancel') {
      console.error('删除失败:', error)
      ElMessage.error(error.response?.data?.message || '删除失败')
    }
  }
}

// 菜单树操作
const expandAllMenus = () => {
  if (menuTreeRef.value) {
    menuTreeRef.value.store.nodesMap.forEach(node => {
      node.expanded = true
    })
  }
}

const collapseAllMenus = () => {
  if (menuTreeRef.value) {
    menuTreeRef.value.store.nodesMap.forEach(node => {
      node.expanded = false
    })
  }
}

const checkAllMenus = () => {
  if (menuTreeRef.value) {
    const allKeys = menuList.value.map(menu => menu.ID)
    menuTreeRef.value.setCheckedKeys(allKeys)
  }
}

const uncheckAllMenus = () => {
  if (menuTreeRef.value) {
    menuTreeRef.value.setCheckedKeys([])
  }
}

// 部门树操作
const expandAllDepartments = () => {
  if (departmentTreeRef.value) {
    departmentTreeRef.value.store.nodesMap.forEach(node => {
      node.expanded = true
    })
  }
}

const collapseAllDepartments = () => {
  if (departmentTreeRef.value) {
    departmentTreeRef.value.store.nodesMap.forEach(node => {
      node.expanded = false
    })
  }
}

const checkAllDepartments = () => {
  if (departmentTreeRef.value) {
    const allKeys = departmentList.value.map(dept => dept.ID)
    departmentTreeRef.value.setCheckedKeys(allKeys)
  }
}

const uncheckAllDepartments = () => {
  if (departmentTreeRef.value) {
    departmentTreeRef.value.setCheckedKeys([])
  }
}

// 刷新数据
const refreshData = () => {
  fetchRoles()
}

// 关闭对话框
const handleDialogClose = () => {
  dialogVisible.value = false
  resetForm()
}

const handlePermissionDialogClose = () => {
  permissionDialogVisible.value = false
  currentRole.value = null
  selectedMenuIds.value = []
}

const handleDepartmentDialogClose = () => {
  departmentDialogVisible.value = false
  currentRole.value = null
  selectedDepartmentIds.value = []
}

// 组件挂载时获取数据
onMounted(async () => {
  await Promise.all([
    fetchRoles(),
    fetchMenus(),
    fetchDepartments()
  ])
})
</script>

<style scoped>
.role-management {
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
  justify-content: space-between;
  align-items: flex-start;
  flex-wrap: wrap;
  gap: 15px;
}

.search-section {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
}

.action-section {
  display: flex;
  gap: 10px;
}

.table-card {
  border-radius: 8px;
  border: 1px solid #e4e7ed;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
}

.pagination-wrapper {
  margin-top: 20px;
  text-align: right;
  padding-top: 20px;
  border-top: 1px solid #ebeef5;
}

.dialog-footer {
  text-align: right;
}

.dialog-footer .el-button {
  margin-left: 10px;
}

.permission-header,
.department-header {
  margin-bottom: 20px;
  padding-bottom: 10px;
  border-bottom: 1px solid #ebeef5;
}

.permission-header h4,
.department-header h4 {
  margin: 0 0 10px 0;
  color: #303133;
}

.permission-actions,
.department-actions {
  display: flex;
  gap: 10px;
}

.menu-tree,
.department-tree {
  max-height: 400px;
  overflow-y: auto;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  padding: 10px;
  background: #fafafa;
}

.menu-node,
.department-node {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 0;
  transition: all 0.3s ease;
}

.menu-node:hover,
.department-node:hover {
  background: rgba(64, 158, 255, 0.1);
  border-radius: 4px;
  padding: 4px 8px;
}

.menu-icon,
.department-icon {
  color: #409EFF;
  font-size: 16px;
}

.menu-type-tag {
  margin-left: auto;
}

/* 表格标题样式 */
.table-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0;
}

.table-title {
  display: flex;
  align-items: center;
  font-size: 16px;
  font-weight: 600;
  color: #303133;
}

.title-icon {
  margin-right: 8px;
  color: #409eff;
  font-size: 18px;
}

.table-info {
  display: flex;
  align-items: center;
}

.total-count {
  font-size: 14px;
  color: #909399;
  background: #f5f7fa;
  padding: 4px 12px;
  border-radius: 12px;
}

/* Element Plus 组件样式覆盖 */
:deep(.el-button) {
  border-radius: 6px;
  font-weight: 500;
  transition: all 0.3s ease;
}

:deep(.el-button:hover) {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(64, 158, 255, 0.3);
}

:deep(.el-input) {
  border-radius: 6px;
}

:deep(.el-input__wrapper) {
  border-radius: 6px;
  transition: all 0.3s ease;
}

:deep(.el-input__wrapper:hover) {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

:deep(.el-select) {
  border-radius: 6px;
}

:deep(.el-dialog) {
  border-radius: 12px;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.15);
}

:deep(.el-dialog__header) {
  padding: 24px 24px 16px;
  border-bottom: 1px solid #f0f0f0;
}

:deep(.el-dialog__body) {
  padding: 24px;
}

:deep(.el-dialog__footer) {
  padding: 16px 24px 24px;
  border-top: 1px solid #f0f0f0;
}

:deep(.el-table) {
  border-radius: 8px;
  overflow: hidden;
}

:deep(.el-table .el-table__cell) {
  padding: 12px 0;
  border-bottom: 1px solid #f5f7fa;
}

:deep(.el-table__header) {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

:deep(.el-table__header th) {
  background: transparent;
  color: white;
  font-weight: 600;
}

:deep(.el-table__row:hover) {
  background: rgba(64, 158, 255, 0.05);
}

:deep(.el-card) {
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  border: none;
}

:deep(.el-card__body) {
  padding: 24px;
}

:deep(.el-form-item) {
  margin-bottom: 20px;
}

:deep(.el-form-item__label) {
  font-weight: 500;
  color: #303133;
}

:deep(.el-tree-node__content) {
  height: 36px;
  border-radius: 4px;
  margin: 2px 0;
  transition: all 0.3s ease;
}

:deep(.el-tree-node__content:hover) {
  background: rgba(64, 158, 255, 0.1);
}

:deep(.el-tag) {
  border-radius: 12px;
  font-weight: 500;
}

:deep(.el-pagination) {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 8px;
}

:deep(.el-pagination .btn-next),
:deep(.el-pagination .btn-prev) {
  border-radius: 6px;
}

:deep(.el-pager li) {
  border-radius: 6px;
  margin: 0 2px;
}

/* 动画效果 */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
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

/* 响应式布局 */
@media (max-width: 768px) {
  .role-management {
    padding: 10px;
  }
  
  .toolbar {
    flex-direction: column;
    align-items: stretch;
  }
  
  .search-section {
    justify-content: flex-start;
    margin-bottom: 10px;
  }
  
  .action-section {
    justify-content: flex-end;
  }
  
  .permission-actions,
  .department-actions {
    flex-wrap: wrap;
  }
  
  .pagination-wrapper {
    text-align: center;
  }
  
  :deep(.el-dialog) {
    width: 95% !important;
    margin: 5vh auto;
  }
  
  :deep(.el-table__body-wrapper) {
    overflow-x: auto;
  }
}
</style>