<template>
  <div class="defective-management">
    <el-card class="page-card">
      <template #header>
        <div class="card-header">
          <div class="header-left">
            <h2>不良类别管理</h2>
            <p>管理不良类别和不良项数据，支持多对多关联</p>
          </div>
        </div>
      </template>
      
      <el-tabs v-model="activeTab" class="management-tabs">
        <!-- 不良类别Tab -->
        <el-tab-pane label="不良类别" name="category">
          <div class="tab-content">
            <!-- 操作栏 -->
            <div class="toolbar">
              <div class="toolbar-left">
                <el-input
                  v-model="categorySearch"
                  placeholder="搜索类别名称或描述"
                  clearable
                  style="width: 250px"
                  @clear="loadCategories"
                  @keyup.enter="loadCategories"
                >
                  <template #prefix>
                    <el-icon><Search /></el-icon>
                  </template>
                </el-input>
                <el-checkbox v-model="showInactiveCategories" @change="loadCategories">
                  显示已禁用
                </el-checkbox>
              </div>
              <div class="toolbar-right">
                <!-- 批量操作按钮 -->
                <el-button
                  type="success"
                  :icon="Check"
                  :disabled="selectedCategories.length === 0 || !hasPermission('quality:defective:category:edit')"
                  @click="handleBatchEnableCategories"
                >
                  批量启用
                </el-button>
                <el-button
                  type="warning"
                  :icon="Close"
                  :disabled="selectedCategories.length === 0 || !hasPermission('quality:defective:category:edit')"
                  @click="handleBatchDisableCategories"
                >
                  批量禁用
                </el-button>
                <el-button
                  type="danger"
                  :icon="Delete"
                  :disabled="selectedCategories.length === 0 || !hasPermission('quality:defective:category:delete')"
                  @click="handleBatchDeleteCategories"
                >
                  批量删除
                </el-button>
                <el-button 
                  type="primary" 
                  :icon="Plus"
                  :disabled="!hasPermission('quality:defective:category:add')"
                  @click="handleAddCategory"
                >
                  新增类别
                </el-button>
              </div>
            </div>
            
            <!-- 类别表格 -->
            <el-table
              ref="categoryTableRef"
              v-loading="categoryLoading"
              :data="paginatedCategoryList"
              border
              stripe
              style="width: 100%"
              @selection-change="handleCategorySelectionChange"
            >
              <el-table-column type="selection" width="50" />
              <el-table-column prop="ID" label="ID" width="80" />
              <el-table-column prop="Name" label="类别名称" min-width="150" />
              <el-table-column prop="Description" label="描述" min-width="200" show-overflow-tooltip />
              <el-table-column prop="SortOrder" label="排序" width="80" align="center" />
              <el-table-column prop="ItemCount" label="关联项数" width="100" align="center">
                <template #default="{ row }">
                  <el-tag type="info" size="small">{{ row.ItemCount || 0 }}</el-tag>
                </template>
              </el-table-column>
              <el-table-column prop="IsActive" label="状态" width="80" align="center">
                <template #default="{ row }">
                  <el-tag :type="row.IsActive ? 'success' : 'danger'" size="small">
                    {{ row.IsActive ? '启用' : '禁用' }}
                  </el-tag>
                </template>
              </el-table-column>
              <el-table-column prop="UpdatedAt" label="更新时间" width="170">
                <template #default="{ row }">
                  {{ formatDateTime(row.UpdatedAt) }}
                </template>
              </el-table-column>
              <el-table-column label="操作" width="150" fixed="right">
                <template #default="{ row }">
                  <el-button 
                    type="primary" 
                    link 
                    size="small"
                    :disabled="!hasPermission('quality:defective:category:edit')"
                    @click="handleEditCategory(row)"
                  >
                    编辑
                  </el-button>
                  <el-button 
                    type="danger" 
                    link 
                    size="small"
                    :disabled="!hasPermission('quality:defective:category:delete') || row.ItemCount > 0"
                    @click="handleDeleteCategory(row)"
                  >
                    删除
                  </el-button>
                </template>
              </el-table-column>
            </el-table>
            
            <!-- 类别分页器 -->
            <div class="pagination-container">
              <el-pagination
                v-model:current-page="categoryPagination.currentPage"
                v-model:page-size="categoryPagination.pageSize"
                :page-sizes="[5, 10, 20, 50]"
                :total="categoryList.length"
                layout="total, sizes, prev, pager, next, jumper"
                background
                @size-change="handleCategoryPageSizeChange"
                @current-change="handleCategoryPageChange"
              />
            </div>
          </div>
        </el-tab-pane>
        
        <!-- 不良项Tab -->
        <el-tab-pane label="不良项" name="item">
          <div class="tab-content">
            <!-- 操作栏 -->
            <div class="toolbar">
              <div class="toolbar-left">
                <el-select
                  v-model="itemCategoryFilter"
                  placeholder="按类别筛选"
                  clearable
                  style="width: 180px"
                  @change="loadItems"
                >
                  <el-option
                    v-for="cat in categoryList"
                    :key="cat.ID"
                    :label="cat.Name"
                    :value="cat.ID"
                  />
                </el-select>
                <el-input
                  v-model="itemSearch"
                  placeholder="搜索不良项名称或描述"
                  clearable
                  style="width: 250px"
                  @clear="loadItems"
                  @keyup.enter="loadItems"
                >
                  <template #prefix>
                    <el-icon><Search /></el-icon>
                  </template>
                </el-input>
                <el-checkbox v-model="showInactiveItems" @change="loadItems">
                  显示已禁用
                </el-checkbox>
              </div>
              <div class="toolbar-right">
                <!-- 批量操作按钮 -->
                <el-button
                  type="success"
                  :icon="Check"
                  :disabled="selectedItems.length === 0 || !hasPermission('quality:defective:item:edit')"
                  @click="handleBatchEnableItems"
                >
                  批量启用
                </el-button>
                <el-button
                  type="warning"
                  :icon="Close"
                  :disabled="selectedItems.length === 0 || !hasPermission('quality:defective:item:edit')"
                  @click="handleBatchDisableItems"
                >
                  批量禁用
                </el-button>
                <el-button
                  type="danger"
                  :icon="Delete"
                  :disabled="selectedItems.length === 0 || !hasPermission('quality:defective:item:delete')"
                  @click="handleBatchDeleteItems"
                >
                  批量删除
                </el-button>
                <el-button 
                  type="primary" 
                  :icon="Plus"
                  :disabled="!hasPermission('quality:defective:item:add')"
                  @click="handleAddItem"
                >
                  新增不良项
                </el-button>
              </div>
            </div>
            
            <!-- 不良项表格 -->
            <el-table
              ref="itemTableRef"
              v-loading="itemLoading"
              :data="paginatedItemList"
              border
              stripe
              style="width: 100%"
              @selection-change="handleItemSelectionChange"
            >
              <el-table-column type="selection" width="50" />
              <el-table-column prop="ID" label="ID" width="80" />
              <el-table-column prop="Name" label="不良项名称" min-width="150" />
              <el-table-column prop="categories" label="所属类别" min-width="200">
                <template #default="{ row }">
                  <span v-if="row.categories && row.categories.length > 0" class="category-text">
                    {{ row.categories.map(c => c.name).join('、') }}
                  </span>
                  <span v-else class="no-category">未分类</span>
                </template>
              </el-table-column>
              <el-table-column prop="Description" label="描述" min-width="180" show-overflow-tooltip />
              <el-table-column prop="SortOrder" label="排序" width="80" align="center" />
              <el-table-column prop="IsActive" label="状态" width="80" align="center">
                <template #default="{ row }">
                  <el-tag :type="row.IsActive ? 'success' : 'danger'" size="small">
                    {{ row.IsActive ? '启用' : '禁用' }}
                  </el-tag>
                </template>
              </el-table-column>
              <el-table-column prop="UpdatedAt" label="更新时间" width="170">
                <template #default="{ row }">
                  {{ formatDateTime(row.UpdatedAt) }}
                </template>
              </el-table-column>
              <el-table-column label="操作" width="150" fixed="right">
                <template #default="{ row }">
                  <el-button 
                    type="primary" 
                    link 
                    size="small"
                    :disabled="!hasPermission('quality:defective:item:edit')"
                    @click="handleEditItem(row)"
                  >
                    编辑
                  </el-button>
                  <el-button 
                    type="danger" 
                    link 
                    size="small"
                    :disabled="!hasPermission('quality:defective:item:delete')"
                    @click="handleDeleteItem(row)"
                  >
                    删除
                  </el-button>
                </template>
              </el-table-column>
            </el-table>
            
            <!-- 不良项分页器 -->
            <div class="pagination-container">
              <el-pagination
                v-model:current-page="itemPagination.currentPage"
                v-model:page-size="itemPagination.pageSize"
                :page-sizes="[5, 10, 20, 50]"
                :total="itemList.length"
                layout="total, sizes, prev, pager, next, jumper"
                background
                @size-change="handleItemPageSizeChange"
                @current-change="handleItemPageChange"
              />
            </div>
          </div>
        </el-tab-pane>
      </el-tabs>
    </el-card>
    
    <!-- 类别编辑对话框 -->
    <el-dialog
      v-model="categoryDialogVisible"
      :title="categoryForm.id ? '编辑不良类别' : '新增不良类别'"
      width="500px"
      destroy-on-close
    >
      <el-form
        ref="categoryFormRef"
        :model="categoryForm"
        :rules="categoryRules"
        label-width="100px"
      >
        <el-form-item label="类别名称" prop="name">
          <el-input v-model="categoryForm.name" placeholder="请输入类别名称" maxlength="50" />
        </el-form-item>
        <el-form-item label="描述" prop="description">
          <el-input 
            v-model="categoryForm.description" 
            type="textarea" 
            :rows="3"
            placeholder="请输入类别描述" 
            maxlength="200"
            show-word-limit
          />
        </el-form-item>
        <el-form-item label="排序" prop="sortOrder">
          <el-input-number v-model="categoryForm.sortOrder" :min="0" :max="9999" />
        </el-form-item>
        <el-form-item label="状态" prop="isActive">
          <el-switch v-model="categoryForm.isActive" active-text="启用" inactive-text="禁用" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="categoryDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="categorySubmitting" @click="submitCategoryForm">
          确定
        </el-button>
      </template>
    </el-dialog>
    
    <!-- 不良项编辑对话框 -->
    <el-dialog
      v-model="itemDialogVisible"
      :title="itemForm.id ? '编辑不良项' : '新增不良项'"
      width="550px"
      destroy-on-close
    >
      <el-form
        ref="itemFormRef"
        :model="itemForm"
        :rules="itemRules"
        label-width="100px"
      >
        <el-form-item label="不良项名称" prop="name">
          <el-input v-model="itemForm.name" placeholder="请输入不良项名称" maxlength="100" />
        </el-form-item>
        <el-form-item label="所属类别" prop="categoryIds">
          <el-select
            v-model="itemForm.categoryIds"
            multiple
            filterable
            collapse-tags
            collapse-tags-tooltip
            :max-collapse-tags="3"
            placeholder="请选择所属类别（可多选，支持搜索）"
            style="width: 100%"
          >
            <el-option
              v-for="cat in activeCategoryList"
              :key="cat.ID"
              :label="cat.Name"
              :value="cat.ID"
            />
          </el-select>
          <div class="form-tip">
            <el-icon><InfoFilled /></el-icon>
            一个不良项可以同时属于多个类别，输入关键字可快速筛选
          </div>
        </el-form-item>
        <el-form-item label="描述" prop="description">
          <el-input 
            v-model="itemForm.description" 
            type="textarea" 
            :rows="3"
            placeholder="请输入不良项描述" 
            maxlength="500"
            show-word-limit
          />
        </el-form-item>
        <el-form-item label="排序" prop="sortOrder">
          <el-input-number v-model="itemForm.sortOrder" :min="0" :max="9999" />
        </el-form-item>
        <el-form-item label="状态" prop="isActive">
          <el-switch v-model="itemForm.isActive" active-text="启用" inactive-text="禁用" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="itemDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="itemSubmitting" @click="submitItemForm">
          确定
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Search, InfoFilled, Check, Close, Delete } from '@element-plus/icons-vue'
import { useUserStore } from '@/store/user'
import apiService from '@/services/apiService'

// API基础路径
const API_BASE = '/defective'

// 用户权限
const userStore = useUserStore()

// 权限检查函数
const hasPermission = (permission) => {
  // 管理员拥有所有权限
  if (userStore.user?.roles?.some(role => role.roleCode === 'admin')) {
    return true
  }
  // 检查具体权限
  return userStore.user?.permissions?.actions?.includes(permission) || true // 默认允许，便于开发测试
}

// Tab切换
const activeTab = ref('category')

// =====================================================
// 不良类别相关
// =====================================================
const categoryLoading = ref(false)
const categoryList = ref([])
const categorySearch = ref('')
const showInactiveCategories = ref(false)
const categoryTableRef = ref(null)
const selectedCategories = ref([])

// 类别选择变化
const handleCategorySelectionChange = (selection) => {
  selectedCategories.value = selection
}

// 类别分页
const categoryPagination = reactive({
  currentPage: 1,
  pageSize: 5
})

// 类别分页后的数据
const paginatedCategoryList = computed(() => {
  const start = (categoryPagination.currentPage - 1) * categoryPagination.pageSize
  const end = start + categoryPagination.pageSize
  return categoryList.value.slice(start, end)
})

// 类别分页事件处理
const handleCategoryPageSizeChange = (size) => {
  categoryPagination.pageSize = size
  categoryPagination.currentPage = 1
}

const handleCategoryPageChange = (page) => {
  categoryPagination.currentPage = page
}

// 类别对话框
const categoryDialogVisible = ref(false)
const categoryFormRef = ref(null)
const categorySubmitting = ref(false)
const categoryForm = reactive({
  id: null,
  name: '',
  description: '',
  sortOrder: 0,
  isActive: true
})

const categoryRules = {
  name: [
    { required: true, message: '请输入类别名称', trigger: 'blur' },
    { max: 50, message: '类别名称不能超过50个字符', trigger: 'blur' }
  ]
}

// 获取启用的类别列表（用于不良项的类别选择）
const activeCategoryList = computed(() => {
  // 兼容各种数据格式：true, 1, '1', null(旧数据默认启用)
  return categoryList.value.filter(cat => {
    // 如果IsActive为false或0，则过滤掉
    if (cat.IsActive === false || cat.IsActive === 0 || cat.IsActive === '0') {
      return false
    }
    // 其他情况（true, 1, '1', null, undefined）都视为启用
    return true
  })
})

// 加载类别列表
const loadCategories = async () => {
  categoryLoading.value = true
  try {
    const params = {}
    if (showInactiveCategories.value) {
      params.includeInactive = 'true'
    }
    if (categorySearch.value) {
      params.keyword = categorySearch.value
    }
    
    const response = await apiService.get(`${API_BASE}/categories`, { params })
    if (response.data.code === 200) {
      categoryList.value = response.data.data
      // 重置分页到第一页
      categoryPagination.currentPage = 1
    } else {
      throw new Error(response.data.message)
    }
  } catch (error) {
    console.error('加载类别列表失败:', error)
    ElMessage.error('加载类别列表失败：' + (error.response?.data?.message || error.message))
  } finally {
    categoryLoading.value = false
  }
}

// 加载所有类别（用于下拉选择，包含已禁用的）
const loadAllCategories = async () => {
  try {
    const response = await apiService.get(`${API_BASE}/categories`, { 
      params: { includeInactive: 'true' } 
    })
    if (response.data.code === 200) {
      categoryList.value = response.data.data
    }
  } catch (error) {
    console.error('加载类别列表失败:', error)
  }
}

// 新增类别
const handleAddCategory = () => {
  categoryForm.id = null
  categoryForm.name = ''
  categoryForm.description = ''
  categoryForm.sortOrder = 0
  categoryForm.isActive = true
  categoryDialogVisible.value = true
}

// 编辑类别
const handleEditCategory = (row) => {
  categoryForm.id = row.ID
  categoryForm.name = row.Name
  categoryForm.description = row.Description || ''
  categoryForm.sortOrder = row.SortOrder || 0
  categoryForm.isActive = row.IsActive
  categoryDialogVisible.value = true
}

// 删除类别
const handleDeleteCategory = async (row) => {
  if (row.ItemCount > 0) {
    ElMessage.warning('该类别下存在关联的不良项，请先解除关联关系后再删除')
    return
  }
  
  try {
    await ElMessageBox.confirm(
      `确定要删除类别"${row.Name}"吗？此操作不可恢复。`,
      '确认删除',
      { type: 'warning' }
    )
    
    const response = await apiService.delete(`${API_BASE}/categories/${row.ID}`)
    if (response.data.code === 200) {
      ElMessage.success('删除成功')
      loadCategories()
    } else {
      throw new Error(response.data.message)
    }
  } catch (error) {
    if (error === 'cancel') return
    
    console.error('删除类别出错:', error)
    // 优先显示后端返回的具体错误信息
    const errorMessage = error.response?.data?.message || error.message || '删除失败'
    ElMessage.error(errorMessage)
  }
}

// 提交类别表单
const submitCategoryForm = async () => {
  try {
    await categoryFormRef.value.validate()
    categorySubmitting.value = true
    
    const data = {
      name: categoryForm.name,
      description: categoryForm.description,
      sortOrder: categoryForm.sortOrder,
      isActive: categoryForm.isActive
    }
    
    let response
    if (categoryForm.id) {
      response = await apiService.put(`${API_BASE}/categories/${categoryForm.id}`, data)
    } else {
      response = await apiService.post(`${API_BASE}/categories`, data)
    }
    
    if (response.data.code === 200) {
      ElMessage.success(categoryForm.id ? '更新成功' : '新增成功')
      categoryDialogVisible.value = false
      loadCategories()
    } else {
      throw new Error(response.data.message)
    }
  } catch (error) {
    if (error !== false) { // 排除表单验证失败
      ElMessage.error((error.response?.data?.message || error.message))
    }
  } finally {
    categorySubmitting.value = false
  }
}

// 批量启用类别
const handleBatchEnableCategories = async () => {
  try {
    await ElMessageBox.confirm(
      `确定要启用选中的 ${selectedCategories.value.length} 个类别吗？`,
      '批量启用',
      { type: 'info' }
    )
    
    const response = await apiService.post(`${API_BASE}/categories/batch-status`, {
      ids: selectedCategories.value.map(c => c.ID),
      isActive: true
    })
    
    if (response.data.code === 200) {
      ElMessage.success(`成功启用 ${response.data.data?.successCount || selectedCategories.value.length} 个类别`)
      selectedCategories.value = []
      loadCategories()
    } else {
      throw new Error(response.data.message)
    }
  } catch (error) {
    if (error === 'cancel') return
    ElMessage.error(error.response?.data?.message || error.message || '批量启用失败')
  }
}

// 批量禁用类别
const handleBatchDisableCategories = async () => {
  try {
    await ElMessageBox.confirm(
      `确定要禁用选中的 ${selectedCategories.value.length} 个类别吗？`,
      '批量禁用',
      { type: 'warning' }
    )
    
    const response = await apiService.post(`${API_BASE}/categories/batch-status`, {
      ids: selectedCategories.value.map(c => c.ID),
      isActive: false
    })
    
    if (response.data.code === 200) {
      ElMessage.success(`成功禁用 ${response.data.data?.successCount || selectedCategories.value.length} 个类别`)
      selectedCategories.value = []
      loadCategories()
    } else {
      throw new Error(response.data.message)
    }
  } catch (error) {
    if (error === 'cancel') return
    ElMessage.error(error.response?.data?.message || error.message || '批量禁用失败')
  }
}

// 批量删除类别
const handleBatchDeleteCategories = async () => {
  // 检查是否有关联项
  const hasRelatedItems = selectedCategories.value.some(c => c.ItemCount > 0)
  if (hasRelatedItems) {
    ElMessage.warning('选中的类别中存在有关联不良项的类别，无法删除')
    return
  }
  
  try {
    await ElMessageBox.confirm(
      `确定要删除选中的 ${selectedCategories.value.length} 个类别吗？此操作不可恢复。`,
      '批量删除',
      { type: 'danger' }
    )
    
    const response = await apiService.post(`${API_BASE}/categories/batch-delete`, {
      ids: selectedCategories.value.map(c => c.ID)
    })
    
    if (response.data.code === 200) {
      ElMessage.success(`成功删除 ${response.data.data?.successCount || selectedCategories.value.length} 个类别`)
      selectedCategories.value = []
      loadCategories()
    } else {
      throw new Error(response.data.message)
    }
  } catch (error) {
    if (error === 'cancel') return
    ElMessage.error(error.response?.data?.message || error.message || '批量删除失败')
  }
}

// =====================================================
// 不良项相关
// =====================================================
const itemLoading = ref(false)
const itemList = ref([])
const itemSearch = ref('')
const itemCategoryFilter = ref(null)
const showInactiveItems = ref(false)
const itemTableRef = ref(null)
const selectedItems = ref([])

// 不良项选择变化
const handleItemSelectionChange = (selection) => {
  selectedItems.value = selection
}

// 不良项分页
const itemPagination = reactive({
  currentPage: 1,
  pageSize: 5
})

// 不良项分页后的数据
const paginatedItemList = computed(() => {
  const start = (itemPagination.currentPage - 1) * itemPagination.pageSize
  const end = start + itemPagination.pageSize
  return itemList.value.slice(start, end)
})

// 不良项分页事件处理
const handleItemPageSizeChange = (size) => {
  itemPagination.pageSize = size
  itemPagination.currentPage = 1
}

const handleItemPageChange = (page) => {
  itemPagination.currentPage = page
}

// 不良项对话框
const itemDialogVisible = ref(false)
const itemFormRef = ref(null)
const itemSubmitting = ref(false)
const itemForm = reactive({
  id: null,
  name: '',
  description: '',
  sortOrder: 0,
  isActive: true,
  categoryIds: []
})

const itemRules = {
  name: [
    { required: true, message: '请输入不良项名称', trigger: 'blur' },
    { max: 100, message: '不良项名称不能超过100个字符', trigger: 'blur' }
  ],
  categoryIds: [
    { 
      required: true, 
      message: '请至少选择一个所属类别', 
      trigger: 'change',
      validator: (rule, value, callback) => {
        if (!value || value.length === 0) {
          callback(new Error('请至少选择一个所属类别'))
        } else {
          callback()
        }
      }
    }
  ]
}

// 加载不良项列表
const loadItems = async () => {
  itemLoading.value = true
  try {
    const params = {}
    if (itemCategoryFilter.value) {
      params.categoryId = itemCategoryFilter.value
    }
    if (showInactiveItems.value) {
      params.includeInactive = 'true'
    }
    if (itemSearch.value) {
      params.keyword = itemSearch.value
    }
    
    const response = await apiService.get(`${API_BASE}/items`, { params })
    if (response.data.code === 200) {
      itemList.value = response.data.data
      // 重置分页到第一页
      itemPagination.currentPage = 1
    } else {
      throw new Error(response.data.message)
    }
  } catch (error) {
    console.error('加载不良项列表失败:', error)
    ElMessage.error('加载不良项列表失败：' + (error.response?.data?.message || error.message))
  } finally {
    itemLoading.value = false
  }
}

// 新增不良项
const handleAddItem = async () => {
  // 确保类别数据已加载
  if (categoryList.value.length === 0) {
    await loadAllCategories()
  }
  
  if (activeCategoryList.value.length === 0) {
    ElMessage.warning('请先添加不良类别')
    return
  }
  
  itemForm.id = null
  itemForm.name = ''
  itemForm.description = ''
  itemForm.sortOrder = 0
  itemForm.isActive = true
  itemForm.categoryIds = []
  itemDialogVisible.value = true
}

// 编辑不良项
const handleEditItem = async (row) => {
  // 确保类别数据已加载
  if (categoryList.value.length === 0) {
    await loadAllCategories()
  }
  
  itemForm.id = row.ID
  itemForm.name = row.Name
  itemForm.description = row.Description || ''
  itemForm.sortOrder = row.SortOrder || 0
  // 只有明确为 false/0/'0' 时才视为禁用，其他情况（true/1/'1'/null/undefined）都视为启用
  itemForm.isActive = !(row.IsActive === false || row.IsActive === 0 || row.IsActive === '0')
  itemForm.categoryIds = row.categoryIds || []
  itemDialogVisible.value = true
}

// 删除不良项
const handleDeleteItem = async (row) => {
  try {
    await ElMessageBox.confirm(
      `确定要删除不良项"${row.Name}"吗？此操作不可恢复。`,
      '确认删除',
      { type: 'warning' }
    )
    
    const response = await apiService.delete(`${API_BASE}/items/${row.ID}`)
    if (response.data.code === 200) {
      ElMessage.success('删除成功')
      loadItems()
    } else {
      throw new Error(response.data.message)
    }
  } catch (error) {
    if (error === 'cancel') return
    
    console.error('删除不良项出错:', error)
    // 优先显示后端返回的具体错误信息
    const errorMessage = error.response?.data?.message || error.message || '删除失败'
    ElMessage.error(errorMessage)
  }
}

// 提交不良项表单
const submitItemForm = async () => {
  try {
    await itemFormRef.value.validate()
    itemSubmitting.value = true
    
    const data = {
      name: itemForm.name,
      description: itemForm.description,
      sortOrder: itemForm.sortOrder,
      isActive: itemForm.isActive,
      categoryIds: itemForm.categoryIds
    }
    
    let response
    if (itemForm.id) {
      response = await apiService.put(`${API_BASE}/items/${itemForm.id}`, data)
    } else {
      response = await apiService.post(`${API_BASE}/items`, data)
    }
    
    if (response.data.code === 200) {
      ElMessage.success(itemForm.id ? '更新成功' : '新增成功')
      itemDialogVisible.value = false
      loadItems()
    } else {
      throw new Error(response.data.message)
    }
  } catch (error) {
    if (error !== false) {
      ElMessage.error((error.response?.data?.message || error.message))
    }
  } finally {
    itemSubmitting.value = false
  }
}

// 批量启用不良项
const handleBatchEnableItems = async () => {
  try {
    await ElMessageBox.confirm(
      `确定要启用选中的 ${selectedItems.value.length} 个不良项吗？`,
      '批量启用',
      { type: 'info' }
    )
    
    const response = await apiService.post(`${API_BASE}/items/batch-status`, {
      ids: selectedItems.value.map(i => i.ID),
      isActive: true
    })
    
    if (response.data.code === 200) {
      ElMessage.success(`成功启用 ${response.data.data?.successCount || selectedItems.value.length} 个不良项`)
      selectedItems.value = []
      loadItems()
    } else {
      throw new Error(response.data.message)
    }
  } catch (error) {
    if (error === 'cancel') return
    ElMessage.error(error.response?.data?.message || error.message || '批量启用失败')
  }
}

// 批量禁用不良项
const handleBatchDisableItems = async () => {
  try {
    await ElMessageBox.confirm(
      `确定要禁用选中的 ${selectedItems.value.length} 个不良项吗？`,
      '批量禁用',
      { type: 'warning' }
    )
    
    const response = await apiService.post(`${API_BASE}/items/batch-status`, {
      ids: selectedItems.value.map(i => i.ID),
      isActive: false
    })
    
    if (response.data.code === 200) {
      ElMessage.success(`成功禁用 ${response.data.data?.successCount || selectedItems.value.length} 个不良项`)
      selectedItems.value = []
      loadItems()
    } else {
      throw new Error(response.data.message)
    }
  } catch (error) {
    if (error === 'cancel') return
    ElMessage.error(error.response?.data?.message || error.message || '批量禁用失败')
  }
}

// 批量删除不良项
const handleBatchDeleteItems = async () => {
  try {
    await ElMessageBox.confirm(
      `确定要删除选中的 ${selectedItems.value.length} 个不良项吗？此操作不可恢复。`,
      '批量删除',
      { type: 'danger' }
    )
    
    const response = await apiService.post(`${API_BASE}/items/batch-delete`, {
      ids: selectedItems.value.map(i => i.ID)
    })
    
    if (response.data.code === 200) {
      const result = response.data.data
      if (result?.failedCount > 0) {
        ElMessage.warning(`成功删除 ${result.successCount} 个，${result.failedCount} 个因被引用无法删除`)
      } else {
        ElMessage.success(`成功删除 ${result?.successCount || selectedItems.value.length} 个不良项`)
      }
      selectedItems.value = []
      loadItems()
    } else {
      throw new Error(response.data.message)
    }
  } catch (error) {
    if (error === 'cancel') return
    ElMessage.error(error.response?.data?.message || error.message || '批量删除失败')
  }
}

// =====================================================
// 工具函数
// =====================================================
const formatDateTime = (dateStr) => {
  if (!dateStr) return '-'
  const date = new Date(dateStr)
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

// =====================================================
// 生命周期
// =====================================================
onMounted(() => {
  loadCategories()
  loadItems()
})
</script>

<style scoped>
.defective-management {
  padding: 20px;
}

.page-card {
  /* 移除固定最小高度，让内容自适应 */
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.card-header h2 {
  margin: 0 0 5px 0;
  font-size: 18px;
  font-weight: 600;
}

.card-header p {
  margin: 0;
  font-size: 13px;
  color: #909399;
}

.management-tabs {
  margin-top: 10px;
}

.tab-content {
  padding: 10px 0;
}

.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
  flex-wrap: wrap;
  gap: 10px;
}

.toolbar-left {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.toolbar-right {
  display: flex;
  gap: 10px;
}

.category-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 2px;
}

.category-text {
  color: #409eff;
  font-size: 13px;
  line-height: 1.4;
}

.no-category {
  color: #c0c4cc;
  font-size: 12px;
}

.pagination-container {
  display: flex;
  justify-content: center;
  margin-top: 15px;
  padding: 10px 0;
}

.form-tip {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-top: 5px;
  font-size: 12px;
  color: #909399;
}

:deep(.el-dialog__body) {
  padding-top: 15px;
  padding-bottom: 10px;
}

:deep(.el-table) {
  font-size: 13px;
}

:deep(.el-tag) {
  font-size: 12px;
}
</style>
