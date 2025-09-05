<template>
  <div class="qualified-suppliers">
    <!-- 页面标题 -->
    <div class="page-header">
      <h2>合格供应商清单</h2>
      <p class="page-description">管理通过审核的合格供应商清单及资质状态</p>
    </div>

    <!-- 统计卡片 -->
    <div class="stats-section">
      <el-row :gutter="20">
        <el-col :span="6">
          <el-card class="stats-card">
            <div class="stats-content">
              <div class="stats-icon qualified">
                <el-icon><CircleCheck /></el-icon>
              </div>
              <div class="stats-info">
                <div class="stats-value">{{ supplierStats.qualified }}</div>
                <div class="stats-label">合格供应商</div>
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
                <div class="stats-value">{{ supplierStats.expiring }}</div>
                <div class="stats-label">即将到期</div>
              </div>
            </div>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card class="stats-card">
            <div class="stats-content">
              <div class="stats-icon suspended">
                <el-icon><CircleCloseFilled /></el-icon>
              </div>
              <div class="stats-info">
                <div class="stats-value">{{ supplierStats.suspended }}</div>
                <div class="stats-label">暂停合作</div>
              </div>
            </div>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card class="stats-card">
            <div class="stats-content">
              <div class="stats-icon total">
                <el-icon><Document /></el-icon>
              </div>
              <div class="stats-info">
                <div class="stats-value">{{ supplierStats.total }}</div>
                <div class="stats-label">总数</div>
              </div>
            </div>
          </el-card>
        </el-col>
      </el-row>
    </div>

    <!-- 搜索操作区域 -->
    <div class="search-section">
      <el-form :model="searchForm" inline>
        <el-form-item label="供应商名称">
          <el-input
            v-model="searchForm.supplierName"
            placeholder="请输入供应商名称"
            clearable
            style="width: 200px"
          />
        </el-form-item>
        <el-form-item label="供应商类型">
          <el-select
            v-model="searchForm.supplierType"
            placeholder="请选择供应商类型"
            clearable
            style="width: 150px"
          >
            <el-option label="原材料供应商" value="material" />
            <el-option label="仪器供应商" value="equipment" />
            <el-option label="服务供应商" value="service" />
          </el-select>
        </el-form-item>
        <el-form-item label="资质状态">
          <el-select
            v-model="searchForm.qualificationStatus"
            placeholder="请选择资质状态"
            clearable
            style="width: 150px"
          >
            <el-option label="有效" value="valid" />
            <el-option label="即将到期" value="expiring" />
            <el-option label="已过期" value="expired" />
          </el-select>
        </el-form-item>
        <el-form-item label="合作状态">
          <el-select
            v-model="searchForm.cooperationStatus"
            placeholder="请选择合作状态"
            clearable
            style="width: 150px"
          >
            <el-option label="正常合作" value="active" />
            <el-option label="暂停合作" value="suspended" />
            <el-option label="终止合作" value="terminated" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleSearch">
            <el-icon><Search /></el-icon>
            搜索
          </el-button>
          <el-button @click="handleReset">重置</el-button>
          <el-button type="success" @click="handleAdd">
            <el-icon><Plus /></el-icon>
            添加合格供应商
          </el-button>
        </el-form-item>
      </el-form>
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
        <el-table-column prop="supplierName" label="供应商名称" min-width="200" />
        <el-table-column prop="supplierType" label="供应商类型" width="120">
          <template #default="{ row }">
            <el-tag :type="getTypeTagType(row.supplierType)">
              {{ getTypeLabel(row.supplierType) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="qualificationLevel" label="资质等级" width="100">
          <template #default="{ row }">
            <el-tag :type="getLevelTagType(row.qualificationLevel)">
              {{ getLevelLabel(row.qualificationLevel) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="certifications" label="认证证书" min-width="180" />
        <el-table-column prop="qualificationExpiry" label="资质到期日" width="120">
          <template #default="{ row }">
            <span :class="getExpiryClass(row.qualificationExpiry)">
              {{ row.qualificationExpiry }}
            </span>
          </template>
        </el-table-column>
        <el-table-column prop="lastAuditDate" label="最近审核日期" width="120" />
        <el-table-column prop="cooperationStatus" label="合作状态" width="100">
          <template #default="{ row }">
            <el-tag :type="getStatusTagType(row.cooperationStatus)">
              {{ getStatusLabel(row.cooperationStatus) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="contactPerson" label="联系人" width="100" />
        <el-table-column prop="contactPhone" label="联系电话" width="130" />
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" size="small" @click="handleEdit(row)">编辑</el-button>
            <el-button type="warning" size="small" @click="handleSuspend(row)" v-if="row.cooperationStatus === 'active'">暂停</el-button>
            <el-button type="success" size="small" @click="handleActivate(row)" v-if="row.cooperationStatus === 'suspended'">恢复</el-button>
            <el-button type="danger" size="small" @click="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>

      <!-- 分页 -->
      <div class="pagination-section">
        <el-pagination
          v-model:current-page="currentPage"
          v-model:page-size="pageSize"
          :page-sizes="[10, 20, 50, 100]"
          :total="total"
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
      @close="handleDialogClose"
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
              <el-select v-model="formData.supplierType" placeholder="请选择供应商类型" style="width: 100%">
                <el-option label="原材料供应商" value="material" />
                <el-option label="仪器供应商" value="equipment" />
                <el-option label="服务供应商" value="service" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="资质等级" prop="qualificationLevel">
              <el-select v-model="formData.qualificationLevel" placeholder="请选择资质等级" style="width: 100%">
                <el-option label="A级" value="A" />
                <el-option label="B级" value="B" />
                <el-option label="C级" value="C" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
        
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="认证证书" prop="certifications">
              <el-input v-model="formData.certifications" placeholder="如：ISO9001、FSC等" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="资质到期日" prop="qualificationExpiry">
              <el-date-picker
                v-model="formData.qualificationExpiry"
                type="date"
                placeholder="请选择资质到期日期"
                format="YYYY-MM-DD"
                value-format="YYYY-MM-DD"
                style="width: 100%"
              />
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
        
        <el-form-item label="合作状态" prop="cooperationStatus">
          <el-radio-group v-model="formData.cooperationStatus">
            <el-radio value="active">正常合作</el-radio>
              <el-radio value="suspended">暂停合作</el-radio>
              <el-radio value="terminated">终止合作</el-radio>
          </el-radio-group>
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
import { Search, Plus, CircleCheck, Warning, CircleCloseFilled, Document } from '@element-plus/icons-vue'

/**
 * 响应式数据定义
 */
const loading = ref(false)
const dialogVisible = ref(false)
const dialogTitle = ref('')
const isEdit = ref(false)
const formRef = ref()

// 供应商统计数据
const supplierStats = reactive({
  qualified: 45,
  expiring: 8,
  suspended: 3,
  total: 56
})

// 搜索表单
const searchForm = reactive({
  supplierName: '',
  supplierType: '',
  qualificationStatus: '',
  cooperationStatus: ''
})

// 分页数据
const currentPage = ref(1)
const pageSize = ref(20)
const total = ref(0)

// 表格数据
const tableData = ref([
  {
    id: 1,
    supplierCode: 'QS001',
    supplierName: '艾利丹尼森材料有限公司',
    supplierType: 'material',
    qualificationLevel: 'A',
    certifications: 'ISO9001、FSC、PEFC',
    qualificationExpiry: '2025-06-30',
    lastAuditDate: '2024-06-15',
    cooperationStatus: 'active',
    contactPerson: '张经理',
    contactPhone: '13800138001',
    address: '上海市浦东新区张江高科技园区'
  },
  {
    id: 2,
    supplierCode: 'QS002',
    supplierName: '汉高胶粘剂技术有限公司',
    supplierType: 'material',
    qualificationLevel: 'A',
    certifications: 'ISO9001、ISO14001',
    qualificationExpiry: '2024-12-31',
    lastAuditDate: '2024-07-20',
    cooperationStatus: 'active',
    contactPerson: '李工程师',
    contactPhone: '13800138002',
    address: '广东省东莞市松山湖高新技术产业开发区'
  },
  {
    id: 3,
    supplierCode: 'QS003',
    supplierName: '海德堡印刷机械有限公司',
    supplierType: 'equipment',
    qualificationLevel: 'A',
    certifications: 'ISO9001、CE认证',
    qualificationExpiry: '2025-03-15',
    lastAuditDate: '2024-03-10',
    cooperationStatus: 'active',
    contactPerson: '王技师',
    contactPhone: '13800138003',
    address: '北京市朝阳区工业园区'
  },
  {
    id: 4,
    supplierCode: 'QS004',
    supplierName: '博斯特模切设备有限公司',
    supplierType: 'equipment',
    qualificationLevel: 'B',
    certifications: 'ISO9001',
    qualificationExpiry: '2024-11-20',
    lastAuditDate: '2024-05-15',
    cooperationStatus: 'suspended',
    contactPerson: '赵主管',
    contactPhone: '13800138004',
    address: '江苏省苏州市工业园区'
  }
])

// 表单数据
const formData = reactive({
  supplierCode: '',
  supplierName: '',
  supplierType: '',
  qualificationLevel: '',
  certifications: '',
  qualificationExpiry: '',
  contactPerson: '',
  contactPhone: '',
  address: '',
  cooperationStatus: 'active',
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
  qualificationLevel: [
    { required: true, message: '请选择资质等级', trigger: 'change' }
  ],
  contactPerson: [
    { required: true, message: '请输入联系人', trigger: 'blur' }
  ],
  contactPhone: [
    { required: true, message: '请输入联系电话', trigger: 'blur' },
    { pattern: /^1[3-9]\d{9}$/, message: '请输入正确的手机号码', trigger: 'blur' }
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
    material: '原材料',
    equipment: '设备',
    service: '服务'
  }
  return typeMap[type] || type
}

// 获取等级标签样式
const getLevelTagType = (level) => {
  const levelMap = {
    A: 'success',
    B: 'warning',
    C: 'info'
  }
  return levelMap[level] || ''
}

// 获取等级标签文本
const getLevelLabel = (level) => {
  return level + '级'
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
    active: '正常合作',
    suspended: '暂停合作',
    terminated: '终止合作'
  }
  return statusMap[status] || status
}

// 获取到期日期样式
const getExpiryClass = (expiryDate) => {
  const today = new Date()
  const expiry = new Date(expiryDate)
  const diffTime = expiry - today
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  
  if (diffDays < 0) {
    return 'date-expired'
  } else if (diffDays <= 30) {
    return 'date-expiring'
  } else {
    return 'date-normal'
  }
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
const handleReset = () => {
  Object.keys(searchForm).forEach(key => {
    searchForm[key] = ''
  })
  handleSearch()
}

// 新增
const handleAdd = () => {
  dialogTitle.value = '添加合格供应商'
  isEdit.value = false
  resetForm()
  dialogVisible.value = true
}

// 编辑
const handleEdit = (row) => {
  dialogTitle.value = '编辑合格供应商'
  isEdit.value = true
  Object.keys(formData).forEach(key => {
    if (row[key] !== undefined) {
      formData[key] = row[key]
    }
  })
  dialogVisible.value = true
}

// 暂停合作
const handleSuspend = (row) => {
  ElMessageBox.confirm(
    `确定要暂停与"${row.supplierName}"的合作吗？`,
    '确认暂停',
    {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    }
  ).then(() => {
    // TODO: 实现暂停逻辑
    row.cooperationStatus = 'suspended'
    ElMessage.success('暂停成功')
  })
}

// 恢复合作
const handleActivate = (row) => {
  ElMessageBox.confirm(
    `确定要恢复与"${row.supplierName}"的合作吗？`,
    '确认恢复',
    {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'success'
    }
  ).then(() => {
    // TODO: 实现恢复逻辑
    row.cooperationStatus = 'active'
    ElMessage.success('恢复成功')
  })
}

// 删除
const handleDelete = (row) => {
  ElMessageBox.confirm(
    `确定要删除供应商"${row.supplierName}"吗？此操作不可恢复！`,
    '确认删除',
    {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'error'
    }
  ).then(() => {
    // TODO: 实现删除逻辑
    const index = tableData.value.findIndex(item => item.id === row.id)
    if (index > -1) {
      tableData.value.splice(index, 1)
    }
    ElMessage.success('删除成功')
  })
}

// 分页大小改变
const handleSizeChange = (val) => {
  pageSize.value = val
  // TODO: 重新加载数据
}

// 当前页改变
const handleCurrentChange = (val) => {
  currentPage.value = val
  // TODO: 重新加载数据
}

// 对话框关闭
const handleDialogClose = () => {
  dialogVisible.value = false
  resetForm()
}

// 提交表单
const handleSubmit = () => {
  formRef.value.validate((valid) => {
    if (valid) {
      // TODO: 实现提交逻辑
      console.log('提交数据:', formData)
      ElMessage.success(isEdit.value ? '更新成功' : '添加成功')
      handleDialogClose()
    }
  })
}

// 重置表单
const resetForm = () => {
  Object.keys(formData).forEach(key => {
    if (key === 'cooperationStatus') {
      formData[key] = 'active'
    } else {
      formData[key] = ''
    }
  })
  if (formRef.value) {
    formRef.value.clearValidate()
  }
}

/**
 * 生命周期钩子
 */
onMounted(() => {
  // 初始化数据
  total.value = tableData.value.length
})
</script>

<style scoped>
.qualified-suppliers {
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
  transition: all 0.3s;
}

.stats-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
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

.stats-icon.qualified {
  background: linear-gradient(135deg, #67c23a, #85ce61);
}

.stats-icon.expiring {
  background: linear-gradient(135deg, #e6a23c, #f0a020);
}

.stats-icon.suspended {
  background: linear-gradient(135deg, #f56c6c, #f78989);
}

.stats-icon.total {
  background: linear-gradient(135deg, #409eff, #66b1ff);
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