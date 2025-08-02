<template>
  <div class="annual-audit-plan">
    <!-- 统计卡片 -->
    <el-row :gutter="20" class="stats-cards">
      <el-col :span="6">
        <el-card class="stat-card">
          <div class="stat-content">
            <div class="stat-number">{{ stats.totalPlans }}</div>
            <div class="stat-label">总计划数</div>
          </div>
          <el-icon class="stat-icon"><Calendar /></el-icon>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card class="stat-card">
          <div class="stat-content">
            <div class="stat-number">{{ stats.inProgress }}</div>
            <div class="stat-label">进行中</div>
          </div>
          <el-icon class="stat-icon"><Clock /></el-icon>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card class="stat-card">
          <div class="stat-content">
            <div class="stat-number">{{ stats.completed }}</div>
            <div class="stat-label">已完成</div>
          </div>
          <el-icon class="stat-icon"><Check /></el-icon>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card class="stat-card">
          <div class="stat-content">
            <div class="stat-number">{{ stats.overdue }}</div>
            <div class="stat-label">已逾期</div>
          </div>
          <el-icon class="stat-icon"><Warning /></el-icon>
        </el-card>
      </el-col>
    </el-row>

    <!-- 搜索和操作区域 -->
    <el-card class="search-card">
      <el-row :gutter="20">
        <el-col :span="6">
          <el-input
            v-model="searchForm.keyword"
            placeholder="搜索计划名称或供应商"
            clearable
            @keyup.enter="handleSearch"
          >
            <template #prefix>
              <el-icon><Search /></el-icon>
            </template>
          </el-input>
        </el-col>
        <el-col :span="4">
          <el-select v-model="searchForm.year" placeholder="选择年份" clearable>
            <el-option
              v-for="year in yearOptions"
              :key="year"
              :label="year + '年'"
              :value="year"
            />
          </el-select>
        </el-col>
        <el-col :span="4">
          <el-select v-model="searchForm.status" placeholder="审核状态" clearable>
            <el-option label="未开始" value="pending" />
            <el-option label="进行中" value="in_progress" />
            <el-option label="已完成" value="completed" />
            <el-option label="已逾期" value="overdue" />
          </el-select>
        </el-col>
        <el-col :span="6">
          <el-date-picker
            v-model="searchForm.dateRange"
            type="daterange"
            range-separator="至"
            start-placeholder="开始日期"
            end-placeholder="结束日期"
            format="YYYY-MM-DD"
            value-format="YYYY-MM-DD"
          />
        </el-col>
        <el-col :span="4">
          <el-button type="primary" @click="handleSearch">
            <el-icon><Search /></el-icon>
            搜索
          </el-button>
          <el-button @click="resetSearch">重置</el-button>
        </el-col>
      </el-row>
      <el-row class="mt-4">
        <el-col :span="24">
          <el-button type="primary" @click="handleAdd">
            <el-icon><Plus /></el-icon>
            新增计划
          </el-button>
          <el-button type="success" @click="handleBatchExport">
            <el-icon><Download /></el-icon>
            导出计划
          </el-button>
          <el-button type="warning" @click="handleGenerateAnnualPlan">
            <el-icon><Star /></el-icon>
            生成年度计划
          </el-button>
        </el-col>
      </el-row>
    </el-card>

    <!-- 数据表格 -->
    <el-card class="table-card">
      <el-table
        :data="tableData"
        v-loading="loading"
        stripe
        border
        style="width: 100%"
        @selection-change="handleSelectionChange"
      >
        <el-table-column type="selection" width="55" />
        <el-table-column prop="planCode" label="计划编号" width="120" />
        <el-table-column prop="planName" label="计划名称" min-width="150" />
        <el-table-column prop="year" label="年份" width="80" />
        <el-table-column prop="supplierName" label="供应商" min-width="120" />
        <el-table-column prop="auditType" label="审核类型" width="100">
          <template #default="{ row }">
            <el-tag :type="getAuditTypeTagType(row.auditType)">{{ row.auditType }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="plannedDate" label="计划日期" width="100" />
        <el-table-column prop="auditors" label="审核员" width="150">
          <template #default="{ row }">
            <span v-if="Array.isArray(row.auditors)">
              <el-tag 
                v-for="(auditor, index) in row.auditors" 
                :key="index" 
                size="small" 
                class="mr-1"
              >
                {{ auditor }}
              </el-tag>
            </span>
            <span v-else>{{ row.auditors || row.auditor }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="getStatusTagType(row.status)">{{ getStatusText(row.status) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="progress" label="进度" width="120">
          <template #default="{ row }">
            <el-progress :percentage="row.progress" :status="getProgressStatus(row.progress)" />
          </template>
        </el-table-column>
        <el-table-column prop="createTime" label="创建时间" width="120" />
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" size="small" @click="handleView(row)">
              查看
            </el-button>
            <el-button type="warning" size="small" @click="handleEdit(row)">
              编辑
            </el-button>
            <el-button type="success" size="small" @click="handleExecute(row)" v-if="row.status === 'pending'">
              执行
            </el-button>
            <el-button type="danger" size="small" @click="handleDelete(row)">
              删除
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <!-- 分页 -->
      <div class="pagination-container">
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
    </el-card>

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
            <el-form-item label="计划编号" prop="planCode">
              <el-input v-model="formData.planCode" placeholder="自动生成" :disabled="isEdit" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="计划名称" prop="planName">
              <el-input v-model="formData.planName" placeholder="请输入计划名称" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="年份" prop="year">
              <el-select v-model="formData.year" placeholder="选择年份">
                <el-option
                  v-for="year in yearOptions"
                  :key="year"
                  :label="year + '年'"
                  :value="year"
                />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="供应商" prop="supplierId">
              <el-select v-model="formData.supplierId" placeholder="选择供应商" filterable>
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
            <el-form-item label="审核类型" prop="auditType">
              <el-select v-model="formData.auditType" placeholder="选择审核类型">
                <el-option label="质量体系审核" value="质量体系审核" />
                <el-option label="产品审核" value="产品审核" />
                <el-option label="过程审核" value="过程审核" />
                <el-option label="现场审核" value="现场审核" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="计划日期" prop="plannedDate">
              <el-date-picker
                v-model="formData.plannedDate"
                type="date"
                placeholder="选择计划日期"
                format="YYYY-MM-DD"
                value-format="YYYY-MM-DD"
              />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="审核员" prop="auditors">
              <el-select 
                v-model="formData.auditors" 
                placeholder="选择审核员（可多选）" 
                filterable 
                multiple
                collapse-tags
                collapse-tags-tooltip
                style="width: 100%"
              >
                <el-option
                  v-for="auditor in auditorOptions"
                  :key="auditor.id"
                  :label="auditor.name"
                  :value="auditor.name"
                />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="预计天数" prop="estimatedDays">
              <el-input-number v-model="formData.estimatedDays" :min="1" :max="30" placeholder="预计审核天数" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-form-item label="审核范围" prop="auditScope">
          <el-input
            v-model="formData.auditScope"
            type="textarea"
            :rows="3"
            placeholder="请输入审核范围和重点"
          />
        </el-form-item>
        <el-form-item label="备注">
          <el-input
            v-model="formData.remarks"
            type="textarea"
            :rows="2"
            placeholder="请输入备注信息"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="handleDialogClose">取消</el-button>
          <el-button type="primary" @click="handleSubmit" :loading="submitLoading">
            确定
          </el-button>
        </span>
      </template>
    </el-dialog>

    <!-- 查看详情对话框 -->
    <el-dialog
      v-model="viewDialogVisible"
      title="审核计划详情"
      width="900px"
    >
      <el-descriptions :column="2" border>
        <el-descriptions-item label="计划编号">{{ viewData.planCode }}</el-descriptions-item>
        <el-descriptions-item label="计划名称">{{ viewData.planName }}</el-descriptions-item>
        <el-descriptions-item label="年份">{{ viewData.year }}年</el-descriptions-item>
        <el-descriptions-item label="供应商">{{ viewData.supplierName }}</el-descriptions-item>
        <el-descriptions-item label="审核类型">
          <el-tag :type="getAuditTypeTagType(viewData.auditType)">{{ viewData.auditType }}</el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="计划日期">{{ viewData.plannedDate }}</el-descriptions-item>
        <el-descriptions-item label="审核员">
          <span v-if="Array.isArray(viewData.auditors)">
            <el-tag 
              v-for="(auditor, index) in viewData.auditors" 
              :key="index" 
              size="small" 
              class="mr-1"
            >
              {{ auditor }}
            </el-tag>
          </span>
          <span v-else>{{ viewData.auditors || viewData.auditor }}</span>
        </el-descriptions-item>
        <el-descriptions-item label="预计天数">{{ viewData.estimatedDays }}天</el-descriptions-item>
        <el-descriptions-item label="状态">
          <el-tag :type="getStatusTagType(viewData.status)">{{ getStatusText(viewData.status) }}</el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="进度">
          <el-progress :percentage="viewData.progress" :status="getProgressStatus(viewData.progress)" />
        </el-descriptions-item>
        <el-descriptions-item label="审核范围" :span="2">{{ viewData.auditScope }}</el-descriptions-item>
        <el-descriptions-item label="备注" :span="2">{{ viewData.remarks }}</el-descriptions-item>
        <el-descriptions-item label="创建时间">{{ viewData.createTime }}</el-descriptions-item>
        <el-descriptions-item label="更新时间">{{ viewData.updateTime }}</el-descriptions-item>
      </el-descriptions>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  Search,
  Plus,
  Download,
  Star,
  Calendar,
  Clock,
  Check,
  Warning
} from '@element-plus/icons-vue'

// 响应式数据
const loading = ref(false)
const submitLoading = ref(false)
const dialogVisible = ref(false)
const viewDialogVisible = ref(false)
const isEdit = ref(false)
const formRef = ref()

// 统计数据
const stats = reactive({
  totalPlans: 0,
  inProgress: 0,
  completed: 0,
  overdue: 0
})

// 搜索表单
const searchForm = reactive({
  keyword: '',
  year: '',
  status: '',
  dateRange: []
})

// 表格数据
const tableData = ref([])
const selectedRows = ref([])

// 分页数据
const pagination = reactive({
  currentPage: 1,
  pageSize: 20,
  total: 0
})

// 表单数据
const formData = reactive({
  id: null,
  planCode: '',
  planName: '',
  year: new Date().getFullYear(),
  supplierId: '',
  auditType: '',
  plannedDate: '',
  auditors: [],
  estimatedDays: 1,
  auditScope: '',
  remarks: ''
})

// 查看数据
const viewData = reactive({})

// 选项数据
const yearOptions = ref([])
const supplierOptions = ref([])
const auditorOptions = ref([])

// 表单验证规则
const formRules = {
  planName: [
    { required: true, message: '请输入计划名称', trigger: 'blur' }
  ],
  year: [
    { required: true, message: '请选择年份', trigger: 'change' }
  ],
  supplierId: [
    { required: true, message: '请选择供应商', trigger: 'change' }
  ],
  auditType: [
    { required: true, message: '请选择审核类型', trigger: 'change' }
  ],
  plannedDate: [
    { required: true, message: '请选择计划日期', trigger: 'change' }
  ],
  auditors: [
    { required: true, message: '请选择审核员', trigger: 'change' }
  ],
  estimatedDays: [
    { required: true, message: '请输入预计天数', trigger: 'blur' }
  ],
  auditScope: [
    { required: true, message: '请输入审核范围', trigger: 'blur' }
  ]
}

// 计算属性
const dialogTitle = computed(() => {
  return isEdit.value ? '编辑审核计划' : '新增审核计划'
})

// 工具函数
/**
 * 获取审核类型标签类型
 */
const getAuditTypeTagType = (type) => {
  const typeMap = {
    '质量体系审核': 'primary',
    '产品审核': 'success',
    '过程审核': 'warning',
    '现场审核': 'info'
  }
  return typeMap[type] || 'info'
}

/**
 * 获取状态标签类型
 */
const getStatusTagType = (status) => {
  const statusMap = {
    pending: 'info',
    in_progress: 'warning',
    completed: 'success',
    overdue: 'danger'
  }
  return statusMap[status] || 'info'
}

/**
 * 获取状态文本
 */
const getStatusText = (status) => {
  const statusMap = {
    pending: '未开始',
    in_progress: '进行中',
    completed: '已完成',
    overdue: '已逾期'
  }
  return statusMap[status] || '未知'
}

/**
 * 获取进度状态
 */
const getProgressStatus = (progress) => {
  if (progress === 100) return 'success'
  if (progress >= 80) return 'warning'
  return null
}

/**
 * 重置表单
 */
const resetForm = () => {
  Object.assign(formData, {
    id: null,
    planCode: '',
    planName: '',
    year: new Date().getFullYear(),
    supplierId: '',
    auditType: '',
    plannedDate: '',
    auditors: [],
    estimatedDays: 1,
    auditScope: '',
    remarks: ''
  })
  if (formRef.value) {
    formRef.value.resetFields()
  }
}

/**
 * 生成年份选项
 */
const generateYearOptions = () => {
  const currentYear = new Date().getFullYear()
  const years = []
  for (let i = currentYear - 2; i <= currentYear + 3; i++) {
    years.push(i)
  }
  yearOptions.value = years
}

// 事件处理函数
/**
 * 搜索
 */
const handleSearch = () => {
  pagination.currentPage = 1
  loadTableData()
}

/**
 * 重置搜索
 */
const resetSearch = () => {
  Object.assign(searchForm, {
    keyword: '',
    year: '',
    status: '',
    dateRange: []
  })
  handleSearch()
}

/**
 * 新增
 */
const handleAdd = () => {
  isEdit.value = false
  resetForm()
  dialogVisible.value = true
}

/**
 * 编辑
 */
const handleEdit = (row) => {
  isEdit.value = true
  Object.assign(formData, { ...row })
  dialogVisible.value = true
}

/**
 * 查看
 */
const handleView = (row) => {
  Object.assign(viewData, { ...row })
  viewDialogVisible.value = true
}

/**
 * 执行审核
 */
const handleExecute = (row) => {
  ElMessageBox.confirm(
    `确定要开始执行审核计划 "${row.planName}" 吗？`,
    '确认执行',
    {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    }
  ).then(() => {
    // 这里调用执行审核的API
    ElMessage.success('审核计划已开始执行')
    loadTableData()
  })
}

/**
 * 删除
 */
const handleDelete = (row) => {
  ElMessageBox.confirm(
    `确定要删除审核计划 "${row.planName}" 吗？`,
    '确认删除',
    {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    }
  ).then(() => {
    // 这里调用删除API
    ElMessage.success('删除成功')
    loadTableData()
  })
}

/**
 * 批量导出
 */
const handleBatchExport = () => {
  if (selectedRows.value.length === 0) {
    ElMessage.warning('请选择要导出的数据')
    return
  }
  // 这里调用导出API
  ElMessage.success('导出成功')
}

/**
 * 生成年度计划
 */
const handleGenerateAnnualPlan = () => {
  ElMessageBox.confirm(
    '确定要根据供应商评估结果自动生成年度审核计划吗？',
    '确认生成',
    {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    }
  ).then(() => {
    // 这里调用生成年度计划的API
    ElMessage.success('年度计划生成成功')
    loadTableData()
  })
}

/**
 * 表格选择变化
 */
const handleSelectionChange = (selection) => {
  selectedRows.value = selection
}

/**
 * 分页大小变化
 */
const handleSizeChange = (size) => {
  pagination.pageSize = size
  loadTableData()
}

/**
 * 当前页变化
 */
const handleCurrentChange = (page) => {
  pagination.currentPage = page
  loadTableData()
}

/**
 * 对话框关闭
 */
const handleDialogClose = () => {
  dialogVisible.value = false
  resetForm()
}

/**
 * 提交表单
 */
const handleSubmit = () => {
  formRef.value.validate((valid) => {
    if (valid) {
      submitLoading.value = true
      // 这里调用保存API
      setTimeout(() => {
        submitLoading.value = false
        ElMessage.success(isEdit.value ? '更新成功' : '创建成功')
        dialogVisible.value = false
        loadTableData()
      }, 1000)
    }
  })
}

/**
 * 加载表格数据
 */
const loadTableData = () => {
  loading.value = true
  // 模拟API调用
  setTimeout(() => {
    tableData.value = [
      {
        id: 1,
        planCode: 'AP2024001',
        planName: '2024年度质量体系审核计划',
        year: 2024,
        supplierId: 1,
        supplierName: '优质材料供应商',
        auditType: '质量体系审核',
        plannedDate: '2024-03-15',
        auditors: ['张审核', '王质检'],
        estimatedDays: 3,
        status: 'pending',
        progress: 0,
        auditScope: '质量管理体系、生产过程控制、产品质量检验',
        remarks: '重点关注质量控制流程',
        createTime: '2024-01-15 10:30:00',
        updateTime: '2024-01-15 10:30:00'
      },
      {
        id: 2,
        planCode: 'AP2024002',
        planName: '仪器供应商现场审核',
        year: 2024,
        supplierId: 2,
        supplierName: '精密设备制造商',
        auditType: '现场审核',
        plannedDate: '2024-04-20',
        auditors: ['李检查'],
        estimatedDays: 2,
        status: 'in_progress',
        progress: 65,
        auditScope: '生产设备、工艺流程、质量控制',
        remarks: '需要重点检查设备精度',
        createTime: '2024-01-20 14:20:00',
        updateTime: '2024-02-15 09:15:00'
      }
    ]
    pagination.total = 2
    loading.value = false
  }, 1000)
}

/**
 * 加载统计数据
 */
const loadStats = () => {
  // 模拟API调用
  Object.assign(stats, {
    totalPlans: 12,
    inProgress: 3,
    completed: 8,
    overdue: 1
  })
}

/**
 * 加载选项数据
 */
const loadOptions = () => {
  // 模拟加载供应商选项
  supplierOptions.value = [
    { id: 1, name: '优质材料供应商' },
    { id: 2, name: '精密设备制造商' },
    { id: 3, name: '包装材料供应商' }
  ]
  
  // 模拟加载审核员选项
  auditorOptions.value = [
    { id: 1, name: '张审核' },
    { id: 2, name: '李检查' },
    { id: 3, name: '王评估' }
  ]
}

// 生命周期
onMounted(() => {
  generateYearOptions()
  loadStats()
  loadOptions()
  loadTableData()
})
</script>

<style scoped>
.annual-audit-plan {
  padding: 20px;
}

.stats-cards {
  margin-bottom: 20px;
}

.stat-card {
  position: relative;
  overflow: hidden;
}

.stat-content {
  padding: 20px;
}

.stat-number {
  font-size: 32px;
  font-weight: bold;
  color: #409eff;
  margin-bottom: 8px;
}

.stat-label {
  font-size: 14px;
  color: #666;
}

.stat-icon {
  position: absolute;
  right: 20px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 40px;
  color: #e6f7ff;
}

.search-card {
  margin-bottom: 20px;
}

.table-card {
  margin-bottom: 20px;
}

.pagination-container {
  display: flex;
  justify-content: center;
  margin-top: 20px;
}

.mt-4 {
  margin-top: 16px;
}

.dialog-footer {
  text-align: right;
}

:deep(.el-table .el-table__cell) {
  padding: 8px 0;
}

:deep(.el-card__body) {
  padding: 20px;
}

:deep(.el-descriptions__label) {
  font-weight: bold;
}
</style>