<template>
  <div class="material-suppliers">
    <!-- 页面标题 -->
    <div class="page-header">
      <h2>原材料供应商管理</h2>
      <p class="page-description">管理面材、胶水、底纸、油墨等原材料供应商信息</p>
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
          <el-select v-model="searchForm.materialType" placeholder="材料类型" clearable>
            <el-option label="面材" value="face_material" />
            <el-option label="胶水" value="adhesive" />
            <el-option label="底纸" value="liner" />
            <el-option label="油墨" value="ink" />
            <el-option label="溶剂" value="solvent" />
            <el-option label="清洗剂" value="cleaner" />
          </el-select>
        </el-col>
        <el-col :span="4">
          <el-select v-model="searchForm.qualityLevel" placeholder="质量等级" clearable>
            <el-option label="A级" value="A" />
            <el-option label="B级" value="B" />
            <el-option label="C级" value="C" />
          </el-select>
        </el-col>
        <el-col :span="4">
          <el-select v-model="searchForm.status" placeholder="状态" clearable>
            <el-option label="合格" value="qualified" />
            <el-option label="待审核" value="pending" />
            <el-option label="不合格" value="unqualified" />
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
        <el-table-column prop="supplierName" label="供应商名称" width="180" />
        <el-table-column prop="materialType" label="主要材料类型" width="120">
          <template #default="{ row }">
            <el-tag :type="getMaterialTypeTagType(row.materialType)">
              {{ getMaterialTypeLabel(row.materialType) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="qualityLevel" label="质量等级" width="100">
          <template #default="{ row }">
            <el-tag :type="getQualityLevelTagType(row.qualityLevel)">
              {{ row.qualityLevel }}级
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="certifications" label="认证资质" width="150" show-overflow-tooltip />
        <el-table-column prop="monthlyCapacity" label="月产能" width="100" />
        <el-table-column prop="leadTime" label="交期(天)" width="80" />
        <el-table-column prop="priceLevel" label="价格水平" width="100">
          <template #default="{ row }">
            <el-rate
              v-model="row.priceLevel"
              disabled
              show-score
              text-color="#ff9900"
              score-template="{value}星"
            />
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="getStatusTagType(row.status)">
              {{ getStatusLabel(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" size="small" @click="handleEdit(row)" :disabled="!hasEditPermission">
              编辑
            </el-button>
            <el-button type="info" size="small" @click="handleViewMaterials(row)" :disabled="!hasViewMaterialsPermission">
              材料清单
            </el-button>
            <el-button type="warning" size="small" @click="handleQualityCheck(row)" :disabled="!hasQualityCheckPermission">
              质检记录
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
            <el-form-item label="主要材料类型" prop="materialType">
              <el-select v-model="formData.materialType" placeholder="请选择主要材料类型">
                <el-option label="面材" value="face_material" />
                <el-option label="胶水" value="adhesive" />
                <el-option label="底纸" value="liner" />
                <el-option label="油墨" value="ink" />
                <el-option label="溶剂" value="solvent" />
                <el-option label="清洗剂" value="cleaner" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="质量等级" prop="qualityLevel">
              <el-select v-model="formData.qualityLevel" placeholder="请选择质量等级">
                <el-option label="A级" value="A" />
                <el-option label="B级" value="B" />
                <el-option label="C级" value="C" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="认证资质" prop="certifications">
              <el-input v-model="formData.certifications" placeholder="如：ISO9001、FSC等" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="月产能" prop="monthlyCapacity">
              <el-input v-model="formData.monthlyCapacity" placeholder="请输入月产能">
                <template #append>吨</template>
              </el-input>
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="交期(天)" prop="leadTime">
              <el-input-number v-model="formData.leadTime" :min="1" :max="365" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="价格水平" prop="priceLevel">
              <el-rate v-model="formData.priceLevel" show-text />
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
const hasAddPermission = computed(() => userStore.hasActionPermission('supplier:material:add'))
const hasEditPermission = computed(() => userStore.hasActionPermission('supplier:material:edit'))
const hasViewMaterialsPermission = computed(() => userStore.hasActionPermission('supplier:material:view_materials'))
const hasQualityCheckPermission = computed(() => userStore.hasActionPermission('supplier:material:quality_check'))

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
  materialType: '',
  qualityLevel: '',
  status: ''
})

// 表格数据
const tableData = ref([
  {
    id: 1,
    supplierCode: 'MT001',
    supplierName: '艾利丹尼森材料有限公司',
    materialType: 'face_material',
    qualityLevel: 'A',
    certifications: 'ISO9001、FSC、PEFC',
    monthlyCapacity: '500',
    leadTime: 15,
    priceLevel: 4,
    contactPerson: '张经理',
    contactPhone: '13800138001',
    address: '上海市浦东新区张江高科技园区',
    status: 'qualified'
  },
  {
    id: 2,
    supplierCode: 'MT002',
    supplierName: '汉高胶粘剂技术有限公司',
    materialType: 'adhesive',
    qualityLevel: 'A',
    certifications: 'ISO9001、ISO14001',
    monthlyCapacity: '200',
    leadTime: 10,
    priceLevel: 5,
    contactPerson: '李工程师',
    contactPhone: '13800138002',
    address: '广东省东莞市松山湖高新技术产业开发区',
    status: 'qualified'
  },
  {
    id: 3,
    supplierCode: 'MT003',
    supplierName: '格拉辛底纸制造有限公司',
    materialType: 'liner',
    qualityLevel: 'B',
    certifications: 'ISO9001',
    monthlyCapacity: '300',
    leadTime: 20,
    priceLevel: 3,
    contactPerson: '王总',
    contactPhone: '13800138003',
    address: '江苏省苏州市工业园区',
    status: 'pending'
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
  materialType: '',
  qualityLevel: '',
  certifications: '',
  monthlyCapacity: '',
  leadTime: 15,
  priceLevel: 3,
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
  materialType: [
    { required: true, message: '请选择主要材料类型', trigger: 'change' }
  ],
  qualityLevel: [
    { required: true, message: '请选择质量等级', trigger: 'change' }
  ],
  monthlyCapacity: [
    { required: true, message: '请输入月产能', trigger: 'blur' }
  ],
  leadTime: [
    { required: true, message: '请输入交期', trigger: 'blur' }
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
// 获取材料类型标签样式
const getMaterialTypeTagType = (type) => {
  const typeMap = {
    face_material: 'success',
    adhesive: 'warning',
    liner: 'info',
    ink: 'danger',
    solvent: '',
    cleaner: 'success'
  }
  return typeMap[type] || ''
}

// 获取材料类型标签文本
const getMaterialTypeLabel = (type) => {
  const typeMap = {
    face_material: '面材',
    adhesive: '胶水',
    liner: '底纸',
    ink: '油墨',
    solvent: '溶剂',
    cleaner: '清洗剂'
  }
  return typeMap[type] || type
}

// 获取质量等级标签样式
const getQualityLevelTagType = (level) => {
  const levelMap = {
    A: 'success',
    B: 'warning',
    C: 'info'
  }
  return levelMap[level] || ''
}

// 获取状态标签样式
const getStatusTagType = (status) => {
  const statusMap = {
    qualified: 'success',
    pending: 'warning',
    unqualified: 'danger'
  }
  return statusMap[status] || ''
}

// 获取状态标签文本
const getStatusLabel = (status) => {
  const statusMap = {
    qualified: '合格',
    pending: '待审核',
    unqualified: '不合格'
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
    materialType: '',
    qualityLevel: '',
    status: ''
  })
  handleSearch()
}

// 新增
const handleAdd = () => {
  dialogTitle.value = '新增原材料供应商'
  isEdit.value = false
  resetForm()
  dialogVisible.value = true
}

// 编辑
const handleEdit = (row) => {
  dialogTitle.value = '编辑原材料供应商'
  isEdit.value = true
  Object.assign(formData, row)
  dialogVisible.value = true
}

// 查看材料清单
const handleViewMaterials = (row) => {
  ElMessage.info('材料清单功能开发中...')
}

// 质检记录
const handleQualityCheck = (row) => {
  ElMessage.info('质检记录功能开发中...')
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
    materialType: '',
    qualityLevel: '',
    certifications: '',
    monthlyCapacity: '',
    leadTime: 15,
    priceLevel: 3,
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
.material-suppliers {
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