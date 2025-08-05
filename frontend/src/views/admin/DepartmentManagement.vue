<template>
  <div class="department-management">
    <!-- 页面标题 -->
    <div class="page-header">
      <h2>部门管理</h2>
      <p>管理系统中的部门信息，支持树形结构</p>
    </div>

    <!-- 操作工具栏 -->
    <el-card class="toolbar-card" shadow="never">
      <div class="toolbar">
        <div class="action-section">
          <el-button type="primary" @click="showAddDialog" :icon="Plus">
            新增部门
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

    <!-- 部门树表格 -->
    <el-card class="table-card" shadow="never">
      <el-table
        ref="tableRef"
        :data="departmentTree"
        style="width: 100%"
        row-key="ID"
        :tree-props="{ children: 'children', hasChildren: 'hasChildren' }"
        v-loading="loading"
        stripe
        border
        resizable
        :header-cell-style="{ background: '#f8f9fa', color: '#606266' }"
      >
      <el-table-column prop="Name" label="部门名称" min-width="200" resizable show-overflow-tooltip>
        <template #default="{ row }">
          <el-icon v-if="row.DeptType === 'company'" class="dept-icon"><OfficeBuilding /></el-icon>
          <el-icon v-else class="dept-icon"><Grid /></el-icon>
          {{ row.Name }}
        </template>
      </el-table-column>
      <el-table-column prop="DeptCode" label="部门编码" min-width="120" resizable show-overflow-tooltip />
      <el-table-column prop="DeptType" label="部门类型" width="100" resizable>
        <template #default="{ row }">
          <el-tag :type="row.DeptType === 'company' ? 'danger' : 'primary'" size="small">
            {{ row.DeptType === 'company' ? '公司' : '部门' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="Leader" label="负责人" min-width="120" resizable show-overflow-tooltip />
      <el-table-column prop="Phone" label="联系电话" min-width="130" resizable show-overflow-tooltip />
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
              新增子部门
            </el-button>
            <el-button 
              size="small" 
              type="danger" 
              @click="deleteDepartment(row)"
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

    <!-- 新增/编辑部门对话框 -->
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
            <el-form-item label="部门名称" prop="Name">
              <el-input v-model="formData.Name" placeholder="请输入部门名称" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="部门编码" prop="DeptCode">
              <el-input v-model="formData.DeptCode" placeholder="请输入部门编码" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="上级部门" prop="ParentID">
              <el-tree-select
                v-model="formData.ParentID"
                :data="departmentOptions"
                :props="{ value: 'ID', label: 'Name', children: 'children' }"
                placeholder="请选择上级部门"
                check-strictly
                clearable
              />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="部门类型" prop="DeptType">
              <el-select v-model="formData.DeptType" placeholder="请选择部门类型">
                <el-option label="公司" value="company" />
                <el-option label="部门" value="department" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="负责人" prop="Leader">
              <el-input v-model="formData.Leader" placeholder="请输入负责人" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="联系电话" prop="Phone">
              <el-input v-model="formData.Phone" placeholder="请输入联系电话" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-form-item label="邮箱" prop="Email">
          <el-input v-model="formData.Email" placeholder="请输入邮箱地址" />
        </el-form-item>
        <el-form-item label="描述" prop="Description">
          <el-input
            v-model="formData.Description"
            type="textarea"
            :rows="3"
            placeholder="请输入部门描述"
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
import { ref, reactive, onMounted, computed, nextTick } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  Plus,
  Edit,
  Delete,
  Refresh,
  Expand,
  Fold,
  OfficeBuilding,
  Grid
} from '@element-plus/icons-vue'
import axios from 'axios'

// 响应式数据
const loading = ref(false)
const submitting = ref(false)
const dialogVisible = ref(false)
const tableRef = ref()
const formRef = ref()
const departmentList = ref([])
const isEdit = ref(false)
const currentEditId = ref(null)

// 表单数据
const formData = reactive({
  Name: '',
  DeptCode: '',
  ParentID: null,
  DeptType: 'department',
  Leader: '',
  Phone: '',
  Email: '',
  Description: '',
  SortOrder: 0,
  Status: true
})

// 表单验证规则
const formRules = {
  Name: [
    { required: true, message: '请输入部门名称', trigger: 'blur' },
    { min: 2, max: 50, message: '部门名称长度在 2 到 50 个字符', trigger: 'blur' }
  ],
  DeptCode: [
    { required: true, message: '请输入部门编码', trigger: 'blur' },
    { min: 2, max: 20, message: '部门编码长度在 2 到 20 个字符', trigger: 'blur' }
  ],
  DeptType: [
    { required: true, message: '请选择部门类型', trigger: 'change' }
  ],
  Phone: [
    { pattern: /^1[3-9]\d{9}$/, message: '请输入正确的手机号码', trigger: 'blur' }
  ],
  Email: [
    { type: 'email', message: '请输入正确的邮箱地址', trigger: 'blur' }
  ]
}

// 计算属性
const dialogTitle = computed(() => {
  return isEdit.value ? '编辑部门' : '新增部门'
})

// 构建树形结构
const departmentTree = computed(() => {
  return buildTree(departmentList.value)
})

// 部门选项（用于上级部门选择）
const departmentOptions = computed(() => {
  return buildTree(departmentList.value.filter(dept => dept.ID !== currentEditId.value))
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

// 获取部门列表
const fetchDepartments = async () => {
  try {
    loading.value = true
    const response = await axios.get('/departments')
    departmentList.value = response.data.data || []
  } catch (error) {
    console.error('获取部门列表失败:', error)
    ElMessage.error('获取部门列表失败')
  } finally {
    loading.value = false
  }
}

// 显示新增对话框
const showAddDialog = (parentDept = null) => {
  isEdit.value = false
  currentEditId.value = null
  resetForm()
  if (parentDept) {
    formData.ParentID = parentDept.ID
  }
  dialogVisible.value = true
}

// 显示编辑对话框
const showEditDialog = (dept) => {
  isEdit.value = true
  currentEditId.value = dept.ID
  Object.assign(formData, {
    Name: dept.Name,
    DeptCode: dept.DeptCode,
    ParentID: dept.ParentID,
    DeptType: dept.DeptType || 'department',
    Leader: dept.Leader || '',
    Phone: dept.Phone || '',
    Email: dept.Email || '',
    Description: dept.Description || '',
    SortOrder: dept.SortOrder || 0,
    Status: dept.Status !== false
  })
  dialogVisible.value = true
}

// 重置表单
const resetForm = () => {
  Object.assign(formData, {
    Name: '',
    DeptCode: '',
    ParentID: null,
    DeptType: 'department',
    Leader: '',
    Phone: '',
    Email: '',
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
    
    const url = isEdit.value ? `/departments/${currentEditId.value}` : '/departments'
    const method = isEdit.value ? 'put' : 'post'
    
    await axios[method](url, formData)
    
    ElMessage.success(isEdit.value ? '更新成功' : '创建成功')
    dialogVisible.value = false
    await fetchDepartments()
  } catch (error) {
    console.error('提交失败:', error)
    ElMessage.error(error.response?.data?.message || '操作失败')
  } finally {
    submitting.value = false
  }
}

// 删除部门
const deleteDepartment = async (dept) => {
  try {
    // 首先检查是否有子部门
    const hasChildren = departmentList.value.some(d => d.ParentID === dept.ID)
    
    let confirmMessage = `确定要删除部门 "${dept.Name}" 吗？`
    let cascadeDelete = false
    
    if (hasChildren) {
      // 如果有子部门，询问是否级联删除
      const result = await ElMessageBox.confirm(
        `部门 "${dept.Name}" 下还有子部门。\n\n请选择删除方式：`,
        '确认删除',
        {
          confirmButtonText: '级联删除（删除该部门及所有子部门）',
          cancelButtonText: '取消',
          distinguishCancelAndClose: true,
          type: 'warning',
          showClose: false,
          appendTo: 'body',
          lockScroll: false
        }
      )
      cascadeDelete = true
    } else {
      // 如果没有子部门，正常删除确认
      await ElMessageBox.confirm(
        confirmMessage,
        '确认删除',
        {
          confirmButtonText: '确定',
          cancelButtonText: '取消',
          type: 'warning',
          appendTo: 'body',
          lockScroll: false
        }
      )
    }
    
    // 构建删除请求URL
    const deleteUrl = cascadeDelete 
      ? `/departments/${dept.ID}?cascade=true`
      : `/departments/${dept.ID}`
    
    const response = await axios.delete(deleteUrl)
    
    // 显示成功消息
    ElMessage.success(response.data.message || '删除成功')
    await fetchDepartments()
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
    departmentList.value.forEach(dept => {
      tableRef.value.toggleRowExpansion(dept, true)
    })
  }
}

// 收起全部
const collapseAll = () => {
  if (tableRef.value) {
    departmentList.value.forEach(dept => {
      tableRef.value.toggleRowExpansion(dept, false)
    })
  }
}

// 刷新数据
const refreshData = () => {
  fetchDepartments()
}

// 关闭对话框
const handleDialogClose = () => {
  dialogVisible.value = false
  resetForm()
}

// 组件挂载时获取数据
onMounted(() => {
  fetchDepartments()
})
</script>

<style scoped>
.department-management {
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

.dept-icon {
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
  .department-management {
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