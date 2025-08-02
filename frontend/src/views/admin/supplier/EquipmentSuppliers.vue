<template>
  <div class="equipment-suppliers">
    <!-- 页面标题 -->
    <div class="page-header">
      <h2>仪器供应商管理</h2>
      <p class="page-description">管理印刷仪器、模切仪器、检测仪器等供应商信息</p>
    </div>

    <!-- 搜索和操作区域 -->
    <div class="search-section">
      <el-row :gutter="20">
        <el-col :span="5">
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
        <el-col :span="5">
          <el-select v-model="searchForm.equipmentType" placeholder="设备类型" clearable>
            <el-option label="印刷设备" value="printing" />
            <el-option label="模切设备" value="die_cutting" />
            <el-option label="检测设备" value="inspection" />
            <el-option label="复卷设备" value="rewinding" />
            <el-option label="分切设备" value="slitting" />
            <el-option label="包装设备" value="packaging" />
          </el-select>
        </el-col>
        <el-col :span="4">
          <el-select v-model="searchForm.serviceLevel" placeholder="服务等级" clearable>
            <el-option label="优秀" value="excellent" />
            <el-option label="良好" value="good" />
            <el-option label="一般" value="average" />
          </el-select>
        </el-col>
        <el-col :span="4">
          <el-select v-model="searchForm.status" placeholder="状态" clearable>
            <el-option label="合作中" value="active" />
            <el-option label="暂停合作" value="suspended" />
            <el-option label="终止合作" value="terminated" />
          </el-select>
        </el-col>
        <el-col :span="6">
          <el-button type="primary" @click="handleSearch">
            <el-icon><Search /></el-icon>
            搜索
          </el-button>
          <el-button @click="resetSearch">重置</el-button>
          <el-button type="success" @click="handleAdd">
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
        <el-table-column prop="equipmentType" label="主要设备类型" width="120">
          <template #default="{ row }">
            <el-tag :type="getEquipmentTypeTagType(row.equipmentType)">
              {{ getEquipmentTypeLabel(row.equipmentType) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="brands" label="代理品牌" width="150" show-overflow-tooltip />
        <el-table-column prop="serviceLevel" label="服务等级" width="100">
          <template #default="{ row }">
            <el-rate
              v-model="row.serviceLevel"
              disabled
              show-score
              text-color="#ff9900"
              score-template="{value}星"
            />
          </template>
        </el-table-column>
        <el-table-column prop="responseTime" label="响应时间" width="100">
          <template #default="{ row }">
            {{ row.responseTime }}小时
          </template>
        </el-table-column>
        <el-table-column prop="warrantyPeriod" label="保修期" width="100">
          <template #default="{ row }">
            {{ row.warrantyPeriod }}年
          </template>
        </el-table-column>
        <el-table-column prop="lastServiceDate" label="最近服务" width="120" />
        <el-table-column prop="status" label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="getStatusTagType(row.status)">
              {{ getStatusLabel(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="220" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" size="small" @click="handleEdit(row)">
              编辑
            </el-button>
            <el-button type="info" size="small" @click="handleViewEquipments(row)">
              设备清单
            </el-button>
            <el-button type="warning" size="small" @click="handleServiceRecord(row)">
              服务记录
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
      width="900px"
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
            <el-form-item label="主要设备类型" prop="equipmentType">
              <el-select v-model="formData.equipmentType" placeholder="请选择主要设备类型">
                <el-option label="印刷设备" value="printing" />
                <el-option label="模切设备" value="die_cutting" />
                <el-option label="检测设备" value="inspection" />
                <el-option label="复卷设备" value="rewinding" />
                <el-option label="分切设备" value="slitting" />
                <el-option label="包装设备" value="packaging" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="代理品牌" prop="brands">
              <el-input v-model="formData.brands" placeholder="如：海德堡、小森等" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="服务等级" prop="serviceLevel">
              <el-rate v-model="formData.serviceLevel" show-text />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="响应时间" prop="responseTime">
              <el-input-number v-model="formData.responseTime" :min="1" :max="72">
                <template #append>小时</template>
              </el-input-number>
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="保修期" prop="warrantyPeriod">
              <el-input-number v-model="formData.warrantyPeriod" :min="1" :max="10">
                <template #append>年</template>
              </el-input-number>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="技术支持" prop="technicalSupport">
              <el-select v-model="formData.technicalSupport" placeholder="请选择技术支持类型">
                <el-option label="24小时在线" value="24h_online" />
                <el-option label="工作时间支持" value="business_hours" />
                <el-option label="预约服务" value="appointment" />
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
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Search, Plus } from '@element-plus/icons-vue'

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
  equipmentType: '',
  serviceLevel: '',
  status: ''
})

// 表格数据
const tableData = ref([
  {
    id: 1,
    supplierCode: 'EQ001',
    supplierName: '海德堡印刷机械有限公司',
    equipmentType: 'printing',
    brands: '海德堡、KBA',
    serviceLevel: 5,
    responseTime: 4,
    warrantyPeriod: 2,
    technicalSupport: '24h_online',
    lastServiceDate: '2024-07-15',
    contactPerson: '李工程师',
    contactPhone: '13800138001',
    address: '北京市朝阳区工业园区',
    status: 'active'
  },
  {
    id: 2,
    supplierCode: 'EQ002',
    supplierName: '博斯特模切设备有限公司',
    equipmentType: 'die_cutting',
    brands: '博斯特、永发',
    serviceLevel: 4,
    responseTime: 8,
    warrantyPeriod: 1,
    technicalSupport: 'business_hours',
    lastServiceDate: '2024-07-20',
    contactPerson: '王技师',
    contactPhone: '13800138002',
    address: '上海市松江区工业园区',
    status: 'active'
  },
  {
    id: 3,
    supplierCode: 'EQ003',
    supplierName: '基恩士检测设备有限公司',
    equipmentType: 'inspection',
    brands: '基恩士、欧姆龙',
    serviceLevel: 5,
    responseTime: 2,
    warrantyPeriod: 3,
    technicalSupport: '24h_online',
    lastServiceDate: '2024-07-25',
    contactPerson: '张工',
    contactPhone: '13800138003',
    address: '广东省深圳市南山区',
    status: 'active'
  }
])

// 分页数据
const pagination = reactive({
  currentPage: 1,
  pageSize: 10,
  total: 3
})

// 表单数据
const formData = reactive({
  supplierCode: '',
  supplierName: '',
  equipmentType: '',
  brands: '',
  serviceLevel: 3,
  responseTime: 8,
  warrantyPeriod: 1,
  technicalSupport: '',
  contactPerson: '',
  contactPhone: '',
  address: '',
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
  equipmentType: [
    { required: true, message: '请选择主要设备类型', trigger: 'change' }
  ],
  brands: [
    { required: true, message: '请输入代理品牌', trigger: 'blur' }
  ],
  responseTime: [
    { required: true, message: '请输入响应时间', trigger: 'blur' }
  ],
  warrantyPeriod: [
    { required: true, message: '请输入保修期', trigger: 'blur' }
  ],
  contactPerson: [
    { required: true, message: '请输入联系人', trigger: 'blur' }
  ],
  contactPhone: [
    { required: true, message: '请输入联系电话', trigger: 'blur' }
  ]
}

/**
 * 工具函数
 */
// 获取设备类型标签样式
const getEquipmentTypeTagType = (type) => {
  const typeMap = {
    printing: 'success',
    die_cutting: 'warning',
    inspection: 'info',
    rewinding: 'danger',
    slitting: '',
    packaging: 'success'
  }
  return typeMap[type] || ''
}

// 获取设备类型标签文本
const getEquipmentTypeLabel = (type) => {
  const typeMap = {
    printing: '印刷设备',
    die_cutting: '模切设备',
    inspection: '检测设备',
    rewinding: '复卷设备',
    slitting: '分切设备',
    packaging: '包装设备'
  }
  return typeMap[type] || type
}

// 获取状态标签样式
const getStatusTagType = (status) => {
  const statusMap = {
    active: 'success',
    suspended: 'warning',
    terminated: 'danger'
  }
  return statusMap[status] || ''
}

// 获取状态标签文本
const getStatusLabel = (status) => {
  const statusMap = {
    active: '合作中',
    suspended: '暂停合作',
    terminated: '终止合作'
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
    equipmentType: '',
    serviceLevel: '',
    status: ''
  })
  handleSearch()
}

// 新增
const handleAdd = () => {
  dialogTitle.value = '新增仪器供应商'
  isEdit.value = false
  resetForm()
  dialogVisible.value = true
}

// 编辑
const handleEdit = (row) => {
  dialogTitle.value = '编辑仪器供应商'
  isEdit.value = true
  Object.assign(formData, row)
  dialogVisible.value = true
}

// 查看设备清单
const handleViewEquipments = (row) => {
  ElMessage.info('设备清单功能开发中...')
}

// 服务记录
const handleServiceRecord = (row) => {
  ElMessage.info('服务记录功能开发中...')
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
    equipmentType: '',
    brands: '',
    serviceLevel: 3,
    responseTime: 8,
    warrantyPeriod: 1,
    technicalSupport: '',
    contactPerson: '',
    contactPhone: '',
    address: '',
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
.equipment-suppliers {
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