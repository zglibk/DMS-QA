<template>
  <div class="supplier-audit">
    <!-- 页面标题 -->
    <div class="page-header">
      <h2>供应商审核</h2>
      <p class="page-description">管理供应商资质审核流程，确保供应商符合质量标准</p>
    </div>

    <!-- 审核统计 -->
    <div class="stats-section">
      <el-row :gutter="20">
        <el-col :span="6">
          <el-card class="stats-card">
            <div class="stats-content">
              <div class="stats-icon pending">
                <el-icon><Clock /></el-icon>
              </div>
              <div class="stats-info">
                <div class="stats-value">{{ auditStats.pending }}</div>
                <div class="stats-label">待审核</div>
              </div>
            </div>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card class="stats-card">
            <div class="stats-content">
              <div class="stats-icon reviewing">
                <el-icon><View /></el-icon>
              </div>
              <div class="stats-info">
                <div class="stats-value">{{ auditStats.reviewing }}</div>
                <div class="stats-label">审核中</div>
              </div>
            </div>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card class="stats-card">
            <div class="stats-content">
              <div class="stats-icon approved">
                <el-icon><CircleCheck /></el-icon>
              </div>
              <div class="stats-info">
                <div class="stats-value">{{ auditStats.approved }}</div>
                <div class="stats-label">已通过</div>
              </div>
            </div>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card class="stats-card">
            <div class="stats-content">
              <div class="stats-icon rejected">
                <el-icon><CircleCloseFilled /></el-icon>
              </div>
              <div class="stats-info">
                <div class="stats-value">{{ auditStats.rejected }}</div>
                <div class="stats-label">已拒绝</div>
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
        <el-form-item label="审核状态">
          <el-select
            v-model="searchForm.auditStatus"
            placeholder="请选择审核状态"
            clearable
            style="width: 150px"
          >
            <el-option label="待审核" value="pending" />
            <el-option label="审核中" value="reviewing" />
            <el-option label="已通过" value="approved" />
            <el-option label="已拒绝" value="rejected" />
          </el-select>
        </el-form-item>
        <el-form-item label="审核类型">
          <el-select
            v-model="searchForm.auditType"
            placeholder="请选择审核类型"
            clearable
            style="width: 150px"
          >
            <el-option label="新供应商审核" value="new" />
            <el-option label="年度复审" value="annual" />
            <el-option label="资质更新" value="renewal" />
            <el-option label="临时审核" value="temporary" />
          </el-select>
        </el-form-item>
        <el-form-item label="申请日期">
          <el-date-picker
            v-model="searchForm.dateRange"
            type="daterange"
            range-separator="至"
            start-placeholder="开始日期"
            end-placeholder="结束日期"
            format="YYYY-MM-DD"
            value-format="YYYY-MM-DD"
            style="width: 240px"
          />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleSearch">
            <el-icon><Search /></el-icon>
            搜索
          </el-button>
          <el-button @click="handleReset">重置</el-button>
          <el-button type="success" @click="handleAdd">
            <el-icon><Plus /></el-icon>
            发起审核
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
        <el-table-column prop="auditCode" label="审核编号" width="120" />
        <el-table-column prop="supplierName" label="供应商名称" min-width="200" />
        <el-table-column prop="auditType" label="审核类型" width="120">
          <template #default="{ row }">
            <el-tag :type="getAuditTypeTagType(row.auditType)">
              {{ getAuditTypeLabel(row.auditType) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="auditStatus" label="审核状态" width="100">
          <template #default="{ row }">
            <el-tag :type="getStatusTagType(row.auditStatus)">
              {{ getStatusLabel(row.auditStatus) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="applicant" label="申请人" width="100" />
        <el-table-column prop="applicationDate" label="申请日期" width="120" />
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
        <el-table-column prop="auditDate" label="审核日期" width="120" />
        <el-table-column prop="priority" label="优先级" width="80">
          <template #default="{ row }">
            <el-tag :type="getPriorityTagType(row.priority)" size="small">
              {{ getPriorityLabel(row.priority) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="score" label="审核得分" width="100">
          <template #default="{ row }">
            <span v-if="row.score" :class="getScoreClass(row.score)">
              {{ row.score }}分
            </span>
            <span v-else class="text-muted">-</span>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="250" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" size="small" @click="handleView(row)">
              <el-icon><View /></el-icon>
              查看
            </el-button>
            <el-button 
              type="warning" 
              size="small" 
              @click="handleAudit(row)" 
              v-if="row.auditStatus === 'pending' || row.auditStatus === 'reviewing'"
            >
              <el-icon><Check /></el-icon>
              审核
            </el-button>
            <el-button type="success" size="small" @click="handleEdit(row)">
              <el-icon><Edit /></el-icon>
              编辑
            </el-button>
            <el-button type="danger" size="small" @click="handleDelete(row)">
              <el-icon><Delete /></el-icon>
              删除
            </el-button>
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
            <el-form-item label="审核编号" prop="auditCode">
              <el-input v-model="formData.auditCode" placeholder="系统自动生成" disabled />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="供应商" prop="supplierId">
              <el-select v-model="formData.supplierId" placeholder="请选择供应商" style="width: 100%">
                <el-option 
                  v-for="supplier in supplierList" 
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
              <el-select v-model="formData.auditType" placeholder="请选择审核类型" style="width: 100%">
                <el-option label="新供应商审核" value="new" />
                <el-option label="年度复审" value="annual" />
                <el-option label="资质更新" value="renewal" />
                <el-option label="临时审核" value="temporary" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="优先级" prop="priority">
              <el-select v-model="formData.priority" placeholder="请选择优先级" style="width: 100%">
                <el-option label="高" value="high" />
                <el-option label="中" value="medium" />
                <el-option label="低" value="low" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
        
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="申请人" prop="applicant">
              <el-input v-model="formData.applicant" placeholder="请输入申请人" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="申请日期" prop="applicationDate">
              <el-date-picker
                v-model="formData.applicationDate"
                type="date"
                placeholder="请选择申请日期"
                format="YYYY-MM-DD"
                value-format="YYYY-MM-DD"
                style="width: 100%"
              />
            </el-form-item>
          </el-col>
        </el-row>
        
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="审核员" prop="auditors">
              <el-select 
                v-model="formData.auditors" 
                placeholder="请选择审核员（可多选）" 
                style="width: 100%" 
                multiple
                collapse-tags
                collapse-tags-tooltip
                filterable
              >
                <el-option label="张审核员" value="张审核员" />
                <el-option label="李审核员" value="李审核员" />
                <el-option label="王审核员" value="王审核员" />
                <el-option label="赵质检" value="赵质检" />
                <el-option label="钱评估" value="钱评估" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="计划审核日期" prop="plannedAuditDate">
              <el-date-picker
                v-model="formData.plannedAuditDate"
                type="date"
                placeholder="请选择计划审核日期"
                format="YYYY-MM-DD"
                value-format="YYYY-MM-DD"
                style="width: 100%"
              />
            </el-form-item>
          </el-col>
        </el-row>
        
        <el-form-item label="审核要求" prop="auditRequirements">
          <el-input
            v-model="formData.auditRequirements"
            type="textarea"
            :rows="3"
            placeholder="请输入审核要求和标准"
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

    <!-- 审核对话框 -->
    <el-dialog
      v-model="auditDialogVisible"
      title="供应商审核"
      width="900px"
      @close="handleAuditDialogClose"
    >
      <el-form
        ref="auditFormRef"
        :model="auditFormData"
        :rules="auditFormRules"
        label-width="120px"
      >
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="审核编号">
              <el-input v-model="auditFormData.auditCode" disabled />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="供应商名称">
              <el-input v-model="auditFormData.supplierName" disabled />
            </el-form-item>
          </el-col>
        </el-row>
        
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="审核日期" prop="auditDate">
              <el-date-picker
                v-model="auditFormData.auditDate"
                type="date"
                placeholder="请选择审核日期"
                format="YYYY-MM-DD"
                value-format="YYYY-MM-DD"
                style="width: 100%"
              />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="审核得分" prop="score">
              <el-input-number
                v-model="auditFormData.score"
                :min="0"
                :max="100"
                placeholder="请输入审核得分"
                style="width: 100%"
              />
            </el-form-item>
          </el-col>
        </el-row>
        
        <el-form-item label="审核结果" prop="auditResult">
          <el-radio-group v-model="auditFormData.auditResult">
            <el-radio label="approved">通过</el-radio>
            <el-radio label="rejected">拒绝</el-radio>
            <el-radio label="conditional">有条件通过</el-radio>
          </el-radio-group>
        </el-form-item>
        
        <el-form-item label="审核意见" prop="auditOpinion">
          <el-input
            v-model="auditFormData.auditOpinion"
            type="textarea"
            :rows="4"
            placeholder="请输入详细的审核意见"
          />
        </el-form-item>
        
        <el-form-item label="改进建议">
          <el-input
            v-model="auditFormData.improvementSuggestions"
            type="textarea"
            :rows="3"
            placeholder="请输入改进建议（可选）"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="handleAuditDialogClose">取消</el-button>
          <el-button type="primary" @click="handleAuditSubmit">提交审核</el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Search, Plus, Clock, View, CircleCheck, CircleCloseFilled, Edit, Delete, Check } from '@element-plus/icons-vue'

/**
 * 响应式数据定义
 */
const loading = ref(false)
const dialogVisible = ref(false)
const auditDialogVisible = ref(false)
const dialogTitle = ref('')
const isEdit = ref(false)
const formRef = ref()
const auditFormRef = ref()

// 审核统计数据
const auditStats = reactive({
  pending: 12,
  reviewing: 8,
  approved: 35,
  rejected: 5
})

// 搜索表单
const searchForm = reactive({
  supplierName: '',
  auditStatus: '',
  auditType: '',
  dateRange: []
})

// 分页数据
const currentPage = ref(1)
const pageSize = ref(20)
const total = ref(0)

// 供应商列表
const supplierList = ref([
  { id: 1, name: '艾利丹尼森材料有限公司' },
  { id: 2, name: '汉高胶粘剂技术有限公司' },
  { id: 3, name: '海德堡印刷机械有限公司' },
  { id: 4, name: '博斯特模切设备有限公司' }
])

// 表格数据
const tableData = ref([
  {
    id: 1,
    auditCode: 'SA2024001',
    supplierName: '艾利丹尼森材料有限公司',
    auditType: 'new',
    auditStatus: 'pending',
    applicant: '张经理',
    applicationDate: '2024-01-15',
    auditors: ['李审核员', '赵质检'],
    auditDate: '',
    priority: 'high',
    score: null
  },
  {
    id: 2,
    auditCode: 'SA2024002',
    supplierName: '汉高胶粘剂技术有限公司',
    auditType: 'annual',
    auditStatus: 'reviewing',
    applicant: '王主管',
    applicationDate: '2024-01-10',
    auditors: ['张审核员'],
    auditDate: '2024-01-20',
    priority: 'medium',
    score: null
  },
  {
    id: 3,
    auditCode: 'SA2024003',
    supplierName: '海德堡印刷机械有限公司',
    auditType: 'renewal',
    auditStatus: 'approved',
    applicant: '赵工程师',
    applicationDate: '2024-01-05',
    auditors: ['王审核员', '陈专员'],
    auditDate: '2024-01-18',
    priority: 'medium',
    score: 92
  },
  {
    id: 4,
    auditCode: 'SA2024004',
    supplierName: '博斯特模切设备有限公司',
    auditType: 'temporary',
    auditStatus: 'rejected',
    applicant: '刘采购',
    applicationDate: '2024-01-08',
    auditors: ['李审核员'],
    auditDate: '2024-01-22',
    priority: 'low',
    score: 65
  }
])

// 表单数据
const formData = reactive({
  auditCode: '',
  supplierId: '',
  auditType: '',
  priority: 'medium',
  applicant: '',
  applicationDate: '',
  auditors: [],
  plannedAuditDate: '',
  auditRequirements: '',
  remark: ''
})

// 审核表单数据
const auditFormData = reactive({
  auditCode: '',
  supplierName: '',
  auditDate: '',
  score: null,
  auditResult: '',
  auditOpinion: '',
  improvementSuggestions: ''
})

// 表单验证规则
const formRules = {
  supplierId: [
    { required: true, message: '请选择供应商', trigger: 'change' }
  ],
  auditType: [
    { required: true, message: '请选择审核类型', trigger: 'change' }
  ],
  applicant: [
    { required: true, message: '请输入申请人', trigger: 'blur' }
  ],
  applicationDate: [
    { required: true, message: '请选择申请日期', trigger: 'change' }
  ],
  auditors: [
    { required: true, message: '请选择审核员', trigger: 'change' }
  ]
}

// 审核表单验证规则
const auditFormRules = {
  auditDate: [
    { required: true, message: '请选择审核日期', trigger: 'change' }
  ],
  score: [
    { required: true, message: '请输入审核得分', trigger: 'blur' }
  ],
  auditResult: [
    { required: true, message: '请选择审核结果', trigger: 'change' }
  ],
  auditOpinion: [
    { required: true, message: '请输入审核意见', trigger: 'blur' }
  ]
}

/**
 * 工具函数
 */
// 获取审核类型标签样式
const getAuditTypeTagType = (type) => {
  const typeMap = {
    new: 'success',
    annual: 'warning',
    renewal: 'info',
    temporary: 'danger'
  }
  return typeMap[type] || ''
}

// 获取审核类型标签文本
const getAuditTypeLabel = (type) => {
  const typeMap = {
    new: '新供应商',
    annual: '年度复审',
    renewal: '资质更新',
    temporary: '临时审核'
  }
  return typeMap[type] || type
}

// 获取状态标签样式
const getStatusTagType = (status) => {
  const statusMap = {
    pending: 'info',
    reviewing: 'warning',
    approved: 'success',
    rejected: 'danger'
  }
  return statusMap[status] || ''
}

// 获取状态标签文本
const getStatusLabel = (status) => {
  const statusMap = {
    pending: '待审核',
    reviewing: '审核中',
    approved: '已通过',
    rejected: '已拒绝'
  }
  return statusMap[status] || status
}

// 获取优先级标签样式
const getPriorityTagType = (priority) => {
  const priorityMap = {
    high: 'danger',
    medium: 'warning',
    low: 'info'
  }
  return priorityMap[priority] || ''
}

// 获取优先级标签文本
const getPriorityLabel = (priority) => {
  const priorityMap = {
    high: '高',
    medium: '中',
    low: '低'
  }
  return priorityMap[priority] || priority
}

// 获取得分样式
const getScoreClass = (score) => {
  if (score >= 90) {
    return 'score-excellent'
  } else if (score >= 80) {
    return 'score-good'
  } else if (score >= 70) {
    return 'score-average'
  } else {
    return 'score-poor'
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
    if (key === 'dateRange') {
      searchForm[key] = []
    } else {
      searchForm[key] = ''
    }
  })
  handleSearch()
}

// 新增
const handleAdd = () => {
  dialogTitle.value = '发起供应商审核'
  isEdit.value = false
  resetForm()
  // 生成审核编号
  formData.auditCode = 'SA' + new Date().getFullYear() + String(Date.now()).slice(-6)
  dialogVisible.value = true
}

// 编辑
const handleEdit = (row) => {
  dialogTitle.value = '编辑审核信息'
  isEdit.value = true
  Object.keys(formData).forEach(key => {
    if (row[key] !== undefined) {
      formData[key] = row[key]
    }
  })
  dialogVisible.value = true
}

// 查看详情
const handleView = (row) => {
  // TODO: 实现查看详情逻辑
  ElMessage.info('查看审核详情功能开发中')
}

// 审核
const handleAudit = (row) => {
  auditFormData.auditCode = row.auditCode
  auditFormData.supplierName = row.supplierName
  auditFormData.auditDate = new Date().toISOString().split('T')[0]
  auditFormData.score = null
  auditFormData.auditResult = ''
  auditFormData.auditOpinion = ''
  auditFormData.improvementSuggestions = ''
  auditDialogVisible.value = true
}

// 删除
const handleDelete = (row) => {
  ElMessageBox.confirm(
    `确定要删除审核记录"${row.auditCode}"吗？此操作不可恢复！`,
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

// 审核对话框关闭
const handleAuditDialogClose = () => {
  auditDialogVisible.value = false
  resetAuditForm()
}

// 提交表单
const handleSubmit = () => {
  formRef.value.validate((valid) => {
    if (valid) {
      // TODO: 实现提交逻辑
      console.log('提交数据:', formData)
      ElMessage.success(isEdit.value ? '更新成功' : '发起审核成功')
      handleDialogClose()
    }
  })
}

// 提交审核
const handleAuditSubmit = () => {
  auditFormRef.value.validate((valid) => {
    if (valid) {
      // TODO: 实现审核提交逻辑
      console.log('审核数据:', auditFormData)
      
      // 更新表格数据
      const item = tableData.value.find(item => item.auditCode === auditFormData.auditCode)
      if (item) {
        item.auditStatus = auditFormData.auditResult
        item.auditDate = auditFormData.auditDate
        item.score = auditFormData.score
      }
      
      ElMessage.success('审核提交成功')
      handleAuditDialogClose()
    }
  })
}

// 重置表单
const resetForm = () => {
  Object.keys(formData).forEach(key => {
    if (key === 'priority') {
      formData[key] = 'medium'
    } else if (key === 'auditors') {
      formData[key] = []
    } else {
      formData[key] = ''
    }
  })
  if (formRef.value) {
    formRef.value.clearValidate()
  }
}

// 重置审核表单
const resetAuditForm = () => {
  Object.keys(auditFormData).forEach(key => {
    if (key === 'score') {
      auditFormData[key] = null
    } else {
      auditFormData[key] = ''
    }
  })
  if (auditFormRef.value) {
    auditFormRef.value.clearValidate()
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
.supplier-audit {
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

.stats-icon.pending {
  background: linear-gradient(135deg, #909399, #b1b3b8);
}

.stats-icon.reviewing {
  background: linear-gradient(135deg, #e6a23c, #f0a020);
}

.stats-icon.approved {
  background: linear-gradient(135deg, #67c23a, #85ce61);
}

.stats-icon.rejected {
  background: linear-gradient(135deg, #f56c6c, #f78989);
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

.text-muted {
  color: #c0c4cc;
}

.score-excellent {
  color: #67c23a;
  font-weight: bold;
}

.score-good {
  color: #409eff;
  font-weight: bold;
}

.score-average {
  color: #e6a23c;
  font-weight: bold;
}

.score-poor {
  color: #f56c6c;
  font-weight: bold;
}
</style>