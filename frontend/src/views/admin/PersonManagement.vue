<template>
  <div class="person-management">
    <!-- 页面头部 -->
    <div class="page-header">
      <h1>
        <el-icon><User /></el-icon>
        人员管理
      </h1>
      <p class="page-subtitle">管理公司人员信息，设置人员有效性状态</p>
    </div>

    <!-- 操作栏 -->
    <el-card class="operation-card" shadow="never">
      <div class="operation-bar">
        <div class="left-actions">
          <el-button type="primary" @click="showAddDialog = true" :icon="Plus">
            新增人员
          </el-button>
          <el-switch
            v-model="includeInactive"
            @change="loadPersonList"
            active-text="显示离职员工"
            inactive-text="仅显示在职员工"
            style="margin-left: 10px;"
          />
        </div>
        <div class="right-actions">
          <el-input
            v-model="searchKeyword"
            placeholder="搜索人员姓名或部门"
            style="width: 250px; margin-right: 10px;"
            clearable
            @keyup.enter="loadPersonList"
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
        height="500"
      >
        <el-table-column prop="Name" label="姓名" width="150" />
        <el-table-column prop="DepartmentName" label="部门" width="150" />
        <el-table-column prop="IsActive" label="状态" width="120">
          <template #default="{ row }">
            <el-tag :type="row.IsActive ? 'success' : 'danger'">
              {{ row.IsActive ? '在职' : '离职' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="300" fixed="right">
          <template #default="{ row }">
            <el-button
              type="primary"
              size="small"
              @click="editPerson(row)"
              :icon="Edit"
            >
              编辑
            </el-button>
            <el-button
              :type="row.IsActive ? 'warning' : 'success'"
              size="small"
              @click="togglePersonStatus(row)"
              :icon="Switch"
            >
              {{ row.IsActive ? '设为离职' : '设为在职' }}
            </el-button>
            <el-button
              type="danger"
              size="small"
              @click="deletePerson(row)"
              :icon="Delete"
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

    <!-- 新增/编辑人员对话框 -->
    <el-dialog
      :title="isEdit ? '编辑人员' : '新增人员'"
      v-model="showAddDialog"
      width="500px"
      @close="resetForm"
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
        <el-form-item label="部门" prop="departmentId">
          <el-select
            v-model="formData.departmentId"
            placeholder="请选择部门"
            style="width: 100%"
            clearable
          >
            <el-option
              v-for="dept in departments"
              :key="dept.ID"
              :label="dept.Name"
              :value="dept.ID"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="状态" prop="isActive">
          <el-radio-group v-model="formData.isActive">
            <el-radio :label="true">在职</el-radio>
            <el-radio :label="false">离职</el-radio>
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
import { User, Plus, Search, Refresh, Edit, Switch, Delete } from '@element-plus/icons-vue'
import axios from 'axios'

// 响应式数据
const loading = ref(false)
const submitting = ref(false)
const showAddDialog = ref(false)
const isEdit = ref(false)
const searchKeyword = ref('')
const includeInactive = ref(false)
const personList = ref([])
const departments = ref([])

// 分页数据
const pagination = reactive({
  current: 1,
  pageSize: 20,
  total: 0
})

// 表单数据
const formData = reactive({
  id: null,
  name: '',
  departmentId: null,
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

// 加载人员列表
const loadPersonList = async () => {
  loading.value = true
  try {
    const response = await axios.get('/api/person/list', {
      params: {
        page: pagination.current,
        pageSize: pagination.pageSize,
        search: searchKeyword.value,
        includeInactive: includeInactive.value
      },
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
    const response = await axios.get('/api/person/departments', {
      headers: getHeaders()
    })
    
    if (response.data.success) {
      departments.value = response.data.data
    }
  } catch (error) {
    console.error('加载部门列表失败:', error)
  }
}

// 重置搜索
const resetSearch = () => {
  searchKeyword.value = ''
  includeInactive.value = false
  pagination.current = 1
  loadPersonList()
}

// 编辑人员
const editPerson = (row) => {
  isEdit.value = true
  formData.id = row.ID
  formData.name = row.Name
  formData.departmentId = row.DepartmentID
  formData.isActive = row.IsActive
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
      `/api/person/${row.ID}/toggle-status`,
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
    
    const response = await axios.delete(`/api/person/${row.ID}`, {
      headers: getHeaders()
    })
    
    if (response.data.success) {
      ElMessage.success('删除成功')
      loadPersonList()
    } else {
      ElMessage.error(response.data.error || '删除失败')
    }
  } catch (error) {
    if (error !== 'cancel') {
      console.error('删除人员失败:', error)
      ElMessage.error('删除失败')
    }
  }
}

// 提交表单
const submitForm = async () => {
  if (!formRef.value) return
  
  try {
    await formRef.value.validate()
    
    submitting.value = true
    
    const url = isEdit.value ? `/api/person/${formData.id}` : '/api/person'
    const method = isEdit.value ? 'put' : 'post'
    
    const response = await axios[method](url, {
      name: formData.name,
      departmentId: formData.departmentId,
      isActive: formData.isActive
    }, {
      headers: getHeaders()
    })
    
    if (response.data.success) {
      ElMessage.success(response.data.message)
      showAddDialog.value = false
      loadPersonList()
    } else {
      ElMessage.error(response.data.error || '操作失败')
    }
  } catch (error) {
    console.error('提交表单失败:', error)
    ElMessage.error('操作失败')
  } finally {
    submitting.value = false
  }
}

// 重置表单
const resetForm = () => {
  isEdit.value = false
  formData.id = null
  formData.name = ''
  formData.departmentId = null
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
  padding: 20px;
}

.page-header {
  margin-bottom: 20px;
}

.page-header h1 {
  margin: 0;
  color: #303133;
  font-size: 24px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.page-subtitle {
  margin: 8px 0 0 0;
  color: #606266;
  font-size: 14px;
}

.operation-card {
  margin-bottom: 20px;
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

.table-card {
  margin-bottom: 20px;
}

.pagination-wrapper {
  margin-top: 20px;
  display: flex;
  justify-content: center;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}
</style>