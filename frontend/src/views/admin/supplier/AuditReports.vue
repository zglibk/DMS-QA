<template>
  <div class="audit-reports">
    <!-- 统计卡片 -->
    <el-row :gutter="20" class="stats-cards">
      <el-col :span="6">
        <el-card class="stat-card">
          <div class="stat-content">
            <div class="stat-number">{{ stats.totalReports }}</div>
            <div class="stat-label">总报告数</div>
          </div>
          <el-icon class="stat-icon"><Files /></el-icon>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card class="stat-card">
          <div class="stat-content">
            <div class="stat-number">{{ stats.nonConformities }}</div>
            <div class="stat-label">不符合项</div>
          </div>
          <el-icon class="stat-icon"><Warning /></el-icon>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card class="stat-card">
          <div class="stat-content">
            <div class="stat-number">{{ stats.pendingCorrections }}</div>
            <div class="stat-label">待整改</div>
          </div>
          <el-icon class="stat-icon"><Clock /></el-icon>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card class="stat-card">
          <div class="stat-content">
            <div class="stat-number">{{ stats.completedCorrections }}</div>
            <div class="stat-label">已验证</div>
          </div>
          <el-icon class="stat-icon"><Check /></el-icon>
        </el-card>
      </el-col>
    </el-row>

    <!-- 搜索和操作区域 -->
    <el-card class="search-card">
      <el-row :gutter="20">
        <el-col :span="6">
          <el-input
            v-model="searchForm.keyword"
            placeholder="搜索报告编号或供应商"
            clearable
            @keyup.enter="handleSearch"
          >
            <template #prefix>
              <el-icon><Search /></el-icon>
            </template>
          </el-input>
        </el-col>
        <el-col :span="4">
          <el-select v-model="searchForm.auditType" placeholder="审核类型" clearable>
            <el-option label="质量体系审核" value="质量体系审核" />
            <el-option label="产品审核" value="产品审核" />
            <el-option label="过程审核" value="过程审核" />
            <el-option label="现场审核" value="现场审核" />
          </el-select>
        </el-col>
        <el-col :span="4">
          <el-select v-model="searchForm.status" placeholder="报告状态" clearable>
            <el-option label="草稿" value="draft" />
            <el-option label="已提交" value="submitted" />
            <el-option label="已审核" value="reviewed" />
            <el-option label="已关闭" value="closed" />
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
            新增报告
          </el-button>
          <el-button type="success" @click="handleBatchExport">
            <el-icon><Download /></el-icon>
            导出报告
          </el-button>
          <el-button type="warning" @click="handleNonConformityStats">
            <el-icon><DataAnalysis /></el-icon>
            不符合项统计
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
        <el-table-column prop="reportCode" label="报告编号" width="120" />
        <el-table-column prop="supplierName" label="供应商" min-width="120" />
        <el-table-column prop="auditType" label="审核类型" width="100">
          <template #default="{ row }">
            <el-tag :type="getAuditTypeTagType(row.auditType)">{{ row.auditType }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="auditDate" label="审核日期" width="100" />
        <el-table-column prop="auditor" label="审核员" width="100" />
        <el-table-column prop="overallScore" label="总体评分" width="100">
          <template #default="{ row }">
            <el-tag :type="getScoreTagType(row.overallScore)">{{ row.overallScore }}分</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="nonConformityCount" label="不符合项" width="100">
          <template #default="{ row }">
            <el-badge :value="row.nonConformityCount" :type="row.nonConformityCount > 0 ? 'danger' : 'success'">
              <span>{{ row.nonConformityCount }}</span>
            </el-badge>
          </template>
        </el-table-column>
        <el-table-column prop="correctionStatus" label="整改状态" width="100">
          <template #default="{ row }">
            <el-tag :type="getCorrectionStatusTagType(row.correctionStatus)">{{ getCorrectionStatusText(row.correctionStatus) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="status" label="报告状态" width="100">
          <template #default="{ row }">
            <el-tag :type="getStatusTagType(row.status)">{{ getStatusText(row.status) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="createTime" label="创建时间" width="120" />
        <el-table-column label="操作" width="250" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" size="small" @click="handleView(row)">
              查看
            </el-button>
            <el-button type="warning" size="small" @click="handleEdit(row)">
              编辑
            </el-button>
            <el-button type="info" size="small" @click="handleNonConformities(row)">
              不符合项
            </el-button>
            <el-button type="success" size="small" @click="handleCorrections(row)" v-if="row.nonConformityCount > 0">
              整改跟踪
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

    <!-- 新增/编辑报告对话框 -->
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
            <el-form-item label="报告编号" prop="reportCode">
              <el-input v-model="formData.reportCode" placeholder="自动生成" :disabled="isEdit" />
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
            <el-form-item label="审核日期" prop="auditDate">
              <el-date-picker
                v-model="formData.auditDate"
                type="date"
                placeholder="选择审核日期"
                format="YYYY-MM-DD"
                value-format="YYYY-MM-DD"
              />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="审核员" prop="auditor">
              <el-select v-model="formData.auditor" placeholder="选择审核员" filterable>
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
            <el-form-item label="总体评分" prop="overallScore">
              <el-input-number v-model="formData.overallScore" :min="0" :max="100" placeholder="总体评分" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-form-item label="审核范围" prop="auditScope">
          <el-input
            v-model="formData.auditScope"
            type="textarea"
            :rows="3"
            placeholder="请输入审核范围"
          />
        </el-form-item>
        <el-form-item label="审核发现" prop="auditFindings">
          <el-input
            v-model="formData.auditFindings"
            type="textarea"
            :rows="4"
            placeholder="请输入审核发现和问题"
          />
        </el-form-item>
        <el-form-item label="改进建议" prop="recommendations">
          <el-input
            v-model="formData.recommendations"
            type="textarea"
            :rows="3"
            placeholder="请输入改进建议"
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

    <!-- 查看报告详情对话框 -->
    <el-dialog
      v-model="viewDialogVisible"
      title="审核报告详情"
      width="1000px"
    >
      <el-descriptions :column="2" border>
        <el-descriptions-item label="报告编号">{{ viewData.reportCode }}</el-descriptions-item>
        <el-descriptions-item label="供应商">{{ viewData.supplierName }}</el-descriptions-item>
        <el-descriptions-item label="审核类型">
          <el-tag :type="getAuditTypeTagType(viewData.auditType)">{{ viewData.auditType }}</el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="审核日期">{{ viewData.auditDate }}</el-descriptions-item>
        <el-descriptions-item label="审核员">{{ viewData.auditor }}</el-descriptions-item>
        <el-descriptions-item label="总体评分">
          <el-tag :type="getScoreTagType(viewData.overallScore)">{{ viewData.overallScore }}分</el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="不符合项数量">
          <el-badge :value="viewData.nonConformityCount" :type="viewData.nonConformityCount > 0 ? 'danger' : 'success'">
            <span>{{ viewData.nonConformityCount }}</span>
          </el-badge>
        </el-descriptions-item>
        <el-descriptions-item label="整改状态">
          <el-tag :type="getCorrectionStatusTagType(viewData.correctionStatus)">{{ getCorrectionStatusText(viewData.correctionStatus) }}</el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="审核范围" :span="2">{{ viewData.auditScope }}</el-descriptions-item>
        <el-descriptions-item label="审核发现" :span="2">{{ viewData.auditFindings }}</el-descriptions-item>
        <el-descriptions-item label="改进建议" :span="2">{{ viewData.recommendations }}</el-descriptions-item>
        <el-descriptions-item label="备注" :span="2">{{ viewData.remarks }}</el-descriptions-item>
        <el-descriptions-item label="创建时间">{{ viewData.createTime }}</el-descriptions-item>
        <el-descriptions-item label="更新时间">{{ viewData.updateTime }}</el-descriptions-item>
      </el-descriptions>
    </el-dialog>

    <!-- 不符合项管理对话框 -->
    <el-dialog
      v-model="nonConformityDialogVisible"
      title="不符合项管理"
      width="1200px"
    >
      <div class="non-conformity-header">
        <el-button type="primary" @click="handleAddNonConformity">
          <el-icon><Plus /></el-icon>
          新增不符合项
        </el-button>
      </div>
      <el-table :data="nonConformityData" border style="width: 100%">
        <el-table-column prop="ncCode" label="编号" width="120" />
        <el-table-column prop="category" label="类别" width="100">
          <template #default="{ row }">
            <el-tag :type="getNcCategoryTagType(row.category)">{{ row.category }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="description" label="描述" min-width="200" />
        <el-table-column prop="severity" label="严重程度" width="100">
          <template #default="{ row }">
            <el-tag :type="getSeverityTagType(row.severity)">{{ row.severity }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="correctionStatus" label="整改状态" width="100">
          <template #default="{ row }">
            <el-tag :type="getCorrectionStatusTagType(row.correctionStatus)">{{ getCorrectionStatusText(row.correctionStatus) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="dueDate" label="整改期限" width="100" />
        <el-table-column label="操作" width="200">
          <template #default="{ row }">
            <el-button type="primary" size="small" @click="handleViewCorrection(row)">
              查看整改
            </el-button>
            <el-button type="warning" size="small" @click="handleEditNonConformity(row)">
              编辑
            </el-button>
            <el-button type="success" size="small" @click="handleVerifyCorrection(row)" v-if="row.correctionStatus === 'submitted'">
              验证
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-dialog>

    <!-- 整改跟踪对话框 -->
    <el-dialog
      v-model="correctionDialogVisible"
      title="整改跟踪"
      width="1000px"
    >
      <el-timeline>
        <el-timeline-item
          v-for="(item, index) in correctionTimeline"
          :key="index"
          :timestamp="item.timestamp"
          :type="item.type"
        >
          <el-card>
            <h4>{{ item.title }}</h4>
            <p>{{ item.description }}</p>
            <div v-if="item.attachments && item.attachments.length > 0">
              <strong>附件：</strong>
              <el-link
                v-for="attachment in item.attachments"
                :key="attachment.id"
                type="primary"
                :href="attachment.url"
                target="_blank"
                class="ml-2"
              >
                {{ attachment.name }}
              </el-link>
            </div>
          </el-card>
        </el-timeline-item>
      </el-timeline>
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
  DataAnalysis,
  Files,
  Warning,
  Clock,
  Check
} from '@element-plus/icons-vue'

// 响应式数据
const loading = ref(false)
const submitLoading = ref(false)
const dialogVisible = ref(false)
const viewDialogVisible = ref(false)
const nonConformityDialogVisible = ref(false)
const correctionDialogVisible = ref(false)
const isEdit = ref(false)
const formRef = ref()

// 统计数据
const stats = reactive({
  totalReports: 0,
  nonConformities: 0,
  pendingCorrections: 0,
  completedCorrections: 0
})

// 搜索表单
const searchForm = reactive({
  keyword: '',
  auditType: '',
  status: '',
  dateRange: []
})

// 表格数据
const tableData = ref([])
const selectedRows = ref([])
const nonConformityData = ref([])
const correctionTimeline = ref([])

// 分页数据
const pagination = reactive({
  currentPage: 1,
  pageSize: 20,
  total: 0
})

// 表单数据
const formData = reactive({
  id: null,
  reportCode: '',
  supplierId: '',
  auditType: '',
  auditDate: '',
  auditor: '',
  overallScore: 0,
  auditScope: '',
  auditFindings: '',
  recommendations: '',
  remarks: ''
})

// 查看数据
const viewData = reactive({})

// 选项数据
const supplierOptions = ref([])
const auditorOptions = ref([])

// 表单验证规则
const formRules = {
  supplierId: [
    { required: true, message: '请选择供应商', trigger: 'change' }
  ],
  auditType: [
    { required: true, message: '请选择审核类型', trigger: 'change' }
  ],
  auditDate: [
    { required: true, message: '请选择审核日期', trigger: 'change' }
  ],
  auditor: [
    { required: true, message: '请选择审核员', trigger: 'change' }
  ],
  overallScore: [
    { required: true, message: '请输入总体评分', trigger: 'blur' }
  ],
  auditScope: [
    { required: true, message: '请输入审核范围', trigger: 'blur' }
  ],
  auditFindings: [
    { required: true, message: '请输入审核发现', trigger: 'blur' }
  ]
}

// 计算属性
const dialogTitle = computed(() => {
  return isEdit.value ? '编辑审核报告' : '新增审核报告'
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
 * 获取评分标签类型
 */
const getScoreTagType = (score) => {
  if (score >= 90) return 'success'
  if (score >= 80) return 'warning'
  if (score >= 70) return 'info'
  return 'danger'
}

/**
 * 获取整改状态标签类型
 */
const getCorrectionStatusTagType = (status) => {
  const statusMap = {
    pending: 'info',
    in_progress: 'warning',
    submitted: 'primary',
    verified: 'success',
    rejected: 'danger'
  }
  return statusMap[status] || 'info'
}

/**
 * 获取整改状态文本
 */
const getCorrectionStatusText = (status) => {
  const statusMap = {
    pending: '待整改',
    in_progress: '整改中',
    submitted: '已提交',
    verified: '已验证',
    rejected: '已驳回'
  }
  return statusMap[status] || '未知'
}

/**
 * 获取状态标签类型
 */
const getStatusTagType = (status) => {
  const statusMap = {
    draft: 'info',
    submitted: 'warning',
    reviewed: 'primary',
    closed: 'success'
  }
  return statusMap[status] || 'info'
}

/**
 * 获取状态文本
 */
const getStatusText = (status) => {
  const statusMap = {
    draft: '草稿',
    submitted: '已提交',
    reviewed: '已审核',
    closed: '已关闭'
  }
  return statusMap[status] || '未知'
}

/**
 * 获取不符合项类别标签类型
 */
const getNcCategoryTagType = (category) => {
  const categoryMap = {
    '质量管理': 'primary',
    '生产过程': 'success',
    '产品质量': 'warning',
    '文件控制': 'info'
  }
  return categoryMap[category] || 'info'
}

/**
 * 获取严重程度标签类型
 */
const getSeverityTagType = (severity) => {
  const severityMap = {
    '轻微': 'success',
    '一般': 'warning',
    '严重': 'danger'
  }
  return severityMap[severity] || 'info'
}

/**
 * 重置表单
 */
const resetForm = () => {
  Object.assign(formData, {
    id: null,
    reportCode: '',
    supplierId: '',
    auditType: '',
    auditDate: '',
    auditor: '',
    overallScore: 0,
    auditScope: '',
    auditFindings: '',
    recommendations: '',
    remarks: ''
  })
  if (formRef.value) {
    formRef.value.resetFields()
  }
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
    auditType: '',
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
 * 不符合项管理
 */
const handleNonConformities = (row) => {
  // 加载该报告的不符合项数据
  loadNonConformityData(row.id)
  nonConformityDialogVisible.value = true
}

/**
 * 整改跟踪
 */
const handleCorrections = (row) => {
  // 加载整改跟踪数据
  loadCorrectionTimeline(row.id)
  correctionDialogVisible.value = true
}

/**
 * 删除
 */
const handleDelete = (row) => {
  ElMessageBox.confirm(
    `确定要删除审核报告 "${row.reportCode}" 吗？`,
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
 * 不符合项统计
 */
const handleNonConformityStats = () => {
  // 这里打开不符合项统计页面或对话框
  ElMessage.info('不符合项统计功能开发中')
}

/**
 * 新增不符合项
 */
const handleAddNonConformity = () => {
  // 这里打开新增不符合项对话框
  ElMessage.info('新增不符合项功能开发中')
}

/**
 * 编辑不符合项
 */
const handleEditNonConformity = (row) => {
  // 这里打开编辑不符合项对话框
  ElMessage.info('编辑不符合项功能开发中')
}

/**
 * 查看整改
 */
const handleViewCorrection = (row) => {
  // 这里打开查看整改详情对话框
  ElMessage.info('查看整改功能开发中')
}

/**
 * 验证整改
 */
const handleVerifyCorrection = (row) => {
  ElMessageBox.confirm(
    `确定要验证不符合项 "${row.ncCode}" 的整改结果吗？`,
    '确认验证',
    {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    }
  ).then(() => {
    // 这里调用验证整改API
    ElMessage.success('验证成功')
    loadNonConformityData()
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
        reportCode: 'AR2024001',
        supplierId: 1,
        supplierName: '优质材料供应商',
        auditType: '质量体系审核',
        auditDate: '2024-02-15',
        auditor: '张审核',
        overallScore: 85,
        nonConformityCount: 2,
        correctionStatus: 'in_progress',
        status: 'reviewed',
        auditScope: '质量管理体系、生产过程控制、产品质量检验',
        auditFindings: '发现质量控制流程存在不足，需要改进',
        recommendations: '建议完善质量控制流程，加强员工培训',
        remarks: '整体表现良好，需要持续改进',
        createTime: '2024-02-16 10:30:00',
        updateTime: '2024-02-20 14:20:00'
      },
      {
        id: 2,
        reportCode: 'AR2024002',
        supplierId: 2,
        supplierName: '精密设备制造商',
        auditType: '现场审核',
        auditDate: '2024-02-20',
        auditor: '李检查',
        overallScore: 92,
        nonConformityCount: 0,
        correctionStatus: 'verified',
        status: 'closed',
        auditScope: '生产设备、工艺流程、质量控制',
        auditFindings: '生产设备维护良好，工艺流程规范',
        recommendations: '继续保持现有管理水平',
        remarks: '优秀供应商，值得长期合作',
        createTime: '2024-02-21 09:15:00',
        updateTime: '2024-02-25 16:30:00'
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
    totalReports: 15,
    nonConformities: 8,
    pendingCorrections: 3,
    completedCorrections: 5
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

/**
 * 加载不符合项数据
 */
const loadNonConformityData = (reportId) => {
  // 模拟API调用
  nonConformityData.value = [
    {
      id: 1,
      ncCode: 'NC2024001',
      category: '质量管理',
      description: '质量控制记录不完整',
      severity: '一般',
      correctionStatus: 'in_progress',
      dueDate: '2024-03-15'
    },
    {
      id: 2,
      ncCode: 'NC2024002',
      category: '生产过程',
      description: '生产工艺参数控制不严格',
      severity: '严重',
      correctionStatus: 'submitted',
      dueDate: '2024-03-10'
    }
  ]
}

/**
 * 加载整改跟踪数据
 */
const loadCorrectionTimeline = (reportId) => {
  // 模拟API调用
  correctionTimeline.value = [
    {
      timestamp: '2024-02-16 10:00:00',
      title: '不符合项识别',
      description: '审核发现质量控制记录不完整',
      type: 'warning'
    },
    {
      timestamp: '2024-02-18 14:30:00',
      title: '整改计划提交',
      description: '供应商提交整改计划，预计3月15日完成',
      type: 'primary'
    },
    {
      timestamp: '2024-03-01 09:15:00',
      title: '整改进度更新',
      description: '已完成50%的整改工作，正在完善质量控制流程',
      type: 'info'
    },
    {
      timestamp: '2024-03-10 16:20:00',
      title: '整改完成',
      description: '供应商完成所有整改工作，提交验证材料',
      type: 'success',
      attachments: [
        { id: 1, name: '整改报告.pdf', url: '#' },
        { id: 2, name: '质量控制流程.docx', url: '#' }
      ]
    }
  ]
}

// 生命周期
onMounted(() => {
  loadStats()
  loadOptions()
  loadTableData()
})
</script>

<style scoped>
.audit-reports {
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

.non-conformity-header {
  margin-bottom: 20px;
}

.mt-4 {
  margin-top: 16px;
}

.ml-2 {
  margin-left: 8px;
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

:deep(.el-timeline-item__content) {
  padding-bottom: 20px;
}
</style>