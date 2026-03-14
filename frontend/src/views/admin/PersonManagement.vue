<template>
  <div class="person-management">
    <!-- 页面头部 -->
    <div class="page-header">
      <h2>
        <el-icon><User /></el-icon>
        人员管理
      </h2>
      <p class="page-subtitle">管理公司人员信息，设置人员有效性状态</p>
    </div>

    <!-- 左右布局 -->
    <div class="main-layout">
      <!-- 左侧：部门导航 -->
      <div class="left-panel">
        <el-card shadow="never" class="dept-card">
          <template #header>
            <div class="dept-card-header">
              <span>部门列表</span>
              <el-tag size="small" type="info">{{ flatDepartments.length }}</el-tag>
            </div>
          </template>
          <div class="dept-list">
            <!-- 全部部门 -->
            <div
              class="dept-item-all"
              :class="{ active: selectedDeptId === null }"
              @click="selectDepartment(null)"
            >
              <el-icon><Grid /></el-icon>
              <span>全部部门</span>
            </div>
            <!-- 多级部门树 -->
            <el-tree
              ref="deptTreeRef"
              :data="departments"
              :props="treeProps"
              node-key="ID"
              highlight-current
              :expand-on-click-node="false"
              :default-expanded-keys="defaultExpandedKeys"
              accordion
              :indent="18"
              :current-node-key="selectedDeptId"
              @node-click="handleTreeNodeClick"
              class="dept-tree"
            >
              <template #default="{ node, data }">
                <span class="dept-tree-node">
                  <el-icon :class="'dept-type-' + (data.DeptType || 'department')">
                    <component :is="deptTypeIcons[data.DeptType] || OfficeBuilding" />
                  </el-icon>
                  <span class="dept-tree-label">{{ node.label }}</span>
                  <span :class="['dept-person-count', { 'count-zero': data.PersonCount === 0 }]">({{ data.PersonCount || 0 }})</span>
                </span>
              </template>
            </el-tree>
          </div>
        </el-card>
      </div>

      <!-- 右侧：人员列表 -->
      <div class="right-panel">
        <!-- 操作栏 -->
        <el-card class="operation-card" shadow="never">
          <div class="operation-bar">
            <div class="left-actions">
              <el-button type="primary" @click="openAddDialog" :icon="Plus" :disabled="!hasPermission('sys:person:add')">
                新增人员
              </el-button>
              <el-switch
                v-model="includeInactive"
                @change="loadPersonList"
                active-text="显示离职"
                inactive-text="仅在职"
                style="margin-left: 10px;"
              />
            </div>
            <div class="right-actions">
              <el-input
                v-model="searchKeyword"
                placeholder="搜索姓名或部门"
                style="width: 200px; margin-right: 10px;"
                clearable
                @keyup.enter="loadPersonList"
                @clear="loadPersonList"
              >
                <template #prefix>
                  <el-icon><Search /></el-icon>
                </template>
              </el-input>
              <el-button @click="loadPersonList" :icon="Search">搜索</el-button>
              <el-button @click="resetSearch" :icon="Refresh">重置</el-button>
            </div>
          </div>
        </el-card>

        <!-- 人员列表 -->
        <el-card class="table-card" shadow="never">
          <el-table
            v-loading="loading"
            :data="personList"
            stripe
            border
          >
            <el-table-column prop="Name" label="姓名" width="120" />
            <el-table-column prop="DepartmentName" label="部门" width="120" />
            <el-table-column prop="IsActive" label="状态" width="80" align="center">
              <template #default="{ row }">
                <el-tag :type="row.IsActive ? 'success' : 'danger'" size="small">
                  {{ row.IsActive ? '在职' : '离职' }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column label="操作" min-width="240" fixed="right">
              <template #default="{ row }">
                <el-button
                  type="primary"
                  size="small"
                  @click="editPerson(row)"
                  :icon="Edit"
                  :disabled="!hasPermission('sys:person:edit')"
                >
                  编辑
                </el-button>
                <el-button
                  :type="row.IsActive ? 'warning' : 'success'"
                  size="small"
                  @click="togglePersonStatus(row)"
                  :icon="Switch"
                  :disabled="!hasPermission('sys:person:edit')"
                >
                  {{ row.IsActive ? '设为离职' : '设为在职' }}
                </el-button>
                <el-button
                  type="danger"
                  size="small"
                  @click="deletePerson(row)"
                  :icon="Delete"
                  :disabled="!hasPermission('sys:person:delete')"
                >
                  删除
                </el-button>
              </template>
            </el-table-column>
          </el-table>

          <!-- 分页 -->
          <div class="pagination-wrapper">
            <el-pagination
              v-model:current-page="pagination.current"
              v-model:page-size="pagination.pageSize"
              :page-sizes="[10, 20, 50, 100]"
              :total="pagination.total"
              layout="total, sizes, prev, pager, next, jumper"
              @size-change="handleSizeChange"
              @current-change="handleCurrentChange"
            />
          </div>
        </el-card>
      </div>
    </div>

    <!-- 新增/编辑人员对话框 -->
    <el-dialog
      :title="isEdit ? '编辑人员' : '新增人员'"
      v-model="showAddDialog"
      width="500px"
      @close="resetForm"
      :close-on-click-modal="false"
    >
      <el-form
        ref="formRef"
        :model="formData"
        :rules="formRules"
        label-width="80px"
      >
        <el-form-item label="姓名" prop="name">
          <el-input v-model="formData.name" placeholder="请输入人员姓名" />
        </el-form-item>
        <el-form-item label="部门" prop="departmentIds">
          <el-tree-select
            v-model="formData.departmentIds"
            :data="departments"
            :props="{ label: 'Name', value: 'ID', children: 'children' }"
            placeholder="请选择部门（可多选）"
            style="width: 100%"
            clearable
            multiple
            check-strictly
            :render-after-expand="false"
          />
          <div class="form-tip">第一个选中的部门为主部门，其他为兼职部门</div>
        </el-form-item>
        <el-form-item label="状态" prop="isActive">
          <el-radio-group v-model="formData.isActive">
            <el-radio :value="true">在职</el-radio>
            <el-radio :value="false">离职</el-radio>
          </el-radio-group>
        </el-form-item>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="showAddDialog = false">取消</el-button>
          <el-button type="primary" @click="submitForm" :loading="submitting">
            {{ isEdit ? '更新' : '创建' }}
          </el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { User, Plus, Search, Refresh, Edit, Switch, Delete, Grid, OfficeBuilding, House, Files } from '@element-plus/icons-vue'
import axios from 'axios'
import { useUserStore } from '@/store/user'

const userStore = useUserStore()
const hasPermission = (permission) => userStore.hasPermission(permission)

// 部门类型图标映射
const deptTypeIcons = {
  company: OfficeBuilding,
  department: House,
  workshop: Grid,
  team: Files
}

// 响应式数据
const loading = ref(false)
const submitting = ref(false)
const showAddDialog = ref(false)
const isEdit = ref(false)
const searchKeyword = ref('')
const includeInactive = ref(false)
const personList = ref([])
const departments = ref([])
const flatDepartments = ref([])
const selectedDeptId = ref(null)
const deptTreeRef = ref()
const defaultExpandedKeys = ref([]) // 默认展开的节点key

// 树形配置
const treeProps = {
  label: 'Name',
  children: 'children'
}

// 分页数据
const pagination = reactive({
  current: 1,
  pageSize: 10,
  total: 0
})

// 表单数据
const formData = reactive({
  id: null,
  name: '',
  departmentIds: [],  // 改为数组，支持多部门
  isActive: true
})

// 表单验证规则
const formRules = {
  name: [
    { required: true, message: '请输入人员姓名', trigger: 'blur' },
    { min: 2, max: 50, message: '姓名长度在 2 到 50 个字符', trigger: 'blur' }
  ]
}

const formRef = ref()

// 获取Token
const getToken = () => {
  return localStorage.getItem('token')
}

// 获取请求头
const getHeaders = () => {
  return {
    Authorization: `Bearer ${getToken()}`
  }
}

// 选择部门筛选（全部部门）
const selectDepartment = (deptId) => {
  selectedDeptId.value = deptId
  // 清除树的高亮
  if (deptTreeRef.value) {
    deptTreeRef.value.setCurrentKey(null)
  }
  pagination.current = 1
  loadPersonList()
}

// 树节点点击
const handleTreeNodeClick = (data) => {
  selectedDeptId.value = data.ID
  pagination.current = 1
  loadPersonList()
}

// 加载人员列表
const loadPersonList = async () => {
  loading.value = true
  try {
    const params = {
      page: pagination.current,
      pageSize: pagination.pageSize,
      search: searchKeyword.value,
      includeInactive: includeInactive.value
    }
    if (selectedDeptId.value !== null) {
      params.departmentId = selectedDeptId.value
    }
    const response = await axios.get('/person/list', {
      params,
      headers: getHeaders()
    })
    
    if (response.data.success) {
      personList.value = response.data.data
      pagination.total = response.data.pagination.total
    } else {
      ElMessage.error('加载人员列表失败')
    }
  } catch (error) {
    console.error('加载人员列表失败:', error)
    ElMessage.error('加载人员列表失败')
  } finally {
    loading.value = false
  }
}

// 加载部门列表
const loadDepartments = async () => {
  try {
    const response = await axios.get('/person/departments', {
      headers: getHeaders()
    })
    
    if (response.data.success) {
      departments.value = response.data.data
      flatDepartments.value = response.data.flatData || []
      // 默认展开第一个顶级节点（通常是公司）
      if (departments.value.length > 0) {
        defaultExpandedKeys.value = [departments.value[0].ID]
      }
    }
  } catch (error) {
    console.error('加载部门列表失败:', error)
  }
}

// 重置搜索
const resetSearch = () => {
  searchKeyword.value = ''
  includeInactive.value = false
  selectedDeptId.value = null
  if (deptTreeRef.value) {
    deptTreeRef.value.setCurrentKey(null)
  }
  pagination.current = 1
  loadPersonList()
}

// 编辑人员
const editPerson = (row) => {
  isEdit.value = true
  formData.id = row.ID
  formData.name = row.Name
  formData.departmentIds = row.DepartmentIds || (row.DepartmentID ? [row.DepartmentID] : [])
  formData.isActive = row.IsActive
  showAddDialog.value = true
}

// 新增人员（先重置表单再打开对话框）
const openAddDialog = () => {
  resetForm()
  showAddDialog.value = true
}

// 切换人员状态
const togglePersonStatus = async (row) => {
  const action = row.IsActive ? '设为离职' : '设为在职'
  
  try {
    await ElMessageBox.confirm(
      `确定要将 ${row.Name} ${action}吗？`,
      '确认操作',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    
    const response = await axios.post(
      `/person/${row.ID}/toggle-status`,
      {},
      { headers: getHeaders() }
    )
    
    if (response.data.success) {
      ElMessage.success(response.data.message)
      loadPersonList()
    } else {
      ElMessage.error(response.data.error || '操作失败')
    }
  } catch (error) {
    if (error !== 'cancel') {
      console.error('切换人员状态失败:', error)
      ElMessage.error('操作失败')
    }
  }
}

// 删除人员
const deletePerson = async (row) => {
  try {
    await ElMessageBox.confirm(
      `确定要删除人员 ${row.Name} 吗？此操作不可恢复！`,
      '确认删除',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    
    const response = await axios.delete(`/person/${row.ID}`, {
      headers: getHeaders()
    })
    
    if (response.data.success) {
      ElMessage.success('删除成功')
      loadPersonList()
      loadDepartments()  // 刷新部门人数
    } else {
      ElMessage.warning(response.data.error || '删除失败')
    }
  } catch (error) {
    if (error !== 'cancel' && error !== 'close') {
      const msg = error.response?.data?.error || error.response?.data?.message || '删除失败'
      // 400是业务错误（如存在关联数据），用warning；500是系统异常
      if (error.response?.status === 400) {
        ElMessage.warning(msg)
      } else {
        console.error('删除人员失败:', error)
        ElMessage.error(msg)
      }
    }
  }
}

// 提交表单
const submitForm = async () => {
  if (!formRef.value) return
  
  try {
    await formRef.value.validate()
    
    submitting.value = true
    
    const url = isEdit.value ? `/person/${formData.id}` : '/person'
    const method = isEdit.value ? 'put' : 'post'
    
    const response = await axios[method](url, {
      name: formData.name.trim(),
      departmentIds: formData.departmentIds,
      isActive: formData.isActive
    }, {
      headers: getHeaders()
    })
    
    if (response.data.success) {
      ElMessage.success(response.data.message)
      showAddDialog.value = false
      loadPersonList()
      loadDepartments()  // 刷新部门人数
    } else {
      ElMessage.warning(response.data.error || '操作失败')
    }
  } catch (error) {
    const msg = error.response?.data?.error || error.response?.data?.message || '操作失败'
    // 400是业务错误（如重名），用warning提示；500是系统异常，输出到控制台
    if (error.response?.status === 400) {
      ElMessage.warning(msg)
    } else {
      console.error('提交表单失败:', error)
      ElMessage.error(msg)
    }
  } finally {
    submitting.value = false
  }
}

// 重置表单
const resetForm = () => {
  isEdit.value = false
  formData.id = null
  formData.name = ''
  formData.departmentIds = []
  formData.isActive = true
  
  if (formRef.value) {
    formRef.value.resetFields()
  }
}

// 分页处理
const handleSizeChange = (size) => {
  pagination.pageSize = size
  pagination.current = 1
  loadPersonList()
}

const handleCurrentChange = (page) => {
  pagination.current = page
  loadPersonList()
}

// 组件挂载时加载数据
onMounted(() => {
  loadPersonList()
  loadDepartments()
})
</script>

<style scoped>
.person-management {
  padding: 0.5rem 1.25rem;
  box-sizing: border-box;
}

.page-header {
  margin-bottom: 16px;
}

.page-header h2 {
  margin: 0 0 8px 0;
  color: #303133;
  display: flex;
  align-items: center;
  gap: 8px;
}

.page-subtitle {
  margin: 0;
  color: #909399;
  font-size: 14px;
}

/* 左右布局 */
.main-layout {
  display: flex;
  gap: 16px;
}

.left-panel {
  width: 220px;
  flex-shrink: 0;
}

.right-panel {
  flex: 1;
  min-width: 0;
}

/* 部门卡片 */
.dept-card {
  border-radius: 8px;
  position: sticky;
  top: 16px;
  max-height: calc(100vh - 32px);
  display: flex;
  flex-direction: column;
}

.dept-card :deep(.el-card__header) {
  padding: 12px 16px;
  border-bottom: 1px solid #ebeef5;
  flex-shrink: 0;
}

.dept-card :deep(.el-card__body) {
  padding: 8px 0;
  overflow: hidden;
  flex: 1;
  min-height: 0;
}

.dept-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-weight: 600;
  font-size: 14px;
  color: #303133;
}

.dept-list {
  max-height: 100%;
  overflow-y: auto;
}

/* 全部部门按钮 */
.dept-item-all {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  cursor: pointer;
  font-size: 13px;
  color: #606266;
  transition: all 0.2s;
  border-left: 3px solid transparent;
  margin-bottom: 4px;
}

.dept-item-all:hover {
  background-color: #f5f7fa;
  color: #409eff;
}

.dept-item-all.active {
  background-color: #ecf5ff;
  color: #409eff;
  font-weight: 600;
  border-left-color: #409eff;
}

.dept-item-all .el-icon {
  font-size: 16px;
  flex-shrink: 0;
}

/* 部门树样式 */
.dept-tree {
  background: transparent;
  --el-tree-node-hover-bg-color: #f5f7fa;
}

.dept-tree :deep(.el-tree-node__content) {
  height: 34px;
  border-left: 3px solid transparent;
  transition: all 0.2s;
}

.dept-tree :deep(.el-tree-node.is-current > .el-tree-node__content) {
  background-color: #ecf5ff;
  color: #409eff;
  font-weight: 600;
  border-left-color: #409eff;
}

.dept-tree :deep(.el-tree-node__expand-icon) {
  font-size: 14px;
  color: #909399;
  padding: 4px;
}

.dept-tree :deep(.el-tree-node__expand-icon.is-leaf) {
  color: transparent;
}

.dept-tree-node {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  overflow: hidden;
}

.dept-tree-node .el-icon {
  font-size: 15px;
  flex-shrink: 0;
}

/* 部门类型图标颜色 */
.dept-type-company { color: #E6A23C; }
.dept-type-department { color: #409EFF; }
.dept-type-workshop { color: #E6A23C; }
.dept-type-team { color: #67C23A; }

.dept-tree :deep(.el-tree-node.is-current > .el-tree-node__content) .dept-tree-node .el-icon {
  color: #409eff;
}

.dept-tree-label {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.dept-person-count {
  color: #F56C6C;
  font-size: 12px;
  margin-left: 4px;
  flex-shrink: 0;
}

.dept-person-count.count-zero {
  color: #C0C4CC;
}

.form-tip {
  font-size: 12px;
  color: #909399;
  margin-top: 4px;
}

/* 操作栏 */
.operation-card {
  margin-bottom: 12px;
  border-radius: 8px;
}

.operation-card :deep(.el-card__body) {
  padding: 10px 16px;
}

.operation-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.left-actions {
  display: flex;
  align-items: center;
}

.right-actions {
  display: flex;
  align-items: center;
}

/* 表格卡片 */
.table-card {
  border-radius: 8px;
}

.table-card :deep(.el-card__body) {
  padding: 16px;
}

.pagination-wrapper {
  margin-top: 12px;
  padding-top: 12px;
  display: flex;
  justify-content: center;
  border-top: 1px solid #f0f0f0;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}
</style>
