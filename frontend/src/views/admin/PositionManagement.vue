<template>
  <div class="position-management">
    <!-- 页面标题 -->
    <div class="page-header">
      <h2>岗位管理</h2>
      <p>管理系统中的岗位信息</p>
    </div>

    <!-- 搜索和操作工具栏 -->
    <el-card class="toolbar-card" shadow="never">
      <div class="toolbar">
        <div class="search-section">
          <el-input
            v-model="searchForm.keyword"
            placeholder="搜索岗位名称或编码"
            style="width: 300px; margin-right: 10px"
            clearable
            @keyup.enter="handleSearch"
          >
            <template #prefix>
              <el-icon><Search /></el-icon>
            </template>
          </el-input>
          <el-select
            v-model="searchForm.departmentId"
            placeholder="选择部门"
            style="width: 200px; margin-right: 10px"
            clearable
          >
            <el-option
              v-for="dept in departmentOptions"
              :key="dept.ID"
              :label="dept.Name"
              :value="dept.ID"
            />
          </el-select>
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
            新增岗位
          </el-button>
          <el-button @click="refreshData" :icon="Refresh">
            刷新
          </el-button>
        </div>
      </div>
    </el-card>

    <!-- 岗位列表表格 -->
    <el-card class="table-card" shadow="never">
      <el-table
        :data="positionList"
        style="width: 100%"
        v-loading="loading"
        stripe
        border
        resizable
        :header-cell-style="{ background: '#f8f9fa', color: '#606266' }"
      >
      <el-table-column label="#" type="index" width="60" fixed="left" />
      <el-table-column prop="Name" label="岗位名称" min-width="150" resizable show-overflow-tooltip />
      <el-table-column prop="Code" label="岗位编码" min-width="120" resizable show-overflow-tooltip />
      <el-table-column prop="DepartmentName" label="所属部门" min-width="150" resizable show-overflow-tooltip />
      <el-table-column prop="Level" label="岗位级别" width="100" resizable>
        <template #default="{ row }">
          <el-tag :type="getLevelTagType(row.Level)" size="small">
            {{ getLevelText(row.Level) }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="Description" label="岗位描述" min-width="200" resizable show-overflow-tooltip />
      <el-table-column prop="Requirements" label="任职要求" min-width="200" resizable show-overflow-tooltip />
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
      <el-table-column label="操作" width="180" fixed="right">
        <template #default="{ row }">
          <div class="action-buttons">
            <el-button size="small" @click="showEditDialog(row)" :icon="Edit">
              编辑
            </el-button>
            <el-button 
              size="small" 
              type="danger" 
              @click="deletePosition(row)"
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
          v-model:current-page="pagination.page"
          v-model:page-size="pagination.size"
          :page-sizes="[10, 20, 50, 100]"
          :total="pagination.total"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="handleSizeChange"
          @current-change="handleCurrentChange"
        />
      </div>
    </el-card>

    <!-- 新增/编辑岗位对话框 -->
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
            <el-form-item label="岗位名称" prop="Name">
              <el-input v-model="formData.Name" placeholder="请输入岗位名称" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="岗位编码" prop="Code">
              <el-input v-model="formData.Code" placeholder="请输入岗位编码" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="所属部门" prop="DepartmentID">
              <el-tree-select
                v-model="formData.DepartmentID"
                :data="departmentTreeOptions"
                :props="{ value: 'ID', label: 'Name', children: 'children' }"
                placeholder="请选择所属部门"
                check-strictly
                clearable
              />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="岗位级别" prop="Level">
              <el-select v-model="formData.Level" placeholder="请选择岗位级别">
                <el-option label="初级" :value="1" />
                <el-option label="中级" :value="2" />
                <el-option label="高级" :value="3" />
                <el-option label="专家" :value="4" />
                <el-option label="管理" :value="5" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
        <el-form-item label="岗位描述" prop="Description">
          <el-input
            v-model="formData.Description"
            type="textarea"
            :rows="3"
            placeholder="请输入岗位描述"
          />
        </el-form-item>
        <el-form-item label="任职要求" prop="Requirements">
          <el-input
            v-model="formData.Requirements"
            type="textarea"
            :rows="3"
            placeholder="请输入任职要求"
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
  Search
} from '@element-plus/icons-vue'
import axios from 'axios'

// 响应式数据
const loading = ref(false)
const submitting = ref(false)
const dialogVisible = ref(false)
const formRef = ref()
const positionList = ref([])
const departmentList = ref([])
const isEdit = ref(false)
const currentEditId = ref(null)

// 搜索表单
const searchForm = reactive({
  keyword: '',
  departmentId: null,
  status: null
})

// 分页数据
const pagination = reactive({
  page: 1,
  size: 20,
  total: 0
})

// 表单数据
const formData = reactive({
  Name: '',
  Code: '',
  DepartmentID: null,
  Level: null,
  Description: '',
  Requirements: '',
  SortOrder: 0,
  Status: true
})

// 表单验证规则
const formRules = {
  Name: [
    { required: true, message: '请输入岗位名称', trigger: 'blur' },
    { min: 2, max: 50, message: '岗位名称长度在 2 到 50 个字符', trigger: 'blur' }
  ],
  Code: [
    { required: true, message: '请输入岗位编码', trigger: 'blur' },
    { min: 2, max: 20, message: '岗位编码长度在 2 到 20 个字符', trigger: 'blur' }
  ],
  DepartmentID: [
    { required: true, message: '请选择所属部门', trigger: 'change' }
  ],
  Level: [
    { required: true, message: '请选择岗位级别', trigger: 'change' }
  ]
}

// 计算属性
const dialogTitle = computed(() => {
  return isEdit.value ? '编辑岗位' : '新增岗位'
})

// 部门选项（平铺）
const departmentOptions = computed(() => {
  return flattenDepartments(departmentList.value)
})

// 部门树形选项
const departmentTreeOptions = computed(() => {
  return buildTree(departmentList.value)
})

// 工具函数
function flattenDepartments(list, result = []) {
  for (const item of list) {
    result.push(item)
    if (item.children && item.children.length > 0) {
      flattenDepartments(item.children, result)
    }
  }
  return result
}

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

function getLevelTagType(level) {
  const typeMap = {
    1: '',
    2: 'success',
    3: 'warning',
    4: 'danger',
    5: 'info'
  }
  return typeMap[level] || ''
}

function getLevelText(level) {
  const textMap = {
    1: '初级',
    2: '中级',
    3: '高级',
    4: '专家',
    5: '管理'
  }
  return textMap[level] || level
}

function formatDate(dateString) {
  if (!dateString) return ''
  return new Date(dateString).toLocaleString('zh-CN')
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

// 获取岗位列表
const fetchPositions = async () => {
  try {
    loading.value = true
    const params = {
      page: pagination.page,
      size: pagination.size,
      ...searchForm
    }
    const response = await axios.get('/api/positions', { params })
    const data = response.data.data || {}
    positionList.value = data.list || []
    pagination.total = data.total || 0
  } catch (error) {
    console.error('获取岗位列表失败:', error)
    ElMessage.error('获取岗位列表失败')
  } finally {
    loading.value = false
  }
}

// 搜索
const handleSearch = () => {
  pagination.page = 1
  fetchPositions()
}

// 重置搜索
const resetSearch = () => {
  Object.assign(searchForm, {
    keyword: '',
    departmentId: null,
    status: null
  })
  handleSearch()
}

// 分页处理
const handleSizeChange = (size) => {
  pagination.size = size
  pagination.page = 1
  fetchPositions()
}

const handleCurrentChange = (page) => {
  pagination.page = page
  fetchPositions()
}

// 显示新增对话框
const showAddDialog = () => {
  isEdit.value = false
  currentEditId.value = null
  resetForm()
  dialogVisible.value = true
}

// 显示编辑对话框
const showEditDialog = (position) => {
  isEdit.value = true
  currentEditId.value = position.ID
  Object.assign(formData, {
    Name: position.Name,
    Code: position.Code,
    DepartmentID: position.DepartmentID,
    Level: position.Level || null,
    Description: position.Description || '',
    Requirements: position.Requirements || '',
    SortOrder: position.SortOrder || 0,
    Status: position.Status !== false
  })
  dialogVisible.value = true
}

// 重置表单
const resetForm = () => {
  Object.assign(formData, {
    Name: '',
    Code: '',
    DepartmentID: null,
    Level: null,
    Description: '',
    Requirements: '',
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
    
    const url = isEdit.value ? `/api/positions/${currentEditId.value}` : '/api/positions'
    const method = isEdit.value ? 'put' : 'post'
    
    await axios[method](url, formData)
    
    ElMessage.success(isEdit.value ? '更新成功' : '创建成功')
    dialogVisible.value = false
    await fetchPositions()
  } catch (error) {
    console.error('提交失败:', error)
    ElMessage.error(error.response?.data?.message || '操作失败')
  } finally {
    submitting.value = false
  }
}

// 删除岗位
const deletePosition = async (position) => {
  try {
    await ElMessageBox.confirm(
      `确定要删除岗位 "${position.Name}" 吗？`,
      '确认删除',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning',
        appendTo: 'body',
        lockScroll: false
      }
    )
    
    await axios.delete(`/api/positions/${position.ID}`)
    ElMessage.success('删除成功')
    await fetchPositions()
  } catch (error) {
    if (error !== 'cancel') {
      console.error('删除失败:', error)
      ElMessage.error(error.response?.data?.message || '删除失败')
    }
  }
}

// 刷新数据
const refreshData = () => {
  fetchPositions()
}

// 关闭对话框
const handleDialogClose = () => {
  dialogVisible.value = false
  resetForm()
}

// 组件挂载时获取数据
onMounted(async () => {
  await fetchDepartments()
  await fetchPositions()
})
</script>

<style scoped>
.position-management {
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
  .position-management {
    padding: 10px;
  }
  
  .toolbar {
    flex-direction: column;
    align-items: stretch;
  }
  
  .search-section {
    justify-content: flex-start;
  }
  
  .action-section {
    justify-content: flex-end;
  }
  
  .page-header h2 {
    font-size: 20px;
  }
}
</style>