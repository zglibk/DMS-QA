<template>
  <div class="supplier-basic-info">
    <!-- 页面标题 -->
    <div class="page-header">
      <h2>供应商基础信息管理</h2>
      <p class="page-description">管理供应商基本信息、联系方式、资质证书等</p>
    </div>

    <!-- 搜索和操作区域 -->
    <div class="search-section">
      <el-row :gutter="20">
        <el-col :span="6">
          <el-input
            v-model="searchForm.supplierName"
            placeholder="请输入供应商名称"
            clearable
            @keyup.enter="handleSearch"
          >
            <template #prefix>
              <el-icon><Search /></el-icon>
            </template>
          </el-input>
        </el-col>
        <el-col :span="6">
          <el-select v-model="searchForm.supplierType" placeholder="供应商类型" clearable>
            <el-option label="原材料供应商" value="material" />
            <el-option label="仪器供应商" value="equipment" />
            <el-option label="服务供应商" value="service" />
          </el-select>
        </el-col>
        <el-col :span="6">
          <el-select v-model="searchForm.status" placeholder="状态" clearable>
            <el-option label="正常" value="active" />
            <el-option label="暂停" value="suspended" />
            <el-option label="黑名单" value="blacklist" />
          </el-select>
        </el-col>
        <el-col :span="6">
          <el-button type="primary" @click="handleSearch">
            <el-icon><Search /></el-icon>
            搜索
          </el-button>
          <el-button @click="resetSearch">重置</el-button>
          <el-button type="success" @click="handleAdd" :disabled="!hasAddPermission">
            <el-icon><Plus /></el-icon>
            新增供应商
          </el-button>
        </el-col>
      </el-row>
    </div>

    <!-- 数据表格 -->
    <div class="table-section">
      <el-table
        :data="tableData"
        v-loading="loading"
        stripe
        border
        style="width: 100%"
      >
        <el-table-column prop="supplierCode" label="供应商编码" width="120" />
        <el-table-column prop="supplierName" label="供应商名称" width="200" />
        <el-table-column prop="supplierType" label="类型" width="120">
          <template #default="{ row }">
            <el-tag :type="getTypeTagType(row.supplierType)">
              {{ getTypeLabel(row.supplierType) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="contactPerson" label="联系人" width="100" />
        <el-table-column prop="contactPhone" label="联系电话" width="130" />
        <el-table-column prop="address" label="地址" min-width="200" show-overflow-tooltip />
        <el-table-column prop="status" label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="getStatusTagType(row.status)">
              {{ getStatusLabel(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="createTime" label="创建时间" width="180" />
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" size="small" @click="handleEdit(row)" :disabled="!hasEditPermission">
              编辑
            </el-button>
            <el-button type="info" size="small" @click="handleView(row)" :disabled="!hasViewPermission">
              查看
            </el-button>
            <el-button type="danger" size="small" @click="handleDelete(row)" :disabled="!hasDeletePermission">
              删除
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <!-- 分页 -->
      <div class="pagination-section">
        <el-pagination
          v-model:current-page="pagination.currentPage"
          v-model:page-size="pagination.pageSize"
          :page-sizes="[10, 20, 50, 100]"
          :total="pagination.total"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="handleSizeChange"
          @current-change="handleCurrentChange"
        />
      </div>
    </div>

    <!-- 新增/编辑对话框 -->
    <el-dialog
      v-model="dialogVisible"
      :title="dialogTitle"
      width="800px"
      :before-close="handleDialogClose"
    >
      <el-form
        ref="formRef"
        :model="formData"
        :rules="formRules"
        label-width="120px"
      >
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="供应商编码" prop="supplierCode">
              <el-input v-model="formData.supplierCode" placeholder="请输入供应商编码" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="供应商名称" prop="supplierName">
              <el-input v-model="formData.supplierName" placeholder="请输入供应商名称" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="供应商类型" prop="supplierType">
              <el-select v-model="formData.supplierType" placeholder="请选择供应商类型">
                <el-option label="原材料供应商" value="material" />
                <el-option label="仪器供应商" value="equipment" />
                <el-option label="服务供应商" value="service" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="状态" prop="status">
              <el-select v-model="formData.status" placeholder="请选择状态">
                <el-option label="正常" value="active" />
                <el-option label="暂停" value="suspended" />
                <el-option label="黑名单" value="blacklist" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="联系人" prop="contactPerson">
              <el-input v-model="formData.contactPerson" placeholder="请输入联系人" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="联系电话" prop="contactPhone">
              <el-input v-model="formData.contactPhone" placeholder="请输入联系电话" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-form-item label="地址" prop="address">
          <el-input v-model="formData.address" placeholder="请输入详细地址" />
        </el-form-item>
        <el-form-item label="备注">
          <el-input
            v-model="formData.remark"
            type="textarea"
            :rows="3"
            placeholder="请输入备注信息"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="handleDialogClose">取消</el-button>
          <el-button type="primary" @click="handleSubmit">确定</el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Search, Plus } from '@element-plus/icons-vue'
import { useUserStore } from '@/store/user'

const userStore = useUserStore()

// 权限控制
const hasAddPermission = computed(() => userStore.hasActionPermission('supplier:basic:add'))
const hasEditPermission = computed(() => userStore.hasActionPermission('supplier:basic:edit'))
const hasDeletePermission = computed(() => userStore.hasActionPermission('supplier:basic:delete'))
const hasViewPermission = computed(() => userStore.hasActionPermission('supplier:basic:view'))

/**
 * 响应式数据定义
 */
const loading = ref(false)
const dialogVisible = ref(false)
const dialogTitle = ref('')
const isEdit = ref(false)
const formRef = ref()

// 搜索表单
const searchForm = reactive({
  supplierName: '',
  supplierType: '',
  status: ''
})

// 表格数据
const tableData = ref([
  {
    id: 1,
    supplierCode: 'SP001',
    supplierName: '艾利丹尼森材料有限公司',
    supplierType: 'material',
    contactPerson: '张经理',
    contactPhone: '13800138001',
    address: '上海市浦东新区张江高科技园区',
    status: 'active',
    createTime: '2024-01-15 10:30:00'
  },
  {
    id: 2,
    supplierCode: 'SP002',
    supplierName: '海德堡印刷机械有限公司',
    supplierType: 'equipment',
    contactPerson: '李工程师',
    contactPhone: '13800138002',
    address: '北京市朝阳区工业园区',
    status: 'active',
    createTime: '2024-01-20 14:20:00'
  }
])

// 分页数据
const pagination = reactive({
  currentPage: 1,
  pageSize: 10,
  total: 2
})

// 表单数据
const formData = reactive({
  supplierCode: '',
  supplierName: '',
  supplierType: '',
  contactPerson: '',
  contactPhone: '',
  address: '',
  status: 'active',
  remark: ''
})

// 表单验证规则
const formRules = {
  supplierCode: [
    { required: true, message: '请输入供应商编码', trigger: 'blur' }
  ],
  supplierName: [
    { required: true, message: '请输入供应商名称', trigger: 'blur' }
  ],
  supplierType: [
    { required: true, message: '请选择供应商类型', trigger: 'change' }
  ],
  contactPerson: [
    { required: true, message: '请输入联系人', trigger: 'blur' }
  ],
  contactPhone: [
    { required: true, message: '请输入联系电话', trigger: 'blur' },
    { pattern: /^1[3-9]\d{9}$/, message: '请输入正确的手机号码', trigger: 'blur' }
  ],
  address: [
    { required: true, message: '请输入地址', trigger: 'blur' }
  ]
}

/**
 * 工具函数
 */
// 获取类型标签样式
const getTypeTagType = (type) => {
  const typeMap = {
    material: 'success',
    equipment: 'warning',
    service: 'info'
  }
  return typeMap[type] || ''
}

// 获取类型标签文本
const getTypeLabel = (type) => {
  const typeMap = {
    material: '原材料供应商',
    equipment: '仪器供应商',
    service: '服务供应商'
  }
  return typeMap[type] || type
}

// 获取状态标签样式
const getStatusTagType = (status) => {
  const statusMap = {
    active: 'success',
    suspended: 'warning',
    blacklist: 'danger'
  }
  return statusMap[status] || ''
}

// 获取状态标签文本
const getStatusLabel = (status) => {
  const statusMap = {
    active: '正常',
    suspended: '暂停',
    blacklist: '黑名单'
  }
  return statusMap[status] || status
}

/**
 * 事件处理函数
 */
// 搜索
const handleSearch = () => {
  console.log('搜索条件:', searchForm)
  // TODO: 实现搜索逻辑
}

// 重置搜索
const resetSearch = () => {
  Object.assign(searchForm, {
    supplierName: '',
    supplierType: '',
    status: ''
  })
  handleSearch()
}

// 新增
const handleAdd = () => {
  dialogTitle.value = '新增供应商'
  isEdit.value = false
  resetForm()
  dialogVisible.value = true
}

// 编辑
const handleEdit = (row) => {
  dialogTitle.value = '编辑供应商'
  isEdit.value = true
  Object.assign(formData, row)
  dialogVisible.value = true
}

// 查看
const handleView = (row) => {
  ElMessage.info('查看功能开发中...')
}

// 删除
const handleDelete = (row) => {
  ElMessageBox.confirm(
    `确定要删除供应商 "${row.supplierName}" 吗？`,
    '删除确认',
    {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    }
  ).then(() => {
    // TODO: 实现删除逻辑
    ElMessage.success('删除成功')
  })
}

// 分页大小改变
const handleSizeChange = (size) => {
  pagination.pageSize = size
  handleSearch()
}

// 当前页改变
const handleCurrentChange = (page) => {
  pagination.currentPage = page
  handleSearch()
}

// 关闭对话框
const handleDialogClose = () => {
  dialogVisible.value = false
  resetForm()
}

// 提交表单
const handleSubmit = () => {
  formRef.value.validate((valid) => {
    if (valid) {
      // TODO: 实现保存逻辑
      ElMessage.success(isEdit.value ? '更新成功' : '新增成功')
      handleDialogClose()
    }
  })
}

// 重置表单
const resetForm = () => {
  Object.assign(formData, {
    supplierCode: '',
    supplierName: '',
    supplierType: '',
    contactPerson: '',
    contactPhone: '',
    address: '',
    status: 'active',
    remark: ''
  })
  if (formRef.value) {
    formRef.value.clearValidate()
  }
}

/**
 * 生命周期钩子
 */
onMounted(() => {
  handleSearch()
})
</script>

<style scoped>
.supplier-basic-info {
  padding: 20px;
}

.page-header {
  margin-bottom: 20px;
}

.page-header h2 {
  margin: 0 0 8px 0;
  color: #303133;
}

.page-description {
  margin: 0;
  color: #909399;
  font-size: 14px;
}

.search-section {
  background: #fff;
  padding: 20px;
  border-radius: 4px;
  margin-bottom: 20px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.table-section {
  background: #fff;
  padding: 20px;
  border-radius: 4px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.pagination-section {
  margin-top: 20px;
  text-align: right;
}

.dialog-footer {
  text-align: right;
}
</style>