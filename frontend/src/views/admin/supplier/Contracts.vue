<template>
  <div class="supplier-contracts">
    <!-- 页面标题 -->
    <div class="page-header">
      <h2>供应商合同管理</h2>
      <p class="page-description">供应商合同签订、续签、变更、终止等全生命周期管理</p>
    </div>

    <!-- 统计卡片 -->
    <div class="stats-section">
      <el-row :gutter="20">
        <el-col :span="6">
          <el-card class="stats-card">
            <div class="stats-content">
              <div class="stats-icon active">
                <el-icon><Document /></el-icon>
              </div>
              <div class="stats-info">
                <div class="stats-value">{{ contractStats.active }}</div>
                <div class="stats-label">有效合同</div>
              </div>
            </div>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card class="stats-card">
            <div class="stats-content">
              <div class="stats-icon expiring">
                <el-icon><Warning /></el-icon>
              </div>
              <div class="stats-info">
                <div class="stats-value">{{ contractStats.expiring }}</div>
                <div class="stats-label">即将到期</div>
              </div>
            </div>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card class="stats-card">
            <div class="stats-content">
              <div class="stats-icon expired">
                <el-icon><CircleCloseFilled /></el-icon>
              </div>
              <div class="stats-info">
                <div class="stats-value">{{ contractStats.expired }}</div>
                <div class="stats-label">已过期</div>
              </div>
            </div>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card class="stats-card">
            <div class="stats-content">
              <div class="stats-icon total">
                <el-icon><Files /></el-icon>
              </div>
              <div class="stats-info">
                <div class="stats-value">{{ contractStats.total }}</div>
                <div class="stats-label">合同总数</div>
              </div>
            </div>
          </el-card>
        </el-col>
      </el-row>
    </div>

    <!-- 搜索和操作区域 -->
    <div class="search-section">
      <el-row :gutter="20">
        <el-col :span="5">
          <el-input
            v-model="searchForm.contractNumber"
            placeholder="请输入合同编号"
            clearable
            @keyup.enter="handleSearch"
          >
            <template #prefix>
              <el-icon><Search /></el-icon>
            </template>
          </el-input>
        </el-col>
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
        <el-col :span="4">
          <el-select v-model="searchForm.contractStatus" placeholder="合同状态" clearable>
            <el-option label="有效" value="active" />
            <el-option label="即将到期" value="expiring" />
            <el-option label="已过期" value="expired" />
            <el-option label="已终止" value="terminated" />
          </el-select>
        </el-col>
        <el-col :span="4">
          <el-select v-model="searchForm.contractType" placeholder="合同类型" clearable>
            <el-option label="采购合同" value="purchase" />
            <el-option label="服务合同" value="service" />
            <el-option label="框架协议" value="framework" />
            <el-option label="保密协议" value="nda" />
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
            新增合同
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
        <el-table-column prop="contractNumber" label="合同编号" width="150" />
        <el-table-column prop="supplierName" label="供应商名称" width="180" />
        <el-table-column prop="contractName" label="合同名称" min-width="200" show-overflow-tooltip />
        <el-table-column prop="contractType" label="合同类型" width="100">
          <template #default="{ row }">
            <el-tag :type="getContractTypeTagType(row.contractType)">
              {{ getContractTypeLabel(row.contractType) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="contractAmount" label="合同金额" width="120">
          <template #default="{ row }">
            <span class="amount-text">¥{{ formatAmount(row.contractAmount) }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="signDate" label="签订日期" width="120" />
        <el-table-column prop="startDate" label="生效日期" width="120" />
        <el-table-column prop="endDate" label="到期日期" width="120">
          <template #default="{ row }">
            <span :class="getDateClass(row.endDate)">{{ row.endDate }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="contractStatus" label="合同状态" width="100">
          <template #default="{ row }">
            <el-tag :type="getContractStatusTagType(row.contractStatus)">
              {{ getContractStatusLabel(row.contractStatus) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="responsiblePerson" label="负责人" width="100" />
        <el-table-column label="操作" width="250" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" size="small" @click="handleEdit(row)">
              编辑
            </el-button>
            <el-button type="info" size="small" @click="handleView(row)">
              查看
            </el-button>
            <el-button type="warning" size="small" @click="handleRenew(row)" v-if="row.contractStatus === 'expiring'">
              续签
            </el-button>
            <el-button type="danger" size="small" @click="handleTerminate(row)" v-if="row.contractStatus === 'active'">
              终止
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
            <el-form-item label="合同编号" prop="contractNumber">
              <el-input v-model="formData.contractNumber" placeholder="请输入合同编号" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="供应商" prop="supplierId">
              <el-select v-model="formData.supplierId" placeholder="请选择供应商" filterable>
                <el-option
                  v-for="supplier in supplierOptions"
                  :key="supplier.id"
                  :label="supplier.name"
                  :value="supplier.id"
                />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="合同名称" prop="contractName">
              <el-input v-model="formData.contractName" placeholder="请输入合同名称" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="合同类型" prop="contractType">
              <el-select v-model="formData.contractType" placeholder="请选择合同类型">
                <el-option label="采购合同" value="purchase" />
                <el-option label="服务合同" value="service" />
                <el-option label="框架协议" value="framework" />
                <el-option label="保密协议" value="nda" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="合同金额" prop="contractAmount">
              <el-input-number v-model="formData.contractAmount" :min="0" :precision="2" style="width: 100%">
                <template #prepend>¥</template>
              </el-input-number>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="负责人" prop="responsiblePerson">
              <el-input v-model="formData.responsiblePerson" placeholder="请输入负责人" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="8">
            <el-form-item label="签订日期" prop="signDate">
              <el-date-picker
                v-model="formData.signDate"
                type="date"
                placeholder="请选择签订日期"
                format="YYYY-MM-DD"
                value-format="YYYY-MM-DD"
                style="width: 100%"
              />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="生效日期" prop="startDate">
              <el-date-picker
                v-model="formData.startDate"
                type="date"
                placeholder="请选择生效日期"
                format="YYYY-MM-DD"
                value-format="YYYY-MM-DD"
                style="width: 100%"
              />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="到期日期" prop="endDate">
              <el-date-picker
                v-model="formData.endDate"
                type="date"
                placeholder="请选择到期日期"
                format="YYYY-MM-DD"
                value-format="YYYY-MM-DD"
                style="width: 100%"
              />
            </el-form-item>
          </el-col>
        </el-row>
        
        <el-form-item label="合同条款">
          <el-input
            v-model="formData.contractTerms"
            type="textarea"
            :rows="4"
            placeholder="请输入主要合同条款"
          />
        </el-form-item>
        <el-form-item label="备注">
          <el-input
            v-model="formData.remark"
            type="textarea"
            :rows="2"
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
import { Search, Plus, Document, Warning, CircleCloseFilled, Files } from '@element-plus/icons-vue'

/**
 * 响应式数据定义
 */
const loading = ref(false)
const dialogVisible = ref(false)
const dialogTitle = ref('')
const isEdit = ref(false)
const formRef = ref()

// 合同统计数据
const contractStats = reactive({
  active: 28,
  expiring: 5,
  expired: 3,
  total: 36
})

// 搜索表单
const searchForm = reactive({
  contractNumber: '',
  supplierName: '',
  contractStatus: '',
  contractType: ''
})

// 供应商选项
const supplierOptions = ref([
  { id: 1, name: '艾利丹尼森材料有限公司' },
  { id: 2, name: '汉高胶粘剂技术有限公司' },
  { id: 3, name: '海德堡印刷机械有限公司' },
  { id: 4, name: '博斯特模切设备有限公司' },
  { id: 5, name: '富林特油墨集团' }
])

// 表格数据
const tableData = ref([
  {
    id: 1,
    contractNumber: 'CT2024001',
    supplierId: 1,
    supplierName: '艾利丹尼森材料有限公司',
    contractName: '不干胶材料年度采购合同',
    contractType: 'purchase',
    contractAmount: 2500000,
    signDate: '2024-01-15',
    startDate: '2024-02-01',
    endDate: '2025-01-31',
    contractStatus: 'active',
    responsiblePerson: '张经理',
    contractTerms: '年度采购不干胶材料，包含面材、胶水、底纸等'
  },
  {
    id: 2,
    contractNumber: 'CT2024002',
    supplierId: 2,
    supplierName: '汉高胶粘剂技术有限公司',
    contractName: '胶粘剂供应框架协议',
    contractType: 'framework',
    contractAmount: 800000,
    signDate: '2024-03-10',
    startDate: '2024-04-01',
    endDate: '2024-12-31',
    contractStatus: 'expiring',
    responsiblePerson: '李主管',
    contractTerms: '胶粘剂产品供应框架协议，按需下单'
  },
  {
    id: 3,
    contractNumber: 'CT2024003',
    supplierId: 3,
    supplierName: '海德堡印刷机械有限公司',
    contractName: '印刷设备维护服务合同',
    contractType: 'service',
    contractAmount: 150000,
    signDate: '2024-05-20',
    startDate: '2024-06-01',
    endDate: '2025-05-31',
    contractStatus: 'active',
    responsiblePerson: '王工程师',
    contractTerms: '印刷设备年度维护保养服务'
  },
  {
    id: 4,
    contractNumber: 'CT2023015',
    supplierId: 4,
    supplierName: '博斯特模切设备有限公司',
    contractName: '模切设备采购合同',
    contractType: 'purchase',
    contractAmount: 1200000,
    signDate: '2023-08-15',
    startDate: '2023-09-01',
    endDate: '2024-08-31',
    contractStatus: 'expired',
    responsiblePerson: '赵总监',
    contractTerms: '模切设备采购及安装调试'
  }
])

// 分页数据
const pagination = reactive({
  currentPage: 1,
  pageSize: 10,
  total: 4
})

// 表单数据
const formData = reactive({
  contractNumber: '',
  supplierId: '',
  contractName: '',
  contractType: '',
  contractAmount: 0,
  responsiblePerson: '',
  signDate: '',
  startDate: '',
  endDate: '',
  contractTerms: '',
  remark: ''
})

// 表单验证规则
const formRules = {
  contractNumber: [
    { required: true, message: '请输入合同编号', trigger: 'blur' }
  ],
  supplierId: [
    { required: true, message: '请选择供应商', trigger: 'change' }
  ],
  contractName: [
    { required: true, message: '请输入合同名称', trigger: 'blur' }
  ],
  contractType: [
    { required: true, message: '请选择合同类型', trigger: 'change' }
  ],
  contractAmount: [
    { required: true, message: '请输入合同金额', trigger: 'blur' }
  ],
  responsiblePerson: [
    { required: true, message: '请输入负责人', trigger: 'blur' }
  ],
  signDate: [
    { required: true, message: '请选择签订日期', trigger: 'change' }
  ],
  startDate: [
    { required: true, message: '请选择生效日期', trigger: 'change' }
  ],
  endDate: [
    { required: true, message: '请选择到期日期', trigger: 'change' }
  ]
}

/**
 * 工具函数
 */
// 格式化金额
const formatAmount = (amount) => {
  return new Intl.NumberFormat('zh-CN').format(amount)
}

// 获取合同类型标签样式
const getContractTypeTagType = (type) => {
  const typeMap = {
    purchase: 'success',
    service: 'warning',
    framework: 'info',
    nda: 'danger'
  }
  return typeMap[type] || ''
}

// 获取合同类型标签文本
const getContractTypeLabel = (type) => {
  const typeMap = {
    purchase: '采购合同',
    service: '服务合同',
    framework: '框架协议',
    nda: '保密协议'
  }
  return typeMap[type] || type
}

// 获取合同状态标签样式
const getContractStatusTagType = (status) => {
  const statusMap = {
    active: 'success',
    expiring: 'warning',
    expired: 'danger',
    terminated: 'info'
  }
  return statusMap[status] || ''
}

// 获取合同状态标签文本
const getContractStatusLabel = (status) => {
  const statusMap = {
    active: '有效',
    expiring: '即将到期',
    expired: '已过期',
    terminated: '已终止'
  }
  return statusMap[status] || status
}

// 获取日期样式类
const getDateClass = (endDate) => {
  const today = new Date()
  const end = new Date(endDate)
  const diffTime = end - today
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  
  if (diffDays < 0) return 'date-expired'
  if (diffDays <= 30) return 'date-expiring'
  return 'date-normal'
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
    contractNumber: '',
    supplierName: '',
    contractStatus: '',
    contractType: ''
  })
  handleSearch()
}

// 新增
const handleAdd = () => {
  dialogTitle.value = '新增合同'
  isEdit.value = false
  resetForm()
  dialogVisible.value = true
}

// 编辑
const handleEdit = (row) => {
  dialogTitle.value = '编辑合同'
  isEdit.value = true
  Object.assign(formData, row)
  dialogVisible.value = true
}

// 查看
const handleView = (row) => {
  ElMessage.info('查看合同详情功能开发中...')
}

// 续签
const handleRenew = (row) => {
  ElMessageBox.confirm(
    `确定要续签合同 "${row.contractName}" 吗？`,
    '续签确认',
    {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    }
  ).then(() => {
    // TODO: 实现续签逻辑
    ElMessage.success('续签成功')
  })
}

// 终止
const handleTerminate = (row) => {
  ElMessageBox.confirm(
    `确定要终止合同 "${row.contractName}" 吗？此操作不可逆！`,
    '终止确认',
    {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    }
  ).then(() => {
    // TODO: 实现终止逻辑
    ElMessage.success('合同已终止')
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
    contractNumber: '',
    supplierId: '',
    contractName: '',
    contractType: '',
    contractAmount: 0,
    responsiblePerson: '',
    signDate: '',
    startDate: '',
    endDate: '',
    contractTerms: '',
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
.supplier-contracts {
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

.stats-section {
  margin-bottom: 20px;
}

.stats-card {
  border-radius: 8px;
  overflow: hidden;
}

.stats-content {
  display: flex;
  align-items: center;
  padding: 10px;
}

.stats-icon {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 15px;
  font-size: 24px;
  color: white;
}

.stats-icon.active {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.stats-icon.expiring {
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
}

.stats-icon.expired {
  background: linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%);
}

.stats-icon.total {
  background: linear-gradient(135deg, #a8edea 0%, #fed6e3 100%);
}

.stats-info {
  flex: 1;
}

.stats-value {
  font-size: 28px;
  font-weight: bold;
  color: #303133;
  line-height: 1;
}

.stats-label {
  font-size: 14px;
  color: #909399;
  margin-top: 5px;
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

.amount-text {
  color: #67c23a;
  font-weight: bold;
}

.date-normal {
  color: #303133;
}

.date-expiring {
  color: #e6a23c;
  font-weight: bold;
}

.date-expired {
  color: #f56c6c;
  font-weight: bold;
}
</style>